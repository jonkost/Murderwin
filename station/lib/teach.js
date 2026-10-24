// Teaching the station which hexagon each tap names. The Elements report a
// tap by an id their layout never lists (seen 24 Oct 2026: the layout lists
// only each hexagon's six corner lights), so each hexagon is lit in turn and
// the next tap is remembered as that hexagon's. Used by teach-touch.mjs (the
// terminal) and by the study test (lib/testmode.js, the workshop's Study
// test page). Saved to station/touch-map.json, which station.mjs reads at
// start.
//
// The caller listens to the wall and hands every tap to tap(), by the id the
// wall itself sent (never through an older map), so a moved hexagon can be
// taught again.

import { writeFileSync } from 'node:fs'

export const TEACH_LIT = [255, 255, 255], TEACH_DIM = [25, 25, 25]
const defaultSleep = (ms) => new Promise(r => setTimeout(r, ms))

export function createTeacher({
  wall, panels = wall.panels, sleep = defaultSleep, log = () => {},
  onStep = () => {}, onSlip = () => log('that one is already taught; tap the lit hexagon'),
} = {}) {
  const touches = {}       // tap id → panel id
  let step = 0             // the hexagon lit now, 1-based; 0 before the first
  let waiting = null       // ends the wait for the lit hexagon's tap
  let stopped = false

  const frameOf = (litId) => Object.fromEntries(panels.map(q => [q.id, q.id === litId ? TEACH_LIT : TEACH_DIM]))

  return {
    get step() { return step },
    get of() { return panels.length },
    get touches() { return { ...touches } },

    // Lights each hexagon in turn. Resolves with the whole map, or null when
    // stopped part way (nothing is kept then).
    async run() {
      for (const [i, p] of panels.entries()) {
        if (stopped) return null
        await wall.frame(frameOf(p.id), 2)
        if (stopped) return null
        step = i + 1
        // it waits as long as it takes: the lit hexagon stays lit until it is tapped
        await new Promise(resolve => { waiting = resolve; onStep({ step, of: panels.length }) })
        if (stopped) return null
        await wall.frame(frameOf(null), 1)
        await sleep(300)
      }
      return { ...touches }
    },

    // A tap, by the id the wall sent. Returns the panel id that tap now
    // names (the lit one once it is taken), or null when it names none yet.
    tap(id) {
      if (id == null) return null
      if (!waiting) return touches[id] ?? null   // between two hexagons: nothing is lit
      const lit = panels[step - 1]
      // a tap the wall already names for another hexagon is a slip: wait for
      // the right one. `taughtAs` is the hexagon (1-based) it was taught for.
      if (touches[id] != null && touches[id] !== lit.id) {
        onSlip({ step, of: panels.length, taughtAs: panels.findIndex(q => q.id === touches[id]) + 1 })
        return touches[id]
      }
      touches[id] = lit.id
      const go = waiting; waiting = null; go()
      return lit.id
    },

    stop() {
      stopped = true
      const go = waiting; waiting = null; go?.()
    },
  }
}

// What touch-map.json holds.
export function touchMapFile(touches, at = new Date()) {
  return {
    note: 'Which hexagon each tap names, taught on the real Elements wall (teach-touch.mjs or the workshop\'s Study test page). Tap id → panel id (the smallest id among the hexagon\'s corners).',
    taughtAt: at.toISOString(),
    touches,
  }
}

export function writeTouchMap(path, touches) {
  writeFileSync(path, JSON.stringify(touchMapFile(touches), null, 2) + '\n')
}
