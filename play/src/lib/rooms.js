import characters from '../../../seed/characters.json' with { type: 'json' }
import news from '../../../seed/woof-news.json' with { type: 'json' }
import names from '../../../seed/game-names.json' with { type: 'json' }
import { uiLines } from './content.js'

// Pure rules for the room screens added on 23 Oct 2026 (screens/Rooms.jsx):
// Sir Irwin's prompts on the Parlour TV, the bulletin videos, and Zimothy's
// memory match. No React, no Firebase, so play/test can run them.

export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// The prompt on the TV at a moment: the server laid out the order and the
// start (public/screen.prompts { lines, order, startedAt, everyMs }); a new one
// every everyMs, round and round.
export function promptShown(prompts, now) {
  const lines = prompts?.lines ?? []
  const order = prompts?.order ?? []
  if (!lines.length) return ''
  const every = Number(prompts.everyMs) || 180_000
  const k = Math.max(0, Math.floor((now - ms(prompts.startedAt)) / every))
  const i = order.length ? order[k % order.length] : k % lines.length
  return lines[i] ?? lines[0]
}

// Bulletin 1's parts, from the words on the screen: each line found in the
// open bank (seed/woof-news.json) by its text. A line the bank does not have
// (a rehearsal's stand-in) has no video and is skipped.
export function newsClips(lines = []) {
  const parts = [news.bulletin1.opening, ...Object.values(news.bulletin1.families), news.bulletin1.signoff]
  return lines.map(t => parts.find(p => p.text === t)?.clip).filter(Boolean)
}

// The closing bulletin's parts for one name (the same rule as
// functions/lib/news.js closingStage): Murderer, the studio and Mic's first
// line; Motive, his second; Victim, his third, his sign-off and the close.
const CLOSING_CARDS = { murderer: 'murderer', motive: 'motive', victim: 'ghost' }
export function closingClips(stage) {
  const parts = news.closing.parts
  const order = Object.keys(CLOSING_CARDS)
  const i = order.indexOf(stage)
  const cardIndex = s => parts.findIndex(p => p.card === CLOSING_CARDS[s])
  if (i < 0 || cardIndex(stage) < 0) return []
  const from = i === 0 ? 0 : cardIndex(order[i - 1]) + 1
  const to = i === order.length - 1 ? parts.length : cardIndex(stage) + 1
  return parts.slice(from, to).map(p => p.clip)
}

// A bulletin clip's video file, in play/public/video/ (Jon drops them in
// before the deploy): the clip's own name, as in seed/woof-news.json.
export function videoUrl(clip) {
  const base = import.meta.env?.BASE_URL ?? '/'
  return `${base}video/${String(clip ?? '').replace(/[^A-Za-z0-9_-]/g, '')}.mp4`
}

// The five game names (§16, Jon 24 Oct 2026): the title wherever a player
// meets the game, with the hook under it. Display text only.
export const GAME_NAMES = Object.fromEntries(names.games.map(g => [g.id, g]))

// Zimothy's memory match (§9.8): three rounds, 6, 10 and 14 pairs, always all
// fourteen traces as art (the same as functions/lib/act4.js).
export const MEMORY_ROUNDS = [6, 10, 14]

// A group's guests by place, in the rotation's order (functions/lib/act4.js
// makeRooms): each by their own name (a character name only if a guest has
// none), '' for a guest with neither, so every place keeps its number.
export function groupNames(rotation, groupId) {
  const g = (rotation?.groups ?? []).find(x => x.id === groupId)
  return (g?.members ?? []).map(m => m.name || m.characterName || '')
}
// Who takes turns at the memory match (27 Oct 2026): the group's guests by
// their own names, in the rotation's order. Nobody known, nobody listed, and
// the board has no turns.
export function turnNames(rotation, groupId) {
  return groupNames(rotation, groupId).filter(Boolean)
}
export const ALL_TRACES = [...new Set(characters.characters.map(c => c.trace).filter(Boolean))]
export const ZIMOTHY_LINES = {
  rounds: [
    'Disaster. Sir Irwin bounded through my office, and my files are everywhere. Match the pairs and put the first drawer back.',
    'The second drawer. Worse. He went through twice.',
    "The whole cabinet. Every file I own. Do this and I'll strike a motive from your list and waive my fee. Just this once.",
  ],
  cleared: 'Order. Restored.',
  standalone: 'Order restored. Sir Irwin is already back in the office.',
  // naming the winner at the end of the visit (28 Oct 2026): transactional, as ever
  winner: "The sharpest clerk at the table. I'd hire you. Cheaply.",
  tie: "A tie. I'll split the credit and bill you both.",
}
// Salem on the Orangerie's screen, naming the steadiest at the end of the
// visit (28 Oct 2026). His lines on the phones are SALEM_LINES (screens/Act4.jsx).
export const SALEM_SCREEN_LINES = {
  winner: "That one barely trampled my lawn. Don't let it go to your head.",
  tie: "A tie. Can't tell you lot apart. Never could.",
}

