# The loops

**Not needed since 12 November 2026.** You said: "For the loops just make the
classic dvd screen saver with the cats and dog face picture when it bounces
off the edge of the screen." So every idle room screen now plays that screen
saver: one of the five faces, Sir Irwin and the four cats, crosses the screen,
turns at every edge and becomes the next face there. There is nothing to make.

This folder still works, in case you ever want a looping video on one screen
(your cue list, 25 October 2026: "unless otherwise cued, every active screen
shows a looping graphic"). Drop a file in this folder with exactly its name
below, then `npm run deploy:site`, and that screen plays it in place of the
screen saver. The files stay local on your Mac and go up with the deploy,
like the sounds in `media/`: they are never committed (`.gitignore` keeps
everything in this folder but this page out of the repo).

| File | Screen | What is in it |
|---|---|---|
| `living.mp4` | The Parlour TV (`?kiosk=living`) | Sir Irwin in the Parlour. Also the picture beside the join code in Act 1 and at the dinner wrap-up. |
| `study.mp4` | The study screen (`?kiosk=study`) | Granolia. |
| `memory.mp4` | The Library (`?kiosk=memory`, and the iPad Pro as `?kiosk=ipad` whenever it has no words to show) | Zimothy in the Library. |
| `bedroom.mp4` | The bedroom screen (`?kiosk=bedroom`), behind "The door is closed" | Salem in the bedroom. |
| `boo.mp4` | The projector (`?kiosk=boo`) | Sir Irwin's portrait and Boo walking, mapped to the space above the Parlour. |

None of them is needed: each is optional. So is a sixth, `orangerie.mp4`, for
the brain's browser in the Orangerie (`?kiosk=orangerie`), which plays it if
it is there and the screen saver if not.

Rules for the files:

- MP4 (H.264), silent. The screens play them muted; the music is the
  HomePods'. A soundtrack in the file is ignored.
- Any length; it loops. Ten to sixty seconds is plenty.
- The screen's own shape: 16:9 for the TV, the study Mac and the projector
  (the projector file in whatever shape your mapping needs); 4:3 for an iPad.
  The screen fits the whole picture in (nothing is cropped), so a 16:9 file
  on an iPad gets bands above and below.
- Keep each under about 30 MB so the screens start quickly on the house wifi.
- Nothing in a loop may hint at the case: the loops are the same every night,
  so there is nothing they could know.

A loop plays from the moment the browser has its first frame. If a file will
not play (wrong codec, a typo in the name), the screen saver plays and nothing
else changes: check the name against the table above and the file's codec.
