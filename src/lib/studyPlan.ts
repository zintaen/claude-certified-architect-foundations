/**
 * Deterministic study-plan assembly (LEARN-004). No runtime LLM.
 */
import templateCcaf from '@/data/plan-templates/ccaf.json';

export type PlanInputs = {
  examCode: string;
  examDate: string; // ISO date
  hoursPerWeek: number;
  tier: 'free' | 'premium';
};

export type PlanWeek = {
  index: number;
  theme: string;
  phase: string;
  drills: { domainKey: string; sessions: number; guidance: string }[];
  reviewSessions: number;
  mocks: number;
  hoursBudget: number;
};

export type StudyPlan = {
  examCode: string;
  weeks: PlanWeek[];
  honestWarning: string | null;
  planVersion: 1;
  totalHoursScheduled: number;
  hoursNeededEstimate: number;
};

export const PLAN_CONFIG = {
  minHoursFloor: Number(process.env.PLAN_MIN_HOURS_FLOOR || 20),
  driftThreshold: 0.35,
};

type Template = typeof templateCcaf;

function templateFor(examCode: string): Template {
  if (examCode === 'ccaf' || examCode === 'ccar-f') return templateCcaf;
  return templateCcaf;
}

export function assemblePlan(
  inputs: PlanInputs,
  deficits: { domainKey: string; deficit: number }[]
): StudyPlan {
  const tpl = templateFor(inputs.examCode);
  const examDate = new Date(inputs.examDate);
  const now = new Date();
  const ms = examDate.getTime() - now.getTime();
  const weeksAvailable = Math.max(1, Math.ceil(ms / (7 * 86400000)));
  const hoursAvailable = weeksAvailable * Math.max(1, inputs.hoursPerWeek);

  const sorted = [...deficits].sort((a, b) => b.deficit - a.deficit);
  const need =
    sorted.reduce((s, d) => s + d.deficit * tpl.hoursPerDeficitUnit, 0) ||
    PLAN_CONFIG.minHoursFloor;

  let honestWarning: string | null = null;
  if (hoursAvailable < Math.max(PLAN_CONFIG.minHoursFloor, need * 0.6)) {
    honestWarning = `This timeline is tight for the estimated study need (~${Math.round(need)}h vs ~${Math.round(hoursAvailable)}h available). The plan shows what fits — not a compressed fantasy schedule.`;
  }

  const phases = tpl.phases;
  const weeks: PlanWeek[] = [];
  const phaseCycle = phases.map((p) => p.key);
  const topDomains = sorted.slice(0, 3);
  if (!topDomains.length) {
    topDomains.push(
      { domainKey: 'research_pipeline', deficit: 0.5 },
      { domainKey: 'extraction_pipeline', deficit: 0.4 }
    );
  }

  for (let i = 0; i < weeksAvailable; i++) {
    const phase = phaseCycle[Math.min(i, phaseCycle.length - 1)]!;
    const phaseMeta = phases.find((p) => p.key === phase)!;
    const mocks =
      phase === 'mock' && inputs.tier === 'premium'
        ? 1
        : phase === 'mock' && inputs.tier === 'free'
          ? 0
          : phase === 'taper'
            ? 0
            : 0;
    const drills = topDomains.map((d, di) => ({
      domainKey: d.domainKey,
      sessions: phase === 'drill' || phase === 'build' ? 2 - (di > 0 ? 0 : 0) : 1,
      guidance:
        (tpl.domainGuidance as Record<string, string>)[d.domainKey] || 'Practice this domain.',
    }));
    weeks.push({
      index: i + 1,
      theme: phaseMeta.theme,
      phase,
      drills,
      reviewSessions: phase === 'taper' ? 3 : 2,
      mocks: inputs.tier === 'free' ? Math.min(mocks, 0) : mocks,
      hoursBudget: inputs.hoursPerWeek,
    });
  }

  // If free tier, never schedule mocks beyond free line (0 in plan placement for honesty)
  if (inputs.tier === 'free') {
    for (const w of weeks) w.mocks = 0;
  }

  return {
    examCode: inputs.examCode,
    weeks,
    honestWarning,
    planVersion: 1,
    totalHoursScheduled: weeks.reduce((s, w) => s + w.hoursBudget, 0),
    hoursNeededEstimate: need,
  };
}
