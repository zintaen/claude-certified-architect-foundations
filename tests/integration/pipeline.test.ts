import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  runPipeline,
  createMockTransport,
  recordReview,
  refuseUnsigned,
  assignItemRefs,
} from '../../tools/item-pipeline/pipeline.mjs';
import { insertBetaItems } from '../../tools/item-pipeline/stages/insert.mjs';

const ROOT = process.cwd();
const URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CONFIG = join(ROOT, 'tools/item-pipeline/config.example.json');

async function dbUp() {
  try {
    await fetch(`${URL}/rest/v1/`, {
      headers: {
        apikey:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      },
    });
    return true;
  } catch {
    return false;
  }
}

describe('pipeline integration (CONTENT-002)', () => {
  it('dry-run default: manifest + estimate, zero writes/calls', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'pipe-dry-'));
    const out = join(outDir, 'manifest.json');
    const transport = createMockTransport([]);
    const result = await runPipeline({
      configPath: CONFIG,
      execute: false,
      outPath: out,
      transport,
    });
    expect(existsSync(out)).toBe(true);
    expect(result.transportCalls).toBe(0);
    expect(transport.calls()).toBe(0);
    expect(result.manifest.spend.estimatedUsd).toBeGreaterThan(0);
    expect(result.manifest.stages['dry-run'].counts.writes).toBe(0);
    rmSync(outDir, { recursive: true, force: true });
  });

  it('execute run: provenance completeness, prompt_ref resolution', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'pipe-ex-'));
    const out = join(outDir, 'manifest.json');
    const transport = createMockTransport([]);
    const itemRef = randomUUID();
    const reviews = [
      recordReview({
        item_ref: itemRef,
        reviewer: 'Stephen Cheng',
        verdict: 'approved',
        notes: 'ok',
      }),
    ];
    // Pre-assign refs by wrapping: generate then inject reviews matching assigned refs
    const result = await runPipeline({
      configPath: CONFIG,
      execute: true,
      outPath: out,
      transport,
      smeReviews: null,
    });
    // Without smeReviews and without PIPELINE_SME_AUTO, stops at pending_sme
    expect(
      result.manifest.items.every((i: { outcome: string }) => i.outcome === 'pending_sme')
    ).toBe(true);
    expect(transport.calls()).toBeGreaterThan(0);

    process.env.PIPELINE_SME_AUTO = '1';
    const result2 = await runPipeline({
      configPath: CONFIG,
      execute: true,
      outPath: join(outDir, 'm2.json'),
      transport: createMockTransport([]),
    });
    delete process.env.PIPELINE_SME_AUTO;
    const inserted = result2.manifest.items.filter(
      (i: { outcome: string }) => i.outcome === 'inserted_beta'
    );
    expect(inserted.length).toBeGreaterThan(0);
    for (const row of inserted) {
      expect(row.provenance.origin.method).toBe('blueprint_generation');
      expect(row.provenance.origin.model).toBeTruthy();
      expect(row.provenance.origin.prompt_ref).toMatch(/run-manifest#prompt:/);
      expect(row.provenance.origin.generated_at).toBeTruthy();
      expect(row.explanations).toBeTruthy();
    }
    void reviews;
    rmSync(outDir, { recursive: true, force: true });
  });

  it('unsigned items refused; approved insert as beta', async () => {
    if (!(await dbUp())) return;
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const draft = assignItemRefs([
      {
        draft_id: `pipe-test-${Date.now()}`,
        stem: 'Which pattern preserves fidelity across agent hand-offs without context bloat?',
        options: [
          { key: 'A', text: 'Dump full transcripts each turn' },
          { key: 'B', text: 'Persist structured reports and recover state' },
          { key: 'C', text: 'Restart the agent every tool call' },
          { key: 'D', text: 'Disable memory entirely' },
        ],
        correct_key: 'B',
        domain: 'Research pipelines',
        provenance: {
          item_id: 'x',
          origin: {
            method: 'blueprint_generation',
            model: 'mock',
            prompt_ref: 'p0',
            generated_at: new Date().toISOString(),
          },
        },
        explanations: { A: 'a', B: 'b', C: 'c', D: 'd' },
      },
    ]);
    const { refused } = refuseUnsigned(draft, []);
    expect(refused).toHaveLength(1);

    const { data: domains } = await admin.from('domains').select('id, name, exam_id').limit(20);
    const { data: exam } = await admin.from('exams').select('id').eq('code', 'ccaf').single();
    const domain = (domains ?? []).find((d) => d.exam_id === exam!.id);
    const domainKeyByName = { [draft[0].domain]: domain!.id, [domain!.name]: domain!.id };

    const noInsert = await insertBetaItems({
      db: admin,
      examCode: 'ccaf',
      items: draft,
      reviews: [],
      domainKeyByName,
    });
    expect(noInsert.inserted).toHaveLength(0);

    const reviews = [
      recordReview({
        item_ref: draft[0].item_ref,
        reviewer: 'Stephen Cheng',
        verdict: 'approved',
        notes: 'integration',
      }),
    ];
    // Map domain name from DB
    draft[0].domain = domain!.name;
    const ok = await insertBetaItems({
      db: admin,
      examCode: 'ccaf',
      items: draft,
      reviews,
      domainKeyByName: { [domain!.name]: domain!.id },
    });
    expect(ok.inserted).toHaveLength(1);
    expect(ok.inserted[0].item_status).toBe('beta');
    // Cleanup so DATA-001 seed count stays bank-sized
    await admin.from('items').delete().eq('id', ok.inserted[0].id);
    await admin.from('item_reviews').delete().eq('item_ref', draft[0].item_ref);
  });

  it('similarity stage rejects corpus-matching fixture; unskippable via config schema', async () => {
    const { runSimilarity, loadConfig } = await import('../../tools/item-pipeline/pipeline.mjs');
    const corpusFile = readdirSync(join(ROOT, 'docs/blueprints/corpus')).find(
      (f) => f.endsWith('.md') && f !== 'manifest.md'
    )!;
    const corpusText = readFileSync(join(ROOT, 'docs/blueprints/corpus', corpusFile), 'utf8');
    const out = runSimilarity(ROOT, [
      {
        draft_id: 'clone',
        stem: corpusText.slice(0, 400),
        options: [
          { key: 'A', text: corpusText.slice(400, 450) || 'opt a filler text here' },
          { key: 'B', text: 'opt b filler text here' },
          { key: 'C', text: 'opt c filler text here' },
          { key: 'D', text: 'opt d filler text here' },
        ],
        correct_key: 'A',
        status: 'passed_auto',
      },
    ]);
    expect(out[0].status).toBe('rejected_similarity');

    const dir = mkdtempSync(join(tmpdir(), 'skip-'));
    const cfg = {
      ...JSON.parse(readFileSync(CONFIG, 'utf8')),
      skipSimilarity: true,
    };
    writeFileSync(join(dir, 'c.json'), JSON.stringify(cfg));
    expect(() => loadConfig(ROOT, join(dir, 'c.json'))).toThrow(/similarity/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('explanations stored; no model SDK import in src/app/** (grep)', () => {
    const walk = (dir: string, acc: string[] = []): string[] => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) walk(p, acc);
        else if (/\.(ts|tsx|js|mjs)$/.test(ent.name)) acc.push(p);
      }
      return acc;
    };
    const files = walk(join(ROOT, 'src/app'));
    const hits = files.filter((f) => {
      const src = readFileSync(f, 'utf8');
      return /@anthropic-ai\/sdk|openai|Anthropic\(|from ['"]ai['"]/.test(src);
    });
    expect(hits).toEqual([]);
  });

  it('betaMixRatio consumed by assembly (DATA-001 extension)', async () => {
    if (!(await dbUp())) return;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    await admin.from('exams').update({ beta_mix_ratio: 1 }).eq('code', 'ccaf');
    const { data: exam } = await admin.from('exams').select('id').eq('code', 'ccaf').single();
    const { data: some } = await admin
      .from('items')
      .select('id')
      .eq('exam_id', exam!.id)
      .eq('item_status', 'scored')
      .limit(1);
    await admin.from('items').update({ item_status: 'beta' }).eq('id', some![0].id);

    const { assembleSitting, gradeSitting } = await import('../../src/lib/sittings');
    // No explicit betaMix — should read exam.beta_mix_ratio
    const { sittingId, questions } = await assembleSitting({ examCode: 'ccaf', mode: 'exam' });
    expect(questions.some((q) => q.id === some![0].id)).toBe(true);
    const g = await gradeSitting(sittingId);
    expect(g.breakdown).toMatchObject({ betaExcluded: 1 });

    await admin.from('items').update({ item_status: 'scored' }).eq('id', some![0].id);
  });

  it('budget abort before submission when estimate > cap', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bud-'));
    const cfg = {
      ...JSON.parse(readFileSync(CONFIG, 'utf8')),
      targets: { totalItems: 100 },
      maxUsd: 0.01,
    };
    const path = join(dir, 'c.json');
    writeFileSync(path, JSON.stringify(cfg));
    const transport = createMockTransport([]);
    await expect(
      runPipeline({ configPath: path, execute: true, transport, outPath: join(dir, 'o.json') })
    ).rejects.toMatchObject({ code: 'BUDGET_ABORT' });
    expect(transport.calls()).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  });

  it('PIPELINE.md + PROVENANCE.md sections present', () => {
    const pipe = readFileSync(join(ROOT, 'docs/PIPELINE.md'), 'utf8');
    expect(pipe).toMatch(/SME review/i);
    expect(pipe).toMatch(/Promotion mechanism/i);
    expect(pipe).toMatch(/Vendor AI-policy/i);
    expect(pipe).toMatch(/Cost controls/i);
    expect(pipe).toMatch(/Run manifest/i);
    expect(pipe).toMatch(/Blueprint-only/i);
    const prov = readFileSync(join(ROOT, 'docs/PROVENANCE.md'), 'utf8');
    expect(prov).toMatch(/Auto-emission/);
    expect(prov).toMatch(/generate\.mjs/);
  });
});
