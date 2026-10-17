// The relay drawing game (Act 6): the state machine over Firestore.
// docs/relay-drawing-game.md is the design; this file is the clock.
//
// Public doc  nights/{id}/public/relay   — what every phone and kiosk sees:
//   the current cell only, who draws, who is next, the deadlines, the four
//   options at vote time, how many votes are in. Never the whole drawing.
// Private doc nights/{id}/private/relay  — the three grids, the answers,
//   the turn order, the votes. No client reads it.
//
// Timing: every deadline is a server timestamp written here; the phones and
// the living room kiosk render against it and call `advance` when it has
// passed. `advance` is idempotent: it moves the state exactly once per
// deadline and refuses early calls. Cloud Functions do not run timers.
//
// SEAL RULE: nothing in this file touches sealed/* or cases/*. The drawing
// is pure play; the trace behind the door is dealt elsewhere.

import { randomInt } from 'node:crypto'
import { generateSet, cellLabel } from './relay-gen.js'
import { NightError } from './night.js'

export const TURN_MS = 10_000      // ten seconds a turn, whatever the grid
export const WALK_MS = 12_000      // the next drawer walks to the paper
export const PULL_MS = 20_000      // pull the paper down to the next grid
export const VOTE_MS = 45_000      // walk to look, then pick; closes early when all are in
export const LOCKOUT_MS = 10_000   // after a wrong pick

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

// Who draws, in what order: every guest at least once before anyone repeats,
// shuffled within each pass, and never the same person twice running.
export function turnOrder(keys, turns, pickInt = randomInt) {
  const shuffle = (list) => {
    const a = [...list]
    for (let i = a.length - 1; i > 0; i--) { const j = pickInt(i + 1); [a[i], a[j]] = [a[j], a[i]] }
    return a
  }
  const out = []
  while (out.length < turns) {
    let pass = shuffle(keys)
    if (out.length && keys.length > 1 && pass[0] === out[out.length - 1]) pass = [...pass.slice(1), pass[0]]
    out.push(...pass)
  }
  return out.slice(0, turns)
}

// Start the drawing. Host button; it tells the host nothing.
export async function start(db, { nightId, now = Date.now(), seed = randomInt(2 ** 31) } = {}) {
  const nightSnap = await db.doc(`nights/${nightId}`).get()
  if (!nightSnap.exists) throw new NightError('no-night', 'No such night.')
  const roster = nightSnap.data().roster ?? {}
  const keys = Object.keys(roster)
  if (keys.length < 2) throw new NightError('invalid', 'The drawing needs at least two people.')
  const set = generateSet(seed)
  const turns = set.grids.reduce((n, g) => n + g.order.length, 0)
  const order = turnOrder(keys, turns)
  const { pub, priv } = relayPaths(nightId)
  const batch = db.batch()
  batch.set(db.doc(priv), {
    seed, grids: set.grids, order, votes: {}, crossed: [], misses: [0, 0, 0],
  })
  const first = set.grids[0]
  batch.set(db.doc(pub), {
    state: 'walk',               // the first drawer walks to the paper and pulls it down
    grid: 1, gridSize: first.size, gridTurns: first.order.length, gridDone: [],
    turnIndex: 0, turnsTotal: turns,
    drawerKey: null, drawerName: null,
    nextKey: order[0], nextName: roster[order[0]].name,
    cell: null,
    turnEndsAt: null, walkEndsAt: at(now, PULL_MS), voteEndsAt: null, lockoutEndsAt: null,
    options: null, crossed: [], votesIn: 0, votesNeeded: keys.length, lastResult: null,
    doorOpen: false, startedAt: at(now, 0), finishedAt: null, stats: null,
  })
  await batch.commit()
  return { ok: true, turns }
}

// Clear it, for rehearsals.
export async function reset(db, { nightId }) {
  const { pub, priv } = relayPaths(nightId)
  await db.doc(pub).set({ state: 'idle', doorOpen: false })
  await db.doc(priv).set({ grids: null, order: null, votes: {} })
  return { ok: true }
}

// One phone's pick, during a vote. Recorded privately; the public doc only
// counts. A second pick from the same phone replaces the first.
export async function vote(db, { nightId, uid, pick }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const { pub, priv } = relayPaths(nightId)
  const sessionSnap = await db.doc(`sessions/${uid}`).get()
  const s = sessionSnap.exists ? sessionSnap.data() : null
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  const idx = Number(pick)
  return db.runTransaction(async tx => {
    const [pubSnap, privSnap] = await Promise.all([tx.get(db.doc(pub)), tx.get(db.doc(priv))])
    const p = pubSnap.exists ? pubSnap.data() : null
    if (!p || p.state !== 'vote') throw new NightError('closed', 'Nothing to pick right now.')
    if (!(idx >= 0 && idx < 4) || (p.crossed ?? []).includes(idx)) throw new NightError('invalid', 'Pick one of the pictures still standing.')
    const votes = { ...(privSnap.data()?.votes ?? {}), [s.guestKey]: idx }
    tx.update(db.doc(priv), { votes })
    tx.update(db.doc(pub), { votesIn: Object.keys(votes).length })
    return { ok: true }
  })
}

