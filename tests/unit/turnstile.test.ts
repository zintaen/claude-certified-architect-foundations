import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  verifyTurnstile,
  turnstileAllowsSubscribe,
  __resetTurnstileLogForTests,
} from '../../src/lib/turnstile';
import {
  CANARIES,
  CANARY_PRACTICE_FREQUENCY,
  isCanary,
  maybeMixCanaryIntoPractice,
  filterScoredIds,
} from '../../src/data/canary.server';

const ROOT = process.cwd();

describe('turnstile + canaries (SEC-001)', () => {
  beforeEach(() => {
    __resetTurnstileLogForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    __resetTurnstileLogForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('unconfigured env -> unconfigured_skip', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const r = await verifyTurnstile('tok', '1.1.1.1');
    expect(r).toEqual({ ok: false, reason: 'unconfigured_skip' });
    expect(turnstileAllowsSubscribe(r)).toBe(true);
  });

  it('missing/invalid token -> ok:false with reason', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 200,
        json: async () => ({ success: false }),
      }))
    );
    expect(await verifyTurnstile(null, '1.1.1.1')).toEqual({ ok: false, reason: 'missing' });
    const inv = await verifyTurnstile('bad', '1.1.1.1');
    expect(inv).toEqual({ ok: false, reason: 'invalid' });
    expect(turnstileAllowsSubscribe(inv)).toBe(false);
  });

  it('upstream 5xx -> outage_failopen', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 503,
        json: async () => ({}),
      }))
    );
    const r = await verifyTurnstile('tok', '1.1.1.1');
    expect(r).toEqual({ ok: false, reason: 'outage_failopen' });
    expect(turnstileAllowsSubscribe(r)).toBe(true);
  });

  it('canaries: >=10, excluded from scoring/readiness/leaderboard paths', () => {
    expect(CANARIES.length).toBeGreaterThanOrEqual(10);
    for (const c of CANARIES) {
      expect(isCanary(c.id)).toBe(true);
      expect(c.uniquePhrase.length).toBeGreaterThan(8);
    }
    expect(filterScoredIds(['Q1', 'canary-001', 'Q2'])).toEqual(['Q1', 'Q2']);
  });

  it('canary practice inclusion rate matches CANARY_PRACTICE_FREQUENCY', () => {
    expect(CANARY_PRACTICE_FREQUENCY).toBe(0.05);
    const pool = [{ id: 'Q1' }, { id: 'Q2' }];
    const mixed = maybeMixCanaryIntoPractice(pool, () => 0); // always include
    expect(mixed.some((q) => isCanary(q.id))).toBe(true);
    const skipped = maybeMixCanaryIntoPractice(pool, () => 0.99); // never include
    expect(skipped).toEqual(pool);
  });

  it('no api module pairs question text with answer key (import graph)', () => {
    // Public questions module must not export `correct` on options.
    const pub = readFileSync(join(ROOT, 'src/data/questions.public.ts'), 'utf8');
    expect(pub).not.toMatch(/correct:\s*true/);
    // answerKey lives only in questions.server.ts
    const server = readFileSync(join(ROOT, 'src/data/questions.server.ts'), 'utf8').slice(0, 500);
    expect(server).toMatch(/answer key|answerKey|SEC-001/i);

    // Client components must not import questions.server
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (name === 'node_modules' || name === '.next') continue;
          walk(p);
        } else if (/\.(tsx)$/.test(name) && !p.includes('/api/')) {
          const t = readFileSync(p, 'utf8');
          if (/questions\.server/.test(t)) bad.push(p);
        }
      }
    };
    walk(join(ROOT, 'src'));
    expect(bad).toEqual([]);
  });
});
