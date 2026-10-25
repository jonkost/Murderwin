// The relay drawing game (Act 6): the state machine over Firestore.
// docs/relay-drawing-game.md is the design; this file is the clock.
//
// Public doc  nights/{id}/public/relay   — what every phone and kiosk sees:
//   the current cell only, who draws (their character, never a real name),
//   the deadlines, the four options at guess time. Never the whole drawing.
// Private doc nights/{id}/private/relay  — the four grids, the answers,
//   the turn order. No client reads it.
//
// Updated 22 Oct (docs/handoff-2026-10-22.md §7): a practice smiley, then
// three rounds (3 × 3, 4 × 4, 5 × 5) from the sealed picture bank on the
// party night (relay-bank.js), stand-in grids otherwise. Each turn the game
// calls a random player (repeats allowed); they walk to the paper before the
// square is shown. The room guesses on the main computer (the living room
// kiosk, `guess`); a wrong pick is crossed off until it is right. The third
// picture named opens the door.
//
// Timing: every deadline is a server timestamp written here; the phones and
// the living room kiosk render against it and call `advance` when it has
// passed. `advance` is idempotent: it moves the state exactly once per
// deadline and refuses early calls. Cloud Functions do not run timers.
//
// SEAL RULE: the only sealed read is the picture bank, on the party night,
// at the start (relay-bank.js); its pictures reach the public doc one square
// at a time, and its names only as the four options at guess time. Nothing
// here prints or logs. The trace behind the door is dealt elsewhere.

import { randomInt } from 'node:crypto'
import { generateSet, cellLabel } from './relay-gen.js'
import { NightError, characterById, GAME_NAMES } from './night.js'
import { relayGrids, BANK_DOC, PRACTICE } from './relay-bank.js'
import { nightSeed, pickFor } from './seed.js'

export const TURN_MS = 10_000      // ten seconds a turn, whatever the grid
export const WALK_MS = 12_000      // the next drawer walks to the paper
export const PULL_MS = 20_000      // pull the paper down to the next grid
export const VOTE_MS = 45_000      // walk to look, then pick; closes early when all present are in
export const LOCKOUT_MS = 10_000   // after a wrong pick
// Each of Sir Irwin's rules slides stays up long enough to read aloud: five
// seconds, and 0.4 of a second a word (the 42-word slide gets about 22 s, all
// seven about 1.8 minutes). Nothing is recorded, so the room reads them.
// Tune both in the weekend rehearsal.
export const SLIDE_BASE_MS = 5_000
export const SLIDE_WORD_MS = 400
// Words the way the workshop and windows.wordCount count them (kept here so
// this file needs nothing from windows.js, which imports it).
const words = text => String(text ?? '').trim().split(/\s+/).filter(Boolean).length
export function slideMs(text) { return SLIDE_BASE_MS + SLIDE_WORD_MS * words(text) }
// Sir Irwin's rules slides (the Relay Drawing How to Play doc): on the main
// display after the Act 6 Parlour Games, then slide 8 when the door opens.
// Slide 3 points at "this arc in B1": it carries the practice smiley's B1
// square (public, relay-bank.js PRACTICE) for the TV to draw beside the text.
const SLIDE_TEXT = [
  { title: GAME_NAMES.drawing?.name ?? 'Welcome', hook: GAME_NAMES.drawing?.hook ?? null, text: "Hi! Hi! It's me, Sir Irwin! I smelled something important behind the bedroom door, but it's shut. I don't do doorknobs. Will you help me?" },
  { title: 'The idea', text: "The door has a lock with three secret pictures. It only opens when we name all three. I asked the cats. They're my best friends, and they said they'd help me. I think they're coming. But maybe you can help me too?" },
  { title: 'A turn', text: 'First I call a name. That person goes to the Library and faces the paper. Only THEN does the screen show the square, like this arc in B1.', cell: { label: 'B1', strokes: PRACTICE.cells.B1 } },
  { title: 'The shouting', text: "Everyone else stays here and tells them what to draw. Words only! No pointing. I can't point either, and I'm doing fine." },
  { title: 'Guessing', text: "Think you know the picture? Pick it from the list. Wrong guesses get crossed off. That's okay. Boo crosses me off all the time. It's how she says hello." },
  { title: 'The rounds', text: 'Practice first, then three grids, each bigger than the last. Small, medium, BIG.' },
  { title: 'The clue', text: "Name all three and the door opens. Then I'll sniff out whatever's in there and bring it straight to you. Helping is my favorite! Ready? Paws on the paper. Let's go!" },
]
// slides = [{ title, text, ms, cell? }]: the TV shows slide i from the sum of the earlier ms.
export const IRWIN_SLIDES = SLIDE_TEXT.map(s => ({ ...s, ms: slideMs(s.text) }))
export const INTRO_MS = IRWIN_SLIDES.reduce((sum, s) => sum + s.ms, 0)
export const IRWIN_DOOR_SLIDE = { title: 'The door', text: "Pawsome! The light by the door went from dark gray to... lighter gray! I think that means it's open! I don't really do colors. Let's go in!" }
export const TIMING = { turnMs: TURN_MS, walkMs: WALK_MS, pullMs: PULL_MS, voteMs: VOTE_MS, lockoutMs: LOCKOUT_MS, introMs: INTRO_MS }

