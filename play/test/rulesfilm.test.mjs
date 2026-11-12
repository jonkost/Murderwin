import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RULES_SLIDES, filmTimeline, rulesFilmAt, rulesMinutes, rulesAudioUrl, INTRO_MS, AFTER_INTRO_MS, BUMPER_IN_MS, BUMPER_OUT_MS, SILENT_SLIDE_MS } from '../src/lib/rulesfilm.js'
import { PICTURES } from '../src/look/look.js'
import { SETUP_EXTRAS } from '../src/lib/setup.js'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
const lengths = JSON.parse(read('../src/lib/rules-film.json'))
const BEAT = 1_800_000_000_000
const NIGHT = { act: 1, beat: 'rules', phase: 'act', beatAt: BEAT }

// Handoff 11 Nov 2026, A14: "The rules as a film, straight after the intro, with no second tab." The Parlour
// TV plays Jon's 28 recordings, each over its own slide, by itself, on the server's clock.

test('the film has the manifest’s 28 slides, in order, each with its recording’s name, a title and a few short lines', () => {
  const manifest = read('../../docs/rules-voiceover-manifest.md')
  const named = [...manifest.matchAll(/\| \d+ \| [a-z0-9-]+ \| (rules-\d\d-[a-z0-9-]+) \|/g)].map(m => m[1])
  assert.equal(named.length, 28, 'the manifest names 28 files')
  assert.deepEqual(RULES_SLIDES.map(s => s.file), named, 'one slide a recording, in the manifest’s order')
  for (const [i, s] of RULES_SLIDES.entries()) {
    assert.ok(s.file.startsWith(`rules-${String(i + 1).padStart(2, '0')}-`), s.file)
    assert.ok(words(s.title) >= 1 && words(s.title) <= 5, `a short title: ${s.title}`)
    assert.ok(s.lines.length >= 2 && s.lines.length <= 4, `${s.file}: two to four lines`)
    for (const l of s.lines) assert.ok(words(l) <= 8, `a short line: ${l}`)
    assert.ok(PICTURES[s.who], `${s.file} has one of the household on it`)
    // plain American English, no dashes, nothing a guest would not say out loud
    assert.ok(!/colour|favourite|whilst|—|–/.test([s.title, ...s.lines].join(' ')), s.file)
  }
  // the round that used to follow the door is out of the night: the slide for Act 6 does not speak of it
  const act6 = RULES_SLIDES.find(s => s.file === 'rules-25-act6-the-final-hour')
  assert.ok(!/ruled out|out loud|change your mind/i.test(act6.lines.join(' ')))
  assert.equal(rulesAudioUrl('rules-01-cover', '/play/'), '/play/rules/rules-01-cover.m4a')
})

test('the lengths the film runs on are in, and rule 25’s recording stops before the round that used to follow the door', () => {
  for (const s of RULES_SLIDES) assert.ok(lengths.slides[s.file] > 5 && lengths.slides[s.file] < 90, `${s.file}: ${lengths.slides[s.file]} s`)
  assert.equal(Object.keys(lengths.slides).length, 28)
  assert.ok(lengths.intro > 60 && lengths.intro < 240, 'the intro video was measured')
  assert.ok(lengths.slides['rules-25-act6-the-final-hour'] < 38, 'cut at the pause before "Then each of us says, out loud..." (the whole take was 45 seconds)')
  // the recordings themselves are not in git, like the videos; their lengths and the page about them are
  const ignore = read('../../.gitignore')
  assert.ok(ignore.includes('play/public/rules/*') && ignore.includes('!play/public/rules/README.md'))
  const mins = rulesMinutes()
  assert.ok(mins >= 13 && mins <= 18, `the intro and the rules together: about ${mins} minutes`)
  assert.ok(read('../../seed/night.json').includes('about sixteen minutes') === (mins === 16), 'the host’s words say how long it really is')
})

