// Act 4, Behind Closed Doors (docs/handoff-2026-10-23.md §3, §9.5 to §9.9;
// Jon's plan, 23 Oct 2026). Pairs and trios, three to five groups. Every
// group visits all four game rooms, one round each, fifteen minutes a round (the
// seed's roundMinutes; ten until 31 Oct 2026) on the
// server's clock for every room, the study included; a group with no room
// this round waits in the Parlour, where Sir Irwin's prompts run on the TV.
//
//   The Study       Granolia   the light puzzle (station/)        the Ghost's trace + a bag hint
//   The Library     Zimothy    the memory match, three rounds      one wrong motive crossed off + a bag hint
//   The Orangerie   Salem      Salem's Motion Game                 a bag hint, maybe backwards
//   The Entryway    Boo        Miss Boo LaRue's Arcade (5 Nov 2026) a bag hint about the Ghost, no cross-off
//
// How it starts (the beats in seed/night.json, Act 4):
//   warn    Jon presses Start Act 4: every phone gets a two-minute warning.
//   groups  chime-phone, the title card on the Parlour TV, each phone its
//           group as portraits with Locked in. (From warnEndsAt, the clock.)
//   round1  chime-phone sends the groups to their first rooms, once every
//           guest is locked in or lockMinutes have passed (the clock).
//   round2… every roundMinutes the chime, the cap pays every room not yet
//           paid, and the groups move on. The study's game stops with the
//           round (station/lib/study.js tick). After the last round everyone
//           goes back to the Parlour.
// The clock is the minute tick plus the Host tab's own (run.js clockTick);
// the host's Next moves on at once. A group that finishes early is paid at
// once and waits in the Parlour; a group that does not finish is paid at the
// chime (G52). Every cat reward uses the group's average affection with that
// cat at the moment it is paid; the trace level comes from the dial.
//
// Public docs (any phone may read them; nothing in them names a role, the
// motive, a clue word or a bag):
//   nights/{id}/public/act4    { phase, warnEndsAt, lockEndsAt, round, rounds, roundStartsAt, roundEndsAt, locked: { key: true } }
//   nights/{id}/public/rotation { groups, order, rooms, rounds, studyOrder, finished }
//   nights/{id}/public/memory  the Library's boards: traces only, all fourteen as art
//   nights/{id}/public/salem   Salem's game: the schedule of colours
//   nights/{id}/public/boo     the Entryway: which group is at the arcade, and the round's end
// Private: nights/{id}/private/act4 { paid: { 'gid-room': { outcome, at } }, arrived: { 'gid-room': at } }.
// Each phone's own step: sessions/{uid}.act4 { round, room, title, text, arrive, paid, here, at }.
//
// SEAL RULE: the case is read here for the cross-offs and the bag hints only;
// what they name goes to the group's own phones and into cases/{id}, never to
// a public doc, a log or a return value.

import { randomInt } from 'node:crypto'
import { NightError, MOTIVES, CHARACTERS, characterById, readArea, GAME_NAMES } from './night.js'
import { NIGHT, guests, dealCard, labelled, readCase, ensureCase, ms, CAT_NAMES, FREE_TIME_TIPS } from './deal.js'
import { makeGroups, rotationPath, studyPath, finishStudy } from './station.js'
import { readPacking } from './bags.js'
import { nightSeed, pickFor } from './seed.js'
import { bagPlan, bagLine, bagStandIn, CAT_SHORT } from './bagclues.js'
import { memoryPick } from './families.js'
import { noteDealt } from './ledger.js'
import { stopOf } from './parlour.js'
import { seededUnit } from './case.js'
import { play } from './screen.js'
import { hostLine } from './hosts.js'
import { hasFillIns, isFillIn, seatsToWaitFor } from './seats.js'

const CFG = NIGHT.act4 ?? {}
export const ROUND_MS = (Number(CFG.roundMinutes) || 15) * 60_000
export const WARN_MS = (Number(CFG.warnMinutes) || 2) * 60_000
export const LOCK_MS = (Number(CFG.lockMinutes) || 2) * 60_000
export const MAX_GROUPS = Number(CFG.maxGroups) || 5

// Each room's game name is its direction card's title, with the hook under it (§16).
const named = id => ({ title: GAME_NAMES[id]?.name, hook: GAME_NAMES[id]?.hook ?? null })
export const ROOMS = {
  study: { cat: 'granolia', name: 'the Study', ...named('study') },
  library: { cat: 'zimothy', name: 'the Library', ...named('library') },
  orangerie: { cat: 'salem', name: 'the Orangerie', ...named('orangerie') },
  entryway: { cat: 'boo', name: 'the Entryway', ...named('entryway') },
}
export const ROOM_KEYS = Object.keys(ROOMS)
export const ROOM_OF_CAT = Object.fromEntries(ROOM_KEYS.map(k => [ROOMS[k].cat, k]))
export const PARLOUR = 'parlour'
export const PHASES = ['warn', 'groups', 'rounds', 'done']

export function act4Path(nightId) { return `nights/${nightId}/public/act4` }
export function act4PrivatePath(nightId) { return `nights/${nightId}/private/act4` }
export function memoryPath(nightId) { return `nights/${nightId}/public/memory` }
export function salemPath(nightId) { return `nights/${nightId}/public/salem` }
export function booPath(nightId) { return `nights/${nightId}/public/boo` }

// Open copy (§9.5); the workshop's ui_copy lines ACT4 <KEY> win.
export const DIRECTIONS = {
  study: 'Go to the Study, upstairs.',
  library: 'Go to the Library.',
  orangerie: 'Go to the Orangerie.',
  entryway: 'Go to the Entryway.',
  parlour: 'Wait in the Parlour this round.',
}
export const ACT4_TEXT = {
  warn: { title: 'Two minutes!', text: 'Behind Closed Doors starts in two minutes. Keep your phone close.', button: 'Got it' },
  arrive: 'Scan the code on the wall.',
  chime: 'Time to move.',
  paid: 'Done. Back to the Parlour.',
  over: { title: 'Back to the Parlour', text: 'Everyone to the Parlour.' },
  screen: { title: 'Act 4 · Behind Closed Doors', line: 'Look at your phone and find your group.' },
  group: 'From now on, only share with your group.',
  alone: 'From now on, keep what you learn to yourself.',
}

