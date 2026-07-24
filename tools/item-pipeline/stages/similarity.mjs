import {
  trigramSimilarity,
  SIMILARITY_THRESHOLD,
  ATTESTATION_LINE_PREFIX,
} from '../../../scripts/lib/bank-ids.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function assertCorpusAttestation(manifestText) {
  const line = manifestText
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith(ATTESTATION_LINE_PREFIX));
  if (!line || !/attested by \S+/i.test(line)) {
    const err = new Error(
      `corpus manifest missing attestation line '${ATTESTATION_LINE_PREFIX} attested by <name> <date>'`
    );
    err.code = 'CORPUS_ATTESTATION_MISSING';
    throw err;
  }
  return line;
}

export function runSimilarity(repoRoot, items) {
  const corpusDir = join(repoRoot, 'docs/blueprints/corpus');
  const manifest = readFileSync(join(corpusDir, 'manifest.md'), 'utf8');
  assertCorpusAttestation(manifest);
  const corpus = readdirSync(corpusDir)
    .filter((f) => f.endsWith('.md') && f !== 'manifest.md')
    .map((f) => readFileSync(join(corpusDir, f), 'utf8'));

  return items.map((item) => {
    const text = [item.stem, ...(item.options || []).map((o) => o.text)].join(' ');
    let max = 0;
    for (const c of corpus) max = Math.max(max, trigramSimilarity(text, c));
    const over = max >= SIMILARITY_THRESHOLD;
    const similarity_check = {
      method: 'norm-trigram-jaccard',
      corpus_ref: 'corpus-ccaf-v1',
      max_score: Number(max.toFixed(4)),
      verdict: over ? 'over_threshold' : 'clear',
      checked_at: new Date().toISOString(),
    };
    return {
      ...item,
      similarity: similarity_check,
      provenance: item.provenance ? { ...item.provenance, similarity_check } : item.provenance,
      status: over ? 'rejected_similarity' : item.status,
    };
  });
}
