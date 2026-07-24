import { buildLlmsTxt } from '@/lib/aeo';

/** GROWTH-002: catalog-generated index for AI agents. */
export function GET() {
  const body = buildLlmsTxt();
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
