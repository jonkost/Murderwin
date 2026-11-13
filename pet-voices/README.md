# The pets' voices: made, and kept off the site

This folder holds one small MP3 for every line a pet can say (about 830), in
that pet's own voice. `npm run pet-voices` makes them here and plays nothing
while it works. They are MP3s so that any player opens them.

The voices are natural ones, from a voice model that is already on this Mac
(Kokoro, through the mlx-audio package). It is free, nothing is downloaded
and nothing leaves the Mac. The Mac's own voices, the robotic ones, are not
used (Jon, 12 November 2026: "I need better voices. not robotic at all.").

The files are **not** part of the site while they sit here. No publish can
ship them by accident.

| To do this | Run this |
| --- | --- |
| Put every pet's voice on the site at the next publish | `npm run pet-voices -- --on` |
| Only Sir Irwin's (his dessert speech on the Parlour TV) | `npm run pet-voices -- --on irwin` |
| Take them all off again | `npm run pet-voices -- --off` |

`--on` copies the files into `play/public/voice/pets/`, where the site's
build finds them. With none there, no pet speaks and no Hear button shows,
and nothing else changes.

## Who sounds like what

Jon's casting (12 November): kid-like voices for Sir Irwin (a boy) and
Granolia (a girl), sexy and sassy for Boo, a rough man for Salem, an old man
for Zimothy. Each pet's voice, pace and pitch are in `seed/pet-voices.json`,
with the other voices to choose from. A pitch above 1 makes a voice younger
and smaller (that is how the two kids are made); below 1, bigger and deeper.
Change a pet there and run `npm run pet-voices`: that pet's lines are made
again (a few minutes).

`auditions/` holds the five numbered choices for each pet that Jon was sent,
and `which-voice-is-which.json` there says which voice each number is.

These files are not saved in git.
