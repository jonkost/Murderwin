import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RULES_SLIDES, filmTimeline, rulesFilmAt, rulesScreenAt, introLag, INTRO_GRACE_MS, rulesMinutes, rulesAudioUrl, rulesPictureUrl, OWN_SLIDES, INTRO_MS, AFTER_INTRO_MS, BUMPER_IN_MS, BUMPER_OUT_MS, SILENT_SLIDE_MS } from '../src/lib/rulesfilm.js'
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

test('the lengths the film runs on are in, and every recording plays whole (Jon, 12 Nov 2026)', () => {
  for (const s of RULES_SLIDES) assert.ok(lengths.slides[s.file] > 5 && lengths.slides[s.file] < 90, `${s.file}: ${lengths.slides[s.file]} s`)
  assert.equal(Object.keys(lengths.slides).length, 28)
  assert.ok(lengths.intro > 60 && lengths.intro < 240, 'the intro video was measured')
  assert.ok(lengths.slides['rules-25-act6-the-final-hour'] > 43, 'rule 25 plays whole, all 45 seconds: nothing of Jon’s is cut')
  // the recordings themselves are not in git, like the videos; their lengths and the page about them are
  const ignore = read('../../.gitignore')
  assert.ok(ignore.includes('play/public/rules/*') && ignore.includes('!play/public/rules/README.md'))
  const mins = rulesMinutes()
  assert.ok(mins >= 13 && mins <= 18, `the intro and the rules together: about ${mins} minutes`)
  assert.ok(read('../../seed/night.json').includes('about sixteen minutes') === (mins === 16), 'the host’s words say how long it really is')
})

