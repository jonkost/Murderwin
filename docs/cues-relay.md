# The cue relay (the brain)

A small program that runs on the brain (Jon's M3 MacBook Air) all night. It
watches the same public night state the phones watch and does a few dumb
things: it turns the bulb outside the bedroom red or green, plays a sound
file when a sound is called for, runs Apple Music, switches the Hue lights
to the right scene, and mirrors Salem's game on the Orangerie string lights.
It never knows what any of it means. Written 17 October 2026, brought up to
date 24 October 2026 (music, Hue scenes, the string lights, the tenth sound,
video), and that evening with what was tried on the real hardware (the hall
bulb, the string lights' setting names and their button).

**Where it comes from:** `CLAUDE.md` (Hardware, and the client rule "sound
files are named after the event ID so the relay performs no logic and stays
blind"), the 23 October handoff (section 2: sound, music and lights, and the
cue sheet in 2d), and `docs/relay-drawing-game.md` (the door).

## What it does

- **The hall light.** From the moment Act 1 begins the bulb outside the bedroom
  is red. The moment the third drawing is named in Act 6, it turns green. If
  the bulb never turns, the Parlour TV says "the door is open" anyway, so the
  game never depends on it. The bulb is in no Hue scene, so a scene never
  changes it.
- **Sounds.** When the night asks for a sound, the relay plays the file with
  that name from the `media` folder, through whatever the Mac's sound is
  pointed at (the AirPlay group). There are ten, listed in `media/README.md`
  with the moment each one plays: `chime-news`, `sounder-bulletin`,
  `chime-irwin`, `sting-solved`, `sting-door`, `sting-reveal`, `sting-result`,
  `blackout`, `power` and `chime-phone` (every "look at your phone" moment).
  A file is named after its id and nothing else: `chime-news.m4a`. Every file
  starts with one second of silence (the pad rule) so the speakers have woken
  up before the sound begins. The relay refuses to start while any of the
  ten has no file, and says how many; until you have recorded them,
  `node scripts/make-placeholder-sounds.mjs` writes a stand-in tone for each.
  An id it does not know is refused and counted, never played.
- **W-O-O-F News recordings ride on top.** A bulletin's sound is followed by
  its recorded lines, one after another. The closing bulletin's parts play
  each time you press a name in Act 7. A newer sound cuts off the recording
  that is playing, so two never talk over each other. A recording with no
  file yet is skipped and never stops the relay starting; the words are on
  the screen anyway. The recordings arrive under codes, not names, and the
  relay matches them to your files with the study's key word (`STATION_KEY`
  in `cues/.env`). Bulletin 2 plays during supper, so keep the Orangerie
  HomePod in the speaker group. How to name the files: `media/README.md`.
- **Video.** When the Parlour TV plays bulletin 1 or the closing bulletin as
  video, with its own sound, the brain rings the chime but does not play
  those recordings, so you never hear them twice. Bulletin 2 is always sound
  on the HomePods.
- **Music.** Apple Music on the brain plays into the same speakers as the
  cues. There are three playlists, and the brain picks one as the night
  moves (the table below). It plays them on shuffle and repeat. Whenever a
  cue sound or a recording plays, the music dips to a whisper and comes back
  after (bulletin 2 plays over the dipped music, it never cuts it). When
  bulletin 1 plays as video on the TV, the music stays down for a minute and
  a half after the chime, while the video plays. The music stops at the
  blackout, stops while the Relay
  Drawing runs until the door opens, and stops for the rest of the night at
  the reveal.
- **Hue scenes.** You make four scenes in the Hue app; the brain switches to
  the right one as the night moves (the table below).
- **The Orangerie string lights.** During Salem's Motion Game the strings
  turn red and green exactly when the phones do. The rest of the night they
  are a soft warm colour. If the strings do not answer, the brain says so
  once and carries on: every phone in the group tints its whole screen the
  same colour, so the game never waits on the lights.

### When the music and the lights change

| Moment | Music | Lights (Hue scene) |
|---|---|---|
| You start the night (Act 1) | Arrival | Murderwin Arrival |
| Blackout | stops | Murderwin Blackout |
| Power returns (Act 2) | Investigation | Murderwin Lights Out |
| News flash, cat visits | Investigation (dips under the chime) | no change |
| Supper is served (the supper chime) | Supper | no change |
| Act 3, bulletin 2 | Supper (dips under the sounder) | no change |
| The two-minute warning (Act 4) | Supper | no change |
| Start Act 4 (the group cards) and every round | Investigation | no change |
| Act 5 (dessert, Sir Irwin) | Arrival | Murderwin Arrival |
| Act 6 opens | Investigation | Murderwin Lights Out |
| The Relay Drawing starts | stops | no change |
| The door opens | Investigation again | no change (the hall bulb turns green) |
| The ballot (Act 7) | Investigation | no change |
| The reveal, and everyone's result | off for the night | Murderwin Reveal |

The brain only acts when the answer changes. Pressing Next inside an act
changes nothing unless the table says so. If you change the music or a
scene by hand (the Music app, the Hue app, or a Host tab button), your
choice holds until the next row that changes it. If the brain is restarted
in the middle of the night, it puts the right music and scene back once.

This table lives in `cues/scenes.json`, a plain settings file with nothing
secret in it. To change what plays when, or a playlist's volume, change that
file (or ask Claude Code to) and restart the relay. If the file has a
mistake in it, the relay says so in one line and runs without music and
scenes; the hall light and the sounds carry on.

### Your buttons

- **A scene by hand.** The Host tab can ask for any scene by name; the brain
  switches to it at once.
- **Music by hand (if the Host tab has the Music row):** play, pause, next
  playlist. Until then, use the Music app on the brain.
- The Host tab can still set the hall light red or green by hand, under
  *The house*.

## What it prints

It reads only public documents, the same ones any phone may read. It never
calls the server, never sees a clue, and never prints anything but the hall
colour, the scene and playlist names, and counts ("sound playing; bulletin: 3
recordings, 1 missing"). It never prints the name of a sound, a recording or
a file. Once a minute it writes one small heartbeat (the same row every phone
writes), so the Host tab's house panel can show it alive. When it starts it
prints one line saying what is on: "music: on · Hue scenes: on · string
lights: on".

## Setting it up (once, on the hardware evening)

Do these on the brain, in a Terminal window, in the Murderwin folder. (Or
ask Claude Code to do the typing; the clicks in the Hue, Nanoleaf, Music
and Home apps are yours.)

**Where it stands, 24 October 2026.**
- The Hue bridge is paired with the brain (step 1), and the hall bulb went
  red and green from the brain. The hall bulb shows as *Master bedroom* in
  the Hue app and as *Jonny's light* in Apple's Home app. Neither name
  matters to the brain, which finds the bulb by its id (step 4); what
  matters is that the bulb stays out of the zone the four scenes use
  (step 8).
- The string lights run through Apple Home (25 October), not by pairing:
  three Home scenes and three Shortcuts on the brain (step 13). Red and the
  warm decor colour work, each in 1 to 2 seconds; the green Shortcut is being
  rebuilt. At 1 to 2 seconds behind, the strings are decoration in Salem's
  game: the phones change colour on time and carry it.
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

**The music**

5. **Make the three playlists** in the Music app on the brain, named exactly:
   - `Murderwin · Arrival`: period jazz and big band, upbeat (Acts 1 and 5).
   - `Murderwin · Investigation`: lower, moodier (Acts 2, 4 and 6).
   - `Murderwin · Supper`: dinner jazz (supper and Act 3).

   The dot in the middle is Option-Shift-9 on a Mac keyboard. If that is a
   bother, a plain hyphen works too: `Murderwin - Arrival`. You do not need
   to set shuffle or repeat; the brain does.
6. **The one permission click.** Run `npm start -- --check-music`. The first
   time, the Mac asks whether Terminal may control Music: click **OK**. You
   should then hear six seconds of each playlist, a dip to a whisper, the
   music coming back, and then it stops. If you clicked Don't Allow by
   mistake: System Settings, Privacy & Security, Automation, Terminal, and
   tick Music. If the music comes out of the Mac and not the HomePods, click
   the AirPlay button in the Music window and tick the same HomePods.
7. **Levels.** Each playlist's loudness is Music's own volume, set in
   `cues/scenes.json` (`volume`: Arrival 70, Investigation 40, Supper 55 out
   of 100), and so is the whisper under a cue (`whisper`: 10). Leave the
   Music app's own slider alone: the brain sets it. Set each HomePod's volume
   in the Home app and the brain's output volume once, then tune these
   numbers by ear.

**The Hue scenes**

8. **Give the hall bulb a room of its own** in the Hue app (call it Hall),
   and keep it out of every zone the other lights are in. That way no scene
   ever touches its red and green.
9. **Make a zone with every other Hue light** (in the Hue app, a zone is a
   group of rooms; call it Murderwin house).
10. **Make four scenes in that zone**, named exactly:
    - `Murderwin Arrival`: warm, normal brightness.
    - `Murderwin Blackout`: every light off.
    - `Murderwin Lights Out`: dim amber, low.
    - `Murderwin Reveal`: bright and warm.

    If you would rather make scenes room by room, give the scene the same
    name in each room: the brain switches every scene with that name at
    once. If the Hue app will not save a scene with the lights off, make
    Murderwin Blackout with every light at its lowest and tell Claude Code.
11. **Check them.** `npm start -- --scenes` lists every scene on the bridge
    and then says `found` or `MISSING` against each of the four. Try one
    with `npm start -- --scene "Murderwin Lights Out"`.

**The Orangerie string lights**

12. **Put the strings on the home Wi-Fi and in Apple Home.** Add them in the
    Home app (Matter). That puts them on the home Wi-Fi.
13. **Three Home scenes and three Shortcuts** (the way we use, 25 October).
    In the Home app, make three scenes with only the Holiday Lights in them:
    red at full brightness, green at full brightness, and a soft warm glow.
    In Shortcuts, make three shortcuts that each run one scene, named
    exactly *Red Murderwin Strings*, *Green Murderwin Strings* and *Decor
    Murderwin Strings*. They sync to the brain through iCloud. In
    `cues/.env`, `STRINGS_SHORTCUTS=on`. Apple Home takes 1 to 2 seconds, so
    in Salem's game the phones lead and the strings follow.
    **Not this way:** pairing straight to the strings. Holding their button
    resets their Wi-Fi (24 October), and they never opened pairing. The code
    for it stays (`NANOLEAF_STRINGS_HOST` and `NANOLEAF_STRINGS_TOKEN`, which
    win over the Shortcuts if both are set).
14. **Check them.** `npm start -- --check-strings` turns them red, green,
    then the warm colour. If one never changes, open its Shortcut and check it
    runs the right scene. If none answer, leave `STRINGS_SHORTCUTS` empty:
    the strings are decoration, and the phones carry the colour.

**All of it at once**

15. **A pretend night.** `npm start -- --demo` walks through every move the
    brain makes, in about a minute and a half, on the real bulb, speakers,
    Music, scenes and strings (it does not touch the game). Watch and listen:
    the bulb red, Arrival, the blackout, Investigation, the supper music,
    the strings flicking red and green, Arrival again, the music stopping for
    the drawing, the bulb green, the reveal scene. `npm run demo` does the
    same with no hardware at all and only prints.
16. **Run it.** `npm start`. Leave it running. It finds the live night on its
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
| `MUSIC` | `on`, or `off` to leave the music to you and the Music app. |
| `HUE_SCENES` | `on`, or `off` to leave the scenes to the Hue app on your phone. |
| `NANOLEAF_STRINGS_HOST` | The Orangerie string lights' address. Empty: the strings are decoration. Spelled with STRINGS: no other spelling is read. |
| `NANOLEAF_STRINGS_TOKEN` | The token from step 13. |

After changing any of them, stop the relay (Control-C) and start it again.

## On the day

- [ ] The Mac is on mains power, sleep off, ethernet in (if the cable will
      not link, as on 24 October, Wi-Fi works too).
- [ ] `npm start` in `cues/` is running in a terminal window you can see.
      Its first lines say "music: on · Hue scenes: on · string lights: on"
      (or "not set up" for the strings if they are decoration).
- [ ] Start the night from the Host tab: the log says `[hall] red`,
      `[lights] Murderwin Arrival` and `[music] Murderwin · Arrival`, and the
      house agrees. If it says `failed … retrying`, check the bridge address.
- [ ] All ten sound files are in `media/` (the relay will not start without
      them) and the Mac's output is the right speaker group. Play one with
      `afplay media/chime-news.m4a` (or `.wav` for a stand-in) to check.
- [ ] The Orangerie HomePod is in that speaker group (bulletin 2 plays there
      during supper). Play `afplay media/sounder-bulletin.wav` (or `.m4a`)
      and listen in the orangery.
- [ ] `STATION_KEY` in `cues/.env` is the same word as the study's. When
      the relay starts, its window says "STATION_KEY set".
- [ ] The Parlour screen shows a small bell in the corner for three seconds
      whenever a sound is called for. If you see the bell and hear nothing,
      the relay or the speakers are the problem, not the night.

## If it fails

Nothing in the game waits on the relay.

- **The hall bulb** stays whatever colour it was. The TV announces the open
  door, the phones say "the light in the hall is green" regardless, and the
  bedroom screen shows the trace.
- **A sound.** The Parlour screen rings its own small chime and shows the
  bell for every cue, so a dead relay costs the room the big speakers, not
  the moment.
- **The music.** Use the Music app on the brain by hand. If the brain keeps
  doing something you do not want, put `MUSIC=off` in `cues/.env` and
  restart it. A problem (no permission yet, a playlist missing) is one plain
  line in the window, never a stop.
- **A scene.** Tap it in the Hue app on your phone. `HUE_SCENES=off` stops
  the brain switching them.
- **The string lights.** The phones carry the colour on their own.

`npm run fake` runs the relay on the live night without any hardware and
prints what it would have done; press `r`, `g`, `s` or `n` to try it (`s`
steps through the ten sounds, `n` through a pretend night). `npm run demo`
needs nothing at all.

---

## For Claude Code (technical)

**Watches.** `cues/cues.mjs` signs in anonymously with the public web config,
watches `public_state/active`, then for that night `nights/{id}` (the night
doc: `act` 0-7, `beat`, `phase` 'lobby'|'act'|'blackout'|'prompt'|'paused',
`pausedFrom`) and `nights/{id}/public/cues`, `public/relay`, `public/sounds`,
`public/salem`. All readable by any signed-in phone (firestore.rules).
`--offline` (and `--demo`) skip Firebase entirely: no sign-in, no heartbeat.

**Two pure planners, one apply.** `apply()` runs both on every snapshot:
- `lib/cues.js` `plan(prevState, docs, now, { readClip })` → `{ actions, state }`
  for the hall and the sounds, idempotent on a reload (state remembers the
  last hall colour and the last `id@stamp` sound; a sound stamped more than
  `SOUND_STALE_MS` = 30 s ago is remembered but not played). `hallColour`
  treats `relay.doorOpen` as green even without a cues doc. A sound with
  `video: true` becomes `{ type: 'sound', id, video: true, onTv: n }` (the id
  plays, the clips never do) and a clips-only one `{ type: 'video', count }`
  (plays nothing, no duck); an unknown id is refused either way.
- `lib/scenes.js` `planScenes(prev, docs, now, sheet)` → `{ actions, state }`
  for Music and the Hue scenes, from `cues/scenes.json`. `targetFor` resolves
  `{ music, hue }` for the moment: phase layer (`phases.blackout`,
  `phases.prompt`) over the beat (`acts[n].beats[key]`) over the act
  (`acts[n]`); a key missing from a layer falls through, `null` means leave
  it. A paused night resolves as `pausedFrom`. The drawing overlay
  (`drawing.acts`, default [6]) sets `drawing.music` while
  `relay.state` ∈ intro, walk, turn, vote, lockout and the door is not open
  (`relay.doorOpen` or `cues.hall === 'green'`). `offForTheNight` turns the
  music off for the rest of its acts once `sounds.current.id` is that sound
  (`sting-reveal`; sticky in state while the act stays in the list, so Back
  to the ballot keeps it off, a rehearsal jump to Act 1 does not).
  Edge-triggered: an action only when the resolved value differs from the
  last one acted on (`state.music`, `state.hue`), so a restart re-applies
  once and a host's manual choice holds until the sheet changes. Actions:
  `{ type: 'music', do: 'play'|'pause', playlist, name, volume, why }`,
  `{ type: 'scene', name, why }`, `why` 'sheet' or 'host'.
- Host buttons on `public/cues`: `scene: { name, at }` (trimmed, 1-64 chars)
  and `music: { command: 'play'|'pause'|'next', at }`, each obeyed once per
  `value@stamp` and only within `SOUND_STALE_MS`; `next` cycles the
  `playlists` keys from `state.playlist` (the last one the relay put on);
  `play` resumes that one (or the sheet's, or the first). Neither changes
  `state.music`/`state.hue`.

The beat keys mapped are the rebuilt night's (Act 1 arrive, meet, introduce,
ready; Act 2 orient, news, peek, cat, supper; Act 3 down, bulletin; Act 4
warn, groups, round1-5; Act 5 roam, irwin; Act 6 games, drawing, door,
eliminate; Act 7 ballot, reveal, result). Only `2/supper`, `4/warn`,
`7/reveal` and `7/result` have beat entries; every other beat, including the
older seed's keys (checkin, station1-5), takes its act's values.

**Music** (`lib/music.js`): `osascript` with one `-e` per line and the
arguments in argv (never pasted into the script). `SCRIPTS.play` takes the
volume then the name and `playlistNames` spellings (`·` as ` - `, ` – `,
`: `, a space); it returns `missing`, `already` (that playlist is playing:
left alone), `resumed` (paused on it) or `playing` (shuffle enabled, song
repeat all, `play playlist`). `pause` never launches Music; `fade` steps
Music's `sound volume` (8 steps down, 20 up, 30 ms apart). Commands run on
one promise chain, in order; a failure is `musicProblem` in words
(-1743 → the Automation setting), the same line at most once a minute.
`duck()`/`unduck()` flip `ducked` synchronously and queue a fade; a `play`
while ducked starts at `min(whisper, volume)`; `unduck` returns to the last
playlist's volume. In `apply`, `ducksFor(action)` (a sound with an id or
clips) ducks before `player.play`, and the player's per-cue `onDone` (never
called for a cue a newer one cut off) schedules the unduck after
`unduckDelayMs`: `DUCK_TAIL_MS` (800 ms), or for a `video` chime until
`videoHoldSeconds` (90) after it began. The AppleScripts compile with
`osacompile` against Music's dictionary (checked 24 Oct); they have not yet
run against Jon's playlists.

