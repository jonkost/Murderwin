import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea, subscribeLatestValidation, subscribeHistory, whoAmI } from '../lib/store'
import { AREAS, AREA_GROUPS, GROUP_WHY, TAB_KINDS, goalOf, goalForTab } from '../lib/content'
import { isComplete } from '../lib/scenarios'
import { rankFor, irwinLine, dayKey, RANKS } from '../lib/household'
import { useReviews } from '../components/ReviewRow'
import Irwin from '../components/Irwin'
import TaskBoard from '../components/TaskBoard'
import DecisionsPanel from '../components/DecisionsPanel'

// Home. Plain words, one sentence per section, a bar per list. Nothing here
// blocks anything: bars fill, that is all they do. Sir Irwin keeps count.

function Row({ label, count, goal, to, suffix, why, moment, review, reviewBy }) {
  const done = goal > 0 && count >= goal
  const pct = goal > 0 ? Math.min(100, Math.round((count / goal) * 100)) : 0
  return (
    <Link to={to} className={done ? 'list-card done' : 'list-card'}>
      <span className="list-name">{label}
        {review === 'clear' && <span className="ribbon" title={`${reviewBy ?? 'Jenna'}: reads clearly`}>✓ read</span>}
        {review === 'again' && <span className="ribbon again" title={`${reviewBy ?? 'Jenna'}: needs another look`}>another look</span>}
      </span>
      {moment && <span className="list-moment">{moment}</span>}
      <span className="list-why">{why}</span>
      <span className="list-count">{done ? <><img className="seal-small" src="/workshop/seal.png" alt="" /> Full</> : `${count} of ${goal}${suffix ?? ''}`}</span>
      <span className="bar"><span style={{ width: `${pct}%` }} /></span>
    </Link>
  )
}

const SAFE_AREAS = new Set(Object.keys(AREAS))

const ISSUE_LABELS = {
  banned: 'rhyme words leaked',
  lengthFails: 'wrong length',
  placeholderFails: 'blanks in the wrong shape',
  granoliaFails: 'Granolia’s blanks don’t match',
  salemFails: 'Salem’s twist can’t be caught',
  impersonalFails: 'says “you”',
}

function countOf(area, spec, live) {
  if (spec.editor === 'questions') return live.filter(i => isComplete(i.beats)).length
  return live.length
}

// Where a list opens: its thinnest tab, when it has tabs.
function linkFor(area, spec, live) {
  if (spec.checklist) return `/assets?tab=${spec.upload === 'image' ? 'pictures' : 'sounds'}`
  if (area === 'templates') return '/stationery'
  if (spec.tabs) {
    const def = TAB_KINDS[spec.tabs]
    const thin = def.list.map(t => ({ t, n: live.filter(i => i[def.field] === t).length - goalForTab(spec, t) })).sort((a, b) => a.n - b.n)[0]
    return `/edit/${area}?tab=${thin.t}`
  }
  return `/edit/${area}`
}

function areaRow(area, spec, items, reviews) {
  const live = items.filter(i => !i.deleted)
  const review = reviews?.[area]?.state
  const reviewBy = reviews?.[area]?.by?.name
  if (spec.checklist) {
    return { key: area, label: spec.label, why: spec.why, moment: spec.moment, count: live.filter(i => i.done).length, goal: live.length, suffix: ' done', to: linkFor(area, spec, live), review, reviewBy }
  }
  return { key: area, label: spec.label, why: spec.why, moment: spec.moment, count: countOf(area, spec, live), goal: goalOf(spec), to: linkFor(area, spec, live), review, reviewBy }
}

