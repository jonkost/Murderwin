import { useState } from 'react'
import Join from './screens/Join'
import Rest from './screens/Rest'
import Welcome from './screens/Welcome'
import { Questions, Ballot, Eliminate, EyesLock, ResultLock } from './screens/Windows'
import { Dark, Moment, Blackout, Prompt, Offline, PausedStrip, RehearsalBand } from './screens/Moments'
import { uiLines } from './lib/content'
import { slideTime } from './lib/screen'
import motivesSeed from '../../seed/motives.json'
import charactersSeed from '../../seed/characters.json'
import woofNews from '../../seed/woof-news.json'
import catLines from '../../seed/cat-lines.json'
import bagLines from '../../seed/bag-lines.json'
import { GAME_NAMES } from './lib/rooms'
import Relay, { RelayDone } from './screens/Relay'
import { Living, Bedroom, Study } from './screens/Kiosk'
import { MemoryRounds, MemoryStandalone, BooWall } from './screens/Rooms'
import { PoseCamera } from './screens/Pose'
import { HousePanel } from './screens/Host'
import { houseView } from './lib/house'
import { generateSet } from '../../functions/lib/relay-gen.js'
import Allow from './screens/Allow'
import { setFromAddress } from './lib/gametest'

// Design preview only: /play/?preview=<screen> renders a screen with sample
// data and no night. Nothing here is dealt by the game, nothing is sealed.
// Sample cards are stage directions in brackets, never content. The news,
// the bulletin and the cats' hints are lines from the open banks
// (seed/woof-news.json, seed/cat-lines.json), picked here by hand: no case
// is behind them.
//
// Room screens: kiosk-bedroom-closed, kiosk-bedroom-1 … 5, kiosk-ballot,
// kiosk-ballot-no-trace, kiosk-finale, kiosk-finale-awards, kiosk-finale-graph,
// kiosk-finale-leadin (a name pressed, its lead-in still playing), kiosk-finale-reveal,
// kiosk-finale-done, kiosk-finale-credits, kiosk-living-turn, kiosk-living-vote, kiosk-study,
// kiosk-study-fallback (full-bleed, as on the MacBooks), and the screens the
// beats name: kiosk-news, kiosk-bulletin, kiosk-irwin, kiosk-black,
// kiosk-board, kiosk-ipad, kiosk-living-done, kiosk-living-hold (Sir Irwin's
// door slide), kiosk-living-rules (slide 3 and its square), Sir Irwin's
// prompts and the Act 4 title (kiosk-prompts, kiosk-title), the memory match on
// the older iPad (kiosk-memory, kiosk-memory-clear, kiosk-memory-standalone) and
// Boo's wall (kiosk-boo, kiosk-boo-pose). A rehearsal night's band:
// kiosk-rehearsal, rehearsal. The Host tab's house panel: host-house,
// host-house-window, host-house-act2.
// Screens: doors, join, allow, welcome, lobby, rest, host, prompt, paused, blackout,
// then one per thing a phone is dealt: act1, orient, news, peek, wait, go,
// go-onmyway, later, testimony (a cat's hint and bag clue), back, questions,
// supper, dinner, warn, groups, room-study, room-salem, room-parlour, room-paid,
// roam, irwin, door, eliminate, ballot (a card on Now since 25 Oct 2026),
// ballot-sent, ballot-screen (the old full-screen shape), eyes and result-lock
// (Act 7's locks), result and reveal (Now at The End), clues, cats-friend, and
// the relay screens relay-walk … relay-done (relay-walk-host and relay-vote-host:
// the host's phone, with At the paper and the four names as buttons).
// questions&set=<base64url> shows one
// of the workshop's own Parlour Game sets instead of the sample.
// ?preview=tour walks all of them with a button.

// a fixed moment, like a real server timestamp — not Date.now() on every read
const PHASE_AT = Date.now()
const stamp = (ms) => ({ toMillis: () => ms })

const NIGHT = {
  nightId: 'preview', act: 2, beat: 'cat', phase: 'act', joinOpen: true,
  hosts: { jonathan: { name: 'Jon', key: 'jon' }, susan: { name: 'Susan', key: 'susan' } },
  roster: {
    jon: { name: 'Jon', characterId: 'prof-jonathan', bag: 3 }, jessa: { name: 'Jessa', characterId: 'rye', bag: 6 },
    jacob: { name: 'Jacob', characterId: 'arms', bag: 1 }, mari: { name: 'Mari', characterId: 'fume', bag: 8 },
  },
  phaseAt: stamp(PHASE_AT),
}
const SESSION = { nightId: 'preview', guestKey: 'jessa', guestName: 'Jessa', characterId: 'rye', bag: 6, status: 'active', affection: { irwin: 5, granolia: 4, boo: 2, zimothy: 3, salem: 4 }, cards: [] }
const CONTENT = {
  motives: motivesSeed.motives,
  characters: charactersSeed.characters.map(({ id, name, profession, gender, bio }) => ({ id, name, profession, gender, bio })),
  smalltalk: [{ cat: 'salem', text: 'Mind the hydrangeas. Somebody has already not minded them.' }],
  motive_notes: [{ text: 'MOTIVE 1: (A sample note. Someone ate the last slice and left the empty tin.)' }],
  npc_cards: [{ text: "SALEM CROOKNOG — the long-time groundskeeper. (A sample card.) He has kept the grounds for forty years and has the attitude to prove it. Trusting Salem: Most days, he's got it backwards, so flip whatever he tells you. Win him over and he might set it straight. Only a true friend gets it right every time." }],
  act_scripts: [{ act: 'act2', text: 'OBJECTIVE: Your phone will tell you where to go. Everything you learn now is for your ears only.' }],
}

