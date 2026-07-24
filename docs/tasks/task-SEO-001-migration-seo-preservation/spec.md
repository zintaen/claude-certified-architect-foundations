---
id: task-SEO-001
title: 'SEO-preserving cutover: URL contract, 301s, canonicals, rank monitoring'
module: SEO
class: product
priority: MUST
status: done
verify: T
phase: P1
milestone: 'P1 · slice 3'
slice: 3
owner: Stephen Cheng
created: 2026-07-16
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-LEGAL-001, task-SEC-001, task-CONTENT-003]
depends_on: [task-DATA-002]
blocks: [task-GROWTH-001]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§F Migration plan: preserve SEO with identical/301-redirected URL structure and canonical tags; verify rankings post-cutover. Risk register: SEO ranking loss - Medium likelihood, High impact'
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - src/lib/urlContract.ts
  - docs/seo/url-contract.md
  - docs/seo/monitoring.md
  - tests/e2e/url-contract.spec.ts
modified_files:
  - next.config.ts
  - src/app/sitemap.ts
  - src/middleware.ts
effort_hours: 10
subtasks:
  - 'URL contract module + doc from live route set (3h)'
  - 'Redirect module + canonical rules + runtime-state noindex (3h)'
  - '404 observation counter + monitoring procedure doc (2h)'
  - 'URL-contract e2e suite wired as a DATA-002 flip gate (2h)'
risk_if_skipped: "The doc calls SEO ranking loss the single biggest threat of the rebuild: the site's entire distribution is organic rankings earned during the viral window, and rankings lost in a botched migration take months to recover if they recover at all. Without a frozen URL contract, tested redirects, and a pre/post monitoring procedure, the cutover's success would be measured by hope."
---

# task-SEO-001 - SEO-preserving cutover: URL contract, 301s, canonicals, rank monitoring

## §1 - Description

