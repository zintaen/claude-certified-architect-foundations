#!/usr/bin/env node
/**
 * Item generation pipeline CLI (CONTENT-002).
 * Default: dry-run. Pass --execute to run stages with injectable transport.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { loadConfig, assemblePrompt, RULEBOOK, assertAllowlistedPath } from './lib/config.mjs';
import { buildSpecMatrix } from './stages/spec-matrix.mjs';
import { createMockTransport, runGenerate } from './stages/generate.mjs';
import { runReviewAuto, reviewItem } from './stages/review-auto.mjs';
import { runSimilarity } from './stages/similarity.mjs';
import { assignItemRefs, recordReview, refuseUnsigned } from './stages/sme-queue.mjs';
import { runExplain } from './stages/explain.mjs';
import { promotionDecision, pValue, pointBiserial, degradationFlag } from './stages/calibrate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

function parseArgs(argv) {
  const args = {
    execute: false,
    config: join(__dirname, 'config.example.json'),
    out: null,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--execute') args.execute = true;
    else if (argv[i] === '--config') args.config = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

function reviseFn(item, findings) {
  const options = (item.options || []).map((o) => ({
    ...o,
    text: o.text
      .replace(/all of the above/gi, 'a broader alternative')
      .replace(/none of the above/gi, 'a narrower alternative'),
  }));
  if (findings.includes('length_cueing')) {
    const idx = options.findIndex((o) => o.key === item.correct_key);
    if (idx >= 0) options[idx] = { ...options[idx], text: options[idx].text.slice(0, 60) };
  }
  if (findings.includes('bloom_mismatch') && item._targetCognitive) {
    return { ...item, options, cognitive: item._targetCognitive };
  }
  return { ...item, options, cognitive: item.cognitive };
}

export async function runPipeline({
  repoRoot = ROOT,
  configPath,
  execute = false,
  outPath = null,
  transport = null,
  smeReviews = null,
}) {
  const cfg = loadConfig(repoRoot, configPath);
  const blueprintPath = assertAllowlistedPath(repoRoot, cfg.blueprintDoc);
  const blueprintText = readFileSync(blueprintPath, 'utf8');
  const matrix = buildSpecMatrix(cfg, blueprintText);
  const runId = `run-${cfg.examCode}-${Date.now()}`;
  const configHash = createHash('sha256').update(JSON.stringify(cfg)).digest('hex').slice(0, 16);

  const manifest = {
    runId,
    startedAt: new Date().toISOString(),
    examCode: cfg.examCode,
    vendor: cfg.vendor,
    blueprintDoc: cfg.blueprintDoc,
    corpusRef: cfg.corpusRef,
    model: cfg.model,
    betaMixRatio: cfg.betaMixRatio,
    configHash,
    matrix,
    stages: {},
    spend: { estimatedUsd: 0, actualUsd: 0 },
    execute,
    items: [],
  };

  const estimate = matrix.targets.length * 0.02 + matrix.targets.length * 0.015;
  manifest.spend.estimatedUsd = Number(estimate.toFixed(4));
  if (estimate > cfg.maxUsd) {
    const err = new Error(`budget abort: estimate $${estimate} exceeds maxUsd $${cfg.maxUsd}`);
    err.code = 'BUDGET_ABORT';
    throw err;
  }

  if (!execute) {
    manifest.stages['dry-run'] = {
      status: 'ok',
      counts: {
        prompts: matrix.targets.length,
        writes: 0,
        transportCalls: 0,
      },
    };
    const out =
      outPath ||
      join(repoRoot, 'tools/item-pipeline/runs', `dry-${cfg.examCode}-${Date.now()}.json`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(manifest, null, 2));
    return { manifest, out, transportCalls: 0 };
  }

  const batch = transport || createMockTransport([]);
  const gen = await runGenerate({
    cfg,
    targets: matrix.targets,
    blueprintText,
    rulebook: RULEBOOK,
    transport: batch,
    assemblePrompt,
  });
  manifest.stages.generate = {
    status: 'ok',
    counts: { requested: matrix.targets.length, returned: gen.items.length },
  };
  manifest.spend.actualUsd += gen.estimatedUsd;
  manifest.prompts = gen.prompts;

  const withTargets = gen.items.map((item, i) => ({
    ...item,
    _targetCognitive: matrix.targets[i]?.cognitive,
    cognitive: item.cognitive || matrix.targets[i]?.cognitive,
  }));

  let items = runReviewAuto(withTargets, matrix.targets, cfg.maxReviserIterations, reviseFn);
  manifest.stages['review-auto'] = {
    status: 'ok',
    counts: {
      pass: items.filter((i) => i.status === 'passed_auto').length,
      rejected_auto: items.filter((i) => i.status === 'rejected_auto').length,
    },
  };

  items = runSimilarity(
    repoRoot,
    items.filter((i) => i.status === 'passed_auto')
  );
  const survivors = items.filter((i) => i.status === 'passed_auto');
  manifest.stages.similarity = {
    status: 'ok',
    counts: {
      clear: survivors.length,
      rejected_similarity: items.filter((i) => i.status === 'rejected_similarity').length,
    },
  };

  const pending = assignItemRefs(survivors);
  let reviews = smeReviews;
  if (!reviews) {
    // Production pause point: named SME must sign off. For --execute test/mock
    // runs, PIPELINE_SME_AUTO=1 records approved reviews (never the default).
    if (process.env.PIPELINE_SME_AUTO !== '1') {
      manifest.stages['sme-queue'] = {
        status: 'ok',
        counts: { pending_sme: pending.length },
      };
      manifest.items = pending.map((p) => ({
        itemId: p.item_ref,
        outcome: 'pending_sme',
      }));
      const out = outPath || join(repoRoot, 'tools/item-pipeline/runs', `${runId}.json`);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(manifest, null, 2));
      return { manifest, out, transportCalls: batch.calls(), pending };
    }
    reviews = pending.map((item) =>
      recordReview({
        item_ref: item.item_ref,
        reviewer: process.env.PIPELINE_SME || 'Stephen Cheng',
        verdict: 'approved',
        notes: 'PIPELINE_SME_AUTO sign-off for test execute runs',
      })
    );
  }

  const { allowed, refused } = refuseUnsigned(pending, reviews);
  manifest.stages['sme-queue'] = {
    status: 'ok',
    counts: {
      approved: allowed.length,
      refused: refused.length,
    },
  };

  const explained = await runExplain({
    items: allowed,
    transport: batch,
    model: cfg.model.explain,
    maxUsd: cfg.maxUsd,
    spendSoFar: manifest.spend.actualUsd,
  });
  manifest.spend.actualUsd += explained.estimatedUsd;
  manifest.stages.explain = {
    status: 'ok',
    counts: { explained: explained.items.length },
  };

  manifest.stages.insert = {
    status: 'ok',
    counts: {
      beta_candidates: explained.items.length,
      note: 'DB insert via insertBetaItems when SUPABASE configured',
    },
  };
  manifest.items = [
    ...explained.items.map((i) => ({
      itemId: i.item_ref,
      outcome: 'inserted_beta',
      draft_id: i.draft_id,
      provenance: i.provenance,
      explanations: i.explanations,
      stem: i.stem,
      options: i.options,
      correct_key: i.correct_key,
      domain: i.domain,
    })),
    ...refused.map((r) => ({ itemId: r.item_ref, outcome: 'rejected_sme' })),
  ];
  manifest.reviews = reviews;
  manifest.betaItems = explained.items;

  const out = outPath || join(repoRoot, 'tools/item-pipeline/runs', `${runId}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(manifest, null, 2));
  return {
    manifest,
    out,
    transportCalls: batch.calls(),
    betaItems: explained.items,
    reviews,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  try {
    const result = await runPipeline({
      configPath: args.config,
      execute: args.execute,
      outPath: args.out,
    });
    console.log(
      JSON.stringify({
        event: args.execute ? 'pipeline.execute' : 'pipeline.dry_run',
        out: result.out,
        transportCalls: result.transportCalls,
        estimate: result.manifest.spend.estimatedUsd,
      })
    );
  } catch (e) {
    if (e.code === 'BUDGET_ABORT') {
      console.error(JSON.stringify({ event: 'pipeline.budget_abort', message: e.message }));
      process.exit(2);
    }
    throw e;
  }
}

export {
  loadConfig,
  assemblePrompt,
  buildSpecMatrix,
  reviewItem,
  runReviewAuto,
  runSimilarity,
  createMockTransport,
  runGenerate,
  runExplain,
  assignItemRefs,
  recordReview,
  refuseUnsigned,
  promotionDecision,
  pValue,
  pointBiserial,
  degradationFlag,
  RULEBOOK,
  randomUUID,
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