// Move the clock. Called by the living room kiosk (and any phone) whenever a
// deadline has passed or every vote is in. Safe to call too often.
export async function advance(db, { nightId, now = Date.now(), pickInt = randomInt } = {}) {
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
    const nameOf = (key) => roster[key]?.name ?? key

    // ---- a turn ends → the next drawer walks, or the grid goes to a vote
    if (p.state === 'turn') {
      if (now < ms(p.turnEndsAt)) return { moved: false, state: p.state }
      const gridDone = [...(p.gridDone ?? []), p.cell.label]
      if (gridDone.length >= g.order.length) {
        tx.update(db.doc(priv), { votes: {}, crossed: [] })
        tx.update(db.doc(pub), {
          state: 'vote', gridDone, cell: null, drawerKey: null, drawerName: null, nextKey: null, nextName: null,
          turnEndsAt: null, voteEndsAt: at(now, VOTE_MS), options: g.options.map(cells => ({ size: g.size, cells })),
          crossed: [], votesIn: 0, votesNeeded: Object.keys(roster).length, lastResult: null,
        })
        return { moved: true, state: 'vote' }
      }
      const nextIdx = p.turnIndex + 1
      const nextKey = d.order[nextIdx]
      tx.update(db.doc(pub), {
        state: 'walk', gridDone, turnIndex: nextIdx, cell: null,
        drawerKey: null, drawerName: null, nextKey, nextName: nameOf(nextKey),
        turnEndsAt: null, walkEndsAt: at(now, WALK_MS),
      })
      return { moved: true, state: 'walk' }
    }

    // ---- the walk ends → show the next cell to the room
    if (p.state === 'walk') {
      if (now < ms(p.walkEndsAt)) return { moved: false, state: p.state }
      const drawn = p.gridDone ?? []
      const label = g.order.find(l => !drawn.includes(l))
      const key = d.order[p.turnIndex]
      const after = d.order[p.turnIndex + 1] ?? null
      const last = drawn.length + 1 >= g.order.length
      tx.update(db.doc(pub), {
        state: 'turn',
        drawerKey: key, drawerName: nameOf(key),
        nextKey: last ? null : after,
        nextName: last ? null : nameOf(after),
        cell: { label, strokes: g.cells[label] },
        turnEndsAt: at(now, TURN_MS), walkEndsAt: null,
      })
      return { moved: true, state: 'turn' }
    }

    // ---- the vote closes → right or wrong
    if (p.state === 'vote') {
      const allIn = p.votesIn >= Object.keys(roster).length
      if (!allIn && now < ms(p.voteEndsAt)) return { moved: false, state: p.state }
      const standing = [0, 1, 2, 3].filter(i => !(p.crossed ?? []).includes(i))
      const votes = { ...(d.votes ?? {}) }
      // an absent phone's pick is random: a no-show is never a pattern
      for (const key of Object.keys(roster)) if (!(key in votes)) votes[key] = standing[pickInt(standing.length)]
      const tally = {}
      for (const v of Object.values(votes)) if (standing.includes(v)) tally[v] = (tally[v] ?? 0) + 1
      const top = Math.max(0, ...Object.values(tally))
      const leaders = standing.filter(i => (tally[i] ?? 0) === top)
      const picked = leaders[pickInt(leaders.length)]
      if (picked === g.answer) {
        const misses = [...(d.misses ?? [0, 0, 0])]
        if (p.grid >= d.grids.length) {
          const totalSeconds = Math.round((now - ms(p.startedAt)) / 1000)
          tx.update(db.doc(priv), { votes: {} })
          tx.update(db.doc(pub), {
            state: 'done', doorOpen: true, lastResult: 'right', options: null, votesIn: 0,
            finishedAt: at(now, 0), stats: { totalSeconds, misses },
          })
          return { moved: true, state: 'done' }
        }
        const nextGrid = d.grids[p.grid]
        const nextKey = d.order[p.turnIndex + 1]
        tx.update(db.doc(priv), { votes: {}, crossed: [] })
        tx.update(db.doc(pub), {
          state: 'walk', lastResult: 'right', options: null, crossed: [], votesIn: 0,
          grid: p.grid + 1, gridSize: nextGrid.size, gridTurns: nextGrid.order.length, gridDone: [],
          turnIndex: p.turnIndex + 1, nextKey, nextName: nameOf(nextKey),
          voteEndsAt: null, walkEndsAt: at(now, PULL_MS),
        })
        return { moved: true, state: 'walk' }
      }
      // wrong: cross it out, a moment of nothing, then pick again
      const crossed = [...(p.crossed ?? []), picked]
      const misses = [...(d.misses ?? [0, 0, 0])]
      misses[p.grid - 1] += 1
      tx.update(db.doc(priv), { votes: {}, crossed, misses })
      tx.update(db.doc(pub), {
        state: 'lockout', lastResult: 'wrong', crossed, votesIn: 0,
        voteEndsAt: null, lockoutEndsAt: at(now, LOCKOUT_MS),
      })
      return { moved: true, state: 'lockout' }
    }

    // ---- the lockout ends → vote again over what is left
    if (p.state === 'lockout') {
      if (now < ms(p.lockoutEndsAt)) return { moved: false, state: p.state }
      tx.update(db.doc(pub), { state: 'vote', lockoutEndsAt: null, voteEndsAt: at(now, VOTE_MS), votesIn: 0, lastResult: null })
      return { moved: true, state: 'vote' }
    }
    return { moved: false, state: p.state }
  })
}

export { cellLabel }
