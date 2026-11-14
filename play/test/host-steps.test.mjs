// The Host tab says what the house does by itself and what is the host's to do (14 Nov 2026, Jon: "I need
// the host side to have clear instructions that I fail safes vs what I need to manually do"; and "The hall
// green/red? I think you mean the orangerie").
//   - The Run the night card shows two lines a beat (lib/hostSteps.js): By itself, and You.
//   - Below it, four bands: Yours, when it happens / Fail-safes / If something goes wrong / Before the
//     guests come. Every button is still there, under the band that says whose it is.
//   - The light that goes red and green is the bedroom lock light (his cue list's name), never "the hall".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HOST_STEPS, hostStep, pressesOf, piecesOf, movesByItself, goOnAsk, drawingRuns, LATE_MS, GAMES_MS } from '../src/lib/hostSteps.js'
import { rulesStillPlaying, filmTimeline, INTRO_MS, AFTER_INTRO_MS, INTRO_GRACE_MS } from '../src/lib/rulesfilm.js'
import { isRehearsalNight } from '../src/lib/night.js'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const night = JSON.parse(read('../../seed/night.json'))
const plain = s => s.replace(/’/g, "'")
const host = read('../src/screens/Host.jsx')
const phone = plain(['Host.jsx', 'Relay.jsx', 'GoodNight.jsx'].map(f => read(`../src/screens/${f}`)).join('\n'))

test('every beat of the night has its two lines, and no line is for a beat that is not there', () => {
  const beats = Object.entries(night.acts).flatMap(([n, a]) => a.beats.map(b => `${n}/${b.key}`))
  assert.ok(beats.length >= 30, `the night has ${beats.length} beats`)
  assert.deepEqual(Object.keys(HOST_STEPS).sort(), [...beats].sort())
  for (const k of beats) {
    const s = HOST_STEPS[k]
    for (const line of [s.auto, s.you]) {
      assert.ok(typeof line === 'string' && line.length >= 15 && line.length <= 260, `${k}: a short line (${line.length})`)
      assert.ok(!/—|–/.test(line), `${k}: no long dash`)
      assert.ok(!/\bhall\b/i.test(line), `${k}: the light is the bedroom lock light, never "the hall"`)
      assert.ok(/[.!]$/.test(line.replace(/\*\*/g, '')), `${k}: ends as a sentence`)
    }
    assert.ok(!/^(by itself|you)\b/i.test(s.auto) && !/^you:/i.test(s.you), `${k}: the labels are the card's, not the line's`)
  }
  const [n, key] = beats[0].split('/')
  assert.equal(hostStep(Number(n), key), HOST_STEPS[beats[0]])
  assert.equal(hostStep(1, 'nope'), null)
  assert.equal(hostStep(0, null), null)
})

test('every press a line names is a button on the host\'s own phone, by its own name', () => {
  const presses = [...new Set(Object.values(HOST_STEPS).flatMap(s => [...pressesOf(s.auto), ...pressesOf(s.you)]))]
  for (const p of presses) assert.ok(phone.includes(plain(p)), `the phone has "${p}"`)
  for (const must of ['Next', 'Phone chime', 'Blackout', 'Supper’s ready', 'Start Act 4', 'Cake!', 'At the paper', 'Hide this', 'Start the vote', 'Name the Murderer', 'Name the Motive', 'Name the Victim', 'Good night']) {
    assert.ok(presses.includes(must), `a line names ${must}`)
  }
  // the By itself line never asks for a press
  for (const [k, s] of Object.entries(HOST_STEPS)) assert.deepEqual(pressesOf(s.auto), [], `${k}: nothing to press in the By itself line`)
  // the pieces for the card: the presses in bold, the words kept whole
  assert.deepEqual(piecesOf('Press **Cake!** when it is served, then **Next**.'), [
    { text: 'Press ', press: false }, { text: 'Cake!', press: true }, { text: ' when it is served, then ', press: false }, { text: 'Next', press: true }, { text: '.', press: false },
  ])
  for (const s of Object.values(HOST_STEPS)) for (const line of [s.auto, s.you]) assert.equal(piecesOf(line).map(x => x.text).join(''), line.replace(/\*\*/g, ''))
})

