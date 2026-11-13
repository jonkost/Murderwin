import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PARTY_DAY, PARTY_DAY_MS, onPartyDay, PRACTICE_ASK, PRACTICE_NOTE, REPLACE_ASK } from '../src/lib/start.js'
import { beatsOf } from '../src/lib/night.js'
import { askFirst, INSTANT_MS } from '../src/lib/ask.js'

// The review before the party (12 Nov 2026; Jon could not play the night through, so the
// Host tab was walked in the code instead). Nothing on the Host tab may end, rewind or
// skip part of a live night by one stray tap: each such button asks first, or shows only
// at its own moment. And the one thing to press is the big button at the top.

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const host = read('../src/screens/Host.jsx')

test('the party day: from the server\'s own moment through that night, and no longer', () => {
  assert.equal(PARTY_DAY, Date.parse('2026-11-15T12:00:00Z'))
  assert.equal(onPartyDay(PARTY_DAY - 1), false)
  assert.equal(onPartyDay(PARTY_DAY), true)
  assert.equal(onPartyDay(Date.parse('2026-11-15T21:00:00Z')), true, 'four in the afternoon, Eastern')
  assert.equal(onPartyDay(Date.parse('2026-11-16T02:30:00Z')), true, 'half past nine that night')
  assert.equal(onPartyDay(PARTY_DAY + PARTY_DAY_MS), false, 'the days after are not the party')
  assert.equal(onPartyDay(Date.parse('2026-11-13T21:00:00Z')), false, 'a practice night before it')
})

test('Start the night: a practice start on the party day asks first, and a host phone never replaces a live night without asking', () => {
  const card = host.slice(host.indexOf('export function StartNight'), host.indexOf('export function SendScreens'))
  const ask = card.indexOf('if (!real && onPartyDay() && !askFirst(PRACTICE_ASK)) return')
  const replace = card.indexOf('if (again && !askFirst(REPLACE_ASK)) return')
  const call = card.indexOf("callHost({ command: 'create'")
  assert.ok(ask > 0 && replace > 0 && call > 0, 'both questions and the call are there')
  assert.ok(ask < call && replace < call, 'both come before anything is started')
  assert.ok(card.includes('warn ? PRACTICE_NOTE'), 'the note under the button is the warning on the party day')
  assert.ok(card.includes("role={warn ? 'alert' : undefined}"), 'said as an alert')
  assert.match(PRACTICE_ASK, /practice night, not the real night/)
  assert.match(PRACTICE_NOTE, /tick This is the real night/)
  assert.match(REPLACE_ASK, /ends for every phone and screen/)
  // and a practice night that is on during the party day says so in red, with where to put it right
  assert.ok(host.includes('{isRehearsalNight(night) && onPartyDay(clock) && <p className="host-msg trouble" role="alert">'), 'the Host tab warns, on the server’s clock')
  assert.match(host, /role="alert">Today is the party, and this is a practice night\. For the party: at the bottom of this tab, tick This is the real night, then press Start the night\.</, 'with the one step that matters')
  assert.match(PRACTICE_ASK, /press Cancel and tick This is the real night/, 'and the question says what Cancel is for')
})

test('the buttons that can undo a live night each ask first', () => {
  // the seven act chips, the current act too (it starts the act again)
  assert.ok(host.includes('onClick={() => goToAct(Number(n))}'), 'the act chips ask')
  assert.ok(!host.includes("onClick={() => run('act', Number(n))}"), 'and never move the night bare')
  assert.ok(host.includes("() => run('act', n))"), 'the question leads to the same command')
  // the drawing: clearing it takes the trace; starting it outside Act 6 takes over every phone
  assert.ok(host.includes("sure('Clear the drawing? The door shuts and the trace goes. Only a whole new drawing brings it back.', () => run('relay-reset'))"), 'Clear the drawing asks')
  assert.ok(!host.includes("onClick={() => run('relay-reset')}"), 'and is never bare')
  assert.ok(host.includes('if (night.act !== 6 && !askFirst('), 'Start the drawing asks outside Act 6')
  // a phone wiped by mistake loses its notes and crossed-off motives
  assert.ok(host.includes("() => run('handover', r.key))"), 'Hand this phone on asks')
  assert.ok(!host.includes("onClick={() => run('handover', r.key)}"), 'and is never bare')
  // the blackout before Ready for the dark deals the roles to whoever has joined, once
  assert.ok(host.includes("if (night.beat !== 'ready' && !askFirst("), 'an early Blackout asks')
  assert.ok(!host.includes("onClick={() => run('blackout')}"), 'both Blackout buttons go through the question')
  // Next in the middle of an Act 4 round, Next over the credits, Back one in the reveal
  assert.ok(host.includes("if (roundLeftMs > 60_000 && !askFirst(pastRounds ? 'End the last round and go on to Act 5 now?' : 'End this round for every group now?')) return"), 'Next mid-round asks, and from the last round it says where OK goes')
  assert.ok(host.includes("if (credits > 0 && !askFirst('The credits are still rolling. Go to The End now?')) return"), 'Next over the credits asks')
  assert.ok(host.includes("if (night.act === 7 && here?.action === 'reveal' && !askFirst("), 'Back one in the reveal asks')
  assert.ok(!host.includes("onClick={() => run('back')}"), 'Back one is never bare')
  // the beat list under All of Act N's beats jumps the night too
  assert.ok(host.includes("onClick={() => { if (askFirst(`Move the whole night to ${b.name}? Every phone and screen follows.`)) run('beat', b.key) }}"), 'a beat tapped in the list asks')
  assert.ok(!host.includes("onClick={() => run('beat', b.key)}"), 'and is never bare')
  // the helper every question goes through is the real thing, and nothing on the tab calls the browser's confirm past it
  assert.ok(host.includes('const sure = (question, then) => { if (askFirst(question)) then() }'), 'sure asks, then acts')
  assert.ok(host.includes('const goToAct = (n) => sure('), 'the act numbers go through it')
  assert.ok(!host.includes('window.confirm('), 'every question on the Host tab is askFirst')
})

