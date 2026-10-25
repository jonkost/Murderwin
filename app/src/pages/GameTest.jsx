import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import QRCode from 'qrcode'
import { subscribeGame, subscribeTasks, addTask, subscribeArea, whoAmI } from '../lib/store'
import { PLAY_URL } from '../lib/config'
import { gameTestApi } from '../lib/gameTestApi'
import { callError } from '../lib/studyTest'
import { useDictation } from '../lib/useDictation'
import {
  SECTIONS, SECTION_KEYS, DEVICES, tryWords, playUrl, queryOf, parlourSets, nightStrip, nightOff,
  salemView, booView, chipOf, feedbackTask, stewardTask, nextOrder, gameTestCards, sentLine, openNotesText,
} from '../lib/gameTest'
import StudyTest from './StudyTest'
import KeyWord from '../components/KeyWord'

// Game test (24 Oct 2026, Jon: "a tab that is called game test. Under that
// tab it has all the game in it to test. From these tests I will provide
// feedback"). Every game of Acts 4 and 6 and the Parlour Games, in the order
// of the night, each with where to try it, the steps, It works, and a note
// that goes on the Timeline as a card for Claude Code (lib/gameTest.js).
//
// Sample screens and the two practices never touch a night. The test night
// strip starts and moves a rehearsal through the `gameTest` callable, which
// refuses while the party box is ticked or the live night is the party or a
// dry run, and moves only a night this tab started: a rehearsal from a
// phone (guests on it) is left alone, and Start asks before ending it. The
// page turns those buttons off too and says why. Nothing sealed reaches
// this page, and it never links Jenna's page. Jenna gets no note box: they
// know the secrets, so their one button files fixed words (stewardTask).

const QR_COLOURS = { dark: '#1a1614', light: '#f1e8d6' }

