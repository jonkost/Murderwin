// The push and pull questions: one scenario is three questions in a row.
// Each question has two choices to start with, and a third or fourth when a
// question needs one. Every choice carries a number (points). Whatever a
// guest picks, the next question is the same, so a guest's path adds up
// three numbers.
//
// Pure module (no React, no Firebase, no JSON imports) so it can be tested
// with node --test. Word lists are passed in by the caller.

export const BEATS = 3
export const CHOICE_KEYS = ['a', 'b', 'c', 'd']
export const MIN_CHOICES = 2
export const MAX_CHOICES = 4
export const CHOICE_LABELS = { a: 'Choice A', b: 'Choice B', c: 'Choice C', d: 'Choice D' }

export function emptyBeat() {
  return { q: '', n: 2, a: '', av: 0, b: '', bv: 0 }
}

export function emptyBeats() {
  return [emptyBeat(), emptyBeat(), emptyBeat()]
}

export const VALUE_MIN = -9
export const VALUE_MAX = 9

export function clampValue(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(VALUE_MIN, Math.min(VALUE_MAX, Math.round(n)))
}

export function clampChoices(n) {
  const c = Number(n)
  if (!Number.isFinite(c)) return MIN_CHOICES
  return Math.max(MIN_CHOICES, Math.min(MAX_CHOICES, Math.round(c)))
}

export function fmtValue(v) {
  const n = clampValue(v)
  return n > 0 ? `+${n}` : String(n)
}

// The choice keys a question shows: a, b, and c or d when it has them.
export function choicesOf(beat) {
  return CHOICE_KEYS.slice(0, clampChoices(beat?.n ?? 2))
}

// Anything stored, however old or odd, becomes exactly three well-formed
// beats. Idempotent: a well-formed set comes back deep-equal.
export function normalizeBeats(raw) {
  const list = Array.isArray(raw) ? raw : []
  const out = []
  for (let i = 0; i < BEATS; i++) {
    const b = list[i] ?? {}
    const n = clampChoices(b.n ?? 2)
    const beat = { q: typeof b.q === 'string' ? b.q : '', n }
    for (const k of CHOICE_KEYS.slice(0, n)) {
      beat[k] = typeof b[k] === 'string' ? b[k] : ''
      beat[`${k}v`] = clampValue(b[`${k}v`])
    }
    out.push(beat)
  }
  return out
}

// Every way through: one choice per question, in a fixed order (the first
// question changes slowest). Each path carries the words tapped and the
// total. Empty choices show as their letter.
export function pathTotals(beats) {
  const bs = normalizeBeats(beats)
  const paths = []
  const walk = (i, picks, total) => {
    if (i === BEATS) { paths.push({ picks, total }); return }
    for (const k of choicesOf(bs[i])) {
      const text = bs[i][k].trim() || k.toUpperCase()
      walk(i + 1, [...picks, text], total + bs[i][`${k}v`])
    }
  }
  walk(0, [], 0)
  return paths
}

export function pathCount(beats) {
  return normalizeBeats(beats).reduce((n, b) => n * choicesOf(b).length, 1)
}

// A scenario is "written" when every question and every choice has words.
export function isComplete(beats) {
  return normalizeBeats(beats).every(b => b.q.trim() && choicesOf(b).every(k => b[k].trim()))
}

export function hasAnyText(beats) {
  return normalizeBeats(beats).some(b => b.q.trim() || choicesOf(b).some(k => b[k].trim()))
}

// The first question doubles as the scenario's name in lists and history.
export function titleOf(beats) {
  const bs = normalizeBeats(beats)
  return bs[0].q.trim() || bs.find(b => b.q.trim())?.q.trim() || ''
}

// Words that make a question heavy. The rule from the design: silly and
// impossible to answer, never a trolley problem, nothing morally weighty.
export const HEAVY_WORDS = [
  'die', 'dies', 'died', 'dying', 'death', 'dead', 'kill', 'kills', 'killed', 'murder', 'murdered',
  'hurt', 'hurts', 'abuse', 'cheat', 'cheats', 'cheated', 'steal', 'stole', 'stolen', 'lie', 'lied',
  'drunk', 'drugs', 'sex', 'sexy', 'god', 'religion', 'vote', 'voting', 'election', 'politics', 'war',
  'suicide', 'cancer', 'divorce', 'racist', 'gun', 'guns', 'knife', 'blood', 'poison',
]

function words(text) {
  return (text ?? '').toLowerCase().replace(/['’]s\b/g, '').split(/[^a-z0-9]+/).filter(Boolean)
}

// One high-signal warning for a scenario, or null. `banned` carries the
// words that could point at the case (animal names, role words); it is
// built by the caller.
export function lintScenario(beats, banned = []) {
  const bs = normalizeBeats(beats)
  const bannedSet = new Set(banned.map(w => w.toLowerCase()))
  const heavy = new Set(HEAVY_WORDS)
  for (let i = 0; i < BEATS; i++) {
    const n = i + 1
    const b = bs[i]
    const all = [b.q, ...choicesOf(b).map(k => b[k])].join(' ')
    const ws = words(all)
    const hit = ws.find(w => bannedSet.has(w))
    if (hit) return `Question ${n} uses "${hit}", a word from the case. Keep every question about nothing at all.`
    const hv = ws.find(w => heavy.has(w))
    if (hv) return `Question ${n} has "${hv}" in it. Keep it silly: nothing heavy, nothing moral.`
    if (/—/.test(all)) return `Question ${n}: use a comma or a full stop instead of a long dash.`
  }
  for (let i = 0; i < BEATS; i++) {
    const n = i + 1
    const b = bs[i]
    const keys = choicesOf(b)
    if (!b.q.trim()) return `Question ${n} is empty. Ask something silly with ${keys.length === 2 ? 'two' : keys.length} possible answers.`
    if (keys.some(k => !b[k].trim())) return `Question ${n} needs words on every choice. A guest taps one of the buttons.`
    const lens = keys.map(k => b[k].trim().length)
    if (Math.max(...lens) > 2 * Math.min(...lens) + 6) return `Question ${n}: make the choices about the same length, so the buttons give nothing away.`
    if (keys.some(k => /\?\s*$/.test(b[k]))) return `Question ${n}: the choices are answers, not questions. Drop the question mark on the buttons.`
  }
  const totals = pathTotals(bs).map(p => p.total)
  if (totals.every(t => t === 0)) return 'Every path adds up to 0. Give at least one choice a number so this question pushes or pulls.'
  return null
}