// What each room's cat says with its reward (§9.6 to §9.9). [RHYME] is the
// motive crossed off; the bag hint follows on the same card.
export const REWARD_LINES = {
  study: { done: 'Granolia remembers one more thing.', capped: 'Granolia remembers one more thing.' },
  library: { done: 'Order. Restored. Strike [RHYME] from your list; it was not that. Invoice to follow.', capped: 'Time, and my patience, are billable. Leave the files. Here is what you have earned anyway: strike [RHYME] from your list; it was not that.' },
  orangerie: { done: "Huh. You lot can follow instructions. Backwards ones, anyway. Here's what I know.", capped: "Time's up. The sprinklers are on a timer. Here's what I know anyway, since you tried." },
  // the arcade (5 Nov 2026, card 515): no cross-off; the bag hint about the Ghost is the prize, and a trio's
  // third player gets Boo's line instead (Jon's words, 28 Oct 2026)
  entryway: { done: 'You amused me, darling. Keep it.', capped: "Time, darling. Here's your prize anyway." },
}
export const ARCADE_THIRD_LINE = "Didn't I give you enough? Now be off! I'm done playing games." // play/src/lib/arcade.js THIRD_LINE; a test keeps them equal
// How many of a group get a clue at the arcade: the first two in the group's order; a trio's third gets the line
export const ARCADE_CLUES = 2
// On a rehearsal night the cross-off is a stand-in too (Jon, 23 Oct 2026).
export function crossStandIn() { return "[Zimothy's cross-off appears here: one wrong motive]" }

