// A1 (11 Nov 2026): every phone and room screen goes dark at the blackout's dark mark on
// its own server clock, comes back at the power's, and shows the flash and the squeeze;
// the Host tab's Blackout test is on practice nights only.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { blackoutStage, inBlackout, blackoutHit, markTimes } from '../src/lib/blackout.js'
import { isDark } from '../src/lib/night.js'
import { roomDark } from '../src/lib/screen.js'

const src = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const P = 5_000_000
const marks = { pressAt: new Date(P), darkAt: new Date(P + 2000), powerAt: new Date(P + 7000), test: true }

test('the marks: lit through the press, dark from the dark mark for five seconds, then lit again, phase or no phase', () => {
  const n = { act: 1, beat: 'rules', phase: 'act', blackout: marks }
  assert.equal(blackoutStage(marks, P + 10), 'press')
  assert.equal(isDark(n, P + 1999), false, 'still lit while the music stops')
  assert.equal(isDark(n, P + 2000), true)
  assert.equal(isDark(n, P + 6999), true)
  assert.equal(isDark(n, P + 7000), false, 'the power returns on its own: never more than five seconds')
  assert.equal(roomDark(n, null, P + 3000), true)
  assert.equal(roomDark(n, null, P + 8000), false)
  assert.equal(inBlackout({ ...n, blackout: null }, P + 3000), false)
  // a Firestore timestamp as the page sees it
  const ts = v => ({ toMillis: () => v })
  assert.equal(inBlackout({ blackout: { pressAt: ts(P), darkAt: ts(P + 2000), powerAt: ts(P + 7000) } }, P + 2500), true)
  assert.deepEqual(markTimes(n, P + 100), [P + 2000, P + 7000])
  assert.deepEqual(markTimes(n, P + 3000), [P + 7000])
  // the flash: the blackout, by its marks or its phase; never the prompt's or the pause's dark
  assert.equal(blackoutHit(n, P + 3000), true)
  assert.equal(blackoutHit({ phase: 'blackout' }, 0), true)
  assert.equal(blackoutHit({ phase: 'prompt' }, 0), false)
  assert.equal(blackoutHit({ phase: 'paused', pausedFrom: 'act' }, 0), false)
})

test('the phone and the room screens wake at the marks; a phone at the doors goes dark too; the flash is only for the blackout', () => {
  const app = src('../src/App.jsx')
  assert.ok(app.includes('useBlackoutMarks(night.data, serverNow)'))
  assert.ok(app.indexOf('if (isDark(n, serverNow())) return <Blackout hit />') < app.indexOf("if (!s || s.status !== 'active') return"), 'before the Join screen')
  assert.ok(app.includes('if (!notesDoc.loaded) return <Blackout />'), 'the dark while the notes load has no flash')
  const kiosk = src('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes('useBlackoutMarks(night.data, serverNow)'))
  assert.ok(kiosk.includes('<Dark hit={blackoutHit(n, serverNow())} />'))
  const css = src('../src/blackout.css')
  assert.match(css, /animation: blackout-tv-off 300ms/, 'about 300 ms in all')
  assert.match(css, /background: #fff/, 'one white flash')
  assert.match(css, /scale\(1, 0\.008\)/, 'the squeeze to a line')
  assert.match(css, /cursor: none/)
  assert.ok(src('../src/main.jsx').includes("import './blackout.css'"))
  assert.ok(src('../src/screens/Moments.jsx').includes("className={`moment dark${hit ? ' blackout-hit' : ''}`}"))
})

test('the Host tab: Blackout test beside Blackout, practice nights only, and the replies', async () => {
  const host = src('../src/screens/Host.jsx')
  assert.ok(host.includes('<BlackoutTest night={night} busy={busy} run={run} />'))
  assert.ok(host.includes("case 'blackout-test': return blackoutTestReply(r)"))
  const button = src('../src/screens/BlackoutTest.jsx')
  assert.ok(button.includes("if (!night || !isRehearsalNight(night) || night.phase === 'blackout') return null"), 'never on the party night')
  assert.ok(button.includes("onClick={() => run('blackout-test')}"))
  assert.ok(button.includes('>Blackout test</button>'))
})
