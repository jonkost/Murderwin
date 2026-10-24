// The Health page's rules (pages/Health.jsx): turn the counts-only record that
// npm run checks saves (validation_reports/checks) into one line per group.
// Pure, so app/test can run it. The record never holds a word of content:
// a group's name, how many passed, the total, and for a failure the check's
// ID, its plain name and the stand-in case it failed on.

export const GROUP_ORDER = ['Case generator', 'Dry run', 'Leak checks']
export const ALL_CLEAR = 'All clear. The game is ready.'
export const RUN_AGAIN = 'To run again, ask Claude Code to run npm run checks.'

const number = n => Number(n ?? 0).toLocaleString('en-GB')

function millis(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  if (typeof t.seconds === 'number') return t.seconds * 1000
  return Number(t) || 0
}

export function healthView(record) {
  if (!record?.groups?.length) return { empty: true, groups: [], allClear: false, when: null }
  const named = new Map(record.groups.map(g => [g.name, g]))
  const ordered = [...GROUP_ORDER.filter(n => named.has(n)).map(n => named.get(n)), ...record.groups.filter(g => !GROUP_ORDER.includes(g.name))]
  const groups = ordered.map(g => {
    const ok = Number(g.total) > 0 && Number(g.passed) === Number(g.total)
    return {
      name: g.name,
      ok,
      line: `${g.name} · ${number(g.passed)} of ${number(g.total)} passed`,
      failed: ok ? [] : (g.failed ?? []).map(f => ({ id: String(f.id ?? ''), name: String(f.name ?? ''), seed: String(f.seed ?? '') })),
    }
  })
  const at = millis(record.at)
  const when = at ? new Date(at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) : null
  return { empty: false, groups, allClear: groups.length > 0 && groups.every(g => g.ok), when }
}
