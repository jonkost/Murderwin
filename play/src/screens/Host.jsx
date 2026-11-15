import { useEffect, useState } from 'react'
import SoundList from './SoundList'
import { stopWarning } from '../lib/soundList'
import BlackoutTest, { BLACKOUT_TEST_PRESSED, blackoutTestReply } from './BlackoutTest'
import { useQr } from '../lib/qr'
import { callHost, callRelayGuess } from '../firebase'
import { usePresenceRows, useTick, useDoc } from '../lib/hooks'
import { ACTS, characterById } from '../lib/content'
import { beatsOf, beatSpec, secondsLeft, isRehearsalNight } from '../lib/night'
import { houseView, fillInLine, lockedInCount, catVisits, isBrainQuiet, QUIET_MS, QUIET_SCREENS } from '../lib/house'
import { OWN_SLIDES, rulesStillPlaying } from '../lib/rulesfilm'
import { introAtFor, clockWords, countdownLeft, countdownText, screenLinks, secondDisplayLink, secondDisplayLinks, MAX_FILL_INS, fillInArg, fillInsOffered, fillInWords, onPartyDay, PRACTICE_ASK, PRACTICE_NOTE, REPLACE_ASK } from '../lib/start'
import { creditsLeft } from '../lib/closing'
import { askFirst } from '../lib/ask'
import { achievementsOf, namesReady, secondsUntilNames, NEXT_NAME, ms as finaleMs } from '../lib/finale'
import { hostRelayControl, guessReply, paperReply, guessWaiting } from '../lib/relayhost'
import { Figure } from '../lib/draw'
import { troubleLine } from '../lib/trouble'
import GoodNight from './GoodNight'
import { parlourBeat } from '../lib/flow'
import IpadPanel from './IpadPanel'
import { hostStep, piecesOf, movesByItself, goOnAsk, drawingRuns, newsWaiting, NEWS_ASK } from '../lib/hostSteps'

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
  prompt: 'power is back, phones are on the interruption button, then their cards',
  paused: 'paused, Sir Irwin requires the garden',
}

// Ending a practice night from the Host tab (14 Nov 2026, Jon: "I need a way to end the night when testing").
// The question it asks first, and how long the music's stop is given to reach the brain before the night goes.
export const END_PRACTICE_ASK = 'End this practice night? The music stops, every phone and screen goes back to the start, and what was played is thrown away.'
export const END_PRACTICE_WAIT_MS = 2500

// What the Host tab says the moment a button is pressed, before the Manor
// answers, for the one command that takes its time on purpose: the Blackout
// waits five seconds on the server before the power returns (25 Oct 2026).
const PRESSED_WORDS = {
  blackout: 'Blackout. The music stops now, the dark comes in two seconds, the power five seconds after.',
  'blackout-test': BLACKOUT_TEST_PRESSED,
}

function describe(command, r) {
  switch (command) {
    case 'create': return 'New night started. Type your name again to rejoin it.'
    case 'blackout': return r.already === 'test' ? 'A Blackout test is running. Press Blackout again in a few seconds.'
      : r.already ? 'Already dark. The power comes back on its own.'
      : r.powerReturned ? 'The power is back. Every phone says sorry for the interruption, then shows its card for fifteen seconds.'
      : r.dark === false ? 'No blackout: the night was paused or moved before the dark came. Press Blackout again when the room is ready.'
      : 'The power did not come back from this press: the night was moved or brought back by hand during the dark. The line above says where the night is. If it is still dark, the power comes back on its own within a minute.'
    case 'blackout-test': return blackoutTestReply(r)
    case 'publish': return `Sent ${r.lines} lines to the phones.`
    case 'act': return `Act ${r.act} is on.`
    case 'relay-start': return r.already ? 'A drawing is already on the paper. It is kept. Clear it first if you want a fresh one.' : `The drawing has started: ${r.turns} turns.`
    case 'relay-reset': return 'The drawing is cleared. The door is shut again and the bedroom lock light is red.'
    case 'groups': return r.already ? 'The groups are set. They stay as they are.' : `${r.groups} groups made${r.trios ? `, ${r.trios} of three` : ''}, ${r.rounds} rounds.`
    case 'study-finish': return r.repeated ? 'That group was already paid.' : 'The group in the study is paid. The rounds go on with the clock.'
    case 'supper': return r.already ? 'Supper is already called.' : 'Supper is called. Every phone says so, and the cats a guest missed left a note.'
    case 'start-act4': return r.already ? 'Act 4 has already started.' : 'Act 4: every phone has the two-minute warning. The groups and the rounds come on their own.'
    case 'scene': return `The brain is setting ${r.scene}.`
    case 'music': return r.music === 'next' ? 'The brain is changing the playlist.' : `The brain is told: ${r.music}.`
    case 'study-reassign': return r.already ? 'That group was already the one due.' : 'Noted. The study pays that group when it finishes.'
    case 'study-tick': return r.ticked ? 'The study slot ran out: the group is paid and the house has moved on.' : 'Nothing to move yet.'
    case 'tick': return r.windowSettled ? `The window had run out: picked for ${r.settled} phones.` : r.clock ? 'The clock moved the night on.' : 'Every clock is where it should be.'
    case 'hall': return `The bedroom lock light is ${r.hall}.`
    case 'sound-test': return 'That sound is playing on every room screen and phone.'
    case 'cake': return r.card === false
      ? 'Happy Birthday for Dogs on every HomePod and the candles scene. Sir Irwin’s countdown stays on the TV. The music stays off for him: the jazz comes back at Update your motives.'
      : 'Happy Birthday for Dogs on every HomePod, the candles scene, the birthday card on the TV. The jazz comes back when the song ends.'
    case 'at-the-paper': return paperReply(r)
    case 'tv-trace': return r.tvTrace ? 'The Parlour screen shows the trace once the door has been open ten seconds.' : 'The trace is off the Parlour screen.'
    case 'station-key': return 'Saved. If that was a new word, the Study’s station and bulletin 2 stop until the Study’s Mac and the brain hold it too.'
    case 'next': case 'beat': case 'back': if (r.stale) return 'The night had already moved on.'
      if (r.armed) return 'Armed.'
      return r.act ? `Act ${r.act}: ${beatSpec(r.act, r.beat)?.name ?? r.beat}.${r.dealt != null ? ` Sent to ${r.dealt} phones.` : ''}${r.phones != null ? ` ${r.phones} phones lit.` : ''}` : 'Moved.'
    case 'light-up': return r.waiting ? `A Parlour Game is waiting on ${r.phones} phones. Each guest plays it when free.` : `Parlour Game on ${r.phones} phones. Sixty seconds.`
    case 'settle': return r.settled ? `Picked for ${r.settled} phones that had not chosen.` : 'Everyone had chosen.'
    case 'power': return r.already ? 'The power is already back.' : 'The power is back. Every phone says sorry for the interruption, then shows its card for fifteen seconds.'
    case 'handover': return 'That phone is wiped. The next person to pick it up types their own name; the previous owner taps theirs on any other phone.'
    case 'pause': return 'Paused. Every clock in the house is standing still.'
    case 'reveal-stage': return r.already ? 'All three are named. Press Next for everyone’s result.' : `The screen is naming the ${r.stage}.`
    case 'finale-hold': return r.already ? 'The screen is already held.' : 'The screen is held where it is.'
    case 'finale-go': return r.already ? 'The screen was not held.' : `Carrying on. The screen was held for ${Math.round((r.heldMs ?? 0) / 1000)} seconds.`
    case 'award': return r.already ? 'They already have that one.' : 'Given. It is on their phone now, and on the screen at the end.'
    case 'fetch-champion': return r.already ? 'Fetch Champion is already given.' : 'Fetch Champion. It shows in the end credits.'
    case 'salem-petted': return r.already ? 'Salem already chose them.' : 'Done. Salem tells them the truth from now on, and their phone says so.'
    case 'resume': return `Resumed. Every clock moved on by ${Math.round((r.shiftMs ?? 0) / 1000)} seconds.`
    // the same words whether it worked or not; a spill that worked changes two role cards with no buzz (14 Nov 2026, the deep scan)
    case 'spill': return 'Noted. The Manor has decided on its own whether the story could still change, and says nothing either way. Now say to everyone: the Manor may have shuffled the case, so open You and read your card again, quietly.'
    case 'ipad': return r.ipad === 'auto' ? 'The iPad follows the night.' : 'The iPad has switched. Auto again from the next act.'
    case 'hush': return r.already ? 'Already hushed. Nothing more to do.' : 'Hushed. Nothing on any phone changes. From now on that player’s answers move nothing, and the reveal will say so.'
    default: return 'Done.'
  }
}

