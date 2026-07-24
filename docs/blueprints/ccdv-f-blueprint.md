# CCDV-F exam blueprint snapshot

> Outline-only snapshot of Claude Certified Developer — Foundations (CCDV-F).
> **Contains no exam questions.**

## Source

| Field                         | Value                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Exam                          | Claude Certified Developer — Foundations (CCDV-F)                                                                  |
| Vendor                        | Anthropic                                                                                                          |
| Official program announcement | https://claude.com/blog/four-role-based-claude-certifications                                                      |
| Announcement retrieved        | 2026-07-24                                                                                                         |
| Domain/format corroboration   | Independent summaries of Anthropic Exam Guide v1.0 (July 2026); confirm against Partner Academy downloadable guide |
| Verification pass             | 2026-07-24 — credential listed on Anthropic blog; domain weights recorded as guide-reported                        |

## Exam format (public / guide-reported)

- 53 items, 120 minutes (guide-reported)
- Delivery: Pearson VUE (proctored) — Anthropic announcement
- Validity: 12 months (guide-reported)
- List price: USD 125 (guide-reported; verify at registration)
- Pass mark: scaled 720 / 1000 → site practice threshold **72%** (`site_default`)

## Competency domains and weights

| #   | Domain                           | Weight |
| --- | -------------------------------- | ------ |
| 1   | Applications and Integration     | 33%    |
| 2   | Model Selection and Optimisation | 17%    |
| 3   | Agents and Workflows             | 15%    |
| 4   | Prompt and Context Engineering   | 11%    |
| 5   | Tools and MCPs                   | 11%    |
| 6   | Security and Safety              | 8%     |
| 7   | Claude Code                      | 3%     |
| 8   | Eval, Testing, and Debugging     | 2%     |

Weights rounded from guide-reported decimals to integers summing to 100%.

## Learning objectives (outline, own words)

### Applications and Integration

- Use the Messages API correctly (streaming, stop reasons, retries, rate limits)
- Apply Batch API tradeoffs (latency vs cost)
- Deploy Claude apps across common hosting patterns (including cloud marketplaces)

### Model Selection and Optimisation

- Choose Haiku / Sonnet / Opus for cost and quality tradeoffs
- Apply prompt caching and token-aware design
- Use extended thinking where it earns its cost

### Agents and Workflows

- Implement tool-use loops and decide agent vs workflow
- Isolate context with subagents when needed
- Recover cleanly from tool failures

### Prompt and Context Engineering

- Engineer prompts for reliable structured output
- Manage context windows across long sessions
- Prefer schemas over free-text where reliability matters

### Tools and MCPs

- Design tool schemas and tool_choice strategies
- Build MCP servers that return structured errors
- Keep tool inventories discriminable

### Security and Safety

- Defend against prompt injection
- Handle secrets and PII before logging
- Apply least-privilege patterns for tool access

### Claude Code

- Use Claude Code for developer productivity tasks at a foundations level
- Know when CLI agent workflows beat ad-hoc chat

### Eval, Testing, and Debugging

- Add basic evals for agent/tool paths
- Debug stop_reason and empty-result cases
- Capture regressions with fixtures
