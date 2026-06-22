// Original, per-domain sample questions for the public /sample-questions/[domain] SEO pages.
//
// These are written from scratch for the marketing pages and are intentionally SEPARATE from the
// real 60-question mock bank (src/data/questions.public.ts / questions.server.ts), so showing their
// answers here never leaks the graded exam. Five per domain, each with four options, one correct,
// an explanation for every option, and a one-line takeaway.

import type { GroupId } from '@/lib/domains';

export type SampleOption = {
  letter: string;
  text: string;
  explanation: string;
  correct?: boolean;
};

export type SampleQuestion = {
  question: string;
  options: SampleOption[];
  why: string;
};

export const SAMPLE_BY_DOMAIN: Record<GroupId, SampleQuestion[]> = {
  research_pipeline: [
    {
      question:
        'A research agent must gather facts from eight independent web sources and produce one synthesis. None of the sources depend on each other. Which dispatch pattern stays fast without flooding the coordinator context?',
      options: [
        {
          letter: 'A',
          text: 'Read all eight sources into the coordinator context, then write the synthesis in a single pass.',
          explanation:
            'One context holding eight full sources crowds out the synthesis and risks truncation, and it serializes all the reading.',
        },
        {
          letter: 'B',
          text: 'Dispatch eight sub-agents in parallel, each returning a short structured summary with citations, then synthesize from the summaries.',
          explanation:
            'Independent work runs concurrently, and compact per-source summaries keep the coordinator context small enough to reason over all eight.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Process the sources one at a time in a single agent, appending each full page to the running prompt.',
          explanation:
            'Sequential reading is slow, and the growing prompt of full pages is the exact context bloat to avoid.',
        },
        {
          letter: 'D',
          text: 'Pick the two sources that look most promising and ignore the rest to save tokens.',
          explanation:
            'Dropping six sources trades coverage for cost and undercuts the point of a research pass.',
        },
      ],
      why: 'Independent sources are a fan-out: run them in parallel and return compact, cited summaries so the coordinator can synthesize without holding every full page.',
    },
    {
      question:
        'Two sub-agents return conflicting figures for the same metric, each with moderate confidence. Before the coordinator writes the final answer, the best move is to:',
      options: [
        {
          letter: 'A',
          text: 'Average the two numbers and move on.',
          explanation: 'Averaging conflicting facts invents a figure that neither source supports.',
        },
        {
          letter: 'B',
          text: 'Take whichever sub-agent answered first.',
          explanation: 'Order of arrival says nothing about which figure is right.',
        },
        {
          letter: 'C',
          text: 'Run a focused check that re-fetches the metric from the primary source and resolves the conflict before synthesizing.',
          explanation:
            'A targeted verification against the source of record settles the conflict with evidence rather than a guess.',
          correct: true,
        },
        {
          letter: 'D',
          text: 'Include both numbers in the final answer and let the reader decide.',
          explanation:
            'Passing an unresolved contradiction downstream moves the problem to the user instead of solving it.',
        },
      ],
      why: 'When sub-agents disagree, resolve the conflict against the primary source before synthesizing, rather than averaging, guessing, or shipping the contradiction.',
    },
    {
      question:
        'You are designing how sub-agents report findings so the final research output can be audited later. Each finding should travel with:',
      options: [
        {
          letter: 'A',
          text: 'Only the claim text, to keep messages short.',
          explanation: 'A bare claim cannot be checked or trusted after the fact.',
        },
        {
          letter: 'B',
          text: 'The claim plus a reference to its source (URL or document id and location).',
          explanation:
            'Carrying the source with each claim makes the synthesis auditable and lets a reviewer or a later run verify any line.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'The full raw page the claim came from, inline in every message.',
          explanation:
            'Inlining whole pages bloats context; a reference keeps the source reachable without the bulk.',
        },
        {
          letter: 'D',
          text: 'A confidence score and nothing else.',
          explanation: 'Confidence without a source is an opinion no one can verify.',
        },
      ],
      why: 'Attach a source reference to every finding so the final answer is auditable and re-checkable, without inlining whole pages.',
    },
    {
      question:
        'A research agent keeps spawning follow-up searches and the run is not converging. The most reliable way to prevent an endless loop is to:',
      options: [
        {
          letter: 'A',
          text: 'Let it continue until it naturally stops.',
          explanation:
            'A loop that is not converging has no natural stop, so this burns budget indefinitely.',
        },
        {
          letter: 'B',
          text: 'Give the task an explicit budget and a coverage check, and stop once the questions are answered or the budget is spent.',
          explanation:
            'A defined budget plus a coverage test gives the run a clear, checkable stopping point.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Cut the run off at a random time.',
          explanation:
            'An arbitrary cutoff may stop mid-finding or far too late; it is not tied to the work.',
        },
        {
          letter: 'D',
          text: 'Add more sub-agents so it finishes sooner.',
          explanation: 'More agents widen the search and can deepen the loop rather than end it.',
        },
      ],
      why: 'Bound research with an explicit budget and a coverage check so the run stops when the questions are answered or the budget is reached, not whenever it happens to halt.',
    },
    {
      question:
        'Three sub-agents searched overlapping territory and several findings repeat across their reports. Before synthesis, the coordinator should:',
      options: [
        {
          letter: 'A',
          text: 'Concatenate all three reports verbatim into the final answer.',
          explanation:
            'Verbatim concatenation ships the duplicates and pads the output with repetition.',
        },
        {
          letter: 'B',
          text: 'Keep the first report and discard the other two unread.',
          explanation: 'Discarding two reports unread loses the unique findings they hold.',
        },
        {
          letter: 'C',
          text: 'Merge the reports, collapse duplicate findings, and keep one cited instance of each.',
          explanation:
            'Merging and de-duplicating preserves every distinct finding once, with its source, and drops the noise.',
          correct: true,
        },
        {
          letter: 'D',
          text: 'Ask the user to remove the duplicates.',
          explanation: 'De-duplication is the agent job here, not work to push back onto the user.',
        },
      ],
      why: 'Merge overlapping sub-agent reports and collapse duplicates to one cited instance each, keeping every distinct finding without the repetition.',
    },
  ],
  extraction_pipeline: [
    {
      question:
        'An invoice extractor reads dates like 03/04/2025 that could be March 4 or April 3. The design that avoids silent errors is to:',
      options: [
        {
          letter: 'A',
          text: 'Assume the United States month-first format everywhere.',
          explanation:
            'A blanket assumption silently mislabels every locale that writes the day first.',
        },
        {
          letter: 'B',
          text: 'Require an ISO date in the output schema, and when the input is ambiguous, flag the field for review instead of guessing.',
          explanation:
            'A strict output format plus an explicit ambiguity flag keeps bad dates out of the data and surfaces the ones that need a human.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Store the date as the raw string and sort it out later.',
          explanation:
            'Deferring the parse pushes the ambiguity downstream where it is harder to resolve.',
        },
        {
          letter: 'D',
          text: 'Drop any date that is ambiguous.',
          explanation:
            'Silently dropping data loses records that are often recoverable with a quick check.',
        },
      ],
      why: 'Pin the output to an unambiguous format and flag genuinely ambiguous inputs for review, rather than assuming one locale or discarding data.',
    },
    {
      question:
        'A field the schema expects is simply not present in the source document. The extractor should:',
      options: [
        {
          letter: 'A',
          text: 'Fill the field with a plausible value inferred from the rest of the document.',
          explanation: 'Inventing a value is a hallucination that corrupts the record quietly.',
        },
        {
          letter: 'B',
          text: 'Return null for that field and mark it as not found, leaving the rest of the extraction intact.',
          explanation:
            'An explicit null with a not-found marker is honest and keeps the other fields usable.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Fail the entire extraction because one field is missing.',
          explanation: 'One absent optional field should not throw away the data that was found.',
        },
        {
          letter: 'D',
          text: 'Repeat the previous record value for that field.',
          explanation:
            'Carrying a value over from another record fabricates data and is hard to detect later.',
        },
      ],
      why: 'Represent a missing field as an explicit null marked not-found, rather than inventing a value or discarding the whole record.',
    },
    {
      question:
        'A contract is too long to fit in one context window, and you need fields from across the whole document. The dependable approach is to:',
      options: [
        {
          letter: 'A',
          text: 'Truncate the document to what fits and extract from the first part.',
          explanation:
            'Truncation drops the sections where later fields live and silently loses them.',
        },
        {
          letter: 'B',
          text: 'Chunk the document with slight overlap, extract per chunk, then merge and reconcile the fields.',
          explanation:
            'Overlapping chunks plus a merge step cover the whole document and catch fields that straddle a boundary.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Summarize the document first, then extract from the summary.',
          explanation: 'A summary drops the exact values extraction needs and adds a lossy step.',
        },
        {
          letter: 'D',
          text: 'Raise the temperature so the model fills in the missing parts.',
          explanation:
            'Temperature changes variation, not coverage; it cannot recover content the model never saw.',
        },
      ],
      why: 'For oversized inputs, chunk with overlap and merge the per-chunk results, rather than truncating or extracting from a lossy summary.',
    },
    {
      question:
        'An extractor must label each support ticket with one of five priority levels. To stop the model from inventing new labels, you should:',
      options: [
        {
          letter: 'A',
          text: 'Ask for the priority as free text and clean it up afterward.',
          explanation:
            'Free text invites variants like urgent, URGENT, and P1 that you then have to reconcile.',
        },
        {
          letter: 'B',
          text: 'Constrain the field to the five allowed values in the schema or tool definition, and reject anything else.',
          explanation:
            'An enumerated, validated field forces the output into the known set and rejects stray labels at the source.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'List the five levels in the prompt and hope the model complies.',
          explanation:
            'A prompt hint is not enforcement; the model can still return something off-list.',
        },
        {
          letter: 'D',
          text: 'Accept any label and map unknowns to the closest match later.',
          explanation: 'Post-hoc mapping is guesswork that can silently mis-bucket tickets.',
        },
      ],
      why: 'Constrain category fields to an enumerated, validated set so the output stays on-list, rather than relying on prompt wording or cleanup afterward.',
    },
    {
      question:
        'An extractor pulls line items and an invoice total from a receipt. The strongest integrity check before accepting the output is to:',
      options: [
        {
          letter: 'A',
          text: 'Trust the total field because it is printed prominently.',
          explanation: 'A printed total can be misread or itself be wrong; trust is not a check.',
        },
        {
          letter: 'B',
          text: 'Verify that the line items sum to the extracted total, and on a mismatch retry or flag the record.',
          explanation:
            'A sum check ties the parts to the whole and catches both misread line items and a misread total.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Check only that the total is a number.',
          explanation: 'A type check confirms it is numeric, not that it is correct.',
        },
        {
          letter: 'D',
          text: 'Accept the first extraction without checking.',
          explanation: 'Skipping validation lets arithmetic errors pass straight into the data.',
        },
      ],
      why: 'Cross-check that line items reconcile with the stated total and retry or flag on a mismatch, rather than trusting any single printed figure.',
    },
  ],
  customer_support: [
    {
      question:
        'A user asks a support agent for specific legal advice about a contract dispute. The right behavior is to:',
      options: [
        {
          letter: 'A',
          text: 'Give the best legal opinion the agent can produce.',
          explanation:
            'Offering legal advice the agent is not qualified to give can cause real harm.',
        },
        {
          letter: 'B',
          text: 'Say plainly this is outside what support can advise on, and point the user to the right resource or a human.',
          explanation:
            'Naming the limit and redirecting to the right channel serves the user without overstepping.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Answer vaguely so the agent does not commit to anything.',
          explanation: 'A vague non-answer wastes the user time and still implies advice.',
        },
        {
          letter: 'D',
          text: 'Ignore the legal part and answer something easier.',
          explanation: 'Sidestepping the actual question leaves the user unhelped.',
        },
      ],
      why: 'For out-of-scope requests, state the boundary honestly and redirect to the right resource, rather than improvising advice or dodging.',
    },
    {
      question:
        'A frustrated customer demands a refund that the policy does not allow. The best response is to:',
      options: [
        {
          letter: 'A',
          text: 'Grant the refund anyway to calm them down.',
          explanation: 'Overriding policy under pressure is unfair and not the agent call to make.',
        },
        {
          letter: 'B',
          text: 'Acknowledge the frustration, state the policy plainly, and offer the options that do exist.',
          explanation:
            'Empathy plus a clear statement of the rule and the real alternatives is honest and still helpful.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Restate the policy firmly and end the conversation.',
          explanation: 'A flat refusal with no alternative leaves the customer with nowhere to go.',
        },
        {
          letter: 'D',
          text: 'Promise to escalate without intending to.',
          explanation: 'A hollow promise breaks trust the moment nothing happens.',
        },
      ],
      why: 'Acknowledge the feeling, state the policy honestly, and offer the genuine alternatives, rather than caving, stonewalling, or making an empty promise.',
    },
    {
      question:
        'A support agent order-status tool returns data that looks stale and contradicts what the customer sees. The agent should:',
      options: [
        {
          letter: 'A',
          text: 'Report the tool value confidently as the truth.',
          explanation:
            'Asserting data that looks wrong risks telling the customer something false.',
        },
        {
          letter: 'B',
          text: 'Tell the customer the system shows a possibly outdated status, and verify or escalate before committing to it.',
          explanation:
            'Caveating uncertain data and checking before committing keeps the answer honest.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Side with whatever the customer says without checking.',
          explanation:
            'Accepting the customer version uncritically can be just as wrong as trusting bad data.',
        },
        {
          letter: 'D',
          text: 'Keep retrying the tool silently until it agrees with the customer.',
          explanation: 'Looping for an answer that matches expectations is not verification.',
        },
      ],
      why: 'Treat suspect tool data as uncertain: caveat it and verify or escalate before committing, rather than asserting it or guessing.',
    },
    {
      question:
        'An agent has tried three times to resolve a billing issue and the customer is still stuck. The right next step is to:',
      options: [
        {
          letter: 'A',
          text: 'Try the same resolution a fourth time.',
          explanation:
            'Repeating a path that has failed three times is unlikely to work and wears the customer down.',
        },
        {
          letter: 'B',
          text: 'Escalate to a human with the full history and what has been tried, so the customer does not start over.',
          explanation:
            'A handoff carrying the context spares the customer a repeat and gives the human a running start.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Tell the customer to open a new ticket.',
          explanation:
            'Sending the customer back to the start discards the context already gathered.',
        },
        {
          letter: 'D',
          text: 'Close the conversation as resolved.',
          explanation:
            'Marking an unresolved issue resolved hides the problem and abandons the customer.',
        },
      ],
      why: 'After repeated failed attempts, escalate to a human with the full context, rather than retrying, restarting, or falsely closing.',
    },
    {
      question:
        'A customer asks a simple question that the agent can answer directly from the knowledge base. The agent should:',
      options: [
        {
          letter: 'A',
          text: 'Escalate every question to a human to be safe.',
          explanation:
            'Routing trivial questions to people defeats the purpose of the agent and slows the customer down.',
        },
        {
          letter: 'B',
          text: 'Answer the question directly and clearly, and offer escalation only if the customer needs more.',
          explanation:
            'Handling what it can and escalating only when needed is the efficient, helpful default.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Ask the customer to confirm three times before answering.',
          explanation: 'Needless confirmation loops frustrate a customer who just wants an answer.',
        },
        {
          letter: 'D',
          text: 'Give a long disclaimer and avoid answering.',
          explanation: 'Burying a simple answer under hedging is unhelpful.',
        },
      ],
      why: 'Answer what the agent can handle directly and reserve escalation for cases that actually need it, rather than escalating or hedging everything.',
    },
  ],
  code_exploration: [
    {
      question:
        'An agent must find why a specific error message is thrown in a large service. The most context-efficient first step is to:',
      options: [
        {
          letter: 'A',
          text: 'Read the whole service top to bottom to build a full picture.',
          explanation: 'Reading everything floods the context and buries the few relevant lines.',
        },
        {
          letter: 'B',
          text: 'Search for the exact error string, then open only the files and functions that produce or handle it.',
          explanation:
            'Searching the known string narrows the surface to the code that actually raises the error.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Open the largest file first on the assumption that is where the logic lives.',
          explanation: 'File size is not a signal for where a specific error originates.',
        },
        {
          letter: 'D',
          text: 'Rewrite the error handling and see if the message changes.',
          explanation:
            'Editing before locating the cause risks masking the bug rather than finding it.',
        },
      ],
      why: 'Start from the known signal, the error string, and open only the matching code, rather than reading the whole service or guessing by file size.',
    },
    {
      question:
        'An agent is dropped into an unfamiliar repository and asked to add a feature. The best way to orient without burning context is to:',
      options: [
        {
          letter: 'A',
          text: 'Load every file into context so nothing is missed.',
          explanation:
            'Loading the whole tree spends the context budget on noise before any work starts.',
        },
        {
          letter: 'B',
          text: 'Read the entry points and project structure, then search for the area the feature touches.',
          explanation:
            'Skimming structure and entry points, then searching to the relevant area, builds a working map cheaply.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Start editing the first file that looks related.',
          explanation:
            'Editing before understanding the structure invites changes in the wrong place.',
        },
        {
          letter: 'D',
          text: 'Ask the user to explain every file.',
          explanation: 'Offloading orientation to the user is slow and usually unnecessary.',
        },
      ],
      why: 'Orient from entry points and structure, then search to the relevant area, rather than loading the whole repo or editing blind.',
    },
    {
      question:
        'A single source file is thousands of lines long and the agent needs one function from it. The agent should:',
      options: [
        {
          letter: 'A',
          text: 'Read the entire file into context to be thorough.',
          explanation:
            'Pulling thousands of lines for one function wastes most of the context on the rest.',
        },
        {
          letter: 'B',
          text: 'Search within the file for the function and read only that region and its immediate dependencies.',
          explanation:
            'Targeting the function and what it touches keeps context focused on what the task needs.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Read the first few hundred lines and stop.',
          explanation: 'A fixed slice from the top may miss the function entirely.',
        },
        {
          letter: 'D',
          text: 'Reformat the file so it is easier to scan.',
          explanation:
            'Reformatting changes the file without helping locate the function and adds noise to the diff.',
        },
      ],
      why: 'Read the specific function and its immediate dependencies, not the whole large file or an arbitrary slice.',
    },
    {
      question:
        'Before renaming a widely used function, an agent needs to know what a change would break. The right move is to:',
      options: [
        {
          letter: 'A',
          text: 'Rename it and run the build to see what fails.',
          explanation:
            'Letting the compiler find every site is noisy, incomplete for dynamic calls, and risky in a large repo.',
        },
        {
          letter: 'B',
          text: 'Search the codebase for all references first, then plan the change across the call sites.',
          explanation:
            'Finding the references up front shows the blast radius before any edit and catches indirect uses.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Rename only the definition and assume callers will adapt.',
          explanation:
            'Callers do not adapt themselves; this breaks every site that used the old name.',
        },
        {
          letter: 'D',
          text: 'Add a second function and leave the old one untouched.',
          explanation: 'Duplicating logic without a plan grows the surface and leaves dead code.',
        },
      ],
      why: 'Map all references before a wide rename so the blast radius is known up front, rather than renaming first and reacting to failures.',
    },
    {
      question:
        'A README says the auth check happens in one module, but the agent must be sure before changing it. The agent should:',
      options: [
        {
          letter: 'A',
          text: 'Trust the README and edit the module it names.',
          explanation:
            'Docs drift from code, so trusting them can point the edit at the wrong place.',
        },
        {
          letter: 'B',
          text: 'Confirm in the current code where the auth check actually runs, then make the change there.',
          explanation:
            'Verifying against the live code grounds the edit in what is true now, not what the docs claim.',
          correct: true,
        },
        {
          letter: 'C',
          text: 'Search the commit history for the original author and ask them.',
          explanation:
            'Chasing the author is slow and unnecessary when the code itself is the source of truth.',
        },
        {
          letter: 'D',
          text: 'Assume the check moved and search at random.',
          explanation:
            'Random searching without using the README as a starting hint is inefficient.',
        },
      ],
      why: 'Verify where logic lives in the current code before editing, using docs only as a hint, because documentation drifts from the code.',
    },
  ],
};
