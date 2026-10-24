import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FakeFirestore } from './fake-firestore.mjs'
import { setStationKey } from '../lib/station.js'
import { studyTestRequest, cleanStatus, QUEUE_DOC, STATUS_DOC, QUEUE_KEEP, KEY_NAMES, TEXT_MAX } from '../lib/studytest.js'

// The Study test (lib/studytest.js): the workshop queues commands for the
// study station, the station reports how the walls are. Nothing here is
// sealed: the practice round is made up on the station and means nothing.

const KEY = 'study-2026'

async function house() {
  const db = new FakeFirestore()
  await setStationKey(db, KEY)
  return db
}

// Every doc path the database is asked for from here on (reads only).
function watchReads(db) {
  const paths = []
  const get = db._get.bind(db)
  db._get = path => { paths.push(path); return get(path) }
  return paths
}

const admin = (data) => ({ ...data, isAdmin: true })

test('flash, teach, practice, stop and key are for the workshop only, even with the station key', async () => {
  const db = await house()
  for (const command of ['flash', 'teach', 'practice', 'stop']) {
    await assert.rejects(studyTestRequest(db, { command }), e => e.code === 'permission-denied' && e.message === 'Only the workshop can do that.')
    await assert.rejects(studyTestRequest(db, { command, key: KEY }), e => e.code === 'permission-denied', `${command} with the station key`)
  }
  await assert.rejects(studyTestRequest(db, { command: 'key', name: 'red', key: KEY }), e => e.code === 'permission-denied')
  assert.equal(db.store.get(QUEUE_DOC), undefined, 'nothing was queued')
  const r = await studyTestRequest(db, admin({ command: 'flash' }))
  assert.deepEqual(r, { ok: true, seq: 1 })
})

test('key: only the button box names, and the name is kept; other commands carry no name', async () => {
  const db = await house()
  for (const name of ['purple', 'RED', ' red', '7', '0', 'blank', '', null, undefined, 3, ['red'], { name: 'red' }]) {
    await assert.rejects(studyTestRequest(db, admin({ command: 'key', name })), e => e.code === 'invalid', `refused ${JSON.stringify(name)}`)
  }
  assert.equal(db.store.get(QUEUE_DOC), undefined, 'nothing was queued')
  for (const name of KEY_NAMES) await studyTestRequest(db, admin({ command: 'key', name }))
  await studyTestRequest(db, admin({ command: 'teach', name: 'red' }))
  const q = db.store.get(QUEUE_DOC).queue
  assert.deepEqual(q.slice(0, KEY_NAMES.length).map(e => e.name), KEY_NAMES)
  assert.ok(q.slice(0, KEY_NAMES.length).every(e => e.command === 'key'))
  assert.deepEqual({ command: q.at(-1).command, name: q.at(-1).name }, { command: 'teach', name: null })
})

test('status needs the station key word (or the admin), and saves the report', async () => {
  const db = new FakeFirestore()
  const status = { mode: 'idle', message: 'Ready.' }
  // no key word saved yet: nobody's key works
  await assert.rejects(studyTestRequest(db, { command: 'status', key: KEY, status }), e => e.code === 'permission-denied' && e.message === 'That is not the station key.')
  await setStationKey(db, KEY)
  await assert.rejects(studyTestRequest(db, { command: 'status', key: 'wrong', status }), e => e.code === 'permission-denied')
  await assert.rejects(studyTestRequest(db, { command: 'status', status }), e => e.code === 'permission-denied')
  assert.equal(db.store.get(STATUS_DOC), undefined, 'nothing was saved')
  assert.deepEqual(await studyTestRequest(db, { command: 'status', key: KEY, status }), { ok: true })
  const saved = db.store.get(STATUS_DOC)
  assert.equal(saved.message, 'Ready.')
  assert.ok(saved.updatedAt instanceof Date, 'the server stamps it')
  assert.deepEqual(await studyTestRequest(db, admin({ command: 'status', status: { message: 'From the admin.' } })), { ok: true })
  assert.equal(db.store.get(STATUS_DOC).message, 'From the admin.')
})

