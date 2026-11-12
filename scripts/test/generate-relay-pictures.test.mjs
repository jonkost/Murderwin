import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import { memoryDb } from '../lib.mjs'
import { runRelayPictures, makeBank, parseDesigns, designPrompt, MAKE_PER_ROUND } from '../generate-relay-pictures.mjs'
import { cutPicture, codeChecks, rasterize, renderPng, answerMatches, eyeVerdict, normalise, MIN_SQUARES, PX } from '../relay-art.mjs'
import { BANK_DOC, PRACTICE_BANK_DOC, ROUND_SIZES, checkPicture, NEVER_WORDS } from '../../functions/lib/relay-bank.js'

// SEAL. Every picture here is a throwaway typed by hand in this file, with
// made-up names (Zorp, Quib). No API is called and no real Firestore is
// touched; the "designer" and the "eye judge" are stubs. Every printed line
// of a run is captured and checked for content.

const near = (a, b) => Math.abs(a - b) < 1e-6
const samePt = (p, q) => near(p[0], q[0]) && near(p[1], q[1])

// ---- the cutter -------------------------------------------------------------

test('the cutter: a line across three squares is cut into three, and the pieces meet at the edges', () => {
  const cells = cutPicture([{ kind: 'line', from: [0, 0.5], to: [3, 0.5] }], 3)
  assert.deepEqual(Object.keys(cells).sort(), ['A1', 'B1', 'C1'])
  for (const k of ['A1', 'B1', 'C1']) assert.equal(cells[k].length, 1)
  assert.deepEqual(cells.A1[0], { kind: 'line', from: [0, 0.5], to: [1, 0.5] })
  assert.deepEqual(cells.B1[0], { kind: 'line', from: [0, 0.5], to: [1, 0.5] })
  assert.deepEqual(cells.C1[0], { kind: 'line', from: [0, 0.5], to: [1, 0.5] })
})

test('the cutter: a diagonal through the corners goes through the three squares on it and no others', () => {
  const cells = cutPicture([{ kind: 'line', from: [0, 0], to: [3, 3] }], 3)
  assert.deepEqual(Object.keys(cells).sort(), ['A1', 'B2', 'C3'])
  for (const k of ['A1', 'B2', 'C3']) assert.deepEqual(cells[k], [{ kind: 'line', from: [0, 0], to: [1, 1] }])
})

test('the cutter: a slanted line meets itself exactly at every edge it crosses', () => {
  const cells = cutPicture([{ kind: 'line', from: [0.25, 0.25], to: [2.75, 1.75] }], 3)
  // every piece's end on an edge has a partner in the square across that edge
  const ends = []
  for (const [k, strokes] of Object.entries(cells)) {
    const c = k.charCodeAt(0) - 65, r = Number(k.slice(1)) - 1
    for (const s of strokes) for (const p of [s.from, s.to]) ends.push([p[0] + c, p[1] + r])
  }
  const inner = ends.filter(([x, y]) => !(near(x, 0.25) && near(y, 0.25)) && !(near(x, 2.75) && near(y, 1.75)))
  assert.ok(inner.length >= 4)
  for (const p of inner) assert.equal(inner.filter(q => samePt(p, q)).length, 2, 'each cut point is shared by exactly two pieces')
})

test('the cutter: a circle inside one square stays a circle; a big one becomes arcs that join up, within the game\'s bulge', () => {
  const small = cutPicture([{ kind: 'circle', at: [1.5, 1.5], r: 0.25 }], 3)
  assert.deepEqual(small, { B2: [{ kind: 'circle', at: [0.5, 0.5], r: 0.25 }] })
  const big = cutPicture([{ kind: 'circle', at: [1.5, 1.5], r: 1 }], 3)
  const strokes = Object.values(big).flat()
  assert.ok(strokes.length >= 8)
  for (const s of strokes) {
    assert.ok(['arc', 'line'].includes(s.kind))
    if (s.kind === 'arc') assert.ok(Math.abs(s.bulge) <= 0.6)
    for (const p of [s.from, s.to]) assert.ok(p.every(v => v >= 0 && v <= 1))
  }
  assert.ok(!big.B2, 'the middle square is empty: the circle goes round it')
})

