// The Study test page's two roads (functions/lib/studytest.js): the
// `studyTest` callable, for the four buttons and the answer pad, and a read
// of public_state/study_test_status, which the study station keeps up to
// date through the same function. Neither carries anything sealed: the
// status is counts, states and the last tap, never a round's code.
//
// On a dev server with ?preview=1 (no sign-in) a pretend station answers,
// connected, so the page can be looked at.

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'
import { app, db } from '../firebase'
import { EMULATOR, EMULATOR_HOST, EMULATOR_PORTS, REGION } from './config'
import { PREVIEW } from './previewFlag'

let real = null
function realApi() {
  if (!real) {
    const functions = getFunctions(app, REGION)
    if (EMULATOR) connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions)
    const call = httpsCallable(functions, 'studyTest')
    real = {
      send: async (command, name = null) => (await call(name ? { command, name } : { command })).data,
      subscribeStatus: (onData, onError) => onSnapshot(doc(db, 'public_state', 'study_test_status'),
        snap => onData(snap.exists() ? snap.data() : null), onError),
    }
  }
  return real
}

// A pretend station: ten hexagons, twelve bars, a Stream Deck. Teaching
// lights the hexagons in turn on its own; a practice round walks through
// its states and takes the pad's keys.
function previewApi() {
  const listeners = new Set()
  let seq = 0
  let timer = null
  let status = {
    mode: 'idle', message: 'Pretend station (preview). Nothing is really connected.',
    walls: { elements: { ok: true, panels: 10, lights: 60, taught: 7 }, lines: { ok: true, bars: 12 } },
    deck: 'stream-deck', teach: null, practice: null, lastTap: null, seenSeq: 0,
  }
  const push = (patch) => {
    status = { ...status, ...patch, stationAt: Date.now(), updatedAt: Date.now() }
    listeners.forEach(fn => fn(status))
  }
  const later = (ms, fn) => { clearTimeout(timer); timer = setTimeout(fn, ms) }
  const tap = (panel) => ({ panel, known: true, at: Date.now() })
  const practice = (patch) => push({ practice: { ...status.practice, ...patch } })

  const teachStep = (step) => {
    if (step > 10) {
      push({ mode: 'idle', teach: null, message: 'Taught all 10 hexagons.', walls: { ...status.walls, elements: { ...status.walls.elements, taught: 10 } } })
      return
    }
    push({ mode: 'teach', teach: { step, of: 10 }, lastTap: step > 1 ? tap(step - 1) : status.lastTap, message: 'Teaching the taps.' })
    later(1500, () => teachStep(step + 1))
  }
  const play = () => {
    practice({ state: 'playing' })
    later(1500, () => { practice({ state: 'reproducing' }); later(1500, () => practice({ state: 'entering', pattern: 3 })) })
  }
  const key = (name) => {
    const p = status.practice
    if (status.mode !== 'practice' || p?.state !== 'entering') { push({ message: 'No practice round is waiting for a key, so that key did nothing.' }); return }
    const entry = { ...p.entry }
    if (/^[1-6]$/.test(name)) entry.number = name
    else if (name === 'undo') { if (entry.number) entry.number = null; else entry.colour = null }
    else if (name === 'submit') {
      if (!entry.colour || !entry.number) { push({ message: 'Pick a colour and a number, then Submit.' }); return }
      const pairs = p.pairs + 1
      if (pairs >= p.rounds) { push({ mode: 'idle', message: 'The practice round is over.', practice: { ...p, pairs, entry: { colour: null, number: null }, state: 'done', outcome: 'solved' } }); return }
      practice({ pairs, round: p.round + 1, pattern: 1, entry: { colour: null, number: null }, state: 'idle' })
      later(1200, play)
      return
    } else entry.colour = name
    practice({ entry })
  }

  const run = (command, name, mine) => {
    if (command === 'flash') { push({ mode: 'flash', message: 'Flashing both walls.' }); later(1500, () => push({ mode: 'idle', message: 'Both walls flashed.' })) }
    if (command === 'teach') teachStep(1)
    if (command === 'practice') {
      push({ mode: 'practice', message: 'A practice round. Nothing reaches a real night.', practice: { state: 'idle', round: 1, rounds: 3, pattern: 1, patterns: 3, pairs: 0, entry: { colour: null, number: null }, misses: 0, outcome: null, shown: null } })
      later(1500, play)
    }
    if (command === 'stop') { clearTimeout(timer); push({ mode: 'idle', teach: null, message: 'Stopped. Both walls are back to rest.' }) }
    if (command === 'key') key(name)
    push({ seenSeq: mine })
  }

  return {
    send: async (command, name = null) => {
      await new Promise(r => setTimeout(r, 150))
      seq += 1
      const mine = seq
      setTimeout(() => run(command, name, mine), 300)
      return { ok: true, seq: mine }
    },
    subscribeStatus: (onData) => {
      listeners.add(onData)
      queueMicrotask(() => push({}))
      const beat = setInterval(() => push({}), 20_000)
      return () => { listeners.delete(onData); clearInterval(beat) }
    },
  }
}

export function studyTestApi() {
  return PREVIEW ? previewApi() : realApi()
}
