# Workshop Spec — /workshop

Jon's private content-building dashboard. Everything it can display is SAFE-class
(see CLAUDE.md). Build this before any player surface — it feeds them all.

## Pages

### 1. Dashboard (home)
The organized/on-task view. Three panels:
- **Progress** — one row per content area: Openers (per cat), Closers (per cat),
  Deflections (per cat), Variable pools (per pool), Echo frames, Stationery
  templates, Sealed coverage.
  Each row: count / goal, thin progress bar, tap → its editor.
  Sealed coverage shows AGGREGATES ONLY (e.g. "19/19 codes have full kernels —
  validated ✓") pulled from the counts-only validator report.
- **Task board** — cards from the `tasks` collection: todo / doing / done.
  Seeded from seed/tasks.json. Jon can add, edit, drag between columns.
- **Decisions** — open decisions awaiting Jon (e.g. "#8 → rulebook tutorial?").
  Answering writes to `decisions` and removes the card.

### 2. List editors (one route per content area)
Boring CRUD on purpose:
- Full list visible. Add at bottom. Inline edit any line. Soft-delete with undo.
- Reorder by drag. Per-cat tabs for openers/closers/deflections.
- Field-guide header on each editor: what this layer is, the one-line test,
  2 examples (copy exists in seed/safe-content.json under `guides`).
- Autosave (400ms debounce) + saved indicator + offline queue (Firestore default).
- Cursor lands in the input on load. Enter commits the line and opens a fresh one
  (Shift+Enter for a line break). Click any line to edit it in place. Typing
  continues when Firestore is unreachable; the queue flushes on reconnect.

### 3. Stationery tracker
The 7 template briefs with done-checkbox, notes field, and reference image upload
(Firebase Storage) so Jon can attach his designs.

## Data model (Firestore)

- `safe_content/{area}` — doc per area: `{ items: [{id, text, cat?, pool?, act?, done?, deleted, order}] }`
  Areas, grouped as on the dashboard (goals in parentheses; × means per tab):
  - Cat voices: openers (8×cat), closers (8×cat), refusals = the cat deflection
    lines (8×cat; the Firestore key predates the name),
    smalltalk (8×cat), trailoffs (8, Granolia only), status_lines (3×cat)
  - World & cast: npc_cards (5), bios (10), lore (4)
  - Player screens: rules_text (10), ui_copy (24), role_cards (6), event_cards (12)
  - Frames & pools: pools (10×pool), echo_frames (8), epilogue_frames (2), templates (7)
  - Show night: act_scripts (3×act), ops_docs (12)
  - Assets (checklists, items carry `done`): art_assets, av_assets
  Areas added after the first seed import are created by additive migrations
  guarded by `meta/migrations` — additions only, existing data never rewritten.
- `workshop_history/{autoId}` — append-only: `{area, itemId, before, after, ts}`.
- `tasks/{autoId}` — `{title, detail, status, order, ts}`.
- `decisions/{key}` — `{question, options, answer, answeredAt}`.
- `sealed/*`, `cases/*` — Cloud Functions only. Client reads DENIED by rules.
- `validation_reports/{autoId}` — counts-only aggregates, client-readable.

## Non-negotiables (from the artifact post-mortem)
1. No random task dealer. Jon chooses what to work on.
2. Nothing hard-deletes. History is append-only and visible in the UI (the
   history screen is still on the task board).
3. A save failure must be VISIBLE (banner), never silent.
4. First load with empty DB runs a one-time seed import from seed/safe-content.json,
   then never auto-seeds again (guard doc: `meta/seeded`).

## Build order
1. Firebase project wiring + auth + rules deploy
2. Seed import + safe_content CRUD (one area end-to-end: Boo closers)
3. Remaining editors + dashboard progress panel
4. Task board + decisions panel
5. Stationery tracker
6. `scripts/generate-sealed.mjs` + counts-only validator + coverage panel
