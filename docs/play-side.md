# The play side — what guests see on their phones

This is the part of the game that lives on each guest's own phone during the
party. Built 8 October 2026 as the first slice of the build order ("one
character onto a phone via QR"), and shaped so the rest of the night can be
added to it act by act. Everything on it is safe for you to see: your own
character, the rules, the nineteen motives, the five of the household.

## What exists now

**The door.** A guest opens the square code at the entrance (printable from
the workshop's Game night page). Their phone signs itself in silently — no account, no
password — and shows "Who are you? Tap your name." The names come from the
guest list you write in the workshop. One tap, and the game hands them a
character at random. You and Susan are marked as hosts on that list, so you
always get the Professors. The same screen tells them which numbered bag to
collect.

**The phone at rest.** Their character: name, profession, a one-line bio, the
bag number, and now and then a line from a cat wandering past. Under it, the
Reticule — four tabs:
- *You* — the character card.
- *Motives* — all nineteen rhymes, visible from Act 1. Tap to cross one off.
  That is the guest's own note; it proves nothing and nobody else sees it.
- *Cats* — the five of the household, who they are, and how each one stands
  with this guest tonight, in words. Numbers never show.
- *Rules* — the rulebook sections from the workshop, with sensible defaults
  until yours are written.

**The moments.** When a host presses a button, every phone follows at once:
- *Blackout* — every screen goes dark. Nothing on any phone.
- *Power returns* — every phone lights at once with the same prompt, held for
  fifteen seconds measured against the server's clock, then a "Hide this"
  button. Act 2 begins. (The role prompts arrive here once the case generator
  exists; the hold and the parity are already built.)
- *Pause* — "Sir Irwin requires the garden."
- *Acts 1 to 7* — the act name and its objective line appear at the top of
  every phone.

**The Host tab.** You and Susan are marked as hosts on the guest list, so
after you tap your names your own phones get a fifth tab, *Host*: the doors
(open or closed), the seven act buttons, Blackout, Power returns, Pause, who is
here with a green dot for phones heard from lately, the square code to show a
guest, and "Start a new night" for rehearsals. Nothing on the night needs the
workshop or a Google sign-in. The buttons are labelled by what they do; none
of them can show who the Murderer, the Ghost or the victim is.

**A dead phone.** The guest taps their name on any other phone. The character,
bag and cat standings move with them. The old phone says the character has
moved to another phone. If it was a host's phone, the Host tab moves too.

**No signal.** A red strip says the Manor cannot hear the phone and that nothing
is lost. The phone keeps showing what it last saw and catches up on its own.

## What you do

1. Write the guest list: Workshop → Show night → Guest list. Just names, one
   per line. Mark the two of you "— host: Jonathan" and "— host: Susan".
2. Put it live once (the deploy command is under the technical heading below).
   Claude Code could not run that step itself.
3. On your phone, open the play link (the square code is on the workshop's
   Game night page, for printing). While no night is live the doors screen
   offers *Host? Start the night*. Tap it, then tap your name. Your character
   appears, and the Host tab with it.
4. Press the act buttons and watch the other phones follow. Press *Blackout*,
   then *Power returns*, and time the fifteen-second hold.

Start a new night from the Host tab as often as you like while testing. Each
one is fresh, and every phone taps its name again.

## What is not built yet (in build order)

- The case generator: who did it, who died, which motive, and the role prompts
  for the blackout. Sealed, generated blind.
- Cat testimony on the phone, the document puzzles, the echoes.
- The event windows (Acts 2, 4 and 6), the ballot in Act 7, the reveal.
- Eight fake test players (a script).
- The room kiosks and the study.

---

## For Claude Code (technical)

Layout: `play/` is the phone client (React + Vite, base `/play/`, one page,
no router). `functions/` holds the Cloud Functions (Node 22, ESM,
firebase-functions v2). `functions/lib/night.js` is the night logic, pure over
a Firestore `db`, shared by the callables and `functions/host.mjs`.
`functions/test/` proves it against an in-memory fake (`npm test` at the root).

Deploy (Jon runs this; it was denied to Claude Code as a production deploy):

```bash
npm run deploy
```

That builds the workshop and the phone client into `hosting/`, then deploys
hosting, Firestore rules and functions. `npm run deploy:site` is hosting only.
First functions deploy enables Cloud Build / Artifact Registry on the project
and takes a few minutes. Dev servers: `npm --prefix play run dev` on 5174
(`.claude/launch.json` → `play`); the workshop stays on 5173.

Preview without a night: `http://localhost:5174/play/?preview=join|rest|lobby|prompt|paused|blackout|doors`.

Firestore (all authed-read unless stated; Functions write):
- `public_state/active` `{ nightId }` — which night is live.
- `nights/{nightId}` `{ nightId, label, joinOpen, act, phase, phaseAt, actStartedAt, pausedFrom, guests[], roster{guestKey: {name, characterId, bag, joinedAt}} }`.
  Phases: `lobby | act | blackout | prompt | paused`.
- `nights/{nightId}/public/content` — copy of the safe areas in `PLAYER_AREAS`
  plus `motives` and `characters` (id, name, profession, gender, bio — never trace).
- `nights/{nightId}/private/deck` — `{ order[], bags[], uids{} }`. No client reads.
- `sessions/{uid}` — owner read only: `{ nightId, guestKey, guestName, characterId, bag, affection{}, host, status }`.
  Role cards and everything dealt go here later.
- `presence/{uid}` — owner write `{ nightId, guestKey, at }`; admin read. Doubles
  as the server-clock probe: the phone reads back the stamped `at` and keeps the skew.
- `notes/{uid}` — owner read/write: `{ crossed{}, seen{} }`.

Callables (region us-central1): `join({ nightId, guestKey })` for any signed-in
phone; `hostCommand({ nightId, command, arg })` when `canHost` says yes: the
admin UID, or a phone whose active session has `host` set for that night. With
no night live, `create` is open to any signed-in phone (the bootstrap).
Host phones may also read `presence/*` (rules `isHost()` does a `get` on the
caller's session).
Commands: `create`, `activate`, `publish`, `refresh-guests`, `join-open`,
`join-close`, `act` (1–7), `blackout`, `power`, `pause`, `resume`.

Guest list parsing (`parseGuest`): `Name` or `Name — host: Jonathan|Susan`;
keys are `[a-z0-9_]` so they are safe in dotted field paths.

Seal: nothing in `play/`, `functions/` or the rules touches `sealed/*` or
`cases/*`; those two rules blocks are byte-identical to before. When the case
generator lands it writes `cases/{nightId}` and per-player payloads into
`sessions/{uid}`; the phone keeps reading only its own session.
