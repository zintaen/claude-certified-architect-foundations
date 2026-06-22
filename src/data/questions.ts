// Client entry point. Re-exports the public (answer-free) question set so the
// answer key never ships to the browser. The full key lives in questions.server.ts
// and is used only by server route handlers (grading and flashcard reveal).
export type { PublicQuestion, PublicOption } from './questions.public';
export { questions } from './questions.public';
