---
id: task-GROWTH-005
title: 'Lifecycle email: retention sequences and multi-cert nudges'
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
related_tasks: [task-LEGAL-002, task-PAY-002]
depends_on: [task-OBS-001, task-PAY-001]
blocks: []
source_pages:
  - docs/tasks/_sources/expansion-monetization-plan.md
source_decisions:
  - '§E: email/newsletter for retention, referral programs, and multi-cert journey nudges to counter post-pass churn; risk register: post-pass churn - High likelihood'
language: typescript 5 (next.js 16, react 19) + postgres (supabase)
service: .
new_files:
  - src/lib/email.ts
  - src/lib/sequences.ts
  - src/emails/README.md
  - scripts/run-email-queue.mjs
  - supabase/migrations/20261020000000_email_sends.sql
  - tests/unit/sequences.test.ts
  - tests/integration/email.test.ts
modified_files:
  - src/app/api/subscribe/route.tsx
  - src/app/privacy/page.tsx
  - src/lib/analytics.ts
effort_hours: 14
subtasks:
  - 'Provider adapter + suppression/unsubscribe plumbing (4h)'
  - 'Sequence engine (trigger rules over events, quiet, idempotent) (5h)'
  - 'Template set (in-repo) + queue runner + privacy row + tests (5h)'
risk_if_skipped: "Post-pass churn is the doc's High-likelihood market risk and email is the only owned channel to counter it. The list OBS-001 grows has no lifecycle behind it: nobody gets the exam-week nudge, the post-pass 'your skills transfer to CCDV-F' journey, or the win-back - the retention mechanics the doc prescribes stay unsent."
---

# task-GROWTH-005 - Lifecycle email: retention sequences and multi-cert nudges

## §1 - Description

