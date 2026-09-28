# CLAUDE.md — A Murderwin at Sirwin Manor

Rules for working in this repo. These are load-bearing. Read fully before any task.
Updated 25 September 2026. Party: Sunday 15 November 2026. Freeze: Saturday 7 November 2026.

## RULE 1 — THE HOST PLAYS

Jon (the human you are working with) is the host, the developer, AND a player.
He must be able to build this entire game without learning the answers.
Every architectural and workflow decision defers to this rule.

## THE SEAL (spoiler-safety architecture)

Content is divided into two classes:

**SAFE (Jon may see, edit, commit):**
- The 19 motive rhymes (player-facing from Act 1 — public by design)
- Character bios, NPC personalities, rules text, UI copy
- Voice layers: cat openers, cat closers, cat deflection lines
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
- Event copy for Acts 2, 4 and 6 (generated blind, same rules as kernels)

### The Steward exception (decided by Jon, 28 Sep 2026)
The Steward is Jenna (they/them), a REMOTE NON-PLAYER who never visits the
house. Their job is editing content. They may see and edit EVERYTHING, sealed
content included, because Jon cannot.

Content workflow: Jon, Jon's wife and Claude draft; Jenna edits.
- Jon drafts SAFE content only. Anything he drafts he will recognise on the
  night, so he never drafts sealed content — decline and cite Rule 1 if asked.
- Jon's wife and Claude draft sealed content. Claude's drafts come from the
  generator. Anyone who drafts sealed content knows the answers.
