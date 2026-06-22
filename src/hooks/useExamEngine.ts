import { useExamStore, Question } from '@/store/examStore';
import type { GroupId } from '@/lib/domains';

import { useCallback } from 'react';
import { syncQueue } from '../lib/offlineQueue';

interface BuildOptions {
  group?: GroupId; // restrict the pool to a single domain (targeted drill)
  flashcard?: boolean; // flashcard review: always untimed, never submitted to the leaderboard
}

// We can mock this if it's missing, or build a real queue later
export function useExamEngine() {
  const store = useExamStore();

  const buildSession = useCallback(
    (qs: Question[], count: number, untimed: boolean, opts?: BuildOptions) => {
      const flashcard = !!opts?.flashcard;
      const relaxed = untimed || flashcard; // no timer for practice or flashcards

      // Optionally narrow to a single domain, then shuffle and take `count`.
      const source = opts?.group ? qs.filter((q) => q.group === opts.group) : qs;
      const shuffledQs = [...source].sort(() => Math.random() - 0.5);
      const pool = shuffledQs.slice(0, Math.max(1, count));

      const items: Question[] = pool.map((q) => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5),
        chosenLetter: null,
        flagged: false,
      }));

      const durationSec = relaxed ? 0 : Math.max(60, pool.length * 120); // 2 mins per question
      const startedAt = Date.now();
      const endsAt = durationSec ? startedAt + durationSec * 1000 : 0;

      store.startExam({
        items,
        untimed: relaxed,
        isFlashcardMode: flashcard,
        sessionId: Math.random().toString(36).substring(2, 9),
        startedAt,
        durationSec,
        endsAt,
      });
    },
    [store]
  );

  const finishExam = useCallback(
    async (force: boolean): Promise<boolean> => {
      // Returns true when the exam is actually finished (so the caller may navigate to /result),
      // false when the user bailed (unanswered questions, or declined the confirm). The submit
      // button previously navigated regardless, landing on /result with finished=false, which the
      // result page then redirected home - so the user "could not see their results".
      if (store.finished) return true;

      const unanswered = store.items.filter((x) => !x.chosenLetter).length;
      if (!force && unanswered > 0) {
        alert(`You must answer all ${store.items.length} questions before submitting.`);
        return false;
      }

      if (!force && !window.confirm(`Submit now? You'll see your score and review.`)) return false;

      let correct = 0;
      store.items.forEach((it) => {
        const chosen = it.options.find((o) => o.letter === it.chosenLetter);
        if (chosen?.correct) correct++;
      });

      const score1000 = Math.round((correct / store.items.length) * 1000);
      const usedSec = Math.max(0, Math.floor((Date.now() - store.startedAt) / 1000));

      let reviewLockReason = '';
      let reviewEnabled = true;

      if (unanswered > 0) {
        reviewEnabled = false;
        reviewLockReason = `You left ${unanswered} questions unanswered. Finish all questions to unlock explanations.`;
      } else if (!store.untimed && store.timedOut) {
        reviewEnabled = false;
        reviewLockReason = 'The timer ran out before you could submit.';
      }

      store.endExam({
        timedOut: store.timedOut,
        focusLoss: store.focusLoss,
        reviewEnabled,
        reviewLockReason,
      });

      // Persist to Supabase in the BACKGROUND. Navigation to /result must not wait on the
      // network: the score is computed and stored locally above, and a failed save is retried via
      // the offline queue. Awaiting the round-trip here previously coupled showing the user their
      // result to the (un-versioned) scoring RPC succeeding.
      if (!store.untimed) {
        const wrongIdxs: number[] = [];
        store.items.forEach((it, idx) => {
          const chosen = it.options.find((o) => o.letter === it.chosenLetter);
          if (!chosen || !chosen.correct) {
            wrongIdxs.push(idx + 1);
          }
        });

        const payload = {
          p_email: localStorage.getItem('ccaf-email') || undefined,
          p_pin_hash: localStorage.getItem('ccaf-pinHash') || undefined,
          p_score: score1000,
          p_wrong_answers: wrongIdxs,
          p_time_taken: usedSec,
          p_nickname: localStorage.getItem('ccaf-nickname') || undefined,
        };

        void (async () => {
          try {
            const res = await fetch('/api/exam/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
              console.error(data.error);
              syncQueue.add(payload);
            }
          } catch (err: unknown) {
            console.warn('Could not save to API (maybe local/offline). Queuing offline.', err);
            syncQueue.add(payload);
          }
        })();
      }

      return true;
    },
    [store]
  );

  return { buildSession, finishExam };
}
