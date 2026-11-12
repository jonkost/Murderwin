# Sir Irwin's voice

This folder holds Sir Irwin's voice for his drawing slides on the Parlour TV
(Act 6): one file a slide, and one for his line when the door opens.

| File | When it plays |
| --- | --- |
| `irwin-slide-1.m4a` to `irwin-slide-7.m4a` | Each of his seven rules slides, as it shows |
| `irwin-door.m4a` | "Pawsome!", when the door opens |

## Make them

In the Murderwin folder on your Mac:

    npm run irwin-voice

It makes all eight with the best English voice your Mac has, measures them,
and saves how long each one is (in `seed/irwin-voice.json`). Nothing plays
while it works. Then deploy as usual.

Each slide stays up for its voice plus one second. A slide with no file here
stays up for its old time and is silent. The words always show on the TV.

## Use your own voice

Record a line and save it here with the same name: `irwin-slide-3.m4a`, or
`irwin-slide-3.wav` (an `.mp3` or `.aif` works too). Then run
`npm run irwin-voice` again, and deploy.

Your recording is never replaced. The command only remakes the files it made
itself. Say the words on the slide (they are in `seed/irwin-lines.json`).

These files are not saved in git. They stay on this Mac and go up with a
deploy from this folder.
