import { NextResponse } from 'next/server';
import { assembleSitting, toClientQuestions } from '@/lib/sittings';
import { classify, clientIpFromHeaders, enforceRateLimit } from '@/lib/rateLimit';
import { serveFromDb } from '@/lib/cutoverFlags';
import { FreeMockLimitError } from '@/lib/entitlements';

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const path = `/api/exams/${code}/session`;
  const cls = classify(path, 'POST');
  const limited = await enforceRateLimit(cls, clientIpFromHeaders(request.headers));
  if (!limited.ok) {
    return NextResponse.json(
      { error: limited.error, retryAfterS: limited.retryAfterS },
      {
        status: limited.status,
        headers: limited.retryAfterS ? { 'Retry-After': String(limited.retryAfterS) } : undefined,
      }
    );
  }

  // Catalog exams are DB-native (no client bank). Always assemble from DB so the
  // multi-exam catalog keeps working when SERVE_FROM_DB=off. The flag is echoed on
  // the response for cutover observability; classic CCAF /exam stays on the client
  // bundle until a dedicated surface flip moves it.
  const serveFlag = serveFromDb() ? 'on' : 'off';

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const mode = body.mode === 'practice' ? 'practice' : 'exam';
  const userId = typeof body.userId === 'string' ? body.userId : undefined;
  const betaMix = typeof body.betaMix === 'number' ? body.betaMix : undefined;

  try {
    const { sittingId, questions, durationMinutes } = await assembleSitting({
      examCode: code,
      mode,
      userId,
      betaMix,
    });
    return NextResponse.json({
      sittingId,
      examCode: code,
      durationMinutes,
      questions: toClientQuestions(questions),
      path: 'db',
      SERVE_FROM_DB: serveFlag,
    });
  } catch (err) {
    if (err instanceof FreeMockLimitError) {
      return NextResponse.json(
        {
          error: err.code,
          examCode: err.examCode,
          freeMocksUsed: err.freeMocksUsed,
          upgrade: { sku: 'per_exam_pass' },
        },
        { status: 402 }
      );
    }
    const msg = err instanceof Error ? err.message : 'session unavailable';
    const status = msg.includes('not found') ? 404 : 503;
    return NextResponse.json({ error: msg }, { status });
  }
}
