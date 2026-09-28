# The Workshop — what it is and how it behaves

Jon's private writing desk for the game. Everything on it is safe for you to see.
(The secret content — what the cats really reveal, the documents, who did it — is
never shown here. See `blind-content-protocol.md` for how that works.)

It's a website: https://murderwin-at-sirwin-manor.web.app/workshop/ — sign in with
Google. It works on your phone, the iPad or the Mac. It works offline; it catches
up when you're back online.

## The screens

**Home.** Three things:
- *Progress* — one bar per kind of content, with how many lines you have out of
  how many the game needs. Tap a bar to open that list.
- *Task board* — to do / doing / done. Tap a card to edit it; the arrows move it
  between columns. Add your own cards.
- *Decisions waiting on you* — a question with two or three answers. Pick one,
  confirm, and it disappears.

**Lists** — one per kind of content (Boo's closers, the room pool, echo frames…).
- The whole list is visible. Nothing is dealt to you at random.
- A fresh, empty line always sits at the bottom, and the cursor is already in it
  when the page opens. Type, press Enter, and the line is saved and a new empty
  one appears. Shift+Enter puts a line break inside a line.
- Click any line to edit it in place. The ▲▼ arrows reorder. ✕ removes a line,
  with an undo button.
- Lists with tabs (one per cat, or one per pool) remember which tab you're on.
- The *field guide* at the top of each list says what these lines are for, the
  format rules, and good and bad examples. Tap "Full field guide" to open it.
- While you type, a small ⚠ note under a line tells you if it breaks a format rule.
- "saved ✓" in the corner means saved. "saving…" means give it a second.

**Stationery tracker** — the seven document designs, each with a done tick, a notes
box and a place to attach reference images.

## Promises the workshop makes (learned the hard way)

1. **You pick what to work on.** Nothing random, ever.
2. **Nothing is ever deleted.** Removing a line only hides it, and every change you
   make is kept in a history. (A screen to browse that history is still to build;
   it's on the task board.)
3. **If a save fails, you see a red banner.** Silence means saved.
4. **You can keep typing with no signal.** Edits queue up and send themselves
   when you're back online.
5. **The first time the workshop opened, it loaded the starter content once.** It
   never does that again, so nothing you've written can be overwritten by a seed.

## What's left to build here

- The history screen (promise 2).

---

## For Claude Code (technical appendix)

Data model (Firestore):

- `safe_content/{area}` — doc per area: `{ items: [{id, text, cat?, pool?, act?, done?, deleted, order}] }`
  Areas, grouped as on the dashboard (goals in parentheses; × means per tab):
  - Cat voices: openers (8×cat), closers (8×cat), refusals = the cat deflection
    lines (8×cat; the Firestore key predates the name), smalltalk (8×cat),
    trailoffs (8, Granolia only), status_lines (3×cat)
  - World & cast: npc_cards (5), bios (10), lore (4)
  - Player screens: rules_text (10), ui_copy (24), role_cards (6), event_cards (12)
  - Frames & pools: pools (10×pool), echo_frames (8), epilogue_frames (2), templates (7)
  - Show night: act_scripts (3×act), ops_docs (12)
  - Assets (checklists, items carry `done`): art_assets, av_assets
  Areas, tasks and decisions added after the first seed import are created by
  additive migrations (`ADDITIONS` in `app/src/lib/content.js`) guarded by
  `meta/migrations` — additions only, existing data never rewritten.
- `workshop_history/{autoId}` — append-only: `{area, itemId, before, after, ts}`.
- `tasks/{autoId}` — `{title, detail, status, order, ts}`.
- `decisions/{key}` — `{question, options, answer, answeredAt}`.
- `sealed/*`, `cases/*` — Cloud Functions only. Client reads DENIED by rules.
- `validation_reports/{autoId}` — counts-only aggregates, client-readable; the
  dashboard's "Sealed coverage" panel renders the latest one.

Behaviour: autosave 400 ms debounce through a Firestore transaction that merges
pending changes onto the current remote items (never a whole-array overwrite) and
appends history in the same commit. Persistent local cache = the offline queue.
Rules deny `delete` on every workshop collection. Seed import once, guarded by
`meta/seeded`. Field guides come from `seed/safe-content.json` at build time,
not from Firestore. Auth: Google sign-in, UID allowlisted in `firestore.rules`.
