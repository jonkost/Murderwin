// What the Host tab's Run the night card says at each beat (14 Nov 2026, Jon: "I need the host side to have
// clear instructions that I fail safes vs what I need to manually do"). Two lines a beat:
//   auto  what the house does with no press (the server's clocks, the phones, the brain's music and lights)
//   you   what the host says or presses, in order, ending with the press that moves the night on, or
//         "Nothing to press." where the night moves by itself
// A press is written **like this** and shown in bold; every one is a button on the host's own phone, by its
// own name (play/test/host-steps.test.mjs checks that, and that every beat of seed/night.json has its two
// lines). The lines were checked beat by beat against functions/lib/run.js and the guide by nine readers on
// 14 Nov 2026; where a stray Next would skip part of the night, the line says so.
//
// The light that goes red and green is the Hue bulb outside the bedroom door: "the bedroom lock light" in
// Jon's cue list (docs/cue-list.md), "hall" in the code. It is not in the Orangerie: the Orangerie's red and
// green are the string lights of Get Off My Lawn!, which no button here touches.

export const HOST_STEPS = {
  '1/arrive': {
    auto: 'The jazz plays and the Parlour TV shows the join code. Guests scan it and get a character and a bag. The intro starts by itself at the time shown above.',
    you: 'Nothing to press while the countdown above runs. If there is no countdown, press **Next** to start the intro.',
  },
  '1/rules': {
    auto: 'The music stops, the lights dim, and the TV plays the intro and then the rules film: about sixteen minutes. Then the join code comes back and the night waits for you.',
    you: 'When the film asks for a chime, press **Phone chime**. Do not press Next while the film plays: it cuts the film off. When it has ended, press **Next**.',
  },
  '1/meet': {
    auto: 'The jazz and the lights come back. Every phone points its guest at the Cats tab.',
    you: 'Say: look at your Cats tab. These are the five, and how each one stands with you. Then press **Next**.',
  },
  '1/introduce': {
    auto: 'Every phone asks its guest to say their name and profession.',
    you: 'Go round the room: everyone says their name and profession out loud. Then press **Next**.',
  },
  '1/ready': {
    auto: 'Every phone says: keep your phone on you. Nothing more happens until you press.',
    you: 'First check the number joined, at the top, is the number playing (a name nobody plays gets a role: press **Hand this phone on** beside it). Then press **Blackout**. Then press nothing: the dark, the power and the role cards come by themselves.',
  },
  '2/orient': {
    auto: 'Every phone shows one button, then its role card for fifteen seconds, then where things are. The bedroom lock light turns red. The TV stays dark and the music stays off.',
    you: 'Tap the button on your own phone and read your card. When everyone has read theirs, press **Next**.',
  },
  '2/news': {
    auto: 'W-O-O-F News plays on the Parlour TV. Every phone says: eyes up.',
    you: 'Watch it. When it has ended, press **Next**.',
  },
  '2/peek': {
    auto: 'Every phone says: look in your own bag, and show nobody yet. The jazz comes back.',
    you: 'Say: every motive a cat names is a wrong one, even when Salem says it started there. Then press **Next** for the cat visits.',
  },
  '2/cat': {
    auto: 'The phones call guests to the four cats, one at a time, and Parlour Games pop up. Supper is called by itself once everyone has seen all four cats.',
    you: 'Nothing to press. Play along: your phone calls you too. If the food is ready before everyone has finished, press **Supper’s ready**.',
  },
  '2/supper': {
    auto: 'The chime, and every phone says supper is served. A guest with cats still unvisited gets their lines as a note.',
    you: 'Carry the iPad from the Library to its stand on the supper table. Press **Next** as everyone goes in.',
  },
  '3/down': {
    auto: 'Every phone says: leave me charging in the Parlour, and bring your bag to the table. The jazz plays on.',
    you: 'Tell the table they may share what is in their bags. Near the end of supper, press **Next** to arm the news.',
  },
  '3/bulletin': {
    auto: 'Your phone says Armed. Three to six minutes later the news plays in the Orangerie, from the brain’s own speakers, with its words on the iPad and the Parlour TV.',
    you: 'Wait for the news to play. When supper is over, press **Next**.',
  },
  '3/wrap': {
    auto: 'Every phone asks for the motives to be crossed off. The Parlour TV shows the join code.',
    you: 'Get everyone back on their phone. Carry the iPad back to its stand in the Library. Then press **Start Act 4**.',
  },
  '4/warn': {
    auto: 'Every phone gets a two-minute warning. The groups are made, but not shown yet. The group cards come by themselves in two minutes.',
    you: 'Nothing to press.',
  },
  '4/groups': {
    auto: 'The chime, the title card on the TV, and every phone shows its group. The first round starts when everyone has tapped Locked in, or after two minutes.',
    you: 'Nothing to press. Tap Locked in on your own phone.',
  },
  '4/round1': {
    auto: 'The chime sends every group to its room. The next round comes by itself after fifteen minutes.',
    you: 'Nothing to press. Go with your group and play.',
  },
  '4/round2': {
    auto: 'The chime moves every group on one room. A room not finished is paid anyway. The next round comes by itself after fifteen minutes.',
    you: 'Nothing to press. Go with your group and play.',
  },
  '4/round3': {
    auto: 'The chime moves every group on one room. A room not finished is paid anyway. The next round comes by itself after fifteen minutes.',
    you: 'Nothing to press. Go with your group and play.',
  },
  '4/round4': {
    auto: 'The chime moves every group on one room. After fifteen minutes a fifth round starts if there are five groups. Otherwise everyone is sent back to the Parlour.',
    you: 'Go with your group and play. When this tab says The rounds are over, press **Next** for Act 5.',
  },
  '4/round5': {
    auto: 'Only with five groups: the chime sends every group to its last room. After fifteen minutes everyone is sent back to the Parlour.',
    you: 'Go with your group and play. When this tab says The rounds are over, press **Next** for Act 5.',
  },
  '5/roam': {
    auto: 'The dessert chime and the jazz. Every phone shows the Happy Birthday Irwin card. Any Act 4 reward not yet paid is paid now.',
    you: 'Carry the iPad from the Library into the bedroom and shut the door. Press **Cake!** when the cake is served. When the song is over, press **Next**.',
  },
  '5/irwin': {
    auto: 'The chime, the music stops, and Sir Irwin speaks on the Parlour TV with his motive cards. Every phone says: go to the Parlour.',
    you: 'Watch. Do not press Next or Cake! until he has finished. Then say: cross off on your Motives tab now, while his cards are up. When the room is done, press **Next** (his cards leave the TV).',
  },
  '5/update': {
    auto: 'Every phone asks for the motives to be updated from what Sir Irwin said. The jazz comes back.',
    you: 'Give the room a minute. Check the iPad is in the bedroom with the door shut. Say: if you need a break, take it now. When everyone is back in the Parlour, press **Next** for Act 6.',
  },
  '6/games': {
    auto: 'Every phone gets a break note, then two Parlour Games, one after the other. When the second closes, the drawing starts by itself.',
    you: 'Nothing to press. Play the two games on your own phone.',
  },
  '6/drawing': {
    auto: 'Sir Irwin explains the game on the TV, then the game calls each player to the paper. When the third picture is named, the bedroom lock light turns green, the bedroom screen shows the trace and the music comes up.',
    you: 'After Sir Irwin’s slides your phone shows the drawing. Press **At the paper** when the player gets there, and tap the room’s guess. When the third picture is named, tap **Hide this**, then press **Next**.',
  },
  '6/door': {
    auto: 'The TV says the door is open, and every phone sends its guest to see what the bedroom shows.',
    you: 'Send everyone to the bedroom to look. When everyone is back in the Parlour, press **Next**.',
  },
  '6/talk': {
    auto: 'Every phone says the vote is next, and the TV shows the three questions. There is no clock: the night waits for you.',
    you: 'Say: at the vote, on your phone: if you are the Murderer, pick yourself as the Murderer. If you are the Ghost, pick yourself as the Ghost. Keep it secret. When the room is ready, press **Start the vote**.',
  },
  '7/ballot': {
    auto: 'Every guest votes on their phone. The vote closes when the last one locks in, or at two minutes, and the house picks for anyone who did not.',
    you: 'Vote on your own phone. When this tab says The votes are in, press **Next** for the reveal.',
  },
  '7/reveal': {
    auto: 'Every guest’s phone says: eyes on the screen. The Parlour TV counts with Sir Irwin’s bar for about eighty seconds, then waits for you.',
    you: 'Press **Name the Murderer**, **Name the Motive** and **Name the Victim**, each only when the card before it is up on the TV. When the Victim’s card is up too, press **Next**.',
  },
  '7/result': {
    auto: 'Every guest’s phone shows its own result. The TV plays the story, the credits, the dedication and Sir Irwin’s last card: about two minutes.',
    you: 'Wait for the credits to end: this tab counts them down. Then press **Next** for The End.',
  },
  '7/end': {
    auto: 'Every screen and phone shows The End. The lights go to Default and the jazz plays. Every phone opens up for good.',
    you: 'Press **Good night**. That is the last press of the night.',
  },
}

