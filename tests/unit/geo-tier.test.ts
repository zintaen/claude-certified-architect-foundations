import { describe, it, expect } from 'vitest';
import {
  checkPriceConsistency,
  DEFAULT_TIER_CONFIG,
  provisionalTier,
  settledTier,
  type TierConfig,
} from '@/lib/geoTier';
import { FIXTURE_PADDLE_PRICE_IDS, PRICE_ROWS, type PriceRow } from '@/lib/priceCatalog';

const cfg: TierConfig = { ...DEFAULT_TIER_CONFIG, vpnDetectionEnabled: true };

describe('geoTier (PAY-002)', () => {
  it('corroboration matrix incl. VPN downgrade', () => {
    // tier2 IP + tier2 card → tier2
    expect(settledTier('tier2', 'VN', cfg)).toBe('tier2');
    // tier2 IP + tier1 card → tier1
    expect(settledTier('tier2', 'US', cfg)).toBe('tier1');
    // tier1 IP + tier2 card → tier1 (provisional gates)
    expect(settledTier('tier1', 'VN', cfg)).toBe('tier1');
    // VPN suspected → tier1 display
    expect(provisionalTier({ ipCountry: 'VN', vpnSuspected: true }, cfg)).toBe('tier1');
    expect(provisionalTier({ ipCountry: 'VN', vpnSuspected: false }, cfg)).toBe('tier2');
  });

  it('tier config swap changes resolution; caps validated', () => {
    const moved: TierConfig = {
      ...cfg,
      tier1Countries: cfg.tier1Countries.filter((c) => c !== 'SG'),
    };
    expect(provisionalTier({ ipCountry: 'SG', vpnSuspected: false }, cfg)).toBe('tier1');
    expect(provisionalTier({ ipCountry: 'SG', vpnSuspected: false }, moved)).toBe('tier2');
  });

  it('consistency check: missing paddle id and out-of-caps price fail', () => {
    const ok = checkPriceConsistency(PRICE_ROWS, DEFAULT_TIER_CONFIG, FIXTURE_PADDLE_PRICE_IDS);
    expect(ok).toEqual([]);

    const gap = checkPriceConsistency(PRICE_ROWS, DEFAULT_TIER_CONFIG, {});
    expect(gap.some((i) => i.kind === 'missing_paddle_id')).toBe(true);

    const broken: PriceRow[] = PRICE_ROWS.map((r) =>
      r.sku === 'lifetime' && r.tier === 'tier2'
        ? { ...r, amountMinor: 100 } // ~99% off — outside ceiling
        : r
    );
    const caps = checkPriceConsistency(broken, DEFAULT_TIER_CONFIG, FIXTURE_PADDLE_PRICE_IDS);
    expect(caps.some((i) => i.kind === 'discount_out_of_caps')).toBe(true);
  });
});
