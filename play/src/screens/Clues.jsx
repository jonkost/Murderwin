import { ACTS } from '../lib/content'
import { clueCards } from '../lib/night'
import { Testimony, Clue, CatFace } from './Cards'
import Spoken from './Spoken'

// Everything this phone has been told, newest first, grouped by act. The
// cats' hints and bag clues, the study's trace, the rooms' rewards. Nothing
// here can be sent anywhere; it is read out loud or not at all.

export default function Clues({ session }) {
  const cards = clueCards(session)
  if (!cards.length) return (
    <div className="quiet-now">
      <p className="quiet-lead">Nothing yet.</p>
      <p className="quiet-line">What you are told lands here.</p>
    </div>
  )
  const byAct = new Map()
  for (const c of cards) {
    if (!byAct.has(c.act)) byAct.set(c.act, [])
    byAct.get(c.act).push(c)
  }
  return (
    <div className="clues">
      <p className="gloss">Newest first. Share it out loud, or keep it.</p>
      {[...byAct.entries()].map(([act, list]) => (
        <section key={act} className="clues-act">
          <h3 className="eyebrow">Act {act} · {ACTS[act]?.plain}</h3>
          {list.map(c => <ClueCard key={c.id} card={c} />)}
        </section>
      ))}
    </div>
  )
}

function ClueCard({ card }) {
  switch (card.kind) {
    case 'testimony': return <Testimony card={card} compact />
    case 'clue': return <Clue card={card} />
    case 'result': return null
    default: return (
      <section className="dealt clue">
        {card.cat && <CatFace cat={card.cat} name={card.catName} />}
        <p><Spoken text={card.text} /></p>
      </section>
    )
  }
}
