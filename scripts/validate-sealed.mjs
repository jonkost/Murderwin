// Counts-only validation of sealed content, per docs/blind-content-protocol.md.
// SEAL RULE: reads sealed text, but reports AGGREGATES ONLY. Never prints,
// logs, or files content. Writes the aggregate report to validation_reports
// (client-readable) so the workshop coverage panel can render it.
//
// `node validate-sealed.mjs`        checks what is in Firestore
// `node validate-sealed.mjs --dry`  checks a synthetic set in memory, touching
//                                   nothing: proves the pipeline, not content

import {
  adminDb, readMotives, rhymeWords, poolTokenCount, poolTokens, unknownTokens,
  stripTokens, wordCount, isImpersonal, printFatal, CATS, dogFilterOk, characterNameWords,
  memoryDb, syntheticSealedSet, say, printReport, STUDY_MIN_WORDS, STUDY_MAX_WORDS,
} from './lib.mjs'

const TRUTH_CATS = ['irwin', 'boo', 'zimothy'] // baselines for pool-token checks

const salemText = s => (typeof s === 'string' ? s : s?.text ?? '')

function isSubMultiset(sub, sup) {
  const counts = {}
  for (const t of sup) counts[t] = (counts[t] ?? 0) + 1
  for (const t of sub) {
    if (!counts[t]) return false
    counts[t]--
  }
  return true
}

