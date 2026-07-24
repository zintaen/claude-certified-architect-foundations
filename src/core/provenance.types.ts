/**
 * Provenance schema for CCAF (and future) item records.
 * Shared by the retroactive attestation pass (CONTENT-001) and the
 * generation pipeline writer (CONTENT-002).
 */

export interface BlueprintRef {
  domain: string;
  objective: string;
  blueprint_doc: string; /* repo path */
}

export type OriginMethod = 'blueprint_generation' | 'human_authored' | 'retroactive_attestation';

export type SimilarityVerdict = 'clear' | 'over_threshold';

export type ItemDisposition = 'active' | 'flagged_for_review' | 'retired';

export interface ItemOrigin {
  method: OriginMethod;
  model?: string;
  prompt_ref?: string;
  generated_at?: string;
}

export interface SimilarityCheck {
  method: string;
  corpus_ref: string;
  max_score: number;
  verdict: SimilarityVerdict;
  checked_at: string;
}

export interface ItemProvenance {
  item_id: string;
  blueprint_ref: BlueprintRef;
  origin: ItemOrigin;
  reviewer: string;
  reviewed_at: string;
  similarity_check: SimilarityCheck;
  disposition: ItemDisposition;
  record_version: 1;
}

/** Stable key order for deterministic JSON serialization. */
export const PROVENANCE_KEY_ORDER = [
  'item_id',
  'blueprint_ref',
  'origin',
  'reviewer',
  'reviewed_at',
  'similarity_check',
  'disposition',
  'record_version',
] as const;

export const ORIGIN_METHODS_WITH_GENERATED_AT: ReadonlySet<OriginMethod> = new Set([
  'blueprint_generation',
  'human_authored',
]);

export function assertHonestOrigin(origin: ItemOrigin): void {
  if (origin.method === 'retroactive_attestation') {
    if (
      origin.model !== undefined ||
      origin.prompt_ref !== undefined ||
      origin.generated_at !== undefined
    ) {
      throw new Error(
        'retroactive_attestation must omit model, prompt_ref, and generated_at (unknowns are not reconstructed)'
      );
    }
  }
  if (origin.generated_at !== undefined && !ORIGIN_METHODS_WITH_GENERATED_AT.has(origin.method)) {
    throw new Error(
      `generated_at is only valid with method blueprint_generation | human_authored (got ${origin.method})`
    );
  }
}
