# CCAF live end-to-end test findings (2026-06-20)

Tested live at https://claude-certified-architect-mock-exam-cyberskill.vercel.app with the account
zintaen@gmail.com. Driven through a real browser.

## Working

- Homepage loads (V2 marketing).
- Exam setup / save-progress modal: email (pre-filled), nickname, PIN; saves to localStorage on
  Begin Exam.
- Exam engine: 60 questions load, question palette, 120-minute countdown timer, four options per
  question, answer selection persists, flag, Previous/Next.
- Results page: renders the score on a cold load AND survives a refresh (the headline regression is
  fixed - it no longer bounces to the home page). Verified 17/1000 with 1 correct / 59 skipped.
- Leaderboard: full live data (437 ranked players; 7,854 total exams, 513 average, 43% pass, 59m).
- Dashboard: auth and the data adapter work - it called get_user_history and correctly handled the
  response.
- Report a Bug: submits successfully ("Report Submitted!"), writes to the bug_reports table.

## Issues to fix

1. Broken About link (user-facing). The header nav links "About" to `/about`, but `/about` returns
   404 - the route does not exist in V2. Either add an `app/about/page.tsx` or point the link at a
   homepage section.
2. Missing exam modes vs V1 (confirm intent). Only the timed 60-question mock is offered. V1 had
   untimed practice, targeted practice (weakest domain), and flashcard mode. These appear to be gone
   in V2. There is also no theme toggle in the V2 UI, though `ccaf-dark-mode` is still persisted.
3. Question-text encoding artifact (minor). At least one question renders mojibake ("articleâ€",
   likely an em-dash or smart quote mangled in the question data). Re-encode the question source as
   UTF-8.
4. PIN storage (minor security / cleanup). `ccaf-pinHash` stores the raw 6-digit PIN (length 6, not
   hashed) and is sent as `p_pin_hash`; there are also two keys, `ccaf-pinHash` and `ccaf-pin-hash`.
   Consolidate and consider hashing client-side, or rename to reflect that it is the raw PIN.

## Not exercised

- The full submit -> leaderboard write was not run under the account, to avoid adding a bot score to
  the public leaderboard. It is proven working in production (the submission count is rising live and
  the RPC parameters match), but a controlled real run would confirm it end to end under the account.
- Dashboard history render: PIN 170971 was reported "Incorrect PIN" by the server for
  zintaen@gmail.com (the account exists, the PIN did not match), so the history list could not be
  rendered with real data. Re-test with the correct PIN.

## Still pending from the fixes

- Commit `src/lib/api.ts` (Prettier wrap of the fetchUserHistory signature) to clear the CI format
  check, and `public/sw.js` (self-destructing worker) to evict the stale V1 service worker for
  returning users. Deploy both to main.
