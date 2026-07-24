/**
 * Stable SKU registry (PAY-001). Ids are permanent API surface for PAY-002 —
 * renames after first grant are prohibited.
 */
export type SkuId =
  | 'per_exam_pass'
  | 'all_access_monthly'
  | 'all_access_annual'
  | 'lifetime'
  | 'team_seats';

export interface SkuDef {
  id: SkuId;
  scope: 'exam' | 'all';
  /** null = no expiry */
  durationDays: number | null;
  /** Reserved identifiers not implemented in this task */
  reserved?: boolean;
}

export const SKUS: Record<SkuId, SkuDef> = {
  per_exam_pass: {
    id: 'per_exam_pass',
    scope: 'exam',
    durationDays: 90,
  },
  all_access_monthly: {
    id: 'all_access_monthly',
    scope: 'all',
    durationDays: 30,
  },
  all_access_annual: {
    id: 'all_access_annual',
    scope: 'all',
    durationDays: 365,
  },
  lifetime: {
    id: 'lifetime',
    scope: 'all',
    durationDays: null,
  },
  team_seats: {
    id: 'team_seats',
    scope: 'all',
    durationDays: null,
    reserved: true,
  },
};

/** Implemented (sellable) SKUs — excludes reserved. */
export const ACTIVE_SKU_IDS = (Object.keys(SKUS) as SkuId[]).filter(
  (id) => !SKUS[id].reserved
) as Exclude<SkuId, 'team_seats'>[];