test('a button shows only at its own moment, and the big button at the top is the one to press', () => {
  // Supper's ready during the cat visits only; Start Act 4 at the dinner wrap-up only
  assert.ok(host.includes("{night.act === 2 && night.beat === 'cat' && ("), 'Supper’s ready: only while the cats are visited')
  assert.ok(!host.includes("night.act === 2 && night.beat !== 'supper'"), 'not from the first beat of Act 2')
  assert.ok(host.includes("const startsAct4 = night.act === 3 && night.beat === 'wrap'") && host.includes('{startsAct4 && ('), 'Start Act 4: only at the dinner wrap-up')
  assert.ok(!host.includes('{night.act === 3 && ('), 'not for the whole of supper')
  assert.ok(host.includes('{!startsAct4 && ('), 'and there it is the one big button: Next, which did the same, steps aside')
  assert.equal(beatsOf(3).at(-1).key, 'wrap', 'the wrap-up is the last beat of Act 3, so Next there went to Act 4 too')
  assert.ok(beatsOf(2).some(b => b.key === 'cat') && beatsOf(3).some(b => b.key === 'wrap'), 'both beats exist')
  // Ready for the dark: the big button is the Blackout itself
  assert.ok(beatsOf(1).at(-1).key === 'ready', 'Act 1 ends on Ready for the dark')
  assert.ok(host.includes("const blackoutNow = night.act === 1 && !!here && !after && night.phase !== 'blackout' && !!onBlackout"), 'at the last beat of Act 1')
  assert.ok(host.includes('<button className="big wide" disabled={!!busy} onClick={onBlackout}'), 'the big button presses Blackout')
  assert.ok(host.includes('onBlackout={blackout}'), 'the same press as the button under The acts')
  // the chime the rules film asks for is on the card during the film
  assert.ok(host.includes("{night.act === 1 && night.beat === 'rules' && ("), 'Phone chime at The house rules')
  assert.ok(host.includes("onClick={() => run('sound-test', 'chime-phone')}"), 'the same cue as the Sound test list')
  // Act 4 with four rounds: the last round's button names Act 5, as the server goes there
  assert.ok(host.includes('pastRounds ? `Next: Act 5, ${ACTS[5].plain}`'), 'no "Next: Fifth round" on a night with four')
  // one button on the tab is called Blackout: the scene chip is Lights off
  assert.ok(host.includes("['Murderwin Blackout', 'Lights off']"), 'the scene chip has its own name')
  // the vote that ran out closes within twenty seconds: the tab nudges the clock in Act 7 too
  assert.ok(host.includes('![2, 4, 6, 7].includes(night.act)'), 'the Host tab ticks in Act 7')
  // the drawing takes the whole phone for twenty minutes: its screen carries the Pause
  const panel = host.slice(host.indexOf('export function HostRelayPanel'), host.indexOf('const NAME_BUTTONS'))
  assert.ok(panel.includes("callHost({ nightId, command: 'pause' })"), 'the same pause as the Host tab')
  assert.ok(panel.includes('{inline && (') && panel.includes('>Pause, Irwin needs the garden</button>'), 'on the host’s drawing screen only')
  // the reveal panel never tells him to press Next for a result he is already on
  assert.ok(host.includes("if (action === 'end') return null"), 'gone at The End')
  assert.ok(host.includes("'All three are named. The credits run on their own.'"), 'and true on Your result')
})

test('askFirst: yes is yes, a real no is no, and a dialog the browser swallowed never makes a dead button', () => {
  let t = 1000
  const at = (answer, tookMs) => askFirst('Sure?', { confirm: () => { t += tookMs; return answer }, now: () => t })
  assert.equal(at(true, 900), true, 'OK')
  assert.equal(at(true, 0), true, 'OK, however fast')
  assert.equal(at(false, 900), false, 'Cancel, by a person')
  assert.equal(at(false, INSTANT_MS), false, 'a no that took as long as a person takes is a no')
  assert.equal(at(false, 0), true, 'an instant no is no dialog at all: the press goes through, as before the questions')
  assert.equal(at(false, INSTANT_MS - 1), true)
  assert.equal(askFirst('Sure?', { confirm: () => { throw new Error('no dialogs here') }, now: () => t }), true, 'a browser with no confirm never blocks the host')
  let asked = null
  askFirst('Move the whole night to Act 3?', { confirm: (q) => { asked = q; return true }, now: () => t })
  assert.equal(asked, 'Move the whole night to Act 3?', 'the question is the one shown')
  assert.ok(INSTANT_MS >= 20 && INSTANT_MS <= 100, 'far under any human answer, far over a swallowed call')
})
