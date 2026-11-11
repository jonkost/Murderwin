import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeTasks, addTask } from '../lib/store'
import { useDictation } from '../lib/useDictation'
import {
  KINDS, kindOf, momentChoices, todayRun, isRun, runsOf, runCards, nextOrder, postmortemTask, countsLine, runText, WHOLE_NIGHT,
} from '../lib/postmortem'

// The Postmortem page: after a run of the night, one note at a time. Each
// note is a Timeline card for Claude Code (lib/postmortem.js). An unsent
// note waits in this browser.

const DRAFT = 'workshop.draft.postmortem'
const CHOICES = momentChoices()

export default function Postmortem() {
  const [tasks, setTasks] = useState(null)
  const [banner, setBanner] = useState(null)
  const [run, setRun] = useState(() => todayRun())
  const [at, setAt] = useState(0) // index into CHOICES
  const [kind, setKind] = useState('rough')
  const [words, setWords] = useState(() => { try { return localStorage.getItem(DRAFT) ?? '' } catch { return '' } })
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [copied, setCopied] = useState(null)
  const lastOrder = useRef(0)
  const spokenBase = useRef('')

  useEffect(() => subscribeTasks(setTasks, () => setBanner('Cannot read the Timeline. Check your signal, then reload this page.')), [])

  const keep = (v) => {
    setWords(v)
    try { v.trim() ? localStorage.setItem(DRAFT, v) : localStorage.removeItem(DRAFT) } catch {}
  }
  const dictation = useDictation(text => keep([spokenBase.current.trim(), text].filter(Boolean).join(' ')))

  const cards = useMemo(() => runCards(tasks, run), [tasks, run])
  const runs = useMemo(() => runsOf(tasks).filter(r => r !== run), [tasks, run])
  const moment = CHOICES[at] ?? CHOICES[0]
  const here = cards.filter(c => c.moment === moment.key)

  const send = async () => {
    if (!words.trim() || state === 'sending' || tasks === null || !isRun(run)) return
    dictation.stop()
    setState('sending')
    try {
      const order = nextOrder(tasks, lastOrder.current)
      lastOrder.current = order
      await addTask(postmortemTask({ run, moment: moment.key, kind, words, now: Date.now(), order }))
      keep('')
      setState('sent')
    } catch { setState('error') }
  }

  const step = (d) => { setAt(i => Math.min(CHOICES.length - 1, Math.max(0, i + d))); if (state !== 'sending') setState('idle') }

  const copy = () => {
    const text = runText(tasks, run)
    const done = () => { setCopied('yes'); setTimeout(() => setCopied(c => (c === 'yes' ? null : c)), 4000) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => setCopied(text))
    else setCopied(text)
  }

  return (
    <main className="dash gt">
      {banner && <div className="banner error" role="alert">{banner}</div>}
      <h1>Postmortem</h1>
      <p className="why">How the run went, one thing at a time. Pick when in the night it was, say what happened, and send. Each note becomes a card on the <Link to="/timeline">Timeline</Link> for Claude Code.</p>

      <section className="panel">
        <h2>Which run?</h2>
        <label className="field">
          <span>The date of the run</span>
          <input type="date" value={run} onChange={e => { if (isRun(e.target.value)) setRun(e.target.value) }} />
        </label>
        {runs.length > 0 && (
          <p className="night-line">Earlier runs: {runs.map(r => <button key={r} className="quiet" onClick={() => setRun(r)}>{r}</button>)}</p>
        )}
        <p className="night-line">{tasks === null ? '…' : countsLine(cards)}</p>
      </section>

      <section className="panel">
        <h2>One thing</h2>
        <div className="gt-feedback">
          {state === 'error' && <div className="banner error" role="alert">SAVE FAILED. Check your signal and try again. Your words are still in the box.</div>}
          <label className="field">
            <span>When in the night?</span>
            <select value={at} onChange={e => { setAt(Number(e.target.value)); if (state !== 'sending') setState('idle') }}>
              {CHOICES.map((c, i) => <option key={c.key} value={i}>{c.name}</option>)}
            </select>
          </label>
          <div className="gt-actions">
            <button disabled={at === 0} onClick={() => step(-1)}>Back a moment</button>
            <button disabled={at === CHOICES.length - 1} onClick={() => step(1)}>Next moment</button>
          </div>
          {here.length > 0 && (
            <ul className="pm-here">
              {here.map(c => <li key={c.order}><strong>{kindOf(c.kind).word}.</strong> {c.words}</li>)}
            </ul>
          )}
          <label className="field">
            <span>What kind of thing?</span>
            <select value={kind} onChange={e => setKind(e.target.value)}>
              {KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{moment.key === WHOLE_NIGHT ? 'What happened, and what should change?' : `What happened at “${moment.name}”, and what should change?`}</span>
            <textarea rows={4} value={words} onChange={e => { keep(e.target.value); if (state !== 'sending') setState('idle') }} />
          </label>
          {dictation.listening && <p className="hint" role="status">Listening. Say what happened, then tap Stop.</p>}
          <div className="gt-actions">
            <button className="primary" disabled={!words.trim() || tasks === null || state === 'sending'} onClick={send}>
              {state === 'sending' ? 'Sending…' : 'Send to Claude Code'}
            </button>
            {dictation.supported && (
              <button className={dictation.listening ? 'mic on' : 'mic'} aria-pressed={dictation.listening}
                onClick={() => { if (dictation.listening) dictation.stop(); else { spokenBase.current = words; dictation.start() } }}>
                {dictation.listening ? 'Stop' : 'Speak'}
              </button>
            )}
          </div>
          {state === 'sent' && <p className="hint" role="status">Sent. Say the next thing, or tap Next moment.</p>}
        </div>
      </section>

      <section className="panel">
        <h2>Every note for this run</h2>
        {cards.length === 0 && <p className="night-line">Nothing yet.</p>}
        <ul className="pm-all">
          {cards.map(c => (
            <li key={c.order}>
              <span className="pm-when">{CHOICES.find(m => m.key === c.moment)?.name ?? 'The whole night'}</span>
              <strong>{kindOf(c.kind).word}{c.status === 'done' && c.kind !== 'keep' ? ' (fixed)' : ''}.</strong> {c.words}
            </li>
          ))}
        </ul>
        <p className="night-line">
          <button className="primary" disabled={!cards.length} onClick={copy}>Copy this run’s notes</button>
        </p>
        {copied === 'yes' && <p className="hint" role="status">Copied. Paste it into a Claude chat.</p>}
        {copied && copied !== 'yes' && (
          <label className="field">
            <span>The copy did not work. Select these words and copy them by hand.</span>
            <textarea readOnly rows={8} value={copied} onFocus={e => e.target.select()} />
          </label>
        )}
        <p className="why">How long each part of the night ran is written down by the brain while the night runs. Claude Code puts the two together.</p>
      </section>
    </main>
  )
}
