'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics';

export type UpgradeReason = 'cap_reached' | 'mock_limit' | 'explanations_locked';

const COPY: Record<UpgradeReason, { title: string; body: string }> = {
  cap_reached: {
    title: 'Free practice limit reached',
    body: 'You have used the free question set for this exam. Unlock the full bank with a pass when you are ready — the free set stays available forever.',
  },
  mock_limit: {
    title: 'Free mock used',
    body: 'Your free full mock for this exam is complete. Premium unlocks unlimited timed mocks and deeper explanations. No fake urgency — upgrade when it helps.',
  },
  explanations_locked: {
    title: 'Deeper explanations are premium',
    body: 'You still see which answers were right or wrong. Per-option rationales unlock with a pass.',
  },
};

/** Forbidden dark-pattern phrases (static lint in tests). */
export const UPGRADE_PROMPT_FORBIDDEN = [
  String.raw`\bonly\b.+\bleft\b`,
  String.raw`\bhurry\b`,
  String.raw`\blimited time\b`,
  String.raw`\bexpires in\b`,
  String.raw`\bcountdown\b`,
  String.raw`%\s*off\b`,
  String.raw`\bact now\b`,
] as const;

type Props = {
  reason: UpgradeReason;
  examCode?: string;
  /** When false (default with enforcement off), render nothing. */
  show?: boolean;
  onUpgradeClick?: () => void;
};

/**
 * Honest locked-state UI. Must not render while ENTITLEMENTS_ENFORCED is off
 * (callers pass show={enforcementOn && gateHit}).
 */
export function UpgradePrompt({ reason, examCode, show = false, onUpgradeClick }: Props) {
  const shown = useRef(false);
  useEffect(() => {
    if (!show || shown.current) return;
    shown.current = true;
    track('upgrade_prompt_shown', { reason, exam_code: examCode ?? null });
  }, [show, reason, examCode]);

  if (!show) return null;

  const copy = COPY[reason];

  return (
    <aside
      className="rounded-lg border border-foreground/15 bg-foreground/[0.03] p-4 text-sm"
      data-upgrade-reason={reason}
      role="status"
    >
      <h2 className="font-semibold text-foreground">{copy.title}</h2>
      <p className="mt-1 text-foreground/70">{copy.body}</p>
      <button
        type="button"
        className="mt-3 text-primary underline-offset-2 hover:underline"
        onClick={() => {
          track('upgrade_prompt_clicked', { reason, exam_code: examCode ?? null });
          onUpgradeClick?.();
          if (!onUpgradeClick && typeof window !== 'undefined') {
            window.location.href = '/pricing';
          }
        }}
      >
        Learn about passes
      </button>
    </aside>
  );
}
