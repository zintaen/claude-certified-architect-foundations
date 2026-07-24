#!/usr/bin/env node
/**
 * One-shot attestation pass: build provenance.ccaf.json for every bank item.
 * Idempotent — safe to re-run; refreshes similarity scores via the same path.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const r = spawnSync(process.execPath, [join(ROOT, 'scripts/similarity-check.mjs'), '--write'], {
  cwd: ROOT,
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
