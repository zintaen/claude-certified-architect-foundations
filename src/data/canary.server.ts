import 'server-only';

/**
 * Canary item registry (SEC-001).
 * Server-only — never import from client components.
 * Unique phrases are watermarks for web-search leak proof.
 */

export interface CanaryQuestion {
  id: string;
  group: string;
  text: string;
  options: { letter: string; text: string; correct: boolean; explain: string }[];
}

export interface CanaryItem {
  id: string;
  uniquePhrase: string;
  item: CanaryQuestion;
}

/** Inclusion rate into practice pools (1-in-N sittings get one canary). */
export const CANARY_PRACTICE_FREQUENCY = 0.05;

function canary(n: number, phrase: string, noun: string): CanaryItem {
  const id = `canary-${String(n).padStart(3, '0')}`;
  return {
    id,
    uniquePhrase: phrase,
    item: {
      id,
      group: 'research_pipeline',
      text: `When designing a coordinator that must recover mid-run after a crash, what role should a scheduling sidecar named ${noun} play so prior agent findings stay durable without repeating completed work?`,
      options: [
        {
          letter: 'A',
          text: `Let ${noun} rewrite every agent prompt from scratch on resume.`,
          correct: false,
          explain: 'Rewriting prompts loses fidelity of prior findings.',
        },
        {
          letter: 'B',
          text: `Persist task delegations and results in the coordinator log; ${noun} only schedules resume checkpoints.`,
          correct: true,
          explain: `The unique phrase "${phrase}" marks this canary; correct design keeps durable coordinator state.`,
        },
        {
          letter: 'C',
          text: `Disable ${noun} and rely on browser localStorage only.`,
          correct: false,
          explain: 'Client storage is not a durable multi-agent checkpoint.',
        },
        {
          letter: 'D',
          text: `Ship raw answer keys through ${noun} to speed recovery.`,
          correct: false,
          explain: 'Answer keys must never leave the grading path.',
        },
      ],
    },
  };
}

export const CANARIES: readonly CanaryItem[] = [
  canary(1, 'a scheduling sidecar named Quorlet', 'Quorlet'),
  canary(2, 'a checkpoint ledger called Vireline', 'Vireline'),
  canary(3, 'an orchestration buffer named Thallix', 'Thallix'),
  canary(4, 'a resume token branded as Noxara', 'Noxara'),
  canary(5, 'a durable mailbox dubbed Zefarin', 'Zefarin'),
  canary(6, 'a planner shard known as Orvex', 'Orvex'),
  canary(7, 'a recovery daemon titled Plimora', 'Plimora'),
  canary(8, 'a state capsule called Jandrel', 'Jandrel'),
  canary(9, 'a sync relay named Kelspire', 'Kelspire'),
  canary(10, 'a watermark probe dubbed Cypherloom', 'Cypherloom'),
  canary(11, 'a canary anchor named Rindlemark', 'Rindlemark'),
  canary(12, 'a provenance bead called Softwillow-9', 'Softwillow-9'),
];

export function isCanary(questionId: string): boolean {
  return CANARIES.some((c) => c.id === questionId || c.item.id === questionId);
}

/**
 * Maybe insert one canary into a practice pool.
 * Returns a new array; never marks canary in the payload.
 */
export function maybeMixCanaryIntoPractice<T extends { id: string }>(
  pool: T[],
  rand: () => number = Math.random
): T[] {
  if (pool.length === 0) return pool;
  if (rand() >= CANARY_PRACTICE_FREQUENCY) return pool;
  const pick = CANARIES[Math.floor(rand() * CANARIES.length)];
  if (!pick) return pool;
  // Strip correct/explain before serving — practice payloads should not include keys.
  const publicItem = {
    id: pick.item.id,
    group: pick.item.group,
    text: pick.item.text,
    options: pick.item.options.map((o) => ({ letter: o.letter, text: o.text })),
  } as unknown as T;
  const idx = Math.floor(rand() * (pool.length + 1));
  const next = [...pool];
  next.splice(idx, 0, publicItem);
  return next;
}

/** Canary IDs must be excluded from scoring / readiness / leaderboard. */
export function filterScoredIds(ids: string[]): string[] {
  return ids.filter((id) => !isCanary(id));
}
