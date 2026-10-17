// Pure rules about time and reachability, shared by the phone (App.jsx, via
// lib/hooks.js) and the room screens (the kiosk's stale dot). No Firebase,
// no React, so play/test can run them under node --test.

// A phone is "stale" when the house has not confirmed its copy of the night
// for this long: Firestore keeps painting from cache, the LAN may be down,
// a captive portal may be in the way. navigator.onLine alone misses all of
// that, so the offline strip reads this too.
export const STALE_MS = 20_000

// `heardAt`: when the night doc last arrived straight from the server (ms).
// `fromCache`: whether the latest snapshot was served from the local cache.
// Stale = served from cache for STALE_MS or more.
export function isStale({ fromCache, heardAt, since } = {}, now = Date.now(), limit = STALE_MS) {
  if (!fromCache) return false
  const from = since ?? heardAt
  if (!from) return false
  return now - from >= limit
}

// How long ago the house was last heard from, in whole seconds, never negative.
export function secondsSinceHeard({ heardAt } = {}, now = Date.now()) {
  if (!heardAt) return null
  return Math.max(0, Math.round((now - heardAt) / 1000))
}

// A phone waking from sleep, coming back to the tab, or regaining the
// network should re-measure its clock skew at once rather than wait for the
// next minute's heartbeat. `win` and `doc` are EventTarget-like; returns a
// function that removes the listeners.
export const WAKE_EVENTS = ['focus', 'online', 'pageshow']
export function watchWake(win, doc, onWake) {
  const onVisible = () => { if (!doc || doc.visibilityState === undefined || doc.visibilityState === 'visible') onWake('visibilitychange') }
  const handlers = WAKE_EVENTS.map(ev => [ev, () => onWake(ev)])
  for (const [ev, fn] of handlers) win?.addEventListener?.(ev, fn)
  doc?.addEventListener?.('visibilitychange', onVisible)
  return () => {
    for (const [ev, fn] of handlers) win?.removeEventListener?.(ev, fn)
    doc?.removeEventListener?.('visibilitychange', onVisible)
  }
}
