import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hostRelayControl, guessReply, paperReply, GUESSING, isGuessing, guessWaiting, guessLine, wrongPick } from '../src/lib/relayhost.js'
import { RELAY_RUNNING } from '../src/lib/screen.js'

// The host's controls for the drawing (25 Oct 2026, Jon's cue list, cue 17).
// Throwaway relay shapes with no pictures in them; nothing here is a night.

const sourceOf = (name) => readFileSync(fileURLToPath(new URL(`../src/screens/${name}`, import.meta.url)), 'utf8')

test('F29 the host\'s drawing controls: At the paper only while someone walks, the four names at the guess, nothing otherwise', () => {
  assert.equal(hostRelayControl({ state: 'walk' }), 'paper')
  assert.equal(hostRelayControl({ state: 'vote' }), 'guess')
  assert.equal(hostRelayControl({ state: 'vote', lastResult: 'wrong', crossed: [1] }), 'guess', 'after a wrong pick the names stay up, and live')
  assert.equal(hostRelayControl({ state: 'lockout' }), 'guess', 'an older server\'s wait is still the guess')
  for (const state of ['intro', 'turn', 'done', 'idle', 'paused', undefined]) assert.equal(hostRelayControl({ state }), null, `nothing to press in ${state}`)
  assert.equal(hostRelayControl(null), null)
  assert.equal(hostRelayControl(undefined), null)
})

