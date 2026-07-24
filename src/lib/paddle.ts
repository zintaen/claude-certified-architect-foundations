/**
 * Paddle Billing adapter (PAY-002).
 * Client: openCheckout via Paddle.js CDN. Server: verifyWebhook + mapEvent.
 * No card data touches this site — Paddle-hosted surfaces only.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { loadPaddlePriceIdMap, paddlePriceIdFor, type PriceTier } from '@/lib/priceCatalog';
import { ACTIVE_SKU_IDS, type SkuId } from '@/lib/skus';

export type EuConsent = {
  textVersion: string;
  grantedAt: string;
  locale: string;
};

export type PaddleEnv = 'sandbox' | 'production';

export function paddleEnv(): PaddleEnv {
  const v = (process.env.PADDLE_ENV || 'sandbox').toLowerCase();
  return v === 'production' ? 'production' : 'sandbox';
}

export function paddleClientToken(): string | undefined {
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || undefined;
}

export function paddleWebhookSecret(): string | undefined {
  return process.env.PADDLE_WEBHOOK_SECRET || undefined;
}

export function paddleApiKey(): string | undefined {
  return process.env.PADDLE_API_KEY || undefined;
}

/** Enumerated CSP origins for next.config — nothing broader. Re-export stable list. */
export { PADDLE_CSP } from '@/lib/paddleCsp';

export type PaddleEvent = {
  event_id: string;
  event_type: string;
  occurred_at?: string;
  data: Record<string, unknown>;
};

export type FulfillmentAction =
  | {
      kind: 'grant';
      userId: string;
      sku: SkuId;
      examCode?: string | null;
      tier: PriceTier;
      transactionId: string | null;
      subscriptionId: string | null;
      paymentCountry: string | null;
      euConsent: EuConsent | null;
      paddleEventId: string;
      endsAt?: string | null;
    }
  | {
      kind: 'extend';
      userId: string;
      sku: SkuId;
      examCode?: string | null;
      transactionId: string | null;
      subscriptionId: string | null;
      paddleEventId: string;
      endsAt?: string | null;
    }
  | {
      kind: 'revoke';
      userId: string;
      sku: SkuId;
      subscriptionId: string | null;
      paddleEventId: string;
      reason: 'canceled' | 'past_due' | 'refunded';
    }
  | {
      kind: 'expire';
      userId: string;
      sku: SkuId;
      subscriptionId: string | null;
      paddleEventId: string;
    };

const SIGNATURE_TOLERANCE_S = Number(process.env.PADDLE_WEBHOOK_TOLERANCE_S || 300);

/**
 * Verify Paddle-Signature (HMAC-SHA256 of `${ts}:${rawBody}`).
 * Must run on the raw body before JSON parse.
 */
