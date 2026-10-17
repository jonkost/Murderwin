// Generates ALL sealed content (kernels, document texts, echo fragments)
// straight into Firestore. Jon runs this; Jon never sees the output.
// SEAL RULES:
// - stdout gets COUNTS AND PASS/FAIL ONLY. No content, ever — not in logs,
//   not in errors, not in files.
// - stdout ORDER must never correlate with motive order: motives are
//   processed in a crypto-shuffled order, progress lines carry no code, and
//   the per-code count lines print once at the end, sorted by code string.
//
// THE STEWARD'S EDITS SURVIVE (H, 17 Oct 2026). A sealed doc that Jenna has
// edited carries editedAt (functions/lib/steward.js). This script never
// deletes sealed/* first any more:
//   node generate-sealed.mjs                  regenerate every set that has
//                                             no editedAt; keep the edited
//                                             ones; the manifest keeps its codes
//   node generate-sealed.mjs --regenerate-all copy every edited set to
//                                             sealed/_archive/items/{code}-{ts}
//                                             first, then regenerate all 19
//   node generate-sealed.mjs --force-code X   replace that one set (archived
//                                             first if edited); keep the rest
// The counts line reads "kept N, generated M" (and "archived K" when any).

import { randomBytes, randomInt } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import {
  adminDb, readMotives, rhymeWords, sha12, redactedError, printFatal,
  CATS, POOL_TOKENS, IRWIN_MAX_WORDS, STUDY_MIN_WORDS, STUDY_MAX_WORDS,
  readSafeInputs, inputStanza, stanzaCounts, characterNameWords, say, printReport, bagStanza,
} from './lib.mjs'
import { validateAll } from './validate-sealed.mjs'

const MODEL = process.env.MODEL ?? 'claude-opus-5'

// The shape of one sealed motive set: see THE SEALED SHAPE in lib.mjs.
export const CodeContent = z.object({
  kernels: z.object({
    irwin: z.array(z.string()).length(3),
    boo: z.array(z.string()).length(3),
    granolia: z.array(z.string()).length(3),
    zimothy: z.array(z.string()).length(3),
    salem: z.array(z.object({
      text: z.string(),
      anchor: z.string().describe('the one concrete noun carried over verbatim from the true fact'),
    })).length(3),
  }),
  documents: z.array(z.object({
    text: z.string(),
    emphasis: z.string(),
    annotation: z.string(),
  })).length(3),
  fragments: z.array(z.string()).length(3),
  studyClue: z.array(z.string()).length(3).describe('the written clue the study pays a whole group'),
  irwin: z.array(z.string()).length(3).describe("Sir Irwin's three short Act 5 lines, through the dog filter"),
})

const SYSTEM = `You write sealed clue content for a Victorian manor murder-mystery
party game. For ONE motive you produce:

- KERNELS: the informational middle of a cat's testimony, 3 variants for each of
  5 household NPCs. A kernel states something a witness noticed that points at
  this motive. ≤40 words each. Kernels are spliced between a personality opener
  and closer at runtime, so they carry information, not greetings.
- DOCUMENTS: 3 variants of a paper document that is the biggest tell for this
  motive (a receipt, telegram, notice, form, letter, playbill or mourning card —
  keep it template-agnostic). 40–60 words, plus ONE emphasis word (a single word
  from the text to be printed large) and one short handwritten-style annotation
  line in a second ink.
- FRAGMENTS: 3 variants of a juicy phrase (≤15 words) that slots into a news
  broadcast: "...residents further report ███..." — write what fills the ███.
- STUDY CLUE: 3 variants of a written clue that a locked study pays out to a
  whole group at once, ${STUDY_MIN_WORDS}–${STUDY_MAX_WORDS} words, a second
  angle on the same facts as the documents (not a copy of one), no placeholders.
- IRWIN LINES: 3 short lines Sir Irwin, the birthday dog, says on the living
  room screen late in the evening. THE DOG FILTER: at most ${IRWIN_MAX_WORDS}
  words each, plainly and earnestly true, pointing at this motive, no
  placeholders, impersonal, and NEVER a person's name (a list of names that
  must not appear follows).

HARD RULES:
1. IMPERSONAL: never address anyone. No "you/your". No names of people, no
   professions, no genders — witnesses saw events, not identified persons. Use
   "someone", "a figure", "a guest".
2. VARIABLES: where a kernel mentions where/when/how long/how often/where in
   town/who watched, use EXACTLY these placeholder tokens, exact uppercase:
   ${POOL_TOKENS.join(' ')}. Real values are injected later. Documents,
   fragments, the study clue and Irwin's lines use NO placeholders in ANY
   field (text, emphasis, annotation).
   A stanza of the pool vocabulary follows, so a kernel reads naturally once a
   token is filled; and a stanza of each cat's openers and closers, so the
   kernel sits naturally between them. A stanza may also list the bag
   property words (minty, rough, red): never use those words or their senses.
3. NPC natures (kernel variants must obey):
   - irwin: plainly, earnestly true.
   - boo: true and precise — the best information in the house.
   - granolia: true, and carrying EXACTLY the same set of placeholder tokens
     as one of the truthful kernels (irwin/boo/zimothy) — same tokens, same
     counts, at least one token. The runtime later swaps ONE injected value
     for a wrong one; you write her as fully confident and fully truthful.
   - zimothy: true but rationed — accurate, minimal, transactional in what it
     covers (not in voice; voice is added elsewhere).
   - salem: confidently WRONG: take a true fact from the other kernels and warp
     it backwards or sideways. Each salem variant also returns "anchor": the ONE
     concrete noun (a distinctive object/thing, not a person-word or time-word)
     that appears VERBATIM both in his warped text and in at least one of the
     truthful kernels, so the warp is discoverable.
4. BANNED WORDS: the motive is shown to players only as a rhyming riddle. Your
   content must NEVER use the listed banned words (the rhyme's own vocabulary),
   or the riddle solves itself.
5. Tone: dry Victorian household comedy. Funny is good; explicit spoilers are not.
6. Every variant must be self-consistent with the others (same underlying facts,
   different surface details).`

