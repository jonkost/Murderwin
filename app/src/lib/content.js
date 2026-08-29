import seed from '../../../seed/safe-content.json'

export const CATS = [
  { key: 'irwin', name: 'Sir Irwin', tag: 'the dog' },
  { key: 'salem', name: 'Salem Crooknog', tag: 'the long-time groundskeeper' },
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
  // — Cat voices —
  openers: { label: 'Cat openers', group: 'Cat voices', tabs: 'cats', guide: 'opener', goalPerTab: 8 },
  closers: { label: 'Cat closers', group: 'Cat voices', tabs: 'cats', guide: 'closer', goalPerTab: 8 },
  refusals: { label: 'Refusal / gate lines', group: 'Cat voices', tabs: 'cats', guide: 'refusal', goalPerTab: 4 },
  smalltalk: { label: 'Idle small talk', group: 'Cat voices', tabs: 'cats', guide: 'smalltalk', goalPerTab: 8 },
  trailoffs: { label: 'Granolia trail-offs', group: 'Cat voices', tabs: null, guide: 'trailoff', goal: 8 },
  status_lines: { label: 'Affection status lines', group: 'Cat voices', tabs: 'cats', guide: 'status_line', goalPerTab: 3 },
  // — World & cast —
  npc_cards: { label: 'NPC intro cards', group: 'World & cast', tabs: null, guide: 'npc_card', goal: 5 },
  bios: { label: 'Player character bios', group: 'World & cast', tabs: null, guide: 'bio', goal: 10 },
  lore: { label: 'Canon & lore', group: 'World & cast', tabs: null, guide: 'lore', goal: 4 },
  // — Player screens —
  rules_text: { label: 'Rulebook sections', group: 'Player screens', tabs: null, guide: 'rules', goal: 10 },
  ui_copy: { label: 'UI copy & system strings', group: 'Player screens', tabs: null, guide: 'ui_copy', goal: 24 },
  role_cards: { label: 'Role cards & briefings', group: 'Player screens', tabs: null, guide: 'role_card', goal: 6 },
  event_cards: { label: 'Event cards', group: 'Player screens', tabs: null, guide: 'event_card', goal: 12 },
  // — Frames & pools —
  pools: { label: 'Variable pools', group: 'Frames & pools', tabs: 'pools', goalPerTab: 10 },
  echo_frames: { label: 'Echo frames', group: 'Frames & pools', tabs: null, guide: 'echo_frame', goal: 8 },
  epilogue_frames: { label: 'Epilogue frames', group: 'Frames & pools', tabs: null, guide: 'epilogue_frame', goal: 2 },
  templates: { label: 'Stationery templates', group: 'Frames & pools', tabs: null, goal: 7 },
  // — Show night —
  act_scripts: { label: 'Act scripts & banners', group: 'Show night', tabs: 'acts', guide: 'act_script', goalPerTab: 3 },
  ops_docs: { label: 'Host & ops documents', group: 'Show night', tabs: null, guide: 'ops_doc', goal: 12 },
  // — Assets (checklists) —
  art_assets: { label: 'Art assets', group: 'Assets', tabs: null, guide: 'art_asset', checklist: true },
  av_assets: { label: 'Audio / video assets', group: 'Assets', tabs: null, guide: 'av_asset', checklist: true },
}

export const AREA_GROUPS = ['Cat voices', 'World & cast', 'Player screens', 'Frames & pools', 'Show night', 'Assets']

const ART_ASSET_SEED = [
  'Portrait — Sir Irwin', 'Portrait — Salem Crooknog', 'Portrait — Zimothy Clawford',
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
]
