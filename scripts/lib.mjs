// Shared helpers for the sealed-content pipeline.
// SEAL RULE: nothing in this module may print, log, or file sealed text.
// Print counts, code IDs, lengths, and hashes only.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const here = dirname(fileURLToPath(import.meta.url))
export const repoRoot = join(here, '..')

export const CATS = ['irwin', 'boo', 'granolia', 'zimothy', 'salem']
export const POOL_TOKENS = ['[ROOM]', '[TIME]', '[DURATION]', '[COUNT]', '[PLACE]', '[CROWD]']
export const POOL_KEYS = ['room', 'time', 'duration', 'count', 'place', 'crowd']

// THE SEALED SHAPE. One Firestore doc per motive, sealed/{code}, where the
// code is opaque and only sealed/manifest ({ codes: { code: motiveN } })
// maps it to a motive. functions/lib/case.js reads one of these at the Act
// 1 blackout and turns it into cases/{nightId} (see CASE_SHAPE there).
//
// sealed/{code} = {
//   kernels: {
//     irwin:    string[3]   plainly true; [ROOM]-style tokens allowed
//     boo:      string[3]   true and precise
//     granolia: string[3]   true; token multiset equals one truthful kernel's
//     zimothy:  string[3]   true but rationed
//     salem:    { text, anchor }[3]   confidently wrong; `anchor` is the one
//                           noun carried verbatim from a truthful kernel
//   }
//   documents: { text, emphasis, annotation }[3]   40 to 60 words, no tokens;
//                           `emphasis` becomes the case's bigWord, and the
//                           runtime draws the stationery template
//   fragments: string[3]    up to 15 words, fills the news frame's gap
//   studyClue: string[3]    the written clue the study pays a whole group,
//                           20 to 60 words, no tokens, impersonal
//   irwin:     string[3]    Sir Irwin's Act 5 lines, through the dog filter:
//                           at most 12 words, never a character's name, no
//                           tokens, impersonal
//   generatedAt: Date
// }
export const SEALED_FIELDS = ['kernels', 'documents', 'fragments', 'studyClue', 'irwin']
export const IRWIN_MAX_WORDS = 12
export const STUDY_MIN_WORDS = 20
export const STUDY_MAX_WORDS = 60
export const LINE_MAX = 80 // nothing the scripts print is longer than this

export function adminDb() {
  const app = initializeApp({
    credential: applicationDefault(),
    projectId: 'murderwin-at-sirwin-manor',
  })
  return getFirestore(app)
}

export function readMotives() {
  const { motives } = JSON.parse(readFileSync(join(repoRoot, 'seed', 'motives.json'), 'utf8'))
  return motives
}

// The fourteen characters' names, as single words, for the dog filter:
// Sir Irwin's lines never name a guest.
export function characterNameWords() {
  const { characters } = JSON.parse(readFileSync(join(repoRoot, 'seed', 'characters.json'), 'utf8'))
  const words = new Set()
  for (const c of characters) for (const w of String(c.name).toLowerCase().split(/[^a-z]+/)) if (w.length > 2 && !['prof', 'professor', 'sir'].includes(w)) words.add(w)
  return words
}

// The dog filter, by form: short, impersonal, no tokens, no character's name.
export function dogFilterOk(line, names = characterNameWords()) {
  if (typeof line !== 'string' || !line.trim()) return false
  if (wordCount(line) > IRWIN_MAX_WORDS) return false
  if (poolTokenCount(line) > 0 || unknownTokens(line).length) return false
  if (!isImpersonal(line)) return false
  const words = line.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/)
  return !words.some(w => names.has(w))
}

