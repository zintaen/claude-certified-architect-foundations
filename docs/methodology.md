# Exam-readiness methodology (LEARN-001)

## Public summary

CyberSkill’s readiness score summarizes your practice performance on this site. It is guidance
for what to study next — not a prediction or guarantee of passing any vendor’s live exam.

## Inputs

- Graded practice responses from your identified sittings (`item_responses` when present; legacy
  `exam_results` breakdowns for CCAF).
- Mapped to practice domains with blueprint-inspired weights (see defaults below).

## Exclusions

- Canary / trap items
- Beta (unscored) items
- Custom-mode sittings (LEARN-005)

## Computation (modelVersion 1)

1. **Per-domain accuracy** — fraction correct.
2. **Recency weighting** — exponential half-life (default 21 days): newer answers weigh more.
3. **Coverage** — share of domain material attempted (proxy: distinct items vs domain size floor).
4. **Composition** — weighted sum of `(recencyWeightedAccuracy × coverage)` using domain weights;
   insufficient domains are heavily discounted rather than inventing precision.
5. **Normalize** to 0–100. Bands (guidance only):
   - `building` — below 55
   - `approaching` — 55–74
   - `ready` — 75+

## Sample floors

- Overall: fewer than **30** in-window responses → no score (“not enough data”).
- Per domain: fewer than **8** → domain marked insufficient (“too few attempts to assess”).

## What this is not

- Not IRT ability estimation (deferred until calibrated item parameters exist).
- Not a pass probability.
- No LLM is used.
- Public pages never expose per-item statistics.

## Defaults rationale

Classical mastery with coverage and recency is explainable with day-one data volumes. Band cuts are
coarse guidance for study planning, chosen for interpretability — not psychometric cut scores.
