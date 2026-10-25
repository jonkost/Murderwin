// Act 7 on the living room screen: the staged reveal, the stats reel, the
// achievements, the closing story and the host's hold.
//
// The answer (murderer, motive, victim) is written ONLY to
// nights/{id}/private/reveal, which no client can read. The public doc
// nights/{id}/public/finale carries the stats, the graph and the schedule,
// and a name is copied into it only when the host presses "reveal-stage",
// in canon order: Murderer, then Motive, then Victim. Until that press the
// screen, every phone and anyone reading the public doc has no name to
// find. results() in deal.js refuses to run before the Victim is named.
//
// Each press also starts that stage's share of the closing W-O-O-F News
// bulletin: news.<stage> = [{ who, text, card }] (captions, at once) and
// cardAt.<stage> = the moment the TV may show the name card, once the
// recorded parts before it have had their holdMs (seed/woof-news.json).
// The early reel's achievements are only the ones the host gave during the
// night; the end credits' awards are in credits.awards, shown once, after.
//
// SEAL RULE: nothing here returns content. Counts, stages and ok flags.

import { randomInt } from 'node:crypto'
import { MOTIVES, NightError, readArea, characterById, nameKey } from './night.js'
import { rotationPath } from './station.js'
import { spotlightLines, isHushed, HUSH_ROLES } from './ledger.js' // the Hush: one record, one reader (safeguards)
import { stopOf } from './parlour.js'
import { closingStage } from './news.js'
import { play, bulletinVideo } from './screen.js'
import { posesFor } from './pose.js'

export const finalePath = (nightId) => `nights/${nightId}/public/finale`
export const revealPath = (nightId) => `nights/${nightId}/private/reveal`
export const awardsPath = (nightId) => `nights/${nightId}/public/achievements`

// The host's stages, in canon order. 'stats' is the screen before any name.
export const STAGES = ['stats', 'murderer', 'motive', 'victim']

// Offsets from finale.at, in ms, on the server's clock. The screen plays
// the stats and the achievements, then the graph; from `names` on it waits
// for the host's press for each name. A hold shifts every later offset.
export const FINALE_SCHEDULE = { stats: 0, awards: 34_000, graph: 50_000, names: 80_000 }
export const STAT_EVERY_MS = 4_000      // one stat line fades in every four seconds
export const AWARD_EVERY_MS = 3_000     // one achievement every three seconds
export const EPILOGUE_AFTER_MS = 12_000 // the closing story, this long after victimAt
export const STORY_GAP_MS = 2_000      // a breath between the studio's sign-off and the closing story
export const AWARDS_CLOSE_AFTER_ACT = 5 // the last act in which an achievement may be given

// The lines the reel always carries, in this order. The cats' favourites
// moved to the awards (22 Oct), where a tie shows everyone tied.
export const CANON_LABELS = [
  'Fastest light puzzle',
  'Time on the drawing',
  'Pictures that took more than one guess',
  'Quickest on the Parlour Games',
]
export const HUSH_LABEL = 'Hush'
export const HUSH_LINE = 'Somebody was found out tonight and said nothing. The Manor noticed.'

export const DEFAULT_EPILOGUE = 'And so it was [MURDERER]. Not for money, not for love, for this: [MOTIVE_RHYME]. And [VICTIM] never saw it coming.'

