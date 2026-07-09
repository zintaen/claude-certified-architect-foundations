import { useExamStore } from '@/store/examStore';

// True when a real (non-flashcard) exam sitting has been started but not yet submitted. The session
// is persisted on the device, so this stays true across a refresh, a closed tab, or a dropped
// connection until the user resumes and submits, or discards it.
export function hasInProgressExam(): boolean {
  const s = useExamStore.getState();
  return s.items.length > 0 && !s.finished && !s.isFlashcardMode;
}

// Guard to run before starting a NEW session. If an exam is in progress, confirm the discard first.
// Returns true when it is safe to proceed (nothing in progress, or the user agreed to discard).
export function confirmDiscardIfInProgress(): boolean {
  if (typeof window === 'undefined' || !hasInProgressExam()) return true;
  return window.confirm(
    'You have an exam in progress. Starting a new one will discard it. Continue?'
  );
}
