import type { MetadataRoute } from 'next';
import { hreflangLanguages, SITE_URL } from '@/i18n/config';
import { englishPathFromLocalized } from '@/lib/i18nPaths';
import { indexedPaths } from '@/lib/urlContract';
import { PSEO_INTENTS, pseoState } from '@/lib/pseo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const paths = indexedPaths();
  const out: MetadataRoute.Sitemap = [];

  for (const path of paths) {
    const pseoMatch = path.match(
      /^\/exams\/([^/]+)\/(practice-exam|practice-questions|free-mock-test)$/
    );
    if (pseoMatch) {
      const code = pseoMatch[1];
      const intent = pseoMatch[2] as (typeof PSEO_INTENTS)[number];
      const state = await pseoState(code, intent);
      if (!state.indexable) continue;
    }

    const englishPath = englishPathFromLocalized(path || '/');
    out.push({
      url: path === '' || path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`,
      lastModified,
      alternates: {
        languages: hreflangLanguages(englishPath === '/' ? '/' : englishPath),
      },
    });
  }
  return out;
}
