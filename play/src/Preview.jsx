import { useState } from 'react'
import Join from './screens/Join'
import Rest from './screens/Rest'
import Welcome from './screens/Welcome'
import { Questions, Ballot, Eliminate } from './screens/Windows'
import { Dark, Moment, Blackout, Prompt, Offline, PausedStrip } from './screens/Moments'
import { uiLines } from './lib/content'
import motivesSeed from '../../seed/motives.json'
import charactersSeed from '../../seed/characters.json'
import Relay, { RelayDone } from './screens/Relay'
import { Living, Bedroom, Study } from './screens/Kiosk'
import { generateSet } from '../../functions/lib/relay-gen.js'

// Design preview only: /play/?preview=<screen> renders a screen with sample
// data and no night. Nothing here is dealt by the game, nothing is sealed.
// Sample cards are stage directions in brackets, never content.
//
// Room screens: kiosk-bedroom-closed, kiosk-bedroom-1 … 5, kiosk-ballot,
// kiosk-ballot-no-trace, kiosk-finale, kiosk-finale-graph, kiosk-finale-reveal,
// kiosk-finale-done, kiosk-living-turn, kiosk-living-vote, kiosk-study,
// kiosk-study-fallback (full-bleed, as on the MacBooks).
// Screens: doors, join, welcome, lobby, rest, host, prompt, paused, blackout,
// then one per thing a phone is dealt: act1, orient, news, go, testimony,
// deflect, puzzle, document, questions, checkin, dinner, groups, study, cat,
// bags, puzzle4, checkin4, roam, irwin, door, eliminate, ballot, reveal,
// result, clues, and the relay screens relay-walk … relay-done.
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
  npc_cards: [{ text: 'SALEM CROOKSHANK — the long-time groundskeeper. (A sample card.) He has kept the grounds for forty years and has the attitude to prove it. Trusting Salem: The more he likes you, the more he will tell you. But liking you does not make him right.' }],
  act_scripts: [{ act: 'act2', text: 'OBJECTIVE: Your phone will tell you where to go. Everything you learn now is for your ears only.' }],
}

