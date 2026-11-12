// The station follows the live night. It watches public_state/active; when
// the night changes it detaches the old night's listeners, puts the machine
// back to idle, and listens to the new night's public/study, which says
// which group is due and when the round ends (the server owns both) and may
// carry settings, and to the night doc itself for its phase: a pause by the
// host freezes the station's clock, a resume lets it run (runner.paused).
// `watch(path, onData)` is handed in (Firestore's onSnapshot in station.mjs,
// a fake in the tests) and returns an unsubscribe function.

// A Firestore Timestamp, a Date or a number, as milliseconds (0 when missing).
export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

// The blackout (A1, 11 Nov 2026): nights/{id}.blackout = { pressAt, darkAt,
// powerAt, test } from the server. Between darkAt and powerAt (on the
// station's server clock), or while the phase is the blackout, both walls and
// the deck go dark and ignore every touch (runner.dark); at the power they
// come back. The Blackout test has the marks and no phase.
export function blackoutStage(mark, now) {
  if (!mark) return null
  const press = ms(mark.pressAt)
  const dark = ms(mark.darkAt)
  const power = ms(mark.powerAt)
  if (!dark || !power || now < press) return null
  if (now < dark) return 'press'
  if (now < power) return 'dark'
  return null
}
export function darkNow(night, now) {
  if (!night) return false
  return night.phase === 'blackout' || (night.phase === 'paused' && night.pausedFrom === 'blackout') || blackoutStage(night.blackout, now) === 'dark'
}

export function createFollower({ runner, watch, log = () => {}, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let nightId = null
  let lastNight = null
  let marksKey = null
  let markTimers = []
  const darkCheck = () => runner.dark?.(darkNow(lastNight, runner.serverNow()))
  let stopActive = null
  let stopStudy = null
  let stopNight = null
  let studyListeners = 0

  function onStudy(data) {
    runner.due(data?.groupId ?? null, data?.settings ?? null, ms(data?.slotEndsAt))
  }

  function onNight(data) {
    const paused = data?.phase === 'paused'
    runner.paused(paused, paused ? (ms(data?.pausedAt) || runner.serverNow()) : runner.serverNow())
    lastNight = data ?? null
    darkCheck()
    const b = data?.blackout
    const key = b ? String(ms(b.pressAt)) : null
    if (key === marksKey) return
    marksKey = key
    for (const t of markTimers) clearTimer(t)
    markTimers = []
    if (!b) return
    const now = runner.serverNow()
    for (const at of [ms(b.darkAt), ms(b.powerAt)]) if (at > now) markTimers.push(setTimer(darkCheck, at - now + 1))
  }

  function detach() {
    if (stopStudy) { stopStudy(); stopStudy = null; studyListeners-- }
    if (stopNight) { stopNight(); stopNight = null }
    for (const t of markTimers) clearTimer(t)
    markTimers = []
    marksKey = null
    lastNight = null
    runner.dark?.(false)
  }

  function onActive(data) {
    const id = data?.nightId ?? null
    if (id === nightId) return
    detach()
    nightId = id
    runner.night(id)
    if (!id) return
    studyListeners++
    stopStudy = watch(`nights/${id}/public/study`, onStudy)
    stopNight = watch(`nights/${id}`, onNight)
  }

  return {
    start() {
      if (stopActive) return
      stopActive = watch('public_state/active', onActive)
      log('following the live night')
    },
    stop() {
      detach()
      if (stopActive) { stopActive(); stopActive = null }
      nightId = null
    },
    get nightId() { return nightId },
    get studyListeners() { return studyListeners },
  }
}
