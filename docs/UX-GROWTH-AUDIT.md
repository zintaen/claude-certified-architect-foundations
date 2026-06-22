# UI/UX and growth audit

Date: 2026-06-22. Scope: the V2 Next.js app after the CyberSkill design-system rebrand.
Every finding below was checked against the current code, not assumed. Items are ordered
by value, with a suggested sequence at the end.

## Context

CCA-F is Anthropic's first official technical certification, launched 12 March 2026: 60
scenario multiple-choice questions, 120 minutes, a scaled score of 720 on a 100-1000 range
to pass, and ProctorFree online proctoring. The exam is open to Anthropic partners and their
employees, with study material through the Anthropic Academy. Several paid and free practice
sites already exist, and the larger ones ship 360 to 614 questions across multiple exams.

That sets the bar. This mock's advantages are that it is genuinely free, needs no signup,
runs under proctored-style focus tracking, and now carries a clean CyberSkill brand. The
gaps below are what stand between it and being the practice site people recommend.

## Fix first: accuracy and broken promises

These are small but they cost trust on the first visit.

1. The setup modal promises results by email, but no email is ever sent. There is no mail
   code anywhere in the app (`src/components/...`, no Resend / SendGrid / SMTP). A user types
   their email expecting a copy of their score and gets nothing. Either wire up a mail
   provider on exam submit, or change the copy to say the email is only used to restore
   history. Right now the landing modal and the exam-setup modal both make this claim.
2. The pass mark is out of date. The About page says 700 / 1000 and "the official pass mark
   is not public". Anthropic now publishes 720 / 1000 on a 100-1000 scale. The result page
   also hardcodes a 700 pass threshold (`score1000 >= 700`). Update both to 720 so a "pass"
   here means a pass there.
3. The sitemap is wrong. `sitemap.xml` lists a single URL on `https://ccaf.cyberskill.dev/`,
   which is not the live domain the footer and About point at (`cyberskill.world`, and the
   Vercel host). A wrong-domain, one-line sitemap actively hurts search indexing. Regenerate
   it for the real domain with all routes, or drop it.
4. The "Secret PIN to protect your history" is stored in plain text in localStorage and the
   code itself flags it ("Should ideally be hashed"). For a low-stakes mock this is tolerable,
   but the word "secret" oversells it. Hash it, or soften the wording.

## Polish the interface

1. There is no mobile navigation. The header links (Practice, Leaderboard, About, Support)
   are `hidden sm:inline` with no menu behind them, so on a phone a visitor sees only the
   logo and the theme toggle and cannot reach any other page. Add a hamburger menu. This is
   the most visible gap, since a fair share of first visits are on mobile.
2. Motion is not reduced for people who ask for it. Framer Motion animates the hero, cards,
   questions, and modals, with no `prefers-reduced-motion` handling. Respecting it is a few
   lines and matters for vestibular sensitivity.
3. The bug-report button is a bright red circle fixed on every page, including the marketing
   landing. To a new visitor it reads as a half-finished dev tool. Make it quiet, or only
   show it inside the exam and result pages where feedback is actually useful.
4. Loading states are bare spinners. The leaderboard and dashboard show a spinner while
   fetching. Skeleton rows that match the final layout feel faster and look more finished.
5. Keyboard focus is thin. There are only a handful of focus styles and one aria attribute in
   the whole app. Make focus rings visible on the exam option cards and all buttons so the
   exam is usable without a mouse.
6. The exam screen carries two stacked bars: the global site header plus its own question
   topbar. A focused or full-screen exam layout would cut the chrome and suit a timed test.

## Features that attract and keep users

1. Per-domain score breakdown. This is the highest-value, lowest-effort feature. Every
   question already carries a `group` tag (research pipelines, extraction pipelines, customer
   support, code exploration), so the result page can show a small radar or bar chart of
   "you scored 80% on research, 40% on support" plus a one-line "study this next". It turns a
   single number into a study plan, and it is the thing competing sites lead with.
2. A bigger bank, or several exam sets. The engine shuffles the questions and options, but it
   always draws from the same 60 and uses all 60, so a repeat visitor sees every question
   again. Competing sites offer hundreds of questions across multiple mocks. Add more
   questions and sample a fresh subset per attempt, or ship two or three labelled exam sets.
   Without this, there is little reason to come back after one sitting.
3. The practice modes V1 had and V2 dropped: untimed practice, targeted drilling of the
   weakest domain, and flashcards. Targeted practice pairs naturally with the per-domain
   breakdown ("you scored 40% on support, drill support"). These give the daily-practice
   habit the timed mock alone cannot.
4. A shareable result and a completion certificate. Today "share" copies a plain sentence to
   the clipboard. A public, pretty result page with an Open Graph image, plus a downloadable
   "passed the CyberSkill CCA-F mock" certificate, turns each pass into word of mouth inside
   a tight partner-employee community. This is the cheapest growth lever you have.
5. Social cards and SEO. There is no Open Graph data, no `og:image`, no Twitter card, no
   `metadataBase`, and no robots metadata. For a tool that grows by being shared in Slack and
   on LinkedIn, an attractive link preview is the difference between a click and a scroll-by.
6. Lightweight product analytics. There is backend OpenTelemetry but no web analytics, so you
   cannot see how many people land, how many start, and how many finish. A privacy-friendly
   tracker (Plausible or Umami) would show the landing-to-start-to-finish funnel and where
   people drop, which is how you decide what to build next.
7. Tighten alignment to the real blueprint. The official exam weights five domains (Agentic
   Architecture and Orchestration is the largest at 27%, Tool Design and MCP Integration at
   18%) and draws from six scenario types, including CI/CD integration. This mock covers four
   scenario types. Adding the missing ones and weighting the question mix toward the real
   blueprint would make it the most faithful free mock available, which is a claim worth
   earning.

## Suggested sequence

Now, a few days each: per-domain breakdown on the result page; the three accuracy fixes
(email promise, 720 pass mark, sitemap); mobile navigation; Open Graph and social cards.

Next, one to two weeks: expand the question bank or add exam sets; bring back untimed and
targeted practice; shareable result page and certificate; add product analytics.

Later: full blueprint alignment to five domains and six scenarios; real accounts and progress
sync to replace the email-and-PIN scheme; a reduced-motion and keyboard-accessibility pass.

## Sources

- Claude Certified Architect Foundations exam guide: https://claudecertifications.com/claude-certified-architect/exam-guide
- CCA-F quick facts (format, pass score, proctoring): https://certificationpractice.com/exam-overviews/anthropic-claude-certified-architect-foundations-quick-facts
- CCA-F 2026 prep overview (domains and weighting): https://open-exam-prep.com/blog/cca-f-claude-certified-architect-foundations-guide-2026
