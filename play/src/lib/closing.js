// The close of the night (handoff 11 Nov 2026, C1), as pure rules: no React,
// no Firebase, so play/test runs them under node --test.
//
// The End is a card, never a black screen: every room screen (every kiosk
// kind, second displays too) and every phone shows The End in lights, Sir
// Irwin, his birthday line and one burst of paw prints, from the moment the
// night is over (nights/{id}.over, or Act 7's end beat: lib/night.js isOver)
// for good. Good night (nights/{id}.goodNight, the host's last button) leaves
// every screen on The End.

import { isOver } from './night.js'
import { finaleStage, creditsTimes, ms } from './finale.js'

// Is this screen on The End? The same test on every screen and every phone.
export function roomEnded(night) {
  return isOver(night)
}

// Has the host pressed Good night? Only ever after The End.
export function nightClosed(night) {
  return isOver(night) && night?.goodNight === true
}

// The Host tab's line on the result beat: how long the credits have left on
// the Parlour TV, so The End is not pressed over them. Seconds, or null once
// they are over (or before the Victim's name has started them). Next is never
// blocked: this only says.
export function creditsLeft(finale, now) {
  if (!finale?.victimAt || finale.stage !== 'victim' || !finale.epilogue) return null
  const stage = finaleStage(finale, now)
  if (stage === 'last') return null
  const since = (finale.holdAt ? ms(finale.holdAt) : now) - ms(finale.victimAt)
  return Math.max(0, Math.ceil((creditsTimes(finale).last - since) / 1000))
}

export function minutesText(seconds) {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// The dedication card's picture, for the look's Dedication part: always an
// address (Sydney's photo unless the credits name another). The part leaves
// its frame off by itself when the file will not load.
export const DEDICATION_PHOTO = 'household/sydney.jpg'
export function dedicationPhoto(dedication, base = '/') {
  const p = String(dedication?.photo ?? '').trim() || DEDICATION_PHOTO
  return `${base}${p}`
}