test('the cutter: a dot goes in the square it sits in', () => {
  assert.deepEqual(cutPicture([{ kind: 'dot', at: [2.5, 0.25] }], 3), { C1: [{ kind: 'dot', at: [0.5, 0.25] }] })
})

// ---- the rasterizer ---------------------------------------------------------

function decodeGray(png) {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 'a PNG signature')
  let at = 8, width = 0, height = 0
  const idat = []
  while (at < png.length) {
    const len = png.readUInt32BE(at), type = png.toString('ascii', at + 4, at + 8)
    const data = png.subarray(at + 8, at + 8 + len)
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.equal(data[8], 8); assert.equal(data[9], 0) }
    if (type === 'IDAT') idat.push(data)
    at += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  assert.equal(raw.length, (width + 1) * height)
  return { width, height, at: (x, y) => raw[y * (width + 1) + 1 + x] }
}

test('the rasterizer: a tiny known picture gives a PNG of the right size with ink where it should be', () => {
  const cells = { B2: [{ kind: 'line', from: [0, 0.5], to: [1, 0.5] }], A1: [{ kind: 'dot', at: [0.5, 0.5] }] }
  const img = decodeGray(renderPng(cells, 3))
  assert.equal(img.width, 3 * PX + 40)
  assert.equal(img.height, 3 * PX + 40)
  const m = 20
  assert.equal(img.at(m + 150, m + 150), 0, 'ink in the middle of B2, on its line')
  assert.equal(img.at(m + 110, m + 150), 0)
  assert.equal(img.at(m + 150, m + 120), 255, 'paper above the line')
  assert.equal(img.at(m + 50, m + 50), 0, 'the dot in A1')
  assert.equal(img.at(m + 250, m + 250), 255, 'C3 is empty')
  assert.equal(img.at(2, 2), 255, 'the margin is paper')
  const bmp = rasterize(cells, 3)
  assert.equal(bmp.pixels.length, bmp.width * bmp.height)
})

// ---- the eye judge ----------------------------------------------------------

test('loose matching: case, plurals, an article, a lead-in, a synonym; a different thing does not match', () => {
  assert.equal(normalise('The Zorps!'), 'zorp')
  assert.ok(answerMatches('A zorp', 'A Zorp'))
  assert.ok(answerMatches('zorps', 'A zorp'))
  assert.ok(answerMatches('It looks like a red zorp.', 'A zorp'))
  assert.ok(answerMatches('a quibble', 'A zorp', ['quibble']))
  assert.ok(answerMatches('a sailing boat', 'A boat'))
  assert.ok(!answerMatches('a quib', 'A zorp', ['zorplet']))
  assert.ok(!answerMatches('', 'A zorp'))
  assert.ok(!answerMatches('a bat', 'A boat'))
})

test('the two-of-three rule: kept on two matches, dropped on two misses, the third asked only when split', async () => {
  const run = async answers => { const asked = []; const v = await eyeVerdict(async i => { asked.push(i); return answers[i] }, 'A zorp', []); return { ...v, n: asked.length } }
  assert.deepEqual(await run(['zorp', 'a zorp', 'quib']), { keep: true, asked: 2, n: 2 })
  assert.deepEqual(await run(['quib', 'quob', 'zorp']), { keep: false, asked: 2, n: 2 })
  assert.deepEqual(await run(['zorp', 'quib', 'zorps']), { keep: true, asked: 3, n: 3 })
  assert.deepEqual(await run(['quib', 'zorp', 'quob']), { keep: false, asked: 3, n: 3 })
  const v = await eyeVerdict(async i => { if (i === 0) throw new Error('down'); return 'zorp' }, 'A zorp', [])
  assert.equal(v.keep, true, 'a failed ask counts as a miss and the others still decide')
})

