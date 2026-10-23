import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { fakeNight, codesIn, PHONES } from '../fake-players.mjs'
import { FakeFirestore } from '../../functions/test/fake-firestore.mjs'
import { NOTICES, ROLE_CARDS, STATION_TEXT, DEFAULT_SCRAP, DEFAULT_NUMBERS_LINE, HINT_PLACEHOLDER, LIGHTS_TEXT } from '../../functions/lib/deal.js'
import { NEWS_FLASH_PLACEHOLDER } from '../../functions/lib/screen.js'
import { STUDY_PLACEHOLDER } from '../../functions/lib/station.js'

// The fake players print counts, keys and act names and nothing a phone was
// dealt. These are the strings a leak would carry; none may reach the output.
const CARD_TEXT = [
  'Rehearsal', 'Synthetic',
  ...Object.values(NOTICES).map(n => n.text),
  ...Object.values(ROLE_CARDS),
  ...Object.values(STATION_TEXT).map(s => s.text),
  STUDY_PLACEHOLDER, DEFAULT_SCRAP.text.slice(0, 30), DEFAULT_NUMBERS_LINE.slice(0, 20),
  HINT_PLACEHOLDER, NEWS_FLASH_PLACEHOLDER, ...Object.values(LIGHTS_TEXT).map(l => l.text.slice(0, 30)),
  'From the memory match', 'Cross it off',
]

function assertClean(text) {
  for (const s of CARD_TEXT) assert.ok(!text.includes(s), `output carries a card string of length ${s.length}`)
}

// Everything the console saw while the night ran, including the dealer's own lines.
async function captured(fn) {
  const lines = []
  const real = console.log
  console.log = (...a) => lines.push(a.map(String).join(' '))
  try { return { result: await fn(line => lines.push(line)), lines } } finally { console.log = real }
}

const keysUnder = (db, prefix) => [...db.store.keys()].filter(k => k.startsWith(prefix))

test('codesIn pulls the three numbers out of the numbers sentence and nothing else', () => {
  assert.deepEqual(codesIn('If it matters, the numbers were 12, 34 and 56.', DEFAULT_NUMBERS_LINE), [12, 34, 56])
  assert.deepEqual(codesIn('Before. If it matters, the numbers were 7, 8 and 9. After.', DEFAULT_NUMBERS_LINE), [7, 8, 9])
  assert.equal(codesIn('Nothing about numbers here.', DEFAULT_NUMBERS_LINE), null)
  assert.equal(codesIn('Numbers 1, 2 and 3.', 'Numbers [A], [B] and [C] (said twice).'), null, 'the whole template must match')
  assert.deepEqual(codesIn('On it, in a careful paw: 10, 20 and 30.', 'On it, in a careful paw: [A], [B] and [C].'), [10, 20, 30])
})

test('eight fake phones walk the whole night on stand-ins, pass the seal, and the night is gone afterwards', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', party_night: true }) // the box is ticked, and still ignored without --real-secrets
  const { result: summary, lines } = await captured(log => fakeNight({ db, log }))
  const out = lines.join('\n')
  assertClean(out)
  assert.equal(summary.ok, true, out)
  assert.equal(summary.rehearsal, true, 'stand-ins unless --real-secrets')
  assert.equal(summary.error, null)
  for (const act of [1, 2, 3, 4, 5, 6, 7]) assert.ok(lines.some(l => l.startsWith(`Act ${act}, `)), `one line for act ${act}`)
  assert.equal(lines.filter(l => /^Act \d, /.test(l)).length, 7, 'exactly one line per act')
  assert.ok(lines.some(l => /^Tally: of 8 ballots/.test(l)))
  assert.ok(lines.some(l => /^Seal: PASS, \d+ checks$/.test(l)))
  assert.ok(lines.some(l => /^Discarded night .*: case 1, night 1/.test(l)))
  assert.equal(lines.at(-1), 'PASS')
  assert.equal(summary.seal.failed.length, 0)
  assert.ok(summary.seal.checks > 100)
  assert.equal(summary.tally.of, PHONES)
  // the counts say the whole night happened
  const line = n => lines.find(l => l.startsWith(`Act ${n}, `))
  assert.match(line(2), /8 role cards/)
  assert.match(line(2), /8 cat visits/)
  assert.match(line(2), /safe opened on 8 phones \(0 gave way\)/)
  assert.match(line(2), /8 documents/)
  assert.match(line(3), /4 groups/)
  // twelve Parlour Games a night, planned five, five and two in Acts 2, 4 and 6, every phone answering
  assert.match(line(2), /5 Parlour Games, 40 answers/)
  // eight study clues, and the memory match's cross-off on the phones of every group that cleared it
  assert.match(line(4), /5 rotations, 4 groups through the study, \d+ memory matches cleared, 40 station cards, (1[2-6]) clues, 5 Parlour Games, 40 answers/)
  assert.match(line(5), /4 motives crossed off by the memory match/, 'every group crossed one off by the end of Act 4')
  // the Act 2 rooms (F20, F21) and the motive funnel (G32), as pass or fail and counts
  assert.ok(lines.some(l => /^Act 2 rooms: 8 visits in \d+ waves; one guest at a cat at a time \(F20\) PASS; every phone told where to go \(F21\) PASS$/.test(l)))
  assert.ok(lines.some(l => /^Motive funnel: PASS, \d+ left after Sir Irwin named [123]$/.test(l)))
  assert.deepEqual(summary.checks, [])
  assert.match(line(6), /2 Parlour Games, 16 answers/)
  assert.match(line(6), /drawing done in \d+ turns and \d+ votes/)
  assert.match(line(6), /8 strikes/)
  assert.match(line(7), /8 ballots, 8 results/)
  // and then it is all gone
  assert.equal(keysUnder(db, 'cases/').length, 0)
  assert.equal(keysUnder(db, 'nights/').length, 0)
  assert.equal(keysUnder(db, 'sessions/').length, 0)
  assert.equal(db.store.get('public_state/active').nightId, null)
  assert.ok(db.store.has('meta/game'), 'the workshop settings stay')
})

