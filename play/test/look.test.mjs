import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { PICTURES, pictureFor, SPLASHES, SPLASH_ROOMS, GAME_STEPS, RULE_CARDS, NOW_STATES, WINS, TRIMS, FACES, HEADS, CATS, TWINKLES, WIN_PAWS, confetti, trimOf, trimStyle, headStyle, lookParam } from '../src/look/look.js'
import { CAT_PICTURES, CAT_NAMES } from '../src/lib/rooms.js'
import { SOUNDS, soundMs, play, unlock } from '../src/lib/soundkit.js'
import { LEVELS, pieces, celebrate } from '../src/lib/celebrate.js'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
const sentences = s => String(s).split(/[.!?]+/).map(x => x.trim()).filter(Boolean).length

test('the look book (handoff 11 Nov 2026, B1): its own address, ahead of the game, never linked from a guest’s screen', () => {
  assert.equal(lookParam('?look=1'), true)
  assert.equal(lookParam('?look'), true)
  assert.equal(lookParam('?kiosk=living'), false)
  assert.equal(lookParam(''), false)
  const main = read('../src/main.jsx')
  assert.ok(main.includes('{setup ? <Setup /> : check ? <Check /> : look ?'), 'the look book comes before the phone and the room screens')
  assert.ok(/React\.lazy\(\(\) => import\('\.\/look\/LookBook'\)\)/.test(main), 'it is loaded only when asked for')
  // no screen of the night links to it: the address appears only in the book itself and the page that opens it
  const dirs = ['../src', '../src/screens', '../src/lib']
  for (const d of dirs) {
    for (const f of readdirSync(new URL(d, import.meta.url))) {
      if (!/\.(jsx?|css)$/.test(f) || f === 'main.jsx') continue
      assert.ok(!/look=1/.test(read(`${d}/${f}`)), `${d}/${f} does not link to the look book`)
    }
  }
})

