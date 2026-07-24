import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { metrics } from '@opentelemetry/api';
import { isRoutedLocale } from '@/i18n/config';
import { classify, clientIpFromHeaders, hitRateLimit } from '@/lib/rateLimit';
import { hostCutoverRedirectEnabled, LIVE_SITE_HOST, PRACTICE_SITE_HOST } from '@/lib/site';

const meter = metrics.getMeter('ccaf.sec');
const rateLimited = meter.createCounter('sec.rate_limited');

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? '';
  // LAUNCH only: HOST_CUTOVER_REDIRECT=on. Default off so production users stay on ccaf.
  if (hostCutoverRedirectEnabled() && host === LIVE_SITE_HOST) {
    const url = request.nextUrl.clone();
    url.hostname = PRACTICE_SITE_HOST;
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  const { pathname } = request.nextUrl;
  const method = request.method;

  // Propagate pathname so not-found can count contract 404s (SEO-001).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const firstSeg = pathname.split('/').filter(Boolean)[0];
  requestHeaders.set('x-locale', firstSeg && isRoutedLocale(firstSeg) ? firstSeg : 'en');

  const routeClass = classify(pathname, method);
  if (routeClass) {
    const ip = clientIpFromHeaders(request.headers);
    const result = await hitRateLimit(routeClass, ip);
    if (!result.allowed) {
      rateLimited.add(1, { route_class: routeClass });
      return NextResponse.json(
        { error: 'rate_limited', retryAfterS: result.retryAfterS },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfterS),
            'X-Robots-Tag': 'noindex',
          },
        }
      );
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('X-Robots-Tag', 'noindex');
    return res;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