function makeCodes(n, taken = new Set()) {
  const codes = new Set()
  while (codes.size < n) {
    const code = randomBytes(4).toString('base64url').replace(/[-_]/g, 'Q').slice(0, 5).toUpperCase()
    if (!taken.has(code)) codes.add(code)
  }
  return [...codes]
}

function shuffled(n) {
  const order = [...Array(n).keys()]
  for (let i = n - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

// The user turn for one motive: the riddle, its banned words, the names the
// dog filter forbids, and the safe-input stanza (pools and voice layers).
export function userPrompt(motive, { stanza = '', names = [] } = {}) {
  const banned = rhymeWords(motive.rhyme)
  return [
    `Motive riddle (players see only this): "${motive.rhyme}"`,
    `Banned words (never use any of these or close derivatives): ${banned.join(', ')}`,
    `Names that must never appear anywhere, least of all in Irwin's lines: ${names.join(', ')}`,
    stanza,
    'Produce the full content set for this motive.',
  ].filter(Boolean).join('\n')
}

async function generateOne(client, motive, extras) {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt(motive, extras) }],
    output_format: betaZodOutputFormat(CodeContent),
  })
  if (!response.parsed_output) {
    throw new Error(`schema parse returned null (stop_reason ${response.stop_reason})`)
  }
  return response.parsed_output
}

export const ARCHIVE = 'sealed/_archive/items' // under sealed/, so the rules deny every client read of it too
const CODE_RE = /^[A-Z0-9]{3,12}$/