test('the look’s pictures are the household’s own, and every file is in the folder', () => {
  assert.deepEqual(PICTURES, CAT_PICTURES, 'the same lists as the room screens')
  for (const [who, files] of Object.entries(PICTURES)) {
    for (const f of files) assert.ok(existsSync(new URL(`../public/household/full/${f}`, import.meta.url)), `${who}: ${f}`)
  }
  assert.equal(pictureFor('irwin', 0), 'Irwin 1.png')
  assert.equal(pictureFor('irwin', 5), 'Irwin 1.png', 'it goes round')
  assert.equal(pictureFor('boo', 4), ' Boo 5.png', 'the fifth Boo keeps its leading space')
  assert.equal(pictureFor('nobody', 0), null)
  // the big-words face travels with the site: nothing is fetched on the night
  assert.ok(existsSync(new URL('../public/fonts/AbrilFatface-Regular.ttf', import.meta.url)))
  const css = read('../src/look/look.css')
  assert.ok(css.includes("url('/play/fonts/AbrilFatface-Regular.ttf')"))
  assert.ok(!/fonts\.googleapis|fonts\.gstatic|https?:\/\//.test(css), 'the look fetches nothing from outside')
  assert.ok(!/--brand-peat|#262500/i.test(css), 'no olive ground anywhere in the look')
})

// The look is the one Jon approved on 12 Nov 2026 (docs/look-approved.html; handoff 12 Nov, jobs 2 and 3).
test('each room’s splash: its own cat, the room’s name in lights, the cat’s name, and no other words', () => {
  assert.deepEqual(SPLASH_ROOMS, ['living', 'study', 'library', 'orangerie', 'entryway', 'bedroom'])
  const who = Object.fromEntries(SPLASH_ROOMS.map(r => [r, SPLASHES[r].who]))
  assert.deepEqual(who, { living: 'irwin', study: 'granolia', library: 'zimothy', orangerie: 'salem', entryway: 'boo', bedroom: 'irwin' }, 'the handoff’s table')
  for (const r of SPLASH_ROOMS) {
    const s = SPLASHES[r]
    assert.deepEqual(Object.keys(s).sort(), ['name', 'who'], `${r}: a cat and a name, nothing else to say`)
    assert.ok(PICTURES[s.who], `${r} has pictures`)
    assert.ok(/^The /.test(s.name), `${r} is named like a room`)
    assert.ok(CAT_NAMES[s.who], `${r}: the cat’s own name goes on the red bar`)
  }
  const parts = read('../src/look/parts.jsx')
  const splash = parts.slice(parts.indexOf('export function Splash('), parts.indexOf('// 3. A game’s card'))
  assert.ok(splash.includes('<Marquee><h2 className="lk-big" style={{ \'--chars\': s.name.length }}>{s.name}</h2></Marquee>'), 'the room’s name sits in a marquee frame')
  assert.ok(splash.includes('<p className="lk-namebar"><i aria-hidden="true" /><b>{CAT_NAMES[s.who]}</b></p>'), 'the cat’s name on a red bar')
  // Jon, 12 Nov: "Anywhere there is random text that is not mission critical lose it."
  assert.ok(!/Sirwin Manor|lk-tip|lk-line|\.line\b|tip=/i.test(splash), 'no SIRWIN MANOR, no line under the name, no tip')
  // a Mac's second display: the seal, the room's name and the cat
  const second = splash.slice(splash.indexOf('if (calm) {'), splash.indexOf('<div className={`lk-screen lk-splash'))
  assert.ok(second.includes('<img className="lk-seal-mark" src={SEAL} alt="" aria-hidden="true" />') && !second.includes('lk-namebar') && !second.includes('<Marquee'), 'the second display has the seal, the name and the cat')
  // the splash's tips are gone from the look; the server still has its own for the Parlour TV's prompts
  assert.ok(!/HOUSE_TIPS|TIP_MS/.test(read('../src/look/look.js') + read('../src/screens/Rooms.jsx')))
})

test('every picture is cut to its own edges, and every head and face has its place', () => {
  for (const [who, files] of Object.entries(PICTURES)) {
    for (const f of files) {
      const [x, y, w, h, r] = trimOf(f)
      assert.ok(TRIMS[f], `${who}: ${f} has been measured`)
      assert.ok(x >= 0 && y >= 0 && w > 0.3 && h > 0.3 && x + w <= 1.001 && y + h <= 1.001 && r > 0.3 && r < 2, `${f}: a box inside the picture`)
      const st = trimStyle(f)
      assert.ok(parseFloat(st.width) >= 100 && parseFloat(st.left) <= 0 && parseFloat(st.top) <= 0, `${f}: the picture is slid so only the cat shows`)
    }
  }
  assert.deepEqual(trimOf('not-a-file.png'), [0, 0, 1, 1, 1], 'a picture nobody measured shows whole')
  assert.deepEqual(CATS, ['granolia', 'boo', 'zimothy', 'salem'], 'the four cats a guest meets, in the drawing’s order')
  for (const c of [...CATS, 'irwin']) {
    assert.ok(existsSync(new URL(`../public/household/faces/${FACES[c]}`, import.meta.url)), `${c}’s face is in the folder`)
    assert.ok(TRIMS[FACES[c]], `${c}’s face has been measured`)
  }
  // every character's portrait has a head crop, and the two in the drawing match it
  const people = JSON.parse(read('../../seed/characters.json')).characters
  for (const p of people) {
    assert.ok(HEADS[p.id], `${p.id} has a head crop`)
    assert.ok(existsSync(new URL(`../public/portraits/${p.id}.png`, import.meta.url)), `${p.id}’s portrait is in the folder`)
  }
  const near = (a, b, by) => Math.abs(a - b) <= by
  assert.ok(near(HEADS.steeps[0], 221.22, 3) && near(HEADS.steeps[1], -51.061, 2) && near(HEADS.steeps[2], -4.907, 2), 'Jasper Steeps as drawn')
  assert.ok(near(HEADS.devine[0], 250.45, 3) && near(HEADS.devine[1], -65.315, 2) && near(HEADS.devine[2], -7.057, 2), 'Iris DeVine as drawn')
  assert.deepEqual(headStyle('nobody'), { width: '200%', left: '-50%', top: '-3%' })
})

test('the word rule (Jon, 12 Nov): a title, one line at most, one button; only what a player needs', () => {
  const lines = [
    ...Object.values(GAME_STEPS).flat(),
    ...RULE_CARDS.map(c => c.body ?? c.three.join(' ')),
    ...Object.values(NOW_STATES).flatMap(s => [s.lead, s.button, s.quiet].filter(Boolean)),
    ...WINS.map(w => w.when),
  ]
  for (const line of lines) assert.ok(words(line) <= 25, line)
  // a game's card: three steps as numbered cards, and step 1 is always the room's code
  assert.deepEqual(Object.keys(GAME_STEPS).sort(), ['entryway', 'library', 'orangerie', 'study'])
  for (const [id, steps] of Object.entries(GAME_STEPS)) {
    assert.equal(steps.length, 3, `${id}: three steps`)
    assert.ok(/^Scan .+’s code\.$/.test(steps[0]), `${id}: step 1 is the code`)
    for (const s of steps) assert.ok(words(s) <= 5 && s.length <= 24, `${id}: a step is a few words: ${s}`)
  }
  assert.deepEqual(GAME_STEPS.orangerie, ['Scan Salem’s code.', 'Red means shake.', 'Green means freeze.'], 'as drawn')
  // the Now card: where to go and one button; no act's name, no RIGHT NOW, no second sentence
  for (const [k, s] of Object.entries(NOW_STATES)) {
    assert.ok(sentences(s.lead) <= 1 && words(s.lead) <= 5, `${k}: ${s.lead}`)
    assert.ok(!('label' in s) && !('sub' in s), `${k}: no label and no second sentence`)
  }
  assert.deepEqual([NOW_STATES.room.lead, NOW_STATES.room.button], ['Go to the Orangerie', 'Scan Salem’s code'], 'as drawn')
  for (const c of RULE_CARDS) if (c.body) assert.ok(sentences(c.body) <= 2, c.body)
  assert.deepEqual(RULE_CARDS[0].three, ['Who did it?', 'Why?', 'Who is the Ghost?'], 'the first card is the whole game in three lines')
  // plain American English in what a guest reads
  for (const line of lines) assert.ok(!/colour|favourite|whilst|—/.test(line), line)
  // none of the look's screens carries an act's name, a tip or a label that only names the card
  const parts = read('../src/look/parts.jsx')
  for (const gone of ['Right now', 'RIGHT NOW', 'Your vote', 'Sirwin Manor', 'Swipe for the next one', 'Scan to begin', 'seconds left', 'Lights Out', 'Unmasked']) assert.ok(!parts.includes(gone), `“${gone}” is off the screens`)
  assert.ok(parts.includes('<figcaption>Scan to start</figcaption>') && parts.includes('>The Vote</h3>') && parts.includes("'Lock in'"), 'the words that stay')
})

test('the glitz Jon kept: slow bulbs, twinkles, the seal stamping in, paw prints, confetti across the whole screen', () => {
  const css = read('../src/look/look.css')
  const parts = read('../src/look/parts.jsx')
  // the marquee: a row of bulbs above and below, three sets taking turns, slow on a splash and quicker on a game's card
  assert.ok(parts.includes('<div className={`lk-marquee${fast ? \' fast\' : \'\'}${className ? ` ${className}` : \'\'}`}>{row}{children}{row}</div>'))
  assert.ok(css.includes('animation: lk-bulb 2.4s ease-in-out infinite') && css.includes('.lk-marquee.fast .lk-bulbs i { animation-duration: 1.2s; }'))
  assert.ok(css.includes('.lk-bulbs i:nth-child(3n+2) { animation-delay: 0.8s; }') && css.includes('.lk-bulbs i:nth-child(3n) { animation-delay: 1.6s; }'))
  for (const [k, spots] of Object.entries(TWINKLES)) {
    assert.ok(spots.length >= 4, `${k} has twinkles`)
    for (const [x, y, size, delay, tone] of spots) assert.ok(x > 0 && x < 100 && y > 0 && y < 100 && size > 0 && delay >= 0 && ['brass', 'paper'].includes(tone), `${k}: a twinkle on the screen`)
  }
  // a big win: ten paw prints fly out from the middle to where they rest
  assert.equal(WIN_PAWS.length, 10)
  for (const [x, y, size, lean, tone, fx, fy] of WIN_PAWS) {
    assert.ok(x > 0 && x < 100 && y > 0 && y < 100 && size > 2 && Math.abs(lean) <= 30 && ['brass', 'paper', 'red'].includes(tone))
    assert.ok(Math.abs(x + fx - 50) < 6 && Math.abs(y + fy - 46) < 6, 'it starts near the middle')
  }
  // confetti: the same shower every time, spread across the whole width, paw prints and strips
  assert.deepEqual(confetti(), confetti())
  const wide = confetti()
  assert.equal(wide.filter(c => c.kind === 'paw').length, 12)
  assert.equal(wide.filter(c => c.kind === 'strip').length, 8)
  assert.ok(Math.min(...wide.map(c => c.x)) < 10 && Math.max(...wide.map(c => c.x)) > 88, 'across the whole screen')
  for (const c of [...wide, ...confetti(true)]) assert.ok(c.x >= 0 && c.x <= 96 && c.ms >= 5000 && c.ms <= 9000 && c.delay <= 0, 'every piece is already falling when the screen opens')
  assert.equal(confetti(true).length, 13, 'a phone’s shower, as drawn')
  // The End: the confetti falls behind the words
  const end = parts.slice(parts.indexOf('export function TheEnd('), parts.indexOf('// 6. The dedication'))
  assert.ok(end.indexOf('<Confetti />') > 0 && end.indexOf('<Confetti />') < end.indexOf('<Marquee fast>'), 'behind the words')
  assert.ok(end.includes("line = 'Happy first birthday, Sir Irwin.'"))
  // the big win: one big word, the seal, the cat hopping, and no card
  const win = parts.slice(parts.indexOf('export function BigWin('), parts.indexOf('// 5. The End'))
  assert.ok(win.includes("word = 'Solved!'") && win.includes('<img className="lk-stamp"') && win.includes('move="hop"') && !/lk-card|lk-pcard/.test(win))
  // the dedication (Jon, 12 Nov: "It should read 'For Sydney, The Best Big Brother A Pup Could Ask For'"): his words
  // exactly, his capitals and his comma, nothing added; two lines, broken after the comma and nowhere else; Sydney's
  // photo in a round brass frame above them, set so his nose stays inside the circle; no heading; nothing stands in for him
  const ded = parts.slice(parts.indexOf('// 6. The dedication'), parts.indexOf('// ---- the phone'))
  assert.ok(ded.includes("export const DEDICATION = 'For Sydney, The Best Big Brother A Pup Could Ask For'"))
  assert.ok(ded.includes("export function Dedication({ line = DEDICATION, photo = null, className = '' })"))
  assert.ok(ded.includes('{photo && !lost && <span className="lk-photo">') && !/<h[1-6]|lk-label/.test(ded))
  assert.ok(ded.includes("return at < 0 ? [line, ''] : [line.slice(0, at + 1), line.slice(at + 1).trim()]"), 'broken after the first comma, and nowhere else')
  assert.ok(!/In loving memory|original good boy/.test(parts + read('../src/look/LookBook.jsx')), 'the old line is gone from the look')
  assert.ok(css.includes('.lk-photo img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; object-position: 50% 70%; display: block; }'))
  assert.ok(css.includes('.lk-dedication-line span { display: block; white-space: nowrap;'), 'neither line breaks again')
  assert.ok(existsSync(new URL('../public/household/sydney.jpg', import.meta.url)), 'Sydney’s photo is in the folder')
  // less movement when a device asks for it
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('.lk-confetti { display: none; }'))
})

test('the sound kit: made in code, short, and every level of a win has its sound', () => {
  assert.deepEqual(Object.keys(SOUNDS).sort(), ['buzz', 'chime', 'ding', 'fanfare', 'scratch', 'seal', 'sparkle', 'stamp', 'tick'])
  for (const [name, voices] of Object.entries(SOUNDS)) {
    assert.ok(voices.length >= 1, name)
    assert.ok(soundMs(name) > 0 && soundMs(name) <= 2000, `${name} is short: ${soundMs(name)} ms`)
    for (const v of voices) {
      assert.ok(v.g > 0 && v.g <= 1 && v.d > 0 && v.t >= 0, `${name}: a voice is audible and has a length`)
      assert.ok(v.n === 1 || (v.f >= 40 && v.f <= 7000), `${name}: a tone a small speaker can play`)
    }
  }
  assert.ok(soundMs('tick') <= 100, 'a tick is a tick')
  assert.ok(soundMs('buzz') <= 300 && Math.max(...SOUNDS.buzz.map(v => v.g)) <= 0.25, 'a miss is soft and short: never a scolding')
  assert.ok(Math.max(...SOUNDS.ding.map(v => v.g)) >= 0.5, 'at least twice as loud as the old chime (0.25)')
  // no page, no sound: quiet, and nothing thrown
  assert.equal(play('ding'), false)
  assert.equal(play('nothing'), false)
  assert.deepEqual(Object.keys(LEVELS), ['small', 'medium', 'big', 'miss'])
  for (const [level, spec] of Object.entries(LEVELS)) assert.ok(SOUNDS[spec.sound], `${level} plays ${spec.sound}`)
  assert.ok(LEVELS.small.ms <= 800 && LEVELS.medium.ms <= 1500 && LEVELS.big.ms >= 2000 && LEVELS.big.ms <= 3000, 'half a second, a second, two to three seconds')
  assert.deepEqual(WINS.map(w => w.level), Object.keys(LEVELS), 'the look book shows every level')
})

test('a celebration’s pieces: the same burst for the same seed, and the right kind for each level', async () => {
  assert.equal(await unlock({}), 'none', 'a device with no sound says so')
  assert.deepEqual(pieces('small', 3), pieces('small', 3))
  assert.notDeepEqual(pieces('big', 1), pieces('big', 2))
  assert.ok(pieces('small').every(p => p.kind === 'sparkle'))
  assert.equal(pieces('medium').filter(p => p.kind === 'seal').length, 1, 'one wax seal')
  assert.ok(pieces('big').filter(p => p.kind === 'paw').length >= 12, 'a burst of paw prints')
  assert.deepEqual(pieces('miss'), [], 'a miss is a shake, not a burst')
  for (const p of [...pieces('small'), ...pieces('medium'), ...pieces('big')]) {
    assert.ok(Number.isFinite(p.dx) && Number.isFinite(p.dy) && p.size > 0 && p.delay >= 0 && p.delay <= 400, 'every piece has somewhere to go')
  }
  // off a page (a test, the server) it draws nothing and still answers with the level's length
  assert.equal(celebrate('big', { quiet: true }), LEVELS.big.ms)
  assert.equal(celebrate('nonsense'), 0)
})

test('B2, the room splash on every idle screen: on since Jon said yes to all eight (12 Nov 2026)', async () => {
  const { LOOK, lookOn, SPLASH_OF, splashNow, SPLASH_TURN_MS } = await import('../src/look/look.js')
  assert.equal(LOOK.splash, true, 'Jon: "Yes to all 8", then "yes this is great" to the drawings')
  assert.equal(lookOn('splash', ''), true)
  assert.equal(lookOn('nothing-yet', ''), false, 'a part that is not switched on stays off')
  assert.equal(lookOn('nothing-yet', '?kiosk=study&nothing-yet=1'), true, 'and can be tried on a real screen by its address')
  // a Mac's own screen beside its room screen gets its room's splash, from the setup page and the send list
  const { SECOND_DISPLAY_ROOMS, setupHref } = await import('../src/lib/setup.js')
  assert.deepEqual(SECOND_DISPLAY_ROOMS.map(r => setupHref('/play/', r)), ['/play/?kiosk=decor&room=living', '/play/?kiosk=decor&room=study'])
  for (const r of SECOND_DISPLAY_ROOMS) for (const line of [r.room, r.machine, r.when]) assert.ok(!/—|kiosk|localhost/.test(line), line)
  const { secondDisplayLinks } = await import('../src/lib/start.js')
  assert.deepEqual(secondDisplayLinks('https://example.test/play/').map(s => s.url), ['https://example.test/play/?kiosk=decor&room=living', 'https://example.test/play/?kiosk=decor&room=study', 'https://example.test/play/?kiosk=decor'])
  assert.ok(read('../src/screens/Setup.jsx').includes('SECOND_DISPLAY_ROOMS.map(r =>') && read('../src/screens/Host.jsx').includes('seconds.map(s =>'))
  // every idle room screen has its splash: the loop names the room screens idle on (lib/rooms.js LOOP_OF)
  const { LOOP_OF } = await import('../src/lib/rooms.js')
  for (const loop of new Set(Object.values(LOOP_OF))) assert.ok(SPLASHES[SPLASH_OF[loop]], `${loop} has a splash`)
  assert.equal(SPLASH_OF.memory, 'library')
  assert.equal(SPLASH_OF.boo, 'entryway')
  // the picture moves on every few minutes, by the clock on the wall
  const t = 1_800_000_000_000
  assert.equal(splashNow(t).turn + 1, splashNow(t + SPLASH_TURN_MS).turn)
  assert.equal(splashNow(t).turn, splashNow(t + SPLASH_TURN_MS - 1 - (t % SPLASH_TURN_MS)).turn, 'a reload shows the same picture')
  assert.deepEqual(Object.keys(splashNow(t)), ['turn'], 'and no tip')
  const rooms = read('../src/screens/Rooms.jsx')
  assert.ok(rooms.includes("const splash = lookOn('splash') ? (room ?? SPLASH_OF[loop] ?? null) : null"))
  assert.ok(rooms.includes('<Loop which={loop}><LiveSplash room={splash} calm={calm} /></Loop>'), 'a loop file still wins if Jon ever drops one in')
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("const decorRoom = which === 'decor' && SPLASHES[DECOR_ROOM] ? DECOR_ROOM : null"), 'a second display shows its room’s splash, calmer')
  assert.ok(kiosk.includes("if (!open && lookOn('splash')) return <Idle title=\"The bedroom\" line=\"The door is closed.\" loop=\"bedroom\" />"), 'the closed door is Sir Irwin waiting at it')
})

