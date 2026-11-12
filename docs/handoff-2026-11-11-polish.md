# Handoff, 11 November 2026 (evening): the polish pass

From Claude chat, for Claude Code. Written 11 November 2026, late evening. Not applied yet.

The same words as the Claude Doc: https://claude.ai/artifact/Ap22qcKSMYXqFUQYKmreiC

Jon's spoken notes from the 11 Nov evening practice, turned into build jobs for Claude Code. Jon: the first section is yours. Everything after it is for Claude Code.

## Jon, start here

**Every note from your recording is in here, plus the Parlour Games note you sent after. Nothing is built yet. This page is the work order for Claude Code.**

What I found when I checked the game folder tonight:

- **Your videos are all in** (62 files), and so are bulletin 2's recordings (27). They most likely did not play because the game only plays videos when a box on the Game night page is ticked. I could not see the box from here. Job A14 removes the box.
- **Your art is in too.** The idle screens were waiting for five loop videos that were never made, so they showed plain text. Job B2 builds those screens from the cat pictures instead.
- **Eight of the nine cue sounds are still October's stand-in beeps.** Only the scream is yours. That is a big part of why the night felt quiet.
- **The Parlour Games came late** because unplayed games carry forward, and nothing stopped them once the drawing was over. Job A5 fixes it.

The order of work protects the night: sound, the blackout and the flow first, the new look as soon as you approve it. It is a long list for four days. If time runs short, Claude Code leaves out what is not tested and tells you, rather than risk the night.

| Only you can send | When |
| --- | --- |
| A yes, or changes, on the look book Claude Code sends you | As soon as it arrives |
| A look at your PANIC Shortcut: does it stop the Living Room HomePod? | Before the practice night |
| Five real sounds if you have them: one chime, four stings | Before the practice night, if you can |
| Irwin's breed moment | When you are ready |
| The special thanks and the dedication for the credits | When you are ready |

Two things you asked where to find:

- **The Orangerie's screen (Get Off My Lawn!):** on the brain, open `murderwin-at-sirwin-manor.web.app/setup` and tap The Orangerie.
- **To start the work:** copy the last section of this page, Prompt for Claude Code, into Claude Code.

## The rules of this pass

Every job below is judged against these four rules. They are Jon's own words from the recording.

| Rule | What it means on a screen |
| --- | --- |
| **Simple** | One or two short sentences a screen. A guest looks and knows what to do. Anything longer becomes a script that is read aloud. |
| **Celebratory** | Every win gets a moment: a flash, a chime, a little movement. Small wins too. Not a birthday party, just a quick "you got it". |
| **Alive** | The house is never quiet. Music, voices and chimes loud enough for a full room. Every intro, video and recording plays. |
| **Good-looking** | Jon's art on every screen, each room's own cat on its splash. No flat text on a flat background. The drab green background is cut. |

Five standing orders sit beside them:

- **Out of the way.** The screens work and then get out of people's way. When the last person enters something, the night moves on by itself.
- **Plain American English.** No odd or stiff lines. If Jon would not say it out loud, rewrite it.
- **Jon approves the layouts.** He sees the new look before it rolls out to every screen.
- **The setup stays.** The /setup page works well. Do not change how the night is set up.
- **Jon's phone opens and closes the night.** Start and The End are both on his phone.

## The practice night, 12 Nov

**The practice is a full night, start to finish, with eight seats: Jon, Susan and six fill-in players.**

| Part | How it runs |
| --- | --- |
| Start | Start the night on Jon's phone, the real-night box unticked, Fill-in players set to 6 |
| Jon | Joins as Jon. He plays Prof. Jonathan Kostington and keeps the Host tab |
| Susan | Joins under another name (Sue, say), so the game deals her a random character like any guest |
| Fill-ins | Six seats with no phone. They are dealt characters and roles and play along on their own (job A4) |
| Clues | Real lines everywhere, from this night's own throwaway case. No bracket text (job A3) |
| Sunday's secrets | Untouched. The practice never reads the real bags, leans or pictures, and Sunday is dealt fresh |
| Media | Every video, recording and sound plays, with sound, on its real screen |

What Jon is judging, in his words: the audio cues are solid, every part of the production works, and it works step by step.

Before Jon presses Start, Claude Code runs this list on the brain and says pass or fail in plain words:

- [ ] `npm run media -- --live`: every video is online
- [ ] Every room screen has been heard from and shows its sound tick
- [ ] Sound check: each cue once, then Silence on all four HomePods
- [ ] Blackout test, three times
- [ ] `npm test`, `npm run checks`, the flow test and a fake night with eight phones all pass
- [ ] The six fill-ins join a test night and finish it

## Media: what is in, what is missing

**Almost everything Jon exported is in the game folder. What kept it off the screens was one switch, five files that were never made, and stand-in sounds.** Checked on the brain on 11 Nov with `npm run media` and a look in each folder.

| What | In the folder | What it needs |
| --- | --- | --- |
| Bulletin 1 videos | 7 of 7 | Plays once video is the default (A14) |
| Closing bulletin videos | 6 of 6 | The same |
| Name cards, Murderer and Ghost | 14 and 14 | The same |
| Motive clips | 19 of 19 | The same |
| The static cut | 1 of 1 | The same |
| Intro video, `sirwin-intro.mp4` | In | One click on the TV's page for sound, then a check on the real TV |
| Bulletin 2 recordings | 27 of 27 | Nothing |
| Bulletin 1 and the closing bulletin, sound only | 0 of 13 | Not needed while the videos play |
| The scream, `blackout.wav` | Jon's own file | Nothing |
| The other eight cue sounds | Stand-in tones from 24 Oct, two seconds each | Real sounds from Jon, or fuller ones made in code (A2) |
| Rules narration, 28 files | In Jon's FINAL EXPORTS folder on the Desktop, not imported | Import them and build the rules film (A14) |
| Loops for the idle screens | 0 of 5, never made | No files: live splash screens instead (B2) |
| Cat and dog pictures | 25 full pictures, 6 faces | Used by B2 and the look |
| Portraits, traces, reveal cards | 15, 15 and 28 files | Nothing |
| Sydney's photo, `sydney.jpg` | Not in | From Jon, with the dedication |
| Music | Playlists and Shortcuts on the brain, not files | See A2 |