export async function validateAll(db) {
  const motives = readMotives()
  const byN = new Map(motives.map(m => [m.n, m]))
  const globalBanned = new Set(motives.flatMap(m => rhymeWords(m.rhyme)))
  const names = characterNameWords()

  const manifestSnap = await db.collection('sealed').doc('manifest').get()
  const manifest = manifestSnap.exists ? manifestSnap.data().codes ?? {} : {}
  const codeIds = Object.keys(manifest)

  const report = {
    codes: codeIds.length,
    complete: 0,      // 15 kernels, 3 docs, 3 fragments, 3 study lines, 3 Irwin lines
    banned: 0,        // uses a word from its own motive's rhyme (gates pass)
    bannedGlobal: 0,  // uses a word from ANY rhyme (advisory — see protocol doc)
    lengthFails: 0,
    placeholderFails: 0,
    granoliaFails: 0, // token multiset differs from every truth kernel, or has no tokens
    salemFails: 0,    // anchor noun absent from his text or from truth kernels
    impersonalFails: 0,
    studyClueFails: 0, // study line out of length, carrying a token, or not a string
    irwinFails: 0,     // an Irwin line that fails the dog filter
    edited: 0,         // sets the Steward has edited (editedAt set); checked exactly like the rest
    reviewed: 0,       // sets the Steward has marked done or needs more
    failingCodes: [],  // the opaque codes of sets that fail a gating check (never a motive)
    pass: false,
  }
  const GATES = ['banned', 'lengthFails', 'placeholderFails', 'granoliaFails', 'salemFails', 'impersonalFails', 'studyClueFails', 'irwinFails']

  for (const code of codeIds) {
    const snap = await db.collection('sealed').doc(code).get()
    if (!snap.exists) continue
    // an edited doc also carries original, editedAt, editedBy, version, review:
    // the checks read the five content fields and nothing else
    const { kernels = {}, documents = [], fragments = [], studyClue = [], irwin = [], editedAt = null, review = '' } = snap.data()
    if (editedAt) report.edited++
    if (review === 'done' || review === 'more') report.reviewed++

    const kCount = CATS.reduce((n, c) => n + (kernels[c]?.length ?? 0), 0)
    const isComplete = kCount === 15 && documents.length === 3 && fragments.length === 3 &&
      Array.isArray(studyClue) && studyClue.length === 3 && Array.isArray(irwin) && irwin.length === 3
    if (isComplete) report.complete++
    const before = Object.fromEntries(GATES.map(g => [g, report[g]]))

    const motive = byN.get(manifest[code])
    const ownBanned = new Set(motive ? rhymeWords(motive.rhyme) : [])
    const kernelTexts = [
      ...TRUTH_CATS.flatMap(c => kernels[c] ?? []),
      ...(kernels.granolia ?? []),
      ...(kernels.salem ?? []).map(salemText),
    ]
    const studyTexts = (Array.isArray(studyClue) ? studyClue : []).filter(s => typeof s === 'string')
    const irwinTexts = (Array.isArray(irwin) ? irwin : []).filter(s => typeof s === 'string')
    const allTexts = [
      ...kernelTexts,
      ...documents.flatMap(d => [d.text, d.emphasis, d.annotation]),
      ...fragments,
      ...studyTexts,
      ...irwinTexts,
    ]

    for (const text of allTexts) {
      // strip placeholder tokens first so [CROWD] never reads as the word "crowd"
      const words = stripTokens(text).toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/)
      if (words.some(w => ownBanned.has(w))) report.banned++
      if (words.some(w => globalBanned.has(w))) report.bannedGlobal++
      if (!isImpersonal(text)) report.impersonalFails++
      if (unknownTokens(text).length) report.placeholderFails++
    }
    // documents (every field) and fragments must carry no placeholders at all
    for (const text of [...documents.flatMap(d => [d.text, d.emphasis, d.annotation]), ...fragments]) {
      if (poolTokenCount(text) > 0) report.placeholderFails++
    }

    for (const k of kernelTexts) {
      if (wordCount(k) > 40) report.lengthFails++
    }
    for (const d of documents) {
      const wc = wordCount(d.text)
      if (wc < 40 || wc > 60) report.lengthFails++
    }
    for (const f of fragments) {
      if (wordCount(f) > 15) report.lengthFails++
    }

    // the study's clue: a string of the right length, no tokens (checked by form only)
    for (const s of Array.isArray(studyClue) ? studyClue : []) {
      const wc = typeof s === 'string' ? wordCount(s) : 0
      if (typeof s !== 'string' || wc < STUDY_MIN_WORDS || wc > STUDY_MAX_WORDS || poolTokenCount(s) > 0) report.studyClueFails++
    }
    // Sir Irwin's lines: the dog filter
    for (const line of Array.isArray(irwin) ? irwin : []) {
      if (!dogFilterOk(line, names)) report.irwinFails++
    }

    // Granolia: her tokens equal SOME truth kernel's token multiset, with at
    // least one token — the runtime swaps one injected value for a wrong one,
    // so she needs the same slots as the truth (decided 26 Sep: misremembers).
    const truthTokenSets = TRUTH_CATS.flatMap(c => (kernels[c] ?? []).map(poolTokens))
    for (const g of kernels.granolia ?? []) {
      const gTokens = poolTokens(g)
      const fits = gTokens.length >= 1 && truthTokenSets.some(t =>
        t.length === gTokens.length && isSubMultiset(gTokens, t))
      if (!fits) report.granoliaFails++
    }

    // Salem: his declared anchor noun appears verbatim in his own text AND in
    // at least one sibling truth kernel — the warp must be discoverable.
    const truthBlob = TRUTH_CATS.flatMap(c => kernels[c] ?? []).join(' ').toLowerCase()
    for (const s of kernels.salem ?? []) {
      const anchor = (typeof s === 'object' ? s.anchor : '')?.toLowerCase().trim()
      const ok = anchor &&
        salemText(s).toLowerCase().includes(anchor) &&
        truthBlob.includes(anchor)
      if (!ok) report.salemFails++
    }
    if (!isComplete || GATES.some(g => report[g] !== before[g])) report.failingCodes.push(code)
  }
  report.failingCodes.sort()

  report.pass = report.codes === 19 && report.complete === 19 &&
    report.banned === 0 && report.lengthFails === 0 &&
    report.placeholderFails === 0 && report.granoliaFails === 0 &&
    report.salemFails === 0 && report.impersonalFails === 0 &&
    report.studyClueFails === 0 && report.irwinFails === 0

  await db.collection('validation_reports').add({ ...report, ts: new Date() })
  return report
}

// CLI entry: node validate-sealed.mjs [--dry]
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const dry = process.argv.includes('--dry')
  const db = dry ? memoryDb(syntheticSealedSet(19)) : adminDb()
  if (dry) say('dry run: a synthetic set in memory, nothing read or written')
  validateAll(db)
    .then(report => {
      printReport(report)
      say(report.pass ? 'PASS' : 'FAIL')
      process.exit(report.pass ? 0 : 1)
    })
    .catch(e => { printFatal(e); process.exit(1) })
}
