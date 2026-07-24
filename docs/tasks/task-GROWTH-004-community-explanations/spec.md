---
id: task-GROWTH-004
title: 'Community explanations with moderation and AUP enforcement'
module: GROWTH
class: product
priority: SHOULD
status: done
verify: T
phase: P4
milestone: 'P4 · slice 2'
slice: 2
owner: Stephen Cheng
created: 2026-07-17
shipped: 2026-07-24
memory_chain_hash: null
related_tasks: [task-CONTENT-001, task-SEC-001]
depends_on: [task-DATA-001, task-LEGAL-002]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§C free tier includes community explanations; §D community: user-generated explanations drive retention and double as a bad-question QA loop; trust signals: community reporting/flagging'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/community.ts
  - src/app/api/community/explanations/route.ts
  - scripts/moderate-explanations.mjs
  - supabase/migrations/20261015000000_community_explanations.sql
  - tests/unit/community.test.ts
  - tests/integration/community.test.ts
modified_files:
  - src/app/result/page.tsx
  - src/lib/analytics.ts
  - src/app/acceptable-use/page.tsx
effort_hours: 16
subtasks:
  - 'Schema + submission path with untrusted handling (5h)'
  - 'Moderation queue (CLI) + contamination screen (5h)'
  - 'Display + votes + flags on result surfaces (4h)'
  - 'Tests (2h)'
risk_if_skipped: "Community explanations are in the doc's FREE tier definition - they are the free tier's answer to premium AI explanations and the named bad-question QA loop. Without them, free users get bare correct/incorrect forever, the flag pipeline the AUP promises has no companion contribution loop, and the community moat the doc wants (UGC + retention) never starts compounding."
---

# task-GROWTH-004 - Community explanations with moderation and AUP enforcement

## §1 - Description

