// Jenna's page, the pure part: whether the route should open at all, and
// how the packing list reads. No Firebase here, so node can test it. The
// callable lives in stewardApi.js.
//
// SEAL RULE. Nothing in this file stores anything: the packing list and the
// leans Jenna reads live in React state for as long as the page is open and
// nowhere else. Never localStorage, never the Firestore client cache (the
// callable does not go through it).

export const JON_UID = 'JYSmPSQfdMen0leIDYmqUa32Prt1'

export const NOT_FOR_YOU = 'Not for you.'

// Should the route open? Jon's account is turned away before any call is
// made; everyone else is decided by the callable's whoami. `whoami` is
// undefined while the call is in flight, true when it answered ok, false
// when it was refused.
export function routeState({ uid, whoami } = {}) {
  if (!uid || uid === JON_UID) return 'not-for-you'
  if (whoami === undefined) return 'checking'
  return whoami ? 'open' : 'not-for-you'
}

// The packing list as Jenna reads it: one line per bag, each item by its
// name (a pair already written out, "2 Hershey's Kisses") and what it looks
// like, its clue words underneath.
export function packingRows(bags) {
  const rows = Array.isArray(bags?.bags) ? bags.bags : []
  return rows.map(b => ({
    n: b.n,
    items: (b.items ?? []).map(it => ({
      id: it.id, twice: Boolean(it.twice),
      name: it.name ?? String(it.text ?? '').split('—')[0].trim(),
      looks: it.looks ?? '', words: it.words ?? '',
    })),
  }))
}