// Handoff 12 Nov 2026, job 1 (Jon: "Do not change the rule cards!" ... "The 28 slides and VO."): the film's
// pictures are Jon's own 28 slides, whole, with nothing drawn over them. The slides drawn in code are only
// what shows when his pictures are not in.
test('the film shows Jon’s own slide for each recording, whole, and the drawn slide only when his picture is missing', () => {
  assert.equal(OWN_SLIDES, lengths.pictures === true, 'the film goes by what the importer found')
  assert.equal(OWN_SLIDES, true, 'Jon’s 28 slides are in (12 Nov 2026)')
  assert.equal(rulesPictureUrl('rules-17-traces', '/play/'), '/play/rules/rules-17-traces.jpg', 'a slide’s picture has its recording’s name')
  const screen = read('../src/screens/RulesFilm.jsx')
  const own = screen.slice(screen.indexOf('if (OWN_SLIDES && !lost[slide.file])'), screen.indexOf('return (\n    <div className="lk-screen lk-rules full">'))
  assert.ok(own.includes('className="lk-rules-slide" src={rulesPictureUrl(slide.file, BASE)}'), 'his slide, by its name')
  assert.ok(own.includes('onError={() => setLost('), 'a picture that will not load falls back to the drawn slide')
  assert.ok(own.includes('<audio ref={audio} key={slide.file} src={rulesAudioUrl(slide.file, BASE)}'), 'his recording plays over it')
  // nothing of ours is drawn over his slide: no cat, no words, no counter, no bar
  assert.ok(!/<Cat|<Ground|lk-words|lk-rules-n"|lk-rules-bar|lk-label|slide\.lines|slide\.label/.test(own), 'his slide is whole')
  const css = read('../src/look/look.css')
  assert.ok(css.includes('.lk-rules-slide { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;'), 'the whole slide, never cropped or stretched')
  // his pictures are not in git, like his recordings
  assert.ok(read('../../.gitignore').includes('play/public/rules/*'))
  // the Host tab says which set the film shows
  const host = read('../src/screens/Host.jsx')
  assert.ok(host.includes("{OWN_SLIDES ? 'The rules film shows your own 28 slides.' : 'The rules film shows drawn slides: your own 28 are not in yet.'}"))
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

// The review of 12 Nov 2026: the film used to take the screen at its time whatever the video was doing (a video
// that started late lost its last seconds to slide 1), and the join code flashed between the two.
test('the intro video is never cut, no join code shows between it and the film, and the film loses none of its words', () => {
  const film = filmTimeline()
  const filmAt = BEAT + INTRO_MS + AFTER_INTRO_MS
  // while the video plays: the intro
  assert.deepEqual(rulesScreenAt(NIGHT, BEAT + 1000, null), { show: 'intro', startedAt: BEAT, beat: BEAT })
  // the video ended on time: dark for the moment before the first slide, never the join code
  const onTime = { at: BEAT, played: true, lag: introLag(NIGHT, BEAT + INTRO_MS) }
  assert.equal(onTime.lag, 0)
  assert.deepEqual(rulesScreenAt(NIGHT, BEAT + INTRO_MS + 10, onTime), { show: 'gap' })
  assert.deepEqual(rulesScreenAt(NIGHT, filmAt - 1, onTime), { show: 'gap' })
  assert.equal(rulesScreenAt(NIGHT, filmAt, onTime).show, 'film')
  assert.equal(rulesScreenAt(NIGHT, filmAt, onTime).at.index, 0)
  // the video is running late (it stalled on the wifi): it keeps the screen past the film's time, up to the grace
  assert.equal(rulesScreenAt(NIGHT, filmAt + 2000, null).show, 'intro')
  assert.equal(rulesScreenAt(NIGHT, filmAt + INTRO_GRACE_MS - 1, null).show, 'intro')
  // ...and ends three seconds late: the film starts then, from its first moment, and runs three seconds behind
  const late = { at: BEAT, played: true, lag: introLag(NIGHT, filmAt + 3000) }
  assert.equal(late.lag, 3000)
  const first = rulesScreenAt(NIGHT, filmAt + 3000, late)
  assert.equal(first.show, 'film'); assert.equal(first.at.index, 0); assert.equal(first.at.into, 0)
  const speaking = rulesScreenAt(NIGHT, filmAt + 3000 + BUMPER_IN_MS + 2000, late)
  assert.ok(Math.abs(speaking.at.voice - 2) < 0.001, 'every recording still plays from its first word')
  assert.equal(rulesScreenAt(NIGHT, filmAt + film.total + 2999, late).at.index, 27, 'to the last slide')
  assert.equal(rulesScreenAt(NIGHT, filmAt + film.total + 3000, late), null, 'then the join code')
  // a video that never ends gives way to the film at the grace
  const stuck = rulesScreenAt(NIGHT, filmAt + INTRO_GRACE_MS, null)
  assert.equal(stuck.show, 'film'); assert.equal(stuck.at.index, 0)
  assert.equal(introLag(NIGHT, filmAt + 60_000), INTRO_GRACE_MS, 'the film never runs further behind than the grace')
  assert.equal(introLag({ ...NIGHT, beatAt: null }, filmAt), 0)
  // no file, or a browser that will not play it: the join code until the film, then the film on the clock
  const none = { at: BEAT, played: false, lag: 0 }
  assert.equal(rulesScreenAt(NIGHT, BEAT + 5000, none), null)
  assert.equal(rulesScreenAt(NIGHT, filmAt + 10, none).show, 'film')
  // a screen that reloads part-way knows nothing of its video: mid-film it goes straight to its slide
  assert.equal(rulesScreenAt(NIGHT, filmAt + film.slides[6].at + 100, null).at.index, 6)
  // what a screen knew belongs to one beat. The beat entered again (Back, then Next) is a new start: the video plays again
  const again = { ...NIGHT, beatAt: BEAT + 60_000 }
  assert.deepEqual(rulesScreenAt(again, BEAT + 60_000 + 30_000, onTime), { show: 'intro', startedAt: BEAT + 60_000, beat: BEAT + 60_000 })
  // ...but a pause only moves the beat's start on, and the night says how far (beatShift): it is the same beat, so
  // the screen still knows its video is over and how far behind its film runs
  const paused = { ...NIGHT, beatAt: BEAT + 420_000, beatShift: 420_000 }
  // a pause in the film's first seconds: straight back to the slide, never the video again
  const back = rulesScreenAt(paused, filmAt + 420_000 + 2000, onTime)
  assert.equal(back.show, 'film'); assert.equal(back.at.index, 0); assert.equal(back.at.into, 2000)
  // a film that ran three seconds late keeps its three seconds: no word of the slide it was on is skipped
  const mid = filmAt + film.slides[11].at + 5000
  const before = rulesScreenAt(NIGHT, mid + 3000, late)
  const after = rulesScreenAt(paused, mid + 3000 + 420_000, late)
  assert.equal(after.at.index, before.at.index); assert.equal(after.at.into, before.at.into); assert.equal(after.at.index, 11)
  // a pause in the middle of the video: the video picks up (it seeks to the moved start)
  assert.deepEqual(rulesScreenAt(paused, BEAT + 420_000 + 30_000, null), { show: 'intro', startedAt: BEAT + 420_000, beat: BEAT })
  // two pauses add up
  assert.equal(rulesScreenAt({ ...NIGHT, beatAt: BEAT + 500_000, beatShift: 500_000 }, filmAt + 500_000 + 2000, onTime).show, 'film')
  // never outside The house rules, in a pause, or before the beat
  assert.equal(rulesScreenAt({ ...NIGHT, phase: 'paused' }, BEAT + 1000, null), null)
  assert.equal(rulesScreenAt({ ...NIGHT, beat: 'arrive' }, BEAT + 1000, null), null)
  assert.equal(rulesScreenAt(NIGHT, BEAT - 1, null), null)
  assert.equal(rulesScreenAt(null, BEAT, null), null)
  // Firestore's own time stamps work too
  assert.equal(rulesScreenAt({ ...NIGHT, beatAt: { toMillis: () => BEAT } }, BEAT + 10, null).show, 'intro')
})

test('the Parlour TV plays it by itself, and there is no second tab any more', () => {
  const kiosk = read('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("const rules = which === 'living' && n ? rulesScreenAt(n, serverNow(), introOver) : null"), 'the Parlour TV only (never the iPad’s words-only page)')
  const intro = kiosk.indexOf("else if (rules?.show === 'intro') body = <IntroVideo")
  const film = kiosk.indexOf("else if (rules?.show === 'film') body = <RulesFilm at={rules.at} />")
  const gap = kiosk.indexOf("else if (rules?.show === 'gap') body = <Dark />")
  const dark = kiosk.indexOf('else if (roomDark(n, living ? screen.data : null, serverNow())) body = <Dark hit={blackoutHit(n, serverNow())} />')
  assert.ok(dark > 0 && intro > dark && film > intro && gap > film, 'after the dark: the intro, the film, or the dark moment between them (rulesScreenAt says which)')
  // the video says how it ended: to its end (true), or no file and a refused play (false: the join code until the film)
  assert.ok(kiosk.includes('onEnded={() => onOver(true)} onError={() => onOver(false)}'))
  assert.ok(kiosk.includes('setIntroOver({ at: rules.beat, played, lag: played ? introLag(n, serverNow()) : 0 })'), 'a film that waited for the video runs that far behind, in the beat the video belonged to')
  const screen = read('../src/screens/RulesFilm.jsx')
  assert.ok(screen.includes('a.currentTime = voice'), 'a reload joins the voice where the clock says')
  assert.ok(screen.includes("p.catch(() => {})"), 'a screen refused sound still turns its slides')
  assert.ok(!/Connect|Chrome|click here|tap here/i.test(screen), 'no setup words on the film')
  assert.deepEqual(SETUP_EXTRAS, [], 'the setup page offers no intro video for a second tab')
  assert.ok(!/second tab|second browser tab/.test(read('../../seed/night.json')), 'the host’s words for the beat do not send Jon to another tab')
  assert.ok(!/from a second browser tab/.test(read('../../docs/on-the-night.md')))
})
