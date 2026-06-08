# Project Backlog

## Phase 1: Typing & Schema Integrity
- [ ] High | IN-PROGRESS | Regenerate `src/core/database.types.ts` from Supabase to include `bug_reports` table.
- [ ] High | TODO | Safely remove `@ts-expect-error` and `any` cast in `src/components/BugReporter.tsx`.
- [ ] Medium | TODO | Replace `Record<string, any>` types in `src/app/dashboard/page.tsx`, `src/app/leaderboard/page.tsx`, and `src/lib/offlineQueue.ts` with strict Supabase interface types.

## Phase 2: Security & Architecture
- [ ] Critical | TODO | Install `isomorphic-dompurify` and sanitize all instances of `dangerouslySetInnerHTML` in `src/app/exam/page.tsx` and `src/app/result/page.tsx`.
- [ ] Medium | TODO | Implement generic `error.tsx` layout boundaries for the `/dashboard`, `/leaderboard`, and `/exam` routes.

## Phase 3: Cleanup & Refinement
- [ ] Low | TODO | Update `.gitignore` to explicitly block `test-results/` and `playwright-report/` artifacts.
- [ ] Low | TODO | Remove unused `eslint-disable` directive in `src/components/BugReporter.tsx`.