1. `src/lib/email.ts` MUST be a provider-pluggable adapter (config-selected transactional provider; env keys; sandbox mode for tests) with a hard rule: no email sends without going through it. It MUST no-op cleanly when unconfigured and MUST support a global `EMAIL_ENABLED=off` kill switch.
2. Consent boundaries are absolute: lifecycle emails go only to `subscribers` (the existing opt-in list) and, for transactional-adjacent messages (receipt-like, plan reminders the user explicitly enabled), to users who took the triggering action. Every marketing email MUST carry one-click unsubscribe (list-unsubscribe header + link) that suppresses immediately and permanently; a migration adds `email_sends` (append-only send log: recipient, template, sequence, sent_at, message id) and `email_suppressions` (email, reason, created_at). Suppressed addresses MUST be excluded at the queue level, not per-template.
3. `src/lib/sequences.ts` MUST define sequences as declarative rules over existing signals (OBS-001 events, sittings, subscriber source, entitlements): `welcome` (post-subscribe), `first_mock_nudge` (subscribed but no mock within N days), `exam_week` (user-declared exam date approaching - only where a study plan or profile date exists), `post_pass_multi_cert` (passed mock streak/self-reported pass -> related-cert journey nudge, the doc's churn counter), `win_back` (inactive N weeks). Sequence timing values are config; each rule documents its trigger, audience, and exit conditions in the module.
4. Sending MUST be idempotent and bounded: the queue runner (`scripts/run-email-queue.mjs`, cron-invoked, dry-run default) computes due sends from rules + send log, never re-sends the same (recipient, template) pair, respects a global daily send cap and per-recipient frequency cap (config), and stops on provider errors rather than retrying into a spam pattern.
5. Templates MUST live in-repo (`src/emails/`, typed builders; plain text + simple HTML), carry the independence disclaimer and physical/contact footer per anti-spam norms, pass the no-dark-pattern lint (no fake urgency), and follow the humble-claims register. The multi-cert nudge template MUST recommend by real catalog adjacency (same vendor/track from the registry), not hardcoded exam names.
6. The privacy page MUST gain the email-provider sub-processor row, and the subscribe flow's copy MUST say what the list receives (this task's sequences) - consent honesty at capture time.
7. Observability + analytics: send/suppress/bounce counters via OTel; `email_sent` / `email_unsubscribed` events in the OBS-001 map (template + sequence keys only, hashed recipient) - open/click tracking is NOT added (tracking pixels contradict the site's privacy posture; provider-side aggregate stats suffice).
8. This task MUST NOT send to non-consented addresses (no "we noticed you practiced" to bare exam-takers who never subscribed), MUST NOT add tracking pixels or link-decoration beyond UTM source tags, and MUST NOT implement PAY-002's transactional purchase receipts (the MoR sends those).

## §2 - Why this design

**Why rules over events instead of a marketing-automation platform (§1 #3)?** The signals (activation, passes, inactivity) already exist in-repo with tested definitions. A declarative rule layer over them keeps one truth for "what happened", avoids a new PII-holding subprocessor beyond the send API, and keeps sequences reviewable in a diff.

**Why no open/click pixels (§1 #7)?** The site's whole posture (default-deny analytics, PII-minimal) would be contradicted by beacon tracking in inboxes. Provider aggregate deliverability stats cover operational needs; conversion is measured on-site via UTM source, which is honest and sufficient.

**Why queue-level suppression and idempotency (§1 #2, #4)?** Per-template unsubscribe checks eventually miss one; suppression at the queue boundary makes compliance structural. The send log's (recipient, template) uniqueness converts "did we already nudge them" from memory into data - the same discipline as every other append-only ledger in this backlog.

**Why the MoR keeps receipts (§1 #8)?** Paddle is seller of record; its receipts are the legally load-bearing ones. Duplicating them creates confusion and compliance surface for zero value.

## §3 - Contract

```typescript
// src/lib/email.ts (server-only)
export function send(input: {
  to: string;
  template: TemplateKey;
  data: object;
}): Promise<SendResult>;
export function suppress(
  email: string,
  reason: 'unsubscribe' | 'bounce' | 'complaint'
): Promise<void>;
export function isSuppressed(email: string): Promise<boolean>;

// src/lib/sequences.ts
export interface SequenceRule {
  key: string;
  trigger: TriggerSpec;
  audience: 'subscribers' | 'action_takers';
  template: TemplateKey;
  exit: ExitSpec;
  waitDays: number;
}
export const SEQUENCES: SequenceRule[]; // the five §1 #3 sequences, config timings
export function dueSends(now: Date): Promise<{ to: string; template: TemplateKey; data: object }[]>;
export const EMAIL_CONFIG: { dailyCap: number; perRecipientPerWeek: number };
```

```text
scripts/run-email-queue.mjs   dry-run default (prints due sends); --execute sends via adapter
email_sends: append-only log, unique (recipient, template); email_suppressions checked in dueSends
Templates: src/emails/*.tsx builders -> text+html; disclaimer + footer + lint compliance
```

## §4 - Acceptance criteria

1. **Adapter discipline** - All sends flow through email.ts (grep single-import); unconfigured = safe no-op; kill switch stops the queue (traces_to: §1 #1).
2. **Consent boundaries hold** - dueSends never yields a non-subscriber for marketing sequences; action-taker sequences fire only on the triggering action fixture; a bare exam-taker never appears (traces_to: §1 #2, #8).
3. **Unsubscribe immediate and structural** - One-click unsubscribe suppresses; suppressed address excluded from every subsequent dueSends regardless of template; list-unsubscribe header present (traces_to: §1 #2).
4. **Idempotent + bounded** - Double-running the queue produces zero duplicate sends; daily and per-recipient caps enforced; provider-error fixture halts the run (traces_to: §1 #4).
5. **Sequences fire per rules** - Fixtures for each of the five sequences: trigger, wait, exit conditions honored (for example first_mock_nudge exits when a mock is completed before send) (traces_to: §1 #3).
6. **Multi-cert nudge is registry-driven** - The post-pass template recommends catalog-adjacent exams for a fixture pass; adding a fixture exam changes recommendations without template edits (traces_to: §1 #5).
7. **Template compliance** - Templates carry disclaimer + footer, pass the dark-pattern lint and humble-claims lint (traces_to: §1 #5).
8. **Privacy honesty** - Privacy page carries the provider row; subscribe copy states what the list receives (traces_to: §1 #6).
9. **Observability, no pixels** - Counters emit; events carry template/sequence keys with hashed recipient; grep proves no tracking-pixel/beacon markup in templates (traces_to: §1 #7).

## §5 - Verification

```typescript
// tests/unit/sequences.test.ts (vitest)
test('five sequences: trigger/wait/exit fixtures'); // AC 5
test('dueSends: consent boundaries, suppression exclusion, caps'); // AC 2, 3, 4
test('multi-cert adjacency from catalog fixture'); // AC 6
test('templates: disclaimer/footer/lints, no pixel markup'); // AC 7, 9

// tests/integration/email.test.ts (local supabase, sandbox adapter)
test('grep single-import; no-op unconfigured; kill switch'); // AC 1
test('idempotent double-run; provider-error halt'); // AC 4
test('unsubscribe -> immediate suppression + header present'); // AC 3
test('send log rows + counters + event payload scan'); // AC 9
test('privacy row + subscribe copy'); // AC 8 (fs/e2e)
```

## §6 - Implementation skeleton

Adapter + suppression plumbing -> migration -> sequence rules over existing signal queries -> template builders -> queue runner -> subscribe-copy + privacy row -> counters/events -> tests. Wire the cron (Vercel cron or equivalent) at deploy; the runner is environment-agnostic.

## §7 - Dependencies

- Upstream: task-OBS-001 (signal definitions, subscribe flow) and task-PAY-001 (entitlement signals for sequence exits) - hard. task-LEGAL-002's privacy page receives the row; task-PAY-002's receipts explicitly out of scope.
- Downstream: none.
- External: transactional email provider account + domain auth (SPF/DKIM) - operator setup, documented in src/emails/README.md.

## §8 - Example payloads

```json
// email_sends row
{
  "recipient": "hash-or-email-per-storage-policy",
  "template": "post_pass_multi_cert",
  "sequence": "post_pass_multi_cert",
  "sent_at": "2026-10-22T09:00:00Z",
  "message_id": "prov-abc123"
}
```

## §9 - Open questions

Deferred:

- Sequence timing values (nudge days, win-back weeks) and caps are operator config at launch, tuned from unsubscribe/conversion data.
- Provider choice is config (adapter interface fixed); domain-auth setup is the operator step in the README.
- Whether exam_week uses study-plan dates only or adds a profile field is decided when LEARN-004 ships; the rule degrades to plan-holders-only until then.

## §10 - Failure modes inventory

| Failure                                    | Detection                        | Outcome                            | Recovery                         |
| ------------------------------------------ | -------------------------------- | ---------------------------------- | -------------------------------- |
| Marketing sent to non-consented users      | Consent-boundary AC 2            | Spam complaints, PDP/GDPR exposure | Audience allowlists in rules     |
| Unsubscribe honored per-template only      | Queue-level suppression AC 3     | Continued sends post-opt-out       | Structural exclusion             |
| Queue double-run spams the list            | Idempotency AC 4                 | Reputation damage                  | (recipient, template) uniqueness |
| Runaway send loop                          | Daily cap + error-halt AC 4      | Provider block, domain burn        | Bounded runner                   |
| Tracking pixels contradict privacy posture | Grep AC 9                        | Trust/compliance dissonance        | No-pixel rule                    |
| Nudges with fake urgency                   | Lint AC 7                        | Trust erosion                      | Shared dark-pattern lint         |
| Multi-cert nudge hardcodes exams           | Registry-driven AC 6             | Stale recommendations              | Catalog adjacency                |
| Provider outage mid-run                    | Error-halt + resumable log       | Partial batch                      | Idempotent re-run                |
| Bounces/complaints ignored                 | suppress(reason) path + counters | Deliverability decay               | Webhook/manual suppression feed  |
| Receipts duplicated vs MoR                 | Fence §1 #8                      | Buyer confusion                    | MoR-owns-receipts rule           |
| Sequence exit missed (nudge after action)  | Exit-condition fixtures AC 5     | Tone-deaf emails                   | Exit specs per rule              |
| Send log grows unbounded                   | Append-only + time; ops note     | Storage creep                      | Archive window (ops, later)      |

## §11 - Implementation notes

- Store recipient in the send log per the privacy policy's storage commitments - if hashing is chosen, keep a deterministic hash so idempotency still works; document the choice in the README and privacy page consistently.
- The five sequences are deliberately few; every additional sequence is a diff with a rule block, which is the review surface working as intended.
- UTM tags on links (source=email, sequence key) are the only measurement decoration - conversion reads on-site via OBS-001.

_End of task-GROWTH-005._
