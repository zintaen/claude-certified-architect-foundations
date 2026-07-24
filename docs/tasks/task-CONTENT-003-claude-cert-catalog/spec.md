---
id: task-CONTENT-003
title: 'Ship all four Anthropic Claude certification exams on the multi-exam platform'
module: CONTENT
class: product
priority: MUST
status: done
verify: T
phase: P2
milestone: 'P2 · slice 2'
slice: 2
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-SEO-001, task-LEGAL-001, task-OBS-001]
depends_on: [task-CONTENT-002]
blocks: [task-GROWTH-001, task-SCALE-004]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§D: four Claude exams by July 2026 - CCAO-F ($99), CCDV-F ($125), CCAR-F ($125), CCAR-P ($175), Pearson VUE OnVUE, 12-month validity; first-mover land grab'
  - 'Caveat: verify Anthropic exam details against official exam guides before building content'
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - docs/blueprints/ccao-f-blueprint.md
  - docs/blueprints/ccdv-f-blueprint.md
  - docs/blueprints/ccar-p-blueprint.md
  - tools/item-pipeline/configs/ccao-f.json
  - tools/item-pipeline/configs/ccdv-f.json
  - tools/item-pipeline/configs/ccar-p.json
  - src/app/exams/page.tsx
  - src/app/exams/[code]/page.tsx
  - src/app/exams/[code]/practice/page.tsx
  - src/app/exams/[code]/exam/page.tsx
  - src/app/exams/[code]/sample-questions/page.tsx
  - docs/launch-checklist.md
  - tests/e2e/exams-catalog.spec.ts
modified_files:
  - src/lib/legal.ts
  - src/lib/urlContract.ts
  - src/app/sitemap.ts
  - src/lib/analytics.ts
effort_hours: 24
subtasks:
  - 'Verify official exam facts + author three blueprint snapshots (6h)'
  - 'Pipeline runs + SME review cycles for three exams (8h agent/SME time in-task)'
  - 'Registry-driven /exams UI surfaces (6h)'
  - 'Contract/sitemap/legal/analytics extensions + launch checklist + tests (4h)'
risk_if_skipped: "The doc calls the four-exam Claude program a first-mover land grab with near-zero incumbent content and CyberSkill already ranking. The window is now: three of the four exams opened registration in July 2026. Every week the site covers only CCAF, searchers for the Associate, Developer, and Architect Professional exams land on competitors' pages instead - and the multi-exam platform built in Phases 0-1 stays a single-exam site in practice."
---

# task-CONTENT-003 - Ship all four Claude certification exams

## §1 - Description

