# The cue relay (the brain)

A small program that runs on the brain (Jon's M3 MacBook Air) all night. It
watches the same public night state the phones watch and does a few dumb
things: it turns the bulb outside the bedroom green, off, red and green,
plays a sound file when a sound is called for, runs Apple Music, switches the
Hue lights to the right scene, switches the projector's plug on and off
through Apple Home, dims the study's other light while a group is at the
wall, and mirrors Salem's game on the Orangerie string lights. It never
knows what any of it means. Written 17 October 2026, brought up to date
24 October (music, Hue scenes, the string lights, video) and 25 October, when
Jon's cue list (`docs/cue-list.md`) became canon: the bulb by phase, the
projector's plug, the new playlists and scenes, the dim study, Cake!, nine
sounds with one chime for every chime moment.

**Where it comes from:** `docs/cue-list.md` (Jon's 23 cues) and
`docs/handoff-2026-10-25.md` (sections 2, 3 and 5), `CLAUDE.md` (Hardware,
and the client rule "sound files are named after the event ID so the relay
performs no logic and stays blind"), and `docs/relay-drawing-game.md` (the
door).

## What it does

- **The hall light.** The bulb outside the bedroom is green while the guests
  arrive (the welcome), goes out with everything else in the blackout, turns
  red when the power returns and stays red until the third drawing is named
  in Act 6, when it turns green. If the bulb never turns, the Parlour TV says
  "the door is open" anyway, so the game never depends on it. The bulb is in
  no Hue scene, so a scene never changes it.
- **Sounds.** When the night asks for a sound, the relay plays the file with
  that name from the `media` folder, through whatever the Mac's sound is
  pointed at (the AirPlay group). There are nine, listed in `media/README.md`
  with the moment each one plays: `chime-phone` (every "look at your phone"
  moment, the sound test and the dessert chime too), `blackout`,
  `chime-news`, `sounder-bulletin`, `chime-irwin`, `sting-solved`,
  `sting-door`, `sting-reveal` and `sting-result`. A file is named after its
  id and nothing else: `chime-phone.m4a`. Every file starts with one second of
  silence (the pad rule) so the speakers have woken up before the sound
  begins. Only two are required (decided 25 October, *cueSounds*):
  `chime-phone` and `blackout`; the relay refuses to start while either has
  no file. The three other chimes (`chime-news`, `chime-irwin`,
  `sounder-bulletin`) play the `chime-phone` file when they have none of their
  own, so one recorded chime serves every chime moment. The four stings are
  optional: with no file, that moment is silent, and the relay's first lines
  say how many ("4 optional sounds have no file: silent at those moments").
  Until you have recorded anything, `node scripts/make-placeholder-sounds.mjs`
  writes a stand-in tone for each of the nine. An id it does not know is
  refused and counted, never played. There is no power sound any more: the
  power's return is the lights and the music coming back.
- **W-O-O-F News recordings ride on top.** A bulletin's sound is followed by
  its recorded lines, one after another. The closing bulletin's parts play
  each time you press a name in Act 7. A newer sound cuts off the recording
  that is playing, so two never talk over each other. A recording with no
  file yet is skipped and never stops the relay starting; the words are on
  the screen anyway. The recordings arrive under codes, not names, and the
  relay matches them to your files with the study's key word (`STATION_KEY`
  in `cues/.env`). Bulletin 2 plays during supper on every HomePod (the
  default for *roomMusic*, 25 October), so keep the Orangerie HomePod in the
  speaker group and set its own volume in the Home app. How to name the
  files: `media/README.md`.
- **Video.** When the Parlour TV plays bulletin 1 or the closing bulletin as
  video, with its own sound, the brain rings the chime but does not play
  those recordings, so you never hear them twice. The music stops for the
  news beat and is cut at the newscast (the table below), so nothing plays
  under a video. Bulletin 2 is always sound on the HomePods.
- **Music.** Apple Music on the brain plays into the same speakers as the
  cues. There are three playlists (Jazz, Intense, Credits) and the brain
  picks one, at the right volume, as the night moves (the table below): the
  jazz for most of the night, lowered for the drawing's intro; the intense
  music at 35 while the drawing runs and at 60 from the moment the door
  opens, through the ballot and the tally; the credits music at 35 for the
  credits; off for the house rules, the blackout, bulletin 1's video, the
  newscast and The End. Playlists play on shuffle and repeat. Whenever a cue
  sound or a recording plays, the music dips to a whisper and comes back
  after (bulletin 2 plays over the dipped music, it never cuts it).
- **Cake!** When you press **Cake!** on the Host tab in Act 5, the brain
  plays the song *Happy Birthday for Dogs* from its Music library on every
  HomePod, once, at 60, and switches the lights to Murderwin Candles. When
  the song ends, the jazz and the Default scene come back on their own. If
  Music cannot be read, they come back after 75 seconds (the `seconds`
  setting in `cues/scenes.json`).
- **Hue scenes.** You make six scenes in the Hue app; the brain switches to
  the right one as the night moves (the table below).
- **The dim study.** In Act 4, while the study's screen says a group is at
  the wall (playing, reproducing a pattern or entering the code), the brain
  recalls Murderwin Study Dim, the scene with the study's other lamp low;
  when the group is done, or the round changes, it recalls Murderwin Default
  again. Jon names the lamp in the Hue app and makes the scene; the brain
  only ever names the scene.
- **The projector's plug.** The projector on the landing is on an IKEA smart
  switch in Apple Home. The brain switches it from two Shortcuts on the Mac
  (*Projector Murderwin On* and *Projector Murderwin Off*, each running one
  Home scene you make): off for the blackout, back on when the power
  returns, off from the drawing's intro, on again for the ballot, off at The
  End. The projector takes a moment to warm up when its plug comes back; the
  Entryway code it shows in Act 2 is printed too, so nothing waits on it.
- **The Orangerie string lights.** During Salem's Motion Game the strings
  turn red and green when the phones do (1 to 2 seconds behind through Apple
  Home). The rest of the night they show the warm Decor Murderwin Strings
  scene: Jon puts the Patio light in that scene too, both warm at 100, for
  supper (cue 8). If the strings do not answer, the brain says so once and
  carries on: every phone in the group tints its whole screen the same
  colour, so the game never waits on the lights.

### When the music, the lights and the projector change

| Cue | Moment | Music | Lights (Hue scene) | Projector |
|---|---|---|---|---|
| 1 | You start the night (Act 1): the welcome | Jazz, 55 | Murderwin Default | on |
| 2 | "The house rules" | stops | Murderwin Dimmed | no change |
| 3 | Characters and bags (the rest of Act 1) | Jazz, 55 | Murderwin Default | no change |
| 4 | Blackout | stops | Murderwin Blackout | off |
| 5 | The power returns (Act 2) | Jazz, 55 | Murderwin Default | on |
| 6 | Bulletin 1 on the TV ("news") | stops | Murderwin Dimmed | no change |
| 7 | To the investigation ("peek", the cat visits) | Jazz, 55 | Murderwin Default | no change |
| 8, 9, 10 | Supper, bulletin 2 (dips under the sounder), the wrap-up (Act 3) | no change | no change | no change |
| 11 | Act 4, the rooms | no change | no change; Murderwin Study Dim while a group is at the study wall, Default when it leaves | no change |
| 12 | Act 5, dessert (the chime dips it) | no change | no change | no change |
| 13 | **Cake!** | the song, at 60, once; then the jazz again | Murderwin Candles, then Default again | no change |
| 14 | Sir Irwin speaks, update your motives | no change | no change | no change |
| 15 | Act 6 opens, the two Parlour Games | no change | no change | no change |
| 16 | The drawing's intro ("drawing") | Jazz, 30 | Murderwin Dimmed | off |
| 17 | The drawing runs (the slides begin) | Intense, 35 | Murderwin Drawing | no change |
| 18 | The door opens (the third picture is named) | Intense, 60 | no change (the hall bulb turns green) | no change |
| 18 | "Head to the bedroom", the deduction round | no change | no change | no change |
| 19 | The ballot (Act 7) | no change (Intense, 60) | Murderwin Default | on |
| 20 | The tally ("reveal") | no change | Murderwin Dimmed | no change |
| 21 | The first Name press: the newscast on the TV | cut, for the rest of the reveal beat | no change | no change |
| 22 | Everyone's result: the credits roll | Credits, 35 | Murderwin Default | no change |
| 23 | The End | stops | left as they are | off |

The brain only acts when the answer changes. Pressing Next inside an act
changes nothing unless the table says so. If you change the music or a
scene by hand (the Music app, the Hue app, or a Host tab button), your
choice holds until the next row that changes it. If the brain is restarted
in the middle of the night, it puts the right music, scene and projector
back once.

This table lives in `cues/scenes.json`, a plain settings file with nothing
secret in it. To change what plays when, or a playlist's volume, change that
file (or ask Claude Code to) and restart the relay. If the file has a
mistake in it, the relay says so in one line and runs without music, scenes
and the projector; the hall light and the sounds carry on.

### Your buttons

- **Sound test** (Host tab, under The house): the chime on every HomePod,
  for the sound-test moment in the rules.
- **Cake!** (Host tab, Act 5): the song, the candles, the birthday card on
  the TV; the jazz comes back when the song ends.
- **A scene by hand.** Under The house on the Host tab, six buttons, one per
  scene: Default, Dimmed, Blackout, Drawing, Candles and Study Dim. The brain
  switches to it at once, and your choice holds until the table's next change.
- **Music by hand:** play, pause, next playlist (the five settings in turn:
  jazz 55, jazz 30, intense 35, intense 60, credits 35).
- The Host tab can still set the hall light red or green by hand, under
  *The house*.

## What it prints

It reads only public documents, the same ones any phone may read. It never
calls the server, never sees a clue, and never prints anything but the hall
colour, the scene, playlist and song names, the projector's state and counts
("sound playing; bulletin: 3 recordings, 1 missing"). It never prints the
name of a sound, a recording or a file. Once a minute it writes one small
heartbeat (the same row every phone writes), so the Host tab's house panel
can show it alive. When it starts it prints what the sound folder holds, as
counts ("3 chimes have no file of their own: the one chime plays there", "4
optional sounds have no file: silent at those moments"), and one line saying
what is on: "music: on · Hue scenes: on · projector: on, through Apple Home
· string lights: on, through Apple Home".

## Setting it up (once, on the hardware evening)

Do these on the brain, in a Terminal window, in the Murderwin folder. (Or
ask Claude Code to do the typing; the clicks in the Hue, Music, Home and
Shortcuts apps are yours.)

**Where it stands, 25 October 2026.**
- The Hue bridge is paired with the brain (step 1), and the hall bulb went
  red and green from the brain. The hall bulb shows as *Master bedroom* in
  the Hue app and as *Jonny's light* in Apple's Home app. Neither name
  matters to the brain, which finds the bulb by its id (step 4); what
  matters is that the bulb stays out of the zone the scenes use (step 8).
  Off in the blackout is new on 25 October and untried on the bulb.
- The string lights run through Apple Home, not by pairing: three Home
  scenes and three Shortcuts on the brain (step 14). Red and the warm decor
  colour work, each in 1 to 2 seconds; the green Shortcut is being rebuilt.
- New on 25 October and not yet made: the three playlists under their new
  names, the song in the library, the six scenes, the dim study scene's lamp,
  the Patio light in the Decor strings scene, the projector's plug in Home
  with its two scenes and two Shortcuts.
- The four HomePods are not one AirPlay group yet. Make the group on the
  brain and pick it as the sound output.
- The brain is on Wi-Fi for now: its network cable adapter showed no link.
  Wi-Fi works; a cable is only steadier.

**The hall light and the sounds**

1. **Pair the Hue bridge.** Press the round button on the bridge, then within
   thirty seconds run:
   ```bash
   curl -k -X POST https://<bridge address>/api -d '{"devicetype":"murderwin#brain","generateclientkey":true}'
   ```
   Copy the long `username` from the answer. That is the application key.
2. **Fill in the settings.** Copy `cues/.env.example` to `cues/.env`. Put in
   the bridge's address and the key. Add `STATION_KEY=` with the same word
   you typed on the Host tab under *The study* (the study Mac has it in
   `station/.env` too). Without it the news recordings are skipped. If you
   change the study's word, change it here and restart the relay. Every
   setting is in the table further down.
3. **Install.** In `cues/`: `npm install`.
4. **Find the hall light.** `npm start -- --lights` prints every light the
   bridge knows with its id. Put the hall bulb's id in `.env` as
   `HUE_HALL_LIGHT_ID`. (In the Hue app the bulb shows as Master bedroom,
   and in the Home app as Jonny's light: the same bulb.)
5. **The sounds.** Record `chime-phone` (one short chime: it is the sound
   test, the supper chime, every Act 4 round, dessert, the start of Act 6,
   and it stands in for the other chimes) and `blackout` (thunder, a crash,
   a scream: it has to hit hard). The stings are yours to record or to skip.
   Until then, `node scripts/make-placeholder-sounds.mjs` once, for a
   stand-in tone per sound. `media/README.md` has the list.

**The music**

6. **Make the three playlists** in the Music app on the brain, named exactly:
   - `Murderwin · Jazz`: light jazz, the house's music for most of the night
     (at 55; at 30 for the drawing's intro).
   - `Murderwin · Intense`: intense instrumental music for the drawing (at
     35), the unlock, the ballot and the tally (at 60).
   - `Murderwin · Credits`: fun music for the credits (at 35).

   The dot in the middle is Option-Shift-9 on a Mac keyboard. If that is a
   bother, a plain hyphen works too: `Murderwin - Jazz`. You do not need to
   set shuffle or repeat; the brain does. (The old Arrival, Investigation
   and Supper playlists are not used any more; fold them into Jazz.)
7. **Add the song** *Happy Birthday for Dogs* to the Music library on the
   brain (the Apple Music link is in `docs/cue-list.md`, cue 13). The brain
   finds it by that exact name, so download it or add it to the library, not
   only to a playlist.
8. **The one permission click.** Run `npm start -- --check-music`. The first
   time, the Mac asks whether Terminal may control Music: click **OK**. You
   should then hear six seconds of each of the three playlists, a dip to a
   whisper, the music coming back, six seconds of the song, and then it
   stops. If you clicked Don't Allow by mistake: System Settings, Privacy &
   Security, Automation, Terminal, and tick Music. If the music comes out of
   the Mac and not the HomePods, click the AirPlay button in the Music window
   and tick the same HomePods.
9. **Levels.** Each setting's loudness is Music's own volume, set in
   `cues/scenes.json` (`volume`: jazz 55, jazzLow 30, intense35 35,
   intense60 60, credits 35, the song 60 out of 100), and so is the whisper
   under a cue (`whisper`: 10). Leave the Music app's own slider alone: the
   brain sets it. Set each HomePod's volume in the Home app (the Orangerie's
   for bulletin 2) and the brain's output volume once, then tune these
   numbers by ear.

**The Hue scenes**

10. **Give the hall bulb a room of its own** in the Hue app (call it Hall),
    and keep it out of every zone the other lights are in. That way no scene
    ever touches its red and green.
11. **Make a zone with every other Hue light** (in the Hue app, a zone is a
    group of rooms; call it Murderwin house).
12. **Make six scenes in that zone**, named exactly:
    - `Murderwin Default`: the house's normal look, warm, normal brightness.
    - `Murderwin Dimmed`: Default, dimmed for a screen (the rules, the two
      TV bulletins, the tally).
    - `Murderwin Blackout`: every light off.
    - `Murderwin Drawing`: the Cloud light at 100, everything in the Parlour
      very low (the drawing, the unlock, the deduction round).
    - `Murderwin Candles`: Default dimmed for the candles (Cake!).
    - `Murderwin Study Dim`: the study's other lamp low, the rest as Default
      (while a group is at the study wall). Name that lamp in the Hue app;
      the brain never needs its name, only the scene's.

    If you would rather make scenes room by room, give the scene the same
    name in each room: the brain switches every scene with that name at
    once. If the Hue app will not save a scene with the lights off, make
    Murderwin Blackout with every light at its lowest and tell Claude Code.
    (Murderwin Arrival, Lights Out and Reveal are not used any more.)
13. **Check them.** `npm start -- --scenes` lists every scene on the bridge
    and then says `found` or `MISSING` against each of the six. Try one
    with `npm start -- --scene "Murderwin Dimmed"`.

**The projector's plug**

14. **The plug in Apple Home.** The IKEA smart switch the projector is on is
    in the Home app already. Make two Home scenes with only that plug in
    them: one that turns it on, one that turns it off. In Shortcuts, make two
    shortcuts that each run one scene, named exactly *Projector Murderwin
    On* and *Projector Murderwin Off*. They sync to the brain through iCloud.
    In `cues/.env`, `PROJECTOR_SHORTCUTS=on`.
15. **Check it.** `npm start -- --check-projector` switches the plug off, waits
    five seconds, and switches it on. If nothing happens, open the Shortcut
    and check it runs the right scene. If you would rather do it by hand on
    the night, leave `PROJECTOR_SHORTCUTS` empty: the brain prints "would
    switch the projector off" at each moment, and you tap the plug in the
    Home app.

**The Orangerie string lights**

16. **Put the strings on the home Wi-Fi and in Apple Home.** Add them in the
    Home app (Matter). That puts them on the home Wi-Fi.
17. **Three Home scenes and three Shortcuts.** In the Home app, make three
    scenes: red at full brightness and green at full brightness with only the
    Holiday Lights in them, and *Decor Murderwin Strings*, a soft warm glow,
    with the Holiday Lights and the Patio light both warm at 100 (cue 8:
    that is the Orangerie at supper, and whenever Salem's game is not
    running). In Shortcuts, make three shortcuts that each run one scene,
    named exactly *Red Murderwin Strings*, *Green Murderwin Strings* and
    *Decor Murderwin Strings*. They sync to the brain through iCloud. In
    `cues/.env`, `STRINGS_SHORTCUTS=on`. Apple Home takes 1 to 2 seconds, so
    in Salem's game the phones lead and the strings follow.
    **Not this way:** pairing straight to the strings. Holding their button
    resets their Wi-Fi (24 October), and they never opened pairing. The code
    for it stays (`NANOLEAF_STRINGS_HOST` and `NANOLEAF_STRINGS_TOKEN`, which
    win over the Shortcuts if both are set).
18. **Check them.** `npm start -- --check-strings` turns them red, green,
    then the warm colour. If one never changes, open its Shortcut and check it
    runs the right scene. If none answer, leave `STRINGS_SHORTCUTS` empty:
    the strings are decoration, and the phones carry the colour.

**All of it at once**

19. **A pretend night.** `npm start -- --demo` walks through every move the
    brain makes, in about two minutes, on the real bulb, speakers, Music,
    scenes, projector and strings (it does not touch the game). Watch and
    listen: the bulb green, the jazz, the music stopping for the rules, the
    blackout with the bulb and the projector off, the bulb red and the
    projector back, the study dimming, the strings flicking red and green,
    the song and the candles, the jazz lowering and the projector off for
    the drawing, the intense music coming up as the bulb turns green, the
    cut at the newscast, the credits, everything off at The End. `npm run
    demo` does the same with no hardware at all and only prints.
20. **Run it.** `npm start`. Leave it running. It finds the live night on its
    own.

Give the bridge and the strings a fixed address on the router, the same as
the Nanoleaf controllers in the study, so they are where the relay expects
them on the night.

### Every setting in `cues/.env`

| Setting | What it is |
|---|---|
| `HUE_BRIDGE_HOST` | The Hue bridge's address on the home network, for example `192.168.1.40`. |
| `HUE_APP_KEY` | The application key from step 1. |
| `HUE_HALL_LIGHT_ID` | The id of the bulb outside the bedroom, from `npm start -- --lights`. |
| `MEDIA_DIR` | Where the sound files are. Leave it as `../media`. |
| `STATION_KEY` | The study's key word, the same as on the Host tab, so the news recordings play. |
| `MUSIC` | `on`, or `off` to leave the music to you and the Music app (Cake! then only switches the lights). |
| `HUE_SCENES` | `on`, or `off` to leave the scenes to the Hue app on your phone. |
| `PROJECTOR_SHORTCUTS` | `on` to switch the projector's plug from the brain through the two Shortcuts. Empty or `off`: the brain only says what it would do. |
| `PROJECTOR_SHORTCUT_ON`, `PROJECTOR_SHORTCUT_OFF` | Only if a Shortcut has another name on this Mac than *Projector Murderwin On* / *Off*. |
| `STRINGS_SHORTCUTS` | `on` to run the string lights through the three Shortcuts in Apple Home. |
| `STRINGS_SHORTCUT_RED`, `STRINGS_SHORTCUT_GREEN`, `STRINGS_SHORTCUT_DECOR` | Only if a Shortcut has another name on this Mac. |
| `NANOLEAF_STRINGS_HOST` | The Orangerie string lights' address, for pairing straight to them (not the way we use). Empty: the strings go through the Shortcuts, or are decoration. Spelled with STRINGS: no other spelling is read. |
| `NANOLEAF_STRINGS_TOKEN` | The token from that pairing. |

After changing any of them, stop the relay (Control-C) and start it again.

## On the day

- [ ] The Mac is on mains power, sleep off, ethernet in (if the cable will
      not link, as on 24 October, Wi-Fi works too).
- [ ] `npm start` in `cues/` is running in a terminal window you can see.
      Its first lines say what the sound folder holds and "music: on · Hue
      scenes: on · projector: on, through Apple Home · string lights: on,
      through Apple Home" (or "not set up" for whatever is decoration).
- [ ] A browser on this Mac, full screen, at the play address with
      `?kiosk=orangerie`, facing the Orangerie table (Salem's code in Act 2,
      the Get Off My Lawn! card in Act 4; it shows the bell but rings
      nothing, the real sounds are this Mac's).
- [ ] Start the night from the Host tab: the log says `[hall] green`,
      `[lights] Murderwin Default`, `[projector] on` and `[music] Murderwin ·
      Jazz at 55`, and the house agrees. If it says `failed … retrying`,
      check the bridge address.
- [ ] The two required sound files, `chime-phone` and `blackout`, are in
      `media/` (the relay will not start without them) and the Mac's output
      is the right speaker group. Press **Sound test** on the Host tab during
      the rules and listen in every room. Or play one by hand:
      `afplay media/chime-phone.m4a` (or `.wav` for a stand-in).
- [ ] The Orangerie HomePod is in that speaker group (bulletin 2 plays there
      during supper). Play `afplay media/sounder-bulletin.wav` (or `.m4a`, or
      the chime if you recorded no sounder) and listen in the Orangerie.
- [ ] The song *Happy Birthday for Dogs* is in the Music library on the
      brain (`npm start -- --check-music` plays it last).
- [ ] `STATION_KEY` in `cues/.env` is the same word as the study's. When
      the relay starts, its window says "STATION_KEY set".
- [ ] The Parlour screen shows a small bell in the corner for three seconds
      whenever a sound is called for. If you see the bell and hear nothing,
      the relay or the speakers are the problem, not the night.

## If it fails

Nothing in the game waits on the relay.

- **The hall bulb** stays whatever colour it was. The TV announces the open
  door, the phones say "the light in the hall is green" regardless, and the
  bedroom screen shows the trace. If it stays off after the blackout, the
  Host tab's **Red** under The house sets it by hand.
- **A sound.** The Parlour screen rings its own small chime and shows the
  bell for every cue, so a dead relay costs the room the big speakers, not
  the moment.
- **The music.** Use the Music app on the brain by hand. If the brain keeps
  doing something you do not want, put `MUSIC=off` in `cues/.env` and
  restart it. A problem (no permission yet, a playlist missing, the song
  missing) is one plain line in the window, never a stop. If the jazz does
  not come back after the cake song, press **Play** under the music on the
  Host tab, or wait: it comes back after 75 seconds on its own.
- **A scene.** Tap it in the Hue app on your phone. `HUE_SCENES=off` stops
  the brain switching them.
- **The projector's plug.** Tap it in the Home app. Leave
  `PROJECTOR_SHORTCUTS` empty and the brain only prints what it would do.
  The projector takes a moment to warm up; the Entryway code is printed too.
- **The string lights.** The phones carry the colour on their own.

`npm run fake` runs the relay on the live night without any hardware and
prints what it would have done; press `r`, `g`, `o`, `s`, `c` or `n` to try
it (`o` is the bulb off, `s` steps through the nine sounds, `c` is Cake!,
`n` through a pretend night). `npm run demo` needs nothing at all.

---

## For Claude Code (technical)

**Watches.** `cues/cues.mjs` signs in anonymously with the public web config,
watches `public_state/active`, then for that night `nights/{id}` (the night
doc: `act` 0-7, `beat`, `phase` 'lobby'|'act'|'blackout'|'prompt'|'paused',
`pausedFrom`) and `nights/{id}/public/cues`, `public/relay`, `public/sounds`,
`public/salem`, `public/study`. All readable by any signed-in phone
(firestore.rules). `--offline` (and `--demo`) skip Firebase entirely: no
sign-in, no heartbeat.

**Two pure planners, one apply.** `apply()` runs both on every snapshot:
- `lib/cues.js` `plan(prevState, docs, now, { readClip })` → `{ actions, state }`
  for the hall and the sounds, idempotent on a reload (state remembers the
  last hall colour and the last `id@stamp` sound; a sound stamped more than
  `SOUND_STALE_MS` = 30 s ago is remembered but not played). `hallColour(docs)`
  (25 Oct): `phaseOf(docs.night)` 'blackout' (a pause from it included) →
  `'off'`; else `relay.doorOpen` or `cues.hall` 'green' → 'green'; else
  `cues.hall` 'red' → 'red'; else null. The server writes green at Act 1, red
  at the power's return (and the role-dealing act jump) and at `relay.reset`,
  green at `revealTrace`; the brain alone does the blackout. `Hue.setLight(id,
  'off')` sends `{ on: { on: false } }` (`lightBody`); the 5 s retry loop
  re-sends 'off' like a colour; fake mode logs "[hall] would turn off". A
  sound with `video: true` becomes `{ type: 'sound', id, video: true, onTv: n }`
  (the id plays, the clips never do) and a clips-only one `{ type: 'video',
  count }` (plays nothing, no duck); an unknown id is refused either way.
- `lib/scenes.js` `planScenes(prev, docs, now, sheet)` → `{ actions, state }`
  for Music, the Hue scenes and the projector, from `cues/scenes.json`.
  `targetFor` resolves `{ music, hue, projector }` for the moment: phase layer
  (`phases.blackout`, `phases.prompt`) over the beat (`acts[n].beats[key]`)
  over the act (`acts[n]`); a key missing from a layer falls through, `null`
  means leave it. A paused night resolves as `pausedFrom`. Outside the dark
  phases, in `drawing.acts` (default [6]): while `relay.state` ∈ intro, walk,
  turn, vote, lockout and the door is not open (`relay.doorOpen` or
  `cues.hall === 'green'`), the `drawing` layer (intense35, Murderwin
  Drawing) wins over the beat; once the door is open, `drawing.unlocked`
  (intense60, Murderwin Drawing) does, so cue 18 lands the moment the third
  picture is named and not at the host's Next (the door and eliminate beats
  say the same). `cut: { acts, beats, trigger }`: on that act and beat, once
  `cutTriggered` (trigger 'clips': `sounds.current` has no id and clips, the
  closing bulletin's first part at the first Name press; or a sound id) the
  music is `off`, sticky in `state.cut` while the moment stays that act and
  beat; the next beat's music applies when the beat changes (Back to the
  reveal with the newscast still the last sound cuts it again). `study: {
  acts, playing, idle, states }`: `studyWants` is 'playing' while the
  `public/study.state` is one of `states` in those acts (not in the dark),
  else 'idle'; an action only on a change, and only to 'playing' or from
  'playing' (nothing before the first group; the idle scene also when the act
  moves on mid-game). `cake: { song, volume, hue, seconds }`: a fresh
  `cues.cake.at` (within `SOUND_STALE_MS`, once per stamp in `state.cakeCmd`)
  gives `{ type: 'cake', song, volume, seconds }` and `{ type: 'scene', name:
  cake.hue, why: 'cake' }`; `afterCake(state)` forgets `state.music` and
  `state.hue` so the next plan puts the moment's playlist and scene back.
  Edge-triggered: an action only when the resolved value differs from the
  last one acted on (`state.music`, `state.hue`, `state.projector`), so a
  restart re-applies once and a host's manual choice holds until the sheet
  changes. Actions: `{ type: 'music', do: 'play'|'pause', playlist, name,
  volume, why }`, `{ type: 'scene', name, why }`, `{ type: 'projector', do:
  'on'|'off', why }`, `{ type: 'cake', ... }`; `why` 'sheet', 'host', 'study'
  or 'cake'. `sceneNames` collects every scene name (the layers, the drawing
  and its unlocked part, the study's two, the cake's); `playlistNamesOf` the
  distinct Music playlist names (five settings on three playlists).
- Host buttons on `public/cues`: `scene: { name, at }` (trimmed, 1-64 chars)
  and `music: { command: 'play'|'pause'|'next', at }`, each obeyed once per
  `value@stamp` and only within `SOUND_STALE_MS`; `next` cycles the
  `playlists` keys from `state.playlist` (the last one the relay put on);
  `play` resumes that one (or the sheet's, or the first). Neither changes
  `state.music`/`state.hue`. `cake: { at }` is the Cake! button (step 4 of the
  25 Oct handoff writes it, merge, from the `cake` command).

The beat keys mapped are the night's after the 25 Oct build (Act 1 arrive,
rules, meet, introduce, ready; Act 2 orient, news, peek, cat, supper; Act 3
down, bulletin, wrap; Act 4 warn, groups, round1-5; Act 5 roam, irwin,
update; Act 6 games, drawing, door, eliminate; Act 7 ballot, reveal, result,
end). Beat entries: `1/rules`, `2/news`, `6/drawing`, `6/door`,
`6/eliminate`, `7/reveal` (hue only), `7/result` (music only), `7/end`
(music off, hue null, projector off); every other beat takes its act's
values. `acts.7.music` is intense60, so the ballot and the reveal carry on
the door's music.

**Music** (`lib/music.js`): `osascript` with one `-e` per line and the
arguments in argv (never pasted into the script). `SCRIPTS.play` takes the
volume then the name and `playlistNames` spellings (`·` as ` - `, ` – `,
`: `, a space); it returns `missing`, `already` (that playlist is playing:
left alone, at the new volume, logged "name, volume v": jazz 55 to 30,
intense 35 to 60 are this), `resumed` (paused on it) or `playing` (shuffle
enabled, song repeat all, `play playlist`). `SCRIPTS.track` (Cake!) takes
the volume and the song's exact name: `first track whose name is`, shuffle
off, repeat off, `play`; returns `missing` or `playing`; `playTrack` resolves
'playing' | 'missing' | 'failed' and sets the unduck volume to the song's.
`SCRIPTS.nowPlaying` returns "stopped" or "playing⇥<current track name>";
`nowPlaying()` → `{ playing, track }` or null when Music cannot be read.
`followTrack({ name, seconds, started, nowPlaying, log, timers, now })`
resolves `{ why: 'ended' | 'timer' }`: it polls every `TRACK_POLL_MS` (1 s)
and ends when Music has stopped or moved to another track, never before
`TRACK_MIN_MS` (3 s); null from `nowPlaying` logs one line and leaves it to
the `seconds` timer, as does `started !== 'playing'`. In `cues.mjs`
`serveCake` runs `playTrack`, then `followTrack` (fake mode: 2 s), then
`sceneState = afterCake(sceneState); apply()`; a second press supersedes the
first (`cakeSeq`). `pause` never launches Music; `fade` steps Music's `sound
volume` (8 steps down, 20 up, 30 ms apart). Commands run on one promise
chain, in order; a failure is `musicProblem` in words (-1743 → the
Automation setting), the same line at most once a minute. `duck()`/`unduck()`
flip `ducked` synchronously and queue a fade; a `play` while ducked starts at
`min(whisper, volume)`; `unduck` returns to the last playlist's (or song's)
volume. In `apply`, `ducksFor(action)` (a sound with an id or clips) ducks
before `player.play`, and the player's per-cue `onDone` (never called for a
cue a newer one cut off) schedules the unduck after `unduckDelayMs`:
`DUCK_TAIL_MS` (800 ms), or for a `video` chime until `videoHoldSeconds`
after it began (0 on the sheet since 25 Oct: the news beat stops the music
itself and the cut handles the newscast). The AppleScripts compile with
`osacompile` against Music's dictionary (the play, pause and fade scripts
checked 24 Oct; the track and nowPlaying scripts are new on 25 Oct and
untried against Jon's library).

**Hue scenes** (`lib/hue.js`): `scenes()` is `GET /clip/v2/resource/scene`;
`recallScene(name)` PUTs `{ recall: { action: 'active' } }` to every scene
whose name matches (`sameSceneName`: trimmed, spaces collapsed, any case)
and returns the count (0 is logged as "no scene called …"). One retry after
3 s on an error, unless a newer scene was asked for. `places()` reads rooms
and zones for `--scenes`. The hall bulb's red/green/off (`setLight`, re-sent
every 5 s) is untouched by scenes; Jon keeps it out of every scene.

**The projector** (`lib/strings.js`): `PROJECTOR_SHORTCUTS = { on:
'Projector Murderwin On', off: 'Projector Murderwin Off' }`,
`projectorShortcutNames(env)` (overrides `PROJECTOR_SHORTCUT_ON` / `_OFF`),
`createProjectorSwitch({ enabled, names, run = runShortcut, log, fake })` with
`set('on'|'off')` running the Shortcut on one promise chain (one plain line
on failure: "switch the plug in the Home app"); not enabled or fake: "would
switch the projector on/off". `cues.mjs` enables it on
`PROJECTOR_SHORTCUTS=on` (not in fake mode) and performs the planner's
`projector` actions; `--check-projector` runs off, 5 s, on.

**String lights** (`lib/strings.js`): `public/salem` is
`{ state: 'idle'|'intro'|'playing'|'passed'|'cleared', round, flips: [{ at, colour }], endsAt, groupId }`.
`stringsColour(salem, now)`: while `playing` and before `endsAt`, the colour
of the latest flip with `at <= now` (red or green; a flip with no time or
another colour is ignored), else `decor`. The relay checks every 100 ms and
also sets a timer for `nextChangeAt` (the next flip or the end), so a change
lands on its timestamp. Through Apple Home (`STRINGS_SHORTCUTS=on`):
`ShortcutLights.show({ shortcut })` runs `shortcuts run <name>` with stdin
closed (`runShortcut`), names from `STRING_SHORTCUTS` or `STRINGS_SHORTCUT_*`
in `.env`. Paired (`NANOLEAF_STRINGS_HOST`/`_TOKEN`, not the way we use):
`StringLights.show` is one `PUT http://<host>:16021/api/v1/<token>/state`
with `{ on, hue, sat, brightness: { value, duration: 0 } }` from `scenes.json`
`strings` (`DEFAULT_STRING_COLOURS` when the file is broken).
`createStringsMirror` sends only changes, one request at a time with the
newest colour winning; on a failure it forgets what is shown, logs once,
retries on the next change or after `RETRY_MS` (15 s), and logs once when
they answer again.

**Sounds** (`lib/cues.js`, `lib/player.js`): `SOUND_IDS` (nine since 25 Oct:
no 'power') mirrors `functions/lib/screen.js`; `REQUIRED_SOUND_IDS =
['chime-phone', 'blackout']`; `CHIME_FALLBACK = { 'chime-news': 'chime-phone',
'chime-irwin': 'chime-phone', 'sounder-bulletin': 'chime-phone' }`;
`OPTIONAL_SOUND_IDS` the four stings. `soundFileFor(dir, id, exists)` → `{
file, fallback }` or null (the player uses it; `playLine` says "sound playing
(the one chime stands in)" for a fallback, "sound file missing; skipped" for
a silent sting). `soundFileReport(dir, exists)` → `{ required, chimes,
optional, total }` and `soundFilesLines(report)` the count-only start-up
lines; `cues.mjs` exits 2 before the sign-in only when `required` is not
empty (fake mode carries on), and prints the lines at start. `CLIP_IDS` from
`functions/lib/news.js`, also mirrored and tested. The clips arrive as codes
keyed on the station key (as names on a night with no key saved); the relay
derives each file's code from `STATION_KEY` and plays the matches, skipping
the rest with a count. The player keeps the running `afplay` and kills it
when a newer cue arrives. The log names no sound id, clip, code or file: one
`playLine` per cue, counts only (tests read `cues.mjs` to check).
`scripts/make-placeholder-sounds.mjs` writes a 22 kHz mono WAV per id (all
nine), one second of silence then a distinct figure (`FIGURES`), counts-only
output.

**Flags.** `--lights`, `--scenes` (list, then `found`/`MISSING` per
`sceneNames(sheet)`), `--scene "<name>"`, `--check-music` (each distinct
playlist, the dip, the song), `--check-strings`, `--check-projector` (each
skips the sound-file check and quits), `--fake`, `--offline`, `--demo` (the
`lib/demo.js` night, 3 s a step on hardware, 300 ms with `--fake`,
`DEMO_STEP_MS` overrides). `scenes.json` is validated at start by
`sceneProblems` (plain words, never a sound id; it checks the `projector`
values, `cut`, `study`, `cake`, `drawing.unlocked`, and names a leftover
`offForTheNight`); any problem turns music, scenes and the projector off for
the run and logs one line. Fake keys: `r`, `g`, `o` (phase blackout → the
bulb off), `s`, `c` (Cake!), `n`.

**Docs it reads** (writers in the functions):
- `nights/{id}` `{ act, beat, phase, pausedFrom }`: `night.js`, `run.enterBeat`.
- `nights/{id}/public/cues` `{ hall: 'red'|'green', changedAt, scene?: { name, at }, music?: { command, at }, cake?: { at } }`:
  the hall from `deal.ensureHall` (green at Act 1's first beat, written only
  while nothing has set it), `deal.setHall` (red at the power's return, from
  the Blackout command's own return and from the act jump that deals the
  roles), `deal.revealTrace` (green) and `relay.reset` (red); the brain alone
  turns the bulb off, from the blackout phase. `scene`, `music` and `cake`
  are the Host tab's buttons (`run.js` 'scene', 'music' and 'cake'): a fresh
  `cake.at` plays the song, recalls Murderwin Candles, and when the song ends
  puts the moment's playlist and scene back.
- `nights/{id}/public/relay` `{ state, doorOpen }`: the drawing.
- `nights/{id}/public/sounds` `{ current: { id | null, at, clips?, video? } }`:
  written by `screen.play` (functions/lib/screen.js): a beat's `sound` from
  `seed/night.json` in `run.enterBeat` (with bulletin 1's clips), bulletin 2
  from `screen.tickBulletin`, the blackout command (the power's return plays
  nothing since 25 Oct), the sound test, the study finish (`sting-solved`),
  `relay.guess` in the drawing's done transaction (`sting-door`), and
  `finale.stage` with `id` null and the closing bulletin's clips.
- `nights/{id}/public/salem`: Salem's Motion Game (the server schedules the
  flips).
- `nights/{id}/public/study` `{ state }`: the study station's state
  (`station.js` STATION_STATES: idle, playing, reproducing, entering, done;
  'absent' is the server's own).

Tests: `npm --prefix cues test` (`cues.test.mjs`: the planner, the bulb's
three states, the nine sounds and the two required, the chime fallback and
the start-up counts, video, the Hue lights and scenes, the file lookup, the
clip codes, the player and its done callback, the count-only log;
`scenes.test.mjs`: the whole cue sheet moment by moment (cues 1 to 23), the
drawing and the unlock, the cut, the dim study, Cake!, the host buttons, a
broken `scenes.json`, the duck timing, the demo night; `music.test.mjs`: the
osascript wrapper with a stand-in, the track play, nowPlaying, followTrack
on a hand-moved clock; `strings.test.mjs`: the colour by timestamp, the Open
API request, the mirror's failures, the Shortcuts, the projector switch).
Fake mode: `npm run fake`; no Firebase: `npm run demo`.
