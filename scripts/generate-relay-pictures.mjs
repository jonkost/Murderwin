// Fills the Relay Drawing's picture bank (docs/handoff-2026-10-22.md §7)
// straight into Firestore: simple thick-line pictures for rounds 1 to 3
// (3 × 3, 4 × 4, 5 × 5), each with three wrong names for the guess. Jon runs
// this; Jon never sees a picture. The drawing reads the bank on the party
// night only (functions/lib/relay-bank.js).
// SEAL RULES (the same as generate-leans.mjs and pack-bags.mjs):
// - stdout gets COUNTS AND PASS/FAIL ONLY. Never a name, never a stroke,
//   not in logs, not in errors, not in files.
// - A picture that fails the checks (relay-bank.checkPicture) is dropped and
//   counted, never shown.
//
// THE STEWARD'S WORK SURVIVES. Pictures already in sealed/relay_pictures are
// never touched; a run only tops each round up to PER_ROUND good pictures.
//
//   node generate-relay-pictures.mjs          top every round up
//   node generate-relay-pictures.mjs --dry    count what is missing, call nothing, write nothing

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { adminDb, redactedError, printFatal, say } from './lib.mjs'
import { BANK_DOC, ROUND_SIZES, ROUND_CAPS, checkPicture, TRACE_WORDS, MOTIVE_WORDS } from '../functions/lib/relay-bank.js'

const MODEL = process.env.MODEL ?? 'claude-opus-5'
export const PER_ROUND = 3 // pictures kept per round; the night picks one at random

const Point = z.array(z.number()).length(2)
const Stroke = z.object({
  kind: z.enum(['line', 'arc', 'circle', 'dot']),
  from: Point.optional(), to: Point.optional(), bulge: z.number().optional(), at: Point.optional(), r: z.number().optional(),
})
export const PictureReply = z.object({
  pictures: z.array(z.object({
    name: z.string(),
    decoys: z.array(z.string()),
    cells: z.array(z.object({ label: z.string(), strokes: z.array(Stroke) })),
  })),
})

export function systemPrompt(round) {
  const size = ROUND_SIZES[round]
  const cols = 'ABCDE'.slice(0, size).split('').join(', ')
  return `You design pictures for a party drawing game. The picture is drawn on a
${size} by ${size} grid of squares, one square at a time, by players who cannot
see the whole picture; the room describes each square in words.

Columns are ${cols}; rows are 1 to ${size}; A1 is the top-left square.
Each square holds at most two strokes, in that square's own coordinates:
x from 0 (left edge) to 1 (right edge), y from 0 (top edge) to 1 (bottom edge).
Strokes:
- line:   { kind: "line", from: [x, y], to: [x, y] }
- arc:    { kind: "arc", from: [x, y], to: [x, y], bulge: -0.5 to 0.5 } (a curve; the sign picks the side)
- circle: { kind: "circle", at: [x, y], r: up to 0.5 }
- dot:    { kind: "dot", at: [x, y] }
Use simple anchor points (0, 0.25, 0.5, 0.75, 1) so the room can say them.
Strokes in neighbouring squares should meet at the shared edge so the picture joins up.

Round ${round}: ${round === 1 ? 'a simple object' : round === 2 ? 'a slightly harder object' : 'a pattern: not complicated, but more sophisticated'}.
Draw between ${size} and ${ROUND_CAPS[round]} squares; leave the rest empty.
No single square may give the picture away.
Never a smiley face, a house, a diamond pattern, a star or a teapot.
Never any of these, as the picture or as one of its wrong names, because they
are clues elsewhere in the game: ${TRACE_WORDS.join(', ')};
${MOTIVE_WORDS.join(', ')}.
Give each picture a short name (an article and one or two words) and three
different wrong names that are fair guesses for the same drawing.`
}

async function generatePictures(client, round, count) {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: systemPrompt(round),
    messages: [{ role: 'user', content: `Design ${count} different pictures for round ${round}.` }],
    output_format: betaZodOutputFormat(PictureReply),
  })
  if (!response.parsed_output) throw new Error(`schema parse returned null (stop_reason ${response.stop_reason})`)
  return response.parsed_output.pictures
}

// The model's shape to the bank's: cells as a map, the round on each.
export function toBankPicture(p, round, id) {
  const cells = {}
  for (const c of p?.cells ?? []) if (c?.label && Array.isArray(c.strokes) && c.strokes.length) cells[String(c.label).toUpperCase()] = c.strokes
  return { id, round, name: String(p?.name ?? '').trim(), decoys: (p?.decoys ?? []).map(d => String(d).trim()), cells }
}

// One run: count each round's good pictures, ask for what is missing, keep only what passes.
// `generate(round, count)` returns pictures in the reply's shape.
export async function runRelayPictures(db, { generate, dry = false, now = () => new Date(), log = say, newId = () => Math.random().toString(36).slice(2, 10) } = {}) {
  const ref = db.doc(BANK_DOC)
  const snap = await ref.get()
  const doc = snap.exists ? snap.data() : {}
  const pictures = [...(doc.pictures ?? [])]
  let added = 0, dropped = 0, short = 0
  for (const round of [1, 2, 3]) {
    const mine = pictures.filter(p => Number(p?.round) === round)
    const good = mine.filter(p => !checkPicture(p, round).length).length
    const want = Math.max(0, PER_ROUND - good)
    // a picture already there that fails today's checks (the never-list grew) is kept, never
    // used on the night (relay-bank.relayGrids skips it), and topped up like a missing one
    log(`round ${round}: ${good} good pictures${mine.length > good ? `, ${mine.length - good} that fail the checks (kept, never used)` : ''}, ${want} to make`)
    if (!want || dry) { short += dry ? want : 0; continue }
    let reply = null
    for (let attempt = 1; attempt <= 3 && !reply; attempt++) {
      try { reply = await generate(round, want + 1) } catch (e) {
        if (attempt === 3) throw redactedError('picture generation', e)
        log(`attempt ${attempt} failed, retrying`)
      }
    }
    let kept = 0
    for (const p of reply ?? []) {
      if (kept >= want) break
      const pic = toBankPicture(p, round, newId())
      if (checkPicture(pic, round).length) { dropped++; continue }
      pictures.push(pic); kept++; added++
    }
    short += want - kept
  }
  if (dry) { log('dry run: nothing called, nothing written'); return { added: 0, dropped: 0, short } }
  if (added) await ref.set({ ...doc, pictures, generatedAt: now() })
  log(`added ${added}${dropped ? `, dropped ${dropped} that failed the checks` : ''}`)
  log(short ? `FAIL: ${short} still missing (run again); a round with none uses the stand-in grids on the night` : 'PASS')
  return { added, dropped, short }
}

async function main() {
  const dry = process.argv.includes('--dry')
  const db = adminDb()
  say(`the Relay Drawing pictures, model ${MODEL}${dry ? ' (dry run)' : ''}`)
  const client = dry ? null : new Anthropic()
  const r = await runRelayPictures(db, { generate: (round, count) => generatePictures(client, round, count), dry })
  process.exit(r.short && !dry ? 1 : 0)
}

// CLI entry: node generate-relay-pictures.mjs (importing this module runs nothing)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(e => {
    printFatal(e) // never prints raw error text: it could carry content
    process.exit(1)
  })
}
