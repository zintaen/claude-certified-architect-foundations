---
id: task-LEGAL-001
title: 'Trademark disclaimers and independent positioning on every exam surface'
module: LEGAL
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
related_tasks: [task-LEGAL-002]
depends_on: []
blocks: [task-SCALE-004]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - 'Decision Log: Positioning - AI-cert-first; nominative fair use posture (plain-text marks, no logos, disclaimers, brand prominence)'
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - src/lib/legal.ts
  - src/components/Disclaimer.tsx
  - scripts/check-brand-terms.mjs
  - tests/unit/legal.test.ts
  - tests/e2e/disclaimer.spec.ts
modified_files:
  - src/components/Footer.tsx
  - src/app/layout.tsx
  - src/app/about/page.tsx
  - src/app/api/og/route.tsx
  - package.json
effort_hours: 8
subtasks:
  - 'Author src/lib/legal.ts constants (2h)'
  - 'Disclaimer component + wire into layout/footer/OG (2h)'
  - 'Banned-term CI guard script + precommit hook (2h)'
  - 'E2E sitemap-driven disclaimer test + unit tests (2h)'
risk_if_skipped: "The site names Anthropic's exam marks on every page while ranking on them. Without a visible independence disclaimer, plain-text-only mark usage, and a guard against affiliation-implying words, a single vendor C&D or confusion claim lands against an undefended surface. The source doc rates this the cheapest insurance in the whole plan: nominative fair use (New Kids test) requires doing nothing that suggests sponsorship, and the 2nd/9th circuit split means disclaimers and brand separation must be strong for a globally visible site."
---

# task-LEGAL-001 - Trademark disclaimers and independent positioning on every exam surface

## §1 - Description

1. The repo MUST gain a single legal-constants module `src/lib/legal.ts` exporting: `INDEPENDENCE_DISCLAIMER` (exact string: "CyberSkill is an independent practice-exam resource and is neither affiliated with, nor authorized, sponsored, or approved by, Anthropic, PBC."), `VENDOR_MARKS` (a typed map of every third-party mark the site references, today `anthropic` -> `{ owner: "Anthropic, PBC", marks: ["Claude", "Claude Certified Architect - Foundations", "CCAR-F"] }`), and `TRADEMARK_NOTICE` (the long-form footer notice naming each mark as the property of its owner). Every UI surface that mentions a vendor mark MUST source the string through this module, not a raw literal.
2. A `<Disclaimer />` component (`src/components/Disclaimer.tsx`) MUST render `INDEPENDENCE_DISCLAIMER` and MUST be mounted site-wide via the root layout footer path so that it is present in the server-rendered HTML of every route in `src/app/sitemap.ts` plus the non-indexed runtime routes `/exam`, `/practice`, `/flashcards`, `/result`, `/score`, `/dashboard`.
3. Vendor marks MUST appear in plain text only. The repo MUST NOT contain vendor logo or certification-badge image assets (no Anthropic logomark, no "Claude" brandmark, no credential badge art) under `public/` or inlined as SVG/JSX. Only CyberSkill's own branding may appear as imagery.
4. Product copy and metadata MUST NOT describe the product with affiliation-implying descriptors: "official", "authorized", "authentic", "certified by", "endorsed", "approved by", "partner" (as self-description). These words MAY appear only inside quoted legal text that negates them (the disclaimer itself) or when factually describing the vendor's exam (for example the exam title "Claude Certified Architect - Foundations" names the credential, not the product).
5. A CI guard `scripts/check-brand-terms.mjs` MUST scan `src/**` and `public/**` text content and fail the build when: (a) a banned descriptor from clause 4 appears outside the allowlisted legal strings, or (b) a vendor mark string literal appears in `src/**` outside `src/lib/legal.ts` and `src/data/**` (question content is exempt: items legitimately name products they test). The guard MUST run in the existing `precommit` script.
6. The HTML `<title>` template in `src/app/layout.tsx` MUST keep the CyberSkill brand present in every page title (suffix or prefix), so no page title consists of a vendor mark alone. The OG image route (`src/app/api/og/route.tsx`) MUST render the CyberSkill brand at greater or equal visual weight than any exam name it renders, and MUST include the short independence line.
7. The About page MUST gain a "Trademarks and independence" section rendering `TRADEMARK_NOTICE`, stating plain-text nominative use, non-affiliation, and that certification badges are licensed to individual credential holders and are not used by the product.
8. The footer of every page MUST link to that About section anchor from the disclaimer text.
9. This task MUST NOT change any route path, URL, or slug (URL strategy is owned by task-SEO-001), and MUST NOT alter question content under `src/data/**`.
10. New vendors added later MUST only require a new `VENDOR_MARKS` entry plus content - the disclaimer, notice, guard, and tests MUST be data-driven off the map, not copy-pasted per vendor.

