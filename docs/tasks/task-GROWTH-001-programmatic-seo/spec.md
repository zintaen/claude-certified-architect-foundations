---
id: task-GROWTH-001
title: 'Programmatic SEO pages over the exam/item model with indexation rules'
module: GROWTH
class: product
priority: MUST
status: done
verify: T
phase: P4
milestone: 'P4 · slice 1'
slice: 1
owner: Stephen Cheng
created: 2026-07-17
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-SEC-001, task-LEGAL-001]
depends_on: [task-CONTENT-003, task-SEO-001]
blocks: [task-GROWTH-002]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - "§E: SEO is the main engine - programmatic pages for '[exam code] practice exam', '[cert] practice questions free', '[exam] free mock test', templated over a structured data model, with internal linking, schema markup, genuine free value, and clear indexation rules (noindex thin variants)"
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - src/lib/pseo.ts
  - src/app/exams/[code]/practice-exam/page.tsx
  - src/app/exams/[code]/practice-questions/page.tsx
  - src/app/exams/[code]/free-mock-test/page.tsx
  - docs/seo/pseo-playbook.md
  - tests/e2e/pseo.spec.ts
modified_files:
  - src/lib/urlContract.ts
  - src/app/sitemap.ts
  - src/lib/analytics.ts
effort_hours: 20
subtasks:
  - 'Intent-page templates with live free items + internal-link mesh (8h)'
  - 'Content-threshold indexation gate + schema markup (5h)'
  - 'URL contract/sitemap extension + playbook doc (4h)'
  - 'E2E suite (3h)'
risk_if_skipped: "The doc names SEO as the main engine and the repeatable viral playbook as 'be first and free on every new certification the day its blueprint drops'. Without programmatic intent pages, every new exam launch captures only the traffic that finds the landing page organically; the '[exam] practice questions' query space - the highest-intent searches in the category - goes to ExamTopics and Whizlabs by default."
---

# task-GROWTH-001 - Programmatic SEO pages with indexation rules

## §1 - Description