// The time budget: the drawing itself (every turn plus the walk before it)
// fits eighteen minutes (docs/relay-drawing-game.md §5). The generator caps
// the drawn cells per grid so the turns never add up to more than this.
export const DRAW_BUDGET_MS = 18 * 60_000
export const MAX_TURNS = Math.floor(DRAW_BUDGET_MS / (TURN_MS + WALK_MS))

// A phone heard from this recently counts as present: a vote closes when
// every present phone has picked, so an absent phone never holds the room.
export const PRESENT_MS = 2 * 60_000

function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}
function at(now, delta) { return new Date(now + delta) }

export function relayPaths(nightId) {
  return { pub: `nights/${nightId}/public/relay`, priv: `nights/${nightId}/private/relay` }
}

// Who draws: a random player every turn, anyone, even three times in a row (handoff §7).
export function turnOrder(keys, turns, pickInt = randomInt) {
  return Array.from({ length: turns }, () => keys[pickInt(keys.length)])
}

// The drawer as the main display shows them: their character's portrait and name, never a real name.
function characterOf(roster, key) {
  const ch = characterById(roster?.[key]?.characterId)
  return { characterId: ch?.id ?? null, characterName: ch?.name ?? 'Someone' }
}
const ROUND_NAMES = ['Practice', 'Round 1', 'Round 2', 'Round 3']

export const RUNNING = ['intro', 'walk', 'turn', 'vote', 'lockout']

// Is a drawing under way (or finished and still on the screens)?
export async function state(db, nightId) {
  const snap = await db.doc(relayPaths(nightId).pub).get()
  return snap.exists ? (snap.data().state ?? 'idle') : 'idle'
}

// Start the drawing. Host button; it tells the host nothing. A drawing that
// is already running (or done, with the trace behind the door) is never
// wiped by a second press: it answers { already: true } unless the host said
// "restart" (force), which the Host tab asks about first. The beat never forces.
export async function start(db, { nightId, now = Date.now(), seed = null, force = false } = {}) {
  const nightSnap = await db.doc(`nights/${nightId}`).get()
  if (!nightSnap.exists) throw new NightError('no-night', 'No such night.')
  const current = await state(db, nightId)
  if ((RUNNING.includes(current) || current === 'done') && !force) return { ok: true, already: true, state: current }
  if (force && current !== 'idle') await reset(db, { nightId, now })
  const roster = nightSnap.data().roster ?? {}
  // a seeded rehearsal draws the same pictures in the same order again (seed.js)
  const word = await nightSeed(db, nightId)
  if (seed == null) seed = pickFor(word, 'relay')(2 ** 31)
  const keys = word ? Object.keys(roster).sort() : Object.keys(roster)
  if (keys.length < 2) throw new NightError('invalid', 'The drawing needs at least two people.')
  // the sealed bank, on the party night only; a rehearsal never reads it
  const caseSnap = await db.doc(`cases/${nightId}`).get()
  const party = caseSnap.exists && caseSnap.data().rehearsal === false
  const bank = party ? (await db.doc(BANK_DOC).get()).data() ?? null : null
  const set = relayGrids({ bank, standIn: generateSet(seed), seed })
  const turns = set.grids.reduce((n, g) => n + g.order.length, 0)
  if (turns > MAX_TURNS) throw new NightError('invalid', 'The drawing would run over its time.')
  const present = await presentKeys(db, nightId, keys, now)
  const order = turnOrder(keys, turns, pickFor(word, 'relay-order'))
  const { pub, priv } = relayPaths(nightId)
  const batch = db.batch()
  batch.set(db.doc(priv), {
    seed, grids: set.grids, order, votes: {}, crossed: [], misses: set.grids.map(() => 0), fromBank: set.fromBank,
  })
  const first = set.grids[0]
  const nextChar = characterOf(roster, order[0])
  batch.set(db.doc(pub), {
    state: 'intro',              // Sir Irwin's rules slides, then the first drawer walks to the paper
    grid: 1, gridCount: set.grids.length, round: ROUND_NAMES[0], gridSize: first.size, gridTurns: first.order.length, gridDone: [],
    turnIndex: 0, turnsTotal: turns,
    drawerKey: null, drawerName: null, drawerCharacterId: null,
    nextKey: order[0], nextName: nextChar.characterName, nextCharacterId: nextChar.characterId,
    cell: null,
    slides: IRWIN_SLIDES, introEndsAt: at(now, INTRO_MS),
    turnEndsAt: null, walkEndsAt: null, voteEndsAt: null, lockoutEndsAt: null,
    options: null, crossed: [], votesIn: 0, votesNeeded: present.length, lastResult: null,
    doorOpen: false, startedAt: at(now, 0), finishedAt: null, stats: null,
    timing: { ...TIMING }, // the phones draw their bars from these, never from their own constants
  })
  await batch.commit()
  return { ok: true, turns }
}

