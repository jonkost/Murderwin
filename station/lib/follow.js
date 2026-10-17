// The station follows the live night. It watches public_state/active; when
// the night changes it detaches the old night's study listener, puts the
// machine back to idle, and listens to the new night's public/study, which
// says which group is due (the server owns that) and may carry settings.
// `watch(path, onData)` is handed in (Firestore's onSnapshot in station.mjs,
// a fake in the tests) and returns an unsubscribe function.

export function createFollower({ runner, watch, log = () => {} } = {}) {
  let nightId = null
  let stopActive = null
  let stopStudy = null
  let studyListeners = 0

  function onStudy(data) {
    runner.due(data?.groupId ?? null, data?.settings ?? null)
  }

  function onActive(data) {
    const id = data?.nightId ?? null
    if (id === nightId) return
    if (stopStudy) { stopStudy(); stopStudy = null; studyListeners-- }
    nightId = id
    runner.night(id)
    if (!id) return
    studyListeners++
    stopStudy = watch(`nights/${id}/public/study`, onStudy)
  }

  return {
    start() {
      if (stopActive) return
      stopActive = watch('public_state/active', onActive)
      log('following the live night')
    },
    stop() {
      if (stopStudy) { stopStudy(); stopStudy = null; studyListeners-- }
      if (stopActive) { stopActive(); stopActive = null }
      nightId = null
    },
    get nightId() { return nightId },
    get studyListeners() { return studyListeners },
  }
}
