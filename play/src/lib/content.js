// Fixed copy and the helpers that prefer Jon's workshop lines when they exist.
// Everything here is safe content. Defaults keep every screen readable before
// the workshop lists are filled in.

export const ACTS = {
  1: { name: 'Fur Better or Furse', plain: 'Welcome' },
  2: { name: 'The First Sniff', plain: 'First investigation' },
  3: { name: 'The Repast', plain: 'Dinner' },
  4: { name: 'The Plot Thickens', plain: 'Rotation' },
  5: { name: 'the Entremets', plain: 'Dessert' },
  6: { name: 'Paws for Thought', plain: 'The Big Solve' },
  7: { name: 'Who Let the Dog Out', plain: 'The Reveal' },
}

export const CATS = [
  { key: 'irwin', name: 'Sir Irwin', tag: 'the dog', blurb: 'The birthday boy. Never lies. Only one year old, so he knows less than he thinks. If Irwin and anyone disagree, Irwin is right.' },
  { key: 'granolia', name: 'Granolia Lickspittle', tag: 'taken in when no one else would', blurb: 'Lives alone in the study. Honest, and forgetful: what she tells you is true except for one detail, and she is cheerfully confident about all of it.' },
  { key: 'boo', name: 'Miss Boo LaRue', tag: 'family friend and socialite', blurb: 'Not staff. Guarded, not snobbish. She only speaks to people she has decided about, and then only five words.' },
  { key: 'zimothy', name: 'Zimothy Clawford, Esq.', tag: 'the old family solicitor', blurb: 'Accurate and rationed. Openly transactional. Where money is involved, he shades it.' },
  { key: 'salem', name: 'Salem Crookshank', tag: 'the long-time groundskeeper', blurb: 'Been here longer than anyone, which is why nobody questions him when he is wrong. Confidently backwards more often than not.' },
]

export const DEFAULT_UI = {
  DOORS: 'The doors open at four. Make yourself comfortable.',
  JOIN: 'Who are you?',
  'JOIN BUTTON': 'That’s me',
  'JOIN AGAIN': 'Back on a new phone? Tap your name and your character follows.',
  LOBBY: 'The doors are open. Drinks are in the parlour. The game will find you when it starts.',
  BAG: 'Collect bag number',
  OFFLINE: 'The Manor cannot hear your phone. Stay where you are — it will reconnect on its own. Nothing is lost.',
  PAUSED: 'Sir Irwin requires the garden. Back shortly.',
  SUPERSEDED: 'This character has moved to another phone. If that was not you, find the host.',
  POWER: 'The power is back. Keep your eyes on your own phone. Read, then hide this when you are ready.',
  HIDE: 'Hide this',
  HOLD: 'Keep reading',
  RETICULE: 'Your Reticule — a small drawstring bag for everything you carry tonight.',
  'START NIGHT': 'Host? Start the night',
  HOST: 'You are a host. The buttons under Host run the night for every phone.',
}

export const DEFAULT_RULES = [
  { title: 'What we are doing tonight', body: 'There has been a murderwin. Our job is to name three things: who did it, why, and who died. The murderer and the victim are both playing alongside us — the victim as the Ghost, the murderer trying to steer us away from the truth.' },
  { title: 'The three roles', body: 'Most of us are Detectives. One of us is the Murderer: they know they did it, but not why. One of us is the Ghost: they know they are dead, but not who did it. Every role wins the same way — name the murderer, the motive and the victim.' },
  { title: 'The ghost rule', body: 'One of us died tonight. We can all still see them. None of us has noticed. If someone names the Ghost out loud, nothing happens — the Ghost may not confirm it until the end.' },
  { title: 'The cats', body: 'The household talks. Sir Irwin never lies. If Irwin and anyone else disagree, Irwin is right. Your business with the cats is yours.' },
  { title: 'Share with your mouth', body: 'Nothing you learn can be sent from phone to phone. Tell people out loud, argue, and lie if you must.' },
  { title: 'Eyes on your own paper', body: 'When every phone lights up at once, read your own. Some screens hold for a moment before they can be hidden. That is normal.' },
  { title: 'Your phone', body: 'Your own phone, all night, no sharing. Turn auto-lock off for the evening if you can. If it dies, tap your name on any spare phone and your character comes with you.' },
  { title: 'The chime means quiet', body: 'When the chime sounds, look up. Something is about to happen in that room.' },
]

