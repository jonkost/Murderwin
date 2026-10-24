import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeGame, saveGame } from '../lib/store'
import { studyTestApi } from '../lib/studyTestApi'
import {
  COLOURS, NUMBERS, connection, agoWords, tapAgo, wallLines, tapLine, teachLine,
  practiceLine, roundLine, pairsLine, entryLine, shownLine, modeLine, sentLine,
  keyWordProblem, callError, NOT_KEPT,
} from '../lib/studyTest'

// Study test: try the Act 4 light game from a phone while standing at the
// real Nanoleaf walls, with no terminal. The four buttons and the answer pad
// go to the study station through the `studyTest` callable; the station
// answers on public_state/study_test_status, which this page reads.
//
// A test never touches a real night: the station's practice round has no
// group, sends no state and deals no clue (station/lib/teach.js and the
// station's test mode). Nothing sealed reaches this page.

export default function StudyTest() {
  const api = useRef(null)
  if (!api.current) api.current = studyTestApi()
  const [status, setStatus] = useState(undefined) // undefined = still reading, null = the station never reported
  const [readError, setReadError] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(0)
  const [sent, setSent] = useState(0)
  const chain = useRef(Promise.resolve())

  useEffect(() => api.current.subscribeStatus(
    s => { setStatus(s); setReadError(false) },
    () => setReadError(true)), [])
  // the connected check only; nothing here counts down
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t) }, [])

  // One call at a time, in the order tapped, so a colour, a number and
  // Submit reach the station in that order and no tap is dropped.
  const send = (command, name = null) => {
    setPending(n => n + 1)
    chain.current = chain.current.then(async () => {
      try {
        const r = await api.current.send(command, name)
        if (r?.seq) setSent(r.seq)
        setError(null)
      } catch (e) { setError(callError(e)) }
      setPending(n => n - 1)
    })
  }

  const link = connection(status, now)
  // a station that stopped reporting is not doing anything we can trust
  const mode = link.connected ? status?.mode ?? 'idle' : 'idle'
  const busyMode = mode === 'teach' || mode === 'practice'
  // a station that is off skips what was pressed meanwhile, so the start buttons wait for it
  const off = !link.connected
  const waiting = sentLine(sent, status, link.connected)
  const practice = status?.practice ?? null
  const ago = tapAgo(status, now)
  // what the station said last: next to the buttons, or above the answer pad during a practice round
  const said = link.connected ? status?.message || null : null
  const practiceLive = mode === 'practice' && Boolean(practice)

  return (
    <main className="dash study-test">
      {error && <div className="banner error" role="alert">{error}</div>}
      {readError && <div className="banner error" role="alert">Cannot read the study station's status. Check your signal, then reload this page.</div>}

      <section className="panel">
        <h2>Study test</h2>
        <p className="why">Try the study light game from this phone while you stand at the walls. A test never touches a real night: no group finishes, no clue is dealt and the house does not move on.</p>
        {status === undefined
          ? <p className="st-state">…</p>
          : link.connected
            ? <p className="st-state good" role="status">The study station is connected.</p>
            : <>
              <p className="st-state bad" role="status">The study station is not connected.</p>
              <p className="night-line">On the study Mac, in the station folder, run <b>npm start</b>.</p>
              {link.ago !== null && <p className="hint">Last heard from it {agoWords(link.ago)}.</p>}
              <p className="hint">Already running? Open station/.env on the study Mac, copy the word after STATION_KEY=, and save that same word at the bottom of this page. The station tries again within 20 seconds.</p>
            </>}
      </section>

      <section className="panel">
        <h2>Try it</h2>
        <p className="st-big" aria-live="polite">{link.connected ? modeLine(status) : 'Waiting for the station.'}</p>
        <div className="st-actions">
          <button className="primary" disabled={off || busyMode} onClick={() => send('flash')}>Flash the walls</button>
          <button className="primary" disabled={off || busyMode} onClick={() => send('teach')}>Teach the taps</button>
          <button className="primary" disabled={off || busyMode} onClick={() => send('practice')}>Play a practice round</button>
          <button className="ghost" onClick={() => send('stop')}>Stop</button>
        </div>
        {off && status !== undefined && <p className="hint">{NOT_KEPT}</p>}
        {said && !practiceLive && <p className="st-say" aria-live="polite">{said}</p>}
        {busyMode && <p className="hint">Tap Stop before you start something else.</p>}
        {(pending > 0 || waiting) && <p className="hint" role="status">{pending > 0 ? 'Sending…' : waiting}</p>}
        <p className="hint">During Act 4, while a group is due at the study or playing there, Teach the taps and Play a practice round do nothing. Try again when the study is free.</p>

        {mode === 'teach' && status?.teach && <p className="st-big">{teachLine(status.teach)}</p>}

        <h3 className="st-sub">The last tap</h3>
        <p className="st-tap" aria-live="polite">
          {tapLine(status?.lastTap)}
          {status?.lastTap && ago !== null && <span className="hint"> ({agoWords(ago)})</span>}
        </p>
      </section>

      {practice && <Practice practice={practice} live={mode === 'practice'} said={practiceLive ? said : null} send={send} />}

      <section className="panel">
        <h2>The walls</h2>
        {status
          ? <ul className="st-list">{wallLines(status).map((l, i) => <li key={i}>{l}</li>)}</ul>
          : <p className="why">Nothing yet. The walls show here once the station is running.</p>}
        {status && !link.connected && <p className="hint">This is what the station said last time it was running.</p>}
        <p className="hint">How to start every machine in the house is on <Link to="/devices">the devices page</Link>.</p>
      </section>

      <KeyWord />
    </main>
  )
}

