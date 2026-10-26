import portraitFitData from './portrait-fit.json' with { type: 'json' }

// Fixed copy and the helpers that prefer Jon's workshop lines when they exist.
// Everything here is safe content. Defaults keep every screen readable before
// the workshop lists are filled in.

export const ACTS = {
  1: { name: 'The Invitation', plain: 'Welcome' },
  2: { name: 'Lights Out', plain: 'First investigation' },
  3: { name: 'Supper Is Served', plain: 'Dinner' },
  4: { name: 'Behind Closed Doors', plain: 'Four rooms' },
  5: { name: 'One Candle', plain: 'Dessert' },
  6: { name: 'The Final Hour', plain: 'The Big Solve' },
  7: { name: 'Unmasked', plain: 'The Reveal' },
}

export const CATS = [
  { key: 'irwin', name: 'Sir Irwin', tag: 'the dog', blurb: 'The birthday boy. Never lies. Only one year old, so he knows less than he thinks. If Irwin and anyone disagree, Irwin is right.' },
  { key: 'granolia', name: 'Granolia Lickspittle', tag: 'taken in by the family when no one else would', blurb: 'Lives alone in the study. Honest, and forgetful: what she tells you is true, though she may forget part of it, and she is cheerfully confident about all of it.' },
  { key: 'boo', name: 'Miss Boo LaRue', tag: 'family friend and socialite', blurb: 'Not staff. Guarded, not snobbish. In Act 2 she only speaks to people she has decided about; in Act 4 she talks to every group.' },
  { key: 'zimothy', name: 'Zimothy Clawford, Esq.', tag: 'the old family solicitor', blurb: 'Accurate and rationed. Openly transactional. Where money is involved, he shades it.' },
  { key: 'salem', name: 'Salem Crooknog', tag: 'the long-time groundskeeper', blurb: 'Been here longer than anyone, which is why nobody questions him when he is wrong. Confidently backwards more often than not.' },
]

export const DEFAULT_UI = {
  DOORS: 'The doors open at four. Make yourself comfortable.',
  JOIN: 'Who are you?',
  'JOIN BUTTON': 'That’s me',
  'JOIN AGAIN': 'Back on a new phone? Tap your name and your character follows.',
  LOBBY: 'The doors are open. Drinks are in the parlour. The game will find you when it starts.',
  BAG: 'Collect bag number',
  OFFLINE: 'The Manor cannot hear your phone. Stay where you are. It will reconnect on its own, and nothing is lost.',
  PAUSED: 'Sir Irwin requires the garden. Back shortly.',
  SUPERSEDED: 'This character has moved to another phone. Tap your name to bring it back here, or type another name to join as someone else.',
  POWER: 'The power is back. Keep your eyes on your own phone.',
  // The one button after the blackout (Jon's cue list, cue 5, 25 Oct 2026); the role card follows it for fifteen seconds, then the main page on its own.
  CONTINUE: 'Sorry for the interruption, continue here',
  // Shown in the card's place on a phone that has no role card yet (a late arrival): the same shape as everyone else's screen.
  ORIENT: 'The power is back. The Manor has lost someone tonight. Nobody has noticed, and nobody knows why. Walk, talk, and play on.',
  'PAUSED BY HOST': 'Paused by the host. Nothing on this phone can run out. It carries on when the host says.',
  'YOUR ROLE': 'Your role',
  'SHOW ROLE': 'Show me my card',
  'HIDE ROLE': 'Put it away',
  'NOT FOR YOU': 'Not for you. This page is for the hosts.',
  // HIDE and HOLD were the role prompt's hide button and its hold line until 25 Oct 2026 (the card now
  // leaves on its own). Kept so a workshop line under either label still reads; nothing on the phone shows them.
  HIDE: 'Hide this',
  HOLD: 'Keep reading',
  RETICULE: 'Your Reticule: a small drawstring bag for everything you carry tonight.',
  'START NIGHT': 'Host? Start the night',
  HOST: 'You are a host. The buttons under Host run the night for every phone.',
  // The five stops of the Cats tab slider, low to high, comma-separated (Jon, 13 Oct 2026).
  STOPS: 'Cold shoulder, Wary, Undecided, Fond, Devoted',
}

