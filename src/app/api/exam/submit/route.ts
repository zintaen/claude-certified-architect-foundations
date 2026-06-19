import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { trace, metrics } from '@opentelemetry/api';
import { withSpan } from '@superlog/otel-helpers';

const tracer = trace.getTracer('ccaf.exam');
const meter = metrics.getMeter('ccaf.exam');
const submitCounter = meter.createCounter('exam.submit.count');

export async function POST(request: Request) {
  return await withSpan(
    'exam.submit',
    async (span) => {
      try {
        const payload = await request.json();

        span.setAttribute('exam.score', payload.p_score);
        span.setAttribute('exam.time_taken', payload.p_time_taken);
        if (payload.p_nickname) {
          span.setAttribute('user.nickname', payload.p_nickname);
        }

        const { data, error } = await supabase.rpc('submit_exam_result', payload);

        if (error) {
          span.recordException(error);
          span.setAttribute('outcome', 'error');
          submitCounter.add(1, { outcome: 'error' });
          return NextResponse.json({ error: error.message }, { status: 400 });
        }

        span.setAttribute('outcome', 'success');
        submitCounter.add(1, { outcome: 'success' });
        return NextResponse.json({ success: true, data });
      } catch (err) {
        span.recordException(err as Error);
        span.setAttribute('outcome', 'fault');
        submitCounter.add(1, { outcome: 'fault' });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    },
    { tracer }
  );
}
