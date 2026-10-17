import nightSeed from '../../../seed/night.json'

// The shape of the night on the phone side: the same seed/night.json the
// server steps through, plus small helpers over the cards and windows a
// phone is dealt. Nothing here is content.

export const NIGHT = nightSeed
export const STATIONS = NIGHT.stations
export const WINDOWS = NIGHT.windows

export function beatsOf(act) { return NIGHT.acts[String(act)]?.beats ?? [] }
export function beatSpec(act, key) { return beatsOf(act).find(b => b.key === key) ?? null }

export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// The cat faces in play/public/household/faces/.
const FACE_FILES = { irwin: 'Irwin Face.png', granolia: 'Granola Face.png', boo: 'Boo Face.png', zimothy: 'Zimmy Face.png', salem: 'Salem Face.png' }
export function faceUrl(catKey) {
  const f = FACE_FILES[catKey]
  return f ? `${import.meta.env.BASE_URL}household/faces/${encodeURIComponent(f)}` : null
}

// Everything dealt to this phone, newest last.
export function cardsOf(session) { return Array.isArray(session?.cards) ? session.cards : [] }

// The cards that belong on the Now tab: this act's, not yet put away.
// Notices and instructions go away once tapped; clues stay in Clues.
export const TRANSIENT = new Set(['notice', 'go', 'group', 'station', 'puzzle', 'result'])
export const KEEPS = new Set(['testimony', 'document', 'clue', 'result'])

export function nowCards(session, notes, act) {
  const seen = notes?.seen ?? {}
  return cardsOf(session)
    .filter(c => c.act === act)
    .filter(c => c.kind !== 'role')
    .filter(c => !(TRANSIENT.has(c.kind) && seen[c.id]))
    .filter(c => !(c.kind === 'testimony' && !seen[`${c.act}-${c.beat}-go`] && hasGo(session, c)))
    .reverse()
}
function hasGo(session, t) { return cardsOf(session).some(c => c.kind === 'go' && c.act === t.act && c.beat === t.beat) }

export function clueCards(session) {
  return cardsOf(session).filter(c => KEEPS.has(c.kind) || (c.kind === 'station' && c.station === 'bags')).reverse()
}

// Is this window open on this phone right now, and still unanswered?
export function openWindow(night, session, serverNow) {
  const w = night?.window
  if (!w || w.settled) return null
  const now = serverNow()
  if (now >= ms(w.closesAt)) return null
  const mine = session?.windows?.[w.id]
  if (!mine) return null
  if (w.kind === 'questions' && session.answers?.[w.id]) return null
  if (w.kind === 'ballot' && session.ballot && !session.ballot.defaulted) return null
  if (w.kind === 'eliminate' && night.eliminations?.[session.guestKey]) return null
  return { ...w, mine }
}

export function secondsLeft(w, serverNow) {
  return Math.max(0, Math.ceil((ms(w.closesAt) - serverNow()) / 1000))
}