// ---- safe inputs for the generator -----------------------------------------
// The generator reads the workshop's pools and voice layers (SAFE content)
// so kernels use the pool vocabulary and sit well between the openers and
// closers. Read with the Admin SDK; never printed.
export async function areaItems(db, area) {
  const snap = await db.collection('safe_content').doc(area).get()
  if (!snap.exists) return []
  const raw = snap.data()?.items
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
  return items.filter(i => !i.deleted && typeof i.text === 'string' && i.text.trim()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function readSafeInputs(db) {
  const [pools, openers, closers, refusals] = await Promise.all(['pools', 'openers', 'closers', 'refusals'].map(a => areaItems(db, a)))
  const byPool = {}
  for (const k of POOL_KEYS) byPool[k] = pools.filter(i => i.pool === k).map(i => i.text)
  const voice = {}
  for (const cat of CATS) {
    voice[cat] = {
      openers: openers.filter(i => i.cat === cat).map(i => i.text),
      closers: closers.filter(i => i.cat === cat).map(i => i.text),
      refusals: refusals.filter(i => i.cat === cat).map(i => i.text),
    }
  }
  return { pools: byPool, voice, bags: await readBagInputs(db) }
}

// ---- the bags (G, 18 Oct 2026) --------------------------------------------
// The bags station deals its clue at runtime from the packing (sealed/bags,
// scripts/pack-bags.mjs): "something minty is in two of the bags". That clue
// must stay independent of the sealed text, so the generator is told which
// property words are in play and asked to keep them out of the kernels,
// documents and fragments. The words themselves are safe content (Jon's bag
// items); which bags hold them is not, and never leaves sealed/bags.
export async function readBagInputs(db) {
  const snap = await db.collection('sealed').doc('bags').get()
  const packed = snap.exists ? Object.keys(snap.data()?.properties ?? {}) : []
  const items = await areaItems(db, 'bag_items')
  const pool = []
  for (const it of items) {
    const dash = it.text.indexOf('—')
    if (dash < 0) continue
    for (const part of it.text.slice(dash + 1).split(';')) {
      const c = part.indexOf(':')
      if (c >= 0) pool.push(part.slice(c + 1).trim().toLowerCase())
    }
  }
  const properties = [...new Set([...packed, ...pool].filter(Boolean))].sort()
  return { properties, packed: packed.length, stackedPairs: snap.exists ? (snap.data()?.stackedPairs?.length ?? 0) : 0 }
}

export function bagStanza(bags) {
  const props = bags?.properties ?? []
  if (!props.length) return ''
  return [
    'The bags. Each guest carries a numbered bag of ordinary objects, and a separate',
    'clue names one of these properties on the night; keep every one of these words',
    '(and their senses: smells, sounds, textures, tastes, colours) OUT of all content,',
    'so the bag clue stays independent of the text:',
    `  ${props.join('; ')}`,
  ].join('\n')
}

// The stanza that goes into the prompt. Counts of what it holds are safe
// to print; the stanza itself is not printed (it is Jon's own words, but
// the rule is simpler kept absolute: the scripts print counts only).
export function inputStanza({ pools = {}, voice = {} } = {}, { perList = 4 } = {}) {
  const lines = []
  const poolLines = POOL_KEYS.filter(k => pools[k]?.length).map(k => `  [${k.toUpperCase()}] is filled from values like: ${pools[k].slice(0, perList).join('; ')}`)
  if (poolLines.length) lines.push('Pool vocabulary (the runtime fills each token with one of these):', ...poolLines)
  const voiceLines = []
  for (const cat of CATS) {
    const v = voice[cat] ?? {}
    const bits = []
    if (v.openers?.length) bits.push(`opens with lines like: ${v.openers.slice(0, perList).join(' | ')}`)
    if (v.closers?.length) bits.push(`closes with lines like: ${v.closers.slice(0, perList).join(' | ')}`)
    if (bits.length) voiceLines.push(`  ${cat}: ${bits.join('; ')}`)
  }
  if (voiceLines.length) lines.push('Each kernel is spliced between an opener and a closer in the cat\'s own voice; write the middle so it reads naturally between them:', ...voiceLines)
  return lines.join('\n')
}
export function stanzaCounts({ pools = {}, voice = {}, bags = null } = {}) {
  return {
    poolValues: POOL_KEYS.reduce((n, k) => n + (pools[k]?.length ?? 0), 0),
    voiceLines: CATS.reduce((n, c) => n + (voice[c]?.openers?.length ?? 0) + (voice[c]?.closers?.length ?? 0) + (voice[c]?.refusals?.length ?? 0), 0),
    bagProperties: bags?.properties?.length ?? 0,
    bagsPacked: bags?.packed ?? 0,
  }
}

// ---- printing --------------------------------------------------------------
// Every line the scripts print goes through here: at most LINE_MAX characters,
// wrapped, never truncated silently. Counts and PASS/FAIL only, by construction
// of the callers; this only guards the width.
export function say(text) {
  for (const raw of String(text).split('\n')) {
    let line = raw
    while (line.length > LINE_MAX) {
      let cut = line.lastIndexOf(' ', LINE_MAX)
      if (cut < 20) cut = LINE_MAX
      console.log(line.slice(0, cut))
      line = '  ' + line.slice(cut).trimStart()
    }
    console.log(line)
  }
}
export function printReport(report) {
  for (const [k, v] of Object.entries(report)) say(`${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : v}`)
}

// ---- an in-memory stand-in for the Admin SDK -------------------------------
// Only what the validator and the generator's dry run touch. Never a
// substitute for the rules; nothing in it persists.
export function memoryDb(initial = {}) {
  const store = new Map(Object.entries(initial))
  const docRef = path => ({
    id: path.split('/').pop(),
    path,
    get: async () => ({ exists: store.has(path), id: path.split('/').pop(), data: () => (store.has(path) ? structuredClone(store.get(path)) : undefined) }),
    set: async (data, opts) => { store.set(path, opts?.merge && store.has(path) ? { ...store.get(path), ...data } : structuredClone(data)) },
    delete: async () => { store.delete(path) },
  })
  const collection = name => ({
    doc: id => docRef(`${name}/${id}`),
    listDocuments: async () => [...store.keys()].filter(k => k.startsWith(`${name}/`)).map(docRef),
    get: async () => ({ docs: [...store.keys()].filter(k => k.startsWith(`${name}/`)).map(k => ({ id: k.split('/').pop(), data: () => structuredClone(store.get(k)) })) }),
    add: async data => { const id = `r${store.size}`; store.set(`${name}/${id}`, structuredClone(data)); return docRef(`${name}/${id}`) },
  })
  return { collection, doc: path => docRef(path), store }
}

// ---- a synthetic set, for dry runs and tests only ------------------------
// Obviously fake, built from a word, in brackets, and tied to no motive. It
// passes the validator by form so the pipeline can be exercised without the
// API, Firestore or any real content. Never written anywhere that persists.
export function syntheticSealed(word, n = 1) {
  const truth = who => `(Synthetic item ${n}, ${who}: a lantern stood in [ROOM] at [TIME].)`
  const paper = m => `(Synthetic item ${n}, paper ${m}: ${Array.from({ length: 42 }, (_, i) => `w${i}`).join(' ')}.)`
  return {
    kernels: {
      irwin: [1, 2, 3].map(i => truth(`irwin ${i}`)),
      boo: [1, 2, 3].map(i => truth(`boo ${i}`)),
      granolia: [1, 2, 3].map(i => truth(`granolia ${i}`)),
      zimothy: [1, 2, 3].map(i => truth(`zimothy ${i}`)),
      salem: [1, 2, 3].map(i => ({ text: `(Synthetic item ${n}, salem ${i}: the lantern stood far from [ROOM].)`, anchor: 'lantern' })),
    },
    documents: [1, 2, 3].map(m => ({ text: paper(m), emphasis: 'LANTERN', annotation: `(Synthetic item ${n}, note ${m})` })),
    fragments: [1, 2, 3].map(m => `(Synthetic item ${n}, fragment ${m}, about ${word})`),
    studyClue: [1, 2, 3].map(m => `(Synthetic item ${n}, study ${m}: ${Array.from({ length: 22 }, (_, i) => `s${i}`).join(' ')}.)`),
    irwin: [1, 2, 3].map(m => `(Synthetic item ${n}, dog ${m}, about ${word}.)`),
    generatedAt: new Date(0),
  }
}
export function syntheticSealedSet(count = 19) {
  const docs = {}
  const codes = {}
  for (let i = 1; i <= count; i++) {
    const code = `DRY${String(i).padStart(2, '0')}`
    codes[code] = i
    docs[`sealed/${code}`] = syntheticSealed('nothing', i)
  }
  docs['sealed/manifest'] = { codes, generatedAt: new Date(0) }
  return docs
}

const STOPWORDS = new Set(`a an the and or but of in on at to for with when while as is are was
were be been am do did done not no nor so if then than that this these those it its by from
up out off over under again once here there all any both each few more most other some such
only own same too very just one two three i you he she they we what which who whom someone
something figure guest night evening morning heard noticed seen saw thing about after before
during between their them have has had would could should`.split(/\s+/))

// Content words of a rhyme — the banned vocabulary for its sealed content.
export function rhymeWords(rhyme) {
  return [...new Set(
    rhyme.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w)),
  )]
}