export function verifyWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string = paddleWebhookSecret() || '',
  nowSec: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!secret || !signatureHeader || !rawBody) return false;

  let ts = '';
  let h1 = '';
  for (const part of signatureHeader.split(';')) {
    const [key, ...rest] = part.split('=');
    const value = rest.join('=');
    if (key?.trim() === 'ts') ts = value.trim();
    if (key?.trim() === 'h1') h1 = value.trim();
  }
  if (!ts || !h1) return false;

  const age = Math.abs(nowSec - Number(ts));
  if (!Number.isFinite(age) || age > SIGNATURE_TOLERANCE_S) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expected = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  try {
    const a = Buffer.from(h1, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Test helper: build a valid Paddle-Signature header for fixtures. */
export function signWebhookBody(
  rawBody: string,
  secret: string,
  ts: number = Math.floor(Date.now() / 1000)
): string {
  const h1 = createHmac('sha256', secret).update(`${ts}:${rawBody}`, 'utf8').digest('hex');
  return `ts=${ts};h1=${h1}`;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function customData(data: Record<string, unknown>): Record<string, unknown> {
  const cd = asRecord(data.custom_data);
  if (cd) return cd;
  const items = data.items;
  if (Array.isArray(items) && items[0]) {
    const first = asRecord(items[0]);
    const nested = first ? asRecord(first.custom_data) : null;
    if (nested) return nested;
  }
  return {};
}

function skuFromCustomOrPrice(data: Record<string, unknown>): SkuId | null {
  const cd = customData(data);
  const raw = cd.sku;
  if (typeof raw === 'string' && (ACTIVE_SKU_IDS as string[]).includes(raw)) {
    return raw as SkuId;
  }
  // Reverse-lookup paddle price id → sku
  const map = loadPaddlePriceIdMap();
  const priceId =
    (typeof data.price_id === 'string' && data.price_id) ||
    (() => {
      const items = data.items;
      if (Array.isArray(items) && items[0]) {
        const item = asRecord(items[0]);
        const price = item ? asRecord(item.price) : null;
        if (price && typeof price.id === 'string') return price.id;
        if (item && typeof item.price_id === 'string') return item.price_id;
      }
      return null;
    })();
  if (!priceId) return null;
  for (const sku of ACTIVE_SKU_IDS) {
    for (const tier of ['tier1', 'tier2'] as const) {
      for (const currency of Object.keys(map[sku]?.[tier] ?? {})) {
        if (paddlePriceIdFor(sku, tier, currency, map) === priceId) return sku;
      }
    }
  }
  return null;
}

function userIdFromEvent(data: Record<string, unknown>): string | null {
  const cd = customData(data);
  if (typeof cd.user_id === 'string' && cd.user_id) return cd.user_id;
  const customer = asRecord(data.customer);
  if (customer && typeof customer.custom_data === 'object') {
    const ccd = asRecord(customer.custom_data);
    if (ccd && typeof ccd.user_id === 'string') return ccd.user_id;
  }
  return null;
}

function paymentCountryFromEvent(data: Record<string, unknown>): string | null {
  const details = asRecord(data.details);
  const totals = details ? asRecord(details.totals) : null;
  // Prefer payment method country when present
  const payments = data.payments;
  if (Array.isArray(payments) && payments[0]) {
    const p0 = asRecord(payments[0]);
    const method = p0 ? asRecord(p0.method_details) : null;
    const card = method ? asRecord(method.card) : null;
    if (card && typeof card.cardholder_country === 'string') {
      return card.cardholder_country.toUpperCase();
    }
  }
  const address = asRecord(data.address);
  if (address && typeof address.country_code === 'string') {
    return address.country_code.toUpperCase();
  }
  if (totals && typeof totals.currency_code === 'string') {
    // currency alone is not a country — ignore
  }
  const cd = customData(data);
  if (typeof cd.payment_country === 'string') return cd.payment_country.toUpperCase();
  return null;
}

function euConsentFromCustom(cd: Record<string, unknown>): EuConsent | null {
  const raw = asRecord(cd.eu_consent);
  if (!raw) return null;
  if (
    typeof raw.textVersion === 'string' &&
    typeof raw.grantedAt === 'string' &&
    typeof raw.locale === 'string'
  ) {
    return {
      textVersion: raw.textVersion,
      grantedAt: raw.grantedAt,
      locale: raw.locale,
    };
  }
  return null;
}

function tierFromCustom(cd: Record<string, unknown>): PriceTier {
  return cd.tier === 'tier2' ? 'tier2' : 'tier1';
}

/**
 * Pure event → fulfillment mapping. Unknown types → null (caller logs + 200).
 */
export function mapEvent(evt: PaddleEvent): FulfillmentAction | null {
  const data = evt.data ?? {};
  const type = evt.event_type;
  const userId = userIdFromEvent(data);
  const sku = skuFromCustomOrPrice(data);
  const cd = customData(data);
  const examCode = typeof cd.exam_code === 'string' ? cd.exam_code : null;
  const transactionId =
    typeof data.id === 'string' && type.startsWith('transaction.') ? data.id : null;
  const subscriptionId =
    typeof data.id === 'string' && type.startsWith('subscription.')
      ? data.id
      : typeof data.subscription_id === 'string'
        ? data.subscription_id
        : null;

  if (type === 'transaction.completed' || type === 'subscription.created') {
    if (!userId || !sku) return null;
    return {
      kind: 'grant',
      userId,
      sku,
      examCode,
      tier: tierFromCustom(cd),
      transactionId:
        transactionId ?? (typeof data.transaction_id === 'string' ? data.transaction_id : null),
      subscriptionId,
      paymentCountry: paymentCountryFromEvent(data),
      euConsent: euConsentFromCustom(cd),
      paddleEventId: evt.event_id,
    };
  }

  if (type === 'subscription.updated' || type === 'subscription.activated') {
    const status = typeof data.status === 'string' ? data.status : '';
    if (status === 'past_due' || status === 'paused') {
      if (!userId || !sku) return null;
      return {
        kind: 'revoke',
        userId,
        sku,
        subscriptionId,
        paddleEventId: evt.event_id,
        reason: 'past_due',
      };
    }
    if (status === 'active' || status === 'trialing') {
      if (!userId || !sku) return null;
      return {
        kind: 'extend',
        userId,
        sku,
        examCode,
        transactionId: typeof data.transaction_id === 'string' ? data.transaction_id : null,
        subscriptionId,
        paddleEventId: evt.event_id,
        endsAt: typeof data.next_billed_at === 'string' ? data.next_billed_at : null,
      };
    }
    return null;
  }

  if (type === 'subscription.canceled') {
    if (!userId || !sku) return null;
    return {
      kind: 'revoke',
      userId,
      sku,
      subscriptionId,
      paddleEventId: evt.event_id,
      reason: 'canceled',
    };
  }

  if (type === 'subscription.past_due') {
    if (!userId || !sku) return null;
    return {
      kind: 'expire',
      userId,
      sku,
      subscriptionId,
      paddleEventId: evt.event_id,
    };
  }

  if (type === 'adjustment.updated' || type === 'transaction.payment_failed') {
    // Refunds / failed payments — revoke when adjustment is refunded
    const action = typeof data.action === 'string' ? data.action : '';
    const status = typeof data.status === 'string' ? data.status : '';
    if (action === 'refund' && status === 'approved' && userId && sku) {
      return {
        kind: 'revoke',
        userId,
        sku,
        subscriptionId,
        paddleEventId: evt.event_id,
        reason: 'refunded',
      };
    }
    return null;
  }

  return null;
}

export type OpenCheckoutInput = {
  sku: SkuId;
  examCode?: string;
  tier: PriceTier;
  currency?: string;
  euConsent?: EuConsent;
  userId?: string;
  customerEmail?: string;
};

type PaddleCheckoutJs = {
  Environment: { set: (env: string) => void };
  Initialize: (cfg: { token: string; eventCallback?: (e: unknown) => void }) => void;
  Checkout: {
    open: (opts: {
      items: { priceId: string; quantity: number }[];
      customData?: Record<string, unknown>;
      customer?: { email?: string };
      settings?: { successUrl?: string };
    }) => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleCheckoutJs;
  }
}

let paddleInitPromise: Promise<PaddleCheckoutJs> | null = null;

function loadPaddleJs(): Promise<PaddleCheckoutJs> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('openCheckout is client-only'));
  }
  if (window.Paddle) return Promise.resolve(window.Paddle);
  if (paddleInitPromise) return paddleInitPromise;

  paddleInitPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paddle-js]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.Paddle) resolve(window.Paddle);
        else reject(new Error('Paddle.js loaded without Paddle global'));
      });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.dataset.paddleJs = '1';
    script.onload = () => {
      if (window.Paddle) resolve(window.Paddle);
      else reject(new Error('Paddle.js loaded without Paddle global'));
    };
    script.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(script);
  });
  return paddleInitPromise;
}

