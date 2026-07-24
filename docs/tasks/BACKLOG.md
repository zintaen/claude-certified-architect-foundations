# claude-certified-architect-foundations task backlog

Source of truth for task state = each task's frontmatter `status`. This file indexes them.
ONE backlog for ALL work: net-new features (`class: product`, the default) and
hardening/refactor/audit-remediation (`class: improvement`) live here together —
improvement is not a separate track and never gets a second backlog file. Tag
improvement rows with `(improvement)`; untagged rows are product.

task files live under `docs/tasks/`: flat (`TASK-001-slug.md`) for small
repos, or grouped in subfolders by module for larger ones. `improvement/` is a
normal subfolder there for cross-cutting hardening tasks.

The `ship-tasks` workflow reads this file, picks the first eligible task
(`ready_to_implement` with all `depends_on` done), and drives it through the
lifecycle. HITL is required: the agent halts at review acceptance and final
acceptance for a recorded human verdict, and never sets `done` itself.

Lifecycle: draft -> ready_to_implement -> implementing -> ready_to_review -> reviewing ->
ready_to_test -> testing -> done. Off-ramps: on_hold, closed. See
`.cyberos/cuo/STATUS-REFERENCE.md`.

## ready_to_implement

- [ready_to_implement] task-PAY-002-mor-checkout-ppp - Paddle MoR checkout, dual-tier PPP pricing, anti-VPN gating, EU withdrawal compliance
- [ready_to_implement] task-SCALE-003-b2b-seats - B2B team seats and seat management

## in flight

- (none)

## done

- [done] task-SCALE-004-ai-cert-vendor-ring2 - Second AI-cert vendor ring (AWS/Azure/Google AI certs) with per-vendor legal configs
- [done] task-SCALE-002-mobile-pwa - Mobile PWA: installability and offline practice (web-first doctrine)
- [done] task-SCALE-001-localization-i18n - i18n infrastructure and first locale wave (UI/marketing first)
- [done] task-LEARN-005-custom-exams - Custom practice exam builder
- [done] task-LEARN-004-ai-study-plans - Personalized study plans, pre-generated at build time
- [done] task-LEARN-003-spaced-repetition - Spaced-repetition review scheduling (FSRS) for items and flashcards
- [done] task-LEARN-002-adaptive-drilling - Adaptive weak-area drilling over calibrated items
- [done] task-LEARN-001-readiness-score-analytics - Exam-readiness score and premium performance analytics
- [done] task-GROWTH-005-lifecycle-email - Lifecycle email: retention sequences and multi-cert nudges
- [done] task-GROWTH-004-community-explanations - Community explanations with moderation and AUP enforcement
- [done] task-GROWTH-003-referral-program - Referral program with entitlement-day rewards
- [done] task-GROWTH-002-aeo-geo - AEO/GEO: citability in AI assistants and answer engines
- [done] task-GROWTH-001-programmatic-seo - Programmatic SEO pages over the exam/item model with indexation rules
- [done] task-AI-001-tutor-cost-capped - Live AI tutor with hard per-user cost caps
- [done] task-SEO-001-migration-seo-preservation - SEO-preserving cutover: URL contract, 301s, canonicals, rank monitoring
- [done] task-PAY-001-entitlements-free-premium - Entitlement model and free/premium feature gating (ships dark)
- [done] task-DATA-002-user-data-migration - Zero-downtime migration preserving accounts, streaks, history, donations
- [done] task-SEC-001-anti-scraping-baseline - Anti-scraping and abuse defenses for the item bank (improvement)
- [done] task-OBS-001-analytics-email-capture - PostHog product analytics baseline and email capture
- [done] task-LEGAL-002-tos-privacy-compliance - ToS with honor code and anti-dumps AUP, privacy policy, cookie consent, refund terms
- [done] task-LEGAL-001-trademark-disclaimers - Trademark disclaimers and independent positioning on every exam surface
- [done] task-CONTENT-003-claude-cert-catalog - Ship all four Anthropic Claude certification exams on the multi-exam platform
- [done] task-CONTENT-002-item-generation-pipeline - Blueprint-driven AI item pipeline with provenance, similarity gate, SME sign-off, beta fielding
- [done] task-DATA-001-multi-exam-data-model - Multi-vendor multi-exam data model with RLS on Supabase
- [done] task-CONTENT-001-item-provenance-log - Retroactive provenance documentation for the existing CCAF item bank (improvement)

## on_hold / closed

- (deferred or killed tasks)
