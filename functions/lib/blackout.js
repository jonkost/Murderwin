// The blackout's timeline (handoff 11 Nov 2026, A1: "That has to hit so hard.
// So everything has to go black... there was still music playing during it.").
//
// Three marks, run by the server inside the Blackout command:
//   Press  the press itself: the brain stops all the music (the HomePods take
//          a moment, so they are told first);
//   Dark   leadMs later (cues/scenes.json blackout.leadMs, 2000 to start; tuned
//          by ear): every light, screen, phone and deck goes dark in the same
//          moment, and every room screen and phone plays the scream itself;
//   Power  five seconds after Dark: the power returns, as before.
// The marks are written at the press on nights/{id}.blackout = { pressAt,
// darkAt, powerAt, test }, which every device already listens to: each one
// goes dark on its own server clock at darkAt and comes back at powerAt, so
// they all cut together (the phase flip at Dark is the backstop for anything
// that reads only the phase). The client rule holds: the dark is at most five
// seconds and the power returns on its own.
//
// The Blackout test (practice nights only) is the same three marks with
// test: true, and nothing else: no phase, act, beat, screen or case is
// touched, so a test can never strand a night in the dark, and Jon can press
// it as often as he likes. Its scream plays from the sounds doc like the real one.
//
// Nothing here is sealed: three times and a yes-or-no.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const BLACKOUT_POWER_MS = 5_000
export const DEFAULT_LEAD_MS = 2_000
export const MAX_LEAD_MS = 10_000

// The lead, from the brain's sheet as copied into functions/seed by `npm run
// seed` (cues/scenes.json blackout.leadMs). 2000 when the copy or the key is
// not there, and never more than ten seconds.
export function leadFrom(sheet) {
  const v = Number(sheet?.blackout?.leadMs)
  return Number.isFinite(v) && v >= 0 ? Math.min(MAX_LEAD_MS, Math.round(v)) : DEFAULT_LEAD_MS
}
const SHEET_FILE = 'scenes.json' // cues/scenes.json, copied by npm run seed; optional (2000 without it)
function readSheet() {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    return JSON.parse(readFileSync(join(here, '..', 'seed', SHEET_FILE), 'utf8'))
  } catch { return null }
}
export const BLACKOUT_LEAD_MS = leadFrom(readSheet())

// The three marks for a press at `pressAt` (ms).
export function blackoutMarks(pressAt, { leadMs = BLACKOUT_LEAD_MS, test = false } = {}) {
  const darkAt = pressAt + leadMs
  return { pressAt: new Date(pressAt), darkAt: new Date(darkAt), powerAt: new Date(darkAt + BLACKOUT_POWER_MS), test: !!test }
}

export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// Where a night's blackout marks stand at `now`: 'press' (the music is
// stopping, the dark is coming), 'dark', or null (no marks, or the power is
// back). The same rule as play/src/lib/blackout.js and cues/lib/cues.js.
export function blackoutStage(mark, now) {
  if (!mark) return null
  const press = ms(mark.pressAt)
  const dark = ms(mark.darkAt)
  const power = ms(mark.powerAt)
  if (!dark || !power || now < press) return null
  if (now < dark) return 'press'
  if (now < power) return 'dark'
  return null
}

// Is a press still running (its power not back yet)? A second press then answers already.
export function blackoutRunning(mark, now) {
  return !!mark && now < ms(mark.powerAt)
}

// The press: write the marks, once. Answers false when a press is already
// running (its power not back), so a second press changes nothing.
export async function pressBlackout(db, nightId, { now = Date.now(), leadMs = BLACKOUT_LEAD_MS, test = false } = {}) {
  const ref = db.doc(`nights/${nightId}`)
  const marks = blackoutMarks(now, { leadMs, test })
  const ok = await db.runTransaction(async tx => {
    const n = (await tx.get(ref)).data() ?? {}
    if (blackoutRunning(n.blackout, now)) return false
    tx.update(ref, { blackout: marks })
    return true
  })
  return ok ? marks : null
}

// Take the marks off, but only this press's (a later press keeps its own).
export async function clearBlackout(db, nightId, marks) {
  const ref = db.doc(`nights/${nightId}`)
  await db.runTransaction(async tx => {
    const n = (await tx.get(ref)).data() ?? {}
    if (n.blackout && ms(n.blackout.pressAt) === ms(marks?.pressAt)) tx.update(ref, { blackout: null })
  })
}
