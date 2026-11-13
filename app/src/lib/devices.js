// Every device the night needs, room by room, not counting anyone's own
// phone (22 Oct 2026, Jon: "a link for each device I need to have ready for
// each room and overall game play"; the device table of 23 Oct 2026; Jon's
// key in docs/cue-list.md, built 26 Oct 2026: Susan's MacBook Pro is Boo's
// screen in the Entryway all night and never moves (since 5 Nov 2026), the
// iPad Pro roams through four stations, the brain's browser is the
// Orangerie's screen, and the older family iPad is out unless Jon says it
// stays, the question olderIpad). Sources: docs/on-the-night.md (which Mac
// does what, the start order) and docs/room-screens.md (the room screens).
// Pure: tested by test/devices.test.mjs.
//
// A device with a `kiosk` opens the game at PLAY_URL?kiosk=<kiosk>, full
// screen. One with `plain: true` opens the game itself, as a spare phone.
// One with neither has no address: its `start` steps say how it comes up.
// `query` adds to the address (the standalone memory match and Miss Boo
// LaRue's Arcade, each a game on its own with no night). `pending` says
// why an address does not work yet; `note` is anything still undecided.
// `start` is plain words for Jon (24 Oct 2026: no Terminal); `tech` is the
// exact line Claude Code runs, shown in a closed For Claude Code fold.

