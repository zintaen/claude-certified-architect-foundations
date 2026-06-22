// GENERATED - do not edit by hand. Client-safe questions with the answer key
// removed. The full data (correct + explain) lives in questions.server.ts and
// never reaches the browser. Regenerate if the question bank changes.
export interface PublicOption {
  letter: string;
  text: string;
}
export interface PublicQuestion {
  id: string;
  group: string;
  text: string;
  options: PublicOption[];
}

export const questions: PublicQuestion[] = [
  {
    id: 'Q1',
    group: 'research_pipeline',
    text: 'Your multi-agent research pipeline crashed after processing 12 of 28 documents. The web search agent had identified relevant sources, the document analysis agent had partially completed extraction, and the synthesizer had begun pattern identification.\nYou need to resume processing without repeating work or losing fidelity of prior findings.\nWhat state management approach best balances information fidelity with context efficiency when restoring agent state?',
    options: [
      {
        letter: 'A',
        text: 'Have each agent maintain its own persistent state file and reload it independently at the start of each session.',
      },
      {
        letter: 'B',
        text: "Persist the coordinator's conversation log containing all task delegations and responses, providing this to agents when resuming.",
      },
      {
        letter: 'C',
        text: 'Have each agent persist a structured report to a known location. On resume, the coordinator loads the reports and injects relevant state into agent prompts.',
      },
      {
        letter: 'D',
        text: 'Index all agent outputs in a shared vector store. When resuming, each agent queries the store using semantic search to retrieve relevant prior findings.',
      },
    ],
  },
  {
    id: 'Q2',
    group: 'research_pipeline',
    text: 'After the web search agent finds 25 sources (120K tokens of raw content), the document analysis agent extracts key insights (15K tokens), and the synthesis agent produces a coherent narrative draft (3K tokens), the coordinator must pass context to the report generation agent for the final output with proper source citations.\nWhat context-passing strategy provides the best balance of completeness and efficiency?',
    options: [
      {
        letter: 'A',
        text: 'Pass only the synthesis draft and have a separate post-processing pipeline match claims to sources and insert citations after the report is generated.',
      },
      {
        letter: 'B',
        text: 'Pass the synthesis draft along with a structured source index that maps key claims to their source URLs and relevant excerpts.',
      },
      {
        letter: 'C',
        text: 'Pass a condensed summary of all prior stages that preserves the main findings and attributes them to sources by name only.',
      },
      {
        letter: 'D',
        text: 'Pass the full accumulated context from all prior agents.',
      },
    ],
  },
  {
    id: 'Q3',
    group: 'research_pipeline',
    text: 'The document analysis agent has a single `analyze_document` tool that takes a document and a free-text instruction parameter. During evaluation, requests like "extract the key financial metrics" often return narrative summaries, while "summarize the methodology" sometimes returns raw data tables. The synthesis agent reports that 35% of analysis results require re-requests with clarified instructions.\nWhat\'s the most effective way to improve reliability?',
    options: [
      {
        letter: 'A',
        text: 'Split the generic tool into purpose-specific tools—`extract_data_points`, `summarize_content`, `verify_claim_against_source`—each with defined input/output contracts.',
      },
      {
        letter: 'B',
        text: 'Keep the single tool but add an `analysis_type` enum parameter requiring explicit selection between extraction, summarization, and verification modes.',
      },
      {
        letter: 'C',
        text: 'Have the coordinator pre-classify each analysis request before passing instructions to the document analysis agent.',
      },
      {
        letter: 'D',
        text: 'Enhance the tool description with detailed examples showing how different instruction phrasings should map to different output formats.',
      },
    ],
  },
  {
    id: 'Q4',
    group: 'research_pipeline',
    text: 'The web search agent has gathered several relevant sources for a research topic. The document analysis agent now needs to examine these sources.\nHow does information typically flow between these two specialized subagents?',
    options: [
      {
        letter: 'A',
        text: 'The agents communicate through an event-driven message queue, with the document analysis agent subscribing to web search completion events.',
      },
      {
        letter: 'B',
        text: 'The web search agent directly invokes the document analysis agent, passing the discovered sources as parameters.',
      },
      {
        letter: 'C',
        text: "The coordinator agent receives the web search agent's output and includes relevant findings in the prompt when invoking the document analysis agent.",
      },
      {
        letter: 'D',
        text: 'Both agents access a shared memory store where the web search agent writes findings and the document analysis agent reads them.',
      },
    ],
  },
  {
    id: 'Q5',
    group: 'research_pipeline',
    text: 'In production, you observe that simple fact-checking queries (e.g., "What year was the Paris Climate Agreement signed?") traverse all four subagents sequentially, consuming 40+ seconds and significant tokens per query. Complex comparative research benefits from the full pipeline. Your query distribution is diverse and evolving as users discover new applications.\nWhat\'s the most effective approach to optimize for varying query complexity?',
    options: [
      {
        letter: 'A',
        text: 'Implement pattern-based routing that categorizes queries by structure (single-fact vs. comparative vs. analytical) and maps each category to a predefined subagent combination.',
      },
      {
        letter: 'B',
        text: 'Create a fast-path for factual questions that bypasses subagents entirely, routing all other queries through the complete pipeline to ensure research thoroughness.',
      },
      {
        letter: 'C',
        text: 'Have the coordinator analyze each query and dynamically decide which subagents to invoke based on its assessment of query requirements.',
      },
      {
        letter: 'D',
        text: 'Train a query complexity classifier on labeled historical data to predict optimal subagent combinations, retraining periodically as query patterns evolve.',
      },
    ],
  },
  {
    id: 'Q6',
    group: 'research_pipeline',
    text: 'When researching "renewable energy adoption," the web search agent returns recent statistics (2024: 35% adoption) while the document analysis agent extracts data from internal reports (2022: 18% adoption). The synthesis agent incorrectly flags these as contradictory sources rather than recognizing the data shows growth over time.\nWhat change would best enable the synthesis agent to correctly interpret such temporal differences?',
    options: [
      {
        letter: 'A',
        text: 'Require subagents to include publication or data collection dates in their structured outputs.',
      },
      {
        letter: 'B',
        text: 'Add a conflict resolution agent that automatically discards older data when newer data exists for the same metric.',
      },
      {
        letter: 'C',
        text: 'Configure the web search agent to only return results from the past 6 months.',
      },
      {
        letter: 'D',
        text: 'Instruct the synthesis agent to always treat the most recent data as authoritative and place older findings in a separate historical appendix.',
      },
    ],
  },
  {
    id: 'Q7',
    group: 'research_pipeline',
    text: "The synthesis agent receives summarized findings from the web search and document analysis agents, then passes a consolidated summary to the report generator. During testing, you discover the generated reports make factual claims without proper citations—the report generator cannot attribute statements to their original sources because that metadata was lost during the summarization steps.\nWhat's the most effective approach to ensure proper source attribution in the final reports?",
    options: [
      {
        letter: 'A',
        text: 'Have each agent output structured data separating content summaries from source metadata (URLs, document names, page numbers).',
      },
      {
        letter: 'B',
        text: 'Have the report generator query the web search agent to re-locate sources for claims in the final report.',
      },
      {
        letter: 'C',
        text: 'Instruct the synthesis agent to embed source references inline within its summary text using a consistent citation format.',
      },
      {
        letter: 'D',
        text: 'Skip summarization and pass full raw outputs from web search and document analysis directly to the report generator.',
      },
    ],
  },
  {
    id: 'Q8',
    group: 'research_pipeline',
    text: 'Production reviews reveal inconsistent handling of uncertainty in final reports. Sometimes conflicting subagent findings are synthesized into a single confident statement (losing nuance), while other times reports over-hedge with excessive qualifications (becoming unhelpful). When the web search agent returns "industry analysts estimate $50B market size (methodology varies)" and the document analysis agent returns "peer-reviewed study estimates 35B(±7B, 95% CI)," the coordinator either picks one arbitrarily or produces vague statements like "the market may be 35B−50B depending on factors."\nWhat systematic approach best addresses this?',
    options: [
      {
        letter: 'A',
        text: 'Configure subagents to only report findings meeting a high-confidence threshold, filtering uncertain information before it reaches the coordinator.',
      },
      {
        letter: 'B',
        text: 'Implement a confidence calibration layer that normalizes subagent uncertainty expressions to standardized probability scores (0.0-1.0), then weight-average findings by their calibrated confidence.',
      },
      {
        letter: 'C',
        text: 'Instruct the synthesis agent to structure reports with explicit sections distinguishing well-established findings from contested ones, preserving original source characterizations and methodological context.',
      },
      {
        letter: 'D',
        text: 'Add a verification subagent that cross-references findings across sources, only passing claims to synthesis that are corroborated by at least two independent sources.',
      },
    ],
  },
  {
    id: 'Q9',
    group: 'research_pipeline',
    text: "In production, final reports frequently contain claims without proper source attribution. Investigation shows that while the web search and document analysis agents correctly attach citations to their outputs, the synthesis agent loses track of which sources support which conclusions when combining findings.\nWhat's the most effective architectural change?",
    options: [
      {
        letter: 'A',
        text: 'Maintain complete transcripts of all subagent interactions and add a citation-resolution agent to analyze logs and determine attributions before report generation.',
      },
      {
        letter: 'B',
        text: 'Require all subagents to output structured claim-source mappings that the synthesis agent must preserve and merge when combining findings from multiple sources.',
      },
      {
        letter: 'C',
        text: 'Add a verification step where the report generator uses semantic similarity matching against original sources to reconstruct which claims came from which documents.',
      },
      {
        letter: 'D',
        text: 'Have the coordinator inject source identifier prefixes into text before each handoff, then parse these prefixes at report generation to reconstruct citations.',
      },
    ],
  },
  {
    id: 'Q10',
    group: 'research_pipeline',
    text: 'After the web search agent and document analysis agent complete their tasks, the coordinator invokes the synthesis agent. However, the synthesis agent responds that it cannot complete the task because no research findings were provided.\nWhat is the most likely cause of this issue?',
    options: [
      {
        letter: 'A',
        text: "The synthesis agent's context window is not large enough to hold the combined outputs from both previous agents.",
      },
      {
        letter: 'B',
        text: "The coordinator did not include the outputs from the previous agents in the synthesis agent's prompt.",
      },
      {
        letter: 'C',
        text: 'The subagents need to share a single API connection to enable automatic context sharing between invocations.',
      },
      {
        letter: 'D',
        text: "The synthesis agent needs tools that can fetch results directly from the other agents' conversation histories.",
      },
    ],
  },
  {
    id: 'Q11',
    group: 'research_pipeline',
    text: 'A user is expanding the research system beyond its single web search agent by adding specialized data sources. They add a financial API agent that returns structured JSON with revenue, margins, and growth rates; a news monitoring agent that returns prose summaries of recent developments; and a patent analysis agent that returns structured lists of technology areas. The synthesis agent combines these into executive briefings. Currently, it converts everything to bullet points, causing financial comparisons to lose tabular clarity and news summaries to lose narrative flow.\nWhat change would most improve briefing quality?',
    options: [
      {
        letter: 'A',
        text: 'Standardize all subagent outputs to prose summaries with inline citations.',
      },
      {
        letter: 'B',
        text: 'Add a format conversion layer between subagents and synthesis that transforms all outputs to a common intermediate representation.',
      },
      {
        letter: 'C',
        text: 'Update the synthesis agent to render each content type appropriately—financial data as tables, news as prose.',
      },
      {
        letter: 'D',
        text: 'Standardize all subagent outputs to JSON with fields for claim, evidence, source, and confidence.',
      },
    ],
  },
  {
    id: 'Q12',
    group: 'research_pipeline',
    text: 'The coordinator provides detailed step-by-step instructions to the web search subagent, specifying exact search queries, source priorities, and date filters. Production monitoring reveals three issues: (1) the subagent reports "insufficient results" rather than trying alternative approaches when pre-specified searches fail, (2) research quality drops for emerging topics that don\'t match expected patterns, and (3) the subagent rarely surfaces valuable tangential sources.\nWhat\'s the most effective way to improve subagent adaptability?',
    options: [
      {
        letter: 'A',
        text: 'Remove procedural details entirely, delegating with simple goals like "research X thoroughly" and relying on the subagent\'s general capabilities.',
      },
      {
        letter: 'B',
        text: 'Add explicit fallback directives to the detailed instructions: "If specified searches yield fewer than N results, attempt alternative query formulations before reporting failure."',
      },
      {
        letter: 'C',
        text: 'Implement a topic classification step where the coordinator categorizes requests as "well-defined" or "exploratory" and uses different instruction styles for each category.',
      },
      {
        letter: 'D',
        text: 'Specify research goals and quality criteria (coverage breadth, source diversity, recency) rather than procedural steps, letting the subagent determine its search strategy.',
      },
    ],
  },
  {
    id: 'Q13',
    group: 'research_pipeline',
    text: 'Production monitoring shows that follow-up queries like "summarize what we learned about market trends" consistently take 40+ seconds. Investigation reveals the coordinator spawns the synthesis subagent for each summarization request, passing 80K+ tokens of accumulated findings. The coordinator already has these findings in its context from orchestrating the research.\nWhat\'s the most effective way to improve response time for these follow-up summaries?',
    options: [
      {
        letter: 'A',
        text: 'Pre-generate and cache summaries at multiple granularities whenever new findings accumulate.',
      },
      {
        letter: 'B',
        text: 'Have the coordinator handle straightforward summarization requests directly using its existing context, reserving subagent spawning for complex analysis.',
      },
      {
        letter: 'C',
        text: 'Enable prompt caching on the synthesis subagent to reduce the overhead of repeatedly transferring the same research findings.',
      },
      {
        letter: 'D',
        text: 'Spawn the synthesis subagent with reduced context and have it request specific findings from the coordinator on-demand.',
      },
    ],
  },
  {
    id: 'Q14',
    group: 'research_pipeline',
    text: "When analyzing complex legal cases that cite multiple precedents, the document analysis subagent processes each sequentially. A landmark case citing 12 precedents takes over 3 minutes to analyze completely.\nWhat's the most effective way to reduce this latency while preserving the coordinator's ability to monitor and debug the system?",
    options: [
      {
        letter: 'A',
        text: 'Implement a message queue where precedent analysis tasks are processed asynchronously by a pool of worker agents.',
      },
      {
        letter: 'B',
        text: 'Create a recursive agent hierarchy where analysis agents subdivide work among child agents until reaching single-precedent granularity.',
      },
      {
        letter: 'C',
        text: 'Have the coordinator spawn parallel document analysis subagents, each handling a subset of precedents, then aggregate results before synthesis.',
      },
      {
        letter: 'D',
        text: 'Enable the document analysis subagent to spawn its own specialized subagents dynamically when it encounters cases with many citations.',
      },
    ],
  },
  {
    id: 'Q15',
    group: 'research_pipeline',
    text: 'The coordinator agent has `AgentDefinitions` configured for all four specialized subagents, each with appropriate descriptions, prompts, and tool restrictions. During testing, you notice the coordinator correctly reasons about when to delegate—it generates messages like "I\'ll ask the web search agent to find sources on this topic"—but no subagent execution ever occurs. The coordinator then proceeds as if the delegation happened and continues with incomplete information. Logs show no errors.\nWhat is the most likely cause?',
    options: [
      {
        letter: 'A',
        text: "The coordinator's `max_tokens` setting is too low, causing the Task tool invocation to be truncated before the subagent type parameter can be specified.",
      },
      {
        letter: 'B',
        text: "The `AgentDefinitions` are configured correctly, but the coordinator's system prompt doesn't explicitly list the available subagent types, preventing the model from knowing they can be invoked.",
      },
      {
        letter: 'C',
        text: 'The coordinator\'s allowedTools configuration doesn\'t include "Task", so while it can reason about delegation, it cannot invoke the tool required to spawn subagents.',
      },
      {
        letter: 'D',
        text: "Subagent context isolation means task descriptions from the coordinator don't automatically reach subagents; you need to configure explicit context forwarding in ClaudeAgentOptions.",
      },
    ],
  },
  {
    id: 'Q16',
    group: 'code_exploration',
    text: 'After integrating a local MCP server providing code analysis tools (`analyze_dependencies`, `find_dead_code`, `calculate_complexity`), you verify the server is healthy and tools appear in the tools/list response. However, you observe that the agent consistently uses Grep to search for import statements instead of calling `analyze_dependencies`—even when users explicitly ask about "code dependencies." Examining tool definitions reveals:\nMCP: `analyze_dependencies` - "Analyzes dependency graph"\nBuilt-in: Grep - "Search file contents for a pattern using regular expressions. Returns matching lines with line numbers and surrounding context."\nWhat\'s the most effective approach to improve the agent\'s selection of MCP tools?',
    options: [
      {
        letter: 'A',
        text: 'Remove Grep from available tools when the MCP server is connected to eliminate functional overlap.',
      },
      {
        letter: 'B',
        text: 'Add routing instructions to the system prompt specifying that dependency-related questions should use MCP tools rather than Grep.',
      },
      {
        letter: 'C',
        text: 'Split `analyze_dependencies` into granular tools (`list_imports`, `resolve_transitive_deps`, `detect_circular_deps`) so each has a focused purpose less likely to overlap with Grep.',
      },
      {
        letter: 'D',
        text: 'Expand MCP tool descriptions to detail capabilities and outputs—e.g., "Builds dependency graph showing direct imports, transitive dependencies, and cycles."',
      },
    ],
  },
  {
    id: 'Q17',
    group: 'code_exploration',
    text: 'An engineer asks the agent to find all callers of a function before removing it. The function is defined in a core library but is also exposed through wrapper modules that rename the function for domain-specific use (e.g., calculateTax in the library becomes computeOrderTax in the orders module).\nWhat exploration strategy will most reliably identify all callers?',
    options: [
      {
        letter: 'A',
        text: 'Read the library and wrapper modules to identify all exposed names for the function, then Grep for each name across the codebase.',
      },
      {
        letter: 'B',
        text: 'Use Grep to find all files that import from the library or wrapper modules, then read each file to check whether it uses the function.',
      },
      {
        letter: 'C',
        text: "Use Grep to search for the function's original name across the codebase.",
      },
      {
        letter: 'D',
        text: 'Search for the function name in project documentation to understand intended usage patterns and navigate to documented integration points.',
      },
    ],
  },
  {
    id: 'Q18',
    group: 'code_exploration',
    text: "During testing, you observe that in extended exploration sessions (30+ minutes), the agent starts giving inconsistent answers about code structure it discussed earlier. Engineers report having to repeat context about modules they've already explored.\nWhat's the most effective approach to address this?",
    options: [
      {
        letter: 'A',
        text: 'Have the agent maintain a scratchpad file that records key findings, referencing it for subsequent questions.',
      },
      {
        letter: 'B',
        text: 'Switch to a higher-capacity model tier to provide more context window space for accumulated exploration data.',
      },
      {
        letter: 'C',
        text: 'Implement automatic context clearing every 15 minutes to ensure the agent starts with fresh, uncontaminated context.',
      },
      {
        letter: 'D',
        text: 'Create summaries of all source files before exploration begins, loading only these compressed representations into context.',
      },
    ],
  },
  {
    id: 'Q19',
    group: 'code_exploration',
    text: 'An engineer used `Claude Code` yesterday to investigate authentication flows in a legacy monolith, building up significant context over a 2-hour session. Today she wants to continue that specific investigation. She\'s worked on three other codebases since then and knows the session was named "auth-deep-dive".\nHow should she resume?',
    options: [
      {
        letter: 'A',
        text: 'Start fresh and re-read the same files',
      },
      {
        letter: 'B',
        text: "Use `--session-id` with the UUID from yesterday's session transcript file",
      },
      {
        letter: 'C',
        text: 'Use `--continue` to pick up where the most recent conversation left off',
      },
      {
        letter: 'D',
        text: 'Use `--resume` auth-deep-dive to load that specific session by name',
      },
    ],
  },
  {
    id: 'Q20',
    group: 'code_exploration',
    text: 'Your agent has spent 25 minutes exploring a game engine\'s rendering subsystem—reading shader code, buffer management, and frame synchronization logic. An engineer now asks it to understand how the physics engine integrates with rendering for collision debug overlays. You notice recent responses reference "typical rendering patterns" rather than the specific VulkanPipeline and FrameGraph classes it discovered earlier.\nWhat\'s the most effective approach?',
    options: [
      {
        letter: 'A',
        text: 'Spawn a sub-agent to explore physics independently, then manually synthesize its findings with the rendering knowledge accumulated in the main conversation.',
      },
      {
        letter: 'B',
        text: 'Continue in the current context with more targeted prompts referencing the specific classes by name.',
      },
      {
        letter: 'C',
        text: 'Summarize key rendering findings, then spawn a sub-agent for physics exploration with that summary in its initial context.',
      },
      {
        letter: 'D',
        text: "Use /clear to reset context completely, then start fresh with physics exploration using file paths from the project's CLAUDE.md.",
      },
    ],
  },
  {
    id: 'Q21',
    group: 'code_exploration',
    text: "Your codebase exploration tool stores session IDs to allow engineers to continue investigations across work sessions. An engineer spent an hour yesterday analyzing a legacy authentication module, building context about its architecture and dependencies. They want to continue today. The session ID is valid, but version control shows 3 of the 12 files the agent previously read were modified overnight by a teammate's merge.\nWhat approach best balances efficiency and accuracy?",
    options: [
      {
        letter: 'A',
        text: 'Resume the session without informing the agent about the changed files',
      },
      {
        letter: 'B',
        text: 'Start a fresh session to ensure the agent works with current codebase state without stale assumptions',
      },
      {
        letter: 'C',
        text: 'Resume the session and inform the agent which specific files changed for targeted re-analysis',
      },
      {
        letter: 'D',
        text: 'Resume the session and immediately have the agent re-read all 12 previously analyzed files',
      },
    ],
  },
  {
    id: 'Q22',
    group: 'code_exploration',
    text: "An engineer used the agent yesterday to analyze a legacy authentication module, identifying two distinct refactoring approaches: extracting a microservice versus refactoring in-place. Today, they want to explore both approaches in depth—having the agent propose specific code changes for each—before deciding which to implement.\nWhat's the most effective way to structure this exploration?",
    options: [
      {
        letter: 'A',
        text: "Resume yesterday's session to explore the first approach, then start a new session for the second, manually recreating the original context.",
      },
      {
        letter: 'B',
        text: "Start two fresh sessions, manually providing a summary of yesterday's analysis findings to establish context.",
      },
      {
        letter: 'C',
        text: "Resume yesterday's session and explore both approaches sequentially within the same conversation thread.",
      },
      {
        letter: 'D',
        text: "Use `fork_session` to create two branches from yesterday's analysis, exploring one approach in each fork.",
      },
    ],
  },
  {
    id: 'Q23',
    group: 'code_exploration',
    text: "An engineer asks the agent to understand how the caching layer works before adding a new cache invalidation trigger. After initial Grep searches, the agent has identified that caching logic spans 15 files including decorators, middleware, and service classes (~8,000 lines total).\nWhat's the most effective next step for building understanding while managing context constraints?",
    options: [
      {
        letter: 'A',
        text: 'Use the Read tool to sequentially load all 15 files, building complete understanding across the full caching implementation.',
      },
      {
        letter: 'B',
        text: 'Analyze imports and class hierarchies to identify the base cache class, Read that file to understand the interface, then trace specific invalidation implementations.',
      },
      {
        letter: 'C',
        text: 'Use Grep to search for "invalidate" and "expire" patterns across all files, then Read only those specific line ranges with minimal surrounding context.',
      },
      {
        letter: 'D',
        text: 'Use Glob to find files matching common caching patterns (cache.py, caching/), prioritize the largest files by reading them first, then check smaller files for gaps.',
      },
    ],
  },
  {
    id: 'Q24',
    group: 'code_exploration',
    text: "An engineer asks your agent to identify untested code paths in a legacy payment processing module spanning 45 files. After reading the first 8 source files, the agent's responses are becoming noticeably less accurate—it's forgetting previously discussed code patterns and hasn't yet located all test files or traced critical payment flows.\nWhat's the most effective approach to complete this investigation?",
    options: [
      {
        letter: 'A',
        text: 'Document all current findings in a summary report, clear context completely, then use that report as the sole reference for continuing the investigation.',
      },
      {
        letter: 'B',
        text: 'Spawn subagents to investigate specific questions (e.g., "find all test files for payment processing", "trace refund flow dependencies") while the main agent coordinates findings and preserves high-level understanding.',
      },
      {
        letter: 'C',
        text: 'Clear context with /clear, then selectively re-read only the most critical files discovered so far, writing key findings to a scratchpad file that persists between context resets.',
      },
      {
        letter: 'D',
        text: 'Switch to using Grep to search for specific function names instead of reading full files, reducing the content loaded into context for remaining exploration.',
      },
    ],
  },
  {
    id: 'Q25',
    group: 'code_exploration',
    text: "A developer asks the agent to investigate why a specific API endpoint intermittently returns 500 errors. The codebase has 200+ files and the developer doesn't know which components are involved. The agent must trace the error through routing, middleware, business logic, and database layers.\nWhat task decomposition approach would be most effective?",
    options: [
      {
        letter: 'A',
        text: 'Have the agent first create a comprehensive plan mapping all code paths through the endpoint before beginning any file exploration or code reading.',
      },
      {
        letter: 'B',
        text: 'Have the agent dynamically generate investigation subtasks based on what it discovers at each step, adapting its exploration plan as new information about the error path emerges.',
      },
      {
        letter: 'C',
        text: 'Define a fixed sequence of investigation steps upfront—grep for error patterns, then read error handlers, then check database queries, then examine middleware—executing each step regardless of intermediate findings.',
      },
      {
        letter: 'D',
        text: 'Run parallel worker agents that simultaneously investigate all four layers, then synthesize their findings to identify where the error originates.',
      },
    ],
  },
  {
    id: 'Q26',
    group: 'code_exploration',
    text: "An engineer's exploration subagent spent 30 minutes analyzing a legacy payment system, reading 47 files and documenting data flows. The session was interrupted when the engineer's connection dropped. While away, a teammate merged a PR that renamed two utility functions. The engineer wants to continue the same exploration.\nWhat's the most effective approach?",
    options: [
      {
        letter: 'A',
        text: 'Resume the subagent from its previous transcript without mentioning the changes—the architecture understanding remains valid.',
      },
      {
        letter: 'B',
        text: 'Launch a fresh subagent and include the prior transcript in the initial prompt for context.',
      },
      {
        letter: 'C',
        text: 'Launch a fresh subagent with a summary of prior findings.',
      },
      {
        letter: 'D',
        text: 'Resume the subagent from its previous transcript and inform it about the renamed functions.',
      },
    ],
  },
  {
    id: 'Q27',
    group: 'code_exploration',
    text: 'After adding an MCP server with specialized code refactoring tools (`extract_function`, `rename_variable`, `inline_function`), you notice the agent still uses basic text manipulation via Write and Bash sed commands for refactoring tasks. The MCP server is connected and healthy. Examining the configuration, you find each MCP tool has a minimal description like "`extract_function`: extracts a function from code."\nWhat\'s the most effective way to improve adoption of the MCP refactoring tools?',
    options: [
      {
        letter: 'A',
        text: 'Implement a request classifier that detects refactoring intent and automatically routes those requests to the MCP server before the agent processes them.',
      },
      {
        letter: 'B',
        text: "Remove the Write tool from the agent's configuration for refactoring sessions so it must use the MCP tools for code modifications.",
      },
      {
        letter: 'C',
        text: 'Accept this as expected behavior since simpler tools like sed are more predictable than specialized refactoring tools.',
      },
      {
        letter: 'D',
        text: 'Enhance the MCP tool descriptions to explain when each tool is preferable to text manipulation and clarify expected inputs and outputs.',
      },
    ],
  },
  {
    id: 'Q28',
    group: 'code_exploration',
    text: 'Your agent has analyzed a complex service module—reading 23 source files, tracing request flows, and identifying error handling patterns. A developer wants to compare two testing strategies before committing to one: end-to-end tests with mocked external services vs. snapshot tests capturing expected outputs. They need to independently develop both approaches to evaluate trade-offs.\nHow should you manage the sessions?',
    options: [
      {
        letter: 'A',
        text: "Export the analysis session's key findings to a file, then create two new sessions that reference this file.",
      },
      {
        letter: 'B',
        text: 'Resume the analysis session with `fork_session` enabled, creating a separate branch for each testing strategy.',
      },
      {
        letter: 'C',
        text: 'Start two fresh sessions, having each re-read the relevant source files before beginning.',
      },
      {
        letter: 'D',
        text: 'Continue in the original session, developing end-to-end tests first, then snapshot tests sequentially.',
      },
    ],
  },
  {
    id: 'Q29',
    group: 'code_exploration',
    text: "Your agent needs to insert a new helper function into the middle of a 150-line utility module, between two existing functions. The Edit tool fails because its `old_string` parameter cannot find unique text to match — the file has repetitive docstrings, variable names, and structural patterns.\nWhat's the most reliable way to complete this insertion?",
    options: [
      {
        letter: 'A',
        text: 'Use Edit with an extremely long `old_string` capturing 30+ lines of context to guarantee uniqueness',
      },
      {
        letter: 'B',
        text: "Use Edit's `replace_all` parameter to target a common pattern and embed the new function in the replacement text",
      },
      {
        letter: 'C',
        text: 'Use Bash to append the function definition to the end of the file using heredoc syntax',
      },
      {
        letter: 'D',
        text: 'Use Read to load the file, add the function at the appropriate location, then Write the updated file',
      },
    ],
  },
  {
    id: 'Q30',
    group: 'code_exploration',
    text: 'An engineer who just joined the team asks the agent to help them understand the authentication and authorization architecture before making security improvements. The codebase has 800+ files across multiple services.\nWhat exploration strategy will most effectively build understanding, given Claude built-in tools and context limits?',
    options: [
      {
        letter: 'A',
        text: 'Read any CLAUDE.md and README files first, then ask the engineer to specify which 10-15 files are most important for understanding the auth system.',
      },
      {
        letter: 'B',
        text: 'Launch parallel subagents to explore different services simultaneously, then synthesize their findings into an architectural overview.',
      },
      {
        letter: 'C',
        text: 'Use Grep to find authentication entry points, read those files, then follow imports and function calls to map the auth flow incrementally.',
      },
      {
        letter: 'D',
        text: 'Read all files containing "auth", "login", "permission", or "token" in their content or filename.',
      },
    ],
  },
  {
    id: 'Q31',
    group: 'customer_support',
    text: 'A customer returns 4 hours after their initial session about the same billing dispute. The previous 32-turn session contains `lookup_order` results showing "Status: PENDING, Expected resolution: 24-48 hours." In testing, you observe that when resuming sessions with stale tool results, the agent often references the outdated data in responses (e.g., "I see your refund is still being processed") even after subsequent fresh tool calls return different information.\nWhat approach most reliably handles returning customers?',
    options: [
      {
        letter: 'A',
        text: 'Resume with full history but filter out previous `tool_result` messages before resuming, keeping only the human/assistant turns so the agent must re-fetch needed data.',
      },
      {
        letter: 'B',
        text: 'Start a new session, inject a structured summary of the previous interaction (issue type, actions taken, resolution status), then make fresh tool calls before engaging.',
      },
      {
        letter: 'C',
        text: 'Resume with full history and add a system prompt instruction telling the agent to always prefer the most recent tool results when multiple calls to the same tool exist in context.',
      },
      {
        letter: 'D',
        text: 'Resume with full history and configure the agent to automatically re-call all previously-used tools at session start to ensure data freshness.',
      },
    ],
  },
  {
    id: 'Q32',
    group: 'customer_support',
    text: "You're implementing the escalation logic for when the agent should call `escalate_to_human`. Your team proposes four different approaches for triggering escalation.\nWhich approach will most reliably identify cases that genuinely require human intervention?",
    options: [
      {
        letter: 'A',
        text: 'Instruct the agent to escalate when the customer requests a human, when the issue requires policy exceptions, or when the agent cannot make meaningful progress.',
      },
      {
        letter: 'B',
        text: "Configure the agent to escalate after three consecutive tool calls that fail to resolve the customer's stated issue, ensuring a reasonable attempt before involving a human.",
      },
      {
        letter: 'C',
        text: 'Implement sentiment analysis that monitors for frustration indicators (negative language, repeated questions, exclamation marks) and trigger escalation when the frustration score exceeds a configured threshold.',
      },
      {
        letter: 'D',
        text: 'Build a rules engine that maps specific issue types, customer segments, and product categories to escalation decisions, removing the need for model judgment calls.',
      },
    ],
  },
  {
    id: 'Q33',
    group: 'customer_support',
    text: "After investigating a billing dispute over 25+ turns, you've identified that duplicate charges occurred due to a payment gateway timeout triggering retry logic. The required refund ($847) exceeds your $500 authorization limit. You need to call `escalate_to_human`, and the human agent won't have access to your conversation transcript.\nWhat context should you pass to enable effective resolution?",
    options: [
      {
        letter: 'A',
        text: "The customer's original complaint verbatim plus the tool result excerpts showing duplicate transactions.",
      },
      {
        letter: 'B',
        text: 'A structured summary: customer ID, root cause, refund amount, and recommended action.',
      },
      {
        letter: 'C',
        text: 'The complete conversation transcript with all tool results.',
      },
      {
        letter: 'D',
        text: 'Your diagnosis and the refund amount only.',
      },
    ],
  },
  {
    id: 'Q34',
    group: 'customer_support',
    text: 'Compliance requires that refunds exceeding $500 must automatically escalate to a human agent—this rule cannot be left to model discretion. Despite clear system prompt instructions, production logs show the agent occasionally processes high-value refunds directly (3% failure rate).\nHow should you achieve guaranteed compliance?',
    options: [
      {
        letter: 'A',
        text: 'Modify the refund tool to return an error with message "Amount exceeds policy limit—please escalate" when threshold is exceeded.',
      },
      {
        letter: 'B',
        text: 'Add few-shot examples to the prompt showing correct escalation behavior at various refund amounts ($400, $500, $600).',
      },
      {
        letter: 'C',
        text: 'Implement a hook to intercept tool calls; when the refund process amount exceeds $500, block it and invoke human escalation.',
      },
      {
        letter: 'D',
        text: 'Strengthen the system prompt with emphatic language: "CRITICAL POLICY: Refunds over $500 MUST trigger human escalation. NEVER process these directly."',
      },
    ],
  },
  {
    id: 'Q35',
    group: 'customer_support',
    text: 'During a billing dispute resolution, your agent successfully retrieves customer info via `get_customer` and order details via `lookup_order`, but when attempting to call `process_refund`, the tool returns a timeout error. The agent has enough information to explain the charges and verify refund eligibility, but cannot actually process the refund due to the backend failure.\nWhat approach best balances first-contact resolution with appropriate error handling?',
    options: [
      {
        letter: 'A',
        text: 'Escalate immediately to a human agent since the refund action cannot be completed',
      },
      {
        letter: 'B',
        text: 'Implement automatic retries with exponential backoff for `process_refund`, keeping the conversation open until the refund is successfully processed',
      },
      {
        letter: 'C',
        text: 'Explain the billing, confirm refund eligibility, acknowledge the system issue preventing immediate processing, and offer escalation or retry later',
      },
      {
        letter: 'D',
        text: 'Confirm the refund will be processed and close the conversation, since the system has all necessary information to complete it automatically',
      },
    ],
  },
  {
    id: 'Q36',
    group: 'customer_support',
    text: 'A customer writes: "I\'ve been going back and forth on this return for days. I just want to speak to someone who can actually help me." The agent has confirmed via `lookup_order` that the return is straightforward—within policy and eligible for immediate processing.\nWhat should the agent do?',
    options: [
      {
        letter: 'A',
        text: 'Acknowledge frustration, inform them this is resolvable now, and offer to complete it or escalate',
      },
      {
        letter: 'B',
        text: "Call `escalate_to_human` immediately to honor the customer's request",
      },
      {
        letter: 'C',
        text: "Process the refund via `process_refund` to resolve the underlying issue, then inform them it's complete",
      },
      {
        letter: 'D',
        text: "Ask what specifically hasn't worked in previous attempts before deciding whether to escalate or resolve automatically",
      },
    ],
  },
  {
    id: 'Q37',
    group: 'customer_support',
    text: "The agent verifies customer identity through a multi-step process before resetting passwords. During testing, you notice that after the customer answers the third verification question, the agent asks them to provide their name again, as if the earlier exchange never happened.\nWhat's the most likely cause of this behavior?",
    options: [
      {
        letter: 'A',
        text: "The verification tool is clearing the agent's internal state after each successful validation step.",
      },
      {
        letter: 'B',
        text: 'The prompt lacks instructions telling Claude to remember information across multiple exchanges.',
      },
      {
        letter: 'C',
        text: "The conversation history isn't being passed in subsequent API requests.",
      },
      {
        letter: 'D',
        text: "Claude's memory retention is limited to two conversational turns by default, requiring explicit configuration to extend it.",
      },
    ],
  },
  {
    id: 'Q38',
    group: 'customer_support',
    text: 'Production logs reveal inconsistent error handling: when `lookup_order` fails, the agent sometimes retries 5+ times (wasteful when the order ID doesn\'t exist), sometimes escalates immediately (premature for temporary network issues), and sometimes asks users for clarification (inappropriate when the issue is a backend permission error). Investigation shows your MCP tool returns uniform error responses: {"isError": true, "content": [{"type": "text", "text": "Operation failed"}]}. The agent cannot distinguish between error types.\nWhat\'s the most effective improvement?',
    options: [
      {
        letter: 'A',
        text: 'Enhance error responses with structured metadata: include errorCategory (transient/validation/permission), isRetryable boolean, and a description of what caused the failure.',
      },
      {
        letter: 'B',
        text: 'Create an `analyze_error` MCP tool the agent calls after any failure to determine the error category and recommended action.',
      },
      {
        letter: 'C',
        text: 'Implement retry logic with exponential backoff in your MCP server for all errors, returning to the agent only after retries are exhausted.',
      },
      {
        letter: 'D',
        text: 'Add few-shot examples to the system prompt demonstrating how to interpret error message patterns and select appropriate responses for each.',
      },
    ],
  },
  {
    id: 'Q39',
    group: 'customer_support',
    text: 'When the agent calls `lookup_order` and receives order details showing the item was purchased 45 days ago, how does the agentic loop determine whether to call `process_refund` or `escalate_to_human` next?',
    options: [
      {
        letter: 'A',
        text: "The orchestration layer automatically routes to the next tool based on the order's status field.",
      },
      {
        letter: 'B',
        text: 'The agent follows a pre-configured decision tree mapping order attributes to specific tool calls.',
      },
      {
        letter: 'C',
        text: 'The order details are added to the conversation and the model reasons about which action to take.',
      },
      {
        letter: 'D',
        text: 'The agent executes the remaining steps in a tool sequence planned at the start of the request.',
      },
    ],
  },
  {
    id: 'Q40',
    group: 'customer_support',
    text: 'A customer sends: "This is frustrating. I\'ve explained my issue twice and nothing is being resolved. I want to talk to a real person NOW." The agent has not yet called any tools to investigate their account.\nWhat should the agent do?',
    options: [
      {
        letter: 'A',
        text: 'Acknowledge the frustration and ask one targeted question to understand the specific issue before escalating.',
      },
      {
        letter: 'B',
        text: 'Briefly explain what the agent can help with and offer to resolve the issue quickly, escalating only if the customer repeats their request.',
      },
      {
        letter: 'C',
        text: 'Immediately call `escalate_to_human` with the conversation history.',
      },
      {
        letter: 'D',
        text: 'First call `get_customer` and `lookup_order` to gather account context, then escalate to a human agent.',
      },
    ],
  },
  {
    id: 'Q41',
    group: 'customer_support',
    text: "Your agent is handling a billing dispute. After calling `get_customer` and `lookup_order`, it identifies that the dispute involves a promotional pricing error requiring manager approval—beyond the agent's authorization level.\nHow should the workflow handle this mid-process escalation?",
    options: [
      {
        letter: 'A',
        text: "Call `escalate_to_human` passing only the customer's original message.",
      },
      {
        letter: 'B',
        text: 'Compile a structured handoff with customer details, order info, and the identified issue before calling `escalate_to_human`.',
      },
      {
        letter: 'C',
        text: 'Attempt the refund with `process_refund` anyway, escalating only if the system rejects the transaction.',
      },
      {
        letter: 'D',
        text: 'Persist the complete conversation and tool response history to a database, then call `escalate_to_human` with a reference ID.',
      },
    ],
  },
  {
    id: 'Q42',
    group: 'customer_support',
    text: 'A customer raises three separate issues during one session: a refund inquiry (turns 1-15), a subscription question (turns 16-30), and a payment method update (turns 31-45). At turn 48, the customer asks "What happened with my refund?" The conversation is approaching context limits.\nWhat strategy best maintains the agent\'s ability to address all issues throughout the session?',
    options: [
      {
        letter: 'A',
        text: 'Extract and persist structured issue data (order IDs, amounts, statuses) into a separate context layer.',
      },
      {
        letter: 'B',
        text: 'Rely on MCP tools to re-fetch relevant information on demand when the customer references earlier issues.',
      },
      {
        letter: 'C',
        text: 'Summarize earlier turns into a narrative description, preserving full message history only for the active issue.',
      },
      {
        letter: 'D',
        text: 'Implement sliding window context that retains the most recent 30 turns.',
      },
    ],
  },
  {
    id: 'Q43',
    group: 'customer_support',
    text: 'When implementing your `lookup_order` MCP tool, the backend sometimes returns errors (e.g., "Order not found" or temporary database failures).\nWhat is the correct pattern for communicating these errors back to the agent?',
    options: [
      {
        letter: 'A',
        text: 'Log the error server-side and return an empty result to avoid confusing the model',
      },
      {
        letter: 'B',
        text: 'Return the error message in the tool result content with the isError flag set to true',
      },
      {
        letter: 'C',
        text: 'Throw an exception from the tool handler so the agent framework can catch and log it',
      },
      {
        letter: 'D',
        text: 'Return a success response with a "status" field indicating the error type',
      },
    ],
  },
  {
    id: 'Q44',
    group: 'customer_support',
    text: 'Your `process_refund` tool returns two types of errors: technical errors ("503 Service Unavailable", "Connection timeout") that are transient (5% of calls), and business errors ("Order exceeds 30-day return window", "Item already refunded") that are permanent (12% of calls). Monitoring shows the agent wastes 3-4 turns retrying business errors that can never succeed. Currently, both error types return only a plain text message to Claude.\nWhat\'s the most effective way to reduce wasted retries while improving customer-facing response quality?',
    options: [
      {
        letter: 'A',
        text: 'Return structured error responses with retryable: false for business errors and a customer-friendly explanation for Claude to use.',
      },
      {
        letter: 'B',
        text: 'Add few-shot examples showing how to distinguish retryable from non-retryable errors by parsing error message text.',
      },
      {
        letter: 'C',
        text: 'Add a `check_refund_eligibility` tool that must be called before `process_refund` to prevent business rule violations.',
      },
      {
        letter: 'D',
        text: 'Implement automatic retry logic at the tool level for technical errors only, passing business errors to Claude without retries.',
      },
    ],
  },
  {
    id: 'Q45',
    group: 'customer_support',
    text: "Your agent has called `lookup_order` multiple times while investigating a customer's return requests. Each response includes 40+ fields (items, shipping details, payment info, status history). Tool outputs now represent the majority of the conversation's context. The customer mentions two more orders they want to discuss.\nWhat's the most effective approach before making additional lookups?",
    options: [
      {
        letter: 'A',
        text: 'Extract only return-relevant fields (items, purchase date, return window, status) from each existing order response, removing verbose details',
      },
      {
        letter: 'B',
        text: "Have the model generate a natural language summary of each order's key details, replacing structured responses with prose descriptions",
      },
      {
        letter: 'C',
        text: 'Move all tool responses to a vector database with semantic indexing, retrieving relevant portions as the conversation continues',
      },
      {
        letter: 'D',
        text: 'Proceed with additional lookups without modifying the existing tool output context',
      },
    ],
  },
  {
    id: 'Q46',
    group: 'extraction_pipeline',
    text: 'Your extraction system processes two document types: standard monthly reports (archived after processing) and urgent exception reports (must trigger business alerts within 30 minutes of receipt). Both use the same JSON schema. You want to minimize API costs while meeting latency requirements.\nHow should you architect the processing pipeline?',
    options: [
      {
        letter: 'A',
        text: 'Submit all documents to the real-time Messages API to ensure consistent processing latency across document types.',
      },
      {
        letter: 'B',
        text: 'Submit all documents to the `Batch API` with `custom_ids` for tracking. When results arrive, immediately process urgent documents and trigger delayed alerts for exceptions.',
      },
      {
        letter: 'C',
        text: 'Queue all documents and submit hourly batches, flagging urgent documents for expedited handling when batch results return.',
      },
      {
        letter: 'D',
        text: 'Route standard reports to the `Batch API` for 50% cost savings, and route urgent exception reports to the real-time Messages API.',
      },
    ],
  },
  {
    id: 'Q47',
    group: 'extraction_pipeline',
    text: 'Your schema includes a skills: string[] field. Production monitoring reveals three consistency issues: (1) compound phrases like "Python and SQL" are sometimes kept as one entry, sometimes split; (2) implied but unstated skills occasionally appear in extractions; (3) similar documents produce wildly different array lengths (5-10 vs 40+ entries). Your prompt currently says "Extract all skills mentioned."\nWhat\'s the most effective improvement?',
    options: [
      {
        letter: 'A',
        text: 'Add few-shot examples demonstrating compound phrase handling, explicit mention criteria, and appropriate entry granularity.',
      },
      {
        letter: 'B',
        text: 'Add constraints: "Extract 10-20 skills maximum, one skill per entry, only explicitly named skills."',
      },
      {
        letter: 'C',
        text: 'Add post-extraction normalization that maps skills to a canonical taxonomy and deduplicates similar entries.',
      },
      {
        letter: 'D',
        text: 'Enrich the schema to {skill: string, confidence: float, `source_quote`: string}[] to capture extraction metadata.',
      },
    ],
  },
  {
    id: 'Q48',
    group: 'extraction_pipeline',
    text: 'Your system has been operating with 100% human review for 3 months. Analysis shows that extractions with model confidence >90% have 97% accuracy overall. To reduce reviewer workload, you plan to automate high-confidence extractions. Before deploying, what validation step is most critical?',
    options: [
      {
        letter: 'A',
        text: 'Analyze accuracy by document type and field to verify high-confidence extractions perform consistently across all segments, not just in aggregate.',
      },
      {
        letter: 'B',
        text: 'Compare accuracy at different confidence thresholds (85%, 90%, 95%) to find the optimal cutoff that maximizes automation while minimizing errors.',
      },
      {
        letter: 'C',
        text: 'Run a two-week pilot routing 25% of high-confidence extractions directly to downstream systems and monitor error reports.',
      },
      {
        letter: 'D',
        text: 'Verify that 97% accuracy meets requirements for all downstream systems that consume the extracted data.',
      },
    ],
  },
  {
    id: 'Q49',
    group: 'extraction_pipeline',
    text: 'Your extraction pipeline processes contracts that frequently include amendments. When a contract contains both original terms and later amendments (e.g., original clause specifies "30-day payment terms" while Amendment 1 changes this to "45 days"), the model inconsistently extracts one value or the other with no indication of which applies.\nWhat\'s the most effective approach to improve extraction accuracy for documents with amendments?',
    options: [
      {
        letter: 'A',
        text: 'Redesign the schema so amended fields capture multiple values, each with source location and effective date.',
      },
      {
        letter: 'B',
        text: 'Add prompt instructions to always extract the most recent amendment value and ignore superseded original terms.',
      },
      {
        letter: 'C',
        text: 'Preprocess documents with a classifier that identifies and removes superseded sections before the main extraction step.',
      },
      {
        letter: 'D',
        text: 'Implement post-extraction validation using pattern matching to detect amendments and flag those extractions for manual review.',
      },
    ],
  },
  {
    id: 'Q50',
    group: 'extraction_pipeline',
    text: 'Your extraction system implements automatic retries when validation fails. On each retry, the specific validation error is appended to the prompt. This retry-with-error-feedback approach resolves most failures within 2-3 attempts.\nFor which failure pattern would additional retries be LEAST effective?',
    options: [
      {
        letter: 'A',
        text: 'The model extracts keywords as a nested object organized by category when the schema requires a flat array of strings',
      },
      {
        letter: 'B',
        text: 'The model extracts citation counts as locale-formatted strings ("1,234") when the schema requires integers',
      },
      {
        letter: 'C',
        text: 'The model extracts dates as ISO 8601 datetime strings ("2023-03-15T00:00:00Z") when the schema requires only the date portion (YYYY-MM-DD)',
      },
      {
        letter: 'D',
        text: 'The model extracts "et al." for co-authors when the full list exists only in an external document not in the input',
      },
    ],
  },
  {
    id: 'Q51',
    group: 'extraction_pipeline',
    text: 'Your extraction pipeline processes restaurant menus and must output structured JSON with fields for item names, descriptions, prices, and dietary tags. Some menus use inconsistent formatting—prices as "$12" vs "12.00", dietary info as icons vs text.\nWhat\'s the most reliable approach?',
    options: [
      {
        letter: 'A',
        text: 'Use separate extraction calls for each field to ensure consistent handling of each type.',
      },
      {
        letter: 'B',
        text: 'Extract data as-is and normalize formats in post-processing code after Claude returns.',
      },
      {
        letter: 'C',
        text: 'Request multiple extraction attempts per document and select the most common format.',
      },
      {
        letter: 'D',
        text: 'Define a strict output schema and include format normalization rules in your prompt.',
      },
    ],
  },
  {
    id: 'Q52',
    group: 'extraction_pipeline',
    text: 'Your system extracts event metadata (date, location, organizer, `attendee_count`) from news articles using a JSON schema with all nullable fields. During evaluation, you observe the model frequently generates plausible but incorrect values for fields not mentioned in the article—for example, outputting "500" for `attendee_count` when the source contains no attendance information.\nWhat\'s the most effective way to reduce these false extractions?',
    options: [
      {
        letter: 'A',
        text: 'Add a post-processing step using a second LLM call to verify each extracted value exists in the source document.',
      },
      {
        letter: 'B',
        text: 'Add prompt instructions to return null for any field where information is not directly stated in the source.',
      },
      {
        letter: 'C',
        text: 'Make all schema fields required (non-nullable) with strict validation rules to ensure the model only outputs verifiable data.',
      },
      {
        letter: 'D',
        text: 'Upgrade to a more capable model tier with improved instruction-following to reduce hallucination tendencies.',
      },
    ],
  },
  {
    id: 'Q53',
    group: 'extraction_pipeline',
    text: "After implementing tool use with strict schema definitions, JSON syntax errors are eliminated, but 5% of extractions still have valid JSON with empty arrays or null values for required fields like citations and methodology. Spot-checking reveals that source documents contain this information, but in varied formats—inline citations vs. bibliographies, methodology sections vs. details embedded in introductions.\nWhat's the most effective way to address these failures?",
    options: [
      {
        letter: 'A',
        text: 'Implement retry logic that re-sends requests when validation detects empty required fields.',
      },
      {
        letter: 'B',
        text: 'Build a regex-based post-processing layer that scans source documents for citation patterns and methodology keywords, populating empty fields when the model fails to extract.',
      },
      {
        letter: 'C',
        text: 'Modify your schema to make citations and methodology optional, and flag incomplete records for manual review rather than failing validation.',
      },
      {
        letter: 'D',
        text: 'Add few-shot examples demonstrating extractions from documents with varied structures—showing how to identify citations in different formats and locate methodology details across section types.',
      },
    ],
  },
  {
    id: 'Q54',
    group: 'extraction_pipeline',
    text: "Your extraction pipeline processes invoices and extracts line items, subtotals, tax amounts, and grand totals. During evaluation, you discover that in 18% of extractions, the sum of extracted line item amounts doesn't match the extracted grand total—sometimes due to OCR errors in the source document, sometimes due to extraction mistakes by the model. Downstream accounting systems reject records with mismatched totals.\nWhat's the most effective approach to improve extraction reliability?",
    options: [
      {
        letter: 'A',
        text: 'Add a "`calculated_total`" field where the model sums extracted line items alongside a "`stated_total`" field. Flag records for human review when values differ.',
      },
      {
        letter: 'B',
        text: 'Extract line items and totals independently, then use a separate validation model to reconcile discrepancies by determining which extracted values are most likely correct.',
      },
      {
        letter: 'C',
        text: 'Add few-shot examples demonstrating invoices where extracted line items sum correctly to the stated total, encouraging the model to produce mathematically consistent extractions.',
      },
      {
        letter: 'D',
        text: "Implement post-processing that automatically adjusts line item amounts proportionally when their sum doesn't match the stated total.",
      },
    ],
  },
  {
    id: 'Q55',
    group: 'extraction_pipeline',
    text: 'Your pipeline uses a tool called `extract_metadata` with a JSON schema for paper details. You\'ve also defined `lookup_citations` and `verify_doi` tools for enrichment. During testing, you notice that when users include requests like "extract the metadata and tell me how cited it is," Claude sometimes calls `lookup_citations` first, which fails because it needs the DOI that `extract_metadata` would provide.\nWhat\'s the most effective way to ensure structured metadata extraction happens first?',
    options: [
      {
        letter: 'A',
        text: 'Set `tool_choice` to "any" so Claude must use a tool, combined with system prompt instructions prioritizing `extract_metadata`.',
      },
      {
        letter: 'B',
        text: 'Set `tool_choice` to "auto" and reorder the tool definitions so `extract_metadata` appears first in the tools array, since Claude prioritizes earlier-listed tools.',
      },
      {
        letter: 'C',
        text: 'Set `tool_choice` to {"type": "tool", "name": "`extract_metadata`"} and process the enrichment requests in subsequent turns after receiving the extracted metadata.',
      },
      {
        letter: 'D',
        text: 'Set `tool_choice` to {"type": "tool", "name": "`extract_metadata`"} for every API call in the pipeline, ensuring Claude always extracts metadata before any enrichment can occur.',
      },
    ],
  },
  {
    id: 'Q56',
    group: 'extraction_pipeline',
    text: 'Your extraction uses tool use with a JSON schema where `property_type` is defined as an enum: [\'house\', \'apartment\', \'condo\', \'townhouse\']. After deployment, 8% of extractions fail schema validation. Investigation reveals listings mention many uncommon property types—"studio", "loft", "duplex", "mobile home", "tiny house", "converted warehouse"—and new types continue appearing regularly.\nWhat\'s the most effective long-term solution?',
    options: [
      {
        letter: 'A',
        text: 'Continuously expand the enum to include newly observed property types and add monitoring for additional edge cases.',
      },
      {
        letter: 'B',
        text: 'Add an "other" value to your enum with a separate `property_type_detail` string field for specifics when "other" is selected.',
      },
      {
        letter: 'C',
        text: 'Change `property_type` from an enum to a free-form string and implement a normalization step in post-processing.',
      },
      {
        letter: 'D',
        text: 'Add few-shot examples to your prompt demonstrating how to map unexpected property types to the closest existing enum value.',
      },
    ],
  },
  {
    id: 'Q57',
    group: 'extraction_pipeline',
    text: 'Your extraction system parses e-commerce product descriptions to extract specifications like dimensions, weight, and materials into JSON. Despite having a well-defined schema, the model inconsistently extracts the "materials" field—sometimes returning "cotton blend", other times "Cotton/Polyester mix", and occasionally omitting the field when material information is clearly present in the source.\nWhat\'s the most effective way to improve extraction consistency?',
    options: [
      {
        letter: 'A',
        text: 'Make the "materials" field required instead of optional in the schema to force the model to always extract a value',
      },
      {
        letter: 'B',
        text: 'Switch to a more capable model tier since inconsistent extraction indicates insufficient model capability',
      },
      {
        letter: 'C',
        text: 'Set temperature to 0 to eliminate randomness and ensure deterministic outputs',
      },
      {
        letter: 'D',
        text: 'Add few-shot examples showing 2-3 complete input-output pairs with standardized material description formats',
      },
    ],
  },
  {
    id: 'Q58',
    group: 'extraction_pipeline',
    text: 'Documents arrive continuously throughout business hours and need structured data extracted. To reduce costs, you want to use the `Message Batches API` (50% discount, up-to-24-hour processing window). Your SLA specifies that extraction results must be available within 30 hours of document arrival with 99.9% reliability.\nWhich batching strategy is most appropriate?',
    options: [
      {
        letter: 'A',
        text: 'Submit batches every 6 hours containing documents from that window',
      },
      {
        letter: 'B',
        text: 'Submit a single batch at end of day containing all documents from that day',
      },
      {
        letter: 'C',
        text: 'Submit batches every 4 hours containing documents from that window',
      },
      {
        letter: 'D',
        text: 'Use the real-time API for all documents instead of batch processing',
      },
    ],
  },
  {
    id: 'Q59',
    group: 'extraction_pipeline',
    text: 'After deployment, you find that 12% of extractions contain semantic errors that pass JSON schema validation (e.g., a duration like "30 minutes" incorrectly placed in an ingredient quantity field). Human reviewers have capacity to check only 20% of extractions.\nWhich approach most effectively allocates reviewer attention?',
    options: [
      {
        letter: 'A',
        text: 'Have the model output field-level confidence scores, then calibrate review thresholds using a labeled validation set.',
      },
      {
        letter: 'B',
        text: 'Randomly sample 20% of extractions for review, using corrections to track accuracy and identify error patterns.',
      },
      {
        letter: 'C',
        text: 'Prioritize review of all extractions where required fields are empty or explicitly marked as not found.',
      },
      {
        letter: 'D',
        text: 'Review all extractions from documents with formatting anomalies such as unusual layouts or mixed content types.',
      },
    ],
  },
  {
    id: 'Q60',
    group: 'extraction_pipeline',
    text: 'After your daily batch of 10,000 documents completes, 300 documents (3%) failed with "`context_length_exceeded`" errors. The results file identifies each failure by `custom_id`.\nWhat\'s the most cost-effective approach to process these failures?',
    options: [
      {
        letter: 'A',
        text: 'Reprocess the entire batch with prompt caching enabled to reduce the cost of retrying requests with identical system prompts',
      },
      {
        letter: 'B',
        text: 'Resubmit only the 300 failed documents after chunking them into smaller pieces, then combine the partial extractions',
      },
      {
        letter: 'C',
        text: 'Resubmit the entire 10,000 document batch using a model tier with a larger context window',
      },
      {
        letter: 'D',
        text: 'Increase the `max_tokens` parameter for the 300 failed documents and resubmit them in a new batch',
      },
    ],
  },
];