// The practice round: what to do now, how far along it is, and an answer
// pad that does what the button box does.
function Practice({ practice, live, said, send }) {
  const shown = shownLine(practice)
  const done = practice.state === 'done'
  const stale = !live && !done // stopped, or the station went quiet mid-round
  const entry = practice.entry ?? {}
  return (
    <section className="panel">
      <h2>The practice round</h2>
      <p className="st-big" aria-live="polite">{stale ? 'This practice round is not running.' : practiceLine(practice)}</p>
      {roundLine(practice) && <p className="night-line">{roundLine(practice)}</p>}
      <p className="night-line">{pairsLine(practice)}</p>
      {!done && <p className="night-line">{entryLine(practice)}</p>}
      {!done && practice.misses > 0 && <p className="hint">Misses on this pattern: {practice.misses}.</p>}
      {shown && <p className="st-say">{shown}</p>}
      {said && <p className="st-say" aria-live="polite">{said}</p>}
      {live && !done && (
        <div className="st-pad" aria-label="Answer pad">
          <p className="hint">The answer pad does what the button box does. Pick a colour and a number, then Submit.</p>
          <div className="st-keys">
            {COLOURS.map(c => (
              <button key={c.key} className={entry.colour === c.key ? 'st-key on' : 'st-key'} aria-pressed={entry.colour === c.key}
                style={{ background: `rgb(${c.rgb.join(',')})`, color: c.dark ? '#141414' : '#fff' }}
                onClick={() => send('key', c.key)}>{c.label}</button>
            ))}
          </div>
          <div className="st-keys numbers">
            {NUMBERS.map(n => (
              <button key={n} className={entry.number === n ? 'st-key on' : 'st-key'} aria-pressed={entry.number === n}
                onClick={() => send('key', n)}>{n}</button>
            ))}
          </div>
          <div className="st-keys ends">
            <button className="st-key" onClick={() => send('key', 'undo')}>Undo</button>
            <button className="st-key submit" onClick={() => send('key', 'submit')}>Submit</button>
          </div>
        </div>
      )}
      {(done || stale) && <p className="hint">Tap Play a practice round to go again.</p>}
    </section>
  )
}

// The study key word: the station shows it to the server to be let in. The
// same doc and field the Host tab's Save key writes (meta/game.station_key),
// saved straight from the workshop so it works with no night started.
function KeyWord() {
  const [game, setGame] = useState(null)
  const [readFailed, setReadFailed] = useState(false)
  const [word, setWord] = useState('')
  const [state, setState] = useState('idle') // idle | saving | saved | error (a save that failed)
  const [showWord, setShowWord] = useState(false)
  const latest = useRef({})
  useEffect(() => subscribeGame(g => { setGame(g); latest.current = g; setReadFailed(false) }, () => setReadFailed(true)), [])
  const problem = keyWordProblem(word)
  const save = (e) => {
    e.preventDefault()
    if (problem) return
    setState('saving')
    saveGame({ station_key: word.trim() }, latest.current)
      .then(() => { setState('saved'); setWord('') })
      .catch(() => setState('error'))
  }
  const saved = String(game?.station_key ?? '').trim()
  const has = Boolean(saved)
  return (
    <section className="panel">
      <h2>The study key word</h2>
      {readFailed && <div className="banner error" role="alert">Cannot read whether a key word is saved. Check your signal, then reload this page.</div>}
      {state === 'error' && <div className="banner error" role="alert">SAVE FAILED. Check your signal and try again.</div>}
      <p className="why">The study station shows this word to the game to be let in. The same word must be in station/.env on the study Mac, on the line STATION_KEY=. After you change the file, start the station again.</p>
      <p className="night-line">{game === null ? (readFailed ? 'Not known: the page could not read it.' : '…') : has ? <b>A study key word is saved.</b> : <b>No study key word is saved yet. The station cannot connect until one is.</b>}</p>
      {has && (
        <p className="night-line">
          {showWord && <>The saved word is <b className="st-word">{saved}</b>. </>}
          <button type="button" className="ghost" onClick={() => setShowWord(v => !v)}>{showWord ? 'Hide the word' : 'Show the saved word'}</button>
        </p>
      )}
      <form onSubmit={save}>
        <label className="field">
          <span>{has ? 'A new key word (replaces the saved one)' : 'The key word, four letters or more'}</span>
          <input type="text" value={word} onChange={e => { setWord(e.target.value); if (state !== 'saving') setState('idle') }}
            placeholder="study-2026" autoComplete="off" autoCapitalize="none" spellCheck={false} />
        </label>
        <p className="night-line">
          <button className="primary" type="submit" disabled={Boolean(problem) || state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save the key word'}</button>
        </p>
      </form>
      {state === 'saved' && <p className="hint" role="status">Saved. Now put the same word in station/.env on the study Mac.</p>}
    </section>
  )
}
