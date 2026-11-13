# The pets' voices: made, and kept off the site

This folder holds one small MP3 for every line a pet can say (about 830), in
that pet's own voice. `npm run pet-voices` makes them here and plays nothing
while it works. They are MP3s so that any player opens them.

The voices are natural ones, from a voice model that is already on this Mac
(Kokoro, through the mlx-audio package). It is free, nothing is downloaded
and nothing leaves the Mac. The Mac's own voices, the robotic ones, are not
used (Jon, 12 November 2026: "I need better voices. not robotic at all.").

The files are **not** part of the site while they sit here: a copy of them
goes into the site's folder only with `--on`. They are on since 12 November
2026 (Jon: "Publish it all"; `goOut` in `seed/pet-voices.json` says so).

| To do this | Run this |
| --- | --- |
| Put every pet's voice on the site at the next publish | `npm run pet-voices -- --on` |
| Only Sir Irwin's (his dessert speech on the Parlour TV) | `npm run pet-voices -- --on irwin` |
| Take them all off again | `npm run pet-voices -- --off` |

`--on` copies the files into `play/public/voice/pets/`, where the site's
build finds them. With none there, no pet speaks and no Hear button shows,
and nothing else changes.

## Who sounds like what

Jon's casting (12 November), each chosen by ear: Granolia is a British girl
(a kid), slow; Boo a French woman's voice, slow; Salem a rough British man;
Zimothy an old British man; Sir Irwin a young Australian boy (a British
boy's voice; `accent` gives it the Australian vowels). Each pet's voice, pace and pitch are in
`seed/pet-voices.json`,
with the other voices to choose from. A pitch above 1 makes a voice younger
and smaller (that is how a kid is made); below 1, bigger and deeper. `lower`
brings a voice's note down and keeps its size: a child's voice that speaks
low.
Change a pet there and run `npm run pet-voices`: that pet's lines are made
again (a few minutes).

`auditions/` holds what Jon was sent to choose from by ear, each file with
its choices numbered aloud, and `which-voice-is-which.json` there says which
voice each number is. His picks are in `seed/pet-voices.json`.

If the voices are on the site's folder, run `npm run pet-voices -- --on`
again after any change, then publish: the site's folder is a copy.

These files are not saved in git.
