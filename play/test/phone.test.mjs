import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promptHold, PROMPT_HOLD_MS, clockFor, isDark, stopOf, roleCard } from '../src/lib/night.js'
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

test('F11 blackout messages hold every phone for 15 seconds on the server\'s clock, then a hide button', () => {
  assert.equal(PROMPT_HOLD_MS, 15_000)
  const powerAt = 5_000_000
  const night = { act: 2, phase: 'prompt', phaseAt: stamp(powerAt) }
  for (const after of [0, 1, 5_000, 14_000, 14_999]) assert.equal(promptHold(night, () => powerAt + after).canHide, false, `F11 held at ${after} ms`)
  for (const after of [15_000, 15_001, 60_000]) assert.equal(promptHold(night, () => powerAt + after).canHide, true, `F11 a hide button at ${after} ms`)
  assert.equal(promptHold(night, () => powerAt + 10_000).remaining, 5_000, 'five seconds still to hold')
  // the server's clock, not the phone's: a phone whose own clock runs a minute fast still holds
  const phoneFast = Date.now() + 60_000
  assert.equal(promptHold({ ...night, phaseAt: stamp(phoneFast) }, () => phoneFast + 3_000).canHide, false)
  // the moment not yet on the phone (the server's stamp on its way): held
  assert.equal(promptHold({ act: 2, phase: 'prompt', phaseAt: null }, () => powerAt + 99_000).canHide, false)
  // a pause during the prompt freezes the clock where it stood: still held however long the pause
  const paused = { act: 2, phase: 'paused', pausedFrom: 'prompt', phaseAt: stamp(powerAt), pausedAt: new Date(powerAt + 4_000) }
  assert.equal(promptHold(paused, clockFor(paused, () => powerAt + 600_000)).canHide, false, 'F11 a pause never runs the hold out')
  // the screens: the prompt shows Keep reading, then the hide button; the blackout itself is dark and holds every phone
  const prompt = sourceOf('play/src/screens/Moments.jsx', 'Prompt')
  assert.match(prompt, /const \{ canHide \} = promptHold\(night, serverNow\)/)
  assert.match(prompt, /\{canHide\s*\? <button className="big" onClick=\{hide\}>\{ui\.HIDE\}<\/button>\s*: <p className="hold"[^>]*>\{ui\.HOLD\}<\/p>\}/)
  const blackout = sourceOf('play/src/screens/Moments.jsx', 'Blackout')
  assert.ok(!/<button|\{ui\./.test(blackout), 'the blackout shows nothing to tap and no words')
  assert.equal(isDark({ phase: 'blackout' }), true)
  assert.equal(isDark({ phase: 'paused', pausedFrom: 'blackout' }), true, 'a pause in the dark stays dark')
  const app = read('play/src/App.jsx')
  assert.match(app, /if \(isDark\(n\)\) return <Blackout \/>/)
  assert.match(app, /if \(effectivePhase\(n\) === 'prompt' && !notes\.seen\[promptKey\]\) \{\s*return <Prompt /)
  assert.match(app, /serverNow=\{clockFor\(n, serverNow\)\}/, 'the prompt reads the server clock, frozen in a pause')
})

// ---- F06 ---------------------------------------------------------------------

test('F06 every role card needs the same tap: one prompt, one hold, one hide button, one show-again button, whatever the role', () => {
  // the card itself: the same kind and the same place for every role (functions/test/windows.test.mjs checks the server deals it so)
  for (const text of ['(a Murderer card)', '(a Ghost card)', '(a Detective card)']) {
    const card = { id: '2-power-role', act: 2, beat: 'orient', kind: 'role', text }
    assert.equal(roleCard({ cards: [card] })?.id, '2-power-role')
  }
  // nothing on the phone ever branches on which role a card is
  const roleWords = /\b(murderer|ghost|detective)\b|MURDERER|GHOST|DETECTIVE|\.role\b/i
  const prompt = sourceOf('play/src/screens/Moments.jsx', 'Prompt')
  assert.ok(!roleWords.test(prompt), 'the prompt treats every role card alike')
  assert.equal((prompt.match(/<button/g) ?? []).length, 1, 'one button on the prompt: hide')
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
  const app = read('play/src/App.jsx')
  assert.match(app, /if \(w && sent !== w\.id\) \{/)
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
