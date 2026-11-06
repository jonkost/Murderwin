import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { poseShotKey, poseCaption, fits, SHOT_AFTER_MS, POSE_MAX_CHARS, QUALITIES } from '../src/lib/pose.js'
import { practiceParam } from '../src/lib/gametest.js'

// Boo's camera (card 450, ?kiosk=pose): one photo of each group at the
// arcade, a minute into its visit (since 5 Nov 2026; the Catwalk's last pose
// before). The records are throwaway shapes in the night's form.

const t0 = 1_000_000
const visit = (extra = {}) => ({ groupId: 'g2', state: 'visit', startsAt: t0, slotEndsAt: t0 + 15 * 60_000, ...extra })

test('the photo is due once, a minute into the visit', () => {
  const v = visit()
  assert.equal(poseShotKey(v, t0 + 1000), null, 'not as the group walks in')
  assert.equal(poseShotKey(v, t0 + SHOT_AFTER_MS - 1), null, 'nor a moment before')
  const key = poseShotKey(v, t0 + SHOT_AFTER_MS)
  assert.equal(key, `g2-${t0}`)
  assert.equal(poseShotKey(v, t0 + SHOT_AFTER_MS + 40_000), key, 'the same visit, the same key: taken once')
  assert.notEqual(poseShotKey(visit({ startsAt: t0 + 1 }), t0 + SHOT_AFTER_MS + 1), key, 'another visit, another photo')
  assert.equal(poseShotKey(visit({ groupId: 'g3', startsAt: t0 }), t0 + SHOT_AFTER_MS + 1) === key, false, 'another group, another photo')
  assert.equal(poseShotKey(null, t0 + SHOT_AFTER_MS), null)
  assert.equal(poseShotKey(visit({ state: 'idle', startsAt: null }), t0 + SHOT_AFTER_MS), null, 'between groups')
  assert.equal(poseShotKey(visit({ state: 'show' }), t0 + SHOT_AFTER_MS), null, 'the Catwalk\'s old state is nobody\'s now')
  assert.equal(poseShotKey(v, t0 + 8000, 8000), `g2-${t0}`, 'the practice asks sooner')
})

test('the camera screen counts the last five seconds down, then says the photo is taken', () => {
  const v = visit()
  assert.equal(poseCaption(null, t0).small, 'The next group will be along.')
  assert.equal(poseCaption(visit({ state: 'idle', startsAt: null }), t0).small, 'The next group will be along.')
  assert.deepEqual(poseCaption(v, t0 + 1000), { big: null, small: 'Boo’s camera. One photo of the group, for the end credits.' })
  assert.deepEqual(poseCaption(v, t0 + SHOT_AFTER_MS - 4200), { big: '5', small: 'Smile!' })
  assert.deepEqual(poseCaption(v, t0 + SHOT_AFTER_MS - 100), { big: '1', small: 'Smile!' })
  assert.deepEqual(poseCaption(v, t0 + SHOT_AFTER_MS + 100), { big: null, small: 'Play on.' })
  assert.deepEqual(poseCaption(v, t0 + 4000, 8000), { big: '4', small: 'Smile!' }, 'the practice counts from its own moment')
  for (const c of [poseCaption(null, t0), poseCaption(v, t0 + 1000), poseCaption(v, t0 + SHOT_AFTER_MS + 100)]) assert.ok(!/stream deck|ipad|mac\b|browser/i.test(c.small), 'no device in front of the guests')
})

test('a photo must fit under the server’s cap, trying lower qualities first', () => {
  assert.equal(POSE_MAX_CHARS, 900_000)
  assert.deepEqual([...QUALITIES].sort((a, b) => b - a), QUALITIES, 'best quality first')
  assert.equal(fits('x'.repeat(POSE_MAX_CHARS)), true)
  assert.equal(fits('x'.repeat(POSE_MAX_CHARS + 1)), false)
  const server = readFileSync(new URL('../../functions/lib/pose.js', import.meta.url), 'utf8')
  assert.match(server, new RegExp(`POSE_MAX_CHARS = ${POSE_MAX_CHARS.toLocaleString('en-US').replace(/,/g, '_')}\\b`), 'the page and the server agree on the cap')
  assert.ok(server.includes("boo.state !== 'visit'"), 'the server keeps a photo only during a visit')
})

test('the Game test tab’s practice camera: ?kiosk=pose&practice=1, never the night’s, and the photo comes soon', () => {
  assert.equal(practiceParam('?kiosk=pose&practice=1'), 'pose-wall')
  assert.equal(practiceParam('?kiosk=pose'), null)
  const kiosk = readFileSync(new URL('../src/screens/Pose.jsx', import.meta.url), 'utf8')
  assert.match(kiosk, /if \(practice \|\| nightId === 'preview'\) \{ setShot/, 'a practice photo is never sent')
  assert.match(kiosk, /export const PRACTICE_SHOT_AFTER_MS = 12_000/)
  const practice = readFileSync(new URL('../src/screens/Practice.jsx', import.meta.url), 'utf8')
  assert.ok(practice.includes("boo={{ groupId: 'practice', state: 'visit', startsAt }}") && practice.includes('shotAfterMs={PRACTICE_SHOT_AFTER_MS}'), 'the practice is a pretend visit from the moment the page opens')
})
