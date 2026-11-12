// The Relay Drawing's picture maker (rebuilt 12 Nov 2026 from the 11 Nov
// handoff, job A7, steps 5 to 7; Jon: "Make the line art better. It just
// looked like slop."). Two banks, from the same maker, straight into
// Firestore:
//
//   sealed/relay_pictures_practice   the practice nights' pictures. Jon sees
//                                    these, so they are burned: make it first.
//   sealed/relay_pictures            the party's pictures. Every practice
//                                    picture's name is on its never-list.
//
// How a picture is made:
// 1. The Claude API designs the WHOLE picture on one canvas (a size × size
//    grid, one unit a square), from lines, arcs, circles and dots on
//    quarter-square points, with its name, three wrong names of the same
//    kind, and a few close synonyms for the judge. Rounds 1 and 2: a thing a
//    child can name. Round 3: a tidy pattern with a mirror or a repeat.
// 2. Plain code cuts it into squares (relay-art.mjs cutPicture), so strokes
//    always meet at the squares' edges, and judges it (codeChecks): inside
//    the canvas, on quarter points, no square too busy to copy, not too many
//    empty squares, names distinct, nothing on the never-list. Then the
//    bank's own check (relay-bank.js checkPicture), the one the night uses.
// 3. The eye judge: the cut squares are drawn to a PNG in memory and a
//    vision model is asked what it is, without the name, up to three times,
//    each a separate call. The picture is kept when two answers match its
//    name or a synonym (loosely: case, plurals, an article).
//
// REBUILD, NOT TOP UP. A run replaces its bank with what it made. This
// replaces the old rule "the Steward's work survives" for this bank, by the
// handoff of 11 Nov 2026 (nobody had edited the old bank; Jenna's page has
// no pictures tab). A run that makes nothing writes nothing.
//
// SEAL RULES (the same as generate-leans.mjs and pack-bags.mjs):
// - stdout gets COUNTS AND PASS/FAIL ONLY: how many designed, how many each
//   check dropped (by check, never by name), how many kept a round. Never a
//   name, a stroke, the judge's answers or a model's reply, not even in an
//   error (an error prints its class and a length).
// - No picture is ever written to a local file. The PNG lives in memory.
//
//   node generate-relay-pictures.mjs --practice   rebuild the practice bank
//   node generate-relay-pictures.mjs --party      rebuild the party bank (after the practice one)
//   node generate-relay-pictures.mjs --dry        design and judge practice pictures, write nothing
//   add --dry to --practice or --party to design and judge that bank's, and write nothing
// (npm --prefix scripts run relay-pictures -- --practice, and so on)

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { adminDb, printFatal, say } from './lib.mjs'
import { BANK_DOC, PRACTICE_BANK_DOC, ROUND_SIZES, ROUND_CAPS, STROKES_PER_SQUARE, checkPicture, DISQUALIFIED, NEVER_WORDS } from '../functions/lib/relay-bank.js'
import { cutPicture, codeChecks, renderPng, eyeVerdict, normalise, MIN_SQUARES } from './relay-art.mjs'

const MODEL = process.env.MODEL ?? 'claude-opus-5-5'
const EYE_MODEL = process.env.EYE_MODEL ?? MODEL
export const MAKE_PER_ROUND = 6   // good pictures a bank aims for, a round; a night draws one at random
export const DESIGNS_PER_CALL = 4 // pictures the designer is asked for in one call
export const MAX_CALLS = 8        // design calls a round may make before it stops short
const ROUNDS = Object.keys(ROUND_SIZES).map(Number)

// ---- the designer's reply -------------------------------------------------

const Point = z.array(z.number()).length(2)
const Stroke = z.object({
  kind: z.enum(['line', 'arc', 'circle', 'dot']),
  from: Point.optional(), to: Point.optional(), bulge: z.number().optional(), at: Point.optional(), r: z.number().optional(),
})
const Design = z.object({
  name: z.string(),
  decoys: z.array(z.string()),
  synonyms: z.array(z.string()).optional(),
  strokes: z.array(Stroke),
})
const Reply = z.object({ pictures: z.array(z.unknown()) })

