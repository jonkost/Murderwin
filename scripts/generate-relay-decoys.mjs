// The Relay Drawing's example drawings for the wrong names (15 Nov 2026, Jon:
// "There should be example drawings ... For the multiple choice"). At the
// guess the Parlour TV shows four names; with this, a small drawing sits
// over each name. The right name's drawing is the picture itself; this
// script draws the three wrong names of every picture in a bank and adds
// them to that picture as `decoyCells` (functions/lib/relay-bank.js
// hasDecoyDrawings, gridOf). Nothing else in the bank is changed: every
// picture, name and square stays as it was.
//
// How a drawing is made: the Claude API draws the three named things on the
// picture's own canvas, with the picture maker's strokes; plain code cuts
// each into squares and checks its shape; the eye judge (a vision model
// asked what it is, without the name) is asked up to three times. Up to
// three tries a picture. A wrong name whose drawing never passed the eye
// judge keeps its last well-shaped drawing: it is a wrong answer's sketch,
// and nobody copies it by hand. A picture with a wrong name that could not
// be drawn at all is left with its four names alone.
//
// SEAL RULES (the same as generate-relay-pictures.mjs): stdout gets COUNTS
// AND PASS/FAIL ONLY. Never a name, a stroke, the judge's answers or a
// model's reply, not even in an error. Nothing is written to a local file.
//
//   node generate-relay-decoys.mjs --practice   the practice bank
//   node generate-relay-decoys.mjs --party      the party bank
//   add --redo to draw them all again; add --dry to write nothing
// (npm --prefix scripts run relay-decoys -- --practice, and so on)

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { adminDb, printFatal, say } from './lib.mjs'
import { BANK_DOC, PRACTICE_BANK_DOC, ROUND_SIZES, goodCells, hasDecoyDrawings } from '../functions/lib/relay-bank.js'
import { cutPicture, codeChecks, renderPng, eyeVerdict } from './relay-art.mjs'

const MODEL = process.env.MODEL ?? 'claude-opus-5-5'
const EYE_MODEL = process.env.EYE_MODEL ?? MODEL
export const TRIES = 3     // design calls a picture may have
export const AT_ONCE = 4   // pictures worked on side by side

const Point = z.array(z.number()).length(2)
const Stroke = z.object({
  kind: z.enum(['line', 'arc', 'circle', 'dot']),
  from: Point.optional(), to: Point.optional(), bulge: z.number().optional(), at: Point.optional(), r: z.number().optional(),
})
const Drawing = z.object({ strokes: z.array(Stroke) })

// The reply's three drawings, in the order asked; a malformed one is null.
// Throws a plain error with no text from the reply in it.
export function parseDrawings(text) {
  const s = String(text ?? '')
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('no JSON in the reply')
  let json
  try { json = JSON.parse(s.slice(a, b + 1)) } catch { throw new Error('the reply is not JSON') }
  if (!Array.isArray(json?.drawings)) throw new Error('the reply has no drawings list')
  return json.drawings.map(d => { const r = Drawing.safeParse(d); return r.success ? r.data : null })
}

export function drawPrompt(round) {
  const size = ROUND_SIZES[round]
  return `You draw small line pictures for a party game. Four names are shown on a TV with a
little drawing over each; the room picks one. You are given three names and draw each one, so a
person aged 11 to 70 knows at a glance what it is.

THE CANVAS, one for each drawing. A ${size} by ${size} grid of squares. x runs from 0 (left edge)
to ${size} (right edge), y from 0 (top edge) to ${size} (bottom edge).

STROKES (canvas units):
- line:   {"kind": "line", "from": [x, y], "to": [x, y]}
- arc:    {"kind": "arc", "from": [x, y], "to": [x, y], "bulge": b}
          a smooth curve from one end to the other that swings out from the straight line between
          them by b times that distance, at its middle. b is between -0.5 and 0.5. Positive b
          swings to the right of the direction of travel on the screen (y grows downward): from
          [0, 1] to [2, 1] with b = 0.5 the curve dips down to [1, 2]; with b = -0.5 it rises to [1, 0].
- circle: {"kind": "circle", "at": [x, y], "r": radius}  (radius at least 0.25)
- dot:    {"kind": "dot", "at": [x, y]}  (a small filled spot)

RULES. Every one must hold, or the drawing is thrown away:
- Every number (every x, y and radius) is a multiple of 0.25.
- Every part of every stroke stays inside the canvas, curves and circles included.
- Do not run a line exactly along a grid line (x or y a whole number for its full length).
- Thick, bold and simple: about 6 to 18 strokes, big shapes that fill most of the canvas. It
  must look made with care: symmetry where the thing is symmetrical, parts lined up, closed
  shapes that close. A clear icon, never a scribble.

Reply with JSON only, no other words, the three drawings in the order of the three names:
{"drawings": [{"strokes": [ ... ]}, {"strokes": [ ... ]}, {"strokes": [ ... ]}]}`
}

