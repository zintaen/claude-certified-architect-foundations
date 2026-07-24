# Analytics baseline (OBS-001)

Product analytics via PostHog (`src/lib/analytics.ts`), gated on LEGAL-002 analytics consent.
This document is the reviewable KPI definition set for Phase 1 migration regression detection
(task-DATA-002).

## Environment

| Variable                   | Purpose                            |
| -------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_POSTHOG_KEY`  | Project key; unset = full no-op    |
| `NEXT_PUBLIC_POSTHOG_HOST` | Default `https://us.i.posthog.com` |

## Event taxonomy

Canonical names (compile-time map in `src/lib/analytics.ts`):

- `exam_started` — timed or practice sitting began
- `exam_submitted` — learner submitted answers
- `exam_graded` — score returned
- `practice_started` — untimed / domain drill
- `question_answered` — **sampled 1-in-5** (budget ≤ 20 per 100 questions)
- `flashcards_started`
- `result_viewed`
- `subscribe_submitted`
- `donate_clicked`
- `upgrade_prompt_shown` / `upgrade_prompt_clicked` / `entitlement_gate_hit` (PAY-001; fire only when enforcement on)

Identity: PostHog anonymous IDs by default. On email-bearing actions, `identify(sha256(lowercase(email)))`.
Raw email / PIN MUST NOT appear in payloads.

## Activation

**Definition:** first `exam_graded` per `distinct_id`.

**Funnel (PostHog):** `exam_started` → `exam_submitted` → `exam_graded`.

Insight recipe: Trends or Funnel insight on those three events, unique users, weekly.

## Weekly active learners (WAL)

**Definition:** count of distinct IDs with ≥1 of `exam_graded` OR `practice_started` OR
`flashcards_started` in a rolling 7-day window.

North-star style metric from the expansion plan; recreate as a PostHog Trends unique-users chart
filtered to those events.

## Subscribe conversion

**Definition:** `subscribe_submitted` / `result_viewed` (same distinct_id, 7-day attribution window).

Sources: `post_result` (result-page capture), `footer`, `dashboard` / exam-setup opt-in mapped to
`dashboard` in the compatibility layer.

## Free-to-paid conversion

Not instrumented until PAY-001/PAY-002 extend the map. Placeholder: future `checkout_completed`
over `exam_graded` cohort.

## Pre-cutover rule (DATA-002)

**task-DATA-002 MUST NOT cut over with fewer than 14 days of baseline capture on these funnels.**

Fourteen days is a floor from the expansion plan (detect migration regression), not a statistical
optimum. DATA-002 may extend the window if traffic is noisy; it MUST NOT shorten it.

Capture start = first production day with `NEXT_PUBLIC_POSTHOG_KEY` set and consent-gated events
flowing. Compare activation, WAL, and subscribe conversion before vs after cutover.

## Ad-blockers and undercount

Client capture undercounts when extensions block PostHog. Compare `/api/subscribe` row counts to
`subscribe_submitted` during the baseline window. Server-side `exam_graded` capture is optional
(OBS-001 §1 #8) and currently off.

## OTel

Ops telemetry (`instrumentation.ts`, `@vercel/otel`) is independent. PostHog does not replace it.