1. Three intent-page templates MUST exist per live exam, registry-driven (zero per-exam components, task-CONTENT-003's rule): `/exams/[code]/practice-exam`, `/exams/[code]/practice-questions`, `/exams/[code]/free-mock-test`. Each MUST target its query intent with genuinely useful, unique content: live free sample items (rendered, answerable inline), the exam's domain structure, honest exam logistics from config, and a distinct content angle per intent (mock-format walkthrough vs question-bank browse vs exam overview) - not three skins over one paragraph.
2. Indexation MUST be gated by a content threshold: a page renders `noindex` (and drops from the sitemap) until its exam has at least the config floor of SME-approved, publicly-viewable free items and its template sections are populated. `src/lib/pseo.ts` computes index-worthiness per (exam, intent); thin variants MUST never be indexable - the doc's helpful-content rule made mechanical.
3. Every intent page MUST render the free items through the standard shaping path (no answer keys in HTML source pre-interaction, canaries excluded per SEC-001) and cap inline free items at the PAY-001 free-subset boundary - programmatic pages MUST NOT widen the free line.
4. Internal linking MUST be a deliberate mesh, generated from the catalog: intent pages link sibling intents, the exam landing, domain pages, and same-vendor exams; the exams index links intent pages. Orphan pages (reachable only via sitemap) MUST NOT exist - a link-graph test proves reachability from the exams index.
5. Structured data MUST be emitted per page from a single builder: `FAQPage` where the template renders real FAQs, `ItemList` for question listings, `Course`-adjacent fields only where truthful. Schema MUST validate (test-time JSON-LD parse + required-field assertions) and MUST NOT mark up content not visible on the page.
6. CCAF's legacy URLs remain canonical for CCAF (task-SEO-001 §1 #3): CCAF intent pages live at the legacy-adjacent paths only if they carry canonical pointing per the SEO-001 default - implementation resolves CCAF via the same special-case as the exams index, documented in the playbook. New exams use the `/exams/[code]/...` namespace plainly.
7. `urlContract.ts` and the sitemap MUST be extended additively via the shared route source (SEO-001's drift test forces both); each indexable page carries a self-canonical; metadata titles keep brand prominence (LEGAL-001 §1 #6) and every page renders the independence disclaimer automatically.
8. `docs/seo/pseo-playbook.md` MUST document: the intent-template content model, the index-threshold rationale, the per-exam launch checklist step ("intent pages go live when threshold met"), schema policy, and the measurement loop (GSC queries per intent page family, reviewed on the SEO-001 monitoring cadence).
9. Analytics: `pseo_page_viewed` (exam_code, intent) and free-item interaction events reuse the existing map; conversion from intent pages into practice sessions MUST be measurable (traffic source dimension) (traces into OBS-001's taxonomy).
10. This task MUST NOT create doorway-page patterns (city/salary/adjacent-keyword spam), MUST NOT auto-generate prose via LLM at request time, and MUST NOT touch paid-search (AWS restricts trademark bidding; organic only, per the doc).

## §2 - Why this design

**Why three distinct intents instead of one page (§1 #1)?** The doc's query targets are distinct intents with distinct winning formats: "free mock test" wants the timed-simulation pitch, "practice questions" wants browsable items, "practice exam" wants the overview + start button. One page cannot rank-and-satisfy all three; three thin clones get filtered as duplicates. Distinct templates with real content per intent is the defensible middle.

**Why a content-threshold index gate (§1 #2)?** The doc says "set clear indexation rules (noindex thin variants) to avoid duplicate-content penalties". A new exam with 12 items would otherwise instantly publish three thin pages; the gate makes "genuine free value on each page" a computed property instead of an editorial hope.

**Why cap at the free-subset boundary (§1 #3)?** SEO pages that leak beyond the free line quietly repeal PAY-001's pricing decision and re-open the scraping surface SEC-001 bounded. The free subset is already the permanent, linkable free asset - these pages are its distribution.

**Why organic-only (§1 #10)?** AWS limits trademark keyword bidding to validated partners; the doc's channel strategy is organic SEO + AEO. Building paid-search plumbing would create a compliance surface with no sanctioned use.

## §3 - Contract

```typescript
// src/lib/pseo.ts (server-only)
export type PseoIntent = 'practice-exam' | 'practice-questions' | 'free-mock-test';
export interface PseoPageState {
  examCode: string;
  intent: PseoIntent;
  indexable: boolean;
  reasons: string[]; // threshold + section completeness
  freeItemsShown: number;
}
export function pseoState(examCode: string, intent: PseoIntent): Promise<PseoPageState>;
export const PSEO_CONFIG: { minFreeItems: number }; // index threshold floor
export function internalLinks(examCode: string, intent: PseoIntent): LinkSet; // mesh builder
export function schemaFor(state: PseoPageState, visible: VisibleContent): object; // JSON-LD builder
```

```text
Routes (registry-driven): /exams/[code]/{practice-exam|practice-questions|free-mock-test}
noindex mechanics: robots meta + sitemap exclusion + urlContract kind stays 'indexed' only when indexable
Playbook: docs/seo/pseo-playbook.md; launch-checklist.md gains the threshold line (CONTENT-003 doc)
```

## §4 - Acceptance criteria

1. **Templates render real value** - For a fixture exam above threshold, all three intents render live answerable free items, domain structure, logistics, and intent-distinct sections (content-signature assertions differ across intents) (traces_to: §1 #1).
2. **Index gate works** - Below-threshold fixture exam: all three pages emit noindex, absent from sitemap and contract-indexed set; crossing the threshold flips all three without code changes (traces_to: §1 #2).
3. **Free line held** - Inline items come from the free subset only; deep scan shows no answer keys in initial HTML; canaries absent (traces_to: §1 #3).
4. **Mesh complete** - Link-graph test: every indexable pseo page reachable from /exams within two hops; no orphans; sibling/landing/domain links present (traces_to: §1 #4).
5. **Schema valid and truthful** - JSON-LD parses with required fields per type; FAQ markup only where FAQs are visible (fixture with hidden-FAQ fails) (traces_to: §1 #5).
6. **CCAF canonical rule respected** - CCAF intent handling matches the documented special case; no duplicate-content pair without canonical resolution (traces_to: §1 #6).
7. **Contract/sitemap/brand/disclaimer** - Drift test green with new routes; titles carry brand; disclaimer present on every page (traces_to: §1 #7).
8. **Playbook complete** - All §1 #8 sections present; launch checklist gains the threshold step (traces_to: §1 #8).
9. **Measurement wired** - pseo events fire with exam_code + intent; practice-session starts attribute source (traces_to: §1 #9).
10. **Anti-spam fences** - Route inventory contains only the three intents per exam; grep shows no request-time LLM and no paid-search integration (traces_to: §1 #10).

## §5 - Verification

```typescript
// tests/e2e/pseo.spec.ts (playwright + colocated unit assertions)
test('three intents render distinct real content for above-threshold exam'); // AC 1
test('below-threshold: noindex + sitemap/contract exclusion; flip on threshold'); // AC 2
test('free-subset only, no keys in source, no canaries'); // AC 3
test('link-graph reachability, no orphans'); // AC 4
test('JSON-LD validity + visibility-truth fixture'); // AC 5
test('CCAF special-case canonical resolution'); // AC 6
test('contract drift green, brand titles, disclaimer sweep'); // AC 7
test('playbook + checklist sections'); // AC 8 (fs)
test('events with intent + source attribution'); // AC 9
test('route inventory + grep fences'); // AC 10
```

## §6 - Implementation skeleton

pseo.ts (state, threshold, links, schema) -> three templates over the catalog + shaping path -> noindex/sitemap/contract wiring through the shared route source -> playbook + checklist line -> analytics -> tests. Reuse CONTENT-003's landing content blocks where intents overlap; differentiate by section composition, not copy rewrites.

## §7 - Dependencies

- Upstream: task-CONTENT-003 (registry pages, launch checklist) and task-SEO-001 (contract, canonical rules, monitoring) - hard. PAY-001's free subset and SEC-001's canary/shaping rules are consumed via the serving layer.
- Downstream: task-GROWTH-002 (AEO) builds on these pages as the citable surface.
- External: GSC access for the measurement loop (operator, existing from SEO-001).

## §8 - Example payloads

```json
// PseoPageState (below threshold)
{
  "examCode": "ccar-p",
  "intent": "practice-questions",
  "indexable": false,
  "reasons": ["free_items 14 < minFreeItems", "faq_section empty"],
  "freeItemsShown": 14
}
```

## §9 - Open questions

Deferred:

- `minFreeItems` default is set at implementation relative to the PAY-001 free-cap decision (the threshold must be <= the free cap; recorded in the playbook).
- Additional intents ("exam dumps" counter-positioning page per the doc's trust axis) are a playbook-listed candidate for a later slice - deliberately not in this wave to keep the anti-doorway fence clean.

## §10 - Failure modes inventory

| Failure                                | Detection                               | Outcome                       | Recovery                               |
| -------------------------------------- | --------------------------------------- | ----------------------------- | -------------------------------------- |
| Thin pages indexed at exam launch      | Threshold gate AC 2                     | Helpful-content demotion risk | Computed indexability                  |
| Three intents converge into clones     | Intent-distinct signature AC 1          | Duplicate filtering           | Distinct template sections             |
| Free line widened by SEO enthusiasm    | Free-subset cap AC 3                    | Pricing decision repealed     | Boundary from PAY-001 config           |
| Answer keys in page source             | Deep scan AC 3                          | Bank leak at scale            | Shaping-path rendering                 |
| Orphan pages                           | Link-graph AC 4                         | Crawl/discovery failure       | Mesh builder from catalog              |
| Schema marks up invisible content      | Visibility-truth AC 5                   | Rich-result penalties         | Builder takes visible content as input |
| CCAF duplicate-content split           | AC 6                                    | Equity dilution               | SEO-001 canonical default              |
| Contract/sitemap drift                 | Shared-source drift test AC 7           | Untracked URLs                | SEO-001 mechanism                      |
| Doorway-page creep in future slices    | Route-inventory AC 10 + playbook policy | Spam classification           | Closed intent set per wave             |
| Request-time LLM prose                 | Grep AC 10                              | Cost + hallucinated claims    | Static templates over data             |
| Intent pages cannibalize landing pages | GSC review cadence (playbook §1 #8)     | Ranking self-competition      | Measurement loop + canonical tuning    |
| New exam launches without intent pages | Launch-checklist line AC 8              | Missed land-grab window       | Checklist gate                         |

## §11 - Implementation notes

- The threshold gate reads the same catalog the launch checklist does - launching an exam (CONTENT-003) and its intent pages going index-live should be one data event, zero deploys.
- Write FAQ content per intent template as structured data-driven blocks (exam config + domain facts), not freeform prose - truthfulness stays mechanical.
- Track the three intents as one GSC page-family per exam in the playbook's measurement table; per-page noise is not actionable.

_End of task-GROWTH-001._
