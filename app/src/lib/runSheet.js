// The night in order, as the phone's Host tab runs it (12 Nov 2026, Jon: the
// setup and the running of the show must be simple). One card on the Game
// night page, to read before the night: what he presses, act by act. On the
// night the phone leads: its big button always names what comes next.
//
// A press is written **like this** and shown in bold. Every one is a button
// that exists on the host's phone, by its own name, and the acts are the
// night's own (a test checks both: app/test/runSheet.test.mjs).

export const RUN_INTRO = 'You run the night from the Host tab on your phone. The big button at the top is the one to press: it always names what comes next. This is the whole night on one card.'

export const RUN_SHEET = [
  { act: 1, title: 'Act 1, The Invitation', text: 'The intro and the rules film play by themselves at 4:30, about sixteen minutes. When the film asks for a chime, press **Phone chime**. Then **Next** three times, and **Blackout** when the room is settled.' },
  { act: 2, title: 'Act 2, Lights Out', text: 'The power comes back by itself. **Next** three times: the news flash, the bag peek, the cat visits. Supper is called by itself once everyone has seen all four cats; **Supper’s ready** calls it sooner. Then **Next**.' },
  { act: 3, title: 'Act 3, Supper Is Served', text: 'Near the end of supper, **Next** arms the news bulletin: it plays by itself three to five minutes later. **Next** again for the dinner wrap-up. Then **Start Act 4**.' },
  { act: 4, title: 'Act 4, Behind Closed Doors', text: 'It runs by itself: a two-minute warning, the groups, then a chime every fifteen minutes. Go round the rooms with your group. When the rounds are over, **Next**.' },
  { act: 5, title: 'Act 5, One Candle', text: '**Cake!** when the cake is served. Then **Next** three times: Sir Irwin speaks, the motives, Act 6.' },
  { act: 6, title: 'Act 6, The Final Hour', text: 'Two Parlour Games and then the drawing start by themselves: press nothing. In the drawing, press **At the paper** when the player gets to the paper, and tap the room’s guess. When the door opens, tap **Hide this**, then **Next** twice. When the room has talked it over, **Start the vote**.' },
  { act: 7, title: 'Act 7, Unmasked', text: 'The vote closes by itself. **Next** starts the reveal. Press **Name the Murderer**, **Name the Motive** and **Name the Victim**, each when the screen is ready. **Next** for the results. When the credits end, **Next** for The End, then **Good night**.' },
  { act: null, title: 'Any time', text: '**Pause, Irwin needs the garden** stops every clock in the house. **Resume** starts them again.' },
]

// Every press a row names, in order: the words between the ** marks.
export function pressesOf(text) {
  return [...String(text ?? '').matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1])
}

// A row's words as pieces for the page: [{ text, press }], the presses to be shown in bold.
export function piecesOf(text) {
  const out = []
  let at = 0
  for (const m of String(text ?? '').matchAll(/\*\*(.+?)\*\*/g)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index), press: false })
    out.push({ text: m[1], press: true })
    at = m.index + m[0].length
  }
  if (at < String(text ?? '').length) out.push({ text: text.slice(at), press: false })
  return out
}
