'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DOMAIN_ORDER, DOMAINS } from '@/lib/domains';
import {
  CUSTOM_EXAM_CONFIG,
  defaultSpec,
  validateAndSelect,
  type CustomExamSpec,
  type DifficultyBand,
} from '@/lib/customExam';
import { questions } from '@/data/questions';
import { useExamEngine } from '@/hooks/useExamEngine';
import { confirmDiscardIfInProgress } from '@/lib/session';
import { track } from '@/lib/analytics';

const STORAGE_KEY = 'ccaf-custom-exam-last';

/**
 * Premium custom exam builder (LEARN-005). Honest under-fill; no cross-domain padding.
 */
export function CustomExamBuilder() {
  const router = useRouter();
  const engine = useExamEngine();
  const [spec, setSpec] = useState<CustomExamSpec>(defaultSpec);
  const [note, setNote] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  function toggleDomain(key: string) {
    setSpec((s) => {
      const has = s.domainKeys.includes(key);
      const domainKeys = has ? s.domainKeys.filter((k) => k !== key) : [...s.domainKeys, key];
      return { ...s, domainKeys };
    });
  }

  function run(again = false) {
    if (!confirmDiscardIfInProgress()) return;
    let next = spec;
    if (again) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) next = JSON.parse(raw) as CustomExamSpec;
      } catch {
        /* ignore */
      }
    }
    // Soft premium check: when enforcement on, API would gate; client mirrors via flag fetch optional
    const result = validateAndSelect(next, { seed: Date.now() });
    if (!result.ok) {
      setNote(result.error === 'no_items' ? 'No items in selected domains.' : result.error);
      return;
    }
    if (result.bandNote) setNote(result.bandNote);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.spec));
    } catch {
      /* ignore */
    }
    track('custom_exam_built', {
      domains_count: result.spec.domainKeys.length,
      question_count: result.itemIds.length,
      timing: result.spec.timing,
      band: result.spec.band,
    });
    engine.buildSession(questions, result.itemIds.length, result.spec.timing === 'untimed', {
      itemIds: result.itemIds,
    });
    router.push('/exam');
  }

  // Locked teaser when entitlements enforced — detect via readiness/drill pattern optional.
  // Use a lightweight probe: if ENTITLEMENTS not on, builder works for all.
  void locked;

  return (
    <div className="surface-panel rounded-2xl p-6 space-y-4" data-testid="custom-exam-builder">
      <h2 className="text-lg font-semibold">Custom exam builder</h2>
      <p className="text-sm text-muted">
        Pick domains and length. We never pad with off-domain items — if the pool is short, we say
        so. Premium when entitlements are enforced.
      </p>

      <div className="grid sm:grid-cols-2 gap-2">
        {DOMAIN_ORDER.map((id) => (
          <label key={id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={spec.domainKeys.includes(id)}
              onChange={() => toggleDomain(id)}
            />
            {DOMAINS[id].label}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center text-sm">
        <label>
          Count{' '}
          <select
            className="rounded border border-border bg-background px-2 py-1"
            value={spec.count}
            onChange={(e) => setSpec((s) => ({ ...s, count: Number(e.target.value) }))}
          >
            {CUSTOM_EXAM_CONFIG.countPresets.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Timing{' '}
          <select
            className="rounded border border-border bg-background px-2 py-1"
            value={spec.timing}
            onChange={(e) =>
              setSpec((s) => ({ ...s, timing: e.target.value as 'timed' | 'untimed' }))
            }
          >
            <option value="untimed">Untimed</option>
            <option value="timed">Timed</option>
          </select>
        </label>
        <label>
          Band{' '}
          <select
            className="rounded border border-border bg-background px-2 py-1"
            value={spec.band}
            onChange={(e) => setSpec((s) => ({ ...s, band: e.target.value as DifficultyBand }))}
          >
            <option value="mixed">Mixed</option>
            <option value="easier">Easier</option>
            <option value="harder">Harder</option>
          </select>
        </label>
      </div>

      {note && <p className="text-sm text-foreground/60">{note}</p>}
      {locked && (
        <p className="text-sm" data-testid="custom-exam-locked">
          Custom exams unlock with premium.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold"
          onClick={() => {
            setLocked(false);
            run(false);
          }}
        >
          Build & start
        </button>
        <button
          type="button"
          className="border border-border px-4 py-2 rounded-md text-sm"
          onClick={() => run(true)}
        >
          Run again
        </button>
      </div>
    </div>
  );
}
