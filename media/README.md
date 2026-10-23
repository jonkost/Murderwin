# The sound files

This folder holds one sound file per cue. The cue relay (`cues/`) on the
brain plays whichever file is named for the moment, through the Mac's sound
output (the AirPlay speaker group). The relay knows the file names and nothing
else: no file here says what it is for beyond its name.

The files themselves are not kept in the repo (they are big, and they are
yours). Only this page is.

## The nine files

Name each file after its id. Any of `.m4a`, `.mp3`, `.wav` or `.aiff` works;
the first one found wins.

| File | When it plays |
|---|---|
| `chime-news` | Act 2, the news flash comes up on the living room screen. |
| `sounder-bulletin` | Act 3, the bulletin comes up during dinner. |
| `chime-irwin` | Act 5, Sir Irwin is about to speak on the living room screen. |
| `sting-solved` | Act 4, a group has solved the study. |
| `sting-door` | Act 6, the third drawing is named and the bedroom door opens. |
| `sting-reveal` | Act 7, the reveal begins on the living room screen. |
| `sting-result` | Act 7, every phone shows its own result. |
| `blackout` | End of Act 1, every phone goes dark. |
| `power` | The power returns and Act 2 begins. |

## The W-O-O-F News recordings

Every line in the W-O-O-F News Recording Script is its own file, named as the
script says (the list is in `seed/woof-news.json`). The relay plays a
bulletin's files one after the other, straight after its sound. These never
stop the relay starting: a line with no file yet is skipped, and the words
are on the screen as captions anyway.

| Files | When they play |
|---|---|
| `newsflash-opening`, then one of `newsflash-food`, `newsflash-bathroom`, `newsflash-screens`, `newsflash-out-and-about`, `newsflash-personal-slights`, then `newsflash-signoff` | Act 2, W-O-O-F News bulletin 1, after `chime-news`. |
| `bulletin2-opening`, then one of the 25 `bulletin2-<family>-<level>` lines, then `bulletin2-signoff` | Act 3, bulletin 2, after `sounder-bulletin`, 3 to 5 minutes after you arm it. |
| `woof-close-studio-open`, `woof-close-field-murderer`, `woof-close-field-motive`, `woof-close-field-victim`, `woof-close-field-out`, `woof-close-studio-close` | Act 7, the closing bulletin. |

## The pad rule

Start every file with **one second of silence**. The AirPlay chain takes a
moment to wake up, and without the pad the first part of the sound is lost.
Keep each file short: two to five seconds is plenty. Nothing waits for a sound
to finish.

## Until the recordings exist

`node scripts/make-placeholder-sounds.mjs` writes a stand-in tone for every
id that has no file yet, each with the pad, each a different little figure so
you can tell them apart. The relay refuses to start while any id has no file,
so run this once before the first rehearsal. Replace a stand-in by dropping
your recording in with the same name and deleting the `.wav`.

Check one from the brain's terminal: `afplay media/chime-news.wav`.

---

## For Claude Code (technical)

The catalogue is `SOUND_IDS` in `functions/lib/screen.js`, mirrored in
`cues/lib/cues.js` (a test on each side checks they match). The server writes
`nights/{id}/public/sounds.current = { id, at }`; the relay's planner plays a
known id once per stamp and refuses an unknown one with a count-only log line.
Beats name their sound in `seed/night.json` (`sound`, and `soundOnce` for the
door, which the relay drawing has usually rung already); the blackout and
power commands, the study finish (`sting-solved`) and the relay's done
transition (`sting-door`) write theirs in code. `media/*` except this page is
gitignored.