test('where the night moves by itself the card says so, and where a stray Next would skip something it says that too', () => {
  const you = k => HOST_STEPS[k].you
  // the night moves by itself here: nothing to press (checked against functions/lib/run.js clockTick, 14 Nov 2026),
  // and the card shows no big button there (movesByItself, below)
  for (const k of ['1/arrive', '2/cat', '4/warn', '4/groups', '4/round1', '4/round2', '4/round3', '6/games']) assert.match(you(k), /^Nothing to press\b/, k)
  for (const k of ['4/round4', '4/round5']) assert.match(you(k), /When this tab says The rounds are over, press \*\*Next\*\* for Act 5\.$/, k)
  assert.match(you('1/arrive'), /If there is no countdown, press \*\*Next\*\* to start the intro\.$/)
  assert.match(you('2/cat'), /If the food is ready before everyone has finished, press \*\*Supper’s ready\*\*\.$/)
  // where the host must wait for something to finish first, the line says what a stray press would cut off
  assert.match(you('1/rules'), /Do not press Next while the film plays/)
  assert.match(you('5/irwin'), /Do not press Next or Cake! until he has finished/)
  // the press that moves the night on is the last thing the line says
  for (const k of ['1/rules', '1/meet', '1/introduce', '2/orient', '2/news', '2/peek', '2/supper', '3/down', '3/bulletin', '5/roam', '5/irwin', '5/update', '6/drawing', '6/door', '7/ballot', '7/reveal', '7/result']) {
    assert.match(you(k), /press \*\*Next\*\*[^*]*\.$/i, k)
  }
  assert.match(you('1/ready'), /press \*\*Blackout\*\*\. Then press nothing/)
  assert.match(you('3/wrap'), /press \*\*Start Act 4\*\*\.$/)
  assert.match(you('6/talk'), /press \*\*Start the vote\*\*\.$/)
  assert.match(you('7/end'), /^Press \*\*Good night\*\*\./)
  // the three things only a person can do with their hands: the iPad is carried three times
  assert.match(you('2/supper'), /Carry the iPad from the Library to its stand on the supper table/)
  assert.match(you('3/wrap'), /Carry the iPad back to its stand in the Library/)
  assert.match(you('5/roam'), /Carry the iPad from the Library into the bedroom and shut the door/)
  // what the host says out loud is kept from the beat's own words
  assert.match(you('2/peek'), /every motive a cat names is a wrong one, even when Salem says it started there/)
  assert.match(you('6/talk'), /Murderer, name yourself as the Murderer\. Ghost, name yourself as the Ghost\./)
  // the light: red at the power's return, green when the third picture is named (not at the door beat)
  assert.match(HOST_STEPS['2/orient'].auto, /The bedroom lock light turns red/)
  assert.match(HOST_STEPS['6/drawing'].auto, /When the third picture is named, the bedroom lock light turns green/)
  assert.ok(!/lock light/.test(HOST_STEPS['6/door'].auto), 'nothing about the light at the door beat: it is green already')
})

test('the Run the night card shows the two lines, and falls back to the beat\'s own words', () => {
  const run = host.slice(host.indexOf('export function RunPanel('), host.indexOf('// The drawing on the host\'s own phone'))
  assert.ok(run.includes('const step = jumped ? null : hostStep(night.act, night.beat)'))
  assert.ok(run.includes('<p className="run-step run-auto"><span className="run-label">By itself</span>{words(step.auto)}</p>'))
  assert.ok(run.includes('<p className="run-step run-yours"><span className="run-label">You</span>{words(step.you)}</p>'))
  assert.ok(run.includes(') : <p className="gloss run-what">{here.what}</p>}'), 'a beat the file does not know shows its own words')
  assert.ok(run.includes('p.press ? <strong key={i}>{p.text}</strong> : p.text'), 'a press is shown in bold')
  // the chips under the big button are fail-safes, and say so
  assert.ok(run.indexOf('{nextLabel}</button>') < run.indexOf('Fail-safes, not needed on a night that is going well:'))
  assert.ok(run.indexOf('Fail-safes, not needed on a night that is going well:') < run.indexOf('>Back one</button>'))
  // a round's line no longer invites a press
  assert.ok(run.includes('`Round ${act4.round} of ${act4.rounds}: the chime comes by itself in ${left(act4.roundEndsAt)}.`') || host.includes('`Round ${act4.round} of ${act4.rounds}: the chime comes by itself in ${left(act4.roundEndsAt)}.`'))
  assert.ok(!host.includes('Next moves everyone on now'))
  const css = read('../src/styles.css')
  for (const c of ['.run-steps', '.run-step.run-yours', '.run-label', '.host-band h2']) assert.ok(css.includes(c), c)
  // class names of their own: a plain "you" met the You tab's rule and centred the line (seen in the first screenshot)
  assert.ok(!/className="run-step (auto|you)"/.test(host))
})

