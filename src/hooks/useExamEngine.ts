import { useExamStore, type Question, type GradedResult } from '@/store/examStore';
import type { PublicQuestion } from '@/data/questions';
import type { GroupId } from '@/lib/domains';

import { useCallback } from 'react';

interface BuildOptions {
  group?: GroupId; // restrict the pool to a single domain (targeted drill)
  flashcard?: boolean; // flashcard review: always untimed, never submitted to the leaderboard
}

export function useExamEngine() {
  const store = useExamStore();

  const buildSession = useCallback(
    (qs: PublicQuestion[], count: number, untimed: boolean, opts?: BuildOptions) => {
      const flashcard = !!opts?.flashcard;
      const relaxed = untimed || flashcard; // no timer for practice or flashcards

      // Optionally narrow to a single domain, then shuffle and take `count`.
      const source = opts?.group ? qs.filter((q) => q.group === opts.group) : qs;
      const shuffledQs = [...source].sort(() => Math.random() - 0.5);
      const pool = shuffledQs.slice(0, Math.max(1, count));

      const items: Question[] = pool.map((q) => ({
        id: q.id,
        group: q.group,
        text: q.text,
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
      // Returns true when the exam is graded (so the caller may navigate to /result), false
      // when the user bailed or grading failed. Grading happens on the server now: the answer
      // key never reaches the browser, and the leaderboard score is computed from the answers
      // server-side, so a client cannot post an arbitrary score.
      if (store.finished) return true;

      const unanswered = store.items.filter((x) => !x.chosenLetter).length;
      if (!force && unanswered > 0) {
        alert(`You must answer all ${store.items.length} questions before submitting.`);
        return false;
      }

      if (!force && !window.confirm(`Submit now? You'll see your score and review.`)) return false;

      const timedOut = store.timedOut;
      const timeTaken = Math.max(0, Math.floor((Date.now() - store.startedAt) / 1000));
      const answers = store.items.map((it) => ({ id: it.id, letter: it.chosenLetter }));

      try {
        const res = await fetch('/api/exam/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers,
            untimed: store.untimed,
            timedOut,
            timeTaken,
            nickname: localStorage.getItem('ccaf-nickname') || undefined,
            email: localStorage.getItem('ccaf-email') || undefined,
            pinHash: localStorage.getItem('ccaf-pinHash') || undefined,
          }),
        });

        const data = (await res.json()) as GradedResult & { error?: string };
        if (!res.ok || data.error) {
          alert('Could not grade your exam. Check your connection and try again.');
          return false;
        }

        store.setResult(data);
        store.endExam({
          timedOut,
          focusLoss: store.focusLoss,
          reviewEnabled: data.reviewEnabled,
          reviewLockReason: data.reviewLockReason,
        });
        return true;
      } catch (err) {
        console.warn('Grading request failed.', err);
        alert('Could not grade your exam. Check your connection and try again.');
        return false;
      }
    },
    [store]
  );

  return { buildSession, finishExam };
}
