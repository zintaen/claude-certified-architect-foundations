import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DomainScore } from '@/lib/domains';

export interface Option {
  letter: string;
  text: string;
  // The answer key is graded on the server, so client-side options carry only the
  // letter and text. correct/explain are present only on server-graded result items.
  correct?: boolean;
  explain?: string;
}

export interface Question {
  id: string;
  group: string;
  text: string;
  options: Option[];
  chosenLetter: string | null;
  flagged: boolean;
}

export interface LeitnerData {
  box: number;
  nextReview: number;
}

// Server-graded result produced by /api/exam/grade. The answer key never reaches the
// browser; the result page renders entirely from this object once grading returns.
export interface GradedOption {
  letter: string;
  text: string;
  correct: boolean;
  explain: string;
}

export interface GradedItem {
  id: string;
  group: string;
  text: string;
  chosenLetter: string | null;
  options: GradedOption[];
}

export interface GradedResult {
  score: number;
  correct: number;
  incorrect: number;
  skipped: number;
  total: number;
  passed: boolean;
  timeSec: number;
  reviewEnabled: boolean;
  reviewLockReason: string;
  domainScores: DomainScore[];
  // Empty when review is locked (timed out or unanswered): the key is withheld.
  items: GradedItem[];
  untimed: boolean;
}

// A finished sitting kept on this device so its full breakdown stays viewable from the dashboard
// after the user navigates away. The single `result` slot only holds the latest sitting; this
// archive keeps the last several, keyed by sessionId.
export interface ArchivedResult {
  sessionId: string;
  completedAt: number;
  score: number;
  passed: boolean;
  timeSec: number;
  untimed: boolean;
  result: GradedResult;
}

export interface ExamState {
  items: Question[];
  idx: number;
  startedAt: number;
  endsAt: number;
  durationSec: number;
  untimed: boolean;
  isFlashcardMode: boolean;
  sessionId: string;
  reviewEnabled: boolean;
  reviewLockReason: string;
  finished: boolean;
  timedOut: boolean;
  focusLoss: number;
  leitner: Record<string, LeitnerData>;
  result: GradedResult | null;
  completedAt: number;
  resultsArchive: ArchivedResult[];
}

interface ExamActions {
  startExam: (payload: {
    items: Question[];
    untimed: boolean;
    isFlashcardMode: boolean;
    sessionId: string;
    startedAt: number;
    durationSec: number;
    endsAt: number;
  }) => void;
  endExam: (payload: {
    timedOut: boolean;
    focusLoss: number;
    reviewEnabled: boolean;
    reviewLockReason: string;
  }) => void;
  answerQuestion: (idx: number, letter: string) => void;
  processFlashcardAnswer: (idx: number, qId: string, letter: string, isCorrect: boolean) => void;
  setLeitnerData: (data: Record<string, LeitnerData>) => void;
  flagQuestion: (idx: number, flagged: boolean) => void;
  setIndex: (idx: number) => void;
  incrementFocusLoss: () => void;
  setResult: (result: GradedResult | null) => void;
  discardSession: () => void;
  archiveCurrentResult: () => void;
}

const initialState: ExamState = {
  items: [],
  idx: 0,
  startedAt: 0,
  endsAt: 0,
  durationSec: 0,
  untimed: false,
  isFlashcardMode: false,
  sessionId: '',
  reviewEnabled: false,
  reviewLockReason: '',
  finished: false,
  timedOut: false,
  focusLoss: 0,
  leitner: {},
  result: null,
  completedAt: 0,
  resultsArchive: [],
};

export const useExamStore = create<ExamState & ExamActions>()(
  persist(
    (set) => ({
      ...initialState,
      startExam: (payload) =>
        set((state) => ({
          ...state,
          ...payload,
          finished: false,
          idx: 0,
          reviewEnabled: false,
          reviewLockReason: '',
          timedOut: false,
          focusLoss: 0,
          result: null,
        })),
      endExam: (payload) =>
        set((state) => ({
          ...state,
          finished: true,
          timedOut: payload.timedOut,
          focusLoss: payload.focusLoss,
          reviewEnabled: payload.reviewEnabled,
          reviewLockReason: payload.reviewLockReason,
          completedAt: Date.now(),
        })),
      answerQuestion: (idx, letter) =>
        set((state) => {
          const newItems = [...state.items];
          newItems[idx] = { ...newItems[idx], chosenLetter: letter };
          return { items: newItems };
        }),
      processFlashcardAnswer: (idx, qId, letter, isCorrect) =>
        set((state) => {
          const newItems = [...state.items];
          if (idx < 0 || idx >= newItems.length) return state;
          newItems[idx] = { ...newItems[idx], chosenLetter: letter };

          const currentLeitner = state.leitner[qId] || { box: 1, nextReview: 0 };
          let newBox = 1;
          let reviewOffsetDays = 1;

          if (isCorrect) {
            newBox = currentLeitner.box + 1;
          }

          if (newBox === 2) reviewOffsetDays = 3;
          else if (newBox >= 3) reviewOffsetDays = 7;

          const nextReview = Date.now() + reviewOffsetDays * 24 * 60 * 60 * 1000;

          return {
            items: newItems,
            leitner: {
              ...state.leitner,
              [qId]: { box: newBox, nextReview },
            },
          };
        }),
      setLeitnerData: (data) => set({ leitner: data }),
      flagQuestion: (idx, flagged) =>
        set((state) => {
          const newItems = [...state.items];
          newItems[idx] = { ...newItems[idx], flagged };
          return { items: newItems };
        }),
      setIndex: (idx) => set({ idx }),
      incrementFocusLoss: () => set((state) => ({ focusLoss: state.focusLoss + 1 })),
      setResult: (result) => set({ result }),
      // Throw away an in-progress session (used by the Resume banner's Discard action).
      discardSession: () =>
        set((state) => ({
          ...state,
          items: [],
          idx: 0,
          finished: false,
          timedOut: false,
          isFlashcardMode: false,
          result: null,
        })),
      // Keep the just-finished sitting's full breakdown on this device so it stays viewable from
      // the dashboard. Idempotent: re-archiving the same sessionId refreshes rather than duplicates.
      archiveCurrentResult: () =>
        set((state) => {
          const r = state.result;
          if (!r || !state.sessionId) return state;
          const entry: ArchivedResult = {
            sessionId: state.sessionId,
            completedAt: state.completedAt || Date.now(),
            score: r.score,
            passed: r.passed,
            timeSec: r.timeSec,
            untimed: r.untimed,
            result: r,
          };
          const rest = state.resultsArchive.filter((a) => a.sessionId !== entry.sessionId);
          return { resultsArchive: [entry, ...rest].slice(0, 15) };
        }),
    }),
    {
      name: 'ccaf-exam-storage',
      partialize: (state) => ({
        // Persist the ongoing session, the Leitner boxes, and the last graded result
        // so a refresh of /result still shows the score and review.
        items: state.items,
        idx: state.idx,
        startedAt: state.startedAt,
        endsAt: state.endsAt,
        durationSec: state.durationSec,
        untimed: state.untimed,
        isFlashcardMode: state.isFlashcardMode,
        sessionId: state.sessionId,
        finished: state.finished,
        leitner: state.leitner,
        result: state.result,
        completedAt: state.completedAt,
        resultsArchive: state.resultsArchive,
      }),
    }
  )
);
