# SEO monitoring procedure (SEO-001)

Operator procedure for protecting organic rankings across DATA-002 surface flips.

## Pre-cutover baseline

1. In Google Search Console, export **top pages** and **top queries** (last 28 days).
2. Attach the CSV as `docs/seo/baseline-YYYY-MM-DD.csv` (gitignored if sensitive; otherwise commit a redacted summary).
3. Record freeze date next to the URL contract freeze (`docs/seo/url-contract.md`).

**Baseline attached:** _[operator fills: baseline-____-__-__.csv or "pending"]_

## Interval checks (after each DATA-002 surface flip)

| Checkpoint | When              | Action                                |
| ---------- | ----------------- | ------------------------------------- |
| T+2d       | 2 days after flip | Spot-check top 20 pages + impressions |
| T+7d       | 1 week            | Compare queries vs baseline           |
| T+14d      | 2 weeks           | Full top-200 pass                     |
| T+28d      | 4 weeks           | Accept or escalate                    |

Also run: `npx playwright test tests/e2e/url-contract.spec.ts` against the flipped environment before each flip and after legacy-path removal.

## Rollback trigger (operator-set before first production flip)

> **Threshold (fill before first flip):** **\*\***\*\***\*\***\_\_\_**\*\***\*\***\*\***  
> Example shape: “>20% drop in clicks on top-50 pages sustained 7 days vs baseline week, unexplained by seasonality.”

Until filled, **do not** flip production read surfaces (`SERVE_FROM_DB` / `DASHBOARD_FROM_DB` / `LEADERBOARD_FROM_DB`).

## Observation log

| date | flip | pages checked | deltas | action |
| ---- | ---- | ------------- | ------ | ------ |
|      |      |               |        |        |

## Host note

Host cutover to `practice.cyberskill.world` is documented in `docs/ops/practice-host-cutover.md`. Legacy `ccaf.cyberskill.world` should 301 to practice; apex `cyberskill.world` stays the agency site.
