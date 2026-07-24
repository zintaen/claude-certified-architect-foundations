---
id: task-SCALE-004
title: 'Second AI-cert vendor ring (AWS/Azure/Google AI certs) with per-vendor legal configs'
module: SCALE
class: product
priority: SHOULD
status: done
verify: T
phase: P5
milestone: 'P5 · slice 2'
slice: 2
owner: Stephen Cheng
created: 2026-07-17
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-CONTENT-002, task-GROWTH-001]
depends_on: [task-CONTENT-003, task-LEGAL-001]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§D concentric rings: (1) AI certs - Claude, AWS AIF-C01/MLA-C01, Azure AI-900/AI-102, Google Gen AI Leader...; §B per-vendor trademark guidelines converge but differ in detail; CompTIA excluded by pipeline policy'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - docs/blueprints/aws-aif-c01-blueprint.md
  - docs/blueprints/azure-ai-900-blueprint.md
  - docs/blueprints/google-genai-leader-blueprint.md
  - docs/legal/vendor-guidelines.md
  - tools/item-pipeline/configs/aws-aif-c01.json
  - tools/item-pipeline/configs/azure-ai-900.json
  - tools/item-pipeline/configs/google-genai-leader.json
  - tests/integration/vendor-ring2.test.ts
modified_files:
  - src/lib/legal.ts
  - docs/launch-checklist.md
effort_hours: 20
subtasks:
  - 'Per-vendor legal research + vendor-guidelines doc + VENDOR_MARKS entries (6h)'
  - 'Three blueprint snapshots from official exam guides (6h)'
  - 'Pipeline configs + runs + SME cycles (6h in-task; SME time is the pacer)'
  - 'Launch-checklist rows + integration tests (2h)'
risk_if_skipped: "The doc's whole expansion strategy is concentric rings outward from the Claude wedge, and ring two (AWS/Azure/Google AI certs) is where the search volume lives. The platform was built so exam N+1 costs a blueprint, a pipeline run, and a row flip - not exercising that machinery on the highest-demand adjacent certs leaves the multi-vendor thesis unproven and the growth surface single-vendor."
---

# task-SCALE-004 - Second AI-cert vendor ring with per-vendor legal configs

## §1 - Description