1. A migration MUST add `community_explanations` (`id`, `item_id`, `item_version`, `author_user_id`, `body` text bounded by config length, `status` `pending` | `approved` | `rejected` | `removed`, `moderation_note`, timestamps) and `explanation_votes` (`explanation_id`, `voter_user_id`, `value` +1 only, unique per voter). RLS on, no anon policies; all access via the server layer.
2. Submission MUST be available to identified users post-grade on a question they answered (skin-in-the-game gate: no drive-by submissions on unanswered items), one pending submission per user per item, length-bounded, rate-limited via SEC-001's `write` class.
3. Every submission MUST be treated as untrusted content end to end: stored verbatim, rendered with full sanitization (no HTML/markdown execution beyond a safe subset), never fed into any LLM prompt, pipeline, or item content, and displayed inside a visually distinct "community" frame with author handle and date. Community text MUST NOT enter `items`, `items.explanations`, or any CONTENT-002 path - the contamination firewall is absolute.
4. Nothing publishes without moderation: submissions land `pending` and appear publicly only after operator approval via `scripts/moderate-explanations.mjs` (list/approve/reject with note, dry-run default, decisions appended to the row). The moderation procedure MUST include the contamination screen: submissions that appear to recall real exam content ("on the actual exam...", verbatim-question patterns) are rejected per the AUP, the item they attach to gets flagged into the CONTENT-001 disposition flow for review, and the AUP page's report-channel section MUST be updated to mention the community-explanation path.
5. Approved explanations MUST render on post-grade result/review surfaces beneath the official feedback, free tier included (this is the doc's free-tier community value), ordered by votes then recency; premium users see them alongside AI explanations. Upvotes require an identified user; flag-for-review exists on every approved explanation and routes to the moderation queue.
6. Contributor recognition MUST be lightweight and non-monetary: approved-count on the author's dashboard; no reputation currency, no rewards coupling (referral rewards stay separate - mixing UGC and rewards buys spam).
7. Moderation observability: queue depth, approval/rejection counts, and flag rates emit as OTel counters; a queue-depth threshold reminder is documented in the moderation script's header (operator cadence, not automation theater).
8. Analytics: `community_explanation_submitted` / `_approved` / `_flagged` extend the OBS-001 map (item ids hashed; no body text in properties).
9. This task MUST NOT auto-approve via any classifier (human moderation only at this scale), MUST NOT let community content into prompts or the item pipeline, and MUST NOT gate community explanations behind premium.

## §2 - Why this design

**Why the skin-in-the-game submission gate (§1 #2)?** Explanations from people who just answered the question are the doc's QA loop working as designed; open submission invites spam and SEO-link droppers. Answering first is a natural quality filter that costs legitimate contributors nothing.

**Why the absolute contamination firewall (§1 #3)?** Community text is the one surface where NDA-violating recalled exam content can enter the site through well-meaning users - the exact CompTIA-warned pathway. Keeping UGC out of items, prompts, and the pipeline makes contamination-by-contribution structurally impossible; the moderation screen plus AUP rejection handles the display-side risk.

**Why human-only moderation (§1 #4, #9)?** At current scale the queue is small, and an auto-approve classifier would be the system deciding what legal risk to publish. The named-human decision with a recorded note is the defensible posture; automation is a future problem worth having.

**Why free-tier display (§1 #5)?** The doc's freemium line puts community explanations in the free core deliberately: they preserve free-tier goodwill while premium sells the AI depth. Gating them would cannibalize the community's reason to contribute.

## §3 - Contract

```typescript
// src/lib/community.ts (server-only)
export function submitExplanation(input: {
  userId: string;
  itemId: string;
  body: string;
}): Promise<'pending' | 'rejected_not_answered' | 'rejected_duplicate' | 'rejected_length'>;
export function approvedFor(itemId: string): Promise<CommunityExplanation[]>; // votes desc, recency
export function vote(explanationId: string, voterUserId: string): Promise<void>; // +1, once
export function flag(explanationId: string, userId: string, reason: string): Promise<void>; // -> pending review
export const COMMUNITY_CONFIG: { maxBodyChars: number };
```

```text
scripts/moderate-explanations.mjs  list | approve <id> [--note] | reject <id> --note  (dry-run default)
Contamination screen procedure in script header: recall-pattern rejection -> AUP citation ->
item flagged into CONTENT-001 disposition flow.
Display: result/review surfaces, community frame, votes + flag affordance; free tier included.
```

## §4 - Acceptance criteria

1. **Schema + gates** - Submission requires having answered the item; one pending per user per item; length bound enforced; rate-limited (traces_to: §1 #1, #2).
2. **Firewall absolute** - Grep/import tests prove community tables are read only by community.ts and never by sittings/pipeline/tutor paths; render path sanitizes (XSS fixture neutralized); no community text reaches any prompt assembly (traces_to: §1 #3).
3. **Nothing publishes unmoderated** - Pending items invisible publicly; approval via script (dry-run default) flips visibility; rejection records the note (traces_to: §1 #4).
4. **Contamination screen wired** - A recall-pattern fixture rejection cites the AUP and flags the item into the CONTENT-001 disposition path; AUP page mentions the channel (traces_to: §1 #4).
5. **Free display + ordering** - Approved explanations render post-grade for free users, votes-then-recency; premium sees them alongside AI explanations (traces_to: §1 #5).
6. **Votes + flags** - One vote per user enforced; flagging returns an approved item to review and hides is-not required (stays visible pending re-review, recorded) - behaviour per config documented; recognition count on dashboard (traces_to: §1 #5, #6).
7. **Observability + events** - Moderation counters emit; analytics events carry hashed ids, no body text (traces_to: §1 #7, #8).
8. **Fences** - No auto-approval path exists; no premium gate on community display; no rewards coupling (traces_to: §1 #6, #9).

## §5 - Verification

```typescript
// tests/unit/community.test.ts (vitest)
test('submission gates: unanswered, duplicate, length'); // AC 1
test('sanitization: XSS fixture neutralized in render model'); // AC 2
test('vote uniqueness; flag routes to review'); // AC 6

// tests/integration/community.test.ts (local supabase)
test('pending invisible; script approve/reject with notes, dry-run default'); // AC 3
test('recall-pattern fixture: reject + AUP cite + item disposition flag'); // AC 4
test('free-tier display, ordering, premium coexistence'); // AC 5
test('firewall greps: no community reads outside community.ts; no prompt reach'); // AC 2
test('counters + event payload scan'); // AC 7
test('fences: no auto-approve, no premium gate, no reward coupling'); // AC 8
```

## §6 - Implementation skeleton

Migration -> community.ts (gated submission, sanitized render model, votes/flags) -> moderation script with contamination-screen procedure -> result/review display blocks -> AUP page mention -> counters + events -> tests.

## §7 - Dependencies

- Upstream: task-DATA-001 (items, users, sittings for the answered-gate) and task-LEGAL-002 (AUP as the enforcement basis) - hard. SEC-001 limiter reused; CONTENT-001 disposition flow receives contamination flags.
- Downstream: none in this wave; a web moderation UI is future ergonomics when queue depth demands it.
- External: operator moderation time (the real cost; the script keeps it minutes per day at current scale).

## §8 - Example payloads

```json
// community_explanations row (pending)
{
  "item_id": "b1c2...",
  "item_version": 2,
  "author_user_id": "9b...",
  "body": "B fails because the context window is per-conversation...",
  "status": "pending"
}
```

## §9 - Open questions

Deferred:

- `maxBodyChars` and flag re-review behaviour (hide-on-flag vs stay-visible) are config decisions at implementation, documented in the module header.
- Threaded replies/discussion are deliberately out (that is a forum; Discord carries discussion per the doc) - revisit only with evidence of demand.

## §10 - Failure modes inventory

| Failure                                         | Detection                                             | Outcome                                     | Recovery                                           |
| ----------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| Recalled exam content published                 | Moderation gate AC 3 + contamination screen AC 4      | NDA-content hosting - the existential class | Human review; AUP rejection; item disposition flag |
| Community text enters pipeline/prompts          | Firewall greps AC 2                                   | Contamination via UGC                       | Structural isolation                               |
| XSS via explanation body                        | Sanitization AC 2                                     | Script injection                            | Safe-subset rendering                              |
| Spam/link-drop submissions                      | Answered-gate AC 1 + rate limits                      | Queue pollution                             | Skin-in-the-game + SEC-001                         |
| Vote brigading                                  | One-vote uniqueness AC 6; velocity via limiter        | Ranking manipulation                        | Identified-voter rule                              |
| Moderation queue rots                           | Depth counter AC 7 + cadence note                     | Contributor discouragement                  | Operator reminder; future UI trigger               |
| Auto-approve creep                              | Fence AC 8                                            | Unreviewed legal risk published             | Human-only rule                                    |
| Community gated premium by mistake              | Fence AC 8                                            | Free-tier value broken, doc violated        | Free display tested                                |
| Rewards coupling invites spam                   | Fence AC 8                                            | UGC farming                                 | Recognition-only rule                              |
| Body text leaks to analytics                    | AC 7 scan                                             | Content in analytics store                  | Hashed-id events                                   |
| Explanation outlives item revision misleadingly | item_version recorded; display notes version mismatch | Stale advice                                | Version-aware display                              |
| Author PII in handles                           | Handle = display name policy; no emails rendered      | PII exposure                                | Render-model rule                                  |

## §11 - Implementation notes

- The contamination screen is judgment, not regex: the script surfaces candidates (recall-pattern heuristics highlight), the human decides. Heuristics live in the script, the decision stays named.
- Keep the community frame visually unmistakable (border, label, author, date) - the trust posture depends on users never confusing UGC with CyberSkill's reviewed content.
- The answered-gate query reuses the sittings/responses layer; no new ability surface.

_End of task-GROWTH-004._