// ---- sample cards, as the dealer would shape them ----
const K = (text) => `(Rehearsal. ${text})`
const CARDS = {
  meet: { id: '1-meet-meet', act: 1, beat: 'meet', kind: 'notice', key: 'meet', title: 'The household', text: 'Five of them live here: four cats and the birthday boy. Open the Cats tab and see how each one stands with you tonight.', button: 'I have met them' },
  orient: { id: '2-orient-orient', act: 2, beat: 'orient', kind: 'notice', key: 'orient', title: 'Where things are', text: 'Your Reticule is the row of tabs at the bottom. Clues is where everything you are told will collect. Motives is the list of nineteen; cross off as you go. The cats are in Cats. The rules are in Rules.', button: 'Got it' },
  news: { id: '2-news-news', act: 2, beat: 'news', kind: 'notice', key: 'news', title: 'Eyes up', text: 'Something is on the big screen. Watch it. Your phone will tell you where to go when it is over.', button: 'I watched it' },
  go: { id: '2-cat-go', act: 2, beat: 'cat', kind: 'go', room: 'the scullery', cat: 'salem', catName: 'Salem Crookshank', text: 'Go to the scullery.' },
  testimony: { id: '2-cat-testimony', act: 2, beat: 'cat', kind: 'testimony', cat: 'salem', catName: 'Salem Crookshank', room: 'the scullery', outcome: 'full', placeholder: true,
    lines: ['Finally. Someone with the sense to consult the only competent investigator here.', K('Here Salem Crookshank says something true about what happened in the parlour at a quarter past six, in two or three sentences, with one detail only this cat would notice. The numbers that matter are 41, 17, 88.'), 'You are welcome.'] },
  deflect: { id: '2-cat-testimony', act: 2, beat: 'cat', kind: 'testimony', cat: 'boo', catName: 'Miss Boo LaRue', room: 'the parlour', outcome: 'deflect', placeholder: false, lines: ['No.'] },
  puzzle: { id: '2-puzzle-safe', act: 2, beat: 'puzzle', kind: 'puzzle', puzzle: 'safe', slots: 3, title: 'The safe', text: 'Three numbers open it. A cat gave them to you, in among everything else. Enter them in the order they were said.' },
  document: { id: '2-puzzle-safe-payout', act: 2, beat: 'puzzle', kind: 'document', template: 'Telegram', bigWord: 'REHEARSAL', placeholder: true,
    text: K('The document for this motive goes here: forty to sixty words of a receipt, a telegram or a notice, with one word printed large and one handwritten note in the margin.'), annotation: '(a handwritten note)' },
  checkin: { id: '2-checkin-checkin', act: 2, beat: 'checkin', kind: 'notice', key: 'checkin', title: 'Check-in', text: 'Read your clues once more. Cross off any motive you are sure of. Then go in to dinner.', button: 'Done' },
  dinner: { id: '3-down-down', act: 3, beat: 'down', kind: 'notice', key: 'down', title: 'Dinner', text: 'Phones down and charging. The radio is on. Listen for the crackle.', button: 'Phone is down' },
  group: { id: '3-groups-group', act: 3, beat: 'groups', kind: 'group', group: 'g1', title: 'You are with Jacob and Mari', text: 'Stay together. What you learn, you learn as a group; share it inside the group and nowhere else. Your phones will say where to go first.',
    members: [{ key: 'jessa', name: 'Jessa', characterName: 'Dorothy Rye' }, { key: 'jacob', name: 'Jacob', characterName: 'Roger Arms' }, { key: 'mari', name: 'Mari', characterName: 'Ignatius Fume' }] },
  study: { id: '4-station1-study', act: 4, beat: 'station1', kind: 'station', station: 'study', title: 'The study', text: 'Go up to the study. Touch any panel to begin. Granolia is in there somewhere; she helps. Fifteen minutes, then out, whatever happened.' },
  cat: { id: '4-station2-cat', act: 4, beat: 'station2', kind: 'station', station: 'cat', cat: 'granolia', catName: 'Granolia Lickspittle', title: 'A cat', text: 'Find Granolia Lickspittle. The cat talks to all of you at once.',
    testimony: { id: '4-station2-cat-testimony', act: 4, beat: 'station2', kind: 'testimony', cat: 'granolia', catName: 'Granolia Lickspittle', outcome: 'partial', placeholder: true, lines: ['Sit, sit. You will not believe.', K('Here Granolia Lickspittle says something true about what happened in the study at nearly seven, with one detail wrong.'), 'That is how I remember it, anyway.'] } },
  bags: { id: '4-station3-bags', act: 4, beat: 'station3', kind: 'station', station: 'bags', property: 'minty', title: 'The bags', text: 'Something minty is in two or three of the bags in this house. Ask people to open theirs. Narrow it down; nobody is accused here.' },
  puzzle4: { id: '4-station4-puzzle', act: 4, beat: 'station4', kind: 'station', station: 'puzzle', title: 'A small puzzle', sequence: ['star', 'circle', 'moon', 'cross'], text: 'Watch the four shapes, then tap them back in the same order. Do it together; argue if you must.' },
  checkin4: { id: '4-station5-checkin', act: 4, beat: 'station5', kind: 'station', station: 'checkin', title: 'Check-in', text: 'Sit down together. Read your clues out to each other. Cross off motives.' },
  clue: { id: '4-station1-study-clue', act: 4, beat: 'station1', kind: 'clue', title: 'From the study', placeholder: true, text: K('The study pays its clue out to every phone in the group here, when the three jewels are lit or the fifteen minutes are up.') },
  roam: { id: '5-roam-roam', act: 5, beat: 'roam', kind: 'notice', key: 'roam', title: 'Cake', text: 'Cake in hand, go where you like. The bags may be talked about now, out loud, in any detail you can manage.', button: 'Cake acquired' },
  irwin: { id: '5-irwin-irwin', act: 5, beat: 'irwin', kind: 'notice', key: 'irwin', title: 'The chime', text: 'Sir Irwin has something to say. He will say it on the living room screen and nowhere else. Go.', button: 'On my way' },
  door: { id: '6-door-door', act: 6, beat: 'door', kind: 'notice', key: 'door', title: 'The door is open', text: 'The light in the hall is green. The bedroom screen is showing what was left behind. Go and look, then come back to the living room.', button: 'I have seen it' },
  eyes: { id: '7-reveal-eyes', act: 7, beat: 'reveal', kind: 'notice', key: 'eyes', title: 'Eyes on the screen', text: 'The truth is about to be read out. Watch the living room screen.', button: 'Watching' },
  result: { id: '7-result-result', act: 7, beat: 'result', kind: 'result', murderer: true, motive: false, victim: true, defaulted: false, picks: { murderer: 'Jacob', motive: 'A sneeze set free, for all to see', victim: 'Mari' } },
  role: { id: '2-power-role', act: 2, beat: 'orient', kind: 'role', text: 'The Manor has lost someone tonight. Nobody has noticed, and nobody knows why. Walk, talk, and play on. Name all three before the night is out.' },
}

