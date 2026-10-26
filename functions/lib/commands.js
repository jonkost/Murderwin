// Every host command, in one list, so the terminal host's --help, the docs
// and the tests agree with the switch statements in run.js and night.js.
// A test (functions/test/host-help.test.mjs) checks every `case '...'` in
// those two switches has a line here, and every line here has a case.
// Adding a host command means adding a line here too.
//
// Labelled by what each does, never by content.

export const HOST_COMMANDS = [
  // the night itself (night.js)
  { name: 'create', arg: '[label]', what: 'Start a new night and make it the live one.' },
  { name: 'activate', arg: '<nightId>', what: 'Make an existing night the live one.' },
  { name: 'publish', arg: '', what: 'Copy the latest workshop lines to the phones.' },
  { name: 'refresh-hosts', arg: '', what: 'Re-read the two host names from the Game night form.' },
  { name: 'join-open', arg: '', what: 'Open the doors.' },
  { name: 'join-close', arg: '', what: 'Close the doors.' },
  { name: 'act', arg: '<1-7>', what: 'Jump to an act (a jump to 2 or past it deals the roles first if they are not out yet).' },
  { name: 'blackout', arg: '', what: 'Act 1 only: every phone goes dark. Five seconds later the power comes back on its own: roles land, Act 2 begins. A second press in the dark changes nothing.' },
  { name: 'power', arg: '', what: 'The power returns by hand, if it has not come back on its own: roles land, Act 2 begins. Harmless once the power is back.' },
  { name: 'pause', arg: '', what: 'Pause: Sir Irwin requires the garden.' },
  { name: 'resume', arg: '', what: 'Carry on from the pause.' },
  { name: 'handover', arg: '<guestKey>', what: 'Hand a guest\'s phone on: wipe what it holds so another phone can take the character.' },
  // running the beats (run.js)
  { name: 'next', arg: '', what: 'The next beat. The one button that runs the night.' },
  { name: 'back', arg: '', what: 'One beat back, dealing nothing.' },
  { name: 'beat', arg: '<key>', what: 'Jump to a named beat of the current act and run it.' },
  { name: 'light-up', arg: '', what: 'A Parlour Game on every phone, any time in Acts 2, 4 and 6 (in Act 4 it waits on each phone until the guest is free).' },
  { name: 'supper', arg: '', what: "Supper's ready (Act 2): close the cat queue and send everyone to supper; the cats a guest has not seen leave a note." },
  { name: 'start-act4', arg: '', what: 'Start Act 4 (end of supper): the two-minute warning, then the groups and the ten-minute rounds on their own.' },
  { name: 'scene', arg: '<name>', what: 'Recall one of the six Hue scenes by hand (Murderwin Default, Dimmed, Blackout, Drawing, Candles, Study Dim). The brain does it.' },
  { name: 'music', arg: '<play|pause|next>', what: "The brain's music by hand: play, pause, or the next playlist." },
  { name: 'settle', arg: '', what: 'Pick for the phones that did not, once the window has run out.' },
  { name: 'groups', arg: '[force]', what: 'Make the Act 4 groups and their walk round the four rooms (Start Act 4 does this). Made groups are kept unless you say force.' },
  { name: 'station-key', arg: '<key>', what: 'Set the key the study station presents. The news recordings are coded with it too, so put the same key in cues/.env as STATION_KEY.' },
  { name: 'study-tick', arg: '', what: 'With no station: end a study slot that has run its ten minutes. The rounds do this on their own now.' },
  { name: 'study-finish', arg: '[groupId]', what: 'Pay the group in the study now (its trace and Granolia\'s bag hint) without waiting for the station.' },
  { name: 'study-reassign', arg: '<groupId>', what: 'Say which group is actually in the study, before it pays out.' },
  { name: 'hall', arg: '<red|green>', what: 'Set the hall light by hand.' },
  { name: 'tick', arg: '', what: 'The clock: settle a window that has run out, move the Act 2 queue on, the supper chime, Act 4\'s rounds. The server does this once a minute on its own.' },
  { name: 'note-exposure', arg: '<murderer|ghost>', what: 'The older name for hush: the same record, the same path. Nothing shows until Act 7.' },
  { name: 'relay-start', arg: '[force]', what: 'Start the Act 6 drawing. A drawing under way is kept unless you say force.' },
  { name: 'relay-reset', arg: '', what: 'Clear the drawing.' },
  { name: 'relay-advance', arg: '', what: 'Nudge the drawing clock (the kiosk does this itself).' },
  { name: 'at-the-paper', arg: '', what: 'The drawing: the called player is at the paper, so the walk ends now and the square shows at once. Only while someone is walking.' },
  // the house (run.js; the brain does the sound and the lights, cues/)
  { name: 'sound-test', arg: '', what: 'The chime on every HomePod, so the room hears the speakers work during the rules. Nothing else moves.' },
  { name: 'cake', arg: '', what: 'Cake! (Act 5): the brain plays Happy Birthday for Dogs on every HomePod and dims the lights for the candles; the Parlour TV shows the birthday card. The jazz comes back when the song ends.' },
  { name: 'tv-trace', arg: '[off]', what: 'Show the trace on the living room TV once the door is open (if the bedroom screen has died). Say off to take it down.' },
  // Act 7 on the living room screen (finale.js)
  { name: 'reveal-stage', arg: '', what: 'Put the next name on the screen: the Murderer, then the Motive, then the Victim.' },
  { name: 'finale-hold', arg: '', what: 'Hold the living room screen where it is.' },
  { name: 'finale-go', arg: '', what: 'Carry on after a hold. Everything later on the screen moves by the length of the hold.' },
  { name: 'fetch-champion', arg: '<guestKey>', what: 'The first guest the real Sir Irwin brings a toy to. Once. It shows in the end credits.' },
  { name: 'salem-petted', arg: '<guestKey>', what: 'The real Salem chose this guest: their Salem goes to the top and tells it straight. Never the two hosts.' },
  { name: 'award', arg: '<guestKey:n>', what: 'Give achievement n from the workshop list to a guest. Through Act 5 only.' },
  // the safeguards (run.js, safeguards.js)
  { name: 'spill', arg: '', what: 'Spill the Beans: ask the Manor to change the story. Through Act 5 only. It decides silently and says nothing either way.' },
  { name: 'hush', arg: '<murderer|ghost>', what: 'The Hush: that role has been found out. Their answers move nothing from now on. No phone changes.' },
  // dry runs only (run.js, discard.js)
  { name: 'dry-run', arg: '', what: 'Mark this night a dry run: it may close windows early and be discarded.' },
  { name: 'settle-now', arg: '', what: 'Close the open window early. Dry run nights only.' },
  { name: 'discard-night', arg: '', what: 'Delete this rehearsal night and everything it wrote. Refuses a real case.' },
]

export function helpText() {
  const width = Math.max(...HOST_COMMANDS.map(c => `${c.name} ${c.arg}`.trim().length))
  return HOST_COMMANDS.map(c => `  ${`${c.name} ${c.arg}`.trim().padEnd(width)}  ${c.what}`).join('\n')
}