// One run, against any Firestore-shaped db (the Admin SDK, or lib.mjs
// memoryDb in the tests). `generate(motive, extras)` makes one set; the CLI
// passes the API call, the tests pass a synthetic maker. Returns counts only.
export async function runGenerate(db, {
  generate, motives = readMotives(), extras = {}, regenerateAll = false, forceCode = null, now = () => new Date(), log = say,
} = {}) {
  if (typeof generate !== 'function') throw new Error('runGenerate needs a generate function')
  if (forceCode && !CODE_RE.test(forceCode)) throw new Error('--force-code takes one code')

  // The manifest keeps its codes: a set Jenna edited stays findable under the
  // same code, and a code is never reused for another motive.
  const manifestRef = db.collection('sealed').doc('manifest')
  const manifestSnap = await manifestRef.get()
  const prior = manifestSnap.exists ? manifestSnap.data()?.codes ?? {} : {}
  const codeByN = {}
  for (const [code, n] of Object.entries(prior)) if (CODE_RE.test(code) && !(n in codeByN)) codeByN[n] = code
  const missing = motives.filter(m => !(m.n in codeByN))
  const fresh = makeCodes(missing.length, new Set(Object.keys(prior)))
  missing.forEach((m, i) => { codeByN[m.n] = fresh[i] })
  if (forceCode && !Object.values(codeByN).includes(forceCode)) throw new Error('--force-code: no set has that code')

  const manifest = {}
  const countsByCode = {}
  let kept = 0, generated = 0, archived = 0
  // crypto-shuffled processing order: line order carries no motive information
  for (const i of shuffled(motives.length)) {
    const motive = motives[i]
    const code = codeByN[motive.n]
    manifest[code] = motive.n
    const ref = db.collection('sealed').doc(code)
    const snap = await ref.get()
    const existing = snap.exists ? snap.data() : null
    const edited = Boolean(existing?.editedAt)
    const replaceThis = regenerateAll || forceCode === code
    const keepThis = Boolean(existing) && (forceCode ? !replaceThis : (edited && !replaceThis))
    if (keepThis) {
      kept++
      countsByCode[code] = edited ? 'kept (edited by the Steward)' : 'kept'
      continue
    }
    if (existing && edited) {
      await db.doc(`${ARCHIVE}/${code}-${now().getTime()}`).set({ ...existing, code, archivedAt: now() })
      archived++
    }
    let content = null
    for (let attempt = 1; attempt <= 3 && !content; attempt++) {
      try {
        content = await generate(motive, extras)
      } catch (e) {
        if (attempt === 3) throw redactedError('generation (code withheld)', e)
        log(`one motive: attempt ${attempt} failed, retrying`)
      }
    }
    await ref.set({
      kernels: content.kernels,
      documents: content.documents,
      fragments: content.fragments,
      studyClue: content.studyClue,
      irwin: content.irwin,
      generatedAt: now(),
    })
    generated++
    const kCount = CATS.reduce((n, c) => n + content.kernels[c].length, 0)
    countsByCode[code] = `${kCount} kernels, ${content.documents.length} docs, ${content.fragments.length} fragments, ${content.studyClue.length} study, ${content.irwin.length} irwin`
    log(`generated ${generated}`)
  }

  await manifestRef.set({ codes: manifest, generatedAt: now() })
  // per-code counts, sorted by code string — order says nothing about motives
  for (const code of Object.keys(countsByCode).sort()) {
    log(`code ${code}: ${countsByCode[code]}`)
  }
  const all = await db.collection('sealed').get()
  const runHash = sha12(all.docs.map(d => [d.id, sha12(d.data())]).sort())
  log(`kept ${kept}, generated ${generated}${archived ? `, archived ${archived}` : ''}`)
  log(`manifest written (${Object.keys(manifest).length} codes). run hash ${runHash}`)
  return { kept, generated, archived, codes: Object.keys(manifest).length }
}

async function main() {
  const regenerateAll = process.argv.includes('--regenerate-all')
  const forceAt = process.argv.indexOf('--force-code')
  const forceCode = forceAt >= 0 ? String(process.argv[forceAt + 1] ?? '').toUpperCase() : null
  const db = adminDb()
  const client = new Anthropic()
  const motives = readMotives()

  say(`generating sealed content: ${motives.length} motives, model ${MODEL}`)
  if (regenerateAll) say('regenerate all: edited sets are archived first, then replaced')
  else if (forceCode) say('force one code: that set is replaced, every other set is kept')
  else say('edited sets are kept; every other set is written fresh')

  // Safe inputs: the workshop's pools and voice layers shape the kernels.
  const inputs = await readSafeInputs(db)
  const counts = stanzaCounts(inputs)
  say(`safe inputs read: ${counts.poolValues} pool values, ${counts.voiceLines} voice lines`)
  say(`bag inputs read: ${counts.bagProperties} property words, ${counts.bagsPacked} packed`)
  const extras = { stanza: [inputStanza(inputs), bagStanza(inputs.bags)].filter(Boolean).join('\n'), names: [...characterNameWords()].sort() }

  await runGenerate(db, { generate: (motive, x) => generateOne(client, motive, x), motives, extras, regenerateAll, forceCode })

  say('validating')
  const report = await validateAll(db)
  printReport(report)
  say(report.pass ? 'PASS' : 'FAIL: run the generation again, or read the counts above')
  process.exit(report.pass ? 0 : 1)
}

// CLI entry: node generate-sealed.mjs (importing this module runs nothing)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(e => {
    printFatal(e) // never prints raw error text — it could carry content
    process.exit(1)
  })
}