export const DEFAULT_STATUS = {
  IN: { irwin: 'Sir Irwin adores you. He adores everyone.', granolia: 'Granolia has decided you are a learner. She will tell you everything.', boo: 'Miss Boo has decided about you, and in your favour.', zimothy: 'Mr. Clawford finds you a person of standing.', salem: 'Salem reckons you have done an honest day’s work.' },
  WARMING: { irwin: 'Sir Irwin adores you.', granolia: 'Granolia likes you well enough. She may forget your name.', boo: 'Miss Boo is still deciding about you.', zimothy: 'Mr. Clawford will see you, briefly.', salem: 'Salem tolerates you.' },
  LOCKED: { irwin: 'Sir Irwin adores you.', granolia: 'Granolia has not placed you yet.', boo: 'Miss Boo looks through you.', zimothy: 'Mr. Clawford’s door is closed to you.', salem: 'Salem has no time for the likes of you.' },
}

function items(content, area) {
  return Array.isArray(content?.[area]) ? content[area] : []
}

// "LABEL: text" lines from the workshop's UI copy list.
export function uiLines(content) {
  const out = { ...DEFAULT_UI }
  for (const it of items(content, 'ui_copy')) {
    const m = /^([A-Z][A-Z0-9 '&/]*):\s*(.+)$/s.exec(it.text.trim())
    if (m) out[m[1].trim()] = m[2].trim()
  }
  return out
}

// "SECTION TITLE — body" lines from the rulebook list.
export function rules(content) {
  const list = items(content, 'rules_text').map(it => {
    const [title, ...rest] = it.text.split('—')
    return rest.length ? { title: title.trim(), body: rest.join('—').trim() } : { title: '', body: it.text.trim() }
  })
  return list.length ? list : DEFAULT_RULES
}

// Act script lines tagged by act: BANNER: / OBJECTIVE: / BEATS:
export function actScript(content, act) {
  const out = { banner: ACTS[act]?.name ?? '', objective: '', beats: '' }
  for (const it of items(content, 'act_scripts')) {
    if (it.act !== `act${act}`) continue
    const m = /^(BANNER|OBJECTIVE|BEATS):\s*(.+)$/s.exec(it.text.trim())
    if (m) out[m[1].toLowerCase()] = m[2].trim()
  }
  return out
}

// A character's bio: the workshop line that starts with their name, else the seed line.
export function bioFor(content, character) {
  if (!character) return ''
  const name = character.name.toLowerCase()
  const hit = items(content, 'bios').find(it => it.text.toLowerCase().startsWith(name))
  if (!hit) return character.bio ?? ''
  const rest = hit.text.split('—').slice(1).join('—').trim()
  return rest || hit.text
}

// NPC intro cards from the workshop, else the five fixed blurbs.
export function npcCards(content) {
  const written = items(content, 'npc_cards')
  return CATS.map(cat => {
    const hit = written.find(it => it.text.toLowerCase().includes(cat.name.toLowerCase().split(',')[0]))
    return { ...cat, text: hit ? hit.text : `${cat.name} — ${cat.tag}. ${cat.blurb}` }
  })
}

export function affectionBand(level) {
  if (level >= 4) return 'IN'
  if (level === 3) return 'WARMING'
  return 'LOCKED'
}

// How a cat stands with you, in words: the workshop's status line for that
// band and cat if one exists, else the default. Numbers never show.
export function statusLine(content, catKey, level) {
  const band = affectionBand(level)
  const pool = items(content, 'status_lines')
    .filter(it => it.cat === catKey && it.text.startsWith(`${band}:`))
  if (pool.length) return pool[Math.floor(Math.random() * pool.length)].text.slice(band.length + 1).trim()
  return DEFAULT_STATUS[band][catKey]
}

// One idle line from a wandering cat, or nothing if none are written.
export function smalltalk(content) {
  const pool = items(content, 'smalltalk').filter(it => it.cat)
  if (!pool.length) return null
  const it = pool[Math.floor(Math.random() * pool.length)]
  const cat = CATS.find(c => c.key === it.cat)
  return cat ? { cat, text: it.text } : null
}

export function characterById(content, id) {
  return (content?.characters ?? []).find(c => c.id === id) ?? null
}

export function motives(content) {
  return Array.isArray(content?.motives) ? content.motives : []
}

// A portrait dropped into play/public/portraits/<characterId>.png (or .jpg).
export function portraitUrls(characterId) {
  const base = import.meta.env.BASE_URL
  return [`${base}portraits/${characterId}.png`, `${base}portraits/${characterId}.jpg`]
}
