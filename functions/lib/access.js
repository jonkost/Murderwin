// Who may touch a night's shared clocks. A signed-in uid is not enough: the
// relay's `advance` used to accept any uid for any night. Now a caller must
// be at the party (an active session in that night), a host or the admin, or
// one of the room screens (a presence row for that night whose guest key
// starts with "kiosk-"; the kiosks keep that heartbeat themselves).
//
// SEAL RULE: nothing here reads sealed/* or cases/*.

export async function mayTouchNight(db, { uid, nightId, isAdmin = false } = {}) {
  if (isAdmin) return true
  if (!uid || !nightId) return false
  const sessionSnap = await db.doc(`sessions/${uid}`).get()
  if (sessionSnap.exists) {
    const s = sessionSnap.data()
    if (s.nightId === nightId && s.status === 'active') return true
  }
  const presenceSnap = await db.doc(`presence/${uid}`).get()
  if (presenceSnap.exists) {
    const p = presenceSnap.data()
    if (p.nightId === nightId && typeof p.guestKey === 'string' && p.guestKey.startsWith('kiosk-')) return true
  }
  return false
}

// One room screen in particular (5 Nov 2026, the arcade's clue moment): the
// kiosk whose heartbeat carries `guestKey` for this night, or the admin. Not
// a guest's phone, and not another room screen.
export async function fromKiosk(db, { uid, nightId, guestKey, isAdmin = false } = {}) {
  if (isAdmin) return true
  if (!uid || !nightId || !guestKey) return false
  const p = (await db.doc(`presence/${uid}`).get()).data()
  return !!p && p.nightId === nightId && p.guestKey === guestKey
}