export const DEFAULT_RULES = [
  { title: 'What we are doing tonight', body: 'There has been a murderwin. Our job is to name three things: who did it, why, and who died. The murderer and the victim are both playing alongside us: the victim as the Ghost, the murderer trying to steer us away from the truth.' },
  { title: 'The three roles', body: 'Most of us are Detectives. One of us is the Murderer: they know they did it, but not why. One of us is the Ghost: they know they are dead, but not who did it. Every role wins the same way: name the murderer, the motive and the victim.' },
  { title: 'The ghost rule', body: 'One of us died tonight. We can all still see them. None of us has noticed. If someone names the Ghost out loud, nothing happens. The Ghost may not confirm it until the end.' },
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

// Granolia's lines on the study screen, by moment: the workshop's
// "MOMENT: line" list over these defaults (18 Oct 2026). The round is ten
// minutes and TIME shows at eight (station/lib/study.js capMs, warnMs).
export const DEFAULT_STUDY_LINES = {
  IDLE: 'Touch any panel to begin. The wall will show you a pattern; touch it back.',
  PLAYING: 'Watch.',
  REPRODUCING: 'Now you. Touch them in the same order.',
  ENTERING: 'Look at the other wall. A colour, and a number of bars. Press them on the button box, then Submit.',
  SLOW: 'Again, slower. I have all day. Well. Ten minutes.',
  MAP: 'Here, I have numbered them for you. Follow the numbers.',
  'HALF COLOUR': 'The number is right, dear. Look at the colour again.',
  'HALF NUMBER': 'The colour is right, dear. Count the bars again.',
  NEITHER: 'Neither half, I am afraid. Look again at both.',
  TIME: 'Two minutes left, dear. Not that I am counting. I am counting.',
  SOLVED: 'Oh, well done. Something has been sent to your phones. Off you go.',
  CAPPED: 'Thank you for trying your best. Here is the rest. Something has been sent to your phones. Off you go.',
}
export function studyLines(content) {
  const out = { ...DEFAULT_STUDY_LINES }
  for (const it of items(content, 'study_lines')) {
    const m = /^([A-Z][A-Z0-9 '&/]*):\s*(.+)$/s.exec(it.text.trim())
    if (m) out[m[1].trim()] = m[2].trim()
  }
  return out
}

// The five Act 4 station cards' lines, as the dealer reads them (the phone
// only shows what it was dealt; this is for the Check page).
export const DEFAULT_STATION_TEXT = {
  STUDY: 'Go up to the study. Touch any panel to begin. Granolia is in there somewhere; she helps. Ten minutes, then out, whatever happened.',
  CAT: 'Find [CAT]. The cat talks to all of you at once.',
  BAGS: 'Something [PROPERTY] is in [COUNT] of the bags in this house. Ask people to open theirs. Narrow it down; nobody is accused here.',
  PUZZLE: 'Watch the four shapes, then tap them back in the same order. Do it together; argue if you must.',
  CHECKIN: 'Sit down together. Read your clues out to each other. Cross off motives.',
}
export function stationText(content) {
  const out = { ...DEFAULT_STATION_TEXT }
  for (const it of items(content, 'station_text')) {
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

// A character's bio: the workshop line that starts with their name, else the
// seed line. A workshop line is "NAME — the Profession. Persona. Costume: …";
// the phone shows the persona only (the profession has its own line, and the
// costume was for dressing up before the night).
export function bioFor(content, character) {
  if (!character) return ''
  const want = plainName(character.name)
  const surname = want.split(' ').pop()
  const lines = items(content, 'bios').map(it => ({ it, head: plainName(it.text.split('—')[0]) })).filter(x => x.head)
  // the full name first; the surname alone only when it names one person (the Kostingtons share theirs)
  let hit = lines.find(x => x.head === want)?.it
  if (!hit) {
    const bySurname = lines.filter(x => x.head.endsWith(surname) || want.endsWith(x.head))
    if (bySurname.length === 1) hit = bySurname[0].it
  }
  if (!hit) return character.bio ?? ''
  let rest = hit.text.split('—').slice(1).join('—').trim()
  const costume = rest.search(/Costume:/i)
  if (costume >= 0) rest = rest.slice(0, costume).trim()
  rest = rest.replace(/^the\s+[^.]+\.\s*/i, '')
  return rest || character.bio || hit.text
}

// A name without its title, punctuation or capitals, for matching lines.
function plainName(name) {
  return String(name ?? '').toLowerCase()
    .replace(/\b(prof|dr|madame|miss|mrs|mr|ms)\.?\s+/g, '')
    .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

// NPC intro cards from the workshop, else the five fixed blurbs. A workshop
// line is saved as "SIR IRWIN — the dog. About them." (the npc codec); the
// phone shows the About exactly as written, since the name and title are
// already on the card.
export function npcCards(content) {
  const written = items(content, 'npc_cards')
  return CATS.map(cat => {
    const first = cat.name.toLowerCase().split(',')[0]
    const hit = written.find(it => it.text.toLowerCase().split('—')[0].includes(first))
    if (!hit) return { ...cat, text: `${cat.name}, ${cat.tag}. ${cat.blurb}` }
    const dash = hit.text.indexOf('—')
    let about = dash >= 0 ? hit.text.slice(dash + 1).trim() : hit.text.trim()
    if (about.toLowerCase().startsWith(cat.tag.toLowerCase())) about = about.slice(cat.tag.length).replace(/^\.?\s*/, '')
    return { ...cat, text: about || hit.text }
  })
}

// The five stop words of the Cats tab, from the workshop's STOPS line or the default.
// What each stop means for you, low to high: how much of its hint a cat
// gives you (the higher the stop, the more it says). Plain words, no numbers.
export const STOP_MEANINGS = [
  'Little or nothing. This cat has not warmed to you yet.',
  'A little, at best. This cat is still deciding about you.',
  'Some of what this cat knows. The next Parlour Game may tip it.',
  'Most of what this cat knows.',
  'Everything this cat knows.',
]

export function stopWords(ui) {
  const words = String(ui?.STOPS ?? DEFAULT_UI.STOPS).split(',').map(w => w.trim()).filter(Boolean)
  return words.length === 5 ? words : DEFAULT_UI.STOPS.split(',').map(w => w.trim())
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

// "MOTIVE 7: what it means" lines from the workshop, by motive number.
export function motiveNotes(content) {
  const out = {}
  for (const it of items(content, 'motive_notes')) {
    const m = /^MOTIVE\s+(\d+):\s*(.+)$/s.exec(it.text.trim())
    if (m) out[Number(m[1])] = m[2].trim()
  }
  return out
}

export function motives(content) {
  return Array.isArray(content?.motives) ? content.motives : []
}

// A portrait dropped into play/public/portraits/<characterId>.png (or .jpg).
export function portraitUrls(characterId) {
  const base = import.meta.env.BASE_URL
  return [`${base}portraits/${characterId}.png`, `${base}portraits/${characterId}.jpg`]
}

// The colour behind each character's card, from the house palette. Six tones
// go round the fourteen characters; change a name here to recolour a card.
const CARD_TONES = {
  white: 'blue', arms: 'red', rye: 'claret', ledger: 'bottle', devine: 'peat', barnes: 'charcoal',
  fume: 'blue', mourningstone: 'red', steeps: 'claret', vayne: 'bottle', shushwell: 'peat', leech: 'charcoal',
  'prof-jonathan': 'blue', 'prof-susan': 'red',
}
export function cardTone(characterId) {
  return CARD_TONES[characterId] || 'blue'
}

// Where the drawing sits inside each portrait file (play/scripts/portrait-fit.py
// measures it). The card uses it to draw every figure the same height, so a
// close-up and a full-length drawing fill the oval alike.
export function portraitFit(characterId) {
  return portraitFitData[characterId] || { top: 0, bottom: 1, left: 0, right: 1 }
}
