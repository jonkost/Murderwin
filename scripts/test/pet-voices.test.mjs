import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { catHintLines, catBagLines, irwinLines, allPetLines, clueWords } from '../pet-lines.mjs'
import { modelVoices, castFor, forVoice, saidFor, decide, plan, robotic, stale, tally, forSite, onSiteWords, setSite, busyWith, readArgs, ENGINE, ACCENTS } from '../pet-voices.mjs'
import { PETS, PET_VOICE_EXT, petVoiceId, petVoiceUrl, voiceKey, speakable, tidyWords, irwinSpeech, speechFresh, SPEECH_FRESH_MS } from '../../play/src/lib/petvoice.js'
import { hintLine, HINT_CATS } from '../../functions/lib/cats.js'
import { FAMILIES, ALL_MOTIVES, familyOf } from '../../functions/lib/families.js'
import { bagPlan, bagLine, BAG_CATS } from '../../functions/lib/bagclues.js'
import { IRWIN_OPTION_LINES, DEFAULT_IRWIN, irwinLines as serverIrwinLines, dogFilter, castNames, MAX_IRWIN_WORDS } from '../../functions/lib/screen.js'

// The pets' voices (12 Nov 2026, Jon: "Can we get voices reading for the
// pets"). A voice file is made ahead for every line a pet can say, and the
// page finds it by the line's own words. So two things must hold: the list
// of lines must hold every line the dealer can deal, and the name worked out
// from a line's words must be the same in the script and on the page.

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const motives = JSON.parse(read('../../seed/motives.json')).motives
const keyOf = l => `${l.who}|${tidyWords(l.text)}`

// a small generator, so a failing draw can be found again
function rng(seed) { let s = seed >>> 0; return n => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return Math.floor((s / 4294967296) * n) } }

