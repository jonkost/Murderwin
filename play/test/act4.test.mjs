import { test } from 'node:test'
import assert from 'node:assert/strict'
import { act4Step, freeForGames, waitingGames, salemColourAt, salemFlipAt, ROOMS, lightsStep } from '../src/lib/night.js'
import { promptShown, standaloneBoards, turnNames, MEMORY_ROUNDS, ALL_TRACES, videoUrl, newsClips, closingClips, closingSequence } from '../src/lib/rooms.js'
import { readFileSync } from 'node:fs'
import news from '../../seed/woof-news.json' with { type: 'json' }
import { askMotion, unlockSound, keepAwake, PERMISSION_LINES } from '../src/lib/permissions.js'

// The phone's Act 4 rules and the new room screens' rules (handoff 23 Oct 2026).
// Pure: throwaway docs made here, nothing printed.

test('act4Step: only in Act 4 and only with a room; free for a Parlour Game in the Parlour, once paid, or when the rounds are over', () => {
  assert.equal(act4Step({ act4: { room: 'study' } }, 3), null)
  assert.equal(act4Step({}, 4), null)
  assert.deepEqual(act4Step({ act4: { room: 'study', round: 1 } }, 4), { room: 'study', round: 1 })
  assert.equal(freeForGames({ room: 'study' }), false, 'never in a game room')
  assert.equal(freeForGames({ room: 'study', paid: true }), true)
  assert.equal(freeForGames({ room: 'parlour' }), true)
  assert.equal(freeForGames({ room: 'parlour', over: true }), true)
  assert.deepEqual(Object.keys(ROOMS).sort(), ['entryway', 'library', 'orangerie', 'study'])
  assert.equal(lightsStep({ lights: { step: 'go' } }, 4), null, 'the Act 2 step is gone in Act 4')
})

test('waitingGames: the unplayed Act 4 games, oldest first, never a window that pops up for everyone', () => {
  const session = {
    windows: {
      'questions-4-p1': { kind: 'questions', waiting: true, opensAt: 2000, beats: [1, 2, 3] },
      'questions-4-p0': { kind: 'questions', waiting: true, opensAt: 1000, beats: [1, 2, 3] },
      'questions-2-p0': { kind: 'questions', opensAt: 500, beats: [1, 2, 3] },
      'questions-4-p2': { kind: 'questions', waiting: true, opensAt: 3000, beats: [1, 2, 3] },
    },
    answers: { 'questions-4-p2': { picks: ['a', 'a', 'a'] } },
  }
  const g = waitingGames(session)
  assert.deepEqual(g.map(x => x.id), ['questions-4-p0', 'questions-4-p1'])
  assert.ok(g.every(x => x.waiting && x.mine.beats.length === 3))
})

test('Salem\'s colour at a moment: the last flip whose time has come; none unless playing', () => {
  const doc = { state: 'playing', flips: [{ at: 1000, colour: 'green' }, { at: 4000, colour: 'red' }, { at: 7000, colour: 'green' }] }
  assert.equal(salemColourAt(doc, 999), null)
  assert.equal(salemColourAt(doc, 1000), 'green')
  assert.equal(salemColourAt(doc, 5000), 'red')
  assert.equal(salemFlipAt(doc, 5000), 4000)
  assert.equal(salemColourAt({ ...doc, state: 'passed' }, 5000), null)
})

test('the Parlour TV turns Sir Irwin\'s prompts on the server\'s clock, in the order it was given', () => {
  const prompts = { lines: ['a', 'b', 'c'], order: [2, 0, 1], startedAt: 1000, everyMs: 180_000 }
  assert.equal(promptShown(prompts, 1000), 'c')
  assert.equal(promptShown(prompts, 1000 + 180_000), 'a')
  assert.equal(promptShown(prompts, 1000 + 3 * 180_000), 'c', 'round again')
  assert.equal(promptShown(null, 0), '')
})

test('the standalone memory match: three boards of 6, 10 and 14 pairs, every trace as art, fresh each time', () => {
  assert.equal(ALL_TRACES.length, 14)
  const a = standaloneBoards(1)
  assert.deepEqual(a.map(b => b.length), MEMORY_ROUNDS.map(n => n * 2))
  for (const b of a) for (const t of b) assert.ok(ALL_TRACES.includes(t))
  assert.notDeepEqual(standaloneBoards(2), a)
  assert.match(videoUrl('newsflash-opening'), /video\/newsflash-opening\.mp4$/)
})

