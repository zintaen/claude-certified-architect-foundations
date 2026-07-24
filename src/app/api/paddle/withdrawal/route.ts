/**
 * Withdrawal / cancel adapter → Paddle Billing APIs when keys exist.
 */
import { NextResponse } from 'next/server';
import { paddleApiKey, paddleEnv } from '@/lib/paddle';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';

const API_BASE = {
  sandbox: 'https://sandbox-api.paddle.com',
  production: 'https://api.paddle.com',
} as const;

export async function POST(request: Request) {
  const limited = await enforceRateLimit(
    classify('/api/paddle/withdrawal', 'POST'),
    clientIpFromHeaders(request.headers)
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: limited.error, retryAfterS: limited.retryAfterS },
      { status: limited.status }
    );
  }

  let body: { email?: string; transactionId?: string; reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const transactionId = String(body.transactionId || '').trim();
  const reason = String(body.reason || 'withdrawal');
  if (!email || !transactionId) {
    return NextResponse.json({ error: 'email_and_transaction_required' }, { status: 400 });
  }

  const key = paddleApiKey();
  if (!key) {
    console.info('[paddle.withdrawal] recorded_without_api', {
      email_hash: email.slice(0, 2) + '…',
      transactionId,
      reason,
    });
    return NextResponse.json({
      status: 'recorded',
      message:
        'Request recorded. Paddle API key is not configured yet — an operator will process via the Paddle dashboard.',
    });
  }

  const base = API_BASE[paddleEnv()];
  try {
    if (transactionId.startsWith('sub_') || reason === 'cancel') {
      const res = await fetch(`${base}/subscriptions/${encodeURIComponent(transactionId)}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ effective_from: 'next_billing_period' }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[paddle.withdrawal] cancel_failed', res.status, text.slice(0, 200));
        return NextResponse.json(
          {
            status: 'forwarded_failed',
            message: 'Paddle cancel call failed — contact info@cyberskill.world with your ID.',
          },
          { status: 502 }
        );
      }
      return NextResponse.json({
        status: 'cancel_submitted',
        message: 'Cancellation submitted to Paddle.',
      });
    }

    // Refund path: create adjustment against transaction
    const res = await fetch(`${base}/adjustments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'refund',
        transaction_id: transactionId,
        reason: reason === 'withdrawal' ? 'customer_request' : 'error',
        type: 'full',
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[paddle.withdrawal] refund_failed', res.status, text.slice(0, 200));
      return NextResponse.json(
        {
          status: 'forwarded_failed',
          message: 'Paddle refund call failed — contact info@cyberskill.world with your ID.',
        },
        { status: 502 }
      );
    }
    return NextResponse.json({
      status: 'refund_submitted',
      message: 'Refund/withdrawal submitted to Paddle.',
    });
  } catch (err) {
    console.error('[paddle.withdrawal] network', err);
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}
