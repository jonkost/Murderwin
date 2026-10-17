// The freeze. On the Game night page Jon presses "Freeze the workshop" the
// week of the party: meta/game.frozenAt is set, every list goes read-only
// with a banner, and the phones' copy of the lines stops changing (the
// server's publishContent becomes a no-op for a night that already has its
// copy). Unfreeze undoes it. Pure: tested by test/frozen.test.mjs.

export const FROZEN_BANNER = 'Frozen for the party. The lists are read-only until a host unfreezes them on the Game night page.'
export const FROZEN_CHIP = 'Frozen for the party'

function msOf(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// { frozen, since: Date | null, banner, readOnly } from the meta/game doc.
export function frozenState(game) {
  const at = msOf(game?.frozenAt)
  const frozen = at > 0
  return { frozen, since: frozen ? new Date(at) : null, banner: frozen ? FROZEN_BANNER : null, readOnly: frozen }
}

// The patch the Freeze and Unfreeze buttons write.
export function freezePatch(now = Date.now()) { return { frozenAt: now } }
export function unfreezePatch() { return { frozenAt: null } }
