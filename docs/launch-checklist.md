# Launch checklist — multi-exam go-live (CONTENT-003)

Per-exam gate. Flip `exams.status` from `draft` → `live` only when every cell is checked.
Exams launch independently; nothing couples the three new Claude credentials.

| Exam                | Blueprint verified       | Pipeline run manifest                                      | SME approved count               | Launch cohort decision                        | Disclaimers render     | Contract + sitemap     | Analytics `exam_code` | LIVE date                                  |
| ------------------- | ------------------------ | ---------------------------------------------------------- | -------------------------------- | --------------------------------------------- | ---------------------- | ---------------------- | --------------------- | ------------------------------------------ |
| ccaf                | 2026-07-24 (re-verified) | legacy bank + CONTENT-001 provenance                       | n/a (legacy)                     | n/a                                           | site-wide              | ok                     | legacy events         | LIVE (existing)                            |
| ccao-f              | 2026-07-24               | `tools/item-pipeline/runs/launch-ccao-f.json`              | see manifest                     | recorded in `docs/launch/ccao-f-decision.md`  | IndependenceDisclaimer | urlContract + sitemap  | trackFunnel           | LIVE 2026-07-24                            |
| ccdv-f              | 2026-07-24               | `tools/item-pipeline/runs/launch-ccdv-f.json`              | see manifest                     | recorded in `docs/launch/ccdv-f-decision.md`  | IndependenceDisclaimer | urlContract + sitemap  | trackFunnel           | LIVE 2026-07-24                            |
| ccar-p              | 2026-07-24               | `tools/item-pipeline/runs/launch-ccar-p.json`              | see manifest                     | recorded in `docs/launch/ccar-p-decision.md`  | IndependenceDisclaimer | urlContract + sitemap  | trackFunnel           | LIVE 2026-07-24                            |
| aws-aif-c01         | 2026-07-24               | `tools/item-pipeline/runs/launch-aws-aif-c01.json`         | see manifest (PIPELINE_SME_AUTO) | `docs/launch/aws-aif-c01-decision.md`         | vendor=aws             | registry → urlContract | trackFunnel           | READY_FREE_SURFACES (DB live flip pending) |
| azure-ai-900        | 2026-07-24               | `tools/item-pipeline/runs/launch-azure-ai-900.json`        | see manifest                     | `docs/launch/azure-ai-900-decision.md`        | vendor=microsoft       | registry → urlContract | trackFunnel           | READY_FREE_SURFACES (DB live flip pending) |
| google-genai-leader | 2026-07-24               | `tools/item-pipeline/runs/launch-google-genai-leader.json` | see manifest                     | `docs/launch/google-genai-leader-decision.md` | vendor=google          | registry → urlContract | trackFunnel           | READY_FREE_SURFACES (DB live flip pending) |

## Gate definitions

1. **Blueprint verified** — snapshot has official source URL, retrieval date, verification pass line.
2. **Pipeline run manifest** — `--execute` run attached; every served item has provenance + approved review.
3. **SME approved count** — named reviewer rows for launch cohort.
4. **Launch cohort decision** — operator note that provisional scored bootstrap is authorized; provenance carries `calibration: provisional`.
5. **Disclaimers** — IndependenceDisclaimer + VENDOR_MARKS present on catalog routes.
6. **Contract + sitemap** — new routes in `urlContract` and `sitemap` (shared source).
7. **Analytics** — funnel events include `exam_code`.
8. **pSEO threshold (GROWTH-001)** — intent pages (`practice-exam`, `practice-questions`, `free-mock-test`) become indexable only when free scored items ≥ `PSEO_MIN_FREE_ITEMS` (default 12, ≤ free_question_cap). Below threshold: robots noindex + sitemap exclusion.
9. **LIVE** — `UPDATE exams SET status='live' WHERE code=…` only for that row.
