# A Murderwin at Sirwin Manor

A Victorian murder mystery party for friends and family, to celebrate the first
birthday of **Sir Irwin** — a hound of impeccable breeding and questionable restraint.

Party: Sunday 15 November 2026. Freeze: Saturday 7 November 2026.

## If you are Jon

You don't need anything in this folder day to day. Your two places are:

- **The Workshop** — where you write the game's safe content (cat lines, pools,
  echo frames, stationery notes) and keep the task board:
  https://murderwin-at-sirwin-manor.web.app/workshop/ — sign in with Google.
- **Start Here** (the page linked in `CLAUDE.md`) — what to do next.

Everything secret about the game (who did it, why, what the cats actually reveal)
is made by Claude and stored in the game's database. It never lands in this folder
and never appears on your screen. That is on purpose: you are a player too.

## What's in the folder

- `CLAUDE.md` — the rules Claude Code follows when it works here. Written for
  Claude, not for you.
- `docs/` — three short explainers: how the workshop behaves, how the secret
  content gets made without you seeing it, and the cat register (who each cat is
  and how they twist the truth).
- `seed/` — the starting safe content: the 19 motive rhymes, the first cat lines,
  the pools, the field guides you see in the workshop, and the starter task board.
- `app/` — the workshop itself. `index.html` and `styles.css` at the top level are
  the guest-facing splash page (the Victorian playbill).
- `play/` — what guests see on their phones during the party. `docs/play-side.md`
  explains it. The **Game night** page in the workshop runs it.
- `functions/` — the game's server side (joining, the acts, and later the case).
- `scripts/` — the tool that writes the secret content. You run it once when asked;
  it prints only numbers.
- Anything else is plumbing.

## For Claude Code (technical)

- Workshop dev server: `npm --prefix app run dev` → http://localhost:5173/workshop/
- Phone client dev server: `npm --prefix play run dev` → http://localhost:5174/play/
  (`?preview=rest` etc. renders screens with sample data, no night needed)
- Deploy everything (site + rules + functions): `npm run deploy` at the repo root.
  Site only: `npm run deploy:site`
- Tests (night logic, no credentials needed): `npm test` at the repo root
- Deploy rules: `firebase deploy --only firestore:rules,storage`
- Splash locally: `python3 -m http.server 4173`
- The splash is also published to GitHub Pages from `main` (jonkost.com/Murderwin), so
  pushing publishes it. Commit and push only when Jon says so.
