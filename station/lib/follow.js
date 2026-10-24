// The station follows the live night. It watches public_state/active; when
// the night changes it detaches the old night's listeners, puts the machine
// back to idle, and listens to the new night's public/study, which says
// which group is due (the server owns that) and may carry settings, and to
// the night doc itself for its phase: a pause by the host freezes the
// station's clock, a resume lets it run (runner.paused).
// `watch(path, onData)` is handed in (Firestore's onSnapshot in station.mjs,
// a fake in the tests) and returns an unsubscribe function.

// A Firestore Timestamp, a Date or a number, as milliseconds (0 when missing).
export function ms(t) {
  if (!t) return 0
  if (typeof t.toMillis === 'function') return t.toMillis()
  if (t instanceof Date) return t.getTime()
  return Number(t) || 0
}

export function createFollower({ runner, watch, log = () => {} } = {}) {
  let nightId = null
  let stopActive = null
  let stopStudy = null
  let stopNight = null
  let studyListeners = 0

  function onStudy(data) {
    runner.due(data?.groupId ?? null, data?.settings ?? null)
  }

  function onNight(data) {
    const paused = data?.phase === 'paused'
    runner.paused(paused, paused ? (ms(data?.pausedAt) || runner.serverNow()) : runner.serverNow())
  }

  function detach() {
    if (stopStudy) { stopStudy(); stopStudy = null; studyListeners-- }
    if (stopNight) { stopNight(); stopNight = null }
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
