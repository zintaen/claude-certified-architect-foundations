import { describe, it, expect } from 'vitest';
import {
  URL_CONTRACT,
  indexedPaths,
  runtimePaths,
  CCAF_EXAMS_NAMESPACE_FORBIDDEN,
  isContractPath,
} from '../../src/lib/urlContract';
import {
  recordContract404,
  __contract404ProbeCount,
  __resetContract404Probe,
} from '../../src/lib/seoMetrics';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('SEO-001 url contract unit', () => {
  it('shared source: contract matches indexed + runtime sets', () => {
    const indexed = new Set(indexedPaths().map((p) => p || '/'));
    const runtime = new Set(runtimePaths());
    expect(
      URL_CONTRACT.filter((e) => e.kind === 'indexed')
        .map((e) => e.path)
        .sort()
    ).toEqual([...indexed].sort());
    expect(
      URL_CONTRACT.filter((e) => e.kind === 'runtime')
        .map((e) => e.path)
        .sort()
    ).toEqual([...runtime].sort());
  });

  it('dashboard is runtime not indexed', () => {
    expect(indexedPaths()).not.toContain('/dashboard');
    expect(runtimePaths()).toContain('/dashboard');
  });

  it('forbids /exams/ccaf namespace', () => {
    expect(URL_CONTRACT.some((e) => e.path.startsWith(CCAF_EXAMS_NAMESPACE_FORBIDDEN))).toBe(false);
  });

  it('contract 404 counter increments for contract paths only', () => {
    __resetContract404Probe();
    recordContract404('/not-in-contract-xyz');
    expect(__contract404ProbeCount()).toBe(0);
    recordContract404('/__seo_contract_404_probe');
    expect(__contract404ProbeCount()).toBe(1);
    expect(isContractPath('/__seo_contract_404_probe')).toBe(true);
  });

  it('DATA-002 mapping references url-contract flip gate', () => {
    const doc = readFileSync(join(process.cwd(), 'docs/migration/DATA-002-mapping.md'), 'utf8');
    expect(doc).toMatch(/url-contract\.spec/);
  });
});