// The end credits' awards (docs/handoff-2026-10-22.md §8). One person (or
// one group) each, never one player against another. The cats' awards come
// from the FINAL sliders, never the hidden leans (G31). A tie shows everyone
// tied. Answers a phone was given when its window closed do not count.
export const AWARD_TEXT = Object.freeze({
  irwinFavourite: { title: "Sir Irwin's Favorite", line: 'He would share his toy with you. Not his good toy. But a toy.' },
  irwinLeast: { title: "Sir Irwin's Least Favorite", line: 'He thinks you\'re wonderful. From across the room. But treats are still very welcome. You can toss them.' },
  quickest: { title: 'Quickest Paw', line: 'First to answer the Parlour Games, again and again.' },
  slowest: { title: 'Took Their Sweet Time', line: 'Thought hard about every Parlour Game. Very hard.' },
  napping: { title: 'Napping With Irwin', line: 'Missed the most Parlour Games. Sir Irwin understands.' },
  sharpest: { title: 'Sharpest Memory', line: 'Matched Zimothy\'s files the fastest.' },
  bright: { title: 'Bright Sparks', line: 'Cracked the study lights the fastest.' },
  dark: { title: 'Left in the Dark', line: 'The study lights won this one. Granolia still believes in you.' },
  satOn: { title: 'Sat On by Granolia', line: 'She loves you. She would like to sit on you.' },
  knockedOff: { title: 'Knocked Off by Boo', line: 'Your glass, the table, the floor. In that order.' },
  billed: { title: 'Billed by Zimothy', line: 'The invoice is in the mail.' },
  hissed: { title: 'Hissed At by Salem', line: 'Stay off the lawn.' },
  fur: { title: 'Covered in Fur', line: 'Every cat in the house left a little of itself on you.' },
  fetch: { title: 'Fetch Champion', line: 'The first person the real Sir Irwin brought a toy to.' },
  salemFriend: { title: 'True Friend of the Groundskeeper', line: 'Salem chose you. He told it to you straight.' },
})
const CAT_NAMES_LONG = { granolia: 'Granolia', boo: 'Boo', zimothy: 'Zimothy', salem: 'Salem' }

// The joke counters that keep climbing on the screen, and the thanks.
export const COUNTERS = [
  { key: 'barks', label: 'Times Irwin barked' },
  { key: 'hairballs', label: 'Hairballs Zimothy billed the family for' },
  { key: 'salemWrong', label: 'Times Salem was wrong', note: 'He disputes this number.' },
  { key: 'forgot', label: 'Things Granolia forgot tonight', note: "She's forgotten the count." },
]
export const THANKS = ['Granolia Lickspittle', 'Miss Boo LaRue', 'Zimothy Clawford, Esq.', 'Salem Crooknog', 'Sir Irwin', 'Jon', 'Susan', 'Jenna']
export const IN_MEMORY = { line: 'In loving memory of Sydney, the original good boy', photo: 'household/sydney.jpg' }
export const LAST_CARD = { cat: 'irwin', line: 'Can we play again?' }

// Every top scorer, ties included; nobody when nobody scored.
function allBest(items, score, { low = false } = {}) {
  let top = null, winners = []
  for (const it of items) {
    const v = score(it)
    if (v == null) continue
    if (top === null || (low ? v < top : v > top)) { top = v; winners = [it] }
    else if (v === top) winners.push(it)
  }
  return winners
}

function andList(names) {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

const CAT_SHORT = { granolia: 'Granolia', boo: 'Boo', zimothy: 'Zimothy', salem: 'Salem' }

const pickInt = (n) => randomInt(n)
const choice = (list, pick = pickInt) => (list.length ? list[pick(list.length)] : undefined)

export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

export function minutesAndSeconds(seconds) {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60), r = s % 60
  if (!m) return `${r} s`
  return r ? `${m} min ${r} s` : `${m} min`
}

// Everyone at the party with a phone: roster key, name, character, uid.
async function roster(db, nightId) {
  const [nightSnap, deckSnap] = await Promise.all([db.doc(`nights/${nightId}`).get(), db.doc(`nights/${nightId}/private/deck`).get()])
  if (!nightSnap.exists) throw new NightError('no-night', 'No such night.')
  const night = nightSnap.data()
  const uids = deckSnap.exists ? (deckSnap.data().uids ?? {}) : {}
  const list = Object.entries(night.roster ?? {}).map(([key, r]) => ({ key, ...r, uid: uids[key] ?? null })).filter(g => g.uid)
  return { night, list }
}

