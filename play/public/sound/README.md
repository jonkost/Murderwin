# The cue sounds the screens and phones play

Every room screen and every phone plays the night's sounds itself: the
chimes, the stings and the scream. The files here are those sounds, one a
cue, named after the cue: `chime-phone.mp3`, `chime-news.mp3`,
`sounder-bulletin.mp3`, `chime-irwin.mp3`, `sting-solved.mp3`,
`sting-door.mp3`, `sting-reveal.mp3`, `sting-result.mp3`, `blackout.mp3`.

Do not put files here by hand. Put your sound in `media/` (or in your exports
folder and run `npm run media-import`), then run `npm run web-sounds`. It
cuts the silence off the front, makes it loud and writes it here.

A cue with no file here plays a fuller sound the game makes itself. The
stand-in tones are never copied here. The W-O-O-F News recordings are never
here either: the brain speaks those.

These files are not kept in git, like the videos. Publish from the main
folder on the brain, where they are.
