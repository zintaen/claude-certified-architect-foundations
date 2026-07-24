# Batch 17 — task-GROWTH-005 Lifecycle email

**Date:** 2026-07-24  
**Members:** task-GROWTH-005 (solo)

## Shipped

- email.ts adapter (kill switch, suppression, List-Unsubscribe, sandbox/resend/postmark)
- sequences.ts (5 rules + evaluateDue + catalog adjacency)
- templates + README; email_sends / email_suppressions migration
- /api/email/unsubscribe; run-email-queue.mjs (dry-run default, halt on error)
- Privacy sub-processor row; subscribe copy honesty

## Gates

GREEN.

## Operator-gated

- EMAIL_ENABLED=on + provider keys + domain auth before real sends
