// Every device the night needs, room by room, not counting anyone's own
// phone (22 Oct 2026, Jon: "a link for each device I need to have ready for
// each room and overall game play"; the device table of 23 Oct 2026). Sources: docs/on-the-night.md (which
// Mac does what, the start order) and docs/room-screens.md (the room
// screens). Pure: tested by test/devices.test.mjs.
//
// A device with a `kiosk` opens the game at PLAY_URL?kiosk=<kiosk>, full
// screen. One with `plain: true` opens the game itself, as a spare phone.
// One with neither has no address: its `start` steps say how it comes up.
// `query` adds to the address (the standalone memory match). `pending` says
// why an address does not work yet; `note` is anything still undecided.
// `start` is plain words for Jon (24 Oct 2026: no Terminal); `tech` is the
// exact line Claude Code runs, shown in a closed For Claude Code fold.

export const DEVICE_ROOMS = [
  {
    key: 'first', room: 'Switch on first',
    why: 'Before anything else, and give them five minutes. Nothing here has an address.',
    devices: [
      { key: 'router', name: 'The router', machine: 'The house wifi', what: 'Every phone and screen needs only the wifi. The brain, the Hue bridge, both Nanoleaf controllers and the string lights have fixed addresses on it.', start: ['Switch it on first.'] },
      { key: 'lights', name: 'The Hue bulb, the two Nanoleaf controllers and the string lights', machine: 'The hall light, the Study walls and the Orangerie lights', what: 'The bulb outside the bedroom goes red at the start and green when the door opens. The walls are Granolia’s Lightbulb Moment. The Holiday String Lights mirror Get Off My Lawn!, if they answer the brain. Nothing waits on a light.', start: ['Switch them on with the router.'] },
      { key: 'huebridge', name: 'The Hue bridge', machine: 'The small box the hall bulb listens to', what: 'The brain talks to the hall bulb and recalls the four Hue scenes through it. Without it the lights never change, though the TV still says when the door is open.', start: ['Switch it on with the router. It stays plugged into the router by its cable.'] },
    ],
  },
  {
    key: 'brain', room: 'The whole house',
    why: 'Runs every sound, the music and the lights for every room. The game itself lives on the internet, so nothing waits on this.',
    devices: [
      {
        key: 'brain', name: 'The brain', machine: 'Jon’s M3 MacBook Air',
        what: 'Plays every sound and the three playlists through the speakers, ducks the music under the news, recalls the Hue scenes, turns the hall light red and green, and mirrors Salem’s colours to the string lights. It is also the spare host if your phone dies.',
        start: [
          'Network cable in, sleep off.',
          'Double-click Start the brain on its desktop. A window opens and stays open all night.',
        ],
        alive: 'Its window prints a line and waits. When the night begins the bulb outside the bedroom goes red. If it lists missing sounds and stops, tell Claude Code.',
        tech: 'The desktop button Start the brain (card 475) runs, in the Murderwin folder, in a Terminal window Jon can see: cd cues && npm start. Until it exists, Claude Code runs that line. It stops and lists any of the ten sounds with no file in media/; node scripts/make-placeholder-sounds.mjs makes a stand-in tone for each.',
      },
      {
        key: 'speakers', name: 'The speakers', machine: 'Four HomePods in one AirPlay group',
        what: 'Every sound cue, bulletin 2 at supper and the music, played by the brain through all four: the Entryway, the Study, the Orangerie and the fourth in the Parlour.',
        start: ['Switched on, and the AirPlay group of all four picked as the brain’s sound output.'],
        alive: 'Ask Claude Code to play a test chime: it comes out of all four.',
        tech: 'On the brain, in the Murderwin folder: afplay media/chime-news.wav (or .m4a or .mp3, whichever is there).',
      },
    ],
  },
  {
    key: 'living', room: 'The Parlour',
    why: 'Where Sir Irwin lives and everyone gathers.',
    devices: [
      {
        key: 'living', name: 'The Parlour screen', machine: 'Jon’s work MacBook Pro on the TV', kiosk: 'living',
        what: 'All night: the rules deck in Act 1 (in a second browser tab: switch back to the game before the blackout), the blackout, bulletin 1, Sir Irwin’s prompts while guests wait in Acts 2 and 4, the Act 4 title card, Sir Irwin’s countdown, Sir Irwin Needs a Hand, the board, the ballot and the reveal. The room taps its drawing guesses here.',
        start: ['Open the address in a browser, full screen.', 'Tap anywhere once to wake it, so it can play sound and video. Then leave it within reach: the room taps its guesses here in Act 6.'],
        alive: 'The crest and a waiting line. The dot in the bottom left corner is green.',
      },
    ],
  },
  {
    key: 'study', room: 'The Study',
    why: 'Granolia’s room upstairs: her cat room in Act 2, Granolia’s Lightbulb Moment in Act 4.',
    devices: [
      {
        key: 'study', name: 'The study screen and station', machine: 'M1 MacBook Air, with the Stream Deck on USB', kiosk: 'study',
        what: 'The light puzzle on the Nanoleaf walls, the button box, and Granolia’s screen. Ten minutes a group.',
        start: [
          'Save the study key word at the top of the Game test tab, once: it is kept from night to night.',
          'Quit the Elgato app on this Mac.',
          'Double-click Start the study on its desktop. A window opens and stays open all night.',
          'Open the address in a browser, full screen, and tap once to wake it.',
        ],
        alive: 'The station’s window says the study station is up, with the number of panels on each wall. DOWN beside a wall means the puzzle runs on the screen instead; the clue still lands.',
        tech: 'STATION_KEY in station/.env must match the saved key word. The desktop button Start the study (card 475) runs, in the Murderwin folder: cd station && npm start. Until it exists, Claude Code runs that line.',
      },
    ],
  },
  {
    key: 'orangerie', room: 'The Orangerie',
    why: 'Salem’s room, the screened back patio: supper in Act 3, Get Off My Lawn! in Act 4 (on the guests’ own phones).',
    devices: [
      {
        key: 'ipad', name: 'The captions iPad', machine: 'Jon’s iPad Pro, on a stand', kiosk: 'ipad',
        what: 'Keeps the words of W-O-O-F News bulletins 1 and 2 up through supper. In Act 4 it moves to the Entryway as Boo’s camera (see the Entryway), or stays a spare screen.',
        start: ['Open the address in Safari, full screen.', 'Tap anywhere once to wake it.'],
        alive: 'The crest and a waiting line. The dot in the bottom left corner is green.',
      },
    ],
  },
  {
    key: 'puzzle', room: 'The Library',
    why: 'Zimothy’s room, the real dining room: In Duplicate in Act 4, and the paper roll for the drawing in Act 6.',
    devices: [
      {
        key: 'memory', name: 'The memory match', machine: 'The older iPad, on its small stand', kiosk: 'memory',
        what: 'In Duplicate: three boards of 7, 10 and 14 pairs, all fourteen traces. Clearing all three crosses one motive off for the group. It stays here all night and waits for each group.',
        start: ['Open the address in Safari, full screen.', 'Tap anywhere once to wake it.'],
        alive: 'In Duplicate and a waiting line.',
      },
    ],
  },
  {
    key: 'entryway', room: 'The Entryway',
    why: 'Boo’s room, the front hall: Boo’s Catwalk in Act 4, projected on the triangle wall above the Parlour opening.',
    devices: [
      {
        key: 'boo', name: 'Boo’s wall', machine: 'Susan’s work MacBook Pro and the projector, on the upstairs landing', kiosk: 'boo',
        what: 'Idle until Act 4. Boo struts, the music stops, the group strikes a pose, and she judges it. After Act 4 this MacBook moves to the bedroom.',
        start: ['Plug it into the projector with the short HDMI cable and aim at the triangle wall.', 'Open the address in a browser, full screen, and tap once to wake it, so the music can play.'],
        alive: 'Boo on the wall and a waiting line.',
      },
      {
        key: 'pose', name: 'Boo’s camera (nice to have)', machine: 'Jon’s iPad Pro, on its stand at the end of the catwalk, facing the group, Act 4 only', kiosk: 'pose',
        what: 'Shows the group to itself like a mirror and takes one photo of each group’s last pose for the end credits. Without it the catwalk runs the same and the credits have no photos.',
        start: ['After supper, carry the iPad Pro from the Orangerie and stand it facing the catwalk.', 'Open the address in Safari, full screen, and tap Turn on the camera. Allow the camera when the iPad asks.'],
        alive: 'The room on the screen, like a mirror, and a waiting line.',
      },
    ],
  },
  {
    key: 'bedroom', room: 'The bedroom',
    why: 'Behind the closed door until the third drawing is named in Act 6.',
    devices: [
      {
        key: 'bedroom', name: 'The bedroom screen', machine: 'Susan’s work MacBook Pro, moved in after Act 4', kiosk: 'bedroom',
        what: 'Nothing until the third drawing is named, then what was left behind, at the same moment Sir Irwin\'s last slide comes up on the TV.',
        start: ['After Act 4, carry it in from the landing and open the address in a browser, full screen.', 'Tap anywhere once to wake it. Close the bedroom door.'],
        alive: 'The crest and a waiting line. The dot in the bottom left corner is green.',
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
        key: 'memoryplay', name: 'In Duplicate, just for fun', machine: 'Any iPad or computer, any day', kiosk: 'memory', query: 'play=1',
        what: 'The memory match on its own: three boards, no case, no clues, nothing sent. For playing any time.',
        start: ['Open the address. Play again starts fresh boards.'],
      },
    ],
  },
]

