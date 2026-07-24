---
source: task-LEGAL-001
born: 2026-07-24
status: satisfied
last_pass: 2026-07-24
on_violation: report
---

# Goal — task-LEGAL-001 trademark disclaimers

## predicates

- INDEPENDENCE_DISCLAIMER exact wording in src/lib/legal.ts
- Disclaimer mounted site-wide via Footer; exam/flashcards sr-only mount
- TRADEMARK_NOTICE enumerates VENDOR_MARKS; About #trademarks section
- check-brand-terms.mjs in precommit; exits 0 on tree
- no vendor logo/badge assets; titles include CyberSkill
- OG card includes CyberSkill + short independence line
- credential titles sourced via MARK_CCAF_NAME where guard requires

## notes

Rule B focuses on credential titles/codes (not bare "Claude"). Re-run `node scripts/check-brand-terms.mjs`.
