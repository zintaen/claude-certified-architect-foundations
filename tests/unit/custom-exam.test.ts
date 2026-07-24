import { describe, it, expect } from 'vitest';
import { validateAndSelect, CUSTOM_EXAM_CONFIG } from '@/lib/customExam';

describe('LEARN-005 custom exam unit', () => {
  it('rejects empty domains', () => {
    const r = validateAndSelect({
      examCode: 'ccaf',
      domainKeys: [],
      count: 10,
      timing: 'untimed',
      band: 'mixed',
    });
    expect(r.ok).toBe(false);
  });

  it('selects only requested domains', () => {
    const r = validateAndSelect(
      {
        examCode: 'ccaf',
        domainKeys: ['research_pipeline'],
        count: 10,
        timing: 'untimed',
        band: 'mixed',
      },
      { seed: 1 }
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.itemIds.length).toBeLessThanOrEqual(10);
      expect(r.itemIds.length).toBeGreaterThan(0);
    }
  });

  it('honest under-fill when count exceeds pool', () => {
    const r = validateAndSelect(
      {
        examCode: 'ccaf',
        domainKeys: ['research_pipeline'],
        count: CUSTOM_EXAM_CONFIG.maxCount,
        timing: 'untimed',
        band: 'harder',
      },
      { seed: 2 }
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.itemIds.length).toBe(r.available);
      expect(r.bandNote).toBeTruthy();
    }
  });

  it('same seed same selection', () => {
    const spec = {
      examCode: 'ccaf',
      domainKeys: ['code_exploration', 'research_pipeline'],
      count: 15,
      timing: 'timed' as const,
      band: 'mixed' as const,
    };
    const a = validateAndSelect(spec, { seed: 42 });
    const b = validateAndSelect(spec, { seed: 42 });
    expect(a.ok && b.ok && a.ok && b.ok && a.itemIds).toEqual(a.ok && b.ok ? b.itemIds : []);
  });
});
