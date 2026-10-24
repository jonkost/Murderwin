import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { callHost } from '../firebase'
import { usePresence, useTick, useDoc } from '../lib/hooks'
import { ACTS, characterById } from '../lib/content'
import { beatsOf, beatSpec, secondsLeft } from '../lib/night'
import { houseView } from '../lib/house'
import { achievementsOf, namesReady, secondsUntilNames, NEXT_NAME } from '../lib/finale'

// The host's buttons, on the host's own phone. Nothing here needs a Google
// sign-in: the two guests marked "— host:" on the guest list get this tab.
// Every button is labelled by what it does, never by content, and nothing on
// it can show who the Murderer, the Ghost or the victim is.

import { PLAY_URL } from '../lib/config'
export { PLAY_URL }

// nights/{id}.caseWarning, set when the case is built at the blackout. Plain words, never content.
const CASE_WARNINGS = {
  'trace-partner': 'One trace at the party has no look-alike among the guests here. The bedroom clue may come out clearer than planned.',
}

const PHASE_WORDS = {
  lobby: 'doors open, nothing started',
  act: 'playing',
  blackout: 'BLACKOUT, every phone is dark',
  prompt: 'power is back, phones are showing their prompt',
  paused: 'paused, Sir Irwin requires the garden',
}

function describe(command, r) {
  switch (command) {
    case 'create': return 'New night started. Type your name again to rejoin it.'
    case 'publish': return `Sent ${r.lines} lines to the phones.`
    case 'act': return `Act ${r.act} is on.`
    case 'relay-start': return r.already ? 'A drawing is already on the paper. It is kept. Clear it first if you want a fresh one.' : `The drawing has started: ${r.turns} turns.`
    case 'relay-reset': return 'The drawing is cleared. The door is shut again and the hall light is red.'
    case 'groups': return r.already ? 'The groups are set. They stay as they are.' : `${r.groups} groups made${r.trios ? `, ${r.trios} of three` : ''}, ${r.rounds} rounds.`
    case 'study-finish': return r.repeated ? 'That group was already paid.' : 'The group in the study is paid. The rounds go on with the clock.'
    case 'supper': return r.already ? 'Supper is already called.' : 'Supper is called. Every phone says so, and the cats a guest missed left a note.'
    case 'start-act4': return r.already ? 'Act 4 has already started.' : 'Act 4: every phone has the two-minute warning. The groups and the rounds come on their own.'
    case 'scene': return `The brain is setting ${r.scene}.`
    case 'music': return r.music === 'next' ? 'The brain is changing the playlist.' : `The brain is told: ${r.music}.`
    case 'study-reassign': return r.already ? 'That group was already the one due.' : 'Noted. The study pays that group when it finishes.'
    case 'study-tick': return r.ticked ? 'The study slot ran out: the group is paid and the house has moved on.' : 'Nothing to move yet.'
    case 'tick': return r.windowSettled ? `The window had run out: picked for ${r.settled} phones.` : r.clock ? 'The clock moved the night on.' : 'Every clock is where it should be.'
    case 'hall': return `The hall light is ${r.hall}.`
    case 'tv-trace': return r.tvTrace ? 'The Parlour screen shows the trace once the door has been open ten seconds.' : 'The trace is off the Parlour screen.'
    case 'station-key': return 'Station key saved. Type the same key into station/.env on the study Mac.'
    case 'next': case 'beat': case 'back': if (r.armed) return 'Armed.'
      return r.act ? `Act ${r.act}: ${beatSpec(r.act, r.beat)?.name ?? r.beat}.${r.dealt != null ? ` Sent to ${r.dealt} phones.` : ''}${r.phones != null ? ` ${r.phones} phones lit.` : ''}` : 'Moved.'
    case 'light-up': return r.waiting ? `A Parlour Game is waiting on ${r.phones} phones. Each guest plays it when free.` : `Parlour Game on ${r.phones} phones. Sixty seconds.`
    case 'settle': return r.settled ? `Picked for ${r.settled} phones that had not chosen.` : 'Everyone had chosen.'
    case 'power': return 'The power is back. Every phone is showing its card.'
    case 'handover': return 'That phone is wiped. The next person to pick it up types their own name; the previous owner taps theirs on any other phone.'
    case 'pause': return 'Paused. Every clock in the house is standing still.'
    case 'reveal-stage': return r.already ? 'All three are named. Press Next for everyone’s result.' : `The screen is naming the ${r.stage}.`
    case 'finale-hold': return r.already ? 'The screen is already held.' : 'The screen is held where it is.'
    case 'finale-go': return r.already ? 'The screen was not held.' : `Carrying on. The screen was held for ${Math.round((r.heldMs ?? 0) / 1000)} seconds.`
    case 'award': return r.already ? 'They already have that one.' : 'Given. It is on their phone now, and on the screen at the end.'
    case 'fetch-champion': return r.already ? 'Fetch Champion is already given.' : 'Fetch Champion. It shows in the end credits.'
    case 'salem-petted': return r.already ? 'Salem already chose them.' : 'Done. Salem tells them the truth from now on, and their phone says so.'
    case 'resume': return `Resumed. Every clock moved on by ${Math.round((r.shiftMs ?? 0) / 1000)} seconds.`
    case 'spill': return 'Noted. The Manor has decided on its own whether the story could still change. It says nothing either way, and neither does this phone.'
    case 'hush': return r.already ? 'Already hushed. Nothing more to do.' : 'Hushed. Nothing on any phone changes. From now on that player’s answers move nothing, and the reveal will say so.'
    default: return 'Done.'
  }
}

