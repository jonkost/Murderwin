import characters from '../../../seed/characters.json' with { type: 'json' }
import news from '../../../seed/woof-news.json' with { type: 'json' }
import names from '../../../seed/game-names.json' with { type: 'json' }

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

// Zimothy's memory match (§9.8): three rounds, 7, 10 and 14 pairs, always all
// fourteen traces as art (the same as functions/lib/act4.js).
export const MEMORY_ROUNDS = [7, 10, 14]
export const ALL_TRACES = [...new Set(characters.characters.map(c => c.trace).filter(Boolean))]
export const ZIMOTHY_LINES = {
  rounds: [
    'Disaster. Sir Irwin bounded through my office, and my files are everywhere. Match the pairs and put the first drawer back.',
    'The second drawer. Worse. He went through twice.',
    "The whole cabinet. Every file I own. Do this and I'll strike a motive from your list and waive my fee. Just this once.",
  ],
  cleared: 'Order. Restored.',
  standalone: 'Order restored. Sir Irwin is already back in the office.',
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
