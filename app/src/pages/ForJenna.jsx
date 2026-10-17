import { Link } from 'react-router-dom'
import { AREAS, AREA_GROUPS } from '../lib/content'
import { cardFor } from '../lib/cards'

// The Steward's brief, in plain words. Safe content: it describes the role,
// never the secrets. Jon may read it too; it is the brief he would otherwise
// give out loud. The map at the bottom says what every list is for.

const FIRST = [
  { to: '/edit/rules_text', label: 'The rules', why: 'Read them cold, as a guest would at a noisy party. Fix anything that reads wrong.' },
  { to: '/edit/bios', label: 'The fourteen characters', why: 'Each one should be playable by an eleven-year-old and a seventy-year-old after one read.' },
  { to: '/edit/scenarios', label: 'Parlour Games', why: 'Silly, never heavy, nothing about the case. If one would make somebody at the table feel bad, say so.' },
  { to: '/edit/openers?tab=boo', label: 'What a cat says first', why: 'Each cat has one voice. If a line slips out of it, fix it in place. Then the other cat lists.' },
]

export default function ForJenna() {
  return (
    <main className="dash brief">
      <section className="panel">
        <h2>For Jenna</h2>
        <p>Thank you for doing this. You are the Steward of Sirwin Manor: the one person who may see everything, because you are the one person who will not be playing.</p>
        <p>The game is a murder mystery party for about nine people on Sunday 15 November. Everyone, including Jon and Susan, plays a character and tries to work out three things: who did it, why, and who died. The twist is that the murderer and the victim are both at the table, playing along. The answers are made by the computer at random on the night, so nobody who is there knows them. That is the whole point, and it is the rule above every other rule: <b>the host plays</b>. Jon must never learn the secrets, and neither may Susan.</p>
      </section>

      <section className="panel">
        <h2>How a list works</h2>
        <p>Every list opens with a card that says what the list is, <b>which part of the night it feeds</b>, what goes in each box, and one finished example. Read the card first. Tap <i>Put this example in the boxes</i> if you want something to edit instead of a blank.</p>
        <p>Some lines are one box, some are two or three. The new one goes at the top, right under the card. Enter moves to the next box; from the last box, Enter keeps the line. Tap any saved line to change it in place. ✕ removes a line, and you can always put it back. It saves on its own: <b>saved ✓</b> in the corner means saved. A red bar means your last change did not save; try again when you have signal.</p>
        <p>A yellow note under a line is a nudge about the list's rules, never a stop. The counts at the top are a target, not a deadline.</p>
      </section>

      <section className="panel">
        <h2>Your two words</h2>
        <p>Under the card on every list there is a row for you: <b>Reads clearly</b> or <b>Needs another look</b>, and one line of note. That is your whole report. Jon sees the two words and the line; he never sees the secrets in them, because there are none in the safe lists.</p>
        <p><b>Never volunteer anything, and never confirm a guess.</b> Jon may ask "is this broken?" and you may answer. Jon may not ask "is this right?" about anything that would reveal an answer, and if he does, the answer is "I can't tell you that."</p>
      </section>

      <section className="panel">
        <h2>What to do first</h2>
        <p className="why">In this order. None of it is urgent today; each one is an evening.</p>
        <ol className="night-steps">
          {FIRST.map(f => (
            <li key={f.to}><Link className="ghost open" to={f.to}>Open {f.label}</Link><br /><span className="hint">{f.why}</span></li>
          ))}
          <li><b>Later, when the secrets exist</b>, you will be told. Then: read every set for sense, tone and typos on your own page, and mark each one done or needs more.</li>
          <li><b>Later still: the bags.</b> The game decides what goes in each numbered bag; your page will show the packing list, and you pack them.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>What every list is for</h2>
        <p className="why">The same words you will find at the top of each list, in one place.</p>
        {AREA_GROUPS.map(group => (
          <div key={group} className="map-group">
            <h3>{group}</h3>
            <ul className="map">
              {Object.entries(AREAS).filter(([, spec]) => spec.group === group && !spec.hidden).map(([area, spec]) => {
                const card = cardFor(area, null)
                const to = area === 'templates' ? '/stationery' : `/edit/${area}`
                return (
                  <li key={area}>
                    <Link to={to}><b>{spec.label}</b></Link>
                    <span className="list-moment"> {spec.moment}</span>
                    <br /><span className="hint">{card?.what}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>
    </main>
  )
}
