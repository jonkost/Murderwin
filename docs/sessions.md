# Sessions

A short log of every working session on Murderwin, newest first. One entry
per session: the date, the tool (Claude Code or Claude chat), what changed,
what is left, and the decisions taken.

Claude Code adds an entry at the end of every session (`CLAUDE.md`, HOW WE
WORK). A Claude chat's session gets its entry when its handoff is applied.
Jobs are not tracked here: they live on the workshop Timeline. Decisions live
on the Canon.

## 14 Nov 2026, morning · Claude Code (the intro, the rules and the reveal on film; the credits' speed)

Jon: "I would like to see the rendering of the intro video right into the
rules and the reveal sequence".

- **Three videos for him**, in `media/renders/` on the brain (not in git),
  each sent to his phone (the two long ones as smaller copies: a file over
  30 MB does not reach it):
  1. the joins of the intro and the rules film, one minute;
  2. the whole intro and rules film, 16 minutes;
  3. the reveal as the Parlour TV plays it, five minutes, with a made-up
     answer drawn at random.
- **How they were made.** Six agents first read the code for the exact
  order, files and timings of both sequences and for the preview pages
  (three readers, each checked by a second). The intro and rules video is
  laid out with ffmpeg from the page's own numbers. The reveal is filmed
  from the real page: a small temporary page mounts the Parlour TV's own
  screen and feeds it the finale the way the server shapes it, a silent
  hidden Chrome films every frame, and the films' sound is laid under at
  the moments the page started them. The house music and the card chimes
  are not in it. The tools are kept in `media/renders/tools/`.
- **Found by filming, and fixed:** the end credits rolled at double speed
  and the TV then stood empty for about 36 seconds before the dedication;
  the counting bar ran twice as fast too. The screen redraws four times a
  second and wrote the moving time into the animation's delay each time.
  Measured in Chrome with the redraws on: 7.0 screen heights in ten seconds
  before, 3.5 after; the last line now leaves at 72.6 of 73 seconds. The
  fix keeps the start between redraws (`play/src/lib/finale.js` anchored
  and countingBar, `Kiosk.jsx` useAnchored). A review workflow (two
  readers, two checkers) found the fix right in every state (a hold, a
  carry-on, a reload, a longer roll) and two things, both done: the test
  now pins the hook and the keys, and the bar goes on from where it stood
  after a hold.
- **Measured and left for Jon:** the reveal's films are about 5 dB quieter
  than the intro, the rules and bulletin 1 (card 605); the portrait on the
  name cards is very small; the Motive card has no picture; the vote's time
  bar trails its clock by about a second (left).
- **The guide:** `docs/on-the-night.md` said the closing bulletin is video
  once a box is ticked; it is video unless Show the words instead is
  ticked. Put right.
- **The board:** cards 604 (done) and 605 (Claude Code, waits for his
  word).
- **Where it stood at 7:15 am:** every test passing; committed; not
  published, not pushed.

**Later the same morning: Sir Irwin's progress bar.** Jon: "Do you have the
irwin animation progress bar", then "there is a handover doc now". Claude
chat had made the bar with him on 9 Nov, but it was only in his claude.ai
project; `docs/handoff-2026-11-14-irwin-bar.md`, `docs/handoff-2026-11-09.md`
and the bar's page arrived in `docs/` at 9:29.

- **Applied.** The bar's page is `play/public/irwin-progress-bar.html`. While
  the Manor counts, the Parlour TV shows it in a frame over the old counting
  screen (`play/src/screens/IrwinBar.jsx`, `play/src/lib/irwinbar.js`); the
  plain bar and lists stay underneath and show if the bar has not said it is
  ready in a second and a half. Its cards are the stats, then the
  achievements the host gave. Site only; the server and the night's clock
  are untouched.
- **Checked in Chrome with the redraws on:** the bar fills evenly and is
  full at about 47.6 of 50 seconds, about two seconds before the screen
  moves on; a page loaded 25 seconds in starts at about 53 per cent; a hold
  stands it still and the carry-on goes on from there; a page loaded during
  a hold shows the night's own card; with the file missing the screen is
  dark for a second and a half, then the plain bar and lists.
- **Found by filming it:** the frame was squeezed to a strip ten pixels
  high, because its state was a class called "bar" and an old `.bar` rule
  took it. The measurements, which read the page's numbers, had all passed.
  The state is a data attribute now.
- **The review** (three readers, eight checkers) found four more, all done:
  a screen loaded during a hold would have shown the preview's sample
  cards; the font held the bar's script back; a carry-on started his bow
  again; a practice night's word Held was hidden.
- **Differences from the handoff** are listed at its top (the bar is given
  the count less 2.4 seconds so its ending is seen).
- **For Jon:** files 3 and 4 in `media/renders/` (the reveal with the bar,
  and the count alone). One question on the board, `tallyLength`, default as
  built.
- **Where it stands:** every test passes; committed; **not published and
  not pushed**. The live site still has the double-speed credits and the
  plain bar until Jon says publish (the site only).

## 13 Nov 2026, morning · Claude Code (Sir Irwin's pace, half way)

Jon, having heard the published voice: "Yes, good", and a few minutes
later: "Irwin is too slow now. split the difference".

- **What changed:** Sir Irwin's pace is 0.91, half way between the 1 Jon
  picked by ear ("12 Irwin - 5") and the 0.82 that went out last night
  (`seed/pet-voices.json`; the cast test holds it). His 28 dessert lines are
  made again (together 97 seconds before, 87 now; every one shorter, every
  one decodes). Seven of his eight drawing lines are made again the same
  way; slide 3 stays as published, since it was at 0.9 already (0.82 never
  fitted its slide). Every drawing line ends at least 0.9 seconds before its
  slide moves on, so `seed/irwin-voice.json` and the server are untouched.
  Last night's eight drawing files are kept in
  `pet-voices/irwin-slides/pace-0.82/`.
- **Where it stands:** made, measured and copied into the site's folder
  (`npm run pet-voices -- --on`); the scripts' tests (107) and the phone's
  tests (403) pass. **Not published:** the live site keeps the 0.82 lines
  until Jon says publish. He has clip 16 ("16 Sir Irwin - half way", the
  same four lines as clip 15, 22 seconds where that was 24) to hear first.
- **Pushed:** Jon pushed everything himself at 8:04 am (his own commit
  415c8a9, the practice nights' logs and a picture of the join screen in
  `docs/postmortems/`), so the "not pushed" notes of 12 Nov are put right.
  This morning's commit is not pushed.
- **The board:** five open Claude Code cards, none from the Game test tab
  and no postmortem note. No new card.
- **Left:** his word to publish (the site only: the 35 changed sound
  files); card 603, hearing the pets on a real phone and the Parlour TV. A
  phone that has already played a line may keep the old one for up to an
  hour after a publish.

**Later the same morning, before any publish: a new direction for Sir
Irwin.** Jon: "Lets go with a young British circa 1900, I feel the vibe of
Pip from great expectations".

- **Clip 17** went to him: six young British boy voices, plain British, the
  same two lines each, at pace 0.91 (`pet-voices/auditions/`; the list there
  says which is which). Measured, not heard: numbers 1 and 2 sit lowest (an
  older boy), number 4 highest (the youngest).