1. Blueprint snapshots MUST be authored for the three new exams (`ccao-f`, `ccdv-f`, `ccar-p`) per the task-CONTENT-001 snapshot rules (official public exam-guide outline only, source URL, retrieval date), and the existing CCAF snapshot MUST be re-verified on the same pass. Every exam fact used anywhere in this task (names, codes, domain structure, weights, delivery platform, validity, prices) MUST be verified against Anthropic's official pages at authoring time - the source doc's own caveat says its exam details came from third-party guides; this task treats them as leads, not facts.
2. Where an official fact is unpublished (for example a pass threshold Anthropic does not disclose), the exam config MUST mark it `site_default` with the chosen value and the page copy MUST NOT present it as official. Fabricating official-looking facts is prohibited.
3. The pipeline (task-CONTENT-002) MUST be run per new exam with its own config; every served item flows through the full pipeline (allowlist generation, auto review, similarity gate, SME sign-off). Item counts per exam target the config's totalItems, distributed by the blueprint matrix.
4. Launch-cohort bootstrap: a brand-new exam has zero response history, so nothing can be calibration-promoted, yet sittings need scorable items. For each new exam, the launch cohort of SME-approved items MAY be set to `scored` by an explicit, recorded operator decision (a review row with verdict `approved` and a launch note, plus a launch-checklist entry), with `provenance` noting `calibration: provisional`. Calibration review of the launch cohort MUST be mandatory once the first fielding threshold (CONTENT-002 promotion config) is reached, re-verdicting each provisional item. Items generated after launch enter as `beta` per the normal pipeline rule.
5. The exam catalog UI MUST be registry-driven from the DATA-001 catalog: `/exams` (index of `live` exams), `/exams/[code]` (landing: what the exam is, domain breakdown, official-registration link, independence disclaimer), `/exams/[code]/practice`, `/exams/[code]/exam`, `/exams/[code]/sample-questions`. Pages MUST be templates reading catalog data - adding exam five MUST require zero new page components.
6. CCAF's legacy URLs REMAIN its canonical surface per task-SEO-001 §1 #3: this task MUST NOT create `/exams/ccaf/*` routes; the `/exams` index links CCAF to its legacy paths.
7. Exam runtime surfaces (practice/exam under the new namespace) MUST reuse the existing exam engine components parameterized by exam code and served through DATA-001's assembly - no forked engine per exam.
8. `VENDOR_MARKS.anthropic.marks` MUST be extended with the three new exam names/codes, flowing into disclaimers and the trademark notice automatically (task-LEGAL-001's data-driven design). Every new page carries the disclaimer via the existing site-wide mounting.
9. Official logistics shown on landing pages (price, delivery platform, validity) MUST render from per-exam config with the retrieval date and a "verify current details with Anthropic" line - prices changed once already (CCAF $99 to $125 mid-2026, per the source doc) and will change again.
10. `urlContract.ts` and the sitemap MUST be extended additively with the new routes (the SEO-001 drift test forces both or neither); OG metadata MUST render per exam; the analytics event map (task-OBS-001) MUST gain an `exam_code` property on funnel events so per-exam activation is measurable from day one.
11. `docs/launch-checklist.md` MUST define the per-exam go-live gate: blueprint verified, pipeline run manifest attached, SME sign-off counts, launch-cohort decision recorded, disclaimer render check, contract/sitemap updated, analytics dimension live, exam flipped `draft -> live` in the catalog. Exams go live individually by flipping `exams.status`; nothing couples the three launches.
12. This task MUST NOT implement pricing, paywalls, or entitlement gating (Phase 3 owns monetization); all four exams launch free per the plan's phase order.

## §2 - Why this design

**Why treat the source doc's exam facts as leads (§1 #1, #2)?** The doc itself flags its Anthropic details as drawn from third-party guides and says to verify against official exam guides before building. A prep site whose landing pages misstate official facts torches exactly the trust positioning the plan is built on - and invented "official" pass thresholds would be the worst variant.

**Why an explicit launch-cohort bootstrap (§1 #4)?** CONTENT-002's beta-then-promote rule assumes an exam with existing scored items. A new exam has none - applying the rule literally means an exam that can never launch. The bootstrap makes the unavoidable provisional period visible and governed (operator decision, provenance marker, mandatory first-cohort recalibration) instead of silently pretending launch items were calibrated.

**Why registry-driven templates (§1 #5)?** The doc's expansion path is dozens of exams across vendors. Page-per-exam components would make each launch an engineering task; templates over the catalog make it a content task - which is what the pipeline industrializes. Exam five (an AWS cert, per the plan's rings) should cost a blueprint, a pipeline run, and a row flip.

**Why individual go-live flags (§1 #11)?** Three exams' content will not be ready simultaneously - SME review is human-paced. Coupling the launches would hold ready exams hostage to the slowest; the doc's playbook ("be first and free on every new certification the day its blueprint drops") rewards shipping each the moment it clears the checklist.

## §3 - Contract

```text
Routes (all registry-driven, live exams only):
  /exams                          index; CCAF entry links to legacy '/' surface (§1 #6)
  /exams/[code]                   landing: domains, official logistics (config + retrieval date), disclaimer
  /exams/[code]/practice          practice runtime (existing engine, exam-parameterized)
  /exams/[code]/exam              timed mock runtime
  /exams/[code]/sample-questions  free sample surface (SEO)

Per-exam config (extends DATA-001 exam row + pipeline config):
  official: { price_usd: number; delivery: string; validity_months: number;
              source_url: string; retrieved: string }        // §1 #9
  pass_threshold: { value: number; basis: 'official' | 'site_default' }   // §1 #2

Analytics: exam_code: string added to exam_started/submitted/graded, practice_started,
result_viewed props (typed map extension per OBS-001 rules).
```

## §4 - Acceptance criteria

1. **Blueprints verified** - Three new snapshots + CCAF re-verification exist with official source URLs and retrieval dates; a review-gate line in each snapshot records the verification pass (traces_to: §1 #1).
2. **No fabricated official facts** - Every landing-page logistics value traces to config with `source_url`; any `site_default` value renders with non-official labeling; a unit test walks configs and asserts basis labeling (traces_to: §1 #2, #9).
3. **Pipeline-only content** - Every item served for the three new exams has a run-manifest-resolving provenance record and an approved review row (integration query over the three exams) (traces_to: §1 #3).
4. **Bootstrap governed** - Launch-cohort items carry `calibration: provisional` provenance and a recorded launch decision; a post-threshold calibration run re-verdicts them (fixture test on the mechanism); post-launch items enter as beta (traces_to: §1 #4).
5. **Registry-driven pages** - All five route templates render for a fixture exam added to the catalog with zero component changes (test adds a fake exam and walks its pages) (traces_to: §1 #5).
6. **CCAF namespace rule** - No `/exams/ccaf/*` route resolves; the index links CCAF to legacy URLs (traces_to: §1 #6).
7. **One engine** - The new runtime routes import the same exam-engine components as the legacy CCAF surfaces (import-graph test) (traces_to: §1 #7).
8. **Marks + disclaimers flow** - The three new exam names appear in `VENDOR_MARKS`, the trademark notice, and every new page renders the disclaimer (e2e sweep) (traces_to: §1 #8).
9. **Contract/sitemap/OG/analytics extended** - New routes present in both urlContract and sitemap (drift test green); OG renders per exam; `exam_code` present on funnel events in a recorded practice flow (traces_to: §1 #10).
10. **Launch checklist live** - `docs/launch-checklist.md` contains the §1 #11 gate list; each exam's go-live flips only its own status row (test flips one fixture exam live and asserts the others unaffected) (traces_to: §1 #11).
11. **No monetization creep** - Diff contains no price gating, entitlement checks, or checkout surfaces (traces_to: §1 #12).

## §5 - Verification

```typescript
// tests/e2e/exams-catalog.spec.ts (playwright + colocated unit assertions)
test('exams index lists live exams; ccaf links to legacy surface'); // AC 6
test('fixture exam added to catalog renders all five templates unchanged'); // AC 5
test('landing logistics render config values + retrieval date + verify line; site_default labeled'); // AC 2
test('disclaimer present on every new route; marks in trademark notice'); // AC 8
test('urlContract/sitemap drift test green with new routes; OG per exam'); // AC 9
test('practice flow emits exam_code on funnel events'); // AC 9
test('go-live flag flips one exam independently'); // AC 10
test('import-graph: runtime routes reuse the shared engine'); // AC 7
test('integration: served items for new exams have provenance + approved review'); // AC 3
test('bootstrap fixture: provisional cohort re-verdicted at threshold; post-launch items beta'); // AC 4
test('blueprint files carry source URL + retrieval date + verification line'); // AC 1 (fs)
// AC 11: diff review (manual - justified: absence of monetization surfaces is a review fact)
```

## §6 - Implementation skeleton

Verify official facts -> author three blueprints -> pipeline configs -> pipeline runs + SME review cycles (the human-paced middle) -> launch-cohort decisions per exam -> registry-driven templates -> legal/contract/sitemap/analytics extensions -> launch checklist -> per-exam go-live flips as each clears the gate. Content work (pipeline + SME) and platform work (templates) parallelize; the checklist joins them.

## §7 - Dependencies

- Upstream: task-CONTENT-002 (the pipeline, hard); transitively DATA-001/CONTENT-001. SEO-001's namespace rule and drift test are consumed (soft - rule exists once SEO-001 ships; both are P1/P2-ordered ahead in the backlog).
- Downstream: Phase 3 monetization prices these exams; Phase 4 growth wave builds programmatic SEO on the registry-driven pages; future vendor rings (AWS/Azure/GCP AI certs) reuse everything here.
- External: Anthropic official exam guides accessible for verification; SME reviewer availability is the launch-pacing resource.

## §8 - Example payloads

```json
// tools/item-pipeline/configs/ccao-f.json (excerpt)
{
  "examCode": "ccao-f",
  "vendor": { "key": "anthropic", "ai_generation_policy": "permitted" },
  "blueprintDoc": "docs/blueprints/ccao-f-blueprint.md",
  "official": {
    "price_usd": 99,
    "delivery": "Pearson VUE OnVUE",
    "validity_months": 12,
    "source_url": "<official exam page - captured at verification>",
    "retrieved": "2026-XX-XX"
  },
  "pass_threshold": { "value": 70, "basis": "site_default" }
}
```

```markdown
<!-- docs/launch-checklist.md row -->

| ccdv-f | blueprint verified 2026-XX-XX | run-2026-XX-ccdv | SME: 112 approved | launch cohort recorded | disclaimers ok | contract+sitemap ok | analytics ok | LIVE 2026-XX-XX |
```

## §9 - Open questions

Deferred:

- Per-exam totalItems targets are set in each pipeline config at run time based on SME capacity and blueprint size; the doc gives no per-exam bank-size mandate and none is invented here.
- CCAF's own future migration to the pipeline (regenerating/expanding its legacy bank) is follow-up content work, not part of this launch task.
- The doc's Phase 2 exit gate ("N certs live with calibrated items") is satisfied progressively as launch cohorts clear first-threshold recalibration; the operator declares the phase exit, not this task.

## §10 - Failure modes inventory

| Failure                                                | Detection                                                                | Outcome                                | Recovery                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------- | -------------------------------------------- |
| Third-party exam "facts" published as official         | Verification pass AC 1/AC 2; retrieval-dated configs                     | Trust damage, vendor irritation        | Leads-not-facts rule §1 #1                   |
| Official prices change after launch                    | Retrieval date + verify-with-Anthropic line (§1 #9)                      | Stale numbers displayed                | Config update; date shows staleness honestly |
| Launch cohort silently treated as calibrated           | provenance `calibration: provisional` + mandatory re-verdict AC 4        | Miscalibrated exam trusted             | Bootstrap governance §1 #4                   |
| One slow SME review blocks all launches                | Per-exam go-live flags AC 10                                             | Ready exams held hostage               | Independent checklist rows                   |
| /exams/ccaf mirror created by template auto-generation | AC 6 route test                                                          | Duplicate-content split                | Index special-cases CCAF link                |
| New exam pages miss disclaimers                        | Site-wide mounting + AC 8 sweep                                          | Trademark exposure                     | LEGAL-001 architecture                       |
| Contract/sitemap forget new routes                     | SEO-001 drift test (AC 9)                                                | Untracked URLs                         | Shared route source forces both              |
| Engine forked per exam under deadline                  | Import-graph AC 7                                                        | Divergent behavior, triple maintenance | One-engine rule                              |
| exam_code missing from events                          | AC 9 flow test                                                           | Per-exam funnels unmeasurable          | Typed map extension                          |
| Hand-authored items bypass pipeline for speed          | AC 3 provenance+review query                                             | Contamination/quality hole             | Pipeline-only rule for new exams             |
| Fixture exam test rots as templates evolve             | AC 5 is itself the guard                                                 | Template regressions unseen            | Keep fixture in CI                           |
| Registration links rot                                 | Landing links carry source_url from config; periodic checklist re-verify | Broken official links                  | Config update cadence in checklist           |

## §11 - Implementation notes

- Do the verification pass first and timebox it: if an official guide contradicts the source doc (codes, domain counts, prices), the official guide wins and the blueprint snapshot records the discrepancy.
- SME review throughput is the launch bottleneck; run the three pipelines early so review queues fill while templates are built.
- The landing pages are the future programmatic-SEO surface: keep their content blocks (domain breakdown, FAQ-shaped sections) structured so the Phase 4 wave can template richer variants without rewriting.
- Launch order suggestion (not normative): ccao-f first (largest audience, cheapest exam), then ccdv-f, then ccar-p - but ship whichever clears the checklist first.

_End of task-CONTENT-003._