test('Next asks first while the rules film is still playing', () => {
  const film = filmTimeline()
  const beatAt = 1_000_000
  const n = { act: 1, beat: 'rules', phase: 'act', beatAt }
  // (the film can run up to six seconds behind the clock on a TV whose intro video ended late: asked until then)
  const end = beatAt + INTRO_MS + AFTER_INTRO_MS + film.total + INTRO_GRACE_MS
  assert.equal(rulesStillPlaying(n, beatAt + 1000), true, 'in the intro')
  assert.equal(rulesStillPlaying(n, end - 1000), true, 'in the last slide')
  assert.equal(rulesStillPlaying(n, end + 1), false, 'the film is over: Next is the host\'s to press')
  assert.equal(rulesStillPlaying({ ...n, beat: 'meet' }, beatAt + 1000), false, 'only at The house rules')
  assert.equal(rulesStillPlaying({ ...n, act: 2 }, beatAt + 1000), false)
  assert.equal(rulesStillPlaying({ ...n, beatAt: null }, beatAt + 1000), false)
  assert.equal(rulesStillPlaying(null, beatAt), false)
  assert.ok(host.includes("if (rulesStillPlaying(night, clock) && !askFirst('The rules film is still playing. Stop it and go on?')) return"))
  // it is the first question Next asks, and it lets the press through on a yes like every other
  const next = host.slice(host.indexOf('  const next = () => {'), host.indexOf('  const back = () => {'))
  assert.ok(next.indexOf('rulesStillPlaying') < next.indexOf("run('next'"))
})

test('the bands: yours, the house and the guests, fail-safes, if something goes wrong, before the guests come, in that order, and every button under its own', () => {
  const body = host.slice(host.indexOf('export default function Host('), host.indexOf('// A band of the Host tab'))
  const at = s => { const i = body.indexOf(s); assert.ok(i > 0, `the tab has ${s}`); return i }
  const bands = ['<Band title="Yours, when it happens">', '<Band title="The house and the guests">', '<Band title="Fail-safes">', '<Band title="If something goes wrong">', '<Band title="Before the guests come">'].map(at)
  assert.deepEqual([...bands].sort((a, b) => a - b), bands, 'in this order')
  const [yours, glance, safes, wrong, before] = bands
  const between = (s, from, to) => { const i = at(s); assert.ok(i > from && i < to, `${s} is in its band`) }
  const end = body.length
  // the card at the top comes first, with the reveal and Good night beside it
  for (const top of ['<RunPanel ', '<GoodNight ', '<RevealPanel ']) assert.ok(at(top) < yours, top)
  // only the host can know these have happened
  for (const s of ['>Pause, Irwin needs the garden</button>', '<SalemPanel ', '<FetchPanel ', '<AchievementsPanel ']) between(s, yours, glance)
  // who and what has been heard from
  for (const s of ['<HousePanel ', '<h3>Who is here</h3>', 'Hand this phone on</button>', 'className="host-qr"']) between(s, glance, safes)
  // the house does these by itself
  for (const s of ['<LockLight ', '<ScenesPanel ', '<IpadPanel ', '>Make the groups</button>', '>Start the drawing</button>', "'Show the trace on the TV'"]) between(s, safes, wrong)
  // only to put a night right
  for (const s of ['<h3>Move the night by hand</h3>', 'onClick={() => goToAct(Number(n))}', '>Blackout</button>', '>Power returns · Act 2</button>', '<Safeguards ', '>Clear the drawing</button>', "'Close the doors' : 'Open the doors'", '>Resend rules &amp; bios</button>']) between(s, wrong, before)
  // setting up
  for (const s of ['<SoundList ', '<BlackoutTest ', '<StationKey ', '<StartNight ']) between(s, before, end)
  // each band says in one line whose its buttons are
  assert.match(body, /<Band title="Fail-safes">The house does all of this by itself\. Press one only if something did not happen\.<\/Band>/)
  assert.match(body, /<Band title="Yours, when it happens">Only you can know when these happen\. Everything else that is yours to press is at the top of this tab\.<\/Band>/)
  // one big button at a time: the only big buttons left on the tab itself are on the card at the top
  assert.ok(!/className="big wide"/.test(body.slice(yours)), 'no big button below the card')
  // every fail-safe says what happens by itself
  for (const s of ['are made when you press Start Act 4. Press this only if you need the groups before then', 'By itself: the drawing starts when Act 6’s second game is done', 'By itself: the doors stay open all night']) at(s)
  for (const s of ['By itself: the brain sets the lights for every moment of the night', 'By itself: the brain starts and stops the music for every moment', 'Lights off is only the lights: it is not the Blackout']) assert.ok(host.includes(s), s)
  assert.ok(read('../src/screens/IpadPanel.jsx').includes('By itself: the iPad follows the night (Auto). You only carry it.'))
})

