/**
 * Pluggable rate limiter (SEC-001).
 *
 * In-memory fallback is per-instance only on serverless (each lambda has its own
 * Map). That is a speed bump, not a scrape boundary — set RATE_LIMIT_REDIS_URL
 * for a shared store when abuse warrants it. See docs/abuse-response.md.
 *
 * Default budgets sized for a worst-case timed exam (session + ≤60 answer posts
 * + grade + result) with ≥3× headroom inside a 10-minute window.
 */

export type RouteClass = 'read' | 'write';

/** @deprecated Use RouteClass | null; kept for early DATA-001 call sites. */
export type RateLimitClass = RouteClass | 'auth' | 'other';

export interface RateLimitStore {
  hit(
    key: string,
    windowMs: number,
    max: number
  ): Promise<{ allowed: boolean; retryAfterS: number }>;
}

type Bucket = { count: number; resetAt: number };

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Env-overridable budgets. */
export const BUDGETS: Record<RouteClass, { windowMs: number; max: number }> = {
  // ~60 answers + session + grade ≈ 62 writes; 3× ≈ 186 → round to 200 / 10 min
  write: {
    windowMs: envInt('RATE_LIMIT_WRITE_WINDOW_MS', 10 * 60 * 1000),
    max: envInt('RATE_LIMIT_WRITE_MAX', 200),
  },
  read: {
    windowMs: envInt('RATE_LIMIT_READ_WINDOW_MS', 10 * 60 * 1000),
    max: envInt('RATE_LIMIT_READ_MAX', 300),
  },
};

/** Tighter sub-budget for /api/tutor (AI-001) on top of write class. */
export const TUTOR_SUB_BUDGET = {
  windowMs: envInt('RATE_LIMIT_TUTOR_WINDOW_MS', 10 * 60 * 1000),
  max: envInt('RATE_LIMIT_TUTOR_MAX', 30),
};

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();

  async hit(
    key: string,
    windowMs: number,
    max: number
  ): Promise<{ allowed: boolean; retryAfterS: number }> {
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b || now >= b.resetAt) {
      b = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, b);
    }
    b.count += 1;
    if (b.count > max) {
      const retryAfterS = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
      return { allowed: false, retryAfterS };
    }
    return { allowed: true, retryAfterS: 0 };
  }

  /** Test helper */
  clear(): void {
    this.buckets.clear();
  }
}

/**
 * Shared-store adapter. Uses an in-process Map keyed by redis URL when a real
 * Redis client is unavailable (local/test). When RATE_LIMIT_REDIS_URL points at
 * an Upstash REST endpoint (https), INCR/EXPIRE are issued via REST.
 */
export class RedisRateLimitStore implements RateLimitStore {
  private memory = new MemoryRateLimitStore();
  constructor(private readonly url: string) {}

  async hit(
    key: string,
    windowMs: number,
    max: number
  ): Promise<{ allowed: boolean; retryAfterS: number }> {
    if (this.url.startsWith('https://')) {
      try {
        const windowS = Math.max(1, Math.ceil(windowMs / 1000));
        const res = await fetch(this.url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RATE_LIMIT_REDIS_TOKEN ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['INCR', `rl:${key}`]),
        });
        if (!res.ok) return this.memory.hit(key, windowMs, max);
        const data = (await res.json()) as { result?: number };
        const count = Number(data.result) || 0;
        if (count === 1) {
          await fetch(this.url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RATE_LIMIT_REDIS_TOKEN ?? ''}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(['EXPIRE', `rl:${key}`, windowS]),
          });
        }
        if (count > max) {
          return { allowed: false, retryAfterS: windowS };
        }
        return { allowed: true, retryAfterS: 0 };
      } catch {
        return this.memory.hit(key, windowMs, max);
      }
    }
    // redis:// and other schemes: shared process Map (upgrade path documented)
    return this.memory.hit(`redis:${key}`, windowMs, max);
  }
}

let loggedMemoryLimitation = false;
let singleton: RateLimitStore | null = null;

export function createStore(): RateLimitStore {
  const url = process.env.RATE_LIMIT_REDIS_URL;
  if (url) {
    return new RedisRateLimitStore(url);
  }
  if (!loggedMemoryLimitation) {
    loggedMemoryLimitation = true;
    console.warn(
      '[rateLimit] Using in-memory store (per-instance on serverless). Set RATE_LIMIT_REDIS_URL for distributed limits. See docs/abuse-response.md.'
    );
  }
  return new MemoryRateLimitStore();
}