const SET = [
  { q: 'Ice in orange juice?', choices: [{ k: 'a', text: 'Always' }, { k: 'b', text: 'Never' }] },
  { q: 'Pick a sock', choices: [{ k: 'a', text: 'Left' }, { k: 'b', text: 'Right' }, { k: 'c', text: 'Neither' }] },
  { q: 'A pigeon with a tiny hat', choices: [{ k: 'a', text: 'Trust it' }, { k: 'b', text: 'Do not' }] },
]
function windowDoc(kind, ms) {
  return { id: `${kind}-preview`, kind, title: '', opensAt: stamp(PHASE_AT), closesAt: stamp(PHASE_AT + ms), settled: false,
    mine: kind === 'questions' ? { kind, cat: 'zimothy', catName: 'Zimothy Clawford, Esq.', beats: SET } : { kind } }
}

// Relay previews: a throwaway set from a fixed seed, as the public doc would carry it.
const RELAY = generateSet(2026)
function relayDoc(state) {
  const g = RELAY.grids[0]
  const base = { state, grid: 1, gridSize: 3, gridTurns: 9, gridDone: ['A1', 'C2'], turnIndex: 2, turnsTotal: 35,
    drawerKey: 'jessa', drawerName: 'Jessa', nextKey: 'jon', nextName: 'Jon', votesIn: 2, votesNeeded: 4, crossed: [], lastResult: null,
    startedAt: stamp(PHASE_AT), doorOpen: state === 'done' }
  if (state === 'turn') return { ...base, cell: { label: g.order[2], strokes: g.cells[g.order[2]] }, turnEndsAt: stamp(Date.now() + 8000) }
  if (state === 'walk') return { ...base, walkEndsAt: stamp(Date.now() + 9000) }
  if (state === 'vote') return { ...base, options: g.options.map(cells => ({ size: 3, cells })), voteEndsAt: stamp(Date.now() + 40000) }
  if (state === 'lockout') return { ...base, options: g.options.map(cells => ({ size: 3, cells })), crossed: [1], lastResult: 'wrong', lockoutEndsAt: stamp(Date.now() + 9000) }
  return base
}

