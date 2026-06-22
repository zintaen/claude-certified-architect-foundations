import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { trace, metrics } from '@opentelemetry/api';
import { withSpan } from '@superlog/otel-helpers';
import { answerKey } from '@/data/questions.server';
import { computeDomainScores, PASS_SCORE, SCORE_MAX, type ScoredItem } from '@/lib/domains';

const tracer = trace.getTracer('ccaf.exam');
const meter = metrics.getMeter('ccaf.exam');
const gradeCounter = meter.createCounter('exam.grade.count');

const MAX_TIME_SEC = 24 * 60 * 60; // a single sitting cannot exceed a day
const MAX_ANSWERS = 200;

type IncomingAnswer = { id: string; letter: string | null };

// Drop control characters, trim, cap length, drop empties.
function cleanStr(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  let out = '';
  for (const ch of v) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 32 && code !== 127) out += ch;
  }
  out = out.trim().slice(0, max);
  return out.length ? out : undefined;
}

// Accept only answers that map to a real question and a real option letter (or null).
function parseAnswers(raw: unknown): IncomingAnswer[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: IncomingAnswer[] = [];
  for (const a of raw.slice(0, MAX_ANSWERS)) {
    if (!a || typeof a !== 'object') continue;
    const r = a as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : '';
    const q = answerKey[id];
    if (!q || seen.has(id)) continue;
    seen.add(id);
    const letter = typeof r.letter === 'string' ? r.letter : null;
    const valid = letter !== null && q.options.some((o) => o.letter === letter) ? letter : null;
    out.push({ id, letter: valid });
  }
  return out;
}

export async function POST(request: Request) {
  return await withSpan(
    'exam.grade',
    async (span) => {
      try {
        const body = (await request.json()) as Record<string, unknown>;
        const answers = parseAnswers(body?.answers);

        if (answers.length === 0) {
          span.setAttribute('outcome', 'invalid');
          gradeCounter.add(1, { outcome: 'invalid' });
          return NextResponse.json({ error: 'No gradable answers' }, { status: 400 });
        }

        const untimed = body?.untimed === true;
        const timedOut = body?.timedOut === true;
        const timeSec =
          typeof body?.timeTaken === 'number' && Number.isFinite(body.timeTaken)
            ? Math.min(MAX_TIME_SEC, Math.max(0, Math.round(body.timeTaken)))
            : 0;

        // Grade against the server-only answer key.
        let correct = 0;
        let skipped = 0;
        const wrongPositions: number[] = [];
        const scored: ScoredItem[] = [];

        answers.forEach((a, i) => {
          const q = answerKey[a.id];
          const correctLetter = q.options.find((o) => o.correct)?.letter ?? null;
          const isCorrect = a.letter !== null && a.letter === correctLetter;
          if (a.letter === null) skipped++;
          if (isCorrect) correct++;
          else wrongPositions.push(i + 1);
          scored.push({
            group: q.group,
            chosenLetter: a.letter,
            options: q.options.map((o) => ({ letter: o.letter, correct: o.correct })),
          });
        });

        const total = answers.length;
        const incorrect = total - correct - skipped;
        const score = Math.round((correct / total) * SCORE_MAX);
        const passed = score >= PASS_SCORE;
        const domainScores = computeDomainScores(scored);

        // Review (the answer key) is earned only by completing every question in time.
        let reviewEnabled = true;
        let reviewLockReason = '';
        if (skipped > 0) {
          reviewEnabled = false;
          reviewLockReason = `You left ${skipped} question${
            skipped === 1 ? '' : 's'
          } unanswered. Finish all questions to unlock explanations.`;
        } else if (!untimed && timedOut) {
          reviewEnabled = false;
          reviewLockReason = 'The timer ran out before you could submit.';
        }

        // Only ship the key when review is earned; otherwise withhold it entirely.
        const items = reviewEnabled
          ? answers.map((a) => {
              const q = answerKey[a.id];
              return {
                id: q.id,
                group: q.group,
                text: q.text,
                chosenLetter: a.letter,
                options: q.options.map((o) => ({
                  letter: o.letter,
                  text: o.text,
                  correct: o.correct,
                  explain: o.explain,
                })),
              };
            })
          : [];

        // Record timed sittings on the leaderboard with the SERVER-computed score, so a
        // client can no longer post an arbitrary score through the app path.
        let saved = false;
        if (!untimed) {
          const payload = {
            p_score: score,
            p_time_taken: timeSec,
            p_wrong_answers: wrongPositions.slice(0, MAX_ANSWERS),
            p_nickname: cleanStr(body?.nickname, 40),
            p_email: cleanStr(body?.email, 254),
            p_pin_hash: cleanStr(body?.pinHash, 128),
          };
          // Write with the service-role client so the leaderboard insert keeps working
          // after anon EXECUTE on submit_exam_result is revoked (see supabase/migrations).
          // Falls back to the anon client only when the service key is not yet configured.
          const writer = supabaseAdmin ?? supabase;
          const { error } = await writer.rpc('submit_exam_result', payload);
          if (error) {
            span.recordException(error);
            span.setAttribute('leaderboard.saved', false);
          } else {
            saved = true;
          }
        }

        span.setAttribute('exam.score', score);
        span.setAttribute('exam.total', total);
        span.setAttribute('outcome', 'success');
        gradeCounter.add(1, { outcome: 'success' });

        return NextResponse.json({
          score,
          correct,
          incorrect,
          skipped,
          total,
          passed,
          timeSec,
          reviewEnabled,
          reviewLockReason,
          domainScores,
          items,
          untimed,
          saved,
        });
      } catch (err) {
        span.recordException(err as Error);
        span.setAttribute('outcome', 'fault');
        gradeCounter.add(1, { outcome: 'fault' });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    },
    { tracer }
  );
}