- **The 1900 way of speaking** was designed three ways and each design
  checked against the model's own sounds and all 36 of his lines, as text
  only (a workflow of six agents). What they agreed on is built into the
  talker as two new accents, `pip-light` (the short -y of "very" and
  "pretty", the closer vowel of "wagging" where a word is stressed, "air"
  and "care" as a glide) and `pip-fuller` (the same, with "orf" for off and
  "gawn" for gone). Turned down, each for a reason found in the check: a
  tapped r (the model's tap is the American one: "veddy"), an older "oh"
  (the model has only the American one), "hw" in when and what, a dropped
  g. The new tables are patterns, where the Australian ones are plain
  swaps; the Australian tables give exactly what they gave (72 of 72
  checks). `pip-light` changes 26 different words in 19 of his 36 lines,
  `pip-fuller` 30 in 21; every sound is one the model has.
- **Clip 18** went to him: voice 1 said three ways, plain, `pip-light`,
  `pip-fuller`.
- **Where it stood at midday:** the cast unchanged, waiting for his picks.

**The same evening (about 9:45 pm): his picks, and the breed canvas.**

- Jon: "17 Irwin 3 - slightly deeper, slower". Clip 19 went to him: that
  voice at four strengths. Then: "19-4. for irwins voice".
- **Sir Irwin's voice is set:** a blend of two British voices
  (`bm_daniel,bf_alice`), pace 0.82, pitch 1.12, plain British, no accent
  (`seed/pet-voices.json`; the cast test holds it). He picked nothing from
  clip 18, so the two 1900 ways of speaking stay in the talker unused.
- His 28 dessert lines are made again (94 seconds together; every one
  decodes) and his eight drawing lines too. Seven are at 0.82; slide 3 is
  at 0.89, the slowest pace at which it ends 0.9 seconds before its slide
  moves on (the model's pace moves in steps: 0.88 gave 9.6 seconds, 0.9
  gave 8.4, and the spoken parts shrank together, so no word was lost).
  All eight fit; `seed/irwin-voice.json` and the server are untouched. The
  Australian sets are kept in `pet-voices/irwin-slides/`.
- All of it is in the site's folder (`npm run pet-voices -- --on`); the
  scripts' tests (107) and the phone's tests (403) pass. Clip 20 went to
  him: the voice as it will go out. **Not published:** the live site still
  has the Australian voice at 0.82.
- **The breed canvas** (a comment of his on it, sent to this session: "Do
  the reveal from the largest breed to the smallest but percentage"): the
  canvas now shows the biggest breed landing first, then the rest
  following from largest to smallest; answered in the comment's thread. It
  is a drawing only: the breed moment is still not built (the decision
  breedMoment, default left out).
- **Published, the site only, 13 Nov at about 9:58 pm** (dde3cf0, on
  Jon's "Yes, publish"). Before: the built folder matched the live site
  (1,136 of 1,136) and every test passed (functions 433, cues 126, station
  90, app 175, play 403, scripts 107). The new build against the live one:
  1,080 files the same, 38 changed (his 28 dessert lines, his 8 drawing
  lines, the page's own stamp and its index), the cats' 806 lines byte for
  byte as they were. The 18 older page parts were kept for any screen left
  open. After: 1,140 of 1,140 files match the live site, and a dessert
  line and slide 3 fetched from the site are the new files byte for byte.
  The server and the rules were not touched. The checks and the fake
  nights were not run again: nothing they cover changed.
- **Left:** card 603 (nobody has heard the pets on a real phone or the
  Parlour TV); a phone or screen that has already played one of his lines
  may keep the old one for up to an hour; not pushed (four commits since
  Jon's push of the morning). Start Here has the day's note.

## 12 Nov 2026, late night · Claude Code (voices for the pets; is the night fun, and Jon's own load)

Jon: "Can we get voices reading for the pets. Do the plan/run of the game
make sense? Does it seem fun. I'm worried I'll be too stressed to fully
enjoy."

**Published, the site only, 12 Nov at about 10:47 pm** (353d519, on Jon's
"Publish it all"; the fourth publish of the day; not pushed)

- What went out: the Host tab's guards and the party-day warning, the
  workshop's Game night cards and Devices page, the two lines for the host
  to say, the board's new cards, all five pets' voices (834 MP3s; `goOut`
  all; the question *petVoices* answered yes) with the Hear button and Sir
  Irwin's dessert speech, and Sir Irwin's eight drawing lines in his new
  voice.
- "Slow it down" came with the publish and was taken as Sir Irwin, the one
  voice at full pace: 0.82 now (his dessert lines run 1.7 to 3.6 words a
  second). His drawing lines are at the same pace, slide 3 at 0.9, so that
  every line ends at least 0.9 seconds before its slide moves on: the
  server still holds the old lengths (`seed/irwin-voice.json` is unchanged
  on purpose, so there was no server change). The eight old robotic files
  are kept in `pet-voices/irwin-slides/old-robotic/`.
- The steps: `hosting/` matched the live site before (297 of 297) and a
  copy was kept; the site was built and checked; the 14 older page parts an
  open room screen may still be running were put back; `firebase deploy
  --only hosting`; and every one of the 1,136 files matched the live site
  after (1,103 byte for byte, 33 large ones by size). The Study's code did
  not change. A voice file that does not exist answers 404, which the page
  takes as no voice. A browser keeps a voice file an hour at most, so no
  screen can still hold an old robotic slide line by Sunday.
- A third review, of the accent and the note-lowering steps (two readers,
  then refuters): the accent reads back as the moved sounds on every one of
  Sir Irwin's lines. Small fixes: a word touching a bracket keeps its plain
  sounds; a number in digits is moved like a word; an accent's table is
  never changed in place (a changed table gets a new name); a test holds the
  two lists of accents together.
- Not done: a push, the server, the rules. Not heard on a real phone or TV
  by anyone: card 603 is Jon's. The press of Hear on a phone page was not
  finished in the browser (Jon's message cut it short); the button showed
  and its file loaded, and the tests cover the press.

**The pets' voices** (built, tested and published that night; the board's
question *petVoices* is answered: yes, all five)

- Every line a pet can say comes from an open bank of templates, so every
  one can be made ahead. `scripts/pet-lines.mjs` lists every way each line
  can be filled: 834 lines (the four cats' motive hints and bag lines, Sir
  Irwin's dessert speech and the nineteen rhymes). A test draws the dealer
  twelve thousand times and finds every dealt line in the list.
- First made with this Mac's own voices (`say`). Jon heard the sample: "I
  need better voices. not robotic at all." Those files are gone and that way
  is closed. A natural voice model was already on this Mac (Kokoro, through
  the mlx-audio package, there since May): free, nothing downloaded, nothing
  sent anywhere. `scripts/pet-voices-kokoro.py` says every line in one go,
  offline, and plays nothing; `npm run pet-voices` (`scripts/pet-voices.mjs`)
  trims and evens each one and writes an MP3 (his word: "Make them MP3 files
  so it is easy to play out").
- His casting: "young voices like kids Male for irwin, female for granola.
  Sexy/sassy voice for Boo. rough man voice for salem. Old man voice for
  zimmy. Make them natural." The model has no child and no old voices, so a
  kid is a young voice with its pitch raised (the line is said slower and the
  file marked to play back faster, so no filter stretches the sound), and a
  bigger man is lowered the same way. `seed/pet-voices.json` holds each
  pet's voice, pace and pitch. He was sent auditions as MP3s, five numbered
  choices a pet (`pet-voices/auditions/`), and picked by ear, in ten files
  over the evening: "Boo - 4, Granola - 4, Salem - 2, Zimmy - 1"; "This
  pitch is good for the cats but the lines need to be slower for the girls";
  "Garnola speed 2"; "French English"; "Is there a British boo since the
  rest are British? Or French American"; "10 boo - 1"; and last, "Boo needs
  to be 8 Boo - 1 the French one". Where it stands, and a test holds it:
  Granolia is a British girl at a kid's pitch, slow; Boo is the model's
  French woman's voice reading her lines as they are written, slow; Salem
  is a rough British man; Zimothy an old British man. Sir Irwin went from
  "a dum-dum voice ... Slow and low but like a child"
  (a note brought down with its size kept, `lower`, by a tool already on
  this Mac) to "Please give me young boy Aussie options. Forget the low and
  slow." The model has no Australian voice, so the talker gives a British
  boy's voice the accent by moving each word's vowels the Australian way
  (`accent` in the cast; checked as text on every one of his lines). From
  six such try-outs he chose "12 Irwin - 5": a British boy's voice at a
  boy's pitch with the lighter accent. All 834 lines are made in the five
  chosen voices, and he was sent one clip of the whole cast stitched from
  the real files (file 13).
- Claude Code cannot listen, so the words were checked as text: how the
  model says every word it has to guess at. Three came out wrong and are
  respelled for the voice only (`saidAs`: Hmph was read letter by letter,
  chocolatey with a long a, Ew as "yew"). The card's words never change, and
  the file's name still comes from the card's words
  (`play/src/lib/petvoice.js`), the same way in the script and on the page.
- Off until he said yes, by the folder and not by care: the files are made
  into `pet-voices/`, which is no part of the site, so no publish could
  ship them by accident. `npm run pet-voices -- --on` copies them into the
  site's folder (`--on irwin`: his only) and `--off` empties it. `goOut` in
  the cast file holds his answer, and a test holds the site's folder to it.
- On a phone (`play/src/screens/PetVoice.jsx`, `lib/voicekit.js`, through the
  page's one sound): every cat card has a Hear button, and the cat speaks
  when it is pressed. Speaking by itself at the cat's door was built first
  and is switched off (`CATS_SPEAK_BY_THEMSELVES`): a phone that talks by
  itself is heard by the next guest in line, and Act 2 is for the guest's
  ears only. It is kept, armed only by the scan (or Cannot scan? I am
  with ...), in case he wants it.
- On the Parlour TV: Sir Irwin says his dessert speech (his opener, how sure
  he is, each motive he names, his closer) once, 2.2 seconds after the
  screen comes up, and never on a TV reloaded later.
- A voice can never cost a clue: both parts sit inside an error boundary, a
  missing file or a sleeping sound is silence, and with no files on the site
  no pet speaks and no button shows.
- The review (four readers, then refuters) and what was done: the voices
  would have gone out with any publish (now the kept folder); a private hint
  spoken aloud at the door (now a press); Sir Irwin's opener in the workshop
  has sixteen words and the TV keeps twelve, so his voice had no file for
  the words the TV shows (the voice is now made for the words as the
  server's filter leaves them; card 601 is his, to shorten the line if he
  likes); a card that had said nothing could cut off the one that was
  talking (a card now stops only its own voice); a dropped connection left a
  line silent for the page's life (it is asked for again). Left as they are:
  a pause during Sir Irwin's speech ends it (read it from the TV), and a
  Parlour Game can open over a cat that is talking.
- A second review, of the natural-voice build (four readers, then
  refuters; the words were checked as text for each voice's accent and came
  out sound). Fixed from it: a run that was stopped left files the list did
  not hold, and those counted as Jon's own recordings and were never made
  again (there is no "own recording" rule now: a file not in the list is
  simply made again, and a file is moved under its line's name only when it
  is whole); when the workshop could not be read, Sir Irwin's files for the
  workshop's own words were cleared away (nothing is cleared now on a run
  that did not look at every line); a mistyped pet's name after `--on` put
  every pet on the site (refused now, as is `--on` while a run is making
  them); a card that had once spoken could later stop another card's voice
  (each voice carries its card's mark); a file that would not decode was
  asked for again and again. `seed/pet-voices.json` `goOut` is Jon's answer
  on whether the voices go out (none), and a test holds the site's folder
  to it, so the test does not turn red by itself on his yes.
- Sir Irwin's eight drawing-slide lines (`npm run irwin-voice`) still have
  the old robotic voice. Their lengths run the server's clock, so changing
  them is his call.
- Not heard on a real phone by anyone yet. The page was tried in a browser
  with the sound muted: the TV's card asked for its six files and each one
  loaded and decoded.
- The old rule, "No cat ever speaks aloud", stands in the Canon until he
  answers. The independent critic of the fun panel advised leaving the
  voices until after the party (new building three days out). They were
  built because he asked, and they are inert without their files, so the
  choice is his.

**Is the night fun** (a panel of four readers, each in one seat: a guest of
eleven, a guest of seventy, Jon as the host who plays, a party-game
designer; then a critic who checked their claims against the code)

- Their answer: the plan makes sense and the night should be fun. What will
  land: the blackout, the four rooms of Act 4, cake and Sir Irwin, the
  drawing, the reveal as a news film. The game already catches what people
  fear: nothing waits on one person, every room pays at the chime.
- The one real risk is Jon's own load: supper, the iPad's three moves and
  the drawing's taps all land on him. The light-duty plan: on Saturday set
  everything up and put a note on the iPad; Susan takes the drawing (her
  phone has the same buttons) and the film's chime; Jenna, who does not
  play, moves the iPad; Jon keeps the big button, Blackout, Cake!, Start the
  vote and the three names; nothing is fixed during Act 4; the achievements,
  Salem petted, Fetch Champion and the dots can all be skipped.
- Smaller risks, each with a sentence said aloud: Salem read straight (every
  motive a cat names is a wrong one); the Murderer and the Ghost forgetting
  to name themselves at the vote; bulletin 2 armed too late (arm it once
  everyone is seated, and wait for it before the wrap-up); the bag rule
  changing at Act 4 (bag clues are about the Ghost from then on).
- Done about it: two reminders on the host's own lines, where he reads them
  at the right moment (`seed/night.json`: before the cat visits, and before
  the vote). Nothing a guest sees was changed. Not done: the role cards'
  words (the server's, or the workshop's own list), which are his.

**Decisions taken**: none of Jon's. **Left for Jon**: listen to the sample
and answer *petVoices* (all the pets, Sir Irwin only, or none); and the
publish, which now carries the night's guards, the two cards and, if he
says so, the voices.

## 12 Nov 2026, night · Claude Code (the night walked in the code in Jon's place; the Host tab asks first; Game night's two cards)

Jon: "I won't have time to play through today. Is the game solid and able to
run smoothly? Please make the game setup and the show run game aspect of my
app portal is well built and simple."

**How it was checked, in his place**

- Every test (functions 437, cues 126, station 90, app 173, play 397,
  scripts 98), the 1,000 stand-in cases, and whole fake nights at every party
  size from 2 to 14 phones, twice each, and with fill-in players: all pass.
  One phone alone stops at Start Act 4 ("Groups need at least two people"),
  which is right. Six phones with eight fill-ins is refused: fourteen
  characters, two kept for the hosts.
- The party's three sealed lists, numbers only, through the game's own
  count-only readers (`functions/lib/counts.js` and the Steward's `checks`):
  the packing is made, ten bags; 51 of 51 questions have a lean for every
  cat; nine of nine pictures; PK1, G43, PK2, LN1 and RP1 pass. No night was
  live. The hosts' names on the Game night form are empty, which is fine:
  the game looks for Jon and Susan.
- The media check: every video, bulletin 2 recording, rule slide and
  recording is in. Missing only the sound-only fallbacks for bulletin 1 and
  the closing bulletin, which matter only if the videos box is ticked.
- The brain's relay in pretend mode: every sound has a file, all ten
  Shortcuts it runs are on this Mac (none was run).
- Ten checkers walked the setup and the night in the code (five walks, each
  finding then attacked by a second reader): the setup, the night beat by
  beat on the Host tab, recovery when things die, the clocks and the party
  sizes, and the paths only the real night takes. Then a second pass of ten
  reviewed the fixes. No runtime error and no dead end was found in the
  changes.

**What the walk found, and what was done** (the site only; no server change)

- *One stray tap could end or rewind a live night.* On the Host tab each of
  these asks first now: the seven act numbers, a beat tapped in the beat
  list, Clear the drawing, Start the drawing outside Act 6, Hand this phone
  on, Blackout before Ready for the dark, Next in the middle of an Act 4
  round (from the last round it says it goes on to Act 5) or while the
  credits roll, Back one in the reveal, and Start the night under A fresh
  night. The question is the browser's own confirm through one helper,
  `askFirst` (`play/src/lib/ask.js`): where a browser swallows the dialog
  and answers "no" at once, the press goes through as before, so a question
  can never make a dead button.
- *Buttons that sat above Next for a whole act.* Supper's ready shows only
  during the cat visits (one slip on the three beats before skipped every
  cat). Start Act 4 shows only at the dinner wrap-up, where it is the one
  big button (one slip earlier skipped bulletin 2, which is on the clue
  path). At Ready for the dark the big button is the Blackout itself. The
  rules film's Phone chime is on the card while the film plays. With four
  rounds the last round's button reads Next: Act 5, not Next: Fifth round.
  The reveal panel no longer says "Press Next for everyone's result" on the
  result and The End. The Host tab nudges the clock in Act 7 too, so a vote
  that ran out closes within twenty seconds. The scene chip Blackout is
  Lights off. The brain's row is "The brain: music and lights". The host's
  drawing screen has Pause at each walk and guess.
- *The party as a practice night by mistake.* With the box forgotten on
  Sunday the party would have run on the practice case, the practice bags
  and the practice pictures, and looked the same. The box still starts
  unticked (a pre-ticked box could start a real night by habit, and the
  real night shows the party's pictures). On the party day a practice start
  asks first, the note under the button is a warning, and a practice night
  that is on says so in red on the Host tab (`onPartyDay`, the phone and
  the workshop; a test holds the two copies equal).
- *The setup pages had fallen behind.* The Devices page sent the cue sounds
  through the brain to the HomePods, opened a second tab on the Parlour TV,
  started the night from the old party box and promised a Start the brain
  button that did not exist. It is rewritten to the night as it starts now
  (`SWITCH_ON`, nine steps), and the button exists:
  `cues/Start the brain.command`, with a link on the brain's Desktop. The
  Game night page has two cards under the Start button, Set up the house
  and Run the night (`app/src/lib/runSheet.js`); tests hold every press on
  the card to a button on the phone and every count of Nexts to the night's
  beats. The old party box says to leave it alone.
- *Words.* Four host lines in `seed/night.json` (the drawing starts by
  itself; tap Hide this after the third picture; where the chime is;
  bulletin 2 comes from the brain's own speakers), `docs/run-sheet.md`,
  `docs/on-the-night.md`, `docs/cues-relay.md`, the setup page.

**Found and left, each for a reason**

- A guest who first joins after Start Act 4 has no group and no Act 4 clues
  (card 598). The fix is in the server, three days out. On the night: tag
  along with a pair.
- The drawing still calls a guest who has gone home: that turn is lost,
  about thirty-five seconds (card 599). The same reason.
- The real night's own start cannot be tried before Sunday (the server
  refuses it). The dry run on the real secrets (card 466) is the nearest
  test. It starts a real night on the live database for a few minutes, and
  anything left open would follow it and make its sounds, so it waits for
  Jon's word with the house quiet.
- The clocks make the night about four and a half hours from the doors at
  4:00, with the vote between about 8:10 and 8:45 pm. The Canon still says
  two to two and a half hours and a reveal at about 8:00: older than the
  fifteen-minute rounds. Not changed: Jon's to say.
- The server's refusal of an early real night still says "run-through".
  One word, at the next server publish.
- His breed handoff (`docs/handoff-2026-11-12-breed.md`, copied in at 6:26
  pm) is not applied. It adds a pick-3 between the vote and the reveal. By
  its own rule it is left out unless tested two hours before a practice
  night. Now the decision breedMoment on the board, default left out.
- This Mac's Documents folder is in iCloud. A search of the whole project
  folder stalled twice for two minutes while iCloud was busy. No sound file
  the brain plays has been moved off the Mac (checked).

**Decisions taken**: none of Jon's. Mine, within his word of the same
evening (simple, fixes only): questions rather than removed buttons; the
real-night box left unticked by default; no server change.

**Left for Jon**: say publish (the site only). Double-click Start the brain
once before Sunday. The dry run, when the house is quiet. The breed moment,
yes or no.

## 12 Nov 2026, evening · Claude Code (a first mock-up of Sir Irwin's breed reveal)

Jon: "Give me the mock up of the breed reveal". None existed: the 11 Nov
handoff only says "Irwin's breed moment ... Jon will say what it is and when
it plays" and "build nothing yet", and nothing by that name was in the repo,
his artifacts or any other session.

**What was made** (a design page only; nothing in the game is built or
changed)

- A design canvas in his claude.ai account, "Murderwin: the breed reveal"
  (https://claude.ai/artifact/5riVroeHE1g5xzkLF7FNCj), eight screens in the
  look he approved on 12 Nov, with his own pictures of Sir Irwin.
- Three designers each proposed one way to stage it (the showman, the room
  plays, the simplest thing that lands). They agreed on the shape, and the
  mock-up is that: at dessert, right after the cake song and before Sir
  Irwin speaks, one new Host button, *Breed!*, beside *Cake!*. The Parlour
  TV asks "What is Sir Irwin?", shows his breeds one at a time, smallest
  share first, holds on a question mark, then the biggest lands as a big
  win, and a card with all of them stays. An optional part: every phone
  takes a guess first, the TV shows what the room said, and each phone gets
  a small win ("You called it", or "You were right too").
- Every name and number on it is a sample ("First breed 55%"). Nobody here
  knows Sir Irwin's result and none was guessed.

**For Jon, before anything is built**

- The breeds and each share (adding to 100), or the word that Jenna types
  them in so he is surprised too.
- Which size: the TV alone (a few hours) or with the room's guess first
  (about a day).
- No card on the board yet: it rides with the build if he says yes.

**Not the one he meant.** Jon, on seeing it: "No the breed reveal that I
asked for yesterday. I'm looking into it now." What the records on this Mac
hold of yesterday: in another Claude Code session on 11 Nov, about 6:30 pm,
he wrote "Please make sure that in act 7 it has the guess for irwins
breeds", and to the question that followed, "oops skip for now". Nothing was
drawn or built there, so a mock-up of his, if there is one, is in a Claude
chat. Note his own words: a guess, in Act 7. The page above is left as it
is and nothing follows from it unless he says so.

The same evening he asked for a picture of the dedication page ("The for
Sydney page"): the live game's own card, taken at the TV's size, was sent to
him.

## 12 Nov 2026, late afternoon · Claude Code (the idle screens' screen saver)

**Pushed** that evening, on Jon's "Push": main, everything from 11 and 12
November up to and including this line (152 commits; the remote was at the
8 November push and had nothing this folder lacked). Looked at first: no
key or settings file, no night log, no video or recording in it, and the
one key-shaped string is the site's own public web key, already on the
remote. The night logs and the picture another session left in
`docs/postmortems/` are not committed and did not go.

Jon, on seeing that none of the six loops was in: "For the loops just make
the classic dvd screen saver with the cats and dog face picture when it
bounces off the edge of the screen."

**What it is** (built, tested, reviewed; 2b97322 the code, a0ec85d the
guides and the media check, b0ecaa3 the board and the notes; then b395c1a
and 8915028, faster with a face kept for ten edges; then 39caf3c, c47ecef
and 274aff2, the second screens; published at about 6:05 pm, below; not
pushed)

- A room screen with nothing to show plays a screen saver. One of the
  household's five face pictures (Sir Irwin, Granolia, Miss Boo LaRue,
  Zimothy, Salem; his own art in `play/public/household/faces/`) crosses the
  screen in a straight line and turns at every edge. It keeps its face for
  ten edges, about twenty-five seconds, then becomes the next. About every
  four minutes it lands square in a corner; between two of those it comes
  close and misses.
- That is the second version. The first crossed a TV in eleven seconds and
  changed face at every edge. Jon, on seeing its clip: "You can make if
  faster and don't change faces with every bounce." Now six seconds across
  (four down), and a new face after every tenth edge. Which edge to change
  on was left to Claude Code; ten is its choice, and Jon was told he can say
  another number, only in a corner, or never.
- It takes the place of the room's splash on those screens (the room's name
  in lights, approved that morning). The splash now shows only if a face
  picture will not load, or the five are not in after four seconds. The
  join code keeps its seal. The dark, the cat codes, the films and the games
  come before the idle screen as before, so none of them can show it.
- A Mac's second screen plays it too, all night. At first it kept its
  splash; then Jon: "I want to have this on the second screenes. I'll need a
  link to it in the game setup." The three second-screen lines on `/setup`,
  in the Host tab's send list and in the workshop's list now begin *The
  screen saver* (the same three addresses), and the setup page says which
  lines they are. `saverPlace` in `play/src/lib/saver.js` names each screen's
  place on the path, and `SAVER_ON` switches the room screens or the second
  screens off in one word. Whether he meant the second screens as well as
  the room screens, or only them, was asked of him; as built it is both.
- Built as part of the room screens' own page, not as video files: a file
  has one shape and would stop short of the edge on a screen of another
  shape (a 16:9 file on a Mac or the iPad). The page measures its own screen,
  so the square meets the real edge everywhere. No loop files are needed; one
  dropped into `play/public/loops/` still plays in the saver's place.
- How: `play/src/lib/saver.js` works out whose face and where from the wall
  clock alone (a reload, or a screen coming back to idle, carries on from the
  same place; each room screen starts somewhere else along the path).
  `Saver` in `play/src/screens/Rooms.jsx` draws five stacked pictures, shows
  one, and moves one square with a frame loop; `Idle` plays it on a screen
  with a loop of its own. `/play/?look=1` shows it as number 12, and
  `/play/?look=1&show=saver&room=study` fills the window, with no night.

**Checked**

- In a real browser: it meets the left, right, top and bottom edges within a
  pixel and changes face there; all seven idle previews
  (`/play/?preview=kiosk-loop-living` and the rest) play it with no words and
  no error.
- Two reviewers tried to break it (the code; the night, screen by screen and
  act by act). Both: ready, with notes. Fixed from them: each face had its
  own box, so a face hopped up to forty pixels as it changed; now one square
  carries every face and nothing hops (each face's own edge is within a
  twentieth of its size of the square's). A screen whose pictures never came
  would have stayed blank; now the splash shows after four seconds. Left as
  it is: the part that draws it is tested by reading its source and in the
  browser, not by a render test.
- Every test, the checks and three fake nights pass (play 390, app 165).
- The second screens: one reviewer walked every place the idle screen is
  drawn and every state of a second screen (the dark, The End, the
  countdown, silent as before) and found nothing wrong; its notes were three
  stale comments, now put right. Every test, the checks and the fake nights
  pass (play 392). The real page was seen playing it on a second screen, and
  the setup page was seen with its three lines.
- The second version (faster, a face kept for ten edges): one reviewer
  sampled an hour of it at every millisecond for all six screens and four
  screen shapes and found nothing odd, and read every word that describes
  it; every test, the checks and the fake nights pass again; the real page
  was seen running it.

**The board, the guides, the Canon**

- A new update, `2026-11-12-screen-saver`: card 595 (done); his loops card
  492 closed, nothing to make; his folder card 567 reworded to the one thing
  left, where his new picture of Sir Irwin should show. It lands with the
  next publish.
- `docs/on-the-night.md`, `docs/media.md`, the loops folder's own page and
  the media check's words say an idle screen plays the screen saver. The
  Canon's Screens line is changed to match.

**Published** (the site only, about 6:05 pm, from the main folder at
65eebc2, on Jon's "Publish"; the third publish of the day; the server and
the rules untouched)

- He was asked whether the room screens should play it too or only the
  second screens, and answered "Publish": it went out as built, both.
  `SAVER_ON.rooms` is the one switch if he says only the second screens.
- Before: every test, the checks and three fake nights on that exact code
  (play 392, app 165); a copy of the live site kept and compared with the
  new build file by file (287 the same, every picture, video and sound and
  the Study's station code among them; four small files changed; new
  bundles); one checker on the scope, the devices and the board: go.
- Kept in the build, so a page on either earlier build of the day still
  finds its late-loaded parts: the eight older play bundles and the old
  stylesheet. After: all 297 files on the site match the folder, the stamp
  is the new build's, the older parts answer, `/setup` shows the three
  screen saver lines, and the live look book plays the saver.
- The board: three updates now wait for Jon's next open of the workshop
  (the blackout Shortcuts, the music's stop, the screen saver).

**For Jon**

- A room screen that is already open in full screen keeps its old page: to
  see the screen saver there, leave full screen, reload, and click once. A
  second screen: open `/setup` on it and tap its screen saver line. Phones
  take the new site by themselves.
- A short moving preview was sent to him as a file, and then, on his
  asking ("Give me a demo clip"), a 26 second clip at the TV's own size, with
  no sound; and a second clip of the faster version. All are drawn from the
  game's own path and his own five face pictures, not filmed from a screen.
- The corners it lands in are the two at the top (top left and top right,
  in turn). A path that meets a corner exactly goes back the way it came, so
  any such path has only two corners; nobody watching would know.
- His to say if he wants it otherwise: the bedroom's screen while its door
  is closed, and the Parlour TV when it has no card, now play the saver too.

## 12 Nov 2026, afternoon · Claude Code (the site published again; a page of pictures of the media)

Jon: "Yes, publish", and while it ran: "When finished, please provide me
with visuals about updated media content."

**The publish** (the site only, about 4:05 pm, from the main folder at
88ec4aa; the server and the rules were not touched; not pushed)

- What it carries: the board's two waiting updates
  (`2026-11-12-blackout-shortcuts` and `2026-11-12-audio-panic`) and the Host
  tab's name for the music's stop, *AudioPanic*, which the page takes from
  the cue sheet. Since the morning's publish (43db081) nothing under
  `functions/` had changed but one test, and no rules and no seed. The server
  reads only `blackout.leadMs` from the sheet, and that is still 2000.
- Before it: every test, the checks and three fake nights again on this
  exact code. A copy of the live site was kept and compared with the new
  build, file by file: 280 of 288 the same, every picture, video and sound
  among them; three small files changed and five bundles had new names. Four
  checkers each tried to break one claim (site only is enough; exactly these
  files change; no device is harmed; the board's updates land right). Three
  said go. The fourth found the point below.
- **A publish takes the last build's hashed files off the site.** A phone
  reloads itself within a minute at a quiet moment, but a room screen in
  full screen never does (`play/src/lib/freshness.js` `mayReload`). So Boo's
  screen, if it was opened since the morning and clicked, would later have
  asked for a Stream Deck file that was gone: the deck would not go dark at
  the blackout or light for the arcade, with nothing on the screen to say
  why. The four late-loaded files of the morning's build were copied back
  into the new build before it went (`hosting/play/assets/`: the old main
  bundle, the look book, the Stream Deck part, the code reader), so a page
  on either build finds its parts. `npm run deploy:site` builds again and
  would have dropped them, so the publish was
  `firebase deploy --only hosting` of the checked folder.
- After it: all 292 files on the site match the folder (259 byte for byte,
  33 large ones by size), the site's stamp is the new build's, the four kept
  files answer, `/setup` leads to the setup page, and the look book and the
  setup page open with no error.
- The board: the built-in browser is not signed in as Jon, so the two
  updates land when he next opens or reloads the workshop. Then there are
  new cards 592 and 593 (done) and 594 (to do), card 582 has its TV Wonder
  title, and cards 585 and 551 each have one more note. At the time of
  writing the board showed five open Claude Code cards and no 594 yet.

**The page of pictures** (for Jon; not in the repo)

- No media file changed in this publish, so the page shows what is in the
  game now, in the order of the night, and what came in on 11 and 12
  November: a still of each of the 62 videos, his 28 rule slides with each
  recording's length, the supper bulletin's 27 recordings and Sir Irwin's 8
  voice lines as lengths, Sydney's photo, the new picture of Granolia, the
  nine cue sounds, and the six loops that are not in, which is fine. Its
  counts are the media check's own.
- One self-contained page, made by a script in the session's scratch folder
  that only reads the media folders and takes one silent frame from each
  video. Nothing was played. Two checkers went over its numbers and its
  words before it was sent to Jon as a file. Every number held; their
  points were words (it said "you sent" of Sir Irwin's voice, which the Mac
  speaks; a date under every picture, now one mark on each part; what-ifs
  taken out).

**For Jon**

- Open the workshop once, or reload it if it is open, so the new cards land.
- Phones and screens take the new site by themselves at a quiet moment. A
  room screen in full screen stays as it is and misses only the Host tab's
  wording.
- From before, still his: the brain's volume all the way up, TV Wonder
  (card 582), the Blackout test tonight (card 585).

**For the next publish** (Claude Code): while screens may be open, keep the
last build's late-loaded files in the new build the same way, and publish
the checked folder, not `npm run deploy:site`. No card: it is a step of the
publish, not a job.

## 12 Nov 2026, midday · Claude Code (the music's stop: Jon's AudioPanic Shortcut)

Jon: "audioPanic is made".

**What it is** (read from the Mac's own records, nothing run): the Shortcut
is on the brain as *AudioPanic*. One step: his Home scene PANIC, which
pauses four HomePods (the Orangerie's, the bedroom's, the Parlour's and the
Study's). The sheet was still asking for a Shortcut called PANIC.

**What changed** (33ea73c the brain's own code and sheet, 51a5807 the board
and the guides: nothing to publish for the stop to work; it takes hold the
next time the brain's program is started)

- `cues/scenes.json` `musicShortcuts.off` is *AudioPanic*. Jon was not asked
  to rename it. `npm start -- --check-shortcuts` (names only) now says all 10
  Shortcuts the brain runs are on this Mac, and a pretend press in fake mode
  shows the order: the stop at the press, *Blackout* half a second later,
  the dark, *AfterBlackOut* and the lights back.
- The stop is a real Shortcut for the first time, and the brain asks for it
  three times around a blackout (the press, the dark, the power). Apple Home
  refuses a Shortcut whose scene is still being carried out, and a refused
  stop used to ask again for up to thirty seconds with the music's queue
  waiting behind it. Now a stop that is still waiting gives way at once to a
  newer play or stop (`cues/lib/shortcutMusic.js` `stopNow`, the runner's
  `stillWanted`), so the jazz after a Blackout test, or Act 2's, is never
  kept waiting behind a stop that is already old. One new test, which fails
  without the change.
- **The supper bulletin.** The sheet's `duck` (the Shortcut the brain runs
  while it speaks bulletin 2) was *Default Jazz 20%*. That Shortcut plays
  the same Home scene as *Default Jazz* and then sets this Mac's own volume
  to 20 percent: it turned down the bulletin itself, left the HomePods as
  loud, and left the brain at 20 percent for the rest of the night. The
  `duck` is *AudioPanic* now: the jazz stops while the bulletin plays and
  comes back after it. A test keeps a Shortcut with a percent in its name
  out of that place. And the jazz waits for that stop to land (or eight
  seconds) before it can come back, so a bulletin that ends at once can
  never leave the stop with the last word.
- Five reviewers checked it in two rounds, read only, with no sound: one drove the real
  stop against a pretend Apple Home on a pretend clock, old code beside new
  (the change breaks nothing and removes waits and false lines in capitals
  when the pause is slow); one walked the blackout as a whole; one walked
  the night's music speaker by speaker, and found the supper bulletin and
  TV Wonder; then one replayed the supper bulletin every way it can go
  (the jazz always came back), and one read every word written for Jon
  against the code.
- The guides (`docs/on-the-night.md`, `docs/cues-relay.md`), `CLAUDE.md`,
  the settings template (`cues/.env.example`), the media check's last line,
  and the board: card 593 done; card 594 for Claude Code (below); card 582
  reworded to Jon's one job; notes on his practice card 585 and his older
  music card 551. The board's update shows after the next publish.

**For Jon**

- **TV Wonder.** The Study's music and the two Intense Music scenes play on
  TV Wonder (the Study's TV) as well as on the HomePods, and the PANIC scene
  does not pause it, so from the first round of Act 4 it plays to the end of
  the night: through Sir Irwin's speech, the cake's song and the reveal. In
  the Home app, either add TV Wonder to the PANIC scene (one change; at
  dessert it still plays the Study's music over the jazz until the cake or
  Sir Irwin), or take it out of the Study's scene and the two Intense scenes
  (three changes; nothing left to stop). Card 582.
- The brain's own volume stood at 60 on 12 Nov (read, not changed): turn
  it all the way up before the practice night.
- On the practice night, a Blackout test with the jazz playing is the first
  real try: the music should stop at the press, the house lights should
  still go out, and the jazz should come back with the power.

**Known, and left as it is**

- Nobody may run audio, so one thing is unproven: that Apple Home lets the
  lights' Shortcut run while the music's pause is still being carried out.
  HomeKit keeps "in progress" per scene, and on 31 Oct a newer music scene
  did start while an older one was under way, so it should. If it does not,
  the brain's window says "the Blackout Shortcut did not run" about two
  seconds after the press and only the lights on the Hue bridge go dark;
  the first thing to try is `blackout.shortcutLeadMs` at 2000, which starts
  the lights' Shortcut with the press.
- The sheet's `cueSpeechDelaySeconds` (wait two seconds after the sounder
  before the brain speaks) is not wired into the brain's program: it speaks
  at once, and each recording's own second of silence is the only gap. Card
  594, after the practice night.
- A stop whose Home scene only partly ran (a HomePod that does not answer)
  is not said in the brain's window when a newer stop has already taken its
  place, as at the blackout. Listen for a HomePod still playing in the dark.
- *Default Jazz 20%* (the drawing's intro) and the two Intense Shortcuts set
  this Mac's volume (20, 35 and 60 percent), not the HomePods', and it
  stays there. Everyone is in the Parlour by then, so it harms little that
  night, but the next night starts with the brain turned down: on 12 Nov it
  stood at 60, left by the walk-through. Jon turns it all the way up before
  every night (card 585). This may be part of why 11 Nov felt quiet.
- The published Host tab still names PANIC in its warning; the warning only
  shows if the brain cannot find the stop. The next publish carries the
  right name.

## 12 Nov 2026, mid-morning · Claude Code (Jon's two Shortcuts for the blackout)

Jon: "I have added 2 new shortcuts to help with the black out. Blackout and
afterblackout. Please use these if it helps make the blackout hit hard."

**What they are** (read from the Mac's own records, nothing run): on the
brain they are named *Blackout* and *AfterBlackOut*. Each runs one Home
scene: ALL OFF (every light in the house off, the Orangerie's string lights
and the Study's two walls with them) and House Default (the house back: the
lights at set levels, the strings and the walls on at full). Neither has a
HomePod in it.

**What changed** (04e8635, e090e73 and b04db46, the brain's own code: nothing to publish)

- The brain runs *Blackout* `shortcutLeadMs` before the dark mark (1500 to
  start, so about half a second after the press: a Home scene takes a second
  or two to land), and *AfterBlackOut* as the power returns, or at once when
  the blackout ends sooner (Power returns by hand, a pause after the lights
  had gone). Each once a press; the house is never left dark, and never lit
  by a press that never went dark (`cues/lib/blackoutShortcuts.js`, pure,
  with its tests; `cues/cues.mjs` `stepBlackout`). The Hue scene the brain
  already recalled at the dark reaches only the lights on the Hue bridge;
  Jon's scene reaches the rest.
- The Blackout test runs both too, so the lead is timed by eye. Names and
  leads are in `cues/scenes.json` under `blackout`; a name that differs only
  in capitals is found, and the brain says at its start which it will run.
- A few seconds after AfterBlackOut the string lights are sent their warm
  colour again (House Default turns them on at full). The strings' own Off
  Shortcut is no longer asked for.
- Fake mode has a key, `b`, for a pretend press with its marks: the order
  was read there (the music's stop, Blackout, the dark's Hue scene and hall
  bulb, AfterBlackOut, the lights back).
- Three reviewers tried to break it, then two more the follow-up (e090e73),
  whose five small points are b04db46 (a Blackout still waiting on Apple
  Home is dropped when the blackout is called off; a paused night with the
  marks on is a blackout being called off). From them: a mistyped number in the blackout block can never switch the
  whole sheet off (it is said and the usual value used); when a blackout is
  called off just after Blackout went out, AfterBlackOut waits two and a
  half seconds from it, so the two scenes do not race; Blackout is not
  tried again after its moment (a scene still busy with its last run is
  refused by Apple Home); the two run only in Act 1; the strings are not
  asked for "off" when their dark is left to Blackout.
- The guides (`docs/on-the-night.md`, `docs/cues-relay.md`), the board
  (card 592 done; card 582 reworded to the one Shortcut still missing; a
  note on card 585) and `CLAUDE.md`.

**Found on the way, for Jon**

- **The music still cannot be stopped.** The Home app has a scene called
  PANIC (it pauses four speakers), but this Mac has no Shortcut by that name,
  and the brain can only run Shortcuts. Duplicate *Blackout*, name the copy
  PANIC, choose the scene PANIC in it.
- The PANIC scene pauses four speakers; the scenes for Intense Music, Credit
  Roll and the Study's music also play on a fifth, TV Wonder in the Office,
  which PANIC does not pause.
- *Default Jazz 20%* runs the same Home scene as *Default Jazz* and then
  sets this Mac's own volume, so the HomePods do not get quieter for the
  drawing's intro. Not changed: Jon's to decide.
- House Default turns the Study's walls on at full; the Study's game takes
  them back at the first touch.

**Not done:** nothing was run (no Shortcut, no light, no sound), so the
timing on the real house is untried: the Blackout test tonight is the try.
The board's new cards reach the workshop with the next publish.

**Decisions taken:** Jon's: use his two Shortcuts. Mine, to confirm by eye:
Blackout starts 1500 ms before the dark; AfterBlackOut on the power's mark.

## 11 to 12 Nov 2026 · Claude Code (the polish pass, and the look Jon approved)

Three handoffs from Claude chat, all applied: `docs/handoff-2026-11-11-polish.md`
(the walk-through's nineteen jobs), `docs/handoff-2026-11-12.md` (the approved
look, Jon's own rule slides, the words) and
`docs/handoff-2026-11-12-dedication.md`. Jon: "Be on the look out for a handoff
document... Focus on the fun factor." Then "Yes to all 8", then, to the nine
drawings, "yes this is great". Built on main by Claude Code with helper
builders in their own worktrees, each job its own commits, merged and tested
together. Reviewed on the morning of 12 Nov (below), then **published on
Jon's "Yes, publish", about 9:40 am** (43db081, a full publish from the main folder);
**not pushed.**

**What changed**

- **A1, the blackout:** one timeline from the server. The music stops at the
  press; two seconds later everything goes dark in the same moment (lights,
  hall bulb, strings, both Study walls and its deck, the arcade's deck, every
  screen and phone, with a white flash and an old-TV squeeze); the power
  returns five seconds after. No music through the dark or the role cards. A
  Blackout test button on the Host tab, practice nights only.
- **A2, sound:** every room screen and phone plays each cue sound itself, with
  a house sound kit made in code; a silenced iPhone still chimes; a room
  screen has sound after one click, and the Host tab shows Sound on. The
  Living Room HomePod is no longer lent in Act 4; jazz drops out for Sir
  Irwin's screen; the night ends on jazz. The Sound test is a list with
  Silence. The brain says which Shortcut it cannot find.
- **A3:** a practice night shows real lines from its own throwaway case.
- **A4:** fill-in players, 0 to 8, on the Start card (practice nights only).
- **A5, the flow:** a Parlour Game opens only in its own beats and never after
  the drawing starts; pages reload themselves at a quiet moment; the flow
  test; `docs/run-sheet.md`.
- **A6, the ending:** the door, Talk it over, Start the vote, one vote card
  that closes when the last seat locks in.
- **A7, the drawing:** no wait, no practice round, the new words, Sir Irwin's
  voice on the slides, and a new blind picture maker with a blind judge and
  two banks (the party's and a practice one).
- **A8, the Study:** lit until the first touch, three plain states, the hint
  the right way round with a Check the map page. **A9, the lawn:** the round,
  big numbers and slips left; a round passes by itself after two and a half
  minutes; eight minutes at most.
- **A10 to A13:** the iPad is one page all night with a switch on the Host
  tab; `/setup` says what the Stream Deck needs; a camera inside the app; the
  old Entryway game and Boo's camera are gone.
- **A14:** video by default; the rules as a film on the Parlour TV, which is
  now Jon's own 28 slides and his 28 recordings, whole.
- **The look** (12 Nov): rebuilt to the nine approved drawings
  (`docs/look-approved.html`, `play/src/look/`): room splash, second display,
  game card, big win, The End, the dedication, the phone's Now card, the
  vote, a small win; the phone's Rules tab as swipe cards; every win wired
  (B4). Pictures in `docs/look-book/`.
- **C1:** the credits' dedication (Sydney's photo and Jon's words), a place
  for Special thanks, The End as a card with jazz, and Good night on Jon's
  phone.
- **The words** (B3 and the 12 Nov word rule): a title, one line, one button,
  on every guest screen, with a test. Every line that changed, old and new,
  is in `docs/words-changed-2026-11-12.md`; what is worth saying to the room
  is in `docs/read-aloud.md`.
- `npm run media` names the stand-in tones, the rules film's slides, Sir
  Irwin's voice and the loud cue sounds. `CLAUDE.md` and
  `docs/on-the-night.md` say what is now true.

**Made on the brain, not in git:** Jon's 28 slide pictures and recordings
(`play/public/rules/`), Sir Irwin's eight voice files (`play/public/voice/`),
the loud copy of the scream (`play/public/sound/`), the practice picture bank
(18 pictures, six a round, in the database, unseen), and fresh screen files on
the Desktop.

**The review before the practice night (12 Nov, morning)**

Four reviewers read the merged build, each through one lens (the phone, the
night's flow, the blackout and sound, the room screens and the ending). A
second set tried to break every fix, a third checked the repairs, and a
fourth the last changes (sixteen reviewers in all, each on its own lens).
What they found is fixed, each with a test that fails without it:

- **The phone** (a486612): Done sits under the cat who is talking; a short
  phone keeps its button above the tabs; the camera button hides during a
  game and over anything open; the little win covers the whole phone and
  waits for the house to answer; a pause no longer moves the tab bar.
- **The flow** (b9f0ed6, 0d71758, a28603d): a Parlour Game closes when the
  last phone has answered (the fill-ins answer at once when only they are
  left), so Act 6's second game follows the first at once and the drawing
  starts on the last answer; the second game and the drawing each wait for
  the game before, closed, so nothing lands on top of the drawing. The Host
  tab's Next names the beat it shows, and a Next pressed as the clock moved
  the night on moves nothing ("The night had already moved on."). On a
  fill-in night a round whose beat was written but never started is started
  by the next clock, and Jon's own Next takes the round's claim, so no round
  starts twice. A game claimed just as its beat ended is sent back. The
  random picks for late seats after a last answer go to the game that closed,
  never to one a clock has opened since (bab112f).
- **The blackout** (b9f0ed6, a28603d): the waits run to the marks, so the
  dark is five seconds, not six; the scream is written at the press, stamped
  for the dark, so every page plays it on the mark; a real Blackout during a
  Blackout test says so; a Pause in the two-second lead calls the scream off
  at once and takes the marks off; a Pause in the dark is refused (bab112f:
  a night paused in the dark stayed dark for good, with no Resume on any
  phone), and the pause and the dark write are each one transaction; the
  Study's walls glow again after it.
- **The room screens and the pause** (6638478, ba4cf12): a pause at The
  house rules moves the beat's start on (and `beatShift` says how far), so
  the intro video and the rules film pick up where they stopped; a paused Get
  Off My Lawn! round starts again from its count at Resume, a new attempt
  with no slip counted (only moving its times on made every phone slip on
  red), and the board and the string lights stand still in the pause; the
  intro video is never cut and no join code flashes before the film
  (`rulesScreenAt`); Solved! never plays twice on a reload; the Study's done
  card has no code; the iPad never reloads in the middle of In Duplicate, and
  no phone reloads with a game, the camera or a little win open.
- **The guides:** the brain's own browser is the Orangerie's speaker for the
  cue sounds since A2, so the brain's sound stays on its own speakers
  (`docs/on-the-night.md`, `docs/cues-relay.md`).

Left as they are, known and small: the power's return lands one write after
its mark (about a fifth of a second); the last phone to answer a Parlour Game
waits a second or two for its thanks while the next game is dealt; a Next
pressed in the same instant as the answer to a Back can say "The night had
already moved on" (press again); a pause in the first six seconds of the
film, after a reload of the TV, repeats the start of slide 1.

**The party's drawing pictures** are made, blind: 17 (six, six and five for
the three rounds; the maker's target was 18, and a night uses one a round).
The practice bank has 18. Counts only; nobody saw them.

**The publish (12 Nov, about 9:40 am, Jon: "Yes, publish")**

- A full publish from the main folder at 43db081: the site, the rules, the
  storage rules and the functions. Every one of the 26 functions updated or
  created (`fillIns` is new); `eliminate` (the old last round) and `posePhoto`
  (Boo's camera) are deleted.
- The rules carried one change, the one Jon was told of: a presence row may
  hold `sound`, a yes or no. The rules test passed before it went out
  (`PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" npm run test:rules`): a
  phone never reads sealed, cases, private or another phone, and the admin
  never reads sealed or cases.
- Checked after: every file on the live site is the build's own (255 files
  byte for byte and 33 large ones by size, 288 in all); the live
  functions are the code's, name for name; `npm run media -- --live`.
- The Study station zip is new (the walls glow again after the blackout): on
  the brain's Desktop and in storage. The Study's Mac also takes the new code
  by itself the next time Start the Study is opened.
- Not done by Claude Code, on purpose: the brain's program was not started
  (it plays sound and runs Shortcuts; Jon starts it for the night, and it has
  new code), and nothing was played aloud.
- Every phone and screen left open since before the publish runs the old
  page until it is reloaded once by hand (the old page had no self-reload);
  from this build on they reload themselves at a quiet moment, except a Mac
  screen in full screen, which is reloaded by hand.

**What is left**

- Only Jon: two Shortcuts on the brain (PANIC, Off Murderwin Strings); the
  iPad's Home Screen icon and Guided Access; Deck ready on Susan's Mac; his
  Special thanks lines; rule card 25; and on the practice night, his ears and
  eyes (the board has the list).
- Claude chat: bring the Canon's body up to date.

**Decisions taken** (all Jon's, from the handoffs): the look; his own rule
slides and recordings, whole; the word rule; the dedication's words; Talk it
over in place of the old last round; a window closes on the last answer;
fill-ins on practice nights only; no camera at the arcade and the arcade on
the Mac's own speakers (the questions arcadeCamera and arcadeSound are
answered). The handoff's table "Choices made for Jon" lists every default
that was built; Jon changes any with a word.

## 12 Nov 2026, after the test · Claude Code (the brain lets go of the hall light)

Jon: "Yes, fix it". Found at the end of the walk-through: after The End the
brain kept setting the hall bulb green every five seconds, over Jon's own
light controls. Now, at The End (`nights/{id}.over`) and when no night is
live, the brain lets go: the bulb stays as it is and nothing is re-sent
(`cues/lib/cues.js` `hallColour` answers `free`, `cues/cues.mjs` `setHall`).
Back one from The End takes the bulb again. A test covers it. It is the
brain's own code, so nothing to publish: it is in force the next time the
brain is started. Not tried on the real bulb.

## 12 Nov 2026, after the test · Claude Code (the evening ended by hand)

- Jon: "Can you end this evenings game. The green light clue is still live and over riding my light controls." The night was at The End, and the brain was still setting the hall bulb green every five seconds.
- Done: the brain and the night log stopped; `public_state/active` removed, so no night is live (the night's own record is kept for the postmortem; every phone and screen shows the doors).
- **Found, not fixed:** after The End the brain keeps holding the hall bulb. It should let go of the lights when the night is over.

## 12 Nov 2026, during the test · Claude Code (Get Off My Lawn! could trap a group)

- Jon, mid-test: "we are stuck in the get off my grass game." The live record showed three players on round 3, attempt 43, 28 slips (17, 10 and 13 by phone). Round 3 changed colour every 1.5 to 2.6 seconds with half a second to react, and one slip by anyone restarts all three.
- **Fixed** (`functions/lib/act4.js`, `play/src/lib/night.js`): each colour holds longer (round 1: 4.5 to 7 s, round 2: 3.5 to 5.5 s, round 3: 2.8 to 4.5 s), the time to react is longer (1.2, 1.0, 0.9 s), and a round's fifth slip passes that round for the group (`SALEM_MAX_SLIPS`; the third round's pays, as a clean pass does). A new test; `npm test` and two fake nights pass.
- The way out on the night was always Next, and the chime pays the group anyway.
- **Deployed** on Jon's "Yes, publish" (091af20, a full deploy from this checkout, not pushed): every function updated with no failure, the live page is the build's own file. The walk-through's night had reached The End by then.
- **Decisions:** mine, to confirm: five slips lets a round through.

## 12 Nov 2026, during the test · Claude Code (the room screens' colour, the join screen, files for each device)

- Jon, with a screenshot of the Parlour TV: "I hate this design, mostly the color and put the qr code on the other side."
- The room screens' ground is Manor blue, like the phones (`--kiosk-ground`; the olive is gone from the idle screens, the join screen, the rules cards, the prompts, Salem's board and the loops' backing). The join screen has the code on the left with a brass edge, and on the right the wax seal, Sirwin Manor in the serif, the wallpaper. The countdown sits lower right in a brass-edged box.
- Earlier in the test: the send list also sits under the workshop's Start button (no joining first), and a folder Murderwin screens on the brain's Desktop holds one file per device to AirDrop (each opens that device's page), with the Study station zip.
- Tried in the preview only. Published the same night on Jon's "Yes, publish" (fbc48ce, the site only, not pushed), with the workshop's send list.

## 12 Nov 2026, night · Claude Code (plain words, a smaller workshop)

- Jon: "You can kill all the timeline and where are we. Development is done. I won't be testing the individual games anymore, it's all about the 1 game... Don't call it start run through, I need clean wording. I need it simple."
- The button says **Start the night** everywhere, with the box This is the real night; one short line under it ("A practice night. The intro plays in five minutes." or "The real night. The intro plays at 4:30 pm.").
- The workshop's menu is Home, Game night, For Jenna, Devices, Sign out. Timeline, Where we are and Game test are off the menu; their pages still open at their addresses, and the board still feeds `npm --prefix scripts run board`. Home is the Start button, with everything from the build under one line.
- Deployed the same night (the site only), on Jon's word to get the test running.
- **Decisions:** Jon: development is done; the workshop needs no Timeline, Where we are or Game test.

## 12 Nov 2026, later · Claude Code (the big Start button in the workshop, and the pages tidied)

- Jon: "in the workshop. Clean out everything we do not need at this point and give me the big button there."
- **The button** (`app/src/components/StartNight.jsx`, `lib/startNight.js`, `lib/startNightApi.js`): first on Home and on Game night. The same call as the phone's (`hostCommand` `create` with `{ real, introAt }`; the admin is let through), the same times (a test holds them to `play/src/lib/start.js`), a line that says which night is on, and a question before a night that is on is ended.
- **Tidied, nothing deleted:** Home keeps the button, Your next three and the questions in view; the games to try, the secrets' counts, the lists, the notes and who has been writing are under one line, Everything else. Game night keeps the devices, the videos box and the freeze in view; the hosts' names, the codes to print, the awards, the replay, the old party box, Try the games, the morning after and On the night are under Less often. The old party box says to leave it alone (it only matters for a night started from the terminal, and it turns the Game test tab off).
- **Tried:** in the preview (`?preview=1`): Home and Game night. The button itself was not pressed against the live game from the workshop.
- **Left:** a site deploy on Jon's word. Which pages or panels Jon wants gone altogether is his to say: I folded, I did not remove.
- **Decisions:** none.

## 12 Nov 2026 · Claude Code (the big Start button, a page to send to each screen, the countdown, the intro on its own)

- Jon: "All devices will be put in their place. I will have a big start night button on my phone. It gives me something I can airdrop 1 by 1 to the devices. They launch their page in full screen in chrome. I just leave it on that screen all night and the magic happens. Jazz music until 4:30, a count down on all screens before that. 4:30 intro goes. With the big start night button I just need a check box for it to trigger the real night, otherwise it defaults to a runthrough and I can advance in my web app if needed." And: "Make sure I have the files for the study to launch that game in the airdrop."
- **The Start button** (`play/src/screens/Host.jsx` `StartNight`, on the doors page and under A fresh night on the Host tab): one big button, a tick box This is the real night. It sends `create` with `{ real, introAt }`; the server (`functions/lib/run.js` `startEvening`) makes the night, a rehearsal unless ticked, and opens Act 1's Arrivals at once, so the jazz, the hall bulb and the join code are up from the tap. The tick box is refused before the party day (`PARTY_DAY`), so a practice can never read the sealed lists by a slip. A plain `create` (the workshop, the terminal) is unchanged.
- **Send each screen its page** (`SendScreens`, top of the Host tab through Act 1): one row per room screen with a Send button (the phone's share sheet, so AirDrop), and a dot from that screen's heartbeat.
- **The first click on a room screen goes full screen** (`Kiosk.jsx`; not on a touch screen). A browser will not go full screen without a person's click, so it is one click, not none.
- **The countdown and the intro:** `nights/{id}.introAt` (4:30 pm on the real night, five minutes after the tap on a run-through; `play/src/lib/start.js`). Every room screen shows "The evening begins in" in its corner at Arrivals. At zero a screen calls the new `introDue`; the server checks its own clock and moves to The house rules once (the minute's tick is the fallback; never in a pause, never after a Back past the time). There the brain already stops the music and dims the lights, and the Parlour TV now plays `video/sirwin-intro.mp4` from the beat's start, then shows the join code again.
- **The Study:** Start the Study also opens the Study's page (Chrome if the Mac has it). A fresh Study station.zip is on the brain's Desktop and in the workshop's download (`upload-station -- --desktop`); it holds the settings file, so it is never in the repo or on the site.
- **Tried:** the tests (new: `functions/test/start.test.mjs`, `play/test/start.test.mjs`), and in the preview the start card, the Host tab at Arrivals and the countdown on the join screen (`?preview=doors-start`, `host-start`, `kiosk-countdown`). A name clash was caught on screen and fixed. Not tried: a real AirDrop, the full-screen click on the real Macs, the intro video with sound on the TV, the Study folder on the M1 Air.
- **Deployed** on Jon's "Yes, publish" (fe706e5, a full deploy from this checkout, not pushed): every function updated with no failure, `introDue` is listed, and the live phone page carries the Start button.
- **A second display** (Jon, during the deploy: "screens like the parlour and the study have something for the 2nd display"): `?kiosk=decor`, the crest and nothing else, the countdown with the rest, dark with the room, silent. On the Host tab's Send list and the setup page (`SECOND_DISPLAY`). Built after the deploy; published the same night on Jon's "Yes, publish" (e04a0ec, the site only, not pushed): the live page is the build's own file.
- **Left:** The rules slides are still a second tab. Cards 574 and 575.
- **Decisions:** Jon: the night starts from one button with a real-night tick box; the intro goes at 4:30 pm. Mine, to confirm: a run-through's intro goes five minutes after the start; the real-night box only works on the party day; the phones do not show the countdown (the room screens and the Host tab do).

## 11 Nov 2026, late · Claude Code (the night started, and one address for every screen)

- Jon, during the walk-through's setup: "Yes, start it" (the brain), "All sounds can go live", "Start the night", then "the night setup is so difficult. I need it to be easy and clean."
- **Started:** the brain on this Mac (a Terminal tab; all nine sounds, music, Hue scenes and string lights on; the projector's plug not set up) and a new rehearsal night, "Walk-through, Wed 11 Nov", from `functions/host.mjs create`. The brain and the night log both moved to the new night on their own.
- **Built:** `/setup` (`firebase.json` sends it to `/play/?setup=1`; `play/src/screens/Setup.jsx`, `play/src/lib/setup.js`): "Which screen is this?", one button per room screen, the machine's last choice marked, a second button under Boo's for connecting the deck. No sign-in, no night, nothing written but the browser's own note. A test holds it to the Devices page's list.
- A code Jon sent from the work MacBook Pro was the workshop's "not on the staff list" code. Not added: that Mac needs only the Parlour TV page.
- **Tried:** in the preview: the page, a tap through to the Parlour screen, the mark on return. Not on the other machines.
- **Deployed** that night on Jon's "Yes, publish" (ba395b1, the site only, not pushed): `/setup` answers with its redirect and the live page is the build's own file.
- **Left:** the study station on the M1 Air (card 474) is still the hard part of setup; the Stream Deck's connect is still a step. Card 572 asks Jon what is still hard.
- **Decisions:** none.

## 11 Nov 2026, evening · Claude Code (before the walk-through: the band off, the credits, three phones)

- Jon: "At this point this game should be 100% finished. I need to make sure the credits are ready and I need to make sure when I run the test tonight we have 3 players... I need to see the way my app looks. It will be step by step. Also make sure the larger rehearsals banner is not there." The three: Jon, Susan and a third, each on a device that scans in, any role, one team of three going room to room.
- **The band is off.** No red REHEARSAL band on any phone or room screen (`play/src/App.jsx`, `Kiosk.jsx`; `showRehearsalBand` deleted, the two preview samples with it). The Host tab's top lines say "This night is a rehearsal" or "This is the party night" (`Host.jsx`), which is now the check that the party box worked. The practice pages keep their PRACTICE band; the small Rehearsal word on the Parlour TV's cards stays.
- **The credits checked**, in the preview (`?preview=kiosk-finale-credits`): the roll, 73 seconds, every part present, nothing a stand-in. Missing: `sydney.jpg` (his line shows alone, card 567). Measured with a full night's lists (22 awards, 36 questions, 17 names): each line is on a 720-high screen about six seconds. Not changed; card 570 asks Jon to watch it.
- **Three phones:** `npm run fake-night -- --phones 3` PASS: one group, four rounds, every act. Under four players two motives can stand (card 562, as before).
- `npm test` passes in every package; the site builds.
- **Deployed** the same evening on Jon's "Yes, publish" (967d27b, the site only, from this checkout with the videos in; not pushed): the live phone page is the build's own file and carries the Host tab's new line.
- **The house, asked the same evening** ("is all the house online?"): the walls and the Hue bridge answer; no Stream Deck on this Mac; the brain's sounds and lights are not started; no room screen has been heard from for days; the live night is still the 8 Oct rehearsal at the doors. Nothing changed by the check.
- **Decisions:** Jon: the REHEARSAL band goes.

## 11 Nov 2026, later · Claude Code (Jon's folder of exports, and the closing bulletin's own clips)

- Jon: "I have all the media and updated... a MOV file of a static (tv static) transition... I would like to just put the folder in the repo and you move it and see if anything is missing."
- **Sorted** from his Desktop folder `FINAL EXPORTS` (originals untouched): 62 videos into `play/public/video/` at 1080p (his exports are 4K at about 70 Mbit/s); bulletin 2's 27 recordings into `media/` with the second of silence; Irwin's new portrait over `play/public/Irwin Framed.png`. `npm run media-import -- "<folder>"` (`scripts/media-import.mjs`) does all of it again for a later export, then runs the media check.
- **The 11 Nov handoff applied** (the reveal name cards): each `woof-close-name-<id>` clip became `woof-close-murderer-<id>.mp4` and `woof-close-ghost-<id>.mp4`, the still card from `play/public/reveal/` with the clip's sound. The stills are committed, like the portraits.
- **Built:** in video mode each name is one film on the Parlour TV: its recorded parts, then the night's own clip (name card or Mic saying the motive), a second of static after the motive clip; the card cuts in when the film ends, the Victim's after Ava's close. Lengths in `seed/woof-news.json` `closing.video`; the server sets `cardAt` and `victimAt` from the whole film (`closingVideoStage`); the Host tab says the bulletin is playing. With the box unticked nothing changed (the recordings' holds are as they were).
- **Reviewed** by four readers, each finding checked by another: a film replaying after a hold, a reloaded TV, the chime's moment, the old holds, no files with the box ticked, the Host tab's line. All fixed. One build error caught on screen first.
- **Tried:** both films in the preview with the sound off (`?preview=kiosk-finale-film`, `kiosk-finale-film-victim`, `&mute=1`). Not on the real TV, and never with sound.
- **Left:** a full deploy on Jon's word (functions and site; deploy from this checkout or copy the videos in, since a clean worktree has none), then the videos box. No loops, no `sydney.jpg`. No screen shows `Irwin Framed.png`. The 28 `rules-…` sound files are not the game's. Cards 565 to 567.
- **Deployed** 11 Nov evening on Jon's "Yes, publish" (eafcf05, a full deploy from a clean copy with the videos copied in, not pushed): 26 of 26 functions updated, 211 of 211 site files match, all 62 videos online. The videos box is still Jon's to tick; every open screen and phone needs a reload.
- **Decisions:** none by Jon. Mine, to confirm with him: the static sits after the motive clip, before the motive card (`closing.video.cut.after`).

## 11 Nov 2026 · Claude Code (before the walk-through: the media, a sweep, the postmortem)

- Deployed the same day on Jon's word ("Yes, publish"): the site only (`npm run deploy:site`), from a clean copy of dbb6ef9; 121 of 121 live files match the build, and the Postmortem page is in the live workshop. Not pushed.
- Jon: "This evening will be the full walk through with 3 players. Before
  that start I will have all content ready. Please make sure I know where to
  put the media and make sure the game is rock solid. I would like to have a
  system in place to have a postmortem review of how things went."
- The sweep: every suite passes (`npm test`), `npm run checks` all clear
  (22,042 case checks on 1,000 pretend cases, the dry run, the leak checks),
  `npm run fake-night` passes with 8 phones and with 2, 3, 4, 5, 9 and 10,
  the live site answers. Nothing in the game's code changed.
- Found, nothing broken: with three players there is one Act 4 group, so the
  Library crosses off one motive and the clues can leave two standing when
  Sir Irwin shows three cards. With four or more the checks find exactly one
  every time (500 pretend cases at each size). The fake night takes
  `--phones N` now and knows this. Card 562, and a line in
  `docs/on-the-night.md`.
- The media: `docs/media.md` (every folder and name on one page), `npm run
  media` (what is in, missing or misspelt; `-- --live` asks the site), and
  the bulletin videos' folder `play/public/video/` with its own page,
  gitignored like the loops. Today: the nine cue sounds are in; no news
  recording, video, loop or Sydney's photo yet; `media/power.wav` is an old
  file nothing reads.
- The postmortem (`docs/postmortem.md`): the workshop's Postmortem page (one
  note at a time, each a Timeline card, the board prints them first), `npm
  run night-log` on the brain (read only, every move of the night with its
  time), and `npm run postmortem`, which writes `docs/postmortems/<date>.md`.
- The board: cards 560 to 564 (three done, two for Jon: the night log before
  a run, the Postmortem page after it). The board still shows 515, 518, 530
  and 311 open because the workshop has not been opened since the 6 Nov
  deploy; they close when it is.
- Not deployed, not pushed. The Postmortem page reaches the workshop with the
  next `npm run deploy:site`; the night log and the media check work now.
- Left: Jon's cards 558, 559, 563, 564; the machine-bound cards; the open
  questions.

## 6 Nov 2026 · Claude Code (the stability sweep, and the deploy)

- Jon: "The intro content and the credits are also still to come. Deploy
  what we have thus far. Do a solid sweep for stability." The sweep: every
  suite (functions 297, cues 79, station 67, app 141, play 268, scripts 53),
  `npm run checks` (all clear, saved for the Health page), the live
  functions against the exports (`booDone` out, `arcadeClue` in), and a
  fresh review of the two 5 Nov commits.
- The review found one thing that would have shown on the night, fixed
  (`52556a8`): the arcade's chime was ignored once a group reached free
  play after the winner, so the host's Next left a free-play game running
  (up to two minutes) before the rules card and Boo's code came back for
  the next group, and a pause left the chime at its old time. Now the
  house's chime ends the visit's free play too (`play/src/lib/arcade.js`
  `arcadeRoundEnds`, `screens/Arcade.jsx` `tick`; a test). Also from the
  review: the arcade's rung is worked out once a group and room
  (`functions/lib/act4.js` `rewardOf` reuses the recorded rung), so a
  Parlour Game between the two players' clue moments cannot change the
  words; the camera page's "allow the camera" line no longer names the
  Catwalk; the last Catwalk words in `docs/on-the-night.md`,
  `docs/room-screens.md` and `docs/play-side.md` are gone.
- Noted and left: a pause moves the arcade's chime on but the deck plays
  on through it, while the Study stands still (the question arcadePause,
  on the board with its default built); any signed-in phone could write a
  kiosk key into its own presence row and ask for the group's clue early
  (the same trust every kiosk key has had since the station; a family
  party; left).
- Deployed: a full deploy from a clean copy of `52556a8` (the site, the
  rules, the functions; `booDone` deleted, `arcadeClue` new), then the site
  again for the board's new question. Every live file compared with the
  build. Pushed on 8 Nov on Jon's word (three iCloud duplicate files inside
  `.git`, "HEAD 2" and "index 2", had broken fetch; removed).
- Left: Jon's cards 558 (Boo's Mac set up) and 559 (one visit on a test
  night), the questions arcadeClueRung, arcadeCamera, arcadeSound,
  arcadePause and arcadeTrioTime, the intro content and the credits (Jon's,
  not code), and the machine-bound cards.

## 5 Nov 2026 · Claude Code (the arcade on the night, and three small cards)

- Jon, over Remote Control from his iPad: "Cook it all up. We are 1 week
  out!" Every open Claude Code card that could be built without him at a
  machine: 515, 530, 311 and 518. Built on main and committed; not deployed,
  not pushed. Nothing tried on the real Mac, deck or phones.
- Card 515, the arcade on the night. The Entryway's Act 4 round runs Miss
  Boo LaRue's Arcade on Susan's MacBook Pro and the Stream Deck + XL: plain
  `?kiosk=boo` is now the night's Entryway screen (`play/src/screens/Rooms.jsx`
  `BooRoom`), which mounts the same `BooArcade` (`screens/Arcade.jsx`) in a
  night mode: the players from `public/rotation` in the group's order, the
  chime at `public/boo.slotEndsAt` on the server's clock (a pause moves it,
  `PAUSE_SHIFTED`; the host's Next rings it at once and Boo's farewell plays
  out), every counted round's score to `arcadeScore` with the guest key, and
  at each of the first two players' clue moment a call to the new
  `arcadeClue` (`functions/lib/act4.js`; the callable takes it from the
  kiosk's own presence row, `access.js` `fromKiosk`), which deals that
  player's reward card to their phone and sends the words back for the
  screen (`arcadeClueText`, `CLUE_WAIT` until then). The reward
  (`rewardOf`, `cardFor(place)`) is Boo's bag hint about the Ghost at the
  group's average affection, the same words for both players; a trio's third
  gets Boo's line (`ARCADE_THIRD_LINE`, `third: true`, no hint); no
  cross-off (Jon, 29 Oct), and G32 still holds on all 1,000 stand-in cases.
  The cap deals every member's card at the chime; a phone that has its card
  keeps it. The night's screen shows no Connect, practice button, band or
  wake corner (the kiosk keeps the band and the wake): the deck is connected
  once from the practice page in the same Chrome before the guests come.
  Boo's Catwalk is gone from the night, the phones, the practices and the
  Game test tab (`booDone`, `booShow`, `booMoment`, `boo-start`, `boo-stop`,
  `public_state/game_test_boo`, `BooWall`, `BooRunway`, `BooMoments`); Boo's
  camera takes its photo a minute into each visit (`play/src/lib/pose.js`)
  and practises on a pretend visit; the game name is Miss Boo LaRue's Arcade
  with the hook "Five little games. One coin each. She's always judging."
  (`seed/game-names.json`). The fake night plays a visit in every Entryway
  round. New tests: the arcade on the server (`functions/test/act4.test.mjs`),
  G55's night mode (`play/test/arcade.test.mjs`), the camera at the arcade.
  Docs: `docs/on-the-night.md`, `docs/room-screens.md`, `docs/boo-arcade.md`,
  `docs/solving-the-case.md`, `docs/test-plan.md`, `CLAUDE.md`. Board: 515
  done, 558 (Boo's Mac set up) and 559 (one visit on a test night) for Jon,
  lines on 514 and 332, and the questions arcadeClueRung, arcadeCamera and
  arcadeSound with their defaults built. The cue sheet is unchanged: the
  brain still lends the Parlour HomePod to Susan's Mac through Act 4 (Jon,
  27 Oct), which the arcade does not use (arcadeSound asks).
- Card 530, the news flash. A new case check, G61 (`checks.js` `bulletin1Ok`,
  in `npm run checks` and the tests): bulletin 1 always has its line, a wrong
  family's own. On the party night a missing family shows plain words
  (`screen.js` `NEWS_QUIET`) and the Host tab is told (`noteMissingLine`
  'news', `house.js` `missingLineWords`); a rehearsal keeps the note in
  brackets.
- Card 311, the Trusting lines: a content migration (`2026-11-05-three-cards`)
  retires Salem's and Boo's household cards by their exact text and adds
  them again, Salem's under Salem Crooknog with the new Trusting Salem line
  and Boo's with the new Trusting Boo line. It lands when the workshop next
  opens. Their texts were read once from `safe_content/npc_cards` (safe
  content) with the service account, never printed beyond this Mac.
- Card 518, roomMusic: the board now says what the Canon says (each room its
  own player through Home scenes), which Jon's music Shortcuts built on
  31 Oct; nothing in the build changed. CLAUDE.md's Decisions line follows.
- Suites: functions 297, play 268, workshop 141, scripts 53, cues 79, all
  passing; `npm run checks` all clear with G61. The Preview's `kiosk-boo`
  and `kiosk-rules-entryway` looked at in the browser.
- Left: Jon's two jobs (558, 559) and the three questions; deploy and push
  when he says. The Canon needs no change (roomMusic and entrywayGame stand
  as it has them); the three new questions are on the board.

## 1 Nov 2026, later · Claude Code (the Study's stop, and the scream)

- Jon's message: "make the stop 15mins, I had that scream from the blackout."
  Built on main, and deployed on his "Deploy now" on 2 Nov: a full deploy
  (the site, the rules, storage and all 26 functions) from a clean copy of
  a9fe0db, after every suite and `npm run checks` (1,000 stand-in cases)
  passed on it. 119 of 119 live files match the build, the scream is not on
  the site, the rules are the same as before, and tick runs cleanly on the new
  code. Not pushed; not tried on the real wall.
- Three checkers then tried to prove the deploy wrong, and could not: every
  file matched plain, cache-busted and compressed (238 and 476 fetches), 182
  probes found no scream, all 26 functions carry the deploy hash of a9fe0db's
  functions folder, tick ran 13 times cleanly, and Start the Study's update
  step, run alone in a sandbox against the live site, fetched the 27 new
  station files and said "The study station is up to date." What they added:
  no page updates itself (no service worker; the HTML is never cached), so a
  phone or screen open since before the deploy keeps the old code until it is
  reloaded; and an old station with the new functions can miss the finished
  page, so restarting the station is required, not optional. The M1 Air
  itself could not be seen: if its Start the Study is older than 28 Oct, sits
  in a git checkout or is started with `npm start`, it fetches nothing.
- The stop. The game in the Study now stops at the end of the round, fifteen
  minutes from the chime, five seconds early (below), and with no round (a
  practice) fifteen minutes from the first touch. My call, for Jon to overrule: he said fifteen, and
  `CLAUDE.md` already said "The cap is the Act 4 round". The game's clock
  starts at the first touch and the round's at the chime, and a running game
  was never cut short, so a plain fifteen from the first touch would have run
  past the chime by the length of the group's walk upstairs: the next group
  would have found an old game on the wall and lost that time.
  `public/study`'s `slotEndsAt` now reaches the station (`follow.js`,
  `runner.due(group, settings, slot)`), and `study.js` `tick(now, slotEndsAt)`
  stops at the sooner of the two (the round's end less `STOP_EARLY_MS`).
  `capMs` 15 minutes, `warnMs` 13: Granolia's
  warning comes two minutes before the stop that will really happen, so a
  group that started late hears it at the right time.
- A new round. `setRooms` writes the group and the slot in one write, so both
  changing means the round moved on, and `runner.due` then stops a running
  game (`machine.stop`). A swap ("this group is in the study") changes only
  the group and a resume only the slot, and neither stops it. This also fixes
  something older than this work: the host's Next left the old game running.
- A pause. `paused()` moves the station's held slot on by the pause when the
  server's resume has not done it yet, and leaves it when it has, so the two
  can arrive in either order.
- The clocks. `house.js` `studyStopAt` is the one rule for the Host tab and
  the Study's screen (`Kiosk.jsx` `CAP_MS` gone), and `studyMsLeft` the one
  count, on the clock that stands still in a pause. `STUDY_CAP_MS` and
  `ABSENT_SLOT_MS` are fifteen minutes, and two tests now tie them, `capMs`
  and `warnMs` to the seed's `roundMinutes`, so they cannot drift apart again.
- The words moved to fifteen: Granolia's slow line, the station's page, the
  First round beat, the placeholder when the fifteen minutes are up, and the
  workshop's labels. A read of `safe_content` (18 areas, 307 items, nothing
  sealed) found no workshop line overriding them. Left at ten on purpose: a
  practice nobody touches (`station/lib/testmode.js`), the late bulletin in
  `Rooms.jsx`, the Game test tab's clock (`CLOCK_KEEP_MS`), old done cards and
  the handoffs.
- The scream. `play/public/audio/Scream.mp3` is Jon's, for the blackout (the
  entry below called it not mine). Card 134 asks for a file named blackout on
  the brain, so it is there: `media/blackout.wav`, 2.97 seconds, the one
  second of silence first, peak -6.7 dB, in place of the three-second tone
  (gitignored; to go back, delete `media/blackout.wav` and run
  `node scripts/make-placeholder-sounds.mjs`, without `--force`, which would
  rewrite every sound). Nobody has heard it: audio stays off until Jon says. His original is
  untouched, untracked and not on the site.
- The finished page. It showed only when a heartbeat happened to land in the
  rest, after a flash of the rules card that invited the group to start
  again. `runner` now sends `done` straight after the report, and the report
  no longer writes `idle` (`finishStudy`; only a pay-out without a report
  does, the host's Finish this group now or `study-tick`), so the screen goes
  straight from the game to the finished page and holds it through the twenty
  seconds' rest. The rules card after the rest no longer greets a group that
  has finished, and the finished page no longer keeps the numbered wall map
  of a group stopped while stuck on a pattern.
- A swap. The chime pays the group the round named: `finishStudy` redirects
  to the group the host named only for the station's own report
  (`reportedIn`). Before, a swapped-out group could end the night with no
  trace.
- Why five seconds early. The next chime lands on the round's end to within
  the network's jitter, and the report comes 2.4 seconds after a stop (the
  walls) or 3.3 after a solve. Stopped on the end itself, report and chime
  tossed a coin about every second round. `STOP_EARLY_MS` puts the report
  first. A game stopped mid-pattern can still lose, which does no harm.
- Pause and Resume, which Jon did not ask for. Pause has always taken the tabs
  off every phone, the Host tab with them, so nothing on a phone could reach
  Resume, only `node functions/host.mjs resume` on the brain. The two host
  phones now carry that one button (`ResumeNight`), on the pause card and on
  the strip over a held window, and everything else about a pause is as it
  was. `resumeNight` is now one transaction, so the two phones pressing it
  together move the clocks once. My first fix kept their whole tabs instead, and the second review
  showed what that let through in a pause: Salem's colours and Boo's show
  still running and paying a group, Cake! wiping Sir Irwin's countdown off
  the TV, Name the Murderer playing the news under One moment, and the Host
  tab's clocks running on. So the tabs stay away. The Host tab's own Resume
  branch stays, unreachable, as it was.
- Two reviews, each with its findings replayed on the code by a second agent,
  and the phones rendered from the real `App.jsx`. The first found the
  finished page, the swap, Pause, a game capped within a second when the
  network was down across a chime (the stop now ignores a round already over
  at the first touch), clocks that ran on through a pause (`studyMsLeft`), a
  finished group told it was expected, and the chime race. The second replayed
  all of that on the fixes and found the blink before the finished page, the
  Host tab's reach in a pause, and the rules deck, the Intro script and the
  Steward Handbook still at ten minutes a room (a line on Claude chat's card
  525). Left as they are, on purpose: a game a new group started on the wall
  during an internet outage across a chime stops when the Mac hears of the
  new round, and they start again with the rest of the round; their trace
  still comes (the failure table says so). A guest's touch on the wall before
  the first round reports for no group and retries once a second, as it
  always has, which costs a function call a second and nothing else.
- A third, short review, of the Resume button and the report change only
  (seven agents, each finding replayed from nothing, then a critic that ran
  every suite and the build in a clean clone). No blocker. It found the two
  phones' Resume race (the transaction above), the leftover wall map, and
  three sentences that were wrong: that a failed report holds the finished
  page back (it does not), that Finish this group now has no game to end (it
  may have, and that game plays on, as it always has), and that a pause stops
  every clock (the cats' line, Salem's round and Boo's show run on, so a long
  pause can end them; no clue is lost; `docs/on-the-night.md` now says so).
  Left as it is, on purpose: after Resume a phone lands on Now, one tap from
  the Host tab, the same as before. The fix would change every guest's phone
  too, for one tap. It is in `docs/on-the-night.md` and on card 332.
- Tests, on Node 26.7: app 140 of 140, play 271 of 271, functions 297 of 301
  (0 fail, 2 skipped, 2 todo), station 67 of 67, cues 79 of 79, scripts 53 of
  53, and `node scripts/checks.mjs --local --cases 300` all clear. New since
  the third review: both host phones pressing Resume (it fails on the old
  code), a failed report, the wall map and the pause card's button. The race
  sweep on the fake database, 300 trials at each gap from 0 to 700 ms, moved
  no clock twice. Not run anywhere real: no real phone, wall, Stream Deck or
  Firestore, and the Firestore emulator needs Java, which this Mac has not
  got, so the transaction's order of reads and writes rests on the fake and
  on reading the SDK.
- The board: migration `2026-11-01-study-stop` (card 557 done, a line on 134,
  which stays open until Jon has heard the scream, a line on the first tech
  run, 332, to try Pause and Resume, and the line on 525). The docs:
  `docs/study-light-game.md`, `docs/solving-the-case.md`, `docs/build-plan.md`,
  `docs/play-side.md`, `docs/room-screens.md`, `docs/test-plan.md` (G52, F12,
  F16), `docs/on-the-night.md`, this log, `CLAUDE.md`. The Canon: the rounds and the
  stop, which it still gave as ten (the 31 October change had not reached it),
  and a new Decided line. Start Here's snapshot, 1 November. The Canon's arcade
  section still describes two tokens: that is the 30 October handoff's, which
  Claude chat keeps.
- Left: on the M1 Air, Start the Study closed and opened again (if it is
  running there), watching for "The study station is up to date.", then the
  Study's screen reloaded; every phone or screen that had the game open
  before the deploy reloaded once, the two host phones first (only then do
  they show Resume and count to the new stop); the first hearing of the
  scream (134); arcadeTrioTime; the deck (514); the arcade on the night
  (515). The deploy went from a clean copy of
  the commit because `play/public/` goes into any build: a deploy from this
  checkout would have put Scream.mp3 on the site.

## 1 Nov 2026 · Claude Code (the arcade: Jon's five notes)

- Jon's message after playing the arcade ("Boo arcade is great"), five
  notes. Built on main and deployed on his "Deploy now" the same day: the
  site only (hosting, from a clean copy of 432070b; no functions, rules,
  storage or seed changed since c507571). 119 of 119 live files match the
  build, and the live arcade starts on the new bundle with no errors. Not
  pushed; not tried on the real Stream Deck + XL.
- The coins: each token sits under its game and goes when that game is
  played (`TOKEN_KEYS`, `menuFaces`), so the coins left are the games left.
  They spent from the left before (31 Oct).
- The winner's page: the strip says Tap here for free play at its right-hand
  end, and the page stays until a touch on the strip after `WINNER_MIN_MS`
  (`WINNER_MS` gone). My calls, for Jon to overrule: the ten-second timer
  went, so a group cannot miss the scores; only a strip touch leaves the
  page, the other keys and the dials no longer do; a tap that wanders and
  arrives as a swipe counts; the chime still ends it. The keys 1 to 3 are
  unchanged. On the page the Space bar and the OK button stand for the tap.
- Yarn Catch, Jon's question: yes, a full slide can move the basket all the
  way across. A slide now puts it in the column over where the finger lifts
  (`COLUMN_X`, `columnOver`; the old `slideColumns` counted ninths, so a full
  slide went round the edge and landed one key the wrong way). The limit:
  `@elgato-stream-deck` core 7.8.0 gives only `lcdShortPress`, `lcdLongPress`
  and `lcdSwipe(from, to)`, so a slide arrives once, as one event, and the
  basket jumps there and cannot follow the finger. Whether a slow slide is
  reported as a long press, which would do nothing, is not known until it is
  tried on the deck (on card 514). The dial still wraps; a swipe does not; a
  tap still does nothing (Jon, 31 Oct). The page's drawn strip now behaves
  like the real one: one event when the pointer lifts, a tap under
  `SLIDE_MIN` 16 pixels.
- Yarn Catch's strip: only the basket emoji in the count and the play
  (`basket` in `stripOf`, `STRIP_BASKET` 72 in `drawStrip`, whole at the two
  ends). The ready strip keeps Press any key to start. The basket stays on its
  bottom-row key too, which paints faster than the strip. The points, the
  time and the misses are on the Mac's screen; the Exit label went from the
  strip, and the third dial still exits.
- The Knock: `KNOCK_BEAT_END_MS` 300 (was 200), `KNOCK_TOP_AT` 1 (was 0.6),
  `KNOCK_LATE_MS` 200 (was 100), `KNOCK_EARLY_MS` 120 (was 60). The rule
  for a new thing per beat is unchanged, but the beats are slower, so about
  a third fewer things come (73 in fifty seconds, not 112). Three made-up
  players over 300 seeds on the real
  engine, counts only: the ordinary one lasted about 25 of the 50 seconds and
  never finished, and now finishes 98 games in 100 with about 50 points; the
  casual one lasts about 37 seconds, was 16; the keen one always finishes,
  was 83 in 100. This partly undoes Jon's "Much faster" and "A tighter hit
  window" of 30 Oct, so the card says so.
- Fixed on the way: the Game test tab, the Devices page, the status page and
  the engine's own header still described the visit before 30 Oct (two
  tokens, a clue after the second game, eighty seconds, ten minutes). The
  Game test tab's steps are tested now.
- The review before the deploy, under ultracode: four read-only reviewers
  on a clean copy of b1c8585 (the engine, the road from the deck, the board
  and the site, the written claims), a skeptic on each one's findings, and
  a critic; muted, nothing near Firestore, no sealed content. Verdict: safe
  to ship, no blockers; 18 findings survived and 7 were refuted, with
  several overlapping. Fixed before the deploy, because neither
  `fileTasks` nor `rewriteTasks` touches a done card, so a done card's words
  cannot be corrected by a later migration: card 556's false "How often new
  things come has not changed". Also fixed first: the space bar and Enter
  left the winner's page with the real deck connected (`heldRef` now; only
  the strip does); the digits at the winner on the practice page (1 to 3
  are `SCORE_KEYS`; 2 showed player 1's scores); the clue and third-player
  samples show a fifth game (`TRIO_DONE`); the slide test starts from every
  column; "Leave this game", fifteen minutes and a trio's clue on the Game
  test tab; the arcade as tried on Where we are; the line on card 514 now
  lists what only the deck can show and corrects two older lines on that
  card; the stale lines in `docs/boo-arcade.md`, some from 31 Oct. The
  review's harness (the real page and library on a fake HID device, muted)
  passed all 17 checks on the fixes.
- Two findings went to the board, not into this deploy. Card 557 for Claude
  Code: the Study's stop, its warning and its clocks are still ten minutes
  in a fifteen-minute round (`station/lib/study.js` `capMs`, `Kiosk.jsx`
  `CAP_MS`, `house.js` `STUDY_CAP_MS`, and the words in `seed/night.json`
  and Granolia's lines), though `CLAUDE.md`, `docs/study-light-game.md` and
  card 549 say fifteen; older than this work (31 Oct), and a stopped group
  is still paid. The question arcadeTrioTime for Jon: a trio's first two
  players need fourteen games and the round holds about eleven to thirteen
  full ones, so at full length a brisk trio gets its first player's clue
  only and an ordinary one none; the pretend groups in the test only finish
  because games left alone end early on strikes. Default as built; it wants
  an answer before card 515.
- Found in the shared folder during the session, not mine, left alone:
  `play/public/audio/Scream.mp3`, untracked, which nothing reads. A clean
  copy of the commit kept it out of the deploy. (Later that day: it is Jon's,
  for the blackout; see the entry above.)
- The board: migration `2026-11-01-arcade-notes` (cards 552 to 556 done, a
  line on 514). The docs: `docs/boo-arcade.md`, `docs/on-the-night.md`,
  `docs/test-plan.md` (G54, G55), this log, `CLAUDE.md`. Claude chat keeps
  the Canon and Start Here (the 30 October handoff's split). Tests: all six
  suites pass on 432070b, `npm run checks` all clear.
- Tried in the browser with sound blocked, since Jon's rule on audio stands
  (the arcade's tones count): the strip's pictures, a full slide and a tap, a
  whole visit with the coins checked at every turn, and the winner's page
  still up a minute later.
- The next workshop open applies two migrations, `2026-10-31-music-shortcuts`
  and this one: cards 550 to 557, the line on 514 and the question.
- Left: Jon's try on the deck, after reloading any arcade tab (514); the
  Study (557); arcadeTrioTime; the arcade on the night (515).

## 31 Oct 2026, evening · Claude Code (the music through Jon's seven Shortcuts)

- Jon's formal rundown (`Murderwin Rundown.xlsx` on his Desktop, the same
  23 cues as `docs/cue-list.md`) and his seven music Shortcuts: Default
  Jazz, Default Jazz 20%, Lightbulb Moment Music, Get Off My Grass Game
  Music, Intense Music 60%, Intense Music 35%, Credit Roll Music. Built:
  `cues/lib/shortcutMusic.js` (the Music app's interface, on the Shortcut
  runner), `musicShortcuts` in `cues/scenes.json` by the playlist keys,
  a sixth setting `act4` that runs three Shortcuts in order (the house
  jazz, then the Study's, then the Orangerie's) from the first round of
  Act 4 until dessert, `jazzLow` at 20, `MUSIC_SHORTCUTS=on` in
  `cues/.env` to take that road, `--check-music` walking the Shortcuts on
  it. The Music app keeps the cake's song. No dip under a cue sound on this
  road; the chimes still reach the HomePods by AirPlay, to be tried over
  the jazz on the tech run. Jon's part (card 551): a Stop Music Shortcut,
  the scenes' HomePods, and the switch. Cards 550 and 551 (544 to 549 went
  to the second arcade playtest, built in another session at the same
  time). Two real runs of `--check-music` on this Mac taught three things,
  built the same evening: a Home audio action stays "in progress" for ten
  to twenty seconds and Apple Home refuses any Shortcut meanwhile, so the
  runner tries a refused run again every 1.5 s for up to 30 s and drops it
  if a newer cue has come; a run a newer one has replaced says nothing
  when it fails late; a setting's Shortcuts (Act 4's three) finish one by
  one. `MUSIC_SHORTCUTS=on` is set in `cues/.env` (Jon: "just wire it").
  For Jon: Intense Music 60% and Credit Roll Music fail with "Object not
  found" (each Shortcut's own scene needs re-picking), Stop Music does not
  exist, and the cake's song is not in the Music library. Cues 79 tests,
  workshop suite green. Committed on main; Jon restarting the Mac; nothing
  on the site changed; not pushed.

## 31 Oct 2026, evening · Claude Code (the arcade from Jon's second playtest; fifteen-minute rounds)

- Jon's second playtest of Miss Boo LaRue's Arcade on the real Stream Deck
  + XL, sent as a transcript of his recording with a screenshot of the
  scoreboard. Reviewed and built on main in five commits (5aa8ae6, c9542f5,
  1e6da44, a03c112, 3a5a675), one for the board and the docs (34d6f93)
  and one for a flaky test (c507571). Deployed on Jon's "Deploy now" that
  evening from a clean copy of c507571: the whole site, the rules and all 26
  functions (every one updated, since the seed's round length changed); 119
  of 119 live files match the build; the tick ran clean after the
  switchover. Not pushed.
- Every game with strikes has five (`STRIKES_OUT` 5; Yarn Catch already had
  five misses). Boo Chasing Her Tail: the rug black, the tail one flat black
  band in a white glow (its drop shadow) with a white tip, three keys long
  all game (`TAIL_GROWS_AT` []: the growth read as the fish's doing),
  cucumbers on red, no pause at the edge (`TAIL_WRAP_MS` gone; a pause had
  felt like dropped clicks), and the page ignores a held key's repeats.
  Knock It Off the Table: a beat every 0.5 s at the start, 0.2 s from three
  fifths in; a miss crosses the table's end key only; the claret cloth back.
  Yarn Catch: the left dial a column a click and a slide along the strip a
  column a ninth of it, round the edges; no tap, no rail. The strip: the
  time a gold bar counting down with m:ss under it and the points beside it
  (`countdown` in `arcadeArt.js`, `clockOf` in the engine), whose turn big in
  the middle of the menu, tokens spent from the left whatever game was
  picked. The visit: the clue after all five games (`CLUE_AFTER_GAMES` =
  `TOKENS`), fifty-second games (`GAME_MS` 50000), no running maths under the
  players, the keys 1 to 3 (`SCORE_KEYS`) putting one player's five scores on
  the Mac's screen at the winner, Boo's free-play line says to listen for the
  chime, the scoreboard's games on one line and the fun facts fitting.
- Every Act 4 round is fifteen minutes (`seed/night.json` `act4.roundMinutes`
  15, read by `functions/lib/act4.js`; the arcade's `ROUND_MS` 900000). Act 4
  is about an hour and ten minutes now. The docs that said ten minutes say
  fifteen (`CLAUDE.md`, `docs/on-the-night.md`, `docs/room-screens.md`,
  `docs/study-light-game.md`, `docs/solving-the-case.md` G52).
- Not found in the code: a reason both dials could not turn at once, or a
  click that did not move Boo with nothing in her way; filed on card 514 for
  Jon's next try. Jon's maybe of a ten-second warm-up round is the question
  arcadeWarmUp (default no, nothing built).
- The board: migration `2026-10-31-arcade-playtest` (cards 544 to 549 done, a
  line on 514, arcadeWarmUp). The docs: `docs/boo-arcade.md`,
  `docs/on-the-night.md`, `docs/room-screens.md`, `docs/test-plan.md` (G54,
  G55), this log, `CLAUDE.md`. Claude chat keeps the Canon and Start Here
  (the 30 October handoff's split).
- A flaky test found on the way, not from this work: G59 in
  `functions/test/study-clock.test.mjs` took the study's round 1 group,
  which with three groups and four shuffled rooms is nobody about two runs
  in five; it takes the first group the study order names now.
- Left: Jon's try of the changed games on the deck (514); the arcade on the
  night (515); the deploy, on Jon's say-so.

## 31 Oct 2026, afternoon · Claude Code (Get Off My Lawn!: the screen, the phone, the string lights)

- Jon's Game test note 10012 on Get Off My Lawn!, worked in full and closed
  by number. Built on main; deployed on Jon's yes ("Deploy now") the same
  afternoon, the site only (hosting, from a clean copy of 81914f7; the
  functions and rules are unchanged since the morning's deploy, and the
  brain's change runs on this Mac): all 119 live files match the build. Not
  pushed.
- The Orangerie's screen (the brain's browser, `?kiosk=orangerie`) shows
  Salem's board while a group plays (`play/src/screens/Rooms.jsx`
  `SalemBoard`): the phones' colour over the whole screen with SHAKE or
  FREEZE on it, the count before a round, the thirty seconds filling, the
  restarts and why, Salem's picture, and the group's names with the slips
  each has caused (from `public/salem` `slipsBy`, by place). Between groups
  the rules card and the code as before; after the third round, the winner.
  The same board serves the practice at `?kiosk=orangerie&practice=1`
  (`Practice.jsx` `OrangeriePractice`, routed as `orangerie-wall`), opened
  from the Game test tab's new try; three new samples (`kiosk-orangerie-
  ready`, `-round`, `-passed`).
- Salem's head on the phone (`Act4.jsx` `SalemHead`): loose on the screen
  through a round, thrown by the phone's own motion, rolling downhill,
  bouncing off the edges, turning against the phone's turning, swelling
  with a hard shake; a frame loop on the element, no React redraw; a phone
  with no motion, or one asking for less motion, gets a gentle float. The
  motion hook keeps the extra readings (`ax`, `ay`, `gx`, `gy`, `spin`);
  the rules (`salemSlip`) are untouched.
- The string lights, found on this Mac: all three Shortcuts change the
  lights at once, then run on for about a minute (the green one twenty
  seconds) and end "Action set execution partially succeeded": something
  else in each Home scene is not answering. The brain cut each run off at
  eight seconds and counted it as the lights not answering, so the colours
  fell behind. Now (`cues/lib/strings.js` `createShortcutRunner`) every
  Shortcut the brain runs, the projector's plug included, counts as done
  after a head start of 0.75 s whether or not the Shortcut has finished (a
  90 s timeout behind it; a missing Shortcut reports in 70 ms, measured), a
  failure inside the head start still rejects, a late failure is one plain
  line that says what to fix, a cancelled run (the same Shortcut run again
  while the earlier one waits) is quiet, and `--check-strings` waits for
  the report. Jon, from his window: "tighten it up. I'm concerned because a
  lot of these cues will be done with shortcuts, game wide": hence one
  runner for all of them, and the shorter head start. `TwoWayLights` tries the pairing first and the
  Shortcuts from its first failure when both are set (the token in
  `cues/.env` is empty, so today it is the Shortcuts alone). Tried on the
  real Shortcuts: red, green, decor in 1.5 s each, then the Green v2 report
  after 20 s. The Home-app fix is Jon's card 543.
- Suites: cues 71, play 266, workshop 135, all passing. Looked at in the
  browser: the board's round sample and the phone's round sample.
- Left: Jon opens each of the three Home scenes and takes out whatever
  shows No Response (card 543), then stops and starts the brain once more
  so it runs the tightened relay code (the brain is not deployed: it runs
  from this checkout); the arcade still not wired into Act 4 (515). No
  decision taken, so the Canon is unchanged.

## 31 Oct 2026 · Claude Code (the Boo Arcade handoff deployed)

- Deployed on Jon's yes ("Deploy now"), from a clean copy of main at 2645ca4:
  the site, the rules, storage and the functions, since the handoff added
  `functions/lib/arcade.js`, the `arcadeScore` callable and the finale's
  arcade lines. Every suite (functions 293, cues 69, station 53, workshop
  135, play 264, scripts 53) and `npm run checks` (the dry run and the five
  leak checks, all clear) passed in the copy first.
- Live: all 119 files match the build; 26 functions, the same 26 the code
  exports (`arcadeScore` created, the other 25 updated); both rules files
  compiled. `tick` ran clean on its new revision the next minute (counts
  only). The live arcade page loads with no console errors.
- Left: as the 30 Oct entry says. The arcade is still not wired into Act 4
  (card 515); Jon's try of the changed games on the deck (514). Not pushed.

## 30 Oct 2026 · Claude Code (the Boo Arcade handoff from Jon's playtest)

- Applied Jon's handoff of 30 Oct (`docs/handoff-2026-10-30.md`, a Claude
  Doc): the five arcade games changed as his playtest asked, one round of
  each game a player, the scores saved per guest and per game and shown with
  the achievements in Act 7. Nine commits on main, one concern each, not
  deployed, not pushed.
- Every game: the third dial pressed in is Exit (labelled on the strip while
  a game counts down or runs), Leave this game and Escape on the screen; a
  game left never counts and its token comes back; "practice" with a C
  everywhere. The Tail: Boo's bottle green in place of the claret that read
  as brown (the rug, her keys and the tablecloths), the tail one smooth band
  with a sheen, quicker by the end, a key longer at a quarter and at half,
  Boo wrapping round the edges with a moment's pause, a fish to eat for 3,
  cucumbers that freeze her; a tail boxed in slips away. The Pointer: Boo
  faster, walls from 20 s, closer calls, a faded sparkle costs 2. The Mice:
  up to eight at once. The Knock: tables two and four run right to left,
  friends sit on the tables (knocking one off is a miss that says who), a
  beat of 0.38 s down to 0.18 by two fifths in, a tighter window, a miss
  turns the whole table red, the boxes labelled Misses. The Yarn: the strip
  is the basket's rail (a touch or a slide puts the basket under the
  finger), the arrows wrap, five misses end it, friends fall.
- The visit: five tokens, one a game; a game played is dimmed with a tick and
  refused; the clue still after the second game, then the rest, then the
  winner; forty seconds a game, the same for everyone (an adaptive share was
  tried and dropped: it made a brisk pair's last game two minutes, unfair for
  the per-game awards); a brisk pair fits all ten games, a trio most of its
  fifteen. Every counted round is written down (`records`; the page's
  `onRecord` hook, which the practice page does not use).
- The server: `functions/lib/arcade.js` keeps one score a guest a game
  (`arcadeScore`, `nights/{id}/public/arcade`; the first round counts) and
  the finale puts the top scorer in each game and the best all round, by
  place, after the host's achievements, widening the segment to fit. Check
  G60 (`functions/test/arcade.test.mjs`): one score a guest a game, the
  places, and no role anywhere near it.
- The board: cards 531 to 539 (done), a line on 514 and 515, the questions
  arcadeOverall and arcadeExit (defaults built). Docs: `docs/boo-arcade.md`
  (§1, §4, §5, §8 and the technical notes), `docs/on-the-night.md`,
  `docs/room-screens.md`, `docs/test-plan.md` (G54, G55, G60), `CLAUDE.md`.
  The handoff is marked Applied in both copies. Claude chat keeps the Canon
  and Start Here for this handoff, as it says.
- Left: the arcade is still not wired into Act 4 (card 515), so on a real
  night nothing writes a score; Jon's try of the changed games on the deck
  (514); forty seconds a game and the points from game to game are starting
  points for him to tune. Tests: functions 296, play 264, workshop (app) all
  pass; `functions/test/study-clock.test.mjs` has a flake ("Which group?")
  that fails on the previous commit too, untouched. Not deployed.

## 30 Oct 2026 · Claude Code (cards 527 and 529 deployed)

- Deployed on Jon's yes, from a clean copy of main at 3bfe05d: the site,
  the rules, storage and the functions, since card 529 changed four
  server files (`functions/lib/deal.js`, `night.js`, `station.js` and
  `checks.js`). Every test (functions 288, cues 69, station 53, workshop
  134, play 257, scripts 53) and npm run checks (21,042 of 21,042, the
  fake night and the 5 leak checks) passed in the copy first.
- Live: all 119 files match the build; all 25 functions updated, the same
  25 the code exports; the rules were already up to date, so they did not
  change. `tick` started on its new version and ran clean the next minute
  (it logs counts only). The live In Duplicate page loads the new build
  with no console errors. The study station's code (94791318b2c7) and the
  brain's are unchanged, so neither Mac needs a restart; a screen left
  open takes the new pages when it is reloaded.
- Left: neither fix is tried on the real devices (527 on the iPad on a
  rehearsal night, its Wi-Fi off as the last pair is found; 529's red line
  shows only if a line is missing on the party night). The board's
  migrations for cards 527 and 529 (with card 530 and the question
  quietWords) land when Jon next opens the workshop signed in. Not pushed.
  No decision taken, so the Canon is unchanged; Start Here's snapshot
  updated.

## 29 Oct 2026, night · Claude Code (never a note about the game on a guest's screen: card 529, check G59)

- Started from the arcade session, as a side task, for card 529. If a
  cat's motive hint or the Study's trace were ever missing on the party
  night, the guest would have read the house's own note in brackets,
  "(Here the cat would rule something out.)". It should never happen, and
  now, if it ever does, nothing in brackets reaches a guest on the party
  night.
- On the party night a missing hint reads "Miss Boo LaRue has nothing to
  tell you about the motive." (with that cat's name), and a missing trace
  in the Study "Nothing for you this time."; a clue card with no words
  says the same. A rehearsal keeps the note in brackets, marked Rehearsal
  text, so a hole shows when we practise.
- Jon's Host tab says so in a red line at the top: how many times, never
  which cat, guest or group, and that there is nothing to do. The night
  keeps the counts only (`missingLines`). `docs/on-the-night.md` has it,
  in the Host tab's list and in When something dies.
- A new check, G59, on every practice deal: every guest, and a guest who
  arrives late, gets a real line from every cat at every rung from 1 to
  5, and the Study always has the Ghost's trace to show. A real line is
  words with every blank filled: no square brackets, no blank left, no
  "undefined". It is one of the case checks now (twenty-one on every
  case, so 21,042 on the 1,000), and the fake night fails it too. Tried
  on broken cases to prove it fails them: a guest with no family left, a
  hole in the bank, a blank left unfilled, a line that breaks, a Ghost
  with no trace.
- Found while building: the first news flash would show its own note in
  brackets on the Parlour TV on the party night if its line were ever
  missing. Not changed here: card 530.
- Tests: functions 291 (2 skipped, 2 to do), cues 69, station 53, the
  workshop 133, play 256 and scripts 53 pass; npm run checks all clear
  (21,042 of 21,042 case checks on 1,000 practice cases, the fake night
  and the 5 leak checks; not saved, so the Health page still shows the
  last saved run). Not seen in the browser: the red line shows only when
  a line is missing, which no practice deal has; its words and its place
  on the Host tab are tested.
- Board: card 529 done; card 530 for Claude Code (the news flash, by 11
  November); the question quietWords for Jon (the plain words, or nothing
  on the card; default the plain words, built), in CLAUDE.md's open
  decisions too. No decision taken. Start Here's snapshot and the Canon
  not updated from this session. Not deployed, pushed or merged: this
  branch and the In Duplicate one (card 527) each add a migration after
  the arcade rework, so merging both keeps both, in order. Merged into
  main on 29 Oct (d3326a0); deployed 30 Oct (the entry above).

## 29 Oct 2026, night · Claude Code (In Duplicate's finished board sent again until the house hears it, card 527)

- Card 527, found by the setup-words check: when the house did not hear a
  finished In Duplicate board (a dropped signal), the Library's screen said
  "Try the last pair again." with every card already face up, and nothing
  sent the board again: only a reload (the group played it again) or the
  next board got past it, and the line stayed on the next board.
- Now the board sends itself again (`play/src/lib/rooms.js` `sendUntilHeard`
  and `resendAfter`): a second after the first miss, then two, four and
  eight, then every ten, for as long as it is the board on the table. It
  stops with the board (the next board, another group, the act), and a late
  answer about a board that has gone changes nothing. Under the board
  meanwhile: "The Library did not hear that. Trying again." (`UNHEARD_LINE`),
  gone once it is heard. Each board is a Board of its own
  (`key={boardKey}`), so the line goes with it and a finished board is
  never sent as the next (before, a group cut off with exactly six pairs
  found could send them once against the next group's first board).
- The Library's call (`callMemoryStep`) gives up after 15 seconds, not the
  usual 70, so a call that hangs counts as not heard and goes again.
- Checked `functions/lib/act4.js` `memoryStep`, unchanged: safe to repeat. A
  board it has heard comes back `already` (its step has moved on, or the
  match is cleared) and counts nothing; `payRoom` claims the reward in a
  transaction and deals each card by its id, so two at once pay once (the
  new test sees both take the clearing path and one pay). A board the house
  never hears is paid at the round's end, as before.
- Check F32, new (`docs/test-plan.md`): `play/test/rooms.test.mjs` (the
  waits, the misses, a board that leaves the table, a late answer, the
  screen's shape, the 15 seconds) and `functions/test/act4.test.mjs` (a
  heard board sent again; the last board twice at once). F31's Library test
  checks the new line. `docs/room-screens.md` (the Library) and
  `docs/on-the-night.md` (the trouble table) say what the screen does.
- The board: migration `2026-10-29-memory-resend` marks card 527 done.
- `npm test` at the root: all pass. In the browser pane, on this
  worktree's own build: the game on its own played through its three
  boards, each next board fresh and face down; the Library's sample ended
  with no line; and with the sample's send made to fail twice (a throwaway
  patch, reverted), the line showed at once and went with the third send,
  one and then two seconds later. No console errors.
- Left: not tried on the real iPad (on a rehearsal night, its Wi-Fi off as
  the last pair is found, then on). Not deployed, not pushed. No decision
  changed, so the Canon is unchanged; Start Here's snapshot is not updated
  here. Merged into main on 29 Oct (f6bb471); deployed 30 Oct (the entry
  at the top).

## 29 Oct 2026, evening · Claude Code (the arcade made again from Jon's notes and his try; the Entryway's answer; no setup words in front of the guests)

- Jon's three Game test notes on Miss Boo LaRue's Arcade (10009 to 10011:
  "The stream deck is the game.", "Think glam!", the tail "not cat like"),
  his line after them, "Catwalk is 100% scarped", and his words since: "we can do far
  more the touch strip", "We need to use green for all sucessful input.
  Like a check if you get the mouse." and "make the yawn use the touch
  strip for left and right controls".
- The Stream Deck is the game. While it is connected the Mac's screen is
  a scoreboard in big type (the game, the points, the time, the strikes,
  Boo's words, a pop for every point and every strike), never the
  controls. With no Stream Deck the deck is still drawn on the screen,
  to play with the mouse.
- The five games made again (`docs/boo-arcade.md` §4). Boo Chasing Her
  Tail: a fluffy black tail with a white tip round the 22 outside keys,
  caught with Boo's paw on the two outside dials, one key a click. The
  Lazy Pointer: the dot one key a click on the two outside dials,
  sparkles to catch, Boo stalking the dot. Whack-a-Mouse: quicker, two
  mice at first and up to six. Knock It Off the Table: four tables, the
  end keys only, things sliding one key a beat (Boo's own tables, not a
  copy of a classic game, so no root beer). Yarn Catch: a row at a time,
  never skipping one, the basket moved by the touch strip's two halves.
  Three of them count three strikes, shown as boxes crossed in red on the
  strip; every success is a green tick on its key. The look: black
  lacquer and gold with claret and parchment, from the house's colours,
  no dark blue.
- Smoother: the deck's writes were timed on the real + XL (Jon said yes
  to it being taken over for about 20 seconds). One write at a time
  through one queue: the pressed key first, pictures before flat keys,
  the strip last, in six parts and only those that changed; every face's
  picture made once and kept, and a game's faces made ready before they
  are needed; the game ticks every 16 ms. If it is still not smooth, the
  fallback is Jon's own (10010): the games on the Mac's screen, the
  Stream Deck as the controller.
- Jon answered entrywayGame: "its not motive its a ghost clue". Boo's
  Catwalk is scrapped; the arcade gives each player a clue about the
  Ghost, and no motive is crossed off. The Canon, CLAUDE.md,
  `docs/solving-the-case.md` and `docs/room-screens.md` say so. He asked
  whether there is enough to reveal the Ghost: nothing proves it yet on
  the foggiest night (the worst-dial check is Claude chat's patch,
  worstDial), so that is a new decision card, ghostProof (default: wait
  for the patch).
- "Practise a group's visit" is now "Try a group's visit" (Jon:
  "Spelling?"). Jon's rule: "make sure there is no programing things
  like connect stream deck and such visible to the players on the real
  game". The arcade's "connected" line is gone, card 515 (the arcade on
  the night) carries the rule, and it is in CLAUDE.md's CLIENT RULES and
  on the Canon. Then a sweep of every screen a guest sees on the night
  (check F31): on the party night the room screens lose their corner
  dot and their Tap once to wake this screen note (the bell stays: it is
  the cue's fallback), nothing shows in the corners while a room is dark, the TV no longer says Held
  (the Host tab does), the Study says "Granolia has dozed off. Find a
  host." if its station goes quiet, a failed call shows the screen's own
  plain words (never a code like [400]), the Rehearsal text tag shows
  only on a rehearsal, and the Library says the game is on the screen.
  Rehearsals and the practice pages keep their setup words. The sweep's
  check found a Library fault: a finished board the house did not hear
  is never sent again (card 527).
- Jon then tried it on the Mac: "They need to be bigger." (the coins);
  "the Tail game is better(on the mac but I can just hold an arrow
  button and it circles and win. Make it run over the entire board and
  out boos face for the front. make the paws boos face and dont let
  players hit it from the front. It blocks them. As time goes on it goes
  fast and add obsticals like maybe walls and other pets."; "I want a
  better name than pets as they have these personas of friends to the
  family and the birthday boy."; and "on the pratice page I need a back
  button. Im stuck and cant get back."
- Boo Chasing Her Tail made again on the whole board: you move Boo
  herself (her face on a gold key; the left dial across, the right dial
  up and down); her tail runs about by itself, end first, white tip at
  the back, running from her when she is close; its end and middle block
  her, so the tip is caught only from behind or the side; it quickens,
  and from 15 seconds a wall or one of her friends comes out every 15
  seconds, up to six, never shutting a key in. A held arrow key now catches one tip at most
  in a whole game (about 209 before). Read "out
  boos face for the front" as "put Boo's face for the front"; the snake
  reading (Boo's face at the head of her own tail) is offered to Jon.
- The decoys are Sir Irwin and his friends, not pets: Whack-a-Mouse's
  how-to, its rule, the strike words ("Strike 2! That's Zimothy
  Clawford, Esq."; Sir Irwin is "the birthday boy"), the lose line and
  the fun fact. Boo's coins bigger on the keys and about two and a half
  times on the screen. Back at the top of the page: Back to the games in
  a free-play game, Back to free play in a visit (no chime, no farewell),
  and Escape leaves a free-play game. With the Stream Deck connected the
  moment's Start, Back and OK are not drawn (the keys do it); pops keep
  their spot.
- From the earlier review, in the same build: one click of a dial is one
  key, every click (a quick turn sends several in one report; six at
  most); more mice up at once as Whack-a-Mouse goes on, up to six; a
  press just after a thing got off a table is forgiven, and the things
  are drawn over the ticks and crosses; gold caught counts in the fun
  facts; every strike a big red cross; no device's name in the game's
  words ("Pick a game"). Built by a workflow (the game and the pictures
  side by side, each checked by another agent trying to break it, then
  repaired). The checkers found four faults, all repaired: a game left
  open across a reload of the page broke on the new game (it is now
  filled in and plays on); a test helper could hang the run instead of
  failing; the walls were brighter than Boo (now grey stone, so she is
  the brightest key); and nothing tested which way the tail's pieces
  point (now tested).
- A review of the page and the board found, and fixed: the points from an
  old game all popping up again at once on the scoreboard (now cleared
  with each new game and each time the Stream Deck comes or goes); the
  page's very first click missing Connect or Try a group's visit (the
  foot of the page no longer moves under the pointer at the press); the
  Devices page and Where we are still calling entrywayGame open; card
  526 saying no setup word was left anywhere on the night (it now names
  what is left, and card 529 holds the notes a guest would see if a
  line were missing); the tail's measured points (about 107, 208 and
  527 at a key every 250, 150 and 64 milliseconds, 40 games each); Jon's
  "Catwalk is 100% scarped" quoted as he typed it (the Canon too); and
  this log's line about the bell. Also: the player whose turn it is is
  ringed in gold, and the pops land well apart.
- The painter's tests were written again (53) and found three faults,
  now fixed: a strip that could not be drawn could leave the touch strip
  torn between two strips; faces made ready before a clear were never
  made ready again; and a paint with no options given as null threw. The
  game's own tests were written again for the new games (the game 67,
  the pictures 19, the painter 53).
- The arcade doc's technical part and its four checks in the test plan
  (G54, G55, G56, L09) were written again from the code by a workflow,
  then checked line by line by three agents. They found 24 places the
  doc said more or less than the code does, all now fixed: among them a
  slow pair after a 45-second walk loses its second clue nearly every
  time (about 96 visits in 100, not 4 in 5); the tail turns about every
  other step, not mostly straight on; the sparkle-only Pointer player is
  out in about 15 seconds with about 30 points; Try a group's visit
  starts the fun facts again; the Pointer's menu key keeps its red glow.
  The held-arrow test now checks one catch at most, as measured and as
  §4 says. Stale words fixed in four files (a styles comment, a test's
  name, a section number in the sound code, and the household pictures
  note, which had said the cats' full pictures showed nowhere: the room
  screens have shown them since 26 October).
- Tests: functions 281 (2 skipped, 2 to do), cues 69, station 53, the
  workshop 132, play 254 and scripts 53 pass; npm run checks all clear
  (20,042 of 20,042 case checks on 1,000 practice cases, the fake night
  and the 5 leak checks; not saved, since the script has no way into
  Firestore from this Mac); the site builds and its build check passes.
  Checked in the browser pane, in a tab of its own: the first click on a
  fresh page opens Try a group's visit, whose form has Back to free play;
  Boo Chasing Her Tail drawn (the claret floor, Boo on gold, the tail
  running off), the first wall at 15 seconds, and two walls and Sir
  Irwin by 45; Escape back to the menu; no console errors. Not tried on
  the real Stream Deck + XL since the rework: that is Jon's try (514).
- Board: the notes 10009 to 10011 closed by number; card 524 (the arcade
  made again) done; card 525 for Claude chat (the rules deck and the
  Intro script name the arcade, not the Catwalk, by 6 November); card
  526 (no setup words on the guests' screens) and 528 (the tail over the
  whole board, Back and bigger coins) done; card 527 for Claude Code (the
  Library's finished board sent again until the house hears it, by 11
  November); card 529 for Claude Code (no note about the game on a
  guest's screen if a line is ever missing, by 11 November);
  entrywayGame answered; ghostProof added; 514 (Jon's try)
  and 515 (the arcade on the night) written again. The Canon and Start
  Here's snapshot updated.
- Deployed 29 Oct on Jon's yes, from a clean copy of 27f3777: hosting
  only, since no function, rule or study station code changed after the
  last deploy (40dc5c8). It also carried the arcade's menu (53b6266) and
  the setup-words sweep (41cb5a9). Every test and npm run checks passed
  in the copy first; all 119 live files match the build; the live
  arcade's Boo Chasing Her Tail starts with Back to the games at the top
  and no console errors. Not pushed.
- Cards 527 and 529 ran as side sessions of their own (entries above),
  each on its own branch; both checked here (every test on each branch,
  and the checks on 529's), then merged into main on Jon's yes (f6bb471
  and d3326a0). Where both added to the board, this log and the test
  plan, both are kept: the In Duplicate migration first, then never a
  note. On the merged main every test passes (functions 288, cues 69,
  station 53, workshop 134, play 257, scripts 53), npm run checks is all
  clear (21,042 of 21,042) and the site builds. The Canon gained
  quietWords on its open list, and Start Here's snapshot says so.
  Deployed 30 Oct (the entry at the top); not pushed.

## 29 Oct 2026 · Claude Code (the arcade's menu: Boo's face, paws and a flashing top row)

- Jon, looking at the arcade's menu on the practice server: "Use the boo
  face image. Make the drop shadow less noticeable on the "tail." Knock
  should be the cat paws.  instead of the stars on the top row. Make it
  flashing like an arcade game."
- Boo's face picture: a fresh page already showed it on the top row's
  middle key. Jon's page showed the drawn stand-in cat because it had
  been open while the code changed: the practice server swapped in new
  picture code that had not loaded the pictures, and nothing told the
  screen to draw its keys again. Now the screen draws its keys again
  each time the pictures come in.
- The black cat on the Tail key: drawn once in a faint glow (it was
  drawn twice in a strong one). The Knock key: Boo's paws (🐾, the paws
  she swipes with in the game), with no glow, as a glow blurred them;
  the vase stays on her table. Glow strengths were compared side by side
  before choosing.
- The top row: read as paws in place of the stars, flashing like an
  arcade's sign. Brass paw prints, one in three lit, the lights running
  in towards Boo's face four times a second; the winner's top row
  flashes the same way. The other reading (Boo's face along the row) is
  offered to Jon on card 523.
- Checked in the browser pane, in a tab of its own beside Jon's: the
  menu's lights moving in towards Boo step by step, her face picture in
  the middle, the new Knock and Tail keys, and the winner's row
  flashing. Not tried on the real Stream Deck + XL: on it the menu
  writes about five keys a step, four steps a second.
- Reviewed by a workflow (three readers, then a check of each finding):
  nothing wrong in the game. Four fixes to the tests: the Tail and Knock
  test now draws each key fresh (it was reading kept pictures, so its
  "no cat" and "no paws" checks could never fail), the winner's top row
  is compared key by key, and the flashing speed is checked as a range
  (150 to 500 ms), not one number. Turned down: a hot-update order that
  does not happen, and the Knock key's grey paws on the dark blue, which
  Jon judges on the real deck (his notes since ask for brighter colours
  than the dark blue, so the ground changes in the rework anyway).
- Tests: functions 281 (2 skipped, 2 to do), cues 69, station 53, the
  workshop 131, play 180 and scripts 53 pass; `npm run checks`
  all clear; the build and its check pass. Sixteen deliberate breaks of
  the new code, each in a throwaway copy, each fail a test: among them
  the lights running outward or standing still, two in three lit, Boo
  gone from the middle, the winner's row still, the vase back on Knock,
  the cat drawn twice or in the old glow, a glow on the Knock paws or on
  an unlit paw, and the screen not drawing its keys again.
- Board: card 523 (the menu) done, and a line on Jon's try of the arcade
  (514). No decision changed, so the Canon is as it was. Start Here's
  snapshot says so. `docs/boo-arcade.md` (§1, §3 and the technical
  notes) and `docs/test-plan.md` (G54) updated. Deployed later on
  29 Oct, with the arcade made again (27f3777).

## 29 Oct 2026 · Claude Code (Whack-a-Mouse's pets, the black cat, the words on the strip)

- Jon: "lets add a decoy element to the mouse", and asked what the decoy
  should be: "all the pets. zimmy is a similar color. I think after 3
  missed your out, or it ends at 2 mins". Built in Miss Boo LaRue's
  Arcade's Whack-a-Mouse.
- From five seconds in, about one in four of what pops up is one of the
  household's five pets (Sir Irwin, Granolia, Boo, Zimothy and Salem),
  each its own face picture from `play/public/household/faces/`, up as
  long as a mouse. A pet tapped scores nothing, plays the miss and shows
  on red for 0.6 seconds; the third ends the game ("You tapped three
  pets. 12 points.", and Boo: "Not the household, darling. Out you go.").
  While it plays, the strip (in place of the game's name) and the screen
  beside the points say "Pets tapped: 1 of 3". Read as Jon's "missed": a
  mouse that hides, or a tap on an empty key, costs nothing. Otherwise
  the game still ends at its two minutes (80 seconds for a trio). A key a
  mouse has just left stays empty for half a second, so a tap a moment
  late never lands on a pet.
- Pretend players who never tap a pet now score about 113, 106 and 45
  (quick, typical, slow; 156, 144 and 57 before, as there are fewer
  mice). One who takes one pet in 20 for a mouse (Zimothy one in ten) is
  out in about one game in four, usually in the second minute. How often
  a real guest does is for Jon's try (card 514).
- Then, the same day: "Lets use the black cat emoji for the tail", and
  asked where, "The Tail key on the menu". The Tail key shows a black cat
  in a pale glow; the treat in the game stays a fish. And "Make sure all
  strike systems show some verbage in the touch screen": every strike
  says so on the touch strip for a second and a half, in place of the
  points ("Strike 1! That's a pet.", then "Strike 2! That's a pet.",
  which stay up while mice are tapped; "Too soon!" or "Too late!" in
  Knock It Off the Table, where a knock brings the points back sooner).
  The build adds: the strip says Whack-a-Mouse's rule before it starts
  ("Three pets and you're out."), and when any game ends, its strip says
  how ("Boo bit her own tail.", "You tapped three pets.", "Time's up.")
  beside the points. Yarn Catch has no strikes (a ball that falls past
  only scores nothing), so while it plays its strip shows the points, as
  before.
- Checked in the browser pane (in a tab of its own, beside Jon's): the
  five pets and their red faces drawn side by side by the page's own
  code, "Pets tapped" on the strip and beside the points, and three pets
  tapped (by a test tapper) ending the game with Boo's line and picture.
  Every new strip drawn in the real fonts fits at full size (nothing
  shrunk or cut; the tightest, Knock It Off the Table's result, 289 of
  302 pixels); on the page, the ready strip with the rule, "Strike 2!
  That's a pet." 20 ms after a tap and the points again after 1.5
  seconds, and the result's "You tapped three pets."; the black cat on
  the menu. No console errors. After the second review, again in a tab
  of its own: Zimothy tapped and a mouse 43 ms later, and "Strike 1!
  That's a pet." stayed its whole 1.5 seconds before "1 point"; no
  console errors. Not tried on the real Stream Deck + XL.
- Reviewed twice, each finding checked again before anything was fixed.
  The first (13 findings, 5 real) found that a tap a moment late for a
  mouse could land on a pet that came up in its place: a key a mouse
  leaves now stays empty for half a second. The second (19 findings, all
  real, most small) found that a mouse tapped just after a strike wiped
  its words, sometimes before the strip could show them: now they stay
  their whole second and a half in Whack-a-Mouse (the screen shows the
  points meanwhile), and only a knock ends them sooner in Knock It Off
  the Table. The rest were checks that could not fail (now they can: the
  black cat's glow, Boo's face loading first, each pet's picture late in
  turn with its own stand-in, the strike words found among what was
  shown, a game ending while a strike's words still show) and wording in
  the docs and on card 522. Also new: a check that each pet's fitting
  box matches its face picture, so a new picture fails it until it is
  fitted again (the household pictures' README tells Jon). Left for
  Jon's try: on two strips the middle words sit close to the side ones
  (the ready strip with the rule, and Knock It Off the Table's win), 34
  and 41 pixels apart on a strip 1,200 wide.
- Tests: functions 281 (2 skipped, 2 to do), cues 69, station 53, the
  workshop 130, play 178 and scripts 53 pass; `npm run checks` all clear;
  the build and its check pass. Twenty-seven deliberate breaks of the new
  code, each in a throwaway copy, each fail a test: among them no rests,
  the red key free, a pet up longer, no strike words or short ones, a
  mouse tapped that wipes them, a knock that keeps them, the words wrong
  on the edge or on the way back, the result showing a strike's words,
  no rule, the old result strip, a fish on the Tail key or a cat with no
  glow, Boo's face not first, a wrong stand-in, a late picture used and a
  box measured wrong.
- Deployed 29 Oct on Jon's yes, from a clean copy of 40dc5c8, together
  with the two winners (the entry below): the site, the rules (unchanged)
  and all 25 functions. The clean copy passed every test and check
  first; afterwards all 118 live files matched the build, and the live
  arcade loaded with the new words and the black cat, no console errors.
  Not pushed.
- Board: cards 520 (the pets), 521 (the black cat) and 522 (the words on
  the strip) done; a line about all three added to Jon's try of the
  arcade (514); card 515's points for the mice brought up to date and the
  menu's fish taken out of its questions (its old words kept on the
  card). No decision changed, so the Canon is
  as it was. Start Here's snapshot says so. `docs/boo-arcade.md` (§1, §3,
  §4, §5, §6, §7, §8 and the technical notes), `docs/test-plan.md` (G54
  and G56) and `play/public/household/README.md` updated.

## 29 Oct 2026 · Claude Code (the two just-for-fun winners)

- Jon, 28 Oct: "Make boo's, zimmy's, and Salem have a winner. Just for
  fun." Boo's arcade had its winner; this session built the other two
  (cards 516 and 517), picked the arcade's way: the best count wins, a tie
  names everyone tied, and one player names nobody.
- In Duplicate: each pair counts for the player whose turn it was, over
  all three boards. After the third board the Library's screen names
  whoever found the most pairs, in Zimothy's voice ("The sharpest clerk at
  the table. I'd hire you. Cheaply."; a tie: "A tie. I'll split the credit
  and bill you both."), the name big and a plain line under it ("Most
  pairs: Margaret, 12."). If the chime comes first, nobody is named.
- Get Off My Lawn!: each slip counts against the phone that made it. Once
  Salem's game is cleared, the Orangerie's screen (the brain's browser)
  names whoever slipped least, in Salem's voice ("That one barely
  trampled my lawn. Don't let it go to your head."; a tie: "A tie. Can't
  tell you lot apart. Never could."). A phone that can't feel a shake
  never slips, so it would always win: every phone now says whether it
  felt a shake as the clean mark passes, and only those phones (and any
  that slipped) can win.
- Neither changes anything: the whole group is paid the same, and nothing
  earns a clue. The counts live on the server by place in the group,
  numbers only (no names on the rooms' public docs, L07), so a reloaded
  screen still names the right player; the screens put the names to them
  from the Act 4 groups.
- Samples: `?preview=kiosk-memory-winner`, `kiosk-memory-tie`,
  `kiosk-orangerie-winner` and `kiosk-orangerie-tie`, and one of each on
  the Game test tab under its game. Checked in the browser pane at 800 by
  600 and at the iPad's 1366 by 1024: all four, and the rules card and the
  memory board as before, with no console errors. Not tried on a
  rehearsal night yet (card 519).
- Checks G57 and G58 (`docs/test-plan.md`); `docs/room-screens.md` and
  `docs/on-the-night.md` updated.
- Tests: functions 281 (2 skipped, 2 to do), cues 69, station 53, the
  workshop 129, play 171 and scripts 53 pass. `npm run checks`: all clear
  (not saved to the Health page from here: no way into Firestore). The
  build and its check pass. Deployed later on 29 Oct with Whack-a-Mouse's
  pets (the entry above); not pushed.
- Board: cards 516 and 517 done; new 519 (Jon tries the two winners on a
  rehearsal night that reaches Act 4, by 6 Nov). Start Here's snapshot
  says so. No decision changed, so the Canon is as it was.
- Noticed, not changed: the Game test practices name no winner (the
  memory match on its own has no names, and Salem's practice has no
  group); the Game test tab and the Devices page still say In Duplicate
  has 7, 10 and 14 pairs (the game deals 6, 10 and 14).

## 28 to 29 Oct 2026 · Claude Code (Miss Boo LaRue's Arcade, built to try)

- Jon: "We need to get boos game up for testing. Not the cat walk the
  arcade games." Miss Boo LaRue's Arcade is built from Jon's 28 Oct talk,
  on a page of its own: `?kiosk=boo&play=1` (free play) and `&visit=1`
  (a practice visit; `&names=` starts one at once). It reads no night,
  pays nothing and deals no clue. The night keeps Boo's Catwalk until Jon
  answers entrywayGame. `docs/boo-arcade.md` has the whole game.
- Five games on the Stream Deck + XL (Boo Chasing Her Tail, The Lazy
  Pointer, Whack-a-Mouse, Knock It Off the Table, Yarn Catch), picked from
  the middle of the second row of keys, two blank keys at each end. The
  left three dials steer left and right, the right three up and down, and
  a press on any dial knocks. With no Stream Deck the deck drawn on the
  screen plays the same, with the mouse or the keyboard.
- The visit: two or three names, two tokens each in turns, two minutes a
  game (80 seconds for a trio), each player's clue on the screen after
  their second game (in practice a line in square brackets), a trio's
  third player gets "Didn't I give you enough? Now be off! I'm done
  playing games.", Boo's winner (the most points, ties named), free play,
  and "Be on your way." at the chime, ten minutes in or on Ring the chime.
- Reviewed on 29 Oct (a Workflow of reviewers and bot players), and the
  confirmed findings fixed: in a visit, a game that would run into the
  chime is cut short (never under 30 seconds) so its clue usually still
  comes first (a pair at an ordinary pace lost its second clue 86 times in
  100 before; none now); the chime names a trio's third player apart; the
  knock's paw rests 0.4 seconds, and a press while it rests misses again;
  the mice stay up a little longer; one arcade tab holds the Stream Deck
  at a time (the tab opened last takes it, and the other says so, with
  Connect to take it back); a long winner's line fits; Boo's picture and
  the sounds wait properly; the practice note's words. The study station
  now opens only a fifteen-key deck, so the + XL beside it never confuses
  it (`station/lib/streamdeck.js`), and the hardware check counts the
  same way.
- Checked in the browser pane at 1280 by 720, on the built site: free
  play, a visit with three 30-character names, the count, the chime's
  two-sentence farewell and the clue screen all fit, with no console
  errors. Not tried: the real Stream Deck + XL in Chrome, and how fast
  each game feels.
- Tests: functions 279 (4 skipped), cues 69, station 53, the workshop 128,
  play 169 and scripts 53 pass. `npm run checks`: all clear. The build
  and its check pass.
- Deployed 29 Oct on Jon's yes, from a clean copy of dc6a6af (another
  session was at work in the same folder, so none of its edits went out):
  hosting, the rules (unchanged) and the functions (all 25 skipped,
  unchanged since 28 Oct). The tests, the checks and the build passed on
  that copy first. Checked live: all 118 files match the build byte for
  byte, the study station's code is version 94791318b2c7, and the arcade
  opens and plays at ?kiosk=boo&play=1 with no errors. The workshop could
  not be opened signed in from here, so the board's new cards (513 to 518)
  land the next time Jon opens it. The station picks up its fix at its
  next start. Not pushed.
- Board: card 513 done; new 514 (Jon tries the arcade with the + XL, by
  1 Nov), 515 (the arcade on the night, only if entrywayGame picks it,
  with the questions to ask then: even points, Knock's steady press, each
  clue's affection, the sounds, the two-minute games, the fish), 516 and
  517 (Jon's just-for-fun winners for In Duplicate and Get Off My Lawn!),
  and 518 (below).
- The Canon's Genuinely open list (checked 29 Oct) gains the three open
  questions it was missing: promptScreen (25 Oct), studySecondScreen and
  entrywayGame (28 Oct). Start Here's snapshot is dated 29 Oct. Noticed on
  the way: the Canon and Start Here say Jon answered roomMusic on 25 Oct
  (one Apple Home scene per cue), while the board, `CLAUDE.md` and the
  build keep it open on its default (one playlist through the brain).
  Card 518 asks Jon once which stands; nothing changed meanwhile.
- Left: Jon's try (card 514), then his answer to entrywayGame.
- Decisions: none changed. entrywayGame stays open (default: Boo's
  Catwalk), now listed in `CLAUDE.md` and on the Canon.

## 28 Oct 2026 · Claude Code (the phone's look; Jon's five Game test notes)

- The phone app has a new look (Jon: "make it look pretty", "the menu at
  the bottom is crude", "a hierarchy system"): one ladder of text sizes for
  the whole app (label, small, body, lead, title, display), the serif for
  what the household says and a plain face for what the phone tells you,
  brass edges and a soft glow on the cards and the big buttons, and a new
  tab bar with a small line drawing above each word, the lit tab in brass.
  The header is the act's number and name. Every tab word fits on a phone
  320 to 390 pixels wide (checked in the preview).
- Fewer words (Jon: "way too many words on the pages"): the Act 4
  directions and arrivals, every notice, the lights-out lines, the Relay
  Drawing's screens, Salem's and Boo's phone screens, the Welcome and the
  practices. The TV cards keep their full rules; a test checks that the
  phones' short rules agree with them.
- Get Off My Lawn! (card 10008): while a round plays, each phone's whole
  screen is only red or green, with no words. The rule shows once, before
  the first round: a red Shake tile and a green Freeze tile.
- The string lights and the practice (card 10007): the brain followed only
  the night's game, never the Game test practice. Now it follows the
  practice too, and the night's game wins if both play. Stop the brain and
  start it again once to pick this up.
- In Duplicate full screen (card 10005): the page now lets an iPad open it
  from a Home Screen icon with no Safari bars (Share, then Add to Home
  Screen). Nothing ever asks anyone to install. New card 511 for Jon: the
  three icons on the iPad Pro.
- The study's second screen (card 10006): a decision card,
  studySecondScreen. Its default needs nothing built: the study's screen
  full screen on the second display, the station's window on the Mac.
- Granolia's Lightbulb Moment (card 10004): done, it ships.
- Tests: functions 279, cues 69, station 48, play 149 and scripts 52 pass;
  the workshop 125 of 126. The one failing test belongs to the Boo arcade
  work in progress in the same folder (another session), which this commit
  leaves out.
- Deployed 28 Oct on Jon's yes: hosting, the rules and all 25 functions.
  The first try stopped before anything went out (Google's us-central1
  was briefly unreachable); the second went through. Checked live: the new
  tab bar and Salem's red screen on the phone, the board's changes in the
  workshop. The deploy also carried the Boo arcade session's uncommitted
  work as the folder stood (Jon: deploy now, arcade bits and all): its
  Game test entries and its own page at ?kiosk=boo&play=1, which no
  guest's phone and no night screen opens. Not pushed.
- Left: Jon looks over the new look on his phone (card 512) and puts the
  iPad stations on its Home Screen (card 511). The brain was not running,
  so its next start follows the practice. The board marks the five notes
  done the next time the workshop opens.
- Decisions: studySecondScreen, new and open.

## 28 Oct 2026 · Claude Code (In Duplicate's turns; the Entryway's game)

- In Duplicate takes turns (Jon, 27 Oct): the Library screen names whose
  turn it is, from the Act 4 group (so a trio is known when it arrives); a
  pair keeps the turn, a miss passes it on, each board starts with someone
  else. The whole group is still paid. Tried in the preview with three
  names. Not tried on the iPad.
- The 27 Oct session's work (Boo's music on the Parlour HomePod) was
  committed as it stood.
- Talked through, not built: the projector cannot reach the landing, so a
  Stream Deck + XL arcade for Boo on Susan's MacBook Pro (decision card
  entrywayGame, with the design in its note). Jon also floated, then
  dropped, renaming Boo to Miss Beaux LaRue: her name stays Miss Boo LaRue.
- All six test suites, `npm run checks` (all clear) and the build pass.
  Deployed 28 Oct on Jon's yes (hosting; no function changed). Not pushed.
- The study's rules card draws both walls as they hang, read from the
  controllers' layouts and levelled to Jon's photos (`play/src/lib/walls.js`).
- The study station was started on the brain; it reached both walls but the
  key word saved online did not match station/.env. SKMBA is up: the station
  moves there (a zip of station/ with its settings, made for AirDrop).
- The study station starts with a double-click (Jon: setup was too much
  work): `station/Start the Study.command` clears the AirDrop mark, finds
  Node (or opens its download page), keeps the Mac awake and restarts the
  station if it stops. The zip for SKMBA (Desktop, "Study station.zip")
  carries the parts and the settings, so nothing installs but Node.
  On Jon's yes the online key word was set to match station/.env and
  cues/.env (checked by match only, never printed).
- The zip is on the workshop (Jon asked): the Study test page's Download
  the Study station button, shown while the station is not connected. It
  lives in Cloud Storage at `downloads/study-station.zip`, staff only (a
  signed-out request gets 403), never on Hosting, since it holds
  station/.env and the site and repo are public. A new one after any change
  to station/: `npm --prefix scripts run upload-station`. Deployed 28 Oct
  (hosting) on Jon's ask. Not pushed.
- Teaching the taps was slow. Measured on the real Elements: the gesture
  stream reports a tap about 1.1 s after the finger and never reports a
  press held about a second. The station now also takes the wall's raw
  touch over UDP (TouchEventsPort), one tap per touch, and drops the
  stream's late copy. Replayed the recorded touches: one tap each. A fresh
  zip is saved. Start the Study now fetches the newest station code from
  the site at every start (`hosting/station-code/`, built by
  `scripts/station-code.mjs`), so later fixes need no download; it never
  touches the repo's own station/. Needs a hosting deploy to take effect.
- The practice round took no taps (four misses). Listened again: touching
  across the wall, the gesture stream read most taps as swipes and
  reported 4 of 9; the fast road reported all 9, one each. A dropped tap
  makes the next one a miss. Fix: the new station (the fresh zip).
- Jon played a practice round on the new station: it works, and is tricky.
  His notes, built: one half of each Lines bar lights for a count (so the
  count reads), a green 3, 2, 1 on the Lines before every pattern, one red
  flash on the Lines for a wrong touch or a wrong pair, tighter pauses.
  Tried in the tests and on the real Lines layout, not yet on the walls.
  Deployed 28 Oct on Jon's yes (hosting, with the station code at
  `/station-code/`, version 3e5bd24aac00). Not pushed.
- The Stream Deck in the game's branding (Jon picked branding over three
  mock-ups): faces drawn once in a browser (`station/keys/make.html`) and
  painted from files; the top-right key flashes a green tick for a right
  pair, a red cross for a wrong one. The faces travel with the station
  code, so SKMBA gets them on a restart after a deploy.
- macOS on SKMBA refused the downloaded starter; right-click Open no longer
  works, so the page now says Open Anyway in Privacy & Security.
- Left: Jon's answer on entrywayGame (and, if the arcade, how to make up
  Boo's motive cross-off); trying the turns on the iPad (card 510).

## 27 Oct 2026 · Claude Code (the workshop's slow sign-in; Boo's Catwalk)

- The workshop's sign-in was slow: every boot replayed all 23 board
  migrations, one server transaction each (and a query or two before most).
  Now `ensureSeeded` reads `meta/seeded` and `meta/migrations` once and runs
  only migrations not yet applied (each still rechecks inside its own
  transaction). Not timed live: it needs Jon's sign-in and a deploy.
- Boo's Catwalk (Jon's note 10002, "I don't get the game … looks ugly"):
  the wall is now a lit runway with Boo in a spotlight. The card between
  groups and her intro list the three steps; the strut says Strut! with
  three pose dots; the music stops with a record scratch; STRIKE A POSE!
  flashes red with a big count; the verdict is a speech bubble; the end
  says to look at the phones. The fallback music is a real groove (kick,
  hats, bass) instead of beeps. The phones say the same in fewer words.
  The show's timing and the server are unchanged. New sample on the Game
  test tab: Boo's wall, the whole show (`?preview=kiosk-boo-show`).
- Boo's music on the Parlour HomePod (Jon's decision, same day): the
  brain takes the Parlour HomePod out of Music's AirPlay speakers when Act 4
  starts and puts it back when it ends (`boo` in `cues/scenes.json`,
  `music.speaker`, `npm start -- --speakers`); Susan's MacBook Pro plays the
  wall's music to it; the wall starts and stops the music two seconds early
  for the AirPlay delay (`booLead`, `&airplay=`; none in practice unless
  set). New Game test try: the practice wall through the HomePod. Untried
  on the hardware: the HomePod's name (the list hung on a permission
  question), the switch itself, and whether a chime takes the HomePod back.
- Board: migration `2026-10-27-boo-catwalk` marks card 10002 done and adds
  Jon's cards 507 (the HomePod's name), 508 (Susan's MacBook Pro to the
  HomePod before Start Act 4) and 509 (tune the delay by ear).
- Left: Jon tries Boo's Catwalk again; the three cards; deploy when Jon
  says. Start Here's snapshot and the Canon page not updated yet.
- Decisions: Boo's music plays on the Parlour HomePod in Act 4, not the
  house jazz (Jon, 27 Oct; changes cue 11).

## 26 Oct 2026, evening · Claude Code (Jon's Game test notes)

**What changed** (on `main`; deployed and pushed on Jon's yes)
- Asked first to start the study station on the M1 Air by the walls: not done. This session runs
  on the brain, and the M1 Air is not set up or reachable from here (card 474, Set up the study
  station on the M1 Air, is still open).
- In Duplicate (note 10000): the first round is 6 pairs on a 4 by 3 grid, then 10 and 14
  (`MEMORY_ROUNDS` in `functions/lib/act4.js` and `play/src/lib/rooms.js`, the board sized to fit
  the iPad; G50 and the docs follow). Canon updated.
- Sir Irwin Needs a Hand (note 10001): each square's line is clipped at the box's edge
  (`play/src/lib/draw.jsx` `Cell`), the drawing's screens are black (the slides, the call, the
  guess), and Sir Irwin's slides read from the left.
- Granolia's Lightbulb Moment (note 10003): the study screen in the house look: manor blue under
  the red wallpaper, the serif title and hook, the clock in brass at the top right, Granolia's own
  picture beside one panel holding the group, the jewels, the round and her line. Its card between
  groups wears the same look.
- The board: migration `2026-10-26-game-test-notes` marks notes 10000, 10001 and 10003 done.
- Deployed on Jon's yes (hosting, both rule sets, 25 functions) and pushed. Checking the live
  site turned up that the memory match's board was sized by a guess at the room under Zimothy's
  words: rounds 2 and 3 ran about 130px off the bottom of an 11-inch iPad (1194 by 834), and on a
  short laptop screen the cards shrank to 62px. Now the screen is one screen high, the board fills
  the room actually left (a CSS size container, `.memory-fit`), and Zimothy's words are capped by
  the screen's height. Measured, all three rounds fit with and without the rehearsal band at
  1194 by 834, 1366 by 1024, 834 by 1194 and 1280 by 720 (cards 169, 211, 177 and 136px in round 1).
  A 7-pair board dealt before the change still fits (7 by 2). The preview deals 6 pairs. The
  site deployed again (hosting only) and pushed.
- Then, from Jon: the square's coordinate (C3, B1) sits centred above the square, on a turn and
  on Sir Irwin's slide 3 (`Kiosk.jsx`, `.kiosk-cell`, `.slide-cell`). Deployed (hosting) and pushed
  on Jon's yes.

**What is left**
- Boo's Catwalk (note 10002) stays open: Jon sends the shape he wants for the wall and the catwalk.
- Jon tries the three fixed games again on the Game test tab (deployed).

**Decisions taken**
- Jon: In Duplicate's first round is 6 pairs on a 4 by 3 grid.

## 25 to 26 Oct 2026 · Claude Code (the cue list built: handoff 25 Oct, section 5)

**What changed** (on `main`, commits 8b4563a to 0276a1e, then the board's migration merged on top; not deployed,
not pushed)
- Applied `docs/handoff-2026-10-25.md` in full. Jon's cue walk-through (`docs/cue-list.md`) is
  canon for sound, light, video and the phones. First the tidy-up: the branch
  `claude/nice-burnell-fe6dfb` merged (the Home rows, the motive card pictures, replay by seed,
  the morning after, Boo's camera, the test plan's checks), all 629 tests green, `npm run checks`
  all clear and saved for the Health page (card 472). Card 473: Granolia's hello in the Study says
  to touch the wall first and use the buttons at the end.
- The brain (`cues/`): the hall bulb by phase (green for the welcome, off in the blackout, red from
  the power's return, green at the unlock); the projector's plug through two Apple Home Shortcuts
  (Projector Murderwin On and Off, `PROJECTOR_SHORTCUTS=on`); `cues/scenes.json` rewritten to the
  cue list: three Music playlists (Murderwin · Jazz, Intense, Credits) at five levels, six Hue
  scenes (Murderwin Default, Dimmed, Blackout, Drawing, Candles, Study Dim), the music cut at the
  first Name press, the dim study scene while a group plays, Cake! (Happy Birthday for Dogs from
  the Music library, the Candles scene, the jazz back when the song ends); nine sounds, only
  chime-phone and blackout required (one chime serves every chime moment; the stings optional).
  `docs/cues-relay.md` rewritten.
- The blackout: Blackout returns the power on its own five seconds later, on the server; Power
  returns stays as the hand button. Every phone then shows one button, "Sorry for the
  interruption, continue here", then its role card for fifteen seconds on the server's clock,
  then the main page on its own. The client rule in CLAUDE.md says so.
- Host tab: **Sound test**, **Cake!**, **At the paper**, and the drawing's guess on the host's own
  phone (the TV's four names stay as the fallback). Fifteen-second turns; the walk a
  twenty-second limit; the drawing's budget 26 minutes (44 turns).
- The night's shape (`seed/night.json`): Act 1 "The house rules" (the brain dims and stops the
  music); the join code on the Parlour TV through Act 1; Act 3 "Dinner wrap-up" (the motive
  prompt, the rejoin code); the supper notice (leave the phone in the Parlour, charging); the
  dessert chime and the Happy Birthday Irwin card; Act 5 "Update your motives"; Act 6's break
  line and "be in the Parlour for the final event"; the ballot as a card on the Now tab with the
  tabs reachable; the Act 7 locks (eyes on the screen, then the result with a thank-you); Act 7
  "The End" (every screen black, every phone open with everything readable, for good).
- The screens: a loop slot on every idle screen (`play/public/loops/`, five files Jon makes);
  each room's code on its screen in Act 2 (printing stays the fallback); `?kiosk=orangerie` for
  the brain's browser; the Act 4 rules cards with the full cat pictures; the birthday card.
- A Notes tab on every phone (free text, saved per phone per night, never read by anyone else).
- The devices follow Jon's key: Susan's MacBook Pro on the projector all night; the iPad Pro
  roaming (the Library in Act 2, the Orangerie captions in Act 3, the memory match in Act 4, the
  bedroom from Act 6); Jenna's iPad Pro as Boo's camera; the older family iPad out by default.
- The board: the built jobs recorded as done cards; Jon's cards (the playlists and the song, the
  six scenes, the Patio light in the Decor strings scene, the projector's plug in Home, the five
  loops, the iPad Pro's moves, the Act 6 fit check); the stale device and sound cards rewritten
  or retired; rulesDeckScreen answered (the Parlour TV).

**What is left**
- Done on 26 Oct, on Jon's yes here: pushed `main` (762bdf0) to GitHub and deployed it
  (hosting, both rule sets, 25 functions, three of them new: morningAfter, sealedCounts and
  posePhoto; the live play and workshop pages answer). Jon opens the workshop once so the two
  new migrations load the cards.
- Nothing was tried on the real hardware: the bulb's off, the projector's plug, the song from
  the Music library, the loops (no files yet), the QR codes from a TV at distance, the brain's
  browser as the Orangerie screen. The practice run and the Game test tab show the phones' new
  flow (previews prompt-continue, ballot, eyes, result-lock, notes).
- Jon's hardware jobs are cards: the playlists and the song, the six Hue scenes (he names the
  study's other lamp), the Patio light into the Decor strings scene, the projector's plug and its
  two Shortcuts, the five loops.
- The worst-dial patch (card 478) has still not arrived from Claude chat.
- The Canon and Start Here: Claude chat keeps them (the handoff says so); this entry and the
  board are the record on this side.

**Decisions taken:** none by Jon. Built as defaults, each a card on the board: roomMusic (one
playlist for the whole house; bulletin 2 on every HomePod), olderIpad (out), cueSounds (one chime,
the stings optional, no power sound), bedroomName ("the bedroom"), blackoutAuto (yes, five seconds),
promptScreen (the TV dark through the role cards). Differences from the letter of the handoff, for
Jon to overrule, are listed at the top of `docs/handoff-2026-10-25.md`.

## 25 Oct 2026, morning · Claude Code (the string lights through Apple Home)

**What changed** (three commits on `main`: b4f9c1c, 325fa87, 2b0afbc; deployed state unchanged,
the brain runs from the repo)
- The Orangerie string lights can run from the brain through Apple Home instead of a Nanoleaf
  pairing: three Home scenes with only the Holiday Lights in them (red, green, a warm decor glow)
  and three Shortcuts on the brain, Red Murderwin Strings, Green Murderwin Strings and Decor
  Murderwin Strings. `STRINGS_SHORTCUTS=on` in `cues/.env` turns it on; a renamed Shortcut is
  named in `cues/.env` (`STRINGS_SHORTCUT_RED`, `_GREEN`, `_DECOR`), never in the code.
- `shortcuts run` reads stdin until it closes, so the brain closes it at once: a Shortcut never
  waits on the terminal.
- `docs/cues-relay.md` steps 12 to 14 and the Where it stands note; tests in
  `cues/test/strings.test.mjs`.

**What is left**
- Apple Home answers in 1 to 2 seconds, so in Get Off My Lawn! the phones lead and the strings
  follow: the question stringsLead (does Salem's intro say to watch the phones?) went on the board
  that day, from the branch's session.
- Nothing on the lights: red, green (Jon's rebuilt Green Murderwin Strings v2, named in
  `cues/.env`) and decor all changed the real Holiday Lights from the brain on 25 Oct.

**Decisions taken:** none. The string-lights cards (423, 462) were marked done from the branch's
migration the same day.

## 25 Oct 2026 · Claude Code (the 24 Oct evening handoff, item 4)

**What changed** (branch `claude/nice-burnell-fe6dfb`, merged into `main` on 25 Oct as 8b4563a; not deployed, not pushed)
- The Home rows (card 343): "The secrets, made blind" on Home counts the
  packing list (made or not, and its bags), the cats' leans (questions with
  a lean for every cat, of all) and the drawing pictures (good ones, of
  nine). A new admin-only callable, `sealedCounts`
  (`functions/lib/counts.js`), returns numbers and one yes or no only.
- The motive card pictures (card 308): `play/public/motives/1.png` to
  `19.png` show beside each motive in Sir Irwin's countdown and on the
  motive's card at the reveal; the rhyme alone until a picture is in.
- Replay a night by its seed (card 324, G22): every rehearsal is dealt from
  a seed word (`functions/lib/seed.js`): the deck, the affection rolls, the
  case, the Act 2 line, the Act 4 groups and memory boards, the drawing, the
  trace look-alikes, the silent phones' answers and a spill. The Game night
  page has "Play a rehearsal again" (the last five words, Play it again, a
  box used once, greyed out on the party night). The party night and every
  dry run are never seeded. `npm run checks` names each stand-in case by a
  word (`-- --seed check-28` deals one again); `npm run fake-night` prints
  its word and takes `-- --seed`.
- The morning after (card 196): a new admin-only callable, `morningAfter`
  (`functions/lib/morning.js`), and a Morning after page linked from the
  Game night page. It opens only on the party day or later, only for a
  party night whose reveal was named on the party day, and only when Jon
  types OPEN. It archives the night (`archive/{nightId}`; the open mark is
  `archive/_morning`; no client rule reaches either), shows the case in
  plain sections and Boo's Catwalk photos, takes the photos off the public
  docs, then Keep or Clear the secrets (Clear copies each as it stands
  first). An independent review found four gaps in the first version (a
  night started with the box ticked before the party could open on the
  day; the mark sat in client-writable meta/; Clear could lose a newer
  version; a dry run could take the typed replay word): all fixed and tested.
- The pose photo (card 450, nice to have): Boo's camera on the iPad Pro
  (`?kiosk=pose`), a mirror of the group with Boo's words, one photo a
  moment into each group's last pose; `posePhoto` takes it only from the
  pose camera's own presence row (or the admin), only for the group Boo is
  judging, and the end credits show each group's photo. A practice camera
  on the Game test tab (`?kiosk=pose&practice=1`, nothing sent). The
  Devices page lists it.
- The test plan's Not yet checks (card 479, by a subagent, merged): every
  Not yet check has a test, the tests carry their IDs, F02 and G05 (the
  host seats in the fake night, seat fairness), and twelve more checks in
  `npm run checks` (20,042 of 20,042 on 1,000 cases). Two left as to-dos,
  each a question on the board: dialSpill (G24) and senseClue (G09). F26's
  half second over the real Wi-Fi is the tech run's to measure.
- Fixed on the way: Act 4's last Next now passes the command's time to
  `finishRounds`; two fake-night tests wanted a bare Case line that a random
  deal can follow with the trace warning (one failure in a dozen runs).
- The board: migration '2026-10-25-item4' marks cards 196, 308, 324, 343,
  450 and 479 done, adds Jon's 480 (Open the case, the morning after), 481
  (Boo's camera: the iPad Pro to the Entryway) and 482 (Try Boo's camera on
  the Game test tab), and files the questions dialSpill and senseClue. For
  the lighting and audio session the same day (its cues/ work is on its own
  branch): cards 423 and 462 done (the string lights run from the brain
  through three Apple Shortcuts and Home scenes, 1 to 2 seconds behind; no
  Nanoleaf pairing), and the question stringsLead (Salem's intro says to
  watch the lights; default: the phones lead, nothing built yet).
- Docs: on-the-night (the new screens, the device move, playing a rehearsal
  again, After the party), room-screens, the test plan, CLAUDE.md (two new
  readers of the sealed docs, the archive, replay, the iPad Pro's Act 4
  job, the two new questions), `play/public/motives/README.md`.
- `npm test`: every suite passes (626 tests: 622 pass, 2 skipped for the
  rules emulator, 2 to-do). `npm run checks`: all clear.

**What is left**
- Deploy and push, on Jon's yes (not during the practice run). Then Jon
  opens the workshop once to load the board migration.
- The worst-dial proof (card 478) when Claude chat's patch arrives.
- Start Here's status snapshot and the Canon's open-decision list (the two
  new questions): Claude Docs, left to the session that started this one.
- Known and not changed: `atTheParty` (and so the memory match, Boo's done,
  the drawing's clock and guess) trusts any signed-in client's own presence
  row; the pose camera's gate narrows it but the same row can be written by
  hand. Fine for a house party; a host-registered kiosk would close it.

**Decisions taken:** none by Jon. Built as defaults: the morning after's
gate (party day, a reveal named on it, OPEN typed), Clear keeping a copy
and leaving the nineteen retired sets alone, the guests' photos leaving the
public docs once archived, replays needing the same people joining in the
same order for the same characters, Salem's colours and Boo's poses keeping
their own timing. Three questions filed for Jon: dialSpill, senseClue and
stringsLead.

## 24 Oct 2026, evening · Claude Code (the hardware, the Game test tab)

**What changed**
- The house hardware, on the brain (on Wi-Fi: its Ethernet adapter shows no
  link). The Hue bridge is paired; the hall bulb is "Master bedroom" in Hue
  ("Jonny's light" in Home) and went red and green through the relay's own
  code. Both study walls are paired and take the game's light writes. The
  Elements report each hexagon as six corner lights and the Lines each bar as
  two halves: `station/lib/nanoleaf.js` `groupLayout` gathers them into 10
  hexagons and 12 bars (fixtures of both real layouts in `station/test`).
  Taps arrive under ids the layout never lists, so they are taught once per
  Mac (`npm run teach-touch`, or Teach the taps on the Game test tab) into
  `station/touch-map.json`. The string lights are parked: holding their button
  resets their Wi-Fi, and their API is not paired. The HomePods are not
  grouped yet. The chime-phone stand-in tone is made, so all ten exist.
- The Study test tab (4134f53, deployed with e91b9db), then the Game test tab:
  every Act 4 and Act 6 game and the Parlour Games in night order, each with
  Try it links by device, steps, It works, and a note box that files a
  Timeline card for Claude Code. New: the `gameTest` callable
  (`functions/lib/gametest.js`): a Get Off My Lawn! practice
  (`?practice=salem`), a Boo's Catwalk practice (`?kiosk=boo&practice=1` and
  `?practice=boo`), and test nights that are always rehearsals, refused while
  the party box is ticked or a party night or dry run is live; the Parlour
  Games sets on a phone (`?preview=questions&set=...`); `scripts/board.mjs`
  (`npm --prefix scripts run board`) so a session can read its cards.
- The workshop, for a non-coder: Home shows the next three and the open
  questions, the second to-do board is gone, Terminal commands moved under For
  Claude Code, old words fixed (the Parlour, Orangerie, Crooknog, ten
  minutes, no freeze), done cards closed, missing hardware cards added, For
  Jenna rewritten, the Assets page hidden.
- Applied `docs/handoff-2026-10-24.md` (Claude chat, below): the cast on the
  board and in the docs, the recording dates, the six stale August answers
  marked replaced, the practice run card.
- New Claude Doc: Where we are, 24 October
  (https://claude.ai/artifact/8LkaQjCZd6juQq58jcW3RZ). The Canon: granoliaIntro
  added to Genuinely open; a Closed on 24 October paragraph.

**What is left**
- Done late on 24 Oct, on Jon's yes here: deployed 3d151c1 from a clean
  copy (all 540 tests passed; 22 functions, gameTest new) and pushed main to
  GitHub. Jon opens the workshop once to load the board migrations.
- The study on the M1 Air with the Stream Deck, and teaching the taps there.
- Handoff item 4 (as soon as possible): the Home rows, the motive card
  slot, the morning-after reveal, replay by seed, the pose photo, the test
  plan's Not yet checks. The worst-dial proof arrives from Claude chat as a
  patch (card 478).

**Decisions taken:** none by Claude Code. Jon's answers tonight are in the
Claude chat entry below.

## 24 Oct 2026, evening · Claude chat (the news team, the practice run)

**What changed:** Jon cast the news team (Susan plays Ava Waves, Jon plays Mic
Cameron), set up the practice run on Sunday 25 October (the whole night, every
screen on), and said yes to deploying and pushing tonight. He answered
bulletin2Voice (Susan reads bulletin 2 as Ava Waves), bulletin2Known
(accepted) and worstDial (build the proof now, before the second tech run).
The Canon, Where we are and the W-O-O-F News script were updated in the chat.
Handoff: `docs/handoff-2026-10-24.md`, applied the same evening.

## 24 Oct 2026 · Claude Code

**What changed**
- Applied `docs/handoff-2026-10-23.md` in full, sections 1 to 16 (the final
  bag items, section 15, and the game names, section 16, included). Built
  (live after the next deploy):
  - The bags: Jon's 24 final items are the Things in the bags list; the 108
    September items are retired (soft-deleted, kept). Fourteen clue words,
    four or five things a bag, one food, a touch item, pairs written out on
    Jenna's list. The packer packs to the new rules; on the seed list every
    bag reaches 3 clue words. Sir Irwin's prompts are sixteen.
  - The bag clue engine: each cat's bag clue (Act 2 about the Murderer's bag,
    Act 4 about the Ghost's), at the cat's rung, Salem backwards at 1 to 3;
    a word that sits in two or three bags in play. Rehearsals show stand-ins
    in square brackets.
  - Act 2: all four cats give every guest a motive hint and a bag clue; each
    guest has two wrong families to rule out, so two always stand. Not yet,
    the queue, the peek screen, Supper's ready and the automatic supper.
  - Act 4: Start Act 4, the two-minute warning, the title card, groups with
    Locked in, ten-minute rounds on the clock, four game rooms with their
    rewards and the Parlour between them, Parlour Games waiting on the phone.
    In Duplicate in three rounds (and on its own, ?kiosk=memory&play=1), Get
    Off My Lawn! on the phones, Boo's Catwalk on ?kiosk=boo.
  - The game names on the phones, each room's screen and the drawing's first
    slide, with their hooks (`seed/game-names.json`).
  - Bulletin 1 and the closing bulletin play as video on the Parlour TV once
    the files are in play/public/video and Jon ticks The bulletins are videos
    on the Game night page; until then the recordings play with the words.
  - The permissions screen at sign-in, and Allow again.
  - The brain (merged from its own branch): chime-phone, the tenth sound;
    the three playlists by act with ducking; the four Hue scenes; the string
    lights mirroring Salem's colours. Scenes and music buttons on the Host tab.
  - `npm run checks` (1,000 stand-in cases, a fake night, the leak checks,
    counts only), the workshop's Health page, and Run the checks on Jenna's
    page (the real packing, leans and pictures; IDs and pass or fail only).
  - The Devices page follows the 23 Oct device table. The study's cap is ten
    minutes.
- The board: thirteen built cards marked done, the chime-phone sound card,
  sixteen new jobs (Jon, Jon and Susan, Claude chat), seven replaced cards
  retired, six notes, six decisions answered with the handoff's defaults,
  two decisions refiled.
- CLAUDE.md and the docs (on-the-night, room-screens, solving-the-case,
  parlour-games, test-plan, sensory-bags, steward-view, study-light-game and
  others) say the same, checked claim by claim against the code by a
  workflow (27 corrections). "Applied 24 Oct 2026" at the top of the handoff.
  The Canon's build paragraph and Start Here's snapshot are dated 24 Oct.
- Found on the way and fixed: the Host tab's study clock still counted
  fifteen minutes, and Boo's wall had no dot on the Host tab.

- Later the same day: deployed (the Study test session's deploy of e91b9db;
  a repeat of mine also deleted the unused `memoryCleared` function). The
  workshop applied the 23 and 24 Oct board updates once. Jon packed the bags
  on the final items: 10 bags, 43 items, every rule passed, all 10 bags with
  3 or more clue words (counts only).

**What is left**
- Jon: the practice game; Jenna runs the checks on their page; the cats'
  leans and the drawing pictures by 31 Oct. Then the recordings.
- Claude chat: mark the project copy of the handoff Applied; two rules deck
  slides. Claude Code: the pose photo (nice to have), replay by seed, the
  Home count rows, the motive card pictures.
- Not tried on real hardware: the string lights, the projector, the Hue
  scenes, the music, Salem's shake on real phones.
- "docs/Sensory Bag Items.docx" (Jon's) is untracked and was not committed.

**Decisions taken**
- With the handoff's defaults (Jon may change any): newsVideo video, bagsAct4
  the bags stay, tutorial8 kept buried, stewardPictures no, partnerAwards cut,
  dialMapping fixed as built.

## 23 Oct 2026, afternoon · Claude Code

**What changed**
- Jon answered secretLines: retire them. Then he chose to take the Act 2 safe
  out, since it had nothing left to pay out (decision act2Safe).
- Built (live after the next deploy):
  - The cats say only their open hint lines. The Act 2 hint cat's card and
    the Act 4 cat station's card are the hint line alone; the other three
    Act 2 cats still say hello. No affection roll, no brush-off, no Salem
    flip, no Granolia wrong blank.
  - Act 2 is orient, news, the four cat visits, check-in. No safe, numbers,
    scrap of paper, document or stationery. The `solve` function is gone:
    the next deploy asks to delete it, and Jon types y.
  - No per-motive secret sets: the deal draws the motive itself, and nothing
    reads sealed/{code} or sealed/manifest. scripts/generate-sealed.mjs and
    validate-sealed.mjs are deleted. The 19 sets made on 20 Oct stay in
    Firestore, unused. Spill the Beans reads nothing sealed (a test proves it).
  - Jenna's page has two tabs, the packing list and the leans. The workshop's
    Stationery page and Home's secrets row are gone. The blanks, the
    stationery designs and the brush-offs are retired lists; openers and
    closers matter only for Sir Irwin's Act 5 screen.
  - The finale's "Fastest safe" stat is gone. fake-night --real-secrets is a
    party-night dry run on the real leans, packing and drawing pictures.
- The board: secretLines answered, act2Safe recorded, seven secret-set cards
  closed, three new cards (the leans and packing lists, the Home count rows,
  the deploy before the practice game).
- The Canon, Start Here, the Steward Handbook, the intro script, CLAUDE.md
  and the docs say the same. The rules deck's affection slide is reworded in
  the local copy only (publishing the deck is still blocked).
- A doc for Claude chat with everything left, one task at a time:
  "Murderwin — What's Left, for Claude chat"
  (https://claude.ai/artifact/SweWtP11QJcx1R12BhYFdT).

**What is left**
- Everything is on the board: 51 jobs for Jon, 10 for Jon and Susan, 2 for
  Susan, 4 for Jenna, 7 for Claude Code, 2 for Claude chat, and 15 open
  decisions. Next: deploy, then the weekend practice game.
- Left on purpose: the firestore.rules read rule for validation_reports is
  unused now (removing it needs Jon's OK; it is harmless). Reference pictures
  from the old Stationery page are still in Storage under stationery/.
  createNight still reads sealed/bags on every night, for the bag count only.
- An untracked "docs/build-plan 2.md" (a Finder copy) is not from this work
  and was not committed.

**Decisions taken**
- Jon: secretLines retired; act2Safe, take the safe out.

## 23 Oct 2026 · Claude Code

**What changed**
- Jon deployed everything built on 22 Oct.
- An audit of every doc, the Claude Docs and the workshop board against the
  code, then fixes the same day to the docs, the Claude Docs, the board and
  the code.
- Built in code (live after the next deploy):
  - Act 4 phones: the group card, the study card, the cat card (never
    Granolia), and "Free time" in place of Check-in, with one of the five tips.
  - Sir Irwin's Act 5 screen shows only his opener, the countdown line, the
    motive cards and his closer.
  - The closing bulletin: each name card waits for its lead-in line; the next
    name cuts off the recording that is playing; the brain's window prints
    only counts, and the recordings reach it under codes that do not name the
    family.
  - The Relay Drawing: Irwin's slides stay up long enough to read, slide 3
    shows the practice smiley's B1 square, the "Pawsome!" door slide shows on
    the TV, and the picture bank refuses trace and motive objects and a star.
  - Granolia's lines read cleanly. A big red REHEARSAL band on every phone and
    room screen on a rehearsal night. The end-credit awards show only in the
    credits.
  - The Host tab: a dot for the memory match iPad, and the Act 2 line "Cat
    visits: N of M guests have seen all four". A True Friend sees Salem's
    honour text on the Cats tab. The memory match cards have file-folder backs.
    The preview samples and the Host tab's beat texts match the new Act 2 and
    Act 6.
  - Sir Irwin's line over the trace reveal reads its words from the workshop,
    as the other hosts' lines do. The Victim's epilogue starts two seconds
    after the closing bulletin's last part, not over it.
  - Safety: the "murderwin" preview server now serves only `hosting/`, on this
    Mac only, and the phone dev server refuses the key files and `chats/`.
- Start Here rewritten as the map: right now, where things live, how we work,
  a dated status snapshot, the dates, and the freeze rules.
- The project system (CLAUDE.md, HOW WE WORK): decisions on the Canon, jobs on
  the workshop Timeline, the live status on "Where we are", Start Here as the
  map, dated handoffs from Claude chats, this log, and the end-of-session
  routine.

**What is left**
- The open decisions, each a card on the board (16): secretLines, newsVideo,
  stewardPictures, partnerAwards, diningName, rulesDeckScreen, tidyFolders,
  bagsAct4, handOn, tutorial8, swapMotive, grossnola, and four the audit
  found: ballotMajority (the room's majority pick in Act 7), bulletin2Voice
  and bulletin2Known (who records bulletin 2), dialMapping (the dial's
  direction is fixed in code, the rules say blind per night).
- The rules deck: twelve slides are edited but not published. Publishing was
  blocked by a permission check; Jon allows it or publishes them.
- Not built yet (cards on the board): replay a night by its seed; Home's
  count-only rows for whether the secrets, leans, packing list and drawing
  pictures exist; the motive card pictures slot; video playback (only if
  newsVideo says video); a Drawing pictures tab for Jenna (only if
  stewardPictures says yes); removing the unused echo fragments, study clue
  and Irwin lines from the generator and Jenna's page (after secretLines).
- Everything else is on the board. Next: the weekend practice game, 24-25 Oct.

**Decisions taken**
- The project system above.
- Settled by default (Jon may change either): the Act 4 cat station never
  sends a group to Granolia, because her room, the Study, holds the light
  puzzle; the deduction round comes after the door opens.

## 22 Oct 2026, evening · Claude Code

**What changed**
- Applied and built the 22 Oct handoff (`docs/handoff-2026-10-22.md`). Fifteen
  commits, c8b76a4 to f705587:
  - c8b76a4: the docs and the Canon to the handoff.
  - 568cc23, 0bf5f46, f4ebe71: the solving-the-case side copy merged into main.
  - 7fe0491: Irwin's five-card countdown; bulletin 1 crosses off one family;
    every guest visits all four cats in Act 2, with one real hint.
  - 897fb30, a103d67: Salem starts at 3, the Parlour Games stop him at 4,
    Salem petted on the Host tab; Act 6 opens on its two Parlour Games.
  - 82be5d5: the board files the handoff's jobs by moment.
  - 551e43e: W-O-O-F News. 37732ef: the Cat Hint Lines. 8051d40: the hosts'
    lines. 3b319a4: the end credits. ca7804c: the Relay Drawing.
  - 5d73852, f705587: the board marks the handoff's Claude cards done and adds
    two jobs for Jon (the drawing pictures, a photo of Sydney).

**Left out on purpose**
- The Partner in Crime and Ghost Whisperer awards (now decision partnerAwards).
- A drawing pictures tab on Jenna's page (now decision stewardPictures).

**What is left**
- Rehearsal mode for the weekend practice game (handoff section 12), the
  recordings, the art, and the blind runs the week before. All on the board.

**Decisions taken**
- None new in Claude Code. The handoff's decisions were taken by Jon in a
  Claude chat (below).

## 22 Oct 2026, daytime · three Claude Code sessions and a Claude chat

**What changed**
- Claude Code, the Parlour Games rebuild: twelve timed pop-ups a night from a
  seeded plan, one set for every phone, secretly listening cats with a sealed
  lean table on Jenna's page, the overlay on the phone. Commits 51d7061 and
  bc69a78. Earlier that morning c0b62ec committed the 21 Oct docs
  (`parlour-games.md`, `solving-the-case.md`, `test-plan.md`).
- Claude Code, how the case gets solved, built in a side copy (worktree
  epic-lehmann-fdcd31): motive families, the Act 2 room waves, the study pays
  the Ghost's trace, the memory match, Irwin's options. Committed as 568cc23
  and merged into main as 0bf5f46 that evening.
- Claude Code, the workshop Timeline: the night in order, every job filed by
  its moment (c7fcd30). Also that day: the workshop's Devices page (9070f29).
- Claude chat: wrote the 22 Oct handoff, the W-O-O-F News Recording Script,
  the Cat Hint Lines and The Relay Drawing · How to Play page.

**What was left**
- Applying the handoff. Done that evening (above).

**Decisions taken (Jon)**
- The twelve Parlour Games are one budget for the night: five, five and two;
  a game an act runs out of time for carries into the next act.
- The cats' leans are made blind by a script; Jenna may change any lean.
- The trace ladder: 1 black and white and hazy, 2 colour and less hazy, 3 two
  similar options, 4 the picture, 5 the picture and its name.
- Everything in the handoff: no hidden events in any act, the new clue path,
  the cat ladders, W-O-O-F News, the hosts, the Relay Drawing, the end credits.
