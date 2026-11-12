import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { introAtFor, startWords, liveLine, INTRO_TIME, RUN_THROUGH_MS } from '../src/lib/startNight.js'
import * as phone from '../../play/src/lib/start.js'

const src = p => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')
const at = (h, m) => new Date(2026, 10, 15, h, m, 0, 0).getTime()

test('the workshop\'s Start button starts the same night as the phone\'s (12 Nov 2026)', () => {
  assert.deepEqual(INTRO_TIME, phone.INTRO_TIME)
  assert.equal(RUN_THROUGH_MS, phone.RUN_THROUGH_MS)
  for (const real of [true, false]) for (const now of [at(15, 0), at(16, 29), at(16, 30), at(23, 0)]) assert.equal(introAtFor({ real, now }), phone.introAtFor({ real, now }))
  assert.ok(src('lib/startNightApi.js').includes("call({ command: 'create', arg })"), 'the same call, with the box and the time')
})

test('a run-through unless the box is ticked, and the words say which', () => {
  for (const real of [true, false]) assert.equal(startWords({ real, now: at(15, 0) }).button, 'Start the night', 'one plain name (Jon, 12 Nov 2026)')
  assert.equal(startWords({ real: false, now: at(15, 0) }).note, 'A practice night. The intro plays in five minutes.')
  assert.match(startWords({ real: true, now: at(15, 0) }).note, /4:30 pm/)
  assert.match(startWords({ real: true, now: at(17, 0) }).note, /Press Next/)
  assert.equal(liveLine({ nightId: null, night: null }), 'No night is on.')
  assert.equal(liveLine({ nightId: 'n', night: { label: 'Walk-through', act: 2, forceRehearsal: true } }), 'On now: Walk-through, a practice night, Act 2.')
  assert.equal(liveLine({ nightId: 'n', night: { label: '', act: 0, forceRehearsal: false } }), 'On now: a night with no name, the real night, at the doors.')
  const c = src('components/StartNight.jsx')
  assert.ok(c.includes('window.confirm(REPLACE_ASK)'), 'a night that is on is never ended without asking')
  assert.ok(!c.includes('—') && !src('lib/startNight.js').includes('—'), 'no em dash')
})

test('the button is first on Home and Game night, and what was folded away is still there', () => {
  const home = src('pages/Dashboard.jsx'), night = src('pages/Night.jsx')
  for (const page of [home, night]) { const main = page.slice(page.lastIndexOf('<main')); assert.ok(main.indexOf('<StartNight />') > 0 && main.indexOf('<StartNight />') < main.indexOf('<section className="panel'), 'first on the page') }
  for (const kept of ['The secrets, made blind', 'Try the games', 'The lists (nothing left for you to write)', 'Your own notes', 'Who has been writing']) assert.ok(home.indexOf(kept) > home.indexOf('<details className="panel more">'), `${kept} is under the fold`)
  for (const kept of ['The two hosts', 'Sir Irwin\'s two awards', 'The old party box', 'The square code for the Act 1 slide', 'The four room codes', 'After the party', '<Replay ']) assert.ok(night.indexOf(kept) > night.indexOf('<details className="panel more">'), `${kept} is under the fold`)
  for (const up of ['The devices', 'The bulletin videos', 'Freeze the workshop']) assert.ok(night.indexOf(up) < night.indexOf('<details className="panel more">'), `${up} stays in view`)
})
