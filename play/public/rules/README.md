# The rules film's recordings

One sound file a slide, `rules-01-cover.m4a` to `rules-28-good-luck.m4a`: the
narration for the rules film the Parlour TV plays by itself at The house
rules, straight after the intro video.

Do not put files here by hand. Record each line as its own file, named as in
`docs/rules-voiceover-manifest.md`, into any folder, then ask Claude Code to
run:

    npm run rules-film -- "/path/to/that/folder"

It trims the quiet at each end, evens the loudness, and puts the files here.
A retake is the same name again; run the command again.

These files are not kept in git (like the videos). They go live with
`npm run deploy:site` from this Mac's own Murderwin folder.
