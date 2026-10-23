# A Murderwin at Sirwin Manor

A Victorian murder mystery party for friends and family, to celebrate the first
birthday of **Sir Irwin** — a hound of impeccable breeding and questionable restraint.

Party: Sunday 15 November 2026. Freeze: Saturday 7 November 2026.

## If you are Jon

You don't need anything in this folder day to day. Your places are:

- **The Workshop** — where you write the game's safe content (the characters,
  the cats' manners, the Parlour Games, the bag items):
  https://murderwin-at-sirwin-manor.web.app/workshop/ — sign in with Google.
  - Its **Timeline** page is your one to-do list: every job, filed by the moment
    of the night it belongs to, with who does it. Open questions for you are
    there too.
  - Its **Where we are** page is the live status: what is left, your next three
    jobs, the open questions.
- **Start Here** (the page linked in `CLAUDE.md`) — the map of where everything
  lives, for you and for any Claude chat.

Everything secret about the game (who did it, why, which way each cat leans,
what is in each bag, the drawing pictures) is made blind and stored in the
game's database. It never lands in this folder and never appears on your
screen. That is on purpose: you are a player too.

## What's in the folder

- `CLAUDE.md` — the rules Claude Code follows when it works here. Written for
  Claude, not for you.
- `docs/` — the design and how-to pages. `docs/on-the-night.md` is the one for
  the day. `docs/sessions.md` is a short log of every working session, newest
  first.
- `seed/` — the starting safe content: the 19 motive rhymes, the first cat lines,
  the W-O-O-F News and Cat Hint Lines, the field guides you see in the workshop,
  and the starter task board.
- `app/` — the workshop itself. `index.html` and `styles.css` at the top level are
  the guest-facing splash page (the Victorian playbill).
- `play/` — what guests see on their phones during the party. `docs/play-side.md`
  explains it. The **Game night** page in the workshop runs it.
- `functions/` — the game's server side (joining, the acts, the case).
- `scripts/` — the blind tools that make the cats' leans, the drawing pictures
  and the bag packing. Each prints counts and PASS only. Also the eight fake
  players (`npm run fake-night`).
- `cues/` — runs on the brain on the night (the hall light and the sounds).
- `station/` — runs on the study Mac (the light puzzle).
- `media/` — your sound and W-O-O-F News recordings. Only its README is kept in
  the repo; the files stay on the brain.
- Anything else is plumbing.

## For Claude Code (technical)

- Workshop dev server: `npm --prefix app run dev` → http://localhost:5173/workshop/
- Phone client dev server: `npm --prefix play run dev` → http://localhost:5174/play/
  (`?preview=rest` etc. renders screens with sample data, no night needed)
- Deploy everything (site + rules + functions): `npm run deploy` at the repo root.
  Site only: `npm run deploy:site`
- Tests (every suite, no credentials needed): `npm test` at the repo root
- Deploy rules: `npm run deploy:rules`; functions only: `npm run deploy:functions`
- The local emulators: `npm run emulate`, then `npm run emulate:seed`; rules tests on them: `npm run test:rules`
- Eight fake players play a whole night and discard it: `npm run fake-night` (`-- --emulator` against the emulators)
- The blind tools: `npm --prefix scripts run leans`, `relay-pictures`,
  `pack-bags`. Counts and PASS/FAIL only (CLAUDE.md, THE SEAL). The secrets
  generator and its checker (`generate`, `validate`) were deleted on
  23 Oct 2026, when the cats' secret lines were retired.
- The day-of runbook for Jon: `docs/on-the-night.md`
- Splash locally: `python3 -m http.server 4173`
- The splash is also published to GitHub Pages from `main` (jonkost.com/Murderwin), so
  pushing publishes it. Each session ends with a commit (CLAUDE.md, HOW WE WORK);
  push and deploy only when Jon says so.
