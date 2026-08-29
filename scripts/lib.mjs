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
