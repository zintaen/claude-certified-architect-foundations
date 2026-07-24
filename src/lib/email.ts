/**
 * Transactional email adapter (GROWTH-005).
 * All outbound mail MUST go through send(). Unconfigured / EMAIL_ENABLED=off → no-op.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { metrics } from '@opentelemetry/api';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { buildEmail, type TemplateKey } from '@/emails/templates';
import { DEFAULT_SITE_ORIGIN } from '@/lib/site';

export type SendResult =
  | { ok: true; messageId: string; skipped?: false }
  | { ok: true; skipped: true; reason: 'disabled' | 'unconfigured' | 'suppressed' }
  | { ok: false; error: string };

const meter = metrics.getMeter('ccaf.email');
const sentCounter = meter.createCounter('email.send.count');
const suppressCounter = meter.createCounter('email.suppress.count');
const bounceCounter = meter.createCounter('email.bounce.count');

export const EMAIL_CONFIG = {
  enabled: (process.env.EMAIL_ENABLED || 'off').toLowerCase() === 'on',
  provider: (process.env.EMAIL_PROVIDER || 'sandbox') as 'sandbox' | 'resend' | 'postmark',
  from: process.env.EMAIL_FROM || 'CyberSkill <noreply@cyberskill.world>',
  replyTo: process.env.EMAIL_REPLY_TO || 'info@cyberskill.world',
  dailyCap: Number(process.env.EMAIL_DAILY_CAP || 200),
  perRecipientPerWeek: Number(process.env.EMAIL_PER_RECIPIENT_PER_WEEK || 2),
  siteOrigin: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_ORIGIN,
};

export function hashRecipient(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
}

function admin() {
  if (!supabaseAdmin) throw new Error('supabaseAdmin required');
  return supabaseAdmin;
}

export async function isSuppressed(email: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data } = await admin()
    .from('email_suppressions')
    .select('email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  return Boolean(data);
}

export async function suppress(
  email: string,
  reason: 'unsubscribe' | 'bounce' | 'complaint'
): Promise<void> {
  if (!supabaseAdmin) return;
  const normalized = email.trim().toLowerCase();
  await admin()
    .from('email_suppressions')
    .upsert({ email: normalized, reason }, { onConflict: 'email' });
  suppressCounter.add(1, { reason });
  if (reason === 'bounce') bounceCounter.add(1);
}

/** Provider transport — injectable for tests. */
export type Transport = (msg: {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
}) => Promise<{ messageId: string }>;

let transportOverride: Transport | null = null;

export function __setEmailTransportForTests(t: Transport | null): void {
  transportOverride = t;
}

async function defaultTransport(msg: {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
}): Promise<{ messageId: string }> {
  if (EMAIL_CONFIG.provider === 'sandbox' || !process.env.EMAIL_API_KEY) {
    return { messageId: `sandbox-${Date.now()}` };
  }
  if (EMAIL_CONFIG.provider === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_CONFIG.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        headers: msg.headers,
        reply_to: EMAIL_CONFIG.replyTo,
      }),
    });
    if (!res.ok) {
      throw new Error(`resend_${res.status}`);
    }
    const data = (await res.json()) as { id?: string };
    return { messageId: data.id || `resend-${Date.now()}` };
  }
  // postmark-shaped generic
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': process.env.EMAIL_API_KEY!,
      'content-type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      From: EMAIL_CONFIG.from,
      To: msg.to,
      Subject: msg.subject,
      TextBody: msg.text,
      HtmlBody: msg.html,
      Headers: Object.entries(msg.headers).map(([Name, Value]) => ({ Name, Value })),
    }),
  });
  if (!res.ok) throw new Error(`postmark_${res.status}`);
  const data = (await res.json()) as { MessageID?: string };
  return { messageId: data.MessageID || `postmark-${Date.now()}` };
}

export async function send(input: {
  to: string;
  template: TemplateKey;
  sequence: string;
  data: Record<string, unknown>;
}): Promise<SendResult> {
  const to = input.to.trim().toLowerCase();
  if (!EMAIL_CONFIG.enabled) {
    return { ok: true, skipped: true, reason: 'disabled' };
  }
  if (!supabaseAdmin && EMAIL_CONFIG.provider !== 'sandbox') {
    return { ok: true, skipped: true, reason: 'unconfigured' };
  }
  if (await isSuppressed(to)) {
    return { ok: true, skipped: true, reason: 'suppressed' };
  }

  const unsubUrl = `${EMAIL_CONFIG.siteOrigin}/api/email/unsubscribe?e=${encodeURIComponent(to)}`;
  const built = buildEmail(input.template, { ...input.data, unsubscribeUrl: unsubUrl });
  const headers: Record<string, string> = {
    'List-Unsubscribe': `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };

  try {
    const transport = transportOverride || defaultTransport;
    const { messageId } = await transport({
      to,
      subject: built.subject,
      text: built.text,
      html: built.html,
      headers,
    });

    if (supabaseAdmin) {
      const { error } = await admin()
        .from('email_sends')
        .insert({
          recipient: to,
          recipient_hash: hashRecipient(to),
          template: input.template,
          sequence: input.sequence,
          message_id: messageId,
        });
      if (error && !String(error.message).includes('duplicate')) {
        // Unique violation = already sent; treat as success for idempotency
        if (!String(error.code).includes('23505')) throw error;
      }
    }

    sentCounter.add(1, { template: input.template, sequence: input.sequence });
    return { ok: true, messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send_failed' };
  }
}

export async function alreadySent(email: string, template: TemplateKey): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data } = await admin()
    .from('email_sends')
    .select('id')
    .eq('recipient_hash', hashRecipient(email))
    .eq('template', template)
    .maybeSingle();
  return Boolean(data);
}

export async function sendsTodayCount(): Promise<number> {
  if (!supabaseAdmin) return 0;
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await admin()
    .from('email_sends')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', dayStart.toISOString());
  return count ?? 0;
}

export async function recipientWeekCount(email: string): Promise<number> {
  if (!supabaseAdmin) return 0;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { count } = await admin()
    .from('email_sends')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_hash', hashRecipient(email))
    .gte('sent_at', weekAgo.toISOString());
  return count ?? 0;
}
