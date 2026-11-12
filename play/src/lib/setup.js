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
  { key: 'boo', room: 'The Entryway: Boo’s arcade', machine: 'Susan’s work MacBook Pro, in Chrome, with the big Stream Deck', kiosk: 'boo', when: 'All night',
    first: { label: 'First: connect the Stream Deck', kiosk: 'boo', query: 'play=1', note: 'Once, before the guests come. Quit the Stream Deck app, press Connect on the page that opens, then come back here and tap the button above.' } },
  { key: 'orangerie', room: 'The Orangerie', machine: 'Jon’s M3 MacBook Air (the brain), facing the table', kiosk: 'orangerie', when: 'All night' },
  { key: 'ipad', room: 'The Library: Zimothy’s code', machine: 'Jon’s iPad Pro', kiosk: 'ipad', when: 'Act 2, then on its stand in the Orangerie for supper' },
  { key: 'memory', room: 'The Library: In Duplicate', machine: 'Jon’s iPad Pro, back in the Library', kiosk: 'memory', when: 'Act 4' },
  { key: 'bedroom', room: 'The bedroom', machine: 'Jon’s iPad Pro', kiosk: 'bedroom', when: 'From Act 6' },
]

// A Mac with two displays (the Parlour's, the Study's): its other screen gets the crest page, so no desktop shows.
export const SECOND_DISPLAY = { key: 'decor', room: 'A second display', machine: 'Any Mac with two screens: its other screen', kiosk: 'decor', when: 'All night: the crest, the countdown, dark with the room' }

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
