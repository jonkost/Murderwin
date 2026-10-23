import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// firestore.rules, exercised for real on the Firestore emulator. The fake in
// fake-firestore.mjs never checks a rule; this file does, with the same
// rules file that deploys. It runs under `npm run test:rules` at the root
// (firebase emulators:exec sets FIRESTORE_EMULATOR_HOST) and skips itself
// anywhere else, so the plain `npm test` stays credential-free.
//
// Seeded data is structural only: ids, flags and one-word strings. Nothing
// here is content, sealed or otherwise.

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST
const skip = EMULATOR ? false : 'needs the Firestore emulator: npm run test:rules'

const rulesText = readFileSync(join(root, 'firestore.rules'), 'utf8')
const ADMIN_UID = /isAdmin\(\)[\s\S]*?'([A-Za-z0-9]{20,})'/.exec(rulesText)?.[1]

const NIGHT = 'night-rules-test'
const PHONE = 'phone-a'
const OTHER = 'phone-b'
const HOST = 'phone-host'

async function setup() {
  const { initializeTestEnvironment } = await import('@firebase/rules-unit-testing')
  const [host, port] = EMULATOR.split(':')
  const env = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || 'demo-murderwin',
    firestore: { rules: rulesText, host, port: Number(port) },
  })
  const { doc, setDoc } = await import('firebase/firestore')
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'public_state/active'), { nightId: NIGHT })
    await setDoc(doc(db, `nights/${NIGHT}`), { nightId: NIGHT, act: 1, phase: 'act', roster: {} })
    await setDoc(doc(db, `nights/${NIGHT}/public/content`), { motives: [] })
    await setDoc(doc(db, `nights/${NIGHT}/private/deck`), { order: [], uids: {} })
    await setDoc(doc(db, `sessions/${PHONE}`), { nightId: NIGHT, status: 'active', guestKey: 'a' })
    await setDoc(doc(db, `sessions/${OTHER}`), { nightId: NIGHT, status: 'active', guestKey: 'b' })
    await setDoc(doc(db, `sessions/${HOST}`), { nightId: NIGHT, status: 'active', guestKey: 'h', host: 'jonathan' })
    await setDoc(doc(db, `presence/${OTHER}`), { nightId: NIGHT, guestKey: 'b', at: new Date() })
    await setDoc(doc(db, 'sealed/x'), { structural: true })
    await setDoc(doc(db, `cases/${NIGHT}`), { structural: true })
    await setDoc(doc(db, 'safe_content/ui_copy'), { items: [] })
  })
  return env
}

test('a signed-in phone reads public night state and its own session, never sealed, cases, private or another phone', { skip }, async () => {
  const env = await setup()
  const { assertFails, assertSucceeds } = await import('@firebase/rules-unit-testing')
  const { doc, getDoc, setDoc } = await import('firebase/firestore')
  try {
    const me = env.authenticatedContext(PHONE).firestore()
    await assertSucceeds(getDoc(doc(me, 'public_state/active')))
    await assertSucceeds(getDoc(doc(me, `nights/${NIGHT}`)))
    await assertSucceeds(getDoc(doc(me, `nights/${NIGHT}/public/content`)))
    await assertSucceeds(getDoc(doc(me, `sessions/${PHONE}`)))
    await assertSucceeds(setDoc(doc(me, `notes/${PHONE}`), { crossed: { 1: true } }))
    await assertSucceeds(getDoc(doc(me, `notes/${PHONE}`)))
    await assertSucceeds(setDoc(doc(me, `presence/${PHONE}`), { nightId: NIGHT, guestKey: 'a', at: new Date() }))

    await assertFails(getDoc(doc(me, 'sealed/x')))
    await assertFails(getDoc(doc(me, `cases/${NIGHT}`)))
    await assertFails(getDoc(doc(me, `nights/${NIGHT}/private/deck`)))
    await assertFails(getDoc(doc(me, `sessions/${OTHER}`)))
    await assertFails(getDoc(doc(me, `notes/${OTHER}`)))
    await assertFails(getDoc(doc(me, `presence/${OTHER}`)))
    await assertFails(setDoc(doc(me, `sessions/${PHONE}`), { role: 'x' }))
    await assertFails(setDoc(doc(me, `nights/${NIGHT}`), { act: 7 }))
    await assertFails(setDoc(doc(me, 'public_state/active'), { nightId: 'mine' }))
    await assertFails(setDoc(doc(me, `presence/${PHONE}`), { nightId: NIGHT, guestKey: 'a', at: new Date(), extra: 1 }))
    await assertFails(getDoc(doc(me, 'safe_content/ui_copy')))
    await assertFails(setDoc(doc(me, 'safe_content/ui_copy'), { items: [] }))

    const nobody = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(nobody, 'public_state/active')))
    await assertFails(getDoc(doc(nobody, `nights/${NIGHT}`)))
  } finally {
    await env.cleanup()
  }
})

test('a host phone reads presence; the admin reads and writes safe content but never sealed or cases', { skip }, async () => {
  const env = await setup()
  const { assertFails, assertSucceeds } = await import('@firebase/rules-unit-testing')
  const { doc, getDoc, setDoc, deleteDoc } = await import('firebase/firestore')
  try {
    const hostDb = env.authenticatedContext(HOST).firestore()
    await assertSucceeds(getDoc(doc(hostDb, `presence/${OTHER}`)))
    await assertFails(getDoc(doc(hostDb, `sessions/${OTHER}`)))

    assert.ok(ADMIN_UID, 'the admin UID is readable from firestore.rules')
    const admin = env.authenticatedContext(ADMIN_UID).firestore()
    await assertSucceeds(getDoc(doc(admin, 'safe_content/ui_copy')))
    await assertSucceeds(setDoc(doc(admin, 'safe_content/ui_copy'), { items: [{ id: 'u1', text: 'GREET BOO: (a greeting)', order: 0 }] }))
    await assertFails(deleteDoc(doc(admin, 'safe_content/ui_copy')))
    await assertSucceeds(getDoc(doc(admin, `presence/${OTHER}`)))
    await assertFails(getDoc(doc(admin, 'sealed/x')))
    await assertFails(getDoc(doc(admin, 'sealed/parlour_leans')), 'L05: Jon\'s account cannot read the cats\' leans')
    await assertFails(getDoc(doc(admin, `nights/${NIGHT}/private/parlour`)), 'nor when the next Parlour Game is due')
    await assertFails(getDoc(doc(admin, `cases/${NIGHT}`)))
    await assertFails(setDoc(doc(admin, 'sealed/y'), { structural: true }))
    await assertFails(getDoc(doc(admin, `nights/${NIGHT}/private/deck`)))
  } finally {
    await env.cleanup()
  }
})
