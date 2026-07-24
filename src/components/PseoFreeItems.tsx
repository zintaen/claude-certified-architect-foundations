'use client';

import { useState } from 'react';
import type { PseoFreeItem } from '@/lib/pseo';
import { track } from '@/lib/analytics';

type Props = {
  items: PseoFreeItem[];
  examCode: string;
  intent: string;
};

/**
 * Free sample items for pSEO pages. Correct keys are passed as props but not
 * rendered until the learner picks an option (keeps keys out of initial scan of
 * static answer markup in the HTML tree until interaction — still in RSC payload;
 * for AC we omit correctKey from server-rendered children by stripping before pass).
 */
export function PseoFreeItems({ items, examCode, intent }: Props) {
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  if (items.length === 0) {
    return (
      <p className="text-sm text-foreground/70" data-testid="pseo-thin">
        Free sample items appear here once this exam clears the indexation threshold.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="pseo-free-items">
      {items.map((item, idx) => (
        <article key={item.id} className="rounded-lg border border-foreground/15 p-4">
          <h3 className="font-semibold">Sample {idx + 1}</h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">{item.stem}</p>
          <ul className="mt-3 space-y-2">
            {item.options.map((o) => (
              <li key={o.key}>
                <button
                  type="button"
                  className="w-full rounded border border-foreground/20 px-3 py-2 text-left text-sm hover:border-primary"
                  onClick={() => {
                    setRevealed((r) => ({ ...r, [item.id]: o.key }));
                    track('pseo_free_item_answered', {
                      exam_code: examCode,
                      intent: intent as 'practice-exam' | 'practice-questions' | 'free-mock-test',
                    });
                  }}
                >
                  <span className="font-medium">{o.key}.</span> {o.text}
                </button>
              </li>
            ))}
          </ul>
          {revealed[item.id] && item.correctKey && (
            <p className="mt-2 text-sm text-foreground/70">
              {revealed[item.id] === item.correctKey
                ? 'Correct.'
                : `Not quite — the keyed answer is ${item.correctKey}.`}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
