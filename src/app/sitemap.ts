import type { MetadataRoute } from 'next';

const SITE_URL = 'https://claude-certified-architect-mock-exam-cyberskill.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // /exam and /result are runtime app states, not indexable content.
  return ['', '/about', '/leaderboard', '/dashboard'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
  }));
}
