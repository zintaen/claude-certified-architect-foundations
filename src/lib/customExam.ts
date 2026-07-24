/**
 * Custom exam constraint model (LEARN-005).
 * Validation is pure; assembly uses the filtered pool via the practice engine.
 */
import { DOMAIN_ORDER, type GroupId, isGroupId } from '@/lib/domains';
import { questions } from '@/data/questions';

export type DifficultyBand = 'easier' | 'mixed' | 'harder';

export type CustomExamSpec = {
  examCode: string;
  domainKeys: string[];
  count: number;
  timing: 'timed' | 'untimed';
  band: DifficultyBand;
};

export const CUSTOM_EXAM_CONFIG = {
  countPresets: [10, 20, 30, 40],
  minCount: 5,
  maxCount: 60,
};

export type CustomExamValidation =
  | {
      ok: true;
      spec: CustomExamSpec;
      available: number;
      itemIds: string[];
      bandNote?: string;
    }
  | { ok: false; error: string; available?: number };

/** Pure: validate constraints and pick item ids (no cross-domain padding). */
export function validateAndSelect(
  spec: CustomExamSpec,
  opts?: { seed?: number }
): CustomExamValidation {
  if (spec.examCode !== 'ccaf' && spec.examCode !== 'ccar-f') {
    return { ok: false, error: 'unsupported_exam' };
  }
  const domains = [...new Set(spec.domainKeys)].filter(isGroupId);
  if (!domains.length) return { ok: false, error: 'domains_required' };
  if (spec.count < CUSTOM_EXAM_CONFIG.minCount || spec.count > CUSTOM_EXAM_CONFIG.maxCount) {
    return { ok: false, error: 'count_out_of_range' };
  }

  let pool = questions.filter(
    (q) => domains.includes(q.group as GroupId) && !String(q.id).startsWith('canary-')
  );
  // Difficulty band: no item_stats on CCAF public bank → degrade to mixed with note
  let bandNote: string | undefined;
  if (spec.band !== 'mixed') {
    bandNote =
      'Difficulty band requested, but calibrated item_stats are not available for this bank — using mixed.';
  }

  const available = pool.length;
  if (available === 0) return { ok: false, error: 'no_items', available: 0 };

  // Deterministic shuffle under seed
  const seed = opts?.seed ?? Date.now();
  pool = [...pool].sort((a, b) => {
    const ha = hash(`${seed}:${a.id}`);
    const hb = hash(`${seed}:${b.id}`);
    return ha - hb;
  });

  if (available < spec.count) {
    return {
      ok: true,
      spec: { ...spec, count: available, band: 'mixed' },
      available,
      itemIds: pool.map((q) => q.id),
      bandNote: bandNote
        ? `${bandNote} Only ${available} items available in selected domains (requested ${spec.count}).`
        : `Only ${available} items available in selected domains (requested ${spec.count}).`,
    };
  }

  return {
    ok: true,
    spec: { ...spec, band: bandNote ? 'mixed' : spec.band },
    available,
    itemIds: pool.slice(0, spec.count).map((q) => q.id),
    bandNote,
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function defaultSpec(): CustomExamSpec {
  return {
    examCode: 'ccaf',
    domainKeys: [...DOMAIN_ORDER],
    count: 20,
    timing: 'untimed',
    band: 'mixed',
  };
}
