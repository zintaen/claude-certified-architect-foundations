import type { MetadataRoute } from 'next';

const SITE_URL = 'https://claude-certified-architect-mock-exam-cyberskill.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/exam', '/result'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
