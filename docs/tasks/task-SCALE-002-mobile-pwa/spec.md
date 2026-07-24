---
id: task-SCALE-002
title: 'Mobile PWA: installability and offline practice (web-first doctrine)'
module: SCALE
class: product
priority: SHOULD
status: done
verify: T
phase: P5
milestone: 'P5 · slice 1'
slice: 1
owner: Stephen Cheng
created: 2026-07-17
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-PAY-002, task-LEARN-003]
depends_on: [task-DATA-002]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - 'Decision Log: Mobile - web-first, native later; avoids 15-30% app-store tax on conversion; §D: lead web-first, add a mobile web PWA; keep paid conversion on web'
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - public/manifest.webmanifest
  - src/sw.ts
  - src/lib/offline.ts
  - tests/e2e/pwa.spec.ts
modified_files:
  - src/app/layout.tsx
  - next.config.ts
  - src/lib/analytics.ts
effort_hours: 16
subtasks:
  - 'Manifest + service worker with scoped caching strategy (6h)'
  - 'Offline practice: free-subset + in-flight sitting resilience (6h)'
  - 'Install affordance + CWV budget + tests (4h)'
risk_if_skipped: "Exam prep is heavily mobile (the doc's own observation) and commutes are study time. Without installability and offline resilience, mobile learners lose sessions to connectivity gaps and the product has no home-screen presence - while the doc's chosen strategy (PWA now, no store tax) is exactly the cheap version of mobile that preserves web checkout."
---

# task-SCALE-002 - Mobile PWA: installability and offline practice

## §1 - Description