// A synthetic sealed motive set in the generator's shape, bracketed, made
// here and thrown away with the test. Never printed.
function syntheticSealed(word) {
  const v = n => `(Synthetic ${word} ${n})`
  const truth = n => `(Synthetic ${word} ${n}: a lantern was left in [ROOM] at [TIME].)`
  const long = n => `(Synthetic ${word} document ${n}. ${Array.from({ length: 44 }, (_, i) => `w${i}`).join(' ')}.)`
  return {
    kernels: {
      irwin: [truth('irwin one'), truth('irwin two'), truth('irwin three')],
      boo: [truth('boo one'), truth('boo two'), truth('boo three')],
      granolia: [truth('granolia one'), truth('granolia two'), truth('granolia three')],
      zimothy: [`(Synthetic ${word} zimothy one: the lantern, at [TIME].)`, truth('zimothy two'), truth('zimothy three')],
      salem: [1, 2, 3].map(n => ({ text: `(Synthetic ${word} salem ${n}: the lantern was never in [ROOM].)`, anchor: 'lantern' })),
    },
    documents: [1, 2, 3].map(n => ({ text: long(n), emphasis: 'LANTERN', annotation: `(Synthetic ${word} note ${n})` })),
    fragments: [v('fragment one'), v('fragment two'), v('fragment three')],
    studyClue: [v('study one'), v('study two'), v('study three')],
    irwin: [v('dog one'), v('dog two'), v('dog three')],
    generatedAt: new Date(0),
  }
}

test('--real-secrets draws a sealed set as a dry run, prints no more than before, and discards the case', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  db.store.set('sealed/manifest', { codes: { AAAAA: 5, BBBBB: 11 } })
  db.store.set('sealed/AAAAA', syntheticSealed('alpha'))
  db.store.set('sealed/BBBBB', syntheticSealed('beta'))
  const { result: summary, lines } = await captured(log => fakeNight({ db, log, realSecrets: true }))
  const out = lines.join('\n')
  assertClean(out)
  assert.equal(summary.ok, true, out)
  assert.equal(summary.rehearsal, false, 'the sealed set was used')
  assert.ok(lines.some(l => l === 'Case: sealed'), 'no fallback warning')
  assert.match(lines.find(l => l.startsWith('Act 2, ')), /safe opened on 8 phones \(0 gave way\)/, 'the numbers ride in the real testimony too')
  assert.equal(keysUnder(db, 'cases/').length, 0, 'the dry run case is discarded')
  assert.equal(keysUnder(db, 'nights/').length, 0)
  assert.ok(db.store.has('sealed/AAAAA'), 'the sealed store is untouched')
})

test('a failure mid-night still discards the night and exits FAIL', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', {})
  // one phone: there is nobody to group with in Act 3, so the night stops there
  const { result: summary, lines } = await captured(log => fakeNight({ db, log, phones: 1 }))
  assert.equal(summary.ok, false)
  assert.ok(summary.error, 'the stop is recorded')
  assert.ok(lines.some(l => l.startsWith('Stopped: ')))
  assert.ok(lines.some(l => l.startsWith('Discarded night ')), 'the night is discarded on the way out')
  assert.equal(lines.at(-1), 'FAIL')
  assert.equal(keysUnder(db, 'nights/').length, 0)
  assert.equal(keysUnder(db, 'cases/').length, 0)
  assertClean(lines.join('\n'))
})

test('the command line: exit 0, one line per act, a tally, nothing a phone was dealt', () => {
  const script = fileURLToPath(new URL('../fake-players.mjs', import.meta.url))
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stdout + r.stderr)
  const out = r.stdout + r.stderr
  assertClean(out)
  assert.equal(out.match(/^Act \d, /gm).length, 7)
  assert.match(out, /^Tally: /m)
  assert.match(out, /^PASS\s*$/m)
  // the live project is refused without the second flag, before anything is opened
  const refused = spawnSync(process.execPath, [script, '--live'], { encoding: 'utf8', env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: '' } })
  assert.equal(refused.status, 2)
  assert.match(refused.stdout, /Refusing/)
})
