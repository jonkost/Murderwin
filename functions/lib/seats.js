// Real seats and fill-in seats (the polish pass, job A4, 11 Nov 2026).
//
// A practice night can have fill-in players (Jon: "let's just add 6 other
// people... fill and substitute, that are playing along with us"): seats with
// no phone. Each is an ordinary seat on the roster, marked
// nights/{id}.roster.<key>.fillIn = true, with a made-up uid no phone can
// ever hold (fillInUid). The dealer treats it like any guest: a character, a
// bag, any role. lib/fillins.js makes the seats and plays them.
//
// This file is the one place that says who the night waits for. Every gate
// that waits on "everyone" (Locked in, the cat line, who is called to the
// paper) asks here, so a fill-in can never hold the night up. It is pure and
// imports nothing, so the Act 4 clock, the cat line and the drawing can load
// it at no cost.
//
// THE PARTY NIGHT: no seat is ever flagged on it (fillins.js seats nobody
// unless the night is a practice), so every function here gives back exactly
// what the caller had before: every key, in the same order. A test holds
// that (functions/test/fillins.test.mjs).

export const FILL_IN_UID_PREFIX = 'fillin-'
// A fill-in's uid: made up, tied to its night, never a signed-in phone's.
export function fillInUid(nightId, i) { return `${FILL_IN_UID_PREFIX}${nightId}-${Number(i) + 1}` }
export function isFillInUid(uid) { return typeof uid === 'string' && uid.startsWith(FILL_IN_UID_PREFIX) }

// A roster entry (or a guest from deal.guests, which carries the entry's fields).
export function isFillIn(entry) { return entry?.fillIn === true }
export function hasFillIns(roster) { return Object.values(roster ?? {}).some(isFillIn) }

// The fill-in seats' keys, and the real players' keys, in the order given.
export function fillInKeys(roster, keys = Object.keys(roster ?? {})) { return keys.filter(k => isFillIn(roster?.[k])) }
export function realKeys(roster, keys = Object.keys(roster ?? {})) { return keys.filter(k => !isFillIn(roster?.[k])) }

// The seats a step of the night waits for: the real players. A night whose
// every seat is a fill-in (the host running a practice from the workshop,
// with no phone joined) waits for them all, so the step still has someone to
// count.
export function seatsToWaitFor(roster, keys = Object.keys(roster ?? {})) {
  const real = realKeys(roster, keys)
  return real.length ? real : [...keys]
}

// Who may be called to the paper in the drawing: a fill-in has no hands, so
// only the real players are called (everyone, when no seat is a real one).
export function drawerKeys(roster, keys = Object.keys(roster ?? {})) { return seatsToWaitFor(roster, keys) }

// The guests of a list (deal.guests) who stand in the Act 2 cat line: the real
// players. A fill-in cannot scan a room's code, and supper must never wait on one.
export function lineGuests(list) { return (list ?? []).filter(g => !isFillIn(g)) }
