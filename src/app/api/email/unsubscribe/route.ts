import { NextResponse } from 'next/server';
import { suppress } from '@/lib/email';
import { hashRecipient } from '@/lib/email';

/**
 * One-click unsubscribe (GROWTH-005). GET or POST.
 * Immediately permanent suppression.
 */
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const url = new URL(request.url);
  let email = url.searchParams.get('e')?.trim().toLowerCase() ?? '';
  if (!email && request.method === 'POST') {
    try {
      const body = (await request.json()) as { email?: string };
      email = (body.email || '').trim().toLowerCase();
    } catch {
      /* form body optional */
    }
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'email_required' }, { status: 400 });
  }
  await suppress(email, 'unsubscribe');
  // analytics-shaped log only hashed
  void hashRecipient(email);
  return new NextResponse(
    `<!doctype html><html><body><p>You are unsubscribed. No further lifecycle emails will be sent to this address.</p></body></html>`,
    {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
    }
  );
}
