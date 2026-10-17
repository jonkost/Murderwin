# The cue relay

A small program that runs on the game-server Mac all night. It watches the
same public night state the phones watch and does two dumb things: it turns
the bulb outside the bedroom red or green, and it plays a sound file when a
sound is called for. It never knows what either means. Written 17 October 2026.

**Where it comes from:** `CLAUDE.md` (Hardware, and the client rule "sound
files are named after the event ID so the relay performs no logic and stays
blind"), the game design doc's "blind relay" section, and
`docs/relay-drawing-game.md` (the door).

## What it does

- **The hall light.** From the moment Act 1 begins the bulb outside the bedroom
  is red. The moment the third drawing is named in Act 6, it turns green. That
  is the whole job. If the bulb never turns, the living room TV says "the door
  is open" anyway, so the game never depends on it.
- **Sounds.** When the night asks for a sound, the relay plays the file with
  that name from the `media` folder, through whatever the Mac's sound is
  pointed at (the AirPlay group). There are nine, listed in `media/README.md`
  with the moment each one plays: `chime-news`, `sounder-bulletin`,
  `chime-irwin`, `sting-solved`, `sting-door`, `sting-reveal`, `sting-result`,
  `blackout` and `power`. A file is named after its id and nothing else:
  `chime-news.m4a`. Every file starts with one second of silence (the pad
  rule) so the speakers have woken up before the sound begins. The relay
  refuses to start while any of the nine has no file, and says which; until
  you have recorded them, `node scripts/make-placeholder-sounds.mjs` writes a
  stand-in tone for each. An id it does not know is refused and counted,
  never played.

It reads only public documents, the same ones any phone may read. It never
calls the server, never sees a clue, and never prints anything but "hall
green" or "sound 7F3A". Once a minute it writes one small heartbeat (the same
row every phone writes), so the Host tab's house panel can show it alive.
The Host tab can also set the hall light by hand, red or green, under *The
house*.

## Setting it up (once)

1. **Pair the Hue bridge.** Press the round button on the bridge, then within
   thirty seconds run, on the Mac:
   ```bash
   curl -k -X POST https://<bridge address>/api -d '{"devicetype":"murderwin#brain","generateclientkey":true}'
   ```
   Copy the long `username` from the answer. That is the application key.
2. **Fill in the settings.** Copy `cues/.env.example` to `cues/.env`. Put in
   the bridge's address and the key.
3. **Install.** In `cues/`: `npm install`.
4. **Find the hall light.** `npm start -- --lights` prints every light the
   bridge knows with its id. Put the hall bulb's id in `.env`.
5. **Run it.** `npm start`. Leave it running. It finds the live night on its own.

Give the bridge a fixed address on the router, the same as the Nanoleaf
controllers, so it is where the relay expects it on the night.

## On the day

- [ ] The Mac is on mains power, sleep off, ethernet in.
- [ ] `npm start` in `cues/` is running in a terminal window you can see.
- [ ] Start the night from the Host tab: the log says `[hall] red` and the bulb
      agrees. If it says `failed … retrying`, check the bridge address.
- [ ] All nine sound files are in `media/` (the relay will not start without
      them) and the Mac's output is the right speaker group. Play one with
      `afplay media/chime-news.m4a` (or `.wav` for a stand-in) to check.
- [ ] The living room screen shows a small bell in the corner for three
      seconds whenever a sound is called for. If you see the bell and hear
      nothing, the relay or the speakers are the problem, not the night.

## If it fails

The bulb stays whatever colour it was. The TV announces the open door, the
phones say "the light in the hall is green" regardless, and the bedroom screen
shows the trace. Nothing waits on the relay. The living room screen rings its
own small chime and shows the bell for every cue, so a dead relay costs the
room the big speakers, not the moment. `npm run fake` runs it without any
hardware and prints what it would have done; press `r`, `g` or `s` to try it
(`s` steps through the nine sounds in turn).

---

## For Claude Code (technical)

`cues/cues.mjs` signs in anonymously with the public web config, watches
`public_state/active`, then `nights/{id}/public/cues`, `public/relay` and
`public/sounds`. `lib/cues.js` is the pure planner: `plan(prevState, docs)`
returns `{ actions, state }`, idempotent on a reload (state remembers the last
hall colour and the last `id@stamp` sound; a sound stamped more than
`SOUND_STALE_MS` = 30 s ago is remembered but not played, so a relay restarted
mid-night never replays the last cue), and `hallColour` treats
`relay.doorOpen` as green even without a cues doc. `lib/hue.js` builds CLIP v2
requests (`PUT /clip/v2/resource/light/{id}` with `hue-application-key`,
body `{ on, dimming, color: { xy } }`) over `node:https` with
`rejectUnauthorized: false` for that connection only; `--lights` lists ids.
Sounds: `afplay` on the first of `<id>.m4a|mp3|wav|aiff` under `MEDIA_DIR`
(default `../media`), ids stripped to `[A-Za-z0-9_-]`. `SOUND_IDS` in
`lib/cues.js` mirrors `functions/lib/screen.js` (tests on both sides assert
equality); `plan` turns an unknown id into `{ type: 'refused', count: 1 }`,
logged as a count; `missingSoundFiles(dir, exists)` runs before the sign-in
and exits 2 on any missing id (fake mode warns and carries on).
`scripts/make-placeholder-sounds.mjs` writes a 22 kHz mono WAV per id, one
second of silence then a distinct figure (`FIGURES`), counts-only output.

Docs it reads:
- `nights/{id}/public/cues` `{ hall: 'red'|'green', changedAt }`: written by
  `deal.ensureHallRed` when a night enters Act 1 and by `deal.revealTrace`
  when the relay drawing is done.
- `nights/{id}/public/relay.doorOpen`: the relay's own flag, as a second source.
- `nights/{id}/public/sounds` `{ current: { id, at } }`: written by
  `screen.play` (functions/lib/screen.js): a beat's `sound` from
  `seed/night.json` in `run.enterBeat`, the blackout and power commands, the
  study finish (`sting-solved`) and the relay's done transition (`sting-door`,
  one line in `relay.advance`). The relay plays any id in the catalogue.

Tests: `node --test cues/test/*.test.mjs` (the planner, the Hue body and
request shape, the file lookup). Fake mode: `npm run fake`.
