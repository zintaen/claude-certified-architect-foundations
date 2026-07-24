---
id: task-GROWTH-002
title: 'AEO/GEO: citability in AI assistants and answer engines'
module: GROWTH
class: product
priority: SHOULD
status: done
verify: T
phase: P4
milestone: 'P4 · slice 1'
slice: 1
owner: Stephen Cheng
created: 2026-07-17
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-SEC-001]
depends_on: [task-GROWTH-001]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§E AEO/GEO: as an AI-native site, optimize to be cited by ChatGPT/Claude/Perplexity/Google AI Overviews; a real, less-contested opportunity aligned with the AI-cert brand'
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - src/app/llms.txt/route.ts
  - src/lib/aeo.ts
  - docs/seo/aeo-playbook.md
  - tests/e2e/aeo.spec.ts
modified_files:
  - src/app/robots.ts
  - src/app/exams/[code]/page.tsx
effort_hours: 12
subtasks:
  - 'llms.txt + AI-crawler robots policy (3h)'
  - 'Extractable answer blocks + fact boxes on citable surfaces (5h)'
  - 'Citation-measurement procedure + playbook (2h)'
  - 'E2E suite (2h)'
risk_if_skipped: "Certification questions are exactly what people now ask assistants ('what is on the CCAF exam', 'best free CCAF practice test'). The doc calls AEO a real, less-contested opportunity aligned with the brand; ceding it means assistants cite ExamTopics' summaries instead - the same land-grab logic as SEO, one surface earlier in its lifecycle."
---

# task-GROWTH-002 - AEO/GEO citability

## §1 - Description