test('the light that goes red and green is the bedroom lock light, on the Host tab and in what it says back', () => {
  assert.ok(!/hall light|Hall light|hall bulb/.test(host.replace(/\/\/[^\n]*|\{\/\*[\s\S]*?\*\/\}/g, '')), 'no "hall light" in anything the tab shows')
  assert.ok(host.includes('<h3>The bedroom lock light</h3>'))
  assert.ok(host.includes('The bulb outside the bedroom door: green means the bedroom is open, red means it is locked.'))
  assert.ok(host.includes('By itself it is green for the welcome, off in the blackout, red when the power returns, and green when the third picture is named.'))
  assert.ok(host.includes("case 'hall': return `The bedroom lock light is ${r.hall}.`"))
  assert.ok(host.includes("'The drawing is cleared. The door is shut again and the bedroom lock light is red.'"))
  // the command and the server keep their own name for it: nothing but words changed
  assert.ok(host.includes("onClick={() => run('hall', 'red')}>Red</button>") && host.includes("onClick={() => run('hall', 'green')}>Green</button>"))
  // the beat's own words say the same, for the workshop's Timeline
  const door = night.acts['6'].beats.find(b => b.key === 'door')
  assert.ok(!/hall/i.test(door.what), 'the door beat no longer says "the hall light"')
})

