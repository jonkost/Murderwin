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
// SEAL RULE: nothing here returns content. Counts, stages and ok flags.

import { randomInt } from 'node:crypto'
import { MOTIVES, NightError, readArea, characterById } from './night.js'
import { rotationPath } from './station.js'
import { spotlightLines, isHushed, HUSH_ROLES } from './ledger.js' // the Hush: one record, one reader (safeguards)
import { parlourAwards, AWARD_TITLES } from './parlour.js'

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
export const EPILOGUE_AFTER_MS = 12_000 // the closing story, this long after the Victim is named
export const AWARDS_CLOSE_AFTER_ACT = 5 // the last act in which an achievement may be given

// The seven lines the reel always carries, in this order. Never a "slowest".
export const CANON_LABELS = [
  'Fastest safe',
  'Fastest light puzzle',
  'Time on the drawing',
  'Pictures that took more than one guess',
  "The cats' favourites",
  "The cats' least favourites",
  'Quickest on the Parlour Games',
]
export const HUSH_LABEL = 'Hush'
export const HUSH_LINE = 'Somebody was found out tonight and said nothing. The Manor noticed.'

export const DEFAULT_EPILOGUE = 'And so it was [MURDERER]. Not for money, not for love, for this: [MOTIVE_RHYME]. And [VICTIM] never saw it coming.'

// The Parlour Games awards (docs/parlour-games.md, draft: Jon may rewrite the
// titles and lines). They compare the guests with each other from their own
// answers only, never the cats' leans, so nobody looks like the cats'
// favourite while their slider says otherwise.
export const PARLOUR_AWARD_LINES = Object.freeze({
  rebel: 'Sided with the smaller half of the room most often.',
  crowd: 'Sided with the bigger half of the room most often.',
  kindred: 'Answered alike more often than any other two.',
  rivals: 'Agreed less often than any other two.',
})

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

  const stats = []
  const put = (label, value) => stats.push({ label, value: String(value), showAt: stats.length * STAT_EVERY_MS })

  // 1. the fastest safe: the time from the puzzle landing to the right numbers, gave-way opens excluded
  const safes = []
  for (const { guest, s } of people) {
    for (const [cardId, at] of Object.entries(s.solvedAt ?? {})) {
      if (s.gaveWay?.[cardId]) continue
      const card = (s.cards ?? []).find(x => x.id === cardId && x.kind === 'puzzle')
      if (!card?.at) continue
      const seconds = (ms(at) - ms(card.at)) / 1000
      if (seconds >= 0) safes.push({ name: guest.name, seconds })
    }
  }
  const safe = best(safes, x => x.seconds, pick, { low: true })
  put(CANON_LABELS[0], safe ? `${safe.name}, ${minutesAndSeconds(safe.seconds)}` : 'Nobody opened one')

  // 2. the fastest light puzzle (a solved study), by group
  const names = (gid) => (rot?.groups ?? []).find(g => g.id === gid)?.members.map(m => m.name).join(' and ') ?? gid
  const finished = Object.entries(rot?.finished ?? {})
  const solved = finished.filter(([, f]) => f.outcome === 'solved' && f.seconds > 0).map(([gid, f]) => ({ gid, seconds: f.seconds }))
  const light = best(solved, x => x.seconds, pick, { low: true })
  put(CANON_LABELS[1], light ? `${names(light.gid)}, ${minutesAndSeconds(light.seconds)}` : 'Not played')

  // 3. and 4. the drawing
  put(CANON_LABELS[2], relay?.stats?.totalSeconds ? minutesAndSeconds(relay.stats.totalSeconds) : 'Not played')
  const hard = Array.isArray(relay?.stats?.misses) ? relay.stats.misses.map((m, i) => (m > 0 ? `Grid ${i + 1}` : null)).filter(Boolean) : []
  put(CANON_LABELS[3], hard.length ? hard.join(', ') : 'None')

  // 5. and 6. each cat's favourite and least favourite guest (Irwin loves everyone the same)
  const favourites = [], least = []
  for (const cat of Object.keys(CAT_SHORT)) {
    const score = ({ s }) => (typeof s.affection?.[cat] === 'number' ? s.affection[cat] : null)
    const top = best(people, score, pick)
    const low = best(people, score, pick, { low: true })
    if (top) favourites.push(`${CAT_SHORT[cat]}: ${top.guest.name}`)
    if (low) least.push(`${CAT_SHORT[cat]}: ${low.guest.name}`)
  }
  put(CANON_LABELS[4], favourites.length ? favourites.join(' · ') : 'Nobody')
  put(CANON_LABELS[5], least.length ? least.join(' · ') : 'Nobody')

  // 7. the guest who answered the most Parlour Games before the bell, out of the Parlour Games
  // their phone was dealt (the eliminate and ballot windows are not Parlour Games)
  const answered = s => Object.values(s.answers ?? {}).filter(a => a && !a.defaulted).length
  const gamesDealt = s => Object.values(s.windows ?? {}).filter(w => w?.kind === 'questions').length || 1
  const quick = best(people, ({ s }) => (answered(s) > 0 ? answered(s) : null), pick)
  put(CANON_LABELS[6], quick ? `${quick.guest.name}, ${answered(quick.s)} of ${gamesDealt(quick.s)}` : 'Nobody')

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
  const sign = c?.dialSign ?? { ghost: 1, murderer: -1 }
  const up = (sign.ghost ?? 1) > 0 ? 'ghost' : 'murderer'
  const sides = { up, down: up === 'ghost' ? 'murderer' : 'ghost' }

  // the achievements the host gave during the night, in the order given, then the Parlour Games awards
  const given = Object.values(awardsSnap.exists ? (awardsSnap.data().awards ?? {}) : {}).sort((a, b) => ms(a.at) - ms(b.at))
  const nameOf = Object.fromEntries(people.map(({ guest }) => [guest.key, guest.name]))
  const won = parlourAwards(Object.fromEntries(people.map(({ guest, s }) => [guest.key, s.answers ?? {}])))
  const parlour = []
  for (const key of ['rebel', 'crowd']) if (won[key].length) parlour.push({ key, name: andList(won[key].map(k => nameOf[k])) })
  for (const key of ['kindred', 'rivals']) if (won[key].length) parlour.push({ key, name: won[key].map(pair => andList(pair.map(k => nameOf[k]))).join('; ') })
  const shown = [
    ...given.map(a => ({ name: a.name, title: a.title, line: a.line })),
    ...parlour.map(a => ({ name: a.name, title: AWARD_TITLES[a.key], line: PARLOUR_AWARD_LINES[a.key], parlour: true })),
  ]
  const achievements = shown.map((a, i) => ({ ...a, showAt: FINALE_SCHEDULE.awards + Math.min(i * AWARD_EVERY_MS, FINALE_SCHEDULE.graph - FINALE_SCHEDULE.awards - 2_000) }))
  const schedule = { ...FINALE_SCHEDULE }
  if (!achievements.length) schedule.awards = schedule.graph // nothing to show: straight to the graph

  const spotlight = spotlightLines(c) // the Hush, if the host ever tapped it; absent otherwise
  return {
    at: new Date(now), stage: 'stats', schedule, stats, achievements,
    graph: { points, running, sides, hush },
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
  if (next === 'victim') {
    patch.victimAt = new Date(now)
    patch.epilogue = fillEpilogue(r.frame, r)
  }
  await pubRef.update(patch)
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
  if (f.victimAt && ms(f.holdAt) >= ms(f.victimAt)) patch.victimAt = new Date(ms(f.victimAt) + held)
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