export default function GameTest() {
  const api = useRef(null)
  if (!api.current) api.current = gameTestApi()
  const location = useLocation()
  const [game, setGame] = useState(null)
  const [gameFailed, setGameFailed] = useState(false)
  const [live, setLive] = useState(undefined) // undefined = still reading
  const [liveFailed, setLiveFailed] = useState(false)
  const [chips, setChips] = useState(null)
  const [tasks, setTasks] = useState(null)
  const [banner, setBanner] = useState(null)
  const [busy, setBusy] = useState(null)
  const [said, setSaid] = useState(null) // { area, text }: what the last button did
  const [me, setMe] = useState(null)
  const [keyFirst, setKeyFirst] = useState(null) // decided once, so the box stays put after a save
  const [open, setOpen] = useState(() => {
    const k = location.hash.slice(1)
    return SECTION_KEYS.includes(k) ? { [k]: true } : {}
  })
  const [lastDevice, setLastDevice] = useState({})
  const tried = useRef({}) // section key → the last address opened there
  const lastOrder = useRef(0)

  useEffect(() => subscribeGame(g => { setGame(g); setGameFailed(false) }, () => setGameFailed(true)), [])
  useEffect(() => api.current.subscribeLive(l => { setLive(l); setLiveFailed(false) }, () => setLiveFailed(true)), [])
  useEffect(() => api.current.subscribeChips(setChips, () => setBanner('Cannot read which games work. Check your signal, then reload this page.')), [])
  useEffect(() => subscribeTasks(setTasks, () => setBanner('Cannot read the Timeline. Check your signal, then reload this page.')), [])
  useEffect(() => { whoAmI().then(setMe).catch(() => {}) }, [])
  useEffect(() => {
    if (game && keyFirst === null) setKeyFirst(!String(game.station_key ?? '').trim())
  }, [game, keyFirst])

  // /study-test and links like #salem open that section and scroll to it
  useEffect(() => {
    const k = location.hash.slice(1)
    if (!SECTION_KEYS.includes(k)) return
    setOpen(o => ({ ...o, [k]: true }))
    const t = setTimeout(() => document.getElementById(`game-${k}`)?.scrollIntoView({ block: 'start' }), 50)
    return () => clearTimeout(t)
  }, [location.hash])

  const strip = nightStrip({ game, live, failed: liveFailed || gameFailed, today: new Date().toLocaleDateString('en-CA') })

  const run = async (area, command, args = {}, okText = null) => {
    setBusy(command)
    setSaid(null)
    try {
      await api.current.send(command, args)
      if (okText) setSaid({ area, text: okText })
    } catch (e) { setBanner(callError(e)) }
    setBusy(null)
  }

  const markChip = (key, state) => api.current.saveChip(key, { state, at: Date.now() }, chips?.[key] ?? null)
  const works = (key) => markChip(key, 'works').catch(() => setBanner('SAVE FAILED. Check your signal and try again.'))

  // A note: a Timeline card for Claude Code, then the chip says Needs a fix.
  // Throws when the card is not saved, so the box keeps the words.
  const sendNote = async (section, words, device, steward = false) => {
    const order = nextOrder(tasks, lastOrder.current)
    lastOrder.current = order
    await addTask(steward
      ? stewardTask({ section, now: Date.now(), order })
      : feedbackTask({ section, words, device, tried: tried.current[section.key] ?? null, strip, now: Date.now(), order }))
    await markChip(section.key, 'fix').catch(() => setBanner('The note is on the Timeline, but the Needs a fix mark did not save. Check your signal.'))
  }

  const opened = (section, t) => {
    tried.current[section.key] = { label: t.label, query: t.query, device: t.device }
    setLastDevice(d => ({ ...d, [section.key]: t.device }))
  }

  const nightProps = { strip, busy, said, run }

  return (
    <main className="dash gt">
      {banner && (
        <div className="banner error" role="alert">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)}>OK</button>
        </div>
      )}

      <section className="panel">
        <h2>Game test</h2>
        <p className="why gt-lead">Try each game before the night. Tell Claude Code what to fix: your note goes on the Timeline.</p>
      </section>

      {keyFirst && <KeyWord first />}

      <TestNight {...nightProps} />

      {SECTIONS.map(s => (
        <GameSection key={s.key} section={s} open={Boolean(open[s.key])}
          onToggle={v => setOpen(o => (Boolean(o[s.key]) === v ? o : { ...o, [s.key]: v }))}
          chip={chipOf(s.key, chips, tasks)} cards={tasks ? gameTestCards(tasks, s.key) : []}
          onWorks={() => works(s.key)} onSend={(words, device, steward) => sendNote(s, words, device, steward)}
          onOpened={t => opened(s, t)} lastDevice={lastDevice[s.key] ?? null}
          canSend={tasks !== null} isJenna={me?.name === 'Jenna'} strip={strip}>
          {s.key === 'study' && (
            <>
              <StudyTest />
              {keyFirst === false ? <KeyWord /> : <p className="hint">The study key word box is at the top of this page.</p>}
            </>
          )}
          {s.key === 'salem' && <SalemPractice api={api.current} {...nightProps} />}
          {s.key === 'boo' && <BooPractice api={api.current} {...nightProps} />}
          {s.key === 'parlour' && (
            <>
              <NightButtons which={['parlour']} {...nightProps} />
              <ParlourSets onOpened={t => opened(s, t)} />
            </>
          )}
          {s.key === 'drawing' && (
            <>
              <p className="night-line"><b>{s.ready}</b></p>
              <NightButtons which={['act6']} {...nightProps} />
            </>
          )}
        </GameSection>
      ))}

      <Notes tasks={tasks} />
    </main>
  )
}

// ---- the test night -------------------------------------------------------

