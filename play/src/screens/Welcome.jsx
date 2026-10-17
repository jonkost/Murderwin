import { useState } from 'react'
import { writeNotes } from '../lib/hooks'
import { CATS, bioFor, characterById } from '../lib/content'
import { CatFace } from './Cards'
import { Seal } from './Moments'
import { CharacterCard } from './Rest'

// Getting started: four short pages the first time a phone has a character.
// Who you are, your bag, the household, your Reticule. Big Next buttons.
// "Show me around again" on the You tab brings it back any time.

export default function Welcome({ uid, session, content, ui, onDone }) {
  const [page, setPage] = useState(0)
  const character = characterById(content, session.characterId)
  const done = () => { writeNotes(uid, { seen: { welcome: true } }).catch(() => {}); onDone?.() }
  const pages = [
    {
      title: 'Tonight, you are',
      body: (
        <>
          {character && <CharacterCard character={character} />}
          <p className="moment-text">{bioFor(content, character)}</p>
          <p className="gloss">That is who you are tonight, to everyone, all night. Say it when asked. Your name and job are public; everything else is yours.</p>
        </>
      ),
    },
    {
      title: 'Your bag',
      body: (
        <>
          {session.bag ? <p className="bag-big">{session.bag}</p> : <p className="moment-text">The host will hand you one.</p>}
          <p className="moment-text">Collect the bag with this number. Six ordinary things inside. You may look in your own. Keep it closed unless someone asks you to open it.</p>
        </>
      ),
    },
    {
      title: 'The household',
      body: (
        <>
          <ul className="household panel">
            {CATS.map(c => (
              <li key={c.key}>
                <CatFace cat={c.key} name={c.name} size="l" />
                <span className="household-who">
                  <strong>{c.name}</strong>
                  <span className="tag">{c.tag}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="gloss">They talk. Nobody mentions it. Sir Irwin never lies. The others each have their way. How each one feels about you is on the Cats tab.</p>
        </>
      ),
    },
    {
      title: 'Your Reticule',
      body: (
        <>
          <p className="moment-text">{ui.RETICULE}</p>
          <dl className="tabs-explained panel">
            <dt>Now</dt><dd>What to do at this moment.</dd>
            <dt>You</dt><dd>Your character and your bag.</dd>
            <dt>Clues</dt><dd>Everything you have been told.</dd>
            <dt>Motives</dt><dd>Nineteen reasons. Cross them off.</dd>
            <dt>Cats</dt><dd>The household, and how each one feels about you.</dd>
            <dt>Rules</dt><dd>The rules, any time.</dd>
          </dl>
          <p className="gloss">Nothing on your phone can be sent to another phone. Share with your mouth.</p>
        </>
      ),
    },
  ]
  const p = pages[page]
  const last = page === pages.length - 1
  return (
    <div className="moment welcome papered">
      {page === 0 && <Seal />}
      <p className="crest">{page + 1} of {pages.length}</p>
      <h1 className="ask">{p.title}</h1>
      <div className="welcome-body">{p.body}</div>
      <div className="host-row welcome-nav">
        {page > 0 && <button className="quiet" onClick={() => setPage(page - 1)}>Back</button>}
        <button className="big" onClick={() => (last ? done() : setPage(page + 1))}>{last ? 'Begin' : 'Next'}</button>
      </div>
      {!last && <button className="quiet skip" onClick={done}>Skip for now</button>}
    </div>
  )
}
