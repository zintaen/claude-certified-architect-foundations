/** Classical item stats + promotion gate. */

export function pValue(responses) {
  if (!responses.length) return null;
  return responses.filter((r) => r.is_correct).length / responses.length;
}

/** Point-biserial: corr between dichotomous item and total score. */
export function pointBiserial(itemCorrectFlags, totalScores) {
  const n = itemCorrectFlags.length;
  if (n < 2) return null;
  const meanTotal = totalScores.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(totalScores.reduce((s, x) => s + (x - meanTotal) ** 2, 0) / (n - 1));
  if (sd === 0) return 0;
  const p = itemCorrectFlags.filter(Boolean).length / n;
  const q = 1 - p;
  if (p === 0 || q === 0) return 0;
  const meanCorrect =
    totalScores.filter((_, i) => itemCorrectFlags[i]).reduce((a, b) => a + b, 0) /
    Math.max(1, itemCorrectFlags.filter(Boolean).length);
  const meanWrong =
    totalScores.filter((_, i) => !itemCorrectFlags[i]).reduce((a, b) => a + b, 0) /
    Math.max(1, itemCorrectFlags.filter((x) => !x).length);
  return ((meanCorrect - meanWrong) / sd) * Math.sqrt(p * q);
}

export function promotionDecision(stats, bounds) {
  if (stats.response_count < bounds.minResponses) {
    return { promote: false, reason: 'min_responses' };
  }
  if (stats.p_value < bounds.pValueMin || stats.p_value > bounds.pValueMax) {
    return { promote: false, reason: 'p_value_out_of_bounds' };
  }
  if (stats.point_biserial < bounds.pointBiserialMin) {
    return { promote: false, reason: 'discrimination_low' };
  }
  return { promote: true, reason: 'ok' };
}

export function degradationFlag(stats, bounds) {
  if (stats.response_count < bounds.minResponses) return null;
  if (
    stats.p_value < bounds.pValueMin ||
    stats.p_value > bounds.pValueMax ||
    stats.point_biserial < bounds.pointBiserialMin
  ) {
    return {
      verdict: 'revise',
      notes: 'stats degraded below promotion bounds; human disposition required',
    };
  }
  return null;
}