// Clear it, for rehearsals. The trace behind the door and the green hall
// light go with it, so the next run's finish is a real moment again and the
// door can open a second time (deal.revealTrace runs again once the public
// trace doc is gone).
export async function reset(db, { nightId, now = Date.now() }) {
  const { pub, priv } = relayPaths(nightId)
  await db.doc(pub).set({ state: 'idle', doorOpen: false })
  await db.doc(priv).set({ grids: null, order: null, votes: {} })
  await db.doc(`nights/${nightId}/public/trace`).delete()
  await db.doc(`nights/${nightId}/private/trace`).delete()
  await db.doc(`nights/${nightId}/public/cues`).set({ hall: 'red', changedAt: new Date(now) }, { merge: true })
  return { ok: true }
}

// Which roster phones have been heard from lately (presence rows for this
// night, written by every phone's heartbeat). With nobody heard from, every
// phone counts, so the window still has a size.
export async function presentKeys(db, nightId, keys, now = Date.now()) {
  let rows = []
  try { rows = (await db.collection('presence').where('nightId', '==', nightId).get()).docs } catch { rows = [] }
  const seen = new Set()
  for (const d of rows) {
    const p = d.data() ?? {}
    if (p.guestKey && keys.includes(p.guestKey) && now - ms(p.at) < PRESENT_MS) seen.add(p.guestKey)
  }
  return seen.size ? keys.filter(k => seen.has(k)) : [...keys]
}

// The phones no longer vote (handoff §7): the room guesses on the main
// computer. A phone that still asks is told so, kindly.
export async function vote() {
  throw new NightError('invalid', 'Guess on the main computer, all together.')
}

// The room's guess, tapped on the main computer (the living room kiosk). Right:
// the next grid, or the door opens after the last. Wrong: crossed off, a short
// lockout, then guess again from what is left. One guess per tap.
export async function guess(db, { nightId, pick, now = Date.now() } = {}) {
  const { pub, priv } = relayPaths(nightId)
  const nightSnap = await db.doc(`nights/${nightId}`).get()
  const roster = nightSnap.exists ? (nightSnap.data().roster ?? {}) : {}
  const idx = Number(pick)
  return db.runTransaction(async tx => {
    const [pubSnap, privSnap] = await Promise.all([tx.get(db.doc(pub)), tx.get(db.doc(priv))])
    const p = pubSnap.exists ? pubSnap.data() : null
    const d = privSnap.exists ? privSnap.data() : null
    if (!p || !d?.grids || p.state !== 'vote') throw new NightError('closed', 'Nothing to guess right now.')
    if (!(idx >= 0 && idx < 4) || (p.crossed ?? []).includes(idx)) throw new NightError('invalid', 'Pick one still standing.')
    const g = d.grids[p.grid - 1]
    const misses = [...(d.misses ?? d.grids.map(() => 0))]
    if (idx === g.answer) {
      if (p.grid >= d.grids.length) {
        const totalSeconds = Math.round((now - ms(p.startedAt)) / 1000)
        tx.update(db.doc(pub), {
          state: 'done', doorOpen: true, lastResult: 'right', options: null, doorSlide: IRWIN_DOOR_SLIDE,
          finishedAt: at(now, 0), stats: { totalSeconds, misses: misses.slice(1) }, // the practice round is not counted
        })
        tx.set(db.doc(`nights/${nightId}/public/sounds`), { current: { id: 'sting-door', at: at(now, 0) } }, { merge: true }) // the door sting (screen.js SOUND_IDS)
        return { ok: true, right: true, state: 'done' }
      }
      const nextGrid = d.grids[p.grid]
      const nextKey = d.order[p.turnIndex + 1]
      const ch = characterOf(roster, nextKey)
      tx.update(db.doc(priv), { crossed: [] })
      tx.update(db.doc(pub), {
        state: 'walk', lastResult: 'right', options: null, crossed: [],
        grid: p.grid + 1, round: ROUND_NAMES[p.grid] ?? `Round ${p.grid}`, gridSize: nextGrid.size, gridTurns: nextGrid.order.length, gridDone: [],
        turnIndex: p.turnIndex + 1, nextKey, nextName: ch.characterName, nextCharacterId: ch.characterId,
        walkEndsAt: at(now, PULL_MS),
      })
      return { ok: true, right: true, state: 'walk' }
    }
    const crossed = [...(p.crossed ?? []), idx]
    misses[p.grid - 1] += 1
    tx.update(db.doc(priv), { crossed, misses })
    tx.update(db.doc(pub), { state: 'lockout', lastResult: 'wrong', crossed, lockoutEndsAt: at(now, LOCKOUT_MS) })
    return { ok: true, right: false, state: 'lockout' }
  })
}

