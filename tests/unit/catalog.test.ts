import { describe, it, expect } from 'vitest';
import { listCatalog, examByCode } from '../../src/lib/catalog';

describe('catalog', () => {
  it('lists live catalog spine', async () => {
    const catalog = await listCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(1);
    expect(catalog[0].key).toBe('anthropic');
    const exam = catalog[0].certifications.flatMap((c) => c.exams).find((e) => e.code === 'ccaf');
    expect(exam?.status).toBe('live');
  });

  it('examByCode returns domains for live ccaf and null for missing', async () => {
    const exam = await examByCode('ccaf');
    expect(exam?.code).toBe('ccaf');
    expect(exam?.domains.length).toBe(4);
    expect(await examByCode('nope')).toBeNull();
  });
});
