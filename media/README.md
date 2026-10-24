# The sound files

This folder, on the brain, holds the ten cue sounds and the W-O-O-F News
recordings. The cue relay (`cues/`) on the brain plays them through the
Mac's sound output (the AirPlay speaker group). It knows file names and
nothing else: no file here says what it is for beyond its name.

The files themselves are not kept in the repo (they are big, and they are
yours). Only this page is.

## The ten cue sounds

Name each file after its id. Any of `.m4a`, `.mp3`, `.wav` or `.aiff` works;
the first one found wins.

| File | When it plays |
|---|---|
| `chime-news` | Act 2, W-O-O-F News bulletin 1 comes up on the Parlour TV. |
| `sounder-bulletin` | Act 3, bulletin 2, during supper, 3 to 5 minutes after you arm it. |
| `chime-irwin` | Act 5, Sir Irwin is about to speak on the Parlour TV. |
| `sting-solved` | Act 4, a group has solved the study. |
| `sting-door` | Act 6, the third picture is named and the bedroom door opens. |
| `sting-reveal` | Act 7, the reveal begins on the Parlour TV. |
| `sting-result` | Act 7, every phone shows its own result. |
| `blackout` | End of Act 1, every phone goes dark. |
| `power` | The power returns and Act 2 begins. |
| `chime-phone` | Every "look at your phone" moment: the supper chime, the start of Act 4, each Act 4 round change, the call to the Parlour before Act 5, and the start of Act 6. One short chime. |

The brain will not start while any of these ten has no file. It says how
many are missing.

## The W-O-O-F News recordings

