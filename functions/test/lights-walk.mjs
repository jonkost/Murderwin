// A test helper: every guest in the Act 2 rooms meets their cat and taps
// done, wave by wave, the way the phones would. Checks at every step that no
// cat ever has two guests (F20) and every phone has a next step (F21).
// Counts only; nothing a cat says is ever read here.

import { player } from '../lib/run.js'
import { lightsPath, LIGHTS_STEPS } from '../lib/deal.js'

export async function walkLights(db, nightId, { now = Date.now(), check = null } = {}) {
  const deck = db.store.get(`nights/${nightId}/private/deck`)?.uids ?? {}
  let meetings = 0
  let worst = 0
  const look = () => {
    const state = db.store.get(lightsPath(nightId))
    const withCat = {}
    for (const g of Object.values(state.guests)) if (g.step === 'go' || g.step === 'with') withCat[g.cat] = (withCat[g.cat] ?? 0) + 1
    worst = Math.max(worst, ...Object.values(withCat), 0)
    for (const uid of Object.values(deck)) {
      const s = db.store.get(`sessions/${uid}`)
      if (!s?.lights || !LIGHTS_STEPS.includes(s.lights.step) || !s.lights.title || !s.lights.text) throw new Error('a phone without a next step')
    }
    check?.(state)
    return state
  }
  for (let guard = 0; guard < 100; guard++) {
    const state = look()
    const due = Object.entries(state.guests).filter(([, g]) => g.step === 'go')
    if (!due.length) break
    for (const [key, g] of due) {
      const uid = deck[key]
      await player.meetCat(db, { nightId, uid, cat: g.cat, now })
      look()
      await player.leaveCat(db, { nightId, uid, now })
      meetings++
    }
  }
  look()
  return { meetings, worst }
}
