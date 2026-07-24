import type { Metadata } from 'next';
import { headers } from 'next/headers';
import PricingClient, { type PricingSkuCard } from '@/components/PricingClient';
import { loadTierConfig, provisionalTier, type TierSignal } from '@/lib/geoTier';
import { paddleCheckoutConfigured } from '@/lib/paddle';
import { priceForSku } from '@/lib/priceCatalog';

export const metadata: Metadata = {
  title: 'Pricing | CyberSkill',
  description: 'Per-exam passes, all-access, and lifetime plans. Paddle is Merchant of Record.',
  alternates: { canonical: '/pricing' },
  robots: { index: true, follow: true },
};

function countryFromHeaders(h: Headers): string | null {
  const cf = h.get('cf-ipcountry')?.trim();
  if (cf && cf !== 'XX') return cf.toUpperCase();
  const vercel = h.get('x-vercel-ip-country')?.trim();
  if (vercel) return vercel.toUpperCase();
  return null;
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const h = await headers();
  const ipCountry = countryFromHeaders(h);
  const cfg = loadTierConfig();
  const sig: TierSignal = {
    ipCountry,
    vpnSuspected: false, // VPN plug off by default
  };
  const tier = provisionalTier(sig, cfg);
  const sp = (await searchParams) ?? {};
  const forceEu = sp.eu === '1' || sp.eu === 'true';

  const bases: Array<{
    sku: PricingSkuCard['sku'];
    title: string;
    blurb: string;
    hero?: boolean;
  }> = [
    {
      sku: 'per_exam_pass',
      title: 'Per-exam pass',
      blurb: '90 days of full practice for one exam — the primary unlock.',
      hero: true,
    },
    {
      sku: 'all_access_monthly',
      title: 'All-access monthly',
      blurb: 'Every exam bank for 30 days. Good for multi-cert sprints.',
    },
    {
      sku: 'all_access_annual',
      title: 'All-access annual',
      blurb: 'A year of all exams — best value for multi-cert journeys.',
    },
    {
      sku: 'lifetime',
      title: 'Lifetime',
      blurb: 'One-time unlock across the catalog. No renewal clock.',
    },
  ];

  const cards: PricingSkuCard[] = [];
  for (const base of bases) {
    const row = priceForSku(base.sku, tier, 'USD');
    if (!row) continue;
    cards.push({
      ...base,
      amountMinor: row.amountMinor,
      currency: row.currency,
    });
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16" data-testid="pricing-page">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">Pricing</h1>
      <p className="text-foreground/75 mb-8">
        Paid access is sold by <strong>Paddle</strong> as Merchant of Record. CyberSkill never
        touches card data. Enforcement stays dark until the monetization launch checklist is green.
      </p>
      <PricingClient
        skus={cards}
        provisionalTier={tier}
        ipCountry={ipCountry}
        checkoutConfigured={paddleCheckoutConfigured()}
        forceEu={forceEu}
      />
    </main>
  );
}
