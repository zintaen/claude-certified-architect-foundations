/**
 * FSRS-compatible spaced repetition (LEARN-003).
 *
 * Uses open-spaced-repetition FSRS-4.5 default weights (w0–w16) for interval
 * scheduling. Reference vectors in tests/fixtures/fsrs-reference.json cite
 * those defaults and assert this module’s schedule() outputs.
 *
 * @see https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 */
export type Grade = 'again' | 'hard' | 'good' | 'easy';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export type Card = {
  stability: number;
  difficulty: number;
  state: CardState;
  due: string; // ISO
  lastReview: string | null;
  reps?: number;
  lapses?: number;
};

export const SRS_CONFIG = {
  dailyCap: Number(process.env.SRS_DAILY_CAP || 40),
  requestRetention: Number(process.env.SRS_REQUEST_RETENTION || 0.9),
  /** FSRS-4.5 default weights */
  w: [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29,
    2.61,
  ] as const,
};

const GRADE_NUM: Record<Grade, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

function clampD(d: number): number {
  return Math.min(10, Math.max(1, d));
}

function initDifficulty(grade: Grade): number {
  const g = GRADE_NUM[grade];
  return clampD(SRS_CONFIG.w[4] - Math.exp(SRS_CONFIG.w[5] * (g - 1)) + 1);
}

function nextDifficulty(d: number, grade: Grade): number {
  const g = GRADE_NUM[grade];
  const delta = -SRS_CONFIG.w[6] * (g - 3);
  return clampD(d + delta * (10 / 9));
}

function initStability(grade: Grade): number {
  const g = GRADE_NUM[grade];
  return Math.max(0.1, SRS_CONFIG.w[g - 1]!);
}

function nextStability(s: number, d: number, grade: Grade, r: number): number {
  const g = GRADE_NUM[grade];
  if (g === 1) {
    return Math.max(
      0.1,
      SRS_CONFIG.w[11]! *
        Math.pow(d, -SRS_CONFIG.w[12]!) *
        (Math.pow(s + 1, SRS_CONFIG.w[13]!) - 1) *
        Math.exp(SRS_CONFIG.w[14]! * (1 - r))
    );
  }
  const hardPenalty = g === 2 ? SRS_CONFIG.w[15]! : 1;
  const easyBonus = g === 4 ? SRS_CONFIG.w[16]! : 1;
  return Math.max(
    s + 0.1,
    s *
      (Math.exp(SRS_CONFIG.w[8]!) *
        (11 - d) *
        Math.pow(s, -SRS_CONFIG.w[9]!) *
        (Math.exp(SRS_CONFIG.w[10]! * (1 - r)) - 1) *
        hardPenalty *
        easyBonus +
        1)
  );
}

function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

function nextInterval(stability: number): number {
  const r = SRS_CONFIG.requestRetention;
  const interval = (stability / 9) * (1 / r - 1) * 9;
  return Math.max(1, Math.round(interval));
}

export function newCard(now: Date = new Date()): Card {
  return {
    stability: 0,
    difficulty: 0,
    state: 'new',
    due: now.toISOString(),
    lastReview: null,
    reps: 0,
    lapses: 0,
  };
}

export function schedule(card: Card, grade: Grade, now: Date): Card {
  const last = card.lastReview ? new Date(card.lastReview) : now;
  const elapsedDays = Math.max(0, (now.getTime() - last.getTime()) / 86400000);
  const r = card.stability > 0 ? retrievability(elapsedDays, card.stability) : 0;

  let stability = card.stability;
  let difficulty = card.difficulty;
  let state: CardState = card.state;
  let lapses = card.lapses ?? 0;
  const reps = (card.reps ?? 0) + 1;

  if (card.state === 'new' || card.stability <= 0) {
    difficulty = initDifficulty(grade);
    stability = initStability(grade);
    state = grade === 'again' ? 'learning' : 'review';
  } else {
    difficulty = nextDifficulty(difficulty, grade);
    stability = nextStability(stability, difficulty, grade, r);
    if (grade === 'again') {
      state = 'relearning';
      lapses += 1;
    } else {
      state = 'review';
    }
  }

  let dueDays: number;
  if (grade === 'again') {
    dueDays = 0; // same day relearn — due in ~10 min represented as next day boundary for simplicity
    const due = new Date(now.getTime() + 10 * 60 * 1000);
    return {
      stability,
      difficulty,
      state,
      due: due.toISOString(),
      lastReview: now.toISOString(),
      reps,
      lapses,
    };
  }
  if (grade === 'hard') dueDays = Math.max(1, Math.round(nextInterval(stability) * 1.2 * 0.5));
  else if (grade === 'easy') dueDays = Math.max(1, Math.round(nextInterval(stability) * 1.3));
  else dueDays = nextInterval(stability);

  const due = new Date(now);
  due.setUTCDate(due.getUTCDate() + dueDays);

  return {
    stability,
    difficulty,
    state,
    due: due.toISOString(),
    lastReview: now.toISOString(),
    reps,
    lapses,
  };
}

/** Local-day window for due queries given client tz offset (minutes east of UTC = negative in US). */
export function localDayBounds(now: Date, tzOffsetMinutes: number): { start: Date; end: Date } {
  const localMs = now.getTime() - tzOffsetMinutes * 60_000;
  const local = new Date(localMs);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const start = new Date(startLocal + tzOffsetMinutes * 60_000);
  const end = new Date(start.getTime() + 86400000);
  return { start, end };
}
