import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  INDEPENDENCE_DISCLAIMER,
  TRADEMARK_NOTICE,
  VENDOR_MARKS,
  BANNED_DESCRIPTORS,
  composeTrademarkNotice,
} from '../../src/lib/legal';

const ROOT = process.cwd();

describe('legal (LEGAL-001)', () => {
  it('independence disclaimer exact wording', () => {
    expect(INDEPENDENCE_DISCLAIMER).toBe(
      'CyberSkill is an independent practice-exam resource and is neither affiliated with, nor authorized, sponsored, or approved by, Anthropic, PBC.'
    );
  });

  it('trademark notice enumerates every vendor mark entry', () => {
    for (const entry of Object.values(VENDOR_MARKS)) {
      for (const mark of entry.marks) {
        expect(TRADEMARK_NOTICE).toContain(`${mark} is a trademark of ${entry.owner}.`);
      }
    }
  });

  it('banned descriptor list is word-boundary safe: unofficial not matched as official', () => {
    expect(BANNED_DESCRIPTORS).toContain('official');
    const re = /\bofficial\b/i;
    expect(re.test('unofficial')).toBe(false);
    expect(re.test('the official guide')).toBe(true);
  });

  it('precommit chain includes check-brand-terms', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.precommit).toMatch(/check-brand-terms/);
  });

  it('no vendor logo/badge assets in public/ or src/', () => {
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (name === 'node_modules' || name === '.next') continue;
          walk(p);
        } else if (/anthropic|claude.*(logo|badge|mark)/i.test(name)) {
          bad.push(p);
        }
      }
    };
    walk(join(ROOT, 'public'));
    walk(join(ROOT, 'src'));
    expect(bad).toEqual([]);
  });

  it('data-driven vendors flow into composeTrademarkNotice', () => {
    const notice = composeTrademarkNotice({
      anthropic: VENDOR_MARKS.anthropic,
      aws: { owner: 'Amazon.com, Inc.', marks: ['AWS'] },
    });
    expect(notice).toContain('AWS is a trademark of Amazon.com, Inc.');
  });

  it('check-brand-terms exits 0 on committed tree', () => {
    const r = spawnSync(process.execPath, ['scripts/check-brand-terms.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
  });
});
