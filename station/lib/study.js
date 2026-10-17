// The study light game (Act 4): the state machine. docs/study-light-game.md
// is the design; this file is the rules. Pure: it takes events and a clock and
// returns effects for the devices. No I/O, no timers, no Firestore. The runner
// (station.mjs) feeds it touches, key presses and ticks, and carries out the
// effects on the real walls, the button box and the server.
//
// Everything in here is safe content. The patterns and the code are made up
// on the spot and mean nothing; the clue they unlock never passes through.

export const COLOURS = ['red', 'yellow', 'green', 'blue', 'pink', 'white']
export const NUMBERS = [1, 2, 3, 4, 5, 6]

export const DEFAULT_SETTINGS = {
  capMs: 15 * 60_000,          // fifteen minutes from the first touch, hard
  warnMs: 12 * 60_000,         // Granolia mentions the time
  rounds: [
    { lengths: [3, 4, 5], onMs: 800, gapMs: 300 },
    { lengths: [4, 5, 6], onMs: 600, gapMs: 250 },
    { lengths: [5, 6, 7], onMs: 450, gapMs: 200 },
  ],
  replayHintMisses: 2,         // second miss on one pattern: half speed
  mapHintMisses: 4,            // fourth miss: the numbered map on screen
  restMs: 900,                 // pause between a clear and the next pattern
}

// The Stream Deck face, five columns of three (Canon, 25 Sep 2026).
export const DECK = [
  ['red', 'blue', '1', '4', 'blank'],
  ['yellow', 'pink', '2', '5', 'undo'],
  ['green', 'white', '3', '6', 'submit'],
]
// key index on the deck = row * 5 + column
export function deckKeys() {
  const keys = []
  DECK.forEach((row, r) => row.forEach((name, c) => keys.push({ index: r * 5 + c, name })))
  return keys
}

// Settings may arrive from the server (nights/{id}/public/study.settings,
// written by a host or the workshop). Only known keys with sane values are
// taken; anything else falls back to DEFAULT_SETTINGS. A round is three
// lengths of 2 to 9 touches with an on and a gap time in milliseconds.
export function settingsFrom(input) {
  const out = {}
  if (!input || typeof input !== 'object') return out
  const num = (k, lo, hi) => { const v = Number(input[k]); if (Number.isFinite(v) && v >= lo && v <= hi) out[k] = v }
  num('capMs', 60_000, 60 * 60_000)
  num('warnMs', 30_000, 60 * 60_000)
  num('replayHintMisses', 1, 20)
  num('mapHintMisses', 1, 20)
  num('restMs', 0, 10_000)
  if (out.warnMs != null && out.capMs != null && out.warnMs >= out.capMs) delete out.warnMs
  if (Array.isArray(input.rounds) && input.rounds.length === 3) {
    const rounds = input.rounds.map(r => {
      const lengths = Array.isArray(r?.lengths) ? r.lengths.map(Number) : null
      if (!lengths || lengths.length !== 3 || !lengths.every(n => Number.isInteger(n) && n >= 2 && n <= 9)) return null
      const onMs = Number(r.onMs), gapMs = Number(r.gapMs)
      if (!(onMs >= 100 && onMs <= 3000) || !(gapMs >= 50 && gapMs <= 2000)) return null
      return { lengths, onMs, gapMs }
    })
    if (rounds.every(Boolean)) out.rounds = rounds
  }
  return out
}

function pickInt(rand, n) { return Math.floor(rand() * n) }

// A pattern: `len` panels in a row, the same panel never twice running.
export function makePattern(rand, panelIds, len) {
  const out = []
  while (out.length < len) {
    const p = panelIds[pickInt(rand, panelIds.length)]
    if (out.length && p === out[out.length - 1]) continue
    out.push(p)
  }
  return out
}

export function makeCode(rand) {
  return [0, 1, 2].map(() => ({ colour: COLOURS[pickInt(rand, 6)], number: NUMBERS[pickInt(rand, 6)] }))
}

// What the study screen shows (the public state). Counts and words only.
function screen(m) {
  return {
    state: m.state, round: m.round, pattern: m.pattern, pairsLocked: m.pairs.length,
    misses: m.missesThisPattern, hint: m.hint, entry: m.entry, outcome: m.outcome,
    startedAt: m.startedAt, finishedAt: m.finishedAt, warned: m.warned,
    map: m.hint === 'map' ? m.current.map(id => m.panelIndex[id] + 1) : null,
    lines: m.state === 'entering' ? m.code[m.round] : null,
    revealed: m.outcome === 'capped' ? m.code.slice(m.pairs.length) : null,
    groupId: m.groupId,
  }
}