export function getStore(): RateLimitStore {
  if (!singleton) singleton = createStore();
  return singleton;
}

/** Reset singleton (tests). */
export function __resetRateLimitStoreForTests(): void {
  singleton = null;
  loggedMemoryLimitation = false;
}

/**
 * Map API path → rate class. Non-API paths return null (not limited).
 * Method-aware: mutating methods on /api/* are write.
 */
export function classify(path: string, method = 'GET'): RouteClass | null {
  const p = path.replace(/\?.*$/, '');
  const m = method.toUpperCase();
  if (!p.startsWith('/api/')) return null;

  if (p === '/api/catalog' && m === 'GET') return 'read';
  if (p === '/api/subscribe' && m === 'POST') return 'write';
  if (p === '/api/exam/grade' && m === 'POST') return 'write';
  if (p === '/api/tutor' && m === 'POST') return 'write';
  if (p === '/api/referrals') return m === 'GET' ? 'read' : 'write';
  if (p === '/api/community/explanations') return m === 'GET' ? 'read' : 'write';
  if (p === '/api/email/unsubscribe') return 'write';
  if (p === '/api/readiness') return 'read';
  if (p === '/api/drill/plan') return 'write';
  if (p === '/api/review') return m === 'GET' ? 'read' : 'write';
  if (p === '/api/plan') return m === 'GET' ? 'read' : 'write';
  if (p === '/api/offline/sync' && m === 'POST') return 'write';
  // PAY-002: Paddle webhooks — write class with retry-burst headroom (BUDGETS.write).
  if (p === '/api/webhooks/paddle' && m === 'POST') return 'write';
  if (p === '/api/paddle/withdrawal' && m === 'POST') return 'write';
  if (/^\/api\/exams\/[^/]+\/session$/.test(p) && m === 'POST') return 'write';
  if (p === '/api/session' || p === '/api/answers' || p === '/api/result') {
    return m === 'GET' ? 'read' : 'write';
  }
  if (m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE') return 'write';
  return 'read';
}

/**
 * Client IP: prefer platform `x-real-ip`; do not trust caller-controlled
 * multi-hop x-forwarded-for beyond taking the rightmost platform hop when
 * x-real-ip is absent.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real.slice(0, 64);
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // Rightmost hop is typically the platform-appended address.
    const hop = parts[parts.length - 1];
    if (hop) return hop.slice(0, 64);
  }
  return 'unknown';
}

export async function hitRateLimit(
  routeClass: RouteClass,
  ip: string
): Promise<{ allowed: boolean; retryAfterS: number }> {
  const budget = BUDGETS[routeClass];
  const key = `${routeClass}:${ip}`;
  return getStore().hit(key, budget.windowMs, budget.max);
}

/** AI-001: tighter sub-budget layered on write class for /api/tutor. */
export async function hitTutorSubBudget(
  ip: string
): Promise<{ allowed: boolean; retryAfterS: number }> {
  return getStore().hit(`tutor:${ip}`, TUTOR_SUB_BUDGET.windowMs, TUTOR_SUB_BUDGET.max);
}

/** GROWTH-003: per-IP / per-device qualification velocity (day window). */
export const REFERRAL_QUAL_BUDGET = {
  windowMs: envInt('RATE_LIMIT_REFERRAL_QUAL_WINDOW_MS', 24 * 60 * 60 * 1000),
  max: envInt('RATE_LIMIT_REFERRAL_QUAL_MAX', 8),
};

export async function hitReferralQualifyBudget(
  key: string
): Promise<{ allowed: boolean; retryAfterS: number }> {
  return getStore().hit(
    `referral:qual:${key}`,
    REFERRAL_QUAL_BUDGET.windowMs,
    REFERRAL_QUAL_BUDGET.max
  );
}

/** Compatibility helper used by route handlers before middleware landed. */
export async function enforceRateLimit(
  className: RateLimitClass | null,
  key: string
): Promise<{ ok: true } | { ok: false; status: number; error: string; retryAfterS?: number }> {
  if (className === null || className === 'other' || className === 'auth') {
    return { ok: true };
  }
  const result = await hitRateLimit(className, key);
  if (result.allowed) return { ok: true };
  return {
    ok: false,
    status: 429,
    error: 'rate_limited',
    retryAfterS: result.retryAfterS,
  };
}
