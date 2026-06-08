import { useExamStore, ExamItem } from '@/store/examStore';
import { supabase } from '../lib/supabase';
import { useCallback } from 'react';
import { syncQueue } from '../lib/offlineQueue';

// We can mock this if it's missing, or build a real queue later
export function useExamEngine() {
  const store = useExamStore();

  const buildSession = useCallback(
    (qs: ExamItem[], count: number, untimed: boolean) => {
      // Basic shuffle
      const shuffledQs = [...qs].sort(() => Math.random() - 0.5);
      const pool = shuffledQs.slice(0, Math.max(1, count));

      const items: ExamItem[] = pool.map((q) => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5),
        chosenLetter: null,
        flagged: false,
      }));

      const durationSec = untimed ? 0 : Math.max(60, count * 120); // 2 mins per question
      const startedAt = Date.now();
      const endsAt = durationSec ? startedAt + durationSec * 1000 : 0;

      store.startExam({
        items,
        untimed,
        isFlashcardMode: false,
        sessionId: Math.random().toString(36).substring(2, 9),
        startedAt,
        durationSec,
        endsAt,
      });
    },
    [store]
  );

  const finishExam = useCallback(
    async (force: boolean) => {
      if (store.finished) return;

      const unanswered = store.items.filter((x) => !x.chosenLetter).length;
      if (!force && unanswered > 0) {
        alert(`You must answer all ${store.items.length} questions before submitting.`);
        return;
      }

      if (!force && !window.confirm(`Submit now? You'll see your score and review.`)) return;

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

      // submit to supabase
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

        try {
          const { error } = await supabase.rpc('submit_exam_result', payload);
          if (error) {
            console.error(error);
            syncQueue.add(payload);
          }
        } catch (err: unknown) {
          console.warn('Could not save to supabase (maybe local/offline). Queuing offline.', err);
          syncQueue.add(payload);
        }
      }
    },
    [store]
  );

  return { buildSession, finishExam };
}
