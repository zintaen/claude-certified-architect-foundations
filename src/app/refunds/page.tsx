import { REFUNDS_META } from '@/lib/consent';
import { PolicyHeader, PolicyNav } from '@/components/PolicyChrome';
import Link from 'next/link';

export const metadata = {
  title: 'Refunds | CyberSkill',
  description: 'Refund policy for CyberSkill donations and paid products (Paddle MoR).',
  alternates: { canonical: '/refunds' },
  robots: { index: true, follow: true },
};

export default function RefundsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <PolicyNav />
      <PolicyHeader title="Refunds" meta={REFUNDS_META} />

      <section className="space-y-3 mb-10" data-testid="refunds-donations">
        <h2 className="text-xl font-semibold">Donations</h2>
        <p className="leading-relaxed text-foreground/90">
          Donations (for example via Buy Me a Coffee) are voluntary contributions to support the
          project. Donations are non-refundable and never unlock premium entitlements.
        </p>
      </section>

      <section className="space-y-3 mb-10" data-testid="refunds-paid">
        <h2 className="text-xl font-semibold">Paid products</h2>
        <p className="leading-relaxed text-foreground/90">
          Paid SKUs are sold by <strong>Paddle</strong> as Merchant of Record and seller of record.
          CyberSkill does not process card payments. See{' '}
          <Link href="/pricing" className="text-primary underline">
            pricing
          </Link>
          .
        </p>
        <div className="space-y-3 text-sm text-foreground/90" data-testid="refunds-sku-slot">
          <p>
            <strong>Per-exam pass (90 days):</strong> Refunds within 14 days of purchase if you have
            not substantially used the bank (operator/Paddle discretion for abuse). After access
            begins for EU buyers who waived withdrawal, statutory cooling-off may not apply — see
            below.
          </p>
          <p>
            <strong>All-access monthly / annual:</strong> Cancel anytime for the next period;
            mid-cycle refunds are case-by-case via Paddle. Unused prepaid time may be refunded
            prorata at Paddle&apos;s discretion.
          </p>
          <p>
            <strong>Lifetime:</strong> 14-day refund window from purchase if access has not been
            heavily used; thereafter non-refundable except where law requires.
          </p>
        </div>
      </section>

      <section className="space-y-3 mb-10" data-testid="refunds-mor">
        <h2 className="text-xl font-semibold">Merchant of Record</h2>
        <p className="leading-relaxed text-foreground/90">
          Paddle.com Market Ltd (and affiliates) is the Merchant of Record for paid CyberSkill
          products. Invoices, VAT/sales tax, and payment disputes are handled by Paddle. Contact{' '}
          <a href="mailto:info@cyberskill.world" className="text-primary underline">
            info@cyberskill.world
          </a>{' '}
          and we will coordinate with Paddle.
        </p>
      </section>

      <section className="space-y-3 mb-10" data-testid="refunds-eu-slot">
        <h2 className="text-xl font-semibold">EU consumer withdrawal</h2>
        <p className="leading-relaxed text-foreground/90">
          EU/EEA consumers normally have a 14-day right of withdrawal for distance contracts. For
          digital content supplied immediately, you may waive that right by giving express consent
          before payment (shown at checkout, not pre-ticked). We record consent text version,
          timestamp, and locale with the purchase fulfillment event.
        </p>
        <div
          className="border border-border rounded-lg p-4 text-sm text-foreground/90"
          data-testid="refunds-eu-slot-box"
        >
          <p className="mb-2">
            To exercise withdrawal or cancel, use the labeled{' '}
            <Link href="/pricing/withdrawal" className="text-primary underline">
              withdrawal / cancel form
            </Link>{' '}
            (also linked from pricing and purchase confirmation). Requests route into Paddle&apos;s
            refund/cancel APIs.
          </p>
          <p>
            If you did not waive withdrawal and have not begun using the digital content, you may
            withdraw within 14 days of purchase under applicable EU rules.
          </p>
        </div>
      </section>

      <section className="space-y-3 mb-10" data-testid="refunds-referral">
        <h2 className="text-xl font-semibold">Referral program</h2>
        <p className="leading-relaxed text-foreground/90">
          Referral rewards are premium access days only — never cash or discount codes. A referral
          qualifies when the invited person finishes their first mock exam. Monthly caps apply;
          abuse (self-referral, farming, disposable addresses) forfeits rewards. While entitlements
          enforcement is off, attributions still record and rewards defer until enforcement is on.
        </p>
      </section>

      <section className="space-y-3 mb-10">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="leading-relaxed text-foreground/90">
          <a href="mailto:info@cyberskill.world" className="text-primary underline">
            info@cyberskill.world
          </a>
        </p>
      </section>
    </main>
  );
}
