import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  assertHonestOrigin,
  ORIGIN_METHODS_WITH_GENERATED_AT,
  type ItemProvenance,
} from '../../src/core/provenance.types';

const ROOT = process.cwd();
const RECORDS = join(ROOT, 'src/data/provenance.ccaf.json');
const PACKAGE = join(ROOT, 'package.json');
const PROVENANCE_DOC = join(ROOT, 'docs/PROVENANCE.md');
const BLUEPRINT = join(ROOT, 'docs/blueprints/ccaf-blueprint.md');
const MANIFEST = join(ROOT, 'docs/blueprints/corpus/manifest.md');

function loadRecords(): ItemProvenance[] {
  return JSON.parse(readFileSync(RECORDS, 'utf8'));
}

function runNode(args: string[]) {
  return spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
}

describe('provenance', () => {
  it('every bank item has a schema-valid provenance record', () => {
    const r = runNode(['scripts/check-provenance.mjs']);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/"ok":true/);
    const records = loadRecords();
    expect(records.length).toBeGreaterThanOrEqual(80);
  });

  it('seeded missing record makes check-provenance exit 1', () => {
    const r = runNode(['scripts/check-provenance.mjs', '--seed-gap']);
    expect(r.status).toBe(1);
  });

  it('precommit chain includes check-provenance', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE, 'utf8'));
    expect(pkg.scripts.precommit).toMatch(/check-provenance/);
  });

  it('retroactive records omit unknown origin fields', () => {
    const records = loadRecords();
    for (const rec of records) {
      expect(rec.origin.method).toBe('retroactive_attestation');
      expect(rec.origin.model).toBeUndefined();
      expect(rec.origin.prompt_ref).toBeUndefined();
      expect(rec.origin.generated_at).toBeUndefined();
      expect(() => assertHonestOrigin(rec.origin)).not.toThrow();
    }
    expect(() =>
      assertHonestOrigin({
        method: 'retroactive_attestation',
        generated_at: '2020-01-01T00:00:00Z',
      })
    ).toThrow(/omit/);
    expect(() =>
      assertHonestOrigin({
        method: 'retroactive_attestation',
        model: 'invented',
      })
    ).toThrow(/omit/);
    expect(() =>
      assertHonestOrigin({
        method: 'retroactive_attestation',
        prompt_ref: 'invented',
      })
    ).toThrow(/omit/);
    expect(() =>
      assertHonestOrigin({
        method: 'blueprint_generation',
        generated_at: '2026-07-24T00:00:00Z',
        model: 'test',
      })
    ).not.toThrow();
    expect(() =>
      assertHonestOrigin({
        method: 'human_authored',
        generated_at: '2026-07-24T00:00:00Z',
      })
    ).not.toThrow();
    // Defensive path: generated_at with a method outside the allowlist
    expect(() =>
      assertHonestOrigin({
        method: 'not_a_real_method' as unknown as 'human_authored',
        generated_at: '2020-01-01T00:00:00Z',
      })
    ).toThrow(/only valid/);
    expect(ORIGIN_METHODS_WITH_GENERATED_AT.has('blueprint_generation')).toBe(true);
  });

  it('every blueprint_ref resolves into ccaf-blueprint.md', () => {
    const blueprint = readFileSync(BLUEPRINT, 'utf8');
    expect(blueprint).toMatch(/Source/i);
    expect(blueprint).toMatch(/Retrieval date/i);
    expect(blueprint).toMatch(/https?:\/\//);
    expect(blueprint).not.toMatch(/\b(A\)|B\)|C\)|D\))\s/);
    for (const rec of loadRecords()) {
      expect(blueprint).toContain(rec.blueprint_ref.domain);
      expect(blueprint).toContain(rec.blueprint_ref.objective);
    }
  });

  it('all records carry completed similarity_check; over-threshold => flagged_for_review', () => {
    for (const rec of loadRecords()) {
      expect(rec.similarity_check.method).toBeTruthy();
      expect(rec.similarity_check.corpus_ref).toBe('corpus-ccaf-v1');
      expect(typeof rec.similarity_check.max_score).toBe('number');
      expect(rec.similarity_check.checked_at).toBeTruthy();
      if (rec.similarity_check.verdict === 'over_threshold') {
        expect(rec.disposition).toBe('flagged_for_review');
      }
    }
    const r = runNode(['scripts/similarity-check.mjs']);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/"ok":true/);
  });

  it('similarity script refuses to run without corpus attestation', () => {
    const manifest = readFileSync(MANIFEST, 'utf8');
    expect(manifest).toMatch(/^legitimate_sources_only:\s*attested by /m);

    const r = runNode([
      '-e',
      `
      import { assertCorpusAttestation } from './scripts/similarity-check.mjs';
      try {
        assertCorpusAttestation('# no line\\n');
        process.exit(2);
      } catch {
        process.exit(1);
      }
      `,
    ]);
    expect(r.status).toBe(1);
  });

  it('no src/app import of provenance.ccaf.json (grep)', () => {
    const appRoot = join(ROOT, 'src/app');
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walk(p);
        else if (/\.(ts|tsx|js|jsx)$/.test(name.name)) {
          const text = readFileSync(p, 'utf8');
          if (text.includes('provenance.ccaf')) hits.push(p);
        }
      }
    };
    walk(appRoot);
    expect(hits).toEqual([]);
  });

  it('serializer determinism: double-run byte-identical, sorted ids', () => {
    const records = loadRecords();
    const r = runNode([
      '-e',
      `
      import { readFileSync } from 'node:fs';
      import { serializeProvenanceRecords } from './scripts/lib/bank-ids.mjs';
      const records = JSON.parse(readFileSync('src/data/provenance.ccaf.json','utf8'));
      const a = serializeProvenanceRecords(records);
      const b = serializeProvenanceRecords(records);
      if (a !== b) process.exit(2);
      if (a !== readFileSync('src/data/provenance.ccaf.json','utf8')) process.exit(3);
      const ids = records.map(x => x.item_id);
      const sorted = [...ids].sort();
      if (ids.join() !== sorted.join()) process.exit(4);
      process.exit(0);
      `,
    ]);
    expect(r.status).toBe(0);
    const ids = records.map((rec) => rec.item_id);
    expect(ids).toEqual([...ids].sort());
  });

  it('PROVENANCE.md documents threshold as human-decides trigger and process sections', () => {
    const doc = readFileSync(PROVENANCE_DOC, 'utf8');
    expect(doc).toMatch(/0\.42/);
    expect(doc).toMatch(/review trigger/i);
    expect(doc).toMatch(/human/i);
    expect(doc).toMatch(/## Schema/);
    expect(doc).toMatch(/## Attestation procedure/);
    expect(doc).toMatch(/## Similarity procedure/);
    expect(doc).toMatch(/## Blueprint-only sourcing rule/);
    expect(doc).toMatch(/CONTENT-002/);
  });
});
