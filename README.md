# NEON DASH // ULTIMATE

A synthwave-inspired arcade survival game built with vanilla JavaScript and HTML5 Canvas. Dodge hazards, collect energy, activate power-ups, climb through levels, and chase your personal best.

![Neon Dash](https://dummyimage.com/1200x420/180d2b/ff4ebc&text=NEON+DASH+ULTIMATE)

## Features

- **Three game modes:** Classic, Time Attack, and Endless
- **Canvas gameplay:** animated synthwave grid, hazards, energy orbs, particles, and glowing effects
- **Power-ups:** Shield, Slow Motion, Magnet, and Overdrive (double score)
- **Progression:** score, levels, lives, personal best, player rank, and achievements
- **Controls:** keyboard, touch, and pointer/drag
- **Audio:** generated lightweight sound effects with Web Audio API
- **Local-first:** play without an account; local records are stored in `localStorage`
- **Optional online services:** Supabase Auth, player profiles, and global leaderboard
- **GitHub Pages compatible:** no Node.js server or build step required

## Play locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.
3. Press **Initialize Run**, select a mode, and start playing.

For local development, you can also run a static server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Controls

| Input | Action |
|---|---|
| `←` / `→` or `A` / `D` | Move |
| `Space` | Activate Overdrive |
| `Esc` | Pause / resume |
| Touch / drag | Move on mobile |

## Supabase setup (optional)

The game works without Supabase. Configure it only if you want accounts and a shared leaderboard.

1. Create a project at [Supabase](https://supabase.com/).
2. Open **SQL Editor** in your Supabase dashboard.
3. Run the complete script in [`supabase/schema.sql`](supabase/schema.sql).
4. Open **Project Settings → API** and copy the Project URL and anon/publishable key.
5. Edit `js/config.js`:

```js
window.NEON_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_ID.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY"
};
```

6. In Supabase **Authentication → URL Configuration**, add your deployed GitHub Pages URL to Site URL and Redirect URLs, for example:
   - `https://YOUR_GITHUB_USERNAME.github.io/neon-dash-ultimate/`
   - `http://localhost:8000/`

7. Enable email/password authentication in **Authentication → Providers → Email**.

### Security notes

- The browser key is the Supabase **anon/publishable** key. It is intended for public clients when Row Level Security (RLS) is enabled.
- **Never** put a Supabase `service_role` key, database password, or other private secret in frontend files or GitHub.
- RLS policies in `supabase/schema.sql` allow public leaderboard reads while restricting profile changes and score submissions to the authenticated user.
- The leaderboard is suitable for a casual portfolio game, not a cheat-proof competitive ranking system. Scores are client-generated. For a serious competitive release, validate runs in a trusted Supabase Edge Function or backend.

## Deploy to GitHub Pages

1. Create a GitHub repository named `neon-dash-ultimate` (or any name you prefer).
2. Upload the contents of this project to the repository root. `index.html` must be at the root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then save.
6. Wait for GitHub Pages to publish your site.
7. If using Supabase, add the final Pages URL to Supabase Auth URL Configuration.

No build command or server runtime is required. GitHub Pages hosts the frontend; Supabase provides the optional backend.

## Project structure

```text
neon-dash-ultimate/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   └── config.js
├── assets/
│   └── favicon.svg
├── supabase/
│   └── schema.sql
├── docs/
│   ├── RELEASE_CHECKLIST.md
│   └── ARCHITECTURE.md
├── .github/
│   └── workflows/
│       └── pages.yml
├── .gitignore
├── LICENSE
└── README.md
```

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript (ES2015+)
- HTML5 Canvas
- Web Audio API
- Browser Local Storage
- Supabase Auth + PostgreSQL (optional)
- GitHub Pages

## License

MIT — see [`LICENSE`](LICENSE).
