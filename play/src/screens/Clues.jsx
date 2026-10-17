import { ACTS } from '../lib/content'
import { clueCards } from '../lib/night'
import { Testimony, Document, Clue, CatFace } from './Cards'

// Everything this phone has been told, newest first, grouped by act. The
// cats' words, the documents, the study's clue, the bag property. Nothing
// here can be sent anywhere; it is read out loud or not at all.

export default function Clues({ session }) {
  const cards = clueCards(session)
  if (!cards.length) return (
    <div>
      <p className="gloss">Nothing yet. Everything a cat tells you, every paper you find and every clue a room pays out collects here.</p>
    </div>
  )
  const byAct = new Map()
  for (const c of cards) {
    if (!byAct.has(c.act)) byAct.set(c.act, [])
    byAct.get(c.act).push(c)
  }
  return (
    <div className="clues">
      <p className="gloss">Everything you have been told, newest first. Share it with your mouth, or keep it.</p>
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
    case 'document': return <Document card={card} />
    case 'clue': return <Clue card={card} />
    case 'station': return (
      <section className="dealt clue">
        <h3>From the bags</h3>
        <p>Something <strong>{card.property}</strong>, in two or three bags.</p>
      </section>
    )
    case 'result': return null
    default: return (
      <section className="dealt clue">
        {card.cat && <CatFace cat={card.cat} name={card.catName} />}
        <p>{card.text}</p>
      </section>
    )
  }
}
