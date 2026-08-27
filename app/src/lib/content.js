import seed from '../../../seed/safe-content.json'

export const CATS = [
  { key: 'irwin', name: 'Sir Irwin', tag: 'the dog' },
  { key: 'salem', name: 'Salem Crooknog', tag: 'the long-time groundskeeper' },
  { key: 'zimothy', name: 'Zimothy Clawford, Esq.', tag: 'the old family solicitor' },
  { key: 'boo', name: 'Miss Boo LaRue', tag: 'family friend and socialite' },
  { key: 'granolia', name: 'Granolia Lickspittle', tag: 'the charity case' },
]

export const POOLS = ['room', 'time', 'duration', 'count', 'place', 'crowd']

export const AREAS = {
  openers: { label: 'Cat openers', tabs: 'cats', guide: 'opener', goalPerTab: 8 },
  closers: { label: 'Cat closers', tabs: 'cats', guide: 'closer', goalPerTab: 8 },
  pools: { label: 'Variable pools', tabs: 'pools', goalPerTab: 10 },
  echo_frames: { label: 'Echo frames', tabs: null, guide: 'echo_frame', goal: 8 },
  templates: { label: 'Stationery templates', tabs: null, goal: 7 },
}

export const GUIDES = seed.guides

let counter = 0
function newId() {
  counter += 1
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`
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
  return docs
}

export function seedTasks() {
  return import('../../../seed/tasks.json')
}
