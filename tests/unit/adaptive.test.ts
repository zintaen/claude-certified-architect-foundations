import { describe, it, expect } from 'vitest';
import { DRILL_CONFIG, nextDifficultyBias, planDrillFromState, rngFromSeed } from '@/lib/adaptive';

describe('LEARN-002 adaptive unit', () => {
  it('seeded RNG is deterministic', () => {
    const a = rngFromSeed('abc');
    const b = rngFromSeed('abc');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('higher deficit domains get more slots', () => {
    const candidates = [];
    for (const dk of ['weak', 'strong'] as const) {
      for (let i = 0; i < 30; i++) {
        candidates.push({
          id: `${dk}-${i}`,
          domainKey: dk,
          pValue: 0.5,
        });
      }
    }
    const plan = planDrillFromState({
      length: 20,
      seed: 'deficit-test',
      deficits: [
        { domainKey: 'weak', deficit: 0.9 },
        { domainKey: 'strong', deficit: 0.1 },
      ],
      masteryByDomain: { weak: 0.3, strong: 0.8 },
      candidates,
      recentItemIds: new Set(),
    });
    const weakCount = plan.itemIds.filter((id) => id.startsWith('weak-')).length;
    const strongCount = plan.itemIds.filter((id) => id.startsWith('strong-')).length;
    expect(weakCount).toBeGreaterThan(strongCount);
    expect(plan.policyVersion).toBe(1);
    expect(plan.focusedOn).toMatch(/weak/);
  });

  it('uncalibrated candidates still select', () => {
    const plan = planDrillFromState({
      length: 10,
      seed: 'uncal',
      deficits: [{ domainKey: 'research_pipeline', deficit: 0.7 }],
      masteryByDomain: { research_pipeline: 0.4 },
      candidates: Array.from({ length: 20 }, (_, i) => ({
        id: `Q${i}`,
        domainKey: 'research_pipeline',
      })),
      recentItemIds: new Set(),
    });
    expect(plan.itemIds.length).toBeGreaterThan(0);
  });

  it('recent items down-weighted', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      id: `i${i}`,
      domainKey: 'd',
      pValue: 0.5,
    }));
    const withRecent = planDrillFromState({
      length: 3,
      seed: 'exp',
      deficits: [{ domainKey: 'd', deficit: 1 }],
      masteryByDomain: { d: 0.5 },
      candidates,
      recentItemIds: new Set(['i0', 'i1', 'i2', 'i3', 'i4']),
    });
    // Prefer non-recent when available
    expect(withRecent.itemIds.some((id) => !['i0', 'i1', 'i2', 'i3', 'i4'].includes(id))).toBe(
      true
    );
  });

  it('difficulty bias helper', () => {
    expect(
      nextDifficultyBias({ domainKey: 'd', recentCorrectStreak: 3, recentMissStreak: 0 })
    ).toBe('harder');
    expect(
      nextDifficultyBias({ domainKey: 'd', recentCorrectStreak: 0, recentMissStreak: 2 })
    ).toBe('easier');
    expect(
      nextDifficultyBias({ domainKey: 'd', recentCorrectStreak: 1, recentMissStreak: 0 })
    ).toBe('hold');
  });

  it('same seed same plan', () => {
    const input = {
      length: 8,
      seed: 'same',
      deficits: [
        { domainKey: 'a', deficit: 0.8 },
        { domainKey: 'b', deficit: 0.4 },
      ],
      masteryByDomain: { a: 0.3, b: 0.6 },
      candidates: [
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `a${i}`,
          domainKey: 'a',
          pValue: 0.4,
        })),
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `b${i}`,
          domainKey: 'b',
          pValue: 0.6,
        })),
      ],
      recentItemIds: new Set<string>(),
    };
    expect(planDrillFromState(input).itemIds).toEqual(planDrillFromState(input).itemIds);
    expect(DRILL_CONFIG.lengths).toContain(15);
  });
});
