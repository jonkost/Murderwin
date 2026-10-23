import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { fakeNight, PHONES } from '../fake-players.mjs'
import { FakeFirestore } from '../../functions/test/fake-firestore.mjs'
import { NOTICES, ROLE_CARDS, STATION_TEXT, FREE_TIME_TIPS, HINT_PLACEHOLDER, LIGHTS_TEXT } from '../../functions/lib/deal.js'
import { NEWS_FLASH_PLACEHOLDER } from '../../functions/lib/screen.js'
import { STUDY_PLACEHOLDER } from '../../functions/lib/station.js'
import { ROUND_SIZES } from '../../functions/lib/relay-bank.js'

// The fake players print counts, keys and act names and nothing a phone was
// dealt. These are the strings a leak would carry; none may reach the output.
const CARD_TEXT = [
  'Rehearsal', 'Synthetic',
  ...Object.values(NOTICES).map(n => n.text),
  ...Object.values(ROLE_CARDS),
  ...Object.values(STATION_TEXT).map(s => s.text), ...FREE_TIME_TIPS,
  STUDY_PLACEHOLDER, HINT_PLACEHOLDER, NEWS_FLASH_PLACEHOLDER, ...Object.values(LIGHTS_TEXT).map(l => l.text.slice(0, 30)),
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

// Every doc path the night reads, from the stand-in Firestore itself.
function readsOf(db) {
  const paths = new Set()
  const get = db._get.bind(db)
  db._get = path => { paths.add(path); return get(path) }
  return paths
}

// Throwaway stand-ins for the party's three secrets (the cats' leans, the
// packing, the drawing's picture bank), bracketed, in the shapes the night
// reads. Made here and thrown away with the test. Never printed.
const SECRETS = ['sealed/parlour_leans', 'sealed/bags', 'sealed/relay_pictures']
function syntheticSecrets() {
  const picture = round => ({
    id: `syn-${round}`, round, name: `(Synthetic sketch ${round})`,
    decoys: [1, 2, 3].map(i => `(Synthetic other ${round}.${i})`),
    cells: Object.fromEntries(Array.from({ length: ROUND_SIZES[round] }, (_, k) => [`${'ABCDE'[k]}1`, [{ kind: 'line', from: [0, 0], to: [1, 1] }]])),
  })
  return {
    'sealed/parlour_leans': { sets: {
      'rehearsal-1': { 0: { granolia: 'a', boo: 'b', zimothy: 'a', salem: 'b' } },
      'rehearsal-2': { 1: { granolia: 'b', boo: 'a', zimothy: 'b', salem: 'a' } },
    } },
    'sealed/bags': { properties: { '(Synthetic minty)': [1, 2], '(Synthetic rough)': [3, 4, 5] }, packedAt: new Date(0) },
    'sealed/relay_pictures': { pictures: [1, 2, 3].map(picture) },
  }
}

test('eight fake phones walk the whole night on stand-ins, pass the seal, and the night is gone afterwards', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', party_night: true }) // the box is ticked, and still ignored without --real-secrets
  for (const [path, data] of Object.entries(syntheticSecrets())) db.store.set(path, data) // there, and a rehearsal never reads them
  const reads = readsOf(db)
  const { result: summary, lines } = await captured(log => fakeNight({ db, log }))
  const out = lines.join('\n')
  assertClean(out)
  assert.equal(summary.ok, true, out)
  assert.equal(summary.rehearsal, true, 'stand-ins unless --real-secrets')
  assert.ok(lines.includes('Case: rehearsal'))
  // a rehearsal reads no lean, no picture and no motive set; the packing only
  // for its count of bags when the night is made (night.js packedBagCount), never for a clue
  assert.deepEqual([...reads].filter(p => p.startsWith('sealed/')), ['sealed/bags'], 'a rehearsal reads nothing else sealed')
  assert.ok(lines.includes('Party secrets used: the cats\' leans for 0 sets, the packing on 0 of 8 bags cards, the picture bank for 0 of 3 drawing rounds'))
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
  assert.match(line(2), /32 cat visits/)
  // the hint cat's card carries the open hint line and nothing else; the other three only greet
  assert.match(line(2), /8 real hints and 24 greetings/)
  assert.doesNotMatch(line(2), /safe|documents/, 'the Act 2 safe is gone')
  assert.match(line(3), /4 groups/)
  // twelve Parlour Games a night, planned five, five and two in Acts 2, 4 and 6, every phone answering
  assert.match(line(2), /5 Parlour Games, 40 answers/)
  // eight study clues, and the memory match's cross-off on the phones of every group that cleared it
  assert.match(line(4), /5 rotations, 4 groups through the study, \d+ memory matches cleared, 40 station cards, (1[2-6]) clues, 5 Parlour Games, 40 answers/)
  assert.match(line(5), /4 motives crossed off by the memory match/, 'every group crossed one off by the end of Act 4')
  // the Act 2 rooms (F20, F21) and the motive funnel (G32), as pass or fail and counts
  assert.ok(lines.some(l => /^Act 2 rooms: 32 visits in \d+ waves; one guest at a cat at a time \(F20\) PASS; every phone told where to go \(F21\) PASS$/.test(l)))
  assert.ok(lines.some(l => /^Motive funnel: PASS, \d+ left after Sir Irwin named [1-5]$/.test(l)))
  assert.deepEqual(summary.checks, [])
  assert.match(line(6), /2 Parlour Games, 16 answers/)
  assert.match(line(6), /drawing done in \d+ turns and \d+ guesses on the main computer/)
  assert.match(line(6), /8 strikes/)
  assert.match(line(7), /8 ballots, 8 results/)
  // and then it is all gone
  assert.equal(keysUnder(db, 'cases/').length, 0)
  assert.equal(keysUnder(db, 'nights/').length, 0)
  assert.equal(keysUnder(db, 'sessions/').length, 0)
  assert.equal(db.store.get('public_state/active').nightId, null)
  assert.ok(db.store.has('meta/game'), 'the workshop settings stay')
})

