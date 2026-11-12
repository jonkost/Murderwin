import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// The ending (handoff 11 Nov 2026, A6). Jon: "I don't know what this ...
// round is. What is that? I did not ask for that, and that needs to go away."
// Its "Done when" is a search of the whole folder for the round's two names
// that finds nothing outside the session log and the old handoffs. This is
// that search, so the round cannot come back by a stray line.
//
// The two words are put together here from halves, so this file does not
// find itself.

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const GONE = [['elim', 'inat'], ['deduc', 'tion']].map(halves => new RegExp(halves.join(''), 'i'))

// Where the game, its tools and the pages Jon reads live. (CLAUDE.md is not
// walked: the session that applies the handoff updates it from the handoff's
// own list, "What this changes in the Canon and CLAUDE.md".)
const ROOTS = ['app/src', 'app/test', 'cues', 'functions/lib', 'functions/test', 'functions/index.js', 'functions/host.mjs', 'play/src', 'play/test', 'scripts', 'seed', 'station', 'docs', 'README.md', 'firebase.json', 'firestore.rules']
const SKIP_DIRS = new Set(['node_modules', 'dist', 'postmortems', 'look-book', 'patches'])
const TEXT = /\.(?:js|mjs|jsx|json|md|css|rules|html|command|txt)$/
// History, and pages that are not this job's to change:
//   the session log and the handoffs keep what was said and done;
//   the build plans are the plans of September and October;
//   the rules film's plan says which recorded sentence to cut (job A14).
const KEPT = [/^docs\/sessions\.md$/, /^docs\/handoff-[^/]+\.md$/, /^docs\/build-plan[^/]*\.md$/, /^docs\/rules-voiceover-manifest\.md$/]

function walk(p, out = []) {
  const full = join(root, p)
  if (!existsSync(full)) return out
  if (statSync(full).isDirectory()) {
    for (const name of readdirSync(full)) {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) continue
      walk(join(p, name), out)
    }
  } else if (TEXT.test(p)) out.push(p)
  return out
}

test('the round that came after the door is gone everywhere: its two names are in no code, seed, test or page but the session log, the old handoffs and the old plans', () => {
  const files = ROOTS.flatMap(r => walk(r)).map(f => relative(root, join(root, f))).filter(f => !KEPT.some(k => k.test(f)))
  assert.ok(files.length > 300, `read ${files.length} files`)
  const hits = []
  for (const f of files) {
    const lines = readFileSync(join(root, f), 'utf8').split('\n')
    lines.forEach((line, i) => { if (GONE.some(re => re.test(line))) hits.push(`${f}:${i + 1}`) })
  }
  assert.deepEqual(hits, [], 'these lines still name the round Jon cut on 11 Nov 2026: reword them (Act 6 ends in Talk it over; the vote is one card)')
  // the search bites, and knows what it may pass over
  const words = GONE.map(re => re.source)
  assert.ok(GONE[0].test(`the ${words[0]}e call`) && GONE[1].test(`The ${words[1]} round`))
  assert.ok(KEPT.some(k => k.test('docs/sessions.md')) && KEPT.some(k => k.test('docs/handoff-2026-11-11-polish.md')))
  assert.ok(!KEPT.some(k => k.test('docs/on-the-night.md')) && !KEPT.some(k => k.test('functions/lib/deal.js')))
})

test('the night as written: Act 6 ends in talk, the vote opens Act 7, and nothing else opens a window', () => {
  const night = JSON.parse(readFileSync(join(root, 'seed', 'night.json'), 'utf8'))
  assert.deepEqual(Object.keys(night.windows).sort(), ['ballot', 'questions'])
  const act6 = night.acts['6'].beats
  assert.deepEqual(act6.map(b => b.key), ['games', 'drawing', 'door', 'talk'])
  assert.deepEqual(act6.at(-1), { key: 'talk', name: 'Talk it over', what: act6.at(-1).what, action: 'notice:talk', screen: 'talk' })
  const vote = night.acts['7'].beats[0]
  assert.equal(vote.action, 'window:ballot')
  assert.equal(vote.name, 'The vote')
  assert.equal(night.windows.ballot.title, 'The vote')
  // the brain's sheet knows the beat by the same name, with the door's music, lights and projector
  const sheet = JSON.parse(readFileSync(join(root, 'cues', 'scenes.json'), 'utf8'))
  assert.deepEqual(sheet.acts['6'].beats.talk, sheet.acts['6'].beats.door, 'nothing changes in the house when the room starts to talk')
  for (const beat of Object.keys(sheet.acts['6'].beats)) assert.ok(act6.some(b => b.key === beat), `the sheet's Act 6 beat ${beat} is a beat of the night`)
  // the words a host reads for the two beats are plain: no long dash, and they say who moves the night on
  assert.match(act6.at(-1).what, /Start the vote/)
  for (const b of [act6.at(-1), vote]) assert.ok(!b.what.includes('—') && b.what.length < 320, b.key)
})
