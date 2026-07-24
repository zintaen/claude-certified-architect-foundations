'use client';

import { useCallback, useEffect, useState } from 'react';
import { track } from '@/lib/analytics';

type CommunityRow = {
  id: string;
  bodySanitized: string;
  authorHandle: string;
  createdAt: string;
  votes: number;
  versionMismatch?: boolean;
};

/**
 * Free-tier community explanations frame (GROWTH-004).
 * Visually distinct from CyberSkill reviewed feedback.
 */
export function CommunityExplanations({ itemId }: { itemId: string }) {
  const [rows, setRows] = useState<CommunityRow[]>([]);
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [identity, setIdentity] = useState<{ email: string; pinHash: string } | null>(null);

  const load = useCallback(() => {
    void fetch(`/api/community/explanations?itemId=${encodeURIComponent(itemId)}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(Array.isArray(data.explanations) ? data.explanations : []);
      })
      .catch(() => undefined);
  }, [itemId]);

  useEffect(() => {
    try {
      const email = localStorage.getItem('ccaf-email');
      const pinHash = localStorage.getItem('ccaf-pinHash');
      if (email && pinHash) setIdentity({ email, pinHash });
    } catch {
      /* ignore */
    }
    load();
  }, [load]);

  async function submit() {
    if (!identity) {
      setMsg('Save email + PIN to contribute.');
      return;
    }
    const res = await fetch('/api/community/explanations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        op: 'submit',
        itemId,
        body: draft,
        email: identity.email,
        pinHash: identity.pinHash,
      }),
    });
    const data = (await res.json()) as { result?: string; itemIdHash?: string };
    if (data.result === 'pending') {
      setDraft('');
      setMsg('Submitted for moderation. It appears after approval.');
      if (data.itemIdHash) {
        track('community_explanation_submitted', { item_id_hash: data.itemIdHash });
      }
    } else {
      setMsg(`Could not submit (${data.result ?? res.status}).`);
    }
  }

  async function upvote(explanationId: string) {
    if (!identity) return;
    await fetch('/api/community/explanations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        op: 'vote',
        explanationId,
        email: identity.email,
        pinHash: identity.pinHash,
      }),
    });
    load();
  }

  async function flagRow(explanationId: string) {
    if (!identity) return;
    const res = await fetch('/api/community/explanations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        op: 'flag',
        explanationId,
        itemId,
        reason: 'user_flag',
        email: identity.email,
        pinHash: identity.pinHash,
      }),
    });
    const data = (await res.json()) as { itemIdHash?: string };
    if (data.itemIdHash) {
      track('community_explanation_flagged', { item_id_hash: data.itemIdHash });
    }
    setMsg('Flagged for moderator review.');
  }

  return (
    <div
      className="mt-4 rounded-lg border-2 border-dashed border-foreground/25 bg-foreground/[0.02] p-3 space-y-3"
      data-testid="community-explanations"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Community explanations
      </div>
      <p className="text-xs text-foreground/55">
        Learner-written. Not CyberSkill-reviewed content. Moderated before publish. Do not paste
        live exam material — see Acceptable Use.
      </p>

      {rows.length === 0 && (
        <p className="text-sm text-foreground/50">No approved community notes yet.</p>
      )}

      {rows.map((r) => (
        <article key={r.id} className="text-sm space-y-1 border-t border-foreground/10 pt-2">
          <p className="whitespace-pre-wrap text-foreground/85">{r.bodySanitized}</p>
          <div className="flex flex-wrap gap-3 text-xs text-foreground/50">
            <span>{r.authorHandle}</span>
            <span>{new Date(r.createdAt).toLocaleDateString()}</span>
            {r.versionMismatch && <span>Written for an older item revision</span>}
            <button type="button" className="underline" onClick={() => void upvote(r.id)}>
              Helpful ({r.votes})
            </button>
            <button type="button" className="underline" onClick={() => void flagRow(r.id)}>
              Flag
            </button>
          </div>
        </article>
      ))}

      <div className="space-y-2 pt-2 border-t border-foreground/10">
        <label className="text-xs text-foreground/60" htmlFor={`ce-${itemId}`}>
          Add your explanation (after you answered this item)
        </label>
        <textarea
          id={`ce-${itemId}`}
          className="w-full min-h-[72px] rounded border border-foreground/15 bg-background p-2 text-sm"
          value={draft}
          maxLength={1200}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          className="text-sm text-primary underline-offset-2 hover:underline"
          onClick={() => void submit()}
        >
          Submit for moderation
        </button>
        {msg && <p className="text-xs text-foreground/60">{msg}</p>}
      </div>
    </div>
  );
}