// Room-screen previews: the trace at each level, the ballot screen, the finale.
// the public trace doc, as the server shapes it by level: no picture at 1, two unnamed at 2
const TRACE = (level) => ({
  level, placeholder: true, at: stamp(PHASE_AT),
  ...(level === 2 ? { images: ['iodine', 'ink'] } : {}),
  ...(level >= 3 ? { trace: 'ink', label: level >= 4 ? 'Ink' : null, context: level === 5 ? 'a splash of ink, still wet, beside the writing desk' : null } : {}),
})
// the study station's state: `startedAt` is a plain number from the station's clock, not a Firestore stamp
const STUDY_LAYOUT = [11, 12, 13, 14, 15, 16, 17].map((id, i) => ({ id, x: (i % 4) * 100 + (i >= 4 ? 50 : 0), y: i >= 4 ? -90 : 0 }))
const STUDY_ROTATION = { groups: [{ id: 'g1', members: [{ key: 'jessa', name: 'Jessa' }, { key: 'jacob', name: 'Jacob' }] }], studyOrder: ['g1'] }
const STUDY = (extra = {}) => ({
  state: 'reproducing', round: 1, pattern: 0, pairsLocked: 1, misses: 0, hint: null, entry: { colour: null, number: null }, outcome: null,
  startedAt: Date.now() - 4 * 60_000, finishedAt: null, warned: false, map: null, lines: null, revealed: null, groupId: 'g1',
  layout: STUDY_LAYOUT, elementsOk: true, linesOk: true, granolia: null, fallbackPattern: null, updatedAt: stamp(Date.now()), ...extra,
})
const REVEAL = { murderer: { key: 'jacob', name: 'Jacob', characterName: 'Roger Arms' }, motive: { n: 4, rhyme: motivesSeed.motives[3]?.rhyme ?? 'A motive' }, victim: { key: 'mari', name: 'Mari', characterName: 'Ignatius Fume' }, rehearsal: true, at: stamp(PHASE_AT) }
const FINALE = (agoMs) => ({
  at: stamp(Date.now() - agoMs),
  schedule: { stats: 0, graph: 35000, murderer: 65000, motive: 80000, victim: 95000, done: 110000 },
  stats: [
    { label: 'Fastest light puzzle', value: 'Jon and Jessa, 6 min 12 s' },
    { label: 'Time on the drawing', value: '17 min' },
    { label: 'Pictures that took more than one guess', value: 'Grid 2' },
  ],
  graph: { points: [{ act: 2, role: 'ghost', delta: 3 }, { act: 2, role: 'murderer', delta: -2 }, { act: 4, role: 'ghost', delta: 1 }, { act: 4, role: 'murderer', delta: -4 }, { act: 6, role: 'ghost', delta: 4 }, { act: 6, role: 'murderer', delta: -1 }],
    running: [{ act: 2, value: 1 }, { act: 4, value: -2 }, { act: 6, value: 1 }] },
  rehearsal: true,
})
const KIOSK = {
  'kiosk-bedroom-closed': () => <Bedroom relay={null} trace={null} />,
  'kiosk-bedroom-1': () => <Bedroom relay={{ doorOpen: true }} trace={TRACE(1)} />,
  'kiosk-bedroom-2': () => <Bedroom relay={{ doorOpen: true }} trace={TRACE(2)} />,
  'kiosk-bedroom-3': () => <Bedroom relay={{ doorOpen: true }} trace={TRACE(3)} />,
  'kiosk-bedroom-4': () => <Bedroom relay={{ doorOpen: true }} trace={TRACE(4)} />,
  'kiosk-bedroom-5': () => <Bedroom relay={{ doorOpen: true }} trace={TRACE(5)} />,
  'kiosk-ballot': (night, serverNow) => <Living night={{ ...night, act: 7, window: { id: 'b', kind: 'ballot', opensAt: stamp(Date.now()), closesAt: stamp(Date.now() + 120000), settled: false } }} relay={{ state: 'done', doorOpen: true }} trace={TRACE(3)} finale={null} serverNow={serverNow} nightId="preview" />,
  'kiosk-ballot-no-trace': (night, serverNow) => <Living night={{ ...night, act: 7, window: { id: 'b', kind: 'ballot', opensAt: stamp(Date.now()), closesAt: stamp(Date.now() + 120000), settled: false } }} relay={null} trace={null} finale={null} serverNow={serverNow} nightId="preview" />,
  'kiosk-study': (night, serverNow) => <Study study={STUDY()} rotation={STUDY_ROTATION} serverNow={serverNow} />,
  'kiosk-study-fallback': (night, serverNow) => <Study study={STUDY({ state: 'playing', elementsOk: false, layout: [1, 2, 3, 4, 5, 6].map((id, i) => ({ id, x: i * 100, y: 0 })), fallbackPattern: [2, 5, 2, 4] })} rotation={STUDY_ROTATION} serverNow={serverNow} />,
  'kiosk-finale': (night, serverNow) => <Living night={{ ...night, act: 7, reveal: REVEAL }} relay={null} trace={TRACE(3)} finale={FINALE(2000)} serverNow={serverNow} nightId="preview" />,
  'kiosk-finale-graph': (night, serverNow) => <Living night={{ ...night, act: 7, reveal: REVEAL }} relay={null} trace={TRACE(3)} finale={FINALE(40000)} serverNow={serverNow} nightId="preview" />,
  'kiosk-finale-reveal': (night, serverNow) => <Living night={{ ...night, act: 7, reveal: REVEAL }} relay={null} trace={TRACE(3)} finale={FINALE(82000)} serverNow={serverNow} nightId="preview" />,
  'kiosk-finale-done': (night, serverNow) => <Living night={{ ...night, act: 7, reveal: REVEAL }} relay={null} trace={TRACE(3)} finale={FINALE(120000)} serverNow={serverNow} nightId="preview" />,
  'kiosk-living-turn': (night, serverNow) => <Living night={{ ...night, act: 6 }} relay={relayDoc('turn')} trace={null} finale={null} serverNow={serverNow} nightId="preview" />,
  'kiosk-living-vote': (night, serverNow) => <Living night={{ ...night, act: 6 }} relay={relayDoc('vote')} trace={null} finale={null} serverNow={serverNow} nightId="preview" />,
}

