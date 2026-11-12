// The close of the night (handoff 11 Nov 2026, C1): the credits' last places,
// The End on every screen and phone, and the host's Good night.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { finaleStage, creditsTimes, creditsOrder, CREDITS_AFTER_MS, LAST_AFTER_MS, DEDICATION_MS, SPECIAL_LINE_MS } from '../src/lib/finale.js'
import { roomEnded, nightClosed, creditsLeft, minutesText, dedicationPhoto } from '../src/lib/closing.js'
import { roomDark, livingView } from '../src/lib/screen.js'
import { lockFor, phoneLock } from '../src/lib/night.js'

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const at = 1_000_000
const victimAt = at + 300_000
const DED = { line: 'For Sydney, The Best Big Brother A Pup Could Ask For', photo: 'household/sydney.jpg' }
const doc = (credits = {}) => ({
  at: new Date(at), stage: 'victim', epilogue: '(the closing story)', victimAt: new Date(victimAt),
  credits: { awards: [], counters: [], splits: [], thanks: ['Jon'], special: [], dedication: DED, last: { cat: 'irwin', line: 'Can we play again?' }, ...credits },
})

test('the end in order: the roll, Special thanks only when there are lines, the dedication, the last card', () => {
  assert.deepEqual(creditsOrder(doc()), ['awards', 'numbers', 'thanks', 'dedication', 'last'], 'no special thanks yet: the place is not there at all')
  assert.deepEqual(creditsOrder(doc({ special: ['  ', ''] })), ['awards', 'numbers', 'thanks', 'dedication', 'last'], 'blank lines are no lines')
  assert.deepEqual(creditsOrder(doc({ special: ['Grandma', 'The neighbours'], splits: [{ q: 'Cake or pie?' }] })), ['awards', 'numbers', 'splits', 'thanks', 'special', 'dedication', 'last'])
  assert.deepEqual(creditsOrder(doc({ dedication: null })), ['awards', 'numbers', 'thanks', 'last'])
})

test('the dedication holds eight seconds after the roll, then the last card; empty Special thanks takes no time', () => {
  assert.equal(DEDICATION_MS, 8_000)
  const empty = doc()
  assert.deepEqual(creditsTimes(empty), { credits: CREDITS_AFTER_MS, dedication: LAST_AFTER_MS, last: LAST_AFTER_MS + 8_000 }, 'no lines: the roll is as long as it always was')
  assert.equal(finaleStage(empty, victimAt + CREDITS_AFTER_MS), 'credits')
  assert.equal(finaleStage(empty, victimAt + LAST_AFTER_MS - 1), 'credits')
  assert.equal(finaleStage(empty, victimAt + LAST_AFTER_MS), 'dedication')
  assert.equal(finaleStage(empty, victimAt + LAST_AFTER_MS + 7_999), 'dedication')
  assert.equal(finaleStage(empty, victimAt + LAST_AFTER_MS + 8_000), 'last')
  // two lines of thanks: the roll runs that much longer, then the same eight seconds
  const two = doc({ special: ['Grandma', 'The neighbours'] })
  const t = creditsTimes(two)
  assert.equal(t.dedication, LAST_AFTER_MS + 2 * SPECIAL_LINE_MS)
  assert.equal(t.last - t.dedication, 8_000)
  assert.equal(finaleStage(two, victimAt + LAST_AFTER_MS), 'credits', 'still rolling the thanks')
  assert.equal(finaleStage(two, victimAt + t.dedication), 'dedication')
  assert.equal(finaleStage(two, victimAt + t.last), 'last')
  // no dedication: straight from the roll to the last card
  assert.equal(finaleStage(doc({ dedication: null }), victimAt + LAST_AFTER_MS), 'last')
  // a hold freezes the dedication like the rest
  assert.equal(finaleStage({ ...empty, holdAt: new Date(victimAt + LAST_AFTER_MS + 1_000) }, victimAt + 999_999), 'dedication')
})

test('the dedication card: the look\'s part, its photo only when the credits carry one; Special thanks shows nothing while empty', () => {
  assert.equal(dedicationPhoto(DED, '/play/'), '/play/household/sydney.jpg')
  assert.equal(dedicationPhoto({ line: 'x', photo: null }, '/play/'), null)
  assert.equal(dedicationPhoto(null), null)
  const closing = src('screens/Closing.jsx')
  assert.ok(closing.includes("import { TheEnd, Dedication } from '../look/parts'"), 'the look\'s own parts')
  assert.ok(closing.includes('<Dedication line={d.line} photo={dedicationPhoto(d, BASE)} className="full" />'))
  assert.ok(/export function SpecialThanks[\s\S]*?if \(!lines\.length\) return null/.test(closing), 'no lines: nothing, no heading, no gap')
  const kiosk = src('screens/Kiosk.jsx')
  const credits = kiosk.slice(kiosk.indexOf('function Credits('), kiosk.indexOf('function Epilogue('))
  assert.ok(credits.indexOf('className="thanks"') < credits.indexOf('<SpecialThanks finale={finale} />'), 'Special thanks after Thank you')
  assert.ok(!credits.includes('c.memory'), 'Sydney\'s line is off the roll: it is the dedication now')
  assert.ok(kiosk.includes("if (stage === 'dedication') return <CreditsDedication finale={finale} />"))
  const seed = JSON.parse(readFileSync(new URL('../../seed/credits.json', import.meta.url), 'utf8'))
  assert.ok(Array.isArray(seed.specialThanks), 'the one place for Jon\'s lines')
  assert.equal(seed.dedication.line, 'For Sydney, The Best Big Brother A Pup Could Ask For', 'Jon\'s words, exactly (12 Nov 2026)')
})

