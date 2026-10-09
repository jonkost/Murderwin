import seed from '../../../seed/safe-content.json'

export const CATS = [
  { key: 'irwin', name: 'Sir Irwin', tag: 'the dog' },
  { key: 'salem', name: 'Salem Crookshank', tag: 'the long-time groundskeeper' },
  { key: 'zimothy', name: 'Zimothy Clawford, Esq.', tag: 'the old family solicitor' },
  { key: 'boo', name: 'Miss Boo LaRue', tag: 'family friend and socialite' },
  { key: 'granolia', name: 'Granolia Lickspittle', tag: 'the charity case' },
]

export const POOLS = ['room', 'time', 'duration', 'count', 'place', 'crowd']

export const ACTS = ['act1', 'act2', 'act3', 'act4', 'act5', 'act6', 'act7']

export const TAB_KINDS = {
  cats: { list: CATS.map(c => c.key), field: 'cat', label: k => CATS.find(c => c.key === k).name },
  pools: { list: POOLS, field: 'pool', label: k => k },
  acts: { list: ACTS, field: 'act', label: k => `Act ${k.slice(3)}` },
}

export const AREAS = {
  // Every area gets a plain name and one sentence saying what it is for.
  // `form` splits a line into two labelled fields on screen (the saved text
  // stays one line, joined by `sep`, so nothing already written changes).
  // `hidden` areas live under "Everything else" on the home page.

  // — The characters —
  bios: { add: "Add one character: their name, then what they do, then a line or two about how they act, then what to wear.", label: 'The fourteen characters', why: 'One line each guest reads about who they are tonight. Name, then the profession, then a line or two, then what to wear.', group: 'The characters', tabs: null, guide: 'bio', goal: 14,
    fields: ['name', 'profession', 'persona', 'costume'] },

  // — The household —
  npc_cards: { add: "Add a short introduction to one of the cats or Sir Irwin, the way a guest would meet them in Act 1.", label: 'Meet the household', why: 'A short introduction to each cat and to Sir Irwin, shown to everyone in Act 1.', group: 'The household', tabs: null, guide: 'npc_card', goal: 5 },
  openers: { add: "Add one thing this cat says first, before it tells a guest anything.", label: 'How each cat starts talking', why: 'The first thing a cat says when a guest comes to it. The secret middle is written by Claude; you write the greeting.', group: 'The household', tabs: 'cats', guide: 'opener', goalPerTab: 8 },
  closers: { add: "Add one thing this cat says last, after it has told what it knows.", label: 'How each cat finishes', why: 'The last thing a cat says after it has told what it knows.', group: 'The household', tabs: 'cats', guide: 'closer', goalPerTab: 8 },
  refusals: { add: "Add one thing this cat says when it will not talk to a guest. Funny, and it gives nothing away.", label: 'How each cat brushes you off', why: 'What a cat says when it will not talk to this guest. Funny, in character, and it gives nothing away.', group: 'The household', tabs: 'cats', guide: 'refusal', goalPerTab: 8 },
  smalltalk: { add: "Add one line this cat mutters as it wanders past a phone doing nothing. Never about the case.", label: 'Idle chatter', why: 'A line a cat mutters as it wanders past a phone that is doing nothing. Never about the case.', group: 'The household', tabs: 'cats', guide: 'smalltalk', goalPerTab: 8 },
  status_lines: { add: "Add one line that tells a guest how this cat feels about them, for locked out, warming up, or in.", label: 'How a cat feels about you', why: 'The phone never shows a number for affection. It shows one of these lines instead: locked out, warming up, or in.', group: 'The household', tabs: 'cats', guide: 'status_line', goalPerTab: 3,
    form: { sep: ': ', a: 'Standing', b: 'The line', options: ['LOCKED', 'WARMING', 'IN'] } },
  trailoffs: { add: "Add one way Granolia loses her thread mid-sentence.", label: 'Granolia trail-offs', why: 'Rarely needed now that Granolia misremembers instead of trailing off.', group: 'The household', tabs: null, guide: 'trailoff', goal: 8, hidden: true },

  // — Words on the phones —
  rules_text: { add: "Add one rule as a guest reads it on their phone: a heading, then a short paragraph.", label: 'The rules, section by section', why: 'What the Rules tab on every phone says. A heading and a short paragraph each.', group: 'Words on the phones', tabs: null, guide: 'rules', goal: 10,
    form: { sep: ' — ', a: 'Heading', b: 'What it says' } },
  ui_copy: { add: "Add one fixed line the phone shows: where it shows, then the words.", label: 'Little lines the phone says', why: 'The fixed words on screens: the door, the lobby, no signal, paused. Say where it shows, then the line.', group: 'Words on the phones', tabs: null, guide: 'ui_copy', goal: 24,
    form: { sep: ': ', a: 'Where it shows', b: 'The line', options: ['JOIN', 'JOIN BUTTON', 'JOIN AGAIN', 'DOORS', 'LOBBY', 'BAG', 'OFFLINE', 'PAUSED', 'SUPERSEDED', 'POWER', 'HIDE', 'HOLD', 'RETICULE', 'START NIGHT', 'HOST'] } },
  act_scripts: { add: "Add the banner, the one-line objective, or the beats for this act.", label: 'Act banners', why: 'The title line and one sentence of purpose shown at the top of every phone during each act.', group: 'Words on the phones', tabs: 'acts', guide: 'act_script', goalPerTab: 3,
    form: { sep: ': ', a: 'Kind', b: 'The line', options: ['BANNER', 'OBJECTIVE', 'BEATS'] } },
  filler: { add: "Add something an ordinary phone shows while the two secret roles choose. End with the button text.", label: 'Something to read while others choose', why: 'What an ordinary phone shows while the Murderer and the Ghost secretly pick an event. Ends with a button so it takes as long as a real choice.', group: 'Words on the phones', tabs: null, guide: 'filler', goal: 20 },
  role_cards: { add: "Add what one role is told when the power comes back. Same length and shape for all three.", label: 'Role cards', why: 'What the Murderer, the Ghost and a Detective are told when the power comes back. Same length and shape for all three.', group: 'Words on the phones', tabs: null, guide: 'role_card', goal: 6,
    form: { sep: ': ', a: 'Role', b: 'The card', options: ['MURDERER', 'GHOST', 'DETECTIVE'] } },
  event_cards: { add: "Add a note about an event. The real copy is written blind by Claude.", label: 'Event cards', why: 'Event copy is written blind by Claude; this list is only for notes.', group: 'Words on the phones', tabs: null, guide: 'event_card', goal: 12, hidden: true },
  lore: { add: "Add one piece of house history a curious guest might read.", label: 'House history', why: 'Optional texture about Sirwin Manor for guests who want to read more.', group: 'Words on the phones', tabs: null, guide: 'lore', goal: 4, hidden: true },

  // — Blanks and frames —
  pools: { add: "Add one short phrase that can fill a blank in a cat's line. Lowercase, no full stop.", label: 'Blanks: rooms, times, counts…', why: 'Cat lines have blanks like [ROOM]. These lists fill them. Short phrases, lowercase.', group: 'Blanks and frames', tabs: 'pools', goalPerTab: 10 },
  echo_frames: { add: "Add one news or radio wrapper with exactly one ███ gap for the secret part.", label: 'News frames', why: 'A radio or newspaper wrapper with one ███ gap. The gap is filled with a secret fragment on the night.', group: 'Blanks and frames', tabs: null, guide: 'echo_frame', goal: 8 },
  templates: { add: "Tick a stationery design when it is drawn, and attach a reference picture.", label: 'Stationery designs', why: 'The seven blank documents (receipt, telegram…) that get secret text printed on them live.', group: 'Blanks and frames', tabs: null, guide: 'template', goal: 7 },
  epilogue_frames: { add: "Add a closing paragraph for the reveal with [MURDERER], [VICTIM] and [MOTIVE_RHYME] blanks.", label: 'Epilogue frames', why: 'The closing paragraph at the reveal, with blanks for the names.', group: 'Blanks and frames', tabs: null, guide: 'epilogue_frame', goal: 2, hidden: true },

  // — The bags —
  bag_items: { add: "Add one thing that could go in a bag: the item, then the one sense it stands out to.", label: 'Things in the bags', why: 'Every item you might put in a bag, with the one sense it stands out to. The game decides the packing without you.', group: 'The bags', tabs: null, guide: 'bag_item', goal: 60,
    form: { sep: ' — ', a: 'Item', b: 'sense: property (smell: minty)' } },

  // — Everything else —
  ops_docs: { add: "Add a note to yourself for the night.", label: 'Host notes', why: 'Notes to yourself for the night.', group: 'Everything else', tabs: null, guide: 'ops_doc', goal: 12, hidden: true,
    form: { sep: ': ', a: 'Label', b: 'Note' } },
  art_assets: { add: "Tick a picture when it is made.", label: 'Pictures', why: 'A checklist of pictures still to make.', group: 'Everything else', tabs: null, guide: 'art_asset', checklist: true, upload: 'image', hidden: true },
  av_assets: { add: "Tick a sound when it is made.", label: 'Sounds', why: 'A checklist of sounds still to make.', group: 'Everything else', tabs: null, guide: 'av_asset', checklist: true, upload: 'audio', hidden: true },
}