export function useQr(text) {
  const [qr, setQr] = useState(null)
  useEffect(() => {
    QRCode.toDataURL(text, { width: 360, margin: 1, color: { dark: '#0f0d0c', light: '#f1e8d6' } })
      .then(setQr).catch(() => setQr(null))
  }, [text])
  return qr
}

export default function Host({ night, content, serverNow }) {
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)
  const presence = usePresence(night.nightId)
  const qr = useQr(PLAY_URL)
  useTick(15_000) // online dots age out on their own
  const live = night.nightId && night.nightId !== 'preview'
  const study = useDoc(live ? `nights/${night.nightId}/public/study` : null)
  const rotation = useDoc(live ? `nights/${night.nightId}/public/rotation` : null)
  const cues = useDoc(live ? `nights/${night.nightId}/public/cues` : null)
  const relay = useDoc(live ? `nights/${night.nightId}/public/relay` : null)
  const finale = useDoc(live && night.act === 7 ? `nights/${night.nightId}/public/finale` : null)
  const act4 = useDoc(live && night.act === 4 ? `nights/${night.nightId}/public/act4` : null)
  const awards = useDoc(live && night.act <= 5 ? `nights/${night.nightId}/public/achievements` : null)
  // Acts 2 and 4 run on the clock (the cat queue and the supper chime; Act 4's
  // warning, lock-in and ten-minute rounds). The server ticks once a minute on
  // its own; this tab nudges it every twenty seconds so a chime is never late.
  useEffect(() => {
    if (!live || ![2, 4].includes(night.act)) return
    const tick = () => callHost({ nightId: night.nightId, command: 'tick' }).catch(() => {})
    const id = setInterval(tick, 20_000)
    return () => clearInterval(id)
  }, [live, night.nightId, night.act])

  // The clock, once, when this tab opens: a window or a study slot that ran out while nobody
  // was looking is settled now. The server does the same every minute on its own.
  useEffect(() => {
    if (!live) return
    callHost({ nightId: night.nightId, command: 'tick' }).catch(() => {})
  }, [live, night.nightId])

  const run = async (command, arg) => {
    setBusy(command)
    setMsg(null)
    try {
      const r = await callHost({ nightId: night.nightId, command, arg })
      setMsg(describe(command, r.data ?? {}))
    } catch (e) {
      setMsg(`That didn’t work: ${e?.message ?? 'no answer from the Manor'}`)
    } finally {
      setBusy(null)
    }
  }

  const roster = night.roster ?? {}
  const people = Object.entries(roster).map(([key, r]) => ({ key, ...r })).sort((a, b) => a.name.localeCompare(b.name))
  const hostKeys = new Set(Object.values(night.hosts ?? {}).map(h => h.key))
  const now = Date.now()
  const house = houseView({ night, study: study.data, rotation: rotation.data, presence, now: serverNow ? serverNow() : now })
  const startDrawing = () => {
    // a drawing under way (or done, with the trace behind the door) is kept; the host is asked before it is wiped
    const underWay = ['walk', 'turn', 'vote', 'lockout', 'done'].includes(relay.data?.state)
    if (underWay && !window.confirm('A drawing is already on the paper. Restart it from the beginning?')) return
    run('relay-start', underWay ? 'force' : undefined)
  }

  return (
    <div className="host">
      <p className="host-status">
        {night.act ? `Act ${night.act} · ${ACTS[night.act]?.plain}` : 'Before Act 1'} · {PHASE_WORDS[night.phase] ?? night.phase}
        <br />Doors {night.joinOpen ? 'open' : 'closed'} · {people.length} joined
      </p>
      {msg && <p className="host-msg" role="status">{msg}</p>}
      {night.caseWarning && <p className="host-msg trouble" role="alert">{String(night.caseWarning).split(',').map(k => CASE_WARNINGS[k] ?? k).join(' ')}</p>}

      <RunPanel night={night} busy={busy} run={run} serverNow={serverNow} finale={finale.data} act4={act4.data} />
      <RevealPanel night={night} finale={finale.data} busy={busy} run={run} serverNow={serverNow} />

      <h3>The acts</h3>
      <div className="host-row">
        {Object.entries(ACTS).map(([n, a]) => (
          <button key={n} className={Number(n) === night.act ? 'chip on' : 'chip'} disabled={!!busy}
            onClick={() => run('act', Number(n))} title={a.name}>
            {n}
          </button>
        ))}
      </div>
      <div className="host-row">
        <button className="big wide" disabled={!!busy || night.phase === 'blackout'} onClick={() => run('blackout')}>Blackout</button>
        <button className="big wide" disabled={!!busy || night.phase !== 'blackout'} onClick={() => run('power')}>Power returns · Act 2</button>
        {night.phase === 'paused'
          ? <button className="chip wide" disabled={!!busy} onClick={() => run('resume')}>Resume</button>
          : <button className="chip wide" disabled={!!busy} onClick={() => run('pause')}>Pause, Irwin needs the garden</button>}
      </div>

      <HousePanel house={house} cues={cues.data} night={night} busy={busy} run={run} />
      <ScenesPanel busy={busy} run={run} />
      <AchievementsPanel night={night} content={content} awards={awards.data} busy={busy} run={run} />
      <SalemPanel night={night} busy={busy} run={run} />
      <FetchPanel night={night} busy={busy} run={run} />

      <Safeguards night={night} busy={busy} run={run} />

      <h3>The groups (Act 4)</h3>
      <p className="gloss">Start Act 4 makes the pairs and trios and their walk round the four rooms. Press this only if you need the groups before then; made groups are kept.</p>
      <div className="host-row">
        <button className="chip wide" disabled={!!busy} onClick={() => run('groups')}>Make the groups</button>
      </div>
      <StationKey busy={busy} run={run} />

      <h3>The Big Solve (Act 6)</h3>
      <p className="gloss">Starts the relay drawing on every phone and the Parlour screen. It tells you nothing. A drawing already on the paper is kept unless you say restart.</p>
      <div className="host-row">
        <button className="big wide" disabled={!!busy} onClick={startDrawing}>Start the drawing</button>
        <button className="chip wide" disabled={!!busy} onClick={() => run('relay-reset')}>Clear the drawing</button>
        <button className="chip wide" disabled={!!busy} onClick={() => run('tv-trace', cues.data?.tvTrace ? 'off' : undefined)} title="If the bedroom screen has died, the TV shows the trace after the door opens">{cues.data?.tvTrace ? 'Take the trace off the TV' : 'Show the trace on the TV'}</button>
      </div>

      <h3>The doors</h3>
      <div className="host-row">
        <button className="chip wide" disabled={!!busy} onClick={() => run(night.joinOpen ? 'join-close' : 'join-open')}>
          {night.joinOpen ? 'Close the doors' : 'Open the doors'}
        </button>
        <button className="chip wide" disabled={!!busy} onClick={() => run('publish')}>Resend rules &amp; bios</button>
      </div>
      {qr && (
        <figure className="host-qr">
          <img src={qr} alt="Square code that opens the game" />
          <figcaption>Let a guest scan this, then tap their name.</figcaption>
        </figure>
      )}

      <h3>Who is here</h3>
      {people.length === 0 && <p className="gloss">Nobody has typed their name yet.</p>}
      {house.answered && <p className="gloss">{house.answered.n} of {house.answered.of} have answered. Who is online shows again when the window closes.</p>}
      <ul className="here">
        {people.map(r => {
          const online = house.showGuests && now - (presence[r.key] ?? 0) < 2 * 60 * 1000
          const character = characterById(content, r.characterId)
          return (
            <li key={r.key}>
              {house.showGuests
                ? <span className={online ? 'dot on' : 'dot'} aria-label={online ? 'phone is here' : 'phone not seen lately'} />
                : <span className="dot hidden" aria-hidden="true" />}
              <span className="who-name">{r.name}{hostKeys.has(r.key) ? ' · host' : ''}</span>
              <span className="who-char">{(character?.name ?? r.characterId)} · bag {r.bag}</span>
              <button className="chip handover" disabled={!!busy} onClick={() => run('handover', r.key)} title="Wipe this phone so someone else can use it">Hand this phone on</button>
            </li>
          )
        })}
      </ul>

      <h3>A fresh night</h3>
      <p className="gloss">Only for rehearsals or if tonight must start over. It deals new characters to everyone, and every phone must tap its name again.</p>
      <button className="chip wide" disabled={!!busy} onClick={() => run('create')}>Start a new night</button>
    </div>
  )
}

