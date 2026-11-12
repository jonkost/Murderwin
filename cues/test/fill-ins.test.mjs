import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { drive, step, fresh, PARTY_DAY, EVERY_MS, IDLE_MS, WORDS } from '../lib/fillins.js'

// The fill-in players' clock on the brain (npm run fill-ins; the polish pass,
// job A4, 11 Nov 2026). Nothing here touches Firebase: the loop is driven
// with a scripted `call`, and the source is read as text.

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const T = Date.parse('2026-11-12T23:00:00Z') // the practice evening, before the party day
const on = (more = {}) => ({ ok: true, on: true, act: 2, seats: 6, did: 0, locked: 0, answered: 0, voted: 0, ...more })
const off = why => ({ ok: true, on: false, why, did: 0 })

// Run the loop over a script of answers (an Error in the list is a failed call). No real waiting.
async function run(script, { now = () => T } = {}) {
  const lines = []
  const waits = []
  let busy = 0
  let most = 0
  const calls = [...script]
  const asked = await drive({
    call: async () => { busy++; most = Math.max(most, busy); await null; const r = calls.shift(); busy--; if (r instanceof Error) throw r; return r },
    sleep: async ms => { waits.push(ms) },
    say: line => lines.push(line),
    now,
    max: script.length,
  })
  return { lines, waits, asked, most }
}

// Every line the window may ever show: fixed words and counts, nothing else.
const ALLOWED = [
  /^Today is the party\. Fill-in players are for practice nights only\. Stopped\.$/,
  /^The night that is on is the real night\. Fill-in players never join it\. Stopped\.$/,
  /^No night is on\. Waiting for a practice night with fill-in players\.$/,
  /^The night that is on has no fill-in players\. Waiting\.$/,
  /^The house answers again\.$/,
  /^The house did not answer \([a-z-]{2,40}\)\. Trying again every ten seconds\.$/,
  /^Playing \d+ fill-in players? on the practice night\. (Act \d\.|The doors are open\.)$/,
  /^Now \d+ fill-in players?\.$/,
  /^Act \d\. So far: \d+ taps? of Locked in, \d+ Parlour Games? answered, \d+ votes?\.$/,
  /^The night is over\. In all: \d+ taps? of Locked in, \d+ Parlour Games? answered, \d+ votes?\.$/,
  /^That night is gone\. In all: \d+ taps? of Locked in, \d+ Parlour Games? answered, \d+ votes?\.$/,
]
const assertCountsOnly = lines => { for (const l of lines) assert.ok(ALLOWED.some(re => re.test(l)), `a line of fixed words and counts (length ${l.length})`) }

test('a practice night with fill-ins: one line when it is found, one a change of act with the counts so far, and nothing in between', async () => {
  const { lines, waits, asked, most } = await run([
    on({ act: 1 }), on({ act: 1 }), on({ act: 1 }),
    on({ act: 2, answered: 2, did: 2 }), on({ act: 2, answered: 4, did: 4 }), on({ act: 2 }),
    on({ act: 4, locked: 6, did: 6 }), on({ act: 4, answered: 6, did: 6, clock: 'round2' }),
    on({ act: 7, voted: 6, did: 6 }), on({ act: 7, why: 'over' }), on({ act: 7, why: 'over' }),
  ])
  assert.deepEqual(lines, [
    'Playing 6 fill-in players on the practice night. Act 1.',
    'Act 2. So far: 0 taps of Locked in, 2 Parlour Games answered, 0 votes.',
    'Act 4. So far: 6 taps of Locked in, 6 Parlour Games answered, 0 votes.',
    'Act 7. So far: 6 taps of Locked in, 12 Parlour Games answered, 6 votes.',
    'The night is over. In all: 6 taps of Locked in, 12 Parlour Games answered, 6 votes.',
  ])
  assertCountsOnly(lines)
  assert.equal(asked, 11)
  assert.equal(most, 1, 'never two calls at once')
  assert.ok(waits.every(ms => ms === EVERY_MS), 'every two seconds while a practice night is on')
  assert.equal(EVERY_MS, 2_000)
})

test('it never plays on the real night: it stops the moment the house says so, and never starts on the party day', async () => {
  const real = await run([on(), on({ answered: 1 }), off('real-night'), on(), on()])
  assert.equal(real.asked, 3, 'not one more call after the real night is on')
  assert.deepEqual(real.lines.slice(-1), [WORDS.realNight])
  // the server says it is the party day
  const day = await run([off('party-day'), on()])
  assert.deepEqual([day.asked, day.lines], [1, [WORDS.partyDay]])
  // its own clock says so first: it never even asks
  const never = await run([on(), on()], { now: () => PARTY_DAY })
  assert.deepEqual([never.asked, never.lines], [0, [WORDS.partyDay]])
  // the party day comes while it runs (left on overnight): the next answer is its last
  let t = PARTY_DAY - 2
  const late = await run([on(), on(), on()], { now: () => { t += 1; return t } })
  assert.equal(late.asked, 1)
  assert.deepEqual(late.lines, [WORDS.partyDay])
  // the same party day as the server's
  const server = /export const PARTY_DAY = Date\.parse\('([^']+)'\)/.exec(read('../../functions/lib/morning.js'))
  assert.equal(PARTY_DAY, Date.parse(server[1]))
})

