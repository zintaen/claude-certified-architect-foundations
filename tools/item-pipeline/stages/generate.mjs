/** Mockable generation stage. */

export function createMockTransport(responses) {
  let calls = 0;
  let lastPrompts = [];
  return {
    calls: () => calls,
    lastPrompts: () => lastPrompts,
    async submit(prompts) {
      calls += 1;
      lastPrompts = prompts;
      const estimatedUsd = prompts.length * 0.02;
      return { batchId: `mock-${calls}`, estimatedUsd };
    },
    async poll() {
      return 'complete';
    },
    async fetch(batchId) {
      void batchId;
      return Array.from({ length: lastPrompts.length }, (_, i) =>
        JSON.stringify(responses[i] ?? defaultItem(i))
      );
    },
  };
}

function defaultItem(i) {
  return {
    draft_id: `draft-${i + 1}`,
    stem: `Scenario ${i + 1}: which architecture choice best fits the constraints described for agent coordination under partial failure?`,
    options: [
      { key: 'A', text: 'Keep a single agent with unbounded context.' },
      { key: 'B', text: 'Delegate to specialized sub-agents and persist structured reports.' },
      { key: 'C', text: 'Average conflicting tool outputs without verification.' },
      { key: 'D', text: 'Disable all tools to reduce complexity.' },
    ],
    correct_key: 'B',
    cognitive: 'application',
  };
}

export async function runGenerate({
  cfg,
  targets,
  blueprintText,
  rulebook,
  transport,
  assemblePrompt,
}) {
  const prompts = targets.map((t) => assemblePrompt({ blueprintText, rulebook, target: t }));
  const estimate = prompts.length * 0.02;
  if (estimate > cfg.maxUsd) {
    const err = new Error(`budget abort: estimate $${estimate} exceeds maxUsd $${cfg.maxUsd}`);
    err.code = 'BUDGET_ABORT';
    throw err;
  }
  const { batchId, estimatedUsd } = await transport.submit(prompts);
  const status = await transport.poll(batchId);
  if (status !== 'complete') throw new Error(`batch ${batchId} status ${status}`);
  const raw = await transport.fetch(batchId);
  const items = raw.map((line, i) => {
    const parsed = typeof line === 'string' ? JSON.parse(line) : line;
    return {
      ...parsed,
      domain: targets[i]?.domain,
      objective: targets[i]?.objective,
      cognitive: parsed.cognitive || targets[i]?.cognitive,
      provenance: {
        item_id: parsed.draft_id,
        blueprint_ref: {
          domain: targets[i]?.domain,
          objective: targets[i]?.objective,
          blueprint_doc: cfg.blueprintDoc,
        },
        origin: {
          method: 'blueprint_generation',
          model: cfg.model.generate,
          prompt_ref: `run-manifest#prompt:${i}`,
          generated_at: new Date().toISOString(),
        },
        reviewer: '',
        reviewed_at: '',
        similarity_check: {
          method: 'pending',
          corpus_ref: cfg.corpusRef,
          max_score: 0,
          verdict: 'clear',
          checked_at: '',
        },
        disposition: 'active',
        record_version: 1,
      },
    };
  });
  return { items, batchId, estimatedUsd, prompts };
}