function shuffled(list, pick = randomInt) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = pick(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// ---------------------------------------------------------------------------
// The groups and the rooms.

// How many rounds: four rooms, or one more when there are five groups (one
// group waits in the Parlour each round). Every group visits every room once (G47).
export function roundsFor(groupCount) { return Math.max(ROOM_KEYS.length, Number(groupCount) || 0) }

// Where a group is in round `round` (1-based): one of the four rooms, or the
// Parlour. A room never holds two groups (G47): the groups walk the rooms in
// step, each one place along.
export function roomFor(rot, gid, round) {
  const order = rot?.order ?? []
  const i = order.indexOf(gid)
  if (i < 0 || !(round >= 1)) return PARLOUR
  const rounds = rot.rounds ?? roundsFor(order.length)
  if (round > rounds) return PARLOUR
  const slot = (i + round - 1) % rounds
  return slot < ROOM_KEYS.length ? (rot.rooms ?? ROOM_KEYS)[slot] : PARLOUR
}
// The group in a room this round, or null.
export function groupIn(rot, room, round) {
  return (rot?.order ?? []).find(gid => roomFor(rot, gid, round) === room) ?? null
}

export async function readRotation(db, nightId) {
  const snap = await db.doc(rotationPath(nightId)).get()
  return snap.exists ? snap.data() : null
}

// A practice night with fill-in players (the polish pass, job A4, 11 Nov
// 2026; lib/seats.js). The real players walk the rooms together: up to three
// of them are one group, even when that puts the Murderer and the Ghost side
// by side (nothing leaks: they are together all act, and it is a practice).
// More than three are grouped among themselves, as on any night. The fill-ins
// take the other walks, in groups marked `fill`: no room screen ever waits
// for one (setRooms), and each is paid at the chime like any group that did
// not finish. At most four groups in all, so nobody real sits a round out in
// the Parlour. Never called on a night with no fill-in seat.
export const FILL_NIGHT_GROUPS = 4
export function fillNightGroups(keys, roster, { apart = [], pick = randomInt } = {}) {
  const cap = Math.min(MAX_GROUPS, FILL_NIGHT_GROUPS)
  const real = keys.filter(k => !isFillIn(roster[k]))
  const fill = keys.filter(k => isFillIn(roster[k]))
  const out = []
  if (real.length && real.length <= 3) out.push({ members: shuffled(real, pick) })
  else if (real.length) for (const members of makeGroups(real, { apart, pickInt: pick, maxGroups: Math.max(1, cap - 1) })) out.push({ members })
  const left = Math.max(1, cap - out.length)
  if (fill.length === 1) out.push({ members: fill, fill: true })
  else if (fill.length) for (const members of makeGroups(fill, { pickInt: pick, maxGroups: left })) out.push({ members, fill: true })
  return out
}

// The fill-in groups of a rotation, by id, as the roster stands now: a group
// is one only while every member is still a fill-in, so a guest who takes a
// fill-in's seat brings that group back onto the room screens. On a night
// with no fill group (the party, every ordinary rehearsal) nothing is read.
async function fillGroupIds(db, nightId, rot) {
  if (!(rot?.groups ?? []).some(g => g.fill)) return new Set()
  const roster = (await db.doc(`nights/${nightId}`).get()).data()?.roster ?? {}
  return new Set(rot.groups.filter(g => g.fill && g.members.every(m => isFillIn(roster[m.key]))).map(g => g.id))
}

// The groups, once: pairs and trios, at most five groups, the Murderer and the
// Ghost never together (station.makeGroups), and the walk round the rooms.
export async function makeRooms(db, nightId, { force = false, pick = null } = {}) {
  const have = await readRotation(db, nightId)
  if (have?.order?.length && !force) return { ok: true, already: true, groups: have.order.length }
  const c = await ensureCase(db, nightId)
  const snap = await db.doc(`nights/${nightId}`).get()
  const roster = snap.data()?.roster ?? {}
  // a seeded rehearsal makes the same groups again, in name order (seed.js)
  const seed = await nightSeed(db, nightId)
  if (!pick) pick = pickFor(seed, 'rooms')
  const keys = seed ? Object.keys(roster).sort() : Object.keys(roster)
  const apart = [c?.murderer, c?.ghost].filter(Boolean)
  // a practice night with fill-in players has its own grouping (fillNightGroups, below); every other night,
  // the party among them, makes exactly the call it always has, with the same random draws
  const made = hasFillIns(roster)
    ? fillNightGroups(keys, roster, { apart, pick })
    : makeGroups(keys, { apart, pickInt: pick, maxGroups: MAX_GROUPS }).map(members => ({ members }))
  const groups = made.map(({ members, fill }, i) => ({
    id: `g${i + 1}`,
    members: members.map(k => ({ key: k, name: roster[k].name, characterId: roster[k].characterId, characterName: characterById(roster[k].characterId)?.name ?? '' })),
    ...(fill ? { fill: true } : {}),
  }))
  const order = shuffled(groups.map(g => g.id), pick)
  const rooms = shuffled(ROOM_KEYS, pick)
  const rounds = roundsFor(order.length)
  const rot = { groups, order, rooms, rounds, finished: {}, madeAt: new Date() }
  // the study's order (station.finishStudy reads it): who is in the study at each round
  rot.studyOrder = Array.from({ length: rounds }, (_, r) => groupIn(rot, 'study', r + 1))
  await db.doc(rotationPath(nightId)).set(rot)
  await db.doc(act4PrivatePath(nightId)).set({ paid: {}, arrived: {} })
  return { ok: true, groups: groups.length, trios: groups.filter(g => g.members.length === 3).length, rounds }
}

// The rounded average of a group's affection to one cat, 1 to 5.
async function groupRung(db, uids, cat) {
  const vals = []
  for (const uid of uids) {
    const v = (await db.doc(`sessions/${uid}`).get()).data()?.affection?.[cat]
    if (typeof v === 'number') vals.push(v)
  }
  return vals.length ? stopOf(vals.reduce((a, b) => a + b, 0) / vals.length) : 3
}
// Every cat's average for the group: the Cats tab's second marker (never a number on screen).
async function groupAffectionOf(db, uids) {
  const out = {}
  for (const cat of ['irwin', 'granolia', 'boo', 'zimothy', 'salem']) out[cat] = await groupRung(db, uids, cat)
  return out
}

// ---------------------------------------------------------------------------
// The beats.

// warn: Jon pressed Start Act 4. The groups are made (nobody sees them yet),
// every phone gets the two-minute warning, and the clock starts.
export async function warn(db, nightId, act, beat, { now = Date.now() } = {}) {
  await makeRooms(db, nightId)
  const pubRef = db.doc(act4Path(nightId))
  const pub = (await pubRef.get()).data()
  if (!pub?.phase) await pubRef.set({ phase: 'warn', warnEndsAt: new Date(now + WARN_MS), locked: {}, round: 0 })
  const { list } = await guests(db, nightId)
  const ui = labelled(await readArea(db, 'ui_copy'))
  let dealt = 0
  for (const g of list) {
    if (await dealCard(db, g.uid, { id: `${act}-${beat}-warn`, act, beat, kind: 'notice', key: 'act4-warn', title: ACT4_TEXT.warn.title, text: ui['ACT4 WARN'] ?? ACT4_TEXT.warn.text, button: ACT4_TEXT.warn.button })) dealt++
  }
  return { ok: true, dealt }
}

// groups: each phone shows its group as portraits and character names, with
// Locked in. While a group waits the phone keeps showing the group card
// (never a waiting-for-players screen).
export async function dealGroupCards(db, nightId, act, beat, { now = Date.now() } = {}) {
  await makeRooms(db, nightId)
  const rot = await readRotation(db, nightId)
  const { list } = await guests(db, nightId)
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  const ui = labelled(await readArea(db, 'ui_copy'))
  let dealt = 0
  for (const grp of rot.groups ?? []) {
    const uids = grp.members.map(m => byKey[m.key]?.uid).filter(Boolean)
    const groupAffection = await groupAffectionOf(db, uids)
    for (const m of grp.members) {
      const g = byKey[m.key]
      if (!g) continue
      await db.doc(`sessions/${g.uid}`).update({ group: grp.id, groupAffection })
      const others = grp.members.filter(x => x.key !== m.key)
      const card = {
        id: `${act}-${beat}-group`, act, beat, kind: 'group', group: grp.id, lockIn: true,
        members: grp.members.map(x => ({ key: x.key, name: x.name, characterId: x.characterId, characterName: x.characterName })),
        title: others.length ? `You're teamed up with ${others.map(x => x.characterName || x.name).join(' and ')}` : 'You are on your own this act',
        text: others.length ? ui['ACT4 GROUP'] ?? ACT4_TEXT.group : ACT4_TEXT.alone,
      }
      if (await dealCard(db, g.uid, card)) dealt++
    }
  }
  const pubRef = db.doc(act4Path(nightId))
  const pub = (await pubRef.get()).data() ?? {}
  if (pub.phase === 'warn' || !pub.phase) await pubRef.set({ phase: 'groups', lockEndsAt: new Date(now + LOCK_MS), locked: pub.locked ?? {}, round: 0 }, { merge: true })
  return { ok: true, groups: rot.groups.length, dealt }
}

// "Locked in": a name on the public doc (who has tapped, never anything else).
export async function lockIn(db, { nightId, uid }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const s = (await db.doc(`sessions/${uid}`).get()).data()
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  if (!s.group) throw new NightError('invalid', 'Your group is on its way.')
  const ref = db.doc(act4Path(nightId))
  if (!(await ref.get()).exists) throw new NightError('invalid', 'Your group is on its way.')
  await ref.update({ [`locked.${s.guestKey}`]: true })
  return { ok: true }
}

// The direction each phone shows for a round.
function directionFor(room, { round, rounds, tip = null, ui = {} } = {}) {
  const text = ui[`ACT4 ${room.toUpperCase()}`] ?? DIRECTIONS[room]
  if (room === PARLOUR) return { room, cat: null, title: 'In the Parlour', text: tip ? `${text} ${tip}` : text, round, rounds }
  const cat = ROOMS[room].cat
  // the host's hello once the group has scanned in (hosts.js): Granolia in the Study, Zimothy in the Library
  const host = room === 'study' || room === 'library' ? { cat, line: hostLine(cat, ui) } : null
  return { room, cat, catName: CAT_NAMES[cat], title: ROOMS[room].title, hook: ROOMS[room].hook, text, arrive: ui['ACT4 ARRIVE'] ?? ACT4_TEXT.arrive, round, rounds, ...(host ? { host } : {}) }
}
// The Parlour tip for a group (§9.5 free-time tips), the same for every member, seeded on the case's salt.
export function parlourTip(c, gid, round, nightId = '') {
  return FREE_TIME_TIPS[Math.floor(seededUnit(c?.screenSalt ?? nightId, gid, round, 'parlour-tip') * FREE_TIME_TIPS.length)]
}

async function directGroups(db, nightId, rot, round, { now = Date.now(), over = false } = {}) {
  const { list } = await guests(db, nightId)
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  const ui = labelled(await readArea(db, 'ui_copy'))
  const c = await readCase(db, nightId)
  for (const grp of rot.groups ?? []) {
    const room = over ? PARLOUR : roomFor(rot, grp.id, round)
    const step = over
      ? { room: PARLOUR, cat: null, title: ACT4_TEXT.over.title, text: ui['ACT4 OVER'] ?? ACT4_TEXT.over.text, round, rounds: rot.rounds, over: true }
      : directionFor(room, { round, rounds: rot.rounds, tip: room === PARLOUR ? parlourTip(c, grp.id, round, nightId) : null, ui })
    for (const m of grp.members) {
      const g = byKey[m.key]
      if (!g) continue
      await db.doc(`sessions/${g.uid}`).update({ act4: { ...step, chime: round > 1 && !over ? ui['ACT4 CHIME'] ?? ACT4_TEXT.chime : null, paid: false, here: false, at: new Date(now) } })
    }
  }
}

// One round begins: the round before is paid at the cap, each room's game is
// set for the group due there, and every phone says where its group goes.
// A round past the last one ends the act's rounds.
export async function startRound(db, nightId, round, { now = Date.now() } = {}) {
  const rot = await readRotation(db, nightId)
  if (!rot?.order?.length) throw new NightError('invalid', 'No groups yet. Start Act 4 first.')
  const pubRef = db.doc(act4Path(nightId))
  const pub = (await pubRef.get()).data() ?? {}
  if (pub.phase === 'rounds' && pub.round === round) return { ok: true, already: true, round }
  if (pub.phase === 'done') return { ok: true, already: true, done: true }
  if (pub.phase === 'rounds' && pub.round >= 1) await payRound(db, nightId, rot, pub.round, { outcome: 'capped', now })
  if (round > rot.rounds) return finishRounds(db, nightId, { now })
  const endsAt = new Date(now + ROUND_MS)
  await pubRef.set({ phase: 'rounds', round, rounds: rot.rounds, roundStartsAt: new Date(now), roundEndsAt: endsAt }, { merge: true })
  await setRooms(db, nightId, rot, round, { now, endsAt })
  await directGroups(db, nightId, rot, round, { now })
  return { ok: true, round, rounds: rot.rounds }
}

// Each game room ready for the group due there this round.
async function setRooms(db, nightId, rot, round, { now = Date.now(), endsAt = null, pick = null } = {}) {
  // a practice night's fill-in group is never set on a room's screen: nobody is coming, so the room stays
  // at rest and the chime pays the group like any that did not finish (fillGroupIds; empty on any other night)
  const fill = await fillGroupIds(db, nightId, rot)
  const due = room => {
    const gid = round >= 1 && round <= rot.rounds ? groupIn(rot, room, round) : null
    return gid && fill.has(gid) ? null : gid
  }
  if (!pick) pick = pickFor(await nightSeed(db, nightId), 'memory', round)
  // the study: the station follows public/study.groupId (station/lib/follow.js)
  await db.doc(studyPath(nightId)).set({ groupId: due('study'), reassignedFrom: null, slotEndsAt: endsAt }, { merge: true })
  await db.doc(memoryPath(nightId)).set(memoryDoc(due('library'), round, { now, pick }))
  await db.doc(salemPath(nightId)).set(salemIdle(due('orangerie'), round, now))
  await db.doc(booPath(nightId)).set(booIdle(due('entryway'), round, now, endsAt))
}

// After the last round (or Next past it): every room not yet paid is paid,
// everyone goes back to the Parlour.
export async function finishRounds(db, nightId, { now = Date.now() } = {}) {
  const rot = await readRotation(db, nightId)
  const pubRef = db.doc(act4Path(nightId))
  const pub = (await pubRef.get()).data() ?? {}
  if (pub.phase === 'done') return { ok: true, already: true, done: true }
  if (rot && pub.phase === 'rounds' && pub.round >= 1) await payRound(db, nightId, rot, pub.round, { outcome: 'capped', now })
  await pubRef.set({ phase: 'done', roundEndsAt: null, doneAt: new Date(now) }, { merge: true })
  if (rot) {
    await setRooms(db, nightId, rot, 0, { now })
    await directGroups(db, nightId, rot, pub.round ?? 0, { now, over: true })
  }
  // the call back to the Parlour (handoff §2b: chime-phone at every "look at your phone")
  if (pub.phase === 'rounds') await play(db, nightId, 'chime-phone', { now })
  return { ok: true, done: true }
}

// What the clock should do now, for run.js: the beat to enter, 'finish', or null.
export async function due(db, nightId, now = Date.now()) {
  const snap = await db.doc(`nights/${nightId}`).get()
  const night = snap.exists ? snap.data() : null
  if (!night || night.act !== 4 || night.phase !== 'act') return null
  const pub = (await db.doc(act4Path(nightId)).get()).data()
  if (!pub?.phase) return null
  if (pub.phase === 'warn' && now >= ms(pub.warnEndsAt)) return 'groups'
  if (pub.phase === 'groups') {
    // everyone at the party; on a practice night with fill-in players, the real players only (lib/seats.js)
    const keys = seatsToWaitFor(night.roster ?? {})
    const allLocked = keys.length > 0 && keys.every(k => pub.locked?.[k])
    if (allLocked || now >= ms(pub.lockEndsAt)) return 'round1'
  }
  if (pub.phase === 'rounds' && now >= ms(pub.roundEndsAt)) return pub.round + 1 <= (pub.rounds ?? 4) ? `round${pub.round + 1}` : 'finish'
  return null
}

// ---------------------------------------------------------------------------
// Arriving in a room: the group scans the code on the wall (the same codes as
// Act 2, ?meet=<cat>). Only the group due in that room this round may start
// its game; anyone else is told kindly where to go.
export async function scanRoom(db, { nightId, uid, cat, now = Date.now() }) {
  if (!uid) throw new NightError('unauthenticated', 'Sign in first.')
  const room = ROOM_OF_CAT[cat]
  if (!room) throw new NightError('invalid', 'That code is not one of the rooms.')
  const s = (await db.doc(`sessions/${uid}`).get()).data()
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  const pub = (await db.doc(act4Path(nightId)).get()).data() ?? {}
  if (pub.phase !== 'rounds') throw new NightError('invalid', 'Not yet. Your phone will send your group.')
  const rot = await readRotation(db, nightId)
  const gid = s.group
  const mine = roomFor(rot, gid, pub.round)
  if (mine !== room) throw new NightError('invalid', mine === PARLOUR ? `Not this room. ${DIRECTIONS.parlour}` : `Not this room. ${DIRECTIONS[mine]}`)
  const key = `${gid}-${room}`
  const privRef = db.doc(act4PrivatePath(nightId))
  const fresh = await db.runTransaction(async tx => {
    const snap = await tx.get(privRef)
    const d = snap.data() ?? {}
    if (d.arrived?.[key]) return false
    if (snap.exists) tx.update(privRef, { [`arrived.${key}`]: new Date(now) })
    else tx.set(privRef, { paid: {}, arrived: { [key]: new Date(now) } })
    return true
  })
  // every phone in the group turns to the room's game
  const { list } = await guests(db, nightId)
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  for (const m of (rot.groups.find(g => g.id === gid)?.members ?? [])) {
    const g = byKey[m.key]
    if (g) await db.doc(`sessions/${g.uid}`).update({ 'act4.here': true })
  }
  return { ok: true, room, groupId: gid, fresh }
}

// ---------------------------------------------------------------------------
// The rewards.

// One wrong motive off a group's list, once per group per room (the Library
// and the Entryway), in a transaction so two groups never get the same one.
async function crossOff(db, nightId, gid, tag, members) {
  const ref = db.doc(`cases/${nightId}`)
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const c = snap.exists ? snap.data() : null
    if (!c?.solving) return null
    const had = c.solving[tag]?.[gid]
    if (had) return Number(had)
    const n = memoryPick(c, { groupId: gid, members, seed: c.screenSalt ?? nightId, tag })
    tx.update(ref, { [`solving.${tag}.${gid}`]: n })
    return n
  })
}

