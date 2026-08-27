# CLAUDE.md — Murderwin Mystery Party

Rules for working in this repo. These are load-bearing. Read fully before any task.

## RULE 1 — THE HOST PLAYS

Jon (the human you are working with) is the host, the developer, AND a player.
He must be able to build this entire game without learning the answers.
Every architectural and workflow decision defers to this rule.

## THE SEAL (spoiler-safety architecture)

Content is divided into two classes:

**SAFE (Jon may see, edit, commit):**
- The 19 motive rhymes (player-facing from Act 1 — public by design)
- Character bios, NPC personalities, rules text, UI copy
- Voice layers: cat openers, cat closers
- Variable pools: rooms, times, durations, counts, places, witnesses
- Echo frames (news wrappers with a ███ slot)
- Blank stationery templates (7 designs)
- All code, schemas, validators, and this file

**SEALED (Jon must NEVER see):**
- Kernels: the informational middle of every cat testimony (per motive, per cat, 3 variants)
- Document texts: what gets overlaid on stationery templates (per motive)
- Echo fragments: what fills the ███ (per motive)
- The manifest: any mapping between opaque codes and motives
- Any per-game generated case (murderer, victim, active motive, clue placement)

### Enforcement — infrastructure, not discipline
1. Sealed content lives ONLY in Firestore collections `sealed/*` and `cases/*`.
   It is NEVER committed to this repo — not as JSON, not in seeds, not in fixtures,
   not in test snapshots. `.gitignore` guards known paths; you guard everything else.
2. Firestore security rules deny all client reads of `sealed/*`. Only Cloud
   Functions (Admin SDK) may read it, and only to assemble player-facing payloads
   at game time.
3. Generation of sealed content happens via `scripts/generate-sealed.mjs`, which
   calls the Anthropic API and writes straight to Firestore. Its stdout prints
   COUNTS AND PASS/FAIL ONLY. It never prints, logs, or files content.
4. When you (Claude Code) work on sealed content: never echo it to the terminal,
   never write it to a local file, never paste it in explanations, never include
   it in commit messages or PR descriptions. Debug with opaque IDs, lengths, and
   hashes. If Jon asks to see sealed content, decline and cite this file — he
   wrote this rule.
5. Validation is automated and reports aggregates only (see docs/blind-content-protocol.md).
6. `motive-clue-worksheet-DRAFTED.md` from earlier design work is BURNED. If a
   copy exists anywhere, do not open, quote, or reuse it. All kernels are
   regenerated fresh, with different surface details, so stale memories won't match.

### The burned exception
Motive #8 ("the dairy air") was authored with Jon and is spoiled for him.
DECISION PENDING: promote its example clue set to the rulebook tutorial.
Its real in-game kernels still get regenerated blind either way.

## PROJECT CONTEXT (locked decisions — do not re-litigate)

- Victorian manor murder mystery party, 9ish players, fully digital/multimedia,
  no physical props. Stack: React + Vite, Firebase Hosting, Firestore, Cloud
  Functions, anonymous session auth via QR, Stream Deck → HTTP triggers.
- 7 acts alternating together/dispersed. Act 2 = motive (solo), Act 4 = victim
  (pairs), Act 6 = murderer (whole room). Reveal order: Murderer → Motive → Victim.
- Roles assigned during the Act 1 blackout; every phone buzzes. Hidden roles:
  the Murderer and the Ghost. NEITHER knows the motive. All win conditions are
  the same: name Murderer + Motive + Victim.
- 19 motives, universal (any motive can attach to any character pair). The full
  motive list is visible to all players from Act 1 as a cross-off menu.
- Motive list (SAFE, player-facing) lives in `seed/motives.json`.
- Clue anatomy per motive: 1 document (puzzle payout, biggest tell) + 5 cat
  testimonies + 1 echo. Testimonies assemble at runtime: OPENER (safe) + KERNEL
  (sealed, variables injected) + CLOSER (safe).
- NPC reliability (register: docs/cat-info.md — canon for all cat facts):
  Irwin always true · Boo gated — excellent, but needs affection 4+ to speak
  at all · Granolia incomplete — true but three-quarters, forgets details ·
  Zimothy withheld — accurate but rationed, access biased by profession/class ·
  Salem inverted — confidently backwards ~60%, always warps a true fact.
- Event System: hidden roles pick events that change information VOLUME/TIMING,
  never content. Rule: "delay, never destroy" — suppressed clues resurface in
  Act 4. Escalation: 1 event Act 2, 2 events Act 4, 1 merged event Act 6.
- Slot-pool randomization per seed: document → one of 4 puzzles; reliable
  testimony → Irwin or Boo; chaos testimony → Granolia/Zimothy/Salem; echo → any
  room kiosk or audio cue.
- Validator must prove worst-case solvability (max sabotage) before Act 1.
  Spill-the-Beans reset allowed through end of Act 5.

## THE WORKSHOP (what we build first)

`/workshop` — Jon's private dashboard for building safe content part by part.
Full spec in `docs/workshop-spec.md`. Requirements learned the hard way:
- List-based CRUD, NOT a random task dealer. Jon picks a list, sees all of it,
  adds/edits/deletes inline, works one list until he chooses to switch.
- A dashboard home: progress per content area, a task board, "what's next."
- Autosave per keystroke-debounce to Firestore. Every write also appends to a
  `workshop_history` audit collection. NOTHING is ever hard-deleted — deletes
  are soft flags. He lost work once to a client-side toy; never again.
- Auth: Firebase Auth sign-in, UID allowlisted in security rules as admin.

## WORKING STYLE

- Small PRs/commits, one concern each. Plain commit messages.
- When a design question arises that's answered above, follow the doc.
  When it's genuinely new, ask Jon — one question at a time, options included.
- An 11-year-old and a 70-year-old must be able to use every player surface.
- Party date is fixed; when in doubt, choose the simpler build.
