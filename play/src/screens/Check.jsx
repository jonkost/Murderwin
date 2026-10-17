import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthUid, useDoc } from '../lib/hooks'
import { mayCheck } from '../lib/night'
import { ACTS, CATS, actScript, bioFor, motiveNotes, motives, npcCards, rules, statusLine, uiLines, studyLines, stationText } from '../lib/content'

// /play/?check=1 — does the phone say what the workshop says?
// Reads the copy of the workshop lines the phones receive (made when a night
// starts, when an act begins, and by "Resend rules & bios"), runs each line
// through the phone's own code, and shows a tick when the phone shows it
// word for word, or the difference when it does not. Safe content only, but
// every line at once, so only a host phone or the admin may open it (17 Oct
// 2026); a plain guest sees "Not for you".

// Is this sign-in the admin? The workshop's settings doc is admin-only to
// read, so one small read answers it without a list of UIDs on the phone.
function useAdmin(uid) {
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, 'meta', 'game')).then(() => setAdmin(true)).catch(() => setAdmin(false))
  }, [uid])
  return admin
}

function norm(s) { return String(s ?? '').replace(/\s+/g, ' ').trim() }

// A saved line, split the way the workshop saved it (see app/src/lib/codecs.js).
function labelOf(text) { const m = /^([A-Z][A-Z0-9 '&/]*):[ \t]*/.exec(text); return m ? { label: m[1], body: text.slice(m[0].length) } : { label: '', body: text } }
function dashOf(text) { const i = text.indexOf('—'); return i < 0 ? { head: '', body: text } : { head: text.slice(0, i).trim(), body: text.slice(i + 1).replace(/^\s+/, '') } }
function personaOf(text) {
  let { body } = dashOf(text)
  const c = body.search(/Costume:/i); if (c >= 0) body = body.slice(0, c).trim()
  body = body.replace(/^the\s+[^.]+\.\s*/i, '')
  return body.trim()
}
const TITLES = { irwin: 'the dog', salem: 'the long-time groundskeeper', zimothy: 'the old family solicitor', boo: 'family friend and socialite', granolia: 'taken in by the family when no one else would' }
function aboutOf(text, catKey) {
  let { body } = dashOf(text)
  const t = TITLES[catKey]
  if (t && body.toLowerCase().startsWith(t)) body = body.slice(t.length).replace(/^\.?\s*/, '')
  return body.trim()
}

export default function Check() {
  const { uid } = useAuthUid()
  const active = useDoc(uid ? 'public_state/active' : null)
  const nightId = active.data?.nightId ?? null
  const night = useDoc(nightId ? `nights/${nightId}` : null)
  const content = useDoc(nightId ? `nights/${nightId}/public/content` : null)
  const session = useDoc(uid ? `sessions/${uid}` : null)
  const admin = useAdmin(uid)
  const c = content.data
  const report = useMemo(() => (c ? build(c) : null), [c])

  if (!uid || !active.loaded) return <main className="check"><p>One moment.</p></main>
  if (!nightId || !c) return <main className="check"><h1>Nothing to check yet</h1><p>No night is live, or its copy of the workshop lines has not arrived. Start a night from a host phone.</p></main>
  if (!session.loaded) return <main className="check"><p>One moment.</p></main>
  const mine = session.data && session.data.nightId === nightId ? session.data : null
  if (!mayCheck({ session: mine, night: night.data, admin })) {
    return <main className="check"><h1>Not for you</h1><p>{uiLines(c)['NOT FOR YOU']}</p></main>
  }

  const when = c.publishedAt?.toDate?.() ?? null
  const total = report.reduce((n, a) => n + a.rows.length, 0)
  const bad = report.reduce((n, a) => n + a.rows.filter(r => !r.ok).length, 0)
  return (
    <main className="check">
      <h1>Does the phone say what the workshop says?</h1>
      <p className="check-sum">
        {total} lines reached the phones{when ? ` at ${when.toLocaleString()}` : ''} for the night "{night.data?.label ?? nightId}".{' '}
        {bad === 0 ? <strong className="ok">Every one of them shows word for word.</strong> : <strong className="bad">{bad} do not match. They are marked below.</strong>}
      </p>
      <p className="gloss">This is the copy the phones hold. If you have written more since, press "Resend rules &amp; bios" on a host phone, or start the next act, and reload this page. Lines the dealer reads at the moment of dealing (cat openers, closers, brush-offs, blanks, Parlour Games, role cards) are not copied ahead and are not listed here; the server reads them straight from the workshop.</p>
      {report.map(a => (
        <section key={a.area}>
          <h2>{a.title} <span className="gloss">{a.rows.length === 0 ? 'nothing written yet' : `${a.rows.filter(r => r.ok).length} of ${a.rows.length}`}</span></h2>
          {a.rows.length > 0 && (
            <ul>
              {a.rows.map((r, i) => (
                <li key={i} className={r.ok ? 'ok' : 'bad'}>
                  <span className="mark" aria-hidden="true">{r.ok ? '✓' : '✗'}</span>
                  <span>
                    {r.where && <span className="where">{r.where} · </span>}
                    <span className="line">{r.want}</span>
                    {!r.ok && <span className="shows"><br />The phone shows: <em>{r.got || '(nothing)'}</em></span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  )
}

function build(c) {
  const list = (area) => (Array.isArray(c[area]) ? c[area] : [])
  const out = []
  const row = (where, want, got) => ({ where, want, got, ok: norm(want) === norm(got) })

  // the phone's own little lines
  const ui = uiLines(c)
  out.push({ area: 'ui_copy', title: 'The phone’s own little lines', rows: list('ui_copy').map(it => {
    const { label, body } = labelOf(it.text.trim())
    return row(label, body, label ? ui[label] : '')
  }) })

  // rules
  const rs = rules(c)
  out.push({ area: 'rules_text', title: 'The rules', rows: list('rules_text').map(it => {
    const { head, body } = dashOf(it.text)
    const hit = rs.find(r => norm(r.title) === norm(head) && norm(r.body) === norm(body))
    return row(head, body, hit ? hit.body : rs.find(r => norm(r.title) === norm(head))?.body ?? '')
  }) })

  // bios: the persona box, matched to the character
  const chars = Array.isArray(c.characters) ? c.characters : []
  out.push({ area: 'bios', title: 'The fourteen characters', rows: list('bios').map(it => {
    const { head } = dashOf(it.text)
    const want = personaOf(it.text)
    const ch = chars.find(x => norm(x.name).toLowerCase() === norm(head).toLowerCase())
      || chars.find(x => norm(head).toLowerCase().endsWith(norm(x.name).toLowerCase().split(' ').pop()))
    return row(ch ? ch.name : head || '(no name)', want, ch ? bioFor(c, ch) : '')
  }) })

  // the household cards
  const cards = npcCards(c)
  out.push({ area: 'npc_cards', title: 'Meet the household', rows: list('npc_cards').map(it => {
    const { head } = dashOf(it.text)
    const cat = CATS.find(k => norm(head).toLowerCase().includes(k.name.toLowerCase().split(',')[0]))
    const want = cat ? aboutOf(it.text, cat.key) : it.text
    return row(cat ? cat.name : head, want, cat ? cards.find(x => x.key === cat.key)?.text : '')
  }) })

  // act objectives
  out.push({ area: 'act_scripts', title: 'What each act asks of you', rows: list('act_scripts').map(it => {
    const { label, body } = labelOf(it.text.trim())
    const n = Number(String(it.act ?? '').replace('act', ''))
    const got = label === 'OBJECTIVE' ? actScript(c, n).objective : label === 'BANNER' ? actScript(c, n).banner : ''
    return row(`Act ${n} ${ACTS[n]?.plain ?? ''} · ${label || 'no label'}`, body, got)
  }) })

  // status lines: one of the lines for that band must be what the phone draws
  out.push({ area: 'status_lines', title: 'How a cat feels about you', rows: list('status_lines').map(it => {
    const { label, body } = labelOf(it.text.trim())
    const level = label === 'IN' ? 5 : label === 'WARMING' ? 3 : 1
    const seen = new Set()
    for (let i = 0; i < 60; i++) seen.add(norm(statusLine(c, it.cat, level)))
    const got = seen.has(norm(body)) ? body : [...seen][0]
    return row(`${CATS.find(k => k.key === it.cat)?.name ?? it.cat} · ${label}`, body, got)
  }) })

  // what each motive means
  const mn = motiveNotes(c)
  const ms = motives(c)
  out.push({ area: 'motive_notes', title: 'What each motive means', rows: list('motive_notes').map(it => {
    const { label, body } = labelOf(it.text.trim())
    const n = Number(label.replace(/\D/g, ''))
    return row(`${n} · ${ms.find(m => m.n === n)?.rhyme ?? ''}`, body, mn[n] ?? '')
  }) })

  // cat chatter: shown whole, as written
  out.push({ area: 'smalltalk', title: 'Cat chatter, passing by', rows: list('smalltalk').map(it => row(CATS.find(k => k.key === it.cat)?.name ?? it.cat, it.text, it.text)) })

  // Granolia on the study screen, by moment
  const sl = studyLines(c)
  out.push({ area: 'study_lines', title: 'Granolia in the study', rows: list('study_lines').map(it => {
    const { label, body } = labelOf(it.text.trim())
    return row(label || 'no moment picked', body, label ? sl[label] : '')
  }) })

  // the five station cards, as the dealer reads them
  const st = stationText(c)
  out.push({ area: 'station_text', title: 'The five stations', rows: list('station_text').map(it => {
    const { label, body } = labelOf(it.text.trim())
    return row(label || 'no station picked', body, label ? st[label] : '')
  }) })

  // news frames and the closing story: shown whole, as written; the room screens read them
  out.push({ area: 'echo_frames', title: 'News frames', rows: list('echo_frames').map(it => row('a room screen', it.text, it.text)) })
  out.push({ area: 'epilogue_frames', title: 'The closing story', rows: list('epilogue_frames').map(it => row('the living room screen, Act 7', it.text, it.text)) })

  return out
}
