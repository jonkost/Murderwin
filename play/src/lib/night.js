import nightSeed from '../../../seed/night.json' with { type: 'json' }

// The shape of the night on the phone side: the same seed/night.json the
// server steps through, plus small helpers over the cards and windows a
// phone is dealt. Nothing here is content. Everything in this file is pure
// (no Firebase, no React) so play/test can run it under node --test.

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
  const base = import.meta.env?.BASE_URL ?? '/'
  return f ? `${base}household/faces/${encodeURIComponent(f)}` : null
}

// ---------------------------------------------------------------------------
// The player's own notes, scoped to the night. A phone that rehearsed keeps
// its old scribbles under the old night's id and starts clean on the next,
// so the Welcome tour and the role prompt show again (17 Oct 2026). The doc
// is { byNight: { [nightId]: { seen, crossed, buzzed } } }; anything written
// flat at the top level (the old shape) is ignored.

export const EMPTY_NOTES = Object.freeze({ seen: {}, crossed: {}, buzzed: {} })

export function notesFor(notes, nightId) {
  const mine = nightId ? notes?.byNight?.[nightId] : null
  if (!mine || typeof mine !== 'object') return { seen: {}, crossed: {}, buzzed: {} }
  return { seen: mine.seen ?? {}, crossed: mine.crossed ?? {}, buzzed: mine.buzzed ?? {} }
}

// What one write sends: only this night's branch, merged in.
export function notesPatch(nightId, patch) {
  if (!nightId) return null
  return { byNight: { [nightId]: patch } }
}

// What the doc looks like after a merge write (Firestore merges maps deeply).
// Used by the tests; the phone never needs it.
export function mergeNotes(doc, patch) {
  const merge = (a, b) => {
    const out = { ...(a ?? {}) }
    for (const [k, v] of Object.entries(b ?? {})) {
      out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(out[k], v) : v
    }
    return out
  }
  return merge(doc, patch)
}

// Has this phone seen this card, prompt or tour under this night?
export function seen(notes, nightId, key) {
  return !!notesFor(notes, nightId).seen?.[key]
}

// The phase a phone should behave as if it is in. A pause keeps the phase it
// was taken from (nights.pausedFrom), so a pause during the blackout is still
// the blackout and a pause during the role prompt is still the prompt.
export function effectivePhase(night) {
  if (!night) return null
  if (night.phase === 'paused') return night.pausedFrom || 'act'
  return night.phase
}

// Phones stay near-black through the blackout, and through a pause taken
// during it: the host pausing to deal with the dog must not light the room.
export function isDark(night) {
  return effectivePhase(night) === 'blackout'
}

// The Welcome tour shows the first time a phone has a character on this
// night, whatever the act (a late arrival at Act 3 still gets it), but never
// over the blackout or the role prompt, paused or not.
export function wantsWelcome(night, notes, nightId) {
  if (!night || !nightId) return false
  const phase = effectivePhase(night)
  if (phase === 'blackout' || phase === 'prompt') return false
  return !seen(notes, nightId, 'welcome')
}

// Buzz once per card id. Guarded twice: in the night's notes (so a reload
// never buzzes the same card again) and in memory (so a cache paint that
// lands before the notes do cannot buzz twice in one page load).
const buzzedNow = new Set()
export function buzzOnce(key, notes, vibrate) {
  if (!key || buzzedNow.has(key) || notes?.buzzed?.[key]) return false
  buzzedNow.add(key)
  try { vibrate?.([200, 100, 200]) } catch { /* no motor, or not allowed yet */ }
  return true
}
export function resetBuzzGuard() { buzzedNow.clear() }

// May this phone open ?check=1 (every published workshop line)? Hosts and the
// admin only; a plain guest sees "Not for you". Previews use sample data and
// are not gated.
export function mayCheck({ session, night, admin = false } = {}) {
  if (admin) return true
  if (!session || session.status !== 'active') return false
  if (session.host) return true
  const hostKeys = Object.values(night?.hosts ?? {}).map(h => h?.key).filter(Boolean)
  return !!session.guestKey && hostKeys.includes(session.guestKey)
}

// A borrowed phone: the host's handover bumps sessions.generation. The phone
// compares it with the last generation it acted on and, when newer, wipes
// its local copy and reloads to the doors. Pure so the rule is testable.
export function needsHandoverReset(session, lastSeen) {
  const g = Number(session?.generation ?? 0)
  if (!g) return false
  return g > (Number(lastSeen) || 0)
}

// Everything dealt to this phone, newest last.
export function cardsOf(session) { return Array.isArray(session?.cards) ? session.cards : [] }

// The cards that belong on the Now tab: this act's, not yet put away.
// Notices and instructions go away once tapped; clues stay in Clues. The role
// card is kept all night too (re-readable from the You tab, behind a tap),
// but it is never listed among the clues.
export const TRANSIENT = new Set(['notice', 'go', 'group', 'station', 'puzzle', 'result'])
export const KEEPS = new Set(['testimony', 'document', 'clue', 'result', 'role'])

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
  return cardsOf(session).filter(c => c.kind !== 'role' && (KEEPS.has(c.kind) || (c.kind === 'station' && c.station === 'bags'))).reverse()
}

// This phone's role card, whenever it was dealt. Null until the power returns.
export function roleCard(session) {
  return cardsOf(session).find(c => c.kind === 'role') ?? null
}

// Is this window open on this phone right now, and still unanswered? During a
// pause the clock the phone passes in stands still at the moment of the pause,
// so a window that was open stays open (disabled) until the host resumes.
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

// The clock a paused phone reads: frozen at the moment the host paused, so
// every bar and hold stands still and nothing on the phone runs out.
export function clockFor(night, serverNow) {
  if (night?.phase === 'paused' && night.pausedAt) {
    const frozen = ms(night.pausedAt)
    return () => frozen
  }
  return serverNow
}
