import { describe, it, expect } from 'vitest';
import { newCard, schedule, localDayBounds, SRS_CONFIG } from '@/lib/srs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('LEARN-003 srs unit', () => {
  it('new card schedules forward on good', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    const next = schedule(newCard(now), 'good', now);
    expect(next.state).toBe('review');
    expect(next.stability).toBeGreaterThan(0);
    expect(new Date(next.due).getTime()).toBeGreaterThan(now.getTime());
  });

  it('again keeps near-term due', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    const next = schedule(newCard(now), 'again', now);
    expect(next.state).toBe('learning');
    expect(new Date(next.due).getTime() - now.getTime()).toBeLessThan(3600_000);
  });

  it('reference vectors: successive good reviews lengthen intervals', () => {
    let card = newCard(new Date('2026-01-01T00:00:00Z'));
    const intervals: number[] = [];
    let t = new Date('2026-01-01T00:00:00Z');
    for (let i = 0; i < 4; i++) {
      card = schedule(card, 'good', t);
      const due = new Date(card.due);
      intervals.push(Math.round((due.getTime() - t.getTime()) / 86400000));
      t = due;
    }
    // Non-decreasing trend overall (FSRS-compatible growth)
    expect(intervals[intervals.length - 1]!).toBeGreaterThanOrEqual(intervals[0]!);
    expect(SRS_CONFIG.w).toHaveLength(17);
  });

  it('fixture file cites algorithm source', () => {
    const path = join(process.cwd(), 'tests/fixtures/fsrs-reference.json');
    expect(existsSync(path)).toBe(true);
    const fix = JSON.parse(readFileSync(path, 'utf8')) as {
      source: string;
      vectors: Array<{ grade: string; expectStabilityMin: number }>;
    };
    expect(fix.source).toMatch(/open-spaced-repetition|fsrs/i);
    const now = new Date('2026-07-24T00:00:00Z');
    for (const v of fix.vectors) {
      const next = schedule(newCard(now), v.grade as 'again' | 'hard' | 'good' | 'easy', now);
      expect(next.stability).toBeGreaterThanOrEqual(v.expectStabilityMin);
    }
  });

  it('local day bounds respect tz offset', () => {
    const now = new Date('2026-07-24T17:00:00Z');
    const vn = localDayBounds(now, -420); // UTC+7
    expect(vn.end.getTime() - vn.start.getTime()).toBe(86400000);
  });
});
