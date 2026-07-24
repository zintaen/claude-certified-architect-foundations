# implementation-plan — task-CONTENT-001

1. Types: `src/core/provenance.types.ts` per §3 contract.
2. Blueprint snapshot: `docs/blueprints/ccaf-blueprint.md` — five official domains + weights, scenario→domain map for this mock's four groups, source URL + retrieval date, outline-only (no question text).
3. Corpus: `docs/blueprints/corpus/` with `manifest.md` carrying `legitimate_sources_only: attested by Stephen Cheng 2026-07-24` plus Anthropic-public study material excerpts (agent patterns / tool design concepts — never dumps).
4. Shared bank enumeration helper used by scripts: `scripts/lib/bank-ids.mjs`.
5. Similarity: `scripts/similarity-check.mjs` — norm trigram Jaccard; refuse without attestation; print scores; update records when `--write`.
6. Attestation pass: generate `src/data/provenance.ccaf.json` for all Q* + sample-* ids with retroactive_attestation, mapped blueprint_ref, similarity results.
7. Coverage gate: `scripts/check-provenance.mjs` + wire into `package.json` precommit; add `test` script alias for CyberOS gates.
8. Docs: `docs/PROVENANCE.md` (schema, attestation, similarity method+threshold+human-decides, blueprint-only rule, CONTENT-002 forward requirement).
9. Tests: `tests/unit/provenance.test.ts` covering all named §5 cases.
10. Observability: structured console logs from gate/similarity scripts (`event`, `item_count`, `fail_count`); no app telemetry (metadata-only task).

Edge-case coverage: EC-01..EC-12 addressed by gate, schema tests, similarity refuse path, grep test, determinism test.