test('the queue: seq goes up by one, entries stay in order with their time, only the newest 30 are kept', async () => {
  const db = await house()
  const t0 = Date.parse('2026-11-01T18:00:00Z')
  const commands = ['flash', 'teach', 'practice', 'stop', 'key']
  for (let i = 0; i < 35; i++) {
    const command = commands[i % commands.length]
    const r = await studyTestRequest(db, admin({ command, name: command === 'key' ? 'submit' : undefined, now: t0 + i * 1000 }))
    assert.equal(r.seq, i + 1)
  }
  const doc = db.store.get(QUEUE_DOC)
  assert.equal(doc.seq, 35)
  assert.equal(doc.queue.length, QUEUE_KEEP)
  assert.deepEqual(doc.queue.map(e => e.seq), Array.from({ length: 30 }, (_, i) => i + 6), 'oldest first, the first five gone')
  assert.ok(doc.queue.every(e => e.at instanceof Date))
  assert.equal(doc.queue[0].at.getTime(), t0 + 5000)
  assert.equal(doc.queue[0].command, commands[5 % commands.length])
  assert.ok(doc.updatedAt instanceof Date)
})

test('the queue: commands sent at once all land, each with its own seq', async () => {
  const db = await house()
  await studyTestRequest(db, admin({ command: 'stop' }))
  const rs = await Promise.all(['red', 'yellow', 'green', 'blue', 'pink', 'white', '1', '2'].map(name => studyTestRequest(db, admin({ command: 'key', name }))))
  assert.deepEqual(rs.map(r => r.seq).sort((a, b) => a - b), [2, 3, 4, 5, 6, 7, 8, 9])
  const doc = db.store.get(QUEUE_DOC)
  assert.equal(doc.seq, 9)
  assert.deepEqual(doc.queue.map(e => e.seq), [1, 2, 3, 4, 5, 6, 7, 8, 9])
})

test('status: only the listed fields, strings cut, numbers made whole, no arrays, a wrong word falls back', async () => {
  const db = await house()
  db.store.set(STATUS_DOC, { mode: 'teach', stale: 'from before' })
  const long = 'x'.repeat(500)
  await studyTestRequest(db, {
    command: 'status', key: KEY,
    status: {
      mode: 'dance', message: long, deck: 'stream-deck', code: 'never', pattern: [1, 2, 3],
      walls: { elements: { ok: true, panels: '10', lights: 60.9, taught: -3, extra: 1 }, lines: { ok: 'yes', bars: 12, layout: [1] } },
      teach: { step: 0, of: 10, panel: 4 },
      practice: {
        state: 'entering', round: '2', rounds: 3, pattern: 1, patterns: 3, pairs: 1, misses: NaN, outcome: null,
        entry: { colour: 'blue', number: 4, code: 'x' }, shown: { colour: 'pink', number: 5, all: [1] }, map: { a: 1 }, revealed: ['x'],
      },
      lastTap: { panel: null, known: false, at: 1700000000000, id: 'abc' },
      seenSeq: '7', stationAt: 1700000000123.4,
    },
  })
  const s = db.store.get(STATUS_DOC)
  assert.deepEqual(Object.keys(s).sort(), ['deck', 'lastTap', 'message', 'mode', 'practice', 'seenSeq', 'stationAt', 'teach', 'updatedAt', 'walls'])
  assert.equal(s.stale, undefined, 'a set, not a merge')
  assert.equal(s.mode, 'idle')
  assert.equal(s.message.length, TEXT_MAX)
  assert.equal(s.deck, 'stream-deck')
  assert.deepEqual(s.walls, { elements: { ok: true, panels: 10, lights: 60, taught: 0 }, lines: { ok: false, bars: 12 } })
  assert.deepEqual(s.teach, { step: 1, of: 10 })
  assert.deepEqual(s.practice, {
    state: 'entering', round: 2, rounds: 3, pattern: 1, patterns: 3, pairs: 1,
    entry: { colour: 'blue', number: '4' }, misses: 0, outcome: null, shown: null,
  }, 'shown is dropped: the report never said the bars are down (ok: \'yes\' is not false)')
  assert.deepEqual(s.lastTap, { panel: null, known: false, at: 1700000000000 })
  assert.equal(s.seenSeq, 7)
  assert.equal(s.stationAt, 1700000000123)
})

