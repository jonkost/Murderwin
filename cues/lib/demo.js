// A whole night in a minute, for fake mode with no Firebase at all
// (`npm run demo`, or `n` in `npm run fake -- --offline`): the docs the relay
// would see, one moment at a time, in the order of Jon's cue list (25 Oct
// 2026, docs/cue-list.md). Each step's patch replaces those docs whole. Only
// generic sounds and the bulletins' opening and sign-off lines appear here:
// nothing that names a family.

export function demoNight() {
  return [
    { say: 'the lobby', patch: () => ({ night: { act: 0, phase: 'lobby' } }) },
    { say: 'Act 1 begins: the welcome, the hall bulb green, the jazz, the projector on', patch: () => ({ night: { act: 1, beat: 'arrive', phase: 'act' }, cues: { hall: 'green' } }) },
    { say: 'the guests meet', patch: () => ({ night: { act: 1, beat: 'meet', phase: 'act' } }) },
    { say: 'the house rules: the music stops, the lights dim', patch: () => ({ night: { act: 1, beat: 'rules', phase: 'act' } }) },
    { say: 'the sound test: the chime on every HomePod', patch: now => ({ sounds: { current: { id: 'chime-phone', at: now } } }) },
    { say: 'characters and bags: the jazz is back', patch: () => ({ night: { act: 1, beat: 'ready', phase: 'act' } }) },
    { say: 'the blackout: everything off, the bulb too, the projector too', patch: now => ({ night: { act: 1, beat: 'ready', phase: 'blackout' }, sounds: { current: { id: 'blackout', at: now } } }) },
    { say: 'the power returns: the bulb red, the jazz, the lights, the projector', patch: () => ({ night: { act: 2, beat: 'orient', phase: 'prompt' }, cues: { hall: 'red' } }) },
    { say: 'Act 2 opens: no change', patch: () => ({ night: { act: 2, beat: 'orient', phase: 'act' } }) },
    { say: 'bulletin 1, on the TV as video: the music stops, the lights dim', patch: now => ({ night: { act: 2, beat: 'news', phase: 'act' }, sounds: { current: { id: 'chime-news', at: now, video: true, clips: ['newsflash-opening', 'newsflash-signoff'] } } }) },
    { say: 'to the investigation: the jazz is back', patch: () => ({ night: { act: 2, beat: 'peek', phase: 'act' } }) },
    { say: 'the cat visits', patch: () => ({ night: { act: 2, beat: 'cat', phase: 'act' } }) },
    { say: 'supper is served: the chime', patch: now => ({ night: { act: 2, beat: 'supper', phase: 'act' }, sounds: { current: { id: 'chime-phone', at: now } } }) },
    { say: 'phones down', patch: () => ({ night: { act: 3, beat: 'down', phase: 'act' } }) },
    { say: 'the host: pause the music', patch: now => ({ cues: { hall: 'red', music: { command: 'pause', at: now } } }) },
    { say: 'the host: play it again', patch: now => ({ cues: { hall: 'red', music: { command: 'play', at: now } } }) },
    { say: 'the host: a scene by hand', patch: now => ({ cues: { hall: 'red', scene: { name: 'Murderwin Default', at: now } } }) },
    { say: 'bulletin 2, on the HomePods', patch: now => ({ night: { act: 3, beat: 'bulletin', phase: 'act' }, sounds: { current: { id: 'sounder-bulletin', at: now, clips: ['bulletin2-opening', 'bulletin2-signoff'] } } }) },
    { say: 'dinner wrap-up', patch: () => ({ night: { act: 3, beat: 'wrap', phase: 'act' } }) },
    { say: 'the two-minute warning', patch: () => ({ night: { act: 4, beat: 'warn', phase: 'act' } }) },
    { say: 'Act 4 starts: the chime', patch: now => ({ night: { act: 4, beat: 'groups', phase: 'act' }, sounds: { current: { id: 'chime-phone', at: now } } }) },
    { say: 'a group starts at the study wall: the study dims', patch: () => ({ night: { act: 4, beat: 'round1', phase: 'act' }, study: { state: 'playing' } }) },
    {
      say: 'Salem\'s game: red, green, red', wait: 1600,
      patch: now => ({ salem: { state: 'playing', round: 1, flips: [{ at: now, colour: 'red' }, { at: now + 400, colour: 'green' }, { at: now + 800, colour: 'red' }], endsAt: now + 1200, groupId: 'g1' } }),
    },
    { say: 'Salem\'s round is passed', patch: () => ({ salem: { state: 'passed', round: 1, flips: [], endsAt: null } }) },
    { say: 'the study is solved: the sting, the study lamp back', patch: now => ({ study: { state: 'done' }, sounds: { current: { id: 'sting-solved', at: now } } }) },
    { say: 'the next round: another group at the wall', patch: now => ({ night: { act: 4, beat: 'round2', phase: 'act' }, study: { state: 'reproducing' }, sounds: { current: { id: 'chime-phone', at: now } } }) },
    { say: 'Act 5: dessert, the chime; the study lamp back', patch: now => ({ night: { act: 5, beat: 'roam', phase: 'act' }, study: { state: 'idle' }, sounds: { current: { id: 'chime-phone', at: now } } }) },
    { say: 'Cake!: the song on every HomePod, the candles; the jazz comes back after', wait: 2800, patch: now => ({ cues: { hall: 'red', cake: { at: now } } }) },
    { say: 'Sir Irwin speaks', patch: now => ({ night: { act: 5, beat: 'irwin', phase: 'act' }, sounds: { current: { id: 'chime-irwin', at: now } } }) },
    { say: 'update your motives', patch: () => ({ night: { act: 5, beat: 'update', phase: 'act' } }) },
    { say: 'Act 6 opens: the chime', patch: now => ({ night: { act: 6, beat: 'games', phase: 'act' }, sounds: { current: { id: 'chime-phone', at: now } } }) },
    { say: 'the drawing intro: the jazz lowers, the lights dim, the projector off', patch: () => ({ night: { act: 6, beat: 'drawing', phase: 'act' }, relay: { state: 'idle', doorOpen: false } }) },
    { say: 'the drawing starts: intense at 35, the Drawing scene', patch: () => ({ relay: { state: 'intro', doorOpen: false } }) },
    { say: 'the drawing goes on', patch: () => ({ relay: { state: 'turn', doorOpen: false } }) },
    { say: 'the door opens: the bulb green, intense up to 60', patch: now => ({ relay: { state: 'done', doorOpen: true }, cues: { hall: 'green' }, sounds: { current: { id: 'sting-door', at: now } } }) },
    { say: 'head to the bedroom', patch: () => ({ night: { act: 6, beat: 'door', phase: 'act' } }) },
    { say: 'the deduction round', patch: () => ({ night: { act: 6, beat: 'eliminate', phase: 'act' } }) },
    { say: 'the ballot: Default, the projector on', patch: () => ({ night: { act: 7, beat: 'ballot', phase: 'act' } }) },
    { say: 'the reveal: dimmed for the tally', patch: now => ({ night: { act: 7, beat: 'reveal', phase: 'act' }, sounds: { current: { id: 'sting-reveal', at: now } } }) },
    { say: 'the first name: the newscast on the TV, the music cut', patch: now => ({ sounds: { current: { id: null, at: now, clips: ['woof-close-studio-open'], video: true } } }) },
    { say: 'everyone\'s result: the credits roll', patch: now => ({ night: { act: 7, beat: 'result', phase: 'act' }, sounds: { current: { id: 'sting-result', at: now } } }) },
    { say: 'The End: the music off, the projector off', patch: () => ({ night: { act: 7, beat: 'end', phase: 'act' } }) },
  ]
}
