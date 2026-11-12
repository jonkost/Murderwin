// The fill-in players' clock on the brain (npm run fill-ins; the polish
// pass, job A4, 11 Nov 2026): the part with no Firebase in it, so cues/test
// can run it.
//
// A practice night can seat players with no phone (the Start card's Fill-in
// players). The server makes every one of their moves (functions/lib/
// fillins.js); all it needs is to be asked often. This is the asking: one
// call every two seconds to the `fillIns` callable, which takes nothing and
// answers with counts. The driver holds no key, reads no document and knows
// nothing about the night but those counts, so there is nothing it could
// leak or break. It prints a line only when something changes.
//
// It never plays on the real night: before it starts and on every answer it
// stops for good on the party day, and it stops the moment the server says
// the night that is on is the real one.

// The party day, the same moment the server holds (functions/lib/morning.js PARTY_DAY; a test keeps them equal).
export const PARTY_DAY = Date.parse('2026-11-15T12:00:00Z')
export const EVERY_MS = 2_000   // while a practice night with fill-ins is on
export const IDLE_MS = 10_000   // while there is nothing to play, or the house does not answer

export const WORDS = {
  partyDay: 'Today is the party. Fill-in players are for practice nights only. Stopped.',
  realNight: 'The night that is on is the real night. Fill-in players never join it. Stopped.',
  noNight: 'No night is on. Waiting for a practice night with fill-in players.',
  noFillIns: 'The night that is on has no fill-in players. Waiting.',
  back: 'The house answers again.',
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const tally = m => `${plural(m.locked, 'tap of Locked in', 'taps of Locked in')}, ${plural(m.answered, 'Parlour Game answered', 'Parlour Games answered')}, ${plural(m.voted, 'vote', 'votes')}`
// An error's code, if it is one of Firebase's own short codes; never its message.
function codeOf(e) {
  const code = String(e?.code ?? '').replace(/^functions\//, '')
  return /^[a-z-]{2,40}$/.test(code) ? code : 'no-answer'
}

export function fresh() {
  return { showing: null, act: null, seats: null, moves: { locked: 0, answered: 0, voted: 0 }, down: null }
}

// One answer from the house (or one failed call, `error`) and the state so
// far: the lines to print, whether to stop, and how long to wait.
export function step(state, { reply = null, error = null, now = Date.now() } = {}) {
  const lines = []
  const say = (what, line) => { if (state.showing !== what) { state.showing = what; lines.push(line) } }
  if (now >= PARTY_DAY) { say('party-day', WORDS.partyDay); return { lines, stop: true, waitMs: 0 } }
  if (error || !reply || typeof reply !== 'object') {
    const code = codeOf(error)
    if (state.down !== code) { state.down = code; state.showing = 'down'; lines.push(`The house did not answer (${code}). Trying again every ten seconds.`) }
    return { lines, stop: false, waitMs: IDLE_MS }
  }
  if (state.down) { state.down = null; lines.push(WORDS.back) }
  if (reply.on !== true) {
    if (reply.why === 'party-day') { say('party-day', WORDS.partyDay); return { lines, stop: true, waitMs: 0 } }
    if (reply.why === 'real-night') { say('real-night', WORDS.realNight); return { lines, stop: true, waitMs: 0 } }
    if (state.showing === 'playing') lines.push(`That night is gone. In all: ${tally(state.moves)}.`)
    say(reply.why === 'no-fill-ins' ? 'no-fill-ins' : 'no-night', reply.why === 'no-fill-ins' ? WORDS.noFillIns : WORDS.noNight)
    state.act = null; state.seats = null; state.moves = { locked: 0, answered: 0, voted: 0 }
    return { lines, stop: false, waitMs: IDLE_MS }
  }
  // a practice night with fill-ins is on
  const count = k => Math.max(0, Math.floor(Number(reply[k]) || 0))
  for (const k of ['locked', 'answered', 'voted']) state.moves[k] += count(k)
  const seats = count('seats')
  const act = count('act')
  if (state.showing !== 'playing') {
    state.showing = 'playing'
    state.seats = seats
    state.act = act
    lines.push(`Playing ${plural(seats, 'fill-in player', 'fill-in players')} on the practice night. ${act ? `Act ${act}.` : 'The doors are open.'}`)
  } else {
    if (seats !== state.seats) { state.seats = seats; lines.push(`Now ${plural(seats, 'fill-in player', 'fill-in players')}.`) }
    if (act !== state.act) { state.act = act; lines.push(`Act ${act}. So far: ${tally(state.moves)}.`) }
  }
  if (reply.why === 'over' && !state.over) { state.over = true; lines.push(`The night is over. In all: ${tally(state.moves)}.`) }
  if (reply.why !== 'over') state.over = false
  return { lines, stop: false, waitMs: EVERY_MS }
}

// The loop: ask, wait for the answer, print what changed, sleep, ask again.
// Never two calls at once. `call`, `sleep`, `say` and `now` are handed in, so
// the test drives it with no network. Returns how many times it asked.
export async function drive({ call, sleep, say, now = () => Date.now(), max = Infinity, until = () => false } = {}) {
  const state = fresh()
  let asked = 0
  if (now() >= PARTY_DAY) { say(WORDS.partyDay); return asked }
  while (asked < max && !until()) {
    let reply = null
    let error = null
    asked++
    try { reply = await call() } catch (e) { error = e ?? new Error('no answer') }
    const r = step(state, { reply, error, now: now() })
    for (const line of r.lines) say(line)
    if (r.stop) break
    await sleep(r.waitMs)
  }
  return asked
}

// Started with the night, with no step for Jon (the cue relay, cues.mjs):
// the relay already watches the live night all evening, so it hands each
// copy of the night's document to see(). The first time a practice night
// with fill-in players shows, the fill-ins' clock starts inside the relay;
// it stops when the night that is on no longer has them (a new night, the
// real one, none), and starts again for the next that does. Only two of the
// night's public fields are read: forceRehearsal and the count fillIns.
// `npm run fill-ins` on its own does the same; two clocks at once are
// harmless, since each move is made once whoever asks.
export function wantsFillIns(night, now = Date.now()) {
  return now < PARTY_DAY && night?.forceRehearsal === true && Number(night?.fillIns) > 0
}
export function autoDriver({ call, sleep, say, now = () => Date.now() } = {}) {
  let wanted = false
  let running = false
  return {
    see(night) {
      wanted = wantsFillIns(night, now())
      if (!wanted || running) return
      running = true
      say('fill-ins: a practice night with fill-in players is on; their clock is running')
      drive({ call, sleep, say: line => say(`fill-ins: ${line}`), now, until: () => !wanted })
        .catch(() => say('fill-ins: their clock stopped'))
        .finally(() => { running = false; if (!wanted) say('fill-ins: their clock is stopped') })
    },
    get running() { return running },
  }
}
