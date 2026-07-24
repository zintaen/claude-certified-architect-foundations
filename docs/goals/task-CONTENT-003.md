---
source: task-CONTENT-003
born: 2026-07-24
status: satisfied
last_pass: 2026-07-24
on_violation: report
---

# Goal — task-CONTENT-003 Claude cert catalog

## predicates

- three new blueprints + CCAF re-verification with source URL, retrieval date, verification line
- pass_threshold site_default labeled on landings; logistics from config + verify-with-Anthropic line
- registry routes /exams, /exams/[code], practice, exam, sample-questions; no /exams/ccaf
- CatalogExamRuntime shared by practice/exam routes
- VENDOR_MARKS includes CCAO-F / CCDV-F / CCAR-P; disclaimer on catalog pages
- urlContract + sitemap share indexedPaths
- funnel analytics props include exam_code
- launch checklist + per-exam launch decisions; provisional calibration bootstrap
- seed-multi-exam inserts pipeline items with provenance + reviews
- no monetization surfaces under src/app/exams

## notes

Re-verify with `npm run seed:catalog && npm run seed:multi-exam` then `npm test`.
