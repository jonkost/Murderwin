import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { poseShotKey, poseCaption, fits, SHOT_AFTER_MS, POSE_MAX_CHARS, QUALITIES } from '../src/lib/pose.js'
import { practiceParam } from '../src/lib/gametest.js'

// Boo's camera (card 450, ?kiosk=pose): one photo at each group's last pose.
// The show docs are throwaway shapes in the night's form.

const t0 = 1_000_000
const show = (extra = {}) => ({
  groupId: 'g2', state: 'show', startsAt: t0,
  poses: [0, 1, 2].map(i => ({ strutAt: t0 + 9000 + i * 20000, poseAt: t0 + 18000 + i * 20000, holdUntil: t0 + 23000 + i * 20000, judgeUntil: t0 + 29000 + i * 20000, line: `line ${i}` })),
  endsAt: t0 + 69000, ...extra,
})
const lastPose = t0 + 18000 + 2 * 20000

test('the photo is due once, in the last pose, a moment into HOLD IT', () => {
  const s = show()
  assert.equal(poseShotKey(s, t0 + 18000 + SHOT_AFTER_MS), null, 'never at the first pose')
  assert.equal(poseShotKey(s, t0 + 38000 + SHOT_AFTER_MS), null, 'nor the second')
  assert.equal(poseShotKey(s, lastPose), null, 'not the instant the music stops')
  const key = poseShotKey(s, lastPose + SHOT_AFTER_MS)
  assert.equal(key, `g2-${t0}`)
  assert.equal(poseShotKey(s, lastPose + 4000), key, 'the same show, the same key: taken once')
  assert.equal(poseShotKey(s, lastPose + 5000), null, 'over once Boo judges')
  assert.notEqual(poseShotKey(show({ startsAt: t0 + 1 }), lastPose + SHOT_AFTER_MS + 1), key, 'another show, another photo')
  assert.equal(poseShotKey(null, lastPose + SHOT_AFTER_MS), null)
  assert.equal(poseShotKey({ ...s, state: 'idle', startsAt: null }, lastPose + SHOT_AFTER_MS), null)
})

test('the camera screen says what Boo’s wall says', () => {
  const s = show()
  assert.equal(poseCaption(null, t0).small, 'The next group will be along.')
  assert.equal(poseCaption(s, t0 + 1000).small, 'Watch the wall.')
  assert.deepEqual(poseCaption(s, t0 + 19000), { big: 'STRIKE A POSE', small: 'HOLD IT · 4' })
  assert.equal(poseCaption(s, t0 + 24000).small, 'line 0')
  assert.equal(poseCaption(s, t0 + 70000).small, 'That’s the show.')
})

test('a photo must fit under the server’s cap, trying lower qualities first', () => {
  assert.equal(POSE_MAX_CHARS, 900_000)
  assert.deepEqual([...QUALITIES].sort((a, b) => b - a), QUALITIES, 'best quality first')
  assert.equal(fits('x'.repeat(POSE_MAX_CHARS)), true)
  assert.equal(fits('x'.repeat(POSE_MAX_CHARS + 1)), false)
  const server = readFileSync(new URL('../../functions/lib/pose.js', import.meta.url), 'utf8')
  assert.match(server, new RegExp(`POSE_MAX_CHARS = ${POSE_MAX_CHARS.toLocaleString('en-US').replace(/,/g, '_')}\\b`), 'the page and the server agree on the cap')
})

test('the Game test tab’s practice camera: ?kiosk=pose&practice=1, never the night’s', () => {
  assert.equal(practiceParam('?kiosk=pose&practice=1'), 'pose-wall')
  assert.equal(practiceParam('?kiosk=pose'), null)
  const kiosk = readFileSync(new URL('../src/screens/Pose.jsx', import.meta.url), 'utf8')
  assert.match(kiosk, /if \(practice \|\| nightId === 'preview'\) \{ setShot/, 'a practice photo is never sent')
})