// ---- sample cards, as the dealer would shape them ----
// one Cat Hint Line and one bag line each, from the open banks, filled the way the game fills them
const HINTS = {
  salem: catLines.salem.act2.food.wasnt,
  zimothy: catLines.zimothy.levels['2'].replace('[MOTIVE]', catLines.motiveNames['10']),
}
const BAGS = {
  salem: bagLines.act2.salem[2].replace('___', '(a clue word)'),
  zimothy: bagLines.act2.zimothy[2].replace('[sense]', 'touch'),
  ghost: bagLines.act4.salem[4].replace('___', '(a clue word)'),
}
const CARDS = {
  meet: { id: '1-meet-meet', act: 1, beat: 'meet', kind: 'notice', key: 'meet', title: 'The household', text: 'Five of them live here: four cats and the birthday boy. Open the Cats tab and see how each one stands with you tonight.', button: 'I have met them' },
  orient: { id: '2-orient-orient', act: 2, beat: 'orient', kind: 'notice', key: 'orient', title: 'Where things are', text: 'Your Reticule is the row of tabs at the bottom. Clues is where everything you are told will collect. Motives is the list of nineteen; cross off as you go. The cats are in Cats. The rules are in Rules.', button: 'Got it' },
  news: { id: '2-news-news', act: 2, beat: 'news', kind: 'notice', key: 'news', title: 'Eyes up', text: 'W-O-O-F News is on the big screen in the Parlour. Watch it. Your phone will tell you what to do when it is over.', button: 'I watched it' },
  peek: { id: '2-peek-peek', act: 2, beat: 'peek', kind: 'notice', key: 'peek', title: 'Your bag', text: "Before you go anywhere: take a quiet look inside your own bag. Don't show anyone yet. The Manor will call you to your first cat in a moment.", button: 'I have looked' },
  // every cat: its name, its room, its motive hint, its bag clue and the footer (23 Oct 2026)
  testimony: { id: '2-cat-cat-salem', act: 2, beat: 'cat', kind: 'testimony', cat: 'salem', catName: 'Salem Crooknog', room: 'the Orangerie', lines: [], hint: { text: HINTS.salem }, bag: { text: BAGS.salem }, saved: 'Saved to your Clues.' },
  testimony2: { id: '2-cat-cat-zimothy', act: 2, beat: 'cat', kind: 'testimony', cat: 'zimothy', catName: 'Zimothy Clawford, Esq.', room: 'the Library', lines: [], hint: { text: HINTS.zimothy }, bag: { text: BAGS.zimothy }, saved: 'Saved to your Clues.' },
  dinner: { id: '3-down-down', act: 3, beat: 'down', kind: 'notice', key: 'down', title: 'Supper', text: 'Phones down and charging. Bring your bag to the table: everyone may share now. Listen for the news.', button: 'Phone is down' },
  warn: { id: '4-warn-warn', act: 4, beat: 'warn', kind: 'notice', key: 'act4-warn', title: 'Two minutes!', text: "Two minutes! Supper's done. Keep your phone close. Behind Closed Doors is about to begin.", button: 'Got it' },
  // the Act 4 group card in the server's words (functions/lib/act4.js): portraits, character names, Locked in
  group: { id: '4-groups-group', act: 4, beat: 'groups', kind: 'group', group: 'g1', lockIn: true, title: "You're teamed up with Roger Arms and Ignatius Fume", text: 'From now on, only share with your group.',
    members: [{ key: 'jessa', name: 'Jessa', characterName: 'Dorothy Rye', characterId: 'rye' }, { key: 'jacob', name: 'Jacob', characterName: 'Roger Arms', characterId: 'arms' }, { key: 'mari', name: 'Mari', characterName: 'Ignatius Fume', characterId: 'fume' }] },
  library: { id: '4-room-library-g1', act: 4, beat: 'round2', kind: 'clue', room: 'library', cat: 'zimothy', catName: 'Zimothy Clawford, Esq.', title: 'From the Library', text: `Order. Restored. Strike number 9, “${motivesSeed.motives[8]?.rhyme}” from your list; it was not that. Invoice to follow.`, cross: 9, bag: { text: BAGS.ghost } },
  clue: { id: '4-round1-study-clue', act: 4, beat: 'round1', kind: 'clue', title: 'From the Study', placeholder: true, text: 'Something was left behind.', trace: { level: 4, trace: 'flour', label: null } },
  // the cake notice carries the Happy Birthday Irwin picture (cue 12, 25 Oct 2026; the phone draws it from `image`)
  roam: { id: '5-roam-roam', act: 5, beat: 'roam', kind: 'notice', key: 'roam', title: 'Cake', text: 'Cake in hand, go where you like. The bags may be talked about now, out loud, in any detail you can manage.', button: 'Cake acquired', image: 'birthday' },
  irwin: { id: '5-irwin-irwin', act: 5, beat: 'irwin', kind: 'notice', key: 'irwin', title: 'The chime', text: 'Sir Irwin has something to say. He will say it on the Parlour screen and nowhere else. Go to the Parlour.', button: 'On my way' },
  door: { id: '6-door-door', act: 6, beat: 'door', kind: 'notice', key: 'door', title: 'The door is open', text: 'The light in the hall is green. The bedroom screen is showing what was left behind. Go and look, then come back to the Parlour.', button: 'I have seen it' },
  eyes: { id: '7-reveal-eyes', act: 7, beat: 'reveal', kind: 'notice', key: 'eyes', title: 'Eyes on the screen', text: 'The truth is about to be read out. Watch the Parlour screen.', button: 'Watching' },
  award: { id: '3-award-2', act: 3, beat: 'down', kind: 'award', title: "Crooknog's Confidant", text: 'First to pet Salem.', button: 'Keep it' },
  result: { id: '7-result-result', act: 7, beat: 'result', kind: 'result', murderer: true, motive: false, victim: true, defaulted: false, picks: { murderer: 'Jacob', motive: 'A sneeze set free, for all to see', victim: 'Mari' } },
  role: { id: '2-power-role', act: 2, beat: 'orient', kind: 'role', text: 'The Manor has lost someone tonight. Nobody has noticed, and nobody knows why. Walk, talk, and play on. Name all three before the night is out.' },
}

const SET = [
  { q: 'Ice in orange juice?', choices: [{ k: 'a', text: 'Always' }, { k: 'b', text: 'Never' }] },
  { q: 'Pick a sock', choices: [{ k: 'a', text: 'Left' }, { k: 'b', text: 'Right' }] },
  { q: 'A pigeon with a tiny hat', choices: [{ k: 'a', text: 'Trust it' }, { k: 'b', text: 'Do not' }] },
]
// ?preview=questions&set=<base64url>: one of the workshop's own sets (the Game
// test tab's "See it on a phone"), shown as a phone shows a Parlour Game.
// Words only, never a lean (the workshop has none). Done starts it again;
// nothing is sent. A set that cannot be read shows the sample, and says so.
function QuestionsPreview() {
  const [from] = useState(() => setFromAddress(undefined, SET))
  const [at, setAt] = useState(() => Date.now())
  const w = { ...windowDoc('questions', 60000), opensAt: stamp(at), closesAt: stamp(at + 60000), mine: { kind: 'questions', beats: from.beats } }
  return (
    <>
      {from.note && <p className="preview-note" role="note">{from.note}</p>}
      <Questions key={at} w={w} nightId="preview" serverNow={() => Date.now()} onDone={() => setAt(Date.now())} />
    </>
  )
}

function windowDoc(kind, ms) {
  const host = kind === 'questions' ? { cat: 'boo', line: 'Choose carefully, darling. Everyone\'s watching. Mostly me.' }
    : kind === 'ballot' ? { cat: 'salem', line: 'Forty years I\'ve kept these grounds, and I\'ve never seen so many people trampling on them. Name the Murderer, the motive and the victim.' } : null
  return { id: `${kind}-preview`, kind, title: '', opensAt: stamp(PHASE_AT), closesAt: stamp(PHASE_AT + ms), settled: false, ...(host ? { host } : {}),
    mine: kind === 'questions' ? { kind, beats: SET } : { kind } }
}

