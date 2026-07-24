# repo-context-map — task-CONTENT-001

## Task domain

Provenance metadata for the CCAF item bank. Metadata-only; no item content edits.

## Existing patterns

- Domain labels / official pass mark: `src/lib/domains.ts` (`DOMAINS`, `OFFICIAL_BLUEPRINT`)
- Mock bank (60 items, ids `Q1`…`Q60`): `src/data/questions.public.ts` via `src/data/questions.ts`
- Full key (server-only): `src/data/questions.server.ts` (not enumerated for provenance ids — public ids are canonical)
- Sample SEO bank (5×4 domains, no stable ids): `src/data/sampleQuestions.ts`
- Unit tests: vitest, `tests/*.test.ts`, config `vitest.config.ts`
- Precommit: `package.json` → `eslint src && prettier --check`
- Scripts live at repo root `scripts/` (currently `indexnow.mjs` only)

## Outside-domain files this task would touch

1. `package.json` (precommit + test alias) — declared in frontmatter
2. (none beyond declared cone)

`files_outside_immediate_domain` = 0 beyond declared `modified_files`. ADR not required (< 3).

## Constraints from patterns

- Do not mutate `questions*.ts` / `sampleQuestions.ts` content (AC 8).
- Sample items lack `id` fields → synthetic stable ids `sample-<domain>-NN` derived by enumeration order.
- Gate scripts must be plain Node `.mjs` (no TS build step in precommit).
- Records must stay out of `src/app/**` (AC 9).