test('status: arrays and nonsense in place of the parts give safe defaults', () => {
  assert.deepEqual(cleanStatus(['idle']), {
    mode: 'idle', message: '', walls: { elements: { ok: false, panels: 0, lights: 0, taught: 0 }, lines: { ok: false, bars: 0 } },
    deck: 'keyboard', teach: null, practice: null, lastTap: null, seenSeq: 0, stationAt: 0,
  })
  const s = cleanStatus({
    mode: 'practice', message: { text: 'no' }, deck: 'piano', walls: [1, 2], teach: [1, 10], practice: ['done'],
    lastTap: { panel: '4', known: 'true', at: 'soon' }, seenSeq: -5, stationAt: true,
  })
  assert.equal(s.mode, 'practice')
  assert.equal(s.message, '')
  assert.equal(s.deck, 'keyboard')
  assert.deepEqual(s.walls.elements, { ok: false, panels: 0, lights: 0, taught: 0 })
  assert.equal(s.teach, null)
  assert.equal(s.practice, null)
  assert.deepEqual(s.lastTap, { panel: 4, known: false, at: 0 })
  assert.equal(s.seenSeq, 0)
  assert.equal(s.stationAt, 0)
  const p = cleanStatus({ practice: { state: 'done', outcome: 'solved', shown: { number: 3 }, entry: 'red' } }).practice
  assert.equal(p.outcome, 'solved')
  assert.equal(p.shown, null, 'no colour, nothing shown')
  assert.deepEqual(p.entry, { colour: null, number: null })
})

test('status: what the colour bars would show is kept only while they are down and a pair is being entered', () => {
  const report = (linesOk, state) => cleanStatus({
    walls: { elements: { ok: true, panels: 10 }, lines: { ok: linesOk, bars: 12 } },
    practice: { state, round: 1, rounds: 3, pattern: 3, patterns: 3, shown: { colour: 'green', number: 3 } },
  }).practice.shown
  assert.deepEqual(report(false, 'entering'), { colour: 'green', number: 3 }, 'the bars are down: the page shows it')
  assert.equal(report(true, 'entering'), null, 'the bars are up: they show it, the doc never does')
  assert.equal(report(false, 'reproducing'), null, 'not before the pair is due')
  assert.equal(report(false, 'done'), null)
  assert.equal(report('no', 'entering'), null, 'down only when the report says ok: false')
  assert.equal(cleanStatus({ practice: { state: 'entering', shown: { colour: 'red', number: 1 } } }).practice.shown, null, 'no word on the bars at all: nothing shown')
  const kept = cleanStatus({ walls: { lines: { ok: false } }, practice: { state: 'entering', shown: { colour: 'red', number: '1', extra: 1 } } }).practice.shown
  assert.deepEqual(kept, { colour: 'red', number: '1' })
})

test('an unknown command is refused, whoever asks', async () => {
  const db = await house()
  for (const command of ['solve', 'state', 'finished', 'Status', 'flash ', '', null, undefined, 7]) {
    await assert.rejects(studyTestRequest(db, admin({ command })), e => e.code === 'invalid', `admin: ${JSON.stringify(command)}`)
    await assert.rejects(studyTestRequest(db, { command, key: KEY }), e => e.code === 'invalid', `station: ${JSON.stringify(command)}`)
  }
  assert.equal(db.store.get(QUEUE_DOC), undefined)
  assert.equal(db.store.get(STATUS_DOC), undefined)
})

test('the seal: it reads only meta/game and its own queue, never a night, a case or sealed/*, and answers with flags', async () => {
  const db = await house()
  db.store.set('public_state/active', { nightId: 'n1' })
  db.store.set('nights/n1', { act: 4 })
  const reads = watchReads(db)
  const answers = [
    await studyTestRequest(db, admin({ command: 'practice' })),
    await studyTestRequest(db, admin({ command: 'key', name: 'undo' })),
    await studyTestRequest(db, { command: 'status', key: KEY, status: { mode: 'practice' } }),
  ]
  assert.ok(reads.length > 0)
  assert.ok(reads.every(p => p === 'meta/game' || p === QUEUE_DOC), `read only meta/game and the queue (${reads.length} reads)`)
  for (const a of answers) assert.ok(Object.keys(a).every(k => k === 'ok' || k === 'seq'))
  assert.ok([...db.store.keys()].every(p => !p.startsWith('nights/n1/') && !p.startsWith('cases/') && !p.startsWith('sealed/')))
})
