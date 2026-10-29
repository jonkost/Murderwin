// Every device the night needs, room by room, not counting anyone's own
// phone (22 Oct 2026, Jon: "a link for each device I need to have ready for
// each room and overall game play"; the device table of 23 Oct 2026; Jon's
// key in docs/cue-list.md, built 26 Oct 2026: Susan's MacBook Pro feeds the
// projector all night and never moves, the iPad Pro roams through four
// stations, Jenna's iPad Pro is Boo's camera, the brain's browser is the
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
        what: 'Plays every sound and the playlists through the speakers, stops the music for the news, recalls the Hue scenes, turns the hall light green, off, red and green again at the door, switches the projector’s plug, and mirrors Salem’s colours to the string lights. Its own browser is the Orangerie’s screen (see the Orangerie). It is also the spare host if your phone dies.',
        start: [
          'Network cable in, sleep off.',
          'Double-click Start the brain on its desktop. A window opens and stays open all night.',
        ],
        alive: 'Its window prints a line and waits. When the night begins the bulb outside the bedroom goes green, off for the blackout, then red. If it says the chime or the blackout sound has no file and stops, tell Claude Code.',
        tech: 'The desktop button Start the brain (card 475) runs, in the Murderwin folder, in a Terminal window Jon can see: cd cues && npm start. Until it exists, Claude Code runs that line. It stops only if the chime (chime-phone) or the blackout sound has no file in media/; the other seven sounds are optional (nine since 25 Oct 2026, no power sound). node scripts/make-placeholder-sounds.mjs makes a stand-in tone for each. The projector’s plug and the string lights run through Apple Home Shortcuts: PROJECTOR_SHORTCUTS=on and STRINGS_SHORTCUTS=on in cues/.env, the steps in docs/cues-relay.md.',
      },
      {
        key: 'speakers', name: 'The speakers', machine: 'Four HomePods in one AirPlay group',
        what: 'Every sound cue, bulletin 2 at supper and the music, played by the brain through all four: the Entryway, the Study, the Orangerie and the fourth in the Parlour.',
        start: ['Switched on, and the AirPlay group of all four picked as the brain’s sound output.'],
        alive: 'Press Sound test on your Host tab, under The house: the chime comes out of all four.',
        tech: 'On the brain, in the Murderwin folder: afplay media/chime-phone.wav (or .m4a or .mp3, whichever is there).',
      },
    ],
  },
  {
    key: 'living', room: 'The Parlour',
    why: 'Where Sir Irwin lives and everyone gathers.',
    devices: [
      {
        key: 'living', name: 'The Parlour screen', machine: 'Jon’s work MacBook Pro on the TV', kiosk: 'living',
        what: 'All night: the join code through Act 1 and again at the dinner wrap-up (the intro video and the rules slides from a second browser tab: switch back to the game tab for the next beat), the blackout, bulletin 1, Sir Irwin’s prompts while guests wait in Acts 2 and 4, the Act 4 title card, the Happy Birthday Irwin card, Sir Irwin’s countdown, Sir Irwin Needs a Hand, the board, the ballot and the reveal, then black at The End. In the drawing you tap the room’s guess on your own phone; this screen’s names still take a tap, the fallback.',
        start: ['Open the address in a browser, full screen.', 'Tap anywhere once to wake it, so it can play sound and video. Then leave the trackpad within reach: the TV’s names are the fallback for the drawing’s guess in Act 6.'],
        alive: 'The join code, or the crest or its loop, and a waiting line. On your Host tab, under The house, its dot is green (on a rehearsal the screen has its own dot too, bottom left).',
      },
    ],
  },
  {
    key: 'study', room: 'The Study',
    why: 'Granolia’s room upstairs: her cat room in Act 2, Granolia’s Lightbulb Moment in Act 4.',
    devices: [
      {
        key: 'study', name: 'The study screen and station', machine: 'M1 MacBook Air, with the Stream Deck on USB', kiosk: 'study',
        what: 'Granolia’s screen: her code during the Act 2 cat visits, then in Act 4 the light puzzle on the Nanoleaf walls and the button box, ten minutes a group, with her rules card between groups; her loop otherwise.',
        start: [
          'Save the study key word at the top of the Game test tab, once: it is kept from night to night.',
          'Quit the Elgato app on this Mac.',
          'Double-click Start the study on its desktop. A window opens and stays open all night. Once it says the study station is up, minimise it (the yellow button at its top left): it keeps running, out of the guests’ sight.',
          'Open the address in a browser, full screen, and tap once to wake it.',
        ],
        alive: 'The station’s window says the study station is up, with the number of panels on each wall. DOWN beside a wall means the puzzle runs on the screen instead; the clue still lands.',
        tech: 'STATION_KEY in station/.env must match the saved key word. The desktop button Start the study (card 475) runs, in the Murderwin folder: cd station && npm start. Until it exists, Claude Code runs that line.',
      },
    ],
  },
  {
    key: 'orangerie', room: 'The Orangerie',
    why: 'Salem’s room, the screened back patio: his code in Act 2, supper in Act 3 with the captions on the iPad Pro (see Jon’s iPad Pro below), Get Off My Lawn! in Act 4 (on the guests’ own phones).',
    devices: [
      {
        key: 'orangerie', name: 'The Orangerie screen', machine: 'The brain’s own browser (Jon’s M3 Air), facing the Orangerie table', kiosk: 'orangerie',
        what: 'Salem’s code during the Act 2 cat visits; in Act 4 the rules card for Get Off My Lawn! with Salem’s line and the room’s code (the game itself runs on the group’s phones); its loop otherwise, if you make one. It shows the bell for every cue but rings nothing: the real sound comes from the brain itself.',
        start: ['On the brain, once Start the brain is running, open the address in a browser, full screen, and turn the screen to face the table.', 'Tap anywhere once to wake it. The brain’s own window keeps running behind it.'],
        alive: 'Its crest or its loop and a waiting line. On your Host tab, under The house, its dot is green (on a rehearsal the screen has its own dot too, bottom left).',
      },
    ],
  },
  {
    key: 'entryway', room: 'The Entryway',
    why: 'Boo’s room, the front hall: her code in Act 2 and Boo’s Catwalk in Act 4, projected on the triangle wall above the Parlour opening, with her camera at the end of the catwalk.',
    devices: [
      {
        key: 'boo', name: 'Boo’s wall', machine: 'Susan’s work MacBook Pro and the projector, on the upstairs landing, all night', kiosk: 'boo',
        what: 'On the triangle wall from Act 1 to The End: its loop (Sir Irwin’s portrait and Boo walking), Boo’s code during the Act 2 cat visits, Boo’s Catwalk in Act 4 (Boo struts, the music stops, the group strikes a pose, and she judges it; her rules card between groups), its loop again, black at The End. The MacBook never moves. The brain switches the projector’s plug off for the blackout and from the drawing’s intro to the end of Act 6; on again when the power returns and for the ballot.',
        start: ['Plug it into the projector with the short HDMI cable and aim at the triangle wall. Sleep off, lid open.', 'Open the address in a browser, full screen, and tap once to wake it, so the music can play.'],
        alive: 'Its loop, or Boo and a waiting line, on the wall.',
        note: 'Try on the hardware evening: when the projector’s plug comes back on, the full-screen browser must come back on the projector, not on the MacBook’s own screen.',
      },
      {
        key: 'pose', name: 'Boo’s camera (nice to have)', machine: 'Jenna’s iPad Pro, on its stand at the end of the catwalk, facing the group, Act 4 only', kiosk: 'pose',
        what: 'Shows the group to itself like a mirror and takes one photo of each group’s last pose for the end credits. Jenna is at the house to pack the bags and never plays, so her iPad is free all night. Without it the catwalk runs the same and the credits have no photos.',
        start: ['Before Start Act 4, stand it at the end of the catwalk facing where the group poses.', 'Open the address in Safari, full screen, and tap Turn on the camera. Allow the camera when the iPad asks.'],
        alive: 'The room on the screen, like a mirror, and a waiting line.',
      },
    ],
  },
  {
    key: 'ipadpro', room: 'Jon’s iPad Pro, roaming',
    why: 'One iPad, four stations in turn: the Library with Zimothy in Act 2, its stand on the Orangerie table for supper, the Library again for In Duplicate in Act 4, the bedroom from Act 6. The first two stations share one address; the other two have their own. The Library has no screen of its own: this iPad is it, in Acts 2 and 4.',
    devices: [
      {
        key: 'ipad', name: 'Zimothy’s code, then the captions', machine: 'Jon’s iPad Pro: in the Library for Act 2, on its stand in the Orangerie for supper', kiosk: 'ipad',
        what: 'In Act 2, Zimothy’s code during the cat visits (and bulletin 1’s words while the TV plays it). Carried to the Orangerie for supper, it keeps bulletin 2’s words up through the meal and the wrap-up. Its loop (Zimothy’s) whenever it has no words to show.',
        start: ['Open the address in Safari, full screen, and tap anywhere once to wake it. Stand it in the Library with Zimothy for Act 2.', 'On your way in to supper, carry it to its stand on the Orangerie table. The address stays the same.'],
        alive: 'Its crest or its loop and a waiting line. On your Host tab, under The house, its dot is green (on a rehearsal the screen has its own dot too, bottom left).',
      },
      {
        key: 'memory', name: 'The memory match', machine: 'Jon’s iPad Pro, back on its small stand in the Library, Act 4', kiosk: 'memory',
        what: 'In Duplicate: three boards of 7, 10 and 14 pairs, all fourteen traces. Clearing all three crosses one motive off for the group. It waits in the Library for each group, with Zimothy’s rules card between them.',
        start: ['After supper, before Start Act 4, carry it from the Orangerie to its small stand in the Library and open the address in Safari, full screen.', 'Tap anywhere once to wake it.'],
        alive: 'In Duplicate, or Zimothy’s rules card, and a waiting line.',
      },
      {
        key: 'bedroom', name: 'The bedroom screen', machine: 'Jon’s iPad Pro, carried into the bedroom after Act 4', kiosk: 'bedroom',
        what: '"The door is closed" (its loop behind the words) until the third drawing is named, then what was left behind, at the same moment Sir Irwin’s last slide comes up on the TV.',
        start: ['After Act 4, carry it from the Library into the bedroom and open the address in Safari, full screen.', 'Tap anywhere once to wake it. Close the bedroom door.'],
        alive: '"The door is closed" over its crest or its loop. On your Host tab, under The house, its dot is green (on a rehearsal the screen has its own dot too, bottom left).',
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
      // query, so Boo's wall stays the one boo screen of the night.
      {
        key: 'arcadeplay', name: 'Miss Boo LaRue’s Arcade, just for fun', machine: 'A Mac with Google Chrome and the Stream Deck + XL, any day', kiosk: 'boo', query: 'play=1',
        what: 'Boo’s five little games on the Stream Deck + XL, with Boo on the Mac’s screen: free play, no case, no clues, nothing sent. Try a group’s visit, at the bottom of the page, tries the turns, the two tokens each, the clue after each player’s second game and the chime.',
        start: [
          'On a Mac with Google Chrome: quit the Stream Deck app, then plug in the Stream Deck + XL.',
          'Set the Mac’s sound output to its own speakers first: through a HomePod the sounds come about two seconds late.',
          'Open the address in Google Chrome. Safari cannot reach the Stream Deck.',
          'Tap Connect the Stream Deck and pick it from the list, once. Then make the window full screen.',
          'No Stream Deck? The deck drawn on the screen plays the same games with the mouse or the keyboard.',
        ],
        alive: 'Boo and the deck on the screen. Once the Stream Deck is connected, the Mac’s screen becomes the scoreboard (Boo, the points, the time) and the games are on the keys.',
        note: 'Not on the night yet: you chose it for the Entryway on 29 Oct (the question entrywayGame), for a clue about the Ghost, and it goes on the night with the card The arcade on the night. Until then the night still runs Boo’s Catwalk.',
        tech: 'play/src/main.jsx sends ?kiosk=boo&play=1 to play/src/screens/Arcade.jsx (BooArcade) before the kiosks: no sign-in, no presence, no night. &visit=1 is the practice visit. WebHID through @elgato-stream-deck/webhid, in Chrome or Edge on https or localhost only; one arcade tab holds the deck at a time (the Web Lock arcade-deck). docs/boo-arcade.md.',
      },
    ],
  },
]