- Jenna edits both, and reports to Jon only "done" or "needs more", never content.
- Jenna also puts the bags together (the bag system; its details are not in
  the repo yet — they live in Jon's claude.ai chats).

Build requirements (none built yet):
- A Steward-only view, by verified Google email, to read and edit `sealed/*`.
  It never loads for Jon's account. Changing the security rules needs Jon's
  explicit approval.
- Regenerating sealed content must never silently overwrite Jenna's edits.
- Claude Code still never prints, logs or files sealed content. The Steward
  view is built and debugged blind, exactly like the generator.

### Enforcement — infrastructure, not discipline
1. Sealed content lives ONLY in Firestore collections `sealed/*` and `cases/*`.
   It is NEVER committed to this repo — not as JSON, not in seeds, not in fixtures,
   not in test snapshots. `.gitignore` guards known paths; you guard everything else.
2. Firestore security rules deny all client reads of `sealed/*`. Only Cloud
   Functions (Admin SDK) may read it, to assemble player-facing payloads at game
   time — and, once built, for the Steward's view (see above).
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
7. Test fixtures and the eight fake test players use a throwaway generated case
   that is discarded after the run. Never persist one. Never print one.

### The burned exception
Motive #8 ("the dairy air") was authored with Jon and is spoiled for him.
DECISION PENDING: promote its example clue set to the rulebook tutorial.
Its real in-game kernels still get regenerated blind either way.

## WHERE THE FULL CANON LIVES

- Canon — every settled fact, one page:
  https://claude.ai/code/artifact/5cdba40b-7596-4aeb-8db1-cefda453d3e7
- Start Here — what to do next, the build order, the freeze rules:
  https://claude.ai/code/artifact/b3167de3-f333-405e-bb92-62d23bbb2883

When this file and the Canon page disagree, the Canon page wins — fix this file.

## PROJECT CONTEXT (locked decisions — do not re-litigate)

- Victorian manor murder mystery for Sir Irwin's first birthday. About 9 players
  aged 11 to 70, fully digital and multimedia, no physical props, no real locks.
  14 playable characters with professions, genders and traces, assigned at random
  at runtime and never changed all night.
- Stack: React + Vite, Firebase Hosting, Firestore, Cloud Functions, anonymous
  session auth via QR. Phone-first. Single page, one route, no client-side router.
- Data format for clues, cases and seeds: JSON. Decided 25 Sep. Never YAML.
- 7 acts, 2 to 2.5 hours:
  1 Welcome (together, 4:00pm; role rules stated in the preamble; blackout at the end)
  2 First investigation (solo, ~5:30pm; the tutorial; everything for your ears only)
  3 Dinner (orangery)
  4 Rotation (pairs/trios; info shared only inside your group; the study is the
    timekeeper with a 15-minute cap)
  5 Dessert (roaming)
  6 The Big Solve (living room; group puzzle plus a deduction round where each
    player publicly commits to one elimination)
  7 Reveal (~8:00pm; 2 minutes to enter picks; majority decides; metrics plus a
    visual graph of the clarity dial)
  Reveal order: Murderer → Motive → Victim.
- Three roles, symmetric, each holds one third: Detective, Murderer, Ghost.
  The Murderer knows they did it, not the motive. The Ghost knows they are dead,
  not who did it. Roles are assigned during the Act 1 blackout; every phone buzzes.
  Every win condition is the same: name Murderer + Motive + Victim.
- 19 motives, universal (any motive can attach to any character pair), final as of
  27 Aug. Visible to all players from Act 1 as a cross-off menu. `seed/motives.json`.
  Jon may still swap one — his call, never yours.
- Clue anatomy per motive: 1 document (puzzle payout, biggest tell) + 5 cat
  testimonies + 1 echo. Testimonies assemble at runtime: OPENER (safe) + KERNEL
  (sealed, variables injected) + CLOSER (safe).
- The five NPCs, never suspects:
  Sir Irwin, the dog — always true; hint ladder is the safety valve.
  Granolia Lickspittle — true with exactly one wrong pool-variable; lives in the
    study and gives its hints in character.
  Miss Boo LaRue — true, needs affection 4+, five words then done.
  Zimothy Clawford, Esq., "the old family solicitor" (never shortened) — true but
    money-shaded.
  Salem Crookshank, the groundskeeper — inverts ~60%, always confident, always
    warps a true fact.
  Trust ladder, stated at the top of the night: if Irwin and anyone disagree,
  Irwin is right. No cat ever speaks aloud — all dialogue is text; audio is
  generic pre-recorded atmosphere only.
- Affection to each cat rolled 1–5 at character creation, never changes, Irwin
  always maxed. Pass comfortably = full answer, narrowly = partial, fail =
  in-character deflection, no penalty. Cat distortion applied on top.
- Event System: the Murderer and the Ghost each pick hidden events — 1 in Act 2,
  2 in Act 4, 1 merged pick in Act 6. Events are nested scenarios three beats deep.
  Events are free; the cost is social. Events change information VOLUME and
  TIMING, never content — "delay, never destroy." The clarity dial stacks across
  the whole night and never resets; strong-vs-strong lands neutral and neither
  player learns they cancelled out. The validator must assume worst-case
  suppression across Acts 2, 4 and 6 and still prove every player can reach two
  of three before Act 1.
- Safeguards: Spill the Beans (the outward reset) is allowed through the end of
  Act 5, never after; the engine decides legality silently — only if another
  pairing is still consistent with every clue already dealt — and owes no
  explanation when it is off. The exposure safeguard is a silent tap with no
  call-out until Act 7, if ever.
- Slot-pool randomization per seed: document → one of 4 puzzles; reliable
  testimony → Irwin or Boo; chaos testimony → Granolia/Zimothy/Salem; echo → any
  room kiosk or audio cue.

## CLIENT RULES (hard rules for every player surface)

- All timing comes from server timestamps. No phone ever counts down on its own.
  A locked phone, a dropped connection and a late arrival all recover the same
  way: reconnect, rehydrate to current server state, silently.
- There is NO waiting-for-players screen anywhere in the game.
- Windows never close early. No choice → a default fires, leaning random, so a
  no-show is never a recognisable pattern.
- All phones get an event window at once. Read-time parity: innocent content
  matches the choice prompt in length. Every innocent beat needs a required
  interaction before it can be dismissed.
- The idle screen is a real state, not an error view, and is indistinguishable
  from a phone that just finished choosing an event.
- Blackout messages hold every phone 15 s minimum, then a hide button; screens
  render near-black.
- No service worker, no notification permission, no install prompt.
- Sound files are named after the event ID so the relay performs no logic and
  stays blind. Pad 1 s of silence for AirPlay spin-up. Always build a visual
  fallback so a Ghost's choice never silently vanishes.
- An 11-year-old and a 70-year-old must be able to use every surface, in dim light.

## HARDWARE (decided 25 Sep — no Raspberry Pi anywhere)

- M3 15" MacBook Air — the game server ("the brain"). Ethernet, sleep off. Serves
  the media bank over the LAN: every file preloaded on every display machine with
  opaque IDs; the sealed runtime mapping picks the file; the host sends a short
  cue ("play 7F3A"). Stationery ships blank with text overlaid live.
- Two work MacBook Pros — main-room and bedroom kiosks, each a browser pointed at
  the host.
- M1 MacBook Air — the study station: Stream Deck over USB, Nanoleaf over wifi
  (Open API, plain HTTP, port 16021), the study's on-screen information.
- iPad Pro M2 — the wandering iPad. Older family iPad — phone-died backup.
- The study puzzle: Simon says on the white Nanoleaf Elements — three escalating
  patterns per round, reproduced by touching the panels (touch gestures stay ON
  for this wall; a telescoping pointer covers reach). Clearing a round lights a
  colour and a count, entered on the 15-key Stream Deck: columns 1–2 are six
  colours, columns 3–4 are numbers 1–6, column 5 is blank / undo / submit.
  Nothing auto-submits. Three rounds → three colour-number pairs → the code.
  Granolia hints. 15-minute cap, then the group rotates regardless.

## THE WORKSHOP (what we build first)

`/workshop` — Jon's private dashboard for building safe content part by part.
Full spec in `docs/workshop-spec.md`. Requirements learned the hard way:
- List-based CRUD, NOT a random task dealer. Jon picks a list, sees all of it,
  adds/edits/deletes inline, works one list until he chooses to switch.
- A dashboard home: progress per content area, a task board, "what's next."
- Autosave per keystroke-debounce to Firestore. Every write also appends to a
  `workshop_history` audit collection. NOTHING is ever hard-deleted — deletes
  are soft flags. He lost work once to a client-side toy; never again.
- A save failure is a visible banner, never silent. Typing continues when
  Firestore is unreachable. Cursor lands in the input on load; Enter commits and
  opens a fresh line; click any line to edit in place.
- Auth: Firebase Auth sign-in, UID allowlisted in security rules as admin.

## BUILD ORDER (from Start Here — top to bottom, do not jump ahead)

1. Repo + this file. 2. Clue format locked: JSON. 3. Throwaway slice: one
character onto a phone via QR. 4. Seed-based case generator. 5. Eight fake test
players (a script). 6. Split dev and live. 7. First full dry run. 8. Host Mac as
server. 9. Media bank onto the serving Mac. 10. Screens as kiosks. 11. Nanoleaf
layer. 12. Full play-through review. 13. Canary person. 14. Freeze.

## WORKING STYLE

- Small commits, one concern each. Plain commit messages.
- When a design question is answered above or on the Canon page, follow it. When
  it is genuinely new, ask Jon — ONE question at a time, options included, short.
  He works in short bursts and is often tired: never hand him a wall of text or
  a batch of decisions.
- The party date is fixed. After the freeze on 7 Nov, anything not working is cut,
  not fixed. Safe to cut: the Nanoleaf layer, any single act's event content, the
  wandering iPad. Never cut: the generator, the reveal order, the sealed kernels.
  When in doubt, choose the simpler build.