1. The repo MUST gain a machine-readable URL contract `src/lib/urlContract.ts`: the frozen list of every public URL the site serves today (generated from the sitemap source plus the non-indexed runtime routes), each entry carrying `path`, `kind` (`indexed` | `runtime`), and a `signature` (expected title pattern and h1 selector text) that identifies the page's content. `docs/seo/url-contract.md` renders the same list for humans with the freeze date.
2. Every `indexed` contract URL MUST keep returning HTTP 200 with its signature intact across the DATA-002 cutover. If a URL ever must move, it MUST get a permanent 301 in the single redirects module (`next.config.ts` `redirects()`), the target MUST carry a canonical tag to itself, and redirect chains MUST NOT exceed one hop. 302s for permanent moves are prohibited.
3. The multi-exam namespace `/exams/[code]/...` is reserved for exams added after CCAF. CCAF's existing URLs (`/`, `/domains/*`, `/sample-questions/*`, `/guide`, `/faq`, ...) REMAIN the canonical CCAF surface; this task MUST NOT create `/exams/ccaf/*` mirrors, and if a future task ever does, those mirrors MUST canonicalize to the legacy URLs until an explicit operator decision reverses the rule (recorded here as the default).
4. `src/app/sitemap.ts` and `urlContract.ts` MUST share one route source (the contract imports the sitemap's path builder or vice versa) so the two cannot drift; every `indexed` contract entry appears in the sitemap and no sitemap entry is missing from the contract.
5. Runtime-state routes (`/exam`, `/practice`, `/result`, `/score`, `/flashcards`, `/dashboard`) MUST carry `noindex` robots meta and stay out of the sitemap - they are app states, not content, and indexing them creates the thin-content problem the doc's indexation rules warn about.
6. The middleware MUST count 404 responses whose path matches a contract entry (`seo.contract_404` OTel counter) so a broken legacy URL after any deploy is visible within minutes, not at the next crawl.
7. `docs/seo/monitoring.md` MUST define the operator procedure: export Search Console top pages/queries as the pre-cutover baseline (dated snapshot attached to the doc), re-check at defined intervals after each DATA-002 surface flip, and record observations. The rollback trigger threshold (what ranking/traffic drop triggers reverting a flip) MUST be set and written into the doc by the operator before the first flip - this spec fixes the procedure, not the number.
8. The URL-contract e2e suite MUST run green as a precondition for each DATA-002 read-surface flip (referenced in DATA-002's flip procedure) and again after legacy-path removal: every indexed URL 200s with signature; every redirect resolves in one hop to a 200; every runtime route carries noindex.
9. The `ccaf.cyberskill.world` host itself MUST NOT change in this task. The host-level question flagged by task-LEGAL-001 §9 (exam-code subdomain vs neutral host) stays an operator decision; if ever executed it is host-level 301 work with its own task - this contract is the asset that would make that move survivable.
10. This task MUST NOT add new SEO surfaces (programmatic pages, schema.org expansion, AEO work belong to the Phase 4 growth wave); it is preservation infrastructure only.

## §2 - Why this design

**Why a signature, not just a status check (§1 #1)?** A cutover bug that serves the wrong content on the right URL passes a 200 check and still destroys rankings (title/h1 swaps read as content changes to crawlers). Title pattern + h1 is the cheapest stable identity proof for each page.

**Why one redirects module (§1 #2)?** Redirect logic scattered across middleware, vercel.json, and page code is how chains and loops happen. `next.config.ts` `redirects()` is declarative, reviewable in one diff, and testable by walking the contract.

**Why legacy-URLs-stay-canonical for CCAF (§1 #3)?** The equity is in the legacy URLs; the tidy-IA instinct ("everything under /exams/[code]") is worth less than the rankings. New exams get the clean namespace because they have no equity to lose. The default is written down so a future refactor cannot flip it casually.

**Why 404 observability (§1 #6)?** Search Console reports crawl errors days later; the doc's mitigation ("post-cutover rank monitoring") needs a minutes-scale signal for the mechanical failure class (broken route after deploy) so rollback happens before crawlers re-evaluate.

**Why operator-set rollback threshold (§1 #7)?** Any percentage written here would be invented (QA-007). Ranking volatility differs by query mix; the person watching Search Console sets the trigger with the baseline in hand, and the doc records it before the flip so the decision is pre-committed, not rationalized mid-incident.

## §3 - Contract

```typescript
// src/lib/urlContract.ts
export type UrlKind = 'indexed' | 'runtime';
export interface UrlContractEntry {
  path: string; // e.g. '/domains/agent-architecture'
  kind: UrlKind;
  signature: { titleIncludes: string; h1Includes: string } | null; // null for runtime states
}
export const URL_CONTRACT: readonly UrlContractEntry[]; // frozen 2026-07; single source shared with sitemap
export const REDIRECTS: readonly { source: string; destination: string }[]; // consumed by next.config redirects()
```

```text
next.config.ts: redirects() returns REDIRECTS with permanent: true
Runtime routes: <meta name="robots" content="noindex"> via route metadata
Middleware: on 404 where path in URL_CONTRACT -> increment seo.contract_404{path_class}
docs/seo/monitoring.md: baseline export procedure + interval checks + operator threshold line + observation log
```

## §4 - Acceptance criteria

1. **Contract complete** - `URL_CONTRACT` contains every sitemap path and every runtime route; a unit test cross-derives both sets from the shared source and fails on drift (traces_to: §1 #1, #4).
2. **Every indexed URL survives** - e2e walks all `indexed` entries: HTTP 200, title matches `titleIncludes`, h1 matches `h1Includes` (traces_to: §1 #2).
3. **Redirect discipline** - Every `REDIRECTS` entry resolves 301 in exactly one hop to a 200 whose canonical is the destination; no 302 appears; adding a two-hop fixture makes the test fail (traces_to: §1 #2).
4. **No CCAF mirrors** - No route exists under `/exams/ccaf`; the canonical-default rule is asserted in the contract doc and a route-listing test (traces_to: §1 #3).
5. **Runtime noindex** - Each runtime route serves robots noindex meta and is absent from the sitemap (traces_to: §1 #5).
6. **404 visibility** - Requesting a deliberately broken contract path in the test env increments `seo.contract_404` (traces_to: §1 #6).
7. **Monitoring doc ready** - `docs/seo/monitoring.md` contains the baseline-export procedure, interval schedule, an explicit empty slot labeled for the operator threshold, and the observation log skeleton; review gate confirms the threshold is filled before the first production flip (traces_to: §1 #7).
8. **Flip gate wiring** - DATA-002's mapping doc flip checklist references running this suite green before each surface flip; the e2e suite is executable against staging (traces_to: §1 #8).
9. **Host untouched** - No config in the diff alters domains/hosts; the host-level question remains an open operator item (traces_to: §1 #9).
10. **No growth-scope creep** - Diff adds no new indexed routes and no structured-data expansion (traces_to: §1 #10).

## §5 - Verification

```typescript
// tests/e2e/url-contract.spec.ts (playwright)
test('all indexed contract URLs: 200 + title + h1 signatures'); // AC 2
test('all redirects: single-hop 301 to 200 with self-canonical'); // AC 3
test('no /exams/ccaf/* route resolves'); // AC 4
test('runtime routes: noindex meta present, absent from sitemap'); // AC 5
test('broken contract path increments seo.contract_404 (probe)'); // AC 6
```

```typescript
// unit tests colocated in the same spec file's setup (vitest not needed separately):
test('URL_CONTRACT and sitemap derive from the shared source (set equality)'); // AC 1
test('monitoring doc sections + threshold slot present'); // AC 7 (fs assertion)
// AC 8: reviewed against DATA-002 mapping doc (manual - cross-doc reference is a review fact)
// AC 9, 10: diff review (manual - config/scope absence is a review fact)
```

## §6 - Implementation skeleton

(API contract above is the skeleton.) Derive the shared route source first (refactor sitemap.ts to export its path builder), generate the contract with signatures captured from the live pages, then redirects module (empty at freeze - its tests exercise fixtures until a real move exists), runtime-route noindex metadata, middleware counter, monitoring doc, e2e suite, and finally the cross-reference line in DATA-002's mapping doc flip checklist.

## §7 - Dependencies

- Upstream: task-DATA-002 (hard - this suite gates its surface flips; the cutover is the event being protected). task-SEC-001's robots work is adjacent and untouched.
- Downstream: task-CONTENT-003 consumes the `/exams/[code]` namespace rule for new exams; the Phase 4 programmatic-SEO wave builds on the contract module.
- External: Google Search Console access for baselines (operator).

## §8 - Example payloads

```typescript
export const URL_CONTRACT = [
  {
    path: '/',
    kind: 'indexed',
    signature: { titleIncludes: 'CyberSkill', h1Includes: 'Claude Certified Architect' },
  },
  {
    path: '/domains/agent-architecture',
    kind: 'indexed',
    signature: { titleIncludes: 'Agent architecture', h1Includes: 'Agent architecture' },
  },
  { path: '/exam', kind: 'runtime', signature: null },
] as const;
```

```text
docs/seo/monitoring.md excerpt:
  Baseline: GSC top-200 pages + queries export, attached as baseline-2026-XX-XX.csv
  Checks: T+2d, T+7d, T+14d, T+28d after each surface flip
  Rollback trigger (operator-set before first flip): __________
  Observations log: | date | flip | pages checked | deltas | action |
```

## §9 - Open questions

Deferred:

- The operator rollback threshold (§1 #7) is set at flip time with the baseline in hand - deliberately not a spec constant.
- The host-level subdomain question (LEGAL-001 §9) stays open; this task's contract is the prerequisite asset for whichever way it is decided.
- Whether future CCAF content pages adopt `/exams/ccaf` with 301s from legacy is an explicit operator reversal of the §1 #3 default, requiring its own task.

## §10 - Failure modes inventory

| Failure                                         | Detection                                                    | Outcome                        | Recovery                                              |
| ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------- |
| Right URL, wrong content after cutover          | Signature assertions AC 2                                    | Rankings decay silently        | Flip surface back (DATA-002 flags); fix; re-run suite |
| Redirect chain accumulates over waves           | One-hop test AC 3                                            | Crawl-equity loss              | Flatten chains in redirects module                    |
| 302 used for a permanent move                   | AC 3 status assertion                                        | Equity not transferred         | permanent: true enforced by test                      |
| Sitemap and contract drift apart                | Shared-source unit test AC 1                                 | Untracked URLs break unseen    | Single route source                                   |
| Duplicate CCAF content under /exams/ccaf        | AC 4 route test + canonical default rule                     | Split rankings between mirrors | Namespace rule §1 #3                                  |
| Runtime states get indexed (thin content)       | AC 5 noindex test                                            | Quality-signal damage          | Route metadata                                        |
| Legacy URL 404s after a later deploy            | seo.contract_404 counter AC 6                                | Slow crawl-error discovery     | Minutes-scale alarm; restore route                    |
| Baseline never exported before flip             | Monitoring doc review gate AC 7                              | No before/after comparison     | Threshold + baseline are flip preconditions           |
| Threshold invented in spec, ignored in practice | Operator-set slot (§1 #7)                                    | Rationalized non-rollback      | Pre-committed number in doc                           |
| Suite green on staging, prod differs            | Suite executable against prod URLs post-flip (AC 8 wiring)   | Missed prod-only breakage      | Post-flip run in monitoring schedule                  |
| Host migration done casually someday            | §1 #9 fence + open question                                  | Catastrophic equity loss       | Requires its own task with this contract as base      |
| Contract rots as new pages ship                 | AC 1 drift test forces contract updates with sitemap changes | Stale freeze                   | Shared source makes updates atomic                    |

## §11 - Implementation notes

- Capture signatures from the live production pages at freeze time, not from local dev - production titles are what Google has.
- Keep `REDIRECTS` empty at freeze if nothing moves; the discipline exists for the day something must. An empty-but-tested mechanism beats inventing moves to justify the module.
- The e2e suite doubles as the "post-cutover verify search rankings" mechanical half; the human half (GSC review) lives in the monitoring doc - do not conflate them.
- `seo.contract_404` label should be a low-cardinality path class (top-level segment), not the raw path, per the metrics-cardinality discipline.

_End of task-SEO-001._
