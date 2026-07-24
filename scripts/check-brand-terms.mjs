#!/usr/bin/env node
/**
 * Brand / trademark term guard (LEGAL-001).
 * exit 0 = clean; exit 1 = print violations.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const BANNED = [
  'official',
  'authorized',
  'authentic',
  'certified by',
  'endorsed',
  'approved by',
  'partner',
];

const ALLOW_LINE =
  /INDEPENDENCE_DISCLAIMER|neither affiliated|authorized, sponsored|Partner Academy|Partner Network|BANNED_DESCRIPTORS|check-brand-terms|trademarks|site_default|MARK_|Google-Extended|GPTBot|ClaudeBot|PerplexityBot/i;

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function loadMarks() {
  const src = readFileSync(join(ROOT, 'src/lib/legal.ts'), 'utf8');
  const marks = [];
  for (const block of src.matchAll(/marks:\s*\[([\s\S]*?)\]/g)) {
    for (const m of block[1].matchAll(/'([^']+)'/g)) marks.push(m[1]);
  }
  marks.sort((a, b) => b.length - a.length);
  return marks;
}

function isExemptPath(rel) {
  if (rel.startsWith('src/lib/legal.ts')) return true;
  if (rel.startsWith('src/data/')) return true;
  if (rel.includes('check-brand-terms')) return true;
  if (rel.includes('.test.')) return true;
  if (rel.includes('/tests/')) return true;
  // Registry holds exam display names sourced at CONTENT-003; treated as content data.
  if (rel.startsWith('src/lib/examRegistry.ts')) return true;
  if (rel.startsWith('docs/legal/')) return true;
  if (rel.startsWith('docs/blueprints/')) return true;
  return false;
}

function hasOfficialAfterUnofficialStrip(line) {
  const stripped = line.replace(/unofficial/gi, '');
  return /\bofficial\b/i.test(stripped);
}

function main() {
  const marks = loadMarks().filter(
    (m) => m !== 'Claude' && (m.length >= 6 || /^CC[A-Z0-9-]+$/i.test(m))
  );
  const violations = [];

  const srcFiles = walk(join(ROOT, 'src')).filter((f) => /\.(ts|tsx)$/.test(f));
  const publicFiles = walk(join(ROOT, 'public')).filter((f) => /\.(svg|html|txt|json)$/i.test(f));

  for (const file of [...srcFiles, ...publicFiles]) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (rel.includes('node_modules')) continue;
    if (isExemptPath(rel)) continue;

    if (/anthropic|claude.*(logo|badge|mark)/i.test(rel.split('/').pop() || '')) {
      violations.push(`${rel}:1: vendor imagery filename match`);
      continue;
    }

    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNo = i + 1;
      if (ALLOW_LINE.test(line)) continue;

      if (!rel.startsWith('src/data/')) {
        for (const term of BANNED) {
          const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (!re.test(line)) continue;
          if (term === 'official' && !hasOfficialAfterUnofficialStrip(line)) continue;
          violations.push(`${rel}:${lineNo}: banned descriptor "${term}"`);
        }
      }

      if (!isExemptPath(rel)) {
        for (const mark of marks) {
          if (!line.includes(mark)) continue;
          if (/from ['"]@\/lib\/legal['"]/.test(line)) continue;
          if (/MARK_|VENDOR_MARKS|INDEPENDENCE_|TRADEMARK_/.test(line)) continue;
          violations.push(`${rel}:${lineNo}: vendor mark literal "${mark}"`);
          break;
        }
      }
    }
  }

  if (violations.length) {
    for (const v of violations) console.error(v);
    console.error(`${violations.length} violations. Failing.`);
    process.exit(1);
  }
  console.log('check-brand-terms: ok');
}

main();
