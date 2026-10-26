# The sound files

This folder, on the brain, holds the nine cue sounds and the W-O-O-F News
recordings. The cue relay (`cues/`) on the brain plays them through the
Mac's sound output (the AirPlay speaker group). It knows file names and
nothing else: no file here says what it is for beyond its name.

The files themselves are not kept in the repo (they are big, and they are
yours). Only this page is.

## The nine cue sounds

Name each file after its id. Any of `.m4a`, `.mp3`, `.wav` or `.aiff` works;
the first one found wins. Nine since 25 October 2026 (Jon's cue list; the
question *cueSounds*, built to its default): there is no power sound any
more, the power's return is the lights and the music coming back.

**Two are required.** The brain will not start while `chime-phone` or
`blackout` has no file. It says how many are missing, never which.

**One chime for every chime moment.** Record one chime, `chime-phone`. The
three other chimes (`chime-news`, `chime-irwin`, `sounder-bulletin`) play
that same file when they have none of their own, so you need not record
them; if you do, each plays its own.

**The stings are optional.** With no file, that moment is silent and the
night goes on. When the brain starts it says how many optional sounds have
no file ("4 optional sounds have no file: silent at those moments").

| File | When it plays | |
|---|---|---|
| `chime-phone` | Every "look at your phone" moment, and the house chime: the sound test in the rules, supper is ready, the start of Act 4 and every Act 4 round, dessert, the call to the Parlour before Sir Irwin, the start of Act 6. One short chime. | required |
| `blackout` | End of Act 1, every phone and every light goes dark. Big thunder, a crash, a scream: it has to hit hard. | required |
| `chime-news` | Act 2, W-O-O-F News bulletin 1 comes up on the Parlour TV. | plays `chime-phone` if missing |
| `sounder-bulletin` | Act 3, bulletin 2, during supper, 3 to 5 minutes after you arm it. | plays `chime-phone` if missing |
| `chime-irwin` | Act 5, Sir Irwin is about to speak on the Parlour TV. | plays `chime-phone` if missing |
| `sting-solved` | Act 4, a group has solved the study. | optional |
| `sting-door` | Act 6, the third picture is named and the bedroom door opens. | optional |
| `sting-reveal` | Act 7, the reveal begins on the Parlour TV. | optional |
| `sting-result` | Act 7, every phone shows its own result. | optional |

The cake's song is not a file here: *Happy Birthday for Dogs* lives in the
Music library on the brain (`docs/cues-relay.md`, the music steps).

## The W-O-O-F News recordings

**Who reads them (decided 24 October).** Susan plays Ava Waves, the studio
anchor: bulletin 1's opening and sign-off (on camera), all of bulletin 2
(its opening, the 25 family lines and its sign-off), and the closing
bulletin's `woof-close-studio-open` and `woof-close-studio-close`. Jon plays
Mic Cameron, the field reporter: the closing bulletin's four
`woof-close-field-` parts, outside the manor. Bulletin 1's five family
clips play over B-roll. The W-O-O-F News Recording Script has the same cast
in its Cast line at the top.

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

**Bulletin 1 and the closing bulletin as video (decided 23 October).** The
Parlour TV plays these two as video, with the TV's own sound; everyone is in
the Parlour for both. When it does, the brain still rings `chime-news` but
does not play those recordings, so you never hear a line twice, and the
music stays at a whisper for a minute and a half while the video plays
(`videoHoldSeconds` in `cues/scenes.json`: tell Claude Code how long your
video runs). Keep the sound recordings in this folder as well: they are the
fallback if the video cannot play. The video files are the Parlour TV's,
not the brain's, so they do not go in this folder. Bulletin 2 is always
sound, through the HomePods.

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
window says how many it did not recognise; the nine cue sounds and the
captions still work. If you change the study's word, change it here too and
restart the brain.

## The pad rule

Start every file with **one second of silence**. The AirPlay chain takes a
moment to wake up, and without the pad the start of the sound is lost. Keep
the cue sounds short, two to five seconds (`chime-phone` shorter still,
about a second; `blackout` may run longer). The W-O-O-F News lines can be as long as the script needs:
the brain plays a bulletin's lines in order, each one starting when the one
before it ends.

