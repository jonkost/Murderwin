// Fills in the Parlour Games lean table (docs/parlour-games.md) straight into
// Firestore: for every question in the workshop's Parlour Games list, which of
// the two answers each cat would pick. Jon runs this; Jon never sees it.
// SEAL RULES (the same as generate-relay-pictures.mjs and pack-bags.mjs):
// - stdout gets COUNTS AND PASS/FAIL ONLY. Never a lean, never a question,
//   not in logs, not in errors, not in files.
// - The questions go to the model under opaque references (Q1, Q2, …) in a
//   shuffled order, so nothing printed lines up with the list.
//
// THE STEWARD'S WORK SURVIVES. Only blanks are filled: a lean already in
// sealed/parlour_leans (Jenna's, from the Steward page, or an earlier run)
// is never touched. Run it again after adding sets to the workshop and it
// fills only the new questions. To redo one, Jenna clears it on her page.
//
//   node generate-leans.mjs          fill every blank lean
//   node generate-leans.mjs --dry    count the blanks, call nothing, write nothing

import { randomInt } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { adminDb, areaItems, redactedError, printFatal, say } from './lib.mjs'

const MODEL = process.env.MODEL ?? 'claude-opus-5'
export const LEANS_DOC = 'sealed/parlour_leans' // the doc the dealer reads at the case deal (functions/lib/deal.js)
export const LISTENERS = ['granolia', 'boo', 'zimothy', 'salem'] // never Irwin
const QUESTIONS = 3

const Pick = z.enum(['a', 'b'])
export const LeanReply = z.object({
  leans: z.array(z.object({ ref: z.string(), granolia: Pick, boo: Pick, zimothy: Pick, salem: Pick })),
})

const SYSTEM = `You decide, for a party game, which of two answers each of four
cats would pick to a silly question. The cats live in a Victorian manor:

- granolia: Granolia Lickspittle, the nerdy one. Bookish, precise, loves facts,
  lives in the study.
- boo: Miss Boo LaRue, the posh one. Refined, a little vain, likes the finer
  things and good manners.
- zimothy: Zimothy Clawford, Esq., the old family solicitor, the fussy one.
  Particular, proper, thinks about cost and rules.
- salem: Salem Crookshank, the groundskeeper, grumpy and outdoorsy. Practical,
  muddy, contrary, likes the weather and dislikes fuss.

For each question reference you are given, return the answer each cat would
pick: "a" for the first answer or "b" for the second. Pick the one that best
fits each cat's obvious nature. The four cats need not agree. Return every
reference exactly once.`

function shuffled(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// The questions that still need a lean from at least one cat, under opaque refs.
export function blanksOf(items, table) {
  const out = []
  for (const it of items) {
    const beats = Array.isArray(it.beats) ? it.beats : []
    if (beats.length !== QUESTIONS || !beats.every(b => b?.q && b?.a && b?.b)) continue
    beats.forEach((b, q) => {
      const have = table?.[it.id]?.[q] ?? {}
      const cats = LISTENERS.filter(c => !['a', 'b'].includes(have[c]))
      if (cats.length) out.push({ setId: String(it.id), q, cats, text: { q: b.q, a: b.a, b: b.b } })
    })
  }
  return shuffled(out).map((x, i) => ({ ...x, ref: `Q${i + 1}` }))
}

export function userPrompt(blanks) {
  return blanks.map(x => `${x.ref}: ${x.text.q}\n  a) ${x.text.a}\n  b) ${x.text.b}`).join('\n')
}

async function generateLeans(client, blanks) {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt(blanks) }],
    output_format: betaZodOutputFormat(LeanReply),
  })
  if (!response.parsed_output) throw new Error(`schema parse returned null (stop_reason ${response.stop_reason})`)
  return response.parsed_output.leans
}

// One run: read the list and the table, ask for the blanks, write only those.
// `generate(blanks)` returns [{ ref, granolia, boo, zimothy, salem }].
export async function runLeans(db, { generate, dry = false, now = () => new Date(), log = say } = {}) {
  const items = await areaItems(db, 'scenarios')
  const ref = db.doc(LEANS_DOC)
  const snap = await ref.get()
  const doc = snap.exists ? snap.data() : {}
  const table = structuredClone(doc.sets ?? {})
  const blanks = blanksOf(items, table)
  const cells = blanks.reduce((n, x) => n + x.cats.length, 0)
  const sets = new Set(items.filter(i => Array.isArray(i.beats) && i.beats.length === QUESTIONS).map(i => i.id)).size
  log(`Parlour Games list: ${sets} sets, ${sets * QUESTIONS} questions; ${cells} cat leans to fill`)
  if (!cells) { log('nothing to fill. PASS'); return { filled: 0, blank: 0 } }
  if (dry) { log('dry run: nothing called, nothing written'); return { filled: 0, blank: cells } }

  let reply = null
  for (let attempt = 1; attempt <= 3 && !reply; attempt++) {
    try {
      reply = await generate(blanks)
    } catch (e) {
      if (attempt === 3) throw redactedError('lean generation', e)
      log(`attempt ${attempt} failed, retrying`)
    }
  }
  const byRef = new Map((Array.isArray(reply) ? reply : []).map(r => [r?.ref, r]))
  let filled = 0, missing = 0
  for (const x of blanks) {
    const r = byRef.get(x.ref)
    for (const cat of x.cats) {
      if (!['a', 'b'].includes(r?.[cat])) { missing++; continue }
      table[x.setId] ??= {}
      table[x.setId][x.q] ??= {}
      table[x.setId][x.q][cat] = r[cat]
      filled++
    }
  }
  // the whole table back, with the Steward's marks on the doc kept as they were
  await ref.set({ ...doc, sets: table, generatedAt: now() })
  log(`filled ${filled} of ${cells}${missing ? `, ${missing} left blank (run again to fill them)` : ''}`)
  log(missing ? 'FAIL: some leans are still blank; on the night those questions pick at random' : 'PASS')
  return { filled, blank: missing }
}

async function main() {
  const dry = process.argv.includes('--dry')
  const db = adminDb()
  say(`the cats' leans for the Parlour Games, model ${MODEL}${dry ? ' (dry run)' : ''}`)
  const client = dry ? null : new Anthropic()
  const r = await runLeans(db, { generate: blanks => generateLeans(client, blanks), dry })
  process.exit(r.blank && !dry ? 1 : 0)
}

// CLI entry: node generate-leans.mjs (importing this module runs nothing)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(e => {
    printFatal(e) // never prints raw error text: it could carry content
    process.exit(1)
  })
}
