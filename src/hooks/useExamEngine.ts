import { useExamStore, type Question, type GradedResult } from '@/store/examStore';
import type { PublicQuestion } from '@/data/questions';
import type { GroupId } from '@/lib/domains';
import { track } from '@/lib/track';
import { clearServerSession } from '@/lib/serverSession';

import { useCallback } from 'react';

interface BuildOptions {
  group?: GroupId; // restrict the pool to a single domain (targeted drill)
  flashcard?: boolean; // flashcard review: always untimed, never submitted to the leaderboard
}

export function useExamEngine() {
  // buildSession and finishExam read and write the store via getState(), so both keep a stable
  // identity across renders. That matters for the exam page: its timer and anti-cheat effects
  // depend on these functions, and an unstable identity re-created the timer interval on every
  // render and could fire a second grade/leaderboard write at expiry.
  const buildSession = useCallback(
    (qs: PublicQuestion[], count: number, untimed: boolean, opts?: BuildOptions) => {
      const flashcard = !!opts?.flashcard;
      const relaxed = untimed || flashcard; // no timer for practice or flashcards

      // Optionally narrow to a single domain, then shuffle the questions and take `count`.
      const source = opts?.group ? qs.filter((q) => q.group === opts.group) : qs;
      const shuffledQs = [...source].sort(() => Math.random() - 0.5);
      const pool = shuffledQs.slice(0, Math.max(1, count));

      // Keep each question's options in their authored order. The letter is glued to its text, so
      // preserving order keeps the letter shown in the exam identical to the one shown in review
      // and on flashcards (shuffling positions without re-lettering added nothing and re-lettering
      // by position made the exam and the review disagree).
      const items: Question[] = pool.map((q) => ({
        id: q.id,
        group: q.group,
        text: q.text,
        options: [...q.options],
        chosenLetter: null,
        flagged: false,
      }));

      const durationSec = relaxed ? 0 : Math.max(60, pool.length * 120); // 2 mins per question
      const startedAt = Date.now();
      const endsAt = durationSec ? startedAt + durationSec * 1000 : 0;

      useExamStore.getState().startExam({
        items,
        untimed: relaxed,
        isFlashcardMode: flashcard,
        sessionId: Math.random().toString(36).substring(2, 9),
        startedAt,
        durationSec,
        endsAt,
      });

      track('session_started', {
        mode: flashcard ? 'flashcards' : opts?.group ? 'drill' : untimed ? 'practice' : 'timed',
        count: pool.length,
      });
    },
    []
  );

  const finishExam = useCallback(async (force: boolean, timedOut = false): Promise<boolean> => {
    // Returns true when the exam is graded (so the caller may navigate to /result), false when
    // the user bailed or grading failed. Grading happens on the server: the answer key never
    // reaches the browser, and the leaderboard score is computed server-side, so a client cannot
    // post an arbitrary score. `timedOut` is passed in rather than read from the store, so the
    // timer path reliably flags a run the clock ended (which locks review).
    const s = useExamStore.getState();
    if (s.finished) return true;

    const unanswered = s.items.filter((x) => !x.chosenLetter).length;
    if (!force && unanswered > 0) {
      alert(`You must answer all ${s.items.length} questions before submitting.`);
      return false;
    }

    if (!force && !window.confirm(`Submit now? You'll see your score and review.`)) return false;

    const timeTaken = Math.max(0, Math.floor((Date.now() - s.startedAt) / 1000));
    const answers = s.items.map((it) => ({ id: it.id, letter: it.chosenLetter }));

    try {
      const res = await fetch('/api/exam/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          untimed: s.untimed,
          timedOut,
          timeTaken,
          sessionId: s.sessionId,
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

      const store = useExamStore.getState();
      store.setResult(data);
      track('exam_graded', {
        score: data.score,
        passed: data.passed,
        mode: s.untimed ? 'practice' : 'timed',
      });
      store.endExam({
        timedOut,
        focusLoss: store.focusLoss,
        reviewEnabled: data.reviewEnabled,
        reviewLockReason: data.reviewLockReason,
      });
      // Keep this sitting's breakdown on the device so it stays viewable from the dashboard.
      store.archiveCurrentResult();
      // The sitting is done: drop any cross-device checkpoint so it never offers a stale resume.
      void clearServerSession();
      return true;
    } catch (err) {
      console.warn('Grading request failed.', err);
      alert('Could not grade your exam. Check your connection and try again.');
      return false;
    }
  }, []);

  return { buildSession, finishExam };
}
