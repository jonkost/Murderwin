// The camera inside the app (handoff 11 Nov 2026, A12; Jon: "Can we add a
// camera for scanning within the app. So you don't have to leave the app").
// Pure, so play/test can run it: what a scanned code asks the phone to do.
//
// Every square code the house prints or shows is this site's own play
// address (lib/rooms.js meetUrl, lib/config.js PLAY_URL, the Game night
// page's printed codes):
//   PLAY_URL?meet=<cat>   a cat's room code in Act 2, and the same four codes
//                         are the game rooms' codes in Act 4 (the house decides
//                         which; run.js meetCat)
//   PLAY_URL              the join code (the door, the TV, the rejoin code)
// Anything else (a room screen's address, /setup, another site, plain words)
// is not one of the house's codes. Nothing scanned is ever opened as an
// address: only its parameters are read, and only when it is this site's
// own /play/ page.

export const SCAN_CATS = ['granolia', 'zimothy', 'boo', 'salem'] // lib/night.js MEET_CATS
export const SCAN_LINES = {
  point: 'Point at a code.',
  unknown: 'That is not one of the house’s codes.',
  refused: 'Use your phone’s camera instead.',
}

function hostOf(u) {
  try { return new URL(u).host } catch { return null }
}
function pathOf(u) {
  try { return new URL(u).pathname } catch { return null }
}
const samePage = (a, b) => {
  const strip = p => String(p ?? '').replace(/index\.html$/, '').replace(/\/+$/, '')
  return strip(a) === strip(b)
}

// The game's own hosts: the play address's, the page's own, and Firebase's
// second name for the same site.
export function gameHosts({ playUrl = '', origin = '' } = {}) {
  const hosts = new Set()
  for (const u of [playUrl, origin]) {
    const h = hostOf(u)
    if (!h) continue
    hosts.add(h)
    if (h.endsWith('.web.app')) hosts.add(h.replace(/\.web\.app$/, '.firebaseapp.com'))
    if (h.endsWith('.firebaseapp.com')) hosts.add(h.replace(/\.firebaseapp\.com$/, '.web.app'))
  }
  return hosts
}

// { kind: 'meet', cat } | { kind: 'join' } | { kind: 'other' }
export function scanTarget(text, { playUrl = '', origin = '' } = {}) {
  const raw = String(text ?? '').trim()
  if (!raw || raw.length > 2000) return { kind: 'other' }
  let u
  try { u = new URL(raw) } catch { return { kind: 'other' } }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { kind: 'other' }
  if (!gameHosts({ playUrl, origin }).has(u.host)) return { kind: 'other' }
  if (!samePage(u.pathname, pathOf(playUrl) ?? '/play/')) return { kind: 'other' }
  const keys = [...u.searchParams.keys()]
  if (!keys.length) return { kind: 'join' }
  const cat = u.searchParams.get('meet')
  if (keys.length === 1 && SCAN_CATS.includes(cat)) return { kind: 'meet', cat }
  return { kind: 'other' }
}