export const AREA_GROUPS = ['The characters', 'The household', 'Words on the phones', 'Blanks and frames', 'The bags']

// One sentence under each group heading on the home page.
export const GROUP_WHY = {
  'The characters': 'Who the guests become. The game deals these at random on the night.',
  'The household': 'The four cats and Sir Irwin. You write their manners; Claude writes their secrets.',
  'Words on the phones': 'Everything a phone says that no character is speaking.',
  'Blanks and frames': 'The pieces the secret content is poured into.',
  'The bags': 'The one physical part of the night.',
}

const ART_ASSET_SEED = [
  'Portrait — Sir Irwin', 'Portrait — Salem Crookshank', 'Portrait — Zimothy Clawford',
  'Portrait — Miss Boo LaRue', 'Portrait — Granolia Lickspittle',
  'Sirwin Manor crest / wax seal (splash + mourning card)',
  'Kiosk chrome — cat encounter state', 'Kiosk chrome — echo broadcast state', 'Kiosk chrome — idle state',
  'Reveal screen — Murderer', 'Reveal screen — Motive', 'Reveal screen — Victim',
  'Act title cards ×7 (big screen)', 'Player character avatars (~10)',
  'Calling-card phone layout', 'QR join placard + Wi-Fi sign', 'Victorian menu card (refreshments)',
]