const NIGHT_BUTTONS = {
  start: { command: 'night-start', label: s => (s.kind === 'test' ? 'Start a new test night' : s.kind === 'rehearsal' ? 'Start a test night instead' : 'Start a test night'), can: s => s.canStart, ok: () => 'A test night has started. Join it on your phone.' },
  act4: { command: 'night-act', args: { act: 4 }, label: () => 'Go to Act 4', can: s => s.canMove, ok: () => 'The test night is in Act 4.' },
  act6: { command: 'night-act', args: { act: 6 }, label: () => 'Go to Act 6', can: s => s.canMove, ok: () => 'The test night is in Act 6.' },
  parlour: { command: 'night-parlour', label: () => 'Parlour Game now', can: s => s.canParlour, ok: s => (s.act === 4 ? 'Sent. In Act 4 it waits on each phone.' : 'Sent. Every phone in the test night lights up.') },
}

function NightButtons({ which, strip, busy, said, run }) {
  const area = `night-${which.join('-')}`
  const [pressed, setPressed] = useState(null)
  const press = (k) => {
    const b = NIGHT_BUTTONS[k]
    let args = b.args ?? {}
    if (b.command === 'night-start' && strip.kind === 'test'
      && !window.confirm('Start a new test night? The one running now ends, and every phone joins again.')) return
    // a rehearsal from a phone may have guests on it: name it, and only then end it
    if (b.command === 'night-start' && strip.kind === 'rehearsal') {
      if (!window.confirm(`A rehearsal started from a phone is running: ${strip.label}. Start a test night in its place? That rehearsal ends for everyone on it, and they would have to join again.`)) return
      args = { replace: true }
    }
    setPressed(k)
    run(area, b.command, args, b.ok(strip))
  }
  const someOff = which.some(k => !NIGHT_BUTTONS[k].can(strip))
  return (
    <div className="gt-night-buttons">
      <div className="gt-actions">
        {which.map(k => {
          const b = NIGHT_BUTTONS[k]
          return (
            <button key={k} className={k === 'start' ? 'primary' : 'ghost'} disabled={!b.can(strip) || busy !== null} onClick={() => press(k)}>
              {busy === b.command && pressed === k ? 'Sending…' : b.label(strip)}
            </button>
          )
        })}
      </div>
      {strip.reason && someOff && <p className="night-line"><b>{strip.reason}</b></p>}
      {!strip.reason && strip.hint && <p className="hint">{strip.hint}</p>}
      {said?.area === area && <p className="hint" role="status">{said.text}</p>}
    </div>
  )
}

function TestNight(props) {
  const { strip } = props
  const tone = strip.kind === 'test' || strip.kind === 'none' ? 'good' : strip.kind === 'reading' ? '' : 'bad'
  return (
    <section className="panel gt-night" aria-labelledby="gt-night">
      <h2 id="gt-night">Test night</h2>
      <p className="why">Some games need a night to run. A test night is always a rehearsal: nothing sealed is read, and it is never the party.</p>
      <p className={`st-state ${tone}`} role="status">{strip.line}</p>
      <NightButtons which={['start', 'act4', 'act6', 'parlour']} {...props} />
      {strip.notes?.map(n => <p className="hint" key={n}>{n}</p>)}
      {(strip.kind === 'none' || strip.kind === 'test') && (
        <ul className="gt-tries">
          <TryIt label="Join the test night" device="phone" url={PLAY_URL} button="Join on your phone" />
        </ul>
      )}
      <p className="hint">When you join, type your host name (the one on the Game night page), so your phone gets the Host tab.</p>
    </section>
  )
}

// ---- one game -------------------------------------------------------------

