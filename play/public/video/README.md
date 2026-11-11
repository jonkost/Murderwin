# The bulletin videos

The two W-O-O-F News bulletins the Parlour TV plays as video (decided 23
October 2026): bulletin 1 in Act 2 and the closing bulletin in Act 7. Drop
each file in this folder with exactly its name, then `npm run deploy:site`,
then tick **The bulletins are videos** on the workshop's Game night page.
Until the box is ticked the brain plays the sound recordings from `media/`
and the TV shows the words, so nothing waits on these.

The files stay on your Mac and go up with the deploy, like the loops: they
are never committed (`.gitignore` keeps everything in this folder but this
page out of the repo).

| File | What it is |
|---|---|
| `newsflash-opening.mp4` | Bulletin 1: Ava Waves opens. |
| `newsflash-food.mp4`, `newsflash-bathroom.mp4`, `newsflash-screens.mp4`, `newsflash-out-and-about.mp4`, `newsflash-personal-slights.mp4` | Bulletin 1: one clip for each family. The night plays one of the five. |
| `newsflash-signoff.mp4` | Bulletin 1: Ava Waves signs off. |
| `woof-close-studio-open.mp4` | The closing bulletin: the studio opens. |
| `woof-close-field-murderer.mp4`, `woof-close-field-motive.mp4`, `woof-close-field-victim.mp4`, `woof-close-field-out.mp4` | The closing bulletin: Mic Cameron outside the manor, one part for each name you press. |
| `woof-close-studio-close.mp4` | The closing bulletin: the studio closes. |

Thirteen files. The names are the same as each line's name in the W-O-O-F
News Recording Script, with `.mp4` on the end.

Rules for the files:

- MP4 (H.264 video, AAC sound). The TV plays the video's own sound.
- Small letters and hyphens, no spaces, exactly as above. A file with another
  name is never found.
- A part with no file shows its words on the TV instead, and the night goes
  on.
- Keep the sound recordings in `media/` as well: they are the fallback when
  the box is not ticked.

`npm run media` says which of the thirteen are in, and `npm run media --
--live` says which are online.

Bulletin 2 is never video: it is sound, from `media/` on the brain.