export function poolTokenCount(text) {
  return POOL_TOKENS.reduce((n, t) => n + text.split(t).length - 1, 0)
}

// multiset of canonical pool tokens present in the text
export function poolTokens(text) {
  return POOL_TOKENS.flatMap(t => Array(text.split(t).length - 1).fill(t))
}

// any bracketed token that is not EXACTLY a canonical pool token —
// [Room], [time], [ ROOM ] all surface here (case- and shape-sensitive)
export function unknownTokens(text) {
  return (text.match(/\[[A-Za-z_ ]+\]/g) ?? []).filter(t => !POOL_TOKENS.includes(t))
}

// remove pool tokens before word-level scans, so [CROWD] never reads as "crowd"
export function stripTokens(text) {
  return POOL_TOKENS.reduce((s, t) => s.split(t).join(' '), text)
}

export function wordCount(text) {
  return text.replace(/\[[A-Z_]+\]/g, 'x').trim().split(/\s+/).filter(Boolean).length
}

export function isImpersonal(text) {
  return !/\b(you|your|yours|yourself)\b/i.test(text)
}

export function concreteNouns(text) {
  return new Set(
    text.toLowerCase().replace(/\[[a-z_]+\]/g, ' ').replace(/[^a-z\s']/g, ' ')
      .split(/\s+/).filter(w => w.length > 3 && !STOPWORDS.has(w)),
  )
}

export function sha12(obj) {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 12)
}

// Errors must never carry content. Wrap anything risky before rethrowing.
// The wrapper is marked sealSafe so top-level handlers know its message may
// be printed; any unmarked error prints as type + code only.
export function redactedError(context, err) {
  const safe = ['status', 'code', 'name'].map(k => err?.[k]).filter(Boolean).join(' ')
  const e = new Error(`${context} failed (${safe || 'no status'}; message length ${String(err?.message ?? '').length})`)
  e.sealSafe = true
  return e
}

export function printFatal(e) {
  if (e?.sealSafe) console.error(e.message)
  else console.error(`fatal: ${e?.name ?? 'Error'} ${e?.code ?? e?.status ?? ''} (message redacted, length ${String(e?.message ?? '').length})`)
}
