---
source: task-SEC-001
born: 2026-07-24
status: satisfied
last_pass: 2026-07-24
on_violation: report
---

# Goal — task-SEC-001 anti-scraping baseline

## predicates

- Pluggable rateLimit + middleware/route enforcement; 429 + Retry-After
- Turnstile verify on subscribe (fail-open on outage; skip when unset)
- ≥10 canaries; practice mix; excluded from scoring
- robots Disallow /api/; X-Robots-Tag noindex on API
- docs/abuse-response.md complete

## notes

In-memory limiter is per-instance. Set RATE_LIMIT_REDIS_URL for distributed limits.
OTel register() is try/caught so local SDK mismatches do not 500 the app.