test('The End on every room screen: first in the dispatch for every kiosk kind, never the dark', () => {
  for (const night of [{ act: 7, beat: 'end', phase: 'act', over: true }, { act: 7, beat: 'end', phase: 'act' }, { act: 7, beat: 'end', phase: 'paused', over: true }]) {
    assert.equal(roomEnded(night), true)
    assert.equal(roomDark(night, { kind: 'black', title: '' }), false, 'nothing black at The End')
    assert.equal(livingView({ night, screen: { kind: 'black', title: '' } }), 'end')
    assert.equal(livingView({ night, screen: { kind: 'black', title: '' }, captionsOnly: true }), 'end', 'the iPad too')
  }
  assert.equal(roomEnded({ act: 7, beat: 'result', phase: 'act' }), false, 'the result is not the end')
  assert.equal(roomEnded(null), false)
  const kiosk = src('screens/Kiosk.jsx')
  const dispatch = kiosk.slice(kiosk.indexOf('  let body\n'), kiosk.indexOf('  return (\n    <>'))
  const end = dispatch.indexOf('else if (ended) body = <RoomEnd />')
  assert.ok(end > 0, 'The End is a branch of the dispatch')
  assert.ok(end < dispatch.indexOf('body = <Dark />'), 'before the dark')
  for (const kind of ['decor', 'bedroom', 'study', 'memory', 'boo', 'orangerie']) {
    const at = dispatch.indexOf(`which === '${kind}'`, dispatch.indexOf('else if (roomDark'))
    assert.ok(at > end, `${kind} shows The End`)
  }
  assert.ok(end < dispatch.indexOf('body = <Living '), 'the Parlour TV and the iPad show The End')
  assert.ok(kiosk.includes('const ended = !!n && roomEnded(n)'))
  assert.ok(kiosk.includes('const dark = !!n && !ended && ('), 'the room is not dark at The End')
  assert.ok(kiosk.includes("if (view === 'end') return <RoomEnd />"))
  assert.ok(src('screens/Closing.jsx').includes('return <TheEnd className="full" />'))
})

test('The End on every phone: on top of Now, the result under it, the tabs still there', () => {
  const over = { act: 7, beat: 'end', phase: 'act', over: true }
  assert.equal(phoneLock(over), 'over')
  assert.equal(lockFor(over, { host: true }), 'over', 'the host phones too')
  assert.equal(lockFor(over, {}), 'over')
  const rest = src('screens/Rest.jsx')
  const now = rest.slice(rest.indexOf('function Now('), rest.indexOf('function You('))
  assert.ok(now.indexOf('{over && <PhoneEnd />}') >= 0 && now.indexOf('{over && <PhoneEnd />}') < now.indexOf('cards.map(c => <Card'), 'The End first, the result card under it')
  assert.ok(rest.includes("const newest = [over && 'the-end',"), 'the phone goes to Now once at The End')
  assert.ok(rest.includes('<nav className='), 'the tabs stay')
  assert.ok(src('App.jsx').includes("over={lock === 'over'}"))
})

test('Good night on the Host tab: only at The End, then one line; the credits\' countdown on the result beat', () => {
  const end = { act: 7, beat: 'end', phase: 'act', over: true }
  assert.equal(nightClosed(end), false)
  assert.equal(nightClosed({ ...end, goodNight: true }), true)
  assert.equal(nightClosed({ act: 7, beat: 'result', phase: 'act', goodNight: true }), false, 'only ever after The End')
  const g = src('screens/GoodNight.jsx')
  assert.ok(g.includes(">Good night</button>"))
  assert.ok(g.includes('The night is over. Good night.'))
  assert.ok(g.includes("command: 'good-night'"))
  const host = src('screens/Host.jsx')
  assert.ok(host.includes('<GoodNight night={night} finale={finale.data} serverNow={serverNow} />'), 'mounted once')
  // the credits' countdown: seconds until the last card, null before the story and once it is up
  const d = doc()
  assert.equal(creditsLeft(d, victimAt), Math.ceil((LAST_AFTER_MS + DEDICATION_MS) / 1000))
  assert.equal(creditsLeft(d, victimAt + LAST_AFTER_MS + DEDICATION_MS), null)
  assert.equal(creditsLeft({ ...d, stage: 'motive' }, victimAt), null)
  assert.equal(minutesText(65), '1:05')
})
