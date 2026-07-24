'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * EU withdrawal / cancel request surface (PAY-002).
 * Routes into Paddle cancel/refund APIs when credentials exist; otherwise records intent.
 */
export default function WithdrawalPage() {
  const [email, setEmail] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('withdrawal');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/paddle/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, transactionId, reason }),
      });
      const body = (await res.json()) as { status?: string; message?: string; error?: string };
      if (!res.ok) {
        setStatus(body.error || 'Request failed');
      } else {
        setStatus(body.message || body.status || 'Submitted');
      }
    } catch {
      setStatus('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-16" data-testid="withdrawal-page">
      <Link href="/pricing" className="text-sm text-primary underline">
        ← Pricing
      </Link>
      <h1 className="text-2xl font-semibold mt-4 mb-2">Withdraw or cancel</h1>
      <p className="text-sm text-foreground/80 mb-6">
        Paddle is the Merchant of Record and seller of record. Submit a withdrawal (EU 14-day) or
        cancellation request here; we forward it to Paddle&apos;s refund/cancel APIs when available.
      </p>
      <form onSubmit={submit} className="space-y-4" data-testid="withdrawal-form">
        <label className="block text-sm">
          Email used at checkout
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-border rounded-md px-3 py-2 bg-background"
            data-testid="withdrawal-email"
          />
        </label>
        <label className="block text-sm">
          Paddle transaction or subscription ID
          <input
            required
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="mt-1 w-full border border-border rounded-md px-3 py-2 bg-background"
            data-testid="withdrawal-txn"
            placeholder="txn_… or sub_…"
          />
        </label>
        <label className="block text-sm">
          Reason
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full border border-border rounded-md px-3 py-2 bg-background"
            data-testid="withdrawal-reason"
          >
            <option value="withdrawal">EU withdrawal (14-day)</option>
            <option value="cancel">Cancel subscription</option>
            <option value="refund">Refund request</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-md"
          data-testid="withdrawal-submit"
        >
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
      {status && (
        <p className="mt-4 text-sm" data-testid="withdrawal-status" role="status">
          {status}
        </p>
      )}
      <p className="mt-8 text-sm text-foreground/70">
        Also linked from <Link href="/refunds">refunds</Link> and purchase confirmation.
      </p>
    </main>
  );
}