What could not be seen from here: whether the videos box is ticked (it lives in the database), and what is on the live site. Claude Code checks both first.

Two traps:

- The videos are not kept in git. A publish from a clean copy ships none, so publish from the main folder.
- `npm run media` counts the stand-in tones as in. Make it say stand-in for any file `make-placeholder-sounds` wrote.

## Jobs for Claude Code

**Nineteen jobs in three groups. A makes the night work, B makes it look and feel alive, C closes it.**

Already built on the night of the walk-through, so not listed again: Get Off My Lawn! can no longer trap a group (091af20), the room screens are Manor blue with the olive gone (fbc48ce), the second-display page exists (`?kiosk=decor`, e04a0ec), `/setup`, the Start the night button, and the REHEARSAL band is off.

Order of work:

1. B1, the look book, first. It is small, and Jon needs time to look.
2. A1 to A14, in order.
3. B2 to B4, once Jon says yes to the look.
4. C1 when Jon's words arrive.

The cut line: a job not finished and tested two hours before the practice night is left out, and Jon is told which. Every job is its own commit. Publish only on Jon's word.

Each job gives Jon's words, what the code shows today, what to build, and how to know it is done.

### A1 · The blackout hits

**Jon:** “That has to hit so hard. So everything has to go black. That is the biggest thing, and there was still music playing during it. I heard the scream, but those cues need to get tight as hell.”

**Found:**

- The music runs through Jon's Shortcuts (`MUSIC_SHORTCUTS=on`). Off is the PANIC Shortcut, a Home scene. A Home scene takes seconds, and `cues/lib/shortcutMusic.js` queues it behind any music Shortcut still running.
- The dark lasts five seconds (`BLACKOUT_POWER_MS`, `functions/lib/run.js`). Then the phase `prompt` asks for jazz again (`cues/scenes.json`, `phases.prompt`). So the HomePods are told to stop and to start inside five seconds.
- On 11 Nov the music had been told to stop 31 seconds before the press, at the `rules` beat, and Jon still heard it. PANIC is not reaching every HomePod (see A2).
- The scream plays through `afplay` on the brain's own sound output and nowhere else.
- Nothing tells these to go dark: the Study's two walls and its Stream Deck (`station/lib` never reads the blackout), the Orangerie strings (red, green and decor, no off), the arcade's Stream Deck keys.

**Build:**

