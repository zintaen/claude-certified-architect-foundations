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

  setState(partial: Partial<State>) {
    this.state = { ...this.state, ...partial };
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
