// Jon's two Shortcuts for the blackout (12 Nov 2026: "I have added 2 new
// shortcuts to help with the black out. Blackout and afterblackout. Please use
// these if it helps make the blackout hit hard.").
//
// On the brain, "Blackout" runs his Home scene with every light in the house
// off: the Hue scene the brain recalls at the dark reaches only the lights on
// the Hue bridge, and this one reaches the rest (and the string lights and
// the Study's walls). "AfterBlackOut" runs the one that brings the house
// back. Neither touches a HomePod: the music's stop is still its own Shortcut
// (cues/scenes.json musicShortcuts.off), run at the press as before.
//
// When they run, against the blackout's three marks (nights/{id}.blackout:
// pressAt, darkAt, powerAt; the same marks every screen and phone follows):
//   the dark's Shortcut  shortcutLeadMs before the dark mark (1500 to start):
//       a Shortcut's Home scene takes a second or two to land, so it is
//       started early and the lights die on the mark, with the screens and
//       the scream. At once when that moment has already passed, and never
//       once the power's mark has come.
//   the after Shortcut   afterLeadMs before the power's mark (0 to start: the
//       Hue lights come back on the mark by the bridge, the rest of the house
//       a second or two behind), or at once when the blackout ends sooner
//       than its marks said: Power returns by hand, or a pause in the lead
//       after the lights had already gone.
// Each runs once a press, and the after Shortcut only when the dark's ran (or
// when no dark Shortcut is named), so the house is never left dark and never
// lit by a press that never went dark. The Blackout test on the Host tab
// writes the same marks, so both run there too: that is how the two leads are
// tuned by eye, before the guests come.
//
// Pure: no I/O, no clock of its own. cues/cues.mjs runs what this says.

export const DEFAULT_SHORTCUT_LEAD_MS = 1500
export const DEFAULT_AFTER_LEAD_MS = 0
export const MAX_SHORTCUT_LEAD_MS = 10_000

const nameOf = v => (typeof v === 'string' && v.trim() ? v.trim() : null)
const leadOf = (v, fallback) => {
  const n = Number(v)
  return v !== null && v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 ? Math.min(MAX_SHORTCUT_LEAD_MS, Math.round(n)) : fallback
}

// The sheet's two names and leads: { dark: { name, leadMs } | null, after: { name, leadMs } | null }.
export function blackoutShortcutsOf(sheet) {
  const b = sheet?.blackout ?? {}
  const dark = nameOf(b.shortcut)
  const after = nameOf(b.afterShortcut)
  return {
    dark: dark ? { name: dark, leadMs: leadOf(b.shortcutLeadMs, DEFAULT_SHORTCUT_LEAD_MS) } : null,
    after: after ? { name: after, leadMs: leadOf(b.afterLeadMs, DEFAULT_AFTER_LEAD_MS) } : null,
  }
}

// What is wrong with the sheet's blackout block, for sceneProblems (one line each).
export function blackoutShortcutProblems(cfg) {
  const out = []
  const b = cfg?.blackout
  if (b === undefined || b === null) return out
  if (typeof b !== 'object' || Array.isArray(b)) return ['blackout is not an object']
  for (const k of ['shortcut', 'afterShortcut']) {
    if (Object.hasOwn(b, k) && b[k] !== null && !nameOf(b[k])) out.push(`blackout.${k} is not a Shortcut's name or null`)
  }
  for (const k of ['shortcutLeadMs', 'afterLeadMs']) {
    if (Object.hasOwn(b, k) && b[k] !== null && !(Number.isFinite(Number(b[k])) && Number(b[k]) >= 0 && Number(b[k]) <= MAX_SHORTCUT_LEAD_MS && typeof b[k] !== 'boolean' && b[k] !== '')) {
      out.push(`blackout.${k} is not a number of milliseconds from 0 to ${MAX_SHORTCUT_LEAD_MS}`)
    }
  }
  return out
}

// A Shortcut's name as this Mac spells it: the very name, or the one that
// differs only in capitals and spaces (Jon wrote "afterblackout"; on the Mac
// it is "AfterBlackOut"). Null when this Mac has none.
export function nameOnThisMac(want, have = []) {
  const w = nameOf(want)
  if (!w) return null
  if (have.includes(w)) return w
  const loose = n => String(n).toLowerCase().replace(/\s+/g, '').trim()
  return have.find(h => loose(h) === loose(w)) ?? null
}

