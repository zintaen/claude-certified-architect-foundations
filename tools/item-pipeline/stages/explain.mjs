/** Pre-generate per-option explanations via injectable batch transport. */

export async function runExplain({ items, transport, model, maxUsd, spendSoFar = 0 }) {
  const prompts = items.map((item) =>
    [
      'Write brief per-option explanations for this MCQ.',
      `Model: ${model}`,
      JSON.stringify({
        stem: item.stem,
        options: item.options,
        correct_key: item.correct_key,
      }),
      'Return JSON object mapping option keys to explanation strings.',
    ].join('\n')
  );
  const estimate = prompts.length * 0.015;
  if (spendSoFar + estimate > maxUsd) {
    const err = new Error(
      `budget abort: explain estimate $${estimate} would exceed maxUsd $${maxUsd}`
    );
    err.code = 'BUDGET_ABORT';
    throw err;
  }
  if (!prompts.length) return { items, estimatedUsd: 0, batchId: null };

  const { batchId, estimatedUsd } = await transport.submit(prompts);
  const status = await transport.poll(batchId);
  if (status !== 'complete') throw new Error(`explain batch ${batchId} status ${status}`);
  const raw = await transport.fetch(batchId);

  const out = items.map((item, i) => {
    let explanations;
    try {
      const parsed = typeof raw[i] === 'string' ? JSON.parse(raw[i]) : raw[i];
      const keys = (item.options || []).map((o) => o.key);
      const looksLike =
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        keys.every((k) => typeof parsed[k] === 'string');
      explanations = looksLike ? parsed : defaultExplanations(item);
    } catch {
      explanations = defaultExplanations(item);
    }
    return { ...item, explanations };
  });
  return { items: out, estimatedUsd, batchId };
}

function defaultExplanations(item) {
  return Object.fromEntries(
    (item.options || []).map((o) => [
      o.key,
      o.key === item.correct_key
        ? 'Correct: best architectural fit under the stated constraints.'
        : 'Distractor: weaker under the stated constraints.',
    ])
  );
}