// Does the night move on from this beat with no press? Then the card shows no big button there, only "Nothing
// to press", and Next becomes a fail-safe: a small Go on now that asks first (14 Nov 2026: the first picture of
// the new card showed a big red Next beside the words "Do not press Next").
//   Arrivals     while the intro's countdown runs (`counting`); with no countdown Next is the host's to press
//   the cat visits  supper is called when everyone has seen all four cats (Supper's ready is the hand way,
//                and it is always on the card there)
//   Act 4        the warning, the groups and every round, until the rounds are over (`act4.phase` 'done').
//                `act4` undefined: the house has not said yet where Act 4 stands (the page is still loading
//                it), so nothing invites a press. `act4` null: there is no Act 4 clock at all (it was never
//                started, or its record is gone), so nothing will move by itself and Next is the host's.
//   Act 6's two games  the drawing starts when the second is done
// Checked against functions/lib/run.js clockTick. Anywhere else the night waits for the host.
//
// The host is never left with only the small chip (the review of 14 Nov 2026). The big button comes back:
//   - when a clock is LATE_MS past its time and the night has not moved (the tab itself nudges the server every
//     twenty seconds, so that long means the clock has failed): the intro's time, Act 4's warning, lock-in or
//     round;
//   - at Act 6's games once a drawing has been started by hand (`relay.state`: Start the drawing does not move
//     the beat, so the night would never leave the games by itself), or GAMES_MS after the beat began with no
//     drawing (Back one from the drawing and Act 6 entered a second time leave no games to come);
//   - in any phase but 'act' (an act reached by its number before the roles are out starts on Next).
export const LATE_MS = 90_000
export const GAMES_MS = 5 * 60_000
const at = v => (typeof v?.toMillis === 'function' ? v.toMillis() : Number(v) || 0)
export function movesByItself({ act, beat, phase, now = Date.now(), counting = false, introAt = null, beatAt = null, act4, relay = null } = {}) {
  if (phase !== 'act') return false
  if (act === 1) return beat === 'arrive' && counting === true && !(at(introAt) && now > at(introAt) + LATE_MS)
  if (act === 2) return beat === 'cat'
  if (act === 4) {
    if (act4 === undefined) return true
    if (!act4 || act4.phase === 'done') return false
    const ends = act4.phase === 'warn' ? at(act4.warnEndsAt) : act4.phase === 'groups' ? at(act4.lockEndsAt) : act4.phase === 'rounds' ? at(act4.roundEndsAt) : 0
    return !(ends && now > ends + LATE_MS)
  }
  if (act === 6) {
    if (beat !== 'games') return false
    if (relay?.state && relay.state !== 'idle') return false
    return !(at(beatAt) && now > at(beatAt) + GAMES_MS)
  }
  return false
}