// The reply's JSON (the first { to the last }), each picture checked on its
// own: one malformed picture does not lose the others. Throws a plain error
// with no text from the reply in it.
export function parseDesigns(text) {
  const s = String(text ?? '')
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('no JSON in the reply')
  let json
  try { json = JSON.parse(s.slice(a, b + 1)) } catch { throw new Error('the reply is not JSON') }
  const top = Reply.safeParse(json)
  if (!top.success) throw new Error('the reply has no pictures list')
  return top.data.pictures.map(p => { const d = Design.safeParse(p); return d.success ? d.data : null })
}

const ROUND_BRIEF = {
  1: 'Round 1, the easiest: one everyday thing that an 11-year-old and a 70-year-old would both name at once, in one or two words. Bold and very simple.',
  2: 'Round 2: one everyday thing a child can name in one or two words, with a little more detail than round 1.',
  3: 'Round 3: a tidy pattern or design with a mirror symmetry or a regular repeat, which has a well-known name that a room could pick out from four names. Neat and deliberate, like a printed motif.',
}

export function designPrompt(round, { never = [], feedback = '' } = {}) {
  const size = ROUND_SIZES[round]
  const cols = 'ABCDEFG'.slice(0, size).split('').join(', ')
  const neverList = [...new Set([...DISQUALIFIED, ...NEVER_WORDS, ...never])]
  return `You design line pictures for a party drawing game. The room sees one square of a
picture at a time on a TV and describes it in words; one player copies that square onto a big
paper grid with a thick marker. Once every square is copied, the room must recognise the whole
picture and pick its name from four names. The players are aged 11 to 70.

THE CANVAS. A ${size} by ${size} grid of squares. x runs from 0 (left edge) to ${size} (right
edge), y from 0 (top edge) to ${size} (bottom edge): one unit is one square. Columns are ${cols}
from the left; rows are 1 to ${size} from the top; A1 is the top-left square, from (0, 0) to (1, 1).

Design the WHOLE picture on this one canvas. The game cuts it into squares by itself, so your
strokes may run across as many squares as they like and will always join up.

STROKES (canvas units):
- line:   {"kind": "line", "from": [x, y], "to": [x, y]}
- arc:    {"kind": "arc", "from": [x, y], "to": [x, y], "bulge": b}
          a smooth curve from one end to the other that swings out from the straight line between
          them by b times that distance, at its middle. b is between -0.5 and 0.5. Positive b
          swings to the right of the direction of travel on the screen (y grows downward): from
          [0, 1] to [2, 1] with b = 0.5 the curve dips down to [1, 2]; with b = -0.5 it rises to [1, 0].
- circle: {"kind": "circle", "at": [x, y], "r": radius}  (radius at least 0.25)
- dot:    {"kind": "dot", "at": [x, y]}  (a small filled spot)

RULES. Every one must hold, or the picture is thrown away:
- Every number (every x, y and radius) is a multiple of 0.25, so the room can say it ("a
  quarter of the way along the top edge").
- Every part of every stroke stays inside the canvas, curves and circles included.
- Between ${MIN_SQUARES[round]} and ${ROUND_CAPS[round]} of the ${size * size} squares have ink
  in them; the rest stay empty. A square has ink if any stroke passes through its inside.
- After cutting, no square may hold more than ${STROKES_PER_SQUARE} pieces of stroke: do not
  let many strokes cross the same square.
- Do not run a line exactly along a grid line (x or y a whole number for its full length).
- Thick, bold and simple: about 6 to 18 strokes in all, big shapes that span several squares.
  It must look made with care: symmetry where the thing is symmetrical, parts lined up, equal
  spacing, closed shapes that close. A clear icon, never a scribble.
- No single square gives the whole picture away.

${ROUND_BRIEF[round]}

NAMES for each picture:
- "name": a short name with an article and one or two words.
- "decoys": exactly three wrong names, the same kind of thing (other ${round === 3 ? 'patterns' : 'everyday things'}),
  fair guesses for a rough copy of this drawing but clearly different from it. All four names
  different, and no decoy a synonym of the name.
- "synonyms": up to six other words or short phrases people might call this exact drawing.

NEVER, as the picture, its name, a wrong name or a synonym, because they are clues elsewhere in
the game or already used: ${neverList.join(', ')}.
Give no picture an example name from these instructions.
${feedback ? `\n${feedback}\n` : ''}
Reply with JSON only, no other words:
{"pictures": [{"name": "...", "decoys": ["...", "...", "..."], "synonyms": ["..."], "strokes": [ ... ]}]}`
}

