// Pings IndexNow (Bing, Yandex, and others) with the indexable URLs so new and changed pages are
// discovered quickly. No account needed: the key below is also hosted at /public/<key>.txt for
// ownership verification. Run after a deploy:  node scripts/indexnow.mjs
// (Google does not use IndexNow - submit the sitemap in Google Search Console for Google.)
const KEY = 'f3a9c1e7b25d480a9c6e1b7d4f0a8c52';
const HOST = 'ccaf.cyberskill.world';

const paths = [
  '/',
  '/guide',
  '/faq',
  '/domains',
  '/sample-questions',
  '/domains/research_pipeline',
  '/domains/extraction_pipeline',
  '/domains/customer_support',
  '/domains/code_exploration',
  '/about',
];
const urlList = paths.map((p) => `https://${HOST}${p}`);

try {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList,
    }),
  });
  console.log(`IndexNow ping: HTTP ${res.status} for ${urlList.length} urls`);
} catch (err) {
  console.warn('IndexNow ping failed (non-fatal):', err?.message || err);
}
