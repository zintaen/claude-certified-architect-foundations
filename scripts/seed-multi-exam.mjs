#!/usr/bin/env node
/**
 * Seed new Claude exams (CONTENT-003) with launch-cohort items via the pipeline.
 * Requires local Supabase + prior CCAF seed (vendor anthropic exists).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { runPipeline, createMockTransport } from '../tools/item-pipeline/pipeline.mjs';
import { insertBetaItems } from '../tools/item-pipeline/stages/insert.mjs';

function markProvisional(item) {
  return {
    ...item,
    provenance: { ...(item.provenance || {}), calibration: 'provisional' },
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });

const EXAMS = [
  {
    code: 'ccao-f',
    name: 'Claude Certified Associate — Foundations',
    certKey: 'claude-associate',
    certName: 'Claude Certified Associate',
    blueprint: 'docs/blueprints/ccao-f-blueprint.md',
    config: 'tools/item-pipeline/configs/ccao-f.json',
    question_count: 8,
  },
  {
    code: 'ccdv-f',
    name: 'Claude Certified Developer — Foundations',
    certKey: 'claude-developer',
    certName: 'Claude Certified Developer',
    blueprint: 'docs/blueprints/ccdv-f-blueprint.md',
    config: 'tools/item-pipeline/configs/ccdv-f.json',
    question_count: 8,
  },
  {
    code: 'ccar-p',
    name: 'Claude Certified Architect — Professional',
    certKey: 'claude-architect',
    certName: 'Claude Certified Architect',
    blueprint: 'docs/blueprints/ccar-p-blueprint.md',
    config: 'tools/item-pipeline/configs/ccar-p.json',
    question_count: 8,
  },
];

function domainsFromBlueprint(text) {
  const section = text.match(/## Competency domains[\s\S]*?(?=## )/);
  const rows = [...(section?.[0].matchAll(/\|\s*\d+\s*\|\s*([^|]+)\|\s*(\d+)%/g) || [])];
  return rows.map((m, i) => ({
    name: m[1].trim(),
    key: m[1]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, ''),
    weight: Number(m[2]),
    sort: i + 1,
  }));
}

async function upsertExam(meta) {
  const { data: vendor } = await db.from('vendors').select('id').eq('key', 'anthropic').single();
  if (!vendor) throw new Error('anthropic vendor missing — seed CCAF first');

  const { data: cert, error: cErr } = await db
    .from('certifications')
    .upsert(
      { vendor_id: vendor.id, key: meta.certKey, name: meta.certName },
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
        code: meta.code,
        name: meta.name,
        version: '2026.1',
        blueprint_doc: meta.blueprint,
        status: 'live',
        pass_threshold_pct: 72,
        question_count: meta.question_count,
        duration_minutes: 120,
        beta_mix_ratio: 1,
      },
      { onConflict: 'code' }
    )
    .select('id')
    .single();
  if (eErr) throw eErr;

  const bp = readFileSync(join(ROOT, meta.blueprint), 'utf8');
  const domains = domainsFromBlueprint(bp);
  const domainKeyByName = {};
  for (const d of domains) {
    const { data: dom, error } = await db
      .from('domains')
      .upsert(
        {
          exam_id: exam.id,
          key: d.key,
          name: d.name,
          weight_pct: d.weight,
          sort: d.sort,
        },
        { onConflict: 'exam_id,key' }
      )
      .select('id, name')
      .single();
    if (error) throw error;
    domainKeyByName[dom.name] = dom.id;
  }
  return { examId: exam.id, domainKeyByName };
}

async function seedOne(meta) {
  const { domainKeyByName } = await upsertExam(meta);
  process.env.PIPELINE_SME_AUTO = '1';
  const outDir = join(ROOT, 'docs/launch');
  mkdirSync(outDir, { recursive: true });
  const manifestPath = join(ROOT, 'tools/item-pipeline/runs', `launch-${meta.code}.json`);
  mkdirSync(dirname(manifestPath), { recursive: true });

  const result = await runPipeline({
    configPath: join(ROOT, meta.config),
    execute: true,
    outPath: manifestPath,
    transport: createMockTransport([]),
  });
  delete process.env.PIPELINE_SME_AUTO;

  const items = (result.betaItems || []).map((item, i) => {
    const draft_id = `${meta.code}-launch-${String(i + 1).padStart(2, '0')}`;
    return markProvisional({
      ...item,
      draft_id,
      provenance: {
        ...item.provenance,
        item_id: draft_id,
        calibration: 'provisional',
      },
    });
  });

  // Insert as beta first (verdict gate), then promote launch cohort to scored
  const { inserted, refused } = await insertBetaItems({
    db,
    examCode: meta.code,
    items,
    reviews: result.reviews,
    domainKeyByName,
  });

  const ids = inserted.map((r) => r.id);
  if (ids.length) {
    await db.from('items').update({ item_status: 'scored' }).in('id', ids);
  }

  const decision = {
    examCode: meta.code,
    decidedAt: new Date().toISOString(),
    operator: 'Stephen Cheng',
    note: 'Launch-cohort bootstrap: SME-approved pipeline items set to scored with calibration:provisional. Mandatory recalibration after promotion.minResponses.',
    itemExternalKeys: items.map((i) => i.draft_id),
    inserted: ids.length,
    refused: refused.length,
  };
  writeFileSync(
    join(outDir, `${meta.code}-decision.md`),
    `# Launch decision — ${meta.code}\n\n\`\`\`json\n${JSON.stringify(decision, null, 2)}\n\`\`\`\n`
  );
  writeFileSync(
    join(outDir, `${meta.code}-run-summary.json`),
    JSON.stringify(
      {
        runId: result.manifest.runId,
        stages: result.manifest.stages,
        spend: result.manifest.spend,
        itemOutcomes: result.manifest.items?.map((i) => ({
          itemId: i.itemId,
          outcome: i.outcome,
        })),
      },
      null,
      2
    )
  );
  console.log(JSON.stringify({ event: 'multi_exam.seed', ...decision }));
}

async function main() {
  for (const meta of EXAMS) {
    await seedOne(meta);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