// ---- the judge in code ------------------------------------------------------

// two rows of lines across the canvas: the fewest squares each round wants
const rows = (round, n = 2) => Array.from({ length: n }, (_, i) => ({ kind: 'line', from: [0, i + 0.5], to: [ROUND_SIZES[round], i + 0.5] }))
const design = (round, extra = {}) => ({ name: `A zorp ${round}`, decoys: ['A quib', 'A quob', 'A quab'], synonyms: ['zorpling'], strokes: rows(round), ...extra })
const check = (d, round, opts) => codeChecks(d, cutPicture(d.strokes, ROUND_SIZES[round]), round, opts)

test('the code checks: a good design passes, and passes the bank\'s own check once cut', () => {
  for (const round of [1, 2, 3]) {
    const d = design(round)
    assert.deepEqual(check(d, round), [], `round ${round}`)
    assert.ok(Object.keys(cutPicture(d.strokes, ROUND_SIZES[round])).length >= MIN_SQUARES[round])
    assert.deepEqual(checkPicture({ name: d.name, decoys: d.decoys, cells: cutPicture(d.strokes, ROUND_SIZES[round]) }, round), [])
  }
})

test('the code checks: outside the canvas, off the quarter points, too busy, too empty, too many squares, names', () => {
  assert.ok(check(design(1, { strokes: [...rows(1), { kind: 'circle', at: [2.75, 2.5], r: 0.5 }] }), 1).includes('canvas'))
  assert.ok(check(design(1, { strokes: [...rows(1), { kind: 'line', from: [0.3, 2.5], to: [2, 2.5] }] }), 1).includes('grid'))
  assert.ok(check(design(1, { strokes: [...rows(1), ...[0.25, 0.5, 0.75].map(x => ({ kind: 'line', from: [x, 0], to: [x, 1] }))] }), 1).includes('busy'))
  assert.ok(check(design(1, { strokes: rows(1, 1) }), 1).includes('empty'), 'three squares of nine')
  assert.ok(check(design(3, { strokes: rows(3, 3) }), 3).includes('squares'), 'fifteen squares of a 13 cap')
  assert.ok(check(design(1, { decoys: ['A quib', 'A quib', 'A quab'] }), 1).includes('names'))
  assert.ok(check(design(1, { decoys: ['A quib', 'A quob'] }), 1).includes('names'))
  assert.ok(check(design(1, { name: 'zorps', decoys: ['A zorp', 'A quob', 'A quab'] }), 1).includes('names'), 'a decoy the same as the name once normalised')
  assert.ok(check(design(1, { strokes: [{ kind: 'line', from: [0, 0], to: [0, 0] }] }), 1).includes('shape'))
})

test('the never-list: the style samples, the handoff\'s examples, every clue word, and the practice names for the party', () => {
  for (const w of ['smiley', 'house', 'star', 'fish', 'kite', 'checkerboard', 'pinwheel', 'snowflake', ...NEVER_WORDS]) {
    assert.ok(check(design(1, { name: `A ${w}` }), 1).includes('never'), w)
    assert.ok(check(design(1, { decoys: ['A quib', 'A quob', `A ${w}`] }), 1).includes('never'), `${w} as a wrong name`)
  }
  assert.ok(check(design(1, { name: 'A zorp' }), 1, { never: ['zorps'] }).includes('burned'), 'a practice name, loosely')
  assert.ok(check(design(1, { name: 'A big zorp' }), 1, { never: ['A zorp'] }).includes('burned'))
  assert.ok(check(design(1, { name: 'A quix', synonyms: ['zorp'] }), 1, { never: ['A zorp'] }).includes('burned'), 'nor a synonym of one')
  assert.deepEqual(check(design(1, { name: 'A quix' }), 1, { never: ['A zorp'] }), [])
})

