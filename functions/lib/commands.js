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
  { name: 'blackout', arg: '', what: 'Every phone goes dark.' },
  { name: 'power', arg: '', what: 'The power returns: roles land, Act 2 begins.' },
  { name: 'pause', arg: '', what: 'Pause: Sir Irwin requires the garden.' },
  { name: 'resume', arg: '', what: 'Carry on from the pause.' },
  { name: 'handover', arg: '<guestKey>', what: 'Hand a guest\'s phone on: wipe what it holds so another phone can take the character.' },
  // running the beats (run.js)
  { name: 'next', arg: '', what: 'The next beat. The one button that runs the night.' },
  { name: 'back', arg: '', what: 'One beat back, dealing nothing.' },
  { name: 'beat', arg: '<key>', what: 'Jump to a named beat of the current act and run it.' },
  { name: 'light-up', arg: '', what: 'A Parlour Game on every phone, any time in Acts 2, 4 and 6.' },
  { name: 'settle', arg: '', what: 'Pick for the phones that did not, once the window has run out.' },
  { name: 'groups', arg: '', what: 'Make the Act 4 groups and the study order.' },
  { name: 'station-key', arg: '<key>', what: 'Set the key the study station presents.' },
  { name: 'study-tick', arg: '', what: 'With no station: end a study slot that has run its twelve minutes (the Host tab does this on its own).' },
  { name: 'study-finish', arg: '[groupId]', what: 'Move the house on without waiting for the study. The group is paid.' },
  { name: 'study-reassign', arg: '<groupId>', what: 'Say which group is actually in the study, before it pays out.' },
  { name: 'hall', arg: '<red|green>', what: 'Set the hall light by hand.' },
  { name: 'tick', arg: '', what: 'The clock: settle a window that has run out, end a study slot that has run out. The server does this once a minute on its own.' },
  { name: 'note-exposure', arg: '<murderer|ghost>', what: 'Note that a hidden role was seen. Nothing shows until Act 7.' },
  { name: 'relay-start', arg: '[force]', what: 'Start the Act 6 drawing. A drawing under way is kept unless you say force.' },
  { name: 'relay-reset', arg: '', what: 'Clear the drawing.' },
  { name: 'relay-advance', arg: '', what: 'Nudge the drawing clock (the kiosk does this itself).' },
  { name: 'tv-trace', arg: '[off]', what: 'Show the trace on the living room TV once the door is open (if the bedroom screen has died). Say off to take it down.' },
  // Act 7 on the living room screen (finale.js)
  { name: 'reveal-stage', arg: '', what: 'Put the next name on the screen: the Murderer, then the Motive, then the Victim.' },
  { name: 'finale-hold', arg: '', what: 'Hold the living room screen where it is.' },
  { name: 'finale-go', arg: '', what: 'Carry on after a hold. Everything later on the screen moves by the length of the hold.' },
  { name: 'award', arg: '<guestKey:n>', what: 'Give achievement n from the workshop list to a guest. Through Act 5 only.' },
  // dry runs only (run.js, discard.js)
  { name: 'dry-run', arg: '', what: 'Mark this night a dry run: it may close windows early and be discarded.' },
  { name: 'settle-now', arg: '', what: 'Close the open window early. Dry run nights only.' },
  { name: 'discard-night', arg: '', what: 'Delete this rehearsal night and everything it wrote. Refuses a real case.' },
]

export function helpText() {
  const width = Math.max(...HOST_COMMANDS.map(c => `${c.name} ${c.arg}`.trim().length))
  return HOST_COMMANDS.map(c => `  ${`${c.name} ${c.arg}`.trim().padEnd(width)}  ${c.what}`).join('\n')
}
