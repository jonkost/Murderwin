// Jenna's page, the pure part: which fields a sealed set has and in what
// order, how an edit lands in a local copy, what a shape failure means in
// plain words, and whether the route should open at all. No Firebase here,
// so node can test it. The callable lives in stewardApi.js.
//
// SEAL RULE. Nothing in this file stores anything: the set Jenna is editing
// lives in React state for as long as the page is open and nowhere else.
// Never localStorage, never the Firestore client cache (the callable does
// not go through it).

export const JON_UID = 'JYSmPSQfdMen0leIDYmqUa32Prt1'

export const NOT_FOR_YOU = 'Not for you.'
export const SAVE_FAILED = 'SAVE FAILED. Check your signal and try again.'

// The sections of one set, in the order Jenna reads them. `path` is the
// dotted field the callable's write op takes; the index is added per line.
export const SECTIONS = [
  { key: 'kernels.irwin', label: 'Sir Irwin says', hint: 'Plainly, earnestly true. Blanks like [ROOM] stay as they are.', kind: 'lines' },
  { key: 'kernels.boo', label: 'Miss Boo LaRue says', hint: 'True and precise: the best information in the house.', kind: 'lines' },
  { key: 'kernels.granolia', label: 'Granolia Lickspittle says', hint: 'True. Her blanks must match one of the truthful lines above: same blanks, same count.', kind: 'lines' },
  { key: 'kernels.zimothy', label: 'Zimothy Clawford, Esq. says', hint: 'True but rationed: accurate and minimal.', kind: 'lines' },
  { key: 'kernels.salem', label: 'Salem Crookshank says', hint: 'Confidently wrong. The anchor is the one object word that also appears in a truthful line.', kind: 'salem' },
  { key: 'documents', label: 'The documents', hint: 'Forty to sixty words each. The emphasis is one word from the text, printed large.', kind: 'documents' },
  // The last three are no longer shown on the night (23 Oct 2026); they come
  // off this page once Jon answers the cats' secret lines question.
  { key: 'fragments', label: 'The news fragments', hint: 'Not shown on the night any more: W-O-O-F News replaced the news frames. Skip these.', kind: 'lines' },
  { key: 'studyClue', label: 'The study clue', hint: 'Not shown on the night any more: the study now shows the Ghost’s trace. Skip this.', kind: 'lines' },
  { key: 'irwin', label: "Sir Irwin's lines for Act 5", hint: 'Not shown on the night any more: Sir Irwin’s countdown at dessert uses open words. Skip these.', kind: 'lines' },
]

const SUBFIELDS = { salem: ['text', 'anchor'], documents: ['text', 'emphasis', 'annotation'] }
const SUBLABELS = { text: 'Text', anchor: 'Anchor word', emphasis: 'Word printed large', annotation: 'Handwritten note' }

function getPath(obj, path) {
  let cur = obj
  for (const p of path.split('.')) { if (cur === null || typeof cur !== 'object') return undefined; cur = cur[p] }
  return cur
}

// Every editable box of a set, flat: { path, section, label, value, rows }.
export function fieldsOf(content) {
  const out = []
  for (const s of SECTIONS) {
    const list = getPath(content, s.key)
    if (!Array.isArray(list)) continue
    list.forEach((item, i) => {
      if (s.kind === 'lines') {
        out.push({ path: `${s.key}.${i}`, section: s.key, label: `${i + 1}`, value: typeof item === 'string' ? item : '', rows: s.key === 'studyClue' ? 3 : 2 })
      } else {
        for (const sub of SUBFIELDS[s.kind]) {
          const v = item && typeof item === 'object' ? item[sub] : ''
          out.push({ path: `${s.key}.${i}.${sub}`, section: s.key, label: `${i + 1}, ${SUBLABELS[sub].toLowerCase()}`, value: typeof v === 'string' ? v : '', rows: sub === 'text' ? 4 : 1 })
        }
      }
    })
  }
  return out
}

