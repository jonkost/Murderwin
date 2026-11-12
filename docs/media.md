# Where the media goes

One page for every file the night plays: which folder, what to call it, and
what to do after dropping it in. Written 11 November 2026.

**The easy way (11 Nov 2026): one folder.** Put every export in one folder,
then ask Claude Code to sort it, or type `npm run media-import --
"/path/to/the folder"` (with no path it reads a folder called `media-in` in
the Murderwin folder). It copies each file to the right place below, makes
the videos small enough for the house wifi (your exports are 4K), puts the
second of silence on the sound recordings, builds the name cards, and then
runs the media check. Your originals are never moved or changed. Name the
files as below; anything it does not know is listed and left alone.

To see what is in and what is missing, ask Claude Code to run the media
check, or type `npm run media` in the Murderwin folder on the brain. It also
names any file the game will not find, such as a misspelt one. `npm run
media -- --live` also says which files are online.

| What | Folder (inside the Murderwin folder on the brain) | Names | After you add files |
|---|---|---|---|
| The nine cue sounds (the chime, the blackout, the stings) | `media/` | `chime-phone`, `blackout`, then the optional ones. The list is in `media/README.md`. | Nothing to publish. Start the brain again. |
| The W-O-O-F News sound recordings (40 lines) | `media/` | Each file named as its line in the Recording Script, for example `bulletin2-food-3.m4a`. The list is in `media/README.md`. | Nothing to publish. Start the brain again. |
| The bulletin videos (13 parts: bulletin 1 and the closing bulletin) | `play/public/video/` | `newsflash-opening.mp4` and so on. The list is in `play/public/video/README.md`. | `npm run deploy:site`. They play by themselves. The box **Show the words instead** on the workshop's Game night page turns them off. |
| The closing bulletin's own clips (11 Nov 2026) | `play/public/video/` | From your folder: `woof-close-name-<character>.mp4` (you saying each name, 14), `woof-close-motive-<number>.mp4` (19) and `woof-close-field-trans-static.mov` (the static). The import turns each name clip into two videos, the Murderer card and the Ghost card with your voice (`woof-close-murderer-…`, `woof-close-ghost-…`), from the still cards in `play/public/reveal/`. | `npm run deploy` (the whole thing the first time, since the timing is new), with the videos box ticked. |
| The intro video | `play/public/video/sirwin-intro.mp4` (from `Sirwin_Intro.mov`) | The Parlour TV plays it by itself at The house rules (since 12 Nov 2026). | `npm run deploy:site`. |
| The five loops for the idle screens | `play/public/loops/` | `living.mp4`, `study.mp4`, `memory.mp4`, `bedroom.mp4`, `boo.mp4` (and `orangerie.mp4` if you make one). | `npm run deploy:site`. |
| Sydney's photo for the end credits | `play/public/household/` | `sydney.jpg` | `npm run deploy:site`. |
| The cats' and Sir Irwin's pictures | `play/public/household/faces/` and `full/` | Exact names in `play/public/household/README.md`. | `npm run deploy:site`. If you swap a face, ask Claude Code to fit it again. |

Not files in the Murderwin folder:

- **The music.** Three playlists in the Music app on the brain: Murderwin ·
  Jazz, Murderwin · Intense and Murderwin · Credits, and the song Happy
  Birthday for Dogs for Cake!.
- **The rules deck.** It plays from a second browser tab on the Mac that
  drives the Parlour TV, at "The house rules", after the intro video (the
  game plays the intro by itself). The game does not play the deck, so it can
  live anywhere on that Mac.

Rules that hold for every file:

- The name is exact: small letters and hyphens for the sounds and videos, no
  spaces. A file with another name is never found, and the night carries on
  without it.
- Sounds: `.m4a`, `.mp3`, `.wav` or `.aiff`, with one second of silence at
  the start. Videos and loops: `.mp4` (H.264).
- Nothing waits on a missing file. A missing sound is silent (only the chime
  and the blackout are required), a missing recording or video shows its
  words instead, a missing loop shows the crest.
- None of these files are kept in the repo. They live on the brain; the ones
  for the screens go up when you publish the site.

## For Claude Code

`scripts/media-check.mjs` (`npm run media`): reads `MEDIA_DIR` from
`cues/.env` (else `media/`), `play/public/video`, `play/public/loops` and
`play/public/household/sydney.jpg`; the ids come from `cues/lib/cues.js`
(`SOUND_IDS`, `CLIP_IDS`). It prints the banks' own names, which are open;
which line a night plays is that night's pick and nothing here knows it.
`--live` sends a HEAD to the site for each video, loop and the photo (a
missing file answers with a web page). `play/public/video/*` is gitignored
like the loops.