// Each dealt-card screen: the act it belongs to and the cards on the phone.
const DEALT = {
  act1: { act: 1, beat: 'meet', cards: [CARDS.meet] },
  orient: { act: 2, beat: 'orient', cards: [CARDS.role, CARDS.orient] },
  news: { act: 2, beat: 'news', cards: [CARDS.news] },
  go: { act: 2, beat: 'cat', cards: [CARDS.go, CARDS.testimony] },
  testimony: { act: 2, beat: 'cat', cards: [CARDS.go, CARDS.testimony], seen: { '2-cat-go': true } },
  deflect: { act: 2, beat: 'cat', cards: [{ ...CARDS.go, cat: 'boo', catName: 'Miss Boo LaRue', room: 'the parlour' }, CARDS.deflect], seen: { '2-cat-go': true } },
  puzzle: { act: 2, beat: 'puzzle', cards: [CARDS.testimony, CARDS.puzzle], seen: { '2-cat-go': true } },
  document: { act: 2, beat: 'puzzle', cards: [CARDS.testimony, CARDS.puzzle, CARDS.document], seen: { '2-cat-go': true, '2-puzzle-safe': true } },
  checkin: { act: 2, beat: 'checkin', cards: [CARDS.testimony, CARDS.document, CARDS.checkin], seen: { '2-cat-go': true } },
  dinner: { act: 3, beat: 'down', cards: [CARDS.dinner] },
  groups: { act: 3, beat: 'groups', cards: [CARDS.group] },
  study: { act: 4, beat: 'station1', cards: [CARDS.study, CARDS.clue] },
  cat: { act: 4, beat: 'station2', cards: [CARDS.cat] },
  bags: { act: 4, beat: 'station3', cards: [CARDS.bags] },
  puzzle4: { act: 4, beat: 'station4', cards: [CARDS.puzzle4] },
  checkin4: { act: 4, beat: 'station5', cards: [CARDS.checkin4] },
  roam: { act: 5, beat: 'roam', cards: [CARDS.roam] },
  irwin: { act: 5, beat: 'irwin', cards: [CARDS.irwin] },
  door: { act: 6, beat: 'door', cards: [CARDS.door] },
  reveal: { act: 7, beat: 'reveal', cards: [CARDS.eyes] },
  result: { act: 7, beat: 'result', cards: [CARDS.result] },
  clues: { act: 4, beat: 'station5', cards: [CARDS.testimony, CARDS.document, CARDS.clue, CARDS.bags, { ...CARDS.cat.testimony }], tab: 'clues', seen: { '2-cat-go': true, '4-station3-bags': true } },
}

export const TOUR = ['doors', 'join', 'welcome', 'lobby', 'act1', 'blackout', 'prompt', 'orient', 'news', 'go', 'testimony', 'deflect', 'puzzle', 'document', 'questions', 'checkin', 'dinner', 'groups', 'study', 'cat', 'bags', 'puzzle4', 'checkin4', 'roam', 'irwin', 'relay-walk', 'relay-draw', 'relay-turn', 'relay-vote', 'relay-lockout', 'relay-done', 'door', 'eliminate', 'ballot', 'reveal', 'result', 'clues', 'cats', 'host', 'paused', 'superseded']

