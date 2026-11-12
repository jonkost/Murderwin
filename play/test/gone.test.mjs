import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SETUP_ROOMS, SECOND_DISPLAY, SETUP_EXTRAS } from '../src/lib/setup.js'
import { MACHINES } from '../src/lib/house.js'
import { screenLinks } from '../src/lib/start.js'

// The Catwalk and Boo's camera are gone (Jon, 11 Nov 2026, the polish pass,
// job A13: "anything regarding Jenna's iPad, anything regarding the camera
// for it, anything regarding it at all"). This keeps them gone: no word of
// either in the game, the workshop, the server, the brain or the seed notes,
// and no camera button on /setup. Nothing here reads a night or a database.

const root = fileURLToPath(new URL('../../', import.meta.url))
const rel = p => relative(root, p).split('\\').join('/')

// The folders the handoff's "Done when" names, plus the server's entry file.
const WHERE = ['play/src', 'app/src', 'functions/lib', 'functions/index.js', 'cues', 'seed']
// The board's own history stays, like the session log: its migrations have
// already run on the live board and are found again by their ids and their
// cards' titles (one id is '2026-10-27-boo-catwalk'), so rewording them
// would change nothing Jon sees and could run one twice.
const HISTORY = new Set(['app/src/lib/content.js', 'app/src/lib/timelineTasks.js'])
const TEXT = new Set(['.js', '.jsx', '.mjs', '.json', '.css', '.html', '.md', '.example'])
const SKIP = new Set(['node_modules', 'dist', '.git'])

function filesUnder(path) {
  if (!existsSync(path)) return []
  let names
  try { names = readdirSync(path, { withFileTypes: true }) } catch { return [path] } // a file, not a folder
  return names.flatMap(d => {
    if (d.name.startsWith('.') || SKIP.has(d.name)) return []
    const p = join(path, d.name)
    return d.isDirectory() ? filesUnder(p) : [p]
  })
}
const searched = WHERE.flatMap(w => filesUnder(join(root, w))).filter(p => TEXT.has(extname(p)) && !HISTORY.has(rel(p)))
function hits(pattern) {
  const found = []
  for (const p of searched) {
    readFileSync(p, 'utf8').split('\n').forEach((line, i) => { if (pattern.test(line)) found.push(`${rel(p)}:${i + 1}`) })
  }
  return found
}

test('a search for the Catwalk finds nothing in the game, the workshop, the server, the brain or the seed', () => {
  assert.ok(searched.length > 150, `the search reads the real folders (${searched.length} files)`)
  for (const w of WHERE) assert.ok(searched.some(p => rel(p).startsWith(w)), `${w} is searched`)
  assert.deepEqual(hits(/catwalk/i), [], 'no Catwalk word')
})

test('a search for Boo\'s camera finds nothing: no address, no call, no heartbeat, no photo, no file', () => {
  assert.deepEqual(hits(/kiosk=pose/i), [], 'no camera address')
  assert.deepEqual(hits(/kiosk-pose|posePhoto|PoseCamera|PoseShot|pose-g\d|public\/pose-|\.poses\b|\bposes:/), [], 'none of the camera\'s names')
  assert.deepEqual(hits(/boo(’|')s camera|jenna(’|')s ipad/i), [], 'no words about it on any screen or page')
  for (const gone of ['play/src/screens/Pose.jsx', 'play/src/lib/pose.js', 'play/test/pose.test.mjs', 'functions/lib/pose.js', 'functions/test/pose.test.mjs']) {
    assert.ok(!existsSync(join(root, gone)), `${gone} is deleted`)
  }
})

test('/setup has no camera button, the Host tab has no row to send it and no dot for it', () => {
  const buttons = [...SETUP_ROOMS, SECOND_DISPLAY]
  assert.ok(buttons.every(r => r.kiosk !== 'pose'), 'no button opens the camera')
  const words = [...buttons.flatMap(r => [r.room, r.machine, r.when, r.first?.label, r.first?.note]), ...SETUP_EXTRAS.flatMap(x => [x.label, x.note])].filter(Boolean).join(' ')
  assert.ok(!/camera|Jenna/i.test(words), 'no word about a camera or Jenna\'s iPad on the setup page')
  assert.ok(screenLinks('https://example.test/play/').every(l => l.presenceKey !== 'kiosk-pose'), 'no Send row for it on the Host tab')
  assert.ok(MACHINES.every(m => m.key !== 'kiosk-pose' && !/camera/i.test(m.label)), 'no dot for it under The house')
})

test('the server has no photo call, the end credits and the morning after carry no photos, and no rule was needed for them', () => {
  const index = readFileSync(join(root, 'functions/index.js'), 'utf8')
  assert.ok(!/export const posePhoto/.test(index), 'the callable is gone')
  const finale = readFileSync(join(root, 'functions/lib/finale.js'), 'utf8')
  const credits = finale.match(/credits: \{[^\n]*\}/)?.[0] ?? ''
  assert.ok(credits.includes('awards') && credits.includes('thanks'), 'the credits are still written')
  assert.ok(!/pose/i.test(credits), 'with no photos in them')
  assert.ok(!/pose/i.test(readFileSync(join(root, 'functions/lib/morning.js'), 'utf8')), 'the morning after archives none')
  // the photos never had a rule of their own (they sat under the night's public docs), so none had to go
  for (const rules of ['firestore.rules', 'storage.rules']) assert.ok(!/pose/i.test(readFileSync(join(root, rules), 'utf8')), `${rules} names no photo`)
})
