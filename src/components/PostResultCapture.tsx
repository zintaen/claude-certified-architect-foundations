'use client';

import { useEffect, useState } from 'react';
import { identifyByEmail, track } from '@/lib/analytics';

const DISMISS_KEY = 'csk_capture_dismissed';

/**
 * Post-result email capture (OBS-001).
 * Shown when no known email and not previously dismissed.
 */
export default function PostResultCapture() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
      const known = (localStorage.getItem('ccaf-email') || '').trim();
      if (known) return;
      setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setStatus('saving');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, source: 'post_result' }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!data.ok) {
        setStatus('error');
        return;
      }
      try {
        localStorage.setItem('ccaf-email', clean);
      } catch {
        /* ignore */
      }
      identifyByEmail(clean);
      track('subscribe_submitted', { source: 'post_result' });
      setStatus('done');
      setTimeout(() => setVisible(false), 1200);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div
      className="surface-raised border border-border rounded-2xl p-6 flex flex-col gap-4"
      data-testid="post-result-capture"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Get readiness updates</h3>
          <p className="text-sm text-muted">
            Optional email for study tips and lifecycle nudges (welcome, mock reminders, multi-cert
            journey notes, win-back). Never sold. Unsubscribe anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-sm text-muted hover:text-foreground min-h-11 px-2"
          data-testid="capture-dismiss"
          aria-label="Dismiss email capture"
        >
          Not now
        </button>
      </div>
      {status === 'done' ? (
        <p className="text-sm text-success" data-testid="capture-done">
          Thanks — you&apos;re on the list.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
            className="flex-1 min-h-11 px-3 rounded-md border border-border bg-background"
            data-testid="capture-email"
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={status === 'saving'}
            className="min-h-11 px-4 rounded-md bg-primary text-primary-foreground font-semibold"
            data-testid="capture-submit"
          >
            {status === 'saving' ? 'Saving…' : 'Subscribe'}
          </button>
        </form>
      )}
      {status === 'error' ? (
        <p className="text-sm text-destructive">Could not subscribe. Try again later.</p>
      ) : null}
    </div>
  );
}
