import Link from 'next/link';
import { headers } from 'next/headers';
import { recordContract404 } from '@/lib/seoMetrics';

export default async function NotFound() {
  const h = await headers();
  const pathname = h.get('x-pathname') || h.get('x-invoke-path') || h.get('next-url') || '';
  if (pathname) {
    recordContract404(pathname.split('?')[0] || pathname);
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-12 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-foreground/70">That URL is not part of this site.</p>
      <Link href="/" className="text-primary underline-offset-2 hover:underline">
        Back home
      </Link>
    </main>
  );
}
