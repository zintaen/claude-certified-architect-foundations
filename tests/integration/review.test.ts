import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { classify } from '@/lib/rateLimit';

describe('LEARN-003 review integration scaffolding', () => {
  it('review API classified', () => {
    expect(classify('/api/review', 'GET')).toBe('read');
    expect(classify('/api/review', 'POST')).toBe('write');
  });

  it('migration + review page + dashboard badge', () => {
    expect(
      existsSync(join(process.cwd(), 'supabase/migrations/20260920000001_review_cards.sql'))
    ).toBe(true);
    expect(existsSync(join(process.cwd(), 'src/app/review/page.tsx'))).toBe(true);
    const dash = readFileSync(join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
    expect(dash).toMatch(/ReviewDueBadge/);
  });

  it('grade path accrues miss cards', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/exam/grade/route.ts'), 'utf8');
    expect(src).toMatch(/upsertMissCard/);
  });

  it('premium gate; analytics kinds only', () => {
    const api = readFileSync(join(process.cwd(), 'src/app/api/review/route.ts'), 'utf8');
    expect(api).toMatch(/premium_required/);
    const analytics = readFileSync(join(process.cwd(), 'src/lib/analytics.ts'), 'utf8');
    expect(analytics).toMatch(/review_card_graded/);
    expect(analytics).toMatch(/kind: string/);
  });

  it('fence: no LLM; free flashcards surface still present', () => {
    const srs = readFileSync(join(process.cwd(), 'src/lib/srs.ts'), 'utf8');
    expect(srs).not.toMatch(/openai|@ai-sdk/i);
    expect(existsSync(join(process.cwd(), 'src/app/flashcards/page.tsx'))).toBe(true);
  });
});
