/**
 * Adaptive weak-area drilling (LEARN-002).
 * Policy: weakness × difficulty proximity × exposure cooldown.
 * Deterministic under injected seed.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { weakDomains } from '@/lib/readiness';
import { DOMAIN_ORDER } from '@/lib/domains';
import { questions } from '@/data/questions';
import { isCanary } from '@/data/canary.server';

export const DRILL_CONFIG = {
  cooldownDays: Number(process.env.DRILL_COOLDOWN_DAYS || 3),
  exposureCapPerItemPerDay: Number(process.env.DRILL_EXPOSURE_CAP || 50),
  lengths: [10, 15, 20],
  uncalibratedNeutralP: 0.55,
};

export type DrillRequest = {
  userId: string;
  email?: string;
  examCode: string;
  length: number;
  seed?: string;
};

export type DrillPlan = {
  targetDomains: { domainKey: string; deficit: number }[];
  itemIds: string[];
  policyVersion: 1;
  focusedOn: string;
};

export type DomainRunState = {
  domainKey: string;
  recentCorrectStreak: number;
  recentMissStreak: number;
};

export type DrillCandidate = {
  id: string;
  domainKey: string;
  /** item_stats p-value; undefined → neutral */
  pValue?: number;
};

/** Mulberry32 — deterministic under seed. */
export function rngFromSeed(seed: string): () => number {
  let h = 0;
  const digest = createHash('sha256').update(seed).digest();
  for (let i = 0; i < 4; i++) h = (h << 8) | digest[i]!;
  return () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextDifficultyBias(sessionState: DomainRunState): 'easier' | 'hold' | 'harder' {
  if (sessionState.recentCorrectStreak >= 3) return 'harder';
  if (sessionState.recentMissStreak >= 2) return 'easier';
  return 'hold';
}

/**
 * Pure selection for fixtures. Prefer higher-deficit domains; within domain prefer
 * p-value near mastery; down-weight recent ids.
 */
export function planDrillFromState(input: {
  length: number;
  seed: string;
  deficits: { domainKey: string; deficit: number }[];
  masteryByDomain: Record<string, number>;
  candidates: DrillCandidate[];
  recentItemIds: Set<string>;
  difficultyBias?: 'easier' | 'hold' | 'harder';
}): DrillPlan {
  const rand = rngFromSeed(input.seed);
  const length = Math.min(
    Math.max(1, input.length),
    Math.max(...DRILL_CONFIG.lengths, input.length)
  );

  const deficits = [...input.deficits].sort((a, b) => b.deficit - a.deficit);
  const top = deficits.slice(0, 3);
  const weightSum = top.reduce((s, d) => s + Math.max(0.05, d.deficit), 0) || 1;

  const byDomain = new Map<string, DrillCandidate[]>();
  for (const c of input.candidates) {
    if (isCanary(c.id)) continue;
    const list = byDomain.get(c.domainKey) ?? [];
    list.push(c);
    byDomain.set(c.domainKey, list);
  }

  const picked: string[] = [];
  const used = new Set<string>();

  const slots: string[] = [];
  for (const d of top) {
    const share = Math.round((Math.max(0.05, d.deficit) / weightSum) * length);
    for (let i = 0; i < share; i++) slots.push(d.domainKey);
  }
  while (slots.length < length) {
    slots.push(top[0]?.domainKey || DOMAIN_ORDER[0]!);
  }
  // shuffle slots deterministically
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j]!, slots[i]!];
  }

  for (const domainKey of slots.slice(0, length)) {
    const pool = (byDomain.get(domainKey) ?? []).filter((c) => !used.has(c.id));
    if (!pool.length) continue;

    const mastery = input.masteryByDomain[domainKey] ?? DRILL_CONFIG.uncalibratedNeutralP;
    let targetP = mastery;
    if (input.difficultyBias === 'harder') targetP = Math.max(0.15, mastery - 0.15);
    if (input.difficultyBias === 'easier') targetP = Math.min(0.85, mastery + 0.15);

    const scored = pool.map((c) => {
      const p = c.pValue ?? DRILL_CONFIG.uncalibratedNeutralP;
      const proximity = 1 - Math.abs(p - targetP);
      const recentPenalty = input.recentItemIds.has(c.id) ? 0.15 : 1;
      const jitter = 0.85 + rand() * 0.15;
      return { id: c.id, score: proximity * recentPenalty * jitter };
    });
    scored.sort((a, b) => b.score - a.score);
    const choice = scored[0]!;
    used.add(choice.id);
    picked.push(choice.id);
  }

  const focusedOn = top.map((d) => d.domainKey).join(', ') || 'balanced';
  return {
    targetDomains: top,
    itemIds: picked,
    policyVersion: 1,
    focusedOn,
  };
}

/** CCAF bank candidates from the public question list. */
export function ccafCandidates(): DrillCandidate[] {
  return questions
    .filter((q) => !isCanary(q.id))
    .map((q) => ({
      id: q.id,
      domainKey: q.group,
      pValue: undefined,
    }));
}

export async function planDrill(req: DrillRequest): Promise<DrillPlan> {
  const length = DRILL_CONFIG.lengths.includes(req.length) ? req.length : DRILL_CONFIG.lengths[1]!;
  const seed = req.seed || `${req.userId}:${Date.now()}`;
  const deficits = await weakDomains(req.userId, req.examCode, req.email);
  const masteryByDomain: Record<string, number> = {};
  for (const d of deficits) {
    masteryByDomain[d.domainKey] = Math.max(0.1, 1 - d.deficit);
  }
  // Ensure all domains represented for young users
  if (!deficits.length) {
    for (const dk of DOMAIN_ORDER) {
      deficits.push({ domainKey: dk, deficit: 0.5, modelVersion: 1 });
      masteryByDomain[dk] = 0.5;
    }
  }

  const candidates =
    req.examCode === 'ccaf' || req.examCode === 'ccar-f' ? ccafCandidates() : ccafCandidates();

  return planDrillFromState({
    length,
    seed,
    deficits: deficits.map((d) => ({ domainKey: d.domainKey, deficit: d.deficit })),
    masteryByDomain,
    candidates,
    recentItemIds: new Set(),
  });
}
