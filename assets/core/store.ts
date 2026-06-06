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

export interface State {
  items: Question[];
  idx: number;
  startedAt: number;
  endsAt: number;
  durationSec: number;
  timerHandle: number | null;
  untimed: boolean;
  sessionId: string;
  reviewEnabled: boolean;
  reviewLockReason: string;
  finished: boolean;
  timedOut: boolean;
  focusLoss: number;
}

const initialState: State = {
  items: [],
  idx: 0,
  startedAt: 0,
  endsAt: 0,
  durationSec: 0,
  timerHandle: null,
  untimed: false,
  sessionId: '',
  reviewEnabled: false,
  reviewLockReason: '',
  finished: false,
  timedOut: false,
  focusLoss: 0,
};

export type Action =
  | { type: 'START_EXAM'; payload: { items: Question[]; untimed: boolean; sessionId: string; startedAt: number; durationSec: number; endsAt: number; timerHandle: number | null } }
  | { type: 'END_EXAM'; payload: { timedOut: boolean; timerHandle?: number | null; focusLoss: number; reviewEnabled: boolean; reviewLockReason: string } }
  | { type: 'RESUME_EXAM'; payload: Partial<State> }
  | { type: 'ANSWER_QUESTION'; payload: { idx: number; letter: string } }
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

  constructor(initial: State) {
    this.state = { ...initial };
    this.listeners = new Set();
  }

  getState(): State {
    return this.state;
  }

  dispatch(action: Action) {
    this.state = reducer(this.state, action);
    this.notify();
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
