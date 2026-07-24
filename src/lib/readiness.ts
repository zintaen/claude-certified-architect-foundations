/**
 * Exam-readiness mastery model (LEARN-001).
 * Pure composition is exported for fixtures; DB loading is server-only.
 *
 * Config defaults justified in docs/methodology.md.
 */
import 'server-only';
import { DOMAIN_ORDER, type GroupId, isGroupId } from '@/lib/domains';
import { isCanary } from '@/data/canary.server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const READINESS_CONFIG = {
  minResponsesOverall: Number(process.env.READINESS_MIN_RESPONSES || 30),
  minResponsesPerDomain: Number(process.env.READINESS_MIN_PER_DOMAIN || 8),
  recencyHalfLifeDays: Number(process.env.READINESS_HALF_LIFE_DAYS || 21),
  windowDays: Number(process.env.READINESS_WINDOW_DAYS || 60),
  bands: {
    approaching: Number(process.env.READINESS_BAND_APPROACHING || 55),
    ready: Number(process.env.READINESS_BAND_READY || 75),
  },
  /** Equal interim weights across practice domains until full blueprint mapping. */
  domainWeights: {
    research_pipeline: 0.27,
    extraction_pipeline: 0.25,
    customer_support: 0.23,
    code_exploration: 0.25,
  } as Record<GroupId, number>,
};

export const READINESS_PROHIBITED_COPY = [
  'you will pass',
  'guaranteed',
  'pass guarantee',
  'predicts your result',
  'you are ready to pass',
  'pass probability',
] as const;

export type DomainMastery = {
  domainKey: string;
  accuracy: number;
  coverage: number;
  recencyWeightedAccuracy: number;
  sampleSize: number;
  sufficient: boolean;
};

export type ReadinessBand = 'building' | 'approaching' | 'ready';

export type Readiness = {
  examCode: string;
  score: number | null;
  band: ReadinessBand | null;
  domains: DomainMastery[];
  computedFrom: { responses: number; windowDays: number };
  modelVersion: 1;
};

export type MasteryResponseRow = {
  itemId: string;
  domainKey: string;
  correct: boolean;
  answeredAt: Date;
  /** Exclude when true */
  isCanary?: boolean;
  isBeta?: boolean;
  isCustomSitting?: boolean;
};

