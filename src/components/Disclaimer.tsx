import Link from 'next/link';
import {
  INDEPENDENCE_DISCLAIMER,
  composeIndependenceDisclaimer,
  type VendorKey,
} from '@/lib/legal';

/**
 * Site-wide independence disclaimer (LEGAL-001 / SCALE-004).
 * footer: small text + link to About trademarks
 * inline: text only
 */
export default function Disclaimer({
  variant = 'footer',
  vendor = 'anthropic',
}: {
  variant?: 'footer' | 'inline';
  vendor?: VendorKey;
}) {
  const text =
    vendor === 'anthropic' ? INDEPENDENCE_DISCLAIMER : composeIndependenceDisclaimer(vendor);

  if (variant === 'inline') {
    return (
      <p className="text-xs text-muted leading-relaxed" data-testid="independence-disclaimer">
        {text}
      </p>
    );
  }

  return (
    <p
      className="text-xs text-muted leading-relaxed max-w-3xl"
      data-testid="independence-disclaimer"
    >
      {text}{' '}
      <Link href="/about#trademarks" className="text-primary underline underline-offset-2">
        Trademarks and independence
      </Link>
      .
    </p>
  );
}
