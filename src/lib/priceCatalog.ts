/**
 * Operator price catalog (PAY-002). Amounts are bigint minor units.
 * Paddle price IDs come from env (never invent live keys in git).
 * Fixture IDs exist only for CI consistency checks when PADDLE_USE_FIXTURE_IDS=1.
 */
import { ACTIVE_SKU_IDS, type SkuId } from '@/lib/skus';

export type PriceTier = 'tier1' | 'tier2';

export type PriceRow = {
  sku: Exclude<SkuId, 'team_seats'>;
  examCode: string | null;
  tier: PriceTier;
  currency: string;
  amountMinor: number;
  active: boolean;
};

/**
 * Display/seed amounts — operator-editable. Tier2 sits inside [30%, 75%] of tier1
 * (geoTier discountFloorPct / discountCeilingPct). Not live Paddle secrets.
 */
export const PRICE_ROWS: PriceRow[] = [
  // Hero SKU — ~$14.99 / ~$5.99 (doc: per-exam near $10–19)
  {
    sku: 'per_exam_pass',
    examCode: null,
    tier: 'tier1',
    currency: 'USD',
    amountMinor: 1499,
    active: true,
  },
  {
    sku: 'per_exam_pass',
    examCode: null,
    tier: 'tier2',
    currency: 'USD',
    amountMinor: 599,
    active: true,
  },
  {
    sku: 'all_access_monthly',
    examCode: null,
    tier: 'tier1',
    currency: 'USD',
    amountMinor: 1999,
    active: true,
  },
  {
    sku: 'all_access_monthly',
    examCode: null,
    tier: 'tier2',
    currency: 'USD',
    amountMinor: 799,
    active: true,
  },
  {
    sku: 'all_access_annual',
    examCode: null,
    tier: 'tier1',
    currency: 'USD',
    amountMinor: 19900,
    active: true,
  },
  {
    sku: 'all_access_annual',
    examCode: null,
    tier: 'tier2',
    currency: 'USD',
    amountMinor: 7900,
    active: true,
  },
  {
    sku: 'lifetime',
    examCode: null,
    tier: 'tier1',
    currency: 'USD',
    amountMinor: 34900,
    active: true,
  },
  {
    sku: 'lifetime',
    examCode: null,
    tier: 'tier2',
    currency: 'USD',
    amountMinor: 13900,
    active: true,
  },
];

/** CI-only placeholders — never real Paddle credentials. */
export const FIXTURE_PADDLE_PRICE_IDS: Record<string, Record<PriceTier, Record<string, string>>> = {
  per_exam_pass: {
    tier1: { USD: 'pri_fixture_per_exam_pass_t1_usd' },
    tier2: { USD: 'pri_fixture_per_exam_pass_t2_usd' },
  },
  all_access_monthly: {
    tier1: { USD: 'pri_fixture_all_access_monthly_t1_usd' },
    tier2: { USD: 'pri_fixture_all_access_monthly_t2_usd' },
  },
  all_access_annual: {
    tier1: { USD: 'pri_fixture_all_access_annual_t1_usd' },
    tier2: { USD: 'pri_fixture_all_access_annual_t2_usd' },
  },
  lifetime: {
    tier1: { USD: 'pri_fixture_lifetime_t1_usd' },
    tier2: { USD: 'pri_fixture_lifetime_t2_usd' },
  },
};

export type PaddlePriceIdMap = Record<
  string,
  Partial<Record<PriceTier, Partial<Record<string, string>>>>
>;

export function loadPaddlePriceIdMap(): PaddlePriceIdMap {
  const raw = process.env.PADDLE_PRICE_ID_MAP?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as PaddlePriceIdMap;
    } catch {
      throw new Error('PADDLE_PRICE_ID_MAP is not valid JSON');
    }
  }
  if (
    process.env.PADDLE_USE_FIXTURE_IDS === '1' ||
    process.env.PADDLE_DEV_MOCK === '1' ||
    process.env.NEXT_PUBLIC_PADDLE_DEV_MOCK === '1' ||
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true'
  ) {
    return FIXTURE_PADDLE_PRICE_IDS;
  }
  return {};
}

export function paddlePriceIdFor(
  sku: string,
  tier: PriceTier,
  currency: string,
  map: PaddlePriceIdMap = loadPaddlePriceIdMap()
): string | null {
  return map[sku]?.[tier]?.[currency.toUpperCase()] ?? null;
}

export function formatAmountMinor(amountMinor: number, currency: string, locale = 'en-US'): string {
  const decimals = currencyDecimals(currency);
  const major = amountMinor / 10 ** decimals;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(major);
}

export function currencyDecimals(currency: string): number {
  const c = currency.toUpperCase();
  if (c === 'JPY' || c === 'KRW' || c === 'VND') return 0;
  return 2;
}

export function activePriceRows(rows: PriceRow[] = PRICE_ROWS): PriceRow[] {
  return rows.filter((r) => r.active && ACTIVE_SKU_IDS.includes(r.sku));
}

export function priceForSku(
  sku: string,
  tier: PriceTier,
  currency = 'USD',
  rows: PriceRow[] = PRICE_ROWS
): PriceRow | null {
  return (
    rows.find(
      (r) =>
        r.active &&
        r.sku === sku &&
        r.tier === tier &&
        r.currency.toUpperCase() === currency.toUpperCase()
    ) ?? null
  );
}
