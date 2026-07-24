#!/usr/bin/env node
/**
 * GROWTH-005 lifecycle email queue runner.
 * Dry-run by default. Pass --execute to send via src/lib/email adapter.
 * Halt on first provider error (no retry storm).
 *
 * Cron: invoke daily. Requires EMAIL_ENABLED=on + provider keys for real sends.
 *
 *   node scripts/run-email-queue.mjs
 *   node scripts/run-email-queue.mjs --execute
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

const execute = process.argv.includes('--execute');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = (process.env.EMAIL_ENABLED || 'off').toLowerCase() === 'on';

if (!enabled) {
  console.log('EMAIL_ENABLED is off — queue is a no-op.');
  process.exit(0);
}

if (!url || !key) {
  console.error('Need Supabase URL + service role');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const dailyCap = Number(process.env.EMAIL_DAILY_CAP || 200);
const perWeek = Number(process.env.EMAIL_PER_RECIPIENT_PER_WEEK || 2);
const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://ccaf.cyberskill.world';

function hashRecipient(email) {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
}

const CATALOG = [
  { code: 'ccaf', vendorKey: 'anthropic' },
  { code: 'ccao-f', vendorKey: 'anthropic' },
  { code: 'ccdv-f', vendorKey: 'anthropic' },
  { code: 'ccar-p', vendorKey: 'anthropic' },
];

function adjacent(code) {
  const self = CATALOG.find((e) => e.code === code);
  if (!self) return CATALOG.filter((e) => e.code !== code).map((e) => e.code);
  return CATALOG.filter((e) => e.vendorKey === self.vendorKey && e.code !== code).map(
    (e) => e.code
  );
}

async function main() {
  const { data: suppressed } = await db.from('email_suppressions').select('email');
  const suppressedSet = new Set((suppressed || []).map((r) => r.email));

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count: todayCount } = await db
    .from('email_sends')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', dayStart.toISOString());
  let remaining = Math.max(0, dailyCap - (todayCount || 0));

  const { data: subs } = await db.from('subscribers').select('email, created_at');
  const due = [];

  for (const sub of subs || []) {
    if (remaining <= 0) break;
    const email = String(sub.email || '')
      .trim()
      .toLowerCase();
    if (!email || suppressedSet.has(email)) continue;

    const { data: prior } = await db
      .from('email_sends')
      .select('template')
      .eq('recipient_hash', hashRecipient(email));
    const sentTemplates = new Set((prior || []).map((p) => p.template));

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count: weekCount } = await db
      .from('email_sends')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_hash', hashRecipient(email))
      .gte('sent_at', weekAgo.toISOString());
    if ((weekCount || 0) >= perWeek) continue;

    // Welcome if never sent
    if (!sentTemplates.has('welcome')) {
      due.push({
        to: email,
        template: 'welcome',
        sequence: 'welcome',
        data: { recommendations: [] },
      });
      remaining -= 1;
      continue;
    }

    // Activity check for first_mock / win_back / post_pass
    const { data: results } = await db
      .from('exam_results')
      .select('completed_at, passed')
      .eq('email', email)
      .order('completed_at', { ascending: false })
      .limit(5);
    const hasMock = (results || []).length > 0;
    const passed = (results || []).some((r) => r.passed);
    const subscribedAt = new Date(sub.created_at);
    const daysSub = Math.floor((Date.now() - subscribedAt.getTime()) / 86400000);

    if (!hasMock && daysSub >= 3 && !sentTemplates.has('first_mock_nudge')) {
      due.push({
        to: email,
        template: 'first_mock_nudge',
        sequence: 'first_mock_nudge',
        data: {},
      });
      remaining -= 1;
      continue;
    }

    if (passed && !sentTemplates.has('post_pass_multi_cert')) {
      due.push({
        to: email,
        template: 'post_pass_multi_cert',
        sequence: 'post_pass_multi_cert',
        data: { recommendations: adjacent('ccaf') },
      });
      remaining -= 1;
      continue;
    }

    if (hasMock && results[0]?.completed_at) {
      const last = new Date(results[0].completed_at);
      const inactiveDays = Math.floor((Date.now() - last.getTime()) / 86400000);
      if (inactiveDays >= 28 && !sentTemplates.has('win_back')) {
        due.push({ to: email, template: 'win_back', sequence: 'win_back', data: {} });
        remaining -= 1;
      }
    }
  }

  console.log(JSON.stringify({ due: due.length, execute, sample: due.slice(0, 5) }, null, 2));
  if (!execute) {
    console.log('DRY RUN — pass --execute to send.');
    return;
  }

  // Dynamic import of Next-built adapter is awkward in plain node; send via Resend/sandbox here
  // mirroring email.ts contract. Prefer calling the app's adapter in production workers.
  const apiKey = process.env.EMAIL_API_KEY;
  for (const item of due) {
    const unsub = `${origin}/api/email/unsubscribe?e=${encodeURIComponent(item.to)}`;
    const subject = `CyberSkill · ${item.template}`;
    const text = `Lifecycle message (${item.sequence}). Unsubscribe: ${unsub}`;
    const html = `<p>Lifecycle message (${item.sequence}).</p><p><a href="${unsub}">Unsubscribe</a></p>`;
    let messageId = `queue-${Date.now()}`;
    if (apiKey && (process.env.EMAIL_PROVIDER || 'sandbox') === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'CyberSkill <noreply@cyberskill.world>',
          to: item.to,
          subject,
          text,
          html,
          headers: {
            'List-Unsubscribe': `<${unsub}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      });
      if (!res.ok) {
        console.error('Provider error — halting queue', await res.text());
        process.exit(1);
      }
      const data = await res.json();
      messageId = data.id || messageId;
    }
    const { error } = await db.from('email_sends').insert({
      recipient: item.to,
      recipient_hash: hashRecipient(item.to),
      template: item.template,
      sequence: item.sequence,
      message_id: messageId,
    });
    if (error && !String(error.message).includes('duplicate') && error.code !== '23505') {
      console.error('Send log error — halting', error);
      process.exit(1);
    }
    console.log('sent', item.template, hashRecipient(item.to).slice(0, 8));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