const EYE_QUESTIONS = {
  thing: [
    'What is this simple line drawing of? Answer with just its name, in one to three words.',
    'Name the thing in this line drawing in one to three words. Nothing else.',
    'Someone drew this with a marker. What is it? Reply with one to three words only.',
  ],
  pattern: [
    'This line drawing is a simple pattern or design. What is it called? Answer with just its name, in one to three words.',
    'Name this pattern or design in one to three words. Nothing else.',
    'What would most people call this design? Reply with one to three words only.',
  ],
}

const textOf = msg => (msg?.stop_reason === 'refusal' ? '' : (msg?.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('\n'))
const errorNote = e => `${e?.constructor?.name ?? 'Error'}${e?.status ? ` ${e.status}` : ''}, message length ${String(e?.message ?? '').length}`

async function drawWithApi(client, round, names) {
  const msg = await client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    output_config: { effort: 'high' },
    system: drawPrompt(round),
    messages: [{ role: 'user', content: `Draw these three, in this order:\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}` }],
  }).finalMessage()
  return textOf(msg)
}

async function askEyeWithApi(client, png, round, i) {
  const q = EYE_QUESTIONS[round === 3 ? 'pattern' : 'thing']
  const msg = await client.messages.create({
    model: EYE_MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: png.toString('base64') } },
      { type: 'text', text: q[i % q.length] },
    ] }],
  })
  return textOf(msg)
}

// Is this drawing one the TV can show? The maker's shape checks (well formed,
// on the quarter points, inside the canvas) and the bank's own.
export function shapeOk(strokes, cells, round) {
  const why = codeChecks({ strokes, name: 'a', decoys: ['b', 'c', 'd'] }, cells, round)
  return !why.some(w => ['shape', 'grid', 'canvas'].includes(w)) && goodCells(cells, ROUND_SIZES[round])
}

// One picture's three drawings: [cells, cells, cells], or null when a wrong
// name has no well-shaped drawing after every try. `stats` gets counts only.
export async function drawDecoys(p, { draw, ask, tries = TRIES, stats }) {
  const round = Number(p.round)
  const size = ROUND_SIZES[round]
  const seen = [null, null, null]   // passed the eye judge
  const shaped = [null, null, null] // well shaped, the judge not sure
  for (let t = 0; t < tries && seen.some(x => !x); t++) {
    stats.calls++
    let drawings
    try { drawings = parseDrawings(await draw(round, p.decoys)) } catch (e) { stats.failedCalls++; stats.notes.push(errorNote(e)); continue }
    await Promise.all([0, 1, 2].map(async i => {
      if (seen[i] || !drawings[i]) return
      const cells = cutPicture(drawings[i].strokes, size)
      if (!shapeOk(drawings[i].strokes, cells, round)) { stats.misshapen++; return }
      shaped[i] = cells
      let v = { keep: false, asked: 0 }
      try { v = await eyeVerdict(n => ask(renderPng(cells, size), round, n), p.decoys[i], []) } catch (e) { stats.notes.push(errorNote(e)) }
      stats.eyeAsks += v.asked
      if (v.keep) seen[i] = cells
    }))
  }
  const out = [0, 1, 2].map(i => seen[i] ?? shaped[i])
  if (out.some(x => !x)) return null
  stats.seen += seen.filter(Boolean).length
  stats.unsure += seen.filter(x => !x).length
  return out
}

