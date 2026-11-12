// Sir Irwin's voice on the Parlour TV, for the drawing's slides and his door
// line (handoff 11 Nov 2026, A7 step 3). Pure rules, so play/test can read
// them; the player is screens/IrwinVoice.jsx.
//
// The server decides everything (functions/lib/slide-voice.js): a slide in
// public/relay carries `voice` (the file's id) and `voiceMs` only when its
// recording is in, and its time on the screen already counts the recording
// plus one second. The TV only plays the file. A browser that refuses the
// sound (nobody clicked this screen) changes nothing: the slide still turns
// on the server's clock.

// play/public/voice/<id>.m4a, under the site's base (/play/).
export function voiceUrl(id, base = '/play/') {
  return id ? `${base}voice/${encodeURIComponent(id)}.m4a` : null
}

// Where to start a line's voice, in seconds, for a screen that is `intoMs`
// into it (a screen reloaded part-way joins the voice where the clock says).
// null when there is nothing left to say: past the recording's end, or no
// recording at all.
export function voiceFrom(intoMs, voiceMs) {
  const into = Math.max(0, Number(intoMs) || 0)
  const len = Number(voiceMs) || 0
  if (!(len > 0) || into >= len - 300) return null
  return into < 500 ? 0 : +(into / 1000).toFixed(2)
}
