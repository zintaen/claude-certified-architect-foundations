# Anthropic public MCP / tool-use concepts (paraphrase)

Source class: Anthropic public Model Context Protocol and tool-use documentation.
Purpose: legitimacy-safe similarity corpus. Contains conceptual vocabulary only — no exam questions.

Common public themes:

- Tools need clear names and descriptions so the model can discriminate similar capabilities.
- Structured errors with retryable versus fatal signals help agents recover without looping forever.
- Prefer small, purpose-specific tools over a single free-text mega-tool when output shape must be reliable.
- MCP exposes capabilities to Claude as tools, resources, or related primitives depending on the integration need.
- Tool inventories that grow without bound make selection unreliable; prune and specialize.
- Skills and project instructions complement tools but are not a substitute for well-specified tool contracts.
- Production systems validate structured outputs and retry or repair when schemas fail.
