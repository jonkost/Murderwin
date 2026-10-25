#!/usr/bin/env node
// npm run checks (docs/test-plan.md): deals 1,000 stand-in cases and runs
// every case check on each, plays one whole fake night, and runs the leak
// checks. Prints one line per group and one score, counts only, and saves the
// same counts for the workshop's Health page (validation_reports/checks).
//
//   npm run checks                   1,000 cases, then save the record
//   npm run checks -- --cases 200    fewer cases (a quick look)
//   npm run checks -- --local        print only, save nothing
//   npm run checks -- --seed check-28   deal one stand-in case again from its
//                                    seed word and run its checks (counts only, saves nothing)
//
// SEAL RULE: everything here is a stand-in made in memory: rehearsal cases,
// a packing of the seed's item list made with a fixed seed, a fake night. A
// failure names the check and the case's seed word, never a word of a clue.

import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureSeed, fakeNight } from './fake-players.mjs'
import { packBags, poolFromItems, seedItems, sealedDoc, seededRng, CLUE_WORDS } from './pack-bags.mjs'
import { say } from './lib.mjs'
import { seededPick, cleanSeed } from '../functions/lib/seed.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
ensureSeed()
const { caseChecks, boardChecks, CHECK_NAMES } = await import('../functions/lib/checks.js')
const { rehearsalCase } = await import('../functions/lib/case.js')
const { CHARACTERS } = await import('../functions/lib/night.js')

export const REPORT_DOC = 'validation_reports/checks'
export const GROUPS = [
  { key: 'case', name: 'Case generator' },
  { key: 'dry', name: 'Dry run' },
  { key: 'leak', name: 'Leak checks' },
]
const NAMES = ['Jon', 'Susan', 'Jessa', 'Jacob', 'Stanley', 'Jeanette', 'Matthew', 'Marie', 'Rene', 'Guest', 'Pat', 'Lou']

// A roster of n guests: the two Professors, then characters at random, bags 1 to 10 at random.
function rosterOf(n, rng) {
  const profs = CHARACTERS.filter(c => c.host)
  const rest = CHARACTERS.filter(c => !c.host)
  for (let i = rest.length - 1; i > 0; i--) { const j = rng(i + 1); [rest[i], rest[j]] = [rest[j], rest[i]] }
  const bags = Array.from({ length: 10 }, (_, i) => i + 1)
  for (let i = bags.length - 1; i > 0; i--) { const j = rng(i + 1); [bags[i], bags[j]] = [bags[j], bags[i]] }
  return [...profs, ...rest].slice(0, n).map((c, i) => ({ key: NAMES[i].toLowerCase(), name: NAMES[i], characterId: c.id, bag: bags[i % 10] }))
}

// Each stand-in case is dealt from a seed word (functions/lib/seed.js, the
// same picks a rehearsal uses), so a failure can be dealt again on its own:
// npm run checks -- --seed check-28.
export const caseSeed = n => `check-${n}`
export function standInCase(seed, packings) {
  const roster = rosterOf(4 + seededPick(seed, 'size')(9), seededPick(seed, 'roster'))
  const rng = seededPick(seed, 'case')
  const c = rehearsalCase({ roster, rng })
  return { c, roster, rng, packing: packings[seededPick(seed, 'packing')(packings.length)] }
}

// The case generator group: every case check on `count` stand-in cases, or
// on the cases dealt from `seeds` alone.
export function runCaseGroup({ count = 1000, seeds = null } = {}) {
  const pool = poolFromItems(seedItems())
  const packings = Array.from({ length: 20 }, (_, i) => { const r = packBags(pool, { rng: seededRng(9000 + i) }); return sealedDoc(r, pool) })
  const tally = {}
  const failed = []
  const list = seeds ?? Array.from({ length: count }, (_, i) => caseSeed(i + 1))
  list.forEach((seed, i) => {
    const { c, roster, rng, packing } = standInCase(seed, packings)
    const results = [...caseChecks(c, { roster, packing, rng }), ...(seeds || (i + 1) % 50 === 0 ? boardChecks({ rng, clueWords: CLUE_WORDS }) : [])]
    for (const r of results) {
      tally[r.id] ??= { passed: 0, total: 0 }
      tally[r.id].total++
      if (r.pass) tally[r.id].passed++
      else if (failed.length < 20) failed.push({ id: r.id, name: CHECK_NAMES[r.id] ?? r.id, seed })
    }
  })
  const passed = Object.values(tally).reduce((a, t) => a + t.passed, 0)
  const total = Object.values(tally).reduce((a, t) => a + t.total, 0)
  return { passed, total, failed, ids: Object.keys(tally).sort() }
}