// Relay previews: a throwaway set from a fixed seed, as the public doc would carry it.
const RELAY = generateSet(2026)
// Sir Irwin's first three slides as the server sends them, each with its own
// time; slide 3 carries the practice smiley's B1 square (public).
const SLIDES = [
  { title: GAME_NAMES.drawing.name, hook: GAME_NAMES.drawing.hook, text: "Hi! Hi! It's me, Sir Irwin! I smelled something important behind the bedroom door, but it's shut. I don't do doorknobs. Will you help me?" },
  { title: 'The idea', text: "The door has a lock with three secret pictures. It only opens when we name all three. I asked the cats. They're my best friends, and they said they'd help me. I think they're coming. But maybe you can help me too?" },
  { title: 'A turn', text: 'First I call a name. That person goes to the Library and faces the paper. Only THEN does the screen show the square, like this arc in B1.', cell: { label: 'B1', strokes: [{ kind: 'arc', from: [0, 0.5], to: [1, 0.5], bulge: -0.3 }] } },
].map(s => ({ ...s, ms: slideTime(s.text) }))
const DOOR_SLIDE = { title: 'The door', text: "Pawsome! The light by the door went from dark gray to... lighter gray! I think that means it's open! I don't really do colors. Let's go in!" }
function relayDoc(state) {
  const g = RELAY.grids[0]
  const base = { state, grid: 1, gridSize: 3, gridTurns: 9, gridDone: ['A1', 'C2'], turnIndex: 2, turnsTotal: 35,
    round: 'Round 1', drawerKey: 'jessa', drawerName: 'Iris DeVine', drawerCharacterId: 'devine', nextKey: 'jon', nextName: 'Prof. Jonathan Kostington', nextCharacterId: 'prof-jonathan', crossed: [], lastResult: null,
    timing: { slideMs: 9000 }, slides: SLIDES,
    startedAt: stamp(PHASE_AT), doorOpen: state === 'done', ...(state === 'done' ? { doorSlide: DOOR_SLIDE } : {}) }
  if (state === 'turn') return { ...base, cell: { label: g.order[2], strokes: g.cells[g.order[2]] }, turnEndsAt: stamp(Date.now() + 8000) }
  if (state === 'walk') return { ...base, walkEndsAt: stamp(Date.now() + 9000) }
  if (state === 'vote') return { ...base, options: [{ name: 'A smiley face' }, { name: 'A sun' }, { name: 'A clock' }, { name: 'A cookie' }] }
  if (state === 'intro') return { ...base, introEndsAt: stamp(Date.now() + SLIDES[2].ms - 2000) } // two seconds into slide 3
  if (state === 'lockout') return { ...base, options: g.options.map(cells => ({ size: 3, cells })), crossed: [1], lastResult: 'wrong', lockoutEndsAt: stamp(Date.now() + 9000) }
  return base
}

// Room-screen previews: the trace at each level, the ballot screen, the finale.
// the public trace doc, as the server shapes it by level: two unnamed pictures at 3, the name only at 5
const TRACE = (level) => ({
  level, placeholder: true, at: stamp(PHASE_AT),
  ...(level === 3 ? { images: ['iodine', 'ink'] } : { trace: 'ink', label: level === 5 ? 'Ink' : null }),
})
// the study station's state: `startedAt` is a plain number from the station's clock, not a Firestore stamp
const STUDY_LAYOUT = [11, 12, 13, 14, 15, 16, 17].map((id, i) => ({ id, x: (i % 4) * 100 + (i >= 4 ? 50 : 0), y: i >= 4 ? -90 : 0 }))
const STUDY_ROTATION = { groups: [
  { id: 'g1', members: [{ key: 'jessa', name: 'Jessa', characterName: 'Dorothy Rye' }, { key: 'jacob', name: 'Jacob', characterName: 'Roger Arms' }] },
  { id: 'g2', members: [{ key: 'jon', name: 'Jon', characterName: 'Professor Jonathan' }, { key: 'mari', name: 'Mari', characterName: 'Ignatius Fume' }] },
], studyOrder: ['g1', 'g2'], finished: {} }
const STUDY = (extra = {}) => ({
  state: 'reproducing', round: 1, pattern: 0, pairsLocked: 1, misses: 0, hint: null, entry: { colour: null, number: null }, outcome: null,
  startedAt: Date.now() - 4 * 60_000, finishedAt: null, warned: false, map: null, lines: null, revealed: null, groupId: 'g1',
  layout: STUDY_LAYOUT, elementsOk: true, linesOk: true, granolia: null, fallbackPattern: null, updatedAt: stamp(Date.now()), ...extra,
})
// the finale doc as the server shapes it: the reel and the graph on the clock, the names only as the host releases them
const NAMES = { murderer: { name: 'Jacob', characterName: 'Roger Arms' }, motive: { n: 4, rhyme: motivesSeed.motives[3]?.rhyme ?? 'A motive' }, victim: { name: 'Mari', characterName: 'Ignatius Fume' } }
// the closing W-O-O-F News bulletin as the server splits it: the parts before each card go up with that press
const CLOSING = woofNews.closing.parts.map(({ who, text, card }) => ({ who, text, ...(card ? { card } : {}) }))
const CLOSING_NEWS = { murderer: CLOSING.slice(0, 2), motive: CLOSING.slice(2, 3), victim: CLOSING.slice(3) }
const NAMED = (stage) => ['murderer', 'motive', 'victim'].slice(0, ['stats', 'murderer', 'motive', 'victim'].indexOf(stage))
const FINALE = (agoMs, stage = 'stats', extra = {}) => ({
  at: stamp(Date.now() - agoMs),
  stage,
  schedule: { stats: 0, awards: 34000, graph: 50000, names: 80000 },
  stats: [
    { label: 'Fastest light puzzle', value: 'Jon and Jessa, 6 min 12 s', showAt: 0 },
    { label: 'Time on the drawing', value: '17 min', showAt: 4000 },
    { label: 'Pictures that took more than one guess', value: 'Grid 2', showAt: 8000 },
    { label: 'Quickest on the Parlour Games', value: 'Jessa, 4 of 4', showAt: 12000 },
  ],
  // the early reel: only the achievements the host gave during the night
  achievements: [
    { name: 'Jessa', title: "Crooknog's Confidant", line: 'First to pet Salem.', showAt: 34000 },
    { name: 'Jon', title: 'Clean Plate Club', line: 'Nothing left, not even the garnish.', showAt: 37000 },
  ],
  credits: {
    // the end-credit awards, in the credits only
    awards: [
      { name: 'Jessa and Mari', title: "Granolia's Favorite", line: null },
      { name: 'Iris DeVine', title: "Sir Irwin's Favorite", line: 'He would share his toy with you. Not his good toy. But a toy.' },
    ],
    counters: [{ key: 'barks', label: 'Times Irwin barked', value: 412 }, { key: 'salemWrong', label: 'Times Salem was wrong', note: 'He disputes this number.', value: 61 }],
    splits: [{ q: 'Cake or pie?', a: { text: 'Cake', count: 6 }, b: { text: 'Pie', count: 3 } }],
    // Boo's Catwalk photos: on the night each is read from its own doc; here, a stand-in picture
    poses: [{ groupId: 'g1', names: ['Jessa', 'Mari'], image: `${import.meta.env.BASE_URL}portraits/rye.png` }, { groupId: 'g2', names: ['Jon', 'Susan', 'Jacob'], image: `${import.meta.env.BASE_URL}portraits/leech.png` }],
    thanks: ['Granolia Lickspittle', 'Miss Boo LaRue', 'Zimothy Clawford, Esq.', 'Salem Crooknog', 'Sir Irwin', 'Jon', 'Susan', 'Jenna', 'Jessa', 'Mari', 'Jacob'],
    memory: { line: 'In loving memory of Sydney, the original good boy', photo: 'household/sydney.jpg' },
    last: { cat: 'irwin', line: 'Can we play again?' },
  },
  news: Object.fromEntries(NAMED(stage).map(k => [k, CLOSING_NEWS[k]])),
  cardAt: Object.fromEntries(NAMED(stage).map(k => [k, stamp(Date.now() - 1000)])), // every card's lead-in has played
  graph: { points: [{ act: 2, role: 'ghost', delta: 3 }, { act: 2, role: 'murderer', delta: -2 }, { act: 4, role: 'ghost', delta: 1 }, { act: 4, role: 'murderer', delta: -4 }, { act: 6, role: 'ghost', delta: 4 }, { act: 6, role: 'murderer', delta: -1 }],
    running: [{ act: 2, value: 1 }, { act: 4, value: -2 }, { act: 6, value: 1 }], sides: { up: 'ghost', down: 'murderer' }, hush: false,
    clues: [{ label: 'The supper bulletin', level: 3 }, { label: "Sir Irwin's countdown", level: 2 }, { label: 'The study trace', level: 4 }, { label: 'The trace reveal', level: 3 }] },
  names: stage === 'stats' ? {} : stage === 'murderer' ? { murderer: NAMES.murderer } : stage === 'motive' ? { murderer: NAMES.murderer, motive: NAMES.motive } : NAMES,
  epilogue: stage === 'victim' ? `And so it was ${NAMES.murderer.name}. Not for money, not for love, for this: ${NAMES.motive.rhyme}. And ${NAMES.victim.name} never saw it coming.` : null,
  victimAt: stage === 'victim' ? stamp(Date.now() - (extra.sinceVictim ?? 20000)) : null,
  holdAt: null, held: 0,
  rehearsal: true,
  ...extra,
})
// the public screen doc, as the server shapes it (functions/lib/screen.js): kind, title, lines, never a secret
const SCREEN = (kind, extra = {}) => ({ kind, title: '', lines: [], at: stamp(PHASE_AT), holdMs: 0, rehearsal: true, act: 2, beat: 'news', captions: null, ...extra })
// W-O-O-F News from the open bank: bulletin 1 (the opening, one family line, the sign-off) and
// bulletin 2 (the opening, one family's line at level 3, the sign-off). Any family; no case behind it.
const NEWS_LINES = [woofNews.bulletin1.opening.text, woofNews.bulletin1.families.out.text, woofNews.bulletin1.signoff.text]
const BULLETIN = SCREEN('bulletin', { title: 'W-O-O-F News', act: 3, beat: 'bulletin',
  lines: [woofNews.bulletin2.opening.text, woofNews.bulletin2.families.screens[2].text, woofNews.bulletin2.signoff.text] })