// A run over one bank. Returns counts only.
export async function runRelayDecoys(db, { bank = 'practice', dry = false, redo = false, draw, ask, log = say, atOnce = AT_ONCE } = {}) {
  const doc = bank === 'party' ? BANK_DOC : PRACTICE_BANK_DOC
  log(`the ${bank === 'party' ? 'party' : 'practice'} bank${dry ? ' (dry run: nothing written)' : ''}`)
  const snap = await db.doc(doc).get()
  const pictures = snap.exists ? (snap.data()?.pictures ?? []) : []
  if (!pictures.length) { log('FAIL: the bank has no pictures'); return { pictures: 0, drawn: 0, left: 0, written: false } }
  const todo = pictures.filter(p => ROUND_SIZES[Number(p?.round)] && Array.isArray(p?.decoys) && p.decoys.length === 3 && (redo || !hasDecoyDrawings(p, ROUND_SIZES[Number(p.round)])))
  log(`${pictures.length} pictures, ${pictures.length - todo.length} with their three drawings already, ${todo.length} to draw`)
  const stats = { calls: 0, failedCalls: 0, misshapen: 0, eyeAsks: 0, seen: 0, unsure: 0, notes: [] }
  const made = new Map() // picture id -> [cells, cells, cells]
  let next = 0
  await Promise.all(Array.from({ length: Math.min(atOnce, todo.length) }, async () => {
    while (next < todo.length) {
      const p = todo[next++]
      const cells = await drawDecoys(p, { draw, ask, stats })
      if (cells) made.set(p.id, cells)
    }
  }))
  log(`${stats.calls} drawing calls${stats.failedCalls ? ` (${stats.failedCalls} failed)` : ''} and ${stats.eyeAsks} eye-judge calls`)
  log(`${made.size} of ${todo.length} pictures drawn: ${stats.seen} drawings the eye judge named, ${stats.unsure} kept on shape alone, ${stats.misshapen} thrown away`)
  for (const n of [...new Set(stats.notes)].slice(0, 5)) log(`a call failed (${n})`)
  let written = false
  if (!dry && made.size) {
    // only `decoyCells` is added, on the bank as it is now: a picture that changed meanwhile is left alone
    await db.runTransaction(async tx => {
      const now = await tx.get(db.doc(doc))
      const list = (now.data()?.pictures ?? []).map(p => {
        const cells = made.get(p?.id)
        const was = todo.find(t => t.id === p?.id)
        return cells && was && JSON.stringify(was.decoys) === JSON.stringify(p.decoys) ? { ...p, decoyCells: cells } : p
      })
      tx.update(db.doc(doc), { pictures: list, decoysAt: new Date() })
    })
    written = true
    log(`wrote the drawings of ${made.size} pictures; nothing else in the bank changed`)
  }
  const left = todo.length - made.size
  log(left ? `FAIL: ${left} ${left === 1 ? 'picture is' : 'pictures are'} left with names alone (run again)` : 'PASS')
  return { pictures: pictures.length, drawn: made.size, left, written }
}

async function main() {
  const args = process.argv.slice(2)
  const bank = args.includes('--party') ? 'party' : args.includes('--practice') ? 'practice' : null
  if (!bank || (args.includes('--party') && args.includes('--practice'))) { say('say which bank: --practice or --party'); process.exit(1) }
  say(`the Relay Drawing's example drawings, model ${MODEL}`)
  const client = new Anthropic()
  const r = await runRelayDecoys(adminDb(), {
    bank, dry: args.includes('--dry'), redo: args.includes('--redo'),
    draw: (round, names) => drawWithApi(client, round, names),
    ask: (png, round, i) => askEyeWithApi(client, png, round, i),
  })
  process.exit(r.left ? 1 : 0)
}

// CLI entry: node generate-relay-decoys.mjs (importing this module runs nothing)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(e => {
    printFatal(e) // never prints raw error text: it could carry content
    process.exit(1)
  })
}
