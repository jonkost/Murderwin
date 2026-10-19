# On the night

Sunday 15 November 2026. Which Mac does what, the order to start things in,
how to tell each one is alive, and what to do when something dies. Everything
on this page is safe for you to read: nothing here says who did what, and
nothing you can press shows you.

Written 17 October 2026. Commands are typed like `npm test`. Buttons on your
phone's Host tab are in bold type. A test checks that every one of them exists.

## The week before

- *The secrets.* If Jenna has not yet said "done", make them: `cd scripts && npm run generate`,
  then `cd scripts && npm run validate`. Each prints counts and a PASS line and
  nothing else. Read the PASS line. Jenna reads the sets.
- *Put the game live.* `npm run deploy`. This is the one line to run whenever
  Claude says a build is done. It builds the workshop and the phone client,
  refuses to go on if either came out empty, and then publishes the site, the
  rules and the server. Nothing goes live until you run it.
- *A dry run with nobody in the room.* `npm run fake-night`. Eight fake phones
  play the whole night on stand-in text and throw it away. One line per act, a
  tally, PASS. Nothing in what it prints is a clue.
- *A rehearsal on phones.* Open the game on your phone, tap "Host? Start the
  night", type your name, and press **Next** through the evening with Susan's
  phone and a spare joined. Every night you start is a rehearsal unless the
  Game night page's "This is the party night" box is ticked. Tick it on the
  day, before you start the night; untick it after.
- *The hardware evening.* Wall, Stream Deck and bulb plugged in, one run of
  the study and one grid of the drawing. The checklists are in
  `docs/study-light-game.md` and `docs/relay-drawing-game.md`.
- *The square code.* Save it from the Game night page for the Act 1 slide.
- Charge everything. Spare phone chargers in the orangery.

## Which Mac does what

| Machine | Its job | How it starts |
|---|---|---|
| The brain (M3 Air) | The hall light and the sounds. The spare host. | Ethernet in, sleep off. `cd cues && npm start` in a terminal window you can see. |
| Living room MacBook Pro | The TV: the drawing, the ballot clock, the reveal. | A browser, full screen, at `https://murderwin-at-sirwin-manor.web.app/play/?kiosk=living` |
| Bedroom MacBook Pro | The trace behind the door. | The same address with `?kiosk=bedroom`. Door closed. |
| Study M1 Air | The light puzzle and Granolia's screen. | `cd station && npm start`, and a browser at `?kiosk=study`. Quit the Elgato app first. |
| The iPad | The words of the news and the bulletin, kept up through dinner. A spare phone. | `?kiosk=ipad` on a stand in the orangery, or the plain game address to use it as a phone. |
| Your phone and Susan's | The Host tab. | Type your names at the door. The tab appears on its own. |

The game itself lives on the internet at https://murderwin-at-sirwin-manor.web.app/play/.
Every phone and every screen only needs the wifi. The brain does not serve the
game; it serves the bulb and the speakers.

## Start order, and how you know each one is alive

1. *The router, the Hue bulb and both Nanoleaf controllers.* On first. Give
   them five minutes.
2. *The brain.* `cd cues && npm start`. Alive when the terminal prints a
   line and sits there waiting. When the night begins it prints `[hall] red`
   and the bulb outside the bedroom turns red. If it prints `failed` and
   `retrying`, the bridge address in `cues/.env` is wrong; the night runs on
   without the bulb.
3. *Your phone.* Open the game, tap "Host? Start the night", type your name.
   The Host tab appears. Under "Who is here", a green dot sits beside every
   phone the house has heard from in the last two minutes. That dot is how you
   know a phone is alive all night.
4. *The study.* On the Host tab, under "The study", type any word of four or
   more letters and tap **Save key**. Put the same word in `station/.env` on
   the M1 Air, then `cd station && npm start`. Alive when the terminal prints
   `study station up` with the panel counts. `DOWN` beside either wall means
   the game runs on the screen instead; the clue still lands.
