import { ms } from './night.js'

// What the Host tab's house panel shows: is the study station alive, are the
// room screens and the cue relay alive, which group is due in the study and
// how long it has, how many guests have seen all four cats in Act 2, and
// whether the panel may show per-guest dots at all.
// Pure (no Firebase, no React) so play/test can run it under node --test.
//
// Nothing here can name a role. While a Parlour Game is open the panel shows
// a count of answers only: a host who is also the Ghost or the Murderer
// learns nothing from who answered when.

export const QUIET_MS = 2 * 60_000          // a machine not heard from for two minutes is quiet
export const STUDY_CAP_MS = 10 * 60_000     // the study's own clock, from the first touch: the Act 4 round (24 Oct 2026)
export const ABSENT_SLOT_MS = 10 * 60_000   // with no station, a group's turn in the study: the round

// The machines, by the guest key their heartbeat carries.
export const MACHINES = [
  { key: 'kiosk-living', label: 'Parlour screen' },
  { key: 'kiosk-ipad', label: 'iPad Pro (Library, Orangerie)' }, // ?kiosk=ipad: Zimothy's code in Act 2, the captions at supper; quiet from Act 4 by design (26 Oct 2026, Jon's key)
  { key: 'kiosk-bedroom', label: 'Bedroom screen' },
  { key: 'kiosk-study', label: 'Study screen' },
  { key: 'kiosk-memory', label: 'iPad Pro (memory match)' }, // ?kiosk=memory, the same iPad Pro back in the Library in Act 4; quiet once it is in the bedroom
  { key: 'kiosk-boo', label: 'Boo’s wall' },             // Susan's MacBook Pro on the projector as ?kiosk=boo
  { key: 'kiosk-orangerie', label: 'Orangerie screen' }, // the brain's browser as ?kiosk=orangerie (25 Oct 2026, the cue list)
  { key: 'kiosk-pose', label: 'Boo’s camera' },          // ?kiosk=pose, Jenna's iPad Pro facing the catwalk in Act 4 (its row was missing until 25 Oct 2026)
  { key: 'cues', label: 'Hall light and sounds' },
]

// Act 2's cat visits: night.lightsProgress = { done, total }, written by the
// server whenever the line moves (guests who have seen all four cats, and
// guests in the line). A count only, never which cat or which hint.
export function catVisits(night) {
  const p = night?.lightsProgress
  if (night?.act !== 2 || !p) return null
  const of = Math.max(0, Math.floor(Number(p.total) || 0))
  if (!of) return null
  return { done: Math.min(of, Math.max(0, Math.floor(Number(p.done) || 0))), of }
}

function clock(msLeft) {
  const s = Math.max(0, Math.ceil(msLeft / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Who the study greets: the character names when the rotation carries them,
// the guests' own names otherwise.
export function studyNames(group) {
  if (!group?.members?.length) return null
  return group.members.map(m => m.characterName || m.name).filter(Boolean).join(', ')
}

export function houseView({ night, study, rotation, presence = {}, now = Date.now() } = {}) {
  const w = night?.window
  const windowOpen = !!(w && !w.settled && now < ms(w.closesAt))
  const roster = night?.roster ?? {}
  const guestCount = Object.keys(roster).length

  // the station: its last state write is its heartbeat
  const heard = ms(study?.updatedAt)
  const stationAlive = !!heard && now - heard < QUIET_MS
  const quietFor = heard ? clock(now - heard) : null

  // the room screens and the cue relay, from their presence rows
  const machines = MACHINES.map(m => ({ ...m, alive: now - (presence[m.key] ?? 0) < QUIET_MS }))

  // the group due, and its clock
  const groupId = study?.groupId ?? null
  const group = (rotation?.groups ?? []).find(g => g.id === groupId) ?? null
  const paid = !!(groupId && rotation?.finished?.[groupId])
  const started = ms(study?.startedAt)
  const running = ['playing', 'reproducing', 'entering'].includes(study?.state)
  let clockLeft = null
  if (running && started) clockLeft = clock(started + STUDY_CAP_MS - now)
  else if (study?.state === 'absent' && ms(study.slotEndsAt)) clockLeft = clock(ms(study.slotEndsAt) - now)

  // every group, for the "this group is in the study" picker: never a paid one
  const groups = (rotation?.groups ?? []).map(g => ({
    id: g.id, names: studyNames(g), paid: !!rotation?.finished?.[g.id], due: g.id === groupId,
  }))

  return {
    windowOpen,
    answered: windowOpen ? { n: w.answered ?? 0, of: guestCount } : null,
    showGuests: !windowOpen, // per-guest dots only while no window is open
    station: { alive: stationAlive, quietFor, state: study?.state ?? 'idle' },
    machines,
    study: group ? { groupId, names: studyNames(group), paid, running, state: study?.state ?? 'idle', clockLeft } : null,
    groups,
    canReassign: !!groupId && !paid && groups.some(g => !g.paid && !g.due),
    catVisits: catVisits(night),
    hall: night?.act >= 1 ? 'on' : 'off',
  }
}
