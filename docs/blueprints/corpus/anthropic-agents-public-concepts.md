# Anthropic public agent-architecture concepts (paraphrase)

Source class: Anthropic public materials on building effective agents (resources.anthropic.com and related engineering documentation).
Purpose: legitimacy-safe similarity corpus. Contains conceptual vocabulary only — no exam questions.

Common public themes:

- Prefer the simplest agent that solves the problem; add sub-agents when work is parallelizable or specialized.
- Coordinator agents delegate; sub-agents should return compact structured results rather than full raw context.
- Persist structured reports for long-running pipelines so work can resume without replaying every token.
- Separate case facts, instructions, and tool outputs in the prompt to reduce instruction-following failures.
- Escalation to humans is a first-class design choice when confidence is low or risk is high.
- Context windows are finite: summaries, indexes, and scratchpads beat dumping entire corpora into the prompt.
- Evaluation loops catch tool-description ambiguity before production traffic does.