export const DEVICE_ROOMS = [
  {
    key: 'first', room: 'Switch on first',
    why: 'Before anything else, and give them five minutes. Nothing here has an address.',
    devices: [
      { key: 'router', name: 'The router', machine: 'The house wifi', what: 'Every phone and screen needs only the wifi. The brain, the Hue bridge and both Nanoleaf controllers have fixed addresses on it; the string lights and the projector’s plug are reached through the Home app.', start: ['Switch it on first.'] },
      { key: 'lights', name: 'The Hue bulb, the two Nanoleaf controllers and the string lights', machine: 'The hall light, the Study walls and the Orangerie lights', what: 'The bulb outside the bedroom is green for the welcome, goes out for the blackout, comes back red when the power returns and turns green when the door opens. The walls are Granolia’s Lightbulb Moment. The Holiday String Lights mirror Get Off My Lawn!, a second or two behind the phones. Nothing waits on a light.', start: ['Switch them on with the router.'] },
      { key: 'huebridge', name: 'The Hue bridge', machine: 'The small box the hall bulb listens to', what: 'The brain talks to the hall bulb and recalls the Hue scenes through it. Without it the lights never change, though the TV still says when the door is open.', start: ['Switch it on with the router. It stays plugged into the router by its cable.'] },
      { key: 'plug', name: 'The projector’s plug', machine: 'An IKEA smart switch in Apple Home, on the upstairs landing', what: 'The projector hangs off it. The brain switches it off for the blackout, from the drawing’s intro to the end of Act 6, and at The End, and on again when the power returns and for the ballot, through two Shortcuts on the brain, Projector Murderwin On and Projector Murderwin Off, each running a Home scene for the plug. The projector takes a moment to warm up each time it comes back; nothing waits on it. Without the plug the projector simply stays on.', start: ['Plugged in with the projector on it, switched on, and in the Home app before the night.'] },
    ],
  },
  {
    key: 'brain', room: 'The whole house',
    why: 'Runs every sound, the music and the lights for every room. The game itself lives on the internet, so nothing waits on this.',
    devices: [
      {
        key: 'brain', name: 'The brain', machine: 'Jon’s M3 MacBook Air',
        what: 'Runs the music and the lights. It starts and stops your music Shortcuts for each moment, speaks W-O-O-F News bulletin 2 at supper through its own speakers, recalls the Hue scenes, turns the hall light green, off, red and green again at the door, runs your Blackout and AfterBlackOut Shortcuts, switches the projector’s plug, and mirrors Salem’s colours to the string lights. Its own browser is the Orangerie’s screen (see the Orangerie). The brain’s window plays no chimes or scream: every room screen and phone plays its own, this Mac’s Orangerie page too.',
        start: [
          'Plugged in, sleep off, on the wifi or its network cable. Sound on the Mac’s own speakers, not a HomePod, turned all the way up.',
          'Double-click Start the brain on its desktop. A window opens and stays open all night, and the Orangerie’s page opens in the browser.',
        ],
        alive: 'Its window says cue relay up and waits. On your Host tab, under The house, the dot beside The brain is green. When the night begins the jazz plays and the bulb outside the bedroom goes green; it goes off for the blackout, then red. If the window says the chime or the blackout sound has no file and stops, tell Claude Code.',
        tech: 'Start the brain on the desktop is a link to cues/Start the brain.command (card 475, made 12 Nov 2026). In a Terminal window Jon can see it runs the relay in cues/ (the same as cd cues && npm start), keeps the Mac awake, starts it again if it stops, refuses a second copy, and opens the Orangerie’s page. It stops only if the chime (chime-phone) or the blackout sound has no file in media/; the other seven sounds are optional (nine since 25 Oct 2026, no power sound). node scripts/make-placeholder-sounds.mjs makes a stand-in tone for each. The projector’s plug and the string lights run through Apple Home Shortcuts: PROJECTOR_SHORTCUTS=on and STRINGS_SHORTCUTS=on in cues/.env, the steps in docs/cues-relay.md.',
      },
      {
        key: 'speakers', name: 'The speakers', machine: 'The four HomePods, through your music Shortcuts',
        what: 'The music, through your Shortcuts, and the birthday song, from the Music app on the brain. Both play on the HomePods, and AudioPanic stops the music. The chimes, the stings and the scream do not come from the HomePods: every room screen and phone plays its own.',
        start: ['Switched on. Nothing to pick on the brain: your Shortcuts choose the speakers, and the brain’s own sound stays on its own speakers.'],
        alive: 'When you start the night the jazz comes on. The Sound test list on your Host tab, under The house, plays each chime on every room screen and phone, not on the HomePods.',
        tech: 'The Shortcut names are in cues/scenes.json (musicShortcuts); the birthday song is the Music app’s own (cake). The relay says at start-up how many of the Shortcuts it runs are on this Mac, without running one.',
      },
    ],
  },
  {
    key: 'living', room: 'The Parlour',
    why: 'Where Sir Irwin lives and everyone gathers.',
    devices: [
      {
        key: 'living', name: 'The Parlour screen', machine: 'Jon’s work MacBook Pro on the TV', kiosk: 'living',
        what: 'All night: the join code through Act 1 and again at the dinner wrap-up (the intro video and the rules film play by themselves at The house rules: open nothing else), the blackout, bulletin 1, Sir Irwin’s prompts while guests wait in Acts 2 and 4, the Act 4 title card, the Happy Birthday Irwin card, Sir Irwin’s countdown, Sir Irwin Needs a Hand, the three questions over everyone’s portraits while the room talks it over, the vote and the reveal, then The End. In the drawing you tap the room’s guess on your own phone; this screen’s names still take a tap, the fallback.',
        start: ['Open the address in a browser, or send it from your Host tab.', 'Click anywhere once: that makes it full screen and turns its sound on. Then leave the trackpad within reach: the TV’s names are the fallback for the drawing’s guess in Act 6.'],
        alive: 'The join code and the countdown before the intro; the five faces crossing the screen when it has nothing to show. On your Host tab, under The house, its dot is green and it says Sound on (on a practice night the screen has its own dot too, bottom left).',
      },
    ],
  },
  {
    key: 'study', room: 'The Study',
    why: 'Granolia’s room upstairs: her cat room in Act 2, Granolia’s Lightbulb Moment in Act 4.',
    devices: [
      {
        key: 'study', name: 'The study screen and station', machine: 'M1 MacBook Air, with the Stream Deck on USB', kiosk: 'study',
        what: 'Granolia’s screen: her code during the Act 2 cat visits, then in Act 4 the light puzzle on the Nanoleaf walls and the button box, fifteen minutes a group, with her rules card between groups; the five faces crossing the screen otherwise.',
        start: [
          'Quit the Stream Deck app on this Mac.',
          'Double-click Start the Study in the Study station folder. A window opens and stays open all night, and the Study’s page opens in the browser by itself.',
          'Drag that page to the screen facing the walls and click once on it: that makes it full screen and turns its sound on.',
          'Once the window says study station up, minimise it (the yellow button at its top left): it keeps running, out of the guests’ sight.',
        ],
        alive: 'The station’s window says study station up, with the number of panels on each wall. DOWN beside a wall means the puzzle runs on the screen instead; the clue still lands. On your Host tab, under The house, Study station says alive.',
        tech: 'Start the Study is station/Start the Study.command, in the Study station folder that came from Study station.zip on the brain’s Desktop (it carries its settings). It runs the station (the same as cd station && npm start), keeps the Mac awake, starts it again if it stops, takes the newest station code from the site at each start, and opens the Study’s page in Google Chrome. STATION_KEY in its settings must match the saved key word.',
      },
    ],
  },
  {
    key: 'orangerie', room: 'The Orangerie',
    why: 'Salem’s room, the screened back patio: his code in Act 2, supper in Act 3 with the captions on the iPad Pro (see Jon’s iPad Pro below), Get Off My Lawn! in Act 4 (on the guests’ own phones).',
    devices: [
      {
        key: 'orangerie', name: 'The Orangerie screen', machine: 'The brain’s own browser (Jon’s M3 Air), facing the Orangerie table', kiosk: 'orangerie',
        what: 'Salem’s code during the Act 2 cat visits; in Act 4 the rules card for Get Off My Lawn! with Salem’s line and the room’s code (the game itself runs on the group’s phones); the five faces crossing the screen otherwise. It plays the Orangerie’s chimes itself, so keep this Mac’s sound on its own speakers, turned all the way up.',
        start: ['Start the brain opens this page in the browser by itself. Turn the screen to face the table.', 'Click anywhere once: that makes it full screen and turns its sound on. The brain’s own window keeps running behind it.'],
        alive: 'The countdown before the intro, then the five faces. On your Host tab, under The house, its dot is green and it says Sound on (on a practice night the screen has its own dot too, bottom left).',
      },
    ],
  },
  {
    key: 'entryway', room: 'The Entryway',
    why: 'Boo’s room, the front hall: her code in Act 2 and Miss Boo LaRue’s Arcade in Act 4 on Susan’s MacBook Pro and the Stream Deck + XL.',
    devices: [
      {
        key: 'boo', name: 'Boo’s screen', machine: 'Susan’s work MacBook Pro in the Entryway with the Stream Deck + XL on USB, all night', kiosk: 'boo',
        what: 'From Act 1 to The End: the five faces crossing the screen, Boo’s code during the Act 2 cat visits, Miss Boo LaRue’s Arcade in Act 4 (her rules card with the code between groups; the group that scans in plays its visit on the Stream Deck, each of the first two players gets the clue about the Ghost on the screen and their phone, a trio’s third gets Boo’s line, and the chime ends it), the faces again, then The End. The MacBook never moves.',
        start: ['In Google Chrome (Safari cannot reach the Stream Deck), with the Stream Deck app quit and the Stream Deck + XL plugged in. Sleep off, lid open, the sound on the Mac’s own speakers.', 'Before the guests arrive, open murderwin-at-sirwin-manor.web.app/setup in the same browser: the line under Boo’s button says Deck ready, or what to do (Press Connect once, with the button right there). The night’s screen has no Connect button and remembers the deck.', 'Then tap Boo’s button on that page (or open this address) and click once: that makes it full screen and lets the games make their sounds.'],
        alive: 'The five faces, or Boo’s rules card with her code, on the screen. On your Host tab, under The house, its dot is green and it says Sound on.',
        note: 'With no Stream Deck the deck is drawn on the screen and the mouse and the keyboard play the games: the clues and the chime come the same.',
      },
    ],
  },
  {
    key: 'ipadpro', room: 'Jon’s iPad Pro, roaming',
    why: 'One iPad, one page, four stations in turn: the Library with Zimothy in Act 2, its stand on the Orangerie table for supper, the Library again for In Duplicate in Act 4, the bedroom from Act 6. The page follows the night by itself, so you only carry it; the Host tab’s row The iPad shows can switch it by hand. The Library has no screen of its own: this iPad is it, in Acts 2 and 4.',
    devices: [
      {
        key: 'ipad', name: 'The iPad', machine: 'Jon’s iPad Pro, carried room to room, all night', kiosk: 'ipad',
        what: 'Act 1: the Library’s picture, with Zimothy. Act 2: Zimothy’s code during the cat visits (and bulletin 1’s words while the TV plays it). Act 3: bulletin 2’s words through supper and the wrap-up. Act 4: In Duplicate (three boards of 7, 10 and 14 pairs; clearing all three crosses one motive off for the group), with Zimothy’s rules card between groups. Act 5: the Library’s picture. Act 6 from the drawing, and Act 7: the bedroom ("The door is closed" until the third drawing is named, then what was left behind).',
        start: ['Once: in Safari open the address, tap Share, Add to Home Screen, leave Open as Web App on. From then on open it from its icon, and tap anywhere once to wake its sound. Settings, Display & Brightness, Auto-Lock: Never.', 'Stand it in the Library with Zimothy for Act 2. Carry it to the Orangerie table for supper, back to the Library before Start Act 4, into the bedroom after Act 4. Never reload it.'],
        alive: 'On your Host tab, under The house, its dot is green, and The iPad shows says what it shows now.',
      },
      {
        key: 'memory', name: 'In Duplicate, on another device', machine: 'Only if Jon’s iPad Pro is busy or dead: any iPad or computer in the Library, Act 4', kiosk: 'memory',
        what: 'In Duplicate on its own address, the same game the iPad shows in Act 4.',
        start: ['Open the address in Safari, full screen, and tap anywhere once to wake it.'],
        alive: 'In Duplicate, or Zimothy’s rules card, and a waiting line.',
      },
      {
        key: 'bedroom', name: 'The bedroom, on another device', machine: 'Only if Jon’s iPad Pro is busy or dead: any screen in the bedroom, from Act 6', kiosk: 'bedroom',
        what: 'The bedroom on its own address, the same screen the iPad shows from the drawing on.',
        start: ['Open the address in Safari, full screen, and tap anywhere once to wake it. Close the bedroom door.'],
        alive: '"The door is closed" over the bedroom’s picture.',
      },
    ],
  },
  {
    key: 'spares', room: 'Spares',
    why: 'Kept charged, for when something dies.',
    devices: [
      {
        key: 'spare', name: 'The spare phone', machine: 'The old iPhone 11', plain: true,
        what: 'A guest whose phone dies taps their name here and their character follows. Your own Host tab moves here the same way.',
        start: ['Charge it, open the address in Safari and leave it on the join screen.'],
      },
      {
        key: 'decor', name: 'The picture frame', machine: 'Susan’s 8th-gen iPad', plain: true,
        what: 'Decor all night: never responsible for a cue. If a guest needs a device, take the decor off and hand it over on the join screen.',
        start: ['Set up as decor. Keep the address handy in case it is needed.'],
      },
      {
        key: 'older', name: 'The older family iPad', machine: 'Out, unless you say it stays',
        what: 'Your cue list’s key has no older iPad, so it stays in the drawer. If you answer that it stays, it keeps In Duplicate in the Library all night, and your iPad Pro stays in the Orangerie from supper until it goes to the bedroom.',
        note: 'The question olderIpad on the board: out by default, and built that way.',
        start: ['Nothing, unless you say it stays. Then charge it, open the memory match on it (the address is under Jon’s iPad Pro above), full screen, and tap once to wake it.'],
      },
      {
        key: 'memoryplay', name: 'In Duplicate, just for fun', machine: 'Any iPad or computer, any day', kiosk: 'memory', query: 'play=1',
        what: 'The memory match on its own: three boards, no case, no clues, nothing sent. For playing any time.',
        start: ['Open the address. Play again starts fresh boards.'],
      },
      // 28 Oct 2026: the arcade on its own, like the memory match. It has a
      // query, so Boo's screen stays the one boo screen of the night.
      {
        key: 'arcadeplay', name: 'Miss Boo LaRue’s Arcade, just for fun', machine: 'A Mac with Google Chrome and the Stream Deck + XL, any day', kiosk: 'boo', query: 'play=1',
        what: 'Boo’s five little games on the Stream Deck + XL, with Boo on the Mac’s screen: free play, no case, no clues, nothing sent. Try a group’s visit, at the bottom of the page, tries the turns, the five tokens each, the clue after each player’s fifth game and the chime.',
        start: [
          'On a Mac with Google Chrome: quit the Stream Deck app, then plug in the Stream Deck + XL.',
          'Set the Mac’s sound output to its own speakers first: through a HomePod the sounds come about two seconds late.',
          'Open the address in Google Chrome. Safari cannot reach the Stream Deck.',
          'Tap Connect the Stream Deck and pick it from the list, once. Then make the window full screen.',
          'No Stream Deck? The deck drawn on the screen plays the same games with the mouse or the keyboard.',
        ],
        alive: 'Boo and the deck on the screen. Once the Stream Deck is connected, the Mac’s screen becomes the scoreboard (Boo, the points, the time) and the games are on the keys.',
        note: 'The same arcade runs on the night on Boo’s screen above, for the group that scans in, with the house’s clue and the chime (5 Nov 2026). This page is for practice and for fun.',
        tech: 'play/src/main.jsx sends ?kiosk=boo&play=1 to play/src/screens/Arcade.jsx (BooArcade) before the kiosks: no sign-in, no presence, no night. &visit=1 is the practice visit. WebHID through @elgato-stream-deck/webhid, in Chrome or Edge on https or localhost only; one arcade tab holds the deck at a time (the Web Lock arcade-deck). docs/boo-arcade.md.',
      },
    ],
  },
]

