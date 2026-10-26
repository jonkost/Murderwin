# The loops

The looping graphics every idle screen plays (your cue list, 25 October 2026:
"unless otherwise cued, every active screen shows a looping graphic"). Drop
each file in this folder with exactly this name, then `npm run deploy:site`.
Until a file is in, that screen shows its crest and a line instead, so nothing
waits on them. The files stay local on your Mac and go up with the deploy,
like the sounds in `media/`: they are never committed (`.gitignore` keeps
everything in this folder but this page out of the repo).

| File | Screen | What is in it |
|---|---|---|
| `living.mp4` | The Parlour TV (`?kiosk=living`) | Sir Irwin in the Parlour. Also the picture beside the join code in Act 1 and at the dinner wrap-up. |
| `study.mp4` | The study screen (`?kiosk=study`) | Granolia. |
| `memory.mp4` | The Library (`?kiosk=memory`, and the iPad Pro as `?kiosk=ipad` whenever it has no words to show) | Zimothy in the Library. |
| `bedroom.mp4` | The bedroom screen (`?kiosk=bedroom`), behind "The door is closed" | Salem in the bedroom. |
| `boo.mp4` | The projector (`?kiosk=boo`) | Sir Irwin's portrait and Boo walking, mapped to the space above the Parlour. |

Those five are the ones to make. A sixth, `orangerie.mp4`, is optional: the
brain's browser in the Orangerie (`?kiosk=orangerie`) plays it if it is there
and shows its crest if not.

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
not play (wrong codec, a typo in the name), the crest shows and nothing else
changes: check the name against the table above and the file's codec.