test('celebrate is safe on a phone: the burst lands where the win is, and a miss never shakes the whole page', () => {
  const src = read('../src/lib/celebrate.js')
  assert.ok(src.includes('page && win ? { left: 0, top: 0, width: win.innerWidth, height: win.innerHeight } : host.getBoundingClientRect()'), 'over the whole page the pieces are placed in the window, so a scrolled page does not put them off the screen')
  assert.ok(src.includes('const el = at instanceof Element ? at : page ? null : host') && src.includes('if (!el) return spec.ms'), 'a miss shakes its card or its box, never the body (the tab bar would jump)')
  assert.ok(src.includes("matchMedia?.('(prefers-reduced-motion: reduce)')"), 'less movement when the phone asks for it: the sound, no pieces')
})

// Handoff 12 Nov 2026, job 2: "Switch the look on." The night's own room screens draw the approved game card.
test('a room’s rules card on the night is the approved game card: the name in lights, three steps, the code, the cat', async () => {
  const { LOOK } = await import('../src/look/look.js')
  assert.equal(LOOK.game, true)
  const rooms = read('../src/screens/Rooms.jsx')
  const card = rooms.slice(rooms.indexOf('export const CARD_FILLER'), rooms.indexOf('// ---- the Happy Birthday Irwin card'))
  assert.ok(card.includes("if (lookOn('game') && game) {"), 'the look is on for every room’s card')
  assert.ok(card.includes('<GameCard id={id} file={frame ?? catPicture(cat, pick)} codeUrl={code && cat ? meetUrl(cat, PLAY_URL) : null} className="full">'), 'the room’s own cat picture and the room’s own code')
  // the host's long line is off the screen, and so are the lines that only fill the wait
  const look = card.slice(card.indexOf("if (lookOn('game') && game) {"), card.indexOf('const src = frame'))
  assert.ok(!/<Spoken|rules-line|SmallCode|words=/.test(look), 'no host’s paragraph and no old caption')
  assert.ok(look.includes("const say = id === 'study' && line ? [<p key=\"say\" className=\"kiosk-line\">{line}</p>] : []"), 'the Study’s one line is its state (Touch any hexagon to start.), so it stays')
  const filler = new RegExp(card.match(/export const CARD_FILLER = \/(.+)\/\n/)[1])
  for (const gone of ['The next group will be along.', 'Expecting Mabel, Gus.']) assert.ok(filler.test(gone), `“${gone}” is not said`)
  for (const kept of ['Eyes on your phones.', 'Eyes on the deck.', 'Granolia has dozed off. Find a host.', 'Touch any hexagon to start.']) assert.ok(!filler.test(kept), `“${kept}” is a working line and stays`)
  const css = read('../src/look/look.css')
  assert.ok(css.includes('.lk-game-notes .study-walls { display: none; }'), 'the card carries no drawing of the walls')
  // the code is big enough to scan from where a group stands: wider than the approved stand-in box
  assert.ok(css.includes('.lk-code { position: absolute; left: 72.2cqw; top: 57.5cqh; width: 17.8cqw;'))
})

