#!/usr/bin/env node
/**
 * Idempotent CCAF catalog seed (task-DATA-001).
 * Upserts vendor/cert/exam/domains + items from the file bank + provenance.
 * Fails loudly if any bank item lacks a provenance record.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Need SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const DOMAIN_META = {
  research_pipeline: { name: 'Research pipelines', weight: 25, sort: 1 },
  extraction_pipeline: { name: 'Extraction pipelines', weight: 25, sort: 2 },
  customer_support: { name: 'Customer support agents', weight: 25, sort: 3 },
  code_exploration: { name: 'Code exploration', weight: 25, sort: 4 },
};

function loadProvenance() {
  const path = join(ROOT, 'src/data/provenance.ccaf.json');
  if (!existsSync(path)) throw new Error('missing src/data/provenance.ccaf.json (CONTENT-001)');
  const records = JSON.parse(readFileSync(path, 'utf8'));
  return new Map(records.map((r) => [r.item_id, r]));
}

function loadMockQuestions() {
  const src = readFileSync(join(ROOT, 'src/data/questions.server.ts'), 'utf8');
  const m = src.match(/const encQuestions =\s*'([^']+)'/);
  if (!m) throw new Error('cannot parse encQuestions from questions.server.ts');
  return JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
}

function loadSampleQuestions() {
  // Reuse bank-ids extractor for sample stems; correct keys from sample file.
  const src = readFileSync(join(ROOT, 'src/data/sampleQuestions.ts'), 'utf8');
  const domains = [
    'research_pipeline',
    'extraction_pipeline',
    'customer_support',
    'code_exploration',
  ];
  const out = [];
  for (const domain of domains) {
    const startKey = `  ${domain}: [`;
    const start = src.indexOf(startKey);
    if (start < 0) continue;
    const open = src.indexOf('[', start);
    let depth = 0;
    let end = open;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '[') depth++;
      else if (src[i] === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const body = src.slice(open + 1, end);
    // Split top-level objects roughly by `question:`
    const chunks = body.split(/(?=\n\s+\{\s*\n\s+question:)/);
    let n = 0;
    for (const chunk of chunks) {
      if (!/question:/.test(chunk)) continue;
      n += 1;
      const qMatch = chunk.match(/question:\s*((?:'(?:\\'|[^'])*')+)/s);
      const stem = qMatch
        ? [...qMatch[1].matchAll(/'((?:\\'|[^'])*)'/g)]
            .map((p) => p[1].replace(/\\'/g, "'"))
            .join('')
        : '';
      const optBlocks = [
        ...chunk.matchAll(/\{\s*letter:\s*'([A-D])',\s*text:\s*((?:'(?:\\'|[^'])*')+)/gs),
      ];
      const options = [];
      let correct = null;
      for (const ob of optBlocks) {
        const key = ob[1];
        const text = [...ob[2].matchAll(/'((?:\\'|[^'])*)'/g)]
          .map((p) => p[1].replace(/\\'/g, "'"))
          .join('');
        const slice = chunk.slice(ob.index, ob.index + 400);
        const isCorrect = /correct:\s*true/.test(slice);
        options.push({ key, text });
        if (isCorrect) correct = key;
        // explanations optional for samples
      }
      out.push({
        external_key: `sample-${domain}-${String(n).padStart(2, '0')}`,
        group: domain,
        stem,
        options,
        correct_key: correct || 'A',
        explanations: null,
        item_status: 'scored',
      });
    }
  }
  return out;
}

async function upsertSpine() {
  const { data: vendor, error: vErr } = await db
    .from('vendors')
    .upsert({ key: 'anthropic', name: 'Anthropic' }, { onConflict: 'key' })
    .select('id')
    .single();
  if (vErr) throw vErr;

  const { data: cert, error: cErr } = await db
    .from('certifications')
    .upsert(
      { vendor_id: vendor.id, key: 'claude-architect', name: 'Claude Certified Architect' },
      { onConflict: 'vendor_id,key' }
    )
    .select('id')
    .single();
  if (cErr) throw cErr;

  const { data: exam, error: eErr } = await db
    .from('exams')
    .upsert(
      {
        certification_id: cert.id,
        code: 'ccaf',
        name: 'Claude Certified Architect — Foundations',
        version: '2026.1',
        blueprint_doc: 'docs/blueprints/ccaf-blueprint.md',
        status: 'live',
        pass_threshold_pct: 72,
        question_count: 60,
        duration_minutes: 120,
        // CONTENT-002 default: one unscored beta item per exam sitting
        beta_mix_ratio: 1,
      },
      { onConflict: 'code' }
    )
    .select('id')
    .single();
  if (eErr) throw eErr;

  const domainIds = {};
  for (const [key, meta] of Object.entries(DOMAIN_META)) {
    const { data: dom, error } = await db
      .from('domains')
      .upsert(
        {
          exam_id: exam.id,
          key,
          name: meta.name,
          weight_pct: meta.weight,
          sort: meta.sort,
        },
        { onConflict: 'exam_id,key' }
      )
      .select('id')
      .single();
    if (error) throw error;
    domainIds[key] = dom.id;
  }
  return { examId: exam.id, domainIds };
}

async function main() {
  const prov = loadProvenance();
  const mock = loadMockQuestions();
  const samples = loadSampleQuestions();

  const bank = [
    ...mock.map((q) => ({
      external_key: q.id,
      group: q.group,
      stem: q.text,
      options: q.options.map((o) => ({ key: o.letter, text: o.text })),
      correct_key: q.options.find((o) => o.correct)?.letter ?? 'A',
      explanations: Object.fromEntries(q.options.map((o) => [o.letter, o.explain])),
      item_status: 'scored',
    })),
    ...samples,
  ];

  const missing = bank.filter((b) => !prov.has(b.external_key)).map((b) => b.external_key);
  if (missing.length) {
    console.error('seed refused: missing provenance for', missing.join(', '));
    process.exit(1);
  }

  const { examId, domainIds } = await upsertSpine();

  let written = 0;
  for (const b of bank) {
    const domain_id = domainIds[b.group];
    if (!domain_id) throw new Error(`no domain for group ${b.group}`);
    const row = {
      exam_id: examId,
      domain_id,
      external_key: b.external_key,
      stem: b.stem,
      options: b.options,
      correct_key: b.correct_key,
      explanations: b.explanations,
      item_status: b.item_status,
      provenance: prov.get(b.external_key),
      version: 1,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db.from('items').upsert(row, { onConflict: 'exam_id,external_key' });
    if (error) throw error;
    written += 1;
  }

  const keys = bank.map((b) => b.external_key);
  const { data: present, error: cntErr } = await db
    .from('items')
    .select('external_key')
    .eq('exam_id', examId)
    .in('external_key', keys);
  if (cntErr) throw cntErr;
  const count = present?.length ?? 0;

  console.log(
    JSON.stringify({ event: 'catalog.seed', written, db_count: count, bank: bank.length })
  );
  if (count !== bank.length) {
    console.error(`count mismatch: bank_keys_in_db=${count} bank=${bank.length}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
