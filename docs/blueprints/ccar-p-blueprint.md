# CCAR-P exam blueprint snapshot

> Outline-only snapshot of Claude Certified Architect — Professional (CCAR-P).
> **Contains no exam questions.**

## Source

| Field                         | Value                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Exam                          | Claude Certified Architect — Professional (CCAR-P)                                                                 |
| Vendor                        | Anthropic                                                                                                          |
| Official program announcement | https://claude.com/blog/four-role-based-claude-certifications                                                      |
| Announcement retrieved        | 2026-07-24                                                                                                         |
| Domain/format corroboration   | Independent summaries of Anthropic Exam Guide v1.0 (July 2026); confirm against Partner Academy downloadable guide |
| Verification pass             | 2026-07-24 — Professional credential listed on Anthropic blog; domain weights recorded as guide-reported           |

## Exam format (public / guide-reported)

- 63 items, 120 minutes (guide-reported)
- Delivery: Pearson VUE (proctored) — Anthropic announcement
- Validity: 12 months (guide-reported)
- List price: USD 175 (guide-reported; verify at registration)
- Pass mark: scaled 720 / 1000 → site practice threshold **72%** (`site_default`)

## Competency domains and weights

| #   | Domain                                             | Weight |
| --- | -------------------------------------------------- | ------ |
| 1   | Integration                                        | 19%    |
| 2   | Solution Design and Architecture                   | 17%    |
| 3   | Evaluation, Testing, and Optimisation              | 16%    |
| 4   | Governance, Safety, and Risk Management            | 14%    |
| 5   | Stakeholder Communication and Lifecycle Management | 14%    |
| 6   | Claude Models, Prompting, and Context Engineering  | 13%    |
| 7   | Developer Productivity and Operational Enablement  | 7%     |

## Learning objectives (outline, own words)

### Integration

- Design multi-cloud / marketplace integrations with residency constraints
- Plan auth, networking, and data-path boundaries for enterprise Claude apps
- Define integration failure modes and fallbacks

### Solution Design and Architecture

- Architect portfolios of Claude solutions, not just single agents
- Trade off cost, latency, and reliability at system scale
- Select orchestration patterns for enterprise workloads

### Evaluation, Testing, and Optimisation

- Design evaluation programs for production agents
- Optimise at scale with measurable SLOs
- Detect drift after model or prompt changes

### Governance, Safety, and Risk Management

- Map regulatory concerns (e.g. GDPR/HIPAA-class controls) to architecture
- Define audit trails and red-team programmes
- Set data-handling policies for prompts, tools, and logs

### Stakeholder Communication and Lifecycle Management

- Present architectural tradeoffs to executive stakeholders
- Run discovery → pilot → production → deprecation lifecycles
- Manage expectations and SLAs around AI systems

### Claude Models, Prompting, and Context Engineering

- Apply advanced prompting and context strategies in enterprise systems
- Plan model migrations without silent regressions
- Version-pin prompts, tools, and skills deliberately

### Developer Productivity and Operational Enablement

- Scale Claude Code / shared skills / MCP inventories across large eng orgs
- Path-scope rules and shared configuration for teams
- Enable ops runbooks for AI-assisted development
