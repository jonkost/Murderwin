// The code reader for the camera inside the app (A12). iPhones have no code
// reader a web page can use, so a small one is bundled (qr-scanner, pinned in
// package.json), and it is loaded only here, inside the function, at the first
// tap on the scan button: the phone's first load does not grow.
//
// startScanner(video, onText) asks for the back camera (the browser asks the
// guest then, never at sign-in), reads a few times a second, and resolves to
// a stop() that frees the camera. No camera, or a no from the guest: it
// rejects, and the viewfinder says to use the phone's own camera instead.
export async function startScanner(video, onText, nav = globalThis.navigator) {
  if (!nav?.mediaDevices?.getUserMedia) throw new Error('no-camera')
  const { default: QrScanner } = await import('qr-scanner')
  const scanner = new QrScanner(video, r => onText(typeof r === 'string' ? r : r?.data ?? ''), {
    returnDetailedScanResult: true,
    preferredCamera: 'environment',
    maxScansPerSecond: 8,
    highlightScanRegion: false,
    highlightCodeOutline: false,
  })
  try {
    await scanner.start()
  } catch (e) {
    scanner.destroy()
    throw e instanceof Error ? e : new Error(String(e))
  }
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    try { scanner.stop(); scanner.destroy() } catch { /* already gone */ }
  }
}