// The dry run group: one whole fake night, in memory.
export async function runDryGroup() {
  const { FakeFirestore } = await import('../functions/test/fake-firestore.mjs')
  const summary = await fakeNight({ db: new FakeFirestore(), log: () => {} })
  const failed = summary.ok ? [] : [...summary.checks, ...summary.seal.failed.slice(0, 5)].map(id => ({ id: String(id).split(':')[0], name: CHECK_NAMES[id] ?? 'The fake night', seed: 'fake night' }))
  if (!summary.ok && !failed.length) failed.push({ id: 'DRY', name: summary.error ? 'The fake night stopped' : 'The fake night', seed: 'fake night' })
  return { passed: summary.ok ? 1 : 0, total: 1, failed }
}

// The leak group: L08 (the prompts), L01 (no sealed file in the repo or its
// history) and L06 (no tracked JSON shaped like a bag packing).
export function runLeakGroup() {
  const failed = []
  let passed = 0, total = 0
  const check = (ok, id, seed) => { total++; if (ok) passed++; else failed.push({ id, name: CHECK_NAMES[id] ?? id, seed }) }
  const lines = JSON.parse(readFileSync(join(root, 'seed', 'bag-lines.json'), 'utf8')).prompts.lines
  check(!lines.some(p => CLUE_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(p))), 'L08', 'the prompts')
  const files = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.split('\n').filter(Boolean)
  const history = spawnSync('git', ['log', '--all', '--name-only', '--pretty=format:'], { cwd: root, encoding: 'utf8' }).stdout.split('\n').filter(Boolean)
  const sealed = name => /(^|\/)sealed[^/]*$|\.sealed\.json$|(^|\/)service-account[^/]*$|(^|\/)cases\/.+\.json$/.test(name)
  check(!files.some(sealed), 'L01', 'the files')
  check(!history.some(sealed), 'L01', 'the history')
  const packingShaped = name => {
    if (!name.endsWith('.json')) return false
    try {
      const d = JSON.parse(readFileSync(join(root, name), 'utf8'))
      return !!d && typeof d === 'object' && !!d.bags && typeof d.bags === 'object' && !Array.isArray(d.bags) && !!d.words && Object.keys(d.bags).some(k => /^\d+$/.test(k))
    } catch { return false }
  }
  check(!files.some(packingShaped), 'L06', 'the files')
  return { passed, total, failed }
}

async function save(record) {
  const { adminDb } = await import('./lib.mjs')
  const db = adminDb()
  await db.doc(REPORT_DOC).set(record)
}

function argOf(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : null
}

async function main() {
  // one case dealt again from its word: its checks only, nothing saved
  const replay = cleanSeed(argOf('--seed'))
  if (replay) {
    say(`Checks: one stand-in case, dealt again from ${replay}`)
    const one = runCaseGroup({ seeds: [replay] })
    say(`Case generator · ${one.passed} of ${one.total} passed (${one.ids.join(' ')})`)
    for (const f of one.failed) say(`FAIL · ${f.id} · ${f.seed}`)
    say(one.passed === one.total ? 'All clear for that case.' : 'FAIL')
    return one.passed === one.total ? 0 : 1
  }
  const count = Number(argOf('--cases')) || 1000
  say(`Checks: ${count} stand-in cases, one fake night, the leak checks`)
  const groups = []
  const caseGroup = runCaseGroup({ count })
  groups.push({ ...GROUPS[0], ...caseGroup })
  say(`Case generator · ${caseGroup.passed} of ${caseGroup.total} passed (${caseGroup.ids.join(' ')})`)
  const dry = await runDryGroup()
  groups.push({ ...GROUPS[1], ...dry })
  say(`Dry run · ${dry.passed} of ${dry.total} passed`)
  const leak = runLeakGroup()
  groups.push({ ...GROUPS[2], ...leak })
  say(`Leak checks · ${leak.passed} of ${leak.total} passed`)
  for (const g of groups) for (const f of g.failed) say(`FAIL · ${f.id} · ${f.seed}`)
  const ok = groups.every(g => g.passed === g.total)
  const record = { at: new Date(), cases: count, ok, groups: groups.map(({ key, name, passed, total, failed }) => ({ key, name, passed, total, failed })) }
  if (!process.argv.includes('--local')) {
    try { await save(record); say('Saved for the Health page.') } catch { say('Not saved: no way into Firestore from here (the Health page shows the last saved run).') }
  }
  say(ok ? 'All clear. The game is ready.' : 'FAIL')
  return ok ? 0 : 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then(code => process.exit(code)).catch(e => { console.log(`FAIL: ${e?.name ?? 'Error'} (message redacted)`); process.exit(1) })
}
