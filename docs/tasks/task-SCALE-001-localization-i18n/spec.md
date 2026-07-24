---
id: task-SCALE-001
title: 'i18n infrastructure and first locale wave (UI/marketing first)'
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
related_tasks: [task-SEO-001, task-GROWTH-001]
depends_on: [task-DATA-002]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§D localization: English first, then ES/PT-BR/HI/VI/ID/JA/KO/ZH/AR/FR/DE roughly in that order; prioritize UI/marketing localization over full item translation initially'
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - src/i18n/config.ts
  - src/i18n/en.json
  - scripts/translate-locale.mjs
  - docs/i18n-playbook.md
  - tests/unit/i18n.test.ts
  - tests/e2e/i18n.spec.ts
modified_files:
  - src/app/layout.tsx
  - src/app/sitemap.ts
  - src/lib/urlContract.ts
  - next.config.ts
effort_hours: 24
subtasks:
  - 'String externalization of UI/marketing surfaces into the message catalog (10h)'
  - 'Locale routing + hreflang + SEO integration (6h)'
  - 'LLM-assisted translation pipeline with human review gate (5h)'
  - 'Playbook + tests (3h)'
risk_if_skipped: "Tier 2 markets are half the doc's pricing architecture (PPP) and most of its growth headroom; a Vietnamese company selling globally in English-only leaves its own home market and the doc's named locale ladder unaddressed. Retrofitting i18n after more surfaces ship costs more every week - string externalization is the tax that only grows."
---

# task-SCALE-001 - i18n infrastructure and first locale wave

## §1 - Description