export const DEVICES = DEVICE_ROOMS.flatMap(r => r.devices.map(d => ({ ...d, room: r.room })))

// The order to set the house up, on the day, in plain words (docs/on-the-night.md,
// Start order). Rewritten 12 Nov 2026 to the night as it starts now: the brain by a
// double-click, the night from the big Start button with its own box, each screen
// sent its page or opened from the setup page, the Study by its own button. Shown
// on the Devices page and on Game night (Set up the house). Each step opens with
// what it is about, then a colon (stepParts).
export const SWITCH_ON = [
  'Switch on the house: the router, the Hue bridge and bulb, both Nanoleaf controllers, the string lights, the projector’s plug and the four HomePods. Give them five minutes.',
  'The brain (your M3 Air): double-click Start the brain on its desktop. A window opens: leave it open all night. The Orangerie’s page opens too: click once on it and turn the screen to the table. Keep this Mac’s sound on its own speakers, turned all the way up.',
  'Start the night: before the first guest comes, on your phone, tick This is the real night, tap Start the night, and type your name. Your Host tab opens and says This is the party night. The jazz plays, and every screen counts down to the intro at 4:30. If your phone opens on an old night, use A fresh night at the bottom of your Host tab.',
  'The screens: on your Host tab, under Send each screen its page, tap Send beside a room and AirDrop it to that room’s machine. Or on the machine, type murderwin-at-sirwin-manor.web.app/setup and tap its room. Click once on each page: that makes it full screen and turns its sound on. On your Host tab its dot goes green and it says Sound on.',
  'The Study: on the M1 Air, quit the Stream Deck app and double-click Start the Study in the Study station folder. It starts the walls and the buttons and opens the Study’s page. Drag that page to the screen facing the walls, click once on it, then minimise the station’s window.',
  'Boo’s arcade: on Susan’s MacBook Pro, in Google Chrome with the Stream Deck app quit, open the setup page. The line under Boo’s button must say Deck ready. Then tap Boo’s button and click once.',
  'The iPad Pro: open the game from its Home Screen icon, tap once, and stand it in the Library with Zimothy. The iPad Pro moves three times in the night: to the Orangerie for supper, back to the Library before Start Act 4, into the bedroom after Act 4.',
  'The rooms: the four room codes on the walls (none in the Parlour), the paper roll and markers in the Library, the Orangerie table set. Jenna packs the bags where nobody who plays can see.',
  'The guests: they scan the square code on the Parlour TV, type their name and tap Allow. Watch the green dots fill in on your Host tab.',
]

