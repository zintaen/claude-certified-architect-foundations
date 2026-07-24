# Lifecycle email (GROWTH-005)

## Operator setup

1. Set `EMAIL_ENABLED=on` only when domain auth (SPF/DKIM) is ready.
2. Choose provider: `EMAIL_PROVIDER=sandbox|resend|postmark` + `EMAIL_API_KEY`.
3. `EMAIL_FROM`, `EMAIL_REPLY_TO`, `NEXT_PUBLIC_SITE_URL`.
4. Cron `node scripts/run-email-queue.mjs` daily; use `--execute` in production after dry-run review.

## Privacy

- Recipients are hashed (`recipient_hash`) for idempotency; plaintext email is stored in `email_sends.recipient` for deliverability ops and must match the privacy policy retention.
- No open/click tracking pixels. UTM tags on links only.
- Unsubscribe: `/api/email/unsubscribe` → `email_suppressions` (immediate, permanent).

## Sequences

See `src/lib/sequences.ts` — welcome, first_mock_nudge, exam_week, post_pass_multi_cert, win_back.

## MoR receipts

Purchase receipts stay with Paddle (PAY-002). This module never duplicates them.
