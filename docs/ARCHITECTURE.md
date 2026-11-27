# Architecture

## Overview

Neon Dash Ultimate is a static-first browser application. The browser runs the complete game loop and renders the arena using HTML5 Canvas. Supabase is an optional hosted backend for identity, profile names, and leaderboard persistence.

```text
Browser
├── index.html + css/styles.css
├── js/app.js
│   ├── Game loop / Canvas renderer
│   ├── Input and audio
│   ├── Local profile + achievements (localStorage)
│   └── Supabase client
│       ├── Supabase Auth
│       ├── profiles table
│       └── scores table + submit_score RPC
└── GitHub Pages (static hosting)

Supabase Cloud
├── Auth users
├── PostgreSQL
│   ├── public.profiles
│   └── public.scores
└── Row Level Security + SQL RPC
```

## Data boundaries

- Gameplay and rendering run entirely in the user's browser.
- Local best score, run count, achievements, sound preference, and guest callsign are stored in localStorage.
- Supabase Auth manages optional email/password accounts.
- Supabase PostgreSQL stores public profile names and each authenticated user's best score per mode.
- The `submit_score` RPC checks authentication, mode, and a broad score range before updating a user's personal best.

## Trust model

The public anon/publishable key is expected to be present in browser code. RLS is the security boundary. Never expose a service-role key. The current game reports client-generated scores, so a determined player can tamper with them. Competitive anti-cheat requires server-side session validation.