// The same set with one field changed, as a new object. Unknown paths leave
// it as it was (the callable refuses them anyway).
export function setField(content, path, value) {
  const parts = path.split('.')
  const next = structuredClone(content)
  let cur = next
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur === null || typeof cur !== 'object' || !(parts[i] in cur)) return content
    cur = cur[parts[i]]
  }
  const leaf = parts[parts.length - 1]
  if (cur === null || typeof cur !== 'object' || !(leaf in cur)) return content
  cur[leaf] = value
  return next
}

// A shape failure from the server (functions/lib/case.js checkSealed reason
// codes) in plain words. These are what would make the night fall back to
// rehearsal text for this set.
const CAT_NAMES = { irwin: 'Sir Irwin', boo: 'Miss Boo LaRue', granolia: 'Granolia Lickspittle', zimothy: 'Zimothy Clawford, Esq.', salem: 'Salem Crookshank' }
export function shapeWords(fails = []) {
  const out = []
  for (const f of fails) {
    const [what, cat, why] = String(f).split(':')
    if (what === 'kernels' && cat && why === 'token') out.push(`${CAT_NAMES[cat] ?? cat}: a blank is not one of [ROOM] [TIME] [DURATION] [COUNT] [PLACE] [CROWD].`)
    else if (what === 'kernels' && cat && why === 'empty') out.push(`${CAT_NAMES[cat] ?? cat}: a line is empty.`)
    else if (what === 'kernels' && cat) out.push(`${CAT_NAMES[cat] ?? cat}: the lines are missing.`)
    else if (what === 'documents' && cat === 'field') out.push('A document is missing its text, its word printed large or its handwritten note.')
    else if (what === 'documents') out.push('Fewer than two documents.')
    else if (what === 'fragments') out.push('No news fragment.')
    else if (what === 'studyClue') out.push('No study clue.')
    else if (what === 'irwin') out.push("One of Sir Irwin's lines is empty.")
    else if (what === 'granolia') out.push("Granolia's blanks do not match any truthful line's blanks.")
    else out.push(`Something is off: ${f}.`)
  }
  return out
}

// Should the route open? Jon's account is turned away before any call is
// made; everyone else is decided by the callable's whoami. `whoami` is
// undefined while the call is in flight, true when it answered ok, false
// when it was refused.
export function routeState({ uid, whoami } = {}) {
  if (!uid || uid === JON_UID) return 'not-for-you'
  if (whoami === undefined) return 'checking'
  return whoami ? 'open' : 'not-for-you'
}

// The packing list as Jenna reads it: one line per bag, items in order,
// a taste item marked "pack two".
export function packingRows(bags) {
  const rows = Array.isArray(bags?.bags) ? bags.bags : []
  return rows.map(b => ({
    n: b.n,
    items: (b.items ?? []).map(it => ({ id: it.id, line: it.text, twice: Boolean(it.twice), name: String(it.text ?? '').split('—')[0].trim() })),
  }))
}

// A synthetic set for the preview (a dev server with ?preview=1 and no
// sign-in). Obviously fake, bracketed, tied to no motive. Never written
// anywhere.
export function syntheticSet(code) {
  const line = who => `(Preview ${code}, ${who}: a lantern stood in [ROOM] at [TIME].)`
  const words = n => Array.from({ length: n }, (_, i) => `word${i + 1}`).join(' ')
  return {
    kernels: {
      irwin: [1, 2, 3].map(i => line(`Irwin ${i}`)),
      boo: [1, 2, 3].map(i => line(`Boo ${i}`)),
      granolia: [1, 2, 3].map(i => line(`Granolia ${i}`)),
      zimothy: [1, 2, 3].map(i => line(`Zimothy ${i}`)),
      salem: [1, 2, 3].map(i => ({ text: `(Preview ${code}, Salem ${i}: the lantern stood far from [ROOM].)`, anchor: 'lantern' })),
    },
    documents: [1, 2, 3].map(i => ({ text: `(Preview ${code}, document ${i}: ${words(42)}.)`, emphasis: 'LANTERN', annotation: `(Preview note ${i})` })),
    fragments: [1, 2, 3].map(i => `(Preview ${code}, fragment ${i})`),
    studyClue: [1, 2, 3].map(i => `(Preview ${code}, study clue ${i}: ${words(22)}.)`),
    irwin: [1, 2, 3].map(i => `(Preview ${code}, Irwin line ${i}.)`),
  }
}