// A room's reward for a group, worked out once: the cat's line, the cross-off
// where the room has one (the Library), and the bag hint about the Ghost.
// `cardFor(place)` is the card for the member at that place in the group's
// order: the same for everyone, except at the arcade, where the first two get
// the hint and a trio's third gets Boo's line (ARCADE_CLUES). Null for a group
// the rotation does not know.
async function rewardOf(db, nightId, gid, room, { outcome = 'done' } = {}) {
  const rot = await readRotation(db, nightId)
  const grp = (rot?.groups ?? []).find(g => g.id === gid)
  if (!grp) return null
  const { night, list } = await guests(db, nightId)
  const byKey = Object.fromEntries(list.map(g => [g.key, g]))
  const members = grp.members.map(m => m.key)
  const uids = members.map(k => byKey[k]?.uid).filter(Boolean)
  const c = await readCase(db, nightId)
  const cat = ROOMS[room].cat
  // the rung is worked out once a group and room: the arcade asks for each player's card at their
  // own moment, and a Parlour Game between the two must not change the words
  const had = c?.bagClues?.act4?.[gid]?.[cat]?.rung
  const rung = Number.isFinite(had) ? had : await groupRung(db, uids, cat)
  const salt = c?.screenSalt ?? nightId
  const ui = labelled(await readArea(db, 'ui_copy'))
  // the bag hint about the Ghost: from the packing on the party night, a stand-in on a rehearsal
  let bag
  if (!c || c.rehearsal) bag = { text: bagStandIn(cat, 4), placeholder: true }
  else {
    const packing = await readPacking(db)
    const inPlay = [...new Set(Object.values(night.roster ?? {}).map(r => Number(r?.bag)).filter(Number.isFinite))]
    const plan = bagPlan(packing, { bag: night.roster?.[c.ghost]?.bag, inPlay, seed: `${salt}\u0000bag4\u0000${gid}` })
    const fill = bagLine(plan, { cat, act: 4, rung, seed: `${salt}\u0000bag4\u0000${gid}\u0000${cat}` })
    bag = { text: fill.text, placeholder: false }
    await db.doc(`cases/${nightId}`).update({ [`bagClues.act4.${gid}.${cat}`]: { rung, word: fill.word ?? null, sense: fill.sense ?? null, right: fill.right ?? null } })
  }
  // the cross-off (Zimothy's match): always paid, whatever the affection. Boo's went with her
  // Catwalk (Jon, 29 Oct 2026): the arcade pays a clue about the Ghost, no motive
  let cross = null
  if (room === 'library') cross = await crossOff(db, nightId, gid, 'memory', members)
  const said = ui[`REWARD ${room.toUpperCase()} ${outcome === 'done' ? 'DONE' : 'CAPPED'}`] ?? REWARD_LINES[room][outcome === 'done' ? 'done' : 'capped']
  const rhyme = cross ? MOTIVES.find(m => m.n === cross)?.rhyme ?? '' : ''
  const rehearsal = !c || !!c.rehearsal
  const text = said.includes('[RHYME]')
    ? (rehearsal ? said.replace(/strike \[RHYME\][^.]*\./i, crossStandIn(room)) : said.replace(/\[RHYME\]/g, `number ${cross}, “${rhyme}”`))
    : said
  const base = {
    id: `4-room-${room}-${gid}`, act: 4, beat: night.act === 4 ? night.beat : 'rooms', kind: 'clue', room, cat, catName: CAT_NAMES[cat],
    title: `From ${ROOMS[room].name}`, placeholder: rehearsal,
    ...(cross && !rehearsal ? { cross } : {}),
  }
  const third = ui['REWARD ENTRYWAY THIRD'] ?? ARCADE_THIRD_LINE
  const cardFor = place => (room === 'entryway' && place >= ARCADE_CLUES ? { ...base, text: third, third: true } : { ...base, text, bag })
  return { rot, grp, night, byKey, members, ui, cardFor }
}

