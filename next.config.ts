import type { NextConfig } from 'next';
import { REDIRECTS } from './src/lib/seoRedirects';
import { PADDLE_CSP } from './src/lib/paddleCsp';

const paddleScript = PADDLE_CSP.scriptSrc.join(' ');
const paddleFrame = PADDLE_CSP.frameSrc.join(' ');
const paddleConnect = PADDLE_CSP.connectSrc.join(' ');
const paddleImg = PADDLE_CSP.imgSrc.join(' ');

/** Enumerated CSP — Paddle origins only for payment surfaces; site self for app. */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${paddleScript}`,
  `frame-src 'self' ${paddleFrame}`,
  `connect-src 'self' ${paddleConnect} https://*.supabase.co wss://*.supabase.co https://*.posthog.com`,
  `img-src 'self' data: blob: ${paddleImg}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY }],
      },
    ];
  },
  async redirects() {
    return REDIRECTS.map((r) => ({
      source: r.source,
      destination: r.destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