1. All user-facing UI and marketing strings MUST be externalized into a typed message catalog (`src/i18n/en.json` as source of truth; typed keys, no raw literals on localized surfaces). Exam ITEM content (stems, options, explanations) is explicitly NOT localized in this task, per the doc's UI-first rule - items render in English with the UI localized around them, and the playbook states this honestly on localized pages ("questions in English").
2. Locale routing MUST be subpath-based (`/[locale]/...`) with English remaining at the root (no `/en/` redirect of existing URLs - the SEO-001 contract is inviolable). Localized routes are NEW additive URLs: contract and sitemap extend via the shared route source; every localized page emits `hreflang` alternates (including `x-default` to the root) and self-canonicals.
3. The first locale wave MUST be config-driven (`SUPPORTED_LOCALES`), shipping with ONE locale to prove the pipeline end to end - the default first locale is Vietnamese (home market, founder-reviewable) with the doc's ladder (ES, PT-BR, HI, ID, JA...) as the documented expansion order; the operator picks at implementation and the playbook records the choice and rationale.
4. Translation MUST follow the content discipline: `scripts/translate-locale.mjs` generates candidate catalogs via batch LLM translation (cost doctrine: offline, batch, run-manifest logged), but a locale MUST NOT ship until a named human reviewer signs off the catalog (review header in the locale file: reviewer, date, catalog hash). Legal pages (terms, privacy, AUP, refunds) MUST NOT be machine-translated-and-shipped: localized legal pages either carry counsel-reviewed translations or remain English with a notice - the playbook records the per-locale decision.
5. Locale-aware formatting MUST use the platform Intl APIs (dates, numbers) keyed by locale; the PPP price display (PAY-002) MUST format currency correctly per locale when both features are live (soft integration - each degrades without the other).
6. Locale negotiation MUST be non-coercive: first visit MAY suggest a locale from `Accept-Language` via a dismissible banner; it MUST NOT auto-redirect by IP (geo-IP language coercion is both rude and SEO-hostile); the choice persists (localStorage) and the switcher is in the footer.
7. Localized pages MUST preserve the compliance surfaces: the independence disclaimer, trademark notice, and humble-claims register apply per locale - the disclaimer MUST be professionally reviewed per shipped locale (same reviewer gate as #4; legal-sensitive strings are flagged in the catalog so reviewers see them distinctly).
8. The e2e suite MUST verify per shipped locale: routing works, no raw literal leaks (missing-key detector renders loudly in dev, fails tests), hreflang/canonical correctness, disclaimer presence, and that English root URLs are byte-unchanged (SEO contract).
9. Analytics MUST gain a `locale` dimension on page/session events (OBS-001 map extension).
10. This task MUST NOT translate item content (future wave with its own quality bar), MUST NOT change any existing English URL, and MUST NOT add a translation-management SaaS (catalogs in-repo; the review gate is git).

## §2 - Why this design

**Why UI-first, items-English (§1 #1)?** The doc is explicit: localization moves revenue via UI/marketing first, and item translation is a quality-risk multiplier (a mistranslated distractor is a broken question). Honest "questions in English" labeling keeps trust while the funnel localizes.

**Why subpath locales with the root untouched (§1 #2)?** The SEO contract froze the English URLs; subpaths add equity instead of moving it, and hreflang ties the cluster together. Domain-per-locale or root-swap strategies would reopen the migration risk Phase 1 spent so much to avoid.

**Why one locale first (§1 #3)?** The pipeline (externalize, translate, review, route, verify) is the deliverable; locale two through six are then content operations. Shipping six at once multiplies review debt before the mechanism is proven.

**Why the human review gate on catalogs (§1 #4)?** Machine translation of UI is good enough to draft, not to ship - and for legal strings it is a liability. The review header makes the sign-off auditable, the same pattern as item provenance.

## §3 - Contract

```typescript
// src/i18n/config.ts
export const SUPPORTED_LOCALES: readonly string[]; // e.g. ['vi'] at first ship; root 'en' implicit
export const LOCALE_LADDER: readonly string[]; // doc order, documentation of intent
export function t(key: MessageKey, locale: string, params?: object): string; // typed keys from en.json
// Missing key behaviour: dev = loud placeholder, test = failure, prod = English fallback + counter

// Locale file header (per shipped locale, enforced by test):
// { "_review": { "reviewer": "<name>", "date": "YYYY-MM-DD", "source_hash": "<en.json hash>" }, ... }
```

```text
Routing: /[locale]/... additive; root stays English. hreflang alternates + x-default on all cluster pages.
scripts/translate-locale.mjs <locale>  batch LLM candidate catalog, run-manifest logged, dry-run default.
docs/i18n-playbook.md: locale choice + rationale, legal-page policy per locale, expansion ladder,
review procedure, "questions in English" labeling rule.
```

## §4 - Acceptance criteria

1. **Externalization complete on localized surfaces** - Missing-key detector finds zero raw literals on the surfaces in scope; typed keys compile (traces_to: §1 #1).
2. **Items stay English, labeled** - Localized practice surfaces render English items with the playbook's labeling string present (traces_to: §1 #1).
3. **Root untouched, cluster correct** - English root URLs byte-identical (contract suite green); localized routes carry hreflang alternates + x-default + self-canonicals; contract/sitemap drift test green with additions (traces_to: §1 #2, #8).
4. **Pipeline proven on locale one** - The shipped locale's catalog carries the review header with matching source hash; translate script is dry-run default with run manifest (traces_to: §1 #3, #4).
5. **Legal-page policy enforced** - Per-locale legal decision recorded; unreviewed machine-translated legal pages cannot ship (test: locale with missing legal review renders English legal pages + notice) (traces_to: §1 #4).
6. **Formatting + price coexistence** - Dates/numbers format per locale; price display formats correctly when PAY-002 fixtures present, degrades cleanly when absent (traces_to: §1 #5).
7. **Non-coercive negotiation** - No IP-based auto-redirect; Accept-Language banner is dismissible and persistent; switcher works (traces_to: §1 #6).
8. **Compliance per locale** - Disclaimer + trademark notice render in the shipped locale with the legal-sensitive flag reviewed (catalog flag test) (traces_to: §1 #7).
9. **Fallback + observability** - Prod missing-key falls back to English and increments a counter; locale dimension on events (traces_to: §1 #8 dev/test behaviour, #9).
10. **Fences** - No item translation, no English URL changes, no external TMS (grep/diff) (traces_to: §1 #10).

## §5 - Verification

```typescript
// tests/unit/i18n.test.ts (vitest)
test('missing-key detector: zero literals in scope; typed keys'); // AC 1
test('locale file review-header + source-hash match'); // AC 4
test('legal-sensitive flags present on disclaimer/notice keys'); // AC 8
test('prod fallback to English + counter'); // AC 9

// tests/e2e/i18n.spec.ts (playwright)
test('root byte-identity + hreflang/canonical cluster + drift test'); // AC 3
test('localized surfaces render; items English with label'); // AC 2
test('legal-page policy: unreviewed locale -> English legal + notice'); // AC 5
test('Intl formatting + price coexistence fixtures'); // AC 6
test('banner dismissible, no auto-redirect, switcher persists'); // AC 7
test('locale dimension on events; grep fences'); // AC 9, 10
```

## §6 - Implementation skeleton

Externalize strings surface-by-surface (marketing/UI chrome first) -> i18n config + typed t() -> locale routing + hreflang through the shared route source -> translate script + review procedure -> ship locale one -> playbook -> tests. String externalization is the bulk; do it in reviewable slices.

## §7 - Dependencies

- Upstream: task-DATA-002 (stable post-migration surfaces to externalize) - hard. SEO-001's contract mechanisms and GROWTH-001's pages are the routing/SEO substrate (consumed).
- Downstream: item-content translation is a future wave with its own quality gate; locale ladder expansion is content ops on this pipeline.
- External: named human reviewer per locale (for Vietnamese, the founder qualifies); counsel review for localized legal pages when chosen.

## §8 - Example payloads

```json
// src/i18n/vi.json header
{
  "_review": { "reviewer": "Stephen Cheng", "date": "2026-11-02", "source_hash": "e3b0..." },
  "nav.practice": "Luyện tập",
  "exam.start": "Bắt đầu thi thử"
}
```

## §9 - Open questions

Deferred:

- First-locale choice is the operator's at implementation (default recommendation: Vietnamese; the doc's ladder governs expansion) - recorded in the playbook.
- Localized legal pages per locale (translate vs English+notice) is a per-locale counsel decision logged in the playbook.
- Item-content translation criteria (when a locale earns it) is the future wave's question.

## §10 - Failure modes inventory

| Failure                              | Detection                                  | Outcome                                 | Recovery                            |
| ------------------------------------ | ------------------------------------------ | --------------------------------------- | ----------------------------------- |
| English URLs change during retrofit  | Root byte-identity AC 3                    | SEO catastrophe Phase 1 avoided         | Contract suite as gate              |
| Raw literals leak on localized pages | Missing-key detector AC 1                  | Mixed-language jank                     | Loud dev placeholder + test failure |
| Machine-translated legal shipped     | Policy gate AC 5                           | Legal exposure in-locale                | English + notice fallback           |
| Disclaimer mistranslated             | Legal-sensitive flags + reviewer gate AC 8 | Nominative-use posture broken in-locale | Flagged-string review               |
| IP-based locale coercion             | AC 7                                       | UX hostility + cloaking-adjacent SEO    | Suggestion banner only              |
| hreflang cluster errors              | AC 3 alternates test                       | Wrong-locale rankings                   | Cluster built from route source     |
| Catalog drifts from en.json          | source_hash in review header AC 4          | Stale translations ship                 | Hash-mismatch fails test            |
| Translation pipeline unlogged        | Run-manifest requirement AC 4              | Unreproducible catalogs                 | Same discipline as content runs     |
| Six locales of review debt at once   | One-locale-first rule §1 #3                | Unreviewed shipping pressure            | Pipeline-proof-then-expand          |
| Items translated casually later      | Fence AC 10 + future-wave gate             | Broken questions in-locale              | Separate quality bar                |
| Price formatting wrong per locale    | AC 6                                       | Trust damage at checkout                | Intl + PAY-002 fixtures             |
| Missing-key silent in prod           | Fallback + counter AC 9                    | Invisible rot                           | Counter alarms rot                  |

## §11 - Implementation notes

- Pick the i18n library pragmatically at implementation (next-intl or equivalent); the spec's contract is the typed catalog, review header, and routing behaviour - not the library.
- Externalize in this order: nav/footer/chrome, marketing pages, exam-flow UI, dashboard - each slice is independently shippable behind the locale flag.
- The "questions in English" label is a feature, not an apology: it sets expectations and doubles as the future upsell surface for translated item packs.

_End of task-SCALE-001._
