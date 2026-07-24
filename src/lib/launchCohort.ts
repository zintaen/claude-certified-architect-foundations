/**
 * Launch-cohort bootstrap (CONTENT-003 §1 #4).
 * Launch items may be scored with calibration: provisional; post-threshold re-verdict required.
 */

export type LaunchDecision = {
  examCode: string;
  decidedAt: string;
  operator: string;
  note: string;
  itemExternalKeys: string[];
};

export function markProvisionalProvenance<T extends { provenance?: Record<string, unknown> }>(
  item: T
): T {
  const provenance = {
    ...(item.provenance || {}),
    calibration: 'provisional',
  };
  return { ...item, provenance };
}

export function shouldRecalibrateLaunchCohort(input: {
  responseCount: number;
  minResponses: number;
}): boolean {
  return input.responseCount >= input.minResponses;
}

export function recalibrateVerdict(input: {
  provisional: boolean;
  statsOk: boolean;
}): 'approved' | 'revise' {
  if (!input.provisional) return 'approved';
  return input.statsOk ? 'approved' : 'revise';
}