// The square code is drawn by lib/qr.js since 25 Oct 2026, shared with the room screens; the name stays exported from here.
export { useQr }

export default function Host({ night, content, serverNow }) {
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)
  // who has been heard from, and which room screens have their sound on (a screen nobody has clicked
  // since it loaded is refused sound by its browser: its videos would play silent)
  const { seen: presence, sound: screenSound } = usePresenceRows(night.nightId)
  const qr = useQr(PLAY_URL)
  useTick(night.act === 1 && night.beat === 'arrive' && night.introAt ? 1000 : 15_000) // online dots age out on their own; the countdown to the intro ticks by the second
  const live = night.nightId && night.nightId !== 'preview'
  const study = useDoc(live ? `nights/${night.nightId}/public/study` : null)
  const rotation = useDoc(live ? `nights/${night.nightId}/public/rotation` : null)
  const cues = useDoc(live ? `nights/${night.nightId}/public/cues` : null)
  const relay = useDoc(live ? `nights/${night.nightId}/public/relay` : null)
  const finale = useDoc(live && night.act === 7 ? `nights/${night.nightId}/public/finale` : null)
  const act4 = useDoc(live && night.act === 4 ? `nights/${night.nightId}/public/act4` : null)
  const awards = useDoc(live && night.act <= 5 ? `nights/${night.nightId}/public/achievements` : null)
  // Act 3 only: has bulletin 2 played yet? (14 Nov 2026, the deep scan; lib/hostSteps.js newsWaiting)
  const tv = useDoc(live && night.act === 3 ? `nights/${night.nightId}/public/screen` : null)
  // Acts 2 and 4 run on the clock (the cat queue and the supper chime; Act 4's
  // warning, lock-in and fifteen-minute rounds). The server ticks once a minute on
  // its own; this tab, while it is the one showing, nudges it every twenty
  // seconds, so a chime comes up to twenty seconds late, not a minute.
  useEffect(() => {
    if (!live || ![2, 4, 6, 7].includes(night.act)) return // Act 6 too: the drawing starts once its two games are done (A5). Act 7: a vote that ran out closes within twenty seconds, not a minute
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
    setMsg(PRESSED_WORDS[command] ?? null)
    try {
      const r = await callHost({ nightId: night.nightId, command, arg })
      setMsg(describe(command, r.data ?? {}))
    } catch (e) {
      // a dropped connection and a function that broke get the same words, since the answer to
      // both is to press again (lib/trouble.js; no codes on the Host tab either, 29 Oct 2026)
      setMsg(`That didn’t work: ${troubleLine(e, 'press it again.')}`)
    } finally {
      setBusy(null)
    }
  }

  const roster = night.roster ?? {}
  const people = Object.entries(roster).map(([key, r]) => ({ key, ...r })).sort((a, b) => a.name.localeCompare(b.name))
  const hostKeys = new Set(Object.values(night.hosts ?? {}).map(h => h.key))
  const now = Date.now()
  const clock = serverNow ? serverNow() : now
  const house = houseView({ night, study: study.data, rotation: rotation.data, presence, sound: screenSound, now: clock })
  const left = countdownLeft(night, clock) // the countdown to the intro (lib/start.js)
  const fillLine = fillInLine(night, presence, clock) // null on every night with no fill-in player
  const startDrawing = () => {
    // The drawing belongs to Act 6, where Next starts it. By hand in any other act it takes over every
    // phone and drops that act's Parlour Games for good, so it asks first (12 Nov 2026, the review).
    if (night.act !== 6 && !askFirst(`The drawing belongs in Act 6, and this is ${night.act ? `Act ${night.act}` : 'before Act 1'}. Start it now? Every phone becomes the drawing.`)) return
    // a drawing under way (or done, with the trace behind the door) is kept; the host is asked before it is wiped
    // ('lockout' is an older server's name for the guess: lib/relayhost.js)
    const underWay = ['walk', 'turn', 'vote', 'lockout', 'done'].includes(relay.data?.state)
    if (underWay && !askFirst('A drawing is already on the paper. Restart it from the beginning?')) return
    run('relay-start', underWay ? 'force' : undefined)
  }
  // The buttons below can each undo part of a live night in one tap. Each asks first (12 Nov 2026,
  // the review before the party: nothing on this tab may end or rewind the night by a stray thumb).
  // askFirst is the browser's confirm, and never a dead button where a browser swallows the dialog (lib/ask.js).
  const sure = (question, then) => { if (askFirst(question)) then() }
  const goToAct = (n) => sure(
    n === night.act ? `Start Act ${n} again from its first beat? Every phone and screen follows.` : `Move the whole night to Act ${n}? Every phone and screen follows.`,
    () => run('act', n))
  const blackout = () => {
    // Blackout ends Act 1 and deals the roles, once, to whoever has joined. Before Ready for the dark it asks.
    if (night.beat !== 'ready' && !askFirst('The night is not at Ready for the dark yet. Black out now? The roles go to whoever has joined, once.')) return
    run('blackout')
  }

  return (
    <div className="host">
      <p className="host-status">
        {night.act ? `Act ${night.act} · ${ACTS[night.act]?.plain}` : 'Before Act 1'} · {PHASE_WORDS[night.phase] ?? night.phase}
        <br />Doors {night.joinOpen ? 'open' : 'closed'} · {people.length} joined
        <br />{isRehearsalNight(night) ? 'This is a practice night' : 'This is the party night'}
      </p>
      {/* a practice night is ended from here, right under the line that says it is one. Never drawn on the party night. */}
      <EndPractice night={night} disabled={!!busy} />
      {/* the party day with a practice night on (the box forgotten, or yesterday's night still up): said in red, with where to put it right */}
      {isRehearsalNight(night) && onPartyDay(clock) && <p className="host-msg trouble" role="alert">Today is the party, and this is a practice night. For the party: at the bottom of this tab, tick This is the real night, then press Start the night.</p>}
      {left != null && <p className="host-msg" role="status">The intro goes at {clockWords(night.introAt)}, in {countdownText(left)}, by itself. To hold it for late guests, press Back one once it starts.</p>}
      {night.act === 1 && <p className="gloss">{OWN_SLIDES ? 'The rules film shows your own 28 slides.' : 'The rules film shows drawn slides: your own 28 are not in yet.'}</p>}
      {night.act <= 1 && <SendScreens presence={presence} sound={screenSound} now={clock} open={night.act === 1 && night.beat === 'arrive'} />}
      {msg && <p className="host-msg" role="status">{msg}</p>}
      {night.caseWarning && <p className="host-msg trouble" role="alert">{String(night.caseWarning).split(',').map(k => CASE_WARNINGS[k] ?? k).join(' ')}</p>}
      {/* a cat's hint or the Study's trace that never came (card 529): counts only, never which */}
      {house.missing && <p className="host-msg trouble" role="alert">{house.missing}</p>}

      <RunPanel night={night} busy={busy} run={run} serverNow={serverNow} finale={finale.data} act4={act4.data} act4Loaded={act4.loaded && !act4.error && !(act4.data == null && act4.fromCache)} relay={relay.data} tv={tv.loaded && !tv.error && !tv.fromCache ? tv.data : undefined} onBlackout={blackout} brainQuiet={isBrainQuiet(presence)} />
      <GoodNight night={night} finale={finale.data} serverNow={serverNow} />
      <RevealPanel night={night} finale={finale.data} busy={busy} run={run} serverNow={serverNow} />

      {/* ------------------------------------------------------------------------------------------------
          Below the card, five bands (14 Nov 2026, Jon: "I need the host side to have clear instructions
          that I fail safes vs what I need to manually do"): what only the host can do, the house and the
          guests at a glance, what the house does by itself (each button there is a fail-safe), what is only
          for putting a night right, and what is for before the guests come. Every button is where its band
          says; none was taken away.
          ------------------------------------------------------------------------------------------------ */}
      <Band title="Yours, when it happens">Only you can know when these happen. Everything else that is yours to press is at the top of this tab.</Band>
      <section className="pause-panel">
        <h3>Pause</h3>
        <p className="gloss">Stops the night’s clocks: the games, the rounds, the drawing, the films. The music keeps playing. Your phone then shows one button, Resume.</p>
        <div className="host-row">
          {night.phase === 'paused'
            ? <button className="chip wide" disabled={!!busy} onClick={() => run('resume')}>Resume</button>
            : <button className="chip wide" disabled={!!busy} onClick={() => run('pause')}>Pause, Irwin needs the garden</button>}
        </div>
      </section>
      <SalemPanel night={night} busy={busy} run={run} />
      <FetchPanel night={night} busy={busy} run={run} />
      <AchievementsPanel night={night} content={content} awards={awards.data} busy={busy} run={run} />

      <Band title="The house and the guests">Who and what has been heard from. Mostly to look at.</Band>
      <HousePanel house={house} night={night} busy={busy} run={run} brainSound={screenSound.cues} />

      <h3>Who is here</h3>
      {people.length === 0 && <p className="gloss">Nobody has typed their name yet.</p>}
      {house.answered && <p className="gloss">{house.answered.n} of {house.answered.of} have {night.window?.kind === 'ballot' ? 'locked in' : 'answered'}. Who is online shows again when the window closes.</p>}
      {/* a practice night's fill-in players (11 Nov 2026): seats with no phone. Never on the real night. */}
      {fillLine && <p className="gloss fill-ins">{fillLine}</p>}
      <ul className="here">
        {people.map(r => {
          const online = house.showGuests && now - (presence[r.key] ?? 0) < 2 * 60 * 1000
          const character = characterById(content, r.characterId)
          // a fill-in has no phone: no dot to watch, and nothing to hand on
          const fill = r.fillIn === true
          return (
            <li key={r.key}>
              {house.showGuests && !fill
                ? <span className={online ? 'dot on' : 'dot'} aria-label={online ? 'phone is here' : 'phone not seen lately'} />
                : <span className="dot hidden" aria-hidden="true" />}
              <span className="who-name">{r.name}{hostKeys.has(r.key) ? ' · host' : ''}{fill ? ' · fill-in' : ''}</span>
              <span className="who-char">{(character?.name ?? r.characterId)} · bag {r.bag}</span>
              {!fill && <button className="chip handover" disabled={!!busy} onClick={() => sure(`Wipe ${r.name}’s phone? Their crossed-off motives and notes go, and they must tap their name again.`, () => run('handover', r.key))} title="Wipe this phone so someone else can use it">Hand this phone on</button>}
            </li>
          )
        })}
      </ul>
      {people.length > 0 && <p className="gloss">Hand this phone on: only when a guest must move to another phone. It wipes theirs, and they tap their name on the new one.</p>}
      {qr && (
        <figure className="host-qr">
          <img src={qr} alt="Square code that opens the game" />
          <figcaption>A guest who needs to get in: let them scan this, then tap their name.</figcaption>
        </figure>
      )}

      <Band title="Fail-safes">The house does all of this by itself. Press one only if something did not happen.</Band>
      <LockLight cues={cues.data} busy={busy} run={run} />
      <ScenesPanel busy={busy} run={run} />
      <IpadPanel night={night} cues={cues.data} relay={relay.data} busy={busy} run={run} />

      <h3>The groups (Act 4)</h3>
      <p className="gloss">The pairs and trios, and their walk round the four rooms, are made when you press Start Act 4. Press this only if you need the groups before then; made groups are kept. It stays grey until after the blackout.</p>
      <div className="host-row">
        {/* never before the roles are out (14 Nov 2026, the deep scan): the press deals the case it needs from whoever
            has joined, and keeps it. !(act >= 2), never act < 2: undefined < 2 is false */}
        <button className="chip wide" disabled={!!busy || !(night.act >= 2)} onClick={() => run('groups')}>Make the groups</button>
      </div>

      <h3>The drawing (Act 6)</h3>
      <p className="gloss">By itself: the drawing starts when Act 6’s second game is done, on every phone and the Parlour TV. Press Start the drawing only if it has not started; a drawing already on the paper is kept unless you say restart. Show the trace on the TV: after the door opens, only if the bedroom screen has died.</p>
      <div className="host-row">
        <button className="chip wide" disabled={!!busy} onClick={startDrawing}>Start the drawing</button>
        <button className="chip wide" disabled={!!busy} onClick={() => run('tv-trace', cues.data?.tvTrace ? 'off' : undefined)} title="If the bedroom screen has died, the TV shows the trace after the door opens">{cues.data?.tvTrace ? 'Take the trace off the TV' : 'Show the trace on the TV'}</button>
      </div>
      {/* unreachable while the drawing runs (App.jsx makes Relay.jsx the whole phone then, and Relay.jsx carries the live copy); kept for the day the drawing surface changes */}
      <HostRelayPanel relay={relay.data} nightId={night.nightId} />

      <Band title="If something goes wrong">Only to put a night right. Never on a night that is going well.</Band>
      <h3>Move the night by hand</h3>
      <p className="gloss">The night moves on with the big button at the top and the house’s own clocks. An act number moves the whole night there, and asks first.</p>
      <div className="host-row">
        {Object.entries(ACTS).map(([n, a]) => (
          <button key={n} className={Number(n) === night.act ? 'chip on' : 'chip'} disabled={!!busy}
            onClick={() => goToAct(Number(n))} title={a.name}>
            {n}
          </button>
        ))}
      </div>
      <p className="gloss">Blackout here is the same press as the big button at Ready for the dark. Power returns is not needed: the power comes back by itself five seconds after the dark, and within a minute or so if that ever fails. Your phone is dark then too.</p>
      <div className="host-row">
        <button className="chip wide" disabled={!!busy || night.act !== 1 || night.phase === 'blackout'} onClick={blackout} title="Ends Act 1. The power comes back on its own five seconds later">Blackout</button>
        <button className="chip wide" disabled={!!busy || night.phase !== 'blackout'} onClick={() => run('power')}>Power returns · Act 2</button>
      </div>

      <Safeguards night={night} busy={busy} run={run} />

      <h3>Clear the drawing</h3>
      <p className="gloss">Never during the party: it shuts the door and takes the trace away. Only a whole new drawing brings them back. It asks first.</p>
      <div className="host-row">
        <button className="chip wide" disabled={!!busy} onClick={() => sure('Clear the drawing? The door shuts and the trace goes. Only a whole new drawing brings it back.', () => run('relay-reset'))}>Clear the drawing</button>
      </div>

      <h3>The doors</h3>
      <p className="gloss">By itself: the doors stay open all night, so a guest can get back in by the code. Close them only to stop new people joining. The phones get the rules and bios by themselves; Resend is only for after you change words in the workshop.</p>
      <div className="host-row">
        <button className="chip wide" disabled={!!busy} onClick={() => run(night.joinOpen ? 'join-close' : 'join-open')}>
          {night.joinOpen ? 'Close the doors' : 'Open the doors'}
        </button>
        <button className="chip wide" disabled={!!busy} onClick={() => run('publish')}>Resend rules &amp; bios</button>
      </div>

      <Band title="Before the guests come">Setting up and trying things. Not for the party itself.</Band>
      <section className="sound-test">
        <h3>Sound test</h3>
        <p className="gloss">Each sound once, on every room screen and every phone. Never during the party: The scream screams on every phone. Silence is the same as Pause on the music.</p>
        <SoundList busy={busy} run={run} ask={!isRehearsalNight(night)} brainSound={screenSound.cues} brainAlive={!!house.machines.find(m => m.key === 'cues')?.alive} />
      </section>
      {isRehearsalNight(night) && night.phase !== 'blackout' && (
        <section className="blackout-test">
          <h3>Blackout test</h3>
          <p className="gloss">Practice nights only. The same dark and the same scream, then everything comes back. Nothing in the night moves. Press it in Act 1, with the brain running.</p>
          <div className="host-row">
            <BlackoutTest night={night} busy={busy} run={run} />
          </div>
        </section>
      )}
      <h3>The Study’s station key</h3>
      {/* the brain holds the same word, read once when it starts: a new word here stopped the Study and bulletin 2 (14 Nov 2026, the deep scan) */}
      <p className="gloss">Leave this alone: the word is saved, and the Study’s Mac and the brain both hold it. A new word here stops the Study’s station and silences bulletin 2.</p>
      <StationKey busy={busy} run={run} />

      <h3>A fresh night</h3>
      <p className="gloss">Never once the party has begun: it starts a new night in place of this one, with new characters for everyone, and every phone types its name again. It asks first.</p>
      <StartNight ui={{ 'START NIGHT': 'Start a new night' }} again />
    </div>
  )
}

