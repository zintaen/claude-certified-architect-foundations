---
id: task-LEGAL-002
title: 'ToS with honor code and anti-dumps AUP, privacy policy, cookie consent, refund terms'
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
related_tasks: [task-LEGAL-001, task-PAY-002]
depends_on: []
blocks: [task-OBS-001, task-GROWTH-004]
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - 'Phase 0: honor-code/anti-dumps ToS + AUP; privacy policy + cookie consent + DPA; Vietnam PDP Law (2026-01-01) + Decree 356/2025; GDPR/CCPA scope'
language: typescript 5 (next.js 16, react 19)
service: .
new_files:
  - src/app/terms/page.tsx
  - src/app/privacy/page.tsx
  - src/app/acceptable-use/page.tsx
  - src/app/refunds/page.tsx
  - src/lib/consent.ts
  - src/components/CookieConsent.tsx
  - tests/unit/consent.test.ts
  - tests/e2e/legal-pages.spec.ts
modified_files:
  - src/components/Footer.tsx
  - src/app/layout.tsx
  - src/app/sitemap.ts
  - CHANGELOG.md
effort_hours: 12
subtasks:
  - 'Draft the four policy pages with versioned frontmatter blocks (4h)'
  - 'Consent lib + banner component, SSR-safe (4h)'
  - 'Footer/sitemap wiring + changelog (2h)'
  - 'Unit + e2e tests (2h)'
risk_if_skipped: 'The site collects emails, pin hashes, and exam results globally with no published terms, privacy policy, or consent mechanism, while positioning against dump sites without any enforceable honor code. One GDPR complaint, one Vietnam PDP Law inspection (in force since 2026-01-01), or one user uploading recalled real exam questions with no AUP to point at, and there is no paper shield. The source doc lists data-protection non-compliance as medium likelihood, medium impact, and calls the anti-dumps stance the defining trust axis of the category.'
---

# task-LEGAL-002 - ToS with honor code and anti-dumps AUP, privacy policy, cookie consent, refund terms

## §1 - Description

1. The app MUST gain four server-rendered legal routes: `/terms`, `/privacy`, `/acceptable-use`, `/refunds`. Each page MUST carry a visible version number and effective date, MUST be added to `src/app/sitemap.ts`, and MUST be linked from the footer on every page.
2. `/terms` MUST include an honor-code section in which the user agrees: (a) not to submit, upload, or share content from real, NDA-protected certification exams; (b) not to use the service to violate any exam vendor's candidate agreement; (c) that CyberSkill items are original works derived from public exam blueprints and are provided for preparation, not as reproductions of live exams.
3. `/acceptable-use` MUST prohibit, at minimum: contributing recalled live-exam content ("brain dumps"); scraping, crawling, or bulk-exporting the question bank; automated account creation or credential sharing to defeat access limits; and reselling or republishing item content. It MUST state that violations lead to removal of contributions and loss of access.
4. `/acceptable-use` MUST also carry the content-integrity stance from the plan doc ("original content, not dumps") and name the existing in-product report channel (the question flag / bug reporter) as the way to report an item that resembles live exam content, with a commitment to investigate and pull items pending review.
5. `/privacy` MUST enumerate: the data actually collected today (email, PIN hash, exam sittings and scores, leaderboard entries, newsletter opt-in, operational telemetry), the purpose of each, the storage location, the sub-processor list (Supabase, Vercel; marked extensible for AI providers and a Merchant of Record when those land), retention behaviour, the data-subject rights contact `info@cyberskill.world`, and the governing frameworks in scope: Vietnam PDP Law and Decree 356/2025, GDPR for EU visitors, CCPA/CPRA for California visitors.
6. A consent module `src/lib/consent.ts` MUST expose the current consent state with categories `necessary` (always granted) and `analytics` (default: not granted), persist the choice for at least 12 months, and emit a change event consumers can subscribe to. `src/components/CookieConsent.tsx` MUST render a banner on first visit offering accept / reject of the analytics category with equal visual weight, MUST be keyboard accessible, and MUST NOT block reading the page.
7. Non-essential storage and analytics MUST NOT activate before the `analytics` category is granted. The consent module is the single gate: any current or future analytics integration (task-OBS-001) MUST read it. Rejecting MUST be as durable as accepting.
8. The consent module SHOULD honor the Global Privacy Control signal (`navigator.globalPrivacyControl`) by treating it as a standing rejection of the `analytics` category for that browser.
9. `/refunds` MUST state the current position truthfully: donations are voluntary and non-refundable; no paid products are sold yet; the page structure MUST leave slots for per-SKU refund terms and the EU 14-day withdrawal language that task-PAY-002 will populate. This task MUST NOT invent refund windows for products that do not exist.
10. Policy text changes MUST be versioned: each page renders `version` and `effective` from a typed constant, and every change adds a CHANGELOG.md entry. The initial publication MUST be recorded in CHANGELOG.md.
11. Publishing to production is gated on operator/counsel review: the final human acceptance for this task (ship-tasks `testing -> done` gate) MUST record that a qualified reviewer read the four pages. The agent MUST NOT treat drafted policy text as counsel-approved.
12. This task MUST NOT introduce new PII collection, MUST NOT change existing URLs, and MUST NOT add third-party consent-management scripts (the banner is first-party only).

