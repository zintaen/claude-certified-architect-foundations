import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ALLOWED_ROOTS = ['docs/blueprints/'];

export function assertAllowlistedPath(repoRoot, relPath) {
  const norm = relPath.replace(/\\/g, '/');
  if (!ALLOWED_ROOTS.some((r) => norm.startsWith(r))) {
    throw new Error(`path not allowlisted: ${relPath}`);
  }
  const abs = resolve(repoRoot, norm);
  if (!abs.startsWith(resolve(repoRoot, 'docs/blueprints'))) {
    throw new Error(`path escapes allowlist: ${relPath}`);
  }
  return abs;
}

export function loadConfig(repoRoot, configPath) {
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  assertAllowlistedPath(repoRoot, cfg.blueprintDoc);
  if (cfg.vendor?.ai_generation_policy === 'prohibited') {
    throw new Error(`vendor ${cfg.vendor.key} prohibits AI generation; refusing`);
  }
  if (!('ai_generation_policy' in (cfg.vendor || {}))) {
    throw new Error('vendor.ai_generation_policy required');
  }
  // No override field may exist
  if (cfg.overrideAiPolicy || cfg.forceProhibited) {
    throw new Error('override flags are not permitted');
  }
  const mix = cfg.cognitiveMix || {};
  const sum = (mix.recall || 0) + (mix.application || 0) + (mix.analysis || 0);
  if (Math.abs(sum - 1) > 0.001) throw new Error('cognitiveMix must sum to 1');
  const beta = Number(cfg.betaMixRatio ?? 0);
  if (!Number.isFinite(beta) || beta < 0 || beta > 5) {
    throw new Error('betaMixRatio must be between 0 and 5 inclusive');
  }
  if (cfg.skipSimilarity === true) {
    throw new Error('similarity gate cannot be skipped');
  }
  return { ...cfg, betaMixRatio: beta };
}

export function assemblePrompt({ blueprintText, rulebook, target }) {
  // Allowlist-only: never accept free-text user content sources.
  return [
    'ITEM WRITING RULEBOOK',
    rulebook,
    'BLUEPRINT EXCERPT',
    blueprintText.slice(0, 4000),
    'TARGET',
    JSON.stringify(target),
    'Produce one MCQ with keys A-D, exactly one correct, no all/none of the above.',
  ].join('\n\n');
}

export const RULEBOOK = `
- Single clear stem; no cueing.
- Exactly one defensibly correct option.
- Plausible distractors; comparable length/grammar.
- No "all of the above" / "none of the above".
- Tag Bloom level: recall | application | analysis.
`.trim();