test('where the night moves by itself the card has no big button: Nothing to press, and Next is a fail-safe that asks first', () => {
  const at = (act, beat, more = {}) => movesByItself({ act, beat, phase: 'act', ...more })
  // Arrivals: only while the intro's countdown runs
  assert.equal(at(1, 'arrive', { counting: true }), true)
  assert.equal(at(1, 'arrive', { counting: false }), false, 'no countdown: Next is the host\'s to press')
  for (const b of ['rules', 'meet', 'introduce', 'ready']) assert.equal(at(1, b, { counting: true }), false, b)
  // Act 2: the cat visits only
  assert.equal(at(2, 'cat'), true)
  for (const b of ['orient', 'news', 'peek', 'supper']) assert.equal(at(2, b), false, b)
  // Act 3 and Act 5 wait for the host at every beat
  for (const [a, b] of [[3, 'down'], [3, 'bulletin'], [3, 'wrap'], [5, 'roam'], [5, 'irwin'], [5, 'update']]) assert.equal(at(a, b), false, `${a}/${b}`)
  // Act 4: the warning, the groups and every round, until the rounds are over
  for (const phase of ['warn', 'groups', 'rounds']) assert.equal(at(4, 'round2', { act4: { phase } }), true, phase)
  assert.equal(at(4, 'round4', { act4: { phase: 'done' } }), false, 'the rounds are over: Next for Act 5 is the host\'s')
  assert.equal(at(4, 'warn', { act4: undefined }), true, 'before the house has said where Act 4 stands, nothing invites a press')
  assert.equal(at(4, 'warn'), true, 'the same when nothing is passed')
  assert.equal(at(4, 'warn', { act4: null }), false, 'no Act 4 clock at all: nothing will move by itself, so Next is the host\'s (the review of 14 Nov 2026)')
  assert.equal(at(4, 'round1', { act4: {} }), true)
  // Act 6: the two games only
  assert.equal(at(6, 'games'), true)
  for (const b of ['drawing', 'door', 'talk']) assert.equal(at(6, b), false, b)
  // Act 7 waits for the host
  for (const b of ['ballot', 'reveal', 'result', 'end']) assert.equal(at(7, b), false, b)
  // never in the dark, the role cards or a pause: those have their own words
  for (const phase of ['blackout', 'prompt', 'paused', 'lobby']) assert.equal(movesByItself({ act: 2, beat: 'cat', phase }), false, phase)
  assert.equal(movesByItself(), false)
  // every beat it is true for says Nothing to press, and no other beat does
  for (const [k, s] of Object.entries(HOST_STEPS)) {
    const [a, b] = k.split('/')
    const may = at(Number(a), b, { counting: true, act4: { phase: 'rounds' } })
    if (/^Nothing to press\b/.test(s.you)) assert.equal(may, true, `${k} says Nothing to press, so the night must move by itself there`)
  }
  // the questions Go on now asks
  for (const a of [1, 4, 6, 2]) assert.match(goOnAsk(a), /\?$/)
  assert.match(goOnAsk(4), /for every group\?$/)
  assert.match(goOnAsk(6), /A game not yet played is dropped\. Skip ahead now\?$/)
  // the card
  const run = host.slice(host.indexOf('export function RunPanel('), host.indexOf('// The drawing on the host\'s own phone'))
  assert.ok(run.includes("act: night.act, beat: night.beat, phase: night.phase, now: clock,") && run.includes("counting: countdownLeft(night, clock) != null, introAt: night.introAt, beatAt: night.beatAt,") && run.includes("act4: act4Loaded ? act4 : undefined, relay,"))
  // Act 4's record counts as loaded only when the house really said it: not on an error, not on an empty guess from this phone's own memory
  assert.ok(host.includes('act4={act4.data} act4Loaded={act4.loaded && !act4.error && !(act4.data == null && act4.fromCache)} relay={relay.data}'))
  // ...and if the house has still said nothing about Act 4, Next asks before it moves every group
  assert.ok(host.includes('if (night.act === 4 && !act4 && !askFirst(goOnAsk(4))) return'))
  // an act reached by its number before the roles are out starts on Next: the card shows the beat's own words there, never "Nothing to press"
  assert.ok(run.includes("const jumped = night.phase === 'prompt' && !(night.act === 2 && night.beat === 'orient')"))
  assert.ok(run.includes('const step = jumped ? null : hostStep(night.act, night.beat)'))
  assert.ok(run.includes('? <p className="host-msg run-itself" role="status">Nothing to press. This moves on by itself.</p>'))
  assert.ok(run.indexOf('{blackoutNow') < run.indexOf(': itself') && run.indexOf(': itself') < run.indexOf('<button className="big wide" disabled={!canNext} onClick={next}>{nextLabel}</button>'), 'Blackout first, then by itself, then Next')
  // while the drawing runs the house refuses Next, so the card does not offer it; at The End the one button is Good night
  for (const state of ['intro', 'walk', 'turn', 'vote', 'lockout']) assert.equal(drawingRuns({ act: 6, beat: 'drawing', relay: { state } }), true, state)
  for (const state of ['done', 'idle', undefined]) assert.equal(drawingRuns({ act: 6, beat: 'drawing', relay: { state } }), false, String(state))
  assert.equal(drawingRuns({ act: 6, beat: 'games', relay: { state: 'walk' } }), false, 'only at the drawing\'s own beat')
  assert.equal(drawingRuns({ act: 6, beat: 'drawing', relay: null }), false)
  assert.ok(run.includes('? <p className="host-msg run-itself" role="status">Nothing to press here. The drawing is running.</p>'))
  assert.ok(run.includes("const ended = night.act === 7 && here?.action === 'end'") && run.includes(': ended\n                  ? null'), 'no dead big button above Good night')
  // Cake! is big only at the Cake beat; small while Sir Irwin speaks and after
  assert.ok(run.includes("<button className={night.beat === 'roam' ? 'big wide' : 'chip wide'} disabled={!!busy} onClick={() => run('cake')}"))
  // Next is still there as a fail-safe, small, under the words that say so, and it asks first
  assert.ok(run.includes("{goOnShown && <button className=\"chip\" disabled={!canNext} onClick={goOn}>{nextLabel.replace(/^Next: /, 'Go on now: ')}</button>}"))
  assert.ok(run.includes("const goOn = () => { if (askFirst(goOnAsk(night.act))) run('next', { from: `${night.act ?? 0}/${night.beat ?? ''}` }) }"))
  assert.ok(run.includes("const goOnShown = itself && !(night.act === 2 && night.beat === 'cat')"), 'at the cat visits the hand way is Supper\'s ready: no second button for the same thing')
  assert.ok(run.indexOf('Fail-safes, not needed on a night that is going well:') < run.indexOf('{goOnShown &&'))
  // the countdown's own line no longer points at Next
  assert.ok(host.includes('by itself. To hold it for late guests, press Back one once it starts.</p>'))
  assert.ok(!host.includes('Next goes sooner'))
})

