import { useEffect, useRef, useState } from 'react'
import { subscribeGame, saveGame } from '../lib/store'
import { keyWordProblem } from '../lib/studyTest'

// The study key word: the study station and the brain each show it to the
// game to be let in. The same doc and field the Host tab's Save key writes
// (meta/game.station_key), saved straight from the workshop so it works with
// no night started. `first` is the Game test tab's top box, shown while no
// word is saved: until one is, the study station cannot connect.

export default function KeyWord({ first = false }) {
  const [game, setGame] = useState(null)
  const [readFailed, setReadFailed] = useState(false)
  const [word, setWord] = useState('')
  const [state, setState] = useState('idle') // idle | saving | saved | error (a save that failed)
  const [showWord, setShowWord] = useState(false)
  const latest = useRef({})
  useEffect(() => subscribeGame(g => { setGame(g); latest.current = g; setReadFailed(false) }, () => setReadFailed(true)), [])
  const problem = keyWordProblem(word)
  const save = (e) => {
    e.preventDefault()
    if (problem) return
    setState('saving')
    saveGame({ station_key: word.trim() }, latest.current)
      .then(() => { setState('saved'); setWord('') })
      .catch(() => setState('error'))
  }
  const saved = String(game?.station_key ?? '').trim()
  const has = Boolean(saved)
  const Heading = first ? 'h2' : 'h3'
  return (
    <section className={first ? 'panel gt-key first' : 'gt-block gt-key'} aria-label="The study key word">
      <Heading>{first ? 'First: save the study key word' : 'The study key word'}</Heading>
      {readFailed && <div className="banner error" role="alert">Cannot read whether a key word is saved. Check your signal, then reload this page.</div>}
      {state === 'error' && <div className="banner error" role="alert">SAVE FAILED. Check your signal and try again.</div>}
      <p className="why">The study station and the brain each show this word to the game to be let in. Save the same word the study Mac and the brain already have. Not sure what it is? Ask Claude Code to save it for you.</p>
      <p className="night-line">{game === null ? (readFailed ? 'Not known: the page could not read it.' : '…') : has ? <b>A study key word is saved.</b> : <b>No study key word is saved yet. The study station cannot connect until one is.</b>}</p>
      {has && (
        <p className="night-line">
          {showWord && <>The saved word is <b className="st-word">{saved}</b>. </>}
          <button type="button" className="ghost" onClick={() => setShowWord(v => !v)}>{showWord ? 'Hide the word' : 'Show the saved word'}</button>
        </p>
      )}
      <form onSubmit={save}>
        <label className="field">
          <span>{has ? 'A new key word (replaces the saved one)' : 'The key word, four letters or more'}</span>
          <input type="text" value={word} onChange={e => { setWord(e.target.value); if (state !== 'saving') setState('idle') }}
            placeholder="study-2026" autoComplete="off" autoCapitalize="none" spellCheck={false} />
        </label>
        <p className="night-line">
          <button className="primary" type="submit" disabled={Boolean(problem) || state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save the key word'}</button>
        </p>
      </form>
      {state === 'saved' && <p className="hint" role="status">Saved. If it is a new word, ask Claude Code to put it on the study Mac and the brain too.</p>}
      <details className="gt-claude">
        <summary>For Claude Code</summary>
        <p className="hint">Saved as meta/game.station_key, the field the Host tab’s Save key writes. It must match STATION_KEY= in station/.env on the Mac that runs the study station and in cues/.env on the brain. Restart both after a change; the station retries within 20 seconds. When Jon asks you to save it, copy STATION_KEY from station/.env into meta/game.station_key with the Admin SDK. Never print the word.</p>
      </details>
    </section>
  )
}
