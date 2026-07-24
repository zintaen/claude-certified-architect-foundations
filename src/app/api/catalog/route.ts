import { NextResponse } from 'next/server';
import { listCatalog } from '@/lib/catalog';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';

export async function GET(request: Request) {
  const cls = classify('/api/catalog', 'GET');
  const limited = await enforceRateLimit(cls, clientIpFromHeaders(request.headers));
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: limited.status });
  }
  try {
    const catalog = await listCatalog();
    return NextResponse.json({ catalog });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'catalog unavailable' },
      { status: 503 }
    );
  }
}
