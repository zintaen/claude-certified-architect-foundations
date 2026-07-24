# Batch 23 — task-SCALE-001 Localization i18n

**Date:** 2026-07-24  
**Members:** task-SCALE-001 (solo)

## Shipped

- Message catalogs `en.json` / `vi.json` with review header + legal-sensitive flags
- Additive `/vi/...` routes; English root untouched; hreflang + sitemap alternates
- Locale banner (Accept-Language, non-coercive) + footer switcher
- `scripts/translate-locale.mjs` dry-run default; `docs/i18n-playbook.md`
- Analytics `locale` dimension; unit + e2e coverage

## Gates

GREEN (build/lint/test). Playwright i18n e2e green.