test('the permissions: three lines, and a phone that cannot or says no still gets an answer, never a throw', async () => {
  assert.deepEqual(PERMISSION_LINES.map(l => l.key), ['motion', 'sound', 'awake'])
  assert.equal(await askMotion({}), 'none')
  assert.equal(await askMotion({ DeviceMotionEvent: {} }), 'ok')
  assert.equal(await askMotion({ DeviceMotionEvent: { requestPermission: async () => 'granted' } }), 'ok')
  assert.equal(await askMotion({ DeviceMotionEvent: { requestPermission: async () => 'denied' } }), 'denied')
  assert.equal(await askMotion({ DeviceMotionEvent: { requestPermission: async () => { throw new Error('x') } } }), 'denied')
  assert.equal(await unlockSound({}), 'none')
  assert.equal(await keepAwake({ navigator: {} }, null), 'none')
  assert.equal(await keepAwake({ navigator: { wakeLock: { request: async () => ({ released: false }) } } }, null), 'ok')
})

test('the bulletin videos: the TV finds each part by its words in the open bank; a stand-in line has none', () => {
  const fam = Object.values(news.bulletin1.families)[0]
  assert.deepEqual(newsClips([news.bulletin1.opening.text, fam.text, news.bulletin1.signoff.text]), [news.bulletin1.opening.clip, fam.clip, news.bulletin1.signoff.clip])
  assert.deepEqual(newsClips([news.bulletin1.opening.text, '[W-O-O-F News crosses off one family of motives here]', news.bulletin1.signoff.text]), [news.bulletin1.opening.clip, news.bulletin1.signoff.clip])
  const all = ['murderer', 'motive', 'victim'].flatMap(closingClips)
  assert.deepEqual(all, news.closing.parts.map(p => p.clip), 'the three names play every closing part once, in order')
  assert.deepEqual(closingClips('nobody'), [])
})

// ---- F25 and F26: Salem's Motion Game on the phone ----------------------------

test('F25 a phone with no motion sensor never causes a slip in Salem\'s game: no reading, no slip, on any colour at any moment', async () => {
  const { salemSlip, SALEM_GRACE_MS, SALEM_SHAKE, SALEM_STILL_MS } = await import('../src/lib/night.js')
  const flipAt = 10_000
  const noSensor = { ok: false, mag: 0, lastShakeAt: 0 }
  for (const colour of ['red', 'green', null]) {
    for (let local = flipAt; local <= flipAt + 60_000; local += 250) {
      for (const round of [1, 2, 3]) assert.equal(salemSlip({ colour, motion: noSensor, local, flipAt, grace: SALEM_GRACE_MS[round] }), null, 'F25 no sensor, no slip')
    }
  }
  // a sensor that never answered (permission refused) looks the same: ok stays false, so never a slip
  assert.equal(salemSlip({ colour: 'red', motion: { ok: false, mag: 99, lastShakeAt: 0 }, local: flipAt + 30_000, flipAt, grace: 500 }), null)
  assert.equal(salemSlip({ colour: 'red', motion: undefined, local: flipAt + 30_000, flipAt, grace: 500 }), null)
  // a phone that can feel: the rules still bite
  assert.equal(salemSlip({ colour: 'green', motion: { ok: true, mag: SALEM_SHAKE + 1, lastShakeAt: flipAt + 900 }, local: flipAt + 900, flipAt, grace: 700 }), 'green', 'a shake on green after the grace slips')
  assert.equal(salemSlip({ colour: 'green', motion: { ok: true, mag: SALEM_SHAKE + 1, lastShakeAt: flipAt + 300 }, local: flipAt + 300, flipAt, grace: 700 }), null, 'inside the grace it does not')
  assert.equal(salemSlip({ colour: 'red', motion: { ok: true, mag: 0, lastShakeAt: 0 }, local: flipAt + 700 + SALEM_STILL_MS + 1, flipAt, grace: 700 }), 'red', 'too still on red slips')
  assert.equal(salemSlip({ colour: 'red', motion: { ok: true, mag: 0, lastShakeAt: flipAt + 2_000 }, local: flipAt + 2_500, flipAt, grace: 700 }), null, 'a recent shake on red is fine')
  // the screen: ok is false until the first reading, and the rules never run without it
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(new URL('../src/screens/Act4.jsx', import.meta.url), 'utf8')
  assert.match(src, /useState\(\(\) => \(\{ ok: false, mag: 0, lastShakeAt: 0, g: null, ax: 0, ay: 0, gx: 0, gy: 0, spin: 0 \}\)\)/, 'no reading yet: ok is false')
  assert.match(src, /if \(typeof window === 'undefined' \|\| !\('DeviceMotionEvent' in window\)\) return/, 'no sensor at all: never listens, ok stays false')
  assert.match(src, /\} else return\n\s*state\.ok = true/, 'ok turns true only on a real reading')
  assert.match(src, /if \(!started \|\| !colour \|\| !motion\.ok\) return/, 'the rules never run without a reading')
  assert.match(src, /const s = salemSlip\(\{ colour, motion, local, flipAt, grace \}\)/)
  assert.match(src, /\{!motion\.ok && <p className="gloss">\{lines\.noSensor\}<\/p>\}/, 'and the phone says so: watch the lights and cheer')
})