// Handoff 12 Nov 2026, job 2: the phone. One card on Now, the vote with portraits, the small win, the top bar.
test('the phone on the night wears the approved look: the seal and no act’s name, one card on Now, every working control kept', async () => {
  const { LOOK } = await import('../src/look/look.js')
  assert.ok(LOOK.now && LOOK.vote, 'on')
  const rest = read('../src/screens/Rest.jsx')
  // the top of every tab: the seal, never the act's name; the vote's title while it is open on Now
  const top = rest.slice(rest.indexOf('<header className="top">'), rest.indexOf('</header>'))
  assert.ok(top.includes('<img className="top-seal" src={`${import.meta.env.BASE_URL}brand/seal.png`} alt="Sirwin Manor" />'))
  assert.ok(top.includes('<h1 className="top-title">The Vote</h1>'))
  assert.ok(!/act-num|act-name|Act \{night\.act\}|\.plain|\.banner/.test(rest), 'no act’s name anywhere on the phone’s page')
  // nothing to do: one card, the beat's own line (or Talk to people), Sir Irwin looking over it, and no second sentence
  assert.ok(rest.includes("const lead = over ? null : night.act >= 1 ? beatLine(night) ?? 'Talk to people' : 'The game will find you'"))
  assert.ok(rest.includes("{idle && look && lead && <NowCard who=\"irwin\" n={night.act ?? 0} lead={lead.replace(/\\.$/, '')} />}"))
  // Act 2: where to go and the one button; Not yet, call me later is the same on every phone, and Cannot scan? once on the way
  const cards = read('../src/screens/Cards.jsx')
  const step = cards.slice(cards.indexOf("if (lookOn('now')) {"), cards.indexOf('<section className={`dealt lights lights-${lights.step}`}>'))
  assert.ok(step.includes("lead={`Go to ${lights.room ?? 'the room'}`} button={`Scan ${name}’s code`} icon=\"scan\""))
  assert.ok(step.includes("quiet={onWay ? `Cannot scan? I am with ${name}` : 'Not yet, call me later'}"), 'every working control stays')
  assert.ok(step.includes('onQuiet={() => (onWay ? call(callMeet, { cat: lights.cat }) : call(callNotYet, {}))}'))
  assert.ok(step.includes('onGo={() => { goNow(); openScanner() }}'), 'the one button opens the camera inside the app')
  assert.ok(step.includes("onGo={() => { onMet?.(lights.cat); call(callLeave, {}) }}"), 'Done after a cat: the small win, and the house is told')
  assert.ok(!/eyebrow|Your next step|lights\.text|lights\.title/.test(step), 'no label, no second sentence')
  const { CAT_SHORT } = await import('../src/lib/rooms.js')
  assert.deepEqual(CAT_SHORT, { granolia: 'Granolia', zimothy: 'Zimothy', boo: 'Boo', salem: 'Salem', irwin: 'Sir Irwin' }, 'Scan Boo’s code, never Scan Miss’s code')
  // Act 4: the same card until the group is in its room's game; a waiting Parlour Game is the one button when the guest is free
  const act4 = read('../src/screens/Act4.jsx')
  const room = act4.slice(act4.indexOf("if (lookOn('now') && !inGame) {"), act4.indexOf('<section className={`dealt act4 act4-${step.room}`}>'))
  assert.ok(room.includes("const lead = play ? 'A Parlour Game is waiting' : going ? `Go to ${room.name}` : step.over || step.paid ? 'Back to the Parlour' : 'Wait in the Parlour'"))
  assert.ok(room.includes("quiet={going && !play ? 'Can’t scan? We’re here' : null} onQuiet={scan}"), 'the group that cannot scan still gets in')
  assert.ok(!/Round \$\{|step\.hook|step\.chime|eyebrow/.test(room), 'no round number, no hook, no chime line')
  // a cat is talking: its card first, Done under it, then the small win over the page with the four faces
  assert.ok(rest.includes("const reading = look && lights?.step === 'with'") && rest.indexOf('{cards.map(c => <Card') < rest.indexOf('{reading && step}'))
  assert.ok(rest.includes('{met && <SmallWin who={met} met={metCats(session, met)} onDone={() => setMet(null)} />}'))
  const { metCats } = await import('../src/lib/night.js')
  const session = { cards: [{ kind: 'testimony', act: 2, cat: 'boo' }, { kind: 'testimony', act: 2, cat: 'salem', note: true }, { kind: 'testimony', act: 4, cat: 'zimothy' }, { kind: 'notice', act: 2 }] }
  assert.deepEqual(metCats(session), ['boo'], 'a cat that only left a note at supper was not met, and Act 4 is not a visit')
  assert.deepEqual(metCats(session, 'granolia'), ['boo', 'granolia'])
  assert.deepEqual(metCats(null), [])
  // the tabs as drawn: Manor-deep bar, brass word and a brass mark over the lit tab
  const css = read('../src/styles.css')
  assert.ok(css.includes(".tab.on::before { content: ''; position: absolute; top: 0; left: 12px; right: 12px; height: 3px; background: #A6A253; border-radius: 0 0 3px 3px; }"))
  assert.ok(css.includes(".rest.papered::before { position: fixed; opacity: 1; -webkit-mask: none; mask: none; background: linear-gradient(rgba(0, 25, 37, 0.62), rgba(0, 25, 37, 0.62)), url('/play/brand/wallpaper-phone.jpg') center / cover; }"), 'the wallpaper under the veil, as drawn')
})

test('the vote on the night is the approved card: three rows with each pick’s portrait, the time as a bar, Lock in', () => {
  const win = read('../src/screens/Windows.jsx')
  const vote = win.slice(win.indexOf("if (card && lookOn('vote')) {"), win.indexOf("const Box = card ? 'section' : 'div'"))
  assert.ok(vote.includes("const folk = people.map(p => ({ id: p.key, name: p.character || p.name, sub: p.character ? p.name : null, portrait: p.characterId }))"), 'a seat is its character (as on the big screen), the guest’s own name under it, the character’s portrait')
  assert.ok(vote.includes('left={secondsLeft(w, serverNow)} of={total}'), 'the time left, on the server’s clock, as a bar')
  assert.ok(vote.includes("onLock={p => send({ murderer: p.murderer, motive: p.motive, victim: p.ghost })}"), 'Lock in sends exactly what the rows show: the third row is the Ghost')
  assert.ok(vote.includes("onPick={p => put({ step: 0, pick: { murderer: p.murderer ?? null, motive: p.motive ?? null, victim: p.ghost ?? null } })}"), 'the picks stay App’s, so a look at Clues loses nothing')
  assert.ok(!/Your three|of 3|crest/.test(vote), 'no steps and no label')
  assert.ok(win.includes("export function BallotSent() {\n  if (lookOn('vote')) return <VoteLocked />"))
  const parts = read('../src/look/parts.jsx')
  assert.ok(parts.includes("export function VoteLocked({ line = 'Locked in. Eyes on the big screen.' })"))
  assert.ok(parts.includes(": r.kind === 'person' ? <Head id={person(v)?.portrait ?? v} />"), 'each pick’s portrait, cut to the head')
  assert.ok(parts.includes("if (!onLock) setLocked(true)"), 'on the night the card waits for the house to say the vote is in')
})
