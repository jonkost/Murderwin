import { useEffect } from 'react'
import { reopenDeck, BRIGHTNESS } from './arcadeDeck.js'

// The arcade's Stream Deck + XL goes dark with the house (A1, 11 Nov 2026:
// "everything has to go black"). Boo's screen (?kiosk=boo) is the deck's page
// all night, but outside an Act 4 visit nothing holds the deck, and in Act 1
// its keys show whatever the last page left. So at the blackout this page
// opens the deck the browser already allowed (no click: the same Chrome
// connected it on the practice page before the guests came), blanks every
// key and turns the backlight to nothing; when the power returns the
// backlight comes back for the arcade. A deck that is not there, or another
// tab's, is left alone. Never throws.
export async function deckDark(flag, { open = () => reopenDeck({ steal: false }) } = {}) {
  try {
    const deck = await open()
    if (!deck) return false
    if (flag) {
      await deck.clearPanel?.()
      await deck.setBrightness?.(0)
    } else {
      await deck.setBrightness?.(BRIGHTNESS)
    }
    return true
  } catch { return false }
}

// The page's own record: the backlight comes back only after this page took
// it away, so a page that loads lit never touches the deck.
let darkened = false
export function useDeckDark(on, dark) {
  useEffect(() => {
    if (!on) return
    if (dark && !darkened) { darkened = true; deckDark(true) }
    else if (!dark && darkened) { darkened = false; deckDark(false) }
  }, [on, dark])
}
