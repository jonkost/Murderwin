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
          'Ethernet in, sleep off.',
          'Once, unless you have recorded all ten sounds: in Terminal, in the Murderwin folder, node scripts/make-placeholder-sounds.mjs. The brain will not start while any sound has no file.',
          'In a Terminal window you can see, in the Murderwin folder: cd cues && npm start',
        ],
        alive: 'The terminal prints a line and waits. When the night begins it prints [hall] red and the bulb goes red. If it lists missing sounds and stops, run the stand-in step above.',
      },
      {
        key: 'speakers', name: 'The speakers', machine: 'Four HomePods in one AirPlay group',
        what: 'Every sound cue and the music, played by the brain: the Entryway, the Study, the Orangerie (bulletin 2 plays there at supper) and the fourth in the Parlour.',
        start: ['Switched on, and the AirPlay group picked as the brain’s sound output.'],
        alive: 'Open a second Terminal window on the brain, in the Murderwin folder, and type afplay media/chime-news.wav (use .m4a or .mp3 instead if that is what you recorded). The chime comes out of the speakers.',
      },
    ],
  },
  {
    key: 'living', room: 'The Parlour',
    why: 'The living room, where Sir Irwin lives and everyone gathers.',
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
    key: 'orangery', room: 'The Orangerie',
    why: 'Salem’s room, the screened back patio: supper in Act 3, Get Off My Lawn! in Act 4 (on the guests’ own phones).',
    devices: [
      {
        key: 'ipad', name: 'The captions iPad', machine: 'Jon’s iPad Pro, on a stand', kiosk: 'ipad',
        what: 'Keeps the words of W-O-O-F News bulletins 1 and 2 up through supper. In Act 4 it is a spare screen.',
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

// The address a device opens, from the game's own address.
export function deviceUrl(base, device) {
  if (!base) return null
  if (device.kiosk) return `${base}${String(base).includes('?') ? '&' : '?'}kiosk=${device.kiosk}${device.query ? `&${device.query}` : ''}`
  if (device.plain) return base
  return null
}