**Hue scenes** (`lib/hue.js`): `scenes()` is `GET /clip/v2/resource/scene`;
`recallScene(name)` PUTs `{ recall: { action: 'active' } }` to every scene
whose name matches (`sameSceneName`: trimmed, spaces collapsed, any case)
and returns the count (0 is logged as "no scene called …"). One retry after
3 s on an error, unless a newer scene was asked for. `places()` reads rooms
and zones for `--scenes`. The hall bulb's red/green (`setLight`, re-sent
every 5 s) is untouched; Jon keeps it out of every scene.

**String lights** (`lib/strings.js`): `public/salem` is
`{ state: 'idle'|'intro'|'playing'|'passed'|'cleared', round, flips: [{ at, colour }], endsAt, groupId }`.
`stringsColour(salem, now)`: while `playing` and before `endsAt`, the colour
of the latest flip with `at <= now` (red or green; a flip with no time or
another colour is ignored), else `decor`. The relay checks every 100 ms and
also sets a timer for `nextChangeAt` (the next flip or the end), so a change
lands on its timestamp (the brain's clock is NTP; the server's timestamps
are used as they are). `StringLights.show` is one
`PUT http://<host>:16021/api/v1/<token>/state` with
`{ on, hue, sat, brightness: { value, duration: 0 } }` from `scenes.json`
`strings` (`DEFAULT_STRING_COLOURS` when the file is broken).
`createStringsMirror` sends only changes, one request at a time with the
newest colour winning; on a failure it forgets what is shown, logs once,
retries on the next change or after `RETRY_MS` (15 s), and logs once when
they answer again. Untested on the real strings: whether the Holiday String
Lights expose the Open API on 16021 is the hardware evening's first check.

