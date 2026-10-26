import nightSeed from '../../../seed/night.json' with { type: 'json' }

// The shape of the night on the phone side: the same seed/night.json the
// server steps through, plus small helpers over the cards and windows a
// phone is dealt. Nothing here is content. Everything in this file is pure
// (no Firebase, no React) so play/test can run it under node --test.

export const NIGHT = nightSeed
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
// is { byNight: { [nightId]: { seen, crossed, buzzed, continued } } };
// anything written flat at the top level (the old shape) is ignored.
// `continued` (25 Oct 2026): the server's time at which this phone tapped
// "Sorry for the interruption, continue here" after the blackout, by prompt
// key, so the role card's fifteen seconds run from that tap.

export const EMPTY_NOTES = Object.freeze({ seen: {}, crossed: {}, buzzed: {}, continued: {} })

export function notesFor(notes, nightId) {
  const mine = nightId ? notes?.byNight?.[nightId] : null
  if (!mine || typeof mine !== 'object') return { seen: {}, crossed: {}, buzzed: {}, continued: {} }
  return { seen: mine.seen ?? {}, crossed: mine.crossed ?? {}, buzzed: mine.buzzed ?? {}, continued: mine.continued ?? {} }
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

// A rehearsal night gets a big red REHEARSAL band across the top of every
// phone and room screen. Every night rehearses unless the workshop's "This
// is the party night" box made it the party (nights.forceRehearsal false,
// the same test the dealer uses), and a fake-players dry run is never the
// party either. The band hides with everything else through the blackout
// and the role prompt.
export function isRehearsalNight(night) {
  if (!night) return false
  return night.forceRehearsal !== false || night.dryRun === true
}
export function showRehearsalBand(night) {
  const phase = effectivePhase(night)
  return isRehearsalNight(night) && phase !== 'blackout' && phase !== 'prompt'
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

// What this phone reports in its heartbeat: its guest key only while it
// holds an active character on this night. A handed-over phone sitting at
// the doors, or one superseded by another phone, reports nobody, so the Host
// tab's "heard from" list never shows a guest who has no phone in hand.
export function presenceKey(session, nightId) {
  if (!session || !nightId) return null
  if (session.nightId !== nightId || session.status !== 'active') return null
  return session.guestKey ?? null
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

// The kinds of card a phone shows. A card of any other kind is never shown:
// a session from an older build may still hold the Act 2 safe, its paper or
// the scrap of paper with its numbers (taken out 23 Oct 2026).
export const KINDS = new Set(['notice', 'testimony', 'group', 'station', 'clue', 'result', 'award', 'role'])
function shown(c) { return !!c && KINDS.has(c.kind) && !(c.kind === 'notice' && c.key === 'scrap') }

// Everything dealt to this phone, newest last.
export function cardsOf(session) { return Array.isArray(session?.cards) ? session.cards.filter(shown) : [] }

// The cards that belong on the Now tab: this act's, not yet put away.
// Notices and instructions go away once tapped; clues stay in Clues. The role
// card is kept all night too (re-readable from the You tab, behind a tap),
// but it is never listed among the clues.
export const TRANSIENT = new Set(['notice', 'group', 'station', 'result', 'award'])
export const KEEPS = new Set(['testimony', 'clue', 'result', 'role'])

// At The End (`over`, the cue list's cue 23, 25 Oct 2026) the result card stays
// on Now however many times it was put away: the phone is open for good, and
// the result is what it opens on.
export function nowCards(session, notes, act, { over = false } = {}) {
  const seen = notes?.seen ?? {}
  return cardsOf(session)
    .filter(c => c.act === act)
    .filter(c => c.kind !== 'role')
    .filter(c => !(TRANSIENT.has(c.kind) && seen[c.id] && !(over && c.kind === 'result')))
    .reverse()
}

// This phone's result card (Act 7), whenever it was dealt. Null until the results.
export function resultCard(session) {
  return cardsOf(session).find(c => c.kind === 'result') ?? null
}

// Act 2, Lights Out: this phone's next step in the cat rooms (the server's
// sessions/{uid}.lights: wait, go, with, done), shown at the top of Now
// through Act 2. Null outside Act 2 or before the first wave.
export const LIGHTS_STEPS = ['wait', 'go', 'with', 'done']
export function lightsStep(session, act) {
  const l = session?.lights
  if (act !== 2 || !l || !LIGHTS_STEPS.includes(l.step)) return null
  return l
}

// Act 4, Behind Closed Doors: this phone's step in the four game rooms (the
// server's sessions/{uid}.act4: room, title, text, arrive, here, paid, over).
// Null outside Act 4.
export const ROOMS = {
  study: { cat: 'granolia', name: 'the Study' },
  library: { cat: 'zimothy', name: 'the Library' },
  orangerie: { cat: 'salem', name: 'the Orangerie' },
  entryway: { cat: 'boo', name: 'the Entryway' },
}
export function act4Step(session, act) {
  const a = session?.act4
  if (act !== 4 || !a || !a.room) return null
  return a
}
// Is this guest free to play a waiting Parlour Game? In the Parlour, or their
// room already paid, or the rounds over (handoff 23 Oct 2026: never in a game room).
export function freeForGames(step) {
  return !step || step.room === 'parlour' || !!step.paid || !!step.over
}
// The Act 4 Parlour Games waiting on this phone and not yet played, oldest first.
export function waitingGames(session) {
  return Object.entries(session?.windows ?? {})
    .filter(([id, w]) => w?.waiting && w.kind === 'questions' && !session?.answers?.[id])
    .sort((a, b) => ms(a[1].opensAt) - ms(b[1].opensAt))
    .map(([id, w]) => ({ id, kind: 'questions', title: w.title || 'Parlour Game', host: w.host ?? null, mine: w, waiting: true }))
}

// Salem's Motion Game (public/salem): the colour at a moment, the same rule
// as the server's and the brain's (functions/lib/act4.js salemColourAt).
export function salemColourAt(doc, now) {
  if (doc?.state !== 'playing') return null
  let colour = null
  for (const f of doc.flips ?? []) { if (ms(f.at) <= now) colour = f.colour; else break }
  return colour
}
// When the colour last changed, so a phone gives the guest a moment to react.
export function salemFlipAt(doc, now) {
  let at = 0
  for (const f of doc?.flips ?? []) { if (ms(f.at) <= now) at = ms(f.at); else break }
  return at
}
export const SALEM_GRACE_MS = { 1: 700, 2: 600, 3: 500 }
// A shake is movement above this, in m/s² with gravity taken out; red wants
// one at least every SALEM_STILL_MS, green wants none.
export const SALEM_SHAKE = 3.5
export const SALEM_STILL_MS = 1600

// Salem's rules on one phone at one moment (F25): 'green' when the phone
// shook on green after the colour's grace, 'red' when it stayed still on red
// too long, else null. `local` is this phone's time, `flipAt` the last change
// on this phone's clock. A phone with no reading from a motion sensor
// (motion.ok false: none, or not allowed) never slips.
export function salemSlip({ colour, motion, local, flipAt, grace }) {
  if (!colour || !motion?.ok) return null
  if (colour === 'green' && local - flipAt > grace && motion.mag > SALEM_SHAKE) return 'green'
  if (colour === 'red' && local - Math.max(flipAt + grace, motion.lastShakeAt) > SALEM_STILL_MS) return 'red'
  return null
}

// Boo's catwalk (public/boo): which part of the show is on at a moment.
//   intro · strut (pose n coming) · pose (STRIKE A POSE, hold n) · judge (the line) · done
export function booMoment(doc, now) {
  if (!doc || doc.state === 'idle' || !doc.startsAt) return { part: 'idle' }
  if (doc.state === 'done' || now >= ms(doc.endsAt)) return { part: 'done' }
  const poses = doc.poses ?? []
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i]
    if (now < ms(p.poseAt)) return { part: i === 0 && now < ms(p.strutAt) ? 'intro' : 'strut', pose: i + 1 }
    if (now < ms(p.holdUntil)) return { part: 'pose', pose: i + 1, hold: Math.ceil((ms(p.holdUntil) - now) / 1000) }
    if (now < ms(p.judgeUntil)) return { part: 'judge', pose: i + 1, line: p.line }
  }
  return { part: 'done' }
}

// The cat a room's square code names (/play/?meet=granolia). Null when there is none.
export const MEET_CATS = ['granolia', 'salem', 'zimothy', 'boo']
export function meetParam(search) {
  try {
    const cat = new URLSearchParams(search ?? window.location.search).get('meet')
    return MEET_CATS.includes(cat) ? cat : null
  } catch { return null }
}

export function clueCards(session) {
  return cardsOf(session).filter(c => c.kind !== 'role' && KEEPS.has(c.kind)).reverse()
}

// This phone's role card, whenever it was dealt. Null until the power returns.
export function roleCard(session) {
  return cardsOf(session).find(c => c.kind === 'role') ?? null
}

// A True Friend of the Groundskeeper (the host's "Salem petted"): the
// honour's words, shown again at the top of Salem's row on the Cats tab.
// The card the server sent carries the workshop's SALEM FRIEND line when Jon
// wrote one; these are the server's own words (functions/lib/deal.js) for a
// phone that lost the card.
export const SALEM_FRIEND = {
  title: 'True Friend of the Groundskeeper',
  text: "Well, I'll be. Salem has chosen you. He likes the cut of your jib. You've earned his rarest honor: True Friend of the Groundskeeper. From now on, he'll tell it to you straight. Don't let it go to your head. And stay off the lawn.",
}
export function salemFriendNote(session) {
  if (!session?.salemFriend) return null
  const card = cardsOf(session).find(c => c?.id === 'salem-friend')
  return { title: card?.title || SALEM_FRIEND.title, text: card?.text || SALEM_FRIEND.text }
}

// The power returns (F11; rewritten 25 Oct 2026 to Jon's cue list, cue 5).
// Three stages on every phone, the same whatever the role:
//   'continue': a near-black screen with one button, "Sorry for the
//               interruption, continue here". The tap notes the server's time
//               under continued[prompt-<act>].
//   'card':     the role card (or the orientation line on a phone with no
//               card yet), no button, for fifteen seconds on the server's
//               clock from that tap.
//   'done':     the main page, on its own. The role stays on the You tab.
// `serverNow` is the clock the phone reads, frozen during a pause (clockFor),
// so a pause never runs the card out.
export const PROMPT_HOLD_MS = 15_000
export function promptKeyOf(night) { return `prompt-${night?.act ?? 0}` }
export function promptStage(night, notes, serverNow) {
  const at = ms(notes?.continued?.[promptKeyOf(night)])
  if (!at) return 'continue'
  return serverNow() < at + PROMPT_HOLD_MS ? 'card' : 'done'
}

// Does the interruption flow show at all? While the server holds the prompt
// phase (the power just back), and while the night is still on Act 2's first
// beat after the host's first Next, a phone that has not finished the flow is
// on it. Once the night moves on, a phone that never tapped goes to the main
// page (its role is on the You tab); a phone mid-card keeps its fifteen
// seconds whatever the host presses. Never in the dark (isDark comes first).
export function showsPrompt(night, notes, serverNow) {
  const stage = promptStage(night, notes, serverNow)
  if (stage === 'card') return true
  if (stage === 'done') return false
  const phase = effectivePhase(night)
  if (phase === 'prompt') return true
  return phase === 'act' && night?.act === 2 && night?.beat === beatsOf(2)[0]?.key
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

// Where a window shows on the phone (F19; the ballot moved on 25 Oct 2026, cue 19):
//   'overlay': a Parlour Game, on top of whatever the phone was on. The screen
//              underneath stays mounted, so when the game is done the guest is
//              back exactly where they were: the same tab, the same half-typed
//              answer, the same scroll (docs/parlour-games.md).
//   'screen':  the deduction round, a beat of its own that takes the screen.
//   'card':    the ballot, a card on the Now tab with every tab reachable, so a
//              guest can read their clues while they decide. Two minutes on the
//              server's clock, never closing early, the same as before.
export function placement(w) {
  if (!w) return null
  if (w.kind === 'questions') return 'overlay'
  if (w.kind === 'ballot') return 'card'
  return 'screen'
}
export function overlays(w) { return placement(w) === 'overlay' }

// Act 7 on the phone (Jon's cue list, cues 20 to 23, 25 Oct 2026):
//   'eyes':   the reveal beat. A full-screen lock, the crest and "Eyes on the
//             screen.", no tabs. (The 'eyes' notice still lands as a card, for later.)
//   'result': the result beat. This phone's result card full screen with
//             "Thank you for playing." under it, no tabs, while the credits roll.
//   'over':   The End: the end beat, or nights.over. The tabs are back, the
//             result stays on Now, everything is readable, for good.
//   null:     any other moment.
// Keyed on the beat's action, like the server's own checks, so a renamed beat
// changes nothing; a night marked over is over whatever beat it says.
export function phoneLock(night) {
  if (!night) return null
  if (night.over === true) return 'over'
  if (Number(night.act) !== 7) return null
  const action = beatSpec(7, night.beat)?.action
  if (action === 'end') return 'over'
  if (action === 'reveal') return 'eyes'
  if (action === 'results') return 'result'
  return null
}
export function isOver(night) { return phoneLock(night) === 'over' }

// The lock this phone shows. The two host phones (session.host: Jon and Susan)
// keep their tabs through the reveal and the result, since the Host tab is
// what names the three and presses Next for the result and The End; their
// Now holds the eyes notice and the result card like everyone else's. The End
// is the same on every phone.
export function lockFor(night, session) {
  const lock = phoneLock(night)
  if ((lock === 'eyes' || lock === 'result') && session?.host) return null
  return lock
}

// Affection is kept in half steps on the server; the slider and every word
// about it show the nearest of the five stops. Irwin is always the top one.
export function stopOf(level) {
  const n = Number(level)
  if (!Number.isFinite(n)) return 3
  return Math.max(1, Math.min(5, Math.round(n)))
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
