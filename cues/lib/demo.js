// A whole night in a minute, for fake mode with no Firebase at all
// (`npm run demo`, or `n` in `npm run fake -- --offline`): the docs the relay
// would see, one moment at a time, in the order of the cue sheet (handoff
// 23 Oct, 2d). Each step's patch replaces those docs whole. Only generic
// sounds and the bulletins' opening and sign-off lines appear here: nothing
// that names a family.

export function demoNight() {
  return [
    { say: 'the lobby', patch: () => ({ night: { act: 0, phase: 'lobby' } }) },
    { say: 'Act 1 begins', patch: () => ({ night: { act: 1, beat: 'arrive', phase: 'act' }, cues: { hall: 'red' } }) },
    { say: 'the guests meet', patch: () => ({ night: { act: 1, beat: 'meet', phase: 'act' } }) },
    { say: 'the blackout', patch: now => ({ night: { act: 1, beat: 'ready', phase: 'blackout' }, sounds: { current: { id: 'blackout', at: now } } }) },
    { say: 'the power returns', patch: now => ({ night: { act: 2, beat: 'orient', phase: 'prompt' }, sounds: { current: { id: 'power', at: now } } }) },
    { say: 'bulletin 1, on the TV as video', patch: now => ({ night: { act: 2, beat: 'news', phase: 'act' }, sounds: { current: { id: 'chime-news', at: now, video: true, clips: ['newsflash-opening', 'newsflash-signoff'] } } }) },
    { say: 'the cat visits', patch: () => ({ night: { act: 2, beat: 'cat', phase: 'act' } }) },
    { say: 'supper is served', patch: now => ({ night: { act: 2, beat: 'supper', phase: 'act' }, sounds: { current: { id: 'chime-phone', at: now } } }) },
    { say: 'bulletin 2', patch: now => ({ night: { act: 3, beat: 'bulletin', phase: 'act' }, sounds: { current: { id: 'sounder-bulletin', at: now, clips: ['bulletin2-opening', 'bulletin2-signoff'] } } }) },
    { say: 'the two-minute warning', patch: () => ({ night: { act: 4, beat: 'warn', phase: 'act' } }) },
    { say: 'Act 4 starts', patch: now => ({ night: { act: 4, beat: 'groups', phase: 'act' }, sounds: { current: { id: 'chime-phone', at: now } } }) },
    {
      say: 'Salem\'s game: red, green, red', wait: 1600,
      patch: now => ({ salem: { state: 'playing', round: 1, flips: [{ at: now, colour: 'red' }, { at: now + 400, colour: 'green' }, { at: now + 800, colour: 'red' }], endsAt: now + 1200, groupId: 'g1' } }),
    },
    { say: 'Salem\'s round is passed', patch: () => ({ salem: { state: 'passed', round: 1, flips: [], endsAt: null } }) },
    { say: 'the next round', patch: now => ({ night: { act: 4, beat: 'round2', phase: 'act' }, sounds: { current: { id: 'chime-phone', at: now } } }) },
    { say: 'Act 5', patch: now => ({ night: { act: 5, beat: 'roam', phase: 'act' }, sounds: { current: { id: 'chime-phone', at: now } } }) },
    { say: 'Sir Irwin speaks', patch: now => ({ night: { act: 5, beat: 'irwin', phase: 'act' }, sounds: { current: { id: 'chime-irwin', at: now } } }) },
    { say: 'Act 6 opens', patch: now => ({ night: { act: 6, beat: 'games', phase: 'act' }, sounds: { current: { id: 'chime-phone', at: now } } }) },
    { say: 'the drawing starts', patch: () => ({ night: { act: 6, beat: 'drawing', phase: 'act' }, relay: { state: 'intro', doorOpen: false } }) },
    { say: 'the drawing goes on', patch: () => ({ relay: { state: 'turn', doorOpen: false } }) },
    { say: 'the door opens', patch: now => ({ relay: { state: 'done', doorOpen: true }, cues: { hall: 'green' }, sounds: { current: { id: 'sting-door', at: now } } }) },
    { say: 'the host: the next playlist', patch: now => ({ cues: { hall: 'green', music: { command: 'next', at: now } } }) },
    { say: 'the host: a scene by hand', patch: now => ({ cues: { hall: 'green', scene: { name: 'Murderwin Arrival', at: now } } }) },
    { say: 'the ballot', patch: () => ({ night: { act: 7, beat: 'ballot', phase: 'act' } }) },
    { say: 'the reveal', patch: now => ({ night: { act: 7, beat: 'reveal', phase: 'act' }, sounds: { current: { id: 'sting-reveal', at: now } } }) },
    { say: 'the closing bulletin, on the TV as video', patch: now => ({ sounds: { current: { id: null, at: now, clips: ['woof-close-studio-open'], video: true } } }) },
    { say: 'everyone\'s result', patch: now => ({ night: { act: 7, beat: 'result', phase: 'act' }, sounds: { current: { id: 'sting-result', at: now } } }) },
  ]
}
