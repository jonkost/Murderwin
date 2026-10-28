import { test } from 'node:test'
import assert from 'node:assert/strict'
import { act4Step, freeForGames, waitingGames, salemColourAt, salemFlipAt, booMoment, booLead, BOO_AIRPLAY_MS, ROOMS, lightsStep } from '../src/lib/night.js'
import { promptShown, standaloneBoards, MEMORY_ROUNDS, ALL_TRACES, videoUrl, newsClips, closingClips } from '../src/lib/rooms.js'
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

test('Boo\'s show at a moment: intro, strut, pose with a hold count, judge, done', () => {
  const poses = [
    { strutAt: 9000, poseAt: 20000, holdUntil: 25000, judgeUntil: 31000, line: 'Bold. Wrong, but bold.' },
    { strutAt: 31000, poseAt: 40000, holdUntil: 45000, judgeUntil: 51000, line: 'Fine. Fine! You may stay.' },
  ]
  const doc = { state: 'show', startsAt: 1, poses, endsAt: 51000 }
  assert.equal(booMoment(doc, 5000).part, 'intro')
  assert.deepEqual(booMoment(doc, 12000), { part: 'strut', pose: 1 })
  assert.deepEqual(booMoment(doc, 21500), { part: 'pose', pose: 1, hold: 4 })
  assert.equal(booMoment(doc, 26000).line, 'Bold. Wrong, but bold.')
  assert.equal(booMoment(doc, 35000).part, 'strut')
  assert.equal(booMoment(doc, 52000).part, 'done')
  assert.equal(booMoment({ state: 'idle' }, 0).part, 'idle')
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
  assert.match(src, /useState\(\(\) => \(\{ ok: false, mag: 0, lastShakeAt: 0, g: null \}\)\)/, 'no reading yet: ok is false')
  assert.match(src, /if \(typeof window === 'undefined' \|\| !\('DeviceMotionEvent' in window\)\) return/, 'no sensor at all: never listens, ok stays false')
  assert.match(src, /\} else return\n\s*state\.ok = true/, 'ok turns true only on a real reading')
  assert.match(src, /if \(!started \|\| !colour \|\| !motion\.ok\) return/, 'the rules never run without a reading')
  assert.match(src, /const s = salemSlip\(\{ colour, motion, local, flipAt, grace \}\)/)
  assert.match(src, /\{!motion\.ok && <p className="gloss">\{lines\.noSensor\}<\/p>\}/, 'and the phone says so: watch the lights and cheer')
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
test('Boo\'s music leads her wall by the AirPlay delay: two seconds on the night, none in practice, &airplay= sets it', () => {
  assert.equal(BOO_AIRPLAY_MS, 2000)
  assert.equal(booLead('?kiosk=boo'), 2000)
  assert.equal(booLead('?kiosk=boo&practice=1', { practice: true }), 0)
  assert.equal(booLead('?kiosk=boo&airplay=1.5'), 1500)
  assert.equal(booLead('?kiosk=boo&practice=1&airplay=2', { practice: true }), 2000)
  assert.equal(booLead('?kiosk=boo&airplay=0'), 0, 'the Mac\'s own speakers')
  for (const bad of ['9', '-1', 'abc', '']) assert.equal(booLead(`?kiosk=boo&airplay=${bad}`), 2000, bad)
  // with the lead, the room hears the stop two seconds before the wall flashes, so it lands on the flash
  const t = 1_000_000
  const show = { state: 'show', startsAt: t, endsAt: t + 40_000, poses: [{ strutAt: t + 9000, poseAt: t + 17_000, holdUntil: t + 22_000, judgeUntil: t + 28_000, line: 'x' }] }
  assert.equal(booMoment(show, t + 14_500 + 2000).part, 'strut', 'two and a half seconds before the flash the music still plays')
  assert.equal(booMoment(show, t + 15_000).part, 'strut', 'two seconds before the flash the wall still struts')
  assert.equal(booMoment(show, t + 15_000 + 2000).part, 'pose', 'and the music stops, to be heard on the flash')
})
