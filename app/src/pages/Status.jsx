import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea, subscribeLatestValidation } from '../lib/store'
import { AREAS, TAB_KINDS } from '../lib/content'

// Where we are. The honest state of the whole project in one place: what is
// built and works, what each list still needs (live counts), and what to do
// next, in order. Nothing here is sealed; the secrets show as a count only.

const BUILT = [
  ['The invitation page', 'Live at jonkost.com/Murderwin. The Enter the Manor button opens the game.'],
  ['Guests join by phone', 'Scan the square code, type a name, get a character and a bag number. Works on a real phone.'],
  ['The phone at rest', 'Character with portrait, bag number, the Reticule: motives to cross off, the cats, the rules.'],
  ['The Host tab', 'On your phone and Susan’s: doors, the seven acts, Blackout, Power returns, Pause, who is here.'],
  ['The moments', 'Blackout goes dark on every phone; Power returns holds a prompt fifteen seconds; Pause says Irwin needs the garden.'],
  ['The look', 'Blue and red, the seal, the wallpaper, New York and SF, on the invitation, the phones and here.'],
  ['The art', 'Fourteen portraits and fourteen traces, in the repo, named for the game.'],
  ['This workshop', 'Lists with forms, Speak buttons, Pick one thing, the trail of who changed what, Jenna’s brief.'],
]

const NEXT = [
  ['The case generator', 'Who did it, who died, which motive, where every clue goes. Sealed, made blind. The role prompts for the blackout come from it.', 'Claude'],
  ['Cat testimony on the phone', 'A cat greets you, gives its secret middle with the blanks filled, and closes. Affection decides how much.', 'Claude'],
  ['The secrets themselves', 'The generator that writes them needs your Anthropic key once. Then Jenna reads every set.', 'Jon, then Jenna'],
  ['Jenna’s page', 'Her own page for the secrets, opening only for her account. Needs your yes on one security rule.', 'Claude, then Jon'],
  ['Eight fake players', 'A script that plays a whole throwaway night, so the plumbing is proven without anyone reading a clue.', 'Claude'],
  ['The event windows', 'Acts 2, 4 and 6: every phone lights up, two of them steering. Innocent beats come from the Filler list.', 'Claude'],
  ['Dinner, dessert, the Big Solve, the reveal', 'The bulletin, Irwin’s testimony, the deduction round, the ballot and the reveal on the TV.', 'Claude'],
  ['Kiosks and the study', 'The two laptops as room screens, the Nanoleaf puzzle, the Stream Deck.', 'Claude, then Jon'],
  ['The household photos', 'Faces, full, intro cards, in-play. Folders are ready.', 'Jon'],
]

function suggestion(area, spec, items) {
  const live = items.filter(i => !i.deleted)
  if (spec.checklist) return null
  if (spec.tabs) {
    const def = TAB_KINDS[spec.tabs]
    const short = def.list.map(t => ({ t, n: live.filter(i => i[def.field] === t).length })).filter(x => x.n < spec.goalPerTab).sort((a, b) => a.n - b.n)
    if (!short.length) return { done: true }
    const first = short[0]
    return { done: false, text: `Thinnest: ${def.label(first.t)} has ${first.n} of ${spec.goalPerTab}. ${short.length} of ${def.list.length} still short.`, to: `/edit/${area}?tab=${first.t}&focus=3` }
  }
  const goal = spec.goal ?? 0
  if (live.length >= goal) return { done: true }
  return { done: false, text: `${live.length} of ${goal}. ${goal - live.length} to go.`, to: `${area === 'templates' ? '/stationery' : `/edit/${area}`}?focus=3` }
}

export default function Status() {
  const [data, setData] = useState({})
  const [validation, setValidation] = useState(null)
  useEffect(() => {
    const unsubs = Object.keys(AREAS).map(area => subscribeArea(area, items => setData(d => ({ ...d, [area]: items })), () => {}))
    unsubs.push(subscribeLatestValidation(setValidation, () => {}))
    return () => unsubs.forEach(u => u())
  }, [])

  const rows = Object.entries(AREAS).filter(([, spec]) => !spec.checklist).map(([area, spec]) => ({ area, spec, s: suggestion(area, spec, data[area] ?? []) }))
  const todo = rows.filter(r => r.s && !r.s.done)
  const done = rows.filter(r => r.s?.done)

  return (
    <main className="dash">
      <section className="panel">
        <h2>Where we are</h2>
        <p className="why">The whole project on one page. Counts are live. The secrets show as a count only.</p>
      </section>

      <section className="panel">
        <h2>Works today</h2>
        <ul className="audit">
          {BUILT.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}
        </ul>
      </section>

      <section className="panel">
        <h2>Writing still needed</h2>
        <p className="why">Each line links straight into the list with a three-line goal. The suggestion is simply the thinnest spot.</p>
        {todo.length === 0 && <p className="hint">Every list has reached its goal.</p>}
        <ul className="audit">
          {todo.map(r => (
            <li key={r.area}><Link to={r.s.to}><b>{r.spec.label}</b></Link>: {r.s.text}</li>
          ))}
        </ul>
        {done.length > 0 && <p className="hint">At goal: {done.map(r => r.spec.label).join(', ')}.</p>}
        <p className="night-line">
          <b>The secrets:</b> {validation === null ? 'not made yet. They come after the case generator.' : `${validation.complete} of ${validation.codes} sets, ${validation.pass ? 'checked' : 'needing a re-run'}.`}
        </p>
      </section>

      <section className="panel">
        <h2>What comes next, in order</h2>
        <ol className="night-steps">
          {NEXT.map(([t, d, who]) => <li key={t}><b>{t}</b> <span className="hint">({who})</span><br />{d}</li>)}
        </ol>
      </section>
    </main>
  )
}
