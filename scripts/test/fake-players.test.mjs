import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { fakeNight, PHONES, SEAT_DEALS } from '../fake-players.mjs'
import { FakeFirestore } from '../../functions/test/fake-firestore.mjs'
import { NOTICES, ROLE_CARDS, FREE_TIME_TIPS, HINT_PLACEHOLDER, HINT_QUIET, LIGHTS_TEXT, NIGHT } from '../../functions/lib/deal.js'
import { DIRECTIONS, REWARD_LINES } from '../../functions/lib/act4.js'
import { NEWS_FLASH_PLACEHOLDER } from '../../functions/lib/screen.js'
import { STUDY_PLACEHOLDER, STUDY_QUIET } from '../../functions/lib/station.js'
import { ROUND_SIZES } from '../../functions/lib/relay-bank.js'
import { CHARACTERS } from '../../functions/lib/night.js'

// The fake players print counts, keys and act names and nothing a phone was
// dealt. These are the strings a leak would carry; none may reach the output.
const CARD_TEXT = [
  'Rehearsal', 'Synthetic',
  ...Object.values(NOTICES).map(n => n.text),
  ...Object.values(ROLE_CARDS),
  ...Object.values(DIRECTIONS), ...Object.values(REWARD_LINES).flatMap(r => [r.done.slice(0, 30), r.capped.slice(0, 30)]), ...FREE_TIME_TIPS,
  STUDY_PLACEHOLDER, HINT_PLACEHOLDER, NEWS_FLASH_PLACEHOLDER, STUDY_QUIET, HINT_QUIET.replace('[CAT]', '').trim(), ...Object.values(LIGHTS_TEXT).map(l => l.text.slice(0, 30)),
  'From the Library', 'Cross it off', "bag clue about the", "motive hint appears here",
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
    'sealed/bags': (() => {
      // ten bags, each with two bracketed words, each word in two or three bags
      const words = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), { [`(Synthetic ${i % 4})`]: ['touch'], [`(Synthetic ${4 + (i % 3)})`]: ['smell'] }]))
      const properties = {}
      for (const [n, ws] of Object.entries(words)) for (const w of Object.keys(ws)) (properties[w] ??= []).push(Number(n))
      return { words, properties, packedAt: new Date(0) }
    })(),
    'sealed/relay_pictures': { pictures: [1, 2, 3].map(picture) },
  }
}

// "Case: party" or "Case: rehearsal", with at most the one warning a random deal can bring
// (a trace with no look-alike among the guests, more likely since the hosts play the Professors)
const caseLine = (l, kind) => l === `Case: ${kind}` || l === `Case: ${kind}; warning: one trace at the party has no look-alike among the guests`

