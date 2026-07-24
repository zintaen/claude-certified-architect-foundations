---
id: task-LEARN-001
title: 'Exam-readiness score and premium performance analytics'
module: LEARN
class: product
priority: MUST
status: done
verify: T
phase: P3
milestone: 'P3 · slice 3'
slice: 3
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-OBS-001]
depends_on: [task-DATA-001, task-PAY-001]
blocks: [task-LEARN-002, task-LEARN-004]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - "§D premium features: exam-readiness prediction score, performance analytics; trust signals: 'an exam-readiness score with a credible methodology'"
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/readiness.ts
  - src/app/api/readiness/route.ts
  - src/components/ReadinessPanel.tsx
  - docs/methodology.md
  - tests/unit/readiness.test.ts
  - tests/integration/readiness.test.ts
modified_files:
  - src/app/dashboard/page.tsx
  - src/app/about/page.tsx
  - src/lib/analytics.ts
effort_hours: 16
subtasks:
  - 'Mastery model over item_responses + readiness composition (6h)'
  - 'Readiness API + dashboard analytics panel (5h)'
  - 'Public methodology page + humble-claims copy rules (2h)'
  - 'Unit fixtures + integration tests (3h)'
risk_if_skipped: "The readiness score is both the doc's named trust signal ('a credible methodology') and the premium anchor that LEARN-002 drilling and LEARN-004 study plans personalize against. Without it, 'premium analytics' is a bar chart, the drilling task has no weak-area model to consume, and the conversion story ('know when you are ready') stays unbuilt."
---

# task-LEARN-001 - Exam-readiness score and premium performance analytics

## §1 - Description

