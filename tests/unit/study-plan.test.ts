import { describe, it, expect } from 'vitest';
import { assemblePlan, PLAN_CONFIG } from '@/lib/studyPlan';

describe('LEARN-004 study plan unit', () => {
  it('assembles weeks from deficits without LLM', () => {
    const plan = assemblePlan(
      {
        examCode: 'ccaf',
        examDate: '2026-10-01',
        hoursPerWeek: 8,
        tier: 'premium',
      },
      [
        { domainKey: 'research_pipeline', deficit: 0.8 },
        { domainKey: 'code_exploration', deficit: 0.3 },
      ]
    );
    expect(plan.weeks.length).toBeGreaterThan(0);
    expect(plan.planVersion).toBe(1);
    expect(plan.weeks[0]?.drills[0]?.domainKey).toBe('research_pipeline');
  });

  it('honest warning when timeline too short', () => {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 3);
    const plan = assemblePlan(
      {
        examCode: 'ccaf',
        examDate: tomorrow.toISOString().slice(0, 10),
        hoursPerWeek: 2,
        tier: 'premium',
      },
      [{ domainKey: 'research_pipeline', deficit: 1 }]
    );
    expect(plan.honestWarning).toBeTruthy();
    expect(PLAN_CONFIG.minHoursFloor).toBeGreaterThan(0);
  });

  it('free tier schedules no mocks', () => {
    const plan = assemblePlan(
      {
        examCode: 'ccaf',
        examDate: '2026-12-01',
        hoursPerWeek: 10,
        tier: 'free',
      },
      [{ domainKey: 'research_pipeline', deficit: 0.5 }]
    );
    expect(plan.weeks.every((w) => w.mocks === 0)).toBe(true);
  });
});