**Flags.** `--lights`, `--scenes` (list, then `found`/`MISSING` per
`sceneNames(sheet)`), `--scene "<name>"`, `--check-music`, `--check-strings`
(each skips the sound-file check and quits), `--fake`, `--offline`, `--demo`
(the `lib/demo.js` night, 3 s a step on hardware, 300 ms with `--fake`,
`DEMO_STEP_MS` overrides). `scenes.json` is validated at start by
`sceneProblems` (plain words, never a sound id); any problem turns music and
scenes off for the run and logs one line.

**Docs it reads** (writers in the functions):
- `nights/{id}` `{ act, beat, phase, pausedFrom }`: `night.js`, `run.enterBeat`.
- `nights/{id}/public/cues` `{ hall: 'red'|'green', changedAt, scene?, music? }`:
  the hall from `deal.ensureHallRed` (Act 1) and `deal.revealTrace` (the
  drawing done); `scene` and `music` from the Host tab's buttons.
- `nights/{id}/public/relay` `{ state, doorOpen }`: the drawing.
- `nights/{id}/public/sounds` `{ current: { id | null, at, clips?, video? } }`:
  written by `screen.play` (functions/lib/screen.js): a beat's `sound` from
  `seed/night.json` in `run.enterBeat` (with bulletin 1's clips), bulletin 2
  from `screen.tickBulletin`, the blackout and power commands, the study
  finish (`sting-solved`), `relay.guess` in the drawing's done transaction
  (`sting-door`), and `finale.stage` with `id` null and the closing
  bulletin's clips. `chime-phone` is in the catalogue on both sides; which
  beats ring it (handoff 2d, check F27) is the engine's job.
- `nights/{id}/public/salem`: Salem's Motion Game (the server schedules the
  flips).

