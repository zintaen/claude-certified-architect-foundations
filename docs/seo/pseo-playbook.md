# Programmatic SEO playbook (GROWTH-001)

## Intent templates

| Intent             | Path                               | Content angle                        |
| ------------------ | ---------------------------------- | ------------------------------------ |
| practice-exam      | `/exams/[code]/practice-exam`      | Mock format walkthrough + start CTA  |
| practice-questions | `/exams/[code]/practice-questions` | Free question browse + inline answer |
| free-mock-test     | `/exams/[code]/free-mock-test`     | Timed mock pitch + logistics + FAQ   |

CCAF stays on legacy URLs (`/`, `/sample-questions`, …). **No `/exams/ccaf/*` intent pages.**

## Index threshold

`PSEO_CONFIG.minFreeItems` (env `PSEO_MIN_FREE_ITEMS`, default **12**) must be ≤ PAY-001 `free_question_cap` (default 30).  
`pseoState()` sets `indexable=false` until scored free items meet the floor; pages emit `noindex` and are omitted from the sitemap.

## Launch checklist

See `docs/launch-checklist.md` §8 — intent pages go index-live when the threshold is met (data event, no deploy).

## Schema policy

- `FAQPage` only when FAQ section is visible on the page
- `ItemList` for listed sample stems
- No markup for content not rendered

## Measurement loop

PostHog: `pseo_page_viewed`, `pseo_free_item_answered` with `exam_code` + `intent`.  
Review GSC queries per intent family on the SEO-001 monitoring cadence (`docs/seo/monitoring.md`).

## Anti-spam fence

Only the three intents above. No doorway/city/salary variants. No request-time LLM prose. Organic only.
