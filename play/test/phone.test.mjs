import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promptStage, promptKeyOf, showsPrompt, PROMPT_HOLD_MS, EMPTY_NOTES, clockFor, isDark, stopOf, roleCard } from '../src/lib/night.js'
import { stopWords, STOP_MEANINGS, DEFAULT_UI } from '../src/lib/content.js'
import { THANKS } from '../src/lib/windows.js'

// The phone's own rules from docs/test-plan.md: F06, F09, F11 and F14. Pure
// helpers and the screens' source; sample docs only, nothing from a case.

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const read = p => readFileSync(join(root, p), 'utf8')
// One function's source, from its declaration to the next top-level function.
function sourceOf(file, name) {
  const src = read(file)
  const start = src.search(new RegExp(`(export )?(default )?function ${name}\\b`))
  assert.ok(start >= 0, `${file} has ${name}`)
  const rest = src.slice(start + 1)
  const end = rest.search(/\n(export )?(default )?function /)
  return end >= 0 ? src.slice(start, start + 1 + end) : src.slice(start)
}
const stamp = ms => ({ toMillis: () => ms })

// ---- F11 ---------------------------------------------------------------------

test('F11 after the blackout: one button, Sorry for the interruption, continue here; then the role card for 15 seconds on the server\'s clock with no button; then the main page on its own', () => {
  // Jon's cue list, cue 5 (25 Oct 2026); the blackout itself is at most five seconds and the server ends it (functions/test/run.test.mjs)
  assert.equal(PROMPT_HOLD_MS, 15_000)
  const tapAt = 5_000_000
  const night = { act: 2, beat: 'orient', phase: 'prompt', phaseAt: stamp(tapAt - 2_000) }
  const key = promptKeyOf(night)
  assert.equal(key, 'prompt-2')
  const untapped = { ...EMPTY_NOTES }
  const tapped = { ...EMPTY_NOTES, continued: { [key]: tapAt } }
  assert.equal(promptStage(night, untapped, () => tapAt + 99_000), 'continue', 'until the tap: the one button, however long the power has been back')
  for (const after of [0, 1, 5_000, 14_000, 14_999]) assert.equal(promptStage(night, tapped, () => tapAt + after), 'card', `F11 the card at ${after} ms after the tap`)
  for (const after of [15_000, 15_001, 60_000]) assert.equal(promptStage(night, tapped, () => tapAt + after), 'done', `F11 the main page at ${after} ms after the tap`)
  // the server's clock, not the phone's: the tap is noted on the server clock and measured against it, so a phone whose own clock runs a minute fast still holds
  const phoneFast = Date.now() + 60_000
  assert.equal(promptStage(night, { ...EMPTY_NOTES, continued: { [key]: phoneFast } }, () => phoneFast + 3_000), 'card')
  // a pause during the card freezes the clock where it stood: still the card however long the pause
  const paused = { ...night, phase: 'paused', pausedFrom: 'prompt', pausedAt: new Date(tapAt + 4_000) }
  assert.equal(promptStage(paused, tapped, clockFor(paused, () => tapAt + 600_000)), 'card', 'F11 a pause never runs the card out')
  // the gate: the flow shows while the server holds the prompt, and while the night is still on Act 2's first beat after
  // the host's first Next; once the night moves on a phone that never tapped goes to the main page, and a phone
  // mid-card keeps its fifteen seconds whatever the host presses
  assert.equal(showsPrompt(night, untapped, () => tapAt), true, 'the button, in the prompt phase')
  assert.equal(showsPrompt({ ...night, phase: 'act' }, untapped, () => tapAt), true, 'the button, still on orient after Next')
  assert.equal(showsPrompt({ ...night, phase: 'act', beat: 'news' }, untapped, () => tapAt), false, 'never tapped and the night moved on: the main page, the role on the You tab')
  assert.equal(showsPrompt({ ...night, phase: 'act', beat: 'news' }, tapped, () => tapAt + 10_000), true, 'mid-card after Next: the card keeps its seconds')
  assert.equal(showsPrompt({ ...night, phase: 'act', beat: 'news' }, tapped, () => tapAt + 15_000), false, 'then the main page')
  assert.equal(showsPrompt(night, tapped, () => tapAt + 15_000), false, 'done before the host presses Next: the main page already')
  assert.equal(showsPrompt(paused, untapped, () => tapAt), true, 'a pause taken from the prompt keeps the button up')
  assert.equal(showsPrompt({ act: 3, beat: 'down', phase: 'prompt' }, untapped, () => tapAt), true, 'a jump past Act 2 that deals the roles holds the prompt phase too: the same flow')
  assert.equal(showsPrompt({ act: 1, beat: 'ready', phase: 'act' }, untapped, () => tapAt), false)
  // the screens: the button stage has one button and no card; the card stage has no button; the blackout is dark and shows nothing
  const prompt = sourceOf('play/src/screens/Moments.jsx', 'Prompt')
  assert.match(prompt, /if \(stage === 'continue'\) \{/)
  assert.match(prompt, /<button className="big" onClick=\{continueHere\}>\{ui\.CONTINUE\}<\/button>/)
  assert.match(prompt, /continued: \{ \[promptKey\]: serverNow\(\) \}/, 'the tap notes the server clock\'s time')
  const cardStage = prompt.slice(prompt.indexOf("if (stage === 'continue')"))
  const afterButton = cardStage.slice(cardStage.indexOf('return (', cardStage.indexOf('}') ) )
  assert.ok(!/<button|ui\.HIDE|ui\.HOLD/.test(afterButton), 'the card has no button and nothing to hide')
  assert.match(afterButton, /\{card \? card\.text : ui\.ORIENT\}/)
  assert.ok(!/promptHold|canHide/.test(prompt), 'no hide button is left')
  const blackout = sourceOf('play/src/screens/Moments.jsx', 'Blackout')
  assert.ok(!/<button|\{ui\./.test(blackout), 'the blackout shows nothing to tap and no words')
  assert.equal(isDark({ phase: 'blackout' }), true)
  assert.equal(isDark({ phase: 'paused', pausedFrom: 'blackout' }), true, 'a pause in the dark stays dark')
  const app = read('play/src/App.jsx')
  assert.match(app, /if \(isDark\(n\)\) return <Blackout \/>/)
  assert.match(app, /const clock = clockFor\(n, serverNow\)\s*if \(showsPrompt\(n, notes, clock\)\) \{/, 'the gate is the pure rule, on the server clock frozen in a pause')
  // a reloading phone stays dark until its own notes have loaded, rather than flash the button at one that already tapped
  assert.match(app, /if \(!notesDoc\.loaded\) return <Blackout \/>/)
  assert.match(app, /return <Prompt [^\n]*serverNow=\{clock\}[^\n]*stage=\{promptStage\(n, notes, clock\)\}/)
  assert.equal(DEFAULT_UI.CONTINUE, 'Sorry for the interruption, continue here')
  assert.ok(!/hide/i.test(DEFAULT_UI.ORIENT), 'the orientation line no longer says to hide anything')
})

// ---- F06 ---------------------------------------------------------------------

test('F06 every role card needs the same tap: one continue button, one card with no button, one show-again button, whatever the role', () => {
  // the card itself: the same kind and the same place for every role (functions/test/windows.test.mjs checks the server deals it so)
  for (const text of ['(a Murderer card)', '(a Ghost card)', '(a Detective card)']) {
    const card = { id: '2-power-role', act: 2, beat: 'orient', kind: 'role', text }
    assert.equal(roleCard({ cards: [card] })?.id, '2-power-role')
  }
  // nothing on the phone ever branches on which role a card is
  const roleWords = /\b(murderer|ghost|detective)\b|MURDERER|GHOST|DETECTIVE|\.role\b/i
  const prompt = sourceOf('play/src/screens/Moments.jsx', 'Prompt')
  assert.ok(!roleWords.test(prompt), 'the prompt treats every role card alike')
  assert.equal((prompt.match(/<button/g) ?? []).length, 1, 'one button on the prompt: continue here (the card itself has none)')
  const you = read('play/src/screens/Rest.jsx')
  const row = you.slice(you.indexOf('const role = roleCard(session)'), you.indexOf('</section>', you.indexOf('className="role-row"')))
  assert.ok(row.length > 100, 'found the You tab\'s role row')
  assert.ok(!roleWords.test(row.replace(/role-row|role-card|role-again|role-hint|showRole|setShowRole|roleCard|YOUR ROLE|SHOW ROLE|HIDE ROLE|const role\b|\brole &&|\{role\.text\}/g, '')), 'the You tab treats every role card alike')
  assert.equal((row.match(/<button/g) ?? []).length, 1, 'one button on the You tab: show or put it away')
})

// ---- F09 ---------------------------------------------------------------------

// Every file a phone or a room screen shows words from.
function walk(dir, ext) {
  const out = []
  for (const name of readdirSync(join(root, dir))) {
    const p = join(dir, name)
    if (statSync(join(root, p)).isDirectory()) out.push(...walk(p, ext))
    else if (ext.some(e => name.endsWith(e))) out.push(p)
  }
  return out
}
const WAITING = /\bwait(?:ing)?\s+(?:for|on)\s+(?:the\s+)?(?:other\s+|rest\s+of\s+the\s+)?(?:players?|guests?|others|everyone|everybody|rest|group|room)\b|\bnot everyone (?:has|is)\b/i
// The words a file shows, without its code comments (a comment may say what the screen never does).
const shown = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

test('F09 no "waiting for other players" screen ever appears: no such words anywhere a phone or a room screen reads, and every finished screen has its own way on', () => {
  const files = [
    ...walk('play/src', ['.js', '.jsx']),
    ...['deal', 'act4', 'windows', 'relay', 'hosts', 'station', 'screen', 'finale', 'night', 'news', 'bagclues', 'cats'].map(f => `functions/lib/${f}.js`),
    ...['night', 'safe-content', 'cat-lines', 'woof-news', 'bag-lines', 'game-names'].map(f => `seed/${f}.json`),
  ]
  assert.ok(files.length > 40, `read ${files.length} files`)
  const hits = files.filter(f => WAITING.test(shown(read(f))))
  assert.deepEqual(hits, [], 'F09 no file carries waiting-for-players words')
  for (const line of Object.values(DEFAULT_UI)) assert.ok(!WAITING.test(line))
  // the Parlour Game's last screen is Thanks with its own Done, never a wait for the room
  assert.ok(THANKS.button && !WAITING.test(Object.values(THANKS).join(' ')))
  // and once a phone has answered, it goes straight back to where it was (App.jsx): no screen in between
  // (the ballot is a card on Now since 25 Oct 2026, so it never becomes the screen: placement 'card')
  const app = read('play/src/App.jsx')
  assert.match(app, /if \(w && sent !== w\.id && where !== 'card'\) \{/)
  assert.ok(!/Waiting|waiting/.test(app.replace(/\/\/.*$/gm, '')), 'App.jsx has no waiting state of its own')
  // the check bites
  assert.ok(WAITING.test('Waiting for the other players...') && WAITING.test('Waiting on everyone to finish') && WAITING.test('Not everyone has answered yet'))
  assert.ok(!WAITING.test('A Parlour Game is waiting. Play it when you have a moment.') && !WAITING.test('Salem Crooknog is waiting for you in the Orangerie.'))
})

// ---- F14 ---------------------------------------------------------------------

test('F14 the Cats tab shows the five-stop slider, Cold shoulder to Devoted, and never a number', () => {
  const words = stopWords({})
  assert.deepEqual(words, ['Cold shoulder', 'Wary', 'Undecided', 'Fond', 'Devoted'])
  assert.equal(STOP_MEANINGS.length, 5)
  for (const w of [...words, ...STOP_MEANINGS]) assert.ok(!/\d/.test(w), 'F14 no digit in a stop word or its meaning')
  // a workshop STOPS line that is not five words falls back to the five
  assert.deepEqual(stopWords({ STOPS: 'Cold, Warm' }), words)
  // every affection the server keeps (half steps, and anything out of range) lands on one of the five words
  for (let a = -1; a <= 7; a += 0.5) assert.ok(words.includes(words[stopOf(a) - 1]), `F14 affection ${a} shows a word`)
  assert.equal(words[stopOf(undefined) - 1], 'Undecided')
  // the tab: a picture of a slider (not a control), five stops, a word under it; no number is ever rendered
  const cats = read('play/src/screens/Rest.jsx')
  const tab = cats.slice(cats.indexOf('function Cats('), cats.indexOf('function Rules('))
  assert.ok(tab.includes('function Slider('), 'the slider is on the tab')
  assert.match(tab, /<div className="slider" role="img" aria-label=\{words\[level - 1\]\}>/, 'its label is the word')
  assert.match(tab, /\{words\.map\(\(w, i\) => <span key=\{w\} className=\{`stop\$\{i \+ 1 <= level \? ' lit' : ''\}`\} \/>\)\}/, 'five stops, one per word')
  assert.ok(!/<input|type="range"/.test(tab), 'the marker cannot be dragged')
  // a bare number as a child of the page: {level}, {house}, {shown}, {pct}, or the affection itself
  const bare = /(?<![=\w$])\{\s*(level|houseLevel|house|shown|pct|session\.affection[^}]*|cat\.level)\s*\}/
  assert.ok(!bare.test(tab), 'F14 no number is rendered on the Cats tab')
  assert.ok(bare.test('<p className="stop-word">{level}</p>') && !bare.test('<Slider level={level} />') && !bare.test('`stop-${level}`'), 'the rule catches a bare number and nothing else')
  assert.ok(!/toFixed|\{\s*Math\.round/.test(tab), 'F14 no rounded number is rendered either')
})
