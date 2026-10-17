import { CATS, POOL_NAMES, ACT_NAMES, CHARACTERS } from '../lib/content'
import { HOUSEHOLD } from '../lib/codecs'

// How a line looks in the game. A small phone (or room screen) drawn from
// the boxes as you type, or from the example when the boxes are empty. It
// is a sketch of the real screen, not the real screen: enough to see where
// the words land and what sits around them.

const catName = (tab) => CATS.find(c => c.key === tab)?.name ?? 'A cat'

function Frame({ kind = 'phone', title, children }) {
  return (
    <div className={kind === 'room' ? 'gp room' : 'gp'}>
      {title && <p className="gp-title">{title}</p>}
      <div className="gp-screen">{children}</div>
    </div>
  )
}

const G = ({ children }) => <span className="gp-grey">{children}</span>

export default function GamePreview({ area, tab, values, example }) {
  const v = {}
  const has = Object.values(values ?? {}).some(x => typeof x === 'string' && x.trim())
  const src = has ? values : example
  for (const [k, val] of Object.entries(src ?? {})) v[k] = String(val ?? '')
  const tag = has ? 'Yours, as you type' : 'The example, in place'
  const body = render(area, tab, v)
  if (!body) return null
  return (
    <div className="gp-wrap">
      <span className="example-tag">{tag}</span>
      {body}
    </div>
  )
}

