// The study test: Jon tries the walls from the workshop's Study test page on
// his phone, standing at the walls, with no terminal. The page's buttons
// queue commands in public_state/study_test (the studyTest function writes
// it); this follows that queue, runs a flash, a teaching of the taps
// (lib/teach.js) or a practice round, and tells the page what the walls and
// the station are doing through studyTest's 'status', which the function
// saves as public_state/study_test_status.
//
// A practice round is a runner of its own (lib/runner.js) that is never given
// a night, so it never sends state, finishes a group, deals a clue or moves
// the rotation; its server is a stub besides. While a teach or a practice
// runs, taps and keys go to the test, and the live runner's writes to the
// walls and the deck are held back (shield), so a re-arm from the server
// cannot dim a lit hexagon. With no test running the live runner is exactly
// as before. Neither starts while a group is due at the study or playing
// there (Act 4); a round nobody was due for (someone touched the wall with no
// group due) is put back to rest first.
//
// The status carries words and counts. It never carries a round's code or a
// pattern, except the colour and count the Lines would show when the Lines
// wall is down (practice.shown), so a practice round can still be finished.
// A group's own game is theirs: while one is due or playing, its taps never
// reach the status (no last tap, no call to the server).

import { createRunner, ELEMENTS_REST, LINES_REST } from './runner.js'
import { createTeacher } from './teach.js'
import { ms } from './follow.js'
import { CHECK_HEXES, HEX_CENTRES, isHexMap } from './hexmap.js'

export const KEY_NAMES = ['red', 'yellow', 'green', 'blue', 'pink', 'white', '1', '2', '3', '4', '5', '6', 'undo', 'submit']
export const HEARTBEAT_MS = 20_000   // station.mjs sends the status this often even when nothing changed
const THROTTLE_MS = 400              // at most one status call this often
const FAILING_MS = 5000              // and this often while the calls are failing (no network, no function)
const STALE_MS = 2 * 60_000          // a command older than this is skipped (the station was off when it was pressed)
const FLASH_MS = 3000                // how long the page says "flashing"
const PRACTICE_REST_MS = 5000        // the walls rest after a practice round, then the test is over
const PRACTICE_IDLE_MS = 10 * 60_000 // a practice round nobody has touched ends on its own, so it never sits in a group's way
const SWIPE_SAY_MS = 3000            // "that was a swipe" is said at most this often

const GROUP_PLAYING = 'A group is playing the study game. Wait until they finish, then try again.'
const GROUP_DUE = 'A group is due at the study. Wait until Act 4 is over, then try again.'
const KEY_WORD = 'Save the study key word (Host tab, The study, or the workshop Study test page). It must be the same as STATION_KEY in station/.env.'
const defaultSleep = (ms) => new Promise(r => setTimeout(r, ms))

// A device whose writes go through only while open() says so. Everything
// that is not a function (its panels, its name) reads through as it is.
function hold(device, open) {
  return new Proxy(device, {
    get(target, prop) {
      const v = Reflect.get(target, prop)
      if (typeof v !== 'function') return v
      return (...args) => (open() ? v.apply(target, args) : Promise.resolve())
    },
  })
}

