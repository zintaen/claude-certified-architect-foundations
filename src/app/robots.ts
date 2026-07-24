import type { MetadataRoute } from 'next';
import { AI_CRAWLER_POLICY } from '@/lib/aeo';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots['rules'] = [
    {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/exam', '/practice', '/result', '/dashboard', '/score', '/flashcards'],
    },
  ];

  for (const entry of AI_CRAWLER_POLICY) {
    if (entry.allow === 'none') {
      rules.push({ userAgent: entry.agent, disallow: '/' });
    } else {
      rules.push({
        userAgent: entry.agent,
        allow: '/',
        disallow: ['/api/'],
      });
    }
  }

  return {
    rules,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