function render(area, tab, v) {
  switch (area) {
    case 'bios': {
      const job = v.profession || CHARACTERS.find(c => c.name.toLowerCase() === (v.name ?? '').trim().toLowerCase())?.profession
      return (
        <Frame title="The You tab">
          <p className="gp-name">{v.name ? v.name.toUpperCase() : 'NAME'}</p>
          <p className="gp-sub">{job ? `the ${job}` : <G>what they do</G>} · Bag 6</p>
          <p>{v.persona || <G>who they are</G>}</p>
        </Frame>
      )
    }
    case 'npc_cards':
      return (
        <Frame title="The Cats tab, Act 1">
          <p className="gp-name">{HOUSEHOLD.find(h => h.key === v.who)?.name || <G>WHO</G>}</p>
          <p className="gp-sub">{HOUSEHOLD.find(h => h.key === v.who)?.title || <G>their title, filled in for you</G>}</p>
          <p>{v.about || <G>about them</G>}</p>
        </Frame>
      )
    case 'openers':
      return (
        <Frame title={`${catName(tab)} talks to you, Act 2`}>
          <p className="gp-sub">{catName(tab)}</p>
          <p><b>{v.text || <G>your greeting</G>}</b></p>
          <p><G>…the secret middle, written by Claude, lands here: who was seen where, and when…</G></p>
          <p><G>…then a sign-off from the other list.</G></p>
        </Frame>
      )
    case 'closers':
      return (
        <Frame title={`${catName(tab)} talks to you, Act 2`}>
          <p className="gp-sub">{catName(tab)}</p>
          <p><G>A greeting from the other list…</G></p>
          <p><G>…the secret middle, written by Claude, lands here…</G></p>
          <p><b>{v.text || <G>your sign-off</G>}</b></p>
        </Frame>
      )
    case 'refusals':
      return (
        <Frame title={`${catName(tab)} will not talk to you yet`}>
          <p className="gp-sub">{catName(tab)}</p>
          <p><b>{v.text || <G>the brush-off</G>}</b></p>
          <p><G>That is the whole screen.</G></p>
        </Frame>
      )
    case 'smalltalk':
      return (
        <Frame title="A phone at rest, any act">
          <p className="gp-name">PROF. SUSAN KOSTINGTON</p>
          <p className="gp-sub">the Professor · Bag 3</p>
          <p className="gp-pass">{catName(tab)} passes: <b>{v.text || <G>the line</G>}</b></p>
        </Frame>
      )
    case 'status_lines':
      return (
        <Frame title="The Cats tab">
          <p className="gp-sub">{catName(tab)} <span className="chip">{v.label === 'LOCKED' ? 'locked out' : v.label === 'WARMING' ? 'warming up' : v.label === 'IN' ? 'in' : 'standing'}</span></p>
          <p>{v.text || <G>how the cat feels about you</G>}</p>
        </Frame>
      )
    case 'rules_text':
      return (
        <Frame title="The Rules tab">
          <p className="gp-name">{v.title || 'HEADING'}</p>
          <p>{v.body || <G>what it says</G>}</p>
        </Frame>
      )
    case 'ui_copy':
      return (
        <Frame title={`The ${(v.label || 'screen').toLowerCase()} screen`}>
          <p className="gp-sub">Sirwin Manor</p>
          <p><b>{v.text || <G>the line</G>}</b></p>
        </Frame>
      )
    case 'act_scripts':
      return (
        <Frame title="The top of every phone when the act begins">
          <p className="gp-name">{ACT_NAMES[tab] ?? 'The act’s name'}</p>
          <p>{v.text || <G>Where to be and what to do.</G>}</p>
        </Frame>
      )
    case 'role_cards':
      return (
        <Frame title="The blackout, Act 1">
          <p className="gp-sub">{v.label || 'YOUR CARD'}</p>
          <p><b>{v.text || <G>the card</G>}</b></p>
        </Frame>
      )
    case 'pools': {
      const phrase = v.text || <G>{POOL_NAMES[tab] ?? 'the blank'}</G>
      const sentence = {
        room: <>…a figure was heard in <b>{phrase}</b> at teatime…</>,
        time: <>…was seen in the hall at <b>{phrase}</b>…</>,
        duration: <>…it went on for <b>{phrase}</b>, witnessed by the staff…</>,
        count: <>…and this happened <b>{phrase}</b>, by my count…</>,
        place: <>…the same tale was heard at <b>{phrase}</b> in town…</>,
        crowd: <>…witnessed by <b>{phrase}</b>, who said nothing…</>,
      }[tab]
      return (
        <Frame title="Inside a cat’s testimony, Acts 2 and 4">
          <p><G>I’ll be brief. Brevity is free.</G></p>
          <p>{sentence}</p>
          <p><G>That concludes the free portion.</G></p>
        </Frame>
      )
    }
    case 'echo_frames':
      return (
        <Frame kind="room" title="A room screen, after the chime">
          <p className="gp-sub">THE WIRELESS</p>
          <p>{v.before || <G>...before the gap</G>} <span className="gp-gap">the secret part</span> {v.after || <G>after the gap...</G>}</p>
        </Frame>
      )
    case 'epilogue_frames':
      return (
        <Frame kind="room" title="Read aloud at the end of Act 7">
          <p>{(v.text || '').replace(/\[MURDERER\]/g, '(the murderer’s name)').replace(/\[VICTIM\]/g, '(the victim’s name)').replace(/\[MOTIVE_RHYME\]/g, '(the motive rhyme)') || <G>the closing story</G>}</p>
        </Frame>
      )
    case 'bag_items':
      return (
        <Frame title="A clue, later in the night">
          <p>Something in one of the bags <b>{v.sense === 'smell' ? 'smells' : v.sense === 'sound' ? 'sounds' : v.sense === 'touch' ? 'feels' : v.sense === 'taste' ? 'tastes' : v.sense === 'sight' ? 'looks' : <G>smells</G>} {v.property || <G>minty</G>}</b>.</p>
          <p><G>The item itself ({v.item || 'the item'}) is never named. Two or three bags will fit; that is the point.</G></p>
        </Frame>
      )
    case 'study_lines':
      return (
        <Frame kind="room" title="The study screen, Act 4">
          <p className="gp-sub">THE STUDY · {(v.label || 'a moment').toLowerCase()}</p>
          <p><b>{v.text || <G>what Granolia says</G>}</b></p>
        </Frame>
      )
    case 'station_text':
      return (
        <Frame title="A station card, Act 4">
          <p className="gp-sub">Station · {v.label === 'STUDY' ? 'The study' : v.label === 'CAT' ? 'A cat' : v.label === 'BAGS' ? 'The bags' : v.label === 'PUZZLE' ? 'A small puzzle' : v.label === 'CHECKIN' ? 'Check-in' : 'which one'}</p>
          <p>{(v.text || '').split('[CAT]').join('Miss Boo LaRue').split('[PROPERTY]').join('minty').split('[COUNT]').join('two') || <G>the line</G>}</p>
        </Frame>
      )
    case 'trace_lines':
      return (
        <Frame kind="room" title="The bedroom screen, Act 6">
          <p className="gp-sub">WHAT WAS LEFT BEHIND</p>
          <p><b>{v.text || <G>the line</G>}</b></p>
        </Frame>
      )
    case 'lore':
    case 'ops_docs':
      return (
        <Frame title={area === 'lore' ? 'Quoted on a screen' : 'Your own notes, never on a phone'}>
          <p className="gp-name">{v.label || 'TITLE'}</p>
          <p>{v.text || <G>the paragraph</G>}</p>
        </Frame>
      )
    default:
      return null
  }
}
