// The setup page (/setup, which is /play/?setup=1; Jon, 11 Nov 2026: "the
// night setup is so difficult. I need it to be easy and clean"). One short
// address typed on every machine, then one tap on that machine's room. Pure,
// so play/test can read it. Setup words live here and only here: this page is
// used before the guests arrive (CLAUDE.md, no setup words in front of guests).
//
// `kiosk` is the room screen's name (main.jsx); `query` is added after it.
export const SETUP_ROOMS = [
  { key: 'living', room: 'The Parlour TV', machine: 'Jon’s work MacBook Pro, on the TV', kiosk: 'living', when: 'All night' },
  { key: 'study', room: 'The Study', machine: 'M1 MacBook Air, by the walls', kiosk: 'study', when: 'All night' },
  // under Boo's button, the Stream Deck line and its one button (12 Nov 2026, A11: screens/SetupDeck.jsx, lib/deckline.js)
  { key: 'boo', room: 'The Entryway: Boo’s arcade', machine: 'Susan’s work MacBook Pro, in Chrome, with the big Stream Deck', kiosk: 'boo', when: 'All night', deck: true },
  { key: 'orangerie', room: 'The Orangerie', machine: 'Jon’s M3 MacBook Air (the brain), facing the table', kiosk: 'orangerie', when: 'All night' },
  { key: 'ipad', room: 'The iPad', machine: 'Jon’s iPad Pro, carried room to room', kiosk: 'ipad', when: 'All night: it follows the night by itself' },
]

// The iPad's one page shows In Duplicate in Act 4 and the bedroom from the drawing on (12 Nov 2026, A10).
// These two addresses stay for any other device, under a fold on the setup page.
export const SETUP_SPARES = [
  { key: 'memory', room: 'In Duplicate, on another device', machine: 'Only if the iPad is busy or dead', kiosk: 'memory', when: 'Act 4' },
  { key: 'bedroom', room: 'The bedroom, on another device', machine: 'Only if the iPad is busy or dead', kiosk: 'bedroom', when: 'From Act 6' },
]

// A Mac with two displays (the Parlour's, the Study's): its other screen gets a page of its own, so no desktop
// shows. Since the evening of 12 Nov 2026 that page plays the screen saver (Jon: "I want to have this on the
// second screenes. I'll need a link to it in the game setup"), so each of the three is named for it: these are
// the links. It still counts down with the rest and goes dark with the room.
export const SECOND_DISPLAY = { key: 'decor', room: 'The screen saver: any other second screen', machine: 'Any Mac with two screens: its other screen', kiosk: 'decor', when: 'All night: the five faces crossing the screen; dark with the room' }

// A Mac's own screen beside its room screen (Jon, 11 Nov 2026: "a small something on the MacBook Air... and on the
// MacBook Pro screen as it's sitting next to the Parlour TV"). The screen saver too; its room's splash, smaller
// and calmer, only if a face picture will not load.
export const SECOND_DISPLAY_ROOMS = [
  { key: 'decor-living', room: 'The screen saver: the Parlour Mac’s own screen', machine: 'Jon’s work MacBook Pro, beside the TV', kiosk: 'decor', query: 'room=living', when: 'All night: the five faces crossing the screen; dark with the room' },
  { key: 'decor-study', room: 'The screen saver: the Study Mac’s own screen', machine: 'M1 MacBook Air, by the walls', kiosk: 'decor', query: 'room=study', when: 'All night: the five faces crossing the screen; dark with the room' },
]

// Nothing extra to open since 11 Nov 2026: the Parlour TV plays the intro video and the rules film by
// itself at The house rules, so there is no second tab.
export const SETUP_EXTRAS = []

export const SETUP_LAST_KEY = 'murderwin.setup.last'

// Is this the setup page? /play/?setup=1 (firebase.json sends /setup here).
export function setupParam(search = typeof window === 'undefined' ? '' : window.location.search) {
  return new URLSearchParams(search).has('setup')
}

// The address a room's button opens, from the play page's own base ('/play/').
export function setupHref(base, { kiosk, query = '' }) {
  return `${base}?kiosk=${kiosk}${query ? `&${query}` : ''}`
}