// Move the clock. Called by the living room kiosk (and any phone) whenever a
// deadline has passed. Safe to call too often. A guess waits for the room.
export async function advance(db, { nightId, now = Date.now() } = {}) {
  const { pub, priv } = relayPaths(nightId)
  const nightSnap = await db.doc(`nights/${nightId}`).get()
  const roster = nightSnap.exists ? (nightSnap.data().roster ?? {}) : {}
  if (nightSnap.exists && nightSnap.data().phase === 'paused') return { moved: false, state: 'paused' } // the host's pause holds every deadline (resume shifts them)
  return db.runTransaction(async tx => {
    const [pubSnap, privSnap] = await Promise.all([tx.get(db.doc(pub)), tx.get(db.doc(priv))])
    if (!pubSnap.exists || !privSnap.exists) return { moved: false, state: 'idle' }
    const p = pubSnap.data()
    const d = privSnap.data()
    if (!d.grids) return { moved: false, state: p.state }
    const g = d.grids[p.grid - 1]

    // ---- Sir Irwin's slides end → the first drawer walks to the paper and pulls it down
    if (p.state === 'intro') {
      if (now < ms(p.introEndsAt)) return { moved: false, state: p.state }
      tx.update(db.doc(pub), { state: 'walk', introEndsAt: null, walkEndsAt: at(now, PULL_MS) })
      return { moved: true, state: 'walk' }
    }

    // ---- a turn ends → the next drawer is called, or the grid goes to the guess
    if (p.state === 'turn') {
      if (now < ms(p.turnEndsAt)) return { moved: false, state: p.state }
      const gridDone = [...(p.gridDone ?? []), p.cell.label]
      if (gridDone.length >= g.order.length) {
        tx.update(db.doc(priv), { crossed: [] })
        tx.update(db.doc(pub), {
          state: 'vote', gridDone, cell: null, drawerKey: null, drawerName: null, drawerCharacterId: null, nextKey: null, nextName: null, nextCharacterId: null,
          turnEndsAt: null, voteEndsAt: null,
          options: g.options.map(o => (o.name ? { name: o.name } : { size: o.size ?? g.size, cells: o.cells })),
          crossed: [], lastResult: null,
        })
        return { moved: true, state: 'vote' }
      }
      const nextIdx = p.turnIndex + 1
      const nextKey = d.order[nextIdx]
      const ch = characterOf(roster, nextKey)
      tx.update(db.doc(pub), {
        state: 'walk', gridDone, turnIndex: nextIdx, cell: null,
        drawerKey: null, drawerName: null, drawerCharacterId: null, nextKey, nextName: ch.characterName, nextCharacterId: ch.characterId,
        turnEndsAt: null, walkEndsAt: at(now, WALK_MS),
      })
      return { moved: true, state: 'walk' }
    }

    // ---- the walk ends (the drawer is at the paper) → only now the square is shown
    if (p.state === 'walk') {
      if (now < ms(p.walkEndsAt)) return { moved: false, state: p.state }
      const drawn = p.gridDone ?? []
      const label = g.order.find(l => !drawn.includes(l))
      const key = d.order[p.turnIndex]
      const ch = characterOf(roster, key)
      tx.update(db.doc(pub), {
        state: 'turn',
        drawerKey: key, drawerName: ch.characterName, drawerCharacterId: ch.characterId,
        nextKey: null, nextName: null, nextCharacterId: null,
        cell: { label, strokes: g.cells[label] },
        turnEndsAt: at(now, TURN_MS), walkEndsAt: null,
      })
      return { moved: true, state: 'turn' }
    }

    // ---- the lockout ends → guess again over what is left
    if (p.state === 'lockout') {
      if (now < ms(p.lockoutEndsAt)) return { moved: false, state: p.state }
      tx.update(db.doc(pub), { state: 'vote', lockoutEndsAt: null, lastResult: null })
      return { moved: true, state: 'vote' }
    }
    return { moved: false, state: p.state }
  })
}

export { cellLabel }
