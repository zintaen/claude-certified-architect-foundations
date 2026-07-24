---
id: task-SEC-001
title: 'Anti-scraping and abuse defenses for the item bank'
module: SEC
class: improvement
priority: MUST
status: done
verify: T
phase: P0
milestone: 'P0 · slice 1'
slice: 1
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-LEGAL-002, task-OBS-001, task-DATA-001]
depends_on: []
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - 'Risk register: item-bank scraping/resale - High likelihood, Medium impact; defenses: bot mgmt, rate limits, auth-gating, canary items, no bulk export'
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - src/middleware.ts
  - src/lib/rateLimit.ts
  - src/lib/turnstile.ts
  - src/data/canary.server.ts
  - docs/abuse-response.md
  - tests/unit/rate-limit.test.ts
  - tests/unit/turnstile.test.ts
  - tests/e2e/rate-limits.spec.ts
modified_files:
  - src/app/api/subscribe/route.tsx
  - src/app/robots.ts
  - src/data/questions.server.ts
effort_hours: 12
subtasks:
  - 'Pluggable rate limiter + middleware wiring for /api/* (4h)'
  - 'Turnstile server verification on subscribe (2h)'
  - 'Canary item registry + low-frequency inclusion (3h)'
  - 'robots/X-Robots-Tag, abuse-response doc, tests (3h)'
risk_if_skipped: "The doc rates item-bank scraping as High likelihood: the site's value is the bank, competitors and dump-resellers scrape what succeeds, and today every API endpoint is unmetered and unchallenged. Once the bank is copied and reposted there is no undo, and without canary items there is not even proof the copy came from CyberSkill. The subscribe endpoint is also an open spam target that can poison the email list Phase 0 exists to grow."
---

# task-SEC-001 - Anti-scraping and abuse defenses for the item bank

## §1 - Description

1. The app MUST gain `src/middleware.ts` applying per-IP rate limits to every `/api/*` route with distinct budgets per route class: `read` (result, answers, session GET) and `write` (grade, session POST, subscribe). Budgets and window sizes MUST be configurable via env with safe defaults, and exceeding a budget MUST return `429` with a `Retry-After` header and a JSON error body.
2. The limiter (`src/lib/rateLimit.ts`) MUST be pluggable: a `RateLimitStore` interface with (a) a Redis/Upstash-backed store when `RATE_LIMIT_REDIS_URL` is set, and (b) an in-memory token-bucket fallback otherwise. The in-memory fallback's per-instance limitation on serverless MUST be documented in the module header and in `docs/abuse-response.md` - it is a speed bump, not a boundary, and the doc MUST say so.
3. Client identification MUST use the platform-provided client IP (Vercel `x-real-ip` / `request.ip` semantics) and MUST NOT trust a caller-supplied `x-forwarded-for` chain beyond the platform-appended hop.
4. `/api/subscribe` MUST verify a Cloudflare Turnstile token server-side (`src/lib/turnstile.ts`) when `TURNSTILE_SECRET_KEY` is configured. Verification failures MUST return 400 without writing to the subscribers table. When the env is unset (local dev, preview), the check MUST be skipped and a startup log line MUST record that Turnstile is disabled.
5. Behaviour under Turnstile outage MUST be fail-open with logging (availability of a free product beats spam protection), and this decision MUST be recorded in the module header as deliberate.
6. A server-only canary registry `src/data/canary.server.ts` MUST hold at least 10 canary items: plausible, uniquely-worded questions that exist nowhere else. Canaries MUST be mixed into practice pools at a low documented frequency, MUST be excluded from scoring, readiness statistics, and the leaderboard path, and MUST never be flagged as canaries in any client-visible payload. The registry MUST record each canary's unique phrase for later web-search proof of leaks.
7. No endpoint may return more than one sitting's worth of questions per request, and no endpoint may return correct answers alongside question text. The existing public/server split (`questions.public.ts` vs `questions.server.ts`) MUST be pinned by tests so a refactor cannot silently merge them.
8. `src/app/robots.ts` MUST disallow `/api/` for all agents, and API responses MUST carry `X-Robots-Tag: noindex`. Page routes MUST remain fully crawlable - this task MUST NOT touch page-level crawl behaviour (SEO surface belongs to task-SEO-001).
9. Rate-limit rejections and Turnstile failures MUST emit OTel counters via the existing instrumentation so abuse is visible in ops dashboards; counter names MUST be namespaced `sec.rate_limited` and `sec.turnstile_failed`.
10. Legitimate flows MUST NOT regress: the documented budgets MUST accommodate the worst-case legitimate exam flow (session create, N answer saves, grade, result fetch) with at least 3x headroom, and an e2e test MUST drive a full exam without hitting 429.
11. `docs/abuse-response.md` MUST document: budget rationale, how to identify a scrape in logs/metrics, the canary web-search procedure, the takedown/ban response steps referencing the AUP (task-LEGAL-002), and the explicit deferral of auth-gated item serving to task-DATA-001 (today most of the bank ships in the client bundle; the durable boundary arrives with the DB-backed model).