// Pay one room's reward to one group, once (G52): the cat's line, the
// cross-off where the room has one, and the bag hint about the Ghost, on one
// card on every member's phone (a phone that has its card already, from the
// arcade's clue moment, keeps it). The study's trace is dealt by the station's
// finish (station.finishStudy), here too when the group never finished.
export async function payRoom(db, nightId, gid, room, { outcome = 'done', now = Date.now() } = {}) {
  if (!ROOMS[room]) throw new NightError('invalid', 'No such room.')
  const privRef = db.doc(act4PrivatePath(nightId))
  const key = `${gid}-${room}`
  const claimed = await db.runTransaction(async tx => {
    const snap = await tx.get(privRef)
    const d = snap.data() ?? {}
    if (d.paid?.[key]) return false
    if (snap.exists) tx.update(privRef, { [`paid.${key}`]: { outcome, at: new Date(now) } })
    else tx.set(privRef, { paid: { [key]: { outcome, at: new Date(now) } }, arrived: {} })
    return true
  })
  if (!claimed) return { ok: true, already: true }
  const rot = await readRotation(db, nightId)
  if (!(rot?.groups ?? []).some(g => g.id === gid)) return { ok: true, paid: 0 }
  if (room === 'study' && !rot.finished?.[gid]) await finishStudy(db, { nightId, groupId: gid, outcome: outcome === 'done' ? 'solved' : 'absent' })
  const r = await rewardOf(db, nightId, gid, room, { outcome })
  if (!r) return { ok: true, paid: 0 }
  let dealt = 0
  let beat = 'rooms'
  for (const [place, k] of r.members.entries()) {
    const g = r.byKey[k]
    if (!g) continue
    const card = r.cardFor(place)
    beat = card.beat
    if (await dealCard(db, g.uid, card)) dealt++
    const s = (await db.doc(`sessions/${g.uid}`).get()).data()
    if (s?.act4?.room === room) await db.doc(`sessions/${g.uid}`).update({ 'act4.paid': true, 'act4.paidText': r.ui['ACT4 PAID'] ?? ACT4_TEXT.paid })
  }
  await noteDealt(db, nightId, { kind: 'room', act: 4, beat, groupId: gid }) // the ledger (safeguards)
  return { ok: true, paid: dealt, outcome }
}