test('F01, F24 and L03 eight fake phones walk the whole night on stand-ins, pass the seal, and the night is gone afterwards', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan', party_night: true }) // the box is ticked, and still ignored without --real-secrets
  for (const [path, data] of Object.entries(syntheticSecrets())) db.store.set(path, data) // there, and a rehearsal never reads them
  const reads = readsOf(db)
  const { result: summary, lines } = await captured(log => fakeNight({ db, log }))
  const out = lines.join('\n')
  assertClean(out)
  assert.equal(summary.ok, true, out)
  assert.equal(summary.rehearsal, true, 'stand-ins unless --real-secrets')
  // the deal is random: a trace with no look-alike at the party is the only warning a night may carry
  assert.ok(lines.some(l => caseLine(l, 'rehearsal')), 'Case: rehearsal')
  // a rehearsal reads no lean, no picture and no motive set; the packing only
  // for its count of bags when the night is made (night.js packedBagCount), never for a clue
  assert.deepEqual([...reads].filter(p => p.startsWith('sealed/')), ['sealed/bags'], 'a rehearsal reads nothing else sealed')
  assert.ok(lines.includes('Party secrets used: the cats\' leans for 0 sets, the packing on 0 of 64 bag clues, the picture bank for 0 of 3 drawing rounds'))
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
  // every cat gives a motive hint and a bag clue (23 Oct 2026): four of each per phone
  assert.match(line(2), /32 motive hints and 32 bag clues/)
  assert.doesNotMatch(line(2), /safe|documents|greetings/, 'the Act 2 safe and the greeting-only cats are gone')
  // twelve Parlour Games a night, planned five, five and two in Acts 2, 4 and 6, every phone answering
  assert.match(line(2), /5 Parlour Games, 40 answers/)
  // four groups walk the four rooms; every room pays every group (G47, G52); Act 4's games wait on the phones
  assert.match(line(4), /4 groups, 4 rounds, 32 room rewards, \d+ through the study, \d+ memory matches cleared, \d+ Salem games cleared, 4 catwalks, [1-5] waiting Parlour Games, \d+ played/)
  assert.match(line(5), /8 motives crossed off by the Library and Boo/, 'every group crossed two off by the end of Act 4')
  // the Act 2 rooms (F20, F21, F24) and the motive funnel (G32), as pass or fail and counts
  assert.ok(lines.some(l => /^Act 2 rooms: 32 visits in \d+ waves; one guest at a cat at a time \(F20\) PASS; every phone told where to go \(F21\) PASS; supper on its own \(F24\) PASS$/.test(l)))
  assert.ok(lines.some(l => /^Motive funnel: PASS, \d+ left after Sir Irwin named [1-5]$/.test(l)))
  assert.deepEqual(summary.checks, [])
  assert.match(line(6), /[2-5] Parlour Games, \d+ answers/, 'the two of Act 6 and any Act 4 could not fit')
  // the guess goes through the one relay.guess call, the same as the host's phone and the TV (25 Oct 2026): the line no longer names a place
  assert.match(line(6), /drawing done in \d+ turns and \d+ guesses \(\d+ misses\)/)
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
  assert.ok(lines.some(l => caseLine(l, 'party')), 'no warning about missing sealed content')
  assert.deepEqual([...reads].filter(p => p.startsWith('sealed/')).sort(), [...SECRETS].sort(), 'the three secrets, and never sealed/manifest or a motive set')
  assert.deepEqual(summary.secrets, { leanSets: 2, bags: 64, packed: 64, fromBank: 3 })
  assert.ok(lines.includes('Party secrets used: the cats\' leans for 2 sets, the packing on 64 of 64 bag clues, the picture bank for 3 of 3 drawing rounds'))
  assert.match(lines.find(l => l.startsWith('Act 2, ')), /32 motive hints and 32 bag clues/)
  assert.equal(keysUnder(db, 'cases/').length, 0, 'the dry run case is discarded')
  assert.equal(keysUnder(db, 'nights/').length, 0)
  for (const [path, data] of Object.entries(secrets)) assert.deepEqual(db.store.get(path), data, 'the sealed store is untouched')
  assert.deepEqual(summary.seal.failed, [], 'no public doc carried a recording by its name')
})

test('F02 and G05 the two host seats play the Professors and are played by bots like every other seat; every seat lands Murderer and Ghost about equally often', async () => {
  const db = new FakeFirestore()
  // the hosts' names come from the Game night form, spelled however Jon types them
  db.store.set('meta/game', { host_jonathan: 'Jonathan K', host_susan: 'Sue' })
  // the roster as the night last held it, before the discard (keys and character ids only)
  let roster = null
  const get = db._get.bind(db)
  db._get = path => { const snap = get(path); if (/^nights\/[^/]+$/.test(path) && snap.exists && snap.data()?.roster) roster = snap.data().roster; return snap }
  const { result: summary, lines } = await captured(log => fakeNight({ db, log }))
  assertClean(lines.join('\n'))
  assert.equal(summary.ok, true)
  assert.deepEqual(summary.checks, [])
  const profs = CHARACTERS.filter(ch => ch.host).map(ch => ch.id)
  assert.equal(roster?.jonathan_k?.characterId, profs[0], 'F02 the first host seat plays the first Professor')
  assert.equal(roster?.sue?.characterId, profs[1], 'F02 the second host seat plays the second Professor')
  assert.equal(Object.keys(roster).length, PHONES, 'F02 the hosts are two of the eight phones, not extra ones')
  assert.ok(lines.includes('Host seats: 2 phones play the Professors, dealt and answered like everyone else (F02) PASS'))
  // G05: the case deal itself, on 2,000 stand-in rosters with both host seats in them
  assert.deepEqual(summary.fairness, { pass: true, seats: 12, of: 12, deals: SEAT_DEALS })
  assert.ok(lines.includes('Seat fairness (G05): PASS, 12 of 12 seats fair over 2,000 dealt cases, both host seats included'))
})

