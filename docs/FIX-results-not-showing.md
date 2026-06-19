# Fix: users could not see their points or result after finishing

Date: 2026-06-19. Status: applied to the working tree, type-checks (`tsc --noEmit`, exit 0), NOT yet
built or deployed. Validate with a Vercel preview before promoting to production.

## What was wrong

1. Production served a stale build. `vercel.json` still had Vite-era settings (`outputDirectory:
"dist"`, a catch-all rewrite to `/index.html`, Vite asset headers), so Vercel served the old,
   tracked `dist/` Vite SPA instead of this Next.js app. The Next `/api/exam/submit` route never ran
   in production, which also left the leaderboard and global stats empty.
2. The Submit button navigated to `/result` even when `finishExam` bailed (unanswered questions or a
   declined confirm), landing on a page that then redirected home because `finished` was false.
3. A cold load of `/result` (refresh, shared link, restored tab) could redirect home before the
   zustand persisted store finished rehydrating.

## What changed

- `vercel.json`: security headers only; Vercel auto-detects Next.js (SSR + API routes).
- `src/hooks/useExamEngine.ts`: `finishExam` returns a boolean and submits in the background instead
  of blocking navigation on the network.
- `src/app/exam/page.tsx`: navigate to `/result` only when `finishExam` returns true.
- `src/app/result/page.tsx`: wait for persist hydration before deciding to redirect.

## Still required (cannot be done without the database or a build)

- Version the Supabase scoring RPCs into `supabase/migrations`: `submit_exam_result`,
  `get_global_stats`, `get_user_history`. Confirm `submit_exam_result` parameters match the client
  payload: `p_email`, `p_pin_hash`, `p_score`, `p_wrong_answers`, `p_time_taken`, `p_nickname`.
- Remove the stale tracked build: `git rm -r dist` and add `/dist` to `.gitignore`.
- Build, preview-deploy, validate the submit and refresh flows, then promote. See the runbook in the
  CyberOS repo at `docs/verification/downstream-awh-projects.md`.
