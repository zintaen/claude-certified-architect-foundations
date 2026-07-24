---
id: task-OBS-001
title: 'PostHog product analytics baseline and email capture'
module: OBS
class: product
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
related_tasks: [task-LEGAL-002, task-DATA-002]
depends_on: [task-LEGAL-002]
blocks: [task-DATA-002, task-GROWTH-003, task-GROWTH-005]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - 'Phase 0: instrument analytics (PostHog) and capture emails; KPIs: activation = first mock completed, free-to-paid conversion, WAL north star'
  - 'Phase 1 dependency: Phase 0 analytics baseline to detect migration regression'
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - src/lib/analytics.ts
  - src/components/PostResultCapture.tsx
  - docs/analytics-baseline.md
  - tests/unit/analytics.test.ts
  - tests/e2e/analytics-consent.spec.ts
modified_files:
  - src/app/layout.tsx
  - src/lib/track.ts
  - src/app/result/page.tsx
  - package.json
effort_hours: 10
subtasks:
  - 'analytics.ts wrapper: typed event map, consent gate, no-op paths (3h)'
  - 'PostHog provider wiring + track.ts migration (3h)'
  - 'Post-result email capture component on existing /api/subscribe (2h)'
  - 'Baseline KPI doc + unit/e2e tests (2h)'
risk_if_skipped: "Phase 1 rewrites the data layer and cuts over a live, viral site. Without a pre-migration event baseline there is no way to tell whether signups, exam completions, or conversion dropped because of the migration - the doc names the analytics baseline as Phase 1's explicit dependency and 'activation (first mock completed)' as a core KPI. Every week without capture is funnel data lost forever, and the email list (the only owned channel) grows slower than the traffic spike allows."
---

# task-OBS-001 - PostHog product analytics baseline and email capture

## §1 - Description

1. The app MUST integrate PostHog via a single wrapper module `src/lib/analytics.ts`. No component or lib may import `posthog-js` directly; the wrapper is the only entry point. It MUST no-op cleanly (no network, no errors) when `NEXT_PUBLIC_POSTHOG_KEY` is unset, when running in dev/test, and when analytics consent is absent.
2. PostHog MUST NOT initialize, load its script, or send any event before the `analytics` consent category from `src/lib/consent.ts` (task-LEGAL-002) is granted. The wrapper MUST subscribe via `onConsentChange` and activate or deactivate at runtime; on revocation it MUST stop capture and clear PostHog cookies/storage for this site.
3. The wrapper MUST expose a typed event map covering the activation funnel: `exam_started`, `exam_submitted`, `exam_graded`, `practice_started`, `question_answered`, `flashcards_started`, `result_viewed`, `subscribe_submitted`, `donate_clicked`. Event names and property shapes are declared once in the map; `track(event, props)` rejects unknown events at compile time. Existing call sites in `src/lib/track.ts` MUST be routed through the wrapper (keep the old function signatures as thin delegates so call sites do not churn).
4. Identity handling MUST be pseudonymous: default PostHog anonymous IDs; on email-bearing actions (subscribe, dashboard email+PIN entry) the wrapper MAY call `identify` with `sha256(lowercase(email))` as the distinct ID. Raw email, PIN, or PIN hash MUST NOT be sent as an event property or identify payload.
5. The KPI baseline MUST be documented in `docs/analytics-baseline.md`: definitions for activation (first `exam_graded` per distinct ID), weekly active learners, subscribe conversion, and the exact insight/funnel definitions to recreate in PostHog. The doc MUST state the pre-migration capture window requirement (at least 14 days of baseline before task-DATA-002 cutover) so the migration has a comparison window.
6. A `PostResultCapture` component MUST render on the result page for users with no captured email, offering readiness updates via the existing `/api/subscribe` endpoint with `source: "post_result"`. It MUST be dismissible, MUST persist dismissal locally so it does not nag, and MUST fire `subscribe_submitted` on success.
7. Analytics MUST NOT block or delay first paint: the PostHog script loads lazily after consent and after hydration; the wrapper's public API is synchronous-safe before load (queues or drops per configuration, and the choice MUST be documented in the wrapper).
8. Server-side capture MAY be added for `exam_graded` from `src/app/api/exam/grade/route.ts` using the same hashed distinct ID chain; if added, it MUST be behind the same env gating and MUST NOT introduce a second event-name source of truth (imports the same event map).
9. This task MUST NOT remove or break the existing OTel instrumentation (`instrumentation.ts`, `@vercel/otel`); PostHog is product analytics, OTel stays for ops telemetry.
10. Event volume MUST be bounded: `question_answered` MUST be sampled or batched client-side (configurable, default sample documented in the wrapper) so a 100-question sitting does not emit 100 raw network calls.

