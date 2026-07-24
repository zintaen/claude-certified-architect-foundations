# AEO / GEO playbook (GROWTH-002)

## Crawler policy

Config: `AI_CRAWLER_POLICY` in `src/lib/aeo.ts`.

**Default:** named assistant/search crawlers allowed on free/marketing surfaces; `/api/` disallowed for all. Training-oriented agents (e.g. `CCBot`) default to `none`.

Rationale: citation channel open; item-bank scrape surface stays behind SEC-001 `/api/` disallow + rate limits. Tighten per agent without code changes by editing the config array.

## Content model

- **Fact box** — config-sourced logistics + retrieval date + verify-with-vendor + independence line (`ExamFactBox`).
- **Answer block** — question-shaped `h2` + direct-answer paragraph (`AnswerBlock`, `data-aeo-answer`).

Surfaces: exam landings + GROWTH-001 intent pages.

## llms.txt

Served at `/llms.txt` from `buildLlmsTxt()` — catalog-driven, free surfaces only.

## Measurement (manual)

Fixed query set (per exam code):

1. `best [exam] practice test`
2. `what is on the [exam] exam`
3. `free [exam] mock test`

Cadence: monthly. Log citations in the observations table below (no reliable public API).

| date | assistant | query | cited? | url quoted | notes |
| ---- | --------- | ----- | ------ | ---------- | ----- |
|      |           |       |        |            |       |

## Attribution

Where referrer/UTM indicates an assistant, sessions may tag `source: 'assistant'` (lower fidelity than GSC).
