import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hostRelayControl, guessReply, paperReply } from '../src/lib/relayhost.js'

// The host's controls for the drawing (25 Oct 2026, Jon's cue list, cue 17).
// Throwaway relay shapes with no pictures in them; nothing here is a night.

const sourceOf = (name) => readFileSync(fileURLToPath(new URL(`../src/screens/${name}`, import.meta.url)), 'utf8')

test('F29 the host\'s drawing controls: At the paper only while someone walks, the four names at the guess and through the lockout, nothing otherwise', () => {
  assert.equal(hostRelayControl({ state: 'walk' }), 'paper')
  assert.equal(hostRelayControl({ state: 'vote' }), 'guess')
  assert.equal(hostRelayControl({ state: 'lockout' }), 'guess', 'the names stay up, disabled, while the room sits out a wrong pick')
  for (const state of ['intro', 'turn', 'done', 'idle', 'paused', undefined]) assert.equal(hostRelayControl({ state }), null, `nothing to press in ${state}`)
  assert.equal(hostRelayControl(null), null)
  assert.equal(hostRelayControl(undefined), null)
})

test('F29 the replies: a wrong guess is crossed off, a right one calls the next player or opens the door; At the paper says where the square is', () => {
  assert.equal(guessReply({ right: false, state: 'lockout' }), 'Not that one. It is crossed off.')
  assert.equal(guessReply({ right: true, state: 'walk' }), 'Right. The next player is called.')
  assert.equal(guessReply({ right: true, state: 'done' }), 'Right. The door is open.')
  assert.equal(guessReply({}), 'Not that one. It is crossed off.', 'no answer reads as wrong, never as right')
  // the walk ended and the square was written in the same call
  assert.equal(paperReply({ ok: true, atPaper: true, state: 'turn' }), 'The square is on the screen.')
  // a pause landed between the two writes: the clock answered paused, the square comes with the resume
  assert.equal(paperReply({ ok: true, atPaper: true, state: 'paused' }), 'The walk is ended. The square shows when the night resumes.')
  assert.equal(paperReply({}), 'The walk is ended. The square shows when the night resumes.')
  // no reply names a picture, a player or a number
  for (const s of [guessReply({ right: true }), guessReply({ right: false }), paperReply({ state: 'turn' })]) assert.ok(!/\d/.test(s))
})

test('F29 the screens use the rules: HostRelayPanel asks hostRelayControl, and the host\'s drawing screen carries it', () => {
  const host = sourceOf('Host.jsx')
  assert.match(host, /import \{[^}]*hostRelayControl[^}]*\} from '\.\.\/lib\/relayhost'/)
  assert.match(host, /const control = hostRelayControl\(relay\)/)
  assert.match(host, /if \(!control\) return null/)
  assert.ok(!/useEffect\(\(\) => \{ setMsg\(null\) \}, \[state\]\)/.test(host), 'a reply is not cleared on a state change: a right guess moves the state in the same call that answers the tap')
  const relay = sourceOf('Relay.jsx')
  assert.match(relay, /const host = !!session\.host/)
  assert.ok((relay.match(/<HostRelayPanel relay=\{relay\} nightId=\{night\.nightId\} inline \/>/g) ?? []).length >= 2, 'the walk and the guess both carry the host\'s controls')
  assert.match(relay, /tell the host your guess/i, 'a guest\'s phone says to tell the host')
})
