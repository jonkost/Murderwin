import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { PICTURES, pictureFor, SPLASHES, SPLASH_ROOMS, HOUSE_TIPS, GAME_HOW, RULE_CARDS, NOW_STATES, WINS, bulbSpots, lookParam } from '../src/look/look.js'
import { CAT_PICTURES } from '../src/lib/rooms.js'
import { SOUNDS, soundMs, play, unlock } from '../src/lib/soundkit.js'
import { LEVELS, pieces, celebrate } from '../src/lib/celebrate.js'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
const sentences = s => String(s).split(/[.!?]+/).map(x => x.trim()).filter(Boolean).length

test('the look book (handoff 11 Nov 2026, B1): its own address, ahead of the game, never linked from a guest’s screen', () => {
  assert.equal(lookParam('?look=1'), true)
  assert.equal(lookParam('?look'), true)
  assert.equal(lookParam('?kiosk=living'), false)
  assert.equal(lookParam(''), false)
  const main = read('../src/main.jsx')
  assert.ok(main.includes('{setup ? <Setup /> : check ? <Check /> : look ?'), 'the look book comes before the phone and the room screens')
  assert.ok(/React\.lazy\(\(\) => import\('\.\/look\/LookBook'\)\)/.test(main), 'it is loaded only when asked for')
  // no screen of the night links to it: the address appears only in the book itself and the page that opens it
  const dirs = ['../src', '../src/screens', '../src/lib']
  for (const d of dirs) {
    for (const f of readdirSync(new URL(d, import.meta.url))) {
      if (!/\.(jsx?|css)$/.test(f) || f === 'main.jsx') continue
      assert.ok(!/look=1/.test(read(`${d}/${f}`)), `${d}/${f} does not link to the look book`)
    }
  }
})