// Is the drawing running at its own beat? Next is refused then (the server says the drawing is still running),
// so the card shows no big button until the third picture is named. Sir Irwin's slides are part of it: the host
// phones keep their tabs through them, so this card is what the host sees then.
export const DRAWING_ON = ['intro', 'walk', 'turn', 'vote', 'lockout']
export function drawingRuns({ act, beat, relay = null } = {}) {
  return act === 6 && beat === 'drawing' && DRAWING_ON.includes(relay?.state)
}

// Bulletin 2 armed, not yet played (14 Nov 2026, the deep scan): the screen doc's kind, or the captions it carries
// through the wrap-up, says it has played. `screen` undefined: not heard from the house yet, so nothing asks.
// Before this, Start Act 4 pressed early let the news play over the Act 4 title card, cut off by its chime.
export const NEWS_ASK = {
  bulletin: 'The news has not played yet. It plays by itself a few minutes after you armed it. Go on to the wrap-up anyway?',
  wrap: 'The news has not played yet. If Act 4 starts now, it may be cut off. Start Act 4 anyway?',
}
export function newsWaiting({ act, beat, screen } = {}) {
  if (Number(act) !== 3 || !['bulletin', 'wrap'].includes(beat) || screen === undefined) return false
  return !(screen?.kind === 'bulletin' || screen?.captions?.kind === 'bulletin')
}

// What Go on now asks before it moves a night that would have moved by itself.
export function goOnAsk(act) {
  if (act === 1) return 'The intro starts by itself at its time. Start it now?'
  if (act === 4) return 'Act 4 moves on by itself. Go on now, for every group?'
  if (act === 6) return 'The two games come by themselves, then the drawing. A game not yet played is dropped. Skip ahead now?'
  return 'The night moves on from here by itself. Go on now?'
}

// The two lines for a beat, or null for one this file does not know (the card then shows the beat's own words).
export function hostStep(act, beat) {
  return HOST_STEPS[`${Number(act) || 0}/${beat ?? ''}`] ?? null
}

// Every press a line names, in order: the words between the ** marks.
export function pressesOf(text) {
  return [...String(text ?? '').matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1])
}

// A line's words as pieces for the page: [{ text, press }], the presses to be shown in bold.
export function piecesOf(text) {
  const s = String(text ?? '')
  const out = []
  let at = 0
  for (const m of s.matchAll(/\*\*(.+?)\*\*/g)) {
    if (m.index > at) out.push({ text: s.slice(at, m.index), press: false })
    out.push({ text: m[1], press: true })
    at = m.index + m[0].length
  }
  if (at < s.length) out.push({ text: s.slice(at), press: false })
  return out
}
