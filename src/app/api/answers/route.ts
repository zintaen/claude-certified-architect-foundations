import { NextResponse } from 'next/server';
import { trace } from '@opentelemetry/api';
import { withSpan } from '@superlog/otel-helpers';
import { answerKey } from '@/data/questions.server';

const tracer = trace.getTracer('ccaf.exam');
const MAX_IDS = 200;

// Reveal endpoint for flashcard study mode. Flashcards exist to show the answer, so this
// returns the full key for the requested ids. It is intentionally separate from the timed
// exam path, which never exposes answers until a sitting is completed and graded.
export async function POST(request: Request) {
  return await withSpan(
    'exam.answers',
    async (span) => {
      try {
        const body = (await request.json()) as Record<string, unknown>;
        const ids = Array.isArray(body?.ids) ? body.ids.slice(0, MAX_IDS) : [];

        const answers = ids
          .filter((id): id is string => typeof id === 'string' && !!answerKey[id])
          .map((id) => {
            const q = answerKey[id];
            return {
              id: q.id,
              options: q.options.map((o) => ({
                letter: o.letter,
                text: o.text,
                correct: o.correct,
                explain: o.explain,
              })),
            };
          });

        span.setAttribute('answers.count', answers.length);
        return NextResponse.json({ answers });
      } catch (err) {
        span.recordException(err as Error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    },
    { tracer }
  );
}
