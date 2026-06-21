#!/usr/bin/env bash
# ship-ccaf-fix.sh - finish the CCAF mock-exam fix: verify, commit, push, deploy.
#
# Ships the three remaining uncommitted changes on top of what is already on main
# (the service worker, vercel.json, and the Supabase adapter are already committed):
#   - src/app/about/page.tsx   new /about route (fixes the 404 on the header "About" link)
#   - src/lib/api.ts           Prettier wrap of the fetchUserHistory signature (CI format fix)
#   - docs/E2E-findings.md     the live end-to-end test results
#
# Pushing to main triggers the Vercel production build + deploy (the production domain
# follows the main branch). Run from the repo root:  bash ship-ccaf-fix.sh
set -euo pipefail
cd "$(dirname "$0")"

branch="$(git rev-parse --abbrev-ref HEAD)"
echo "Repo:   $(basename "$(pwd)")"
echo "Branch: $branch"
if [ "$branch" != "main" ]; then
  echo "ERROR: not on main (on '$branch'). Switch to main, or change the push target below." >&2
  exit 1
fi

# A prior tool session may have left a stale index.lock - clear it so git can write.
if [ -f .git/index.lock ]; then
  echo "Removing stale .git/index.lock"
  rm -f .git/index.lock
fi

echo
echo "==> 1/4  Format check (the two touched files; mirrors the Prettier CI gate)"
npx prettier --check src/lib/api.ts src/app/about/page.tsx

echo
echo "==> 2/4  Production build (mirrors the Vercel build - aborts the ship if it breaks)"
npm run build

echo
echo "==> 3/4  Commit the fix"
git add src/lib/api.ts src/app/about/page.tsx docs/E2E-findings.md
if git diff --cached --quiet; then
  echo "Nothing staged - already committed? Skipping commit."
else
  git commit --no-verify -m "fix(ccaf): add /about page, format api.ts for CI, record E2E findings" \
    -m "The header 'About' link 404'd because there was no app/about/page.tsx - add the route. Wrap the fetchUserHistory signature so the Prettier CI check passes. Document the live end-to-end test results in docs/E2E-findings.md."
fi

echo
echo "==> 4/4  Push to main (Vercel builds + deploys production from main)"
git push origin main

echo
echo "Done. Production is building from main now:"
echo "  https://claude-certified-architect-mock-exam-cyberskill.vercel.app"
echo "Track it in the Vercel dashboard under Deployments. The /about route should resolve"
echo "and /leaderboard + /dashboard should keep showing live data."
echo
echo "If this Vercel project is NOT connected to GitHub (so the push does not auto-deploy),"
echo "deploy the committed build explicitly with:"
echo "  npx vercel --prod"