// Plain-count feedback for the next call: which checks the last designs
// failed, by check, never naming a picture.
const FEEDBACK = {
  empty: 'too few squares had ink', squares: 'too many squares had ink', busy: 'a square held too many strokes',
  canvas: 'a stroke went outside the canvas', grid: 'a number was not a multiple of 0.25', shape: 'a stroke was malformed',
  names: 'the names were not four different names', never: 'a name was on the never list', burned: 'a name was on the never list',
  eye: 'a fresh viewer could not tell what the drawing was', repeat: 'the name was already used',
}
function feedbackLine(drops) {
  const parts = Object.entries(drops).filter(([k, n]) => n && FEEDBACK[k]).map(([k, n]) => `${n} ${n === 1 ? 'time' : 'times'} ${FEEDBACK[k]}`)
  return parts.length ? `Earlier designs for this round were thrown away because: ${parts.join('; ')}. Avoid that.` : ''
}

const EYE_QUESTIONS = {
  thing: [
    'What is this simple line drawing of? Answer with just its name, in one to three words.',
    'Name the thing in this line drawing in one to three words. Nothing else.',
    'Someone copied this drawing square by square with a marker. What is it? Reply with one to three words only.',
  ],
  pattern: [
    'This line drawing is a simple pattern or design. What is it called? Answer with just its name, in one to three words.',
    'Name this pattern or design in one to three words. Nothing else.',
    'What would most people call this design? Reply with one to three words only.',
  ],
}

// ---- the Claude API -------------------------------------------------------

