import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { studyTestApi } from '../lib/studyTestApi'
import {
  COLOURS, NUMBERS, connection, agoWords, tapAgo, wallLines, tapLine, teachLine,
  practiceLine, roundLine, pairsLine, entryLine, shownLine, modeLine, sentLine,
  callError, NOT_KEPT,
} from '../lib/studyTest'

// Study test: try the Act 4 light game from a phone while standing at the
// real Nanoleaf walls, with no terminal. It is the first section of the Game
// test tab (pages/GameTest.jsx, 24 Oct 2026), which also holds the study key
// word box (components/KeyWord.jsx); /study-test opens that section. The four
// buttons and the answer pad go to the study station through the `studyTest`
// callable; the station answers on public_state/study_test_status, which
// this part reads.
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
    <div className="study-test">
      {error && <div className="banner error" role="alert">{error}</div>}
      {readError && <div className="banner error" role="alert">Cannot read the study station's status. Check your signal, then reload this page.</div>}

      <div className="gt-block">
        <h3>The study station</h3>
        <p className="why">Try the study light game from this phone while you stand at the walls. A test never touches a real night: no group finishes, no clue is dealt and the house does not move on.</p>
        {status === undefined
          ? <p className="st-state">…</p>
          : link.connected
            ? <p className="st-state good" role="status">The study station is connected.</p>
            : <>
              <p className="st-state bad" role="status">The study station is not connected.</p>
              <p className="night-line">On the Mac by the walls, double-click Start the Study in the Study station folder. Not on that Mac yet? Ask Claude Code for the Study station zip.</p>
              {link.ago !== null && <p className="hint">Last heard from it {agoWords(link.ago)}.</p>}
              <p className="hint">Already running? Check the study key word is saved on this page, and that Claude Code put the same word on the study Mac. The station tries again within 20 seconds.</p>
            </>}
        <details className="gt-claude">
          <summary>For Claude Code</summary>
          <p className="hint">Start it with the double-click starter station/Start the Study.command (or cd station &amp;&amp; npm start) on the M1 Air by the walls. To move it to a Mac: zip station/ with its node_modules and .env (ditto -c -k --keepParent), AirDrop, unzip, double-click. STATION_KEY= in station/.env must match the key word saved here. The taught taps are saved on whichever Mac runs the station.</p>
        </details>
      </div>

      <div className="gt-block">
        <h3>Try it at the walls</h3>
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

        <h4 className="st-sub">The last tap</h4>
        <p className="st-tap" aria-live="polite">
          {tapLine(status?.lastTap)}
          {status?.lastTap && ago !== null && <span className="hint"> ({agoWords(ago)})</span>}
        </p>
      </div>

      {practice && <Practice practice={practice} live={mode === 'practice'} said={practiceLive ? said : null} send={send} />}

      <div className="gt-block">
        <h3>The walls</h3>
        {status
          ? <ul className="st-list">{wallLines(status).map((l, i) => <li key={i}>{l}</li>)}</ul>
          : <p className="why">Nothing yet. The walls show here once the station is running.</p>}
        {status && !link.connected && <p className="hint">This is what the station said last time it was running.</p>}
        <p className="hint">How to start every machine in the house is on <Link to="/devices">the devices page</Link>.</p>
      </div>
    </div>
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
    <div className="gt-block">
      <h3>The practice round</h3>
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
    </div>
  )
}