1. An `llms.txt` route MUST serve a curated, generated-from-catalog index for AI agents: what the site is (independent practice exams, original content), per-exam free surfaces (intent pages, sample questions, guides), the content-integrity stance, and the independence disclaimer. It MUST be generated from the same catalog/route source as the sitemap (drift-proof) and regenerate as exams launch.
2. AI-crawler policy MUST be explicit and deliberate in `robots.ts`: named AI crawlers (search-mode and training-mode user agents enumerated in config) are allowed on free/marketing surfaces and disallowed on `/api/` (SEC-001's line holds). The policy decision (which agent classes get what) is config with the default recorded in the playbook - crawl-for-citation allowed; the operator can tighten per agent as the ecosystem shifts.
3. Citable surfaces (exam landings, intent pages, guides, FAQs) MUST render extraction-friendly answer blocks: a direct-answer paragraph under each question-shaped heading (the pattern assistants quote), per-exam fact boxes (code, price with retrieval date, format, delivery, validity - from the CONTENT-003 config with its verify-with-vendor line), and stable heading anchors. `src/lib/aeo.ts` provides the fact-box and answer-block builders so the pattern is componentized, not hand-authored per page.
4. Truthfulness rules carry over: fact boxes render only config-sourced facts with dates; the humble-claims register (no pass guarantees) and independence disclaimer appear in extractable positions so quotes carry the disclaimer context.
5. The free/premium boundary holds: nothing AEO exposes exceeds the free subset; the item bank, explanations, and premium surfaces stay outside llms.txt and the extraction patterns.
6. `docs/seo/aeo-playbook.md` MUST document: the crawler-policy rationale and config, the answer-block/fact-box content model, and the measurement procedure - a fixed query set ("best [exam] practice test", "what is on the [exam] exam", per exam) checked against the major assistants on a recorded cadence, with citations logged in an observations table (manual procedure; honest about the absence of an API for this).
7. Analytics MUST segment assistant-referred traffic where referrers/UTMs allow, extending the OBS-001 map (`source: 'assistant'` dimension on session attribution), acknowledged in the playbook as lower-fidelity than GSC.
8. This task MUST NOT alter page rankings work (GROWTH-001 owns SEO content), MUST NOT expose provenance records or per-item data, and MUST NOT add request-time LLM calls.

## §2 - Why this design

**Why llms.txt from the catalog (§1 #1)?** A hand-written llms.txt rots at the first exam launch. Generating it from the same source as the sitemap keeps the AI-agent index and the human index in lockstep for free, and makes each launch (CONTENT-003 flip) automatically citable.

**Why an explicit, configurable crawler policy (§1 #2)?** Blanket-allowing AI crawlers hands training pipelines the free bank; blanket-blocking forfeits the citation channel the doc wants. Naming the classes and defaulting to citation-friendly with an operator dial is the honest posture in a shifting ecosystem, and writing the rationale down prevents accidental policy-by-omission.

**Why extraction-friendly blocks with embedded disclaimers (§1 #3, #4)?** Assistants quote paragraphs, not pages. If the quoted unit carries the brand, the date, and the independence line, every citation is compliant marketing; if not, the site gets paraphrased anonymously.

## §3 - Contract

```typescript
// src/lib/aeo.ts
export function factBox(exam: ExamDetail): FactBoxModel; // config-sourced, dated
export function answerBlock(question: string, answer: string): AnswerBlockModel; // direct-answer pattern
export const AI_CRAWLER_POLICY: { agent: string; allow: 'free_surfaces' | 'none' }[]; // config, playbook-documented
// /llms.txt route: text/plain, generated from catalog + route source
```

## §4 - Acceptance criteria

1. **llms.txt generated and current** - Serves catalog-derived content including a fixture exam added at test time; carries integrity stance + disclaimer; stays consistent with the route source (drift assertion) (traces_to: §1 #1).
2. **Crawler policy explicit** - robots output enumerates configured agents with the documented defaults; /api/ stays disallowed for all; changing config changes output without code edits (traces_to: §1 #2).
3. **Answer blocks + fact boxes render** - Exam landing and intent pages carry direct-answer paragraphs under question headings and dated fact boxes from config (component-driven, fixture-tested) (traces_to: §1 #3).
4. **Quotable compliance** - Fact boxes carry retrieval dates and the verify-with-vendor line; disclaimer text sits within the extractable block scope; prohibited-claims lint passes over AEO copy (traces_to: §1 #4).
5. **Boundary held** - llms.txt and AEO surfaces reference only free surfaces; no premium routes, provenance, or beyond-subset items appear (scan) (traces_to: §1 #5).
6. **Playbook + measurement** - Playbook contains policy rationale, content model, the fixed query set, and the observations table skeleton with cadence (traces_to: §1 #6).
7. **Attribution dimension** - Assistant-referred sessions tag `source: 'assistant'` where detectable; event map extended (traces_to: §1 #7).
8. **Fences** - No ranking-content diffs outside AEO components; no per-item exposure; grep shows no request-time LLM (traces_to: §1 #8).

## §5 - Verification

```typescript
// tests/e2e/aeo.spec.ts
test('llms.txt: catalog-derived, fixture exam appears, disclaimer + stance present'); // AC 1
test('robots: configured agents enumerated, /api disallowed, config-driven'); // AC 2
test('answer blocks + dated fact boxes on landing and intent pages'); // AC 3
test('quotable compliance: dates, verify line, disclaimer scope, claims lint'); // AC 4
test('boundary scan: free surfaces only in llms.txt and AEO blocks'); // AC 5
test('playbook sections + query set + observations skeleton'); // AC 6 (fs)
test('assistant attribution dimension fires on referrer fixture'); // AC 7
test('grep fences'); // AC 8
```

## §6 - Implementation skeleton

aeo.ts builders -> llms.txt route over the shared catalog/route source -> robots policy config -> retrofit answer blocks/fact boxes into landing + intent templates (component insertion, not copy rewrites) -> playbook with query set -> attribution dimension -> tests.

## §7 - Dependencies

- Upstream: task-GROWTH-001 (intent pages are the primary citable surface) - hard; CONTENT-003 configs and SEO-001's route source consumed transitively.
- Downstream: none.
- External: none beyond the manual measurement cadence (operator time).

## §8 - Example payloads

```text
# llms.txt excerpt
# CyberSkill - independent certification practice exams (original, blueprint-derived, not affiliated with any vendor)
## Claude Certified Architect - Foundations (ccaf)
- Practice questions: https://ccaf.cyberskill.world/sample-questions
- Free mock test: https://ccaf.cyberskill.world/
```

## §9 - Open questions

Deferred:

- Per-agent policy tightening (search-mode vs training-mode crawlers) is an operator dial expected to move with the ecosystem; the playbook records each change and why.
- Assistant-citation measurement automation is revisited if a credible API/service emerges; the manual cadence is the honest current state.

## §10 - Failure modes inventory

| Failure                                          | Detection                                                     | Outcome                           | Recovery                      |
| ------------------------------------------------ | ------------------------------------------------------------- | --------------------------------- | ----------------------------- |
| llms.txt rots against the catalog                | Drift assertion AC 1                                          | Stale agent index                 | Shared-source generation      |
| Training crawlers ingest the free bank silently  | Explicit policy AC 2 + playbook rationale                     | Uncompensated ingestion           | Config dial per agent class   |
| Robots edit re-blocks Googlebot                  | AC 2 output test (SEO-001's page-crawl invariant re-asserted) | SEO damage                        | Scoped policy config          |
| Fact boxes drift stale                           | Dated config rendering AC 4                                   | Wrong prices quoted by assistants | Retrieval-date visibility     |
| Quotes stripped of independence context          | Disclaimer-in-block scope AC 4                                | Affiliation-implying citations    | Extractable-unit placement    |
| AEO blocks leak premium/provenance               | Boundary scan AC 5                                            | Line erosion                      | Free-surface allowlist        |
| Answer blocks become LLM-generated filler        | Grep AC 8 + component model                                   | Hallucinated claims               | Data-driven blocks only       |
| Measurement never happens                        | Playbook cadence + observations table AC 6                    | Unfalsifiable channel             | Recorded manual procedure     |
| Attribution overclaims                           | Playbook honesty note (low fidelity)                          | Bad channel decisions             | Dimension labeled approximate |
| Duplicate content between answer blocks and body | Blocks are the body pattern (not parallel copies)             | Self-competition                  | Single-render components      |

## §11 - Implementation notes

- Keep llms.txt short and curated - it is a map for agents, not a dump; link the free surfaces and stop.
- The answer-block builder should take (question, answer) from the same FAQ data GROWTH-001's schema builder consumes - one FAQ source, three renderings (HTML, JSON-LD, llms.txt context).
- Log the crawler-policy config's history in the playbook observations table; future debates about "when did we allow X" should be one lookup.

_End of task-GROWTH-002._