// A band of the Host tab (14 Nov 2026): a plain heading and one line that says whose the buttons under it are.
export function Band({ title, children }) {
  return (
    <header className="host-band">
      <h2>{title}</h2>
      <p>{children}</p>
    </header>
  )
}

// The bedroom lock light by hand. Until 14 Nov 2026 this row read "Hall light" (Jon: "The hall green/red? I
// think you mean the orangerie"). It is the Hue bulb outside the bedroom door: "the bedroom lock light" in his
// cue list, `hall` in the code and in the server's command, which keeps its name. It is not in the Orangerie:
// the Orangerie's red and green are the string lights of Get Off My Lawn!, which no button here touches.
export function LockLight({ cues, busy, run }) {
  const hall = cues?.hall ?? null
  return (
    <section className="lock-light">
      <h3>The bedroom lock light</h3>
      <p className="gloss">The bulb outside the bedroom door: green means the bedroom is open, red means it is locked. By itself it is green for the welcome, off in the blackout, red when the power returns, and green when the third picture is named. Press a colour only if the bulb shows the wrong one.</p>
      <div className="host-row">
        <span className="gloss">Now: {hall ?? 'not set'}</span>
        <button className="chip" disabled={!!busy || hall === 'red'} onClick={() => run('hall', 'red')}>Red</button>
        <button className="chip" disabled={!!busy || hall === 'green'} onClick={() => run('hall', 'green')}>Green</button>
      </div>
    </section>
  )
}