## §2 - Why this design

**Why one wrapper module (§1 #1, #3)?** The doc's Phase 4/5 growth work will multiply event call sites. A typed event map makes the taxonomy a compile-time contract - renames and property drift become type errors, and the migration task can diff "events before" vs "events after" mechanically. It also makes the consent gate and kill-switch a single choke point.

**Why hard consent coupling (§1 #2)?** LEGAL-002 establishes default-deny. Loading PostHog pre-consent (even cookieless) would contradict the published privacy policy and re-open the GDPR/PDP exposure the P0 wave exists to close. The runtime subscribe/deactivate path exists because consent is revocable, not a one-shot.

**Why hashed identity (§1 #4)?** The site's identity primitive is email+PIN, deliberately lightweight. Sending raw email to a third-party analytics store would expand the privacy-policy disclosure surface and the PDP/GDPR blast radius for near-zero analytical gain; a stable hash preserves funnel joins without shipping PII.

**Why a written baseline doc (§1 #5)?** The doc makes Phase 0 analytics the regression detector for the Phase 1 migration. Dashboards clicked together in a UI are not reviewable or reproducible; the definitions must live in-repo so DATA-002's exit gate ("rankings retained, migration verified") has a concrete comparison artifact.

**Why sample question_answered (§1 #10)?** PostHog bills and rate-limits on event volume; a viral spike times 100 events per sitting is an unbounded cost curve - the same cost discipline the doc applies to AI endpoints applies to telemetry.

## §3 - Contract

```typescript
// src/lib/analytics.ts
export type AnalyticsEvent =
  | { name: 'exam_started'; props: { mode: 'exam' | 'practice'; question_count: number } }
  | { name: 'exam_submitted'; props: { duration_s: number; answered: number } }
  | { name: 'exam_graded'; props: { score_pct: number; passed: boolean } }
  | { name: 'practice_started'; props: { domain: string | null } }
  | { name: 'question_answered'; props: { domain: string; correct: boolean } } // sampled per §1 #10
  | { name: 'flashcards_started'; props: { deck: string } }
  | { name: 'result_viewed'; props: { passed: boolean } }
  | { name: 'subscribe_submitted'; props: { source: 'post_result' | 'footer' | 'dashboard' } }
  | { name: 'donate_clicked'; props: { placement: string } };

export function track<E extends AnalyticsEvent>(name: E['name'], props: E['props']): void;
export function identifyByEmail(email: string): void; // hashes internally; never stores raw
export function analyticsActive(): boolean; // consent granted + key present + loaded
// init is internal: module subscribes to onConsentChange(consent.ts) at import in the provider
```

```text
Env: NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST (default https://us.i.posthog.com)
Layout: <AnalyticsProvider> client component mounts the subscription; renders nothing.
PostResultCapture: shown when localStorage 'csk_capture_dismissed' absent AND no known email;
posts { email, source: 'post_result' } to /api/subscribe.
docs/analytics-baseline.md: KPI definitions + funnel recipes + 14-day pre-cutover window rule.
```

## §4 - Acceptance criteria

1. **No consent, no PostHog** - With consent absent or rejected, no request to the PostHog host is made across a full exam flow; `analyticsActive()` is false (traces_to: §1 #2).
2. **Consent activates at runtime** - Granting consent mid-session activates capture without reload; revoking stops requests and clears PostHog storage keys (traces_to: §1 #2).
3. **Single entry point** - `posthog-js` is imported only in `src/lib/analytics.ts`; a unit test greps the source tree to prove it (traces_to: §1 #1).
4. **No-op safety** - With `NEXT_PUBLIC_POSTHOG_KEY` unset, `track()` and `identifyByEmail()` are callable without error and produce no network (traces_to: §1 #1).
5. **Typed taxonomy enforced** - `track('exam_finished', ...)` (unknown name) fails type-check; the event map covers the nine §1 #3 events; `track.ts` delegates compile against it (traces_to: §1 #3).
6. **No raw PII outbound** - Unit test intercepts the capture transport and asserts payloads for identify/subscribe flows contain a 64-hex distinct ID and no `@`-containing string (traces_to: §1 #4).
7. **Baseline doc complete** - `docs/analytics-baseline.md` defines activation, WAL, subscribe conversion, funnel recipes, and the 14-day pre-cutover window rule that DATA-002 references (traces_to: §1 #5).
8. **Post-result capture works and does not nag** - On result page without known email the prompt renders; successful submit hits `/api/subscribe` with `source: "post_result"` and fires `subscribe_submitted`; dismissal persists across reloads (traces_to: §1 #6).
9. **No render blocking** - PostHog script requested only after hydration + consent; Lighthouse/CWV smoke in e2e shows no new blocking request on first paint (traces_to: §1 #7).
10. **OTel untouched** - `instrumentation.ts` diff-clean; existing OTel exporters still initialize in a smoke run (traces_to: §1 #9).
11. **Volume bounded** - A 100-question simulated sitting emits at most the documented sampled/batched count for `question_answered`, not 100 raw sends (traces_to: §1 #10).
12. **Server capture consistent (if enabled)** - When the grade-route capture flag is on, the emitted event name comes from the shared map and carries the hashed distinct ID (traces_to: §1 #8).

## §5 - Verification

```typescript
// tests/unit/analytics.test.ts (vitest)
test('no init before consent; onConsentChange(true) initializes'); // AC 1, 2
test('revocation stops capture and clears ph_* storage'); // AC 2
test('unset key -> track/identify are safe no-ops'); // AC 4
test('grep: posthog-js imported only from src/lib/analytics.ts'); // AC 3
test('identifyByEmail sends sha256 hex, never raw email'); // AC 6
test('question_answered sampling: 100 calls -> <= documented budget'); // AC 11
test('event map covers the nine canonical events (type-level + runtime list)'); // AC 5
test('grade-route capture imports shared event map (flag on)'); // AC 12
```

```typescript
// tests/e2e/analytics-consent.spec.ts (playwright)
test('full exam flow with consent rejected: zero requests to posthog host'); // AC 1 (network intercept)
test('accept consent -> events flow; first paint has no posthog request'); // AC 2, 9
test('post-result capture: renders, submits to /api/subscribe, dismiss persists'); // AC 8
test('baseline doc exists with required sections'); // AC 7 (fs assertion)
test('otel instrumentation still registers (log probe)'); // AC 10
```

## §6 - Implementation skeleton

(API contract above is the skeleton.) Order: analytics.ts (map + gate + transport) -> AnalyticsProvider in layout -> migrate track.ts call sites to delegates -> PostResultCapture on result page -> optional grade-route server capture behind flag -> baseline doc -> tests. The consent subscription is the load-bearing piece: import consent.ts, check `getConsent().analytics`, subscribe for changes, lazy-import posthog-js on first grant.

## §7 - Dependencies

- Upstream: task-LEGAL-002 (consent module is the activation gate - hard dependency, added during authoring and recorded as a plan amendment).
- Downstream: task-DATA-002 requires the 14-day baseline window and the KPI doc for its regression exit gate; task-PAY-001/002 reuse the taxonomy for conversion events (extend the map, do not fork it).
- External: PostHog cloud project + key (operator provisions; env var only, no code coupling to region).

## §8 - Example payloads

```json
// captured event (transport-level), consent granted
{
  "event": "exam_graded",
  "distinct_id": "3f1a...64hex",
  "properties": { "score_pct": 78, "passed": true, "$lib": "posthog-js" }
}
```

```markdown
<!-- docs/analytics-baseline.md excerpt -->

## Activation

First `exam_graded` per distinct_id. Funnel: exam_started -> exam_submitted -> exam_graded.

## Pre-cutover rule

task-DATA-002 MUST NOT cut over with fewer than 14 days of baseline capture on these funnels.
```

## §9 - Open questions

Deferred:

- PostHog host region (US vs EU cloud) is an operator env choice at deploy time; the privacy page sub-processor row (LEGAL-002) records whichever is chosen. (operator decision)
- Whether `question_answered` sampling is 1-in-5 or batched-per-sitting is an implementation-time measurement call; the budget number lands in the wrapper doc comment and AC 11 asserts against the documented value, whichever is chosen.
- Server-side capture (§1 #8) is MAY; enable only if client loss proves material during the baseline window.

## §10 - Failure modes inventory

| Failure                                              | Detection                                                        | Outcome                  | Recovery                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------- | ------------------------ | ----------------------------------------------------- |
| PostHog loads pre-consent (regression)               | e2e network intercept with consent rejected                      | Privacy-policy violation | Consent gate is the only init path; test blocks merge |
| Consent revoked but capture continues                | Unit revocation test; e2e storage-clear check                    | GDPR defect              | Deactivate + clear in onConsentChange handler         |
| Raw email leaks into properties                      | Unit transport-payload scan for '@'                              | PII in third-party store | Hash-only identify API; no raw-email parameter exists |
| Event taxonomy forks (track.ts vs new calls)         | Type-level map + grep test AC 3                                  | Split-brain analytics    | Single map, delegates only                            |
| Ad-blockers drop client events, baseline undercounts | Documented in baseline doc; optional server capture §1 #8        | Baseline skew            | Compare subscribe API counts vs events during window  |
| Viral spike blows event quota/bill                   | Sampling AC 11; PostHog project quota alarm (operator)           | Cost spike               | Tighten sample rate at runtime config                 |
| Dev/test traffic pollutes production data            | No-op in dev/test (§1 #1); unit test                             | Dirty baseline           | Env gate                                              |
| Capture prompt nags dismissers                       | Dismissal persistence AC 8                                       | Trust erosion            | localStorage flag                                     |
| Subscribe endpoint abused via new prompt             | Existing /api/subscribe validation; SEC-001 rate limits cover it | Spam rows                | related SEC-001                                       |
| Migration ships before baseline window               | DATA-002 exit gate cites the 14-day rule (AC 7)                  | Undetectable regression  | Rule lives in baseline doc + DATA-002 spec            |
| PostHog outage breaks UX                             | Wrapper never throws; lazy load; no-op on failure                | None user-visible        | Fire-and-forget transport                             |
| Duplicate identify chains after hash change          | Hash function pinned (sha256 lowercase email) in contract + test | Funnel identity split    | Never change hash without migration note              |

## §11 - Implementation notes

- Keep `track.ts` as the compatibility layer rather than editing every call site: the store (`examStore.ts`) and components already call it, and DATA-001's rebuild will re-home those calls anyway.
- Clearing PostHog storage on revocation: remove `ph_*` localStorage keys and the project cookie; PostHog's `opt_out_capturing()` plus storage clear is the accepted pattern.
- The 14-day window is a floor from the doc's intent (baseline to detect regression), not a statistically derived number; DATA-002 may extend it if traffic is noisy, never shorten it.
- Do not add PostHog session recording in this task: it multiplies PII surface and consent complexity; if ever wanted, it is its own task with its own privacy-page row.

_End of task-OBS-001._
