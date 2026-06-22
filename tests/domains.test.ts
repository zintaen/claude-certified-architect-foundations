import { describe, it, expect } from 'vitest';
import {
  computeDomainScores,
  strongestDomain,
  weakestDomain,
  archetypeFor,
  isGroupId,
  DOMAIN_ORDER,
  DOMAINS,
  PASS_SCORE,
  type ScoredItem,
} from '../src/lib/domains';

// Build a minimal scored item: which group, which letter the user chose, and
// which letter is the correct one (A or B).
const mk = (group: string, chosen: string | null, correct: 'A' | 'B'): ScoredItem => ({
  group,
  chosenLetter: chosen,
  options: [
    { letter: 'A', correct: correct === 'A' },
    { letter: 'B', correct: correct === 'B' },
  ],
});

describe('domains', () => {
  it('uses the published 720 pass mark', () => {
    expect(PASS_SCORE).toBe(720);
  });

  it('exposes four ordered domains with metadata', () => {
    expect(DOMAIN_ORDER).toHaveLength(4);
    DOMAIN_ORDER.forEach((id) => {
      expect(DOMAINS[id]).toBeTruthy();
      expect(DOMAINS[id].archetype.length).toBeGreaterThan(0);
    });
  });

  it('guards unknown group ids', () => {
    expect(isGroupId('research_pipeline')).toBe(true);
    expect(isGroupId('not_a_domain')).toBe(false);
  });

  it('computes correct/total/pct per domain and omits empty domains', () => {
    const items = [
      mk('research_pipeline', 'A', 'A'), // correct
      mk('research_pipeline', 'B', 'A'), // wrong
      mk('customer_support', 'A', 'A'), // correct
    ];
    const scores = computeDomainScores(items);
    expect(scores.find((s) => s.id === 'research_pipeline')).toMatchObject({
      correct: 1,
      total: 2,
      pct: 50,
    });
    expect(scores.find((s) => s.id === 'customer_support')).toMatchObject({
      correct: 1,
      total: 1,
      pct: 100,
    });
    expect(scores.find((s) => s.id === 'code_exploration')).toBeUndefined();
  });

  it('treats an unanswered question as incorrect', () => {
    const scores = computeDomainScores([mk('extraction_pipeline', null, 'A')]);
    expect(scores[0]).toMatchObject({ correct: 0, total: 1, pct: 0 });
  });

  it('finds the strongest and weakest domains', () => {
    const items = [mk('research_pipeline', 'A', 'A'), mk('customer_support', 'B', 'A')];
    const scores = computeDomainScores(items);
    expect(strongestDomain(scores)?.id).toBe('research_pipeline');
    expect(weakestDomain(scores)?.id).toBe('customer_support');
    expect(strongestDomain([])).toBeNull();
    expect(weakestDomain([])).toBeNull();
  });

  it('maps the strongest domain to an archetype, with a safe default', () => {
    const scores = computeDomainScores([mk('research_pipeline', 'A', 'A')]);
    expect(archetypeFor(scores)).toBe(DOMAINS.research_pipeline.archetype);
    expect(archetypeFor([])).toBe('Claude Architect');
  });
});