test('--real-secrets is a party night as a dry run: it reads the leans, the packing and the pictures, nothing else sealed, prints no more than before, and discards the case', async () => {
  const db = new FakeFirestore()
  // a station key saved, as on the party night: the seal walk then also checks no recording goes public by name
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', station_key: 'study-2026' })
  const secrets = syntheticSecrets()
  for (const [path, data] of Object.entries(secrets)) db.store.set(path, data)
  const reads = readsOf(db)
  const { result: summary, lines } = await captured(log => fakeNight({ db, log, realSecrets: true }))
  const out = lines.join('\n')
  assertClean(out)
  assert.equal(summary.ok, true, out)
  assert.equal(summary.rehearsal, false, 'a party case')
  assert.ok(lines.includes('Case: party'), 'no warning about missing sealed content')
  assert.deepEqual([...reads].filter(p => p.startsWith('sealed/')).sort(), [...SECRETS].sort(), 'the three secrets, and never sealed/manifest or a motive set')
  assert.deepEqual(summary.secrets, { leanSets: 2, bags: 8, packed: 8, fromBank: 3 })
  assert.ok(lines.includes('Party secrets used: the cats\' leans for 2 sets, the packing on 8 of 8 bags cards, the picture bank for 3 of 3 drawing rounds'))
  assert.match(lines.find(l => l.startsWith('Act 2, ')), /8 real hints and 24 greetings/)
  assert.equal(keysUnder(db, 'cases/').length, 0, 'the dry run case is discarded')
  assert.equal(keysUnder(db, 'nights/').length, 0)
  for (const [path, data] of Object.entries(secrets)) assert.deepEqual(db.store.get(path), data, 'the sealed store is untouched')
  assert.deepEqual(summary.seal.failed, [], 'no public doc carried a recording by its name')
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