test('Salem\'s head on the phone (31 Oct 2026, note 10012): loose on the screen while a round plays, moved by the phone\'s own motion, and never a rule', async () => {
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(new URL('../src/screens/Act4.jsx', import.meta.url), 'utf8')
  const head = src.slice(src.indexOf('export function SalemHead'), src.indexOf('function SalemGame'))
  assert.ok(head.length > 0, 'the head is its own component')
  // the readings it uses come from the same motion hook as the rules, and are only read, never written
  for (const k of ['motion.ax', 'motion.ay', 'motion.gx', 'motion.gy', 'motion.spin', 'motion.mag', 'motion.ok']) assert.ok(head.includes(k), k)
  assert.ok(!/motion\.\w+\s*=[^=]/.test(head), 'the head never writes a reading')
  assert.ok(!/salemSlip|slip\(|passed\(|ready\(/.test(head), 'it sends nothing and decides nothing')
  // drawn to the element each frame, with no React redraw; the edges bounce; a hard shake swells it
  assert.ok(head.includes('requestAnimationFrame(step)') && head.includes('el.style.transform ='), 'a frame loop on the element')
  assert.ok(head.includes('cancelAnimationFrame(raf)'), 'and it stops with the round')
  assert.ok(/h\.x > maxX[\s\S]*h\.x < -maxX[\s\S]*h\.y > maxY[\s\S]*h\.y < -maxY/.test(head), 'four edges')
  assert.ok(head.includes("prefers-reduced-motion: reduce"), 'a phone that asks for less motion gets the gentle float')
  assert.ok(head.includes("household/faces/") && head.includes("Salem Face.png"), 'his face, the arcade\'s picture')
  // on the round's screen, under the count and the round dots, and nowhere else
  assert.ok(src.includes('<SalemHead motion={motion} />'), 'in SalemRounds')
  assert.equal((src.match(/<SalemHead /g) ?? []).length, 1)
  const rounds = src.slice(src.indexOf('export function SalemRounds'), src.indexOf('// Boo\'s catwalk'))
  assert.ok(/salem-play[^\n]*\n\s*<SalemHead motion=\{motion\} \/>\n\s*\{!started && <p className="salem-count">/.test(rounds), 'first in the coloured screen, so the count draws over it')
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  assert.ok(css.includes('.salem-head { position: absolute;') && css.includes('pointer-events: none'), 'it never catches a tap')
  assert.ok(css.includes('.salem-play .salem-count, .salem-play .slip, .salem-play .salem-round { position: relative; z-index: 1; }'), 'the count and the dots stay on top')
})

test('F26 every colour change in Salem\'s game reaches every phone in the group within half a second of its time', async () => {
  const { salemColourAt } = await import('../src/lib/night.js')
  const { skewFrom } = await import('../src/lib/clock.js')
  const { readFileSync } = await import('node:fs')
  // every phone reads the same schedule on the server's clock: the same colour at the same server moment
  const flips = [{ at: 20_000, colour: 'red' }, { at: 24_000, colour: 'green' }, { at: 26_500, colour: 'red' }, { at: 29_000, colour: 'green' }]
  const doc = { state: 'playing', flips }
  flips.forEach((f, i) => {
    assert.equal(salemColourAt(doc, f.at - 1), flips[i - 1]?.colour ?? null, 'the old colour up to the change')
    assert.equal(salemColourAt(doc, f.at), f.colour, 'the new colour exactly at its time')
  })
  // each phone re-reads its colour ten times a second
  const src = readFileSync(new URL('../src/screens/Act4.jsx', import.meta.url), 'utf8')
  const rounds = src.slice(src.indexOf('export function SalemRounds'), src.indexOf('// Boo\'s catwalk'))
  const tick = Number(/useTick\((\d+)\)/.exec(rounds)?.[1])
  assert.ok(tick > 0 && tick <= 100, 'F26 the phone redraws at least ten times a second')
  assert.match(rounds, /const colour = started \? salemColourAt\(doc, now\) : null/, 'the colour is the server-clock schedule, read each redraw')
  // a phone's server clock is out by at most half its heartbeat's round trip (the midpoint rule);
  // phones with any clock error and a round trip up to 0.8 s show each change within half a second
  let worst = 0
  for (const trueOffset of [-90_000, -1_234, 0, 777, 45_000]) {
    for (const rtt of [20, 150, 400, 800]) {
      for (const where of [0, 0.25, 0.5, 0.75, 1]) {
        const sentAt = 1_000_000
        const err = Math.abs(skewFrom(sentAt, sentAt + rtt, sentAt + rtt * where + trueOffset) - trueOffset)
        assert.ok(err <= rtt / 2 + 1e-9, 'the skew is out by at most half the round trip')
        worst = Math.max(worst, err + tick)
      }
    }
  }
  assert.ok(worst <= 500, `F26 the latest a phone shows a change is ${Math.round(worst)} ms after its time`)
})

// Boo's music through the Parlour HomePod (Jon, 27 Oct 2026): the wall runs
// the music ahead of itself by the AirPlay delay, so the scratch lands on
// STRIKE A POSE. Two seconds on the night's wall, none in practice;
// &airplay=<seconds> sets it, 0 to 5.
test('the memory match takes turns: the group by its own names, nobody known and no turns', () => {
  const rotation = { groups: [{ id: 'g1', members: [{ name: 'Ann', characterName: 'Lady A' }, { name: '', characterName: 'Lord B' }, { name: 'Cy' }] }, { id: 'g2', members: [{ name: 'Di' }] }] }
  assert.deepEqual(turnNames(rotation, 'g1'), ['Ann', 'Lord B', 'Cy'])
  assert.deepEqual(turnNames(rotation, 'g9'), [])
  assert.deepEqual(turnNames(null, 'g1'), [])
})

test('the study walls as they hang: ten hexagons a hexagon apart, twelve bars of one length', async () => {
  const { HEX_CENTRES, LINE_BARS, hexPoints } = await import('../src/lib/walls.js')
  assert.equal(HEX_CENTRES.length, 10)
  for (const [i, a] of HEX_CENTRES.entries()) {
    const near = Math.min(...HEX_CENTRES.filter((_, j) => j !== i).map(b => Math.hypot(a[0] - b[0], a[1] - b[1])))
    assert.ok(Math.abs(near - 100) < 2, `hexagon ${i} touches another`)
  }
  assert.equal(LINE_BARS.length, 12)
  for (const [a, b] of LINE_BARS) assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - 100) < 2)
  assert.equal(hexPoints([0, 0], 10).split(' ').length, 6)
})

test('the closing bulletin\'s film: the same clips as the server works out, a caption a clip, and no clip of the night\'s own without a pick', async () => {
  const { closingVideoStage } = await import('../../functions/lib/news.js')
  const chars = JSON.parse(readFileSync(new URL('../../seed/characters.json', import.meta.url), 'utf8'))
  const ids = (chars.characters ?? chars).map(c => c.id)
  for (const [stage, picks] of [['murderer', ids], ['victim', ids], ['motive', Array.from({ length: 19 }, (_, i) => i + 1)]]) {
    for (const pick of picks) {
      const seq = closingSequence(stage, pick, 'the words')
      assert.deepEqual(seq.map(c => c.clip), closingVideoStage(stage, pick).seq.map(c => c.clip), `${stage} ${pick}`)
      assert.ok(seq.every(c => typeof c.line === 'string'))
    }
    assert.deepEqual(closingSequence(stage, null).map(c => c.clip), closingClips(stage), 'no pick: the recorded parts alone')
    assert.deepEqual(closingSequence(stage, '../x').map(c => c.clip), closingClips(stage))
  }
  assert.deepEqual(closingSequence('nobody', ids[0]), [])
  const said = closingSequence('murderer', ids[0], 'Lady Example')
  assert.ok(said.at(-1).line.endsWith('Lady Example'), 'the name clip is captioned with the name')
})
