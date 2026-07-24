import { describe, expect, it } from 'vitest';
import { NEVER_CACHE_PATH_PREFIXES, isPwaEnabledFromEnv, strategyForUrl } from '../../src/sw';
import { canStartExamOffline, offlineBannerCopy, offlineCapabilities } from '../../src/lib/offline';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('PWA strategy map (SCALE-002)', () => {
  it('static assets cache-first; shells SWR; API network-first', () => {
    expect(strategyForUrl('/_next/static/chunks/app.js')).toBe('cache-first');
    expect(strategyForUrl('/icon-192.png')).toBe('cache-first');
    expect(strategyForUrl('/')).toBe('stale-while-revalidate');
    expect(strategyForUrl('/practice')).toBe('stale-while-revalidate');
    expect(strategyForUrl('/api/catalog')).toBe('network-first');
  });

  it('never-cache list bypasses worker caching', () => {
    for (const p of NEVER_CACHE_PATH_PREFIXES) {
      expect(strategyForUrl(p)).toBe('bypass');
      expect(strategyForUrl(`${p}/x`)).toBe('bypass');
    }
    expect(strategyForUrl('/api/exam/grade')).toBe('bypass');
    expect(strategyForUrl('/api/entitlements')).toBe('bypass');
    expect(strategyForUrl('/api/tutor')).toBe('bypass');
    expect(strategyForUrl('/api/webhooks/paddle')).toBe('bypass');
    expect(strategyForUrl('/checkout')).toBe('bypass');
  });

  it('public/sw.js mirrors never-cache prefixes', () => {
    const sw = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');
    for (const p of NEVER_CACHE_PATH_PREFIXES) {
      expect(sw).toContain(p);
    }
    expect(sw).toMatch(/cache-first|CACHE_STATIC/);
    expect(sw).toMatch(/stale-while-revalidate|CACHE_SHELLS/);
    expect(sw).toMatch(/network-first/);
    expect(sw).toMatch(/PURGE_AND_UNREGISTER/);
  });

  it('kill flag defaults on; off disables', () => {
    expect(isPwaEnabledFromEnv({ NEXT_PUBLIC_PWA_ENABLED: 'on' })).toBe(true);
    expect(isPwaEnabledFromEnv({ NEXT_PUBLIC_PWA_ENABLED: 'off' })).toBe(false);
    expect(isPwaEnabledFromEnv({})).toBe(true);
  });

  it('offline capabilities honest; exam start refused offline', () => {
    const caps = offlineCapabilities(false);
    expect(caps.grading).toBe(false);
    expect(caps.tutor).toBe(false);
    expect(caps.checkout).toBe(false);
    const copy = offlineBannerCopy(caps);
    expect(copy.doesNot.join(' ')).toMatch(/Grading/i);
    expect(canStartExamOffline().ok).toBe(false);
  });

  it('fences: no store/native artifacts; manifest present', () => {
    expect(existsSync(join(process.cwd(), 'public/manifest.webmanifest'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'ios'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'android'))).toBe(false);
    const pkg = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    expect(pkg).not.toMatch(/capacitor|cordova|react-native/);
  });
});