1. One timeline with three marks, run by the server inside the Blackout command. **Press:** the brain stops all music and starts any HomePod sound. **Dark**, `leadMs` later (start at 2000, kept in `cues/scenes.json`, tuned by ear): the phase becomes `blackout`, every light, screen, phone and deck goes dark in the same moment, and every room screen and phone plays the scream itself (A2, layer 1). **Power**, five seconds after Dark: as today.
2. Everything that glows goes dark: the Hue Blackout scene, the hall bulb, the strings (a new `off` state: by their own address if it answers, else one more Shortcut from Jon), both walls and the Study's deck (the station follows the night's phase), the arcade deck's keys, every room screen and second display, every phone.
3. No music through the dark or the role cards. Jazz returns when Act 2's first beat turns to `act`. Change `phases.prompt.music` so it leaves the music off.
4. On every screen, one white flash, then an old-TV squeeze to black (the cue list's own idea), about 300 ms in all.
5. A **Blackout test** button on the Host tab, practice nights only: the same timeline with no case dealt and no act moved, as many times as Jon likes.

**Done when:** Jon presses Blackout test three times in the house. Each time there is no music anywhere in the dark, no light and no lit screen, the scream lands with the dark, and the lights return at five seconds.

### A2 · Every loud sound, everywhere

**Jon:** “The one candle cue, the audio cue needs to be louder… and on all HomePods, I was still hearing music from the living room HomePod.” “Overall, we need lighter chimes. It was hard to hear the chimes.” (Read as louder.) “The game just kind of felt quiet and it wasn't really vibing.” “Make sure the ending musical cue is default jazz. It went to some random playlist.”

**Found:**

- With music by Shortcuts each HomePod plays its own stream. The brain cannot turn it down (`duck()` does nothing on that road), and every cue sound plays only from the brain's own output: chimes, stings, the scream, bulletin 2, the birthday song. The Host tab's Sound test says “on every HomePod”. A HomePod playing its own music is not listening to the brain.
- Cake! plays the song through the Music app on the brain (`music.playTrack`). The HomePods' jazz is never stopped, so Jon heard both.
- Eight of the nine cue sounds are stand-in tones (see Media).
- The chimes on phones and room screens are two soft beeps, a third of a second each (`chime` in `play/src/lib/permissions.js` and in `Kiosk.jsx`). An iPhone on silent plays none: Safari mutes Web Audio on the ring switch unless the page sets `navigator.audioSession.type = 'playback'`.
- The end: `acts.7.beats.result.music` is `credits`, the Credit Roll Music Shortcut.
- `scenes.json` still lends the Living Room HomePod to Susan's Mac in Act 4 (`boo`), a leftover from the Catwalk.

**Build, layer 1: the screens and phones are speakers.** No AirPlay, no delay.

1. `media-import` also writes each cue sound to `play/public/sound/`, without the second of silence and made loud. Not in git, like the videos. Never the bulletin recordings.
2. Every room screen and phone loads them at the start and plays the right one the moment `public/sounds.current` changes, at full volume. The beeps stay as the fallback only.
3. At the phone's Allow tap, set `navigator.audioSession.type = 'playback'`, so a silenced iPhone still chimes. Only Safari has this setting, so check for it first.
4. One small sound kit made in code, shared by phones and room screens, for the little moments: ding, sparkle, fanfare, buzz, tick, stamp. Fuller than today's beeps and at least twice as loud.
5. Real sounds for the eight stand-ins: Jon's files if he sends them, same names. If not, make fuller ones in code (a three-note dinner chime, four stings) and let Jon pick at the sound check.

**Build, layer 2: the HomePods.**

1. Silence means silence. Find what played on the Living Room HomePod on 11 Nov: the PANIC scene missing it, another device sending to it, or the `boo` lend. Delete the `boo` block and `speakerWants`. Ask Jon to check PANIC only if the code is clean.
2. The birthday song on all four HomePods, with the jazz stopped first. Try the Music app's AirPlay to all four (no job for Jon). If that fails three tries, ask Jon for one more Shortcut, Birthday Song, made like his seven.
3. Jazz drops out while Sir Irwin's screen is up (Act 5 `irwin`) and comes back at `update`.
4. The end: `result` and `end` both play `jazz`. The night ends on jazz, not silence.
5. The Host tab's Sound test becomes a short list: each cue once, and Silence.

**Done when:** with jazz on all four HomePods, Silence leaves nothing playing within three seconds. A chime is clear in every room with a screen and on a silenced iPhone. Cake! plays the song on all four HomePods with no jazz under it, and the jazz returns after. The End plays jazz.

### A3 · A practice night plays for real

**Jon:** “I want actual clues. I want actual hints, I want actual reveals. I don't want the insert text.” And the run-through is “going to open up things and maybe give away things. I don't care. Just don't rerun those scenarios.”

**Found:** a rehearsal shows bracketed stand-ins on purpose (Jon's word of 23 Oct): `hintStandIn` and `HINT_PLACEHOLDER` in `deal.js`, `bagStandIn` in `bagclues.js`, `crossStandIn` in `act4.js`, `traceStandIn` in `station.js`, the arcade's `STAND_IN_CLUE`, and stand-in grids in the drawing.

**Build:**

1. On a practice night every one of those slots shows the real thing, built from that night's own throwaway case: the cat's real hint at its rung, Zimothy's real cross-off, the real trace pictures in the Study and behind the door, the arcade's real clue.
2. Bag clues use a practice packing: the real item list (`seed/bag-items.json`) dealt in memory from the night's seed, the way `npm run checks` already deals one. `sealed/bags` is still never read on a practice.
3. The drawing uses the practice picture bank (A7), never `sealed/relay_pictures`. The leans stay as today.
4. The real-night box is still refused before Sunday.

**Rule 1:** nothing sealed is read or printed. Sunday is dealt fresh and unseeded. It is not told to avoid a practice night's answers, because that would hand Jon a free cross-off before the party starts.

**Done when:** a test deals a whole practice night and finds no `[` in any card, notice or screen document, and the stand-in database counts zero reads of `sealed/`.

### A4 · Six fill-in players

**Jon:** “I would like additional characters to play with us, but not have devices… let's just add 6 other people… fill and substitute, that are playing along with us.”

**Found:** `scripts/fake-players.mjs` already plays every step of a night for fake phones, but only on a night it makes and drives itself.

**Build:**

1. On the Start card, practice nights only: **Fill-in players**, 0 to 8. Refused when the real-night box is ticked.
2. A fill-in is a real seat: a name, a random character, a bag number, and any role by the same deal as everyone.
3. A driver on the brain (`npm run fill-ins`, started with the night) plays them with human pauses, reusing the fake players' moves: close each notice, go to a cat 10 to 20 seconds after the call and leave 15 seconds later, answer every Parlour Game in 5 to 20 seconds, tap Locked in, vote within 20 seconds.
4. Act 4: the real players are kept in one group, so Jon and Susan walk the rooms together. Fill-in groups take each room's reward at the chime, and no room screen waits for them.
5. The drawing only calls real players to the paper.
6. Names: Mabel, Gus, Dot, Walt, Pearl and Otis. The Host tab marks them fill-in. Every other screen shows them like any guest.
7. The driver prints counts only, like the fake night.

**Done when:** Jon and Susan play a whole practice night with eight seats and never wait on a fill-in.

### A5 · The flow: nothing out of order

**Jon:** “The parlour games were all out of order. I was getting them after the final trace reveal. Make sure the flow of the night is as solid as possible… Players will only be directed by the game at times.”

**Found:**

- `tickParlour` (`functions/lib/windows.js`) opens a due game in any beat of Acts 2, 4 and 6. It holds back only while another window is open or the drawing is running.
- Games an act had no time for are carried into the next act (`startParlour`). On 11 Nov, Act 2 lasted two minutes and the Act 6 games beat one. The carried games were still due when the drawing ended, so they opened at the door and after it.
- The same gap lets a game open over the news flash, the bag peek or the group cards.
- Publishes landed while the night was running, and open screens kept their old code until someone reloaded them.

**Build:**

1. A Parlour Game opens only in its own beats: Act 2 `cat`, Act 4 `round1` to `round5` (waiting on the phone), Act 6 `games`. One that is due in any other beat waits.
2. Act 6 plays at most its own two. Games carried into Act 6 are dropped at the act's start.
3. When the drawing starts, every game still unplayed is dropped for good: no window, no points. Nothing opens at the door, in Talk it over, or in Act 7.
4. The server refuses to open any window while the phase is not `act`, a bulletin is playing, Sir Irwin's screen is up, or the drawing, the door, the vote, the reveal or the credits are on.
5. Act 6 `games` moves to the drawing by itself when the last game has closed. Jon's Next still goes sooner, and drops what is left.
6. Screens update themselves. Each page checks the build stamp once a minute and reloads when its own is old, only while it is idle or dark, never in the middle of a game or a film.
7. Every beat leaves every phone with one plain line of what to do or where to go.
8. A flow test, `functions/test/flow.test.mjs`: one night at full length and one squeezed to 20 seconds a beat. It checks steps 1 to 5 and 7 at every beat. Add it to `npm test`.
9. A one-page run sheet for Jon, `docs/run-sheet.md`: one row a beat with what the room sees, what it hears, and who moves it on (the game, or Jon). The Host tab's Next already names the next beat. Keep that the only button Jon needs.

**Done when:** the squeezed night passes with no game after the drawing starts, and Jon's practice night shows no Parlour Game after the door.

### A6 · The ending: the door, the talk, the vote

**Jon:** “I don't know what this deduction round is. What is that? I did not ask for that, and that needs to go away… There can just be conversation between people… So talk, conversation, and then I will trigger through the host area on my phone to start the vote… Select your murderer. Select your motive and select the ghost. Don't overcomplicate it… When anything is entered by the last person, automatically continue.”

**Found:** Act 6 ends with the beat `eliminate` (a 90-second window, `Eliminate` in `Windows.jsx`, `deal.eliminate`). The vote is already three picks, but in three steps under Salem's long line, and `settleWindow` refuses to close it before its two minutes are up.

**Build:**

1. Delete the deduction round everywhere: the beat, the window kind, `deal.eliminate`, the `eliminate` command, `Eliminate` and its preview, `eliminations` on the night, the board of commitments, its line in `cues/scenes.json`, the fake players' step and the tests.
2. A new last beat for Act 6, `talk`, Talk it over. Jon's Done on the door beat opens it. Phones say: “Talk it over. The vote is next.” The TV shows the three questions over everyone's portraits. No taps and no clock. The music stays as at the door.
3. Jon's button then reads **Start the vote**.
4. The vote is one card with three rows: The Murderer, The Motive, The Ghost. Tap a row, pick, come back. **Lock in** lights when all three are filled. Then: “Locked in. Eyes on the big screen.” No other words on the card: drop the host line for the vote.
5. The vote closes the moment the last seat locks in. The two-minute clock stays as the backstop. Fill-ins count as seats.
6. The same rule wherever a step waits on everyone. A Parlour Game in Acts 2 and 6 closes when the last phone has answered or at one minute, whichever is first.
7. The pay-off: when the Ghost is named, every phone shows its own score with a celebration (B4). Three right is the big one. Check the whole reveal on the real TV with sound.

**Done when:** `grep -ri eliminate` finds nothing outside the session log and old handoffs, the fake night passes, and in practice the vote closes within a second of the last lock-in.

### A7 · Sir Irwin Needs a Hand

**Jon:** “Why the wait for selecting different images in the Act 6 game?… You have to wait 10 seconds… let's lose that.” “I don't need a practice round in Act 6.” “Can I get a voiceover made for those slides?” “Make the line art better. It just looked like slop. I was hoping to see… consistency in patterns and designs or shapes, like be something.” “Tell Professor Jonathan Kostington how… That is a weird line.”

**Found:**

- `LOCKOUT_MS = 10_000` in `functions/lib/relay.js`, with its own `lockout` state.
- The practice smiley is grid 0 (`relayGrids` in `relay-bank.js`, `ROUND_NAMES`).
- Irwin's seven slides are text on a timer (`SLIDE_TEXT`, `slideMs`).
- Phones say “Tell {drawerName} how.” (`play/src/screens/Relay.jsx`).
- What Jon saw were stand-in grids: random strokes from `relay-gen.js`, because a rehearsal never reads the real bank. Nobody has ever looked at the real bank. It was drawn blind, one square at a time, by a model that never saw the whole picture.

**Build:**

1. No wait after a wrong pick. The pick is crossed off with a buzz and the room guesses again at once. Remove `lockout`.
2. No practice round: three rounds only. Slide 6 becomes “Three grids, each bigger than the last. Small, medium, BIG.” Slide 3 keeps the smiley's square as its example.
3. A voice for the slides. One sound file a slide, `irwin-slide-1` to `irwin-slide-7` and `irwin-door`, played by the Parlour TV as the slide shows. A slide stays up for its recording plus one second. Make them on the brain with the best voice macOS has installed (`say -v … -o`), bright and friendly. Anyone can replace a file with a recording of the same name. No file: today's timing, silent. This gives Sir Irwin a voice. The cats still never speak.
4. The words: “{Name} is drawing. Describe this square!” On the drawer's phone: “Draw what they say!” Check the name is the person at the paper now.
5. A new picture maker, still blind (`scripts/generate-relay-pictures.mjs`). Design the whole picture first on one canvas, from lines, arcs, circles and dots on quarter-square points. Then cut it into squares in code, so strokes always meet at the edges. Rounds 1 and 2: a thing a child can name. Round 3: a tidy pattern with a mirror or a repeat.
6. A blind judge: draw each picture to an image in memory and ask a vision model three times what it is, without the name. Keep it only if two answers match. Counts only on screen.
7. Two banks from the same maker. `sealed/relay_pictures` for the party: rebuild it, since nobody edited the old one. `sealed/relay_pictures_practice` for practice nights. Jon sees the practice pictures, so they are burned: their names join the never-list for the party bank.

**Done when:** a practice drawing shows three pictures Jon can name once they are complete, with no practice round and no wait. If they still look poor, ask Jon whether Jenna should look over the party bank.

### A8 · The Study: ready, lit, the right way round

**Jon:** “For the study, it needs to be lit until the game starts. So everything needs to have a much more clear picture as to when you're there, when you start.” “The hint that we get from Granolia… needs to also be the same design as far as the hexagons… And it was reversed… backwards to the actual design.”

**Found:**

- Granolia's hint is `WallMap` in `Kiosk.jsx`: circles placed by the controller's raw layout. The rules card draws the real wall, ten hexagons as they hang (`HEX_CENTRES` in `play/src/lib/walls.js`). The two do not share a drawing, and the raw layout is mirrored against the wall.
- The room dims with the Study Dim scene while the station is `playing`, `reproducing` or `entering` (`study` in `cues/scenes.json`).

**Build:**

1. Three plain states on the Study's screen, one line each. Ready: “Touch any hexagon to start.” Playing. Done.
2. Lit until the first touch. The room stays on Murderwin Default and both walls breathe a soft warm white while the room waits. Study Dim comes on at the first touch only, and Default returns when the group is done. Find out why the room was dark before the start on 11 Nov.
3. Draw the hint with the same ten hexagons as the rules card, the same way round as the wall. Map each station panel to its hexagon once, and keep the map with the station's settings.
4. A check on the Study's test page: the wall lights one panel, the drawing lights one hexagon, and Jon says if they match, for the first, a middle one and the last.

**Done when:** Jon faces the wall, and the hexagon lit in Granolia's hint is the hexagon lit on the wall, three times out of three.

### A9 · Get Off My Lawn!

**Jon:** “Get Off My Lawn needs time limits, because if you're not doing well, you get stuck… It also needs a countdown as far as how well you have to do, or a little bit more communication. I like the aesthetic of the green and the red with Salem floating around and vibrating.” And: “I could not get the Get Off My Lawn page up on the JK MacBook Air. That one was kind of stuck.”

**Found:** the trap was fixed during the walk-through (091af20): slower colours, longer to react, and a round passes on its fifth slip. The Orangerie's board shows the thirty clean seconds as a bar. The phones only tint.

**Build:**

1. Keep the look as it is.
2. On the Orangerie's screen and every phone in the game: the round (“Round 2 of 3”), the thirty clean seconds as big numbers counting down, and the slips left (“3 slips left”).
3. A round also passes by itself after two and a half minutes.
4. One line when a round starts over: “Someone moved. From the top!”
5. The stuck page: on the brain the Orangerie's page is `/setup`, then The Orangerie. Find why it did not move to Salem's board on 11 Nov. An old page from before a publish is the first thing to rule out (A5, step 6).

**Done when:** no group can spend more than eight minutes in the game, and a new player can say what to do after five seconds of looking.

### A10 · The iPad: one page, full screen

**Jon:** “I need to make sure that all devices can go full screen. I was having an issue with the iPad… I'd like some options.” “On the iPad, I would like it to have one screen… one area where I can advance the iPad to the correct act, and I don't have to refresh or change anything.” “There's a welcome page on the iPad, that's kind of strange.”

**Found:**

- The full-screen click is skipped on touch screens on purpose (`Kiosk.jsx`).
- The iPad Pro has three addresses in one night: `ipad`, `memory` and `bedroom`.
- The welcome page is the idle line “Act 1 · Welcome”: the act's plain name from `seed/night.json`.

**Full screen on an iPad, the options:**

| Option | What Jon does | What he gets |
| --- | --- | --- |
| Add to Home Screen (use this) | In Safari: Share, Add to Home Screen, leave Open as Web App on. Open it from the icon | The page alone, no bars. On iPadOS 26 this works for any site |
| Guided Access (add this) | Settings, Accessibility, Guided Access. Triple-click the top button on the page | The iPad is locked to the page. Nobody can swipe out |
| A full-screen tap in Safari | Tap the page once | Works, but Safari shows a small X in the corner, and a swipe leaves it |
| Chrome on the iPad | Nothing to do | Full screen is not reliable there. Use Safari |

**Build:**

1. One iPad page, `?kiosk=ipad`, that follows the night with no reload:

| When | The iPad shows |
| --- | --- |
| Act 1 | The Library's splash, with Zimothy |
| Act 2 | Zimothy's code |
| Act 3 | The supper captions |
| Act 4 | In Duplicate |
| Act 5 | The Library's splash |
| Act 6 from the drawing, and Act 7 | The bedroom's screen |

2. A row on the Host tab, **The iPad shows**: Auto, Zimothy's code, Supper captions, In Duplicate, The bedroom. One tap switches the iPad at once. Auto is the default.
3. `memory` and `bedroom` stay as addresses for any other device.
4. Add the Home Screen tags and a small manifest (name, icon, standalone), so the icon also works on an older iPad. No service worker and no install prompt.
5. The first touch on the iPad turns its sound on. Keep the screen awake, and set Auto-Lock to Never on the iPad.
6. No screen ever shows an act's plain name. Idle is always the room's splash (B2).
7. `/setup`: one iPad button in place of three.

**Done when:** Jon carries the iPad through a practice night and never touches its screen except to play In Duplicate.

### A11 · The Stream Deck on Susan's MacBook Pro

**Jon:** “I could not get the stream deck to connect to SK MacBook Pro for the Boo Arcade. The arcade game was up, but the stream deck was not seen. I need some insight on that.”

**Insight, most likely first:**

1. The page opened in Safari. The file sent by AirDrop opens the Mac's default browser, and the deck only works in Chrome.
2. That Chrome was never allowed the deck. It needs one Connect press on that Mac: `/setup`, then First: connect the Stream Deck.
3. The Elgato Stream Deck app is running in the menu bar and holds the deck.
4. macOS has not allowed the accessory. A laptop asks before a new USB device may connect, and a work Mac's rules can block it.
5. The cable or a hub. Plug the deck straight into the Mac.

**Build:**

1. On `/setup`, under Boo's button, one plain line from `deckProblem()`: Deck ready, Open this page in Chrome, Press Connect, Quit the Stream Deck app, or This Mac cannot see the deck.
2. The Entryway's AirDrop file opens Chrome by name, not the default browser.
3. Keep what is built: the night's screen picks the deck up when it is plugged in, and until then the deck drawn on the screen plays the arcade.
4. If the work Mac will not allow the deck at all, tell Jon. The choices are the on-screen deck or another Mac.

**Done when:** `/setup` on Susan's MacBook Pro says Deck ready, and the night's screen lights the deck with no click.

### A12 · A camera inside the app

**Jon:** “Can we add a camera for scanning within the app. So you don't have to leave the app, go to your camera… hiding in the top corner.”

**Found:** a room's code is an address (`/play/?meet=granolia`). The phone's own camera opens it as a fresh page, and `App.jsx` reads `meet` and calls `callMeet`. The permissions screen says “no camera” by design.

**Build:**

1. A small camera button, top right, on every tab. It opens a full-screen viewfinder.
2. A code the game knows (a cat's room, a game room, the join code) is acted on at once, with a ding and no reload: the same calls the address makes today.
3. iPhones have no built-in code reader for web pages, so bundle a small one (`qr-scanner`, say), loaded only at the first tap.
4. The camera is asked for at that first tap, never at sign-in. If refused: “Use your phone's camera instead.” The printed codes work as before.

**Done when:** on an iPhone and an Android phone, a scan from inside the app takes one tap and about two seconds, and the old way still works.

### A13 · The Catwalk and Boo's camera: gone

**Jon:** “That catwalk was thrown out a while ago, and I need it to… be gone, it's taking up a lot of room. So anything regarding… Jenna's iPad, anything regarding the camera for it, anything regarding it at all.”

**Build:** delete all of it.

- `?kiosk=pose`: `Pose.jsx`, `play/src/lib/pose.js`, `functions/lib/pose.js`, its callable, its rules and the `public/pose-*` documents.
- The photos in the credits (`c.poses`, `CreditPose`).
- The setup button and the Devices row for Jenna's iPad.
- Every Catwalk word in the app, the workshop, the seed notes and `docs/on-the-night.md`. The session log and old handoffs keep their history.
- The open questions arcadeCamera and arcadeSound close: no camera, and the arcade plays on the Mac's own speakers.

**Done when:** a search for `catwalk` and `kiosk=pose` in `play/src`, `app/src`, `functions/lib`, `cues` and `seed` finds nothing, and `/setup` has no camera button.

### A14 · Media on by default, and the rules as a film

**Jon:** “It didn't run any of the intros, the audio, the video. It just felt dry and boring.” “I need all videos. I need all audio content. I need all everything. Now.”

**Found:**

- Videos play only when `meta/game.bulletinVideo` is true: the box on the Game night page. With the box off and no sound-only recordings in, both bulletins are words on a silent screen.
- The intro plays at The house rules since 12 Nov, but a page nobody clicked plays it silent.
- The rules are still a second browser tab that Jon has to switch to. His 28 narration files were never imported.

**Build:**

1. Video is the default. If a bulletin's video is online, the TV plays it. The box becomes an off-switch: Show the words instead.
2. The rules as a film, straight after the intro, with no second tab. Use Jon's 28 files (`rules-01-cover` to `rules-28-good-luck`) and the plan in `docs/rules-voiceover-manifest.md`. Draw the 28 slides in the new look from the script, so Jon has no deck to export. Bring `media-import` up to date for these files.
3. Rules line 25 describes the deduction round (“each of us says, out loud, one thing we have ruled out”). Cut the film at that sentence if the recording allows. If not, tell Jon.
4. Sound on every screen: the one click at setup turns on sound as well as full screen. The page reports it, and `/setup` and the Host tab's screen list show a sound tick.
5. `docs/media.md` still says the game does not play the intro. Fix the page.

**Done when:** on a practice night the Parlour TV plays the intro, the rules, bulletin 1 and the closing bulletin by itself, with sound, and nobody touched a box or a tab.

### B1 · The look book first

**Jon:** “As you develop this and design things, make sure that… I approve layouts overall. You can keep with the themes.” “It needs to be fun.”

**Build:** one page, `/play/?look=1`, never linked from a guest screen. It shows eight real screens in the new look (see The look, below), with the real art:

1. A room splash, with its cat
2. The phone's Now tab
3. The phone's Rules tab
4. A win, small and big
5. The vote card
6. A game's rules card
7. The End
8. The dedication card in the credits

Send Jon the link. Nothing rolls out until he says yes. He may say yes to some and not others.

**Done when:** Jon has said yes, or given changes, for each of the eight.

### B2 · Every idle screen: its cat, alive

**Jon:** “For the splashes that live while other games are going on, just make sure it has the respective cats on them… fun and inviting.” “The flat text on the flat background is just not fun.” “I don't know where all my art went.” “I need a secondary splash page for the study… something small on the… MacBook Air… and a small something on the MacBook Pro screen as it's sitting next to the Parlour TV.”

**Found:** every idle screen waits for a loop video (`Loop` in `Rooms.jsx`). None was ever made, so each shows the crest as text. The second-display page (`?kiosk=decor`) is the crest alone.

**Build:**

1. A live splash made in code, with no video file: the wallpaper, the room's cat large and slowly moving, the room's name in the display face, and one inviting line.

| Screen | Who is on it |
| --- | --- |
| The Parlour TV | Sir Irwin |
| The Study | Granolia |
| The Library (the iPad) | Zimothy |
| The Orangerie | Salem |
| The Entryway | Miss Boo LaRue |
| The bedroom | Sir Irwin, waiting at the door |

2. Each cat cycles through its own pictures in `play/public/household/full/`, so a screen changes through the night.
3. Once a minute a line fades in from the house's tips (`FREE_TIME_TIPS`), so someone standing by sees there is more to it.
4. The second display shows the same splash for its room, smaller and calmer: `?kiosk=decor&room=study` and `&room=living`. It goes dark with the room.
5. A loop file still wins if Jon ever drops one in.

**Done when:** no screen in the house shows text alone at any point of a practice night.

### B3 · The phone: fewer words, more to tap

**Jon:** “On the phone, the rules section needs to look better. There needs to be a lot more engagement.” “So much of this game is so incredibly wordy, especially on the app… I want to be able to look at something and automatically understand it.” “Keep things to about one to two solid sentences… If there are things that… need to be read out loud… I just need a script for it.” “Make sure that the tone is an English American wording.”

**Build:**

1. The word rule: two short sentences and one button on any card, notice or screen. A longer line is cut down. If it cannot be cut, it moves to `docs/read-aloud.md`, a script for Jon or a recorded voice.
2. A test that fails on any player-facing line over 25 words. The cats' hint lines, the news and the rules cards are the only exceptions.
3. Plain American English in everything a guest reads: color, favorite. Room names keep their manor spelling (the Parlour). Reword any line Jon would not say out loud.
4. The Rules tab as cards to swipe: one idea a card, a picture on each. The first card is the whole game in three lines: Who did it? Why? Who is the Ghost?
5. The Now tab is one big card: what to do right now, and one button.
6. Every tap answers: a press, a sound, a small move. Nothing on a phone sits flat.

**Done when:** the word test passes, and Susan can use every phone screen in a practice night without asking what it wants.

### B4 · Celebrate every win

**Jon:** “Everything needs to be more celebrational. Not birthday celebrational, but like, celebrate a small victory. You solve something. Congratulations… Even the small wins. It does a great job with flashing when you get the light panel correctly… That needs to kind of vibe through the entire thing.”

**Build:** one `celebrate(level)`, used by the phones and the room screens alike.

| Level | What happens | When |
| --- | --- | --- |
| Small, half a second | A sparkle and a ding | A clue saved, a motive crossed off, a cat visited, a right pick |
| Medium, one second | A wax-seal stamp, a chime, the room's cat hops | A round cleared, a Parlour Game done, Locked in |
| Big, two to three seconds | A burst of paw prints, a fanfare, the room's lights flash once | A room solved, a picture named, the door opens, three out of three |
| Not quite | A soft buzz and a shake | A miss. Never a scolding |

Wire it to every one of those moments, and list them in `docs/on-the-night.md`.

**Done when:** in a practice night no win, small or big, passes in silence.

### C1 · Close the night: the credits, The End, Jon's phone

**Jon:** “At the end, like a credits roll with special acknowledgement, and a dedication.” “At the end, there needs to be a cute… the end, making sure that that is the end of the game, again, celebratory.” “I'll open and close the night, and… I want to do that all through my phone.”

**Found:** The End turns every screen black and the music off (`end` in `seed/night.json` and `cues/scenes.json`). The credits end on Sydney's line and Irwin's last card (`functions/lib/finale.js`).

**Build:**

1. The order: the reveal, your result, the credits, The End.
2. Two new places in the credits, before the last card: Special thanks (Jon's lines) and the Dedication (one card, held for eight seconds). Today's line for Sydney stays until Jon sends his words.
3. The End is a card, not a black screen. On every room screen and phone: The End in lights, Sir Irwin, “Happy first birthday, Sir Irwin”, and one burst of paw prints. Jazz plays and the lights are on Default. Phones stay open under it.
4. Jon's phone closes the night. After The End, one button: **Good night**. It marks the night over and leaves the house on jazz and Default.

**Done when:** Jon starts and ends a practice night from his phone alone, and the last thing on every screen is The End.

## The look

**The direction is the reveal name cards Jon approved on 11 Nov, carried to every screen.** Nothing here rolls out before Jon has seen the look book (B1).

| Part | The rule |
| --- | --- |
| Ground | Manor blue `#001925` with the Irwin wallpaper showing through softly. Never a flat fill |
| The drab green | Cut. No olive ground anywhere (`--brand-peat`). Brass `#A6A253` only as thin lines and small capitals |
| Big words | Abril Fatface, as on the name cards. Large and few. The site does not load this face yet: bundle it with the site, do not fetch it on the night |
| Names and lines | Source Serif 4 |
| Paper | Parchment `#F1E8D6` cards with a brass double line |
| The one button | Wax red `#BF1925`. One a screen |
| The household | A cat or Sir Irwin on every screen that is not a clue: large, cut out, with a soft shadow, peeking in from an edge |
| Movement | Slow and constant. The cat floats, the wallpaper drifts, gaslight flickers in the corners. Nothing sits still, and nothing flashes at someone reading |
| Game titles | A marquee of chasing bulbs around each game's name on the room screens |

The fun list. Each one is small, and each can be left out without breaking anything:

| Moment | What happens |
| --- | --- |
| A clue lands | The card slides in with a sparkle, and the Clues tab bounces |
| A motive is crossed off | A pencil scratches through it, with the sound |
| Locked in, anywhere | A wax seal stamps down with a thunk |
| The last ten seconds of any clock | Big numbers, a tick and a pulse |
| A room's cat, while a group plays | It hops when they win. Boo looks unimpressed when they miss |
| The blackout | A white flash, then the old-TV squeeze to black |
| A screen nobody is using | Its cat drifts across, and a tip fades in once a minute |
| The End | The End in lights, Sir Irwin, paw prints |

## Coming from Jon

**Three things are on their way from Jon. Leave room for them and build nothing yet.**

| What | Where it will go | Until then |
| --- | --- | --- |
| Irwin's breed moment | Not placed yet. Jon will say what it is and when it plays | Nothing |
| Special thanks | The credits, before the last card (C1) | The place exists, empty |
| The dedication | The credits, one card held for eight seconds (C1) | Today's line for Sydney, with no photo |

## Choices made for Jon

**None of these stops the work. Each has a default that gets built, and Jon changes any of them with a word.** Claude Code asks about one only when it reaches it, one at a time.

| Choice | The default that gets built | The other way |
| --- | --- | --- |
| “Lighter chimes” | Read as louder, and fuller | Softer, if Jon meant that |
| Music after the blackout | Back after the role cards, so the dark is truly silent | Back with the lights, as the cue list says |
| Loud sounds on the HomePods | Screens and phones play every cue themselves. The HomePods keep the music and the birthday song | Every cue on the HomePods too, through new Shortcuts from Jon |
| The eight stand-in sounds | Made fuller in code, and Jon picks | Jon's own files, same names |
| Sir Irwin's voice | Made on the brain with a macOS voice | Jon or Susan records the eight lines |
| “Lit until the game starts” | The room's lights, and a soft glow on the walls | Only one of the two |
| The third row of the vote | The Ghost | The Victim, as the rules film says |
| Fill-in players' roles | Any role, by the same deal | Detectives only |
| Susan as a random guest | She joins under another name | A switch on the Start card |
| The rules film's slides | Drawn in the new look from the script | Jon exports the deck |
| The party's drawing pictures | Rebuilt with the new maker | Kept as they are, unseen |
| A practice night's answers | Not kept out of Sunday's deal | Kept out, which would tell Jon one thing it is not |
| The bedroom's splash | Sir Irwin at the door | Salem, as the 25 Oct cue list says |
| Spelling | American in what guests read. The Parlour keeps its name | The Parlor |

## What this changes in the Canon and CLAUDE.md

**This handoff is Jon's word of 11 Nov, and it wins over older pages where they disagree.** It reopens the build that the 12 Nov note closed (“Development is done”). The cut line still holds.

- **Act 6** ends with The door opens and a new beat, Talk it over. The deduction round is gone. Jon's Done ends the act.
- **The drawing** has three rounds, no practice round and no wait after a wrong pick. Sir Irwin's slides are voiced. The cats still never speak.
- **The vote** is one card with three rows and Lock in. It closes when the last seat locks in.
- **Windows:** the client rule “Windows never close early” becomes: a window closes when the last phone has answered, or on its clock, whichever is first.
- **Parlour Games** open only in Act 2's cat visits, Act 4's rounds and Act 6's games beat. None after the drawing starts. Unplayed ones are dropped.
- **A practice night** shows real lines from its own throwaway case. This replaces the bracketed stand-ins of 23 Oct. It uses a practice packing and a practice picture bank, and still reads nothing sealed.
- **Fill-in players** exist on practice nights only.
- **Sound:** the room screens and phones play the cue sounds. No music through the dark or the role cards. The night ends on jazz. The Living Room HomePod is no longer lent in Act 4.
- **The blackout** has a lead before the dark. The walls, the decks and the strings go dark too.
- **Video** is the default, and the Game night box is an off-switch. The rules play as a film, and the second tab is retired.
- **The iPad Pro** runs one page that follows the night, with a switch on the Host tab.
- **A camera in the app,** asked for on first use. The client rules gain it. No service worker, no notifications and no install prompt still hold.
- **Boo's camera and Jenna's iPad** are out of the night. The questions arcadeCamera and arcadeSound are answered.
- **The End** is a card with jazz, not black and silent. The credits gain Special thanks and a Dedication.
- **The look:** no olive ground. Each idle screen is its room's splash, and a second display shows its room's cat.

The Canon page already carries a dated block with Jon's own words, added on 11 Nov. Its body still needs a full pass, which is a card for Claude chat.

## Sources

Looked up on 11 Nov 2026 for jobs A2, A10 and A12:

- [MacRumors: Safari changes on iOS 26](https://www.macrumors.com/2025/06/18/safari-changes-on-ios-26/): a site added to the Home Screen opens as a web app on iOS 26 and iPadOS 26.
- [MDN: AudioSession type](https://developer.mozilla.org/docs/Web/API/AudioSession/type): the `playback` setting, and that not every browser has it.
- [Can I use: BarcodeDetector](https://caniuse.com/mdn-api_barcodedetector): off by default in Safari on iPhone and iPad.

## Every note, checked off

**All 51 notes, in the order Jon said them, each with the job that carries it.**

| # | Jon's note | Where it lives |
| --- | --- | --- |
| 1 | The phone's rules section must look better. More engagement everywhere | B3 |
| 2 | Irwin's breed element is coming | Coming from Jon |
| 3 | A credits roll with a special acknowledgement and a dedication, coming | C1, Coming from Jon |
| 4 | Every device full screen. iPad trouble in Safari and Chrome. Wants options | A10 |
| 5 | One screen on the iPad, moved to the right act from the host's phone | A10 |
| 6 | Clear out the Catwalk, Jenna's iPad and its camera | A13 |
| 7 | The four games sit well: the arcade, Get Off My Lawn!, In Duplicate, Lightbulb Moment | No change |
| 8 | A small second splash on the Study's MacBook Air and the Parlour's MacBook Pro | B2 |
| 9 | Every page must look better. Flat text on a flat ground is not fun | B1 to B4 |
| 10 | A welcome page on the iPad looks strange | A10 |
| 11 | Could not get the Get Off My Lawn! page up on the brain. Where to find it | A9, Jon start here |
| 12 | The setup works very well. Keep it | The rules of this pass |
| 13 | No intros, audio or video ran. Where did the art go | A14, B2, Media |
| 14 | A full game for the practice: Jon as his character, Susan as a random guest | The practice night |
| 15 | Six more players with no devices, playing along | A4 |
| 16 | Real clues, hints and reveals. No insert text | A3 |
| 17 | The blackout must hit: everything black, no music, tight cues | A1 |
| 18 | A camera in the app for scanning, in the top corner | A12 |
| 19 | The Stream Deck was not seen on Susan's MacBook Pro. Wants insight | A11 |
| 20 | Get Off My Lawn! needs time limits, a countdown and more communication. Keep its look | A9 |
| 21 | The Study lit until the game starts. Clear when you are there and when you start | A8 |
| 22 | Every station clear enough that nobody asks if it is working | A8, B2, B3 |
| 23 | The practice may give things away. Never rerun those scenarios | A3 |
| 24 | Two wall panels were dead. Hardware, fixed | No change |
| 25 | Granolia's hint must use the hexagons, and it was reversed | A8 |
| 26 | The One Candle sound louder and on every HomePod. Music was still on the Living Room HomePod | A2 |
| 27 | Idle splashes must carry their own cats, fun and inviting | B2 |
| 28 | The game felt quiet. It was not vibing | A2, B4 |
| 29 | Lose the ten-second wait after a wrong pick in Act 6 | A7 |
| 30 | The chimes were hard to hear | A2 |
| 31 | Celebrate every win, small ones too, the way the light wall does | B4 |
| 32 | No practice round in Act 6 | A7 |
| 33 | A voice for the Act 6 slides | A7 |
| 34 | Better line art: consistent, and be something | A7 |
| 35 | “Tell Professor Jonathan Kostington how” is a weird line. Plain American wording | A7, B3 |
| 36 | The ending is weird and does not pay off | A6, C1 |
| 37 | The deduction round goes. People just talk | A6 |
| 38 | After the door, Jon taps Done, then starts the vote from his phone | A6 |
| 39 | A simple vote: murderer, motive, ghost | A6 |
| 40 | The app is far too wordy. Understand it at a glance | B3 |
| 41 | When the last person has entered something, carry on by itself | A6 |
| 42 | The screens must work and get out of people's way | The rules of this pass |
| 43 | Everything for the run-through: all videos, all audio, now | A14, The practice night |
| 44 | The ending music is the default jazz, not a random playlist | A2 |
| 45 | A cute, celebratory The End | C1 |
| 46 | Tomorrow is about solid audio cues and every step working | The practice night |
| 47 | Jon approves the layouts. Keep the themes. Make it fun | B1 |
| 48 | The drab green background is cut. That color for text at most | The look |
| 49 | One or two sentences. Longer lines become a read-aloud script | B3 |
| 50 | Keep the setup. Jon opens and closes the night from his phone | C1 |
| 51 | Parlour Games came out of order, after the trace reveal. Make the flow solid | A5 |

## Prompt for Claude Code

Paste this into Claude Code:

> Read `docs/handoff-2026-11-11-polish.md` in full and apply it. It is my notes from the 11 Nov evening practice, and it wins over older pages where they disagree. Start with the checks in its Media section: `npm run media -- --live`, and whether the videos box is ticked. Then build in its order of work: B1, the look book, first, and send me the link. Then A1 to A14 in order. Then B2 to B4 once I say yes to the look. Then C1 when my words arrive. Every job has a Done when, and a job is not done until it passes. Keep to Rule 1: a practice night reads nothing sealed, the party's pictures and packing stay unseen, and nothing sealed is printed. Ask me one question at a time, only when a job needs it, and use the defaults in Choices made for Jon otherwise. If a job is not finished and tested two hours before the practice night, leave it out and tell me which. Do the end-of-session routine in CLAUDE.md, and add a card for Claude chat to bring the Canon's body up to date. Do not deploy or push until I say.
