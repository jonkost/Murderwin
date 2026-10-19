# The room screens

What the living room TV, the iPad, the bedroom screen and the study screen
show at every beat of the night, and the sound that goes with it. Written
18 October 2026. Everything on this page is safe to read: no screen ever
shows who did it, who died, which motive is live, or which way the hidden
pair have pulled.

## Where each screen lives

| Address | Screen | What it does |
|---|---|---|
| `?kiosk=living` | The living room TV | Everything below. The drawing, the ballot clock and the reveal were already there. |
| `?kiosk=ipad` | The iPad, on a stand in the orangery | The words of the news and the bulletin only, kept up through dinner for anyone who missed the TV. It also shows the drawing. |
| `?kiosk=bedroom` | The bedroom screen | The door, closed until the third drawing is named, then the trace. |
| `?kiosk=study` | The study screen on the M1 Air | Granolia and the light puzzle. |

Every screen is dark from the blackout until the first beat of Act 2, and
near-black with "One moment" while the night is paused.

## What the TV shows, beat by beat

- *Act 1.* The act name, nothing else.
- *Act 2, the news flash.* One news line: a frame from your News frames list
  with its gap filled by the night's secret fragment. The phones say "eyes
  up". The TV goes back to its crest at the next beat; the iPad keeps the
  words up.
- *Act 3, the bulletin.* The same news line again, and then up to two
  motives "the constable has ruled out", with a line through each. How many
  depends on how the night has gone so far: none, one or two. Never the live
  motive. The words stay up on the iPad through dinner.
- *Act 5, Sir Irwin.* His opener from the Openers list, one short line about
  the night, and his closer. Every line is twelve words at most and names
  nobody. Which of his three lines he picks depends on how the night has
  gone, from the least telling to the most.
- *Act 6, the drawing.* As before. On the first walk the three rules of the
  drawing show above the first drawer's name (write yours as RELAY RULES in
  the phone's own little lines, split with |).
- *Act 6, the door.* "The door is open" for ten seconds. If the bedroom
  screen has died, press **Show the trace on the TV** on the Host tab: after
  the ten seconds the TV shows the trace, the same as the bedroom would.
- *Act 6, the deduction round, and the Act 7 ballot.* The board: every
  character at the party with the thing they struck out beneath. A phone
  that chose nothing gets a strike picked for it, and the board shows it the
  same way as everyone else's.
- *Act 7.* The reveal, as before.

## The three corners of every screen

- *Tap once to wake.* A small note in the bottom right corner. Browsers will
  not play a sound until someone has touched the page; one tap anywhere on
  the page (or any key), then leave it. It never covers the screen, and it
  does not show while the room is dark, so a screen that reloads during the
  blackout stays black.
- *The bell.* Top right, for three seconds, whenever a sound is called for.
  The screen rings a small chime of its own at the same moment. If you see
  the bell and hear nothing from the speakers, the brain or the speakers are
  the trouble, not the night.
- *The dot.* Bottom left. Green while the screen can hear the house; amber,
  with how long since it last heard, when it has gone quiet for twenty
  seconds; red when it is off the wifi. Nothing on the screen ever covers
  the content.

## The sounds

Nine sounds, one file each in `media/` (`media/README.md` lists them and the
one-second-of-silence rule). The brain plays them through the speakers. Until
you have recorded them, `node scripts/make-placeholder-sounds.mjs` makes a
different little tone for each.

---

## For Claude Code (technical)

`functions/lib/screen.js` writes two public docs any phone may read:

- `nights/{id}/public/screen` `{ kind, title, lines[], at, holdMs, rehearsal, act, beat, captions, struck?, parked? }`,
  kind one of `idle | black | news | bulletin | irwin | board | door | trace`.
  `run.enterBeat` calls `screen.onBeat` after the beat moves (the beat's
  `screen` and `sound` fields in `seed/night.json`); the blackout, pause and
  resume commands and the power command call `screen.onPhase` (pause parks
  the previous doc under `parked`, resume restores it). `checkScreen` refuses
  any doc carrying a key in `FORBIDDEN_SCREEN_KEYS` at any depth before it
  is written, and the night-walk test asserts the same plus the fake players'
  public-doc tokens at every step.
- `nights/{id}/public/sounds` `{ current: { id, at } }` via `screen.play`,
  ids from `SOUND_IDS` only. `sting-solved` is written by `run.studyFinished`
  on a solved outcome; `sting-door` by `relay.advance` in the done
  transition; the door beat is `soundOnce` so it does not ring twice.

The echo: `echoLines(c, frames, { seed })` picks one frame (seeded on the
night id, so a re-run shows the same one) from the night's published
`echo_frames` (falling back to the workshop list, then `DEFAULT_FRAME`) and
fills the gap with `cases.echo.fragment`. The bulletin: `struckMotives`
takes `strikeCount(dial)` motives (band 1 or 2: none, 3: one, 4 or 5: two,
`dialBand` matching `deal.traceLevel`) from the eighteen that are not
`cases.motive`, seeded on the night. Irwin: `irwinLines` takes
`cases.irwin.lines[irwinTier(dial)]` (the generator orders the three least
to most telling) between the workshop's Irwin opener and closer, every line
through `dogFilter` (roster and cast names become "someone", twelve words
at most). `tv-trace [off]` (run.js, commands.js) writes
`public/cues.tvTrace`.

`play/src/lib/screen.js` holds the pure client rules (`livingView`
precedence, `captionsOf`, `doorStage`, `boardRows`, `bellShown`, `dotState`,
`relayRules`, `showRules`), tested under node in `play/test/screen.test.mjs`;
`play/src/screens/Kiosk.jsx` renders them (`ScreenCard`, `Captions`, `Board`,
`DoorScreen`, `Dark`, `OneMoment`, `Wake`, `Bell`, `StaleDot`). The living
kiosk also subscribes to `public/content` for RELAY RULES and the character
names on the board. Previews: `?preview=kiosk-news | kiosk-bulletin |
kiosk-irwin | kiosk-black | kiosk-paused | kiosk-board | kiosk-ipad |
kiosk-living-done | kiosk-living-hold | kiosk-living-rules`.
