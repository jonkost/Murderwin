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

# The pets' voices (the folder `pets`)

Since 12 November 2026 every pet can have a voice of its own. The folder
`pets` holds one small MP3 for every line a pet can say: about eight
hundred, with names worked out from the words themselves, so nobody has to
file them.

**The folder is empty until Jon says yes.** The files are made and kept in
`pet-voices/`, at the top of the project, which is no part of the site. With
none here, no pet speaks and no Hear button shows, and nothing else changes.

| Who | Where it is heard |
| --- | --- |
| Granolia, Miss Boo LaRue, Zimothy and Salem | On a guest's own phone, when the guest presses Hear on that cat's card. A cat never speaks by itself. |
| Sir Irwin | On the Parlour TV at dessert: his speech and the motives he names, once, as they come up. |

The words always show, voice or no voice.

## Make them

    npm run pet-voices

It makes what is missing, one voice a pet, into `pet-voices/`, and plays
nothing while it works. The voices are natural ones, from a voice model that
is already on this Mac: free, nothing downloaded, nothing sent anywhere. Each
pet's voice, pace and pitch are in `seed/pet-voices.json`, with the others to
choose from (Jon's casting: kid-like for Sir Irwin and Granolia, sexy and
sassy for Boo, a rough man for Salem, an old man for Zimothy). To change one,
change it there and run it again: that pet's files are made again.

## Turn them on, and off

    npm run pet-voices -- --on

copies every pet's files into this folder, and the next publish of the site
takes them along. `npm run pet-voices -- --on irwin` copies Sir Irwin's only.

    npm run pet-voices -- --off

empties this folder again.

After any change to a voice, run `npm run pet-voices -- --on` again before
you publish: this folder is a copy of the kept one.

## Use your own voice

Not by hand: the file names come from each line's words, and the command
makes a file again when that pet's voice changes. If you want to record a
line yourself, tell Claude Code which line.

These files are not saved in git either.
