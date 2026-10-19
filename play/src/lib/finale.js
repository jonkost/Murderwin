// The living room screen in Act 7, as a pure function of the finale doc
// (nights/{id}/public/finale) and the server's clock. Nothing here is a
// timer. The doc carries the stats and the graph from the moment of the
// reveal beat; a name arrives in `names` only when the host presses, in the
// order Murderer, Motive, Victim. A hold (holdAt) freezes the clock where it
// stood; the server shifts every later moment when the host carries on.

export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

export const EPILOGUE_AFTER_MS = 12_000
export const HOST_STAGES = ['stats', 'murderer', 'motive', 'victim']
export const NEXT_NAME = { stats: 'murderer', murderer: 'motive', motive: 'victim', victim: null }

// How far the screen has got, in ms from the reveal beat. Held: it stands still.
export function elapsed(finale, now) {
  const at = ms(finale?.at)
  const t = (finale?.holdAt ? ms(finale.holdAt) : now) - at
  return Math.max(0, t)
}

// What the screen shows right now.
//  stats | awards | graph: on the clock, before any name
//  murderer | motive | victim: once the host has pressed that far (the clock no longer matters)
//  done: the closing story, a while after the Victim
export function finaleStage(finale, now) {
  if (!finale) return 'stats'
  const stage = HOST_STAGES.includes(finale.stage) ? finale.stage : 'stats'
  if (stage !== 'stats') {
    if (stage === 'victim' && finale.epilogue && finale.victimAt) {
      const since = (finale.holdAt ? ms(finale.holdAt) : now) - ms(finale.victimAt)
      if (since >= EPILOGUE_AFTER_MS) return 'done'
    }
    return stage
  }
  const t = elapsed(finale, now)
  const s = finale.schedule ?? {}
  if (t >= (s.graph ?? 50_000)) return 'graph'
  if (t >= (s.awards ?? 34_000) && (finale.achievements ?? []).length) return 'awards'
  return 'stats'
}

// May the host press the next name? Once the graph has had its time on screen.
export function namesReady(finale, now) {
  if (!finale) return false
  return elapsed(finale, now) >= (finale.schedule?.names ?? 80_000)
}

// Seconds until the host may press the first name (0 when ready).
export function secondsUntilNames(finale, now) {
  if (!finale) return 0
  return Math.max(0, Math.ceil(((finale.schedule?.names ?? 80_000) - elapsed(finale, now)) / 1000))
}

// The stat lines on screen at this moment, in order.
export function shownStats(finale, now) {
  const t = elapsed(finale, now)
  return (finale?.stats ?? []).filter(s => (s.showAt ?? 0) <= t)
}

export function shownAchievements(finale, now) {
  const t = elapsed(finale, now)
  return (finale?.achievements ?? []).filter(a => (a.showAt ?? 0) <= t)
}

// The names the screen may show: those the host has released, in canon order.
export function releasedNames(finale) {
  const stage = HOST_STAGES.includes(finale?.stage) ? finale.stage : 'stats'
  const upto = HOST_STAGES.indexOf(stage)
  return HOST_STAGES.slice(1, upto + 1)
}

// The workshop's achievements list ("Title: one line"), numbered as the host's tap sends them.
export function achievementsOf(content) {
  const raw = content?.achievements
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
  return list.map((it, i) => {
    const text = String(it?.text ?? '').trim()
    const m = /^([^:\n]+):\s*(.*)$/s.exec(text)
    return { n: i + 1, title: (m ? m[1] : text).trim(), line: (m ? m[2] : '').trim() }
  }).filter(a => a.title)
}

// The line under the graph when the host pressed Hush: the server's plain
// words for each role found out (finale.spotlight), or, when the doc carries
// only the flag, one generic line. Nothing when nobody was hushed.
export const HUSH_LINE = 'Hush. Somebody was found out, and the Manor said nothing.'
export function hushLines(finale) {
  const spot = Array.isArray(finale?.spotlight) ? finale.spotlight : []
  const lines = spot.map(s => String(s?.text ?? '').trim()).filter(Boolean)
  if (lines.length) return lines
  return finale?.graph?.hush ? [HUSH_LINE] : []
}
