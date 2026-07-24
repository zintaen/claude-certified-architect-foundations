import Disclaimer from '@/components/Disclaimer';
import type { VendorKey } from '@/lib/legal';

/** Compact independence + trademark notice for exam surfaces. */
export default function IndependenceDisclaimer({
  className = '',
  vendor = 'anthropic',
}: {
  className?: string;
  vendor?: VendorKey;
}) {
  return (
    <div className={className} data-vendor={vendor}>
      <Disclaimer variant="inline" vendor={vendor} />
    </div>
  );
}