// ---- the just-for-fun winners (Jon, 28 Oct 2026) -------------------------------

// "Make boo's, zimmy's, and Salem have a winner. Just for fun." In Duplicate
// names whoever found the most pairs and Get Off My Lawn! whoever slipped
// least, by the rule of Miss Boo LaRue's Arcade (lib/arcade.js winnerOf): the
// best count names its player, a tie names everyone tied, and one player
// alone names nobody. Each room's screen names them at the end of the group's
// visit, unless the chime comes first. Display only: no reward, clue or score
// changes. The counts go by place in the group, so the public docs carry
// numbers, never a name (L07).
const countAt = (list, i) => Math.max(0, Math.floor(Number(list?.[i]) || 0))

// In Duplicate: `names` the board's turns (turnNames), `pairsBy` the pairs
// each found, by the same place (public/memory.pairsBy). Nobody named while
// nobody has found a pair.
export function mostPairs(names = [], pairsBy = []) {
  const who = names.map((name, i) => ({ name, n: countAt(pairsBy, i) })).filter(p => p.name)
  if (who.length < 2) return null
  const best = Math.max(...who.map(p => p.n))
  if (best < 1) return null
  return { names: who.filter(p => p.n === best).map(p => p.name), count: best }
}

// Get Off My Lawn!: `names` the group by place (groupNames), `slipsBy` the
// slips each phone caused and `feltBy` whether each phone felt a shake, by
// the same place (public/salem). A phone that never felt one could never
// slip, so it is left out: it would win every time.
export function fewestSlips(names = [], slipsBy = [], feltBy = []) {
  const who = names
    .map((name, i) => ({ name, n: countAt(slipsBy, i), played: !!feltBy?.[i] || countAt(slipsBy, i) > 0 }))
    .filter(p => p.name && p.played)
  if (who.length < 2) return null
  const best = Math.min(...who.map(p => p.n))
  return { names: who.filter(p => p.n === best).map(p => p.name), count: best }
}

// "Margaret, Tom and Ellie"
export function andList(names = []) {
  const list = names.filter(Boolean)
  return list.length <= 1 ? (list[0] ?? '') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}
// The plain line under the names, the arcade's way ("Most points: Jessa, 74."):
// `what` is "Most pairs" or "Fewest slips".
export function winnerPlain(win, what) {
  if (!win?.names?.length) return ''
  return win.names.length > 1 ? `A tie: ${andList(win.names)}, ${win.count} each.` : `${what}: ${win.names[0]}, ${win.count}.`
}

