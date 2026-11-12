// The small web manifest for a room screen (handoff 11 Nov 2026, A10): with
// it, Add to Home Screen on an iPad opens the page from its icon with no
// browser bars. The Home Screen tags in index.html already do it on every
// iPad, an older one too; the manifest says the same to a newer browser.
//
// Only a room screen links it, from its own page (Kiosk.jsx): a guest's phone
// never gets a manifest, so Chrome on an Android phone has nothing to offer to
// install. There is no start address in it (the icon opens the page it was
// added from, ?kiosk=ipad, not the join page), its one icon is too small for
// Chrome to call the page installable, there is no service worker anywhere,
// and nothing here listens for an install prompt (CLIENT RULES).
export const MANIFEST_HREF = '/play/manifest.webmanifest'

export function addHomeScreenManifest(doc = typeof document === 'undefined' ? null : document) {
  if (!doc?.head || doc.querySelector?.('link[rel="manifest"]')) return false
  const link = doc.createElement('link')
  link.rel = 'manifest'
  link.href = MANIFEST_HREF
  doc.head.appendChild(link)
  return true
}