// The house at a glance: the study station, the room screens (the memory
// match iPad among them) and the cue relay (alive when heard from within two
// minutes), Act 2's cat visits as a count, the group due in the study and
// its clock, a picker for the group that actually walked in, and the hall
// light by hand. Everything here is a count, a name or a dot.
// While a window is open the per-guest dots are hidden (see houseView).
export function HousePanel({ house, cues, night, busy, run }) {
  const [picking, setPicking] = useState(false)
  const s = house.station
  const st = house.study
  const hall = cues?.hall ?? null
  const act4 = night.act === 4
  return (
    <section className="house">
      <h3>The house</h3>
      <ul className="machines">
        <li>
          <span className={s.alive ? 'dot on' : 'dot'} aria-label={s.alive ? 'study station is alive' : 'study station is quiet'} />
          <span className="who-name">Study station</span>
          <span className="who-char">{s.alive ? `alive, ${s.state}` : s.quietFor ? `quiet since ${s.quietFor} ago` : 'never heard from'}</span>
        </li>
        {house.machines.map(m => (
          <li key={m.key}>
            <span className={m.alive ? 'dot on' : 'dot'} aria-label={m.alive ? `${m.label} is alive` : `${m.label} is quiet`} />
            <span className="who-name">{m.label}</span>
          </li>
        ))}
      </ul>
      {night.caseWarning && <p className="gloss">{String(night.caseWarning).split(',').map(k => CASE_WARNINGS[k] ?? k).join(' ')}</p>}
      {/* Act 2: a count of who has finished the cats, so the host knows when to press Next. Never which cat or hint. */}
      {house.catVisits && <p className="gloss cat-visits">Cat visits: {house.catVisits.done} of {house.catVisits.of} guests have seen all four.</p>}
      {act4 && (
        <div className="house-study">
          {st ? (
            <p className="gloss">
              In the study: <strong>{st.names}</strong>{st.paid ? ' (paid)' : st.clockLeft ? ` · ${st.clockLeft} left` : st.running ? '' : ' · waiting for the first touch'}
              {!s.alive && st.state === 'absent' ? ' · no station: twelve minutes, then the house moves on' : ''}
            </p>
          ) : <p className="gloss">Nobody is due in the study.</p>}
          {!s.alive && <p className="gloss">Station quiet{s.quietFor ? ` since ${s.quietFor} ago` : ''}. The slots run on this phone's clock.</p>}
          <div className="host-row">
            {st && !st.paid && <button className="chip" disabled={!!busy} onClick={() => run('study-finish')}>Finish this group now</button>}
            {house.canReassign && !picking && <button className="chip" disabled={!!busy} onClick={() => setPicking(true)}>This group is in the study</button>}
          </div>
          {picking && (
            <div className="host-row">
              {house.groups.filter(g => !g.paid && !g.due).map(g => (
                <button key={g.id} className="chip" disabled={!!busy} onClick={() => { setPicking(false); run('study-reassign', g.id) }}>{g.names}</button>
              ))}
              <button className="chip" onClick={() => setPicking(false)}>Never mind</button>
            </div>
          )}
        </div>
      )}
      <div className="host-row">
        <span className="gloss">Hall light: {hall ?? 'not set'}</span>
        <button className="chip" disabled={!!busy || hall === 'red'} onClick={() => run('hall', 'red')}>Red</button>
        <button className="chip" disabled={!!busy || hall === 'green'} onClick={() => run('hall', 'green')}>Green</button>
      </div>
    </section>
  )
}

// Running the night: one button. The beats come from seed/night.json; the
// server does whatever the next beat needs (deal, light up, group, reveal)
// and says only how many phones it reached. Nothing here can show content.
// The house (handoff 23 Oct §2c, §9.11): the four Hue scenes as buttons, in
// case the brain misses one, and the brain's music by hand. Never a tell: the
// buttons say which scene, never why.
const SCENE_BUTTONS = [['Murderwin Arrival', 'Arrival'], ['Murderwin Blackout', 'Blackout'], ['Murderwin Lights Out', 'Lights Out'], ['Murderwin Reveal', 'Reveal']]
function ScenesPanel({ busy, run }) {
  return (
    <section className="scenes">
      <h3>The house: scenes</h3>
      <div className="host-row">
        {SCENE_BUTTONS.map(([name, label]) => <button key={name} className="chip" disabled={!!busy} onClick={() => run('scene', name)}>{label}</button>)}
      </div>
      <p className="gloss">Music on the brain:</p>
      <div className="host-row">
        <button className="chip" disabled={!!busy} onClick={() => run('music', 'play')}>Play</button>
        <button className="chip" disabled={!!busy} onClick={() => run('music', 'pause')}>Pause</button>
        <button className="chip" disabled={!!busy} onClick={() => run('music', 'next')}>Next playlist</button>
      </div>
    </section>
  )
}

// Act 4's clock in plain words: the warning, how many are locked in, the round and its time left.
function act4Line(act4, night, now) {
  if (!act4?.phase) return null
  const left = t => { const s = Math.max(0, Math.ceil((Number(t?.toMillis?.() ?? t) - now) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
  if (act4.phase === 'warn') return `Two-minute warning: the group cards in ${left(act4.warnEndsAt)}.`
  if (act4.phase === 'groups') return `${Object.keys(act4.locked ?? {}).length} of ${Object.keys(night.roster ?? {}).length} locked in. The rounds start when everyone is, or in ${left(act4.lockEndsAt)}.`
  if (act4.phase === 'rounds') return `Round ${act4.round} of ${act4.rounds}: the chime in ${left(act4.roundEndsAt)}. Next moves everyone on now.`
  return 'The rounds are over. Everyone is back in the Parlour. Next goes on to Act 5.'
}

function RunPanel({ night, busy, run, serverNow, finale = null, act4 = null }) {
  useTick(1000)
  const beats = beatsOf(night.act)
  const idx = beats.findIndex(b => b.key === night.beat)
  const here = idx >= 0 ? beats[idx] : null
  const after = idx >= 0 && idx + 1 < beats.length ? beats[idx + 1] : null
  const nextAct = night.act >= 1 && night.act < 7 && !after ? ACTS[night.act + 1] : null
  const w = night.window
  const open = w && !w.settled
  const left = open && serverNow ? secondsLeft(w, serverNow) : 0
  const nextLabel = night.phase === 'blackout' ? 'Press Power returns'
    : night.act === 0 ? 'Begin Act 1'
    : after ? `Next: ${after.name}`
    : night.act === 1 ? 'Then: Blackout'
    : nextAct ? `Next: Act ${night.act + 1}, ${nextAct.plain}`
    : 'The night is over'
  const atEnd = (night.act === 1 || night.act === 7) && !after
  const naming = night.act === 7 && here?.action === 'reveal' && finale?.stage !== 'victim' // the screen names all three before Next
  const canNext = !busy && night.phase !== 'blackout' && !atEnd && !(open && left > 0) && !naming
  return (
    <section className="run">
      <h3>Run the night</h3>
      {here ? (
        <>
          <p className="run-here"><strong>{here.name}</strong></p>
          <p className="gloss run-what">{here.what}</p>
        </>
      ) : <p className="gloss">Nothing has started. Begin when the room is in.</p>}
      {naming && <p className="host-msg" role="status">The screen is revealing. Name all three below, then press Next.</p>}
      {night.act === 4 && act4 && <p className="host-msg" role="status">{act4Line(act4, night, serverNow ? serverNow() : Date.now())}</p>}
      {night.act === 2 && night.beat !== 'supper' && (
        <div className="host-row">
          <button className="chip wide" disabled={!!busy} onClick={() => run('supper')} title="Supper comes on its own once everyone has seen all four cats">Supper's ready</button>
        </div>
      )}
      {night.act === 3 && (
        <div className="host-row">
          <button className="big wide" disabled={!!busy || (open && left > 0)} onClick={() => run('start-act4')}>Start Act 4</button>
        </div>
      )}
      {open && (
        <p className="host-msg" role="status">
          {w.title}: {left > 0 ? `${left} seconds left.` : 'time is up.'}
          {left === 0 && <> <button className="chip" disabled={!!busy} onClick={() => run('settle')}>Pick for the rest</button></>}
        </p>
      )}
      <div className="host-row">
        <button className="big wide" disabled={!canNext} onClick={() => run('next')}>{nextLabel}</button>
      </div>
      <div className="host-row">
        <button className="chip" disabled={!!busy || !here || idx === 0 && night.act <= 2} onClick={() => run('back')}>Back one</button>
        {[2, 4, 6].includes(night.act) && <button className="chip" disabled={!!busy || open} onClick={() => run('light-up')}>Parlour Game now</button>}
      </div>
      {beats.length > 0 && (
        <details className="run-beats">
          <summary className="gloss">All of Act {night.act}'s beats</summary>
          <ol className="beat-list">
            {beats.map((b, i) => (
              <li key={b.key} className={i === idx ? 'on' : i < idx ? 'done' : ''}>
                <button className="beat" disabled={!!busy} onClick={() => run('beat', b.key)}>{b.name}</button>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}

// Act 7: the reveal, one name at a time. The screen plays the stats and the
// graph on its own clock; each name waits for a press here. Nothing on this
// panel can show a name: the button says which, never who.
const NAME_BUTTONS = { murderer: 'Name the Murderer', motive: 'Name the Motive', victim: 'Name the Victim' }
export function RevealPanel({ night, finale, busy, run, serverNow }) {
  useTick(1000)
  if (night.act !== 7 || !finale) return null
  const now = serverNow ? serverNow() : Date.now()
  const stage = finale.stage ?? 'stats'
  const next = NEXT_NAME[stage] ?? null
  const ready = namesReady(finale, now)
  const wait = secondsUntilNames(finale, now)
  const held = !!finale.holdAt
  const line = held ? 'The screen is held where it is.'
    : !ready ? `The screen is counting. ${wait} seconds until the first name.`
    : next ? 'The screen is ready for the next name.'
    : 'All three are named. Press Next for everyone’s result.'
  return (
    <section className="run reveal-panel">
      <h3>The reveal</h3>
      <p className="gloss">{line}</p>
      {next && (
        <div className="host-row">
          <button className="big wide" disabled={!!busy || !ready || held} onClick={() => run('reveal-stage')}>{NAME_BUTTONS[next]}</button>
        </div>
      )}
      <div className="host-row">
        {held
          ? <button className="chip wide" disabled={!!busy} onClick={() => run('finale-go')}>Carry on</button>
          : <button className="chip wide" disabled={!!busy} onClick={() => run('finale-hold')}>Hold the screen</button>}
      </div>
    </section>
  )
}

// Achievements: pre-written in the workshop, given here with two taps (a
// guest, then the achievement). On the guest's phone at once, on the screen
// at the end. Closes at the end of Act 5, when the hosts have no hands free.
export function AchievementsPanel({ night, content, awards, busy, run }) {
  const [who, setWho] = useState(null)
  if (!(night.act >= 1 && night.act <= 5)) return null
  const list = achievementsOf(content)
  const given = awards?.awards ?? {}
  const people = Object.entries(night.roster ?? {}).map(([key, r]) => ({ key, name: r.name })).sort((a, b) => a.name.localeCompare(b.name))
  const count = Object.keys(given).length
  return (
    <section className="achievements">
      <h3>Achievements</h3>
      <p className="gloss">Tap a guest, then an achievement. It lands on their phone now and on the screen at the end. Closes at the end of Act 5.</p>
      {!list.length && <p className="gloss">None written yet. They are the Achievements list in the workshop.</p>}
      {list.length > 0 && (
        <div className="host-row">
          {people.map(p => (
            <button key={p.key} className={who === p.key ? 'chip on' : 'chip'} disabled={!!busy} onClick={() => setWho(who === p.key ? null : p.key)}>{p.name}</button>
          ))}
        </div>
      )}
      {who && (
        <ul className="award-list">
          {list.map(a => {
            const done = !!given[`${who}_${a.n}`]
            return (
              <li key={a.n}>
                <button className={done ? 'chip on' : 'chip'} disabled={!!busy || done} onClick={() => run('award', `${who}:${a.n}`)} title={a.line}>{a.title}{done ? ' · given' : ''}</button>
              </li>
            )
          })}
        </ul>
      )}
      {count > 0 && <p className="gloss">{count} given so far.</p>}
    </section>
  )
}

// Salem petted: when the real Salem lets a guest pet him, tap their name.
// Their Salem goes to the top for the rest of the night. Never the hosts.
export function SalemPanel({ night, busy, run }) {
  const [sure, setSure] = useState(null)
  if (!(night.act >= 1 && night.act <= 6)) return null
  const hostKeys = new Set(Object.values(night.hosts ?? {}).map(h => h.key))
  const people = Object.entries(night.roster ?? {}).filter(([key]) => !hostKeys.has(key)).map(([key, r]) => ({ key, name: r.name })).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <section className="salem-petted">
      <h3>Salem petted</h3>
      <p className="gloss">When the real Salem lets someone pet him, tap their name, then Yes. Not for you or Susan.</p>
      <div className="host-row">
        {people.map(p => (
          <button key={p.key} className={sure === p.key ? 'chip on' : 'chip'} disabled={!!busy} onClick={() => setSure(sure === p.key ? null : p.key)}>{p.name}</button>
        ))}
      </div>
      {sure && <div className="host-row"><button className="big wide" disabled={!!busy} onClick={() => { run('salem-petted', sure); setSure(null) }}>Yes, Salem chose {people.find(p => p.key === sure)?.name}</button></div>}
    </section>
  )
}

// Fetch Champion: the first guest the real Sir Irwin brings a toy to. Once.
export function FetchPanel({ night, busy, run }) {
  const [sure, setSure] = useState(null)
  if (!(night.act >= 1 && night.act <= 6)) return null
  const people = Object.entries(night.roster ?? {}).map(([key, r]) => ({ key, name: r.name })).sort((a, b) => a.name.localeCompare(b.name))
  const given = night.fetchChampion ? night.roster?.[night.fetchChampion]?.name : null
  return (
    <section className="fetch-champion">
      <h3>Fetch Champion</h3>
      {given
        ? <p className="gloss">Given to {given}.</p>
        : <>
          <p className="gloss">Tap the first person the real Sir Irwin brings a toy to, then Yes.</p>
          <div className="host-row">
            {people.map(p => (
              <button key={p.key} className={sure === p.key ? 'chip on' : 'chip'} disabled={!!busy} onClick={() => setSure(sure === p.key ? null : p.key)}>{p.name}</button>
            ))}
          </div>
          {sure && <div className="host-row"><button className="big wide" disabled={!!busy} onClick={() => { run('fetch-champion', sure); setSure(null) }}>Yes, {people.find(p => p.key === sure)?.name}</button></div>}
        </>}
    </section>
  )
}

// The key the study Mac must present. Typed once; the same text goes in station/.env.
function StationKey({ busy, run }) {
  const [key, setKey] = useState('')
  return (
    <form className="host-row" onSubmit={e => { e.preventDefault(); if (key.trim()) run('station-key', key.trim()) }}>
      <input className="field" value={key} onChange={e => setKey(e.target.value)} placeholder="Station key, e.g. study-2026" aria-label="Station key" />
      <button className="chip" type="submit" disabled={!!busy || key.trim().length < 4}>Save key</button>
    </form>
  )
}

// The two safeguards (CLAUDE.md). Spill the Beans asks the Manor to change
// the story; the Manor decides on its own, silently, and this phone is told
// nothing either way, so the button looks the same whether it worked or not.
// It greys out after Act 5. The Hush is for a hidden player who has been
// found out in the room: their answers move nothing from then on, no phone
// changes, and the reveal says one line about it. Neither button can show
// who holds a role.
export function Safeguards({ night, busy, run }) {
  const [confirm, setConfirm] = useState(null)
  const afterFive = (night.act ?? 0) > 5
  const started = (night.act ?? 0) >= 2
  const ask = (what) => setConfirm(what)
  const go = () => {
    const what = confirm
    setConfirm(null)
    if (what === 'spill') run('spill')
    else if (what) run('hush', what)
  }
  return (
    <section className="safeguards">
      <h3>If something goes wrong</h3>
      <p className="gloss">Spill the Beans asks the Manor to change the story, if it still can. It works through Act 5 and never says whether it did. The Hush is for when someone has been found out: say which role out loud was given away, and their answers stop counting. Nobody is told.</p>
      <div className="host-row">
        <button className="chip wide" disabled={!!busy || afterFive || !started || !!confirm} onClick={() => ask('spill')}>Spill the Beans</button>
        <button className="chip" disabled={!!busy || !started || !!confirm} onClick={() => ask('murderer')}>Hush the Murderer</button>
        <button className="chip" disabled={!!busy || !started || !!confirm} onClick={() => ask('ghost')}>Hush the Ghost</button>
      </div>
      {confirm && (
        <div className="host-row" role="alertdialog" aria-label="Are you sure?">
          <span className="gloss">{confirm === 'spill' ? 'Ask the Manor to change the story?' : `Hush the ${confirm === 'murderer' ? 'Murderer' : 'Ghost'}? This cannot be undone.`}</span>
          <button className="chip" disabled={!!busy} onClick={go}>Yes</button>
          <button className="chip" onClick={() => setConfirm(null)}>Never mind</button>
        </div>
      )}
    </section>
  )
}

// On the doors screen while nothing is live: the host bootstraps the first
// night from any phone. Once a night is live only host phones may start another.
export function StartNight({ ui }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      await callHost({ command: 'create' })
    } catch (e) {
      setError(e?.message ?? 'The Manor did not answer.')
      setBusy(false)
    }
  }
  return (
    <div className="start-night">
      <button className="quiet" disabled={busy} onClick={start}>{busy ? 'Starting…' : ui['START NIGHT']}</button>
      {error && <p className="trouble" role="alert">{error}</p>}
    </div>
  )
}