test('waiting and trouble: one line each, slower asking, and it picks the next practice night up by itself', async () => {
  const { lines, waits } = await run([
    off('no-night'), off('no-night'), off('no-fill-ins'), off('no-fill-ins'),
    on({ act: 1, seats: 6 }), on({ act: 1, seats: 5 }),
    Object.assign(new Error('some long message that must never be printed'), { code: 'functions/unavailable' }),
    Object.assign(new Error('again'), { code: 'functions/unavailable' }),
    new Error('no code at all'),
    on({ act: 2, seats: 5, answered: 5 }),
    off('no-night'),
  ])
  assert.deepEqual(lines, [
    WORDS.noNight,
    WORDS.noFillIns,
    'Playing 6 fill-in players on the practice night. Act 1.',
    'Now 5 fill-in players.',
    'The house did not answer (unavailable). Trying again every ten seconds.',
    'The house did not answer (no-answer). Trying again every ten seconds.',
    WORDS.back,
    'Playing 5 fill-in players on the practice night. Act 2.',
    'That night is gone. In all: 0 taps of Locked in, 5 Parlour Games answered, 0 votes.',
    WORDS.noNight,
  ])
  assertCountsOnly(lines)
  assert.deepEqual(waits, [IDLE_MS, IDLE_MS, IDLE_MS, IDLE_MS, EVERY_MS, EVERY_MS, IDLE_MS, IDLE_MS, IDLE_MS, EVERY_MS, IDLE_MS])
  assert.ok(!lines.join('\n').includes('long message'), 'an error\'s own words are never printed')
})

test('whatever the house sends, the window shows fixed words and counts only', () => {
  const state = fresh()
  const lines = step(state, { reply: on({ act: 3, seats: 6, answered: 'lots', locked: -4, voted: 2.9, name: 'Mabel', card: 'a line that must never show' }), now: T }).lines
  assert.deepEqual(state.moves, { locked: 0, answered: 0, voted: 2 }, 'only whole counts are counted')
  const odd = [
    { ok: true, on: true, act: 'four', seats: 'six' },
    null, 'a string', 42, { on: 'yes' }, { ok: true, on: false, why: 'something new' },
    on({ act: 5, why: 'held' }),
  ]
  for (const reply of odd) lines.push(...step(state, { reply, now: T }).lines)
  assert.ok(lines.length >= 5)
  assertCountsOnly(lines)
  assert.ok(!lines.join('\n').includes('Mabel') && !lines.join('\n').includes('must never show'))
})

test('the driver is blind: one function, no key, no document, nothing written', () => {
  const src = read('../fill-ins.mjs') + read('../lib/fillins.js')
  for (const never of ['firebase-admin', 'service-account', 'GOOGLE_APPLICATION_CREDENTIALS', 'firebase/firestore', 'getFirestore', 'onSnapshot', 'sealed', 'cases/', 'private/', 'writeFile', 'appendFile', 'hostCommand', 'afplay', 'shortcuts', 'osascript']) {
    assert.ok(!src.includes(never), `no ${never} in the driver`)
  }
  const main = read('../fill-ins.mjs')
  assert.equal((main.match(/httpsCallable\(/g) ?? []).length, 1, 'one callable')
  assert.ok(main.includes("httpsCallable(fns, 'fillIns'"), 'and it is fillIns')
  assert.ok(main.includes('callFillIns({})'), 'it sends nothing')
  assert.ok(main.indexOf('if (Date.now() >= PARTY_DAY)') < main.indexOf('initializeApp(firebaseConfig)'), 'on the party day it stops before it signs in')
  assert.ok(main.includes("process.env.MURDERWIN_EMULATOR === '1'"), 'the emulator switch, as the cue relay has it')
  // the commands exist: `npm run fill-ins` at the root and in cues/
  assert.equal(JSON.parse(read('../package.json')).scripts['fill-ins'], 'node fill-ins.mjs')
  assert.equal(JSON.parse(read('../../package.json')).scripts['fill-ins'], 'npm --prefix cues run fill-ins')
  // and the house has the function it calls
  assert.ok(read('../../functions/index.js').includes('export const fillIns = onCall('))
})

// ---- started with the night: the cue relay runs the clock (no step for Jon) -----------------

test('the relay starts the fill-ins\' clock when a practice night with fill-ins shows, and stops it when that night is gone', async () => {
  const { autoDriver, wantsFillIns } = await import('../lib/fillins.js')
  assert.equal(wantsFillIns({ forceRehearsal: true, fillIns: 6 }, T), true)
  assert.equal(wantsFillIns({ forceRehearsal: true }, T), false, 'a practice night with none')
  assert.equal(wantsFillIns({ forceRehearsal: false, fillIns: 6 }, T), false, 'the real night, whatever it carries')
  assert.equal(wantsFillIns({ forceRehearsal: true, fillIns: 6 }, PARTY_DAY), false, 'nor from the party day on')
  assert.equal(wantsFillIns(null, T), false)
  let calls = 0
  const lines = []
  let release
  const gate = () => new Promise(r => { release = r })
  const d = autoDriver({ call: async () => { calls++; return on() }, sleep: gate, say: l => lines.push(l), now: () => T })
  d.see({ forceRehearsal: false, fillIns: 6 })
  assert.equal(d.running, false, 'never for the real night')
  d.see({ forceRehearsal: true, fillIns: 6 })
  assert.equal(d.running, true)
  d.see({ forceRehearsal: true, fillIns: 6 }) // every copy of the night doc: still one clock
  await new Promise(r => setImmediate(r))
  assert.equal(calls, 1, 'one clock, one call at a time')
  d.see(null) // the night is gone
  release()
  await new Promise(r => setImmediate(r))
  await new Promise(r => setImmediate(r))
  assert.equal(d.running, false)
  assert.equal(calls, 1)
  assert.ok(lines.every(l => l.startsWith('fill-ins: ')) && !lines.some(l => /murderer|ghost|motive|role/i.test(l)), 'its own lines, counts only')
  const relay = read('../cues.mjs')
  assert.ok(relay.includes("fillIns?.see(docs.night)") && relay.includes("httpsCallable(fns, 'fillIns'"), 'the relay hands it the night it already watches')
})
