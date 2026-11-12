// The Host tab's Sound test (handoff 11 Nov 2026, A2 layer 2, step 5): a
// short list, each cue once and Silence. A press plays that cue on every room
// screen and phone (functions/lib/run.js sound-test with the cue's id); Silence
// asks the brain to stop the music (the music command 'pause').
//
// The brain's own warning: once a minute it says, in its presence row, whether
// the Shortcut that stops the music is on it (cues/cues.mjs heartbeat, `sound`:
// true or false; left out when the music is not on the Shortcut road). When it
// says false, the list says so, with the Shortcut's name from cues/scenes.json.
// Names and yes-or-no only. Pure, so play/test can check it.
import sheet from '../../../cues/scenes.json' with { type: 'json' }

// Every cue in the order of the night, in plain words. The ids are
// functions/lib/screen.js SOUND_IDS (a test checks they agree).
export const SOUND_TEST_LIST = [
  ['chime-phone', 'Phone chime'],
  ['chime-news', 'News chime'],
  ['blackout', 'The scream'],
  ['sounder-bulletin', 'Bulletin sounder'],
  ['sting-solved', 'Solved'],
  ['chime-irwin', 'Sir Irwin'],
  ['sting-door', 'The door'],
  ['sting-reveal', 'The reveal'],
  ['sting-result', 'The result'],
]

// The name of the Shortcut that stops the music (the first, when there are several).
export function stopShortcutName(cfg = sheet) {
  const off = cfg?.musicShortcuts?.off
  const name = Array.isArray(off) ? off[0] : off
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

// The warning line for the list, or null. `brainSound` is the brain's presence
// `sound` (true, false, or null/undefined when it has not said); `alive`
// whether the brain has been heard from lately.
export function stopWarning(brainSound, alive, cfg = sheet) {
  if (!alive || brainSound !== false) return null
  const name = stopShortcutName(cfg)
  return name
    ? `The brain cannot stop the music: there is no Shortcut called “${name}” on it. Make one in the Shortcuts app with exactly that name. Until then Silence does nothing.`
    : 'The brain cannot stop the music: no Shortcut is named to stop it. Until then Silence does nothing.'
}
