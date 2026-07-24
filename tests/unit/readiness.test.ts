import { describe, it, expect } from 'vitest';
import {
  READINESS_CONFIG,
  READINESS_PROHIBITED_COPY,
  composeReadiness,
  type MasteryResponseRow,
} from '@/lib/readiness';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function row(
  partial: Partial<MasteryResponseRow> &
    Pick<MasteryResponseRow, 'itemId' | 'domainKey' | 'correct'>
): MasteryResponseRow {
  return {
    answeredAt: new Date('2026-07-20T12:00:00Z'),
    ...partial,
  };
}

describe('LEARN-001 readiness unit', () => {
  it('excludes canary, beta, custom', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    const rows: MasteryResponseRow[] = [
      row({ itemId: 'a', domainKey: 'research_pipeline', correct: true, isCanary: true }),
      row({ itemId: 'b', domainKey: 'research_pipeline', correct: true, isBeta: true }),
      row({ itemId: 'c', domainKey: 'research_pipeline', correct: true, isCustomSitting: true }),
      ...Array.from({ length: 40 }, (_, i) =>
        row({
          itemId: `ok-${i}`,
          domainKey: 'research_pipeline',
          correct: i % 2 === 0,
          answeredAt: now,
        })
      ),
    ];
    const r = composeReadiness('ccaf', rows, { now });
    expect(r.computedFrom.responses).toBe(40);
  });

  it('recency favors newer responses', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    const oldWrong: MasteryResponseRow[] = Array.from({ length: 20 }, (_, i) =>
      row({
        itemId: `old-${i}`,
        domainKey: 'research_pipeline',
        correct: false,
        answeredAt: new Date('2026-06-20T12:00:00Z'), // within 60d window, older
      })
    );
    const newRight: MasteryResponseRow[] = Array.from({ length: 20 }, (_, i) =>
      row({
        itemId: `new-${i}`,
        domainKey: 'research_pipeline',
        correct: true,
        answeredAt: now,
      })
    );
    // pad other domains to meet overall floor with mixed accuracy
    const pad: MasteryResponseRow[] = [];
    for (const dk of ['extraction_pipeline', 'customer_support', 'code_exploration'] as const) {
      for (let i = 0; i < 10; i++) {
        pad.push(
          row({
            itemId: `${dk}-${i}`,
            domainKey: dk,
            correct: true,
            answeredAt: now,
          })
        );
      }
    }
    const r = composeReadiness('ccaf', [...oldWrong, ...newRight, ...pad], { now });
    const research = r.domains.find((d) => d.domainKey === 'research_pipeline')!;
    expect(research.recencyWeightedAccuracy).toBeGreaterThan(research.accuracy);
  });

  it('deterministic composition + sample floors', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    const few = [
      row({ itemId: '1', domainKey: 'research_pipeline', correct: true, answeredAt: now }),
    ];
    const low = composeReadiness('ccaf', few, { now });
    expect(low.score).toBeNull();
    expect(low.band).toBeNull();

    const many: MasteryResponseRow[] = [];
    for (const dk of [
      'research_pipeline',
      'extraction_pipeline',
      'customer_support',
      'code_exploration',
    ] as const) {
      for (let i = 0; i < 15; i++) {
        many.push(
          row({
            itemId: `${dk}-${i}`,
            domainKey: dk,
            correct: i < 10,
            answeredAt: now,
          })
        );
      }
    }
    const a = composeReadiness('ccaf', many, { now });
    const b = composeReadiness('ccaf', many, { now });
    expect(a.score).toBe(b.score);
    expect(a.score).not.toBeNull();
    expect(a.modelVersion).toBe(1);
    expect(READINESS_CONFIG.minResponsesOverall).toBeGreaterThan(0);
  });

  it('prohibited copy lint over readiness UI', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/ReadinessPanel.tsx'), 'utf8');
    const lower = src.toLowerCase();
    for (const phrase of READINESS_PROHIBITED_COPY) {
      expect(lower).not.toContain(phrase);
    }
  });

  it('weakDomains-shaped deficit ordering via compose', () => {
    const now = new Date('2026-07-24T12:00:00Z');
    const rows: MasteryResponseRow[] = [];
    for (let i = 0; i < 15; i++) {
      rows.push(
        row({
          itemId: `r-${i}`,
          domainKey: 'research_pipeline',
          correct: true,
          answeredAt: now,
        })
      );
      rows.push(
        row({
          itemId: `w-${i}`,
          domainKey: 'code_exploration',
          correct: false,
          answeredAt: now,
        })
      );
    }
    for (const dk of ['extraction_pipeline', 'customer_support'] as const) {
      for (let i = 0; i < 15; i++) {
        rows.push(row({ itemId: `${dk}-${i}`, domainKey: dk, correct: true, answeredAt: now }));
      }
    }
    const r = composeReadiness('ccaf', rows, { now });
    const deficits = r.domains
      .map((d) => ({
        domainKey: d.domainKey,
        deficit: 1 - d.recencyWeightedAccuracy * d.coverage,
        modelVersion: 1 as const,
      }))
      .sort((a, b) => b.deficit - a.deficit);
    expect(deficits[0]?.domainKey).toBe('code_exploration');
    expect(deficits[0]?.modelVersion).toBe(1);
  });
});
