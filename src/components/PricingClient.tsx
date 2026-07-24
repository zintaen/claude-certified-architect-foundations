'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EU_CONSENT_COPY, EU_CONSENT_TEXT_VERSION, isEuLocale, openCheckout } from '@/lib/paddle';
import { formatAmountMinor, type PriceTier } from '@/lib/priceCatalog';
import { track } from '@/lib/analytics';
import type { SkuId } from '@/lib/skus';
import DonateButton from '@/components/DonateButton';

export type PricingSkuCard = {
  sku: Exclude<SkuId, 'team_seats'>;
  title: string;
  blurb: string;
  hero?: boolean;
  amountMinor: number;
  currency: string;
  examCode?: string;
};

type Props = {
  skus: PricingSkuCard[];
  provisionalTier: PriceTier;
  ipCountry: string | null;
  checkoutConfigured: boolean;
  /** Force EU consent UI (tests / ?eu=1). */
  forceEu?: boolean;
};

export default function PricingClient({
  skus,
  provisionalTier,
  ipCountry,
  checkoutConfigured,
  forceEu = false,
}: Props) {
  const [euConsent, setEuConsent] = useState(false);
  const [tier] = useState<PriceTier>(provisionalTier);
  const [status, setStatus] = useState<string | null>(null);

  const euBuyer = useMemo(
    () =>
      forceEu ||
      isEuLocale(ipCountry) ||
      isEuLocale(typeof navigator !== 'undefined' ? navigator.language : null),
    [forceEu, ipCountry]
  );

  useEffect(() => {
    const onDone = () => {
      track('checkout_completed', {
        sku: 'per_exam_pass',
        tier,
        exam_code: null,
      });
      setStatus('Checkout completed — access unlocks after payment confirmation (webhook).');
    };
    window.addEventListener('paddle:checkout_completed', onDone);
    return () => window.removeEventListener('paddle:checkout_completed', onDone);
  }, [tier]);

  const buy = useCallback(
    (card: PricingSkuCard) => {
      if (euBuyer && !euConsent) {
        setStatus('Please confirm the EU digital-content consent before checkout.');
        return;
      }
      if (!checkoutConfigured) {
        setStatus('Checkout is not configured yet (sandbox keys pending).');
        return;
      }
      track('checkout_opened', {
        sku: card.sku,
        tier,
        exam_code: card.examCode ?? null,
      });
      setStatus(
        process.env.NEXT_PUBLIC_PADDLE_DEV_MOCK === '1'
          ? 'Opening local mock checkout (signed webhook)…'
          : 'Opening checkout…'
      );
      openCheckout({
        sku: card.sku,
        examCode: card.examCode,
        tier,
        currency: card.currency,
        euConsent: euBuyer
          ? {
              textVersion: EU_CONSENT_TEXT_VERSION,
              grantedAt: new Date().toISOString(),
              locale: navigator.language || 'en',
            }
          : undefined,
      });
    },
    [checkoutConfigured, euBuyer, euConsent, tier]
  );

  const hero = skus.find((s) => s.hero) ?? skus[0];
  const secondary = skus.filter((s) => s.sku !== hero?.sku);

  return (
    <div className="space-y-10" data-testid="pricing-client">
      {provisionalTier === 'tier2' && (
        <p
          className="text-sm text-foreground/70 border border-dashed border-border rounded-md p-3"
          data-testid="pricing-provisional-note"
        >
          Regional pricing shown is provisional based on network location
          {ipCountry ? ` (${ipCountry})` : ''}. Final checkout price is confirmed by your payment
          method country (tier2 only when both signals agree).
        </p>
      )}

      {hero && (
        <section
          className="rounded-xl border border-primary/30 bg-primary/[0.04] p-6 sm:p-8"
          data-testid="pricing-hero"
          data-sku={hero.sku}
        >
          <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">
            Most popular
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold">{hero.title}</h2>
          <p className="mt-2 text-foreground/75">{hero.blurb}</p>
          <p className="mt-4 text-3xl font-bold" data-testid="pricing-hero-amount">
            {formatAmountMinor(hero.amountMinor, hero.currency)}
          </p>
          <button
            type="button"
            className="mt-6 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-md hover:brightness-105"
            data-testid={`checkout-${hero.sku}`}
            onClick={() => buy(hero)}
          >
            Get {hero.title}
          </button>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3" data-testid="pricing-secondary">
        {secondary.map((card) => (
          <div
            key={card.sku}
            className="rounded-lg border border-border p-5"
            data-testid={`pricing-card-${card.sku}`}
          >
            <h3 className="font-semibold text-lg">{card.title}</h3>
            <p className="mt-1 text-sm text-foreground/70">{card.blurb}</p>
            <p className="mt-3 text-xl font-bold">
              {formatAmountMinor(card.amountMinor, card.currency)}
            </p>
            <button
              type="button"
              className="mt-4 text-primary underline-offset-2 hover:underline text-sm font-medium"
              data-testid={`checkout-${card.sku}`}
              onClick={() => buy(card)}
            >
              Choose {card.title}
            </button>
          </div>
        ))}
      </section>

      {euBuyer && (
        <label
          className="flex gap-3 items-start text-sm border border-border rounded-md p-4"
          data-testid="eu-consent"
        >
          <input
            type="checkbox"
            className="mt-1"
            checked={euConsent}
            onChange={(e) => setEuConsent(e.target.checked)}
            data-testid="eu-consent-checkbox"
          />
          <span>
            <span className="font-medium">EU digital content consent</span>
            <span className="block mt-1 text-foreground/80">{EU_CONSENT_COPY}</span>
            <span className="block mt-1 text-xs text-muted">Version {EU_CONSENT_TEXT_VERSION}</span>
          </span>
        </label>
      )}

      <section className="space-y-2" data-testid="pricing-withdrawal">
        <h2 className="text-lg font-semibold">Withdraw or cancel</h2>
        <p className="text-sm text-foreground/80">
          EU withdrawal and cancellations are handled through Paddle (Merchant of Record). Use the{' '}
          <Link
            href="/pricing/withdrawal"
            className="text-primary underline"
            data-testid="withdrawal-link"
          >
            withdrawal request form
          </Link>{' '}
          or see{' '}
          <Link href="/refunds" className="text-primary underline">
            refunds
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2 border-t border-border pt-8" data-testid="pricing-donate">
        <h2 className="text-lg font-semibold">Prefer to support without buying?</h2>
        <p className="text-sm text-foreground/80">
          Donations stay separate — they never unlock premium entitlements.
        </p>
        <DonateButton variant="soft" label="Support this project" placement="pricing" />
      </section>

      {status && (
        <p className="text-sm text-foreground/80" data-testid="pricing-status" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