async function sessionsOf(db, list) {
  const out = []
  for (const g of list) {
    const snap = await db.doc(`sessions/${g.uid}`).get()
    if (snap.exists) out.push({ guest: g, s: snap.data() })
  }
  return out
}

// The best of a list by a score, ties broken at random and never shown as a tie.
function best(items, score, pick, { low = false } = {}) {
  let top = null, winners = []
  for (const it of items) {
    const v = score(it)
    if (v == null) continue
    if (top === null || (low ? v < top : v > top)) { top = v; winners = [it] }
    else if (v === top) winners.push(it)
  }
  return winners.length ? choice(winners, pick) : null
}

// The end credits' awards, worked out from the final state of the night.
// Returns [{ title, name, line }], each name a list when tied.
export function creditAwards({ people = [], rot = null, memoryTimes = {}, night = {}, game = {} } = {}) {
  const out = []
  const put = (key, winners, nameOf = w => w.guest.name) => { if (winners.length) out.push({ key, title: AWARD_TEXT[key].title, name: andList(winners.map(nameOf)), line: AWARD_TEXT[key].line }) }
  const stop = (s, cat) => (typeof s.affection?.[cat] === 'number' ? stopOf(s.affection[cat]) : null)
  // each cat's favourite and least favourite, from the final sliders
  for (const cat of Object.keys(CAT_NAMES_LONG)) {
    const fav = allBest(people, ({ s }) => stop(s, cat))
    const least = allBest(people, ({ s }) => stop(s, cat), { low: true })
    if (fav.length && fav.length < people.length) out.push({ key: `fav-${cat}`, title: `${CAT_NAMES_LONG[cat]}'s Favorite`, name: andList(fav.map(w => w.guest.name)), line: null })
    if (least.length && least.length < people.length) out.push({ key: `least-${cat}`, title: `${CAT_NAMES_LONG[cat]}'s Least Favorite`, name: andList(least.map(w => w.guest.name)), line: null })
  }
  // Sir Irwin's: always Jessa's character, and always Jake's (the Game night page can name others)
  const seat = (who) => people.find(p => nameKey(p.guest.name) === nameKey(who))
  const asCharacter = p => characterById(p.guest.characterId)?.name ?? p.guest.name
  const fav = seat(game.irwin_favourite || 'Jessa'), least = seat(game.irwin_least || 'Jake')
  if (fav) put('irwinFavourite', [fav], asCharacter)
  if (least) put('irwinLeast', [least], asCharacter)
  // the Parlour Games: how fast each guest answered, and who missed the most; missed windows never count as answers
  const speeds = p => Object.entries(p.s.answers ?? {}).filter(([wid, a]) => a && !a.defaulted && p.s.windows?.[wid]?.kind === 'questions' && p.s.windows?.[wid]?.opensAt)
    .map(([wid, a]) => (ms(a.at) - ms(p.s.windows[wid].opensAt)) / 1000).filter(x => x >= 0)
  const avg = p => { const v = speeds(p); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
  const quick = allBest(people, avg, { low: true }), slow = allBest(people, avg)
  if (quick.length && quick.length < people.length) put('quickest', quick)
  if (slow.length && slow.length < people.length && slow[0] !== quick[0]) put('slowest', slow)
  const missed = p => Object.values(p.s.answers ?? {}).filter(a => a?.defaulted).length || null
  put('napping', allBest(people, missed))
  // the puzzle awards go to groups
  const groupName = gid => (rot?.groups ?? []).find(g => g.id === gid)?.members.map(m => m.name).join(' and ') ?? null
  const mem = Object.entries(memoryTimes ?? {}).map(([gid, seconds]) => ({ gid, seconds }))
  put('sharpest', allBest(mem, x => x.seconds, { low: true }), w => groupName(w.gid))
  const study = Object.entries(rot?.finished ?? {}).map(([gid, f]) => ({ gid, ...f }))
  const solvedStudy = study.filter(f => f.outcome === 'solved' && f.seconds > 0)
  put('bright', allBest(solvedStudy, x => x.seconds, { low: true }), w => groupName(w.gid))
  const unsolved = study.filter(f => f.outcome !== 'solved')
  put('dark', unsolved.length ? unsolved : allBest(solvedStudy.length > 1 ? solvedStudy : [], x => x.seconds), w => groupName(w.gid))
  // the fun ones, matched to the sliders so they never contradict them
  put('satOn', people.filter(({ s }) => stop(s, 'granolia') === 5))
  put('knockedOff', people.filter(({ s }) => stop(s, 'boo') === 1))
  put('billed', people.filter(({ s }) => stop(s, 'zimothy') === 1))
  put('hissed', people.filter(({ s }) => stop(s, 'salem') === 1))
  put('fur', people.filter(({ s }) => { const v = Object.keys(CAT_NAMES_LONG).map(c => stop(s, c) ?? 3); return v.reduce((a, b) => a + b, 0) / v.length >= 4 }))
  if (night.fetchChampion) put('fetch', people.filter(p => p.guest.key === night.fetchChampion))
  put('salemFriend', people.filter(({ s }) => s.salemFriend))
  return out
}

// The room's split on every Parlour Game question, in the order played.
export function roomSplits(people = []) {
  const qs = new Map()
  for (const { s } of people) {
    for (const [wid, w] of Object.entries(s.windows ?? {})) {
      if (w?.kind !== 'questions' || !Array.isArray(w.beats)) continue
      w.beats.forEach((b, i) => { const id = `${wid}#${i}`; if (!qs.has(id)) qs.set(id, { q: b.q, a: b.choices?.[0]?.text ?? '', b: b.choices?.[1]?.text ?? '', counts: { a: 0, b: 0 } }) })
      const a = s.answers?.[wid]
      if (a && !a.defaulted && Array.isArray(a.picks)) a.picks.forEach((p, i) => { const q = qs.get(`${wid}#${i}`); if (q && (p === 'a' || p === 'b')) q.counts[p]++ })
    }
  }
  return [...qs.values()].filter(q => q.counts.a + q.counts.b > 0).map(q => ({ q: q.q, a: { text: q.a, count: q.counts.a }, b: { text: q.b, count: q.counts.b } }))
}

// The joke counters: big, silly, the same every time for the same night.
export function jokeCounters(nightId) {
  const n = (key, lo, hi) => { let h = 0; for (const ch of `${nightId}:${key}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return lo + (h % (hi - lo + 1)) }
  const value = { barks: n('barks', 200, 900), hairballs: n('hairballs', 12, 60), salemWrong: n('salemWrong', 30, 99), forgot: n('forgot', 40, 140) }
  return COUNTERS.map(c => ({ ...c, value: value[c.key] }))
}

// ---------------------------------------------------------------------------
// The public finale doc. Stats are strings; the graph is the dial's pushes
// with its sides named from the case's fixed signs; names are empty until
// the host presses. Written once at the reveal beat.

export async function finaleDoc(db, nightId, c, now = Date.now(), { pick = pickInt } = {}) {
  const [rotSnap, relaySnap, awardsSnap] = await Promise.all([
    db.doc(rotationPath(nightId)).get(), db.doc(`nights/${nightId}/public/relay`).get(), db.doc(awardsPath(nightId)).get(),
  ])
  const rot = rotSnap.exists ? rotSnap.data() : null
  const relay = relaySnap.exists ? relaySnap.data() : null
  const { list } = await roster(db, nightId)
  const people = await sessionsOf(db, list)
  const [clueSnap, memSnap, bulletinSnap, traceSnap, gameSnap] = await Promise.all([
    db.doc(`nights/${nightId}/private/dialClues`).get(), db.doc(`nights/${nightId}/private/memoryTimes`).get(),
    db.doc(`nights/${nightId}/private/bulletin`).get(), db.doc(`nights/${nightId}/public/trace`).get(), db.doc('meta/game').get(),
  ])

  const stats = []
  const put = (label, value) => stats.push({ label, value: String(value), showAt: stats.length * STAT_EVERY_MS })

  // 1. the fastest light puzzle (a solved study), by group
  const names = (gid) => (rot?.groups ?? []).find(g => g.id === gid)?.members.map(m => m.name).join(' and ') ?? gid
  const finished = Object.entries(rot?.finished ?? {})
  const solved = finished.filter(([, f]) => f.outcome === 'solved' && f.seconds > 0).map(([gid, f]) => ({ gid, seconds: f.seconds }))
  const light = best(solved, x => x.seconds, pick, { low: true })
  put(CANON_LABELS[0], light ? `${names(light.gid)}, ${minutesAndSeconds(light.seconds)}` : 'Not played')

  // 2. and 3. the drawing
  put(CANON_LABELS[1], relay?.stats?.totalSeconds ? minutesAndSeconds(relay.stats.totalSeconds) : 'Not played')
  const hard = Array.isArray(relay?.stats?.misses) ? relay.stats.misses.map((m, i) => (m > 0 ? `Grid ${i + 1}` : null)).filter(Boolean) : []
  put(CANON_LABELS[2], hard.length ? hard.join(', ') : 'None')

  // 4. the guest who answered the most Parlour Games before the bell, out of the Parlour Games
  // their phone was dealt (the eliminate and ballot windows are not Parlour Games)
  const answered = s => Object.values(s.answers ?? {}).filter(a => a && !a.defaulted).length
  const gamesDealt = s => Object.values(s.windows ?? {}).filter(w => w?.kind === 'questions').length || 1
  const quick = best(people, ({ s }) => (answered(s) > 0 ? answered(s) : null), pick)
  put(CANON_LABELS[3], quick ? `${quick.guest.name}, ${answered(quick.s)} of ${gamesDealt(quick.s)}` : 'Nobody')

  // the exposure safeguard: a silent tap all night, one line now, never which role (ledger.isHushed is the one reader)
  const hush = HUSH_ROLES.some(role => isHushed(c, role))
  if (hush) put(HUSH_LABEL, HUSH_LINE)

  // the graph: every push, and which side each role pulls toward (fixed per case, never assumed)
  const log = Array.isArray(c?.dialLog) ? c.dialLog : []
  const points = log.map(e => ({ act: e.act ?? 0, role: e.role, delta: e.delta }))
  const running = []
  let value = 0
  for (const act of [2, 4, 6]) {
    value += points.filter(p => p.act === act).reduce((sum, p) => sum + p.delta, 0)
    running.push({ act, value })
  }
  // the dial's journey: its highs and lows through the night, and the level each dial clue landed at
  let walk = 0, high = 0, low = 0
  for (const p of points) { walk += p.delta; high = Math.max(high, walk); low = Math.min(low, walk) }
  const clues = clueSnap?.exists ? clueSnap.data() : {}
  const studyLevels = Object.values(clues.study ?? {})
  const clueLevels = [
    { label: 'The supper bulletin', level: bulletinSnap?.exists ? bulletinSnap.data().level ?? null : null },
    { label: "Sir Irwin's countdown", level: clues.irwin ?? null },
    { label: 'The study trace', level: studyLevels.length ? Math.round(studyLevels.reduce((a, b) => a + b, 0) / studyLevels.length) : null },
    { label: 'The trace reveal', level: traceSnap?.exists ? traceSnap.data().level ?? null : null },
  ].filter(x => x.level != null)
  const sign = c?.dialSign ?? { ghost: 1, murderer: -1 }
  const up = (sign.ghost ?? 1) > 0 ? 'ghost' : 'murderer'
  const sides = { up, down: up === 'ghost' ? 'murderer' : 'ghost' }

  // the early reel: only the achievements the host gave during the night, in the order given.
  // The end credits' awards show once, in the credits after the reveal (credits.awards).
  const given = Object.values(awardsSnap.exists ? (awardsSnap.data().awards ?? {}) : {}).sort((a, b) => ms(a.at) - ms(b.at))
  const night = (await db.doc(`nights/${nightId}`).get()).data() ?? {}
  const awards = creditAwards({ people, rot, memoryTimes: memSnap.exists ? memSnap.data() : {}, night, game: gameSnap.exists ? gameSnap.data() : {} })
    .map(a => ({ title: a.title, name: a.name, line: a.line }))
  const shown = given.map(a => ({ name: a.name, title: a.title, line: a.line }))
  const achievements = shown.map((a, i) => ({ ...a, showAt: FINALE_SCHEDULE.awards + Math.min(i * AWARD_EVERY_MS, FINALE_SCHEDULE.graph - FINALE_SCHEDULE.awards - 2_000) }))
  const schedule = { ...FINALE_SCHEDULE }
  if (!achievements.length) schedule.awards = schedule.graph // nothing to show: straight to the graph

  const spotlight = spotlightLines(c) // the Hush, if the host ever tapped it; absent otherwise
  // Boo's Catwalk: each group's last pose, when the Entryway's camera took one (pose.js)
  const poses = await posesFor(db, nightId, rot)
  return {
    at: new Date(now), stage: 'stats', schedule, stats, achievements,
    graph: { points, running, sides, hush, high, low, clues: clueLevels },
    credits: { awards, counters: jokeCounters(nightId), splits: roomSplits(people), poses, thanks: [...THANKS, ...people.map(p => p.guest.name)], memory: IN_MEMORY, last: LAST_CARD },
    news: {}, cardAt: {},
    names: {}, epilogue: null, victimAt: null, holdAt: null, held: 0,
    rehearsal: !!c?.rehearsal,
    ...(spotlight.length ? { spotlight } : {}),
  }
}

// ---------------------------------------------------------------------------
// The reveal beat: the answer to private/, the reel to public/. Idempotent:
// a second press keeps the stage the host has reached.

export async function reveal(db, nightId, c, { now = Date.now(), pick = pickInt } = {}) {
  const pubRef = db.doc(finalePath(nightId))
  if ((await pubRef.get()).exists) return { ok: true, already: true }
  const { night } = await roster(db, nightId)
  const ros = night.roster ?? {}
  const person = key => (key && ros[key] ? { key, name: ros[key].name, characterName: characterById(ros[key].characterId)?.name ?? '' } : null)
  const motive = MOTIVES.find(m => m.n === c.motive) ?? null
  const frames = (await readArea(db, 'epilogue_frames')).map(i => i.text)
  const frame = choice(frames, pick) ?? DEFAULT_EPILOGUE
  const r = { murderer: person(c.murderer), motive, victim: person(c.ghost), rehearsal: !!c.rehearsal, frame, at: new Date(now) }
  await db.doc(revealPath(nightId)).set(r)
  await pubRef.set(await finaleDoc(db, nightId, c, now, { pick }))
  return { ok: true }
}

// Back one from the reveal: the screen forgets everything, so the next
// press starts the reel again with no name out.
export async function unreveal(db, nightId) {
  let removed = 0
  for (const path of [finalePath(nightId), revealPath(nightId)]) {
    const ref = db.doc(path)
    if ((await ref.get()).exists) { await ref.delete(); removed++ }
  }
  return { ok: true, removed }
}

export function fillEpilogue(frame, r) {
  return String(frame ?? DEFAULT_EPILOGUE)
    .replace(/\[MURDERER\]/g, r?.murderer?.name ?? '')
    .replace(/\[VICTIM\]/g, r?.victim?.name ?? '')
    .replace(/\[MOTIVE_RHYME\]/g, r?.motive?.rhyme ?? '')
}

// The host's press: one more name onto the screen, in canon order.
export async function stage(db, nightId, { now = Date.now() } = {}) {
  const pubRef = db.doc(finalePath(nightId))
  const pubSnap = await pubRef.get()
  if (!pubSnap.exists) throw new NightError('invalid', 'Nothing to name yet. Press Next to the reveal first.')
  const f = pubSnap.data()
  const i = STAGES.indexOf(f.stage ?? 'stats')
  if (i >= STAGES.length - 1) return { ok: true, already: true, stage: 'victim' }
  const next = STAGES[i + 1]
  const r = (await db.doc(revealPath(nightId)).get()).data()
  if (!r) throw new NightError('invalid', 'The answer is missing. Press Back one, then Next.')
  const patch = { stage: next }
  if (next === 'motive') patch['names.motive'] = { n: r.motive?.n ?? null, rhyme: r.motive?.rhyme ?? '' }
  else patch[`names.${next}`] = { name: r[next]?.name ?? '', characterName: r[next]?.characterName ?? '' }
  // the closing W-O-O-F News bulletin (news.js): this stage's recorded parts play and their
  // words go up as captions at once; the card itself waits on the server clock (cardAt) until
  // the parts before it have been said. Murderer: the studio, then Mic's first line; Motive:
  // his second; Victim: his third, then his sign-off and the studio's close under the cards.
  const { parts, leadMs } = closingStage(next)
  if (next === 'victim') {
    // the closing story (EPILOGUE_AFTER_MS after victimAt) and everything after it wait
    // until the Victim's parts have been said, so Ava's sign-off is never talked over
    const saidMs = parts.reduce((sum, p) => sum + p.holdMs, 0)
    patch.victimNamedAt = new Date(now)
    patch.victimAt = new Date(now + Math.max(0, saidMs + STORY_GAP_MS - EPILOGUE_AFTER_MS))
    patch.epilogue = fillEpilogue(r.frame, r)
  }
  patch[`news.${next}`] = parts.map(p => ({ who: p.who, text: p.text, card: p.card }))
  patch[`cardAt.${next}`] = new Date(now + leadMs)
  // as video on the Parlour TV (Jon, 23 Oct 2026): the kiosk plays this stage's parts as video (it
  // works out the files from the open bank, so no recording is named here) and the brain stays quiet
  const video = parts.length ? await bulletinVideo(db) : false
  if (video) patch[`video.${next}`] = true
  await pubRef.update(patch)
  if (parts.length) await play(db, nightId, null, { now, clips: parts.map(p => p.clip), video })
  return { ok: true, stage: next }
}

// results() may run only once the screen has named all three.
export async function requireNamed(db, nightId) {
  const snap = await db.doc(finalePath(nightId)).get()
  const f = snap.exists ? snap.data() : null
  if (!f) throw new NightError('invalid', 'The screen has not revealed yet. Press Next to the reveal first.')
  if (f.stage !== 'victim') throw new NightError('invalid', 'The screen has not named all three yet. Name them first.')
  return f
}

// ---------------------------------------------------------------------------
// The hold: the screen stands still until the host says go, and every later
// moment on the schedule moves on by the length of the hold.

export async function hold(db, nightId, { now = Date.now() } = {}) {
  const ref = db.doc(finalePath(nightId))
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('invalid', 'Nothing on the screen to hold.')
  if (snap.data().holdAt) return { ok: true, already: true }
  await ref.update({ holdAt: new Date(now) })
  return { ok: true }
}

export async function go(db, nightId, { now = Date.now() } = {}) {
  const ref = db.doc(finalePath(nightId))
  const snap = await ref.get()
  if (!snap.exists) throw new NightError('invalid', 'Nothing on the screen to carry on.')
  const f = snap.data()
  if (!f.holdAt) return { ok: true, already: true }
  const held = Math.max(0, now - ms(f.holdAt))
  const t0 = ms(f.holdAt) - ms(f.at) // how far the screen had got when it was held
  const shift = (offset) => (typeof offset === 'number' && offset > t0 ? offset + held : offset)
  const schedule = Object.fromEntries(Object.entries(f.schedule ?? {}).map(([k, v]) => [k, shift(v)]))
  const stats = (f.stats ?? []).map(s => ({ ...s, showAt: shift(s.showAt) }))
  const achievements = (f.achievements ?? []).map(a => ({ ...a, showAt: shift(a.showAt) }))
  const patch = { holdAt: null, held: (f.held ?? 0) + held, schedule, stats, achievements }
  // a hold after the Victim was named: the wait before the closing story carries on where it stood
  if (f.victimAt && ms(f.holdAt) >= ms(f.victimNamedAt ?? f.victimAt)) patch.victimAt = new Date(ms(f.victimAt) + held)
  // a name card still waiting on its lead-in when the hold came waits the same time again after it
  for (const [s, t] of Object.entries(f.cardAt ?? {})) if (ms(t) > ms(f.holdAt)) patch[`cardAt.${s}`] = new Date(ms(t) + held)
  await ref.update(patch)
  return { ok: true, heldMs: held }
}

// ---------------------------------------------------------------------------
// Achievements: pre-written in the workshop ("Title: one line"), given by a
// tap on the Host tab, all in by the end of Act 5. One lands on the guest's
// phone at once and on the screen at the end.

export async function readAchievements(db) {
  const items = await readArea(db, 'achievements')
  return items.map((it, i) => {
    const m = /^([^:\n]+):\s*(.*)$/s.exec(it.text.trim())
    return { n: i + 1, title: (m ? m[1] : it.text).trim(), line: (m ? m[2] : '').trim() }
  })
}

// "guestKey:n" from the host's tap.
export function parseAward(arg) {
  const m = /^([a-z0-9_]+):(\d+)$/.exec(String(arg ?? '').trim())
  if (!m) throw new NightError('invalid', 'Say which guest and which achievement.')
  return { key: m[1], n: Number(m[2]) }
}

export async function award(db, nightId, { arg, now = Date.now() } = {}) {
  const { key, n } = parseAward(arg)
  const { night, list } = await roster(db, nightId)
  if ((night.act ?? 0) > AWARDS_CLOSE_AFTER_ACT) throw new NightError('invalid', 'Achievements close at the end of Act 5.')
  const guest = list.find(g => g.key === key)
  if (!guest) throw new NightError('invalid', 'No such guest at the party.')
  const item = (await readAchievements(db)).find(a => a.n === n)
  if (!item) throw new NightError('invalid', 'No such achievement in the workshop list.')
  const ref = db.doc(awardsPath(nightId))
  const snap = await ref.get()
  const id = `${key}_${n}`
  const have = snap.exists ? (snap.data().awards ?? {}) : {}
  if (have[id]) return { ok: true, already: true, awards: Object.keys(have).length }
  const entry = { key, name: guest.name, n, title: item.title, line: item.line, act: night.act ?? 0, at: new Date(now) }
  if (!snap.exists) await ref.set({ awards: { [id]: entry } })
  else await ref.update({ [`awards.${id}`]: entry })
  // the card on the phone: a required tap, then it goes away (the screen shows it again at the end)
  const sessionRef = db.doc(`sessions/${guest.uid}`)
  const sSnap = await sessionRef.get()
  let dealt = false
  if (sSnap.exists) {
    const cards = sSnap.data().cards ?? []
    const cardId = `${night.act ?? 0}-award-${n}`
    if (!cards.some(c => c.id === cardId)) {
      await sessionRef.update({ cards: [...cards, { id: cardId, act: night.act ?? 0, beat: night.beat ?? null, kind: 'award', title: item.title, text: item.line, button: 'Keep it', at: new Date(now) }] })
      dealt = true
    }
  }
  return { ok: true, dealt, awards: Object.keys(have).length + 1 }
}
