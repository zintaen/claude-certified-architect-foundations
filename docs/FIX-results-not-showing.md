# Fix: CCAF V2 - results, live 404, and Supabase data not showing

Date: 2026-06-19. All changes are on the working tree and type-check (`tsc --noEmit`, exit 0). No
database change is required - the Supabase RPCs are correct and already hold the data. Build,
preview-deploy, validate, then promote.

## Three problems, all in the V2 Next.js rewrite

### 1. Live site 404 after deploy (Vercel served the wrong output)

The Vercel project was still set up for the old Vite app (Framework "Other/Vite", Output Directory
`dist`). After `dist` was removed and `outputDirectory` dropped from `vercel.json`, Vercel built
`.next` but kept serving an empty `dist`, so every route 404'd. Fix: `vercel.json` now sets
`"framework": "nextjs"`, forcing Vercel's Next.js builder. If a 404 persists, also set Framework
Preset to Next.js and clear the Output Directory override in Project Settings, then redeploy.

### 2. Results page sent users home after finishing

`finishExam` now returns a boolean and submits in the background; the exam page navigates to
`/result` only when it returns true; the result page waits for zustand persist hydration before
deciding to redirect. Files: `src/hooks/useExamEngine.ts`, `src/app/exam/page.tsx`,
`src/app/result/page.tsx`.

### 3. V2 was not connected to existing Supabase data (the main regression)

Same Supabase project and anon key as V1, so the connection was fine. The rewrite read the RPC
results with the wrong field names. The database functions return snake_case; the V2 pages read
camelCase, so every field resolved to undefined and the leaderboard, global stats, and dashboard
rendered empty.

Authoritative RPC shapes (recovered from the working V1 build):

- `get_global_stats` returns `{ total_exams, avg_score, pass_rate, hardest_questions[], leaderboard[] }`;
  leaderboard rows are `{ nickname, score, time_taken, taken_at }`.
- `get_user_history` returns `{ success, results[] }`; rows are `{ nickname, score, time_taken, taken_at }`.
- `submit_exam_result` takes `p_email, p_nickname, p_pin_hash, p_score, p_time_taken, p_wrong_answers`
  - the V2 write path already matched this, so scoring submission was never the problem.

Fix: `src/lib/api.ts` is now the single adapter that maps the real snake_case RPC JSON into the
camelCase shapes the pages expect (`topScores`/`completed_at` from `leaderboard`/`taken_at`,
`totalAttempts` from `total_exams`, `averageScore` from `avg_score`, `passRate` from `pass_rate`,
and `attempts` from `results`). Aggregates the dashboard shows (highest score, pass rate, average
time) are computed from the rows. No page UI was changed and no database change is needed.

## Validate and ship

```
cd ~/Projects/Personal/claude-certified-architect-mock-exam
npm ci
npm run build                       # next build, also type-checks
npx vercel deploy                   # PREVIEW first
# on the preview: open /leaderboard and /dashboard - confirm real data appears (not zeros/empty);
# take a short timed exam, submit, confirm the score shows and the leaderboard updates
git add -A && git commit -m "fix(ccaf): connect V2 to Supabase RPCs (snake_case adapter); serve Next on Vercel; results flow" --no-verify
git push
npx vercel deploy --prod            # promote, then verify the RAW production URL, not just the alias
```

The `--no-verify` is because the husky pre-commit hook calls a missing `precommit` script; fix or
remove that hook separately. Optional hygiene (not required for the fix): version the RPCs
`get_global_stats`, `get_user_history`, `submit_exam_result`, `verify_mock_user` into
`supabase/migrations` so the authoritative scoring is no longer un-versioned.
