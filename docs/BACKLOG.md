# Project Backlog

## Phase 1: Typing & Schema Integrity
- [x] High | DONE | Regenerate `src/core/database.types.ts` from Supabase to include `bug_reports` table.
- [x] High | DONE | Safely remove `@ts-expect-error` and `any` cast in `src/components/BugReporter.tsx`.
- [x] Medium | DONE | Replace `Record<string, any>` types in `src/app/dashboard/page.tsx`, `src/app/leaderboard/page.tsx`, and `src/lib/offlineQueue.ts` with strict Supabase interface types.

## Phase 2: Security & Architecture
- [x] Critical | DONE | Install `isomorphic-dompurify` and sanitize all instances of `dangerouslySetInnerHTML` in `src/app/exam/page.tsx` and `src/app/result/page.tsx`.
- [x] Medium | DONE | Implement generic `error.tsx` layout boundaries for the `/dashboard`, `/leaderboard`, and `/exam` routes.

## Phase 3: Cleanup & Refinement
- [x] Low | DONE | Update `.gitignore` to explicitly block `test-results/` and `playwright-report/` artifacts.
- [x] Low | DONE | Remove unused `eslint-disable` directive in `src/components/BugReporter.tsx`.