5. *The screens.* Open the three kiosk addresses (and the iPad's), full
   screen. Each one asks for one tap to wake, so the browser lets it make a
   sound; tap it once and leave it. Then each shows its crest and a waiting
   line. They follow the night on their own; nothing else on them is ever
   pressed. A small dot in the bottom left corner is green while the screen
   can hear the house, amber if it has gone quiet, red if it is off the wifi.
   A bell in the top right corner shows for three seconds whenever a sound
   is called for, so you can tell a silent speaker from a missed cue.
6. *The sounds.* The brain will not start the cue relay while any of the
   nine sound files is missing from `media/`; it prints which. Until you have
   recorded them, `node scripts/make-placeholder-sounds.mjs` makes a stand-in
   tone for each (`media/README.md` lists what each one is for).
7. *The guests.* They scan the slide, type their name, and are dealt a
   character and a bag number. Watch the green dots fill in.

## Running the night

- **Next** is the one button. It does whatever the next beat needs on every
  phone at once and tells you only how many phones it reached. The beat you
  are on and what it is for are written above the button.
- Act 1 ends with **Blackout**. When the room is settled, **Power returns · Act 2**.
  Every phone shows its role card, held fifteen seconds. Yours too.
- A Parlour Game is a window: every phone at once, sixty seconds on the
  server's clock, and it never closes early. **Next** waits for it. When the
  time is up, the server picks for anyone who did not, within a minute, on
  its own; **Pick for the rest** does the same thing sooner if you are
  standing there. Press **Parlour Game now** for an extra one in Acts 2, 4
  or 6. A phone that answers after the time is up sees the same thank-you as
  everyone else, and its late answer changes nothing.
- Act 3: **Next** makes the pairs and trios after dinner. **Make the groups**
  does the same thing if you want it before the beat.
- Act 4: the study is the clock. When a group finishes the light puzzle, the
  whole house rotates on its own. **Next** is the backup if the study runs
  long: the group still in there is paid its clue when the house moves on.
- Act 6: **Next** starts the drawing. While it runs, **Next** refuses to leave
  it. **Clear the drawing** only if the drawing must be abandoned; the trace
  then comes out at its plain level. When the third drawing is named the TV
  says the door is open; **Next** then opens the deduction round, and the TV
  shows every character with the thing they struck out beneath.
- The TV shows the news in Act 2, the bulletin in Act 3 and Sir Irwin in Act
  5 on its own when **Next** reaches those beats; the phones say where to
  look. The iPad keeps the words of the news and the bulletin up through
  dinner for anyone who missed them.
- Act 7: **Next** opens the ballot, two minutes. **Next** again starts the
  TV: the stats, the achievements, then the graph. Nobody is named until you
  press. When the Host tab says the screen is ready, press
  **Name the Murderer**, then **Name the Motive**, then **Name the Victim**,
  each when the room is ready for it. The closing story follows the Victim
  on its own. **Hold the screen** stops it where it is (a toast, a
  photograph); **Carry on** resumes, and nothing on the screen is skipped.
  **Next** for everyone's result only works once all three are named.
- Achievements: through Act 5, on the Host tab, tap a guest, then an
  achievement from the workshop's list. It lands on their phone at once and
  plays on the TV at the end. After Act 5 the list is closed.
- **Pause, Irwin needs the garden** stops every clock in the house. **Resume**
  carries on from where it stopped; nobody loses time.

## When something dies

| What died | What to do |
|---|---|
| A guest's phone | They tap their name on any other phone (the iPad is for this). Their character, bag, cards and cat standings follow. The old phone says the character has moved. |
| A borrowed phone that must change hands | **Hand this phone on** wipes it. The next person types their own name; the previous owner taps theirs on another phone and gets everything back. |
| Your phone | Tap your name on Susan's phone or the iPad; the Host tab moves with you. The brain is the spare host: `node functions/host.mjs status` says where the night is, `node functions/host.mjs next` presses Next. It needs the key file described at the top of `functions/host.mjs`. |
| The living room screen | Open the iPad at the same address and stand it on the TV. |
| The bedroom screen | Nobody goes to the bedroom. Press **Show the trace on the TV** under The Big Solve: ten seconds after the door opens, the TV shows the trace, and again at the ballot. |
| The study station | Keep going. The group in the study is paid its clue when the house moves on, and Granolia's lines show on their phones. |
| The hall bulb | The TV says the door is open and the phones say the light is green regardless. |
| The brain | Nothing waits on it. Start `cd cues && npm start` again; it never replays an old cue. The TV rings its own small chime and shows the bell for every cue, so the room loses the big speakers and nothing else. |
| The wifi | Phones show a red strip, keep what they had, and catch up on their own when it returns. Nothing is lost. If it is out for long, **Pause, Irwin needs the garden**. |
| The wrong group walks into the study | The group that was due is paid. Carry on. |
| Somebody gives a hidden role away out loud | **Hush the Murderer** or **Hush the Ghost**, whichever role was given away. Nothing on any phone changes; from then on that player's Parlour Game answers move nothing, and the reveal says one line about it. You never learn who it was from the button. |
| The story itself needs to change (a guess that landed too early, a secret blurted) | **Spill the Beans**. The Manor decides on its own whether the story can still change (only through Act 5, and only before a document, the study's clue or the news has reached anyone) and says nothing either way; the phone's message is the same whether it worked or not. If it did, the Murderer stays, everyone keeps their character, and the rest is re-drawn. |
| The night itself | Before the blackout, **Start a new night** deals new characters and every phone types its name again. After the blackout, pause and think; a new night is a new case. |

## After the freeze, 7 November

Anything not working is cut, not fixed.

- Safe to cut: the Nanoleaf layer (the study runs on the screen with the
  numbered wall), the Hue bulb (the TV announces the door), the bedroom screen
  (the TV shows the trace), the wandering iPad, any single act's event content.
- Never cut: the secrets generator, the reveal order (Murderer, then Motive,
  then Victim), the sealed testimony.
- The workshop lock: after 7 November, leave the workshop alone. The phones
  copy your lines every time a name is tapped and at the start of every act,
  so a late edit does reach the party. That is the reason not to make one. A
  Freeze button that locks the lists is being built; when it is there, press
  it on the 7th.

## Rehearsing without touching the party

The emulator is a pretend Firebase on your own Mac. Nothing it holds reaches
the real game.

- `npm run emulate` in one terminal. It stays running.
- `npm run emulate:seed` in another, once, to give it the starting cat lines and pools.
- `npm run fake-night -- --emulator` plays a whole night on it.
- `npm run test:rules` proves the security rules on it: a phone can read its
  own session and never anyone else's, never the secrets, never the case.
- `npm test` runs every test in the repo with no emulator and no key. Claude
  runs it before saying done; you can too.

---

## For Claude Code (technical)

*What the test greps* (`scripts/test/docs.test.mjs`): every backticked
"npm run" name must be a script in the root `package.json`, and "npm test"
too; a backticked "cd DIR && npm start" or "cd DIR && npm run NAME" must be a
script in that folder's `package.json`; a backticked "node functions/host.mjs
COMMAND" must be in `HOST_COMMANDS` (`functions/lib/commands.js`) or be
`status`; every bold phrase (two asterisks each side) must be a button label
in `play/src/screens/Host.jsx`. No em dashes anywhere in this file.

*Emulators.* `firebase.json` runs auth 9099, firestore 8080, functions 5001,
hosting 5000, storage 9199, UI 4000, project `demo-murderwin`. A phone against
them: `VITE_EMULATOR=1 npm --prefix play run dev` (`VITE_EMULATOR_HOST` for a
real phone on the LAN). The relay, the station and the terminal host:
`MURDERWIN_EMULATOR=1`. `scripts/seed-emulator.mjs` writes with the token
`owner`, which only the emulator honours.

*The clock.* `functions/index.js` exports `tick`, a scheduled function
(`every 1 minutes`, Cloud Scheduler, which the Blaze plan includes) that runs
`lib/windows.js tick` for the live night (`public_state/active`): a window
past `closesAt` plus a five-second grace is settled, a twelve-minute study
slot that ran out is ended (`station.tickStudy`), a paused night is skipped.
The Host tab calls the same host command `tick` once when it opens. `node
functions/host.mjs tick` is the hand version. Logs are counts only.
`note-exposure <murderer|ghost>` is the older name for `hush`: the same
record in `cases/{id}.exposure[role] = { hushedAt, act }`, written only by
`ledger.noteExposure` and read only by `ledger.isHushed`; from then on that
role's Parlour Game answers still move a cat but move the dial by 0, logged
`hushed`, and the Act 7 screen says one line about it.

*The spare host.* `functions/host.mjs` against the live project needs
`GOOGLE_APPLICATION_CREDENTIALS` pointing at a service-account key kept out
of the repo (`service-account*.json` is gitignored). `--help` lists every
command from `HOST_COMMANDS`.

*The safeguards* (`functions/lib/safeguards.js`, host commands `spill` and
`hush <murderer|ghost>`). The ledger `cases/{nightId}.dealtClues` records a
kind, act, beat and guest key or group id (never a word of content) whenever a
document lands (`deal.solve`), the study pays out (`station.dealStudy`, and
`deal.rotate` with no station) or the News flash beat runs (the echo).
`spillAllowed(night, case)` is the whole rule: Acts 2 to 5, not in a
blackout, no open window, no blocking kind in the ledger. A legal spill
builds a fresh case from another sealed code (a different motive) or a fresh
rehearsal, then `case.rerollCase` keeps the Murderer, the pools, the template
and the hidden sets, picks a new Ghost, restarts the dial and the exposure
record, and the role cards are replaced in place under the same card id.
The Hush writes `cases/{nightId}.exposure[role] = { hushedAt, act }`;
`deal.applyPoints` skips the dial for a hushed role and `finaleDoc` adds
`spotlight[]` only when the record exists.

*A dry run with the real secrets* (blind-content-protocol.md): on the brain,
with the key, `npm run fake-night -- --live --i-know-this-is-the-party-database --real-secrets`.
It refuses while any night is live, creates its own night with
`createNight(db, { forceRehearsal: false, dryRun: true })`, is joined only by
the eight fake phones, and discards the night and its case afterwards. Jon's
and Susan's phones never join it. Without `--real-secrets` the same run uses
stand-ins; without `--live` it uses the emulator (`--emulator`) or an
in-memory stand-in for Firestore (the default, no services at all).
