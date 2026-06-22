import type { MetadataRoute } from 'next';
import { DOMAIN_ORDER } from '@/lib/domains';

const SITE_URL = 'https://ccaf.cyberskill.world';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // /exam and /result are runtime app states, not indexable content.
  const paths = [
    '',
    '/about',
    '/leaderboard',
    '/dashboard',
    '/guide',
    '/sample-questions',
    '/faq',
    '/domains',
    ...DOMAIN_ORDER.map((id) => `/domains/${id}`),
  ];

  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
  }));
}