function recencyWeight(answeredAt: Date, now: Date, halfLifeDays: number): number {
  const ageDays = Math.max(0, (now.getTime() - answeredAt.getTime()) / 86400000);
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/** Pure: rows → readiness. Used by unit fixtures and computeReadiness. */
export function composeReadiness(
  examCode: string,
  rows: MasteryResponseRow[],
  opts?: {
    now?: Date;
    objectivesPerDomain?: Record<string, number>;
    attemptedObjectives?: Record<string, Set<string>>;
  }
): Readiness {
  const now = opts?.now ?? new Date();
  const windowMs = READINESS_CONFIG.windowDays * 86400000;
  const filtered = rows.filter((r) => {
    if (r.isCanary || r.isBeta || r.isCustomSitting) return false;
    if (now.getTime() - r.answeredAt.getTime() > windowMs) return false;
    return true;
  });

  const byDomain = new Map<string, MasteryResponseRow[]>();
  for (const r of filtered) {
    const list = byDomain.get(r.domainKey) ?? [];
    list.push(r);
    byDomain.set(r.domainKey, list);
  }

  const domains: DomainMastery[] = DOMAIN_ORDER.map((dk) => {
    const list = byDomain.get(dk) ?? [];
    const sampleSize = list.length;
    let correct = 0;
    let wSum = 0;
    let wCorrect = 0;
    for (const r of list) {
      const w = recencyWeight(r.answeredAt, now, READINESS_CONFIG.recencyHalfLifeDays);
      wSum += w;
      if (r.correct) {
        correct += 1;
        wCorrect += w;
      }
    }
    const accuracy = sampleSize ? correct / sampleSize : 0;
    const recencyWeightedAccuracy = wSum > 0 ? wCorrect / wSum : 0;

    const objTotal = opts?.objectivesPerDomain?.[dk] ?? Math.max(sampleSize, 1);
    const attempted = opts?.attemptedObjectives?.[dk]?.size ?? sampleSize;
    const coverage = Math.min(1, attempted / objTotal);

    return {
      domainKey: dk,
      accuracy,
      coverage,
      recencyWeightedAccuracy,
      sampleSize,
      sufficient: sampleSize >= READINESS_CONFIG.minResponsesPerDomain,
    };
  });

  const totalResponses = filtered.length;
  if (totalResponses < READINESS_CONFIG.minResponsesOverall) {
    return {
      examCode,
      score: null,
      band: null,
      domains,
      computedFrom: { responses: totalResponses, windowDays: READINESS_CONFIG.windowDays },
      modelVersion: 1,
    };
  }

  // Weighted composition: recency accuracy * coverage discount, by blueprint weights
  let num = 0;
  let den = 0;
  for (const d of domains) {
    const w = READINESS_CONFIG.domainWeights[d.domainKey as GroupId] ?? 0.25;
    if (!d.sufficient) {
      // still include with heavy coverage penalty
      const contrib = d.recencyWeightedAccuracy * Math.min(d.coverage, 0.3) * w;
      num += contrib;
      den += w;
      continue;
    }
    num += d.recencyWeightedAccuracy * d.coverage * w;
    den += w;
  }
  const raw = den > 0 ? num / den : 0;
  const score = Math.round(Math.max(0, Math.min(100, raw * 100)));

  let band: ReadinessBand = 'building';
  if (score >= READINESS_CONFIG.bands.ready) band = 'ready';
  else if (score >= READINESS_CONFIG.bands.approaching) band = 'approaching';

  return {
    examCode,
    score,
    band,
    domains,
    computedFrom: { responses: totalResponses, windowDays: READINESS_CONFIG.windowDays },
    modelVersion: 1,
  };
}

export async function loadMasteryRows(
  userId: string,
  email: string,
  examCode: string
): Promise<MasteryResponseRow[]> {
  if (!supabaseAdmin) return [];
  const db = supabaseAdmin as any;
  const rows: MasteryResponseRow[] = [];

  // Platform path: item_responses + items
  const { data: sittings } = await db
    .from('sittings')
    .select('id, mode, exam_id, exams(code)')
    .eq('user_id', userId)
    .not('submitted_at', 'is', null)
    .limit(50);

  for (const sitting of sittings ?? []) {
    const code = sitting.exams?.code as string | undefined;
    if (code && code !== examCode) continue;
    if (sitting.mode === 'custom') continue;
    const { data: responses } = await db
      .from('item_responses')
      .select('item_id, correct, answered_at, items(status, domain_id, domains(key))')
      .eq('sitting_id', sitting.id)
      .limit(500);
    for (const r of responses ?? []) {
      const status = r.items?.status as string | undefined;
      const domainKey = (r.items?.domains?.key as string) || 'research_pipeline';
      rows.push({
        itemId: String(r.item_id),
        domainKey: isGroupId(domainKey) ? domainKey : 'research_pipeline',
        correct: Boolean(r.correct),
        answeredAt: new Date(r.answered_at),
        isBeta: status === 'beta',
        isCanary: false,
        isCustomSitting: false,
      });
    }
  }

  // Legacy CCAF: exam_results breakdown
  if (examCode === 'ccaf' || examCode === 'ccar-f') {
    const { data: results } = await db
      .from('exam_results')
      .select('breakdown, completed_at')
      .eq('email', email)
      .order('completed_at', { ascending: false })
      .limit(20);
    for (const result of results ?? []) {
      const completedAt = new Date(result.completed_at || Date.now());
      const breakdown = result.breakdown as {
        items?: Array<{
          id?: string;
          group?: string;
          chosenLetter?: string | null;
          options?: Array<{ letter: string; correct?: boolean }>;
        }>;
      } | null;
      for (const it of breakdown?.items ?? []) {
        if (!it.id) continue;
        if (isCanary(it.id)) continue;
        const correctOpt = it.options?.find((o) => o.correct);
        const correct = Boolean(
          it.chosenLetter && correctOpt && it.chosenLetter === correctOpt.letter
        );
        const domainKey = it.group && isGroupId(it.group) ? it.group : 'research_pipeline';
        rows.push({
          itemId: it.id,
          domainKey,
          correct,
          answeredAt: completedAt,
          isCanary: false,
          isBeta: false,
          isCustomSitting: false,
        });
      }
    }
  }

  return rows;
}

export async function computeReadiness(
  userId: string,
  email: string,
  examCode: string
): Promise<Readiness> {
  const rows = await loadMasteryRows(userId, email, examCode);
  return composeReadiness(examCode, rows);
}

export async function weakDomains(
  userId: string,
  examCode: string,
  email?: string
): Promise<{ domainKey: string; deficit: number; modelVersion: 1 }[]> {
  const readiness = await computeReadiness(userId, email || '', examCode);
  return readiness.domains
    .map((d) => ({
      domainKey: d.domainKey,
      deficit: 1 - d.recencyWeightedAccuracy * d.coverage,
      modelVersion: 1 as const,
    }))
    .sort((a, b) => b.deficit - a.deficit);
}
