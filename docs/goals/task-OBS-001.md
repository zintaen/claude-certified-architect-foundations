---
source: task-OBS-001
born: 2026-07-24
status: satisfied
last_pass: 2026-07-24
on_violation: report
---

# Goal — task-OBS-001 PostHog + email capture

## predicates

- `src/lib/analytics.ts` sole posthog-js import; consent-gated; typed 9-event map
- AnalyticsProvider in layout; track.ts delegates; question_answered 1-in-5 sample
- PostResultCapture on /result; docs/analytics-baseline.md with 14-day DATA-002 rule
- identifyByEmail = sha256 hex only; OTel instrumentation untouched
- Unit + e2e green

## notes

Operator must set `NEXT_PUBLIC_POSTHOG_KEY` (+ optional HOST) in production for capture to start.
Privacy page lists PostHog as analytics sub-processor (consent-gated).
