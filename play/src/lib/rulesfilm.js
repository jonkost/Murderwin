// The rules as a film (handoff 11 Nov 2026, A14: "the rules as a film, straight
// after the intro, with no second tab"). The Parlour TV plays it by itself at
// The house rules: the intro video, then Jon's 28 recordings, each over its
// own slide. Nothing to switch to. Pure, so play/test and the importer
// (scripts/rules-film.mjs) can read it.
//
// THE SLIDES ARE JON'S OWN (handoff 12 Nov 2026, job 1: "Do not change the
// rule cards!" ... "The 28 slides and VO."): the 28 he made, as pictures, in
// his order, whole, with his recordings whole. The titles and lines below are
// only the fallback, drawn in code when his pictures are not in (OWN_SLIDES).
// Never reword, restyle or reorder his slides or his recordings.
//
// The recordings are Jon's (docs/rules-voiceover-manifest.md: one file a slide,
// rules-01-cover to rules-28-good-luck). `npm run rules-film -- "<folder>"`
// trims them, evens their loudness, puts them in play/public/rules/ (not in
// git, like the videos) and writes how long each one is to rules-film.json,
// which IS in git: the film's clock needs the lengths, and a screen that
// reloads part-way joins at the right slide.
//
// Each slide: a title, two or three short lines (the gist: the voice says the
// rest), and one of the household. Nothing here is sealed and nothing is about
// a case.
import lengths from './rules-film.json' with { type: 'json' }

