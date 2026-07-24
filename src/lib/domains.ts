// Single source of truth for exam domains, the published pass mark, and per-domain
// scoring. Imported by the result page (breakdown + archetype), the practice picker
// (drill by domain), and the About page (blueprint). Keep all domain labels here so
// the UI stays consistent.

export type GroupId =
  | 'research_pipeline'
  | 'extraction_pipeline'
  | 'customer_support'
  | 'code_exploration';

export interface DomainMeta {
  id: GroupId;
  label: string; // full UI label
  short: string; // compact label for charts
  blurb: string; // one-line description
  archetype: string; // persona when this is the user's strongest domain
}

export const DOMAINS: Record<GroupId, DomainMeta> = {
  research_pipeline: {
    id: 'research_pipeline',
    label: 'Research pipelines',
    short: 'Research',
    blurb: 'Multi-agent orchestration, state recovery, and context-efficient hand-offs.',
    archetype: 'Orchestration Lead',
  },
  extraction_pipeline: {
    id: 'extraction_pipeline',
    label: 'Extraction pipelines',
    short: 'Extraction',
    blurb: 'Tool contract design, structured output, and reliable extraction.',
    archetype: 'Tooling Architect',
  },
  customer_support: {
    id: 'customer_support',
    label: 'Customer support agents',
    short: 'Support',
    blurb: 'Graceful degradation, escalation judgment, and honest failure handling.',
    archetype: 'Reliability Engineer',
  },
  code_exploration: {
    id: 'code_exploration',
    label: 'Code exploration',
    short: 'Code',
    blurb: 'Navigating large codebases and scoping agent searches.',
    archetype: 'Codebase Navigator',
  },
};

export const DOMAIN_ORDER: GroupId[] = [
  'research_pipeline',
  'extraction_pipeline',
  'customer_support',
  'code_exploration',
];

export function isGroupId(g: string): g is GroupId {
  return g in DOMAINS;
}

// Published CCA-F pass mark (Anthropic), on a 100-1000 scale.
export const PASS_SCORE = 720;
export const SCORE_MAX = 1000;

// Published blueprint facts for the About page. Only what is publicly sourced.
export const PUBLISHED_BLUEPRINT = {
  passScore: PASS_SCORE,
  scaleMax: SCORE_MAX,
  questionCount: 60,
  minutes: 120,
  scenarioTypes: 6,
  scenariosCoveredHere: 4,
  weightedDomains: [
    { name: 'Agentic architecture and orchestration', weight: 27 },
    { name: 'Tool design and MCP integration', weight: 18 },
  ],
};

export interface ScoredItem {
  group: string;
  chosenLetter: string | null;
  options: { letter: string; correct: boolean }[];
}

export interface DomainScore {
  id: GroupId;
  label: string;
  short: string;
  correct: number;
  total: number;
  pct: number;
}

// Compute correct/total/pct per domain from answered exam items.
export function computeDomainScores(items: ScoredItem[]): DomainScore[] {
  const acc: Record<string, { correct: number; total: number }> = {};
  for (const it of items) {
    if (!acc[it.group]) acc[it.group] = { correct: 0, total: 0 };
    acc[it.group].total += 1;
    const chosen = it.options.find((o) => o.letter === it.chosenLetter);
    if (chosen?.correct) acc[it.group].correct += 1;
  }
  return DOMAIN_ORDER.filter((id) => acc[id]).map((id) => {
    const a = acc[id];
    return {
      id,
      label: DOMAINS[id].label,
      short: DOMAINS[id].short,
      correct: a.correct,
      total: a.total,
      pct: a.total ? Math.round((a.correct / a.total) * 100) : 0,
    };
  });
}

export function strongestDomain(scores: DomainScore[]): DomainScore | null {
  if (scores.length === 0) return null;
  return [...scores].sort((a, b) => b.pct - a.pct)[0];
}

export function weakestDomain(scores: DomainScore[]): DomainScore | null {
  if (scores.length === 0) return null;
  return [...scores].sort((a, b) => a.pct - b.pct)[0];
}

// A light, shareable persona derived from the user's strongest domain.
export function archetypeFor(scores: DomainScore[]): string {
  const top = strongestDomain(scores);
  if (!top) return 'Claude Architect';
  return DOMAINS[top.id].archetype;
}

/** @deprecated alias */
export const OFFICIAL_BLUEPRINT = PUBLISHED_BLUEPRINT;