export const DEVICES = DEVICE_ROOMS.flatMap(r => r.devices.map(d => ({ ...d, room: r.room })))

// The order to switch things on, on the day, in plain words (from
// docs/on-the-night.md, Start order).
export const SWITCH_ON = [
  'The router, the Hue bridge and bulb, both Nanoleaf controllers and the string lights. Give them five minutes.',
  'The brain: network cable in, sleep off, then double-click Start the brain on its desktop. When the night begins, the bulb outside the bedroom turns red.',
  'The party box, then your phone. On the Game night page, tick This is the party night. Then open the game on your phone, tap Host? Start the night and type your name. No red REHEARSAL band means the box worked.',
  'The study: on the M1 Air, quit the Elgato app and double-click Start the study on its desktop.',
  'The screens: the Parlour TV, the study screen, the captions iPad in the Orangerie, the older iPad in the Library, and Susan’s MacBook Pro by the projector on the landing. Open each address below, full screen, and tap once to wake it. The bedroom screen comes after Act 4.',
  'The rooms: the four room codes on the walls (none in the Parlour), the paper roll and markers in the Library, the Orangerie table set. Jenna packs the bags where nobody who plays can see.',
  'The guests: they scan the square code at the door, type their name and tap Allow. Watch the green dots fill in on your Host tab.',
]

// What to do when something dies, in plain words (docs/on-the-night.md,
// When something dies). Every room pays its reward at the chime anyway.
export const WHEN_ONE_DIES = [
  ['A guest’s phone', 'They tap their name on any other phone (the old iPhone 11 is for this). Their character, bag, clues and cats follow.'],
  ['Your phone', 'Tap your name on Susan’s phone or the old iPhone 11. The Host tab moves with you.'],
  ['The Parlour TV', 'Open the Parlour screen on the iPad Pro or on the brain, and put it by the TV.'],
  ['The bedroom screen', 'Nobody goes to the bedroom. Press Show the trace on the TV, under The Big Solve on the Host tab.'],
  ['The memory match iPad, Boo’s wall or the study station', 'Carry on. The group is paid at the chime anyway.'],
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