1. `src/lib/readiness.ts` MUST compute, server-side, a per-user per-exam mastery model from `item_responses` joined to items/domains (task-DATA-001): per-domain accuracy, coverage (share of the domain's scored objectives attempted), and recency weighting (recent responses weigh more than stale ones). The model MUST exclude canary and beta items and custom-mode sittings from mastery inputs.
2. The readiness score MUST be a deterministic composition of the mastery model - domain scores combined by official blueprint weights, discounted by coverage - normalized 0-100, with a band label (`building` | `approaching` | `ready`). Band boundaries are config with defaults recorded and justified in `docs/methodology.md`; they are presented as guidance bands, never as pass probability.
3. Humble-claims rule: no UI, metadata, or copy may present the score as a prediction or guarantee of passing the real exam ("you will pass" is prohibited copy; "your practice performance suggests" is the register). A static copy-lint list MUST enforce the prohibited phrasings in readiness UI strings.
4. `docs/methodology.md` MUST document the full computation (inputs, exclusions, weighting, coverage discount, band rationale) and a public-facing summary of it MUST be linked from the readiness UI (the trust signal the doc names). The public page MUST NOT expose per-item statistics.
5. Readiness and the analytics panel are premium: `resolveAccess` (task-PAY-001) gates the API and panel; free users see the locked-state teaser (their existing basic score history stays free and unchanged). With `ENTITLEMENTS_ENFORCED=off`, readiness renders for all users (dark-launch consistency).
6. `GET /api/readiness?exam=<code>` MUST return the score, band, per-domain mastery breakdown, coverage, and staleness metadata (`computed_from` response count + window), rate-limited `read` class, server-shaped (no raw response rows).
7. `ReadinessPanel.tsx` on the dashboard MUST render score, band, per-domain bars with weakest-first ordering, and coverage warnings ("too few attempts in X to assess") when a domain's inputs are below the minimum-sample floor from config.
8. Minimum-sample honesty: below a config floor of responses (overall or per domain), the UI MUST show "not enough data" states instead of a score - a score computed from 5 answers is noise presented as insight.
9. The mastery model's output shape is a stable contract consumed by task-LEARN-002 (drilling) and task-LEARN-004 (study plans): `weakDomains(userId, examCode)` MUST be exported with a typed, versioned result.
10. Analytics events `readiness_viewed` and `readiness_locked_viewed` MUST extend the OBS-001 typed map with exam_code and band (no score value in event properties - coarse band only, minimizing profile data in the analytics store).
11. This task MUST NOT add IRT/probabilistic pass prediction (deferred with CONTENT-002's IRT trigger), MUST NOT run any LLM call, and MUST NOT change grading or assembly paths.

## §2 - Why this design

**Why accuracy + coverage + recency instead of IRT ability estimates (§1 #1, #11)?** IRT-grade ability estimation needs calibrated item parameters, which CONTENT-002 gates behind a data-volume trigger. Classical mastery (weighted accuracy with coverage discounts and recency) is defensible with the data that exists on day one, is explainable on a public methodology page - the trust property the doc names - and upgrades additively when IRT lands.

**Why the humble-claims rule (§1 #3)?** A prep site that implies pass guarantees invites both consumer-protection exposure and the trust collapse of the first "I was 'ready' and failed" post. The doc's positioning is credibility against dump-site snake oil; the copy register is part of the product.

**Why band-only analytics events (§1 #10)?** Sending granular scores to the analytics store builds a shadow profile the privacy policy would have to disclose; bands answer every funnel question ("do ready users convert/renew differently") at minimal disclosure cost.

**Why a stable weakDomains contract (§1 #9)?** Two downstream tasks personalize against this model. Exporting a versioned function now means drilling and study plans compose instead of re-deriving mastery three ways that drift.

## §3 - Contract

```typescript
// src/lib/readiness.ts (server-only)
export interface DomainMastery {
  domainKey: string;
  accuracy: number;
  coverage: number;
  recencyWeightedAccuracy: number;
  sampleSize: number;
  sufficient: boolean;
}
export interface Readiness {
  examCode: string;
  score: number | null; // null when below sample floor
  band: 'building' | 'approaching' | 'ready' | null;
  domains: DomainMastery[];
  computedFrom: { responses: number; windowDays: number };
  modelVersion: 1;
}
export function computeReadiness(userId: string, examCode: string): Promise<Readiness>;
export function weakDomains(
  userId: string,
  examCode: string
): Promise<{ domainKey: string; deficit: number }[]>; // consumed by LEARN-002/LEARN-004
export const READINESS_CONFIG: {
  minResponsesOverall: number;
  minResponsesPerDomain: number;
  recencyHalfLifeDays: number;
  bands: { approaching: number; ready: number };
}; // defaults justified in methodology doc
```

```text
GET /api/readiness?exam=ccaf  -> Readiness (premium-gated via resolveAccess; read rate class)
Dashboard: <ReadinessPanel/> premium | locked teaser free (enforcement on)
docs/methodology.md -> public summary section linked from panel ("How this score works")
Prohibited-copy lint list: ["you will pass","guaranteed","pass guarantee","predicts your result"]
```

## §4 - Acceptance criteria

1. **Mastery inputs clean** - Fixtures prove canary, beta, and custom-sitting responses are excluded; recency weighting favors newer responses (hand-checked fixture) (traces_to: §1 #1).
2. **Deterministic composition** - Same response fixture always yields the same score; blueprint weights and coverage discount applied per methodology doc (hand-checked value) (traces_to: §1 #2).
3. **Sample floors honored** - Below overall floor: score null + "not enough data" UI; below per-domain floor: domain marked insufficient with coverage warning (traces_to: §1 #7, #8).
4. **Humble copy enforced** - Prohibited phrases in readiness UI strings fail the lint test; shipped copy passes (traces_to: §1 #3).
5. **Methodology published** - methodology doc covers inputs/exclusions/weighting/bands with rationale; panel links the public summary; no per-item stats exposed on the public page (traces_to: §1 #4).
6. **Premium gating correct** - Enforcement on: free gets locked teaser, premium gets panel and API; enforcement off: renders for all; API refuses free-tier calls with the upgrade payload (traces_to: §1 #5, #6).
7. **API shape** - Response carries score/band/domains/coverage/staleness, no raw response rows; rate-limited read class (traces_to: §1 #6).
8. **weakDomains contract** - Returns deficit-ordered domains for a fixture user; typed, versioned; consumed in a compile-time check by a stub consumer test (traces_to: §1 #9).
9. **Events band-only** - readiness events carry exam_code + band, never numeric score (payload scan) (traces_to: §1 #10).
10. **Scope fences** - No LLM SDK usage, no grading/assembly diffs (grep + diff review) (traces_to: §1 #11).

## §5 - Verification

```typescript
// tests/unit/readiness.test.ts (vitest)
test('exclusions: canary/beta/custom responses never enter mastery'); // AC 1
test('recency half-life weighting hand-checked fixture'); // AC 1
test('composition determinism + hand-checked score value'); // AC 2
test('sample floors: overall null score, per-domain insufficient flag'); // AC 3
test('prohibited-copy lint over readiness strings'); // AC 4
test('weakDomains deficit ordering + versioned shape'); // AC 8

// tests/integration/readiness.test.ts (local supabase)
test('api: premium 200 with shape, free 403 upgrade payload (enforcement on)'); // AC 6, 7
test('enforcement off: renders for all'); // AC 6
test('events carry band only (transport scan)'); // AC 9
test('methodology doc sections + panel link + no per-item stats'); // AC 5
test('grep: no model SDK imports; grading/assembly untouched'); // AC 10
```

## §6 - Implementation skeleton

readiness.ts (queries via the DATA-001 layer, pure composition functions separated for unit tests) -> READINESS_CONFIG with methodology doc written alongside -> API route with PAY-001 gating -> ReadinessPanel + locked teaser -> about-page methodology summary link -> analytics map extension -> tests. Keep composition pure (rows in, Readiness out) so fixtures need no DB.

## §7 - Dependencies

- Upstream: task-DATA-001 (item_responses, domains, sittings) and task-PAY-001 (gating) - hard.
- Downstream: task-LEARN-002 and task-LEARN-004 consume `weakDomains` (blocks edges); IRT upgrade path arrives with CONTENT-002's trigger.
- Related: task-OBS-001 event map.

## §8 - Example payloads

```json
// GET /api/readiness?exam=ccaf (premium)
{
  "examCode": "ccaf",
  "score": 68,
  "band": "approaching",
  "modelVersion": 1,
  "computedFrom": { "responses": 412, "windowDays": 60 },
  "domains": [
    {
      "domainKey": "agent-architecture",
      "accuracy": 0.58,
      "coverage": 0.9,
      "recencyWeightedAccuracy": 0.61,
      "sampleSize": 120,
      "sufficient": true
    },
    {
      "domainKey": "safety",
      "accuracy": 0.81,
      "coverage": 0.4,
      "recencyWeightedAccuracy": 0.8,
      "sampleSize": 18,
      "sufficient": false
    }
  ]
}
```

## §9 - Open questions

Deferred:

- Config defaults (sample floors, half-life days, band boundaries) are set at implementation with rationale in the methodology doc - guidance bands, not fabricated psychometrics; revisited when IRT lands.
- Whether free users see their own band (score-less) as a conversion teaser is a PAY-era experiment, not decided here; default is fully locked panel with teaser copy.

## §10 - Failure modes inventory

| Failure                                        | Detection                               | Outcome                              | Recovery                              |
| ---------------------------------------------- | --------------------------------------- | ------------------------------------ | ------------------------------------- |
| Score computed from a handful of answers       | Sample floors AC 3                      | Noise sold as insight                | Null score + honest empty state       |
| Canary/custom responses skew mastery           | Exclusion fixtures AC 1                 | Corrupted weak-area model downstream | Input filter is contract              |
| Copy drifts into pass promises                 | Lint AC 4                               | Legal/trust exposure                 | Static prohibited list                |
| Methodology page overshares item stats         | AC 5 public-page check                  | Scraper/vendor fishing surface       | Aggregate-only rule                   |
| Free tier hits readiness API directly          | AC 6 gating test                        | Premium leak                         | resolveAccess in route                |
| Score flapping run-to-run                      | Determinism AC 2                        | User distrust                        | Pure composition, pinned config       |
| Downstream tasks re-derive mastery differently | weakDomains contract AC 8               | Three divergent models               | Single exported model                 |
| Numeric scores accumulate in analytics store   | AC 9 band-only scan                     | Undisclosed profiling                | Coarse-band rule                      |
| Stale responses dominate after a layoff        | Recency weighting AC 1                  | Misleading confidence                | Half-life documented                  |
| Domain with zero attempts shows as weak        | Coverage/sufficient flags AC 3          | Wrong drilling signal                | insufficient state distinct from weak |
| Enforcement-off regression hides panel         | AC 6 off-mode test                      | Dark-launch inconsistency            | Both modes tested                     |
| IRT retrofit breaks consumers                  | modelVersion field + versioned contract | Silent semantic change               | Version bump discipline               |

## §11 - Implementation notes

- Compute on read with per-request caching first; materialize a readiness snapshot table only if dashboard latency demands it (scaling trigger, not day-one complexity).
- The coverage discount is what stops "answered 10 easy recall questions, scored 90" from reading as ready - make it visible in the panel (coverage ring per domain) so the honesty is legible.
- Keep `weakDomains`' deficit definition (weight x (target - mastery), floored) in one function with the methodology doc as its mirror - LEARN-002/004 cite the doc, import the function.

_End of task-LEARN-001._
