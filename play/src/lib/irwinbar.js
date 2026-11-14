// Irwin's progress bar on the Parlour TV while the Manor counts (handoffs 9 and 14 Nov 2026; cue 20).
// The bar is one page of its own, play/public/irwin-progress-bar.html: Sir Irwin runs along it chasing the
// butterfly, bows in the middle, and watches the butterfly fly off when it is full; the stats and the
// achievements come and go underneath, one at a time. The Parlour TV shows it in a frame over the counting
// screen (screens/IrwinBar.jsx) and tells it three things, worked out here: its cards, how long it runs,
// and how far it has got. Nothing here is a secret: the finale doc is public, and the cards are the same
// lines the plain lists show.
import { countingBar, ms } from './finale.js'

export const IRWIN_BAR_FILE = 'irwin-progress-bar.html'
// The bar is full this long before the screen moves on to W-O-O-F News, so the butterfly is seen to fly off
// and Sir Irwin to stop and watch it (Jon, 9 Nov). Full at the very moment the screen changed, nobody would
// see the end he asked for. The page's own "done" comes 1.6 seconds after it is full.
export const END_ROOM_MS = 2400
// How long the screen waits, dark, for the bar to say it is there. After that today's plain bar and lists
// show instead: the bar is safe to cut, the reveal is not.
export const WAIT_MS = 1500

const text = (v) => String(v ?? '').trim()

// The cards, in order: each stat, then each achievement the host gave. Plain text, no new words.
export function irwinCards(finale) {
  const stats = (Array.isArray(finale?.stats) ? finale.stats : []).filter(s => text(s?.label) || text(s?.value))
    .map(s => ({ tag: '', title: text(s.label), detail: text(s.value) }))
  const given = (Array.isArray(finale?.achievements) ? finale.achievements : []).filter(a => text(a?.title) || text(a?.name))
    .map(a => ({ tag: 'Achievements', title: text(a.title), detail: [text(a.name), text(a.line)].filter(Boolean).join(' · ') }))
  return [...stats, ...given]
}

// What to tell the bar, and the key that says when to tell it again. The key is the counting bar's own
// (what the clock is timed against: the start, the length, the holds) with the cards added, and nothing in
// it moves with the clock: the screen redraws four times a second and the bar must be started once, not at
// every redraw (the lesson of 14 Nov: see anchored in lib/finale.js).
//   running: { type: 'irwin:start', seconds, elapsed, cards }   the bar runs by itself from there
//   held:    { type: 'irwin:progress', p, cards }               the bar stands where it is (the cards too: a
//                                                              screen loaded during a hold has never been started)
export function irwinMessage(finale, now) {
  const { span, t } = countingBar(finale, now)
  const run = Math.max(1000, span - END_ROOM_MS)
  const cards = irwinCards(finale)
  const key = `${ms(finale?.at)}|${span}|${finale?.held ?? 0}|${finale?.holdAt ? ms(finale.holdAt) : 'run'}|${JSON.stringify(cards)}`
  const message = finale?.holdAt
    ? { type: 'irwin:progress', p: Math.min(1, t / run), cards }
    : { type: 'irwin:start', seconds: run / 1000, elapsed: Math.min(run, t) / 1000, cards }
  return { key, message }
}