// The arcade's clue moment (card 515, 5 Nov 2026): once a player's fifth game
// is played, the Mac asks for the clue of the player at `place` in the
// group's order. That player's reward card is dealt to their phone there and
// then (the same card the chime would deal; the chime then changes nothing
// for them), and its words go back for the Mac's screen. A trio's third
// player gets Boo's line, not a clue. Only for the group at the arcade this
// round, while its visit is on. Nothing here names a motive: the bag hint is
// a compass word, as in every other room.
export async function arcadeClue(db, { nightId, groupId, place, now = Date.now() }) {
  const p = Number(place)
  if (!Number.isInteger(p) || p < 0 || p >= 3) throw new NightError('invalid', 'Which player?')
  const d = (await db.doc(booPath(nightId)).get()).data()
  if (!d?.groupId || d.groupId !== groupId || d.state !== 'visit') throw new NightError('closed', 'Boo is not expecting that group just now.')
  const r = await rewardOf(db, nightId, groupId, 'entryway', { outcome: 'done' })
  if (!r) throw new NightError('invalid', 'No such group.')
  const key = r.members[p]
  if (!key) throw new NightError('invalid', 'Which player?')
  const card = r.cardFor(p)
  const g = r.byKey[key]
  const dealt = g ? await dealCard(db, g.uid, card) : false
  if (dealt) await noteDealt(db, nightId, { kind: 'room', act: 4, beat: card.beat, groupId, key }, { now })
  return { ok: true, dealt, third: !!card.third, text: card.third ? card.text : card.bag?.text ?? null, placeholder: !!card.placeholder }
}

// The cap: every group's room this round, unless already paid.
async function payRound(db, nightId, rot, round, { outcome = 'capped', now = Date.now() } = {}) {
  let paid = 0
  for (const gid of rot.order ?? []) {
    const room = roomFor(rot, gid, round)
    if (room === PARLOUR) continue
    const r = await payRoom(db, nightId, gid, room, { outcome, now })
    if (!r.already) paid++
  }
  return paid
}

// Act 5 (and any jump past Act 4): every room any group has not been paid
// for is paid now. Delay, never destroy.
export async function flush(db, nightId, { now = Date.now() } = {}) {
  const rot = await readRotation(db, nightId)
  if (!rot?.order?.length) return { ok: true, paid: 0 }
  const pub = (await db.doc(act4Path(nightId)).get()).data()
  if (pub?.phase && pub.phase !== 'done') await finishRounds(db, nightId, { now })
  let paid = 0
  for (const gid of rot.order) for (const room of ROOM_KEYS) { const r = await payRoom(db, nightId, gid, room, { outcome: 'absent', now }); if (!r.already) paid++ }
  return { ok: true, paid }
}

// ---------------------------------------------------------------------------
// The Library: Zimothy's memory match on the iPad Pro (?kiosk=memory, §9.8;
// the older iPad only if olderIpad says it stays, 26 Oct 2026).
// Three rounds: 6 pairs (4 by 3, Jon 26 Oct), 10 pairs, then all 14. Always all fourteen traces as
// art (the one exception to "characters not in play are set aside": Jon wants
// everyone to know every trace), no names, file-folder backs, shuffled fresh
// for each group. The iPad sends each cleared board; the third pays the room.
export const MEMORY_ROUNDS = [6, 10, 14]
export const ALL_TRACES = [...new Set(CHARACTERS.map(ch => ch.trace).filter(Boolean))]

export function memoryBoards(pick = randomInt) {
  return MEMORY_ROUNDS.map(n => { const faces = shuffled(ALL_TRACES, pick).slice(0, n); return shuffled([...faces, ...faces], pick) })
}
export function memoryDoc(gid, round, { now = Date.now(), pick = randomInt } = {}) {
  if (!gid) return { groupId: null, boardId: null, step: 0, boards: {}, cleared: false, at: new Date(now) }
  // Firestore refuses arrays nested in arrays: the boards are keyed by step
  return { groupId: gid, boardId: `${gid}-${round}`, step: 0, boards: Object.fromEntries(memoryBoards(pick).map((b, i) => [String(i), b])), cleared: false, at: new Date(now) }
}

// The just-for-fun winners (Jon, 28 Oct 2026: "Make boo's, zimmy's, and Salem
// have a winner. Just for fun."): the Library's screen names whoever found the
// most pairs, the Orangerie's whoever slipped least (play/src/lib/rooms.js
// mostPairs, fewestSlips). Each count goes by the player's place in the group
// (the rotation's order), so the public docs carry numbers, never a name
// (L07). Display only: nothing here changes a reward, a clue or a score.
export const PLACES_MAX = 8 // more than any group: pairs and trios, a four only past fifteen guests (makeGroups)
const isPlace = p => Number.isInteger(p) && p >= 0 && p < PLACES_MAX
// A per-place count with one more at `place`; null for no place.
export function plusOne(list, place) {
  if (!isPlace(place)) return null
  const had = Array.isArray(list) ? list : []
  const out = Array.from({ length: Math.max(place + 1, had.length) }, (_, i) => Math.max(0, Math.floor(Number(had[i]) || 0)))
  out[place]++
  return out
}
// A per-place mark set at `place`; null for no place.
export function markAt(list, place) {
  if (!isPlace(place)) return null
  const had = Array.isArray(list) ? list : []
  const out = Array.from({ length: Math.max(place + 1, had.length) }, (_, i) => had[i] === true)
  out[place] = true
  return out
}
// The memory match's pairs per player after one board: `by` is the place of
// whoever found each pair. Null unless it is one place per pair.
export function addPairsBy(had, by, pairs) {
  if (!Array.isArray(by) || by.length !== pairs || !by.every(isPlace)) return null
  return by.reduce((out, place) => plusOne(out, place), Array.isArray(had) ? had : [])
}
// A guest's place in their group, in the rotation's order; -1 when unknown.
async function placeIn(db, nightId, gid, key) {
  const rot = await readRotation(db, nightId)
  return (rot?.groups ?? []).find(g => g.id === gid)?.members?.findIndex(m => m.key === key) ?? -1
}

