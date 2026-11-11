# The postmortem

How we look back at a run of the night: a walk-through, a tech run, the
party. Built 11 November 2026. Three steps, and the middle one is the only
one that is yours.

## 1. Before the run: start the night log

On the brain, ask Claude Code to start the night log, or type `npm run
night-log` in the Murderwin folder. A window opens and says "The night log
is running." Leave it open all night.

It writes down every move of the night and the time: each beat, each act,
every pause, The End. It only watches. It reads what every phone can read
and nothing else, and it changes nothing, so it cannot disturb the night.
If it is closed by mistake, start it again; it carries on.

When the night is over, click the window and press Ctrl-C.

## 2. Straight after: ten minutes on the Postmortem page

In the workshop, open **Postmortem** (from Home, Where we are or Game
night). While it is fresh:

1. Pick when in the night it was. **Next moment** walks the night in order.
2. Pick what kind of thing it is: it broke, it was rough, an idea, or it
   worked and should be kept.
3. Say it (the Speak button) or type it, and press **Send to Claude Code**.

One thing at a time. Skip any moment with nothing to say. Ask Susan and the
other players for theirs and say those too. A note you have not sent waits in
the box.

During the run itself, do not stop to write. If something must not be
forgotten, say it into the Notes tab on your phone or a voice memo and put it
on the page afterwards.

## 3. The next session: Claude Code does the review

Tell Claude Code "do the postmortem". It:

1. Runs `npm run postmortem` (or `npm run postmortem -- 2026-11-11` for
   another day). That writes `docs/postmortems/<date>.md`: how long each beat
   and act ran against the plan, with the pauses, then every note in night
   order, what broke first.
2. Reads it with you and fills in **The review** at the bottom: what to fix
   before the party, what to cut, what to leave alone. Running the command
   again keeps what is written there.
3. Works the notes. Every note is a card on the Timeline; Claude Code's list
   prints them first, the newest run first, what broke before what was
   rough. A fixed note is marked done by its number.

After the second full tech run anything not working is cut, not fixed
(`CLAUDE.md`, Working style), so the review of that run is a cut list as
much as a fix list.

## For Claude Code

- The page: `app/src/pages/Postmortem.jsx`, `app/src/lib/postmortem.js`. A
  note is a `tasks` card with `source: 'postmortem'`, `run` (the date),
  `kind` (`broke`, `rough`, `idea`, `keep`), `moment`, `words`; a Keep is
  filed done. Numbers share the 10000 range with the Game test notes. Not in
  the rail (it is full on a phone).
- The log and the report: `scripts/postmortem.mjs`. `record` listens to
  `public_state/active` and the live night's public doc and keeps only
  `factsOf` (act, beat, phase, rehearsal, gameTest, over, a count of missing
  lines), one JSON line a change, in
  `docs/postmortems/<date>-<nightId>.jsonl`. `report` reads those files and
  the postmortem cards and writes the Markdown. Nothing private or sealed is
  read; a test pins the two documents it may read.
- The board: `scripts/board.mjs` prints postmortem cards before the Game test
  notes.
- The log files and the reports are safe to commit: beat names, times and
  Jon's own notes.