1. The app MUST become installable: a web manifest (name, icons, display standalone, theme) plus a service worker registered site-wide, passing installability criteria in the e2e suite. Install promotion MUST be a quiet affordance (footer/dashboard entry using the deferred install prompt where available), never an interstitial.
2. Service-worker caching MUST be explicitly scoped by strategy: static assets cache-first with versioned cleanup on deploy; page shells stale-while-revalidate; API responses network-first. Auth-scoped and premium payloads (grades, explanations, entitlements, tutor) MUST NOT be cached by the service worker - the cache MUST NOT become a premium-content leak or a stale-grade source.
3. Offline practice MUST work for the free subset: `src/lib/offline.ts` prefetches the current exam's free practice items (shaped payloads, no answer keys - grading still requires connectivity and the UI says so honestly) for identified practice use offline; answers queue locally and submit on reconnect through the existing answer/save endpoints, idempotently (client-generated response ids dedupe on the server path).
4. In-flight sitting resilience MUST improve: transient offline during a practice or exam sitting keeps the sitting usable from local state (the existing resume-checkpoint pattern extended), with reconnect sync; a full-offline exam-mode start is NOT offered (server-assembled sittings are the integrity boundary - DATA-001's design).
5. The offline boundary MUST be honest in UI: offline banner, what works offline (practice on cached items, review of already-loaded content) and what does not (grading, tutor, checkout, leaderboard), no fake availability.
6. Checkout and entitlement flows MUST remain online-only web surfaces (the doc's no-store-tax strategy): the PWA adds no store billing, no native wrappers, and the service worker MUST bypass/never intercept payment and webhook routes.
7. Performance MUST NOT regress: CWV budget asserted in e2e (the service worker must not delay first paint; precache is deferred until idle), and the PWA layer MUST be feature-flag removable (`PWA_ENABLED`) for rollback.
8. Analytics: `pwa_installed` (appinstalled event), `offline_practice_used`, `offline_sync_completed` extend the OBS-001 map; the service worker MUST NOT queue analytics offline for consent-rejected users (consent state respected in the sync layer).
9. This task MUST NOT build native apps or store artifacts (explicit doc decision; revisit trigger recorded: if PWA usage proves mobile demand and store economics change, a native task is authored then), and MUST NOT cache any item beyond the free subset.

## §2 - Why this design

**Why PWA and not native (§1 #9)?** The doc's decision log is explicit: web-first avoids the 15-30% store tax and keeps conversion on web where the MoR handles tax. The PWA delivers the two things mobile learners actually lack (home-screen entry, connectivity resilience) at a fraction of native cost.

**Why the strict cache scoping (§1 #2)?** A naive cache-everything worker is a security regression: premium explanations cached to disk outlive entitlements, stale grades mislead, and cached auth payloads leak across sessions on shared devices. Scoping by strategy with an explicit never-cache list keeps the PWA from quietly repealing PAY-001's line.

**Why grading stays online (§1 #3, #4)?** Answer keys never ship to the client (the platform's core security property) - offline grading would require shipping them. Queue-and-sync preserves the study experience without touching the integrity boundary.

**Why a kill flag (§1 #7)?** Service workers are the classic hard-to-undo deploy (stale workers pinning old code). A flag that unregisters cleanly is the rollback story reviewers should demand.

## §3 - Contract

```typescript
// src/lib/offline.ts
export function prefetchFreePractice(examCode: string): Promise<void>; // idle-time, free subset only
export function queueAnswer(a: PendingAnswer): void; // client id for dedupe
export function syncPending(): Promise<{ synced: number; failed: number }>; // on reconnect; consent-aware for events
export function offlineCapabilities(): {
  practice: boolean;
  grading: false;
  tutor: false;
  checkout: false;
};

// src/sw.ts strategy map (enforced by tests):
//  static assets: cache-first (versioned)  | shells: SWR | API: network-first
//  never-cache: /api/exam/grade, /api/entitlements, /api/tutor, /api/webhooks/*, checkout routes, explanations payloads
// PWA_ENABLED=off -> worker unregisters + caches purge on next visit
```

## §4 - Acceptance criteria

1. **Installable, quietly** - Manifest + worker pass installability checks; install affordance present, no interstitial prompt (traces_to: §1 #1).
2. **Cache scoping enforced** - Strategy map tests: static cache-first with cleanup, shells SWR, API network-first; never-cache list verified by requesting each and asserting cache absence (traces_to: §1 #2).
3. **Offline practice works, honestly** - With network cut: cached free-subset practice usable, answers queue, banner shows capabilities honestly (no grading claim); on reconnect, queued answers submit exactly once (dedupe fixture) (traces_to: §1 #3, #5).
4. **Sitting resilience** - Transient offline mid-sitting preserves state and syncs on reconnect; offline exam-mode start is refused with honest copy (traces_to: §1 #4).
5. **Payment paths untouched** - Worker never intercepts checkout/webhook routes (request-path assertions); no store billing artifacts exist (traces_to: §1 #6).
6. **CWV + rollback** - First-paint budget holds with worker active (e2e timing); `PWA_ENABLED=off` unregisters and purges (traces_to: §1 #7).
7. **Events + consent** - PWA events fire; with consent rejected, no analytics queue offline (traces_to: §1 #8).
8. **Fences** - No native/store artifacts; cached items never exceed the free subset (cache-content scan) (traces_to: §1 #9).

## §5 - Verification

```typescript
// tests/e2e/pwa.spec.ts (playwright with offline emulation)
test('installability + quiet affordance'); // AC 1
test('strategy map + never-cache list verification'); // AC 2
test('offline practice: cached free subset, queue, honest banner'); // AC 3
test('reconnect sync: exactly-once submission (dedupe fixture)'); // AC 3
test('mid-sitting offline resilience; offline exam start refused'); // AC 4
test('checkout/webhook routes bypass the worker'); // AC 5
test('first-paint budget with worker; kill flag unregisters + purges'); // AC 6
test('events + consent-rejected offline queue absence'); // AC 7
test('cache-content scan: free subset only; no store artifacts'); // AC 8
```

## §6 - Implementation skeleton

Manifest + icons -> service worker with the strategy map and never-cache list -> offline.ts (idle prefetch, queue, sync with client-id dedupe on the existing answer endpoint) -> honest offline UI states -> kill flag -> analytics -> e2e with offline emulation. The dedupe id lands as a column/constraint on the existing answer-save path (small DATA-layer touch, documented in the diff).

## §7 - Dependencies

- Upstream: task-DATA-002 (stable serving surfaces and the resume-checkpoint pattern) - hard. PAY-001's free subset defines the cache boundary; LEARN-003's review surface benefits from shell caching automatically.
- Downstream: the native-app revisit trigger (§1 #9) is recorded for a future decision; no task depends on this one.
- External: none.

## §8 - Example payloads

```json
// queued answer (localStorage/IDB)
{
  "clientId": "a7f3-...",
  "sittingId": "6a4f...",
  "itemId": "b1c2...",
  "selectedKey": "C",
  "elapsedMs": 38000,
  "queuedAt": "2026-11-10T08:12:00+07:00"
}
```

## §9 - Open questions

Deferred:

- Prefetch size budget (how many free items per exam) is set at implementation against storage quotas and recorded in offline.ts's doc comment.
- Push notifications (re-engagement) are deliberately out - they re-open consent surface and belong with a future engagement decision, not the PWA baseline.

## §10 - Failure modes inventory

| Failure                                   | Detection                                           | Outcome                            | Recovery                           |
| ----------------------------------------- | --------------------------------------------------- | ---------------------------------- | ---------------------------------- |
| Premium payloads cached to disk           | Never-cache tests AC 2 + cache scan AC 8            | Entitlement leak on shared devices | Explicit never-cache list          |
| Stale worker pins old app                 | Versioned caches + kill flag AC 6                   | Undebuggable client states         | Cleanup on deploy; flag unregister |
| Queued answers double-submit              | Dedupe fixture AC 3                                 | Corrupted response stream          | Client-id idempotency              |
| Offline grading implied                   | Honest-banner AC 3 + refusal AC 4                   | Answer keys would have to ship     | Integrity boundary held            |
| Worker delays first paint                 | CWV budget AC 6                                     | Core-web-vitals regression         | Idle-deferred precache             |
| Checkout intercepted by worker            | AC 5 route assertions                               | Payment failures                   | Bypass list                        |
| Analytics queued despite rejected consent | AC 7                                                | Consent violation via sync layer   | Consent-aware sync                 |
| Cache exceeds free subset over time       | Cache-content scan AC 8                             | Bank exposure at rest              | Prefetch reads PAY-001 boundary    |
| Install prompt nags                       | Quiet-affordance AC 1                               | UX hostility                       | Deferred-prompt pattern            |
| Storage quota exhaustion                  | Prefetch budget (§9) + quota handling in offline.ts | Broken offline mode                | Bounded prefetch, LRU eviction     |
| iOS PWA quirks break flows                | e2e matrix includes webkit                          | Platform-specific breakage         | Webkit lane in CI                  |
| Native-app scope creep                    | Fence AC 8                                          | Store-tax strategy violated        | Revisit trigger documented         |

## §11 - Implementation notes

- Keep the service worker hand-rolled and small (the strategy map IS the spec); a generic PWA plugin's defaults are exactly the cache-everything behaviour §1 #2 forbids.
- IndexedDB over localStorage for the queue and prefetched items (size + structured data); wrap in offline.ts so the storage choice is swappable.
- The offline banner copy doubles as the capability contract - source both from `offlineCapabilities()` so UI and behaviour cannot disagree.

_End of task-SCALE-002._