// The iPad: one board is clear. `pairs` are the board's pairs of card
// positions; each pair must show the same trace and every card be in one.
// `by` (28 Oct 2026): the place in the group's turns of whoever found each
// pair; the boards add up in public/memory.pairsBy for Zimothy's just-for-fun
// winner. A missing or odd `by` counts nothing and never refuses a board.
export async function memoryStep(db, { nightId, boardId, step, pairs, by = null, now = Date.now() }) {
  const ref = db.doc(memoryPath(nightId))
  const board = (await ref.get()).data()
  if (!board?.boardId || board.boardId !== boardId) throw new NightError('closed', 'That board is not the one on the table.')
  if (board.cleared || Number(step) < board.step) return { ok: true, already: true }
  if (Number(step) !== board.step) throw new NightError('invalid', 'That is not the board on the table.')
  const cards = board.boards?.[String(board.step)] ?? []
  const flat = (Array.isArray(pairs) ? pairs : []).flat().map(Number)
  const whole = Array.isArray(pairs) && pairs.length === cards.length / 2 && new Set(flat).size === cards.length && flat.every(i => i >= 0 && i < cards.length)
  if (!whole || !pairs.every(([a, b]) => cards[a] === cards[b])) throw new NightError('invalid', 'Those pairs do not match.')
  const last = board.step >= MEMORY_ROUNDS.length - 1
  const pairsBy = addPairsBy(board.pairsBy, by, pairs.length)
  const tally = pairsBy ? { pairsBy } : {}
  await ref.update(last ? { cleared: true, clearedAt: new Date(now), ...tally } : { step: board.step + 1, ...tally })
  if (!last) return { ok: true, step: board.step + 1 }
  // how long the group took, for the end credits' Sharpest Memory (finale.js)
  const seconds = Math.max(0, Math.round((now - ms(board.at)) / 1000))
  await db.doc(`nights/${nightId}/private/memoryTimes`).set({ [board.groupId]: seconds }, { merge: true })
  const r = await payRoom(db, nightId, board.groupId, 'library', { outcome: 'done', now })
  return { ok: true, cleared: true, paid: r.paid ?? 0 }
}

// ---------------------------------------------------------------------------
// The Orangerie: Salem's Motion Game (§9.6). Backwards red light, green
// light: RED means GO (shake your phone), GREEN means FREEZE. A phone that
// moves on green, or stays still through red, is a slip; any slip restarts
// the round for the whole group. Thirty seconds clean passes the round; three
// rounds, faster each; clearing all three pays Salem's reward. The server
// schedules every colour change with a timestamp, so every phone and the
// string lights flip together (F26); the brain mirrors the colour to the
// Holiday String Lights (cues/). A phone with no motion sensor never slips (F25).
//
// public/salem { groupId, round, state, attempt, flips: [{ at, colour }], startsAt, cleanAt, at,
//                slips, lastSlip, slipsBy, feltBy }
//   state  idle (no group, or not arrived) · intro (arrived, waiting for Ready)
//          · playing · passed (a round cleared, waiting for Ready) · cleared
//   slips  this round's restarts; slipsBy (28 Oct 2026) the visit's slips by
//          each phone and feltBy whether each phone felt a shake, by place in
//          the group, for Salem's just-for-fun winner on the Orangerie's screen
export const SALEM_CLEAN_MS = 30_000
export const SALEM_LEAD_MS = 3_000
export const SALEM_ROUNDS = 3
// How long each colour holds, by round: slower, then faster.
// Slower since 12 Nov 2026: on the walk-through three players were on round 3 for 43 attempts.
export const SALEM_SEGMENTS = { 1: [4500, 7000], 2: [3500, 5500], 3: [2800, 4500] }
// After a flip, a phone has this long to react before a slip counts.
export const SALEM_GRACE_MS = { 1: 1200, 2: 1000, 3: 900 }
// A round a group cannot get through passes itself on this many slips, so no group is ever stuck.
export const SALEM_MAX_SLIPS = 5

export function salemIdle(gid, round, now = Date.now()) {
  return { groupId: gid ?? null, round: 0, state: 'idle', attempt: 0, flips: [], startsAt: null, cleanAt: null, act4Round: round, at: new Date(now) }
}

// One attempt's colours: from `start`, alternating, starting on a random one,
// each held for a random length in the round's band, past the clean mark.
export function salemFlips(round, start, pick = randomInt) {
  const [lo, hi] = SALEM_SEGMENTS[round] ?? SALEM_SEGMENTS[1]
  const flips = []
  let t = start
  let colour = pick(2) ? 'red' : 'green'
  while (t < start + SALEM_CLEAN_MS + hi) {
    flips.push({ at: new Date(t), colour })
    t += lo + pick(hi - lo + 1)
    colour = colour === 'red' ? 'green' : 'red'
  }
  return flips
}

async function salemGuestOf(db, nightId, uid) {
  const s = (await db.doc(`sessions/${uid}`).get()).data()
  if (!s || s.nightId !== nightId || s.status !== 'active') throw new NightError('no-guest', 'This phone is not at the party.')
  return { gid: s.group ?? null, key: s.guestKey ?? null }
}
async function salemGroupOf(db, nightId, uid) {
  return (await salemGuestOf(db, nightId, uid)).gid
}

// The group has arrived (the scan): Salem's intro.
export async function salemArrive(db, nightId, gid, { now = Date.now() } = {}) {
  const ref = db.doc(salemPath(nightId))
  const d = (await ref.get()).data()
  if (!d || d.groupId !== gid || d.state !== 'idle') return { ok: true, already: true }
  await ref.update({ state: 'intro', at: new Date(now) })
  return { ok: true }
}

