/**
 * Dual-tier PPP resolution (PAY-002).
 * IP → provisional; payment-method country corroborates tier2; VPN plug optional.
 */
import {
  activePriceRows,
  loadPaddlePriceIdMap,
  paddlePriceIdFor,
  type PriceRow,
  type PriceTier,
} from '@/lib/priceCatalog';
import { ACTIVE_SKU_IDS } from '@/lib/skus';

export interface TierSignal {
  ipCountry: string | null;
  vpnSuspected: boolean;
}

export interface TierConfig {
  tier1Countries: string[];
  discountFloorPct: number;
  discountCeilingPct: number;
  /** When true, vpnSuspected forces provisional tier1 display. */
  vpnDetectionEnabled: boolean;
}

/** Doc list: US/CA/UK/EU/AU/NZ/JP/SG/UAE and peers — remainder tier2. */
export const DEFAULT_TIER1_COUNTRIES = [
  'US',
  'CA',
  'GB',
  'IE',
  'DE',
  'FR',
  'NL',
  'BE',
  'LU',
  'AT',
  'CH',
  'IT',
  'ES',
  'PT',
  'SE',
  'NO',
  'DK',
  'FI',
  'IS',
  'AU',
  'NZ',
  'JP',
  'SG',
  'AE',
  'KR',
  'HK',
  'TW',
  'IL',
] as const;

export const DEFAULT_TIER_CONFIG: TierConfig = {
  tier1Countries: [...DEFAULT_TIER1_COUNTRIES],
  discountFloorPct: 30,
  discountCeilingPct: 75,
  vpnDetectionEnabled: false,
};

export function loadTierConfig(): TierConfig {
  const raw = process.env.GEO_TIER_CONFIG?.trim();
  if (!raw) return { ...DEFAULT_TIER_CONFIG, tier1Countries: [...DEFAULT_TIER1_COUNTRIES] };
  try {
    const parsed = JSON.parse(raw) as Partial<TierConfig>;
    return {
      tier1Countries: Array.isArray(parsed.tier1Countries)
        ? parsed.tier1Countries.map((c) => String(c).toUpperCase())
        : [...DEFAULT_TIER1_COUNTRIES],
      discountFloorPct:
        typeof parsed.discountFloorPct === 'number'
          ? parsed.discountFloorPct
          : DEFAULT_TIER_CONFIG.discountFloorPct,
      discountCeilingPct:
        typeof parsed.discountCeilingPct === 'number'
          ? parsed.discountCeilingPct
          : DEFAULT_TIER_CONFIG.discountCeilingPct,
      vpnDetectionEnabled:
        typeof parsed.vpnDetectionEnabled === 'boolean'
          ? parsed.vpnDetectionEnabled
          : DEFAULT_TIER_CONFIG.vpnDetectionEnabled,
    };
  } catch {
    throw new Error('GEO_TIER_CONFIG is not valid JSON');
  }
}

function isTier1Country(country: string | null, cfg: TierConfig): boolean {
  if (!country) return true; // unknown → conservative tier1
  return cfg.tier1Countries.includes(country.toUpperCase());
}

/**
 * Pluggable VPN/proxy/Tor signal. Off by default; providers swap behind this.
 */
export type VpnDetector = (ip: string | null) => boolean | Promise<boolean>;

export const noopVpnDetector: VpnDetector = () => false;

export async function resolveVpnSuspected(
  ip: string | null,
  detector: VpnDetector = noopVpnDetector
): Promise<boolean> {
  return Boolean(await detector(ip));
}

export function provisionalTier(sig: TierSignal, cfg: TierConfig): PriceTier {
  if (cfg.vpnDetectionEnabled && sig.vpnSuspected) return 'tier1';
  if (!sig.ipCountry) return 'tier1';
  return isTier1Country(sig.ipCountry, cfg) ? 'tier1' : 'tier2';
}

/**
 * Settled rule: tier2 iff provisional tier2 AND paymentCountry in tier2 list; else tier1.
 */
export function settledTier(
  provisional: PriceTier,
  paymentCountry: string,
  cfg: TierConfig
): PriceTier {
  if (provisional !== 'tier2') return 'tier1';
  if (isTier1Country(paymentCountry, cfg)) return 'tier1';
  return 'tier2';
}

export type ConsistencyIssue =
  | { kind: 'missing_paddle_id'; sku: string; tier: PriceTier; currency: string }
  | {
      kind: 'discount_out_of_caps';
      sku: string;
      currency: string;
      discountPct: number;
      floor: number;
      ceiling: number;
    }
  | { kind: 'missing_tier_sibling'; sku: string; currency: string; missing: PriceTier };

export function discountPctOfTier1(tier1Minor: number, tier2Minor: number): number {
  if (tier1Minor <= 0) return 0;
  return Math.round(((tier1Minor - tier2Minor) / tier1Minor) * 100);
}

/**
 * SKU ↔ price ↔ Paddle-id consistency + tier2 discount caps.
 */
export function checkPriceConsistency(
  rows: PriceRow[] = activePriceRows(),
  cfg: TierConfig = loadTierConfig(),
  paddleMap = loadPaddlePriceIdMap()
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const active = rows.filter((r) => r.active);

  for (const sku of ACTIVE_SKU_IDS) {
    const currencies = new Set(
      active.filter((r) => r.sku === sku).map((r) => r.currency.toUpperCase())
    );
    for (const currency of currencies) {
      const t1 = active.find(
        (r) => r.sku === sku && r.tier === 'tier1' && r.currency.toUpperCase() === currency
      );
      const t2 = active.find(
        (r) => r.sku === sku && r.tier === 'tier2' && r.currency.toUpperCase() === currency
      );
      if (!t1) issues.push({ kind: 'missing_tier_sibling', sku, currency, missing: 'tier1' });
      if (!t2) issues.push({ kind: 'missing_tier_sibling', sku, currency, missing: 'tier2' });

      for (const tier of ['tier1', 'tier2'] as const) {
        const row = tier === 'tier1' ? t1 : t2;
        if (!row) continue;
        if (!paddlePriceIdFor(sku, tier, currency, paddleMap)) {
          issues.push({ kind: 'missing_paddle_id', sku, tier, currency });
        }
      }

      if (t1 && t2) {
        const pct = discountPctOfTier1(t1.amountMinor, t2.amountMinor);
        if (pct < cfg.discountFloorPct || pct > cfg.discountCeilingPct) {
          issues.push({
            kind: 'discount_out_of_caps',
            sku,
            currency,
            discountPct: pct,
            floor: cfg.discountFloorPct,
            ceiling: cfg.discountCeilingPct,
          });
        }
      }
    }
  }

  return issues;
}

export function assertPriceConsistencyOrThrow(
  rows?: PriceRow[],
  cfg?: TierConfig,
  paddleMap?: ReturnType<typeof loadPaddlePriceIdMap>
): void {
  const issues = checkPriceConsistency(rows, cfg, paddleMap);
  if (issues.length > 0) {
    throw new Error(`price consistency failed: ${JSON.stringify(issues)}`);
  }
}
