---
source: task-DATA-002
born: 2026-07-24
status: satisfied
last_pass: 2026-07-24
on_violation: report
---

# Goal — task-DATA-002 user-data migration

## predicates

- Mapping doc inventories all stores + OBS soak waiver + local rehearsal §5 COMPLETE
- migrate-users / migrate-history / parity-check dry-run default; --execute local-only
- Per-surface flags SERVE_FROM_DB / DASHBOARD_FROM_DB / LEADERBOARD_FROM_DB independently revertible
- Production migrate/cutover/rehearsal forbidden unless operator orders

## notes

Prod cutover acceptance (mapping §7) is operator-led after explicit order. AC11 satisfied via local clone.
