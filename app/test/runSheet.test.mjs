import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RUN_INTRO, RUN_SHEET, pressesOf, piecesOf } from '../src/lib/runSheet.js'

// The Game night page's two cards for the day itself (12 Nov 2026, Jon: the
// setup and the running of the show must be simple): Set up the house and
// Run the night. The run card must stay the night as the phone runs it: every
// press it names is a button on the host's phone, by its own name, and the
// number of Nexts it counts is the night's own beats.

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const night = JSON.parse(read('../../seed/night.json'))
const plain = s => s.replace(/’/g, "'")
const phone = plain(['Host.jsx', 'Relay.jsx', 'GoodNight.jsx'].map(f => read(`../../play/src/screens/${f}`)).join('\n'))
const keys = n => night.acts[n].beats.map(b => b.key)

test('every press on the card is a button on the host\'s phone', () => {
  const presses = [...new Set(RUN_SHEET.flatMap(r => pressesOf(r.text)))]
  assert.ok(presses.length >= 12, `found ${presses.length} presses`)
  for (const p of presses) assert.ok(phone.includes(plain(p)), `the phone has "${p}"`)
  for (const must of ['Blackout', 'Start Act 4', 'Cake!', 'At the paper', 'Hide this', 'Start the vote', 'Name the Murderer', 'Name the Motive', 'Name the Victim', 'Good night', 'Phone chime']) {
    assert.ok(presses.includes(must), `the card names ${must}`)
  }
  assert.ok(presses.includes('Supper’s ready'), 'and Supper’s ready')
})

test('the acts are the night\'s own, in order, and nothing on the card is a long dash', () => {
  const acts = RUN_SHEET.filter(r => r.act != null)
  assert.deepEqual(acts.map(r => r.act), [1, 2, 3, 4, 5, 6, 7])
  for (const r of acts) assert.equal(r.title, `Act ${r.act}, ${night.acts[r.act].name}`)
  assert.equal(RUN_SHEET.at(-1).title, 'Any time')
  for (const s of [RUN_INTRO, ...RUN_SHEET.flatMap(r => [r.title, r.text])]) assert.ok(!s.includes('—'), s)
})

test('the Nexts the card counts are the night\'s beats', () => {
  // Act 1: the film, then three Nexts to Ready for the dark, then Blackout
  assert.deepEqual(keys(1), ['arrive', 'rules', 'meet', 'introduce', 'ready'])
  // Act 2: three Nexts to the cat visits, supper by itself, one more Next
  assert.deepEqual(keys(2), ['orient', 'news', 'peek', 'cat', 'supper'])
  // Act 3: Next arms the bulletin, Next for the wrap-up, then Start Act 4
  assert.deepEqual(keys(3), ['down', 'bulletin', 'wrap'])
  assert.equal(night.acts[3].beats[1].action, 'arm:bulletin')
  // Act 5: Cake!, then three Nexts (Sir Irwin, the motives, Act 6)
  assert.deepEqual(keys(5), ['roam', 'irwin', 'update'])
  // Act 6: the games and the drawing by themselves, then two Nexts, then Start the vote
  assert.deepEqual(keys(6), ['games', 'drawing', 'door', 'talk'])
  // Act 7: the vote, the reveal's three names, the results, The End
  assert.deepEqual(keys(7), ['ballot', 'reveal', 'result', 'end'])
  const text = n => RUN_SHEET.find(r => r.act === n).text
  assert.match(text(1), /\*\*Next\*\* three times, and \*\*Blackout\*\*/)
  assert.match(text(2), /\*\*Next\*\* three times/)
  assert.match(text(5), /\*\*Next\*\* three times/)
  assert.match(text(6), /\*\*Next\*\* twice/)
  assert.match(text(6), /start by themselves: press nothing/)
  assert.match(text(4), /every fifteen minutes/)
  assert.equal(night.act4.roundMinutes, 15)
})

test('the pieces for the page: the presses in bold, the words kept whole', () => {
  const pieces = piecesOf('Press **Cake!** when it is served, then **Next**.')
  assert.deepEqual(pieces, [
    { text: 'Press ', press: false }, { text: 'Cake!', press: true },
    { text: ' when it is served, then ', press: false }, { text: 'Next', press: true }, { text: '.', press: false },
  ])
  for (const r of RUN_SHEET) assert.equal(piecesOf(r.text).map(x => x.text).join(''), r.text.replace(/\*\*/g, ''))
})

test('both cards are on the Game night page, above the fold, and the stale steps are gone', () => {
  const page = read('../src/pages/Night.jsx')
  const fold = page.indexOf('<details className="panel more">')
  for (const up of ['<h2>Set up the house</h2>', '<h2>Run the night</h2>', '{SWITCH_ON.map(', '{RUN_SHEET.map(']) assert.ok(page.indexOf(up) > 0 && page.indexOf(up) < fold, `${up} is in view`)
  assert.ok(page.indexOf('<StartNight />') < page.indexOf('<h2>Set up the house</h2>'), 'under the Start button')
  assert.ok(!/Host\? Start the night|Power returns/.test(page), 'the old steps are gone')
  assert.ok(!page.includes('Tick it on the day of the party'), 'the old party box no longer says to tick it')
  assert.ok(page.includes('The Start the night button never reads this box.'), 'it says what is true')
})