// The house at a glance: the study station, the room screens (the memory
// match iPad among them) and the cue relay (alive when heard from within two
// minutes), Act 2's cat visits as a count, the group due in the study and
// its clock, and a picker for the group that actually walked in. Everything
// here is a count, a name or a dot. (The light by hand and the Sound test
// were here until 14 Nov 2026: they are under Fail-safes and Before the
// guests come now.)
// While a window is open the per-guest dots are hidden (see houseView).
export function HousePanel({ house, night, busy, run, brainSound = null }) {
  const [picking, setPicking] = useState(false)
  const s = house.station
  const st = house.study
  const act4 = night.act === 4
  const stopNote = stopWarning(brainSound, !!house.machines.find(m => m.key === 'cues')?.alive)
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
            {m.sound === true && <span className="who-char sound-on">Sound on</span>}
            {m.sound === false && <span className="who-char sound-off">No sound yet. Click once on that screen.</span>}
          </li>
        ))}
      </ul>
      {night.caseWarning && <p className="gloss">{String(night.caseWarning).split(',').map(k => CASE_WARNINGS[k] ?? k).join(' ')}</p>}
      {/* the brain says it cannot stop the music (its stop Shortcut is missing): said here, in the house's own
          status, as well as beside Silence in the Sound test (which moved to Before the guests come, 14 Nov 2026) */}
      {stopNote && <p className="gloss sound-off" role="status">{stopNote}</p>}
      {/* Act 2: a count of who has finished the cats, so the host knows when to press Next. Never which cat or hint. */}
      {house.catVisits && <p className="gloss cat-visits">Cat visits: {house.catVisits.done} of {house.catVisits.of} guests have seen all four.</p>}
      {act4 && (
        <div className="house-study">
          {st ? (
            <p className="gloss">
              In the study: <strong>{st.names}</strong>{st.paid ? ' (paid)' : st.clockLeft ? ` · ${st.clockLeft} left` : st.running ? '' : ' · waiting for the first touch'}
              {!s.alive && st.state === 'absent' ? ' · no station: the round’s chime pays the group anyway' : ''}
            </p>
          ) : <p className="gloss">Nobody is due in the study.</p>}
          {/* the old "The slots run on this phone's clock" was no longer true (14 Nov 2026, the deep scan): the round's chime pays the group whether the station is heard or not */}
          {!s.alive && <p className="gloss">Station quiet{s.quietFor ? ` since ${s.quietFor} ago` : ''}. The round’s chime still pays the Study’s group.</p>}
          <p className="gloss">By itself: each round’s chime pays the Study’s group. Finish this group now pays it early. This group is in the study is for when a different group walked in.</p>
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
    </section>
  )
}

