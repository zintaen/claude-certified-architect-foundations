/** Deterministic item-writing rule checks + reviser cap. */

const FORBIDDEN = [/all of the above/i, /none of the above/i];

export function reviewItem(item, target) {
  const findings = [];
  if (!item.stem || item.stem.trim().length < 20) findings.push('stem_too_short');
  if (!item.options || item.options.length !== 4) findings.push('need_four_options');
  const keys = new Set((item.options || []).map((o) => o.key));
  if (keys.size !== 4) findings.push('duplicate_option_keys');
  if (!item.correct_key || !keys.has(item.correct_key)) findings.push('invalid_correct_key');

  const texts = (item.options || []).map((o) => o.text || '');
  for (const t of texts) {
    for (const re of FORBIDDEN) if (re.test(t)) findings.push('all_or_none_forbidden');
  }
  if (FORBIDDEN.some((re) => re.test(item.stem || ''))) findings.push('all_or_none_in_stem');

  // Cueing: correct option much longer than others
  if (texts.length === 4) {
    const lengths = texts.map((t) => t.length);
    const correctIdx = (item.options || []).findIndex((o) => o.key === item.correct_key);
    if (correctIdx >= 0) {
      const others = lengths.filter((_, i) => i !== correctIdx);
      const avg = others.reduce((a, b) => a + b, 0) / Math.max(1, others.length);
      if (lengths[correctIdx] > avg * 2.5 && lengths[correctIdx] - avg > 40) {
        findings.push('length_cueing');
      }
    }
  }

  if (target?.cognitive && item.cognitive && item.cognitive !== target.cognitive) {
    findings.push('bloom_mismatch');
  }

  // Exactly one correct — structural: correct_key points to one option
  if ((item.options || []).filter((o) => o.key === item.correct_key).length !== 1) {
    findings.push('not_single_correct');
  }
  if (Array.isArray(item.correct_keys) && item.correct_keys.length !== 1) {
    findings.push('not_single_correct');
  }
  if ((item.options || []).filter((o) => o.correct === true).length > 1) {
    findings.push('not_single_correct');
  }

  return { ok: findings.length === 0, findings: [...new Set(findings)] };
}

export function runReviewAuto(items, targets, maxIterations, reviseFn) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    const target = targets[i] || targets[0];
    let iterations = 0;
    let result = reviewItem(item, target);
    while (!result.ok && iterations < maxIterations) {
      iterations += 1;
      item = reviseFn(item, result.findings, target);
      result = reviewItem(item, target);
    }
    if (!result.ok) {
      out.push({
        ...item,
        status: 'rejected_auto',
        findings: result.findings,
        reviser_iterations: iterations,
      });
    } else {
      out.push({ ...item, status: 'passed_auto', findings: [], reviser_iterations: iterations });
    }
  }
  return out;
}
