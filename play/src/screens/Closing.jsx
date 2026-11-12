// The close of the night on the screens (handoff 11 Nov 2026, C1). The look's
// own parts draw the cards (look/parts.jsx TheEnd and Dedication); this file
// only places them, so the lead's restyle of the parts reaches every screen.
//   RoomEnd: The End on every room screen, full screen (Kiosk.jsx, first in its dispatch).
//   CreditsDedication: the dedication card, eight seconds after the roll (Kiosk.jsx Finale).
//   SpecialThanks: Jon's lines at the end of the roll; nothing at all while the list is empty.
//   PhoneEnd: The End on top of a phone's Now tab, with the result under it (Rest.jsx).
import { TheEnd, Dedication } from '../look/parts'
import { dedicationPhoto } from '../lib/closing'
import { dedication as dedicationOf, specialThanks } from '../lib/finale'
import './closing.css'

const BASE = import.meta.env.BASE_URL

export function RoomEnd() {
  return <TheEnd className="full" />
}

export function CreditsDedication({ finale }) {
  const d = dedicationOf(finale)
  if (!d) return null
  return <Dedication line={d.line} photo={dedicationPhoto(d, BASE)} className="full" />
}

export function SpecialThanks({ finale }) {
  const lines = specialThanks(finale)
  if (!lines.length) return null
  return (
    <>
      <p className="kiosk-crest">Special thanks</p>
      <ul className="thanks special-thanks">{lines.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </>
  )
}

export function PhoneEnd() {
  return (
    <div className="phone-end">
      <TheEnd />
    </div>
  )
}