test('the host is never left with only the small chip: a clock that failed, or a drawing started by hand, brings the big button back', () => {
  const T0 = 5_000_000
  const at = (act, beat, more = {}) => movesByItself({ act, beat, phase: 'act', now: T0, ...more })
  assert.equal(LATE_MS, 90_000)
  assert.equal(GAMES_MS, 300_000)
  // Arrivals: the intro's time has passed and the night has not moved for a minute and a half
  assert.equal(at(1, 'arrive', { counting: true, introAt: T0 + 60_000 }), true, 'counting down')
  assert.equal(at(1, 'arrive', { counting: true, introAt: T0 - 30_000 }), true, 'just past its time: the house is moving it')
  assert.equal(at(1, 'arrive', { counting: true, introAt: T0 - LATE_MS - 1 }), false, 'long past: Next is back')
  // Act 4: each of its three clocks
  for (const [phase, key] of [['warn', 'warnEndsAt'], ['groups', 'lockEndsAt'], ['rounds', 'roundEndsAt']]) {
    assert.equal(at(4, 'round1', { act4: { phase, [key]: T0 + 1000 } }), true, `${phase}: running`)
    assert.equal(at(4, 'round1', { act4: { phase, [key]: T0 - 20_000 } }), true, `${phase}: the chime is due any second`)
    assert.equal(at(4, 'round1', { act4: { phase, [key]: T0 - LATE_MS - 1 } }), false, `${phase}: its clock has failed, so Next is back`)
    assert.equal(at(4, 'round1', { act4: { phase, [key]: { toMillis: () => T0 - LATE_MS - 1 } } }), false, 'a Firestore time reads the same')
  }
  // Act 6's games: a drawing started by hand (Start the drawing does not move the beat), or no drawing five minutes on
  assert.equal(at(6, 'games', { beatAt: T0 - 60_000 }), true, 'the games are on')
  assert.equal(at(6, 'games', { beatAt: T0 - 60_000, relay: { state: 'idle' } }), true, 'a cleared drawing is no drawing')
  for (const state of ['intro', 'walk', 'turn', 'vote', 'done']) assert.equal(at(6, 'games', { beatAt: T0 - 60_000, relay: { state } }), false, `a drawing is ${state}: the night will not leave the games by itself`)
  assert.equal(at(6, 'games', { beatAt: T0 - GAMES_MS - 1 }), false, 'no drawing after five minutes: Next is back')
  assert.equal(at(6, 'games', {}), true, 'no time to go by: as the games')
})

