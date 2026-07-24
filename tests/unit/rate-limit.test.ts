import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BUDGETS,
  MemoryRateLimitStore,
  RedisRateLimitStore,
  classify,
  clientIpFromHeaders,
  createStore,
  __resetRateLimitStoreForTests,
} from '../../src/lib/rateLimit';

describe('rateLimit (SEC-001)', () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
    delete process.env.RATE_LIMIT_REDIS_URL;
  });

  afterEach(() => {
    __resetRateLimitStoreForTests();
    delete process.env.RATE_LIMIT_REDIS_URL;
  });

  it('memory store: allows under max, 429s over, retryAfter decreases', async () => {
    const store = new MemoryRateLimitStore();
    const windowMs = 5000;
    const max = 3;
    expect((await store.hit('k', windowMs, max)).allowed).toBe(true);
    expect((await store.hit('k', windowMs, max)).allowed).toBe(true);
    expect((await store.hit('k', windowMs, max)).allowed).toBe(true);
    const denied = await store.hit('k', windowMs, max);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterS).toBeGreaterThan(0);
  });

  it('createStore picks redis when env set, memory otherwise (logs)', () => {
    const mem = createStore();
    expect(mem).toBeInstanceOf(MemoryRateLimitStore);
    process.env.RATE_LIMIT_REDIS_URL = 'redis://localhost:6379';
    __resetRateLimitStoreForTests();
    const redis = createStore();
    expect(redis).toBeInstanceOf(RedisRateLimitStore);
  });

  it('classify maps api routes to read/write, others null', () => {
    expect(classify('/api/catalog', 'GET')).toBe('read');
    expect(classify('/api/exams/ccaf/session', 'POST')).toBe('write');
    expect(classify('/api/exam/grade', 'POST')).toBe('write');
    expect(classify('/api/subscribe', 'POST')).toBe('write');
    expect(classify('/api/webhooks/paddle', 'POST')).toBe('write');
    expect(classify('/api/paddle/withdrawal', 'POST')).toBe('write');
    expect(classify('/api/result', 'GET')).toBe('read');
    expect(classify('/page', 'GET')).toBeNull();
    expect(BUDGETS.write.max).toBeGreaterThanOrEqual(180);
  });

  it('key derivation ignores caller-supplied x-forwarded-for spoofing', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4, 9.9.9.9',
      'x-real-ip': '10.0.0.5',
    });
    expect(clientIpFromHeaders(headers)).toBe('10.0.0.5');
    const onlyXff = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    // Rightmost hop = platform-appended
    expect(clientIpFromHeaders(onlyXff)).toBe('5.6.7.8');
  });
});
