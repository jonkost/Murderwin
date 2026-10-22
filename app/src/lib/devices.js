// Every device the night needs, room by room, not counting anyone's own
// phone (22 Oct 2026, Jon: "a link for each device I need to have ready for
// each room and overall game play"). Sources: docs/on-the-night.md (which
// Mac does what, the start order) and docs/room-screens.md (the room
// screens). Pure: tested by test/devices.test.mjs.
//
// A device with a `kiosk` opens the game at PLAY_URL?kiosk=<kiosk>, full
// screen. One with `plain: true` opens the game itself, as a spare phone.
// One with neither has no address: its `start` steps say how it comes up.
// `pending` says why an address does not work yet; `note` is anything still
// undecided about it.

export const DEVICE_ROOMS = [
  {
    key: 'first', room: 'Switch on first',
    why: 'Before anything else, and give them five minutes. Nothing here has an address.',
    devices: [
      { key: 'router', name: 'The router', machine: 'The house wifi', what: 'Every phone and screen needs only the wifi.', start: ['Switch it on first.'] },
      { key: 'lights', name: 'The Hue bulb and the two Nanoleaf controllers', machine: 'The hall light and the study walls', what: 'The bulb outside the bedroom goes red at the start and green when the door opens. The walls are the study puzzle.', start: ['Switch them on with the router.'] },
      { key: 'huebridge', name: 'The Hue bridge', machine: 'The small box the hall bulb listens to', what: 'The brain talks to the hall bulb through it. Without it the bulb never changes, though the TV still says when the door is open.', start: ['Switch it on with the router. It stays plugged into the router by its cable.'] },
    ],
  },
  {
    key: 'brain', room: 'The whole house',
    why: 'Runs the sounds and the hall light for every room. The game itself lives on the internet, so nothing waits on this.',
    devices: [
      {
        key: 'brain', name: 'The brain', machine: 'M3 MacBook Air',
        what: 'Plays every sound through the speakers and turns the hall light red and green. It is also the spare host if your phone dies.',
        start: [
          'Ethernet in, sleep off.',
          'Once, before the freeze, unless you have recorded all nine sounds: in Terminal, in the Murderwin folder, node scripts/make-placeholder-sounds.mjs. The brain will not start while any sound has no file.',
          'In a Terminal window you can see, in the Murderwin folder: cd cues && npm start',
        ],
        alive: 'The terminal prints a line and waits. When the night begins it prints [hall] red and the bulb goes red. If it lists missing sounds and stops, run the stand-in step above.',
      },
      {
        key: 'speakers', name: 'The speakers', machine: 'The AirPlay speaker group',
        what: 'Every sound cue, played by the brain.',
        start: ['Switched on, and picked as the brain’s sound output.'],
        alive: 'Open a second Terminal window on the brain, in the Murderwin folder, and type afplay media/chime-news.wav (use .m4a or .mp3 instead if that is what you recorded). The chime comes out of the speakers.',
      },
    ],
  },
  {
    key: 'living', room: 'The living room',
    why: 'Where everyone gathers: the news, Sir Irwin, the drawing, the ballot and the reveal.',
    devices: [
      {
        key: 'living', name: 'The TV', machine: 'Living room MacBook Pro on the TV', kiosk: 'living',
        what: 'The news in Act 2, Sir Irwin in Act 5, the drawing and the board in Act 6, the ballot clock and the reveal in Act 7.',
        start: ['Open the address in a browser, full screen.', 'Tap anywhere once to wake it, so it can make sounds. Then leave it alone.'],
        alive: 'The crest and a waiting line. The dot in the bottom left corner is green.',
      },
    ],
  },
  {
    key: 'bedroom', room: 'The bedroom',
    why: 'Behind the closed door until the third drawing is named in Act 6.',
    devices: [
      {
        key: 'bedroom', name: 'The bedroom screen', machine: 'Bedroom MacBook Pro', kiosk: 'bedroom',
        what: 'The door, then what was left behind.',
        start: ['Open the address in a browser, full screen.', 'Tap anywhere once to wake it. Close the bedroom door.'],
        alive: 'The crest and a waiting line. The dot in the bottom left corner is green.',
      },
    ],
  },
  {
    key: 'study', room: 'The study',
    why: 'Granolia’s room: the light puzzle in Act 4, and her cat room in Act 2.',
    devices: [
      {
        key: 'study', name: 'The study screen and station', machine: 'M1 MacBook Air, with the Stream Deck on USB', kiosk: 'study',
        what: 'The light puzzle on the Nanoleaf walls, the button box, and Granolia’s screen.',
        start: [
          'On your phone’s Host tab, under The study, type a key word of four letters or more and tap Save key.',
          'Put the same word in station/.env on this Mac. Quit the Elgato app.',
          'In Terminal: cd station && npm start',
          'Open the address in a browser, full screen, and tap once to wake it.',
        ],
        alive: 'The terminal prints study station up with the panel counts. DOWN beside a wall means the puzzle runs on the screen instead; the clue still lands.',
      },
    ],
  },
  {
    key: 'orangery', room: 'The orangery',
    why: 'Dinner in Act 3.',
    devices: [
      {
        key: 'ipad', name: 'The captions iPad', machine: 'The iPad Pro, on a stand', kiosk: 'ipad',
        what: 'Keeps the words of the news and the bulletin up through dinner, for anyone who missed the TV. It also shows the drawing.',
        note: 'Still to decide on the Timeline (Act 3, Phones down): the captions screen at dinner, or the spare phone only.',
        start: ['Open the address in Safari, full screen.', 'Tap anywhere once to wake it.'],
        alive: 'The crest and a waiting line. The dot in the bottom left corner is green.',
      },
    ],
  },
  {
    key: 'puzzle', room: 'The small puzzle station',
    why: 'Act 4: a group plays here while another group is in the study. Where it sits is still to pick (on the Timeline).',
    devices: [
      {
        key: 'memory', name: 'The memory match iPad', machine: 'The iPad Pro, moved here after dinner', kiosk: 'memory',
        note: 'The house has two iPads. The iPad Pro comes here after dinner (and does the captions at dinner too, if you choose that), and the older family iPad is the spare phone. Where this station sits is still to pick.',
        what: 'Turn two cards at a time and find the six pairs of traces. Clearing it crosses one motive off.',
        start: ['Open the address in Safari, full screen.', 'Tap anywhere once to wake it.'],
        pending: 'Not working yet: the memory match comes with the 21 October build. Until that is brought in, this address shows the living room screen.',
      },
    ],
  },
  {
    key: 'spares', room: 'Spares',
    why: 'Kept charged, for when something dies.',
    devices: [
      {
        key: 'spare', name: 'The spare phone', machine: 'The older family iPad', plain: true,
        what: 'A guest whose phone dies taps their name here and their character follows. Your own Host tab moves here the same way.',
        start: ['Open the address in Safari and leave it on the join screen.'],
      },
    ],
  },
]

export const DEVICES = DEVICE_ROOMS.flatMap(r => r.devices.map(d => ({ ...d, room: r.room })))

// The address a device opens, from the game's own address.
export function deviceUrl(base, device) {
  if (!base) return null
  if (device.kiosk) return `${base}${String(base).includes('?') ? '&' : '?'}kiosk=${device.kiosk}`
  if (device.plain) return base
  return null
}
