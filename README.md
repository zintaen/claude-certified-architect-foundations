# CyberSkill · CCAF Practice — Claude Certified Architect Mock Exam

[![Live Demo](https://img.shields.io/badge/Live-ccaf.cyberskill.dev-45210E?style=flat-square&logo=vercel)](https://ccaf.cyberskill.dev)
[![License](https://img.shields.io/badge/License-Personal%20Educational%20Use-F4BA17?style=flat-square)](./LICENSE)

A production-grade, offline-capable mock exam for the **Claude Certified Architect — Foundations** (CCAF) credential. Built from firsthand experience passing the real exam.

## Features

- **60 scenario-based questions** aligned with the official CCAF blueprint
- **120-minute proctor-style timer** with tab-switch detection and fullscreen enforcement
- **Untimed practice mode** and **targeted domain practice** for study flexibility
- **Flashcard mode** with localStorage persistence for study card sessions
- **Global leaderboard** and **community statistics** powered by Supabase
- **Full review explanations** for every option (unlocked after clean completion)
- **Dark mode** with a warm CyberSkill design system
- **PWA / offline-capable** — works without internet after first visit
- **Anti-cheat deterrents**: watermarking, clipboard interception, DevTools detection
- **Social sharing** — one-click share results to Twitter/LinkedIn
- **Mobile-responsive** — phone, tablet, laptop

## Tech Stack

| Layer     | Technology                                                                      |
| --------- | ------------------------------------------------------------------------------- |
| Frontend  | Single-file HTML + CSS + vanilla JS (no build step)                             |
| Backend   | [Supabase](https://supabase.com) (PostgreSQL RPC, Row-Level Security)           |
| Hosting   | [Vercel](https://vercel.com) (static deploy)                                    |
| PWA       | Service Worker with stale-while-revalidate caching                              |
| Fonts     | [Red Hat Text](https://fonts.google.com/specimen/Red+Hat+Text) via Google Fonts |
| Analytics | Vercel Web Analytics                                                            |

## Quick Start

1. Clone this repo
2. Open `index.html` in any modern browser, **or** deploy to any static host

```bash
# Option A: Local
open index.html

# Option B: Vercel (recommended)
npx vercel --prod
```

## Project Structure

```
├── index.html              # Full app: HTML + CSS + JS + base64-encoded question bank
├── manifest.json           # PWA manifest (offline install support)
├── sw.js                   # Service worker (stale-while-revalidate cache)
├── robots.txt              # Crawler rules + AI scraper blocks
├── sitemap.xml             # SEO sitemap
├── sync_to_supabase.js     # Admin: sync question bank to Supabase
├── questions_backup.json   # Plain-text question bank backup
└── assets/
    └── cyberskill-logo.svg # Brand logo (used as favicon + PWA icon)
```

## Supabase Integration

The app connects to Supabase for:

- **User auth** (email + hashed PIN via `verify_mock_user` RPC)
- **Score submission** (via `submit_exam_result` RPC)
- **Global stats & leaderboard** (via `get_global_stats` RPC)
- **Question comments** (via `question_comments` table)

> The Supabase anon key in `index.html` is intentionally public — it's a client-side key protected by Row-Level Security policies.

## Browser Compatibility

| Browser              | Status               |
| -------------------- | -------------------- |
| Chrome / Edge 90+    | ✅ Full support      |
| Firefox 90+          | ✅ Full support      |
| Safari 15+           | ✅ Full support      |
| Mobile Chrome/Safari | ✅ Responsive layout |

## Why I Built It

I sat the real CCAF exam, passed it, and wrote up my playbook on [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1to0xfc/comment/ooabw3z). Many people asked for realistic practice questions to pressure-test their understanding before going in. This is that set.

## Disclaimer

CCAF, Claude, and the Claude Partner Network are Anthropic products/programs. This page is an **unofficial, community-made study aid** and is not affiliated with Anthropic. Questions are based on the public CCAF exam blueprint.

## License

Personal educational use. See [LICENSE](./LICENSE) for details.

## Author

**Stephen Cheng** — [LinkedIn](https://www.linkedin.com/in/zintaen/) · [WhatsApp](https://wa.me/84906878091) · [Buy me a coffee ☕](https://buymeacoffee.com/zintaen)