export function createStudy({ panelIds, settings = {}, rand = Math.random, groupId = null } = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  if (!panelIds?.length || panelIds.length < 3) throw new Error('the Elements wall needs at least three panels')
  const panelIndex = Object.fromEntries(panelIds.map((id, i) => [id, i]))
  const m = {
    state: 'idle',             // idle | playing | reproducing | entering | done
    round: 0, pattern: 0, pairs: [], code: null, patterns: null,
    current: null, progress: 0, missesThisPattern: 0, hint: null,
    entry: { colour: null, number: null }, outcome: null,
    startedAt: null, finishedAt: null, warned: false, groupId, panelIndex,
  }

  const fx = []
  const emit = (e) => fx.push(e)
  const show = () => emit({ type: 'screen', ...screen(m) })

  function reset(now) {
    m.state = 'idle'; m.round = 0; m.pattern = 0; m.pairs = []; m.code = null; m.patterns = null
    m.current = null; m.progress = 0; m.missesThisPattern = 0; m.hint = null
    m.entry = { colour: null, number: null }; m.outcome = null; m.startedAt = null; m.finishedAt = null; m.warned = false
    emit({ type: 'elements.rest' }); emit({ type: 'lines.rest' }); emit({ type: 'deck.off' })
    show()
  }

  function play(now, slow = false) {
    const r = s.rounds[m.round]
    m.current = m.patterns[m.round][m.pattern]
    m.progress = 0
    m.state = 'playing'
    // the screen first, so with the wall down it shows the pattern while it "plays"
    show()
    emit({ type: 'elements.play', panels: m.current, onMs: slow ? r.onMs * 2 : r.onMs, gapMs: slow ? r.gapMs * 2 : r.gapMs })
  }

  function begin(now) {
    m.startedAt = now
    m.code = makeCode(rand)
    m.patterns = s.rounds.map(r => r.lengths.map(len => makePattern(rand, panelIds, len)))
    m.round = 0; m.pattern = 0; m.pairs = []
    emit({ type: 'deck.off' })
    play(now)
  }

  function finish(now, outcome) {
    m.state = 'done'; m.outcome = outcome; m.finishedAt = now
    emit({ type: 'elements.celebrate' }); emit({ type: 'lines.celebrate' }); emit({ type: 'deck.off' })
    emit({ type: 'server.finished', outcome, groupId: m.groupId, seconds: Math.round((now - m.startedAt) / 1000), pairs: m.pairs.length })
    show()
  }

  function nextStep(now) {
    m.missesThisPattern = 0; m.hint = null
    if (m.pattern < 2) { m.pattern += 1; play(now); return }
    // three patterns clear: the Lines answer, the deck lights up
    m.state = 'entering'
    m.entry = { colour: null, number: null }
    emit({ type: 'lines.show', ...m.code[m.round] })
    emit({ type: 'deck.on' })
    show()
  }

  const api = {
    settings: s,
    get state() { return m.state },
    get snapshot() { return screen(m) },
    get code() { return m.code },            // the runner never shows this; tests do
    get patterns() { return m.patterns },

    // Pull the effects produced since the last call.
    drain() { const out = fx.splice(0); return out },

    reset,

    // A panel was touched.
    touch(panelId, now) {
      if (!(panelId in panelIndex)) return
      if (m.state === 'idle') { begin(now); return }
      if (m.state === 'playing') return          // watch first; touches while it plays are ignored
      if (m.state !== 'reproducing') return
      if (panelId === m.current[m.progress]) {
        m.progress += 1
        emit({ type: 'elements.pulse', panel: panelId })
        if (m.progress >= m.current.length) {
          emit({ type: 'elements.ripple' })
          nextStep(now)
        }
        return
      }
      // a wrong touch: the wall dims and the same pattern replays
      m.missesThisPattern += 1
      emit({ type: 'elements.dim' })
      if (m.missesThisPattern >= s.mapHintMisses) m.hint = 'map'
      else if (m.missesThisPattern >= s.replayHintMisses) m.hint = 'slow'
      emit({ type: 'elements.replay' })
      play(now, m.hint !== null)
    },

    // The wall has finished playing the pattern: now the group reproduces it.
    played(now) {
      if (m.state !== 'playing') return
      m.state = 'reproducing'
      m.progress = 0
      show()
    },

    // A button-box key.
    key(name, now) {
      if (m.state !== 'entering') return
      if (COLOURS.includes(name)) { m.entry.colour = name; show(); return }
      if (NUMBERS.includes(Number(name))) { m.entry.number = Number(name); show(); return }
      if (name === 'undo') {
        if (m.entry.number != null) m.entry.number = null
        else m.entry.colour = null
        show(); return
      }
      if (name !== 'submit') return
      if (m.entry.colour == null || m.entry.number == null) { emit({ type: 'deck.shiver' }); return }
      const want = m.code[m.round]
      const colourRight = m.entry.colour === want.colour
      const numberRight = m.entry.number === want.number
      if (colourRight && numberRight) {
        m.pairs.push({ ...want })
        emit({ type: 'deck.off' }); emit({ type: 'lines.rest' })
        m.hint = null; m.entry = { colour: null, number: null }
        emit({ type: 'granolia', hint: null }) // her word about this pair is spent; the next round starts clean
        if (m.round >= 2) { finish(now, 'solved'); return }
        m.round += 1; m.pattern = 0
        emit({ type: 'wait', ms: s.restMs })
        play(now)
        return
      }
      // wrong pair: the keys shiver, Granolia says which half was right
      emit({ type: 'deck.shiver' })
      m.hint = m.hint === 'half' || m.hint === 'words' ? 'words' : 'half'
      m.entry = { colour: null, number: null }
      emit({ type: 'granolia', hint: m.hint, colourRight, numberRight })
      show()
    },

    // The house was paused for `ms`: the game's start moves on by that much,
    // so the cap and the warning wait out the pause. Nothing else changes.
    shift(ms) {
      if (m.startedAt == null || !(ms > 0)) return
      m.startedAt += ms
      show()
    },

    // The clock. Called often; only the cap and the warning live here.
    tick(now) {
      if (m.state === 'idle' || m.state === 'done' || !m.startedAt) return
      if (!m.warned && now - m.startedAt >= s.warnMs) { m.warned = true; emit({ type: 'granolia', hint: 'time' }); show() }
      if (now - m.startedAt >= s.capMs) {
        emit({ type: 'elements.rest' }); emit({ type: 'lines.rest' })
        finish(now, 'capped')
      }
    },
  }
  reset(0)
  return api
}
