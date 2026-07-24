#!/usr/bin/env node
/**
 * SCALE-001 — batch locale candidate generator.
 * Dry-run by default. Writes run-manifest under docs/i18n/runs/.
 * Does NOT ship catalogs: human review + `_review` header required.
 *
 * Usage:
 *   node scripts/translate-locale.mjs vi
 *   node scripts/translate-locale.mjs vi --write   # write candidate beside catalog (still needs review)
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const args = process.argv.slice(2);
const locale = args.find((a) => !a.startsWith('--'));
const write = args.includes('--write');
const dryRun = !write;

if (!locale || !/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
  console.error('Usage: node scripts/translate-locale.mjs <locale> [--write]');
  process.exit(1);
}

const enPath = join(root, 'src/i18n/en.json');
const en = JSON.parse(readFileSync(enPath, 'utf8'));
const { _meta, ...messages } = en;
const sourceHash = createHash('sha256').update(JSON.stringify(messages)).digest('hex').slice(0, 16);

const legalKeys = new Set(_meta?.legalSensitiveKeys ?? []);
const candidate = {
  _review: {
    reviewer: 'UNREVIEWED',
    date: new Date().toISOString().slice(0, 10),
    source_hash: sourceHash,
    legal_pages: 'english_with_notice',
  },
  ...Object.fromEntries(
    Object.entries(messages).map(([k, v]) => {
      if (legalKeys.has(k)) return [k, v]; // never machine-rewrite legal-sensitive keys
      // Placeholder candidate: prefix so reviewers see draft status (not a shippable MT).
      return [k, `[DRAFT:${locale}] ${v}`];
    })
  ),
};

const runDir = join(root, 'docs/i18n/runs');
mkdirSync(runDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const manifestPath = join(runDir, `${stamp}-${locale}.json`);
const manifest = {
  locale,
  dry_run: dryRun,
  source_hash: sourceHash,
  keys: Object.keys(messages).length,
  legal_sensitive_preserved: [...legalKeys],
  note: 'Candidate only. Ship requires named reviewer in _review and matching source_hash.',
  wrote_candidate: false,
};

if (write) {
  const outPath = join(root, `src/i18n/${locale}.candidate.json`);
  writeFileSync(outPath, JSON.stringify(candidate, null, 2) + '\n');
  manifest.wrote_candidate = true;
  manifest.candidate_path = outPath;
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  JSON.stringify(
    { ok: true, dry_run: dryRun, manifest: manifestPath, source_hash: sourceHash },
    null,
    2
  )
);

if (dryRun) {
  console.log('(dry-run default — pass --write to emit *.candidate.json; never auto-ships)');
}