**How to name them.** One file per line in the W-O-O-F News Recording
Script. Name each file exactly as the script names its line: small letters,
hyphens, no spaces, then the ending. For example `newsflash-opening.m4a`.
Any of `.m4a`, `.mp3`, `.wav` or `.aiff` works. The full list is also in
`seed/woof-news.json` (each line's `clip`).

| Files | When they play |
|---|---|
| `newsflash-opening`, then one of `newsflash-food`, `newsflash-bathroom`, `newsflash-screens`, `newsflash-out-and-about`, `newsflash-personal-slights`, then `newsflash-signoff` (7 files) | Act 2, bulletin 1, straight after `chime-news`. |
| `bulletin2-opening`, then one of the 25 family lines, then `bulletin2-signoff` (27 files) | Act 3, bulletin 2, straight after `sounder-bulletin`. |
| `woof-close-studio-open`, `woof-close-field-murderer`, `woof-close-field-motive`, `woof-close-field-victim`, `woof-close-field-out`, `woof-close-studio-close` (6 files) | Act 7, the closing bulletin, in parts as you press each name. |

Bulletin 2's 25 family lines are `bulletin2-<family>-<level>`. The family
word is one of `food`, `bathroom`, `screens`, `out` or `personal` (shorter
than bulletin 1's names: `out` is Out and about, `personal` is Personal
slights). The level is 1 to 5: 1 is the most obscure, 5 the plainest. So
`bulletin2-food-1` to `bulletin2-food-5`, then the same for each family, up
to `bulletin2-personal-5`.

**How they play.** The brain plays a bulletin's sound, then its lines one
after another, each starting when the one before it ends. In Act 7 each name
you press plays its lead-in first, and the TV holds the name card until that
line has had time to play. Pressing the next name cuts off whatever
recording is playing, so two never talk over each other.

The TV cannot hear the speakers. It waits as long as each closing line is
set to run (`holdMs` in `seed/woof-news.json`, a guess for now). Once your
closing recordings exist, tell Claude Code how long each one runs.

**Missing ones are skipped.** A line with no file yet is skipped and the
rest of the bulletin plays. The words are on the TV and the iPad as captions
anyway, so nothing is lost. Missing recordings never stop the brain from
starting.

**Sound only, as built.** The game plays sound files only. The TV shows the
words, and in Act 7 the Murderer, Motive and Victim cards. A video file in
this folder would never play. Whether bulletin 1 and the closing bulletin
become video on the living room TV is an open decision for you on the board
(*newsVideo*). Answer it before you film anything.

**What the brain prints.** Counts only, for example "sound playing;
bulletin: 3 recordings, 1 missing". At the start it says how many of the 40
recordings have a file. Never a sound's name or a file name. That is on
purpose: bulletin 2's file names say which family a line is about, and you
keep the brain's window in view all night.

**The brain needs the study's key word.** The recordings reach the brain
under codes, not their names, so nothing anyone can see names a family. The
brain works out the code for each of its own files from the file name and a
key word. That word is the one you typed on your phone's Host tab under *The
study* (the same word as in `station/.env` on the study Mac). Put it in
`cues/.env` on the brain as `STATION_KEY=yourword`. Without it the brain
cannot match the codes to your files, so it skips the recordings and its
window says how many it did not recognise; the ten cue sounds and the
captions still work. If you change the study's word, change it here too and
restart the brain.

## The pad rule

Start every file with **one second of silence**. The AirPlay chain takes a
moment to wake up, and without the pad the start of the sound is lost. Keep
the ten cue sounds short, two to five seconds (`chime-phone` shorter still, about a second). The W-O-O-F News lines can be
as long as the script needs: the brain plays a bulletin's lines in order,
each one starting when the one before it ends.

## Bulletin 2 and the Orangerie HomePod

Bulletin 2 plays during supper, so the Orangerie HomePod must be in the
AirPlay group the brain plays to. Check it on the hardware evening: on the
brain, in the Murderwin folder, type `afplay media/sounder-bulletin.wav` (or
`.m4a`) and listen for it in the orangery.

## Until the recordings exist

`node scripts/make-placeholder-sounds.mjs` writes a stand-in tone for each of
the ten cue sounds that has no file yet, each with the pad, each a different
little figure so you can tell them apart. Run it once before the first
rehearsal. Replace a stand-in by dropping your recording in with the same
name and deleting the `.wav`. The W-O-O-F News lines need no stand-ins: until
you record them they are skipped and the captions carry the words.

Check one from the brain's terminal: `afplay media/chime-news.wav`.

---

## For Claude Code (technical)

Two catalogues. `SOUND_IDS` (the ten) in `functions/lib/screen.js` and
`CLIP_IDS` (the 40 recordings, built from `seed/woof-news.json`) in
`functions/lib/news.js`, both mirrored in `cues/lib/cues.js`; a test on each
side checks they match. The server writes `nights/{id}/public/sounds.current
= { id | null, at, clips? }` through `screen.play`: `id` is one of
`SOUND_IDS`, or null for recordings only (the closing bulletin's parts, from
`finale.stage`); `clips` lists the recordings. Since 23 October, on a night
with a station key saved (`meta/game.station_key`), no public doc carries a
clip id: each clip goes out as a code derived from the clip id and that key,
and the relay derives the same code for each file in `MEDIA_DIR` from
`STATION_KEY` in `cues/.env`, so a family never shows on a public doc or in
the relay's log (`clipCode` / `clipReader` in `cues/lib/cues.js`; keys under
four characters are ignored, as the Host tab refuses them; with no key
saved, a rehearsal, the ids go as they are and still play). The relay's
planner plays a known id once per stamp (then the matched clips in order),
refuses an unknown id with a count-only log line, and counts unmatched clips
(`unknown`). `cues/lib/player.js` plays one cue at a time, skips missing
files with a count, and a newer cue kills the `afplay` that is running; its
one log line per cue is `playLine`, counts only. `missingSoundFiles` checks
the ten only; the closing parts' timing is `holdMs` per part
(`news.closingStage`, `finale.cardAt`). Writers: a beat's `sound` in
`seed/night.json` (`soundOnce` for the door, which the drawing has usually
rung already) through `screen.onBeat`, which adds bulletin 1's clips
(`news.bulletin1`); bulletin 2 through `screen.tickBulletin`
(`news.bulletin2`, after `arm:bulletin`); the blackout and power commands;
`run.studyFinished` (`sting-solved`); `relay.guess` in its done transaction
(`sting-door`); `finale.stage` (the closing parts, `news.closingStage`). The
stand-in maker covers `SOUND_IDS` only. `media/*` except this page is
gitignored.
