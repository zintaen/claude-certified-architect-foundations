# CCAF exam blueprint snapshot

> Outline-only snapshot of publicly reported Claude Certified Architect — Foundations
> (CCA-F / CCAR-F) exam structure. **Contains no exam questions.**
>
> Used by provenance records (`blueprint_ref`) and by the CONTENT-002 generation
> pipeline as an allowlisted blueprint input.

## Source

| Field                       | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exam                        | Claude Certified Architect — Foundations (CCA-F)                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Vendor                      | Anthropic                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Primary public announcement | https://www.anthropic.com/news/claude-partner-network                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Retrieval date              | 2026-07-24                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Verification note           | Domain names and weights below match the publicly reported Architect Foundations blueprint (27/18/20/20/15). **CONTENT-003 re-verification (2026-07-24):** Anthropic's program announcement (https://claude.com/blog/four-role-based-claude-certifications) confirms Architect: Foundations remains one of four credentials and Pearson delivers proctored exams. Weights/format still guide-reported — confirm against the Partner Academy exam guide before treating as final. |

## Exam format (public facts)

- 60 scored multiple-choice scenario questions
- 120 minutes
- Score scale 0–1000; published pass mark **720**
- Six scenario families in the official form pool; a sitting draws a subset (this practice site covers four scenario families)

## Competency domains and weights

| #   | Domain                                 | Weight |
| --- | -------------------------------------- | ------ |
| 1   | Agentic Architecture & Orchestration   | 27%    |
| 2   | Tool Design & MCP Integration          | 18%    |
| 3   | Claude Code Configuration & Workflows  | 20%    |
| 4   | Prompt Engineering & Structured Output | 20%    |
| 5   | Context Management & Reliability       | 15%    |

## Learning objectives (outline, own words)

Objectives are paraphrased study targets derived from the public domain titles — not copied exam items.

### Agentic Architecture & Orchestration

- Select single-agent vs coordinator/sub-agent topologies for a given workload
- Design state recovery and hand-off patterns that preserve fidelity without context bloat
- Route work by complexity (fast path vs full pipeline) without brittle hard-coding
- Define escalation and stop conditions for agent loops

### Tool Design & MCP Integration

- Prefer purpose-specific tool contracts over free-text mega-tools when reliability matters
- Design structured tool errors (retryable vs fatal) for agent recovery
- Choose when a capability is an MCP tool vs a skill vs prompt-only guidance
- Keep tool inventories small enough that descriptions remain discriminable

### Claude Code Configuration & Workflows

- Structure CLAUDE.md / project instruction hierarchy for large codebases
- Scope agent searches and edits to the right package boundary
- Use plan mode and hooks appropriately in agentic coding workflows
- Wire headless / CI invocation without leaking secrets into prompts

### Prompt Engineering & Structured Output

- Specify output schemas and validation/retry loops for structured extraction
- Separate instructions, case facts, and untrusted content in the prompt
- Choose few-shot vs schema-first patterns for consistency
- Avoid progressive-summarization traps that drop critical constraints

### Context Management & Reliability

- Budget context: summaries and structured reports over raw dumps
- Apply graceful degradation and honest failure messaging to end users
- Decide when to escalate to a human vs continue autonomously
- Preserve citations and source indexes across pipeline stages

## Practice-site scenario map

This repository's mock bank uses four scenario families (15 items each). Each maps to primary blueprint domains for provenance `blueprint_ref`:

| Practice group id     | Practice label          | Primary domain                        | Default objective                                                                         |
| --------------------- | ----------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `research_pipeline`   | Research pipelines      | Agentic Architecture & Orchestration  | Design state recovery and hand-off patterns that preserve fidelity without context bloat  |
| `extraction_pipeline` | Extraction pipelines    | Tool Design & MCP Integration         | Prefer purpose-specific tool contracts over free-text mega-tools when reliability matters |
| `customer_support`    | Customer support agents | Context Management & Reliability      | Decide when to escalate to a human vs continue autonomously                               |
| `code_exploration`    | Code exploration        | Claude Code Configuration & Workflows | Scope agent searches and edits to the right package boundary                              |

Secondary domain coverage (Prompt Engineering & Structured Output, Context Management) appears inside items but provenance records cite one primary domain+objective for traceability.

## Blueprint-only sourcing rule

Future generated items MUST be derived only from this snapshot (and attested corpus materials), never from recalled live-exam questions or dump sites. See `docs/PROVENANCE.md`.