## §2 - Why this design

**Why a pluggable limiter with an honest fallback (§1 #2)?** On serverless, in-memory state is per-lambda: a determined scraper spreads across instances and the limit leaks. Pretending otherwise would be security theater; naming the limitation and offering the Redis store when scale justifies it keeps the module truthful and upgradeable without rework.

**Why fail-open on Turnstile outage (§1 #5)?** The product's growth engine is the free funnel. Blocking signups because a third-party challenge is down inverts the risk (certain funnel loss vs possible spam). The decision is written down so a future incident review sees intent, not accident.

**Why canaries in practice pools only (§1 #6)?** Canary items prove provenance when the bank shows up on a dump site - the doc's "detect and prove leaks" defense. Excluding them from scoring and readiness keeps the psychometric surface clean (a canary answered wrong must never cost a learner), and low frequency keeps exposure plausible while limiting harm to practice quality.

**Why pin the public/server question split (§1 #7)?** The split is the only thing keeping answer keys out of the bundle today. It exists by convention, not by contract; one refactor could merge them and no test would notice. Pinning it converts convention into contract until DATA-001 replaces the mechanism.

**Why defer auth-gating to DATA-001 (§1 #11)?** With items compiled into the client bundle, bundle-level scraping cannot be prevented by request-level defenses. The honest Phase 0 posture is: meter the APIs, watermark the content, document the boundary, and let the data-model rebuild (which moves items behind authenticated, paginated serving) provide the real gate.

## §3 - Contract

```typescript
// src/lib/rateLimit.ts
export interface RateLimitStore {
  hit(
    key: string,
    windowMs: number,
    max: number
  ): Promise<{ allowed: boolean; retryAfterS: number }>;
}
export function createStore(): RateLimitStore; // redis if RATE_LIMIT_REDIS_URL else memory
export type RouteClass = 'read' | 'write';
export function classify(pathname: string): RouteClass | null; // null = not rate limited
export const BUDGETS: Record<RouteClass, { windowMs: number; max: number }>; // env-overridable

// src/lib/turnstile.ts
export async function verifyTurnstile(
  token: string | null,
  ip: string
): Promise<
  | { ok: true }
  | { ok: false; reason: 'missing' | 'invalid' | 'unconfigured_skip' | 'outage_failopen' }
>;

// src/data/canary.server.ts  (server-only module; import from client MUST fail lint/build)
export interface CanaryItem {
  id: string;
  uniquePhrase: string;
  item: Question;
}
export const CANARIES: readonly CanaryItem[]; // >= 10
export function isCanary(questionId: string): boolean;
export const CANARY_PRACTICE_FREQUENCY: number; // documented inclusion rate
```

```text
middleware matcher: ['/api/:path*']
429 body: { "error": "rate_limited", "retryAfterS": <n> }
robots: Disallow: /api/  (pages untouched)
OTel counters: sec.rate_limited{route_class}, sec.turnstile_failed{reason}
```

## §4 - Acceptance criteria

1. **429 on abuse** - Driving any write route past its budget yields 429 with Retry-After and the JSON body; under budget yields normal responses (traces_to: §1 #1).
2. **Store selection** - With `RATE_LIMIT_REDIS_URL` set the redis store is used; unset falls back to memory and the module logs the per-instance limitation (traces_to: §1 #2).
3. **Spoof-proof keying** - Requests carrying a forged `x-forwarded-for` do not escape their bucket; keying follows the platform IP (traces_to: §1 #3).
4. **Turnstile enforced when configured** - With secret set, subscribe without a valid token returns 400 and writes nothing; with valid token the row is written (traces_to: §1 #4).
5. **Fail-open recorded** - Simulated Turnstile 5xx lets a subscribe through with `outage_failopen` logged and counted (traces_to: §1 #5).
6. **Canary registry sound** - At least 10 canaries; none appear in scored exams, readiness calc, or leaderboard writes; practice inclusion matches the documented frequency; no client payload marks them (traces_to: §1 #6).
7. **No bulk or answer leakage** - No API response contains more than one sitting's questions; no response pairs question text with correct answers; the public/server module split is asserted by a grep/type test (traces_to: §1 #7).
8. **Crawl hygiene** - robots output disallows /api/; API responses carry X-Robots-Tag: noindex; page routes unchanged (traces_to: §1 #8).
9. **Abuse observability** - Forced rejections increment `sec.rate_limited` and `sec.turnstile_failed` counters (traces_to: §1 #9).
10. **Legit flow headroom** - e2e full exam (create session, answer all, grade, view result) completes with zero 429s under default budgets (traces_to: §1 #10).
11. **Response doc complete** - `docs/abuse-response.md` contains budgets rationale, detection guide, canary search procedure, AUP-linked response steps, and the DATA-001 deferral statement (traces_to: §1 #11).

## §5 - Verification

```typescript
// tests/unit/rate-limit.test.ts (vitest)
test('memory store: allows under max, 429s over, retryAfter decreases'); // AC 1
test('createStore picks redis when env set, memory otherwise (logs)'); // AC 2
test('classify maps api routes to read/write, others null'); // AC 1
test('key derivation ignores caller-supplied x-forwarded-for'); // AC 3

// tests/unit/turnstile.test.ts
test('missing/invalid token -> ok:false with reason'); // AC 4
test('unconfigured env -> unconfigured_skip'); // AC 4
test('upstream 5xx -> outage_failopen'); // AC 5
test('canaries: >=10, excluded from scoring/readiness/leaderboard paths'); // AC 6
test('canary practice inclusion rate matches CANARY_PRACTICE_FREQUENCY'); // AC 6
test('no api module pairs question text with answer key (import graph)'); // AC 7
```

```typescript
// tests/e2e/rate-limits.spec.ts (playwright)
test('hammer subscribe -> 429 with Retry-After; normal use unaffected'); // AC 1, 10
test('full exam flow completes with zero 429s'); // AC 10
test('robots.txt disallows /api/; api response has X-Robots-Tag'); // AC 8
test('otel counters increment on forced rejection (log/exporter probe)'); // AC 9
test('abuse-response doc sections present'); // AC 11 (fs assertion)
```

## §6 - Implementation skeleton

(API contract above is the skeleton.) Order: rateLimit.ts (stores + classify) -> middleware.ts -> turnstile.ts + subscribe route wiring -> canary registry + practice-pool inclusion in questions.server.ts -> robots/X-Robots-Tag -> OTel counters -> abuse-response doc -> tests. Canary inclusion touches the practice selection path only; scored-exam assembly must filter `isCanary`.

## §7 - Dependencies

- Upstream: none hard. Uses OTel already in repo; references the AUP text (task-LEGAL-002) in the response doc - textual link, not a build dependency.
- Downstream: task-DATA-001 supersedes the bundle-exposure limitation with auth-gated item serving and inherits the limiter for its new endpoints; task-PAY-002's checkout endpoints reuse the `write` class.
- External: Cloudflare Turnstile site/secret keys (operator provisions); optional Upstash Redis for the distributed store.

## §8 - Example payloads

```json
// 429 response
{ "error": "rate_limited", "retryAfterS": 23 }
```

```typescript
// canary example (registry entry)
{
  id: 'canary-007',
  uniquePhrase: 'a scheduling sidecar named Quorlet',
  item: { /* plausible Claude-architecture question referencing Quorlet */ }
}
// leak proof procedure: search the unique phrase; a hit off-domain is provenance evidence.
```

## §9 - Open questions

Deferred:

- Exact default budget numbers are set at implementation from observed legitimate peaks (OBS-001 data if available; otherwise measure a manual exam run and apply the 3x headroom rule from §1 #10). The spec fixes the rule, not the number, to avoid inventing targets.
- Whether session creation also gets a Turnstile challenge is deferred until abuse is observed (fail-open posture makes it low value today).
- Cloudflare-proxying the whole site (bot management beyond Turnstile) is an infra/operator decision tracked in the response doc, not a repo change.

## §10 - Failure modes inventory

| Failure                                                                | Detection                                                                      | Outcome                                         | Recovery                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------- |
| Scraper spreads across lambdas, memory limiter leaks                   | Documented limitation; sec.rate_limited counter anomaly                        | Partial protection only                         | Set RATE_LIMIT_REDIS_URL (store swap, no code change)            |
| Legit exam burst hits 429                                              | e2e AC 10 pre-merge; counter spike + support reports post-merge                | Users blocked mid-exam                          | Raise write budget env; headroom rule 3x                         |
| Turnstile outage blocks signups                                        | fail-open path (AC 5)                                                          | None (allowed + logged)                         | Review outage log volume                                         |
| Spam flood while Turnstile unconfigured                                | Startup log line; subscribe volume anomaly in OBS                              | List pollution                                  | Configure keys; purge rows by source/time                        |
| Canary scored against a learner                                        | Unit exclusion tests (AC 6)                                                    | Unfair result, trust damage                     | isCanary filter in grade path is contract                        |
| Canary phrase leaks via client devtools inspection of practice payload | Canaries are indistinguishable in payload (no marker); registry is server-only | Scraper copies canaries too - that is the point | Web-search procedure proves provenance                           |
| x-forwarded-for spoofing resets buckets                                | Unit AC 3                                                                      | Limiter bypass                                  | Platform-IP keying only                                          |
| robots change accidentally deindexes pages                             | e2e AC 8 asserts pages untouched                                               | SEO damage                                      | Scope: only /api/ line added                                     |
| OTel counter cardinality explosion                                     | Fixed label sets (route_class, reason)                                         | Metrics cost                                    | Closed label enums in contract                                   |
| Middleware latency added to every API call                             | Limiter is O(1) store hit; e2e timing sanity                                   | Slower APIs                                     | Memory path sub-ms; redis path measured                          |
| Bundle-level scrape of questions.public.ts                             | Out of request-path scope; documented in response doc                          | Bank copied                                     | DATA-001 auth-gated serving; canaries prove provenance meanwhile |
| Subscribe route contract drift breaks existing footer form             | e2e subscribe happy path (AC 4 valid-token branch)                             | Signup breakage                                 | Token optional when unconfigured keeps dev flows working         |

## §11 - Implementation notes

- Keep the middleware matcher narrow (`/api/:path*`): page routes must never pay the limiter cost or risk a false 429 for crawlers.
- Turnstile verification is one fetch to `challenges.cloudflare.com/turnstile/v0/siteverify`; no SDK dependency - keep it that way.
- Canary authorship: write them during implementation as ordinary-looking items with one invented, searchable proper noun each; never reuse phrasing from real items. They live server-side so the registry itself is not shipped to the bundle.
- When DATA-001 lands, migrate `BUDGETS` and `classify` to cover the new item-serving endpoints in the same module - the interface is designed so that is additive.

_End of task-SEC-001._