export const DEVICES = DEVICE_ROOMS.flatMap(r => r.devices.map(d => ({ ...d, room: r.room })))

// The order to switch things on, on the day, in plain words (from
// docs/on-the-night.md, Start order).
export const SWITCH_ON = [
  'The router, the Hue bridge and bulb, both Nanoleaf controllers, the string lights and the projector’s plug. Give them five minutes.',
  'The brain: network cable in, sleep off, then double-click Start the brain on its desktop. When the night begins, the bulb outside the bedroom turns green for the welcome; it goes out for the blackout and comes back red.',
  'The party box, then your phone, before any guest arrives. On the Game night page, tick This is the party night. Then open the game on your phone, tap Host? Start the night and type your name. No red REHEARSAL band means the box worked. Until a night is live, every phone that opens the game shows that button.',
  'The study: on the M1 Air, quit the Elgato app and double-click Start the study on its desktop. Once its window says the station is up, minimise the window.',
  'The screens: the Parlour TV, the study screen, the iPad Pro in the Library with Zimothy, Susan’s MacBook Pro by the projector on the landing, and the brain’s own browser facing the Orangerie table. Open each address below, full screen, and tap once to wake it. The iPad Pro moves three times in the night: to the Orangerie for supper, back to the Library before Start Act 4, into the bedroom after Act 4. Jenna’s iPad Pro, Boo’s camera, comes out before Start Act 4.',
  'The rooms: the four room codes on the walls (none in the Parlour), the paper roll and markers in the Library with the iPad Pro’s small stand, the Orangerie table set. Jenna packs the bags where nobody who plays can see.',
  'The guests: they scan the square code at the door, type their name and tap Allow. Watch the green dots fill in on your Host tab.',
]

