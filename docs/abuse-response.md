# Abuse response playbook (SEC-001)

Anti-scraping and spam defenses for the CyberSkill practice-exam APIs.

## Rate-limit budgets

Defaults (env-overridable) in `src/lib/rateLimit.ts`:

| Class   | Window | Max | Rationale                                                                     |
| ------- | ------ | --- | ----------------------------------------------------------------------------- |
| `write` | 10 min | 200 | Timed exam ≈ session + ≤60 answer posts + grade (~62). **3× headroom** → 200. |
| `read`  | 10 min | 300 | Result/session/catalog polls with headroom.                                   |

Env knobs: `RATE_LIMIT_WRITE_MAX`, `RATE_LIMIT_WRITE_WINDOW_MS`, `RATE_LIMIT_READ_MAX`,
`RATE_LIMIT_READ_WINDOW_MS`, `RATE_LIMIT_REDIS_URL` (+ `RATE_LIMIT_REDIS_TOKEN` for HTTPS REST).

### In-memory limitation (honest)

Without Redis, the limiter is **per serverless instance**. A scraper that spreads across
lambdas can dilute the budget. That is a **speed bump, not a boundary**. Set
`RATE_LIMIT_REDIS_URL` when abuse volume justifies a shared store.

## Detecting a scrape

1. Spike in `sec.rate_limited{route_class=write|read}` (OTel).
2. Many distinct IPs hitting `/api/exams/*/session` or `/api/catalog` with low `exam_graded`.
3. Sequential ID walks or identical User-Agent bursts in edge logs.
4. Subscribe flood → `sec.turnstile_failed` and `/api/subscribe` 400s.

## Canary web-search procedure

1. Open `src/data/canary.server.ts` and pick a `uniquePhrase` (e.g. `a scheduling sidecar named Quorlet`).
2. Web-search the exact phrase in quotes.
3. Any off-domain hit that reproduces the stem/options is **provenance evidence** the bank was copied from CyberSkill.
4. Preserve the URL, date, and phrase ID for counsel / takedown.

Canaries mix into **practice** pools at `CANARY_PRACTICE_FREQUENCY` (5%). They are excluded from
scoring, readiness, and leaderboard paths. Client payloads never mark them as canaries.

## Takedown / ban steps (AUP)

1. Confirm leak via canary phrase search.
2. Cite Acceptable Use Policy (`/acceptable-use`) — dumps, scraping, resale prohibited.
3. Remove offending contributions; revoke access for abusive accounts when identifiable.
4. File platform takedown / DMCA as appropriate; keep canary evidence.
5. Optionally tighten write budgets and enable Redis + Turnstile if not already on.

## Turnstile

- Configured via `TURNSTILE_SECRET_KEY`. Unset → verification skipped (logged once).
- Upstream 5xx / network → **fail-open** (`outage_failopen`) so the free funnel stays up.
- Failures increment `sec.turnstile_failed{reason}`.

## Crawl hygiene

- `robots.txt` disallows `/api/`.
- API responses set `X-Robots-Tag: noindex`.
- Page routes remain crawlable (SEO ownership: task-SEO-001).

## Deferred: auth-gated item serving (DATA-001)

Today most of the classic CCAF bank still ships in the client public bundle
(`questions.public.ts`). Request-level defenses cannot stop bundle scraping.
**The durable boundary arrives with the DB-backed model (task-DATA-001)** —
authenticated, paginated item serving. Phase 0 posture: meter APIs, watermark with
canaries, document the gap.

## Cloudflare full-proxy bot management

Optional infra decision (not a repo change): put the site behind Cloudflare Bot Management
when scrapes outpace app-layer limits.