export const RULES_SLIDES = [
  { file: 'rules-01-cover', who: 'irwin', n: 0, title: 'The House Rules', lines: ['Listen closely.', 'They are on your phone too.'] },
  { file: 'rules-02-tonight', who: 'boo', n: 0, title: 'Tonight', lines: ['Someone here is murdered.', 'Who did it? Why? Who died?', 'Name all three and you win.'] },
  { file: 'rules-03-three-roles', who: 'zimothy', n: 0, title: 'Three Roles', lines: ['Detectives know nothing. Yet.', 'The Murderer forgot why.', 'The Ghost does not know who.'] },
  { file: 'rules-04-the-ghost', who: 'granolia', n: 1, title: 'The Ghost', lines: ['One of us dies tonight.', 'We can all still see them.', 'The Ghost never says so.'] },
  { file: 'rules-05-the-murderer', who: 'salem', n: 1, title: 'The Murderer', lines: ['You did it. You forgot why.', 'Never confess.', 'At the vote, name yourself.'] },
  { file: 'rules-06-everyone-wins', who: 'irwin', n: 1, title: 'Everyone Wins the Same Way', lines: ['Murderer. Motive. Victim.', 'No teams.', 'Your answer is your own.'] },
  { file: 'rules-07-your-character', who: 'boo', n: 1, title: 'Your Character', lines: ['Scan the code. Type your name.', 'Tap Allow.', 'Collect your bag.'] },
  { file: 'rules-08-your-phone', who: 'granolia', n: 2, title: 'Your Phone', lines: ['Use your own. Do not share it.', 'If it dies, sign in on a spare.', 'A red strip? Stay put.'] },
  { file: 'rules-09-your-reticule', who: 'zimothy', n: 1, title: 'Your Reticule', lines: ['Seven tabs on your phone.', 'Now. You. Clues. Notes.', 'Motives. Cats. Rules.'] },
  { file: 'rules-10-motives', who: 'zimothy', n: 2, title: 'The Motives', lines: ['Nineteen little rhymes.', 'Exactly one is true.', 'Cross off the rest.'] },
  { file: 'rules-11-the-household', who: 'irwin', n: 2, title: 'The Household', lines: ['Witnesses, never suspects.', 'Sir Irwin. Granolia. Miss Boo.', 'Zimothy. Salem.'] },
  { file: 'rules-12-irwin-is-right', who: 'irwin', n: 4, title: 'Irwin Is Right', lines: ['If Irwin and anyone disagree,', 'Irwin is right.'] },
  { file: 'rules-13-how-cats-feel', who: 'boo', n: 2, title: 'How Cats Feel', lines: ['The more a cat likes you,', 'the more it tells you.', 'Your Cats tab shows where you stand.'] },
  { file: 'rules-14-reading-the-household', who: 'salem', n: 2, title: 'Reading the Household', lines: ['Irwin never lies.', 'Granolia forgets. Zimothy rations.', 'Salem has it backwards.'] },
  { file: 'rules-15-parlour-games', who: 'boo', n: 3, title: 'Parlour Games', lines: ['Twelve times tonight.', 'Three silly questions.', 'No wrong answers. Only opinions.'] },
  { file: 'rules-16-your-bag', who: 'granolia', n: 3, title: 'Your Bag', lines: ['Peek in your own. Ask before others.', 'Act two: clues about the Murderer.', 'Act four: clues about the Ghost.'] },
  { file: 'rules-17-traces', who: 'zimothy', n: 3, title: 'Traces', lines: ['Every character leaves a trace.', 'It is on their portrait.', 'Match it and you have a name.'] },
  { file: 'rules-18-house-rules', who: 'salem', n: 3, title: 'Four House Rules', lines: ['Hear the chime? Look at your phone.', 'Share with your mouth.', 'Eyes on your own phone.', 'Paused? Sir Irwin needs the garden.'] },
  { file: 'rules-19-the-night', who: 'irwin', n: 3, title: 'The Night', lines: ['Seven acts. One sunset.', 'Nobody leaves before the truth.'] },
  { file: 'rules-20-act1-the-invitation', who: 'boo', n: 4, label: 'Act One', title: 'The Invitation', lines: ['You are in it now.', 'Nobody has a secret. Yet.', 'The sun sets at 5:32.'] },
  { file: 'rules-21-act2-lights-out', who: 'salem', n: 4, label: 'Act Two', title: 'Lights Out', lines: ['The power fails. A life is taken.', 'Visit all four cats, alone.', 'What they say is for your ears only.'] },
  { file: 'rules-22-act3-supper-is-served', who: 'granolia', n: 0, label: 'Act Three', title: 'Supper Is Served', lines: ['Phones charge in the Parlour.', 'Hush for W-O-O-F News.', 'Then cross off your motives.'] },
  { file: 'rules-23-act4-behind-closed-doors', who: 'zimothy', n: 4, label: 'Act Four', title: 'Behind Closed Doors', lines: ['Small groups. Four rooms.', 'Fifteen minutes each.', 'What you learn stays in your group.'] },
  { file: 'rules-24-act5-one-candle', who: 'irwin', n: 0, label: 'Act Five', title: 'One Candle', lines: ['Cake. We sing.', 'Then watch the big screen.', 'Sir Irwin never lies.'] },
  { file: 'rules-25-act6-the-final-hour', who: 'irwin', n: 4, label: 'Act Six', title: 'The Final Hour', lines: ['Two last Parlour Games.', 'Three drawings open the door.', 'The Murderer’s trace is inside.'] },
  { file: 'rules-26-act7-unmasked', who: 'salem', n: 5, label: 'Act Seven', title: 'Unmasked', lines: ['Two minutes. Three names.', 'Murderer. Motive. Victim.', 'Then the masks come off.'] },
  { file: 'rules-27-keep-your-secret', who: 'boo', n: 0, title: 'Keep Your Secret', lines: ['If a secret slips out,', 'the Manor may shuffle the case.', 'So keep it.'] },
  { file: 'rules-28-good-luck', who: 'irwin', n: 1, title: 'Good Luck', lines: ['Trust the dog.', 'The sun is going down.'] },
]

// A slide holds still for a moment, the voice speaks, it holds a moment more.
export const BUMPER_IN_MS = 750
export const BUMPER_OUT_MS = 1000
// A slide whose recording is not in yet: long enough to read it.
export const SILENT_SLIDE_MS = 7000
// The film starts this long after the intro video ends, so the intro's last frame is never cut.
export const AFTER_INTRO_MS = 1500

const seconds = name => Number(lengths?.slides?.[name]) || 0
// The intro video's length (the importer measures it; 112 seconds when it has not).
export const INTRO_MS = Math.round((Number(lengths?.intro) || 112.1) * 1000)

// Are Jon's own 28 slides in, as pictures (play/public/rules/<name>.jpg)? Then the film shows them, whole,
// with nothing drawn over them (Jon, 12 Nov 2026: "Do not change the rule cards!"); the slides drawn in
// code above are only the fallback for a picture that is missing.
export const OWN_SLIDES = lengths?.pictures === true
export function rulesPictureUrl(file, base = '/play/') {
  return `${base}rules/${file}.jpg`
}

// Where a recording lives on the site (play/public/rules/, not in git).
export function rulesAudioUrl(file, base = '/play/') {
  return `${base}rules/${file}.m4a`
}