test('the designer\'s brief: the canvas, the quarter points, the caps and the never-list; no example name', () => {
  for (const round of [1, 2, 3]) {
    const p = designPrompt(round, { never: ['A zorp'] })
    assert.match(p, new RegExp(`A ${ROUND_SIZES[round]} by ${ROUND_SIZES[round]} grid`))
    assert.match(p, /multiple of 0\.25/)
    for (const w of [...NEVER_WORDS, 'smiley', 'house', 'kite', 'A zorp']) assert.ok(p.includes(w), `the brief names ${w}`)
    assert.ok(!/\("A [a-z]+"\)/.test(p), 'the brief gives no example picture Jon could guess')
  }
  assert.match(designPrompt(3), /mirror symmetry or a regular repeat/)
})

test('the reply parser keeps each good picture and drops a malformed one, with no reply text in its errors', () => {
  const good = design(1)
  const list = parseDesigns(`Here you go:\n${JSON.stringify({ pictures: [good, { name: 3 }] })}`)
  assert.equal(list.length, 2)
  assert.equal(list[0].name, good.name)
  assert.equal(list[1], null)
  for (const bad of ['no json here zorp', '{zorp', JSON.stringify({ zorp: 1 })]) {
    assert.throws(() => parseDesigns(bad), e => !/zorp/i.test(e.message))
  }
})

// ---- a whole run, with a stub designer and a stub eye -----------------------

// A designer that returns `count` distinct hand-made zorps a call, and an eye
// that names each one (or not, by `blind`).
function stubs({ blind = () => false, junk = false } = {}) {
  let n = 0
  const calls = { design: 0, eye: 0 }
  const design = async (round, count) => {
    calls.design++
    if (junk) return 'not json'
    return JSON.stringify({ pictures: Array.from({ length: count }, () => ({
      name: `A zorp number${++n}`, decoys: ['A quib', 'A quob', 'A quab'], synonyms: [], strokes: rows(round),
    })) })
  }
  // the stub eye cannot see; it says "zorp", which matches every stub name loosely, unless blind
  const ask = async (png, round) => { calls.eye++; assert.ok(Buffer.isBuffer(png)); return blind(round) ? 'a quib' : 'zorp' }
  return { design, ask, calls }
}

