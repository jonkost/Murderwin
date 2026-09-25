# A Murderwin at Sirwin Manor

A Victorian-era murder mystery party game, built for friends and family to play in
celebration of the first birthday of **Sir Irwin** — a hound of impeccable breeding and
questionable restraint.

Rules for working in this repo are in `CLAUDE.md`. Read it first; the SEAL rules are
load-bearing. Party: Sunday 15 November 2026. Freeze: Saturday 7 November 2026.

## What's here

- `index.html`, `styles.css` — the guest-facing splash (a Victorian playbill), published
  to GitHub Pages from `main`.
- `app/` — the Workshop, Jon's private content-building dashboard (React + Vite +
  Firestore). Deployed to Firebase Hosting under `/workshop/`.
- `seed/` — SAFE seed content only: the 19 motive rhymes, voice layers, pools, frames,
  field guides, the starter task board.
- `scripts/` — `generate-sealed.mjs` and `validate-sealed.mjs`, the blind pipeline for
  sealed content. Counts-only output, never content.
- `docs/` — the workshop spec, the blind-content protocol, the cat register.
- `firestore.rules`, `storage.rules` — the seal, enforced by infrastructure.

## Running the workshop locally

```bash
npm --prefix app run dev
```

Then open http://localhost:5173 and sign in with Google. Only the allowlisted admin UID
gets past the gate.

## Deploying

```bash
npm --prefix app run build:site && firebase deploy --only hosting
```

Rules: `firebase deploy --only firestore:rules,storage`.

## The splash locally

```bash
python3 -m http.server 4173
```