test('A7 no wait after a wrong pick: the screens say Not that one. Guess again., buzz once as the pick is crossed off, and keep the names live', () => {
  // Jon, 11 Nov 2026: "You have to wait 10 seconds… let's lose that." The server leaves the state at
  // vote; lastResult and the crossed list carry the wrong pick.
  const fresh = { state: 'vote', crossed: [], lastResult: null }
  const wrong = { state: 'vote', crossed: [2], lastResult: 'wrong' }
  const twice = { state: 'vote', crossed: [2, 0], lastResult: 'wrong' }
  assert.equal(guessLine(fresh), 'Look at the paper. Tell the host your guess.')
  assert.equal(guessLine(fresh, 'host'), 'Look at the paper. Tap the room’s guess.')
  assert.equal(guessLine(fresh, 'tv'), 'What is the picture? Agree, then tell the host.')
  for (const who of ['guest', 'host', 'tv']) {
    assert.equal(guessLine(wrong, who), 'Not that one. Guess again.', who)
    assert.equal(guessLine(twice, who), 'Not that one. Guess again.', who)
  }
  // the buzz: only as the list grows under a wrong result, once a pick
  assert.equal(wrongPick(0, fresh), false)
  assert.equal(wrongPick(0, wrong), true, 'the first wrong pick')
  assert.equal(wrongPick(1, wrong), false, 'the same list again is not a new pick')
  assert.equal(wrongPick(1, twice), true, 'the second wrong pick')
  assert.equal(wrongPick(1, { state: 'vote', crossed: [2], lastResult: 'wrong' }), false, 'a screen that opens on a crossed list stays quiet')
  assert.equal(wrongPick(0, { state: 'walk', crossed: [], lastResult: 'right' }), false, 'a right pick never buzzes')
  assert.equal(wrongPick(0, { state: 'turn', crossed: [1], lastResult: 'wrong' }), false, 'only at the guess')
  assert.equal(wrongPick(0, null), false)
  // nothing waits: with today's server the names are never dimmed for a wait
  assert.equal(guessWaiting(fresh), false)
  assert.equal(guessWaiting(wrong), false)
  // the screens: no bar, no countdown and no wait at the guess, on the phones or the TV
  const relay = sourceOf('Relay.jsx')
  const guess = relay.slice(relay.indexOf('if (isGuessing(relay))'), relay.indexOf('export function RelayDone'))
  assert.ok(guess.length > 200, 'the guess screen was found')
  assert.ok(!/<Bar |lockoutEndsAt|LOCKOUT_MS/.test(guess), 'no bar under a phone\'s guess')
  assert.match(guess, /guessLine\(relay, host \? 'host' : 'guest'\)/)
  assert.ok(!/LOCKOUT_MS|lockoutMs/.test(relay), 'the phones hold no timing for a wait')
  const kiosk = sourceOf('Kiosk.jsx')
  const tv = kiosk.slice(kiosk.indexOf('function Guess('), kiosk.indexOf('// ---- the screens the beats name'))
  assert.ok(tv.length > 200, 'the TV\'s guess was found')
  assert.ok(!/Countdown|lockoutEndsAt/.test(tv), 'no countdown on the TV\'s guess')
  assert.match(tv, /guessLine\(relay, 'tv'\)/)
  assert.match(kiosk, /else if \(wrongPick\(lastCrossed\.current, relay\)\) chime\('wrong'\)/, 'the TV buzzes as a pick is crossed off')
  assert.match(relay, /if \(wrongPick\(lastCrossed\.current, relay\)\) \{\s*try \{ navigator\.vibrate/, 'and the phones buzz')
})

test('A7 an older server\'s lockout is still read as the guess, so a publish of the pages alone drops nobody out of the drawing', () => {
  // new pages with old functions behind them: that server still writes `lockout` for ten seconds
  const old = { state: 'lockout', crossed: [1], lastResult: 'wrong', lockoutEndsAt: 5 }
  assert.deepEqual(GUESSING, ['vote', 'lockout'])
  assert.equal(isGuessing(old), true)
  assert.equal(isGuessing({ state: 'vote' }), true)
  for (const state of ['intro', 'walk', 'turn', 'done', 'idle', undefined]) assert.equal(isGuessing({ state }), false, String(state))
  assert.equal(hostRelayControl(old), 'guess')
  assert.equal(guessWaiting(old), true, 'that server would refuse a tap, so the names wait')
  assert.equal(guessLine(old, 'tv'), 'Not that one.', 'and nothing promises a guess it would refuse')
  assert.equal(wrongPick(0, old), true, 'the buzz still sounds')
  assert.ok(RELAY_RUNNING.includes('lockout'), 'the TV stays on the drawing')
  const app = readFileSync(fileURLToPath(new URL('../src/App.jsx', import.meta.url)), 'utf8')
  assert.match(app, /\['intro', 'walk', 'turn', 'vote', 'lockout'\]\.includes\(r\.state\)/, 'and so does every phone')
  // both screens still nudge that server's clock at the end of its wait
  for (const name of ['Relay.jsx', 'Kiosk.jsx']) assert.match(sourceOf(name), /relay\.state === 'lockout' \? ms\(relay\.lockoutEndsAt\) : 0/, name)
})

test('F29 the replies: a wrong guess is crossed off, a right one calls the next player or opens the door; At the paper says where the square is', () => {
  assert.equal(guessReply({ right: false, state: 'vote' }), 'Not that one. Guess again.')
  assert.equal(guessReply({ right: true, state: 'walk' }), 'Right. The next player is called.')
  assert.equal(guessReply({ right: true, state: 'done' }), 'Right. The door is open.')
  assert.equal(guessReply({}), 'Not that one. Guess again.', 'no answer reads as wrong, never as right')
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
  assert.match(guessLine({ state: 'vote' }), /tell the host your guess/i, 'a guest\'s phone says to tell the host')
  assert.match(host, /const locked = guessWaiting\(relay\)/, 'the names are live after a wrong pick; only an older server\'s wait dims them')
})

test('A7 the words at a turn: "{Name} is drawing." and "Describe this square!"; on the drawer\'s own phone "Draw what they say!"', () => {
  // Jon, 11 Nov 2026: "Tell Professor Jonathan Kostington how… That is a weird line."
  const relay = sourceOf('Relay.jsx')
  const turn = relay.slice(relay.indexOf("if (relay.state === 'turn')"), relay.indexOf('if (isGuessing(relay))'))
  assert.ok(turn.length > 200, 'the turn screen was found')
  assert.match(turn, /<p className="moment-text">\{relay\.drawerName \?\? 'Someone'\} is drawing\.<br \/>Describe this square!<\/p>/, 'both sentences in the big line, one under the other')
  assert.match(turn, /<p className="moment-text">Draw what they say!<\/p>/)
  for (const gone of ['how.', 'Marker down', 'at the buzz', 'Next:']) assert.ok(!turn.includes(gone), `"${gone}" is gone`)
  assert.ok(!/relay\.nextName/.test(turn), 'nobody else is named during a turn (the server names the next player only at the walk)')
})
