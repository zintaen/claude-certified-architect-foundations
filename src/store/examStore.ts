import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Option {
  letter: string;
  text: string;
  correct: boolean;
  explain: string;
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
};

export const useExamStore = create<ExamState & ExamActions>()(
  persist(
    (set, get) => ({
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
        })),
      endExam: (payload) =>
        set((state) => ({
          ...state,
          finished: true,
          timedOut: payload.timedOut,
          focusLoss: payload.focusLoss,
          reviewEnabled: payload.reviewEnabled,
          reviewLockReason: payload.reviewLockReason,
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
    }),
    {
      name: 'ccaf-exam-storage',
      partialize: (state) => ({
        // We only persist the leitner box state and the ongoing exam session if needed
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
      }),
    }
  )
);