// A step's lead-in, the words before its first colon, for the pages to show in bold: [lead, rest].
export function stepParts(step) {
  const text = String(step ?? '')
  const i = text.indexOf(': ')
  return i > 0 && i <= 40 ? [text.slice(0, i), text.slice(i + 2)] : ['', text]
}

// What to do when something dies, in plain words (docs/on-the-night.md,
// When something dies). Every room pays its reward at the chime anyway.
export const WHEN_ONE_DIES = [
  ['A guest’s phone', 'They tap their name on any other phone (the old iPhone 11 is for this). Their character, bag, clues and cats follow. Their crossed-off motives and Notes stay on the old phone, so read them across if it still works.'],
  ['Your phone', 'Use Susan’s phone: it has the same Host tab. To play on, tap your name on the old iPhone 11: your character and the Host tab move with you.'],
  ['The Parlour TV', 'Open the Parlour screen in a browser on the brain and put it by the TV; the iPad Pro has a job of its own all night. The drawing’s guesses are on your phone anyway. The Orangerie then has its printed code, which is all Salem’s game needs.'],
  ['The bedroom screen', 'Nobody goes to the bedroom. Press Show the trace on the TV, under The Big Solve on the Host tab.'],
  ['The iPad Pro, at any of its stations', 'Carry on. Zimothy’s code in Act 2 is also printed, bulletin 2’s words also show on the Parlour TV, In Duplicate is paid at the chime anyway, and the trace goes to the TV with Show the trace on the TV. Susan’s 8th-gen iPad can take any station: open that station’s address on it.'],
  ['Boo’s screen or the study station', 'Carry on. The group is paid at the chime anyway.'],
  ['The projector', 'Carry on. Nothing is shown on it now, and the brain carries on whether its plug answers or not.'],
  ['The Orangerie screen (the brain’s browser)', 'Carry on. Salem’s game is on the phones, and the printed code serves Act 2 and Act 4.'],
  ['Get Off My Lawn!', 'Nothing to do. A phone that cannot feel a shake never slips, and the phones turn red and green whatever the lights do.'],
  ['The hall bulb', 'The TV says the door is open, and the phones say the light is green, regardless.'],
  ['The brain', 'Nothing waits on it. Double-click Start the brain on its desktop again. Meanwhile the music and the lights stay as they are and stop changing, and bulletin 2 has no voice; every screen and phone still makes its own sounds and shows the words.'],
  ['A recording or a video', 'The words are on the screens anyway.'],
  ['The wifi', 'Phones keep what they had and catch up on their own. If it is out for long, turn Wi-Fi off on your phone so it uses mobile data, then press Pause, Irwin needs the garden.'],
  ['A room code will not scan', 'The phone has a Cannot scan? button for that room.'],
]

// The address a device opens, from the game's own address.
export function deviceUrl(base, device) {
  if (!base) return null
  if (device.kiosk) return `${base}${String(base).includes('?') ? '&' : '?'}kiosk=${device.kiosk}${device.query ? `&${device.query}` : ''}`
  if (device.plain) return base
  return null
}