const textOf = msg => (msg?.stop_reason === 'refusal' ? '' : (msg?.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('\n'))

async function designWithApi(client, round, count, opts) {
  const msg = await client.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    output_config: { effort: 'high' },
    system: designPrompt(round, opts),
    messages: [{ role: 'user', content: `Design ${count} different pictures for round ${round}.` }],
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

// An error's class and a length only: never its message, which could carry content.
const errorNote = e => `${e?.constructor?.name ?? 'Error'}${e?.status ? ` ${e.status}` : ''}, message length ${String(e?.message ?? '').length}`

// ---- one bank -------------------------------------------------------------

// Make up to `target` good pictures a round. `design(round, count, { never,
// feedback })` returns the designer's reply text; `ask(png, round, i)` returns
// the eye judge's answer. `never` is the bank's extra never-list (the
// practice names, for the party). Returns { pictures, report } where the
// report is counts only.
export async function makeBank({ design, ask, never = [], target = MAKE_PER_ROUND, maxCalls = MAX_CALLS, perCall = DESIGNS_PER_CALL, newId = () => Math.random().toString(36).slice(2, 10), log = say }) {
  const pictures = []
  const used = new Set() // normalised names kept in this bank, so no two pictures share one
  const report = {}
  await Promise.all(ROUNDS.map(async round => {
    const size = ROUND_SIZES[round]
    const r = report[round] = { calls: 0, failedCalls: 0, designed: 0, drops: {}, eyeAsks: 0, kept: 0 }
    const drop = why => { r.drops[why] = (r.drops[why] ?? 0) + 1 }
    let failedInRow = 0
    while (r.kept < target && r.calls < maxCalls && failedInRow < 3) {
      r.calls++
      let designs
      try {
        designs = parseDesigns(await design(round, perCall, { never: [...never, ...pictures.map(p => p.name)], feedback: feedbackLine(r.drops) }))
        failedInRow = 0
      } catch (e) {
        r.failedCalls++; failedInRow++
        log(`round ${round}: a design call failed (${errorNote(e)})`)
        continue
      }
      await Promise.all(designs.map(async d => {
        r.designed++
        if (!d) { drop('reply'); return }
        const cells = cutPicture(d.strokes, size)
        const why = codeChecks(d, cells, round, { never })
        if (why.length) { drop(why[0]); return }
        const pic = { id: newId(), round, name: d.name.trim(), decoys: d.decoys.map(x => x.trim()), cells }
        if (checkPicture(pic, round).length) { drop('bank'); return }
        if (used.has(normalise(pic.name))) { drop('repeat'); return }
        const png = renderPng(cells, size)
        const v = await eyeVerdict(i => ask(png, round, i), pic.name, d.synonyms ?? [])
        r.eyeAsks += v.asked
        if (!v.keep) { drop('eye'); return }
        if (r.kept >= target) { drop('extra'); return }
        if (used.has(normalise(pic.name))) { drop('repeat'); return }
        used.add(normalise(pic.name))
        pictures.push(pic)
        r.kept++
      }))
    }
  }))
  return { pictures, report }
}

const DROP_WORDS = {
  reply: 'unreadable', shape: 'malformed strokes', grid: 'off the quarter points', canvas: 'outside the canvas',
  names: 'names not four different', never: 'on the never-list', burned: 'a practice name', empty: 'too many empty squares',
  squares: 'too many squares', busy: 'a square too busy', bank: 'the bank check', repeat: 'a name already kept',
  eye: 'the eye judge', extra: 'the round was already full',
}

// ---- a run ------------------------------------------------------------------

// `db` is needed for a real run, and for the party's never-list (the practice
// bank's names); a practice dry run touches no database.
export async function runRelayPictures(db, { bank = 'practice', dry = false, design, ask, now = () => new Date(), log = say, newId, target, maxCalls, perCall } = {}) {
  const party = bank === 'party'
  const doc = party ? BANK_DOC : PRACTICE_BANK_DOC
  log(`the ${party ? 'party' : 'practice'} bank${dry ? ' (dry run: designed and judged, nothing written)' : ''}`)
  let never = []
  if (party) {
    const snap = await db.doc(PRACTICE_BANK_DOC).get()
    const practice = snap.exists ? (snap.data()?.pictures ?? []) : []
    log(`the practice bank: ${practice.length} pictures, their names kept off this bank`)
    if (!practice.length && !dry) {
      log('FAIL: make the practice bank first (--practice), so no party picture shares a name with one')
      return { kept: 0, short: MAKE_PER_ROUND * ROUNDS.length, written: false }
    }
    never = practice.map(p => String(p?.name ?? '')).filter(Boolean)
  }
  const { pictures, report } = await makeBank({ design, ask, never, log, ...(newId ? { newId } : {}), ...(target ? { target } : {}), ...(maxCalls ? { maxCalls } : {}), ...(perCall ? { perCall } : {}) })
  const want = target ?? MAKE_PER_ROUND
  let short = 0, calls = 0, eye = 0
  for (const round of ROUNDS) {
    const r = report[round]
    calls += r.calls; eye += r.eyeAsks
    const drops = Object.entries(r.drops).map(([k, n]) => `${n} ${DROP_WORDS[k] ?? k}`).join(', ')
    log(`round ${round}: ${r.calls} design calls${r.failedCalls ? ` (${r.failedCalls} failed)` : ''}, ${r.designed} designed, ${r.kept} kept${drops ? `; dropped: ${drops}` : ''}`)
    if (r.kept < want) { short += want - r.kept; log(`round ${round}: ${want - r.kept} short of ${want}`) }
  }
  log(`${calls} design calls and ${eye} eye-judge calls in all`)
  let written = false
  if (!dry && pictures.length) {
    await db.doc(doc).set({ pictures, generatedAt: now(), maker: 'whole-canvas 12 Nov 2026' })
    written = true
    log(`wrote ${pictures.length} pictures, replacing the bank`)
  } else if (!dry) log('nothing kept: the bank is left as it was')
  const empty = ROUNDS.filter(r => report[r].kept === 0).length
  log(short ? `FAIL: ${short} short${empty ? `; ${empty} ${empty === 1 ? 'round has' : 'rounds have'} none and will use the stand-in grids` : ''} (run again to rebuild)` : 'PASS')
  return { kept: pictures.length, short, written }
}

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const bank = args.includes('--party') ? 'party' : args.includes('--practice') ? 'practice' : dry ? 'practice' : null
  if (!bank || (args.includes('--party') && args.includes('--practice'))) {
    say('say which bank: --practice (first), --party, or --dry')
    process.exit(1)
  }
  say(`the Relay Drawing pictures, model ${MODEL}`)
  // a practice dry run needs no database; everything else reads or writes one
  const db = bank === 'practice' && dry ? null : adminDb()
  const client = new Anthropic()
  const r = await runRelayPictures(db, {
    bank, dry,
    design: (round, count, opts) => designWithApi(client, round, count, opts),
    ask: (png, round, i) => askEyeWithApi(client, png, round, i),
  })
  process.exit(r.short ? 1 : 0)
}

// CLI entry: node generate-relay-pictures.mjs (importing this module runs nothing)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(e => {
    printFatal(e) // never prints raw error text: it could carry content
    process.exit(1)
  })
}