test('G38 no hidden events for the Murderer or the Ghost in any act: no beat opens one, and over a whole night every phone gets the same windows and the same cards, kind by kind and act by act', async () => {
  // the night as written: no beat in any act opens an event, and the only windows are the three everyone gets
  assert.deepEqual(Object.keys(NIGHT.windows).sort(), ['ballot', 'eliminate', 'questions'], 'G38 three kinds of window, all for everyone')
  for (const [act, spec] of Object.entries(NIGHT.acts)) {
    for (const b of spec.beats) {
      assert.ok(!/event|hidden/i.test(`${b.action ?? ''} ${b.key}`), `G38 act ${act} beat ${b.key} opens no event`)
      if (String(b.action ?? '').startsWith('window:')) assert.ok(['window:questions', 'window:eliminate', 'window:ballot'].includes(b.action), `G38 act ${act} beat ${b.key} opens a window for everyone`)
    }
  }
  // a whole night: every phone as it ended (read before the discard), compared shape by shape
  const db = new FakeFirestore()
  db.store.set('meta/game', { host_jonathan: 'Jon', host_susan: 'Susan' })
  const last = {}
  let roles = null
  const get = db._get.bind(db)
  db._get = path => {
    const snap = get(path)
    if (snap.exists && /^sessions\/[^/]+$/.test(path)) last[path] = snap.data()
    if (snap.exists && /^cases\/[^/]+$/.test(path) && snap.data()?.roles) roles = snap.data().roles
    return snap
  }
  const { result: summary } = await captured(log => fakeNight({ db, log }))
  assert.equal(summary.ok, true)
  const phones = Object.values(last).filter(s => s.guestKey)
  assert.equal(phones.length, PHONES)
  assert.deepEqual([...new Set(Object.values(roles))].sort(), ['detective', 'ghost', 'murderer'], 'the night dealt all three roles')
  // the windows: the same ids, the same kinds, on every phone
  const windows = s => JSON.stringify(Object.entries(s.windows ?? {}).map(([id, w]) => [id, w.kind]).sort())
  assert.ok(phones.every(s => windows(s) === windows(phones[0])), 'G38 every phone holds the same windows')
  assert.ok(Object.values(phones[0].windows).every(w => ['questions', 'eliminate', 'ballot'].includes(w.kind)))
  // the cards: the same number of each kind in each act, on every phone, whatever its role
  const shape = s => JSON.stringify((s.cards ?? []).map(c => `${c.act}:${c.kind}`).sort())
  assert.ok(phones.every(s => shape(s) === shape(phones[0])), 'G38 every phone holds the same kinds of card in every act')
  // and every answer on every phone, so nobody sat out a game the others played
  const answered = s => Object.keys(s.answers ?? {}).sort().join()
  assert.ok(phones.every(s => answered(s) === answered(phones[0])), 'G38 every phone answered the same Parlour Games')
})

test('a failure mid-night still discards the night and exits FAIL', async () => {
  const db = new FakeFirestore()
  db.store.set('meta/game', {})
  // one phone: there is nobody to group with when Act 4 starts, so the night stops there
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

test('G22 a fake rehearsal is dealt from a seed word and prints it; the party dry run never takes one', async () => {
  const lines = []
  const s = await fakeNight({ db: new FakeFirestore(), log: l => lines.push(l), seed: 'heron-2024' })
  assert.equal(s.ok, true)
  assert.equal(s.seed, 'heron-2024')
  assert.match(lines[0], /, seed heron-2024$/)
  const fresh = await fakeNight({ db: new FakeFirestore(), log: () => {} })
  assert.match(fresh.seed, /^[a-z]+-\d{4}$/, 'a rehearsal with no word gets a fresh one')
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL('../fake-players.mjs', import.meta.url)), '--seed', 'heron-2024', '--real-secrets'], { encoding: 'utf8' })
  assert.equal(cli.status, 2)
  assert.match(cli.stdout, /never dealt from a word/)
})
