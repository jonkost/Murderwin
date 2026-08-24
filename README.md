# Murderwin at Sirwin Manor

A Victorian-era murder mystery party game, built for friends and family to play in
celebration of the first birthday of **Irwin** — a hound of impeccable breeding and
questionable restraint.

## Status

Early days. Right now the repo contains the splash page only.

- `index.html` — the splash / title page (a Victorian playbill)
- `styles.css` — all styling for the splash

## Running it locally

It's a static site, so any static server works:

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173

(There's a `.claude/launch.json` wired up for the same thing.)

## Hosting

Intended for GitHub Pages — `index.html` sits at the repo root, so enabling Pages on
the `main` branch (root folder) in **Settings → Pages** is all it takes.

## Art

All artwork is being created by hand — the splash deliberately ships with **no illustrations**,
only type and ornament. The one art slot is the wax seal in the bottom-right corner of the
playbill (`.seal` in `index.html`), currently rendered as unstamped wax. Drop an `<img>` or
inline `<svg>` inside it, or delete the div if it isn't wanted.

## Notes

- Type is loaded from Google Fonts (Playfair Display, IM Fell English, Cinzel) with
  serif fallbacks, so it degrades gracefully offline.
- No build step, no dependencies — plain HTML/CSS/JS by design.
