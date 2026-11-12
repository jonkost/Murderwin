import { isRehearsalNight } from '../lib/night'

// The Blackout test (A1, 11 Nov 2026), on the Host tab, practice nights only:
// the same blackout as the real one (the music stops, two seconds later every
// light, screen, phone and deck goes dark with the scream, five seconds later
// all back), with no roles dealt and no act moved. As often as Jon likes.
// Leave about half a minute between presses: Apple Home is slow to take the
// music back.
export default function BlackoutTest({ night, busy, run }) {
  if (!night || !isRehearsalNight(night) || night.phase === 'blackout') return null
  return (
    <button className="chip wide" disabled={!!busy || night.phase === 'paused'} onClick={() => run('blackout-test')} title="Practice nights only. Nothing in the night moves">Blackout test</button>
  )
}

// What the Host tab says when it is pressed, and when it answers.
export const BLACKOUT_TEST_PRESSED = 'Blackout test. The dark comes in two seconds, the lights five seconds after.'
export function blackoutTestReply(r) {
  return r?.already ? 'A blackout is already running.' : 'The Blackout test is over. Nothing in the night moved.'
}