test('the timeline: a still moment, the voice, a still moment, then the next slide, with no gaps', () => {
  const film = filmTimeline()
  assert.equal(film.slides.length, 28)
  let at = 0
  for (const s of film.slides) {
    assert.equal(s.at, at, 'each slide starts where the last one ended')
    assert.equal(s.voiceAt, s.at + BUMPER_IN_MS)
    assert.equal(s.ms, BUMPER_IN_MS + s.voiceMs + BUMPER_OUT_MS)
    at += s.ms
  }
  assert.equal(film.total, at)
  // a recording that is not in yet: its slide still shows, silent, long enough to read
  const bare = filmTimeline(RULES_SLIDES.slice(0, 3), () => 0)
  assert.deepEqual(bare.slides.map(s => s.ms), [SILENT_SLIDE_MS, SILENT_SLIDE_MS, SILENT_SLIDE_MS])
  assert.equal(bare.total, 3 * SILENT_SLIDE_MS)
})

test('the film plays only at The house rules, from just after the intro to the last slide, on the server’s clock', () => {
  const film = filmTimeline()
  const start = BEAT + INTRO_MS + AFTER_INTRO_MS
  assert.equal(rulesFilmAt(NIGHT, BEAT + 1000), null, 'the intro video is still playing')
  assert.equal(rulesFilmAt(NIGHT, start - 1), null)
  const first = rulesFilmAt(NIGHT, start)
  assert.equal(first.index, 0)
  assert.equal(first.voice, null, 'the slide holds still before the voice')
  assert.equal(first.count, 28)
  const speaking = rulesFilmAt(NIGHT, start + BUMPER_IN_MS + 2000)
  assert.equal(speaking.index, 0)
  assert.ok(Math.abs(speaking.voice - 2) < 0.001, 'two seconds into the recording: a screen that reloads joins it there')
  // the seventh slide, half-way through its voice
  const seventh = film.slides[6]
  const mid = rulesFilmAt(NIGHT, start + seventh.voiceAt + seventh.voiceMs / 2)
  assert.equal(mid.index, 6)
  assert.equal(mid.slide.file, 'rules-07-your-character')
  assert.ok(Math.abs(mid.voice - seventh.voiceMs / 2000) < 0.001)
  // the still moment after the voice
  assert.equal(rulesFilmAt(NIGHT, start + seventh.voiceAt + seventh.voiceMs + 10).voice, null)
  // the last slide, then the join code comes back
  assert.equal(rulesFilmAt(NIGHT, start + film.total - 1).index, 27)
  assert.equal(rulesFilmAt(NIGHT, start + film.total), null)
  // never in another beat, in a pause, or with no clock to go by
  assert.equal(rulesFilmAt({ ...NIGHT, beat: 'meet' }, start + 5000), null)
  assert.equal(rulesFilmAt({ ...NIGHT, act: 2 }, start + 5000), null)
  assert.equal(rulesFilmAt({ ...NIGHT, phase: 'paused' }, start + 5000), null)
  assert.equal(rulesFilmAt({ ...NIGHT, beatAt: null }, start + 5000), null)
  assert.equal(rulesFilmAt(null, start), null)
  // Firestore's own time stamps work too
  assert.equal(rulesFilmAt({ ...NIGHT, beatAt: { toMillis: () => BEAT } }, start + 10).index, 0)
})

test('the Parlour TV plays it by itself, and there is no second tab any more', () => {
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("const film = which === 'living' && n ? rulesFilmAt(n, serverNow()) : null"), 'the Parlour TV only (never the iPad’s words-only page)')
  const film = kiosk.indexOf('else if (film) body = <RulesFilm at={film} />')
  const intro = kiosk.indexOf("else if (which === 'living' && intro && introOver !== intro.startedAt) body = <IntroVideo")
  const dark = kiosk.indexOf('else if (roomDark(n, living ? screen.data : null)) body = <Dark />')
  assert.ok(dark > 0 && film > dark && intro > film, 'after the dark, before the intro’s own check: a screen that reloads mid-film goes straight to its slide')
  const screen = read('../src/screens/RulesFilm.jsx')
  assert.ok(screen.includes('a.currentTime = voice'), 'a reload joins the voice where the clock says')
  assert.ok(screen.includes("p.catch(() => {})"), 'a screen refused sound still turns its slides')
  assert.ok(!/Connect|Chrome|click here|tap here/i.test(screen), 'no setup words on the film')
  assert.deepEqual(SETUP_EXTRAS, [], 'the setup page offers no intro video for a second tab')
  assert.ok(!/second tab|second browser tab/.test(read('../../seed/night.json')), 'the host’s words for the beat do not send Jon to another tab')
  assert.ok(!/from a second browser tab/.test(read('../../docs/on-the-night.md')))
})