## §2 - Why this design

**Why an honor code inside ToS rather than a separate pledge (§1 #2)?** The contamination risk in the plan doc is bidirectional: the site must not absorb user-recalled real questions. Making non-contribution of NDA content a term of service creates the contractual basis for removing content and users, and is the documented defense ("we prohibit and remove") if a vendor ever alleges the bank absorbed live content.

**Why a first-party consent module instead of a CMP (§1 #6, #12)?** The site sets one analytics category today. A third-party CMP adds a subprocessor, a script, and a consent-string complexity the site does not need; a typed first-party module is auditable, testable, and sufficient until ad tech (which the plan explicitly avoids) would ever demand TCF strings.

**Why default-deny analytics (§1 #7)?** GDPR consent must be opt-in; PDP Law consent rules are stricter, not looser. Default-deny with a single gate function makes compliance a property of the architecture instead of of every future integration's diligence. task-OBS-001 is written against this gate.

**Why truthful minimal refunds page (§1 #9)?** Inventing refund windows before SKUs exist would create obligations nobody designed. The page exists now because footer/legal completeness and MoR onboarding (Paddle reviews sites for policy pages) both want the URL stable before monetization.

**Why version + effective-date constants (§1 #10)?** Regulators and MoRs ask "which policy version did the user accept". Rendering from typed constants means the accepted version is a build artifact, greppable and diffable, not a CMS mystery.

## §3 - Contract

```typescript
// src/lib/consent.ts
export type ConsentCategory = 'necessary' | 'analytics';
export interface ConsentState {
  necessary: true;
  analytics: boolean;
  decidedAt: string | null; // ISO 8601; null = no choice yet (banner shows)
  version: number; // consent-schema version, bump to re-prompt
}
export function getConsent(): ConsentState; // SSR-safe: returns default on server
export function setConsent(analytics: boolean): void; // persists (cookie, 12-month max-age) + dispatches event
export function onConsentChange(cb: (s: ConsentState) => void): () => void;
export const CONSENT_COOKIE = 'csk_consent'; // first-party, SameSite=Lax

// Policy version constants (one per page)
export interface PolicyMeta {
  version: string;
  effective: string; /* YYYY-MM-DD */
}
```

```text
Routes (all statically renderable, in sitemap, linked from Footer):
  /terms            ToS incl. honor code (§1 #2)
  /privacy          privacy policy (§1 #5)
  /acceptable-use   AUP + content-integrity stance (§1 #3, #4)
  /refunds          donations + future-SKU slots (§1 #9)
Banner: <CookieConsent /> mounted in root layout; hidden once decidedAt != null.
```

## §4 - Acceptance criteria

1. **Four routes live and linked** - `/terms`, `/privacy`, `/acceptable-use`, `/refunds` return 200 server-rendered HTML, appear in the sitemap output, and are linked from the footer of every page (traces_to: §1 #1).
2. **Honor code present** - `/terms` contains the three honor-code commitments (no real-exam content, no candidate-agreement violation, originality statement) (traces_to: §1 #2).
3. **AUP prohibitions present** - `/acceptable-use` names dumps contribution, scraping/bulk export, credential sharing, and resale as prohibited, with consequences (traces_to: §1 #3).
4. **Report channel named** - `/acceptable-use` references the in-product question-report channel and the pull-pending-review commitment (traces_to: §1 #4).
5. **Privacy enumerations complete** - `/privacy` lists every data category from §1 #5, the sub-processor table, the rights contact, and the three legal frameworks (traces_to: §1 #5).
6. **Banner choice is real and durable** - First visit shows the banner; accept and reject are equally prominent; either choice persists across reload and navigation; banner does not reappear (traces_to: §1 #6).
7. **Default-deny gate holds** - Before any choice, and after reject, `getConsent().analytics === false` and a test consumer subscribed via `onConsentChange` never receives `analytics: true` (traces_to: §1 #7).
8. **GPC honored** - With `navigator.globalPrivacyControl = true`, analytics remains false even after the banner would otherwise default-prompt, and the banner reflects the standing rejection (traces_to: §1 #8).
9. **Refunds page truthful** - `/refunds` states donations non-refundable, no paid products yet, and contains the structural slots for PAY-002 without concrete windows (traces_to: §1 #9).
10. **Versioned policies** - Each page renders version + effective date from `PolicyMeta` constants; CHANGELOG.md records the initial publication (traces_to: §1 #10).
11. **Counsel gate recorded** - The task's final-acceptance record includes the reviewer attestation line; spec §9 keeps it visible (traces_to: §1 #11).
12. **No scope creep** - Diff adds no third-party scripts, no new PII fields, no URL changes to existing routes (traces_to: §1 #12).

## §5 - Verification

```typescript
// tests/unit/consent.test.ts (vitest, jsdom)
test('default state: analytics false, decidedAt null'); // AC 7
test('setConsent(true) persists cookie with 12-month max-age'); // AC 6
test('setConsent(false) is durable across getConsent re-reads'); // AC 6, 7
test('onConsentChange fires on change and unsubscribes cleanly'); // AC 7
test('GPC signal forces analytics=false regardless of stored accept'); // AC 8
test('SSR call path returns default state without touching document'); // AC 6 (SSR-safe)
```

```typescript
// tests/e2e/legal-pages.spec.ts (playwright)
test('four legal routes 200 + footer links present on home and exam pages'); // AC 1
test('terms contains honor-code commitments'); // AC 2
test('acceptable-use contains prohibitions + report channel'); // AC 3, 4
test('privacy contains data categories, sub-processors, frameworks, contact'); // AC 5
test('banner: accept persists, reject persists, no reappear after reload'); // AC 6
test('refunds page: donation line present, no invented refund window'); // AC 9
test('policy pages render version + effective date'); // AC 10
// AC 12: asserted by reviewing the diff in code review (no automated proxy) - manual
// verification justified: "no new PII" is a design property of the diff, not a runtime behaviour.
```

## §6 - Implementation skeleton

(API contract above is the skeleton.) Order: consent.ts -> CookieConsent.tsx (client component, reads/writes via lib) -> mount in layout under the Footer -> four policy pages as static content components with `PolicyMeta` headers -> footer link block -> sitemap entries -> CHANGELOG entry -> tests. Policy body text drafts from the plan doc's §B obligations; keep each page's copy in the page file (content-as-code, versioned by git).

## §7 - Dependencies

- Upstream: none. Pairs with task-LEGAL-001 (same footer block; ship in either order).
- Downstream consumers: task-OBS-001 reads `getConsent()/onConsentChange` before activating PostHog; task-PAY-002 populates `/refunds` SKU slots and the EU withdrawal-waiver language, and adds MoR to the sub-processor table; task-SEC-001 references the AUP in abuse responses.
- External: counsel review before production publish (§1 #11) - human gate, no vendor dependency.

## §8 - Example payloads

```json
// csk_consent cookie value (URL-encoded JSON)
{ "necessary": true, "analytics": false, "decidedAt": "2026-07-16T09:00:00Z", "version": 1 }
```

```typescript
export const PRIVACY_META: PolicyMeta = { version: '1.0', effective: '2026-07-16' };
// Sub-processor table rows (privacy page)
// | Supabase | Database and auth storage | US/EU | DPA in place |
// | Vercel   | Hosting and edge network  | US    | DPA in place |
```

## §9 - Open questions

Deferred:

- Counsel review (§1 #11) happens at the final-acceptance HITL gate; if counsel requires wording changes, they land as a revision to this task before `done`. (operator action required)
- Vietnam PDP Law cross-border transfer impact assessment (MPS filing) is an entity-level obligation, not a page on this site; the plan doc assigns it to the corporate track. Flagged so the privacy page's framework list does not imply the filing exists. (operator action, out of repo scope)
- Whether `/refunds` also needs Vietnamese-language terms for the VN entity is deferred to the localization wave (Phase 5).

## §10 - Failure modes inventory

| Failure                                                             | Detection                                                                                | Outcome                    | Recovery                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| Analytics script loads before consent (race)                        | Unit: consumer subscription never sees true pre-choice; e2e network assertion in OBS-001 | GDPR violation window      | Single gate function; OBS-001 integrates via onConsentChange         |
| Banner suppressed by CSS/adblock, user cannot choose                | Default-deny means no choice = no analytics                                              | Safe-by-default            | None needed; banner reappears next visit                             |
| SSR reads document/cookie API and crashes                           | Unit SSR-path test                                                                       | Build/runtime error        | getConsent returns default on server                                 |
| Reject choice stored less durably than accept (dark pattern)        | Unit durability test for both branches                                                   | Compliance + trust failure | Same cookie, same max-age for both                                   |
| GPC ignored                                                         | Unit GPC test                                                                            | CCPA exposure              | §1 #8 standing-rejection logic                                       |
| Policy edited without version bump                                  | e2e version-render test + review rule: PolicyMeta must change with copy                  | Stale version claim        | PR checklist; changelog entry required (§1 #10)                      |
| Sub-processor list drifts from reality (AI provider added silently) | Review rule: infra additions require privacy-page row; §9 note                           | Inaccurate disclosure      | PAY-002/OBS tasks each carry a modified_files entry for privacy page |
| Refund terms invented prematurely                                   | AC 9 asserts absence of concrete windows                                                 | False obligations          | Slots-only structure                                                 |
| Honor code too vague to act on                                      | AC 2 asserts the three concrete commitments                                              | Unenforceable AUP          | Wording pinned by test                                               |
| Consent cookie blocked (cookieless browser)                         | getConsent falls back to in-memory default-deny                                          | Banner every visit         | Acceptable; never grants without persistence                         |
| Legal pages left out of sitemap                                     | e2e sitemap assertion (AC 1)                                                             | Pages undiscoverable       | sitemap.ts entries                                                   |
| Consent schema change re-prompts everyone unintentionally           | version field in ConsentState; unit test on version mismatch path                        | Prompt fatigue             | Bump version only on material change                                 |

## §11 - Implementation notes

- Keep all policy copy in the page files, not a CMS: git is the version history a regulator or MoR reviewer will be shown, and the audit trail is free.
- The banner is deliberately boring: two equal buttons, one sentence, link to /privacy. Consent nudging (pre-ticked, buried reject) is both a GDPR defect and a trust defect in a category whose whole pitch is trustworthiness.
- Paddle's site review (PAY-002) checks for terms/privacy/refunds URLs; keeping these paths stable is why the routes are top-level, not under /legal/\*.
- The AUP's report-channel commitment (§1 #4) doubles as the "canary response" story in SEC-001: the same flag pipeline serves quality and legal takedown response.

_End of task-LEGAL-002._
