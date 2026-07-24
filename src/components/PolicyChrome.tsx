import Link from 'next/link';
import type { PolicyMeta } from '@/lib/consent';

export function PolicyHeader({ title, meta }: { title: string; meta: PolicyMeta }) {
  return (
    <header className="space-y-2 mb-8">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted" data-testid="policy-meta">
        Version {meta.version} · Effective {meta.effective}
      </p>
    </header>
  );
}

export function PolicyNav() {
  return (
    <nav className="text-sm flex flex-wrap gap-3 mb-8 text-muted">
      <Link href="/terms" className="hover:text-primary underline-offset-2 hover:underline">
        Terms
      </Link>
      <Link href="/privacy" className="hover:text-primary underline-offset-2 hover:underline">
        Privacy
      </Link>
      <Link
        href="/acceptable-use"
        className="hover:text-primary underline-offset-2 hover:underline"
      >
        Acceptable use
      </Link>
      <Link href="/refunds" className="hover:text-primary underline-offset-2 hover:underline">
        Refunds
      </Link>
      <Link href="/pricing" className="hover:text-primary underline-offset-2 hover:underline">
        Pricing
      </Link>
    </nav>
  );
}
