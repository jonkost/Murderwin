// Counts-only validation of sealed content, per docs/blind-content-protocol.md.
// SEAL RULE: reads sealed text, but reports AGGREGATES ONLY. Never prints,
// logs, or files content. Writes the aggregate report to validation_reports
// (client-readable) so the workshop coverage panel can render it.

import {
  adminDb, readMotives, rhymeWords, poolTokenCount, poolTokens, unknownTokens,
  stripTokens, wordCount, isImpersonal, printFatal, CATS,
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

  const manifestSnap = await db.collection('sealed').doc('manifest').get()
  const manifest = manifestSnap.exists ? manifestSnap.data().codes ?? {} : {}
  const codeIds = Object.keys(manifest)

  const report = {
    codes: codeIds.length,
    complete: 0,
    banned: 0,        // uses a word from its own motive's rhyme (gates pass)
    bannedGlobal: 0,  // uses a word from ANY rhyme (advisory — see protocol doc)
    lengthFails: 0,
    placeholderFails: 0,
    granoliaFails: 0, // tokens not a sub-multiset of a truth kernel, one short
    salemFails: 0,    // anchor noun absent from his text or from truth kernels
    impersonalFails: 0,
    pass: false,
  }

  for (const code of codeIds) {
    const snap = await db.collection('sealed').doc(code).get()
    if (!snap.exists) continue
    const { kernels = {}, documents = [], fragments = [] } = snap.data()

    const kCount = CATS.reduce((n, c) => n + (kernels[c]?.length ?? 0), 0)
    const isComplete = kCount === 15 && documents.length === 3 && fragments.length === 3
    if (isComplete) report.complete++

    const motive = byN.get(manifest[code])
    const ownBanned = new Set(motive ? rhymeWords(motive.rhyme) : [])
    const kernelTexts = [
      ...TRUTH_CATS.flatMap(c => kernels[c] ?? []),
      ...(kernels.granolia ?? []),
      ...(kernels.salem ?? []).map(salemText),
    ]
    const allTexts = [
      ...kernelTexts,
      ...documents.flatMap(d => [d.text, d.emphasis, d.annotation]),
      ...fragments,
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

    // Granolia: tokens are a sub-multiset of SOME truth kernel's tokens,
    // with exactly one fewer — omitted, never wrong.
    const truthTokenSets = TRUTH_CATS.flatMap(c => (kernels[c] ?? []).map(poolTokens))
    for (const g of kernels.granolia ?? []) {
      const gTokens = poolTokens(g)
      const fits = truthTokenSets.some(t =>
        t.length - gTokens.length === 1 && isSubMultiset(gTokens, t))
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
  }

  report.pass = report.codes === 19 && report.complete === 19 &&
    report.banned === 0 && report.lengthFails === 0 &&
    report.placeholderFails === 0 && report.granoliaFails === 0 &&
    report.salemFails === 0 && report.impersonalFails === 0

  await db.collection('validation_reports').add({ ...report, ts: new Date() })
  return report
}

// CLI entry: node validate-sealed.mjs
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const db = adminDb()
  validateAll(db)
    .then(report => {
      console.log(JSON.stringify(report))
      console.log(report.pass ? 'PASS' : 'FAIL')
      process.exit(report.pass ? 0 : 1)
    })
    .catch(e => { printFatal(e); process.exit(1) })
}
