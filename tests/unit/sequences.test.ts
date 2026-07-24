import { describe, it, expect } from 'vitest';
import { adjacentExamCodes, evaluateDue, SEQUENCES } from '@/lib/sequences';
import { buildEmail } from '@/emails/templates';
import { INDEPENDENCE_DISCLAIMER } from '@/lib/legal';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const catalog = [
  { code: 'ccaf', vendorKey: 'anthropic' },
  { code: 'ccao-f', vendorKey: 'anthropic' },
  { code: 'ccdv-f', vendorKey: 'anthropic' },
  { code: 'ccar-p', vendorKey: 'anthropic' },
  { code: 'other-vendor-exam', vendorKey: 'aws' },
];

describe('GROWTH-005 sequences unit', () => {
  it('defines five sequences', () => {
    expect(SEQUENCES).toHaveLength(5);
    expect(SEQUENCES.map((s) => s.key).sort()).toEqual(
      ['exam_week', 'first_mock_nudge', 'post_pass_multi_cert', 'welcome', 'win_back'].sort()
    );
  });

  it('adjacency is registry-driven by vendor', () => {
    const recs = adjacentExamCodes('ccaf', catalog);
    expect(recs).toContain('ccao-f');
    expect(recs).toContain('ccdv-f');
    expect(recs).not.toContain('ccaf');
    expect(recs).not.toContain('other-vendor-exam');
    const withExtra = adjacentExamCodes('ccaf', [
      ...catalog,
      { code: 'new-anth', vendorKey: 'anthropic' },
    ]);
    expect(withExtra).toContain('new-anth');
  });

  it('welcome fires for new subscriber; first_mock exits when mock exists', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    const welcome = evaluateDue(
      now,
      [
        {
          email: 'a@b.com',
          subscribedAt: new Date('2026-07-24T10:00:00Z'),
          hasMock: false,
          lastActivityAt: null,
          passedMock: false,
          passedExamCode: null,
          examDate: null,
        },
      ],
      {
        suppressed: new Set(),
        already: new Set(),
        catalog,
        dailyRemaining: 10,
        weekCounts: new Map(),
        perRecipientPerWeek: 2,
      }
    );
    expect(welcome[0]?.template).toBe('welcome');

    const nudged = evaluateDue(
      now,
      [
        {
          email: 'a@b.com',
          subscribedAt: new Date('2026-07-20T10:00:00Z'),
          hasMock: false,
          lastActivityAt: null,
          passedMock: false,
          passedExamCode: null,
          examDate: null,
        },
      ],
      {
        suppressed: new Set(),
        already: new Set(['a@b.com|welcome']),
        catalog,
        dailyRemaining: 10,
        weekCounts: new Map(),
        perRecipientPerWeek: 2,
      }
    );
    expect(nudged[0]?.template).toBe('first_mock_nudge');

    const exited = evaluateDue(
      now,
      [
        {
          email: 'a@b.com',
          subscribedAt: new Date('2026-07-20T10:00:00Z'),
          hasMock: true,
          lastActivityAt: now,
          passedMock: false,
          passedExamCode: null,
          examDate: null,
        },
      ],
      {
        suppressed: new Set(),
        already: new Set(['a@b.com|welcome']),
        catalog,
        dailyRemaining: 10,
        weekCounts: new Map(),
        perRecipientPerWeek: 2,
      }
    );
    expect(exited.find((d) => d.template === 'first_mock_nudge')).toBeUndefined();
  });

  it('suppression and caps exclude', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    const suppressed = evaluateDue(
      now,
      [
        {
          email: 'x@y.com',
          subscribedAt: new Date('2026-07-24T10:00:00Z'),
          hasMock: false,
          lastActivityAt: null,
          passedMock: false,
          passedExamCode: null,
          examDate: null,
        },
      ],
      {
        suppressed: new Set(['x@y.com']),
        already: new Set(),
        catalog,
        dailyRemaining: 10,
        weekCounts: new Map(),
        perRecipientPerWeek: 2,
      }
    );
    expect(suppressed).toHaveLength(0);

    const capped = evaluateDue(
      now,
      [
        {
          email: 'x@y.com',
          subscribedAt: new Date('2026-07-24T10:00:00Z'),
          hasMock: false,
          lastActivityAt: null,
          passedMock: false,
          passedExamCode: null,
          examDate: null,
        },
      ],
      {
        suppressed: new Set(),
        already: new Set(),
        catalog,
        dailyRemaining: 0,
        weekCounts: new Map(),
        perRecipientPerWeek: 2,
      }
    );
    expect(capped).toHaveLength(0);
  });

  it('post_pass includes recommendations', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    const due = evaluateDue(
      now,
      [
        {
          email: 'p@q.com',
          subscribedAt: new Date('2026-07-01T10:00:00Z'),
          hasMock: true,
          lastActivityAt: new Date('2026-07-22T10:00:00Z'),
          passedMock: true,
          passedExamCode: 'ccaf',
          examDate: null,
        },
      ],
      {
        suppressed: new Set(),
        already: new Set(['p@q.com|welcome', 'p@q.com|first_mock_nudge']),
        catalog,
        dailyRemaining: 10,
        weekCounts: new Map(),
        perRecipientPerWeek: 2,
      }
    );
    const pass = due.find((d) => d.template === 'post_pass_multi_cert');
    expect(pass).toBeTruthy();
    expect(pass?.data.recommendations).toContain('ccao-f');
  });

  it('templates: disclaimer, footer, no pixel, no dark patterns', () => {
    for (const key of [
      'welcome',
      'first_mock_nudge',
      'exam_week',
      'post_pass_multi_cert',
      'win_back',
    ] as const) {
      const built = buildEmail(key, {
        unsubscribeUrl: 'https://example.com/unsub',
        recommendations: ['ccao-f'],
      });
      expect(built.text).toContain(INDEPENDENCE_DISCLAIMER);
      expect(built.html).toMatch(/Unsubscribe/i);
      expect(built.html.toLowerCase()).not.toMatch(/tracking\.gif|open-pixel|beacon/);
      expect(built.text.toLowerCase()).not.toMatch(/\bhurry\b|\bact now\b|\blimited time\b/);
    }
  });

  it('migration + queue script exist', () => {
    expect(
      existsSync(join(process.cwd(), 'supabase/migrations/20261020000000_email_sends.sql'))
    ).toBe(true);
    expect(existsSync(join(process.cwd(), 'scripts/run-email-queue.mjs'))).toBe(true);
  });
});