export function createTestMode({
  elements, lines, deck, elementsOk = true, linesOk = true, panelIds, layout, deckKind = 'keyboard',
  live, send, watch, saveTouchMap = () => {}, saveHexMap = () => {}, makeRunner = createRunner,
  log = () => {}, sleep = defaultSleep, now = Date.now, setTimer = setTimeout,
} = {}) {
  let mode = 'idle'               // idle | flash | teach | practice | match
  let match = null                // Check the map (A8): { kind: check | remap, step, of, hex, picks, done, ok }
  let message = 'The study station is ready.'
  let teacher = null
  let practice = null             // { runner, alive, done, lastInputAt }
  let practiceView = null         // the practice part of the status; kept after a round for Jon to read
  let lastTap = null
  let seenSeq = null              // null until the queue's first snapshot
  let groupAtStart = null         // the live group due when the test began
  let started = false
  let swipeSaidAt = -Infinity

  const testing = () => mode === 'teach' || mode === 'practice' || mode === 'match'
  const liveBusy = () => (live()?.machine.state ?? 'idle') !== 'idle'
  const liveGroup = () => live()?.groupId ?? null
  // the live wall is mid-round for a group (the machine was made for one)
  const groupPlaying = () => liveBusy() && (live()?.machine.snapshot.groupId ?? null) != null
  // a group's game, under way or about to be: its taps are theirs
  const groupsGame = () => liveGroup() != null || groupPlaying()
  const serverNow = () => live()?.serverNow?.() ?? now()

  // ---- the status, and sending it ---------------------------------------------
  function status() {
    return {
      mode, message,
      walls: {
        elements: { ok: elementsOk, panels: elements.panels.length, lights: elements.pieces?.length || elements.panels.length, taught: elements.taughtPanels ?? elements.panels.length },
        lines: { ok: linesOk, bars: lines.panels.length },
      },
      deck: deckKind,
      teach: teacher ? { step: Math.max(1, teacher.step), of: teacher.of } : null,
      practice: practiceView,
      match: match ? { kind: match.kind, step: match.step, of: match.of, hex: match.hex, done: !!match.done, ok: !!match.ok } : null,
      lastTap,
      seenSeq: seenSeq ?? 0,
      stationAt: now(),
    }
  }

  let dirty = true, timer = null, inFlight = false, lastSentAt = -Infinity
  let denied = false, failing = false
  function changed() { dirty = true; if (started && !denied) schedule() }
  function schedule() {
    if (timer != null || inFlight) return
    timer = setTimer(flush, Math.max(0, lastSentAt + (failing ? FAILING_MS : THROTTLE_MS) - now()))
  }
  function flush() {
    timer = null
    if (!dirty || inFlight) return
    dirty = false; inFlight = true; lastSentAt = now()
    Promise.resolve()
      .then(() => send(status()))
      .then(() => {
        if (denied || failing) log('study test: the status reaches the workshop again')
        denied = false; failing = false
      }, (e) => {
        dirty = true
        // a wrong key word is retried on the heartbeat only; anything else on the next change too, gently
        if (/permission-denied/.test(String(e?.code ?? e?.message ?? e))) {
          if (!denied) log(`study test: the server did not take the station's key word. ${KEY_WORD}`)
          denied = true
        } else {
          if (!failing) log('study test: status not sent:', e?.message ?? e)
          failing = true
        }
      })
      .finally(() => { inFlight = false; if (dirty && !denied && !failing) schedule() })
  }
  function say(text) { message = text; changed() }

  // ---- the walls at rest --------------------------------------------------------
  function rest() {
    const still = (wall, ok, rgb) => ok
      ? Promise.resolve(wall.frame(Object.fromEntries(wall.panels.map(p => [p.id, rgb])), 10)).catch(e => log(`${wall.name}: ${e?.message ?? e}`))
      : null
    return Promise.all([
      still(elements, elementsOk, ELEMENTS_REST),
      still(lines, linesOk, LINES_REST),
      Promise.resolve(deck.paint(false)).catch(() => {}),
    ])
  }

  function begin(kind) {
    mode = kind
    practiceView = null
    match = null
    groupAtStart = liveGroup()
  }

  // Ends a teach or a practice round. Says nothing; the caller does. A
  // practice runner may be part way through an effect (the Stream Deck's
  // shiver paints the keys on its own, past the hold), so the walls and the
  // keys rest once it is done, unless a new test has begun meanwhile.
  function end() {
    if (teacher) { teacher.stop(); teacher = null }
    const r = practice?.runner
    if (practice) { practice.alive = false; practice = null }
    if (match && !match.done) match = null
    mode = 'idle'
    // the walls rest, then go back to the live runner's waiting look (A8: lit while the room waits)
    Promise.resolve(r?.settled()).then(() => { if (!testing()) return rest().then(() => { if (!testing()) live()?.glow?.() }) })
  }

  // Teach and practice need the study free. Says why not and returns true
  // when it is not; a round nobody was due for is put back to rest.
  function studyNotFree() {
    if (groupPlaying()) { say(GROUP_PLAYING); return true }
    if (liveGroup() != null) { say(GROUP_DUE); return true }
    if (liveBusy()) {
      live().reset()
      log('study test: a round nobody was due for was put back to rest')
    }
    return false
  }

  // A touch the wall did not count as a tap (a swipe): said now and then,
  // so Jon at the wall knows the wall felt him.
  function swiped() {
    if (now() - swipeSaidAt < SWIPE_SAY_MS) return
    swipeSaidAt = now()
    say('The wall felt a swipe, not a tap. Tap the hexagon once, lightly.')
  }

  // ---- flash --------------------------------------------------------------------
  async function flash() {
    if (testing()) return say('Stop the test first, then flash the walls.')
    if (mode === 'flash') return
    if (groupPlaying()) return say(GROUP_PLAYING)
    begin('flash')
    say('Flashing both walls. Watch for it.')
    const [white, bars] = (await Promise.allSettled([elements.identify(), lines.identify()])).map(r => r.status === 'fulfilled')
    log(`study test: flash; elements ${white ? 'flashed' : 'did not answer'}, lines ${bars ? 'flashed' : 'did not answer'}`)
    if (mode !== 'flash') return   // a teach or a practice took over meanwhile
    let words = white && bars ? 'Both walls flashed.'
      : white ? 'The white hexagons flashed. The colour bars did not answer.'
        : bars ? 'The colour bars flashed. The white hexagons did not answer.'
          : 'Neither wall answered. Check both are switched on and on the same wifi as the study Mac.'
    if ((white && !elementsOk) || (bars && !linesOk)) words += ' A wall that was down when the station started needs the station restarted (npm start).'
    say(words)
    await sleep(FLASH_MS)
    if (mode === 'flash') { mode = 'idle'; changed() }
  }

  // ---- teach the taps -----------------------------------------------------------------
  function teach() {
    if (mode === 'teach') return say(`Already teaching. Hexagon ${Math.max(1, teacher.step)} of ${teacher.of} is lit. Tap it.`)
    if (mode === 'practice') return say('Stop the practice round first, then teach the taps.')
    if (!elementsOk || !elements.panels.length) return say('The white hexagons were not answering when the station started, so there is nothing to teach. Check the wall, then restart the station (npm start).')
    if (studyNotFree()) return
    begin('teach')
    const t = createTeacher({
      wall: elements, sleep, log,
      onStep: ({ step, of }) => { if (teacher === t) say(`Hexagon ${step} of ${of} is lit. Tap it.`) },
      onSlip: ({ step, of, taughtAs }) => {
        if (teacher !== t) return
        say(`That tap is already taught as hexagon ${taughtAs}. If you tapped a wrong one earlier, tap Stop, then Teach the taps again. Hexagon ${step} of ${of} is lit. Tap it.`)
      },
    })
    teacher = t
    say(`Teaching ${t.of} hexagons. Each one lights up in turn.`)
    log(`study test: teaching ${t.of} hexagons`)
    t.run().then((touches) => {
      if (teacher !== t || !touches) return   // stopped part way: nothing is kept
      elements.setTouchMap(touches)
      let saved = true
      try { saveTouchMap(touches) } catch (e) { saved = false; log('study test: touch-map.json not saved:', e?.message ?? e) }
      teacher = null
      end()
      log(`study test: taught ${t.of} hexagons${saved ? ', saved touch-map.json' : ''}`)
      say(saved ? `Taught all ${t.of} hexagons.` : `Taught all ${t.of} hexagons, but the station could not save them, so they last only until it restarts.`)
    }, (e) => {
      if (teacher !== t) return
      teacher = null
      end()
      log('study test: teaching stopped:', e?.message ?? e)
      say('The white hexagons stopped answering, so the teaching stopped. Check the wall and try again.')
    })
  }

  // ---- a practice round -----------------------------------------------------------
  function startPractice() {
    if (mode === 'practice') return say('A practice round is already going. Press Stop to end it.')
    if (mode === 'teach') return say('Stop the teaching first, then play a practice round.')
    if (!elementsOk) return say('The white hexagons were not answering when the station started, so there is nothing to practice on. Check the wall, then restart the station (npm start).')
    if (studyNotFree()) return
    begin('practice')
    const p = { runner: null, alive: true, done: false, lastInputAt: now() }
    const open = () => p.alive
    // no night is ever given to it, so it never calls the server; the stub makes sure
    const noServer = async () => { log('study test: a practice round never calls the server'); return { data: { ok: false } } }
    p.runner = makeRunner({
      elements: hold(elements, open), lines: hold(lines, open), deck: hold(deck, open),
      elementsOk, linesOk, panelIds, layout,
      callStation: noServer, stationKey: '',
      // its finish line names no group; practiceOver says how the round went
      log: (...a) => { if (!String(a[0]).startsWith('group ')) log('study test, practice:', ...a) },
      sleep: (ms) => (p.alive ? sleep(ms) : Promise.resolve()),
      restMs: PRACTICE_REST_MS, now,
      onScreen: (shown) => onPractice(p, shown),
    })
    practice = p
    say('Touch any hexagon to begin.')
    log('study test: practice round')
    p.runner.drain()   // the walls rest and the keys go dark, then the round waits for a touch
  }

  function onPractice(p, shown) {
    if (practice !== p) return
    if (shown.state === 'done') p.done = true
    else if (p.done && shown.state === 'idle') return practiceOver(p)   // the rest after the round is over
    practiceView = viewOf(p, shown)
    say(wordsFor(p, shown))
  }

  function practiceOver(p) {
    p.alive = false
    practice = null
    mode = 'idle'
    const v = practiceView
    log(`study test: practice round over (${v?.outcome ?? 'stopped'}, ${v?.pairs ?? 0} pairs)`)
    say(v?.outcome === 'solved' ? `The practice round is over: all ${v.rounds} pairs were right.`
      : v?.outcome === 'capped' ? `The practice round is over: the time ran out after ${v.pairs} of ${v.rounds} pairs.`
        : 'The practice round is over.')
  }

  function viewOf(p, shown) {
    const rounds = p.runner.machine.settings.rounds
    return {
      state: shown.state,
      round: shown.round + 1, rounds: rounds.length,
      pattern: shown.pattern + 1, patterns: rounds[shown.round]?.lengths.length ?? 3,
      pairs: shown.pairsLocked,
      entry: { colour: shown.entry?.colour ?? null, number: shown.entry?.number == null ? null : String(shown.entry.number) },
      misses: shown.misses,
      outcome: shown.outcome,
      // only with the Lines down, so the round can still be finished
      shown: !linesOk && shown.state === 'entering' && shown.lines ? { colour: shown.lines.colour, number: shown.lines.number } : null,
    }
  }

  function wordsFor(p, shown) {
    const round = `Round ${shown.round + 1} of ${p.runner.machine.settings.rounds.length}.`
    switch (shown.state) {
      case 'idle': return 'Touch any hexagon to begin.'
      case 'playing': return `${round} ${shown.misses ? 'Not that one. Watch it again.' : 'Watch the wall.'}`
      case 'reproducing': return `${round} Your turn: touch it back.`
      case 'entering': {
        const g = p.runner.granolia
        if (g?.hint === 'half' || g?.hint === 'words') {
          const half = g.colourRight ? 'the colour was right, the number was not' : g.numberRight ? 'the number was right, the colour was not' : 'neither half was right'
          return `${round} Not quite: ${half}. Enter the colour and the number.`
        }
        return `${round} Enter the colour and the number.`
      }
      case 'done': return shown.outcome === 'solved' ? 'Solved: every pair was right. The walls rest for a moment.' : 'The time ran out. The walls rest for a moment.'
      default: return message
    }
  }

  function pressPractice(name) {
    practice.lastInputAt = now()
    // the machine only shivers the keys at half an entry; the page is told why
    const m = practice.runner.machine
    if (name === 'submit' && m.state === 'entering' && (m.snapshot.entry.colour == null || m.snapshot.entry.number == null)) say('Pick a colour and a number, then Submit.')
    practice.runner.key(name)
  }

  // ---- Check the map (A8, 12 Nov 2026) ------------------------------------------------
  // Granolia's hint draws the wall with the rules card's ten hexagons. The
  // wall lights one panel and the page draws the hexagon the station thinks
  // it is, for the first, a middle and the last: Jon taps Yes or No. A No
  // walks every panel in turn and Jon taps, on the drawing, the hexagon that
  // is lit on the wall; the new map is saved beside the taught taps and the
  // check runs again.
  function lightOne(panelId) {
    const dark = (wall, ok, frame) => ok ? Promise.resolve(wall.frame(frame, 1)).catch(e => log(`${wall.name}: ${e?.message ?? e}`)) : null
    return Promise.all([
      dark(elements, elementsOk, Object.fromEntries(elements.panels.map(p => [p.id, p.id === panelId ? [255, 255, 255] : [0, 0, 0]]))),
      dark(lines, linesOk, Object.fromEntries(lines.panels.map(p => [p.id, [0, 0, 0]]))),
    ])
  }
  function checkStep() {
    const hexes = live()?.hexes
    const hex = CHECK_HEXES[match.step - 1]
    const panel = elements.panels[hexes.indexOf(hex)]
    match.hex = hex
    lightOne(panel?.id)
    say(`Check ${match.step} of 3. Is the hexagon lit on the wall the one lit in the drawing?`)
  }
  function remapStep() {
    match.hex = null
    lightOne(elements.panels[match.step - 1]?.id)
    say(`Hexagon ${match.step} of ${match.of} is lit on the wall. Tap the same one in the drawing.`)
  }
  function startCheck() {
    match = { kind: 'check', step: 1, of: CHECK_HEXES.length, hex: null, picks: [], done: false, ok: false }
    if (!isHexMap(live()?.hexes ?? null, elements.panels.length) || elements.panels.length !== HEX_CENTRES.length) return startRemap()
    checkStep()
  }
  function startRemap() {
    match = { kind: 'remap', step: 1, of: elements.panels.length, hex: null, picks: [], done: false, ok: false }
    remapStep()
  }
  function checkMap() {
    if (mode === 'match') return say('Already checking. Tap Yes or No, or Stop.')
    if (testing()) return say('Stop the test first, then check the map.')
    if (!elementsOk || elements.panels.length !== HEX_CENTRES.length) return say(`The white hexagons need all ${HEX_CENTRES.length} panels answering to check the map. Check the wall, then restart the station.`)
    if (studyNotFree()) return
    begin('match')
    log('study test: check the map')
    startCheck()
  }
  function answer(yes) {
    if (mode !== 'match' || !match) return say('Tap Check the map first.')
    if (match.kind === 'remap') return say('Tap the lit hexagon in the drawing.')
    if (!yes) { log(`study test: the map is wrong at check ${match.step}`); return startRemap() }
    if (match.step < match.of) { match.step += 1; return checkStep() }
    match = { ...match, done: true, ok: true, hex: null }
    log('study test: the map matches the wall')
    end()
    say('All three match. Granolia\'s map is the right way round.')
  }
  function pickHex(name) {
    if (mode !== 'match' || match?.kind !== 'remap') return say('Tap Check the map first.')
    const k = Number(name)
    if (!Number.isInteger(k) || k < 0 || k >= HEX_CENTRES.length) return say('That is not one of the hexagons.')
    match.picks[match.step - 1] = k
    if (match.step < match.of) { match.step += 1; return remapStep() }
    if (!isHexMap(match.picks, elements.panels.length)) {
      match = null
      end()
      return say('Two lights went to the same hexagon, so nothing was kept. Tap Check the map to try again.')
    }
    const hexes = match.picks.slice()
    live()?.setHexes?.(hexes)
    let saved = true
    try { saveHexMap(hexes) } catch (e) { saved = false; log('study test: hex-map.json not saved:', e?.message ?? e) }
    log(`study test: the map was set by hand${saved ? ', saved hex-map.json' : ''}`)
    startCheck()
    say(`${saved ? 'Saved.' : 'Set until the station restarts (it could not save).'} Check 1 of 3. Is the hexagon lit on the wall the one lit in the drawing?`)
  }

  // ---- stop -------------------------------------------------------------------------
  function stop() {
    if (!testing()) return say(mode === 'flash' ? 'The flash is over in a moment.' : 'Nothing is running.')
    log(`study test: ${mode} stopped`)
    practiceView = null
    end()
    say('Stopped. The walls are resting.')
  }

  // ---- a key from the page's answer pad: only ever a practice round's ---------------
  function pageKey(name) {
    if (!KEY_NAMES.includes(name)) return say('The station does not know that key.')
    if (mode !== 'practice') return say('No practice round is going. Press Play a practice round first.')
    pressPractice(name)
  }

  function handle(entry) {
    if (entry.command !== 'key') log(`study test: ${entry.command}`)
    switch (entry.command) {
      case 'flash': flash(); return
      case 'teach': return teach()
      case 'practice': return startPractice()
      case 'stop': return stop()
      case 'key': return pageKey(entry.name)
      case 'match': return checkMap()
      case 'yes': return answer(true)
      case 'no': return answer(false)
      case 'hex': return pickHex(entry.name)
      default: return say('The station does not know that command.')
    }
  }

  // ---- the queue ----------------------------------------------------------------------
  function onQueue(data) {
    const seq = Number(data?.seq) || 0
    // the first snapshot: whatever is there was pressed before the station started
    if (seenSeq == null) { seenSeq = seq; changed(); return }
    // the queue was made again from nothing: read it from the start (the age check still skips old commands)
    if (seq < seenSeq) seenSeq = 0
    const fresh = (Array.isArray(data?.queue) ? data.queue : [])
      .filter(e => Number.isInteger(e?.seq) && e.seq > seenSeq)
      .sort((a, b) => a.seq - b.seq)
    let skipped = 0
    for (const e of fresh) {
      seenSeq = e.seq
      if (serverNow() - ms(e.at) > STALE_MS) { skipped++; continue }
      handle(e)
    }
    if (skipped) log(`study test: skipped ${skipped} command${skipped === 1 ? '' : 's'} older than two minutes`)
    if (fresh.length) changed()
  }

  function noteTap(id) {
    const i = panelIds.indexOf(id)
    lastTap = { panel: i >= 0 ? i + 1 : null, known: i >= 0, at: now() }
    changed()
  }

  return {
    get mode() { return mode },
    get status() { return status() },

    // Follows the queue and starts sending the status (after sign-in).
    start() {
      if (started) return
      started = true
      watch('public_state/study_test', onQueue)
      changed()
    },

    // The live runner's devices, held back while a teach or a practice runs.
    shield(device) { return hold(device, () => !testing()) },

    // A touch on the Elements (gestures 0 and 1 are taps, the rest swipes).
    // `tapId` is the id the wall itself sent, which teaching learns.
    touch(panelId, gesture = 0, tapId = panelId) {
      const tap = gesture === 0 || gesture === 1
      if (mode === 'teach') {
        if (!tap) swiped()
        else if (teacher) noteTap(teacher.tap(tapId ?? panelId) ?? panelId)
        return   // touches while teaching go to the teacher only
      }
      if (mode === 'match') { if (tap) noteTap(panelId); return } // checking the map: the wall is only lit, never played
      // a group's own game is theirs: its taps never reach the status
      if (mode === 'practice' || !groupsGame()) { if (tap) noteTap(panelId); else swiped() }
      if (mode === 'practice') { practice.lastInputAt = now(); practice.runner.touch(panelId, gesture) }
      else live().touch(panelId, gesture)
    },

    // A button-box key (the Stream Deck, or the keyboard standing in).
    key(name) {
      if (mode === 'practice') return pressPractice(name)
      if (mode === 'teach' || mode === 'match') return
      live().key(name)
    },

    // Once a second: the practice round's clock, and the test steps aside
    // for a real group.
    tick() {
      if (practice) practice.runner.tick()
      if (!testing()) return
      if (liveGroup() !== groupAtStart) {
        log('study test: a group is due at the study; the test stopped')
        practiceView = null
        end()
        return say('A group is due at the study, so the test stopped.')
      }
      if (practice && !practice.done && practice.runner.machine.state === 'idle' && now() - practice.lastInputAt >= PRACTICE_IDLE_MS) {
        log('study test: practice round untouched for ten minutes; stopped')
        practiceView = null
        end()
        say('The practice round stopped: nobody touched the wall for ten minutes.')
      }
    },

    // Every HEARTBEAT_MS: the page knows the station is alive, and a refused key word is tried again.
    heartbeat() {
      if (!started) return
      dirty = true
      schedule()
    },
  }
}
