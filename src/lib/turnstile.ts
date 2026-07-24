/**
 * Cloudflare Turnstile server verification (SEC-001).
 *
 * Deliberate fail-open on upstream outage (5xx / network): availability of the
 * free product beats spam protection. Recorded so incident review sees intent.
 * When TURNSTILE_SECRET_KEY is unset, verification is skipped (local/preview).
 */

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('ccaf.sec');
const turnstileFailed = meter.createCounter('sec.turnstile_failed');

export type TurnstileResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'missing' | 'invalid' | 'unconfigured_skip' | 'outage_failopen';
    };

let loggedUnconfigured = false;

export async function verifyTurnstile(token: string | null, ip: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (!loggedUnconfigured) {
      loggedUnconfigured = true;
      console.info('[turnstile] TURNSTILE_SECRET_KEY unset — verification disabled');
    }
    return { ok: false, reason: 'unconfigured_skip' };
  }

  if (!token || !token.trim()) {
    turnstileFailed.add(1, { reason: 'missing' });
    return { ok: false, reason: 'missing' };
  }

  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token.trim());
    if (ip && ip !== 'unknown') body.set('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (res.status >= 500) {
      console.warn('[turnstile] upstream 5xx — fail-open');
      turnstileFailed.add(1, { reason: 'outage_failopen' });
      return { ok: false, reason: 'outage_failopen' };
    }

    const data = (await res.json()) as { success?: boolean };
    if (data.success === true) return { ok: true };

    turnstileFailed.add(1, { reason: 'invalid' });
    return { ok: false, reason: 'invalid' };
  } catch (err) {
    console.warn('[turnstile] network error — fail-open', err);
    turnstileFailed.add(1, { reason: 'outage_failopen' });
    return { ok: false, reason: 'outage_failopen' };
  }
}

/** True when subscribe should proceed (valid token, skip, or fail-open). */
export function turnstileAllowsSubscribe(result: TurnstileResult): boolean {
  if (result.ok) return true;
  return result.reason === 'unconfigured_skip' || result.reason === 'outage_failopen';
}

export function __resetTurnstileLogForTests(): void {
  loggedUnconfigured = false;
}
