import { useState } from 'react'
import Join from './screens/Join'
import Rest from './screens/Rest'
import { Dark, Moment, Blackout, Prompt } from './screens/Moments'
import { uiLines } from './lib/content'
import motivesSeed from '../../seed/motives.json'
import charactersSeed from '../../seed/characters.json'
import Relay, { RelayDone } from './screens/Relay'
import { generateSet } from '../../functions/lib/relay-gen.js'

// Design preview only: /play/?preview=<screen> renders a screen with sample
// data and no night. Nothing here is dealt by the game, nothing is sealed.
// Screens: doors, join, rest, host, prompt, paused, blackout.

// a fixed moment, like a real server timestamp — not Date.now() on every read
const PHASE_AT = Date.now()

const NIGHT = {
  nightId: 'preview', act: 2, phase: 'act', joinOpen: true,
  hosts: { jonathan: { name: 'Jon', key: 'jon' }, susan: { name: 'Susan', key: 'susan' } },
  roster: { jon: { name: 'Jon', characterId: 'prof-jonathan', bag: 3 }, jessa: { name: 'Jessa', characterId: 'rye', bag: 6 } },
  phaseAt: { toMillis: () => PHASE_AT },
}
const SESSION = { nightId: 'preview', guestKey: 'jessa', guestName: 'Jessa', characterId: 'rye', bag: 6, status: 'active', affection: { irwin: 5, granolia: 4, boo: 2, zimothy: 3, salem: 4 } }
const CONTENT = {
  motives: motivesSeed.motives,
  characters: charactersSeed.characters.map(({ id, name, profession, gender, bio }) => ({ id, name, profession, gender, bio })),
  smalltalk: [{ cat: 'salem', text: 'Mind the hydrangeas. Somebody has already not minded them.' }],
  act_scripts: [{ act: 'act2', text: 'OBJECTIVE: Your phone will tell you where to go. Everything you learn now is for your ears only.' }],
}

// Relay previews: a throwaway set from a fixed seed, as the public doc would carry it.
const SET = generateSet(2026)
const stamp = (ms) => ({ toMillis: () => ms })
function relayDoc(state) {
  const g = SET.grids[0]
  const base = { state, grid: 1, gridSize: 3, gridTurns: 9, gridDone: ['A1', 'C2'], turnIndex: 2, turnsTotal: 35,
    drawerKey: 'jessa', drawerName: 'Jessa', nextKey: 'jon', nextName: 'Jon', votesIn: 2, votesNeeded: 4, crossed: [], lastResult: null,
    startedAt: stamp(PHASE_AT), doorOpen: state === 'done' }
  if (state === 'turn') return { ...base, cell: { label: g.order[2], strokes: g.cells[g.order[2]] }, turnEndsAt: stamp(Date.now() + 8000) }
  if (state === 'walk') return { ...base, walkEndsAt: stamp(Date.now() + 9000) }
  if (state === 'vote') return { ...base, options: g.options.map(cells => ({ size: 3, cells })), voteEndsAt: stamp(Date.now() + 40000) }
  if (state === 'lockout') return { ...base, options: g.options.map(cells => ({ size: 3, cells })), crossed: [1], lastResult: 'wrong', lockoutEndsAt: stamp(Date.now() + 9000) }
  return base
}

export default function Preview({ screen }) {
  const ui = uiLines(CONTENT)
  const [act, setAct] = useState(NIGHT.act)
  const night = { ...NIGHT, act }
  const serverNow = () => Date.now()
  switch (screen) {
    case 'doors': return <Moment text={ui.DOORS} crest />
    case 'relay-walk': return <Relay uid="preview" night={night} session={{ ...SESSION, guestKey: 'jon' }} relay={relayDoc('walk')} serverNow={serverNow} />
    case 'relay-turn': return <Relay uid="preview" night={night} session={{ ...SESSION, guestKey: 'jon' }} relay={relayDoc('turn')} serverNow={serverNow} />
    case 'relay-draw': return <Relay uid="preview" night={night} session={{ ...SESSION, guestKey: 'jessa' }} relay={relayDoc('turn')} serverNow={serverNow} />
    case 'relay-vote': return <Relay uid="preview" night={night} session={SESSION} relay={relayDoc('vote')} serverNow={serverNow} />
    case 'relay-lockout': return <Relay uid="preview" night={night} session={SESSION} relay={relayDoc('lockout')} serverNow={serverNow} />
    case 'relay-done': return <RelayDone uid="preview" relay={relayDoc('done')} seenKey="x" />
    case 'join': return <Join night={night} ui={ui} />
    case 'paused': return <Moment text={ui.PAUSED} crest />
    case 'blackout': return <Blackout />
    case 'prompt': return <Prompt uid="preview" night={night} ui={ui} serverNow={serverNow} promptKey="prompt-2" />
    case 'host': return <Rest uid="preview" night={night} session={{ ...SESSION, guestKey: 'jon', characterId: 'prof-jonathan', bag: 3, host: 'jonathan' }} content={CONTENT} notes={null} ui={ui} />
    case 'lobby': return <Rest uid="preview" night={{ ...night, act: 0, phase: 'lobby' }} session={SESSION} content={CONTENT} notes={null} ui={ui} />
    case 'rest':
    default:
      return (
        <>
          <Rest uid="preview" night={night} session={{ ...SESSION, characterId: previewCharacter() || SESSION.characterId }} content={CONTENT} notes={null} ui={ui} />
          <button className="preview-act" onClick={() => setAct(a => (a % 7) + 1)} title="Next act (preview only)">act {act} ▸</button>
        </>
      )
  }
}

// /play/?preview=rest&character=leech shows that character's card instead.
function previewCharacter() {
  try { return new URLSearchParams(window.location.search).get('character') } catch { return null }
}

export function previewScreen() {
  try { return new URLSearchParams(window.location.search).get('preview') } catch { return null }
}