## The music is not in this folder

The background music is three playlists in the Music app on the brain:
`Murderwin · Jazz`, `Murderwin · Intense` and `Murderwin · Credits`, plus the
song *Happy Birthday for Dogs* in the library for Cake!. The brain picks the
right one, at the right volume, as the night moves and dips it under every
sound in this folder. How to make them and when each plays:
`docs/cues-relay.md`.

## Bulletin 2 and the Orangerie HomePod

Bulletin 2 plays during supper, so the Orangerie HomePod must be in the
AirPlay group the brain plays to. Check it on the hardware evening: on the
brain, in the Murderwin folder, type `afplay media/sounder-bulletin.wav` (or
`.m4a`) and listen for it in the Orangerie.

## Until the recordings exist

`node scripts/make-placeholder-sounds.mjs` writes a stand-in tone for each of
the nine cue sounds that has no file yet (the optional ones too, so a
rehearsal hears every moment), each with the pad, each a different little
figure so you can tell them apart. Run it once before the first rehearsal. Replace a stand-in by dropping your recording in with the same
name and deleting the `.wav`. The W-O-O-F News lines need no stand-ins: until
you record them they are skipped and the captions carry the words.

Check one from the brain's terminal: `afplay media/chime-news.wav`.

---

## For Claude Code (technical)

Two catalogues. `SOUND_IDS` (the nine since 25 Oct 2026, no `power`) in
`functions/lib/screen.js` and `CLIP_IDS` (the 40 recordings, built from
`seed/woof-news.json`) in `functions/lib/news.js`, both mirrored in
`cues/lib/cues.js`; a test on each side checks they match. In
`cues/lib/cues.js`: `REQUIRED_SOUND_IDS` (`chime-phone`, `blackout`),
`CHIME_FALLBACK` (the three other chimes to `chime-phone`),
`OPTIONAL_SOUND_IDS` (the four stings); `soundFileFor` picks the file or the
fallback, `soundFileReport` and `soundFilesLines` make the count-only
start-up lines, and the relay exits 2 only on a missing required sound. The server writes `nights/{id}/public/sounds.current
= { id | null, at, clips?, video? }` through `screen.play`: `id` is one of
`SOUND_IDS`, or null for recordings only (the closing bulletin's parts, from
`finale.stage`); `clips` lists the recordings; `video: true` means the
Parlour TV plays them as video, so the relay plays the id and never the
clips (a clips-only cue with `video` plays nothing and does not duck the
music), logging the count only. Since 23 October, on a night
with a station key saved (`meta/game.station_key`), no public doc carries a
clip id: each clip goes out as a code derived from the clip id and that key,
and the relay derives the same code for each file in `MEDIA_DIR` from
`STATION_KEY` in `cues/.env`, so a family never shows on a public doc or in
the relay's log (`clipCode` / `clipReader` in `cues/lib/cues.js`; keys under
four characters are ignored, as the Host tab refuses them; with no key
saved, a rehearsal, the ids go as they are and still play). The relay's
planner plays a known id once per stamp (then the matched clips in order),
refuses an unknown id with a count-only log line, and counts unmatched clips
(`unknown`). `cues/lib/player.js` plays one cue at a time (a chime with no
file through the fallback, logged "the one chime stands in"), skips missing
files with a count, and a newer cue kills the `afplay` that is running; its
one log line per cue is `playLine`, counts only. The closing parts' timing is
`holdMs` per part (`news.closingStage`, `finale.cardAt`). Writers: a beat's
`sound` in `seed/night.json` (`soundOnce` for the door, which the drawing has
usually rung already) through `screen.onBeat`, which adds bulletin 1's clips
(`news.bulletin1`); bulletin 2 through `screen.tickBulletin`
(`news.bulletin2`, after `arm:bulletin`); the blackout command (the power's
return plays nothing since 25 Oct); the Host tab's Sound test
(`chime-phone`); `run.studyFinished` (`sting-solved`); `relay.guess` in its
done transaction (`sting-door`); `finale.stage` (the closing parts,
`news.closingStage`). The stand-in maker covers `SOUND_IDS` only, all nine.
`media/*` except this page is gitignored.