// The film's timeline: for each slide, when it starts (ms from the film's
// start), when its voice starts and how long the voice is. `total` is the
// whole film.
export function filmTimeline(slides = RULES_SLIDES, length = seconds) {
  let at = 0
  const out = slides.map((s, i) => {
    const voiceMs = Math.round(length(s.file) * 1000)
    const ms = voiceMs > 0 ? BUMPER_IN_MS + voiceMs + BUMPER_OUT_MS : SILENT_SLIDE_MS
    const row = { ...s, index: i, at, voiceAt: at + BUMPER_IN_MS, voiceMs, ms }
    at += ms
    return row
  })
  return { slides: out, total: at }
}

const millis = t => (t?.toMillis ? t.toMillis() : Number(t) || 0)

// Is the rules film on the Parlour TV now? Only at The house rules, only while
// the night is playing, from just after the intro video until the last slide
// is over. Returns the slide, how far into it the clock is, and how far into
// its recording (seconds; null before the voice starts or after it ends), or
// null: the join code shows.
export function rulesFilmAt(night, now, film = filmTimeline()) {
  if (!night || night.phase !== 'act' || night.act !== 1 || night.beat !== 'rules') return null
  const beatAt = millis(night.beatAt)
  if (!beatAt) return null
  const startedAt = beatAt + INTRO_MS + AFTER_INTRO_MS
  const t = now - startedAt
  if (t < 0 || t >= film.total) return null
  const slide = film.slides.findLast(s => s.at <= t) ?? film.slides[0]
  const into = t - slide.at
  const voice = slide.voiceMs > 0 && into >= BUMPER_IN_MS && into < BUMPER_IN_MS + slide.voiceMs ? (into - BUMPER_IN_MS) / 1000 : null
  return { startedAt, index: slide.index, slide, into, voice, count: film.slides.length, total: film.total }
}

// The Parlour TV at The house rules, moment by moment: the intro video, then
// the film (the review of 12 Nov 2026). The film's clock is the server's, so
// a screen that reloads joins at the right slide; but a video is a video, and
// one that started late or stalled on the wifi ends a little after its time.
// So that the video's end is never cut and the film's first words are never
// lost:
//   - the intro plays until it ends on this screen, up to INTRO_GRACE_MS past
//     the film's time (a video that never ends gives way to the film then);
//   - between the video's end and the first slide the screen holds dark,
//     never the join code;
//   - a film that had to wait for the video runs that far behind the clock
//     for its whole length (`lag`), so every recording still plays whole.
// `over` is what this screen knows of its own intro video: null while it has
// not ended, else { at: the beat it belonged to (`beat` below), played: it
// ran to its end (false: no file, or the browser refused it), lag }.
// A pause moves the beat's start on (functions/lib/night.js resumeNight), and
// beatShift says how far in all: the start less the shift is the same number
// before and after a pause, so after one the screen still knows its video is
// over and how far behind its film runs. A beat entered again (Back, then
// Next) is a new number, and plays again from the top.
// Answers { show: 'intro', startedAt, beat } | { show: 'film', at } |
// { show: 'gap' } or null (the join code).
export const INTRO_GRACE_MS = 6000
export function rulesScreenAt(night, now, over = null, film = filmTimeline()) {
  if (!night || night.phase !== 'act' || night.act !== 1 || night.beat !== 'rules') return null
  const beatAt = millis(night.beatAt)
  if (!beatAt || now < beatAt) return null
  const beat = beatAt - (Number(night.beatShift) || 0)
  const filmAt = beatAt + INTRO_MS + AFTER_INTRO_MS
  const done = !!over && over.at === beat
  if (!done && now < filmAt + INTRO_GRACE_MS) return { show: 'intro', startedAt: beatAt, beat }
  const played = done && over.played === true
  const lag = played ? Math.min(INTRO_GRACE_MS, Math.max(0, Number(over.lag) || 0)) : 0
  const at = rulesFilmAt(night, now - lag, film)
  if (at) return { show: 'film', at }
  if (played && now < filmAt + lag) return { show: 'gap' }
  return null
}
// How far behind the clock the film runs on a screen whose intro video ended at `now`: nothing when the
// video ended on time, else how late it was.
export function introLag(night, now) {
  const beatAt = millis(night?.beatAt)
  if (!beatAt) return 0
  return Math.min(INTRO_GRACE_MS, Math.max(0, now - (beatAt + INTRO_MS + AFTER_INTRO_MS)))
}

// How long the intro and the rules take together, in whole minutes, for the host's words.
export function rulesMinutes(film = filmTimeline()) {
  return Math.round((INTRO_MS + AFTER_INTRO_MS + film.total) / 60_000)
}
