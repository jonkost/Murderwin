// The Study's screen in Act 4 (A8, 12 Nov 2026): which of its plain states
// it is in. Plain JavaScript, no React, so play/test can check it as a table.
//
//   ready    a group is due and has not played: "Touch any hexagon to start."
//   playing  the game is on the wall (playing, reproducing, entering)
//   done     the game is over, or the group due has been paid
//   waiting  nobody is due (between groups): the card with no line
export function studyState(study, rotation) {
  const s = study?.state ?? 'idle'
  if (s === 'playing' || s === 'reproducing' || s === 'entering') return 'playing'
  if (s === 'done') return 'done'
  if (!study?.groupId) return 'waiting'
  return rotation?.finished?.[study.groupId] ? 'done' : 'ready'
}
export const STUDY_DONE_LINE = 'Done. Back to the Parlour.'