async function captured(fn) {
  const lines = []
  const r = await fn(l => lines.push(String(l)))
  return { r, lines, out: lines.join('\n') }
}
const assertNoContent = out => {
  assert.ok(!/zorp|quib|quob|quab|kind|stroke|from|bulge|"/i.test(out), `a printed line carried content: length ${out.length}`)
}

test('a practice run fills each round, rebuilds the practice bank, and prints counts only', async () => {
  const db = memoryDb({ [PRACTICE_BANK_DOC]: { pictures: [{ id: 'old', round: 1 }], editedBy: 'someone' } })
  const s = stubs()
  let id = 0
  const { r, lines, out } = await captured(log => runRelayPictures(db, { bank: 'practice', design: s.design, ask: s.ask, log, now: () => new Date(1000), newId: () => `p${id++}` }))
  assertNoContent(out)
  assert.equal(r.kept, 3 * MAKE_PER_ROUND)
  assert.equal(r.short, 0)
  assert.equal(lines.at(-1), 'PASS')
  const bank = db.store.get(PRACTICE_BANK_DOC)
  assert.equal(bank.pictures.length, 3 * MAKE_PER_ROUND, 'rebuilt, not topped up: the old picture is gone')
  assert.equal(bank.editedBy, undefined)
  for (const p of bank.pictures) {
    assert.deepEqual(Object.keys(p).sort(), ['cells', 'decoys', 'id', 'name', 'round'], 'the bank shape the game reads')
    assert.deepEqual(checkPicture(p, p.round), [])
  }
  assert.equal(new Set(bank.pictures.map(p => p.name)).size, bank.pictures.length, 'no two pictures share a name')
  assert.equal(db.store.has(BANK_DOC), false, 'the party bank is untouched')
})

test('a dry run designs and judges, writes nothing and prints counts only; a practice dry run needs no database', async () => {
  const s = stubs()
  const { r, out } = await captured(log => runRelayPictures(null, { bank: 'practice', dry: true, design: s.design, ask: s.ask, log }))
  assertNoContent(out)
  assert.equal(r.written, false)
  assert.equal(r.kept, 3 * MAKE_PER_ROUND)
  assert.ok(s.calls.design > 0 && s.calls.eye > 0, 'it did design and judge')
})

test('the party run needs the practice bank first, and keeps every practice name off its pictures', async () => {
  const none = await captured(log => runRelayPictures(memoryDb({}), { bank: 'party', design: stubs().design, ask: stubs().ask, log }))
  assert.equal(none.r.written, false)
  assert.match(none.lines.at(-1), /^FAIL: make the practice bank first/)
  // the practice bank holds "A zorp number1" .. : a party design with any of those names is dropped
  const practice = { pictures: [{ id: 'x', round: 1, name: 'A zorp number1', decoys: [], cells: {} }, { id: 'y', round: 2, name: 'A zorp number2', decoys: [], cells: {} }] }
  const db = memoryDb({ [PRACTICE_BANK_DOC]: practice })
  const s = stubs()
  const seen = []
  const design = async (round, count, opts) => { seen.push(opts.never); return s.design(round, count) }
  const { r, out } = await captured(log => runRelayPictures(db, { bank: 'party', design, ask: s.ask, log }))
  assertNoContent(out)
  assert.ok(seen.every(n => n.includes('A zorp number1') && n.includes('A zorp number2')), 'the designer is told the practice names')
  const party = db.store.get(BANK_DOC).pictures
  assert.ok(party.length > 0)
  assert.ok(party.every(p => !['a zorp number1', 'a zorp number2'].includes(p.name.toLowerCase())), 'no party picture shares a practice name')
  assert.deepEqual(db.store.get(PRACTICE_BANK_DOC), practice, 'the practice bank is read, never written')
  assert.ok(out.includes('a practice name'), 'the drop is counted by check')
  assert.ok(r.kept > 0)
})

test('an eye that cannot name the pictures, and a designer that talks nonsense: counted, short, a plain FAIL, nothing written', async () => {
  const blind = stubs({ blind: () => true })
  const a = await captured(log => runRelayPictures(memoryDb({}), { bank: 'practice', design: blind.design, ask: blind.ask, log, maxCalls: 2 }))
  assertNoContent(a.out)
  assert.equal(a.r.kept, 0)
  assert.equal(a.r.written, false)
  assert.match(a.out, /dropped: \d+ the eye judge/)
  assert.match(a.lines.at(-1), /^FAIL: 18 short; 3 rounds have none and will use the stand-in grids/)
  const junk = stubs({ junk: true })
  const b = await captured(log => runRelayPictures(memoryDb({}), { bank: 'practice', design: junk.design, ask: junk.ask, log }))
  assertNoContent(b.out)
  assert.match(b.out, /a design call failed \(Error, message length \d+\)/)
  assert.ok(junk.calls.design <= 9, 'it stops a round after three failed calls in a row')
})

test('makeBank stops a round once it has its pictures, and after its call limit when it cannot', async () => {
  const s = stubs()
  const { report } = await makeBank({ design: s.design, ask: s.ask, target: 2, perCall: 4, log: () => {} })
  for (const round of [1, 2, 3]) { assert.equal(report[round].kept, 2); assert.equal(report[round].calls, 1) }
  const b = stubs({ blind: round => round === 2 })
  const r2 = await makeBank({ design: b.design, ask: b.ask, target: 2, maxCalls: 3, log: () => {} })
  assert.equal(r2.report[2].calls, 3)
  assert.equal(r2.report[2].kept, 0)
})