// A small seeded shuffle, so the standalone game deals fresh boards each time.
function rngOf(seed) {
  let a = (Number(seed) >>> 0) || 1
  return n => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n)
  }
}
function shuffled(list, rng) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = rng(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
export function standaloneBoards(seed) {
  const rng = rngOf(seed)
  return MEMORY_ROUNDS.map(n => { const faces = shuffled(ALL_TRACES, rng).slice(0, n); return shuffled([...faces, ...faces], rng) })
}

// ---- the loops, the room codes and the Act 4 rules cards (25 Oct 2026, the cue list) ----

// Every idle screen plays a looping graphic once Jon's file is in
// (play/public/loops/<name>.mp4, see loops/README.md); the crest shows until
// then, and whenever the file is missing or will not play. The iPad Pro plays
// the Library's loop (it stands with Zimothy in Act 2); Boo's camera has no
// loop, it is a mirror. The Orangerie's file is optional: the brain's browser
// shows its crest without one.
export const LOOP_OF = { living: 'living', study: 'study', memory: 'memory', ipad: 'memory', boo: 'boo', bedroom: 'bedroom', orangerie: 'orangerie' }
export function loopFor(which) { return LOOP_OF[which] ?? null }
export function loopUrl(which, base = import.meta.env?.BASE_URL ?? '/') {
  const name = loopFor(which)
  return name ? `${base}loops/${name}.mp4` : null
}

// Act 2's cat visits (cue 7): each room's screen shows its cat's square code
// while the phones call guests to the cats, so nobody hunts for a printout
// (the printed codes stay as the fallback). Kiosk name -> cat.
export const ROOM_CODE_CATS = { study: 'granolia', memory: 'zimothy', ipad: 'zimothy', boo: 'boo', orangerie: 'salem' }
export function roomCode(which, night) {
  if (!night || Number(night.act) !== 2 || night.beat !== 'cat') return null
  // a pause hides the code (26 Oct 2026): the TV and the iPad show One moment then, and no phone can scan in
  if (night.phase === 'paused') return null
  return ROOM_CODE_CATS[which] ?? null
}
export const CAT_NAMES = { granolia: 'Granolia Lickspittle', zimothy: 'Zimothy Clawford, Esq.', boo: 'Miss Boo LaRue', salem: 'Salem Crooknog', irwin: 'Sir Irwin' }
export const CAT_ROOMS = { granolia: 'the Study', zimothy: 'the Library', boo: 'the Entryway', salem: 'the Orangerie' }
export function codeWords(cat) {
  return `${CAT_NAMES[cat] ?? 'The cat'}, in ${CAT_ROOMS[cat] ?? 'the house'}. Scan when your phone calls you.`
}
// The same address the Game night page prints (app/src/pages/Night.jsx meetUrl).
export function meetUrl(cat, playUrl) {
  return `${playUrl}${String(playUrl).includes('?') ? '&' : '?'}meet=${cat}`
}

// The household's full pictures (play/public/household/full/). The file names
// are Jon's, spaces and all; one has a leading space. A screen varies the
// picture by a key (the group due, the round, a time stamp) so it changes
// through the night and a reload shows the same one.
export const CAT_PICTURES = {
  granolia: ['Granola 1.png', 'Granola 2.png', 'Granola 3.png', 'Granola 4.png'],
  zimothy: ['Zimmy 1.png', 'Zimmy 2.png', 'Zimmy 3.png', 'Zimmy 4.png', 'Zimmy 5.png'],
  boo: ['Boo 1.png', 'Boo 2.png', 'Boo 3.png', 'Boo 4.png', ' Boo 5.png'],
  salem: ['Salem 1.png', 'Salem 2.png', 'Salem 3.png', 'Salem 4.png', 'Salem 5.png', 'Salem 6.png'],
  irwin: ['Irwin 1.png', 'Irwin 2.png', 'Irwin 3.png', 'Irwin 4.png', 'Irwin 5.png'],
}
// A small, stable hash of the key into 0..n-1.
export function variant(key, n) {
  const s = String(key ?? '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return n > 0 ? h % n : 0
}
export function catPicture(cat, key) {
  const files = CAT_PICTURES[cat] ?? []
  return files.length ? files[variant(key, files.length)] : null
}
export function catPictureUrl(cat, key, base = import.meta.env?.BASE_URL ?? '/') {
  const f = catPicture(cat, key)
  return f ? `${base}household/full/${encodeURIComponent(f)}` : null
}

// The Act 4 rules cards: each room's screen, between groups, shows the game's
// name and hook, its host's line, the cat's picture and the room's code.
// Kiosk name -> game id (seed/game-names.json).
export const ROOM_GAME = { study: 'study', memory: 'library', boo: 'entryway', orangerie: 'orangerie' }
// The hosts' lines, copied from the server's open defaults: the Study's and
// the Library's from functions/lib/hosts.js HOST_LINES (a test keeps them the
// same), Salem's intro from the phone's Get Off My Lawn! (screens/Act4.jsx),
// Boo's from her wall. The defaults only: rulesLine, below, puts the
// workshop's own words first.
export const RULES_LINES = {
  study: "Oh! You're here! The wall flashes a pattern. Touch the same lights in the same order. Do that three times, then press the colour and the number on the buttons, and press submit. Made a mistake? Press undo. I used to know the whole pattern, but... yeah.",
  library: "Disaster. Sir Irwin bounded through my office, and my files are everywhere. I keep everything in duplicate, so match each pair and put my records back in order. Do it, and I'll strike one motive from your list. I'll waive my fee, just this once.",
  orangerie: "Forty years I've kept these grounds, and now you want to play on 'em. Fine. Watch the lights, not your phones. RED means GO: shake that thing like it owes you money. GREEN means FREEZE. Yes, backwards. I've done everything backwards for forty years and nobody's complained.",
  entryway: "Darling. Welcome to my runway. Watch the wall. When the music stops, strike a pose and HOLD it. I'll be judging. I'm always judging.",
}
// A rules card's host line (26 Oct 2026, the screens' review): the workshop's
// own words first, as on the phones (functions/lib/hosts.js hostLine reads the
// ui_copy line HOST GRANOLIA or HOST ZIMOTHY), from the night's published
// content (public/content, the same doc the study screen reads its lines
// from); else the copied default. Only the Study and the Library have a host
// line Jon can change: Salem's HOST line is his Act 7 one and Boo's six are
// her Parlour Games verdicts, so their cards keep their intros.
const RULES_OVERRIDE = { study: 'HOST GRANOLIA', library: 'HOST ZIMOTHY' }
export function rulesLine(id, content = null) {
  const key = RULES_OVERRIDE[id]
  if (key) {
    const own = uiLines(content)[key]
    if (own) return own
  }
  return RULES_LINES[id] ?? null
}
