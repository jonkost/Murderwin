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

test('B2, the room splash on every idle screen: on since Jon said yes to all eight (12 Nov 2026)', async () => {
  const { LOOK, lookOn, SPLASH_OF, splashNow, SPLASH_TURN_MS, TIP_MS } = await import('../src/look/look.js')
  assert.deepEqual(LOOK, { splash: true }, 'Jon: "Yes to all 8"')
  assert.equal(lookOn('splash', ''), true)
  assert.equal(lookOn('nothing-yet', ''), false, 'a part that is not switched on stays off')
  assert.equal(lookOn('nothing-yet', '?kiosk=study&nothing-yet=1'), true, 'and can be tried on a real screen by its address')
  // a Mac's own screen beside its room screen gets its room's splash, from the setup page and the send list
  const { SECOND_DISPLAY_ROOMS, setupHref } = await import('../src/lib/setup.js')
  assert.deepEqual(SECOND_DISPLAY_ROOMS.map(r => setupHref('/play/', r)), ['/play/?kiosk=decor&room=living', '/play/?kiosk=decor&room=study'])
  for (const r of SECOND_DISPLAY_ROOMS) for (const line of [r.room, r.machine, r.when]) assert.ok(!/—|kiosk|localhost/.test(line), line)
  const { secondDisplayLinks } = await import('../src/lib/start.js')
  assert.deepEqual(secondDisplayLinks('https://example.test/play/').map(s => s.url), ['https://example.test/play/?kiosk=decor&room=living', 'https://example.test/play/?kiosk=decor&room=study', 'https://example.test/play/?kiosk=decor'])
  assert.ok(read('../src/screens/Setup.jsx').includes('SECOND_DISPLAY_ROOMS.map(r =>') && read('../src/screens/Host.jsx').includes('seconds.map(s =>'))
  // every idle room screen has its splash: the loop names the room screens idle on (lib/rooms.js LOOP_OF)
  const { LOOP_OF } = await import('../src/lib/rooms.js')
  for (const loop of new Set(Object.values(LOOP_OF))) assert.ok(SPLASHES[SPLASH_OF[loop]], `${loop} has a splash`)
  assert.equal(SPLASH_OF.memory, 'library')
  assert.equal(SPLASH_OF.boo, 'entryway')
  // the picture moves on every few minutes and the tip every minute, by the clock on the wall
  const t = 1_800_000_000_000
  assert.equal(splashNow(t).turn + 1, splashNow(t + SPLASH_TURN_MS).turn)
  assert.equal(splashNow(t).turn, splashNow(t + SPLASH_TURN_MS - 1 - (t % SPLASH_TURN_MS)).turn, 'a reload shows the same picture')
  assert.notEqual(splashNow(t).tip, splashNow(t + TIP_MS).tip)
  assert.ok(HOUSE_TIPS.includes(splashNow(t).tip))
  const rooms = read('../src/screens/Rooms.jsx')
  assert.ok(rooms.includes("const splash = lookOn('splash') ? (room ?? SPLASH_OF[loop] ?? null) : null"))
  assert.ok(rooms.includes('<Loop which={loop}><LiveSplash room={splash} calm={calm} /></Loop>'), 'a loop file still wins if Jon ever drops one in')
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("const decorRoom = which === 'decor' && SPLASHES[DECOR_ROOM] ? DECOR_ROOM : null"), 'a second display shows its room’s splash, calmer')
  assert.ok(kiosk.includes("if (!open && lookOn('splash')) return <Idle title=\"The bedroom\" line=\"The door is closed.\" loop=\"bedroom\" />"), 'the closed door is Sir Irwin waiting at it')
})

test('celebrate is safe on a phone: the burst lands where the win is, and a miss never shakes the whole page', () => {
  const src = read('../src/lib/celebrate.js')
  assert.ok(src.includes('page && win ? { left: 0, top: 0, width: win.innerWidth, height: win.innerHeight } : host.getBoundingClientRect()'), 'over the whole page the pieces are placed in the window, so a scrolled page does not put them off the screen')
  assert.ok(src.includes('const el = at instanceof Element ? at : page ? null : host') && src.includes('if (!el) return spec.ms'), 'a miss shakes its card or its box, never the body (the tab bar would jump)')
  assert.ok(src.includes("matchMedia?.('(prefers-reduced-motion: reduce)')"), 'less movement when the phone asks for it: the sound, no pieces')
})