`lib/cues.js` mirrors two lists, each checked by tests on both sides:
`SOUND_IDS` from `functions/lib/screen.js` and `CLIP_IDS` from
`functions/lib/news.js`. The clips arrive as codes keyed on the station key
(as names on a night with no key saved); the relay derives each file's code
from `STATION_KEY` and plays the matches, skipping the rest with a count.
`lib/player.js` keeps the running `afplay` and kills it when a newer cue
arrives. The log names no sound id, clip, code or file: one `playLine` per
cue, counts only (tests read `cues.mjs` to check). `missingSoundFiles(dir,
exists)` checks the ten cue sounds before the sign-in and exits 2 on any
missing one, printing the count only (fake mode warns and carries on);
missing clips never stop it. `scripts/make-placeholder-sounds.mjs` writes a
22 kHz mono WAV per id, one second of silence then a distinct figure
(`FIGURES`), counts-only output.

Tests: `npm --prefix cues test` (`cues.test.mjs`: the planner, video, the
Hue lights and scenes, the file lookup, the clip codes, the player and its
done callback, the count-only log; `scenes.test.mjs`: the whole cue sheet
moment by moment, the drawing, the reveal, the host buttons, a broken
`scenes.json`, the duck timing, the demo night; `music.test.mjs`: the
osascript wrapper with a stand-in; `strings.test.mjs`: the colour by
timestamp, the Open API request, the mirror's failures). Fake mode:
`npm run fake`; no Firebase: `npm run demo`.