export default function Dashboard() {
  const [data, setData] = useState({})
  const [validation, setValidation] = useState(null)
  const [history, setHistory] = useState([])
  const [me, setMe] = useState(null)
  const reviews = useReviews()

  useEffect(() => {
    const unsubs = Object.keys(AREAS).map(area =>
      subscribeArea(area, items => setData(d => ({ ...d, [area]: items })), () => {}))
    unsubs.push(subscribeLatestValidation(setValidation, () => {}))
    unsubs.push(subscribeHistory(setHistory, () => {}))
    whoAmI().then(setMe)
    return () => unsubs.forEach(u => u())
  }, [])

  const rows = (filter) => Object.entries(AREAS)
    .filter(([, spec]) => filter(spec))
    .map(([area, spec]) => areaRow(area, spec, data[area] ?? [], reviews))

  // The house: every list that counts, as one number over one goal.
  const counted = Object.entries(AREAS).filter(([, spec]) => !spec.hidden && !spec.checklist)
  const house = counted.reduce((acc, [area, spec]) => {
    const live = (data[area] ?? []).filter(i => !i.deleted)
    const goal = goalOf(spec)
    const n = countOf(area, spec, live)
    return { lines: acc.lines + Math.min(n, goal), goal: acc.goal + goal, full: acc.full && n >= goal, loaded: acc.loaded && area in data }
  }, { lines: 0, goal: 0, full: true, loaded: true })
  const allFull = house.loaded && house.full

  // Today's lines by me, from the recent trail (creates only).
  const today = useMemo(() => {
    if (!me) return 0
    const key = dayKey()
    return history.filter(h => h.by?.uid === me.uid && h.before === null && SAFE_AREAS.has(h.area) && h.ts?.toDate && dayKey(h.ts.toDate()) === key).length
  }, [history, me])
  const everWritten = !!me && history.some(h => h.by?.uid === me.uid && SAFE_AREAS.has(h.area))

  // The household's rank: every line written in every list, by anyone.
  // Sir Irwin's moments are checked once per visit against the phone's own memory.
  const rank = house.loaded ? rankFor(house.lines, allFull) : null
  const [moments, setMoments] = useState({ newRank: false, listJustFull: false })
  const rankName = rank?.name ?? ''
  useEffect(() => {
    if (!rankName) return
    let newRank = false
    try {
      const k = 'workshop.rank.house'
      const peak = Number(localStorage.getItem(k) ?? -1)
      const idx = RANKS.findIndex(r => r.name === rankName)
      if (idx > peak) { newRank = peak >= 0; localStorage.setItem(k, String(idx)) }
    } catch {}
    setMoments(m => ({ ...m, newRank }))
  }, [rankName])
  const fullKey = house.loaded
    ? counted.filter(([area, spec]) => countOf(area, spec, (data[area] ?? []).filter(i => !i.deleted)) >= goalOf(spec)).map(([a]) => a).join(',')
    : null
  useEffect(() => {
    if (fullKey === null) return
    let listJustFull = false
    try {
      const fullNow = fullKey ? fullKey.split(',') : []
      const stored = localStorage.getItem('workshop.full')
      const seen = stored === null ? null : JSON.parse(stored)
      const fresh = seen === null ? [] : fullNow.filter(a => !seen.includes(a))
      if (fresh.length) listJustFull = true // never on the very first visit
      localStorage.setItem('workshop.full', JSON.stringify(fullNow))
    } catch {}
    setMoments(m => ({ ...m, listJustFull }))
  }, [fullKey])

  const line = irwinLine({ allFull, listJustFull: moments.listJustFull, newRank: moments.newRank, today, everWritten })

  // The three lists furthest from their goal, as big cards. Deterministic:
  // nothing is dealt at random, Jon always picks.
  const picks = counted
    .map(([area, spec]) => areaRow(area, spec, data[area] ?? [], reviews))
    .filter(r => r.goal > 0 && r.count < r.goal)
    .sort((a, b) => (a.count / a.goal) - (b.count / b.goal))
    .slice(0, 3)

  return (
    <main className="dash">
      <section className="panel desk">
        <Irwin line={line} />
        <div className="desk-count">
          <span className="rank">{rank ? `The household stands at ${rank.name}` : 'Counting the lines…'}</span>
          <span className="hint">{house.lines} of {house.goal} lines written, across every list, by everyone. {rank?.next ? `${rank.next.name} at ${rank.next.at}.` : allFull ? 'The whole manor is written.' : rank ? 'The top of the house.' : ''}</span>
          <span className="hint ranks">A game for the writing: every line counts. Ranks, lowest first: {RANKS.map(r => r.name).join(', ')}, then Sir Irwin’s Favourite when every list is full.</span>
          <span className="bar big"><span style={{ width: `${house.goal ? Math.min(100, Math.round((house.lines / house.goal) * 100)) : 0}%` }} /></span>
        </div>
      </section>

      {allFull ? (
        <section className="panel pick">
          <h2>Every list is full</h2>
          <p className="why">Nothing left to write. Go and photograph a dog.</p>
        </section>
      ) : (
        <section className="panel pick">
          <h2>Pick one thing</h2>
          <p className="why">Choose one, add three, stop. Every box has a Speak button if you would rather say it.</p>
          <div className="pick-cards">
            {picks.map(r => (
              <Link key={r.key} to={`${r.to}${r.to.includes('?') ? '&' : '?'}focus=3`} className="pick-card">
                <span className="pick-label">{r.label}</span>
                <span className="list-moment">{r.moment}</span>
                <span className="pick-why">{r.why}</span>
                <span className="pick-count">{r.count} of {r.goal} · three more</span>
                <span className="bar"><span style={{ width: `${Math.min(100, Math.round((r.count / r.goal) * 100))}%` }} /></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {AREA_GROUPS.map(group => (
        <section className="panel" key={group}>
          <h2>{group}</h2>
          <p className="why">{GROUP_WHY[group]}</p>
          <div className="list-grid">
            {rows(spec => spec.group === group && !spec.hidden).map(({ key, ...r }) => <Row key={key} {...r} />)}
          </div>
        </section>
      ))}

      <section className="panel">
        <h2>The household staff</h2>
        <p className="why">Who has been writing, and what. Every change is kept with a name on it. Counts only, never the words.</p>
        <Trail history={history} />
      </section>

      <section className="panel">
        <h2>The secrets</h2>
        <p className="why">What the cats really reveal, the documents, the news fragments. Claude writes these and you never see them. This row only says whether they exist.</p>
        <div className="prow static">
          <span className="plabel">🔒 Secret cat lines, documents, echoes</span>
          <span className="pcount">
            {validation === null
              ? 'not made yet'
              : `${validation.complete} of ${validation.codes} motive sets, ${validation.pass ? 'checked ✓' : 'needs a re-run'}`}
          </span>
        </div>
        {validation !== null && !validation.pass && (
          <p className="hint">
            What went wrong (counts only): {Object.entries(ISSUE_LABELS)
              .filter(([k]) => validation[k] > 0)
              .map(([k, label]) => `${label} ×${validation[k]}`)
              .join(' · ') || 'some sets are incomplete'}. Ask Claude Code to run the generator again.
          </p>
        )}
      </section>

      <details className="panel more">
        <summary>Everything else, rarely needed</summary>
        <div className="list-grid">
          {rows(spec => spec.hidden && !spec.retired).map(({ key, ...r }) => <Row key={key} {...r} />)}
        </div>
        <p className="hint">Retired lists (old filler messages, event notes, trail-offs, house history) are kept with everything in them, but not shown.</p>
        <TaskBoard />
        <DecisionsPanel />
      </details>
    </main>
  )
}

// Recent activity by person: lines written (new) and lines tidied (edits),
// from the recent trail. RULE 1: only the safe lists are named. Any entry
// that touches the sealed side (area beginning "sealed", or a list this
// workshop does not know) is counted as "the secrets" and nothing more: no
// list name, no line, no before/after. Those fields are never rendered here.
function trailLabel(area) {
  if (!area || String(area).startsWith('sealed') || !SAFE_AREAS.has(area)) return area === 'reviews' ? 'reads' : area === 'tasks' || area === 'decisions' || area === 'game' ? 'the board' : 'the secrets'
  return AREAS[area].label
}

function Trail({ history }) {
  const people = {}
  for (const h of history) {
    const name = h.by?.name ?? 'before names were kept'
    const when = h.ts?.toMillis?.() ?? 0
    const p = people[name] ??= { name, last: 0, written: 0, tidied: 0, areas: {} }
    if (!SAFE_AREAS.has(h.area)) { /* the board, a read, or the secrets: counted in areas only */ }
    else if (h.before === null) p.written += 1
    else p.tidied += 1
    p.last = Math.max(p.last, when)
    const label = trailLabel(h.area)
    p.areas[label] = (p.areas[label] ?? 0) + 1
  }
  const list = Object.values(people).sort((a, b) => b.last - a.last)
  if (!list.length) return <p className="hint">Nothing recorded yet.</p>
  return (
    <ul className="trail">
      {list.map(p => (
        <li key={p.name}>
          <b>{p.name}</b>
          <span className="hint"> · {p.written} written, {p.tidied} tidied recently · last here {p.last ? new Date(p.last).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown'}</span>
          <br />
          <span className="hint">{Object.entries(p.areas).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, n]) => `${label} ${n}`).join(' · ')}</span>
        </li>
      ))}
    </ul>
  )
}
