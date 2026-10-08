import { useState } from 'react'
import Join from './screens/Join'
import Rest from './screens/Rest'
import { Dark, Moment, Blackout, Prompt } from './screens/Moments'
import { uiLines } from './lib/content'
import motivesSeed from '../../seed/motives.json'
import charactersSeed from '../../seed/characters.json'

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

export default function Preview({ screen }) {
  const ui = uiLines(CONTENT)
  const [act, setAct] = useState(NIGHT.act)
  const night = { ...NIGHT, act }
  const serverNow = () => Date.now()
  switch (screen) {
    case 'doors': return <Moment text={ui.DOORS} crest />
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
          <Rest uid="preview" night={night} session={SESSION} content={CONTENT} notes={null} ui={ui} />
          <button className="preview-act" onClick={() => setAct(a => (a % 7) + 1)} title="Next act (preview only)">act {act} ▸</button>
        </>
      )
  }
}

export function previewScreen() {
  try { return new URLSearchParams(window.location.search).get('preview') } catch { return null }
}
