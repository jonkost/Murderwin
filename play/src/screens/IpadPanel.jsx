import { IPAD_CHOICES, IPAD_WORDS, ipadChip, ipadShows } from '../lib/ipad'

// The Host tab's row The iPad shows (handoff 11 Nov 2026, A10): Auto, or one
// screen by hand. One tap switches the iPad's page at once (the host command
// `ipad`, functions/lib/ipad.js); a pick by hand holds until the act changes,
// then Auto takes over again. The line under it says what the iPad shows now,
// worked out the same way the iPad's page does (lib/ipad.js). Only the hosts
// see this: the iPad itself never shows the word Auto or a switch.
export default function IpadPanel({ night, cues = null, relay = null, busy, run }) {
  if (!night?.nightId || night.nightId === 'preview') return null
  const lit = ipadChip(night, cues)
  const now = ipadShows({ night, relay, cues })
  return (
    <section className="ipad-panel">
      <h3>The iPad shows</h3>
      <div className="host-row">
        {IPAD_CHOICES.map(c => (
          <button key={c.key} type="button" className={c.key === lit ? 'chip on' : 'chip'} aria-pressed={c.key === lit}
            disabled={!!busy} onClick={() => run('ipad', c.key)}>{c.label}</button>
        ))}
      </div>
      <p className="gloss">Now: {IPAD_WORDS[now]}.</p>
    </section>
  )
}
