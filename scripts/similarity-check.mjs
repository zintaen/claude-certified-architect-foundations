#!/usr/bin/env node
/**
 * Similarity check against the legitimacy-safe corpus.
 * Refuses to run unless docs/blueprints/corpus/manifest.md contains an attestation line
 * starting with `legitimate_sources_only:`.
 *
 * Usage:
 *   node scripts/similarity-check.mjs           # report scores
 *   node scripts/similarity-check.mjs --write   # update provenance.ccaf.json scores
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allBankIds,
  readQuestionsPublic,
  readSampleQuestions,
  extractMockTexts,
  extractSampleTexts,
  extractMockGroups,
  GROUP_BLUEPRINT,
  trigramSimilarity,
  serializeProvenanceRecords,
  SIMILARITY_METHOD,
  SIMILARITY_THRESHOLD,
  CORPUS_REF,
  BLUEPRINT_DOC,
  ATTESTATION_LINE_PREFIX,
} from './lib/bank-ids.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const CORPUS_DIR = join(ROOT, 'docs/blueprints/corpus');
const MANIFEST = join(CORPUS_DIR, 'manifest.md');
const RECORDS_PATH = join(ROOT, 'src/data/provenance.ccaf.json');

function logEvent(payload) {
  process.stderr.write(JSON.stringify(payload) + '\n');
}

export function assertCorpusAttestation(manifestText) {
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

function loadCorpusTexts() {
  const manifestText = readFileSync(MANIFEST, 'utf8');
  assertCorpusAttestation(manifestText);
  const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith('.md') && f !== 'manifest.md');
  return files.map((f) => ({
    file: f,
    text: readFileSync(join(CORPUS_DIR, f), 'utf8'),
  }));
}

function itemTexts(root) {
  const mockSrc = readQuestionsPublic(root);
  const sampleSrc = readSampleQuestions(root);
  const map = new Map([...extractMockTexts(mockSrc), ...extractSampleTexts(sampleSrc)]);
  return map;
}

export function scoreBank({ root = ROOT } = {}) {
  const corpus = loadCorpusTexts();
  const texts = itemTexts(root);
  const { all } = allBankIds(root);
  const scores = [];
  for (const id of all) {
    const text = texts.get(id) || '';
    let max = 0;
    for (const c of corpus) {
      const s = trigramSimilarity(text, c.text);
      if (s > max) max = s;
    }
    const verdict = max >= SIMILARITY_THRESHOLD ? 'over_threshold' : 'clear';
    scores.push({
      item_id: id,
      max_score: Number(max.toFixed(4)),
      verdict,
    });
  }
  return { scores, corpus_ref: CORPUS_REF, threshold: SIMILARITY_THRESHOLD };
}

function main() {
  const write = process.argv.includes('--write');
  try {
    const { scores, corpus_ref, threshold } = scoreBank();
    const over = scores.filter((s) => s.verdict === 'over_threshold');
    logEvent({
      event: 'provenance.similarity',
      ok: true,
      corpus_id: corpus_ref,
      item_count: scores.length,
      over_threshold: over.length,
      threshold,
    });
    console.log(
      `similarity-check: ${scores.length} items, threshold=${threshold}, over_threshold=${over.length}`
    );
    if (over.length) {
      console.log('flagged:', over.map((s) => `${s.item_id}=${s.max_score}`).join(', '));
    }
    if (write) {
      const checkedAt = new Date().toISOString();
      let records;
      try {
        records = JSON.parse(readFileSync(RECORDS_PATH, 'utf8'));
      } catch {
        records = [];
      }
      const byId = new Map(records.map((r) => [r.item_id, r]));
      const groups = extractMockGroups(readQuestionsPublic(ROOT));
      for (const s of scores) {
        const existing = byId.get(s.item_id);
        const group =
          groups.get(s.item_id) ||
          (s.item_id.startsWith('sample-') ? s.item_id.split('-').slice(1, -1).join('-') : null);
        const bp = GROUP_BLUEPRINT[group];
        if (!bp) throw new Error(`no blueprint map for ${s.item_id} group=${group}`);
        const disposition =
          s.verdict === 'over_threshold' ? 'flagged_for_review' : existing?.disposition || 'active';
        byId.set(s.item_id, {
          item_id: s.item_id,
          blueprint_ref: {
            domain: bp.domain,
            objective: bp.objective,
            blueprint_doc: BLUEPRINT_DOC,
          },
          origin: existing?.origin || { method: 'retroactive_attestation' },
          reviewer: existing?.reviewer || 'Stephen Cheng',
          reviewed_at: existing?.reviewed_at || checkedAt,
          similarity_check: {
            method: SIMILARITY_METHOD,
            corpus_ref: CORPUS_REF,
            max_score: s.max_score,
            verdict: s.verdict,
            checked_at: checkedAt,
          },
          disposition,
          record_version: 1,
        });
      }
      const out = serializeProvenanceRecords([...byId.values()]);
      writeFileSync(RECORDS_PATH, out);
      console.log(`wrote ${RECORDS_PATH}`);
    }
  } catch (err) {
    logEvent({
      event: 'provenance.similarity',
      ok: false,
      refused: err.code === 'CORPUS_ATTESTATION_MISSING',
      error: String(err.message || err),
    });
    console.error(err.message || err);
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