export default function Preview({ screen }) {
  const ui = uiLines(CONTENT)
  const [act, setAct] = useState(NIGHT.act)
  const [step, setStep] = useState(0)
  const night = { ...NIGHT, act }
  const serverNow = () => Date.now()
  const which = screen === 'tour' ? TOUR[step] : screen
  const dealt = DEALT[which]
  try { localStorage.setItem('reticule-tab', dealt ? (dealt.tab ?? 'now') : which === 'host' ? 'host' : which === 'cats' || which === 'cats-act4' ? 'cats' : 'you') } catch {}
  let body
  if (KIOSK[which]) return KIOSK[which](night, serverNow)
  switch (which) {
    case 'doors': body = <Moment text={ui.DOORS} crest />; break
    case 'welcome': body = <Welcome uid="preview" session={SESSION} content={CONTENT} ui={ui} onDone={() => {}} />; break
    case 'questions': body = <Questions w={windowDoc('questions', 60000)} nightId="preview" serverNow={serverNow} />; break
    case 'ballot': body = <Ballot w={windowDoc('ballot', 120000)} night={{ ...night, act: 7 }} session={SESSION} content={CONTENT} nightId="preview" serverNow={serverNow} />; break
    case 'eliminate': body = <Eliminate w={windowDoc('eliminate', 90000)} night={{ ...night, act: 6 }} session={SESSION} content={CONTENT} nightId="preview" serverNow={serverNow} />; break
    case 'relay-walk': body = <Relay uid="preview" night={night} session={{ ...SESSION, guestKey: 'jon' }} relay={relayDoc('walk')} serverNow={serverNow} />; break
    case 'relay-turn': body = <Relay uid="preview" night={night} session={{ ...SESSION, guestKey: 'jon' }} relay={relayDoc('turn')} serverNow={serverNow} />; break
    case 'relay-draw': body = <Relay uid="preview" night={night} session={{ ...SESSION, guestKey: 'jessa' }} relay={relayDoc('turn')} serverNow={serverNow} />; break
    case 'relay-vote': body = <Relay uid="preview" night={night} session={SESSION} relay={relayDoc('vote')} serverNow={serverNow} />; break
    case 'relay-lockout': body = <Relay uid="preview" night={night} session={SESSION} relay={relayDoc('lockout')} serverNow={serverNow} />; break
    case 'relay-done': body = <RelayDone uid="preview" relay={relayDoc('done')} seenKey="x" />; break
    case 'join': body = <Join night={night} ui={ui} />; break
    case 'superseded': body = <Join night={night} ui={ui} notice={ui.SUPERSEDED} />; break
    case 'paused': body = <Moment text={ui.PAUSED} crest />; break
    case 'blackout': body = <Blackout />; break
    case 'prompt': body = <Prompt uid="preview" night={night} ui={ui} serverNow={serverNow} promptKey="prompt-2" card={CARDS.role} notes={null} />; break
    case 'prompt-late': body = <Prompt uid="preview" night={night} ui={ui} serverNow={serverNow} promptKey="prompt-2" card={null} notes={null} />; break
    case 'you': body = <Rest uid="preview" night={night} session={{ ...SESSION, cards: [CARDS.role] }} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} />; break
    case 'offline': body = <><Offline ui={ui} seconds={47} /><Rest uid="preview" night={night} session={SESSION} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} /></>; break
    case 'paused-window': body = <><PausedStrip ui={ui} /><div className="paused-shell" inert><Questions w={windowDoc('questions', 60000)} nightId="preview" serverNow={() => PHASE_AT + 20000} /></div></>; break
    case 'cats-act4': body = <Rest uid="preview" night={{ ...night, act: 4, beat: 'station2' }} session={{ ...SESSION, affection: { irwin: 5, granolia: 4, boo: 1, zimothy: 3, salem: 2 }, groupAffection: { granolia: 2, boo: 3, zimothy: 4, salem: 4 } }} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} />; break
    case 'host': body = <Rest uid="preview" night={{ ...night, act: 4, beat: 'station2', window: { id: 'q', kind: 'questions', title: 'Every phone lights up', opensAt: stamp(PHASE_AT), closesAt: stamp(PHASE_AT + 60000), settled: false } }} session={{ ...SESSION, guestKey: 'jon', characterId: 'prof-jonathan', bag: 3, host: 'jonathan' }} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} />; break
    case 'cats': body = <Rest uid="preview" night={night} session={{ ...SESSION, affection: { irwin: 5, granolia: 4, boo: 1, zimothy: 3, salem: 2 } }} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} onTour={() => {}} />; break
    case 'lobby': body = <Rest uid="preview" night={{ ...night, act: 0, phase: 'lobby' }} session={SESSION} content={CONTENT} notes={null} ui={ui} serverNow={serverNow} />; break
    default:
      if (dealt) {
        body = <Rest uid="preview" night={{ ...night, act: dealt.act, beat: dealt.beat, rehearsal: true, eliminations: dealt.act === 6 ? { jon: { kind: 'motive', n: 4, name: 'Jon', at: stamp(PHASE_AT) } } : undefined }}
          session={{ ...SESSION, cards: dealt.cards, solved: which === 'document' ? { '2-puzzle-safe': true } : {} }} content={CONTENT} notes={{ seen: dealt.seen ?? {} }} ui={ui} serverNow={serverNow} onTour={() => {}} />
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
