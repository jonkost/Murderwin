// A phone on a big screen: /play/?phone=1 shows the game inside a phone-shaped
// frame, so it can be tried on a Mac as a guest would see it. The game runs
// unchanged inside; only the frame is new. For two guests at once, open a
// second frame in a private window (each window is its own phone).
export default function PhoneFrame() {
  const params = new URLSearchParams(window.location.search)
  params.delete('phone')
  // a fresh copy every time the frame opens: browsers like to keep an old page inside a frame
  params.set('t', String(Date.now()))
  const inner = `${import.meta.env.BASE_URL}?${params}`
  return (
    <div className="phone-stage">
      <div className="phone-shell">
        <iframe className="phone-screen" src={inner} title="The game, as a phone shows it" allow="vibrate" />
      </div>
      <p className="phone-hint">Sirwin Manor on a phone. Open this address in a private window for a second guest.</p>
    </div>
  )
}