// Running the night: one button. The beats come from seed/night.json; the
// server does whatever the next beat needs (deal, light up, group, reveal)
// and says only how many phones it reached. Nothing here can show content.
// The house (handoff 23 Oct §2c, §9.11; the six scenes of Jon's cue list,
// 25 Oct 2026, the same six as cues/scenes.json): the Hue scenes as buttons,
// in case the brain misses one, and the brain's music by hand. Never a tell:
// the buttons say which scene, never why.
// The scene Murderwin Blackout is the chip Lights off (12 Nov 2026): one button on this tab is called
// Blackout, the one that ends Act 1. This chip only turns the lights off.
const SCENE_BUTTONS = [['Murderwin Default', 'Default'], ['Murderwin Dimmed', 'Dimmed'], ['Murderwin Blackout', 'Lights off'], ['Murderwin Drawing', 'Drawing'], ['Murderwin Candles', 'Candles'], ['Murderwin Study Dim', 'Study Dim']]
function ScenesPanel({ busy, run }) {
  return (
    <section className="scenes">
      <h3>The lights</h3>
      <p className="gloss">By itself: the brain sets the lights for every moment of the night. Press one only if the lights are wrong. Lights off is only the lights: it is not the Blackout.</p>
      <div className="host-row">
        {SCENE_BUTTONS.map(([name, label]) => <button key={name} className="chip" disabled={!!busy} onClick={() => run('scene', name)}>{label}</button>)}
      </div>
      <h3>The music</h3>
      <p className="gloss">By itself: the brain starts and stops the music for every moment. Pause if music plays when it should be quiet. Play if it is quiet when it should play. Next playlist is not needed on the night.</p>
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
  // (on a practice night with fill-in players the count is of the real players: the rounds wait for them only)
  if (act4.phase === 'groups') { const c = lockedInCount(act4, night); return `${c.locked} of ${c.of} locked in. The rounds start when everyone is, or in ${left(act4.lockEndsAt)}.` }
  if (act4.phase === 'rounds') return `Round ${act4.round} of ${act4.rounds}: the chime comes by itself in ${left(act4.roundEndsAt)}.`
  return 'The rounds are over. Everyone is back in the Parlour. Next goes on to Act 5.'
}

export function RunPanel({ night, busy, run, serverNow, finale = null, act4 = null, act4Loaded = true, relay = null, tv = undefined, onBlackout = null, brainQuiet = false }) {
  useTick(1000)
  const beats = beatsOf(night.act)
  const idx = beats.findIndex(b => b.key === night.beat)
  const here = idx >= 0 ? beats[idx] : null
  const after = idx >= 0 && idx + 1 < beats.length ? beats[idx + 1] : null
  const nextAct = night.act >= 1 && night.act < 7 && !after ? ACTS[night.act + 1] : null
  // the beat Next goes to: the next of this act, else the first of the next act. When that beat opens the
  // vote, the button says so (11 Nov 2026: Talk it over ends Act 6, and the host starts the vote)
  const upNext = after ?? (nextAct ? beatsOf(night.act + 1)[0] ?? null : null)
  const startsVote = upNext?.action === 'window:ballot'
  const w = night.window
  const open = w && !w.settled
  const left = open && serverNow ? secondsLeft(w, serverNow) : 0
  const clock = serverNow ? serverNow() : Date.now()
  // Act 4 with four groups or fewer has no fifth round: from the last one Next goes on to Act 5, and the
  // button says so (the server does the same, functions/lib/run.js skipEmptyRound; 12 Nov 2026, the review)
  const roundNumber = key => Number(/^round(\d+)$/.exec(String(key ?? ''))?.[1] ?? 0)
  const pastRounds = night.act === 4 && Number(act4?.rounds) > 0 && roundNumber(after?.key) > Number(act4.rounds)
  const nextLabel = night.phase === 'blackout' ? 'Dark: the power comes back on its own'
    : night.act === 0 ? 'Begin Act 1'
    : startsVote ? 'Start the vote'
    : pastRounds ? `Next: Act 5, ${ACTS[5].plain}`
    : after ? `Next: ${after.name}`
    : night.act === 1 ? 'Then: Blackout'
    : nextAct ? `Next: Act ${night.act + 1}, ${nextAct.plain}`
    : 'The night is over'
  const atEnd = (night.act === 1 || night.act === 7) && !after
  const naming = night.act === 7 && here?.action === 'reveal' && finale?.stage !== 'victim' // the screen names all three before Next
  // Act 2 waiting on no beat of its own: the power came back only part way (a write failed after the night left
  // the dark; 14 Nov 2026, the deep scan). Next from here skips Act 2, so it is off, and the card says what to press
  const halfPower = night.act === 2 && night.phase === 'prompt' && !here
  const canNext = !busy && night.phase !== 'blackout' && !atEnd && !(open && left > 0) && !naming && !halfPower
  // Ready for the dark, the last beat of Act 1: the big button is the Blackout itself, so the one thing to
  // press is always the big button at the top (12 Nov 2026). The same press as Blackout under The acts.
  const blackoutNow = night.act === 1 && !!here && !after && night.phase !== 'blackout' && !!onBlackout
  // The dinner wrap-up, the last beat of Act 3: the big button is Start Act 4 (Next did the same thing there,
  // so the card showed two big buttons for one press)
  const startsAct4 = night.act === 3 && night.beat === 'wrap'
  // bulletin 2 armed but not yet played: Next and Start Act 4 ask first (14 Nov 2026, the deep scan)
  const newsLate = newsWaiting({ act: night.act, beat: night.beat, screen: tv })
  const pressStartAct4 = () => {
    if (newsLate && !askFirst(NEWS_ASK[night.beat])) return
    run('start-act4')
  }
  // Three presses that undo something for the whole house ask first (12 Nov 2026, the review):
  // Next in the middle of an Act 4 round (every group's room is cut short), Next for The End while the
  // credits still roll on the Parlour TV, and Back one during the reveal (the screen forgets it).
  const roundLeftMs = night.act === 4 && act4?.phase === 'rounds' ? Number(act4.roundEndsAt?.toMillis?.() ?? act4.roundEndsAt) - clock : 0
  const credits = night.act === 7 && here?.action === 'results' ? creditsLeft(finale, clock) : null
  // the Victim's film (as video, about 43 seconds): Next for the results over it brings every phone's result, the
  // result sting, the jazz and the lights in over Mic's last words (14 Nov 2026, the deep scan)
  const victimFilmLeft = night.act === 7 && here?.action === 'reveal' && finale?.stage === 'victim' && finale.video?.victim ? finaleMs(finale.cardAt?.victim) - clock : 0
  const next = () => {
    // the intro and the rules film run sixteen minutes with Phone chime just above this button: one slip here
    // cut the film off for the whole room, with no way back but the whole film again (14 Nov 2026, the review)
    if (rulesStillPlaying(night, clock) && !askFirst('The rules film is still playing. Stop it and go on?')) return
    if (roundLeftMs > 60_000 && !askFirst(pastRounds ? 'End the last round and go on to Act 5 now?' : 'End this round for every group now?')) return
    // Act 4 with no word from the house on where it stands: the rounds may still be running, so Next asks
    if (night.act === 4 && !act4 && !askFirst(goOnAsk(4))) return
    if (credits > 0 && !askFirst('The credits are still rolling. Go to The End now?')) return
    if (victimFilmLeft > 0 && !askFirst('The Victim’s film is still playing. Show everyone their result now?')) return
    if (newsLate && !askFirst(NEWS_ASK[night.beat])) return
    run('next', { from: `${night.act ?? 0}/${night.beat ?? ''}` })
  }
  const back = () => {
    // the intro and the rules film run sixteen minutes: Back one during them stops them for the whole room, and
    // Back one from the beat after them plays them again from the top (14 Nov 2026, the deep scan)
    if (rulesStillPlaying(night, clock) && !askFirst('The rules film is still playing. Stop it and go back to Arrivals?')) return
    if (night.act === 1 && night.beat === 'meet' && !askFirst('Go back to The house rules? The intro and the rules film play again from the top.')) return
    if (night.act === 7 && here?.action === 'reveal' && !askFirst('Go back one beat? The screen forgets the reveal and starts it again.')) return
    // Your result and The End: one slip here put every guest's phone back on Eyes on the screen with the reveal's
    // music and lights under the credits, or took The End and Good night off every screen (14 Nov 2026, the deep scan)
    if (night.act === 7 && here?.action === 'results' && !askFirst('Go back to The reveal? Every guest’s phone leaves its result.')) return
    if (night.act === 7 && here?.action === 'end' && !askFirst('Go back to Your result? Every screen and phone leaves The End.')) return
    run('back')
  }
  // Supper's ready ends the cat visits for everyone, with no way back: before every guest has seen all four cats
  // it asks first (14 Nov 2026, the deep scan)
  const visits = catVisits(night)
  const callSupper = () => {
    const left = visits ? visits.of - visits.done : 0
    if (left > 0 && !askFirst(`Call supper now? ${left === 1 ? 'One guest has' : `${left} guests have`} not seen all four cats. Those cats leave a note on the phone instead.`)) return
    run('supper')
  }
  // Where the night moves on by itself there is no big button: the card says Nothing to press, and Next is a
  // fail-safe under it, Go on now, which asks first (lib/hostSteps.js movesByItself, 14 Nov 2026). At the cat
  // visits the hand way is Supper's ready, just above, so no second button does the same thing.
  // (Act 4's record still loading, or only guessed from this phone's own memory: undefined, and nothing invites a
  // press; truly not there: null, and Next is back. A clock long past its time, or a drawing started by hand,
  // brings the big button back too: the host is never left with only the small chip.)
  const itself = movesByItself({
    act: night.act, beat: night.beat, phase: night.phase, now: clock,
    counting: countdownLeft(night, clock) != null, introAt: night.introAt, beatAt: night.beatAt,
    act4: act4Loaded ? act4 : undefined, relay,
  })
  const goOnShown = itself && !(night.act === 2 && night.beat === 'cat')
  // While the drawing runs the server refuses Next, so the card does not offer it (Sir Irwin's slides too: the
  // host phones keep this tab through them). At The End the last press is Good night, just under the card: a
  // dead big button saying "The night is over" above it helped nobody.
  const drawing = drawingRuns({ act: night.act, beat: night.beat, relay })
  const ended = night.act === 7 && here?.action === 'end'
  const goOn = () => { if (askFirst(goOnAsk(night.act))) run('next', { from: `${night.act ?? 0}/${night.beat ?? ''}` }) }
  // The beat's two lines (lib/hostSteps.js, 14 Nov 2026): what the house does by itself, and what is the
  // host's to say or press. A beat the file does not know shows its own words from seed/night.json.
  // (An act reached by its number before the roles are out sits in the role cards' phase and starts on Next: its
  // lines would say the night moves by itself, which it does not there. The beat's own words show instead. The
  // one beat that is meant to be in that phase is Orientation, straight after the blackout.)
  const jumped = night.phase === 'prompt' && !(night.act === 2 && night.beat === 'orient')
  const step = jumped ? null : hostStep(night.act, night.beat)
  const words = text => piecesOf(text).map((p, i) => (p.press ? <strong key={i}>{p.text}</strong> : p.text))
  return (
    <section className="run">
      <h3>Run the night</h3>
      {here ? (
        <>
          <p className="run-here"><strong>{here.name}</strong></p>
          {step ? (
            <div className="run-steps">
              <p className="run-step run-auto"><span className="run-label">By itself</span>{words(step.auto)}</p>
              <p className="run-step run-yours"><span className="run-label">You</span>{words(step.you)}</p>
            </div>
          ) : <p className="gloss run-what">{here.what}</p>}
        </>
      ) : halfPower ? <p className="host-msg trouble" role="alert">The power came back only part way. Under Move the night by hand, press 1, then Blackout just below it, and say yes to both.</p>
        : <p className="gloss">Nothing has started. Begin when the room is in.</p>}
      {naming && <p className="host-msg" role="status">The screen is revealing. Name all three below, then press Next.</p>}
      {night.act === 4 && act4 && <p className="host-msg" role="status">{act4Line(act4, night, serverNow ? serverNow() : Date.now())}</p>}
      {/* the chime the rules film asks for, right here, so nobody scrolls for it in a dimmed room (the same press as Phone chime in the Sound test list) */}
      {night.act === 1 && night.beat === 'rules' && (
        <div className="host-row">
          <button className="chip wide" disabled={!!busy} onClick={() => run('sound-test', 'chime-phone')} title="The chime the rules film asks for">Phone chime</button>
        </div>
      )}
      {/* only while the cats are being visited: on the three beats before, one slip here skipped every cat (12 Nov 2026, the review) */}
      {night.act === 2 && night.beat === 'cat' && (
        <div className="host-row">
          <button className="chip wide" disabled={!!busy} onClick={callSupper} title="Supper comes on its own once everyone has seen all four cats">Supper's ready</button>
        </div>
      )}
      {newsLate && <p className="host-msg" role="status">The news has not played yet.</p>}
      {/* only at the dinner wrap-up, after bulletin 2 is armed: earlier, one slip here skipped the bulletin (12 Nov 2026, the review) */}
      {startsAct4 && (
        <div className="host-row">
          <button className="big wide" disabled={!!busy || (open && left > 0)} onClick={pressStartAct4}>Start Act 4</button>
        </div>
      )}
      {night.act === 5 && (
        // Cake! (cue 13, 25 Oct 2026): when the cake is served. The brain plays the song and dims the lights; the TV shows the card.
        <div className="host-row">
          {/* big only at the Cake beat, where it is the press; small while Sir Irwin speaks and after, so it is not beside Next as a second big button */}
          <button className={night.beat === 'roam' ? 'big wide' : 'chip wide'} disabled={!!busy} onClick={() => { if (night.beat !== 'irwin' || askFirst('Sir Irwin’s speech is on the TV. Play the birthday song over it now?')) run('cake') }} title="Happy Birthday for Dogs on every HomePod, the candles, the birthday card on the TV. The jazz comes back when the song ends">Cake!</button>
        </div>
      )}
      {open && (
        <p className="host-msg" role="status">
          {/* the vote says how many are in: a count, never who. It closes by itself when the last one is */}
          {w.title}: {w.kind === 'ballot' && w.of ? `${w.answered ?? 0} of ${w.of} locked in. ` : ''}{left > 0 ? `${left} seconds left.` : 'time is up.'}
          {left === 0 && <> <button className="chip" disabled={!!busy} onClick={() => run('settle')}>Pick for the rest</button></>}
        </p>
      )}
      {!open && w?.kind === 'ballot' && here?.action === 'window:ballot' && <p className="host-msg" role="status">The votes are in.</p>}
      {/* the brain quiet while the room screens are not: the Blackout would darken only the screens and the phones
          (it happened unnoticed on 14 Nov 2026; the deep scan). Never blocks the button */}
      {blackoutNow && brainQuiet && <p className="host-msg trouble" role="alert">The brain is not running, so the house lights would stay on and the music would play through the dark. Double-click Start the brain, in Murderwin screens on its Desktop, then press Blackout once this line has gone.</p>}
      {/* one big button at a time: Blackout at Ready for the dark; at the dinner wrap-up Start Act 4, just above, is it (Next did the same there) */}
      {!startsAct4 && (
        <div className="host-row">
          {blackoutNow
            ? <button className="big wide" disabled={!!busy} onClick={onBlackout} title="Ends Act 1. The power comes back on its own five seconds later">Blackout</button>
            : itself
              ? <p className="host-msg run-itself" role="status">Nothing to press. This moves on by itself.</p>
              : drawing
                ? <p className="host-msg run-itself" role="status">Nothing to press here. The drawing is running.</p>
                : ended
                  ? null
                  : <button className="big wide" disabled={!canNext} onClick={next}>{nextLabel}</button>}
        </div>
      )}
      {/* under the big button: fail-safes, said so (14 Nov 2026) */}
      <p className="gloss run-spares">Fail-safes, not needed on a night that is going well:</p>
      <div className="host-row">
        {goOnShown && <button className="chip" disabled={!canNext} onClick={goOn}>{nextLabel.replace(/^Next: /, 'Go on now: ')}</button>}
        <button className="chip" disabled={!!busy || !here || idx === 0 && night.act <= 2} onClick={back}>Back one</button>
        {/* only in the cat visits and the Act 4 rounds; Act 6 plays its own two by itself (A5; the server refuses elsewhere) */}
        {parlourBeat(night.act, night.beat) && night.act !== 6 && <button className="chip" disabled={!!busy || open} onClick={() => run('light-up')}>Parlour Game now</button>}
      </div>
      {beats.length > 0 && (
        <details className="run-beats">
          <summary className="gloss">All of Act {night.act}'s beats</summary>
          <ol className="beat-list">
            {beats.map((b, i) => (
              <li key={b.key} className={i === idx ? 'on' : i < idx ? 'done' : ''}>
                <button className="beat" disabled={!!busy} onClick={() => { if (askFirst(`Move the whole night to ${b.name}? Every phone and screen follows.`)) run('beat', b.key) }}>{b.name}</button>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}

// The drawing on the host's own phone (Jon's cue list, cue 17, 25 Oct 2026).
// While a drawer walks to the paper: At the paper, which ends the walk the
// moment they are there, so the square shows at once (the walk's twenty
// seconds are a limit, not a wait). While the room guesses: the four options,
// A to D, the room's names or the figures of a stand-in round; a crossed one
// is dimmed and the rest stay live, so the room guesses again at once (no
// wait after a wrong pick, 11 Nov 2026); a tap is the room's guess, through
// the same callable as the
// Parlour TV, whose own options stay as the fallback (the trackpad). The
// rules (which state shows which control, the reply words) are pure helpers
// in lib/relayhost.js. Every phone leaves its tabs for the drawing's screen
// while the drawing runs, so the live copy is the one Relay.jsx renders on
// the host's own drawing screen (`inline`); the copy under The Big Solve on
// the Host tab cannot be reached while the drawing runs and stays only for
// the day the drawing surface changes. Nothing here can show a right answer:
// the server crosses off a wrong one like any other tap.
const REPLY_MS = 5000
export function HostRelayPanel({ relay, nightId, inline = false }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { text }: a fresh object per reply, so two alike each get their moment
  // A reply is a passing word: it goes on its own after a few seconds, whatever the drawing does
  // meanwhile. It is not cleared on a state change, because a right guess moves the state in the
  // same server call that answers the tap, and whether the snapshot or the reply lands first is
  // anyone's guess. This is not game time: the TV and the chime carry the result anyway.
  useEffect(() => {
    if (!msg) return undefined
    const t = setTimeout(() => setMsg(null), REPLY_MS)
    return () => clearTimeout(t)
  }, [msg])
  const control = hostRelayControl(relay)
  if (!control) return null
  const live = nightId && nightId !== 'preview'
  const call = async (fn, said) => {
    if (!live || busy) return
    setBusy(true)
    try { const r = await fn(); const text = said(r.data ?? {}); if (text) setMsg({ text }) }
    catch (e) { setMsg({ text: `That didn’t work: ${troubleLine(e, 'press it again.')}` }) }
    finally { setBusy(false) }
  }
  const atPaper = () => call(() => callHost({ nightId, command: 'at-the-paper' }), paperReply)
  // The drawing takes the whole phone, the Host tab's Pause with it, and it runs twenty minutes. So the
  // host's drawing screen carries the Pause too, at each walk to the paper and at each guess, where this
  // panel shows (12 Nov 2026, the review; not during a fifteen-second turn or Sir Irwin's slides, when the
  // host phones still have their tabs). The pause card and its Resume come up on both host phones as
  // ever, and the drawing's clocks stand still (functions/lib/relay.js).
  const pause = () => call(() => callHost({ nightId, command: 'pause' }), () => null)
  // on the host's drawing screen (`inline`) the big line above already says "Not that one. Guess again."
  // after a wrong pick, so the reply under the names is not said twice
  const pick = (i) => call(() => callRelayGuess({ nightId, pick: i }), r => (inline && !r.right ? null : guessReply(r)))
  // no wait after a wrong pick (11 Nov 2026): the names left standing stay live. Only an older
  // server's ten-second wait dims them (lib/relayhost.js guessWaiting)
  const locked = guessWaiting(relay)
  const crossed = relay.crossed ?? []
  return (
    <section className={inline ? 'host-relay inline' : 'host-relay'}>
      {!inline && <p className="gloss">{control === 'paper' ? 'Someone is walking to the paper. Press At the paper the moment they are there.' : 'The room is guessing. Agree, then tap its guess here.'}</p>}
      {control === 'paper' && (
        <div className="host-row">
          <button className="big wide" disabled={busy} onClick={atPaper} title="The walk ends now and the square shows at once">At the paper</button>
        </div>
      )}
      {control === 'guess' && (
        <div className="options host-options">
          {(relay.options ?? []).map((o, i) => {
            const out = crossed.includes(i)
            return (
              <button key={i} className={`option${out ? ' out' : ''}`} disabled={busy || locked || out} onClick={() => pick(i)} aria-label={`${'ABCD'[i]}${o.name ? `, ${o.name}` : ''}`}>
                <span className="letter">{'ABCD'[i]}</span>
                {o.name ? <span className={out ? 'option-name crossed' : 'option-name'}>{o.name}</span> : <Figure size={o.size} cells={o.cells} crossed={out} />}
              </button>
            )
          })}
        </div>
      )}
      {msg && <p className="host-msg" role="status">{msg.text}</p>}
      {inline && (
        <div className="host-row relay-pause">
          <button className="chip" disabled={busy} onClick={pause}>Pause, Irwin needs the garden</button>
        </div>
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
  // the reveal's own beat names the three; on Your result the credits run by themselves; at The End there is
  // nothing left to name or hold, so the panel goes (it used to keep saying "Press Next for everyone's result")
  const action = beatSpec(7, night.beat)?.action
  if (action === 'end') return null
  const now = serverNow ? serverNow() : Date.now()
  const stage = finale.stage ?? 'stats'
  const next = NEXT_NAME[stage] ?? null
  const ready = namesReady(finale, now)
  const wait = secondsUntilNames(finale, now)
  const held = !!finale.holdAt
  // as video (11 Nov 2026) a name is a film of up to 45 seconds: say so, so the next press waits for the card. Hold the
  // screen waits too: nothing holds a film, and a hold before its card took the card off the TV until Carry on (14 Nov 2026)
  const cardMs = stage !== 'stats' && finale.video?.[stage] ? finaleMs(finale.cardAt?.[stage]) : 0
  const playing = !held && cardMs > 0 && now < cardMs
  const line = held ? 'The screen is held where it is.'
    : playing ? `The bulletin is playing on the TV. About ${Math.ceil((cardMs - now) / 1000)} seconds.`
    : !ready ? `The screen is counting. ${wait} seconds until the first name.`
    : next ? 'The screen is ready for the next name.'
    : action === 'reveal' ? 'All three are named. Press Next for everyone’s result.'
    : 'All three are named. The credits run on their own.'
  return (
    <section className="run reveal-panel">
      <h3>The reveal</h3>
      <p className="gloss">{line}</p>
      {next && (
        <div className="host-row">
          {/* not while a name's film plays: a second press cut it before Mic said the name (14 Nov 2026, the deep scan).
              On the server's clock, so a TV that never played the film never leaves a dead button */}
          <button className="big wide" disabled={!!busy || !ready || held || playing} onClick={() => run('reveal-stage')}>{NAME_BUTTONS[next]}</button>
        </div>
      )}
      <div className="host-row">
        {held
          ? <button className="chip wide" disabled={!!busy} onClick={() => run('finale-go')}>Carry on</button>
          : <button className="chip wide" disabled={!!busy || playing} onClick={() => run('finale-hold')}>Hold the screen</button>}
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
const STATION_KEY_ASK ='Save a new key word? Until the Study’s Mac and the brain hold the same word, the Study’s station stops and bulletin 2 is silent.'
function StationKey({ busy, run }) {
  const [key, setKey] = useState('')
  return (
    <form className="host-row" onSubmit={e => { e.preventDefault(); if (key.trim() && askFirst(STATION_KEY_ASK)) run('station-key', key.trim()) }}>
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
      <h3>Spill the Beans and the Hush</h3>
      <p className="gloss">Spill the Beans asks the Manor to change the story, if it still can. It works through Act 5 and never says whether it did. Right after it, say to everyone: the Manor may have shuffled the case, so open You and read your card again, quietly. The Hush is for when someone has been found out: say which role out loud was given away, and their answers stop counting. Nobody is told.</p>
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
// Fill-in players (11 Nov 2026, the polish pass): on a practice night the card
// can seat 0 to 8 players with no phone, who play along on their own. The row
// starts at nought every time, is never shown with the real-night box ticked
// (or from the party day on), and the number is never sent then
// (lib/start.js fillInArg); the server seats nobody on a real night anyway.
export function StartNight({ ui, again = false }) {
  const [real, setReal] = useState(false)
  const [fillIns, setFillIns] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const start = async () => {
    // On the party day a practice start asks first: with the box forgotten the party would run on the
    // practice case, bags and pictures, and look the same (12 Nov 2026, the review).
    if (!real && onPartyDay() && !askFirst(PRACTICE_ASK)) return
    // On a host phone with a night on (A fresh night, at the foot of the Host tab): one stray tap must
    // never end the party. The workshop's button asks the same question.
    if (again && !askFirst(REPLACE_ASK)) return
    setBusy(true)
    setError(null)
    try {
      await callHost({ command: 'create', arg: { real, introAt: introAtFor({ real }), ...fillInArg({ real, fillIns }) } })
      if (again) setBusy(false) // the Host tab stays up until this phone taps its name on the new night
    } catch (e) {
      setError(troubleLine(e, 'The Manor did not answer.'))
      setBusy(false)
    }
  }
  const at = introAtFor({ real })
  const offered = fillInsOffered({ real })
  const warn = !real && onPartyDay() // the party day with the box unticked: the note is a warning
  return (
    <div className="start-night">
      <p className="start-who">{ui['START NIGHT']}</p>
      <button className="big start-go" disabled={busy} onClick={start}>{busy ? 'Starting…' : 'Start the night'}</button>
      <label className="start-real">
        <input type="checkbox" checked={real} disabled={busy} onChange={e => setReal(e.target.checked)} />
        <span>This is the real night</span>
      </label>
      {offered && (
        <div className="start-fill" role="group" aria-label="Fill-in players">
          <span className="start-fill-name">Fill-in players</span>
          <button type="button" className="chip" disabled={busy || fillIns <= 0} onClick={() => setFillIns(n => Math.max(0, n - 1))} aria-label="One fewer fill-in player">−</button>
          <b className="start-fill-count" aria-live="polite">{fillIns}</b>
          <button type="button" className="chip" disabled={busy || fillIns >= MAX_FILL_INS} onClick={() => setFillIns(n => Math.min(MAX_FILL_INS, n + 1))} aria-label="One more fill-in player">+</button>
        </div>
      )}
      <p className={warn ? 'start-note trouble' : 'start-note'} role={warn ? 'alert' : undefined}>
        {real
          ? at ? `The real night. The intro plays at ${clockWords(at)}. Start it before the first guest comes.` : 'The real night. Press Next to play the intro.'
          : warn ? PRACTICE_NOTE
          : `A practice night. The intro plays in five minutes.${offered && fillIns > 0 ? ` ${fillInWords(fillIns)}` : ''}`}
      </p>
      {error && <p className="trouble" role="alert">{error}</p>}
    </div>
  )
}

// After the start: each room screen's page, to send to its machine (AirDrop
// from the share sheet), with a dot once that screen has been heard from.
// Setup words, on the host's phone only.
export function SendScreens({ presence = {}, sound = {}, now = Date.now(), open = false }) {
  const [note, setNote] = useState(null)
  const send = async (s) => {
    setNote(null)
    try {
      if (navigator.share) await navigator.share({ title: s.room, url: s.url })
      else { await navigator.clipboard.writeText(s.url); setNote(`Copied the address for ${s.room}.`) }
    } catch (e) {
      if (e?.name !== 'AbortError') setNote('That did not send. Tap it again.')
    }
  }
  const links = screenLinks(PLAY_URL)
  const second = secondDisplayLink(PLAY_URL)
  const seconds = secondDisplayLinks(PLAY_URL).filter(s => s.key !== second.key) // the two Macs' own screens: the screen saver, each from its own start
  const up = links.filter(s => now - (presence[s.presenceKey] ?? 0) < QUIET_MS).length
  return (
    <details className="send-screens" open={open || undefined}>
      <summary>Send each screen its page · {up} of {links.length} up</summary>
      <p className="gloss">Tap Send, pick AirDrop, pick the machine. Its page opens there. Click once on it: that makes it full screen and turns its sound on.</p>
      <ul className="send-list">
        {links.map(s => {
          const on = now - (presence[s.presenceKey] ?? 0) < QUIET_MS
          return (
            <li key={s.key}>
              <span className={on ? 'dot on' : 'dot'} aria-label={on ? 'this screen is up' : 'not heard from yet'} />
              <span className="send-name">{s.room}<small>{s.machine}</small>{on && !QUIET_SCREENS.has(s.presenceKey) && (sound[s.presenceKey] === true
                ? <small className="sound-on">Sound on</small>
                : <small className="sound-off">No sound yet. Click once on that screen.</small>)}</span>
              <button className="chip" onClick={() => send(s)}>Send</button>
            </li>
          )
        })}
        {seconds.map(s => (
          <li key={s.key}>
            <span className="dot hidden" aria-hidden="true" />
            <span className="send-name">{s.room}<small>{s.machine}</small></span>
            <button className="chip" onClick={() => send(s)}>Send</button>
          </li>
        ))}
        <li key={second.key}>
          <span className="dot hidden" aria-hidden="true" />
          <span className="send-name">{second.room}<small>{second.machine}</small></span>
          <button className="chip" onClick={() => send(second)}>Send</button>
        </li>
      </ul>
      {note && <p className="host-msg" role="status">{note}</p>}
    </details>
  )
}

// End this practice night (14 Nov 2026, Jon: "I need a way to end the night when testing"). One button, on a
// practice night only: at the top of the Host tab, and on the pause card of the two host phones (a pause is
// the one thing a host can always reach, the drawing's screen included, so Pause then this always works).
// It asks first. Then the music first (the Host tab goes with the night, and nothing else could stop it), a
// moment for the brain to hear that, and the night itself through the host command discard-night, which is the
// Manor's own way of throwing a rehearsal night away (functions/lib/discard.js): the night, its throwaway
// case and every phone's seat are deleted and no night is live, so every phone is back at the doors with
// Start the night. Never the party night: nothing is drawn there, the press checks again, and the Manor
// refuses to throw a real night's case away.
export function EndPractice({ night, disabled = false }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  if (!isRehearsalNight(night)) return null
  const end = async () => {
    if (!isRehearsalNight(night)) return // never the party night, whatever drew the button
    if (!askFirst(END_PRACTICE_ASK)) return
    setBusy(true)
    setMsg('Ending the practice night. The music stops first.')
    try {
      await callHost({ nightId: night.nightId, command: 'music', arg: 'pause' }).catch(() => {})
      await new Promise(r => setTimeout(r, END_PRACTICE_WAIT_MS))
      await callHost({ nightId: night.nightId, command: 'discard-night' })
    } catch (e) {
      setMsg(`That didn’t work: ${troubleLine(e, 'press it again.')}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="host-row end-practice">
      <button className="chip" disabled={busy || disabled} onClick={end}>End this practice night</button>
      {msg && <p className="host-msg" role="status">{msg}</p>}
    </div>
  )
}

// The one button a pause leaves on the two host phones (App.jsx, 1 Nov 2026):
// the pause takes the tabs off every phone, the Host tab's own Resume with them.
// (Since 14 Nov 2026 a practice night's pause card carries End this practice night under it; never the party night's.)
export function ResumeNight({ nightId, night = null }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const resume = async () => {
    if (nightId === 'preview') return
    setBusy(true)
    setError(null)
    try {
      await callHost({ nightId, command: 'resume' })
    } catch (e) {
      setError(`That didn’t work: ${troubleLine(e, 'press it again.')}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="resume-night">
      <button className="big" disabled={busy} onClick={resume}>Resume</button>
      {error && <p className="trouble" role="alert">{error}</p>}
      {night && <EndPractice night={night} disabled={busy} />}
    </div>
  )
}