// The two Shortcuts against this Mac's list: the names to run (null for one
// that is not here) and what to say, one line each.
//   have: this Mac's Shortcut names, or null when the list could not be read (then the sheet's names are tried as they are)
export function blackoutShortcutCheck(cfg, have = null) {
  const lines = []
  const out = { dark: cfg?.dark ?? null, after: cfg?.after ?? null }
  if (!Array.isArray(have)) return { ...out, lines }
  const why = { dark: 'so only the lights on the Hue bridge go dark in the blackout', after: 'so only the lights on the Hue bridge come back after it' }
  for (const which of ['dark', 'after']) {
    const c = out[which]
    if (!c) continue
    const real = nameOnThisMac(c.name, have)
    if (!real) { out[which] = null; lines.push(`[blackout] no Shortcut called "${c.name}" on this Mac, ${why[which]}`); continue }
    if (real !== c.name) lines.push(`[blackout] the sheet says "${c.name}"; on this Mac the Shortcut is called "${real}", and that is the one the brain runs`)
    out[which] = { ...c, name: real }
  }
  if (out.dark || out.after) {
    const parts = []
    if (out.dark) parts.push(`"${out.dark.name}" ${out.dark.leadMs} ms before the dark`)
    if (out.after) parts.push(`"${out.after.name}" ${out.after.leadMs ? `${out.after.leadMs} ms before the power returns` : 'as the power returns'}`)
    lines.push(`[blackout] the house lights: ${parts.join(', then ')}`)
  }
  return { ...out, lines }
}

export const NO_PRESS = Object.freeze({ key: null, live: false, ranDark: false, ranAfter: false })

// When each Shortcut is due for these marks (ms), or null for one that is not named.
export function blackoutShortcutTimes(marks, cfg = {}) {
  if (!marks) return { darkAt: null, afterAt: null }
  const afterAt = cfg.after ? Math.max(marks.pressAt, marks.powerAt - cfg.after.leadMs) : null
  const darkAt = cfg.dark ? Math.max(marks.pressAt, marks.darkAt - cfg.dark.leadMs) : null
  return { darkAt, afterAt }
}

// One step. `marks`: { pressAt, darkAt, powerAt } in ms (lib/cues.js
// blackoutMarkTimes), or null when the night carries none; `cfg`: the two
// Shortcuts to run (blackoutShortcutCheck's dark and after). Returns
// { state, run: [{ which: 'dark' | 'after', name }], nextAt }: what to run
// now, in order, and when to step again (null: nothing more is due).
export function stepBlackoutShortcuts(state = NO_PRESS, { marks = null, now = Date.now(), cfg = {} } = {}) {
  const run = []
  if (!marks) {
    // the marks are gone: the power is back (they come off with it) or the press was called off. If the
    // lights went out for it and were never brought back, bring them back now
    if (state.live && state.ranDark && !state.ranAfter && cfg.after) run.push({ which: 'after', name: cfg.after.name })
    return { state: NO_PRESS, run, nextAt: null }
  }
  let s = state
  if (s.key !== marks.pressAt) s = { key: marks.pressAt, live: now < marks.powerAt, ranDark: false, ranAfter: false }
  if (!s.live) return { state: s, run, nextAt: null } // first seen after its power's mark: nothing of it is the brain's to do
  const { darkAt, afterAt } = blackoutShortcutTimes(marks, cfg)
  const afterDue = afterAt !== null && now >= afterAt
  if (cfg.dark && !s.ranDark && now >= darkAt && now < marks.powerAt && !afterDue) {
    run.push({ which: 'dark', name: cfg.dark.name })
    s = { ...s, ranDark: true }
  }
  if (cfg.after && !s.ranAfter && afterDue) {
    // only what went dark is brought back (or, with no dark Shortcut named, the after one runs for itself)
    if (s.ranDark || !cfg.dark) run.push({ which: 'after', name: cfg.after.name })
    s = { ...s, ranAfter: true }
  }
  const pending = []
  if (cfg.dark && !s.ranDark && darkAt > now) pending.push(darkAt)
  if (cfg.after && !s.ranAfter && afterAt > now) pending.push(afterAt)
  return { state: s, run, nextAt: pending.length ? Math.min(...pending) : null }
}