// Sir Irwin in Act 5: his opener, the countdown line, the motives he names, his closer
const IRWIN = SCREEN('irwin', { title: 'Sir Irwin', act: 5, beat: 'irwin', mood: 3, lines: ['Oh! Everyone is here. I have something to say.', 'Ooh! It\'s one of these three! My tail is wagging, so I\'m pretty sure!', 'That is everything. I am a good boy.'],
  choices: [3, 12, 17].map(n => ({ n, rhyme: motivesSeed.motives[n - 1]?.rhyme })) })
// the memory match board as the server shapes it: twelve trace ids, no names
const MEMORY = (cleared = false) => ({ groupId: 'g1', boardId: 'g1-3', step: cleared ? 2 : 0, cleared, boards: { 0: ['ink', 'flour', 'coins', 'petals', 'seeds', 'coffee', 'glasses', 'coffee', 'ink', 'seeds', 'glasses', 'coins', 'flour', 'petals'], 1: [], 2: [] } })
const BOO = (offset) => ({ groupId: 'g1', state: 'show', startsAt: stamp(PHASE_AT - offset), poses: [{ strutAt: stamp(PHASE_AT - offset + 9000), poseAt: stamp(PHASE_AT - offset + 18000), holdUntil: stamp(PHASE_AT - offset + 23000), judgeUntil: stamp(PHASE_AT - offset + 29000), line: 'Bold. Wrong, but bold.' }], endsAt: stamp(PHASE_AT - offset + 29000) })
// nine guests with a strike each, two of them picked by the server for a silent phone: the board must not tell
const NINE = { ...NIGHT.roster, lee: { name: 'Lee', characterId: 'leech', bag: 2 }, ana: { name: 'Ana', characterId: 'devine', bag: 4 }, kit: { name: 'Kit', characterId: 'barnes', bag: 5 }, ren: { name: 'Ren', characterId: 'steeps', bag: 7 }, oli: { name: 'Oli', characterId: 'vayne', bag: 9 } }
const STRIKES = Object.fromEntries(Object.keys(NINE).map((k, i) => [k, i % 2 ? { kind: 'motive', n: (i * 3) % 19 + 1, name: NINE[k].name, at: stamp(PHASE_AT), ...(i === 1 ? { defaulted: true } : {}) } : { kind: 'person', key: Object.keys(NINE)[(i + 2) % 9], name: NINE[k].name, at: stamp(PHASE_AT), ...(i === 4 ? { defaulted: true } : {}) }]))
const KIOSK = {
  'kiosk-news': (night, serverNow) => <Living night={{ ...night, act: 2, beat: 'news' }} relay={null} trace={null} finale={null} screen={SCREEN('news', { title: 'W-O-O-F News', lines: NEWS_LINES })} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  // a rehearsal night: the red band across the top of a room screen
  'kiosk-rehearsal': (night, serverNow) => <><RehearsalBand on /><Living night={{ ...night, act: 2, beat: 'news' }} relay={null} trace={null} finale={null} screen={SCREEN('news', { title: 'W-O-O-F News', lines: NEWS_LINES })} content={CONTENT} serverNow={serverNow} nightId="preview" /></>,
  'kiosk-bulletin': (night, serverNow) => <Living night={{ ...night, act: 3, beat: 'bulletin' }} relay={null} trace={null} finale={null} screen={BULLETIN} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-irwin': (night, serverNow) => <Living night={{ ...night, act: 5, beat: 'irwin' }} relay={null} trace={null} finale={null} screen={IRWIN} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-black': (night, serverNow) => <Living night={{ ...night, act: 1, beat: 'ready', phase: 'blackout' }} relay={null} trace={null} finale={null} screen={SCREEN('black')} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-paused': (night, serverNow) => <Living night={{ ...night, phase: 'paused' }} relay={null} trace={null} finale={null} screen={SCREEN('black', { title: 'One moment' })} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-board': (night, serverNow) => <Living night={{ ...night, act: 6, beat: 'eliminate', roster: NINE, eliminations: STRIKES, window: { id: 'e', kind: 'eliminate', opensAt: stamp(Date.now()), closesAt: stamp(Date.now() + 90000), settled: false } }} relay={{ state: 'done', doorOpen: true }} trace={TRACE(3)} finale={null} screen={SCREEN('board', { title: 'The deduction round', act: 6, beat: 'eliminate' })} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-ipad': (night, serverNow) => <Living night={{ ...night, act: 3, beat: 'groups' }} relay={null} trace={null} finale={null} screen={SCREEN('idle', { title: 'Supper Is Served', act: 3, beat: 'groups', captions: { kind: 'bulletin', lines: BULLETIN.lines, at: stamp(PHASE_AT) } })} content={CONTENT} serverNow={serverNow} nightId="preview" captionsOnly />,
  'kiosk-living-done': (night, serverNow) => <Living night={{ ...night, act: 6, beat: 'door' }} relay={relayDoc('done')} trace={TRACE(3)} finale={null} screen={SCREEN('door', { title: 'The door is open', act: 6, beat: 'door', holdMs: 10000, at: stamp(Date.now() - 12000), lines: ['The light outside the bedroom is green. Go and see.'] })} cues={{ hall: 'green', tvTrace: true }} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-living-hold': (night, serverNow) => <Living night={{ ...night, act: 6, beat: 'door' }} relay={relayDoc('done')} trace={TRACE(3)} finale={null} screen={SCREEN('door', { title: 'The door is open', act: 6, beat: 'door', holdMs: 10000, at: stamp(Date.now()), lines: ['The light outside the bedroom is green. Go and see.'] })} cues={{ hall: 'green', tvTrace: true }} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-living-rules': (night, serverNow) => <Living night={{ ...night, act: 6 }} relay={relayDoc('intro')} trace={null} finale={null} screen={SCREEN('idle')} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-relay-called': (night, serverNow) => <Living night={{ ...night, act: 6 }} relay={relayDoc('walk')} trace={null} finale={null} screen={SCREEN('idle')} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-relay-square': (night, serverNow) => <Living night={{ ...night, act: 6 }} relay={relayDoc('turn')} trace={null} finale={null} screen={SCREEN('idle')} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-relay-guess': (night, serverNow) => <Living night={{ ...night, act: 6 }} relay={{ ...relayDoc('vote'), crossed: [2] }} trace={null} finale={null} screen={SCREEN('idle')} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-bedroom-closed': () => <Bedroom relay={null} trace={null} />,
  'kiosk-bedroom-1': () => <Bedroom relay={{ doorOpen: true }} trace={TRACE(1)} />,
  'kiosk-bedroom-2': () => <Bedroom relay={{ doorOpen: true }} trace={TRACE(2)} />,
  'kiosk-bedroom-3': () => <Bedroom relay={{ doorOpen: true }} trace={TRACE(3)} />,
  'kiosk-bedroom-4': () => <Bedroom relay={{ doorOpen: true }} trace={TRACE(4)} />,
  'kiosk-bedroom-5': () => <Bedroom relay={{ doorOpen: true }} trace={TRACE(5)} />,
  'kiosk-ballot': (night, serverNow) => <Living night={{ ...night, act: 7, window: { id: 'b', kind: 'ballot', opensAt: stamp(Date.now()), closesAt: stamp(Date.now() + 120000), settled: false } }} relay={{ state: 'done', doorOpen: true }} trace={TRACE(3)} finale={null} serverNow={serverNow} nightId="preview" />,
  'kiosk-ballot-no-trace': (night, serverNow) => <Living night={{ ...night, act: 7, window: { id: 'b', kind: 'ballot', opensAt: stamp(Date.now()), closesAt: stamp(Date.now() + 120000), settled: false } }} relay={null} trace={null} finale={null} serverNow={serverNow} nightId="preview" />,
  'kiosk-study': (night, serverNow) => <Study study={STUDY()} rotation={STUDY_ROTATION} serverNow={serverNow} />,
  'kiosk-memory': (night) => <MemoryRounds board={MEMORY()} night={{ ...night, act: 4 }} nightId="preview" />,
  'kiosk-memory-clear': (night) => <MemoryRounds board={MEMORY(true)} night={{ ...night, act: 4 }} nightId="preview" />,
  'kiosk-memory-standalone': () => <MemoryStandalone />,
  'kiosk-prompts': (night, serverNow) => <Living night={{ ...night, act: 2, beat: 'cat' }} relay={null} trace={null} finale={null} screen={SCREEN('prompts', { title: 'Sir Irwin has ideas', prompts: { lines: bagLines.prompts.lines, order: bagLines.prompts.lines.map((_, i) => i), startedAt: stamp(PHASE_AT), everyMs: 180000 } })} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-title': (night, serverNow) => <Living night={{ ...night, act: 4, beat: 'groups' }} relay={null} trace={null} finale={null} screen={SCREEN('title', { title: 'Act 4 · Behind Closed Doors', lines: ['Look at your phone and find your group.'], rehearsal: false })} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-boo': (night, serverNow) => <BooWall boo={BOO(12000)} night={{ ...night, act: 4 }} nightId="preview" serverNow={serverNow} />,
  'kiosk-boo-pose': (night, serverNow) => <BooWall boo={BOO(19000)} night={{ ...night, act: 4 }} nightId="preview" serverNow={serverNow} />,
  // Boo's camera on the Entryway iPad (?kiosk=pose): the camera waits for a tap
  'kiosk-pose': (night, serverNow) => <PoseCamera boo={BOO(19000)} nightId="preview" serverNow={serverNow} />,
  // the Host tab's house panel: station and screens alive, a group in the study, the hall light
  'host-house': (night) => {
    const n = { ...night, act: 4, beat: 'station2' }
    const presence = { 'kiosk-living': Date.now(), 'kiosk-bedroom': Date.now() - 5 * 60_000, 'kiosk-memory': Date.now(), cues: Date.now() }
    const house = houseView({ night: n, study: STUDY(), rotation: STUDY_ROTATION, presence, now: Date.now() })
    return <div className="host"><HousePanel house={house} cues={{ hall: 'red' }} night={n} busy={null} run={() => {}} /></div>
  },
  // the same with a Parlour Game open and no station in the room: a count of answers, nothing per guest
  'host-house-window': (night) => {
    const n = { ...night, act: 4, beat: 'station3', window: { id: 'q', kind: 'questions', title: 'Every phone lights up', opensAt: stamp(Date.now()), closesAt: stamp(Date.now() + 60000), settled: false, answered: 2 } }
    const house = houseView({ night: n, study: { state: 'absent', groupId: 'g2', slotEndsAt: stamp(Date.now() + 7 * 60_000), updatedAt: stamp(Date.now() - 9 * 60_000) }, rotation: STUDY_ROTATION, presence: { 'kiosk-living': Date.now() }, now: Date.now() })
    return <div className="host"><HousePanel house={house} cues={{ hall: 'red' }} night={n} busy={null} run={() => {}} /><p className="gloss">{house.answered.n} of {house.answered.of} have answered.</p></div>
  },
  // Act 2: the cat visits as a count, so the host knows when to press Next
  'host-house-act2': (night) => {
    const n = { ...night, act: 2, beat: 'cat', lightsProgress: { done: 3, total: 9 } }
    const house = houseView({ night: n, study: null, rotation: null, presence: { 'kiosk-living': Date.now(), 'kiosk-ipad': Date.now(), cues: Date.now() }, now: Date.now() })
    return <div className="host"><HousePanel house={house} cues={{ hall: 'red' }} night={n} busy={null} run={() => {}} /></div>
  },
  'kiosk-study-fallback': (night, serverNow) => <Study study={STUDY({ state: 'playing', elementsOk: false, layout: [1, 2, 3, 4, 5, 6].map((id, i) => ({ id, x: i * 100, y: 0 })), fallbackPattern: [2, 5, 2, 4] })} rotation={STUDY_ROTATION} serverNow={serverNow} />,
  'kiosk-finale': (night, serverNow) => <Living night={{ ...night, act: 7 }} relay={null} trace={TRACE(3)} finale={FINALE(2000)} serverNow={serverNow} nightId="preview" />,
  'kiosk-finale-awards': (night, serverNow) => <Living night={{ ...night, act: 7 }} relay={null} trace={TRACE(3)} finale={FINALE(38000)} serverNow={serverNow} nightId="preview" />,
  'kiosk-finale-graph': (night, serverNow) => <Living night={{ ...night, act: 7 }} relay={null} trace={TRACE(3)} finale={FINALE(55000)} serverNow={serverNow} nightId="preview" />,
  'kiosk-finale-journey': (night, serverNow) => <Living night={{ ...night, act: 7 }} relay={null} trace={TRACE(3)} finale={FINALE(200000, 'victim', { sinceVictim: 30000 })} serverNow={serverNow} nightId="preview" />,
  'kiosk-finale-credits': (night, serverNow) => <Living night={{ ...night, act: 7 }} relay={null} trace={TRACE(3)} finale={FINALE(200000, 'victim', { sinceVictim: 62000 })} serverNow={serverNow} nightId="preview" />,
  'kiosk-finale-last': (night, serverNow) => <Living night={{ ...night, act: 7 }} relay={null} trace={TRACE(3)} finale={FINALE(200000, 'victim', { sinceVictim: 130000 })} serverNow={serverNow} nightId="preview" />,
  'kiosk-finale-reveal': (night, serverNow) => <Living night={{ ...night, act: 7 }} relay={null} trace={TRACE(3)} finale={FINALE(90000, 'motive')} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  // the Motive just pressed: Mic's lead-in plays under the Murderer's card, and the Motive's card waits for it
  'kiosk-finale-leadin': (night, serverNow) => <Living night={{ ...night, act: 7 }} relay={null} trace={TRACE(3)} finale={FINALE(90000, 'motive', { cardAt: { murderer: stamp(Date.now() - 30000), motive: stamp(Date.now() + 60000) } })} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-finale-done': (night, serverNow) => <Living night={{ ...night, act: 7 }} relay={null} trace={TRACE(3)} finale={FINALE(120000, 'victim')} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  // the Victim's card is up: Mic's sign-off and the studio's close run under the three cards
  'kiosk-finale-victim': (night, serverNow) => <Living night={{ ...night, act: 7 }} relay={null} trace={TRACE(3)} finale={FINALE(120000, 'victim', { sinceVictim: 6000 })} content={CONTENT} serverNow={serverNow} nightId="preview" />,
  'kiosk-living-turn': (night, serverNow) => <Living night={{ ...night, act: 6 }} relay={relayDoc('turn')} trace={null} finale={null} serverNow={serverNow} nightId="preview" />,
  'kiosk-living-vote': (night, serverNow) => <Living night={{ ...night, act: 6 }} relay={relayDoc('vote')} trace={null} finale={null} serverNow={serverNow} nightId="preview" />,
}