test('the list: every pet, no blank left in any line, each line once', () => {
  const all = allPetLines()
  assert.ok(all.length > 700 && all.length < 1200, `${all.length} lines`)
  for (const who of PETS) assert.ok(all.some(l => l.who === who), `${who} has lines`)
  for (const l of all) {
    assert.ok(PETS.includes(l.who))
    assert.ok(!/\[(MOTIVE|MOTIVES|MOTIVE2|BONUS|HALF)\]|___|\[sense/.test(l.text), `no blank left: ${l.who}`)
  }
  assert.equal(new Set(all.map(keyOf)).size, all.length, 'each line once')
  const ids = all.map(l => petVoiceId(l.who, l.text))
  assert.equal(new Set(ids).size, ids.length, 'no two lines share a file')
  assert.equal(clueWords().length, 14, 'the fourteen clue words of the final bag items')
})

test('every motive hint the dealer can deal has a line in the list (6,000 draws)', () => {
  const have = new Set(catHintLines().map(keyOf))
  const pick = rng(20261115)
  const keys = FAMILIES.map(f => f.key)
  let dealt = 0
  for (let i = 0; i < 6000; i++) {
    const real = ALL_MOTIVES[pick(ALL_MOTIVES.length)]
    const wrong = keys.filter(k => k !== familyOf(real))
    const family = wrong[pick(wrong.length)]
    const cat = HINT_CATS[pick(HINT_CATS.length)]
    const level = 1 + pick(5)
    // the guest's two families and the one the news took, or none given at all
    const bonusFamilies = pick(4) === 0 ? null : [family, wrong[pick(wrong.length)], wrong[pick(wrong.length)]]
    const exclude = pick(3) === 0 ? [ALL_MOTIVES[pick(ALL_MOTIVES.length)]] : []
    const line = hintLine({ motive: real }, { cat, level, act: 2, family, seed: `s${i}-${pick(1e6)}`, bonusFamilies, exclude })
    if (!line.text) continue
    dealt++
    assert.ok(have.has(keyOf({ who: cat, text: line.text })), `${cat} at ${level} about ${family} (draw ${i}) is in the list`)
  }
  assert.ok(dealt > 5000, `${dealt} lines dealt`)
})

test('every bag line the dealer can deal has a line in the list (6,000 draws)', () => {
  const have = new Set(catBagLines().map(keyOf))
  const words = clueWords()
  const file = JSON.parse(read('../../seed/bag-items.json'))
  const sensesOf = Object.fromEntries(file.words.map(w => [w.word, w.senses]))
  const pick = rng(4301115)
  let dealt = 0
  for (let i = 0; i < 6000; i++) {
    // a stand-in packing of ten bags, three to five clue words a bag, in the sealed doc's own shape
    const packing = { words: {} }
    for (let bag = 1; bag <= 10; bag++) {
      packing.words[bag] = {}
      for (let k = 0, n = 3 + pick(3); k < n; k++) { const w = words[pick(words.length)]; packing.words[bag][w] = sensesOf[w] }
    }
    const inPlay = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(() => pick(5) !== 0)
    const bag = 1 + pick(10)
    const cat = BAG_CATS[pick(BAG_CATS.length)]
    const act = pick(2) === 0 ? 2 : 4
    const rung = 1 + pick(5)
    const seed = `b${i}`
    const p = pick(8) === 0 ? null : bagPlan(packing, { bag, inPlay: inPlay.includes(bag) ? inPlay : [...inPlay, bag], seed })
    const line = bagLine(p, { cat, act, rung, seed })
    assert.ok(line.text, 'a cat always has a bag line')
    dealt++
    assert.ok(have.has(keyOf({ who: cat, text: line.text })), `${cat} act ${act} rung ${rung} (draw ${i}) is in the list`)
  }
  assert.equal(dealt, 6000)
})

test('Sir Irwin at dessert: his own words, the workshop\'s, every rhyme, in the order the TV shows them', () => {
  const have = new Set(irwinLines({ workshop: { opener: 'A workshop opener.', closer: 'A workshop closer.', ui: { 'IRWIN TWO': 'One of these two, I think!' } } }).map(keyOf))
  for (const t of [DEFAULT_IRWIN.opener, DEFAULT_IRWIN.closer, ...Object.values(IRWIN_OPTION_LINES), 'A workshop opener.', 'A workshop closer.', 'One of these two, I think!', ...motives.map(m => m.rhyme)]) {
    assert.ok(have.has(keyOf({ who: 'irwin', text: t })), t.slice(0, 30))
  }
  assert.equal(motives.length, 19)
  // the server's own lines for the screen, with no name to filter, are lines the list holds
  const said = serverIrwinLines({ opener: null, closer: null, names: ['Jessa', 'Jake'], optionLine: IRWIN_OPTION_LINES[3] })
  for (const t of said) assert.ok(have.has(keyOf({ who: 'irwin', text: t })), `the server's "${t.slice(0, 24)}" has a voice`)
  // an opener longer than the TV keeps: the voice is made for the words the TV shows, cut where the server
  // cuts them, and not for words nobody will ever see
  const long = 'Oh! You came all this way to talk to ME. Okay. Okay okay okay. Here is what I know.'
  const cut = dogFilter(long, castNames({}))
  assert.equal(cut.split(' ').length, MAX_IRWIN_WORDS)
  const withLong = new Set(irwinLines({ workshop: { opener: long } }).map(keyOf))
  assert.ok(withLong.has(keyOf({ who: 'irwin', text: cut })), 'the cut opener has a voice')
  assert.ok(!withLong.has(keyOf({ who: 'irwin', text: long })), 'the uncut one has none')
  assert.equal(serverIrwinLines({ opener: long, closer: null, names: castNames({}) })[0], cut, 'and the TV shows exactly those words')
  // the speech: opener, how sure he is, the motives he names, closer
  const screen = { kind: 'irwin', lines: ['Opener.', 'One of these two!', 'Closer.'], choices: [{ n: 3, rhyme: 'Rhyme three' }, { n: 9, rhyme: 'Rhyme nine' }] }
  assert.deepEqual(irwinSpeech(screen), ['Opener.', 'One of these two!', 'Rhyme three', 'Rhyme nine', 'Closer.'])
  assert.deepEqual(irwinSpeech({ lines: ['Only this.'] }), ['Only this.'])
  assert.deepEqual(irwinSpeech(null), [])
  // only a screen that came up a moment ago speaks: a TV reloaded later stays quiet
  assert.equal(speechFresh(1000, 1500), true)
  assert.equal(speechFresh(1000, 1000 + SPEECH_FRESH_MS), false)
  assert.equal(speechFresh(1000, 1000 + 10 * 60_000), false, 'ten minutes on: quiet')
  assert.equal(speechFresh(0, NaN), false)
})

test('the file\'s name comes from the words alone, the same everywhere', () => {
  assert.equal(voiceKey('Ew. Do I know you?'), voiceKey('  Ew.  Do I know\nyou? '), 'spaces and line breaks do not change it')
  assert.notEqual(voiceKey('Ew. Do I know you?'), voiceKey('Ew. Do I know you!'))
  assert.match(voiceKey('anything at all'), /^[0-9a-z]{6,12}$/)
  assert.equal(petVoiceId('boo', 'Ew. Do I know you?'), `boo-${voiceKey('Ew. Do I know you?')}`)
  assert.equal(petVoiceUrl('boo', 'Ew. Do I know you?', '/play/'), `/play/voice/pets/boo-${voiceKey('Ew. Do I know you?')}.mp3`)
  assert.equal(petVoiceId('boo', '   '), null, 'no words, no file')
  assert.equal(petVoiceId('the butler', 'Hello.'), null, 'only the five pets')
  assert.notEqual(petVoiceId('boo', 'Hello.'), petVoiceId('salem', 'Hello.'), 'each pet its own file for the same words')
  // pinned, so a change to the hash is noticed: every file on the site is named by it
  assert.equal(voiceKey('Ew. Do I know you?'), '101w4ic53fm')
})

test('what the voice says: the cat\'s own words, never a stage direction or the house describing the cat', () => {
  assert.equal(speakable('Ew. Do I know you?', 'boo'), 'Ew. Do I know you?')
  assert.equal(speakable('Boo checks her reflection in your glass, then knocks it off the table.', 'boo'), '', 'the house describing Boo: she says nothing')
  assert.equal(speakable('Boo adjusts her pearls and yawns. "The dairy air? So not it. Bye."', 'boo'), 'The dairy air? So not it. Bye.', 'only what is between the quotes')
  assert.equal(speakable('Hi! You came! *heavy breathing* Okay, okay.', 'granolia'), 'Hi! You came! Okay, okay.')
  assert.equal(speakable('*snort*', 'granolia'), '', 'a breath alone is nothing to say')
  assert.equal(speakable('I remember EVERYTHING today!', 'granolia'), 'I remember everything today!', 'a shouted word is said, not spelled')
  assert.equal(speakable("It's THIS one! I sniffed it out all by myself!", 'irwin'), "It's this one! I sniffed it out all by myself!")
  assert.equal(speakable('The last of the pie, gone in the blink of an eye', 'irwin'), 'The last of the pie, gone in the blink of an eye')
  // over the whole list: only the two lines where the house describes Boo are silent
  const silent = allPetLines().filter(l => !speakable(l.text, l.who))
  assert.deepEqual(silent.map(l => l.who), ['boo', 'boo'])
  for (const l of allPetLines()) assert.ok(!/\*/.test(speakable(l.text, l.who)), 'no star is ever read out')
})

test('the maker: natural voices only; what it makes, keeps and never touches', () => {
  assert.deepEqual(modelVoices(['bm_george.safetensors', 'af_bella.safetensors', 'config.json']), ['af_bella', 'bm_george'])
  assert.deepEqual(modelVoices(null), [])
  const file = JSON.parse(read('../../seed/pet-voices.json'))
  assert.equal(file.engine, ENGINE)
  assert.deepEqual(Object.keys(file.cast).sort(), [...PETS].sort(), 'a voice for each of the five')
  assert.equal(new Set(Object.values(file.cast).map(c => c.voice)).size, 5, 'five different voices')
  for (const c of Object.values(file.cast)) {
    assert.match(c.voice, /^[abf][fm]_[a-z]+(,[abf][fm]_[a-z]+)?$/, 'a voice of the natural model (American, British or French, or a blend of two): never one of the Mac\'s own robotic ones')
    assert.ok(c.speed >= 0.7 && c.speed <= 1.2, 'near the voice\'s own pace (Jon asked for the girls to speak slower)')
    assert.ok(c.speed / (c.pitch ?? 1) >= 0.6, 'and never asked of the model slower than it speaks well')
    assert.ok((c.pitch ?? 1) >= 0.8 && (c.pitch ?? 1) <= 1.35, 'and never so far from its own pitch that it stops sounding like a person')
    assert.ok((c.lower ?? 1) >= 0.55 && (c.lower ?? 1) <= 1, 'a note is only ever brought down, and not by more than about nine notes')
  }
  const all = Object.values(file.cast).map(c => c.voice)
  const cast = castFor(file, all)
  assert.deepEqual(cast.zimothy, { voice: file.cast.zimothy.voice, speed: file.cast.zimothy.speed, pitch: file.cast.zimothy.pitch ?? 1, lower: file.cast.zimothy.lower ?? 1, accent: null, asked: file.cast.zimothy.voice })
  // an accent the model has no voice for: only the ones the talker knows, and the talker's own list says the same
  assert.equal(castFor({ cast: { irwin: { voice: 'bm_daniel', accent: 'aussie' } } }, ['bm_daniel']).irwin.accent, 'aussie')
  assert.equal(castFor({ cast: { irwin: { voice: 'bm_daniel', accent: 'klingon' } } }, ['bm_daniel']).irwin.accent, null, 'an accent nobody built is no accent')
  const talkerSrc = read('../pet-voices-kokoro.py')
  for (const a of ACCENTS) assert.ok(talkerSrc.includes(`"${a}": [`), `the talker knows ${a}`)
  assert.deepEqual(saidFor({ all: { a: 'b' }, american: { c: 'd' }, british: { e: 'f' } }, 'am_puck', 'aussie'), { a: 'b', e: 'f' }, 'an Australian accent is built on the British reading, whatever the voice')
  assert.equal(castFor(file, [file.cast.zimothy.voice]).boo.voice, null, 'a pet whose voice the model lacks stays silent: there is no robotic stand-in')
  assert.equal(castFor(file, []).irwin.voice, null, 'and with no model on the Mac nobody speaks')
  // a blend of two voices: the model must have both
  const blend = { cast: { boo: { voice: 'ff_siwis, af_bella', speed: 0.8, pitch: 0.97 } } }
  assert.equal(castFor(blend, ['ff_siwis', 'af_bella']).boo.voice, 'ff_siwis,af_bella')
  assert.equal(castFor(blend, ['af_bella']).boo.voice, null)
  // the words as the voice is given them: a few are spelled the way they sound, and which ones goes by the voice's accent
  const us = saidFor(file.saidAs, 'af_bella'), gb = saidFor(file.saidAs, 'bm_lewis')
  assert.equal(forVoice('Hmph. Nobody up at the big house asks the help.', us), 'Humph. Nobody up at the big house asks the help.', 'not read out letter by letter')
  assert.equal(forVoice('Hmph. Now scat.', gb), 'Humph. Now scat.', 'in either accent')
  assert.equal(forVoice('Something chocolatey-ish. And chocolatey.', us), 'Something chocolaty-ish. And chocolaty.', 'an American voice reads chocolatey with a long a')
  assert.equal(forVoice('Something chocolatey.', gb), 'Something chocolatey.', 'a British voice knows the word as it is spelled')
  assert.equal(forVoice('Ew. Do I know you?', us), 'Eew. Do I know you?')
  assert.equal(forVoice('A new pew, a few stewed newts.', us), 'A new pew, a few stewed newts.', 'whole words only')
  assert.equal(forVoice('hmph, he said', us), 'humph, he said', 'a small letter stays small')
  assert.equal(forVoice('Hello.', {}), 'Hello.')
  assert.equal(forVoice('Hello.', null), 'Hello.')
  assert.equal(forVoice(null, us), '')
  assert.deepEqual(saidFor({ all: { a: 'b' }, american: { c: 'd' }, british: { e: 'f' } }, 'bf_lily'), { a: 'b', e: 'f' })
  assert.deepEqual(saidFor({ all: { a: 'b' }, american: { c: 'd' }, british: { e: 'f' } }, 'am_onyx'), { a: 'b', c: 'd' })
  assert.deepEqual(saidFor(undefined, 'am_onyx'), {})
  assert.deepEqual(saidFor({ all: { a: 'b' } }, null), { a: 'b' })
  assert.deepEqual(Object.keys(file.saidAs).sort(), ['all', 'american', 'british'])
  const said = allPetLines().map(l => speakable(l.text, l.who))
  for (const table of Object.values(file.saidAs)) for (const from of Object.keys(table)) assert.ok(said.some(t => forVoice(t, { [from]: 'X' }) !== t), `${from} is still a word in some line`)
  // one line's file
  const mine = { spoken: 'Hello.', voice: 'bm_george', speed: 0.95, by: ENGINE }
  assert.equal(decide({ spoken: '', exists: false }), 'silent')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: null, voice: 'bm_george', speed: 0.95 }), 'make', 'a file that is not in the list (a run was stopped half way) is made again')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: null, voice: null }), 'keep', 'with no model on the Mac, what is there stays')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: mine, voice: 'bm_george', speed: 0.95 }), 'keep')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: mine, voice: 'bm_lewis', speed: 0.95 }), 'make', 'a new voice for the pet: made again')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: mine, voice: 'bm_george', speed: 1 }), 'make', 'a new pace: made again')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: mine, voice: 'bm_george', speed: 0.95, pitch: 1.2 }), 'make', 'a new pitch: made again')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: { ...mine, pitch: 1.2 }, voice: 'bm_george', speed: 0.95, pitch: 1.2 }), 'keep')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: mine, voice: 'bm_george', speed: 0.95, lower: 0.7 }), 'make', 'a note brought down: made again')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: { ...mine, lower: 0.7 }, voice: 'bm_george', speed: 0.95, lower: 0.7 }), 'keep')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: mine, voice: 'bm_george', speed: 0.95, accent: 'aussie' }), 'make', 'a new accent: made again')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: { ...mine, accent: 'aussie' }, voice: 'bm_george', speed: 0.95, accent: 'aussie' }), 'keep')
  assert.equal(decide({ spoken: 'Hello there.', exists: true, made: mine, voice: 'bm_george', speed: 0.95 }), 'make', 'new words: made again')
  assert.equal(decide({ spoken: 'Hello.', exists: true, made: { spoken: 'Hello.', voice: 'Daniel', rate: 170 }, voice: 'bm_george', speed: 0.95 }), 'make', 'a file in one of the old robotic voices is made again')
  assert.equal(decide({ spoken: 'Hello.', exists: false, voice: 'bm_george', speed: 0.95 }), 'make')
  assert.equal(decide({ spoken: 'Hello.', exists: false, voice: null }), 'mute')
  assert.deepEqual(robotic({ a: mine, b: { spoken: 'Hello.', voice: 'Daniel', rate: 170 }, c: {} }), ['b', 'c'], 'the old robotic files are the ones to go')
  // the plan over real lines, and what is stale
  const lines = [{ who: 'boo', text: 'Ew. Do I know you?' }, { who: 'boo', text: 'Boo looks you up and down. She says nothing about any bag.' }, { who: 'salem', text: 'Hmph. Now scat.' }]
  const id = petVoiceId('boo', 'Ew. Do I know you?')
  const rows = plan(lines, { cast, marker: {}, present: new Set([id]), saidAs: file.saidAs })
  assert.deepEqual(rows.map(r => r.what), ['make', 'silent', 'make'])
  assert.equal(rows[2].spoken, 'Humph. Now scat.', 'the voice is told the word as it sounds')
  assert.equal(rows[2].id, petVoiceId('salem', 'Hmph. Now scat.'), 'and the file is still named by the card\'s own words')
  assert.deepEqual([rows[2].voice, rows[2].speed, rows[2].pitch], [file.cast.salem.voice, file.cast.salem.speed, file.cast.salem.pitch ?? 1])
  assert.deepEqual(tally(rows), { boo: { make: 1, keep: 0, silent: 1, mute: 0 }, salem: { make: 1, keep: 0, silent: 0, mute: 0 } })
  assert.deepEqual(plan(lines, { cast: castFor(file, []), only: 'salem' }).map(r => [r.who, r.what]), [['salem', 'mute']])
  assert.deepEqual(stale({ 'boo-old': {}, [id]: {} }, rows), ['boo-old'], 'a file for a line nobody can say any more')
  // what was asked for on the command line: a mistyped name is never read as "every pet"
  assert.deepEqual(readArgs([]), { dry: false, workshop: true, off: false, on: false, only: null, pets: PETS, wrong: [] })
  assert.deepEqual(readArgs(['--on']).pets, PETS, '--on alone: all five')
  assert.deepEqual([readArgs(['--on', 'irwin']).pets, readArgs(['--on', 'irwin']).wrong], [['irwin'], []])
  assert.deepEqual(readArgs(['--on', 'Irwin']).wrong, ['Irwin'], 'a capital letter is a different word: refused')
  assert.deepEqual(readArgs(['--on', 'irwn', 'boo']).wrong, ['irwn'])
  assert.equal(readArgs(['--only', 'boo']).only, 'boo')
  assert.deepEqual(readArgs(['--only']).wrong, ['--only (no name)'])
  assert.deepEqual(readArgs(['--only', 'bo']).wrong, ['--only bo'])
  assert.deepEqual([readArgs(['--dry', '--no-workshop']).dry, readArgs(['--dry', '--no-workshop']).workshop], [true, false])
  assert.equal(readArgs(['--off']).off, true)
  // one run at a time: a second one would save its list of what it made over the first one's
  const going = pid => pid === 4242
  assert.equal(busyWith('4242\n', going, 100), 4242, 'another run is making them')
  assert.equal(busyWith('4242', going, 4242), null, 'this run itself is not another')
  assert.equal(busyWith('777', going, 100), null, 'a run that has ended left its note behind: go ahead')
  assert.equal(busyWith('', going, 100), null)
  assert.equal(busyWith('not a number', going, 100), null)
  assert.equal(busyWith(null, going, 100), null)
  // it never prints a line, never uses the Mac's own voices, never plays and never downloads
  const src = read('../pet-voices.mjs')
  assert.ok(!/log\([^)]*\.(text|spoken)\b/.test(src), 'no log of a line\'s words')
  assert.ok(!/['"]say['"]/.test(src), 'the Mac\'s own robotic voices are not used')
  assert.ok(src.includes('renameSync(part, out)'), 'a file is moved under its line\'s name only when it is whole')
  assert.ok(src.includes("run('rubberband', ['-q', '-3', '-F', '-f', String(row.lower), even, low])"), 'a note is brought down with the voice\'s size kept (-F), by a tool that only reads and writes files')
  assert.ok(src.includes('canClear: !only && words !== null'), 'nothing is cleared as out of date on a run that did not look at every line')
  const talker = read('../pet-voices-kokoro.py')
  assert.ok(talker.includes('os.environ.setdefault("HF_HUB_OFFLINE", "1")'), 'the model is never downloaded: it is on the Mac or no voice is made')
  assert.ok(!/sounddevice|afplay|\.play\(|play\s*=\s*True/.test(talker), 'nothing is ever played')
  assert.ok(!/print\([^)]*(text|job\[)/.test(talker), 'and it prints counts, never a line')
  // MP3s, so every browser and every player opens them (Jon: "Make them MP3 files so it is easy to play out")
  assert.equal(PET_VOICE_EXT, '.mp3')
  assert.ok(src.includes("'-c:a', 'libmp3lame'"), 'written as MP3')
})

test('the voices are off until Jon says yes: made into a folder that is no part of the site', () => {
  const src = read('../pet-voices.mjs')
  assert.ok(src.includes("export const PET_VOICE_DIR = join(root, 'pet-voices')"), 'made and kept outside the site')
  assert.ok(src.includes("export const PET_VOICE_SITE = join(root, 'play', 'public', 'voice', 'pets')"), 'the site\'s folder is a different one')
  assert.ok(/^pet-voices\/\*$/m.test(read('../../.gitignore')), 'and the kept folder is not in git')
  // what goes to the site: the pets' own files only, never the marker or a sample
  const store = ['irwin-a.mp3', 'irwin-b.mp3', 'boo-a.mp3', '.made.json', '.making', 'README.md', 'Pets-voices-sample.mp3', 'salem-old.m4a', 'zimothy-x.part.mp3', 'auditions']
  assert.deepEqual(forSite(store), ['boo-a.mp3', 'irwin-a.mp3', 'irwin-b.mp3'])
  assert.deepEqual(forSite(store, ['irwin']), ['irwin-a.mp3', 'irwin-b.mp3'], 'Sir Irwin only')
  assert.deepEqual(forSite(store, ['the butler']), [])
  assert.equal(onSiteWords([], store), 'none (the voices are off)')
  assert.equal(onSiteWords(['irwin-a.mp3', 'irwin-b.mp3'], store), 'irwin')
  assert.equal(onSiteWords(['irwin-a.mp3'], store), 'irwin (not every file: run --on again)')
  assert.equal(onSiteWords(['irwin-a.mp3', 'irwin-b.mp3', 'boo-a.mp3'], store), 'irwin, boo')
  assert.equal(onSiteWords(['irwin-a.mp3', 'irwin-b.mp3'], store, { older: true }), 'irwin (older than the kept ones: run --on again)', 'a voice changed since they were put on')
  assert.equal(onSiteWords([], store, { older: true }), 'none (the voices are off)')
  // on, one pet, and off again, in a folder of its own
  const tmp = mkdtempSync(join(tmpdir(), 'pet-voices-test-'))
  try {
    const kept = join(tmp, 'kept'), site = join(tmp, 'site')
    mkdirSync(kept)
    for (const f of store) writeFileSync(join(kept, f), 'x')
    const quiet = () => {}
    assert.equal(setSite({ on: true, pets: ['irwin'], store: kept, site, log: quiet }).copied, 2)
    assert.deepEqual(readdirSync(site).sort(), ['irwin-a.mp3', 'irwin-b.mp3'])
    assert.equal(setSite({ on: true, store: kept, site, log: quiet }).copied, 3)
    assert.deepEqual(readdirSync(site).sort(), ['boo-a.mp3', 'irwin-a.mp3', 'irwin-b.mp3'])
    writeFileSync(join(site, 'README.md'), 'kept')
    assert.equal(setSite({ on: false, store: kept, site, log: quiet }).copied, 0)
    assert.deepEqual(readdirSync(site), ['README.md'], 'off: every voice file gone from the site\'s folder, nothing else touched')
    assert.equal(readdirSync(kept).length, store.length, 'and the kept folder is never emptied')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
  // as it stands in the repo: the site's folder holds what Jon has said yes to, and nothing more
  // (seed/pet-voices.json goOut: none until he says yes, then irwin or all, set in the same change as --on)
  const goOut = JSON.parse(read('../../seed/pet-voices.json')).goOut
  assert.ok(['none', 'irwin', 'all'].includes(goOut), 'his answer is one of the three')
  let onSite = []
  try { onSite = readdirSync(new URL('../../play/public/voice/pets/', import.meta.url)).filter(f => /\.(mp3|m4a)$/.test(f)) } catch { /* no such folder: none */ }
  if (goOut === 'none') assert.deepEqual(onSite, [], 'the pets\' voices are off the site until Jon says yes (npm run pet-voices -- --off)')
  if (goOut === 'irwin') assert.deepEqual(onSite.filter(f => !f.startsWith('irwin-')), [], 'Sir Irwin only')
})

test('Jon\'s casting, chosen by ear from numbered auditions (12 Nov 2026), is held as he chose it', () => {
  const { cast } = JSON.parse(read('../../seed/pet-voices.json'))
  // "Boo - 4, Granola - 4, Salem - 2, Zimmy - 1"; "the lines need to be slower for the girls"; "Garnola speed 2";
  // "10 boo - 1" (a British Boo), and then, last: "Boo needs to be 8 Boo - 1 the French one"
  assert.deepEqual(cast.granolia, { voice: 'bf_lily', speed: 0.74, pitch: 1.18 }, 'Granolia: a British girl at a kid\'s pitch, speed two')
  assert.deepEqual(cast.boo, { voice: 'ff_siwis', speed: 0.8, pitch: 1 }, 'Boo: the French woman\'s voice, slow, her lines as they are written')
  assert.deepEqual(cast.salem, { voice: 'bm_lewis', speed: 0.95, pitch: 1 }, 'Salem: a rough British man')
  assert.deepEqual(cast.zimothy, { voice: 'bm_george', speed: 0.88, pitch: 1 }, 'Zimothy: an old British man')
  // "Please give me young boy Aussie options. Forget the low and slow." and then "12 Irwin - 5"
  assert.deepEqual(cast.irwin, { voice: 'bm_daniel', speed: 1, pitch: 1.3, accent: 'aussie-light' }, 'Sir Irwin: a young boy, with the lighter Australian accent')
  assert.equal(new Set(Object.values(cast).map(c => c.voice)).size, 5, 'five different voices')
})
