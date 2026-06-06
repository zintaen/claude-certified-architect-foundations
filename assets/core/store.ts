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

export interface State {
  items: Question[];
  idx: number;
  startedAt: number;
  endsAt: number;
  durationSec: number;
  timerHandle: number | null;
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

const initialState: State = {
  items: [],
  idx: 0,
  startedAt: 0,
  endsAt: 0,
  durationSec: 0,
  timerHandle: null,
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

export type Action =
  | { type: 'START_EXAM'; payload: { items: Question[]; untimed: boolean; isFlashcardMode: boolean; sessionId: string; startedAt: number; durationSec: number; endsAt: number; timerHandle: number | null } }
  | { type: 'END_EXAM'; payload: { timedOut: boolean; timerHandle?: number | null; focusLoss: number; reviewEnabled: boolean; reviewLockReason: string } }
  | { type: 'RESUME_EXAM'; payload: Partial<State> }
  | { type: 'ANSWER_QUESTION'; payload: { idx: number; letter: string } }
  | { type: 'PROCESS_FLASHCARD_ANSWER'; payload: { idx: number; qId: string; letter: string; isCorrect: boolean } }
  | { type: 'SET_LEITNER_DATA'; payload: Record<string, LeitnerData> }
  | { type: 'FLAG_QUESTION'; payload: { idx: number; flagged: boolean } }
  | { type: 'SET_INDEX'; payload: number }
  | { type: 'INCREMENT_FOCUS_LOSS' }
  | { type: 'CLEAR_TIMER' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_EXAM':
      return { 
        ...state, 
        ...action.payload, 
        finished: false, 
        idx: 0,
        reviewEnabled: false,
        reviewLockReason: '',
        timedOut: false,
        focusLoss: 0
      };
    case 'END_EXAM':
      if (state.timerHandle) clearInterval(state.timerHandle);
      if (action.payload.timerHandle) clearInterval(action.payload.timerHandle);
      return { 
        ...state, 
        finished: true, 
        timedOut: action.payload.timedOut, 
        timerHandle: null,
        focusLoss: action.payload.focusLoss,
        reviewEnabled: action.payload.reviewEnabled,
        reviewLockReason: action.payload.reviewLockReason
      };
    case 'RESUME_EXAM':
      return { ...state, ...action.payload };
    case 'ANSWER_QUESTION': {
      const newItems = [...state.items];
      newItems[action.payload.idx] = { ...newItems[action.payload.idx], chosenLetter: action.payload.letter };
      return { ...state, items: newItems };
    }
    case 'PROCESS_FLASHCARD_ANSWER': {
      const { idx, qId, letter, isCorrect } = action.payload;
      const newItems = [...state.items];
      newItems[idx] = { ...(newItems[idx] || {}), chosenLetter: letter } as any;
      
      const currentLeitner = state.leitner[qId] || { box: 1, nextReview: 0 };
      
      let newBox = 1;
      let reviewOffsetDays = 1; // Default box 1 = 1 day

      if (isCorrect) {
        newBox = currentLeitner.box + 1;
      }
      
      if (newBox === 2) reviewOffsetDays = 3;
      else if (newBox >= 3) reviewOffsetDays = 7;

      const nextReview = Date.now() + reviewOffsetDays * 24 * 60 * 60 * 1000;

      return { 
        ...state, 
        items: newItems,
        leitner: {
          ...state.leitner,
          [qId]: { box: newBox, nextReview }
        }
      };
    }
    case 'SET_LEITNER_DATA':
      return { ...state, leitner: action.payload };
    case 'FLAG_QUESTION': {
      const newItems = [...state.items];
      newItems[action.payload.idx] = { ...newItems[action.payload.idx], flagged: action.payload.flagged };
      return { ...state, items: newItems };
    }
    case 'SET_INDEX':
      return { ...state, idx: action.payload };
    case 'INCREMENT_FOCUS_LOSS':
      return { ...state, focusLoss: state.focusLoss + 1 };
    case 'CLEAR_TIMER':
      if (state.timerHandle) clearInterval(state.timerHandle);
      return { ...state, timerHandle: null };
    default:
      return state;
  }
}

type Listener = (state: State) => void;

class Store {
  private state: State;
  private listeners: Set<Listener>;
  private channel: BroadcastChannel;
  private ignoreBroadcast = false;

  constructor(initial: State) {
    this.state = { ...initial };
    this.listeners = new Set();
    
    // Cross-tab concurrency setup
    const channelName = new URLSearchParams(window.location.search).get('channel') || 'ccaf-sync';
    this.channel = new BroadcastChannel(channelName);
    this.channel.onmessage = (e) => {
      // Received an action from another tab.
      // Set ignoreBroadcast so we don't echo it back.
      this.ignoreBroadcast = true;
      this.dispatch(e.data);
      this.ignoreBroadcast = false;
    };
  }

  getState(): State {
    return this.state;
  }

  dispatch(action: Action) {
    this.state = reducer(this.state, action);
    this.notify();
    if (!this.ignoreBroadcast && action.type !== 'CLEAR_TIMER') {
      this.channel.postMessage(action);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const store = new Store(initialState);