// What to do when something dies, in plain words (docs/on-the-night.md,
// When something dies). Every room pays its reward at the chime anyway.
export const WHEN_ONE_DIES = [
  ['A guest’s phone', 'They tap their name on any other phone (the old iPhone 11 is for this). Their character, bag, clues and cats follow.'],
  ['Your phone', 'Tap your name on Susan’s phone or the old iPhone 11. The Host tab moves with you.'],
  ['The Parlour TV', 'Open the Parlour screen in a browser on the brain and put it by the TV; the iPad Pro has a job of its own all night. The drawing’s guesses are on your phone anyway. The Orangerie then has its printed code, which is all Salem’s game needs.'],
  ['The bedroom screen', 'Nobody goes to the bedroom. Press Show the trace on the TV, under The Big Solve on the Host tab.'],
  ['The iPad Pro, at any of its stations', 'Carry on. Zimothy’s code in Act 2 is also printed, bulletin 2’s words also show on the Parlour TV, In Duplicate is paid at the chime anyway, and the trace goes to the TV with Show the trace on the TV. Susan’s 8th-gen iPad can take any station: open that station’s address on it.'],
  ['Boo’s wall or the study station', 'Carry on. The group is paid at the chime anyway.'],
  ['The projector', 'Carry on, or open Boo’s wall on any screen the group can see. If its plug never came back on after the blackout or the drawing, switch it on by hand in the Home app; the brain carries on.'],
  ['Boo’s camera (Jenna’s iPad Pro)', 'Carry on. The catwalk runs the same; the end credits have no photo for that group.'],
  ['The Orangerie screen (the brain’s browser)', 'Carry on. Salem’s game is on the phones, and the printed code serves Act 2 and Act 4.'],
  ['Get Off My Lawn!', 'Nothing to do. A phone that cannot feel a shake never slips, and the phones turn red and green whatever the lights do.'],
  ['The hall bulb', 'The TV says the door is open, and the phones say the light is green, regardless.'],
  ['The brain', 'Nothing waits on it. Double-click Start the brain on its desktop again. Meanwhile the TV rings its own small chime and the words still show.'],
  ['A recording or a video', 'The words are on the screens anyway.'],
  ['The wifi', 'Phones keep what they had and catch up on their own. If it is out for long, press Pause, Irwin needs the garden.'],
  ['A room code will not scan', 'The phone has a Cannot scan? button for that room.'],
]

// The address a device opens, from the game's own address.
export function deviceUrl(base, device) {
  if (!base) return null
  if (device.kiosk) return `${base}${String(base).includes('?') ? '&' : '?'}kiosk=${device.kiosk}${device.query ? `&${device.query}` : ''}`
  if (device.plain) return base
  return null
}
