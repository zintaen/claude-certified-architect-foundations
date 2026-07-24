/**
 * Client-safe tutor intent constants (no server-only imports).
 */
export type TutorIntent = 'explain_concept' | 'why_wrong' | 'walk_through' | 'related_concept';

export const TUTOR_INTENTS_CLIENT: readonly TutorIntent[] = [
  'explain_concept',
  'why_wrong',
  'walk_through',
  'related_concept',
] as const;

export const TUTOR_INTENT_LABELS: Record<TutorIntent, string> = {
  explain_concept: 'Explain the concept',
  why_wrong: 'Why is an option wrong?',
  walk_through: 'Walk through the item',
  related_concept: 'Related concepts',
};
