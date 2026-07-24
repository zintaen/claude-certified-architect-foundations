/**
 * Enumerate stable item ids from the CCAF bank without importing TypeScript.
 * Mock bank: Q1..Qn from questions.public.ts (questions.ts re-exports it).
 * Sample bank: sample-<domain>-NN from SAMPLE_BY_DOMAIN enumeration order.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DOMAIN_ORDER = [
  'research_pipeline',
  'extraction_pipeline',
  'customer_support',
  'code_exploration',
];

export const GROUP_BLUEPRINT = {
  research_pipeline: {
    domain: 'Agentic Architecture & Orchestration',
    objective:
      'Design state recovery and hand-off patterns that preserve fidelity without context bloat',
  },
  extraction_pipeline: {
    domain: 'Tool Design & MCP Integration',
    objective:
      'Prefer purpose-specific tool contracts over free-text mega-tools when reliability matters',
  },
  customer_support: {
    domain: 'Context Management & Reliability',
    objective: 'Decide when to escalate to a human vs continue autonomously',
  },
  code_exploration: {
    domain: 'Claude Code Configuration & Workflows',
    objective: 'Scope agent searches and edits to the right package boundary',
  },
};

export function readQuestionsPublic(root) {
  return readFileSync(join(root, 'src/data/questions.public.ts'), 'utf8');
}

export function readSampleQuestions(root) {
  return readFileSync(join(root, 'src/data/sampleQuestions.ts'), 'utf8');
}

export function extractMockIds(source) {
  const ids = [];
  const re = /\bid:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(source))) ids.push(m[1]);
  return ids;
}

export function extractMockGroups(source) {
  const map = new Map();
  const blockRe = /\{\s*id:\s*'([^']+)',\s*group:\s*'([^']+)'/g;
  let m;
  while ((m = blockRe.exec(source))) map.set(m[1], m[2]);
  return map;
}

/** Extract top-level array body for a domain key inside SAMPLE_BY_DOMAIN. */
function domainArrayBody(source, domain) {
  const startKey = `  ${domain}: [`;
  const start = source.indexOf(startKey);
  if (start < 0) throw new Error(`sample domain not found: ${domain}`);
  const open = source.indexOf('[', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`unclosed sample domain array: ${domain}`);
}

export function extractSampleIds(source) {
  const ids = [];
  for (const domain of DOMAIN_ORDER) {
    const body = domainArrayBody(source, domain);
    const count = (body.match(/^\s+question:/gm) || []).length;
    for (let n = 1; n <= count; n++) {
      ids.push(`sample-${domain}-${String(n).padStart(2, '0')}`);
    }
  }
  return ids;
}

export function extractSampleTexts(source) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const domain of DOMAIN_ORDER) {
    const body = domainArrayBody(source, domain);
    const qRe = /question:\s*((?:'(?:\\'|[^'])*'|\n\s*\+?\s*'(?:\\'|[^'])*')+)/g;
    let m;
    const texts = [];
    while ((m = qRe.exec(body))) {
      const parts = [...m[1].matchAll(/'((?:\\'|[^'])*)'/g)].map((p) =>
        p[1].replace(/\\'/g, "'").replace(/\\n/g, '\n')
      );
      texts.push(parts.join(''));
    }
    let idx = 0;
    for (const t of texts) {
      idx += 1;
      map.set(`sample-${domain}-${String(idx).padStart(2, '0')}`, t);
    }
  }
  return map;
}

function unquoteTsString(raw, quote) {
  if (quote === "'") {
    return raw.replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  }
  return raw.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

export function extractMockTexts(source) {
  /** @type {Map<string, string>} */
  const map = new Map();
  // text may be single- or double-quoted (apostrophes force double quotes in the bank).
  const re = /\{\s*id:\s*'([^']+)',\s*group:\s*'[^']+',\s*text:\s*(['"])([\s\S]*?)\2/g;
  let m;
  while ((m = re.exec(source))) {
    map.set(m[1], unquoteTsString(m[3], m[2]));
  }
  return map;
}

export function allBankIds(root) {
  const mock = extractMockIds(readQuestionsPublic(root));
  const sample = extractSampleIds(readSampleQuestions(root));
  return { mock, sample, all: [...mock, ...sample] };
}

export function normalizeText(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function trigrams(s) {
  const n = normalizeText(s);
  const padded = `  ${n}  `;
  const set = new Set();
  for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
  return set;
}

export function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function trigramSimilarity(a, b) {
  return jaccard(trigrams(a), trigrams(b));
}

/** Stable JSON: sorted array of records, one object per line. */
export function serializeProvenanceRecords(records) {
  const sorted = [...records].sort((a, b) =>
    a.item_id < b.item_id ? -1 : a.item_id > b.item_id ? 1 : 0
  );
  const lines = sorted.map((r) => JSON.stringify(orderRecord(r)));
  return `[\n${lines.map((l) => `  ${l}`).join(',\n')}\n]\n`;
}

function orderRecord(r) {
  return {
    item_id: r.item_id,
    blueprint_ref: {
      domain: r.blueprint_ref.domain,
      objective: r.blueprint_ref.objective,
      blueprint_doc: r.blueprint_ref.blueprint_doc,
    },
    origin: orderOrigin(r.origin),
    reviewer: r.reviewer,
    reviewed_at: r.reviewed_at,
    similarity_check: {
      method: r.similarity_check.method,
      corpus_ref: r.similarity_check.corpus_ref,
      max_score: r.similarity_check.max_score,
      verdict: r.similarity_check.verdict,
      checked_at: r.similarity_check.checked_at,
    },
    disposition: r.disposition,
    record_version: r.record_version,
  };
}

function orderOrigin(o) {
  const out = { method: o.method };
  if (o.model !== undefined) out.model = o.model;
  if (o.prompt_ref !== undefined) out.prompt_ref = o.prompt_ref;
  if (o.generated_at !== undefined) out.generated_at = o.generated_at;
  return out;
}

export const SIMILARITY_METHOD = 'norm-trigram-jaccard';
/** Review trigger — measured against corpus-ccaf-v1 distribution; see docs/PROVENANCE.md. */
export const SIMILARITY_THRESHOLD = 0.42;
export const CORPUS_REF = 'corpus-ccaf-v1';
export const BLUEPRINT_DOC = 'docs/blueprints/ccaf-blueprint.md';
export const ATTESTATION_LINE_PREFIX = 'legitimate_sources_only:';
