// The Game test tab's roads. The `gameTest` callable (functions/lib/gametest.js)
// opens and stops the two practices and starts and moves a test night; it
// refuses every night command while the party box is ticked or the live
// night is the party or a dry run, moves only a night it started itself
// (gameTest: true), and ends a rehearsal from a phone only with replace,
// sent after the page asked. The tab reads:
//   public_state/game_test_salem   Get Off My Lawn!'s practice
//   public_state/game_test_boo     Boo's practice show
//   public_state/active, and the live night's own public doc: its act, its
//                                  name, and whether it is a test night, another
//                                  rehearsal, a dry run or the party
//   meta/game_test                 the tab's own status chips, which this page writes
// None of it is sealed. A practice record is names, rounds and times; a
// night's public doc never holds its case, and its private records are never
// read here.
//
// On a dev server with ?preview=1 (no sign-in) a pretend server answers, so
// the page can be looked at.

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { doc, onSnapshot, writeBatch, collection, serverTimestamp } from 'firebase/firestore'
import { app, db } from '../firebase'
import { EMULATOR, EMULATOR_HOST, EMULATOR_PORTS, REGION } from './config'
import { PREVIEW } from './previewFlag'
import { whoAmI } from './store'

// Only what the strip needs from the live night.
function nightFacts(n) {
  if (!n) return null
  return { act: n.act ?? 0, beat: n.beat ?? null, phase: n.phase ?? null, label: n.label ?? '', forceRehearsal: n.forceRehearsal, dryRun: n.dryRun === true, gameTest: n.gameTest === true }
}

let real = null
function realApi() {
  if (!real) {
    const functions = getFunctions(app, REGION)
    if (EMULATOR) connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions)
    const call = httpsCallable(functions, 'gameTest')
    const watch = (id) => (onData, onError) => onSnapshot(doc(db, 'public_state', id),
      snap => onData(snap.exists() ? snap.data() : null), onError)
    real = {
      send: async (command, args = {}) => (await call({ ...args, command })).data,
      subscribeSalem: watch('game_test_salem'),
      subscribeBoo: watch('game_test_boo'),
      // public_state/active names the live night; that night's doc says what it is.
      subscribeLive: (onData, onError) => {
        let inner = null
        let innerId
        const outer = onSnapshot(doc(db, 'public_state', 'active'), snap => {
          const nightId = snap.exists() ? snap.data().nightId ?? null : null
          if (nightId === innerId) return
          inner?.()
          inner = null
          innerId = nightId
          if (!nightId) { onData({ nightId: null, night: null }); return }
          inner = onSnapshot(doc(db, 'nights', nightId), s => onData({ nightId, night: s.exists() ? nightFacts(s.data()) : null }), onError)
        }, onError)
        return () => { outer(); inner?.() }
      },
      subscribeChips: (onData, onError) => onSnapshot(doc(db, 'meta', 'game_test'),
        snap => onData(snap.exists() ? snap.data() : {}), onError),
      // One chip, merged so the other sections' chips stay, with its line in
      // the workshop's history in the same commit.
      saveChip: async (key, entry, before = null) => {
        const by = await whoAmI()
        const batch = writeBatch(db)
        batch.set(doc(db, 'meta', 'game_test'), { [key]: entry }, { merge: true })
        batch.set(doc(collection(db, 'workshop_history')), { area: 'game_test', itemId: key, before: before ?? null, after: entry, by, ts: serverTimestamp() })
        await batch.commit()
      },
    }
  }
  return real
}

// A pretend server: the practices and a test night in memory. It refuses
// what the real one refuses, in the same words, so the page's messages can
// be looked at.
function previewApi() {
  const state = { salem: null, boo: null, live: { nightId: null, night: null }, chips: {} }
  const subs = { salem: new Set(), boo: new Set(), live: new Set(), chips: new Set() }
  const push = (k) => subs[k].forEach(fn => fn(state[k]))
  const watch = (k) => (onData) => { subs[k].add(onData); queueMicrotask(() => onData(state[k])); return () => subs[k].delete(onData) }
  let runs = 0
  const runId = () => `preview-${++runs}`
  const refuse = (code, message) => { const e = new Error(message); e.code = `functions/${code}`; throw e }
  const commands = {
    'salem-open': () => {
      const now = Date.now()
      state.salem = { runId: runId(), state: 'idle', round: 1, attempt: 0, slips: 0, lastSlip: null, players: { a: { name: 'Jon', at: now }, b: { name: 'Susan', at: now + 1 } }, updatedAt: new Date(now) }
      push('salem')
      return { ok: true, runId: state.salem.runId }
    },
    'salem-stop': () => { if (state.salem) { state.salem = { ...state.salem, state: 'done' }; push('salem') } return { ok: true } },
    'boo-start': () => {
      const start = Date.now() + 3000
      let t = start + 9000
      const poses = [0, 1, 2].map(() => { const stopAt = t + 8000; t = stopAt + 5000 + 6000; return { stopAt: new Date(stopAt), holdUntil: new Date(stopAt + 5000), judgedAt: new Date(t) } })
      state.boo = { runId: runId(), state: 'playing', startsAt: new Date(start), poses, endsAt: new Date(t + 3000), updatedAt: new Date() }
      push('boo')
      return { ok: true, runId: state.boo.runId }
    },
    'boo-stop': () => { if (state.boo) { state.boo = { ...state.boo, state: 'done' }; push('boo') } return { ok: true } },
    'night-start': () => {
      state.live = { nightId: 'preview-night', night: { act: 0, beat: 'arrive', phase: 'lobby', label: 'Game test', forceRehearsal: true, dryRun: false, gameTest: true } }
      push('live')
      return { ok: true }
    },
    'night-act': ({ act }) => {
      if (!state.live.night) refuse('failed-precondition', 'Start a test night first.')
      state.live = { ...state.live, night: { ...state.live.night, act: Number(act), phase: 'act' } }
      push('live')
      return { ok: true }
    },
    'night-parlour': () => {
      if (![2, 4, 6].includes(state.live.night?.act)) refuse('failed-precondition', 'The phones light up in Acts 2, 4 and 6.')
      return { ok: true }
    },
  }
  return {
    send: async (command, args = {}) => {
      await new Promise(r => setTimeout(r, 300))
      const fn = commands[command]
      if (!fn) refuse('invalid-argument', 'No such test.')
      return fn(args)
    },
    subscribeSalem: watch('salem'),
    subscribeBoo: watch('boo'),
    subscribeLive: watch('live'),
    subscribeChips: watch('chips'),
    saveChip: async (key, entry) => { state.chips = { ...state.chips, [key]: entry }; push('chips') },
  }
}

export function gameTestApi() {
  return PREVIEW ? previewApi() : realApi()
}
