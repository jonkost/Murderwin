import { clockFor, ms } from './night.js'

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
export const STUDY_CAP_MS = 15 * 60_000     // the study's own clock, from the first touch: the Act 4 round (1 Nov 2026)
export const STUDY_STOP_EARLY_MS = 5_000    // the game stops this long before the round's end, so its report beats the chime (station/lib/study.js STOP_EARLY_MS)
export const ABSENT_SLOT_MS = 15 * 60_000   // with no station, a group's turn in the study: the round

// When the game in the study stops: just before the round's end, or with no
// round (a practice) fifteen minutes from the first touch, whichever comes
// first, the same rule as the station's (station/lib/study.js tick).
export function studyStopAt(study) {
  const started = ms(study?.startedAt)
  const capAt = started + STUDY_CAP_MS
  const roundStop = ms(study?.slotEndsAt) - STUDY_STOP_EARLY_MS
  return roundStop > started ? Math.min(capAt, roundStop) : capAt
}

// What is left of the game in the study, on the clock that stands still in a
// pause: the Study's screen and the Host tab both count this.
export function studyMsLeft(study, night, serverNow) {
  return Math.max(0, studyStopAt(study) - clockFor(night, serverNow)())
}

// The machines, by the guest key their heartbeat carries.
export const MACHINES = [
  { key: 'kiosk-living', label: 'Parlour screen' },
  { key: 'kiosk-ipad', label: 'iPad Pro (Library, Orangerie)' }, // ?kiosk=ipad: Zimothy's code in Act 2, the captions at supper; quiet from Act 4 by design (26 Oct 2026, Jon's key)
  { key: 'kiosk-bedroom', label: 'Bedroom screen' },
  { key: 'kiosk-study', label: 'Study screen' },
  { key: 'kiosk-memory', label: 'iPad Pro (memory match)' }, // ?kiosk=memory, the same iPad Pro back in the Library in Act 4; quiet once it is in the bedroom
  { key: 'kiosk-boo', label: 'Boo’s screen (the arcade)' }, // Susan's MacBook Pro in the Entryway with the Stream Deck + XL as ?kiosk=boo (5 Nov 2026)
  { key: 'kiosk-orangerie', label: 'Orangerie screen', quiet: true }, // the brain's browser as ?kiosk=orangerie (25 Oct 2026, the cue list)
  { key: 'cues', label: 'Hall light and sounds', quiet: true },
]
export const QUIET_SCREENS = new Set(MACHINES.filter(m => m.quiet).map(m => m.key))
// `quiet`: a machine that makes no sound of its own by design (the brain's browser, whose
// sound is the HomePods'; the brain itself), so it has no sound mark.

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

// A cat's motive hint, the Study's trace or the news flash's family that was
// missing when it was dealt (cards 529 and 530): night.missingLines =
// { hint, study, news }, written by the server, a count of each. Never which
// cat, guest, group or family. The guest read the house's plain words, on the
// party night and on a practice night alike (11 Nov 2026: a practice night
// plays for real; until then a rehearsal showed a note in brackets).
export function missingLineWords(night) {
  const count = k => Math.max(0, Math.floor(Number(night?.missingLines?.[k]) || 0))
  const times = n => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)
  const said = []
  if (count('hint')) said.push(`A cat had no motive hint ready for a guest ${times(count('hint'))}.`)
  if (count('study')) said.push(`The Study had no trace ready for a group ${times(count('study'))}.`)
  if (count('news')) said.push(`The news flash had no family to cross off ${times(count('news'))}.`)
  if (!said.length) return null
  return `${said.join(' ')} The guests read plain words instead. Nothing to do: the game goes on.`
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

export function houseView({ night, study, rotation, presence = {}, sound = {}, now = Date.now() } = {}) {
  const w = night?.window
  const windowOpen = !!(w && !w.settled && now < ms(w.closesAt))
  const roster = night?.roster ?? {}
  const guestCount = Object.keys(roster).length

  // the station: its last state write is its heartbeat
  const heard = ms(study?.updatedAt)
  const stationAlive = !!heard && now - heard < QUIET_MS
  const quietFor = heard ? clock(now - heard) : null

  // the room screens and the cue relay, from their presence rows
  // `sound` (11 Nov 2026): true or false for a room screen that is up (has a person clicked it, so its
  // browser lets it make sound and play a video with sound?), null for a quiet machine or one that is down
  const machines = MACHINES.map(m => {
    const alive = now - (presence[m.key] ?? 0) < QUIET_MS
    return { ...m, alive, sound: alive && !m.quiet ? sound[m.key] === true : null }
  })

  // the group due, and its clock
  const groupId = study?.groupId ?? null
  const group = (rotation?.groups ?? []).find(g => g.id === groupId) ?? null
  const paid = !!(groupId && rotation?.finished?.[groupId])
  const started = ms(study?.startedAt)
  const running = ['playing', 'reproducing', 'entering'].includes(study?.state)
  let clockLeft = null
  if (running && started) clockLeft = clock(studyMsLeft(study, night, () => now))
  else if (study?.state === 'absent' && ms(study.slotEndsAt)) clockLeft = clock(ms(study.slotEndsAt) - now)

  // every group, for the "this group is in the study" picker: never a paid one
  const groups = (rotation?.groups ?? []).map(g => ({
    id: g.id, names: studyNames(g), paid: !!rotation?.finished?.[g.id], due: g.id === groupId,
  }))

  return {
    windowOpen,
    // `of`: the seats dealt this window (the server's count, 11 Nov 2026), so a guest who joined after it
    // opened is not counted as still to answer; an older window has none, and the roster's size stands in
    answered: windowOpen ? { n: w.answered ?? 0, of: Number(w.of) > 0 ? Number(w.of) : guestCount } : null,
    showGuests: !windowOpen, // per-guest dots only while no window is open
    station: { alive: stationAlive, quietFor, state: study?.state ?? 'idle' },
    machines,
    study: group ? { groupId, names: studyNames(group), paid, running, state: study?.state ?? 'idle', clockLeft } : null,
    groups,
    canReassign: !!groupId && !paid && groups.some(g => !g.paid && !g.due),
    catVisits: catVisits(night),
    missing: missingLineWords(night),
    hall: night?.act >= 1 ? 'on' : 'off',
  }
}
