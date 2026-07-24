import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { trace, metrics } from '@opentelemetry/api';
import { withSpan } from '@superlog/otel-helpers';
import { answerKey } from '@/data/questions.server';
import { isCanary } from '@/data/canary.server';
import { computeDomainScores, PASS_SCORE, SCORE_MAX, type ScoredItem } from '@/lib/domains';
import { enforcementOn, resolveAccess } from '@/lib/entitlements';
import { onActivation } from '@/lib/referrals';
import { clientIpFromHeaders } from '@/lib/rateLimit';
import { upsertMissCard } from '@/lib/review';

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

        // Grade against the server-only answer key. Canaries (SEC-001) never count.
        let correct = 0;
        let skipped = 0;
        const wrongPositions: number[] = [];
        const scored: ScoredItem[] = [];

        const gradable = answers.filter((a) => !isCanary(a.id) && answerKey[a.id]);

        gradable.forEach((a, i) => {
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

        const total = Math.max(1, gradable.length);
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

        // PAY-001: per-option explanations are premium when ENTITLEMENTS_ENFORCED=on.
        // Free tier still receives correctness + answer key when review is earned.
        let includeExplanations = !enforcementOn();
        if (enforcementOn() && supabaseAdmin) {
          const e = cleanStr(body?.email, 254)?.toLowerCase();
          const p = cleanStr(body?.pinHash, 128);
          let userId: string | null = null;
          if (e && p) {
            const { data: user } = await (supabaseAdmin as unknown as SupabaseClient)
              .from('users')
              .select('id')
              .eq('email', e)
              .eq('pin_hash', p)
              .maybeSingle();
            userId = (user?.id as string | undefined) ?? null;
          }
          const access = await resolveAccess(userId, 'ccaf');
          includeExplanations = access.tier === 'premium';
        }

        // Only ship the key when review is earned; otherwise withhold it entirely.
        const items = reviewEnabled
          ? gradable.map((a) => {
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
                  ...(includeExplanations ? { explain: o.explain } : {}),
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

        const graded = {
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
        };

        // Persist the full breakdown for identified users so they can reopen it on any device.
        // Best-effort: a failure here never blocks grading. Keyed by (email, session_id); the stored
        // object holds only this user's own graded result, never the whole answer key.
        const rEmail = cleanStr(body?.email, 254)?.toLowerCase();
        const rPin = cleanStr(body?.pinHash, 128);
        const rSession = cleanStr(body?.sessionId, 64);
        if (supabaseAdmin && rEmail && rPin && rSession) {
          try {
            const db = supabaseAdmin as unknown as SupabaseClient;
            const { error: rErr } = await db.from('exam_results').upsert(
              {
                email: rEmail,
                session_id: rSession,
                pin_hash: rPin,
                score,
                passed,
                time_sec: timeSec,
                untimed,
                breakdown: graded,
                completed_at: new Date().toISOString(),
              },
              { onConflict: 'email,session_id' }
            );
            if (rErr) span.setAttribute('result.saved', false);
            else {
              // GROWTH-003: first graded mock may qualify a referral (best-effort).
              try {
                const { data: user } = await db
                  .from('users')
                  .select('id')
                  .eq('email', rEmail)
                  .eq('pin_hash', rPin)
                  .maybeSingle();
                if (user?.id) {
                  await onActivation(user.id as string, {
                    velocityKey: clientIpFromHeaders(request.headers),
                  });
                  // LEARN-003: accrue review cards for misses (free users too).
                  try {
                    for (const a of answers) {
                      if (isCanary(a.id)) continue;
                      const q = answerKey[a.id];
                      const correctLetter = q?.options.find((o) => o.correct)?.letter ?? null;
                      const ok = a.letter !== null && a.letter === correctLetter;
                      if (!ok) {
                        await upsertMissCard({
                          userId: user.id as string,
                          itemId: a.id,
                          examCode: 'ccaf',
                        });
                      }
                    }
                  } catch {
                    /* never block grade */
                  }
                }
              } catch {
                /* never block grade */
              }
            }
          } catch (e) {
            span.recordException(e as Error);
          }
        }

        span.setAttribute('exam.score', score);
        span.setAttribute('exam.total', total);
        span.setAttribute('outcome', 'success');
        gradeCounter.add(1, { outcome: 'success' });

        // Optional DB-backed sitting/response capture (DATA-001). Default off until DATA-002.
        // shadow|on: best-effort writes; never changes the HTTP response contract.
        const dbGradePath = (process.env.DB_GRADE_PATH || 'off').toLowerCase();
        if (
          supabaseAdmin &&
          (dbGradePath === 'shadow' || dbGradePath === 'on') &&
          answers.length > 0
        ) {
          try {
            const db = supabaseAdmin as unknown as SupabaseClient;
            const { data: examRow } = await db
              .from('exams')
              .select('id')
              .eq('code', 'ccaf')
              .maybeSingle();
            if (examRow?.id) {
              const extKeys = answers.map((a) => a.id);
              const { data: dbItems } = await db
                .from('items')
                .select('id, external_key, version, correct_key')
                .eq('exam_id', examRow.id)
                .in('external_key', extKeys);
              const byExt = new Map((dbItems ?? []).map((i) => [i.external_key, i]));
              const question_set = answers
                .map((a) => {
                  const it = byExt.get(a.id);
                  return it ? { item_id: it.id, item_version: it.version } : null;
                })
                .filter(Boolean);
              if (question_set.length === answers.length) {
                const { data: sitting } = await db
                  .from('sittings')
                  .insert({
                    exam_id: examRow.id,
                    mode: untimed ? 'practice' : 'exam',
                    question_set,
                    submitted_at: new Date().toISOString(),
                    score_pct: Math.round((correct / total) * 10000) / 100,
                    passed,
                    breakdown: { source: 'grade_route', dbGradePath },
                  })
                  .select('id')
                  .single();
                if (sitting?.id) {
                  const rows = answers.map((a) => {
                    const it = byExt.get(a.id)!;
                    return {
                      sitting_id: sitting.id,
                      item_id: it.id,
                      item_version: it.version,
                      selected_key: a.letter,
                      is_correct: a.letter !== null && a.letter === it.correct_key,
                      elapsed_ms: null,
                    };
                  });
                  await db.from('item_responses').insert(rows);
                  span.setAttribute('db_grade.written', true);
                }
              }
            }
          } catch (e) {
            span.recordException(e as Error);
            span.setAttribute('db_grade.written', false);
          }
        }

        return NextResponse.json({ ...graded, saved });
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
