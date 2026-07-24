# AI tutor (AI-001)

Kill switch: `TUTOR_ENABLED=off` (default) → degraded site-wide. Set `on` only when
provider + budgets are configured.

## Ladder

1. Pregenerated `items.explanations` (no follow-up question)
2. Shared `tutor_cache` keyed by `(item_id, item_version, intent)` — never stores user text
3. Live cheap-model call via `TUTOR_API_URL` (optional HTTP adapter)

## Caps (fail closed)

- Per-request `TUTOR_MAX_OUTPUT_TOKENS`
- Per-user daily tokens/requests (`tutor_usage` + `tutor_try_spend`)
- Global daily USD estimate from ledger × `TUTOR_USD_PER_1K_TOKENS`

## Cache review cadence

Sample 1% of new `tutor_cache` rows weekly; purge on quality flags. Bump
`SYSTEM_PROMPT_VERSION` in `src/lib/tutorPrompt.ts` when the rubric changes.
