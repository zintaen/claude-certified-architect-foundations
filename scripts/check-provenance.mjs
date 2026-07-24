#!/usr/bin/env node
/**
 * Coverage + schema gate for provenance.ccaf.json.
 * Fails when any bank item lacks a record, any record points at a nonexistent item,
 * any record fails schema, or the file is not deterministically ordered.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { allBankIds, serializeProvenanceRecords, BLUEPRINT_DOC } from './lib/bank-ids.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const RECORDS_PATH = join(ROOT, 'src/data/provenance.ccaf.json');

const ORIGIN_METHODS = new Set([
  'blueprint_generation',
  'human_authored',
  'retroactive_attestation',
]);
const DISPOSITIONS = new Set(['active', 'flagged_for_review', 'retired']);
const VERDICTS = new Set(['clear', 'over_threshold']);

function logEvent(payload) {
  process.stderr.write(JSON.stringify(payload) + '\n');
}

function loadRecords(path = RECORDS_PATH) {
  const raw = readFileSync(path, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('provenance file must be a JSON array');
  return { raw, records: data };
}

function schemaErrors(record, blueprintText) {
  const errs = [];
  if (!record || typeof record !== 'object') return ['record is not an object'];
  if (typeof record.item_id !== 'string' || !record.item_id) errs.push('item_id');
  const br = record.blueprint_ref;
  if (!br || typeof br.domain !== 'string' || typeof br.objective !== 'string') {
    errs.push('blueprint_ref');
  } else {
    if (br.blueprint_doc !== BLUEPRINT_DOC) errs.push('blueprint_doc');
    if (!blueprintText.includes(br.domain)) errs.push(`domain missing in blueprint: ${br.domain}`);
    if (!blueprintText.includes(br.objective)) {
      errs.push(`objective missing in blueprint: ${br.objective}`);
    }
  }
  const origin = record.origin;
  if (!origin || !ORIGIN_METHODS.has(origin.method)) errs.push('origin.method');
  else if (origin.method === 'retroactive_attestation') {
    if (
      origin.model !== undefined ||
      origin.prompt_ref !== undefined ||
      origin.generated_at !== undefined
    ) {
      errs.push('retroactive_attestation must omit unknowns');
    }
  } else if (origin.generated_at !== undefined && origin.method === 'retroactive_attestation') {
    errs.push('generated_at without valid method');
  }
  if (typeof record.reviewer !== 'string' || !record.reviewer) errs.push('reviewer');
  if (typeof record.reviewed_at !== 'string' || !record.reviewed_at) errs.push('reviewed_at');
  const sc = record.similarity_check;
  if (
    !sc ||
    typeof sc.method !== 'string' ||
    typeof sc.corpus_ref !== 'string' ||
    typeof sc.max_score !== 'number' ||
    !VERDICTS.has(sc.verdict) ||
    typeof sc.checked_at !== 'string'
  ) {
    errs.push('similarity_check');
  }
  if (!DISPOSITIONS.has(record.disposition)) errs.push('disposition');
  if (sc && sc.verdict === 'over_threshold' && record.disposition !== 'flagged_for_review') {
    errs.push('over_threshold requires flagged_for_review');
  }
  if (record.record_version !== 1) errs.push('record_version');
  return errs;
}

export function checkProvenance({ root = ROOT, recordsPath = RECORDS_PATH } = {}) {
  const { mock, sample, all } = allBankIds(root);
  const bankSet = new Set(all);
  const blueprintText = readFileSync(join(root, BLUEPRINT_DOC), 'utf8');
  const { raw, records } = loadRecords(recordsPath);

  const missing = [];
  const orphan = [];
  const schema = [];
  const seen = new Set();

  for (const id of all) {
    if (!records.some((r) => r.item_id === id)) missing.push(id);
  }
  for (const r of records) {
    if (!bankSet.has(r.item_id)) orphan.push(r.item_id);
    if (seen.has(r.item_id)) schema.push(`duplicate ${r.item_id}`);
    seen.add(r.item_id);
    const errs = schemaErrors(r, blueprintText);
    if (errs.length) schema.push(`${r.item_id}: ${errs.join(',')}`);
  }

  const expected = serializeProvenanceRecords(records);
  const deterministic = raw === expected;

  const ok = missing.length === 0 && orphan.length === 0 && schema.length === 0 && deterministic;
  return {
    ok,
    bank_count: all.length,
    mock_count: mock.length,
    sample_count: sample.length,
    record_count: records.length,
    missing,
    orphan,
    schema_errors: schema,
    deterministic,
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--seed-gap')) {
    // Test helper: write a temp copy missing the first record and re-check.
    const { records } = loadRecords();
    const dir = mkdtempSync(join(tmpdir(), 'prov-gap-'));
    const path = join(dir, 'provenance.ccaf.json');
    writeFileSync(path, serializeProvenanceRecords(records.slice(1)));
    const result = checkProvenance({ recordsPath: path });
    rmSync(dir, { recursive: true, force: true });
    logEvent({ event: 'provenance.check', ...result, seeded_gap: true });
    process.exit(result.ok ? 0 : 1);
  }

  const result = checkProvenance();
  logEvent({ event: 'provenance.check', ...result });
  if (!result.ok) {
    if (result.missing.length) console.error('missing records:', result.missing.join(', '));
    if (result.orphan.length) console.error('orphan records:', result.orphan.join(', '));
    if (result.schema_errors.length) console.error('schema:', result.schema_errors.join('\n'));
    if (!result.deterministic) console.error('non-deterministic ordering/serialization');
    process.exit(1);
  }
  console.log(
    `check-provenance OK: ${result.record_count} records for ${result.bank_count} bank items`
  );
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
