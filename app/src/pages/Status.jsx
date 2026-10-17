import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea, subscribeLatestValidation } from '../lib/store'
import { AREAS, TAB_KINDS, goalForTab } from '../lib/content'
import { isComplete } from '../lib/scenarios'

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
  ['This workshop', 'Every list opens with a card: what it is, which part of the night it feeds, what goes in each box, an example. One box per thing. Speak buttons. Sir Irwin keeps count.'],
  ['The Parlour Games', 'Three silly questions in a row, two choices each, points on each choice, the eight totals, and a phone preview. Written here, dealt to every phone in Acts 2, 4 and 6.'],
  ['The whole night on the phone', 'One button, Next, runs every beat of every act. Role cards at the blackout, the cat and the safe, the groups, five stations, the drawing, the deduction round, the ballot, the reveal and each phone’s result.'],
  ['The case, built blind', 'At the blackout the server picks who did it, who died and why, and deals the cat testimony with the blanks filled. Rehearsals use bracketed stand-ins; the party night box on the Game night page uses the secrets.'],
  ['The study light game', 'The station on the M1 Air, the Nanoleaf walls, the Stream Deck, Granolia’s screen. Finishing the study rotates the house.'],
  ['The relay drawing and the room screens', 'The living room TV, the bedroom door and the trace at the dial’s level. Hall light red to green through the cue relay.'],
  ['The screens for every beat', 'The news flash, the Act 3 bulletin, Sir Irwin at cake, the board of strikes and the door on the TV; the iPad keeps the words up through dinner; a sound for every cue, with stand-in tones until you record yours.'],
  ['Safety nets', 'A dead phone, a borrowed phone, a late arrival, a pause that stops every clock, the role card readable all night.'],
  ['Rehearsing without the party', 'A pretend Firebase on your Mac, eight fake players that play a whole night and throw it away, one test command for everything, deploys that refuse an empty site, and the day-of runbook.'],
]

const NEXT = [
  ['The secrets themselves', 'The generator that writes them needs your Anthropic key once. Then Jenna reads every set.', 'Jon, then Jenna'],
  ['Jenna’s page', 'Her own page for the secrets, opening only for her account. Needs your yes on one security rule.', 'Claude, then Jon'],
  ['The bags and the stationery', 'A blind script packs the numbered bags; the bags station reads it. Seven paper stand-ins for the documents. The Freeze button for 7 November.', 'Claude, then Jon packs'],
  ['The nine sounds', 'Record one short sound per cue (media/README.md lists them, one second of silence first). Stand-in tones play until then.', 'Jon'],
  ['Windows on a server clock', 'Every Parlour Game settles on time even if nobody presses anything.', 'Claude'],
  ['The finale on the TV', 'The reveal staged so nothing is readable early, the stats reel, the dial graph, and achievements you award by tapping.', 'Claude'],
  ['Spill the Beans and the Hush', 'Your two safeguard buttons, greyed out after Act 5.', 'Claude'],
  ['The hardware evening', 'The Nanoleaf wall, the Stream Deck and the Hue bulb plugged in, one run of the study and one grid of the drawing.', 'Jon'],
  ['The household photos', 'Faces, full, intro cards, in-play. Folders are ready.', 'Jon'],
]

// Decided for after the party. Listed so they are not mistaken for gaps.
const AFTER = [
  ['The full hidden-event system', 'Nested scenarios three beats deep. The Parlour Games are the event system for this party.'],
  ['The ten-thousand-run solvability proof', 'The validator assuming worst-case suppression across Acts 2, 4 and 6.'],
  ['More puzzle slot-pools', 'Beyond the safe and the shape game.'],
  ['A recap button and idle art', 'Nice to have. Not for the first birthday.'],
]

function suggestion(area, spec, items) {
  const live = items.filter(i => !i.deleted)
  if (spec.checklist) return null
  if (spec.tabs) {
    const def = TAB_KINDS[spec.tabs]
    const short = def.list.map(t => ({ t, n: live.filter(i => i[def.field] === t).length, need: goalForTab(spec, t) })).filter(x => x.n < x.need).sort((a, b) => (a.n - a.need) - (b.n - b.need))
    if (!short.length) return { done: true }
    const first = short[0]
    return { done: false, text: `Thinnest: ${def.label(first.t)} has ${first.n} of ${first.need}. ${short.length} of ${def.list.length} still short.`, to: `/edit/${area}?tab=${first.t}&focus=3` }
  }
  const goal = spec.goal ?? 0
  const n = spec.editor === 'questions' ? live.filter(i => isComplete(i.beats)).length : live.length
  if (n >= goal) return { done: true }
  return { done: false, text: `${n} of ${goal}. ${goal - n} to go.`, to: `${area === 'templates' ? '/stationery' : `/edit/${area}`}?focus=3` }
}

export default function Status() {
  const [data, setData] = useState({})
  const [validation, setValidation] = useState(null)
  useEffect(() => {
    const unsubs = Object.keys(AREAS).map(area => subscribeArea(area, items => setData(d => ({ ...d, [area]: items })), () => {}))
    unsubs.push(subscribeLatestValidation(setValidation, () => {}))
    return () => unsubs.forEach(u => u())
  }, [])

  const rows = Object.entries(AREAS).filter(([, spec]) => !spec.checklist && !spec.retired).map(([area, spec]) => ({ area, spec, s: suggestion(area, spec, data[area] ?? []) }))
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
            <li key={r.area}><Link to={r.s.to}><b>{r.spec.label}</b></Link> <span className="list-moment">{r.spec.moment}</span><br />{r.s.text}</li>
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

      <section className="panel">
        <h2>After the party</h2>
        <p className="why">Decided, not forgotten. None of these is needed on the night.</p>
        <ul className="audit">
          {AFTER.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}
        </ul>
      </section>
    </main>
  )
}
