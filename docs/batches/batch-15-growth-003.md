# Batch 15 — task-GROWTH-003 Referral program

**Date:** 2026-07-24  
**Members:** task-GROWTH-003 (solo)

## Shipped

- referrals + append-only referral_events migration
- codeFor / bindReferral / onActivation / backfillDeferredRewards / releaseHeldReferral
- `/api/referrals`, ReferralCapture (?ref=), dashboard ReferralShareCard
- Grade-path activation + IP velocity; rewards via grantEntitlement(source=referral); dark-mode deferral
- scripts/referral-ops.mjs (backfill + release-held)
- Program terms on /refunds

## Gates

GREEN.

## Operator-gated (not flipped)

- ENTITLEMENTS_ENFORCED=on (required before reward issuance / backfill meaning)
- Reward-day / cap / anomaly env knobs at launch