// 14 Nov 2026, Jon: "I need a way to end the night when testing."
test('a practice night can be ended from the Host tab: it asks first, stops the music, then the night is gone; never on the party night', () => {
  const body = host.slice(host.indexOf('export default function Host('), host.indexOf('// A band of the Host tab'))
  // the button sits right under the line that says this is a practice night, above the card
  assert.ok(body.includes('<EndPractice night={night} disabled={!!busy} />'))
  assert.ok(body.indexOf("'This is a practice night' : 'This is the party night'") < body.indexOf('<EndPractice '))
  assert.ok(body.indexOf('<EndPractice ') < body.indexOf('<RunPanel '), 'above the card: easy to find when trying things')
  // one button, drawn only on a practice night, and the press checks again
  const end = host.slice(host.indexOf('export function EndPractice('), host.indexOf('// The one button a pause leaves'))
  assert.ok(end.includes('if (!isRehearsalNight(night)) return null'), 'the party night: nothing is drawn')
  assert.ok(end.includes('<button className="chip" disabled={busy || disabled} onClick={end}>End this practice night</button>'))
  assert.equal(isRehearsalNight({ forceRehearsal: false }), false, 'the party night')
  assert.equal(isRehearsalNight({ forceRehearsal: true }), true)
  assert.equal(isRehearsalNight({}), true, 'a night with no word either way is a practice night')
  // it asks first, in plain words that say what goes
  assert.match(host, /export const END_PRACTICE_ASK = 'End this practice night\? The music stops, every phone and screen goes back to the start, and what was played is thrown away\.'/)
  assert.ok(end.includes('if (!askFirst(END_PRACTICE_ASK)) return'), 'never by one stray tap')
  assert.ok(end.indexOf('if (!isRehearsalNight(night)) return //') > 0 && end.indexOf('if (!isRehearsalNight(night)) return //') < end.indexOf('askFirst(END_PRACTICE_ASK)'), 'and never the party night, whatever drew the button')
  // the music first (the Host tab goes with the night, and nothing else could stop it), then a moment for the brain to hear it, then the night
  const music = end.indexOf("await callHost({ nightId: night.nightId, command: 'music', arg: 'pause' }).catch(() => {})")
  const wait = end.indexOf('await new Promise(r => setTimeout(r, END_PRACTICE_WAIT_MS))')
  const gone = end.indexOf("await callHost({ nightId: night.nightId, command: 'discard-night' })")
  assert.ok(music > 0 && wait > music && gone > wait, 'in that order')
  assert.match(host, /export const END_PRACTICE_WAIT_MS = 2500/)
  // a failure says so and leaves the night as it was; the button is never left greyed out
  assert.ok(end.includes("setMsg(`That didn’t work: ${troubleLine(e, 'press it again.')}`)") && end.includes('} finally {\n      setBusy(false)'))
  // it is on the pause card of a host's phone too, so Pause then End works from anywhere (the drawing's screen has Pause)
  assert.ok(host.includes('{night && <EndPractice night={night} disabled={busy} />}'))
  assert.ok(read('../src/App.jsx').includes('<ResumeNight nightId={nightId} night={n} />'))
  // the Manor's own command does the work, and it refuses a real night's case (the server is not changed)
  const discard = read('../../functions/lib/discard.js')
  assert.ok(discard.includes("if (c.rehearsal === false) return { ok: false, reason: 'real-case' }"))
  assert.ok(discard.includes("await activeRef.set({ nightId: null, since: FieldValue.serverTimestamp() })"), 'no night is live afterwards')
  assert.ok(read('../../functions/lib/run.js').includes("case 'discard-night':\n      return discard.discardNight(db, { nightId })"))
  // with no night live every phone is at the doors, with Start the night
  assert.ok(read('../src/App.jsx').includes('if (!nightId) return <Moment text={ui.DOORS} crest foot={<StartNight ui={ui} />} />'))
})