1. `docs/legal/vendor-guidelines.md` MUST be authored before any content work: per new vendor (Amazon/AWS, Microsoft, Google), the researched-at-authoring-time summary of their trademark guidance as it applies to this site - plain-text mark rules, prohibited descriptors, disclaimer expectations, and vendor-specific constraints (the doc records AWS restricting trademark paid-search to validated partners; each vendor's current guidance is verified against their live brand pages with retrieval dates, not repeated from the plan doc). Each vendor section ends with the concrete rules the site adopts.
2. `VENDOR_MARKS` (task-LEGAL-001's registry) MUST gain `aws`, `microsoft`, `google` entries with owner names and the exact marks used; the trademark notice, disclaimers, and brand-term guard extend automatically (the data-driven design's payoff - zero component edits). The per-vendor disclaimer line MUST name the right owner per surface (the LEGAL-001 architecture already keys disclaimers by vendor).
3. Ring-2 launch exams are the three highest-leverage AI certs per the doc's ring list: AWS AI Practitioner (AIF-C01), Azure AI Fundamentals (AI-900), Google Gen AI Leader. Blueprint snapshots MUST follow the CONTENT-001 rules (official public exam-guide outlines, source URL, retrieval date, own words, no question text) with facts verified against official vendor pages at authoring time.
4. All three vendors MUST carry `ai_generation_policy: permitted` in their pipeline configs ONLY after the §1 #1 research confirms no CompTIA-style AI-content prohibition exists in their current candidate/content policies; any vendor found to prohibit AI-generated prep content is dropped from this task and recorded (the CONTENT-002 guard then enforces it permanently). CompTIA remains excluded by standing policy.
5. Content MUST flow exclusively through the CONTENT-002 pipeline per exam config (allowlist generation, similarity gate against each vendor's official-sample corpus, SME sign-off, provenance) and launch MUST follow the CONTENT-003 machinery: launch-cohort bootstrap rules, registry-driven pages, per-exam go-live checklist rows, intent pages via the GROWTH-001 threshold gate.
6. Per-vendor similarity corpora MUST be assembled under the CONTENT-001 attestation discipline (official sample questions and public materials only, manifest attestation) before each vendor's pipeline run.
7. The three exams launch free-tier-complete like every exam (free subset, sample pages), with prices/entitlement rows added through the normal PAY machinery when the operator prices them - pricing is not a launch blocker for free surfaces.
8. Integration tests MUST prove the multi-vendor property: a second vendor's exam renders catalog/landing/intent/disclaimer surfaces correctly with zero component changes, guard rules fire for the new marks, and the pipeline configs validate against the schema.
9. This task MUST NOT touch CCAF/Claude surfaces, MUST NOT onboard any vendor with an AI-content prohibition (no exceptions path exists, per CONTENT-002), and MUST NOT expand into non-AI cloud certs (the doc's ring 2 proper - CLF-C02, AZ-900, ACE - is the next wave after these prove out).

## §2 - Why this design

**Why legal research before content (§1 #1, #4)?** The plan doc's vendor-guidance summaries are leads from its research date; trademark and AI-content policies move. Authoring the site's adopted rules per vendor - verified against live guidance, dated - is the same leads-not-facts discipline CONTENT-003 applied to exam logistics, applied to the riskier surface.

**Why these three exams (§1 #3)?** They are the doc's named ring-1-adjacent AI certs with the largest audiences (AWS and Azure fundamentals-level AI certs, Google's Gen AI Leader), all foundational tier - matching the site's proven wedge motion (foundational AI cert, first and free) before professional-tier depth.

**Why this is mostly a content-ops task (§1 #5, #8)?** Waves 1-2 built the machinery precisely so vendor expansion is configs + blueprints + review cycles. The integration test asserting "zero component changes" is the thesis test: if it fails, the platform abstraction failed, and that is worth knowing on exam four rather than exam forty.

## §3 - Contract

```text
docs/legal/vendor-guidelines.md sections per vendor:
  guidance sources (URLs + retrieval dates) | plain-text mark rules adopted |
  prohibited descriptors | disclaimer wording | vendor-specific constraints (e.g. paid-search restriction) |
  AI-content policy finding (permitted/prohibited + source) -> pipeline config value

VENDOR_MARKS additions: aws (Amazon Web Services marks used), microsoft (Azure marks), google (Google Cloud marks)
Pipeline configs: tools/item-pipeline/configs/{aws-aif-c01,azure-ai-900,google-genai-leader}.json
  (CONTENT-002 schema; corpusRef per-vendor attested corpus)
Launch: CONTENT-003 checklist rows per exam; GROWTH-001 intent pages activate via threshold.
```

## §4 - Acceptance criteria

1. **Legal doc first and complete** - vendor-guidelines.md carries all §1 #1 sections per vendor with dated sources; the adopted-rules lists are concrete (traces_to: §1 #1).
2. **Registry extension flows** - The three VENDOR_MARKS entries propagate to trademark notice, per-vendor disclaimers, and guard rules without component edits; guard fires on a new-mark violation fixture (traces_to: §1 #2).
3. **Blueprints verified** - Three snapshots with official source URLs, retrieval dates, verification lines, no question text (traces_to: §1 #3).
4. **AI-policy findings gate configs** - Each config's `ai_generation_policy: permitted` cross-references the doc's finding section; a fixture vendor marked prohibited is refused by the pipeline (existing CONTENT-002 guard re-asserted) (traces_to: §1 #4).
5. **Pipeline-only content + attested corpora** - Served ring-2 items all carry run-manifest provenance and SME approval; each vendor's corpus manifest carries the attestation line (traces_to: §1 #5, #6).
6. **Zero-component multi-vendor proof** - Integration test: a ring-2 exam renders catalog/landing/practice/intent/disclaimer surfaces with no new page components in the diff (traces_to: §1 #5, #8).
7. **Free-tier completeness, pricing decoupled** - Ring-2 exams serve free surfaces without prices rows existing; adding a price row later requires no exam-side change (traces_to: §1 #7).
8. **Fences** - CCAF/Claude surfaces diff-clean; no non-AI cloud certs in configs; no prohibition-vendor onboarding path (traces_to: §1 #9).

## §5 - Verification

```typescript
// tests/integration/vendor-ring2.test.ts (local supabase + fs assertions)
test('vendor-guidelines.md sections + dated sources per vendor'); // AC 1
test('VENDOR_MARKS propagation + guard fixture for new marks'); // AC 2
test('blueprint files: sources, dates, verification lines, no items'); // AC 3
test('config policy cross-refs; prohibited fixture refused'); // AC 4
test('provenance + SME approval query over ring-2 items; corpus attestations'); // AC 5
test('zero-component render walk for a ring-2 exam'); // AC 6
test('free surfaces without prices rows; later price row is additive'); // AC 7
test('diff/grep fences'); // AC 8
```

## §6 - Implementation skeleton

Legal research + vendor-guidelines.md -> VENDOR_MARKS entries -> per-vendor corpora (attested) -> blueprints -> pipeline configs -> runs + SME cycles (the pacer) -> launch-cohort decisions -> checklist rows -> go-live flips -> tests. Run the three vendors' pipelines in parallel once configs land; review queues drain independently.

## §7 - Dependencies

- Upstream: task-CONTENT-003 (launch machinery, registry pages) and task-LEGAL-001 (marks registry, guard) - hard. CONTENT-001/002 discipline and GROWTH-001 intent pages consumed as built.
- Downstream: the true ring 2 (cloud foundational: CLF-C02, AZ-900, ACE) is the next expansion wave, authored after these prove the motion; per-vendor paid-search constraints noted for any future paid-channel task.
- External: official exam guides and brand-guidance pages accessible; SME reviewer capacity across three vendor domains (the honest launch pacer - reviewers must know the subject).

## §8 - Example payloads

```json
// tools/item-pipeline/configs/aws-aif-c01.json (excerpt)
{
  "examCode": "aws-aif-c01",
  "vendor": { "key": "aws", "ai_generation_policy": "permitted" },
  "blueprintDoc": "docs/blueprints/aws-aif-c01-blueprint.md",
  "corpusRef": "corpus-aws-aif-v1",
  "_policy_finding": "docs/legal/vendor-guidelines.md#aws-ai-content-policy"
}
```

## §9 - Open questions

Deferred:

- Per-exam totalItems and SME reviewer sourcing per vendor domain are run-time decisions (same as CONTENT-003).
- Whether Azure AI-102 / AWS MLA-C01 (professional tier) follow immediately is decided on ring-2 traction; the doc's ring list is the menu.
- Anthropic Partner Network pursuit (the doc's open question) is business ops; if it lands, it affects positioning copy, not this machinery.

## §10 - Failure modes inventory

| Failure                                  | Detection                                                            | Outcome                               | Recovery                                    |
| ---------------------------------------- | -------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------- |
| Vendor AI-content prohibition missed     | §1 #1 research + §1 #4 finding gate                                  | CompTIA-class violation               | Drop vendor, record finding, guard enforces |
| Plan-doc guidance repeated as current    | Dated-source requirement AC 1                                        | Stale legal posture                   | Live-verification rule                      |
| New marks bypass the guard               | Propagation fixture AC 2                                             | Descriptor violations for new vendors | Data-driven registry                        |
| Cross-vendor item contamination          | Per-vendor corpora + pipeline allowlists AC 5                        | Wrong-vendor collisions unchecked     | Attested corpus per vendor                  |
| Component fork per vendor                | Zero-component AC 6                                                  | Platform thesis fails silently        | The thesis test                             |
| Launch blocked on pricing                | Decoupling AC 7                                                      | First-and-free window missed          | Free surfaces independent                   |
| SME review bottleneck across domains     | §7 pacer honesty; independent queues                                 | Slow launches                         | Per-exam go-live (CONTENT-003)              |
| Claude surfaces regress during expansion | Fence AC 8                                                           | Core product damage                   | Diff-clean rule                             |
| Non-AI certs smuggled in                 | Fence AC 8                                                           | Ring discipline lost                  | Config inventory check                      |
| Blueprint copies vendor prose            | CONTENT-001 own-words rule AC 3                                      | Copyright exposure                    | Snapshot discipline                         |
| Vendor guidance changes post-launch      | vendor-guidelines.md is dated; SEO-001-style periodic re-verify note | Drift                                 | Re-verification cadence in doc              |
| Paid-search temptation for new marks     | Constraint recorded per vendor AC 1                                  | AWS partner-only rule violated        | Organic-only stance carried forward         |

## §11 - Implementation notes

- Do the AI-content-policy research with primary sources (candidate agreements, content policies) and quote sparingly with citations in the guidelines doc - this is the section a future C&D response reaches for first.
- SME reviewers per domain is the real constraint: an AWS-knowledgeable reviewer for AIF-C01 items is non-negotiable (CONTENT-002's named-human rule does not bend for expansion speed).
- Keep the three launches independent end to end - the first one live captures its window while the others review.

_End of task-SCALE-004._
