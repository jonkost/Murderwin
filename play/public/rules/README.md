# The rules film: your recordings and your slides

The Parlour TV plays the rules film by itself at The house rules, straight
after the intro video: your own 28 slides, each with your recording for it,
whole.

- One sound file a slide, `rules-01-cover.m4a` to `rules-28-good-luck.m4a`.
- One picture a slide, with the same name: `rules-01-cover.jpg` to
  `rules-28-good-luck.jpg`. These are your slides exactly as you made them.

Do not put files here by hand. Record each line as its own file, named as in
`docs/rules-voiceover-manifest.md`, into any folder. Put your rules deck,
downloaded as a PDF with all 28 slides, in that folder or the one above it.
Then ask Claude Code to run:

    npm run rules-film -- "/path/to/that/folder"

It trims the quiet at each end of each recording, evens the loudness, turns
each page of the deck into its slide's picture, and puts everything here.
Nothing of yours is cut, reworded or reordered. A retake is the same name
again; run the command again.

`npm run media` says how many are in and whether the film shows your own
slides. Until all 28 pictures are in, the film shows slides drawn in code.

These files are not kept in git (like the videos). They go live with
`npm run deploy:site` from this Mac's own Murderwin folder.
