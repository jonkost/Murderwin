// Irwin's progress bar on the Parlour TV while the Manor counts (handoffs 9 and 14 Nov 2026).
// What the bar is told: its cards, how long it runs, how far it has got; and that it is told once per
// key, never at every redraw of the screen. Stand-in cards only: the real ones come from the night.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { irwinCards, irwinMessage, IRWIN_BAR_FILE, END_ROOM_MS, WAIT_MS } from '../src/lib/irwinbar.js'

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const t0 = 1_000_000
const finale = (extra = {}) => ({
  at: new Date(t0), schedule: { stats: 0, awards: 34_000, graph: 50_000, names: 80_000 }, held: 0, holdAt: null,
  stats: [
    { label: 'Fastest light puzzle', value: 'A stand-in pair, 6 min 12 s', showAt: 0 },
    { label: 'Time on the drawing', value: '17 min', showAt: 4000 },
  ],
  achievements: [
    { name: 'A stand-in guest', title: 'A stand-in title', line: 'A stand-in line.', showAt: 34_000 },
    { name: 'Another stand-in', title: 'A second title', line: null, showAt: 37_000 },
  ],
  ...extra,
})

test('the cards: each stat, then each achievement the host gave, in plain text and with no new words', () => {
  assert.deepEqual(irwinCards(finale()), [
    { tag: '', title: 'Fastest light puzzle', detail: 'A stand-in pair, 6 min 12 s' },
    { tag: '', title: 'Time on the drawing', detail: '17 min' },
    { tag: 'Achievements', title: 'A stand-in title', detail: 'A stand-in guest · A stand-in line.' },
    { tag: 'Achievements', title: 'A second title', detail: 'Another stand-in' },
  ])
  assert.deepEqual(irwinCards(finale({ achievements: [] })).map(c => c.tag), ['', ''], 'a night with no achievements: the stats alone')
  assert.deepEqual(irwinCards({}), [], 'nothing to show is no cards, never a crash')
  assert.deepEqual(irwinCards(finale({ stats: [{ label: ' ', value: '' }, null], achievements: [{}] })), [], 'an empty line is no card')
  // the end credits' awards and the arcade's scores stay in the credits: only these two lists are read
  const lib = src('lib/irwinbar.js')
  assert.ok(!/credits|arcade|names|epilogue|graph\b(?!')/.test(lib.replace(/\/\/.*$/gm, '').replace(/schedule\?\.graph|span/g, '')), 'the bar reads the stats and the achievements, nothing else of the finale')
})

test('what the bar is told: started once per key, with the time already gone; never at a redraw', () => {
  const f = finale()
  const first = irwinMessage(f, t0 + 10_000)
  assert.equal(first.message.type, 'irwin:start')
  assert.equal(first.message.seconds, (50_000 - END_ROOM_MS) / 1000, 'full a little before the screen moves on, so the butterfly is seen to fly off')
  assert.equal(first.message.elapsed, 10)
  assert.equal(first.message.cards.length, 4)
  // the screen redraws four times a second: the key does not move with the clock, so nothing is sent again
  const keys = new Set()
  for (let ms = 0; ms <= 49_000; ms += 250) keys.add(irwinMessage(f, t0 + ms).key)
  assert.equal(keys.size, 1, 'one key for the whole run')
  // a screen that reloads half way starts the bar half way
  assert.equal(irwinMessage(f, t0 + 25_000).message.elapsed, 25)
  // in its last moments the bar is simply full
  assert.equal(irwinMessage(f, t0 + 49_500).message.elapsed, (50_000 - END_ROOM_MS) / 1000)
  // the component sends only when the key changes
  const jsx = src('screens/IrwinBar.jsx')
  assert.match(jsx, /if \(state !== 'bar' \|\| told\.current === key\) return/, 'the same key is never sent twice')
  assert.match(jsx, /\}, \[state, key\]\)/, 'the send waits on the bar being ready and on the key, not on the clock')
  assert.ok(!/\[state, key, (now|message)/.test(jsx), 'never on the moving time')
})

test('a hold stands the bar still; the carry-on starts it again from where it stood', () => {
  const run = (50_000 - END_ROOM_MS)
  const holding = finale({ holdAt: new Date(t0 + 10_000) })
  const a = irwinMessage(holding, t0 + 12_000), b = irwinMessage(holding, t0 + 40_000)
  assert.deepEqual(a.message, { type: 'irwin:progress', p: 10_000 / run, cards: irwinCards(holding) }, 'the cards go with it: a screen loaded during the hold has never been started')
  assert.deepEqual(b.message, a.message, 'however long the hold lasts')
  assert.equal(a.key, b.key)
  assert.notEqual(a.key, irwinMessage(finale(), t0 + 10_000).key, 'the hold is a new key, so it is sent')
  // carried on 60 s later, as the server writes it: the graph mark and held move on by the hold
  const carried = finale({ schedule: { stats: 0, awards: 94_000, graph: 110_000, names: 140_000 }, held: 60_000 })
  const c = irwinMessage(carried, t0 + 70_000)
  assert.notEqual(c.key, a.key, 'a new key again')
  assert.equal(c.message.type, 'irwin:start')
  assert.equal(c.message.seconds, run / 1000, 'the same length as before the hold')
  assert.equal(c.message.elapsed, 10, 'and on from where it stood')
})

test('new cards are a new key; the same cards with moved times are not', () => {
  const f = finale()
  const k = irwinMessage(f, t0 + 1000).key
  assert.equal(irwinMessage(finale({ stats: f.stats.map(s => ({ ...s, showAt: s.showAt + 60_000 })) }), t0 + 1000).key, k, 'a carry-on moves the times, not the words')
  assert.notEqual(irwinMessage(finale({ achievements: [] }), t0 + 1000).key, k)
})

test('the bar is a page of its own in the site, it answers when called, and the plain bar stays underneath', () => {
  const file = new URL(`../public/${IRWIN_BAR_FILE}`, import.meta.url)
  assert.ok(existsSync(file), 'play/public/irwin-progress-bar.html is there')
  const page = readFileSync(file, 'utf8')
  for (const word of ["'irwin:start'", "'irwin:progress'", "'irwin:ready'", "'irwin:hello'", 'body.embed']) assert.ok(page.includes(word), `the page knows ${word}`)
  assert.ok(!/<script[^>]+src=|<img|<audio|<video|fetch\(|XMLHttpRequest|localStorage/.test(page), 'no outside code, pictures, sound or requests')
  assert.equal((page.match(/https?:\/\/[^"')\s]+/g) ?? []).filter(u => !u.startsWith('http://www.w3.org/')).join(), 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600&display=swap', 'its only address is the one font')
  assert.ok(WAIT_MS >= 1000 && WAIT_MS <= 3000 && END_ROOM_MS >= 1600 && END_ROOM_MS <= 4000)
  // from the review of 14 Nov: in the frame the bar starts with no cards, never the preview's samples; a held bar takes its cards;
  // the font does not hold the script back; a start that lands where the bar stands does not start his bow again
  assert.ok(page.indexOf('const EMBED=') < page.indexOf('let cards=EMBED?[]:SAMPLE_CARDS') && page.indexOf('const EMBED=') > 0, 'no sample cards inside the frame')
  assert.match(page, /d\.type==='irwin:progress'\)\{if\(Array\.isArray\(d\.cards\)\)window\.IrwinBar\.setCards\(d\.cards\)/)
  assert.match(page, /<link rel="stylesheet" media="print" onload="this\.media='all'" href="https:\/\/fonts\.googleapis\.com/)
  assert.match(page, /if\(Math\.abs\(np-progress\)>0\.02\)\{reset\(\)/)
  // a screen that has fallen back to the plain bar stays on it
  assert.match(src('screens/IrwinBar.jsx'), /setState\(s => \(s === 'wait' \? 'bar' : s\)\)/)
  const kiosk = src('screens/Kiosk.jsx')
  const at = kiosk.indexOf("if (stage === 'stats' || stage === 'awards') return (")
  const block = kiosk.slice(at, kiosk.indexOf("if (stage === 'graph')", at))
  assert.match(block, /<div className=\{`kiosk finale \$\{stage\}`\}>\s*<IrwinBar finale=\{finale\} now=\{now\} \/>/, 'the first child, in both stages')
  for (const kept of ['<CalcBar finale={finale} now={now} />', '<StatsReel', '<AwardsReel']) assert.ok(block.includes(kept), `${kept} is still drawn underneath`)
  const css = src('styles.css')
  assert.match(css, /\.irwin-bar\[data-state="plain"\] \{ display: none; \}/, 'the frame goes if the bar never says it is ready')
  // its state is a data attribute: a class named after a state met an old rule called .bar and squeezed the frame to a strip
  assert.match(src('screens/IrwinBar.jsx'), /<div className="irwin-bar" data-state=\{state\} aria-hidden="true">/)
  assert.ok(!/className=\{`irwin-bar /.test(src('screens/IrwinBar.jsx')), 'no state in the class name')
  assert.match(css, /\.irwin-bar \{[^}]*pointer-events: none/, 'it takes no clicks')
  assert.ok(!/irwin-bar/.test(src('screens/Host.jsx')) , 'nothing new for the host to press')
})
