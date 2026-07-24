# i18n playbook (SCALE-001)

## First locale choice

**Vietnamese (`vi`)** — home market for CyberSkill (Ho Chi Minh City), founder-reviewable without an external agency, and first on the expansion ladder in the monetization plan.

Rationale: prove the pipeline (catalog → translate script → human `_review` → routed pages → hreflang/SEO) on one locale before multiplying review debt.

## Expansion ladder (documented intent)

`vi → es → pt-BR → hi → id → ja → ko → zh → ar → fr → de`

English remains at root URLs (no `/en/` redirect). Additional locales are additive `/[locale]/...` only.

## Legal-page policy (per locale)

| Locale | Policy                | Notes                                                                                                                                                                   |
| ------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vi`   | `english_with_notice` | Terms / privacy / AUP / refunds stay English with a localized notice until counsel-reviewed translations exist. Recorded in `src/i18n/vi.json` → `_review.legal_pages`. |

Unreviewed machine-translated legal pages **must not ship**. The translate script preserves legal-sensitive keys unchanged.

## Review procedure

1. Run `node scripts/translate-locale.mjs <locale>` (dry-run default; logs `docs/i18n/runs/*`).
2. Optionally `--write` to emit `src/i18n/<locale>.candidate.json`.
3. Human edits the real catalog `src/i18n/<locale>.json`.
4. Set `_review`: `reviewer`, `date` (YYYY-MM-DD), `source_hash` (sha256 of en.json message keys, 16 hex chars — see unit test), `legal_pages`.
5. Gates + `tests/unit/i18n.test.ts` must pass before status `done`.

## Questions in English

Exam **item** content (stems, options, explanations) is **not** localized in this wave. Localized practice surfaces MUST show the `locale.questionsInEnglish` label.

## Compliance strings

Keys listed in `en.json` → `_meta.legalSensitiveKeys` (independence + trademark) are legal-sensitive: reviewers treat them distinctly; machine translation must not silently rewrite them.

## Negotiation UX

- Accept-Language may **suggest** via dismissible banner.
- **No** IP / geo auto-redirect.
- Preference persists in `localStorage`; footer switcher always available.

## Soft coexistence with PAY-002

`formatMoney(locale, amount, currency)` formats when both amount and currency are known; otherwise returns the localized “pricing unavailable” string. No invented prices.