function GameSection({ section: s, open, onToggle, chip, cards, onWorks, onSend, onOpened, lastDevice, canSend, isJenna, strip, children }) {
  const off = nightOff(strip)
  return (
    <section className="panel gt-game" id={`game-${s.key}`}>
      <details open={open} onToggle={e => onToggle(e.currentTarget.open)}>
        <summary className="gt-summary">
          <span className="gt-head">
            <span className="gt-name">{s.name}</span>
            <span className={`gt-chip ${chip.state}`}>{chip.label}</span>
          </span>
          <span className="tl-clock">{s.where}</span>
          <span className="gt-what">{s.what}</span>
        </summary>
        {open && (
          <div className="gt-body">
            {chip.fixed && <p className="night-line"><b>Claude Code has fixed what you sent. Try it again.</b></p>}
            <ol className="night-steps gt-steps">
              {s.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
            {children}
            <h3 className="gt-sub">Try it</h3>
            <ul className="gt-tries">
              {s.tries.map(t => (
                <TryIt key={t.key ?? t.params.preview} label={t.label} device={t.device} url={playUrl(PLAY_URL, t.params)}
                  off={t.night ? off : null} onOpen={() => onOpened({ ...t, query: queryOf(t.params) })} />
              ))}
            </ul>
            {s.note && <p className="hint">{s.note}</p>}
            <div className="gt-works">
              <button className="primary" onClick={onWorks}>It works</button>
              {chip.state === 'works' && <span className="hint"> Marked: {chip.label}.</span>}
            </div>
            {isJenna
              ? <JennaFeedback onSend={() => onSend(null, 'other', true)} canSend={canSend} />
              : <Feedback section={s} lastDevice={lastDevice} onSend={onSend} canSend={canSend} />}
            {cards.length > 0 && (
              <ul className="gt-sent">
                {cards.map(t => (
                  <li key={t.id} className={t.status === 'done' ? 'done' : ''}>
                    {sentLine(t)}{t.status === 'done' && <> <span className="gt-chip works">Fixed</span></>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </details>
    </section>
  )
}

// One address to try: a button that opens it in a new tab, and a square
// code to open it on another device.
function TryIt({ label, device, url, button, off = null, onOpen }) {
  const [show, setShow] = useState(false)
  const [qr, setQr] = useState(null)
  useEffect(() => { setQr(null) }, [url])
  useEffect(() => {
    if (!show || qr || off) return
    QRCode.toDataURL(url, { width: 600, margin: 2, color: QR_COLOURS }).then(setQr).catch(() => setQr(null))
  }, [show, qr, url, off])
  return (
    <li className="gt-try">
      <span className="gt-try-label">{label}</span>
      {off
        ? <span className="hint">{off}</span>
        : (
          <span className="gt-try-actions">
            <a className="primary dl" href={url} target="_blank" rel="noreferrer" onClick={onOpen}>{button ?? tryWords(device)}</a>
            <button className="ghost" aria-expanded={show} onClick={() => setShow(v => !v)}>{show ? 'Hide the square code' : 'Square code'}</button>
          </span>
        )}
      {show && qr && !off && <img className="qr dev-qr" src={qr} alt={`Square code that opens ${label}`} />}
    </li>
  )
}

// Jenna's version of the note box: no words at all, only Needs more, which
// files a card in fixed words (lib/gameTest.js stewardTask). Jenna knows the
// secrets, and Jon reads every card.
function JennaFeedback({ onSend, canSend }) {
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const send = async () => {
    if (state === 'sending') return
    setState('sending')
    try { await onSend(); setState('sent') } catch { setState('error') }
  }
  return (
    <div className="gt-feedback">
      <h3 className="gt-sub">Something to fix?</h3>
      {state === 'error' && <div className="banner error" role="alert">SAVE FAILED. Check your signal and try again.</div>}
      <p className="why">Jenna, you know the secrets, so there is no note box for you here: Jon reads every note. Tap Needs more, and say only that, as with everything else.</p>
      <div className="gt-actions">
        <button className="primary" disabled={!canSend || state === 'sending'} onClick={send}>
          {state === 'sending' ? 'Sending…' : 'Needs more'}
        </button>
      </div>
      {state === 'sent' && <p className="hint" role="status">Sent. Claude Code will look this game over.</p>}
    </div>
  )
}

// The note box: Jon's words, which screen it was on, Send to Claude Code.
// An unsent note waits in this browser, so closing the section loses nothing.
function Feedback({ section, lastDevice, onSend, canSend }) {
  const DRAFT = `workshop.draft.gametest.${section.key}`
  const [words, setWords] = useState(() => { try { return localStorage.getItem(DRAFT) ?? '' } catch { return '' } })
  const [device, setDevice] = useState(null) // null: the screen last opened here
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const spokenBase = useRef('')
  const keep = (v) => {
    setWords(v)
    try { v.trim() ? localStorage.setItem(DRAFT, v) : localStorage.removeItem(DRAFT) } catch {}
  }
  const dictation = useDictation(text => keep([spokenBase.current.trim(), text].filter(Boolean).join(' ')))
  const pick = device ?? lastDevice ?? section.devices[0]
  const choices = [...section.devices, 'other']
  const send = async () => {
    if (!words.trim() || state === 'sending') return
    dictation.stop()
    setState('sending')
    try {
      await onSend(words, pick)
      keep('')
      setDevice(null)
      setState('sent')
    } catch { setState('error') }
  }
  return (
    <div className="gt-feedback">
      <h3 className="gt-sub">Something to fix?</h3>
      {state === 'error' && <div className="banner error" role="alert">SAVE FAILED. Check your signal and try again. Your words are still in the box.</div>}
      <label className="field">
        <span>What happened, and what should change?</span>
        <textarea rows={4} value={words} onChange={e => { keep(e.target.value); if (state !== 'sending') setState('idle') }} />
      </label>
      {dictation.listening && <p className="hint" role="status">Listening. Say what happened, then tap Stop.</p>}
      <label className="field">
        <span>Which screen was it on?</span>
        <select value={pick} onChange={e => setDevice(e.target.value)}>
          {choices.map(d => <option key={d} value={d}>{DEVICES[d]}</option>)}
        </select>
      </label>
      <div className="gt-actions">
        <button className="primary" disabled={!words.trim() || !canSend || state === 'sending'} onClick={send}>
          {state === 'sending' ? 'Sending…' : 'Send to Claude Code'}
        </button>
        {dictation.supported && (
          <button className={dictation.listening ? 'mic on' : 'mic'} aria-pressed={dictation.listening}
            onClick={() => { if (dictation.listening) dictation.stop(); else { spokenBase.current = words; dictation.start() } }}>
            {dictation.listening ? 'Stop' : 'Speak'}
          </button>
        )}
      </div>
      {state === 'sent' && <p className="hint" role="status">Sent. It is on the Timeline for Claude Code.</p>}
    </div>
  )
}

// ---- the two practices and the bank --------------------------------------

function SalemPractice({ api, busy, said, run }) {
  const [doc, setDoc] = useState(undefined)
  const [failed, setFailed] = useState(false)
  useEffect(() => api.subscribeSalem(d => { setDoc(d); setFailed(false) }, () => setFailed(true)), [api])
  const v = salemView(doc)
  return (
    <div className="gt-block">
      <h3>The practice</h3>
      {failed && <div className="banner error" role="alert">Cannot read the practice. Check your signal, then reload this page.</div>}
      <p className="st-big" aria-live="polite">{v.line}</p>
      {v.joined && <p className="night-line">{v.joined}</p>}
      {v.slips && <p className="night-line">{v.slips}</p>}
      <div className="gt-actions">
        <button className="primary" disabled={busy !== null} onClick={() => run('salem', 'salem-open', {}, 'The practice is open. Phones can join now.')}>
          {busy === 'salem-open' ? 'Sending…' : v.open ? 'Start again from round 1' : 'Open the practice'}
        </button>
        <button className="ghost" disabled={busy !== null || !v.open} onClick={() => run('salem', 'salem-stop', {}, 'The practice is closed.')}>Stop</button>
      </div>
      {said?.area === 'salem' && <p className="hint" role="status">{said.text}</p>}
      <p className="hint">Each phone that plays shows a shake meter, so you can feel how hard a shake has to be.</p>
    </div>
  )
}

function BooPractice({ api, busy, said, run }) {
  const [doc, setDoc] = useState(undefined)
  const [failed, setFailed] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => api.subscribeBoo(d => { setDoc(d); setFailed(false) }, () => setFailed(true)), [api])
  const v = booView(doc, now)
  // only to say which part of the show is on; the times are the server's
  useEffect(() => {
    if (!v.running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [v.running])
  return (
    <div className="gt-block">
      <h3>The practice show</h3>
      {failed && <div className="banner error" role="alert">Cannot read the show. Check your signal, then reload this page.</div>}
      <p className="st-big" aria-live="polite">{v.line}</p>
      <div className="gt-actions">
        <button className="primary" disabled={busy !== null} onClick={() => { setNow(Date.now()); run('boo', 'boo-start', {}, 'The show starts in three seconds.') }}>
          {busy === 'boo-start' ? 'Sending…' : 'Start the show'}
        </button>
        <button className="ghost" disabled={busy !== null || !doc || doc.state !== 'playing'} onClick={() => run('boo', 'boo-stop', {}, 'The show is stopped.')}>Stop</button>
      </div>
      {said?.area === 'boo' && <p className="hint" role="status">{said.text}</p>}
    </div>
  )
}

// The seventeen sets from the workshop's list, each as a phone shows it.
function ParlourSets({ onOpened }) {
  const [items, setItems] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => subscribeArea('scenarios', d => { setItems(d); setFailed(false) }, () => setFailed(true)), [])
  const sets = parlourSets(items, PLAY_URL)
  return (
    <div className="gt-block">
      <h3>Every set in the bank</h3>
      {failed && <div className="banner error" role="alert">Cannot read the Parlour Games. Check your signal, then reload this page.</div>}
      {items === null
        ? <p className="why">…</p>
        : sets.length
          ? (
            <ul className="gt-tries">
              {sets.map(s => (
                <TryIt key={s.id} label={`${s.n}. ${s.title}`} device="phone" url={s.url} button="See it on a phone"
                  onOpen={() => onOpened({ label: `Parlour Game set ${s.n}, ${s.title}`, query: `?preview=questions (set ${s.n})`, device: 'phone' })} />
              ))}
            </ul>
          )
          : <p className="why">No sets in the bank yet. They are written on the Parlour Games list.</p>}
    </div>
  )
}

// ---- every open note ------------------------------------------------------

function Notes({ tasks }) {
  const [copied, setCopied] = useState(null) // null | 'yes' | the text, when the copy failed
  const cards = tasks ? gameTestCards(tasks) : []
  const open = cards.filter(t => t.status !== 'done').length
  const fixed = cards.length - open
  const copy = () => {
    const text = openNotesText(tasks)
    const done = () => { setCopied('yes'); setTimeout(() => setCopied(c => (c === 'yes' ? null : c)), 4000) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => setCopied(text))
    else setCopied(text)
  }
  return (
    <section className="panel">
      <h2>Your notes to Claude Code</h2>
      <p className="why">Every note you send is a card on the <Link to="/timeline">Timeline</Link> for Claude Code. To hand them over in a Claude Code chat, copy them and paste.</p>
      <p className="night-line">{tasks === null ? '…' : cards.length ? `${open} open, ${fixed} fixed.` : 'No notes sent yet.'}</p>
      <p className="night-line">
        <button className="primary" disabled={tasks === null || open === 0} onClick={copy}>Copy all open notes</button>
      </p>
      {copied === 'yes' && <p className="hint" role="status">Copied. Paste it into a Claude Code chat.</p>}
      {copied && copied !== 'yes' && (
        <label className="field">
          <span>The copy did not work. Select these words and copy them by hand.</span>
          <textarea readOnly rows={8} value={copied} onFocus={e => e.target.select()} />
        </label>
      )}
    </section>
  )
}
