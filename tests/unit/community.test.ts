import { describe, it, expect } from 'vitest';
import {
  COMMUNITY_CONFIG,
  hashItemId,
  recallPatternHits,
  sanitizeCommunityBody,
} from '@/lib/community';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('GROWTH-004 community unit', () => {
  it('length config positive', () => {
    expect(COMMUNITY_CONFIG.maxBodyChars).toBeGreaterThan(100);
  });

  it('sanitization neutralizes XSS fixture', () => {
    const dirty = '<script>alert(1)</script>Hello <b>world</b> <img src=x onerror=alert(1)>';
    const clean = sanitizeCommunityBody(dirty);
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/onerror/i);
    expect(clean).toMatch(/Hello/);
    expect(clean).toMatch(/world/);
  });

  it('item id hash stable opaque', () => {
    const h = hashItemId('Q42');
    expect(h).toHaveLength(16);
    expect(h).not.toBe('Q42');
  });

  it('recall heuristics highlight candidates', () => {
    expect(recallPatternHits('On the actual exam this was A')).toContain('actual/real exam recall');
    expect(recallPatternHits('Normal study tip about context windows')).toEqual([]);
  });

  it('migration + moderation script exist', () => {
    expect(
      existsSync(
        join(process.cwd(), 'supabase/migrations/20261015000000_community_explanations.sql')
      )
    ).toBe(true);
    expect(existsSync(join(process.cwd(), 'scripts/moderate-explanations.mjs'))).toBe(true);
    const script = readFileSync(join(process.cwd(), 'scripts/moderate-explanations.mjs'), 'utf8');
    expect(script).toMatch(/CONTAMINATION SCREEN/);
    expect(script).toMatch(/DRY RUN/);
    expect(script).toMatch(/human only|Operator judgment required/i);
    expect(script).not.toMatch(/\bauto-approve\b/i);
  });

  it('analytics events hashed ids only', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/analytics.ts'), 'utf8');
    expect(src).toMatch(/community_explanation_submitted/);
    expect(src).toMatch(/item_id_hash/);
    expect(src).not.toMatch(/community_explanation_submitted.*body/);
  });
});