// Act 2's next step, as the server writes it (functions/lib/deal.js lightsCard).
const ROOMS = { salem: ['Salem Crooknog', 'the Orangerie'], boo: ['Miss Boo LaRue', 'the Entryway'] }
const LIGHTS_WORDS = {
  wait: ['In the Parlour', "Make yourself at home in the Parlour. You'll be called soon. Sir Irwin has ideas on the TV."],
  later: ['Back in the queue', "No problem. You're back in the queue. We'll call you again."],
  go: ['Your turn', "[CAT] is waiting for you in [ROOM]. Go alone, and don't keep [THEM] waiting."],
  with: ['[CAT] is talking to you', 'Read what the cat says. It is for you alone. Tap Done when you have read it.'],
  done: ['Back to the Parlour', 'You have seen all four cats. Tell nobody what you heard. The chime will call everyone to supper in the Orangerie.'],
  supper: ['Supper is served', "That's the chime! Supper is served in the Orangerie."],
}
function LIGHTS(variant, cat = 'salem') {
  const [catName, room] = ROOMS[cat]
  const fill = t => t.replace(/\[CAT\]/g, catName).replace(/\[ROOM\]/g, room).replace(/\[THEM\]/g, cat === 'boo' ? 'her' : 'him')
  const step = variant === 'later' ? 'wait' : variant === 'supper' ? 'done' : variant
  return { step, variant, cat, catName, room, title: fill(LIGHTS_WORDS[variant][0]), text: fill(LIGHTS_WORDS[variant][1]), arrive: 'Find the code in the room and scan it to say hello.' }
}
// Act 4's step, as the server writes it (functions/lib/act4.js directGroups).
const ACT4 = {
  study: { room: 'study', cat: 'granolia', catName: 'Granolia Lickspittle', title: GAME_NAMES.study.name, hook: GAME_NAMES.study.hook, text: "Granolia's expecting your group in the Study, upstairs.", arrive: 'Find the code on the wall and scan it to begin.', round: 1, rounds: 4 },
  salem: { room: 'orangerie', cat: 'salem', catName: 'Salem Crooknog', title: GAME_NAMES.orangerie.name, hook: GAME_NAMES.orangerie.hook, text: 'Salem will see your group in the Orangerie. Bring your phones.', arrive: 'Find the code on the wall and scan it to begin.', round: 2, rounds: 4, chime: "That's the chime. Say goodbye and look at your phone.", here: true },
  parlour: { room: 'parlour', cat: null, title: 'In the Parlour', text: 'Nothing for your group right now. Make yourselves at home in the Parlour. Sir Irwin has ideas. Compare what the cats told you. Do they agree?', round: 3, rounds: 5 },
  paid: { room: 'library', cat: 'zimothy', catName: 'Zimothy Clawford, Esq.', title: GAME_NAMES.library.name, hook: GAME_NAMES.library.hook, text: 'Zimothy will see your group in the Library. Go together.', round: 2, rounds: 4, here: true, paid: true, paidText: 'Back to the Parlour until the chime.' },
}
const WAITING = { 'questions-4-p0': { kind: 'questions', waiting: true, title: 'Parlour Game', opensAt: stamp(PHASE_AT), beats: [
  { q: 'Ice in orange juice?', choices: [{ k: 'a', text: 'Always' }, { k: 'b', text: 'Never' }] },
  { q: 'Pick a sock', choices: [{ k: 'a', text: 'Left' }, { k: 'b', text: 'Right' }] },
  { q: 'A pigeon with a tiny hat', choices: [{ k: 'a', text: 'Trust it' }, { k: 'b', text: 'Do not' }] },
] } }

