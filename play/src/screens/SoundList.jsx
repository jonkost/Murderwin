import { SOUND_TEST_LIST, stopWarning } from '../lib/soundList'

// The Host tab's Sound test: each cue once, and Silence (lib/soundList.js).
// `brainSound` and `brainAlive` come from the brain's presence row.
export default function SoundList({ busy, run, brainSound = null, brainAlive = false }) {
  const warning = stopWarning(brainSound, brainAlive)
  return (
    <div className="sound-list">
      <p className="gloss">Sound test, on every room screen and phone:</p>
      {warning && <p className="gloss sound-off" role="alert">{warning}</p>}
      <div className="host-row">
        {SOUND_TEST_LIST.map(([id, label]) => (
          <button key={id} className="chip" disabled={!!busy} onClick={() => run('sound-test', id)}>{label}</button>
        ))}
        <button className="chip" disabled={!!busy} onClick={() => run('music', 'pause')}>Silence</button>
      </div>
    </div>
  )
}
