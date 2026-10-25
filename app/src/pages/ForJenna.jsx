import { Link } from 'react-router-dom'
import { AREAS, AREA_GROUPS } from '../lib/content'
import { cardFor } from '../lib/cards'
import { PLAY_URL } from '../lib/config'

// The Steward's brief, in plain words (rewritten 24 Oct 2026 to Jenna's real
// job, the Canon's list of 23 Oct): pack the bags at the house, run the
// checks on their page, look over the cats' leans if they want, read the
// rules, the characters, the Parlour Games and the cat lines cold, and tell
// Jon only "done" or "needs more". Safe content: it describes the role,
// never the secrets. Jon may read it too; it is the brief he would otherwise
// give out loud. The map at the bottom says what every list is for.

// The phone's own rules show on the Rules tab while the workshop's rules
// list is empty, so Jenna reads them where a guest would: a sample phone.
const RULES_ON_A_PHONE = PLAY_URL ? `${PLAY_URL}${String(PLAY_URL).includes('?') ? '&' : '?'}preview=you` : null
const CAT_HINT_LINES = 'https://claude.ai/artifact/Mb39Qkpd4s7jtz59Kdw2vV'

const READS = [
  { label: 'The rules', why: 'Read them cold, as a guest would at a noisy party. They show on a sample phone: tap Rules at the bottom.', href: RULES_ON_A_PHONE },
  { label: 'The fourteen characters', why: 'Each one should be playable by an eleven-year-old and a seventy-year-old after one read.', to: '/edit/bios' },
  { label: 'Parlour Games', why: 'Silly, never heavy, nothing about the case. If one would make somebody at the table feel bad, say so.', to: '/edit/scenarios' },
  { label: 'The cat lines', why: 'What each cat says, by how much it likes a guest. Each cat has one voice; say if a line slips out of it.', href: CAT_HINT_LINES },
]

export default function ForJenna() {
  return (
    <main className="dash brief">
      <section className="panel">
        <h2>For Jenna</h2>
        <p>Thank you for doing this. You are the Steward of Sirwin Manor: the one person who may see everything, because you are the one person who will not be playing.</p>
        <p>The game is a murder mystery party for about nine people on Sunday 15 November. Everyone, including Jon and Susan, plays a character and tries to work out three things: who did it, why, and who died. The twist is that the murderer and the victim are both at the table, playing along. The game decides the answers on its own, on the night, so nobody who is there knows them. That is the whole point, and it is the rule above every other rule: <b>the host plays</b>. Jon must never learn the secrets, and neither may Susan.</p>
        <p>You come to the party, and you never play.</p>
      </section>

      <section className="panel">
        <h2>Your jobs</h2>
        <p className="why">In this order. None of it is urgent today.</p>
        <ol className="night-steps">
          <li>
            <b>Run the checks.</b> <Link className="ghost open" to="/steward">Open your page</Link>, tab <i>The checks</i>, and press <b>Run the checks</b> once Jon says the cats’ leans and the drawing pictures are made (by Saturday 31 October). Each check shows pass or fail, with its number. Your page opens for your account only; Jon’s is refused.
          </li>
          <li>
            <b>Look over the cats’ leans, if you want to.</b> Same page, tab <i>The cats’ leans</i>. The game made them without anyone seeing them: for each Parlour Games question, which answer each cat likes. Change any that feel wrong. You may also leave them as they are.
          </li>
          <li>
            <b>Read four things cold</b>, below, and mark each one.
          </li>
          <li>
            <b>Pack the bags at the house</b>, on the day, before the guests arrive. Your page, tab <i>The packing list</i>, says what goes in each of the ten numbered bags: four or five things each. Pack where nobody who plays can see, then keep the bags closed.
          </li>
        </ol>
      </section>

      <section className="panel">
        <h2>What you tell Jon</h2>
        <p>Only two words: <b>done</b>, or <b>needs more</b>. Never what is in anything.</p>
        <p><b>Never volunteer anything, and never confirm a guess.</b> Jon may ask "is this broken?" and you may answer. Jon may not ask "is this right?" about anything that would reveal an answer, and if he does, the answer is "I can't tell you that."</p>
      </section>

      <section className="panel">
        <h2>Read these cold</h2>
        <p className="why">Read each as a guest would. Under the card at the top of each workshop list there is a row for you: <b>Reads clearly</b> or <b>Needs another look</b>, and one line of note. For the two that are not workshop lists, tell Jon done or needs more.</p>
        <ol className="night-steps">
          {READS.map(r => (
            <li key={r.label}>
              {r.to
                ? <Link className="ghost open" to={r.to}>Open {r.label}</Link>
                : r.href ? <a className="ghost open" href={r.href} target="_blank" rel="noreferrer">Open {r.label}</a> : <b>{r.label}</b>}
              <br /><span className="hint">{r.why}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <h2>How a list works</h2>
        <p>Every list opens with a card that says what the list is, <b>which part of the night it feeds</b>, what goes in each box, and one finished example. Read the card first.</p>
        <p>Tap any saved line to change it in place. ✕ removes a line, and you can always put it back. It saves on its own: <b>saved ✓</b> in the corner means saved. A red bar means your last change did not save; try again when you have signal.</p>
        <p>A yellow note under a line is a nudge about the list's rules, never a stop. The counts at the top are a target, not a deadline.</p>
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
                return (
                  <li key={area}>
                    <Link to={`/edit/${area}`}><b>{spec.label}</b></Link>
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