/**
 * Client checkout open. Does NOT grant entitlements — webhook only.
 */
export function openCheckout(input: OpenCheckoutInput): void {
  const token = paddleClientToken();
  if (!token) {
    console.warn('[paddle] NEXT_PUBLIC_PADDLE_CLIENT_TOKEN missing — checkout disabled');
    return;
  }
  const currency = (input.currency || 'USD').toUpperCase();
  const priceId = paddlePriceIdFor(input.sku, input.tier, currency);
  if (!priceId) {
    console.warn('[paddle] No price id for', input.sku, input.tier, currency);
    return;
  }

  void (async () => {
    const Paddle = await loadPaddleJs();
    const env = paddleEnv();
    if (env === 'sandbox') {
      Paddle.Environment.set('sandbox');
    }
    Paddle.Initialize({
      token,
      eventCallback: (ev) => {
        // UI-only; never grant from client callbacks.
        const name =
          ev && typeof ev === 'object' && 'name' in ev ? String((ev as { name: string }).name) : '';
        if (name === 'checkout.completed' && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('paddle:checkout_completed', { detail: { sku: input.sku } })
          );
        }
      },
    });
    Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: {
        sku: input.sku,
        tier: input.tier,
        exam_code: input.examCode ?? null,
        user_id: input.userId ?? null,
        eu_consent: input.euConsent ?? null,
      },
      customer: input.customerEmail ? { email: input.customerEmail } : undefined,
      settings: {
        successUrl:
          typeof window !== 'undefined'
            ? `${window.location.origin}/pricing?checkout=success`
            : undefined,
      },
    });
  })().catch((err) => {
    console.error('[paddle] openCheckout failed', err);
  });
}

/** LEGAL-002-reviewed EU digital-content consent text version. */
export const EU_CONSENT_TEXT_VERSION = 'eu-digital-waiver-v1';

export const EU_CONSENT_COPY =
  'I consent to immediate access to this digital content and acknowledge that I lose my 14-day right of withdrawal once access begins.';

export function isEuLocale(localeOrCountry: string | null | undefined): boolean {
  if (!localeOrCountry) return false;
  const s = localeOrCountry.toUpperCase();
  const eu = new Set([
    'AT',
    'BE',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IE',
    'IT',
    'LV',
    'LT',
    'LU',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SK',
    'SI',
    'ES',
    'SE',
    'EU',
  ]);
  if (eu.has(s)) return true;
  // locale like de-DE / fr
  const parts = s.replace('_', '-').split('-');
  return parts.some((p) => eu.has(p));
}
