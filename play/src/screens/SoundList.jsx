import { SOUND_TEST_LIST, stopWarning } from '../lib/soundList'
import { askFirst } from '../lib/ask'

// The Host tab's Sound test: each cue once, and Silence (lib/soundList.js).
// `brainSound` and `brainAlive` come from the brain's presence row.
// `ask`: the party night. Each sound plays at once on every phone and room screen, The scream included, so on the
// party night a chip asks first (14 Nov 2026, the deep scan); a practice night plays them at one touch, as before.
export const SOUND_TEST_ASK = 'Play this sound on every phone and room screen now?'
export default function SoundList({ busy, run, ask = false, brainSound = null, brainAlive = false }) {
  const warning = stopWarning(brainSound, brainAlive)
  const play = id => { if (!ask || askFirst(SOUND_TEST_ASK)) run('sound-test', id) }
  return (
    <div className="sound-list">
      {warning && <p className="gloss sound-off" role="alert">{warning}</p>}
      <div className="host-row">
        {SOUND_TEST_LIST.map(([id, label]) => (
          <button key={id} className="chip" disabled={!!busy} onClick={() => play(id)}>{label}</button>
        ))}
        <button className="chip" disabled={!!busy} onClick={() => run('music', 'pause')}>Silence</button>
      </div>
    </div>
  )
}