test('the look’s pictures are the household’s own, and every file is in the folder', () => {
  assert.deepEqual(PICTURES, CAT_PICTURES, 'the same lists as the room screens')
  for (const [who, files] of Object.entries(PICTURES)) {
    for (const f of files) assert.ok(existsSync(new URL(`../public/household/full/${f}`, import.meta.url)), `${who}: ${f}`)
  }
  assert.equal(pictureFor('irwin', 0), 'Irwin 1.png')
  assert.equal(pictureFor('irwin', 5), 'Irwin 1.png', 'it goes round')
  assert.equal(pictureFor('boo', 4), ' Boo 5.png', 'the fifth Boo keeps its leading space')
  assert.equal(pictureFor('nobody', 0), null)
  // the big-words face travels with the site: nothing is fetched on the night
  assert.ok(existsSync(new URL('../public/fonts/AbrilFatface-Regular.ttf', import.meta.url)))
  const css = read('../src/look/look.css')
  assert.ok(css.includes("url('/play/fonts/AbrilFatface-Regular.ttf')"))
  assert.ok(!/fonts\.googleapis|fonts\.gstatic|https?:\/\//.test(css), 'the look fetches nothing from outside')
  assert.ok(!/--brand-peat|#262500/i.test(css), 'no olive ground anywhere in the look')
})

test('each room’s splash has its own cat and one short, inviting line', () => {
  assert.deepEqual(SPLASH_ROOMS, ['living', 'study', 'library', 'orangerie', 'entryway', 'bedroom'])
  const who = Object.fromEntries(SPLASH_ROOMS.map(r => [r, SPLASHES[r].who]))
  assert.deepEqual(who, { living: 'irwin', study: 'granolia', library: 'zimothy', orangerie: 'salem', entryway: 'boo', bedroom: 'irwin' }, 'the handoff’s table')
  for (const r of SPLASH_ROOMS) {
    const s = SPLASHES[r]
    assert.ok(PICTURES[s.who], `${r} has pictures`)
    assert.ok(words(s.line) <= 12 && sentences(s.line) <= 2, `${r}: ${s.line}`)
    assert.ok(/^The /.test(s.name), `${r} is named like a room`)
  }
  // the tips are the house's own five
  const deal = read('../../functions/lib/deal.js')
  const block = deal.slice(deal.indexOf('export const FREE_TIME_TIPS = ['), deal.indexOf(']', deal.indexOf('export const FREE_TIME_TIPS = [')))
  const server = [...block.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1])
  assert.deepEqual(HOUSE_TIPS, server, 'the same tips as the server’s FREE_TIME_TIPS')
})

test('the word rule: two short sentences a screen, and nothing over 25 words', () => {
  const lines = [
    ...SPLASH_ROOMS.map(r => SPLASHES[r].line),
    ...Object.values(GAME_HOW).flat(),
    ...RULE_CARDS.map(c => c.body ?? c.three.join(' ')),
    ...Object.values(NOW_STATES).flatMap(s => [s.lead, s.sub, s.button, s.quiet].filter(Boolean)),
    ...WINS.map(w => w.when),
    ...HOUSE_TIPS,
  ]
  for (const line of lines) assert.ok(words(line) <= 25, line)
  for (const how of Object.values(GAME_HOW)) assert.equal(how.length, 2, 'a rules card says two short lines')
  for (const c of RULE_CARDS) if (c.body) assert.ok(sentences(c.body) <= 2, c.body)
  for (const s of Object.values(NOW_STATES)) assert.ok(sentences(s.lead) <= 1 && (!s.sub || sentences(s.sub) <= 2), s.lead)
  assert.deepEqual(RULE_CARDS[0].three, ['Who did it?', 'Why?', 'Who is the Ghost?'], 'the first card is the whole game in three lines')
  assert.deepEqual(Object.keys(GAME_HOW).sort(), ['entryway', 'library', 'orangerie', 'study'])
  // plain American English in what a guest reads
  for (const line of lines) assert.ok(!/colour|favourite|whilst|—/.test(line), line)
})

test('a marquee’s bulbs go evenly round the box, in three sets that take turns', () => {
  assert.deepEqual(bulbSpots(0, 10), [])
  for (const [w, h] of [[900, 160], [400, 90], [1700, 320], [240, 240]]) {
    const spots = bulbSpots(w, h)
    assert.ok(spots.length >= 10, `${w}x${h} has bulbs`)
    assert.equal(spots.length % 3, 0, 'the three sets are the same size')
    for (const s of spots) assert.ok(s.x >= 0 && s.x <= 100 && s.y >= 0 && s.y <= 100 && (s.x === 0 || s.x === 100 || s.y === 0 || s.y === 100), 'every bulb sits on the edge')
    assert.deepEqual(spots[0], { x: 0, y: 0 }, 'from the top left')
    assert.equal(new Set(spots.map(s => `${s.x},${s.y}`)).size, spots.length, 'no two bulbs share a spot')
  }
})

test('the sound kit: made in code, short, and every level of a win has its sound', () => {
  assert.deepEqual(Object.keys(SOUNDS).sort(), ['buzz', 'chime', 'ding', 'fanfare', 'scratch', 'seal', 'sparkle', 'stamp', 'tick'])
  for (const [name, voices] of Object.entries(SOUNDS)) {
    assert.ok(voices.length >= 1, name)
    assert.ok(soundMs(name) > 0 && soundMs(name) <= 2000, `${name} is short: ${soundMs(name)} ms`)
    for (const v of voices) {
      assert.ok(v.g > 0 && v.g <= 1 && v.d > 0 && v.t >= 0, `${name}: a voice is audible and has a length`)
      assert.ok(v.n === 1 || (v.f >= 40 && v.f <= 7000), `${name}: a tone a small speaker can play`)
    }
  }
  assert.ok(soundMs('tick') <= 100, 'a tick is a tick')
  assert.ok(soundMs('buzz') <= 300 && Math.max(...SOUNDS.buzz.map(v => v.g)) <= 0.25, 'a miss is soft and short: never a scolding')
  assert.ok(Math.max(...SOUNDS.ding.map(v => v.g)) >= 0.5, 'at least twice as loud as the old chime (0.25)')
  // no page, no sound: quiet, and nothing thrown
  assert.equal(play('ding'), false)
  assert.equal(play('nothing'), false)
  assert.deepEqual(Object.keys(LEVELS), ['small', 'medium', 'big', 'miss'])
  for (const [level, spec] of Object.entries(LEVELS)) assert.ok(SOUNDS[spec.sound], `${level} plays ${spec.sound}`)
  assert.ok(LEVELS.small.ms <= 800 && LEVELS.medium.ms <= 1500 && LEVELS.big.ms >= 2000 && LEVELS.big.ms <= 3000, 'half a second, a second, two to three seconds')
  assert.deepEqual(WINS.map(w => w.level), Object.keys(LEVELS), 'the look book shows every level')
})

test('a celebration’s pieces: the same burst for the same seed, and the right kind for each level', async () => {
  assert.equal(await unlock({}), 'none', 'a device with no sound says so')
  assert.deepEqual(pieces('small', 3), pieces('small', 3))
  assert.notDeepEqual(pieces('big', 1), pieces('big', 2))
  assert.ok(pieces('small').every(p => p.kind === 'sparkle'))
  assert.equal(pieces('medium').filter(p => p.kind === 'seal').length, 1, 'one wax seal')
  assert.ok(pieces('big').filter(p => p.kind === 'paw').length >= 12, 'a burst of paw prints')
  assert.deepEqual(pieces('miss'), [], 'a miss is a shake, not a burst')
  for (const p of [...pieces('small'), ...pieces('medium'), ...pieces('big')]) {
    assert.ok(Number.isFinite(p.dx) && Number.isFinite(p.dy) && p.size > 0 && p.delay >= 0 && p.delay <= 400, 'every piece has somewhere to go')
  }
  // off a page (a test, the server) it draws nothing and still answers with the level's length
  assert.equal(celebrate('big', { quiet: true }), LEVELS.big.ms)
  assert.equal(celebrate('nonsense'), 0)
})
