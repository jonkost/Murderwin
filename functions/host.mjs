// Host commands from the terminal, for rehearsals without the workshop page.
// Needs a service-account key: GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json
// (the same key scripts/.env.example describes). Prints state only — never
// anything sealed, because this file never reads sealed/* or cases/*.
//
//   node host.mjs status
//   node host.mjs create "Dry run"
//   node host.mjs act 1 | blackout | power | pause | resume
//   node host.mjs join-open | join-close | publish | refresh-guests
//   node host.mjs activate <nightId>

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { hostCommand } from './lib/night.js'

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service-account key first (see scripts/.env.example).')
  process.exit(2)
}
initializeApp({ credential: applicationDefault(), projectId: 'murderwin-at-sirwin-manor' })
const db = getFirestore()

const [command, arg] = process.argv.slice(2)
if (!command) { console.error('usage: node host.mjs <command> [arg]'); process.exit(2) }

const active = await db.doc('public_state/active').get()
let nightId = active.exists ? active.data().nightId : null

if (command === 'status') {
  if (!nightId) { console.log('no live night'); process.exit(0) }
  const n = (await db.doc(`nights/${nightId}`).get()).data()
  console.log(`${n.label} (${nightId}) — act ${n.act}, ${n.phase}, doors ${n.joinOpen ? 'open' : 'closed'}, ${Object.keys(n.roster ?? {}).length}/${(n.guests ?? []).length} joined`)
  process.exit(0)
}
if (command === 'activate') nightId = arg
const result = await hostCommand(db, { nightId, command, arg })
console.log(JSON.stringify(result))
