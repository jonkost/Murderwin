// The game inside the workshop: ranks for lines written, and what Sir Irwin
// says at fixed moments. Everything here is a plain count check: nothing is
// dealt, nothing is random, nothing nags. Pure module, tested.

// Victorian household ranks for lines written, lowest first.
export const RANKS = [
  { name: 'Boots', at: 0 },
  { name: 'Scullery', at: 10 },
  { name: 'Footman', at: 30 },
  { name: 'Cook', at: 70 },
  { name: 'Housekeeper', at: 140 },
  { name: 'Butler', at: 240 },
]
export const TOP_RANK = 'Sir Irwin’s Favourite' // every list full; shared with everyone who helped

export function rankFor(lines, allFull = false) {
  if (allFull) return { name: TOP_RANK, at: null, next: null }
  let r = RANKS[0]
  for (const rank of RANKS) if (lines >= rank.at) r = rank
  const idx = RANKS.indexOf(r)
  const next = RANKS[idx + 1] ?? null
  return { name: r.name, at: r.at, next }
}

// What Sir Irwin says. One line per visit, chosen by the first moment that
// is true, in this order. He never says nothing is wrong when it is.
export const IRWIN = {
  saveFailed: 'That last line did not get kept. Your words are still in the box, I checked. Press Retry when you have signal and we will try again.',
  allFull: 'Every list is full. The whole manor is written. I have waited my whole life for this, which is one year, and it was worth it.',
  listFull: 'This list is full. I counted it twice. I did not need to. I wanted to.',
  newRank: 'A new rank. I would have given it to you sooner, but the rules say lines, and now you have the lines.',
  threeToday: 'Three lines. I counted every one of them. You may stop now and I will still think you are wonderful.',
  firstToday: 'There you are. That is the first line of the day, and it is already my favourite.',
  nothingToday: 'Nothing written today. That is allowed. I have been asleep on the stairs and I regret nothing. One line, whenever you are ready.',
  hello: 'Hello. I am here. I will be here the whole time.',
}

export function irwinLine({ saveFailed = false, allFull = false, listJustFull = false, newRank = false, today = 0, everWritten = true } = {}) {
  if (saveFailed) return IRWIN.saveFailed
  if (allFull) return IRWIN.allFull
  if (listJustFull) return IRWIN.listFull
  if (newRank) return IRWIN.newRank
  if (today >= 3) return IRWIN.threeToday
  if (today >= 1) return IRWIN.firstToday
  if (!everWritten) return IRWIN.hello
  return IRWIN.nothingToday
}

// The day, as a key, in the phone's own time zone.
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