// Each dealt-card screen: the act it belongs to and the cards on the phone.
const DEALT = {
  act1: { act: 1, beat: 'meet', cards: [CARDS.meet] },
  orient: { act: 2, beat: 'orient', cards: [CARDS.role, CARDS.orient] },
  news: { act: 2, beat: 'news', cards: [CARDS.news] },
  peek: { act: 2, beat: 'peek', cards: [CARDS.peek] },
  wait: { act: 2, beat: 'cat', cards: [], lights: LIGHTS('wait') },
  go: { act: 2, beat: 'cat', cards: [], lights: LIGHTS('go') },
  'go-onmyway': { act: 2, beat: 'cat', cards: [], lights: LIGHTS('go'), seen: { 'onmyway-salem': true } },
  later: { act: 2, beat: 'cat', cards: [], lights: LIGHTS('later') },
  testimony: { act: 2, beat: 'cat', cards: [CARDS.testimony], lights: LIGHTS('with') },
  back: { act: 2, beat: 'cat', cards: [CARDS.testimony2, CARDS.testimony], lights: LIGHTS('done') },
  supper: { act: 2, beat: 'supper', cards: [CARDS.testimony2, CARDS.testimony], lights: LIGHTS('supper') },
  dinner: { act: 3, beat: 'down', cards: [CARDS.dinner] },
  award: { act: 3, beat: 'down', cards: [CARDS.award] },
  warn: { act: 4, beat: 'warn', cards: [CARDS.warn] },
  groups: { act: 4, beat: 'groups', cards: [CARDS.group] },
  'room-study': { act: 4, beat: 'round1', cards: [], act4: ACT4.study },
  'room-salem': { act: 4, beat: 'round2', cards: [], act4: ACT4.salem },
  'room-parlour': { act: 4, beat: 'round3', cards: [], act4: ACT4.parlour, windows: WAITING },
  'room-paid': { act: 4, beat: 'round2', cards: [CARDS.library], act4: ACT4.paid, windows: WAITING },
  roam: { act: 5, beat: 'roam', cards: [CARDS.roam] },
  irwin: { act: 5, beat: 'irwin', cards: [CARDS.irwin] },
  door: { act: 6, beat: 'door', cards: [CARDS.door] },
  // the reveal and the result lock the phone (eyes, result-lock, below); these two are what Now holds
  // once The End opens the phone up again (25 Oct 2026): the result stays, the eyes notice waits its tap
  reveal: { act: 7, beat: 'end', cards: [CARDS.eyes], over: true },
  result: { act: 7, beat: 'end', cards: [CARDS.result], over: true },
  clues: { act: 4, beat: 'round3', cards: [CARDS.testimony2, CARDS.testimony, CARDS.clue, CARDS.library], tab: 'clues' },
}