const AV_ASSET_SEED = [
  'Chimes (clock / door)', 'Fireplace crackle', 'Thunder / storm layer', 'Manor room tone',
  'Blackout sting (power-cut)', 'Phone buzz / flash pattern spec',
  'Act stingers ×7', 'Reveal fanfares ×3', 'Echo broadcast bed (static, tuning)',
  'Big-screen ambience loop', 'Playlist — arrival', 'Playlist — investigation acts',
  'Playlist — pre-reveal + celebration',
]

export const GUIDES = seed.guides

// Live syntax lint — one high-signal warning per line, shown while typing.
// Mirrors the format rules stated in each area's field guide.
const VOICE_AREAS = ['openers', 'closers', 'smalltalk', 'refusals', 'trailoffs', 'status_lines']
const CAPS_PREFIX = /^[A-Z][A-Z0-9 '&/]*:\s/

export function lintItem(area, text) {
  if (!text?.trim()) return null
  if (VOICE_AREAS.includes(area)) {
    if (/\b(meow|meows|meowed|purr|purrs|purring|hiss|hisses|woof|barks?|barked)\b/i.test(text)) {
      return 'No animal sounds — they just talk.'
    }
    if (/\[[A-Za-z_]+\]/.test(text)) return 'Voice lines never have square-bracket blanks like [ROOM].'
    if (/talking (cat|dog|animal)|(cat|dog|animal)s? (can|could) talk/i.test(text)) {
      return 'Never lampshade the talking.'
    }
    if (area === 'status_lines' && !/^(LOCKED|WARMING|IN):\s/.test(text)) {
      return 'Start with LOCKED: / WARMING: / IN:'
    }
    return null
  }
  switch (area) {
    case 'pools':
      if (/\.\s*$/.test(text)) return 'Pool items are phrases, not sentences — drop the period.'
      if (/^[A-Z]/.test(text)) return 'Start lowercase — the kernel sentence carries the capital (proper names inside are fine).'
      return null
    case 'echo_frames': {
      const n = (text.match(/█+/g) ?? []).length
      if (n !== 1) return 'An echo frame needs exactly one ███ slot.'
      if (!/^(\.\.\.|…)/.test(text) || /(\.\.\.|…)$/.test(text) === false) {
        return 'Convention: start and end with "..." — we join the broadcast mid-sentence.'
      }
      return null
    }
    case 'epilogue_frames': {
      const missing = ['[MURDERER]', '[VICTIM]', '[MOTIVE_RHYME]'].filter(t => !text.includes(t))
      return missing.length ? `Missing slot${missing.length > 1 ? 's' : ''}: ${missing.join(' ')}` : null
    }
    case 'ui_copy':
    case 'ops_docs':
    case 'lore':
    case 'role_cards':
      return CAPS_PREFIX.test(text) ? null : 'Start with a CAPS label and colon — e.g. "BALLOT: …"'
    case 'act_scripts':
      return /^(BANNER|OBJECTIVE|BEATS):\s/.test(text) ? null : 'Start with BANNER: / OBJECTIVE: / BEATS:'
    case 'event_cards':
      return /—/.test(text) ? null : 'Format: NAME (Acts) — plain effect line.'
    case 'rules_text':
      return /—/.test(text) ? null : 'Format: SECTION TITLE — body.'
    case 'bag_items':
      return /—\s*(sight|sound|smell|touch|taste)\s*:\s*\S/i.test(text)
        ? null : 'Format: Item — sense: property (e.g. “Mint tea bag — smell: minty”)'
    case 'filler': {
      if (!/\sButton:\s*\S/.test(text)) return 'End with “Button: …” — every filler message needs something to tap.'
      const words = text.split('Button:')[0].trim().split(/\s+/).length
      if (words < 25) return `Only ${words} words before the button — aim for 25–50 so it takes as long as a real choice.`
      return null
    }
    case 'bios':
      return /—/.test(text) ? null : 'Format: NAME — the Profession. Persona… Costume: …'
    default:
      return null
  }
}

let counter = 0
function newId() {
  counter += 1
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`
}

function checklistItems(names) {
  return names.map((text, i) => ({ id: newId(), text, done: false, deleted: false, order: i }))
}

export function assetDocs() {
  return {
    art_assets: { items: checklistItems(ART_ASSET_SEED) },
    av_assets: { items: checklistItems(AV_ASSET_SEED) },
  }
}

// Transform seed/safe-content.json into the safe_content/{area} docs.
export function seedDocs() {
  const docs = {}
  for (const area of ['openers', 'closers']) {
    const items = []
    for (const cat of Object.keys(seed[area])) {
      seed[area][cat].forEach((text, i) =>
        items.push({ id: newId(), cat, text, deleted: false, order: i }))
    }
    docs[area] = { items }
  }
  {
    const items = []
    for (const pool of Object.keys(seed.pools)) {
      seed.pools[pool].forEach((text, i) =>
        items.push({ id: newId(), pool, text, deleted: false, order: i }))
    }
    docs.pools = { items }
  }
  docs.echo_frames = {
    items: seed.echo_frames.map((text, i) => ({ id: newId(), text, deleted: false, order: i })),
  }
  docs.templates = {
    items: seed.templates.map((t, i) =>
      ({ id: t.id, text: `${t.name} — ${t.brief}`, deleted: false, order: i })),
  }
  return { ...docs, ...assetDocs() }
}

export function seedTasks() {
  return import('../../../seed/tasks.json')
}

// Additive migrations for databases seeded before these areas/cards existed.
// Applied once each (guarded by meta/migrations); only ever ADDS, never rewrites.
export const ADDITIONS = [
  {
    id: '2026-08-29-content-inventory',
    areaDocs: assetDocs(),
    tasks: [
      { order: 13, status: 'todo', title: 'Profession → affection seeding grid', detail: 'Every cat × every profession: a starting affection number. Honor canon affinities (Salem–Farmer, Boo–Influencer/Medium, Granolia–learners, Zimothy–status). By construction some players must start locked out of Boo (<4) and Zimothy, and everyone must reach at least one reliable source. Blocked by: character roster, irwinAffection + salemSgtMajor decisions.' },
      { order: 14, status: 'todo', title: 'Guest roster + device audit', detail: 'Confirmed guests, ages, per-guest phone check (QR-capable? on Wi-Fi?). Flag who needs the charged loaner, pre-joined.' },
      { order: 15, status: 'todo', title: 'Cast guests to characters', detail: 'Who plays whom. Casting shapes cat access via profession, and the 11-year-old and 70-year-old need roles they can inhabit.' },
      { order: 16, status: 'todo', title: 'Design 4 content-agnostic document puzzles', detail: 'Build backlog, not workshop content: four puzzle mechanisms that gate the sealed document overlay. Must work identically for any payload so Jon stays blind. Instruction copy → UI copy area; cat input specs → Host & ops docs.' },
      { order: 17, status: 'todo', title: 'Post-party unseal + archive flow', detail: 'The morning-after ritual: a function that opens the manifest + sealed set to Jon once a post-party flag flips, archives what actually ran, and a keep-or-purge call on the sealed data.' },
    ],
    decisions: [
      { key: 'clueChannels', question: 'How do players deduce WHO? Motive clues are impersonal by design, but Act 4 (victim) and Act 6 (murderer) need evidence pointing at people.', options: ['Alibi/whereabouts pools with [CHARACTER] slots', 'Cat sightings layer', 'Blackout absence logic', 'Design session with Claude'] },
      { key: 'affectionEconomy', question: 'Can affection change mid-game, and how do players raise it? (A player dealt Boo below 4 currently has no path to her testimony.)', options: ['Static — profession-seeded only', 'Raisable via kiosk interactions', 'Design session with Claude'] },
      { key: 'acts35', question: 'What do players actually DO in Acts 3 and 5, the together interludes? (Currently: nothing is defined.)', options: ['Echo broadcasts + compare-notes rounds', 'Structured mini-activities', 'Design session with Claude'] },
      { key: 'eventDeck', question: 'Event decks: do Murderer and Ghost share one menu or hold separate decks, and what produces Act 6’s merged event?', options: ['Shared menu + merge table', 'Per-role decks + joint Act 6 pick', 'Design session with Claude'] },
      { key: 'act4Pairing', question: 'How do Act 4 pairs form?', options: ['App-assigned at random', 'Self-chosen', 'Seeded by profession/affection'] },
      { key: 'irwinAffection', question: 'Does Sir Irwin participate in the affection system?', options: ['Loves everyone — always max', 'His own gradient'] },
      { key: 'buzzFallback', question: 'iPhones can’t vibrate from the browser. What is the Act 1 blackout signal fallback?', options: ['Screen-flash pattern on ALL phones (uniform, no tells)', 'Room audio sting masks it', 'Mixed per device'] },
      { key: 'hostOps', question: 'Who fires Stream Deck cues while Jon is dispersed playing his own game?', options: ['Timer-driven automation', 'Co-host non-player on the deck', 'Jon fires from phone, in character'] },
      { key: 'scoring', question: 'Winner determination and prizes when zero or several players name all three?', options: ['All-three-or-nothing + gag superlatives', 'Points with partial credit', 'Design session with Claude'] },
    ],
  },
  {
    // 25 Sep: the Start Here build order, the motive-swap question, and the
    // gaps the Canon page lists as "safe — Jon writes it".
    id: '2026-09-25-build-order',
    tasks: [
      { order: 18, status: 'todo', title: 'Throwaway slice: one character onto a phone via QR', detail: 'Build order step 3 (Sep 29). Proves the whole chain: scan a QR code and a character appears on your phone. Thrown away afterwards.' },
      { order: 19, status: 'todo', title: 'Seed-based case generator + validator', detail: 'Build order step 4 (Oct 2). Type one seed word, get a whole case: murderer, victim, motive, where every clue goes. It also checks that every player can still reach two of the three answers even if the hidden roles hide as much as the rules allow.' },
      { order: 20, status: 'todo', title: 'Eight fake test players', detail: 'Build order step 5 (Oct 5). A script that plays as eight people, not eight friends. It plays a throwaway case that is binned afterwards — never kept, never shown to you.' },
      { order: 21, status: 'todo', title: 'Split dev and live', detail: 'Build order step 6 (Oct 7). So a broken afternoon can’t break the party.' },
      { order: 22, status: 'todo', title: 'Content sprint: cat deflection lines to 8 per cat', detail: 'Safe content, best drive-time task. What each cat says when the affection roll fails: in character, funny, zero information. Editor: Cat voices → Cat deflection lines.' },
      { order: 23, status: 'todo', title: 'Innocent-beat content for Acts 2, 4 and 6', detail: 'Safe — Jon writes it. Read-time parity: each innocent beat matches the event choice prompt in length and needs one required interaction before it can be dismissed. Editor: Player screens → Event cards.' },
      { order: 24, status: 'todo', title: 'Workshop: visible history view', detail: 'Every change you make in the workshop is kept, but there is no screen to browse that history yet. The Canon page says there must be one.' },
    ],
    decisions: [
      { key: 'swapMotive', question: 'Which of the 19 motives gets swapped, and for what?', options: ['Keep all 19', 'Swap one — tell Claude which'] },
    ],
  },
  {
    // 28 Sep: Jon and Susan supply the bag items; the packing is decided blind
    // and shown only to Jenna, the Steward.
    id: '2026-09-28-bags',
    areaDocs: { bag_items: { items: [] } },
    tasks: [
      { order: 25, status: 'todo', title: 'Bag items: Jon and Susan list the pool', detail: 'Workshop → Bags → Bag items. One line per item: Item — sense: property. Every property needs at least two items.' },
      { order: 26, status: 'todo', title: 'Blind bag packer', detail: 'Claude builds a tool that decides which items go in which numbered bag, without Jon or Susan ever seeing it, and saves the packing where only Jenna can see it. It checks every bag has at least two clueable properties and every property is in two or three bags, never one.' },
      { order: 27, status: 'todo', title: 'Jenna’s Steward view', detail: 'A page only Jenna can open: the packing list for the bags, and later the secret content to read and edit. Needs Jon’s approval to change the security rules.' },
    ],
  },
  {
    // 28 Sep: filler messages — the innocent screens during event windows.
    id: '2026-09-28-filler',
    // (The existing task card "Innocent-beat content for Acts 2, 4 and 6"
    // covers writing them.)
    areaDocs: { filler: { items: [] } },
  },
  {
    // 8 Oct: the play side. The guest list feeds the phones' "Who are you?"
    // screen; the Game night page in the workshop runs the night.
    id: '2026-10-08-play-side',
    areaDocs: { guests: { items: [] } },
    tasks: [
      { order: 28, status: 'todo', title: 'Guest list', detail: 'Workshop → Show night → Guest list. One line per guest, just the name. Mark the two of you “— host: Jonathan” and “— host: Susan” so you always get the Professors.' },
      { order: 29, status: 'todo', title: 'Put the play side live, then scan it', detail: 'Run the deploy command from docs/play-side.md once. Then open the play link on your phone, tap “Host? Start the night”, tap your name, and try the Host tab.' },
    ],
  },
]

// Split a saved line into its two form fields, and join them back. Lossless:
// a line with no separator shows up whole in the second field.
export function splitFields(area, text) {
  const form = AREAS[area]?.form
  if (!form) return null
  const t = text ?? ''
  const needle = form.sep.trim() // '—' or ':'
  const idx = t.indexOf(needle)
  if (idx < 0) return { a: '', b: t }
  return { a: t.slice(0, idx).trim(), b: t.slice(idx + needle.length).trim() }
}

export function joinFields(area, a, b) {
  const form = AREAS[area]?.form
  const left = (a ?? '').trim()
  const right = (b ?? '').trim()
  if (!form || !left) return right
  return `${left}${form.sep}${right}`
}

// The character line is four things in one saved line:
//   NAME — the Profession. Who they are. Costume: what to wear
// Split it into four boxes and join it back, losslessly.
export function splitCharacter(text) {
  const t = (text ?? '').trim()
  const dash = t.indexOf('—')
  const name = dash >= 0 ? t.slice(0, dash).trim() : ''
  let rest = dash >= 0 ? t.slice(dash + 1).trim() : t
  let costume = ''
  const c = rest.search(/Costume:/i)
  if (c >= 0) { costume = rest.slice(c + 8).trim(); rest = rest.slice(0, c).trim() }
  let profession = ''
  const m = /^(the\s+[^.]+)\.\s*/i.exec(rest)
  if (m) { profession = m[1].replace(/^the\s+/i, '').trim(); rest = rest.slice(m[0].length) }
  return { name, profession, persona: rest.trim(), costume }
}

export function joinCharacter({ name, profession, persona, costume }) {
  const parts = []
  if (profession?.trim()) parts.push(`the ${profession.trim().replace(/^the\s+/i, '')}.`)
  if (persona?.trim()) parts.push(persona.trim().replace(/[.]?$/, '.'))
  if (costume?.trim()) parts.push(`Costume: ${costume.trim().replace(/[.]?$/, '.')}`)
  const body = parts.join(' ')
  return name?.trim() ? `${name.trim().toUpperCase()} — ${body}` : body
}

export const CHARACTER_FIELDS = [
  { key: 'name', label: 'Name', placeholder: 'Dorothy Rye' },
  { key: 'profession', label: 'What they do', placeholder: 'Baker' },
  { key: 'persona', label: 'Who they are, in a line or two', placeholder: 'Up since four. Has opinions about everyone else’s bread.' },
  { key: 'costume', label: 'What to wear', placeholder: 'Apron, flour on the hands, a wooden spoon' },
]