// "Ready" (any phone in the group): the next round starts three seconds on.
export async function salemReady(db, { nightId, uid, now = Date.now(), pick = randomInt }) {
  const gid = await salemGroupOf(db, nightId, uid)
  const ref = db.doc(salemPath(nightId))
  return db.runTransaction(async tx => {
    const d = (await tx.get(ref)).data()
    if (!d || d.groupId !== gid) throw new NightError('invalid', 'Salem is not expecting your group just now.')
    if (!['intro', 'passed'].includes(d.state)) return { ok: true, already: true, state: d.state }
    const round = (d.round ?? 0) + 1
    const startsAt = now + SALEM_LEAD_MS
    tx.update(ref, { state: 'playing', round, attempt: (d.attempt ?? 0) + 1, flips: salemFlips(round, startsAt, pick), startsAt: new Date(startsAt), cleanAt: new Date(startsAt + SALEM_CLEAN_MS), slips: 0, at: new Date(now) })
    return { ok: true, round }
  })
}

// A phone slipped: the round starts again for the whole group (a stale
// attempt, a second phone's slip of the same moment, changes nothing). The
// slip counts against the phone that sent it (slipsBy, by its place).
export async function salemSlip(db, { nightId, uid, attempt, colour = null, now = Date.now(), pick = randomInt }) {
  const { gid, key } = await salemGuestOf(db, nightId, uid)
  const place = await placeIn(db, nightId, gid, key)
  const ref = db.doc(salemPath(nightId))
  const r = await db.runTransaction(async tx => {
    const d = (await tx.get(ref)).data()
    if (!d || d.groupId !== gid || d.state !== 'playing' || Number(attempt) !== d.attempt) return { ok: true, already: true }
    if (now < ms(d.startsAt)) return { ok: true, already: true }
    const startsAt = now + SALEM_LEAD_MS
    const slipsBy = plusOne(d.slipsBy, place)
    // never stuck (12 Nov 2026): the slip that makes the round's fifth passes the round for the group
    if ((d.slips ?? 0) + 1 >= SALEM_MAX_SLIPS) {
      const cleared = d.round >= SALEM_ROUNDS
      tx.update(ref, { state: cleared ? 'cleared' : 'passed', flips: [], at: new Date(now), slips: (d.slips ?? 0) + 1, ...(slipsBy ? { slipsBy } : {}), letThrough: true })
      return { ok: true, letThrough: true, cleared }
    }
    tx.update(ref, { attempt: d.attempt + 1, flips: salemFlips(d.round, startsAt, pick), startsAt: new Date(startsAt), cleanAt: new Date(startsAt + SALEM_CLEAN_MS), slips: (d.slips ?? 0) + 1, lastSlip: colour === 'red' || colour === 'green' ? colour : null, ...(slipsBy ? { slipsBy } : {}), at: new Date(now) })
    return { ok: true, restarted: true }
  })
  if (r.cleared) await payRoom(db, nightId, gid, 'orangerie', { outcome: 'done', now })
  return r
}

// Thirty seconds clean (any phone may say so once the clean mark has passed):
// the round is passed, or after the third the game is cleared and Salem pays.
// `felt` (28 Oct 2026): this phone can feel a shake. Every phone says so as
// the clean mark passes, first or not, and only those count for Salem's
// winner: a phone that cannot feel a shake never slips, so it would always win.
export async function salemPassed(db, { nightId, uid, attempt, felt = false, now = Date.now() }) {
  const { gid, key } = await salemGuestOf(db, nightId, uid)
  const place = felt === true ? await placeIn(db, nightId, gid, key) : -1
  const ref = db.doc(salemPath(nightId))
  const r = await db.runTransaction(async tx => {
    const d = (await tx.get(ref)).data()
    const feltBy = d && d.groupId === gid && d.feltBy?.[place] !== true ? markAt(d.feltBy, place) : null
    if (!d || d.groupId !== gid || d.state !== 'playing' || Number(attempt) !== d.attempt) {
      if (feltBy) tx.update(ref, { feltBy })
      return { already: true }
    }
    if (now < ms(d.cleanAt) - 1000) throw new NightError('invalid', 'Not yet. Keep going.')
    const cleared = d.round >= SALEM_ROUNDS
    tx.update(ref, { state: cleared ? 'cleared' : 'passed', flips: [], at: new Date(now), ...(feltBy ? { feltBy } : {}) })
    return { cleared }
  })
  if (r.already) return { ok: true, already: true }
  if (r.cleared) await payRoom(db, nightId, gid, 'orangerie', { outcome: 'done', now })
  return { ok: true, cleared: r.cleared }
}

// The colour at a moment (the phones and the brain read the same rule).
export function salemColourAt(doc, now) {
  if (doc?.state !== 'playing') return null
  let colour = null
  for (const f of doc.flips ?? []) { if (ms(f.at) <= now) colour = f.colour; else break }
  return colour
}

// ---------------------------------------------------------------------------
// The Entryway: Miss Boo LaRue's Arcade (docs/boo-arcade.md; on the night
// since 5 Nov 2026, card 515; Jon, 29 Oct: "its not motive its a ghost
// clue"), on Susan's MacBook Pro and the Stream Deck + XL (?kiosk=boo). The
// group scans in, and the Mac runs the visit itself (play/src/lib/arcade.js):
// five tokens each, turns, a clue after each of the first two players' fifth
// game (arcadeClue, above), Boo's line for a trio's third, the winner, free
// play, and the chime at the round's end, which the cap pays (payRound:
// every member's card, a phone that has its card already unchanged). Each
// counted round's score comes to arcade.js recordArcadeScore. Boo's Catwalk,
// the three poses, went with the projector (29 Oct 2026).
//
// public/boo { groupId, state: idle | visit, startsAt, slotEndsAt, act4Round, at }
//   slotEndsAt is the round's end, when the Mac rings the chime; a pause
//   moves it on (night.js PAUSE_SHIFTED), and the Mac follows.
export function booIdle(gid, round, now = Date.now(), endsAt = null) {
  return { groupId: gid ?? null, state: 'idle', startsAt: null, slotEndsAt: endsAt, act4Round: round, at: new Date(now) }
}

// The group has arrived (the scan): the visit is on, from now.
export async function booArrive(db, nightId, gid, { now = Date.now() } = {}) {
  const ref = db.doc(booPath(nightId))
  const d = (await ref.get()).data()
  if (!d || d.groupId !== gid || d.state !== 'idle') return { ok: true, already: true }
  await ref.update({ state: 'visit', startsAt: new Date(now), at: new Date(now) })
  return { ok: true }
}