export const TOUR = ['doors', 'join', 'allow', 'welcome', 'lobby', 'act1', 'blackout', 'prompt-continue', 'prompt', 'orient', 'news', 'peek', 'wait', 'go', 'go-onmyway', 'later', 'testimony', 'back', 'questions', 'supper', 'dinner', 'warn', 'groups', 'room-study', 'room-salem', 'room-parlour', 'room-paid', 'award', 'roam', 'irwin', 'relay-walk', 'relay-walk-host', 'relay-draw', 'relay-turn', 'relay-vote', 'relay-vote-host', 'relay-lockout', 'relay-done', 'door', 'eliminate', 'ballot', 'ballot-sent', 'eyes', 'result-lock', 'result', 'reveal', 'clues', 'cats', 'cats-friend', 'host', 'paused', 'superseded']

export default function Preview({ screen }) {
  const ui = uiLines(CONTENT)
  const [act, setAct] = useState(NIGHT.act)
  const [step, setStep] = useState(0)
  const night = { ...NIGHT, act }
  const serverNow = () => Date.now()
  const which = screen === 'tour' ? TOUR[step] : screen
  const dealt = DEALT[which]
  try { localStorage.setItem('reticule-tab', dealt ? (dealt.tab ?? 'now') : which === 'host' ? 'host' : which === 'cats' || which === 'cats-act4' || which === 'cats-friend' ? 'cats' : 'you') } catch {}
  let body
  if (KIOSK[which]) return KIOSK[which](night, serverNow)
  switch (which) {
    case 'doors': body = <Moment text={ui.DOORS} crest />; break
    case 'welcome': body = <Welcome uid="preview" session={SESSION} content={CONTENT} ui={ui} onDone={() => {}} />; break
    case 'questions': body = <QuestionsPreview />; break
    // the ballot as a card on Now (25 Oct 2026, cue 19), then the small card once this phone has sent its three
    case 'ballot': body = <Rest uid="preview" night={{ ...night, act: 7, beat: 'ballot' }} session={SESSION} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} ballot={{ w: windowDoc('ballot', 120000), sent: false, onDone: () => {}, clock: serverNow }} />; break
    case 'ballot-sent': body = <Rest uid="preview" night={{ ...night, act: 7, beat: 'ballot' }} session={SESSION} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} ballot={{ w: windowDoc('ballot', 120000), sent: true, onDone: () => {}, clock: serverNow }} />; break
    case 'ballot-screen': body = <Ballot w={windowDoc('ballot', 120000)} night={{ ...night, act: 7 }} session={SESSION} content={CONTENT} nightId="preview" serverNow={serverNow} />; break
    // Act 7's locks (cues 20 to 22): eyes on the screen through the reveal; the result with a thank-you through the credits
    case 'eyes': body = <EyesLock />; break
    case 'result-lock': body = <ResultLock card={CARDS.result} />; break
    case 'eliminate': body = <Eliminate w={windowDoc('eliminate', 90000)} night={{ ...night, act: 6 }} session={SESSION} content={CONTENT} nightId="preview" serverNow={serverNow} />; break
    case 'relay-walk': body = <Relay uid="preview" night={night} session={{ ...SESSION, guestKey: 'jon' }} relay={relayDoc('walk')} serverNow={serverNow} />; break
    // the host's phone (25 Oct 2026): At the paper under the walk's bar, the four names as buttons at the guess; nightId 'preview' keeps them inert
    case 'relay-walk-host': body = <Relay uid="preview" night={night} session={{ ...SESSION, host: 'jonathan' }} relay={relayDoc('walk')} serverNow={serverNow} />; break
    case 'relay-vote-host': body = <Relay uid="preview" night={night} session={{ ...SESSION, host: 'jonathan' }} relay={{ ...relayDoc('vote'), crossed: [2] }} serverNow={serverNow} />; break
    case 'relay-turn': body = <Relay uid="preview" night={night} session={{ ...SESSION, guestKey: 'jon' }} relay={relayDoc('turn')} serverNow={serverNow} />; break
    case 'relay-draw': body = <Relay uid="preview" night={night} session={{ ...SESSION, guestKey: 'jessa' }} relay={relayDoc('turn')} serverNow={serverNow} />; break
    case 'relay-vote': body = <Relay uid="preview" night={night} session={SESSION} relay={relayDoc('vote')} serverNow={serverNow} />; break
    case 'relay-lockout': body = <Relay uid="preview" night={night} session={SESSION} relay={relayDoc('lockout')} serverNow={serverNow} />; break
    case 'relay-done': body = <RelayDone uid="preview" relay={relayDoc('done')} seenKey="x" />; break
    case 'join': body = <Join night={night} ui={ui} />; break
    case 'allow': body = <Allow uid="preview" onDone={() => {}} />; break
    case 'superseded': body = <Join night={night} ui={ui} notice={ui.SUPERSEDED} />; break
    case 'paused': body = <Moment text={ui.PAUSED} crest />; break
    case 'blackout': body = <Blackout />; break
    // after the blackout (25 Oct 2026): the one button, then the role card with no button
    case 'prompt-continue': body = <Prompt uid="preview" night={night} ui={ui} serverNow={serverNow} promptKey="prompt-2" stage="continue" card={CARDS.role} notes={null} />; break
    case 'prompt': body = <Prompt uid="preview" night={night} ui={ui} serverNow={serverNow} promptKey="prompt-2" stage="card" card={CARDS.role} notes={null} />; break
    case 'prompt-late': body = <Prompt uid="preview" night={night} ui={ui} serverNow={serverNow} promptKey="prompt-2" stage="card" card={null} notes={null} />; break
    case 'you': body = <Rest uid="preview" night={night} session={{ ...SESSION, cards: [CARDS.role] }} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} />; break
    case 'offline': body = <><Offline ui={ui} seconds={47} /><Rest uid="preview" night={night} session={SESSION} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} /></>; break
    case 'paused-window': body = <><PausedStrip ui={ui} /><div className="paused-shell" inert><Questions w={windowDoc('questions', 60000)} nightId="preview" serverNow={() => PHASE_AT + 20000} /></div></>; break
    case 'cats-act4': body = <Rest uid="preview" night={{ ...night, act: 4, beat: 'station2' }} session={{ ...SESSION, affection: { irwin: 5, granolia: 4, boo: 1, zimothy: 3, salem: 2 }, groupAffection: { granolia: 2, boo: 3, zimothy: 4, salem: 4 } }} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} />; break
    case 'host': body = <Rest uid="preview" night={{ ...night, act: 4, beat: 'station2', window: { id: 'q', kind: 'questions', title: 'Every phone lights up', opensAt: stamp(PHASE_AT), closesAt: stamp(PHASE_AT + 60000), settled: false } }} session={{ ...SESSION, guestKey: 'jon', characterId: 'prof-jonathan', bag: 3, host: 'jonathan' }} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} />; break
    case 'cats': body = <Rest uid="preview" night={night} session={{ ...SESSION, affection: { irwin: 5, granolia: 4, boo: 1, zimothy: 3, salem: 2 } }} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} />; break
    // a True Friend of the Groundskeeper: tap Salem to read the honour again at the top of his row
    case 'cats-friend': body = <Rest uid="preview" night={night} session={{ ...SESSION, affection: { irwin: 5, granolia: 4, boo: 1, zimothy: 3, salem: 5 }, salemFriend: true }} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} />; break
    // a rehearsal night: the red band across the top of the phone
    case 'rehearsal': body = <><RehearsalBand on /><Rest uid="preview" night={{ ...night, rehearsal: true }} session={SESSION} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} /></>; break
    case 'lobby': body = <Rest uid="preview" night={{ ...night, act: 0, phase: 'lobby' }} session={SESSION} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} />; break
    default:
      if (dealt) {
        body = (
          <Rest uid="preview" night={{ ...night, act: dealt.act, beat: dealt.beat, rehearsal: true, over: dealt.over || undefined, eliminations: dealt.act === 6 ? { jon: { kind: 'motive', n: 4, name: 'Jon', at: stamp(PHASE_AT) } } : undefined }}
            session={{ ...SESSION, cards: dealt.cards, lights: dealt.lights, act4: dealt.act4, windows: dealt.windows, group: 'g1' }} content={CONTENT} notes={{ seen: dealt.seen ?? {} }} ui={ui} serverNow={serverNow} onTour={() => {}} over={!!dealt.over} />
        )
      } else {
        body = (
          <>
            <Rest uid="preview" night={night} session={{ ...SESSION, characterId: previewCharacter() || SESSION.characterId }} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} />
            <button className="preview-act" onClick={() => setAct(a => (a % 7) + 1)} title="Next act (preview only)">act {act} ▸</button>
          </>
        )
      }
  }
  if (screen !== 'tour') return body
  return (
    <>
      {body}
      <div className="preview-tour">
        <button onClick={() => setStep(s => (s - 1 + TOUR.length) % TOUR.length)} aria-label="Previous screen">◂</button>
        <span>{which} · {step + 1}/{TOUR.length}</span>
        <button onClick={() => setStep(s => (s + 1) % TOUR.length)} aria-label="Next screen">▸</button>
      </div>
    </>
  )
}

// /play/?preview=rest&character=leech shows that character's card instead.
function previewCharacter() {
  try { return new URLSearchParams(window.location.search).get('character') } catch { return null }
}

export function previewScreen() {
  try { return new URLSearchParams(window.location.search).get('preview') } catch { return null }
}
