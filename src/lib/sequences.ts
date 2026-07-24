/**
 * Lifecycle sequences (GROWTH-005). Declarative rules over signals.
 *
 * Timings (operator config via env):
 * - FIRST_MOCK_WAIT_DAYS (default 3)
 * - EXAM_WEEK_DAYS (default 7)
 * - WIN_BACK_WEEKS (default 4)
 */
import 'server-only';
import type { TemplateKey } from '@/emails/templates';
import {
  EMAIL_CONFIG,
  alreadySent,
  isSuppressed,
  recipientWeekCount,
  sendsTodayCount,
} from '@/lib/email';

export type TriggerSpec =
  | { kind: 'subscribed' }
  | { kind: 'subscribed_no_mock'; waitDays: number }
  | { kind: 'exam_date_within'; days: number }
  | { kind: 'passed_mock' }
  | { kind: 'inactive'; weeks: number };

export type ExitSpec =
  | { kind: 'none' }
  | { kind: 'has_mock' }
  | { kind: 'exam_passed_or_date_gone' }
  | { kind: 'became_active' };

export interface SequenceRule {
  key: string;
  trigger: TriggerSpec;
  audience: 'subscribers' | 'action_takers';
  template: TemplateKey;
  exit: ExitSpec;
  waitDays: number;
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const SEQUENCES: SequenceRule[] = [
  {
    key: 'welcome',
    trigger: { kind: 'subscribed' },
    audience: 'subscribers',
    template: 'welcome',
    exit: { kind: 'none' },
    waitDays: 0,
  },
  {
    key: 'first_mock_nudge',
    trigger: { kind: 'subscribed_no_mock', waitDays: envInt('FIRST_MOCK_WAIT_DAYS', 3) },
    audience: 'subscribers',
    template: 'first_mock_nudge',
    exit: { kind: 'has_mock' },
    waitDays: envInt('FIRST_MOCK_WAIT_DAYS', 3),
  },
  {
    key: 'exam_week',
    trigger: { kind: 'exam_date_within', days: envInt('EXAM_WEEK_DAYS', 7) },
    audience: 'subscribers',
    template: 'exam_week',
    exit: { kind: 'exam_passed_or_date_gone' },
    waitDays: 0,
  },
  {
    key: 'post_pass_multi_cert',
    trigger: { kind: 'passed_mock' },
    audience: 'subscribers',
    template: 'post_pass_multi_cert',
    exit: { kind: 'none' },
    waitDays: 1,
  },
  {
    key: 'win_back',
    trigger: { kind: 'inactive', weeks: envInt('WIN_BACK_WEEKS', 4) },
    audience: 'subscribers',
    template: 'win_back',
    exit: { kind: 'became_active' },
    waitDays: envInt('WIN_BACK_WEEKS', 4) * 7,
  },
];

/** Catalog adjacency: same vendor, exclude self. Pure for tests. */
export function adjacentExamCodes(
  passedCode: string,
  catalog: Array<{ code: string; vendorKey: string }>
): string[] {
  const self = catalog.find((e) => e.code === passedCode);
  if (!self) return catalog.filter((e) => e.code !== passedCode).map((e) => e.code);
  return catalog
    .filter((e) => e.vendorKey === self.vendorKey && e.code !== passedCode)
    .map((e) => e.code);
}

export type SubscriberSignal = {
  email: string;
  subscribedAt: Date;
  hasMock: boolean;
  lastActivityAt: Date | null;
  passedMock: boolean;
  passedExamCode: string | null;
  examDate: Date | null; // from study plan / profile when LEARN-004 ships
};

export type DueSend = {
  to: string;
  template: TemplateKey;
  sequence: string;
  data: Record<string, unknown>;
};

/** Pure evaluation used by dueSends and unit tests. */
export function evaluateDue(
  now: Date,
  signals: SubscriberSignal[],
  opts: {
    suppressed: Set<string>;
    already: Set<string>; // `${email}|${template}`
    catalog: Array<{ code: string; vendorKey: string }>;
    dailyRemaining: number;
    weekCounts: Map<string, number>;
    perRecipientPerWeek: number;
  }
): DueSend[] {
  const out: DueSend[] = [];
  let remaining = opts.dailyRemaining;

  for (const s of signals) {
    if (remaining <= 0) break;
    const email = s.email.toLowerCase();
    if (opts.suppressed.has(email)) continue;
    const week = opts.weekCounts.get(email) ?? 0;
    if (week >= opts.perRecipientPerWeek) continue;

    for (const rule of SEQUENCES) {
      if (remaining <= 0) break;
      if (rule.audience !== 'subscribers') continue;
      const key = `${email}|${rule.template}`;
      if (opts.already.has(key)) continue;

      if (!matchesTrigger(now, s, rule)) continue;
      if (exited(now, s, rule)) continue;

      const data: Record<string, unknown> = {
        siteOrigin: EMAIL_CONFIG.siteOrigin,
      };
      if (rule.template === 'post_pass_multi_cert' && s.passedExamCode) {
        data.recommendations = adjacentExamCodes(s.passedExamCode, opts.catalog);
      }

      out.push({ to: email, template: rule.template, sequence: rule.key, data });
      opts.already.add(key);
      remaining -= 1;
      opts.weekCounts.set(email, week + 1);
      break; // one sequence per recipient per run
    }
  }
  return out;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

function matchesTrigger(now: Date, s: SubscriberSignal, rule: SequenceRule): boolean {
  const t = rule.trigger;
  switch (t.kind) {
    case 'subscribed':
      return daysBetween(now, s.subscribedAt) >= rule.waitDays;
    case 'subscribed_no_mock':
      return !s.hasMock && daysBetween(now, s.subscribedAt) >= t.waitDays;
    case 'exam_date_within':
      if (!s.examDate) return false;
      {
        const d = daysBetween(s.examDate, now);
        return d >= 0 && d <= t.days;
      }
    case 'passed_mock':
      return s.passedMock && daysBetween(now, s.lastActivityAt || s.subscribedAt) >= rule.waitDays;
    case 'inactive':
      if (!s.lastActivityAt) return daysBetween(now, s.subscribedAt) >= t.weeks * 7;
      return daysBetween(now, s.lastActivityAt) >= t.weeks * 7;
    default: {
      const _e: never = t;
      return _e;
    }
  }
}

function exited(now: Date, s: SubscriberSignal, rule: SequenceRule): boolean {
  const e = rule.exit;
  switch (e.kind) {
    case 'none':
      return false;
    case 'has_mock':
      return s.hasMock;
    case 'exam_passed_or_date_gone':
      if (s.passedMock) return true;
      if (!s.examDate) return true;
      return s.examDate.getTime() < now.getTime();
    case 'became_active':
      if (!s.lastActivityAt) return false;
      return daysBetween(now, s.lastActivityAt) < envInt('WIN_BACK_WEEKS', 4) * 7;
    default: {
      const _e: never = e;
      return _e;
    }
  }
}

/** Load signals from DB (subscribers + activity heuristics). */
export async function loadSubscriberSignals(): Promise<SubscriberSignal[]> {
  const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
  if (!supabaseAdmin) return [];
  // Legacy + platform tables accessed via service role; typings omit some legacy relations.
  const db = supabaseAdmin as any;

  const { data: subs } = await db.from('subscribers').select('email, created_at, source');
  const out: SubscriberSignal[] = [];

  for (const row of subs ?? []) {
    const email = String(row.email || '')
      .trim()
      .toLowerCase();
    if (!email) continue;
    const subscribedAt = new Date(String(row.created_at || Date.now()));

    let hasMock = false;
    let passedMock = false;
    let lastActivityAt: Date | null = null;
    let passedExamCode: string | null = null;

    const { data: results } = await db
      .from('exam_results')
      .select('completed_at, passed')
      .eq('email', email)
      .order('completed_at', { ascending: false })
      .limit(5);
    if (results?.length) {
      hasMock = true;
      lastActivityAt = new Date(String(results[0].completed_at));
      if (results.some((r: { passed?: boolean }) => r.passed)) {
        passedMock = true;
        passedExamCode = 'ccaf';
      }
    }

    out.push({
      email,
      subscribedAt,
      hasMock,
      lastActivityAt,
      passedMock,
      passedExamCode,
      examDate: null,
    });
  }
  return out;
}

export async function dueSends(now: Date = new Date()): Promise<DueSend[]> {
  const signals = await loadSubscriberSignals();
  const suppressed = new Set<string>();
  for (const s of signals) {
    if (await isSuppressed(s.email)) suppressed.add(s.email);
  }
  const already = new Set<string>();
  for (const s of signals) {
    for (const rule of SEQUENCES) {
      if (await alreadySent(s.email, rule.template)) {
        already.add(`${s.email}|${rule.template}`);
      }
    }
  }
  const today = await sendsTodayCount();
  const weekCounts = new Map<string, number>();
  for (const s of signals) {
    weekCounts.set(s.email, await recipientWeekCount(s.email));
  }

  // Static Anthropic catalog adjacency fallback when DB catalog empty
  const catalog = [
    { code: 'ccaf', vendorKey: 'anthropic' },
    { code: 'ccao-f', vendorKey: 'anthropic' },
    { code: 'ccdv-f', vendorKey: 'anthropic' },
    { code: 'ccar-p', vendorKey: 'anthropic' },
  ];

  return evaluateDue(now, signals, {
    suppressed,
    already,
    catalog,
    dailyRemaining: Math.max(0, EMAIL_CONFIG.dailyCap - today),
    weekCounts,
    perRecipientPerWeek: EMAIL_CONFIG.perRecipientPerWeek,
  });
}
