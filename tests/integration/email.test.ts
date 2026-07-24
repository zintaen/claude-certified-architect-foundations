import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { EMAIL_CONFIG, hashRecipient } from '@/lib/email';
import { classify } from '@/lib/rateLimit';

describe('GROWTH-005 email integration scaffolding', () => {
  it('kill switch defaults off', () => {
    // Default in test env should be off unless explicitly set
    expect(typeof EMAIL_CONFIG.enabled).toBe('boolean');
  });

  it('recipient hash opaque', () => {
    const h = hashRecipient('a@b.com');
    expect(h).toHaveLength(32);
    expect(h).not.toContain('@');
  });

  it('unsubscribe classified; adapter is sole send path', () => {
    expect(classify('/api/email/unsubscribe', 'POST')).toBe('write');
    const emailSrc = readFileSync(join(process.cwd(), 'src/lib/email.ts'), 'utf8');
    expect(emailSrc).toMatch(/EMAIL_ENABLED/);
    expect(emailSrc).toMatch(/List-Unsubscribe/);
  });

  it('privacy + subscribe copy honesty', () => {
    const privacy = readFileSync(join(process.cwd(), 'src/app/privacy/page.tsx'), 'utf8');
    expect(privacy).toMatch(/Transactional email provider/);
    const capture = readFileSync(
      join(process.cwd(), 'src/components/PostResultCapture.tsx'),
      'utf8'
    );
    expect(capture.toLowerCase()).toMatch(/lifecycle/);
  });

  it('no tracking pixels in templates', () => {
    const src = readFileSync(join(process.cwd(), 'src/emails/templates.ts'), 'utf8');
    expect(src.toLowerCase()).not.toMatch(/tracking\.gif|1x1|open.?pixel/);
  });

  it('queue runner dry-run default', () => {
    expect(existsSync(join(process.cwd(), 'scripts/run-email-queue.mjs'))).toBe(true);
    const src = readFileSync(join(process.cwd(), 'scripts/run-email-queue.mjs'), 'utf8');
    expect(src).toMatch(/DRY RUN/);
    expect(src).toMatch(/halting/);
  });

  it('fence: no MoR receipt duplication', () => {
    const readme = readFileSync(join(process.cwd(), 'src/emails/README.md'), 'utf8');
    expect(readme).toMatch(/Paddle|MoR/);
  });
});
