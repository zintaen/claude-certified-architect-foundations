/**
 * Free-tier policy per exam (PAY-001).
 * Doc range for free_question_cap: 20–40. Operator default: 30 (mid-range).
 * free_full_mocks: 1 per exam per user (doc free line).
 */
export type FreePolicy = {
  free_question_cap: number;
  free_full_mocks: number;
};

const DEFAULT: FreePolicy = {
  // Doc §C free line: 20–40 questions; mid-range default chosen at PAY-001 ship.
  free_question_cap: 30,
  free_full_mocks: 1,
};

/** Per-exam overrides (optional). Missing codes fall back to DEFAULT. */
const BY_EXAM: Record<string, Partial<FreePolicy>> = {
  ccaf: {},
  'ccdv-f': {},
};

export function freePolicyForExam(examCode: string): FreePolicy {
  const o = BY_EXAM[examCode.toLowerCase()] ?? {};
  return {
    free_question_cap: o.free_question_cap ?? DEFAULT.free_question_cap,
    free_full_mocks: o.free_full_mocks ?? DEFAULT.free_full_mocks,
  };
}

/** Stable free subset: lexicographic item ids, first N. */
export function pickFreeSubset<T extends { id: string }>(items: T[], cap: number): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id)).slice(0, Math.max(0, cap));
}
