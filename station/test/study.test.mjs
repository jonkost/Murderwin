import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createStudy, makePattern, settingsFrom, DECK, deckKeys, COLOURS, DEFAULT_SETTINGS } from '../lib/study.js'

const PANELS = [101, 102, 103, 104, 105, 106, 107]
function seeded(seed = 1) {
  let a = seed >>> 0
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const types = (fx) => fx.map(e => e.type)

// Reproduce the current pattern correctly: touch each panel in order.
function reproduce(m, now) {
  m.played(now)
  const pattern = m.patterns[m.snapshot.round][m.snapshot.pattern]
  for (const p of pattern) m.touch(p, now)
}
function enter(m, pair, now) {
  m.key(pair.colour, now); m.key(String(pair.number), now); m.key('submit', now)
}

test('the deck face is five columns of three with exactly one blank', () => {
  assert.equal(DECK.flat().length, 15)
  assert.equal(DECK.flat().filter(k => k === 'blank').length, 1)
  assert.deepEqual(DECK.map(r => r[0]).concat(DECK.map(r => r[1])).sort(), [...COLOURS].sort())
  assert.deepEqual(DECK.map(r => r[2]).concat(DECK.map(r => r[3])), ['1', '2', '3', '4', '5', '6'])
  assert.deepEqual(DECK.map(r => r[4]), ['blank', 'undo', 'submit'])
  assert.equal(deckKeys().find(k => k.name === 'submit').index, 14)
})

test('patterns never repeat a panel twice running, at the lengths asked', () => {
  const rand = seeded(5)
  for (let i = 0; i < 200; i++) {
    const p = makePattern(rand, PANELS, 7)
    assert.equal(p.length, 7)
    for (let j = 1; j < p.length; j++) assert.notEqual(p[j], p[j - 1])
  }
})

test('idle until the first touch; the first touch starts the clock and plays round 1, pattern 1', () => {
  const m = createStudy({ panelIds: PANELS, rand: seeded(2) })
  assert.equal(m.state, 'idle')
  assert.deepEqual(types(m.drain()).sort(), ['deck.off', 'elements.rest', 'lines.rest', 'screen'])
  m.touch(999, 1000) // not a panel
  assert.equal(m.state, 'idle')
  m.touch(101, 1000)
  assert.equal(m.state, 'playing')
  const fx = m.drain()
  const play = fx.find(e => e.type === 'elements.play')
  assert.equal(play.panels.length, 3, 'round 1 starts with three lights')
  assert.equal(play.onMs, 800)
  assert.equal(m.snapshot.startedAt, 1000)
  assert.equal(m.code.length, 3)
  assert.ok(m.code.every(c => COLOURS.includes(c.colour) && c.number >= 1 && c.number <= 6))
})

test('a clean run: nine patterns, three pairs, the station reports solved once', () => {
  const m = createStudy({ panelIds: PANELS, rand: seeded(3), groupId: 'g1' })
  let now = 10_000
  m.touch(101, now)
  m.drain()
  for (let round = 0; round < 3; round++) {
    for (let pat = 0; pat < 3; pat++) {
      assert.equal(m.state, 'playing')
      assert.equal(m.snapshot.round, round)
      assert.equal(m.snapshot.pattern, pat)
      const play = m.drain().find(e => e.type === 'elements.play')
      if (play) assert.equal(play.panels.length, DEFAULT_SETTINGS.rounds[round].lengths[pat])
      now += 2000
      reproduce(m, now)
    }
    assert.equal(m.state, 'entering')
    const fx = m.drain()
    const lines = fx.find(e => e.type === 'lines.show')
    assert.deepEqual({ colour: lines.colour, number: lines.number }, m.code[round])
    assert.ok(types(fx).includes('deck.on'))
    assert.equal(m.snapshot.lines.colour, m.code[round].colour, 'the screen state carries what the Lines show, for the fallback')
    now += 5000
    enter(m, m.code[round], now)
  }
  assert.equal(m.state, 'done')
  const fx = m.drain()
  const finished = fx.filter(e => e.type === 'server.finished')
  assert.equal(finished.length, 1)
  assert.equal(finished[0].outcome, 'solved')
  assert.equal(finished[0].groupId, 'g1')
  assert.equal(finished[0].pairs, 3)
  assert.ok(finished[0].seconds > 0)
  assert.equal(m.snapshot.pairsLocked, 3)
})

test('a wrong touch replays the same pattern; hints climb at the second and fourth miss', () => {
  const m = createStudy({ panelIds: PANELS, rand: seeded(4) })
  let now = 0
  m.touch(101, now); m.drain()
  m.played(now)
  const pattern = m.patterns[0][0]
  const wrong = PANELS.find(p => p !== pattern[0])
  m.touch(wrong, now)
  let fx = m.drain()
  assert.ok(types(fx).includes('elements.dim'))
  assert.ok(types(fx).includes('elements.replay'))
  assert.equal(m.state, 'playing')
  assert.equal(m.snapshot.pattern, 0, 'same pattern again')
  assert.equal(m.snapshot.misses, 1)
  assert.equal(m.snapshot.hint, null)
  // second miss: half speed
  m.played(now); m.touch(wrong, now)
  fx = m.drain()
  assert.equal(m.snapshot.hint, 'slow')
  assert.equal(fx.find(e => e.type === 'elements.play').onMs, 1600)
  // fourth miss: the numbered map
  m.played(now); m.touch(wrong, now)
  m.played(now); m.touch(wrong, now)
  m.drain()
  assert.equal(m.snapshot.hint, 'map')
  assert.deepEqual(m.snapshot.map, pattern.map(id => PANELS.indexOf(id) + 1))
  // touches while the wall is playing are ignored
  m.touch(pattern[0], now)
  assert.equal(m.state, 'playing')
  // then a correct reproduction clears the hint
  reproduce(m, now)
  assert.equal(m.snapshot.pattern, 1)
  assert.equal(m.snapshot.misses, 0)
  assert.equal(m.snapshot.hint, null)
})

test('entering: undo clears the last half; a wrong pair shivers and says which half was right; the Lines stay lit', () => {
  const m = createStudy({ panelIds: PANELS, rand: seeded(6) })
  let now = 0
  m.touch(101, now); m.drain()
  for (let pat = 0; pat < 3; pat++) reproduce(m, now)
  assert.equal(m.state, 'entering')
  m.drain()
  const want = m.code[0]
  const otherColour = COLOURS.find(c => c !== want.colour)
  m.key(otherColour, now)
  m.key('3', now)
  assert.deepEqual(m.snapshot.entry, { colour: otherColour, number: 3 })
  m.key('undo', now)
  assert.deepEqual(m.snapshot.entry, { colour: otherColour, number: null })
  m.key('undo', now)
  assert.deepEqual(m.snapshot.entry, { colour: null, number: null })
  m.key('submit', now)
  assert.ok(types(m.drain()).includes('deck.shiver'), 'half a pair cannot submit')
  // wrong colour, right number
  m.key(otherColour, now); m.key(String(want.number), now); m.key('submit', now)
  let fx = m.drain()
  const g = fx.find(e => e.type === 'granolia')
  assert.equal(g.hint, 'half')
  assert.equal(g.colourRight, false)
  assert.equal(g.numberRight, true)
  assert.ok(!types(fx).includes('lines.rest'), 'the Lines keep showing the answer')
  assert.equal(m.state, 'entering')
  // second wrong: words
  m.key(otherColour, now); m.key(String(want.number), now); m.key('submit', now)
  assert.equal(m.drain().find(e => e.type === 'granolia').hint, 'words')
  // right
  enter(m, want, now)
  assert.equal(m.snapshot.pairsLocked, 1)
  assert.equal(m.state, 'playing')
  assert.equal(m.snapshot.round, 1)
})

test('the cap: a warning at eight minutes, then at ten (the round) the rest of the code is shown and the clue still goes', () => {
  const m = createStudy({ panelIds: PANELS, rand: seeded(7), groupId: 'g2' })
  const t0 = 1_000_000
  m.touch(101, t0); m.drain()
  reproduce(m, t0 + 1000)
  m.tick(t0 + 7 * 60_000)
  assert.equal(m.snapshot.warned, false)
  m.tick(t0 + 8 * 60_000)
  assert.equal(m.snapshot.warned, true)
  assert.ok(m.drain().some(e => e.type === 'granolia' && e.hint === 'time'))
  m.tick(t0 + 9 * 60_000 + 59_000)
  assert.notEqual(m.state, 'done')
  m.tick(t0 + 10 * 60_000)
  assert.equal(m.state, 'done')
  const fx = m.drain()
  const finished = fx.find(e => e.type === 'server.finished')
  assert.equal(finished.outcome, 'capped')
  assert.equal(finished.pairs, 0)
  assert.equal(m.snapshot.revealed.length, 3, 'every pair the group had not earned is shown')
  m.tick(t0 + 11 * 60_000)
  assert.equal(m.drain().filter(e => e.type === 'server.finished').length, 0, 'finished fires once')
  // touches after done do nothing; reset returns to idle with the walls at rest
  m.touch(101, t0 + 16 * 60_000)
  assert.equal(m.state, 'done')
  m.reset(t0 + 17 * 60_000)
  assert.equal(m.state, 'idle')
  assert.equal(m.snapshot.pairsLocked, 0)
})

test('the screen state never carries the code or the patterns while playing', () => {
  const m = createStudy({ panelIds: PANELS, rand: seeded(8) })
  m.touch(101, 0)
  const snap = m.snapshot
  assert.ok(!('code' in snap) && !('patterns' in snap))
  assert.equal(snap.lines, null)
  assert.equal(snap.revealed, null)
})

test('settings from the server override the defaults: a shorter cap and gentler rounds; nonsense is dropped', () => {
  const taken = settingsFrom({ capMs: 10 * 60_000, warnMs: 8 * 60_000, rounds: [
    { lengths: [3, 3, 4], onMs: 900, gapMs: 300 }, { lengths: [4, 4, 5], onMs: 700, gapMs: 250 }, { lengths: [5, 5, 6], onMs: 500, gapMs: 200 },
  ], replayHintMisses: 1, extra: 'no' })
  assert.deepEqual(Object.keys(taken).sort(), ['capMs', 'replayHintMisses', 'rounds', 'warnMs'])
  const m = createStudy({ panelIds: PANELS, rand: seeded(9), settings: taken })
  assert.equal(m.settings.capMs, 10 * 60_000)
  assert.equal(m.settings.mapHintMisses, DEFAULT_SETTINGS.mapHintMisses, 'untouched settings keep their defaults')
  m.touch(101, 1000)
  const play = m.drain().find(e => e.type === 'elements.play')
  assert.equal(play.panels.length, 3)
  assert.equal(play.onMs, 900)
  m.tick(1000 + 10 * 60_000)
  assert.equal(m.state, 'done', 'the shorter cap applies')
  assert.equal(m.drain().find(e => e.type === 'server.finished').outcome, 'capped')
  // nonsense: a warning after the cap, a round with the wrong shape, a cap of five milliseconds
  assert.deepEqual(settingsFrom({ capMs: 5, rounds: [{ lengths: [1] }], restMs: 'soon' }), {})
  assert.deepEqual(settingsFrom(null), {})
  assert.deepEqual(settingsFrom({ capMs: 12 * 60_000, warnMs: 13 * 60_000 }), { capMs: 12 * 60_000 }, 'a warning past the cap is dropped')
})
