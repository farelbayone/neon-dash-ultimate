# Release checklist

## Before publishing

- [ ] Replace the Supabase placeholders in `js/config.js` (optional).
- [ ] Run `supabase/schema.sql` in the Supabase SQL Editor (optional).
- [ ] Configure Supabase Auth Site URL and Redirect URLs (optional).
- [ ] Test Classic, Time Attack, and Endless modes.
- [ ] Test keyboard and touch controls.
- [ ] Test sound toggle and pause/resume.
- [ ] Confirm local best score survives a page refresh.
- [ ] Test account sign-up/sign-in and leaderboard if Supabase is configured.
- [ ] Review repository files for accidental secrets.

## GitHub Pages

- [ ] Upload project contents to the repository root.
- [ ] Enable Pages from `main` / root.
- [ ] Wait for the Pages deployment action to finish.
- [ ] Open the published URL on desktop and mobile.
- [ ] Add the final Pages URL to Supabase Auth URL Configuration if enabled.

## Release notes — 2.0.0

- Rebuilt the arcade experience with a synthwave visual direction.
- Added Classic, Time Attack, and Endless modes.
- Added animated hazards, collectible energy, power-ups, and level progression.
- Added local profile, personal best, achievements, and player rank.
- Added optional Supabase authentication and global leaderboard.
- Added mobile pointer/touch support and generated sound effects.