## §2 - Why this design

**Why one constants module (§1 #1)?** The nominative-fair-use defense depends on being able to show every use of the mark was necessary, plain-text, and accompanied by non-affiliation signals. One module makes the entire usage surface greppable and auditable in one place; scattered literals cannot be audited or updated when a vendor guideline changes.

**Why site-wide mounting instead of per-page (§1 #2)?** The failure mode is a new page added without the disclaimer. Mounting through the root layout makes omission structurally impossible rather than a per-PR review burden; the e2e test then verifies the invariant instead of enforcing it.

**Why a build-failing guard instead of review policy (§1 #5)?** The source doc's risk register rates a vendor C&D as medium likelihood, medium impact, and Microsoft's guidelines explicitly treat "official/authorized" as implying affiliation. Humans forget; the guard converts the trademark policy into a mechanical gate, the same way lint enforces style.

**Why exempt `src/data/**` from the mark-literal rule (§1 #5)?\*\* Exam items must name the technologies they test ("Which Claude model..."); that is descriptive use inside content, not product positioning. The guard targets positioning surfaces (UI chrome, metadata, marketing copy) where confusion is created.

**Why brand prominence in titles and OG (§1 #6)?** Google's brand guidance forbids making a third-party mark the most prominent element, and Toyota v. Tabari weighs prominence heavily. Titles and social cards are the most-seen surfaces (search results, link unfurls), so they carry the prominence requirement explicitly.

**Why data-driven multi-vendor shape now (§1 #10)?** Phase 2 adds AWS/Azure/GCP vendors. Retrofitting per-vendor legal plumbing later would touch every surface again; shaping it as a map costs nothing today.

## §3 - Contract

```typescript
// src/lib/legal.ts
export type VendorKey = 'anthropic'; // union grows per vendor

export interface VendorMarkEntry {
  owner: string; // legal owner name, e.g. "Anthropic, PBC"
  marks: readonly string[]; // plain-text word marks referenced by the site
}

export const VENDOR_MARKS: Record<VendorKey, VendorMarkEntry>;

// Exact sentence rendered on every page:
export const INDEPENDENCE_DISCLAIMER: string;

// Long-form notice for the About "Trademarks and independence" section.
// MUST enumerate every VENDOR_MARKS entry: "<mark> is a trademark of <owner>."
export const TRADEMARK_NOTICE: string;

// Words banned as self-descriptors (case-insensitive, word-boundary matched):
export const BANNED_DESCRIPTORS: readonly string[];
```

```tsx
// src/components/Disclaimer.tsx
// Server component. No props for the default site-wide form.
export default function Disclaimer(props: { variant?: 'footer' | 'inline' }): JSX.Element;
// footer variant: small text + anchor link to /about#trademarks
// inline variant: for OG/metadata-adjacent use, text only
```

```text
scripts/check-brand-terms.mjs (node, zero deps)
  exit 0  - no violations
  exit 1  - prints file:line:term for every violation, then fails
  scan set:   src/**/*.{ts,tsx}, public/**/*.{svg,html,txt,json}
  rule A:     BANNED_DESCRIPTORS outside src/lib/legal.ts allowlisted strings
  rule B:     VENDOR_MARKS mark literals outside src/lib/legal.ts and src/data/**
  rule C:     image assets whose filename matches /anthropic|claude.*(logo|badge|mark)/i
package.json precommit: "eslint src && prettier --check . && node scripts/check-brand-terms.mjs"
```

## §4 - Acceptance criteria

1. **Disclaimer everywhere** - Server-rendered HTML of every sitemap route plus `/exam`, `/practice`, `/flashcards`, `/result`, `/score`, `/dashboard` contains the exact `INDEPENDENCE_DISCLAIMER` string (traces_to: §1 #1, §1 #2).
2. **Single source of truth** - No vendor mark string literal exists in `src/**` outside `src/lib/legal.ts` and `src/data/**`; guard rule B proves it (traces_to: §1 #1, §1 #5).
3. **No vendor imagery** - `public/` and `src/` contain no vendor logo or badge assets; guard rule C passes and a repo scan in the unit test finds zero matches (traces_to: §1 #3).
4. **Banned descriptors blocked** - Introducing the word "official" into a page component makes `node scripts/check-brand-terms.mjs` exit 1 naming the file and line; the committed tree exits 0 (traces_to: §1 #4, §1 #5).
5. **Guard wired into precommit** - `npm run precommit` executes the guard; removing it from `package.json` fails the unit test that asserts the script chain (traces_to: §1 #5).
6. **Brand-prominent titles** - Every generated page `<title>` contains "CyberSkill"; no title equals a bare vendor mark (traces_to: §1 #6).
7. **OG card carries brand and disclaimer line** - The OG route response renders "CyberSkill" and the short independence line for exam-related cards (traces_to: §1 #6).
8. **About trademark section** - `/about` contains the `TRADEMARK_NOTICE` text under an element with id `trademarks`, and the footer disclaimer links to `/about#trademarks` (traces_to: §1 #7, §1 #8).
9. **No URL changes** - `git diff` for this task touches no route segment folder names; sitemap output before and after is identical (traces_to: §1 #9).
10. **Data-driven vendors** - Adding a second `VENDOR_MARKS` entry in a test fixture flows into `TRADEMARK_NOTICE` composition without editing components (traces_to: §1 #10).

## §5 - Verification

```typescript
// tests/unit/legal.test.ts (vitest)
test('independence disclaimer exact wording'); // AC 1 string base
test('trademark notice enumerates every vendor mark entry'); // AC 10
test('banned descriptor list is word-boundary safe: "unofficial" not matched'); // AC 4
test('precommit chain includes check-brand-terms'); // AC 5 (reads package.json)
test('no vendor logo/badge assets in public/ or src/'); // AC 3 (fs scan)
```

```typescript
// tests/e2e/disclaimer.spec.ts (playwright)
test('every sitemap route renders the disclaimer'); // AC 1 (drives routes from sitemap.ts import)
test('runtime routes /exam /practice /flashcards /result /score /dashboard render the disclaimer'); // AC 1
test('every page title contains CyberSkill'); // AC 6
test('og route: brand + independence line present'); // AC 7 (fetch /api/og, assert composition inputs)
test('about page has #trademarks section and footer links to it'); // AC 8
```

```bash
# AC 4 negative path, run in CI as a script test:
echo 'export const x = "the official practice exam"' > src/tmp-violation.ts
node scripts/check-brand-terms.mjs && exit 1 || echo "guard failed as expected"
rm src/tmp-violation.ts
# AC 9: npx tsx -e 'import s from "./src/app/sitemap"; console.log(JSON.stringify(s()))' diffed pre/post branch
```

## §6 - Implementation skeleton

(API contract above is the skeleton.) Wire order: legal.ts -> Disclaimer.tsx -> Footer.tsx mounts it -> layout.tsx title template check -> about page section -> og route line -> guard script -> package.json precommit -> tests. Footer is already rendered from the root layout, so mounting there satisfies §1 #2 for all routes; verify the exam route does not suppress the footer (it renders a focused UI - if it does suppress, mount Disclaimer directly in that page shell).

## §7 - Dependencies

- Upstream: none (first task of P0).
- Downstream: task-LEGAL-002 links its ToS/AUP pages from the same footer block; task-CONTENT-003 and later vendor launches consume `VENDOR_MARKS` for new vendors; task-SEO-001 owns any future URL/domain decisions flagged in §9.
- External: Anthropic trademark guidance (plain-text nominative use); no partnership or license is assumed.

## §8 - Example payloads

```typescript
export const VENDOR_MARKS = {
  anthropic: {
    owner: 'Anthropic, PBC',
    marks: ['Claude', 'Claude Certified Architect - Foundations', 'CCAR-F'],
  },
} as const;

export const INDEPENDENCE_DISCLAIMER =
  'CyberSkill is an independent practice-exam resource and is neither affiliated with, nor authorized, sponsored, or approved by, Anthropic, PBC.';
```

```text
$ node scripts/check-brand-terms.mjs
src/app/page.tsx:41: banned descriptor "official" ("the official practice exam")
src/components/Hero.tsx:12: vendor mark literal "Claude Certified Architect" outside src/lib/legal.ts
2 violations. Failing.
```

## §9 - Open questions

Deferred:

- The `ccaf.cyberskill.world` subdomain abbreviates the exam name. Vendor guidance forbids marks in domains; an abbreviation is a gray zone. Decision (keep, or migrate under a neutral path with 301s) is deferred to task-SEO-001 where URL moves are owned - flagged here so it is not lost. (operator decision; llm-explicit)
- Whether to add the disclaimer to transactional emails is deferred to task-PAY-002 (no email templates exist yet beyond subscribe confirmation).

## §10 - Failure modes inventory

| Failure                                                             | Detection                                                      | Outcome                             | Recovery                                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| New route added without disclaimer                                  | Sitemap-driven e2e iterates live sitemap, not a hardcoded list | Test fails on the new route         | Mount fixed by layout-level rendering; add route to runtime list if non-indexed |
| Exam focused-UI suppresses footer                                   | e2e runtime-routes test                                        | AC 1 fails                          | Mount Disclaimer directly in exam shell                                         |
| "unofficial"/"officially" false positive in guard                   | Unit test asserts word-boundary regex                          | Guard noise, devs bypass it         | Regex `\bofficial\b` etc.; allowlist file for legal strings                     |
| Vendor mark literal added in a component                            | Guard rule B in precommit + CI                                 | Commit blocked                      | Move string into legal.ts or content data                                       |
| Vendor logo committed as inline SVG (no filename match)             | Unit fs scan greps svg text for vendor names; review checklist | Possible miss                       | Guard rule C plus reviewer rule; treat as sev-high fix                          |
| Guard silently dropped from precommit                               | Unit test reads package.json script chain                      | Test fails                          | Restore chain                                                                   |
| OG images regenerated without brand line                            | e2e OG assertion                                               | AC 7 fails                          | Fix og route composition                                                        |
| Title template overridden per-page to bare mark                     | e2e title sweep across sitemap                                 | AC 6 fails                          | Enforce `%s                                                                     | CyberSkill` template usage |
| Disclaimer text edited casually (weakens legal meaning)             | Unit exact-string test                                         | Test fails on wording drift         | Wording changes require deliberate test update (review signal)                  |
| Legal wording needs vendor-specific variants later                  | §1 #10 data-driven map                                         | N/A (designed for)                  | Extend VendorMarkEntry with optional per-vendor disclaimer                      |
| Guard runtime cost grows with repo                                  | Guard is a single fs walk, no deps                             | Precommit slows                     | Scope scan set; keep under 1s budget in CI timing assert                        |
| Question content triggers rule A ("official exam guide" in an item) | src/data exemption covers rule B, rule A scans src/\*\*        | False block on legitimate item text | Extend exemption for rule A to src/data/\*\* (item text quotes vendor docs)     |

## §11 - Implementation notes

- The disclaimer sentence follows the source doc's template verbatim ("independent practice-exam resource... neither affiliated with, nor authorized, sponsored, or approved by") because that phrasing tracks the New Kids third prong and Microsoft's publication-title guidance; do not wordsmith it without re-reading those.
- Keep the guard dependency-free (node:fs walk) so it runs in husky/lint-staged and CI without install cost.
- Brand prominence in the OG card is achieved by composition order and font size in the satori tree - assert on the JSX inputs in tests, not rendered pixels.
- When AWS/Azure vendors land (Phase 2), their guidelines add extra constraints (AWS restricts paid-search use of marks); that belongs to the growth task, not here, but `VENDOR_MARKS` is where their entries go.

_End of task-LEGAL-001._
