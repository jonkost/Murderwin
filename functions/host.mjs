// Host commands from the terminal, for rehearsals without a phone. Every
// button on the Host tab is here, because both go through lib/run.js.
// Prints state and counts only: this file never reads sealed/* or cases/*.
//
//   node host.mjs --help               every command, with a line on each
//   node host.mjs status               which night is live and where it is up to
//   node host.mjs next                 the one button that runs the night
//   node host.mjs create "Dry run"     a new night
//   node host.mjs activate <nightId>
//
// Against the local emulators (npm run emulate at the repo root), no key needed:
//   MURDERWIN_EMULATOR=1 node host.mjs next
//
// Against the live project it needs a service-account key, which is a file
// you download once from the Firebase console (Project settings, Service
// accounts, Generate new private key) and keep OUT of the repo; point at it:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node host.mjs status
// scripts/.env.example describes the same file. Without the key, use the
// Host tab on your phone instead; it can do everything this can.

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { hostCommand } from './lib/run.js'
import { HOST_COMMANDS, helpText } from './lib/commands.js'

const [command, arg] = process.argv.slice(2)

if (!command || command === '--help' || command === '-h' || command === 'help') {
  console.log('usage: node host.mjs <command> [arg]\n')
  console.log(helpText())
  console.log('\n  status                Which night is live, its act, beat, phase and headcount.')
  process.exit(command ? 0 : 2)
}

const EMULATOR = process.env.MURDERWIN_EMULATOR === '1'
if (EMULATOR) {
  const host = process.env.MURDERWIN_EMULATOR_HOST || '127.0.0.1'
  process.env.FIRESTORE_EMULATOR_HOST ??= `${host}:8080`
  initializeApp({ projectId: process.env.MURDERWIN_PROJECT_ID || 'demo-murderwin' })
} else {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service-account key first (see the note at the top of this file), or MURDERWIN_EMULATOR=1 for the local emulators.')
    process.exit(2)
  }
  initializeApp({ credential: applicationDefault(), projectId: process.env.MURDERWIN_PROJECT_ID || 'murderwin-at-sirwin-manor' })
}
const db = getFirestore()

const active = await db.doc('public_state/active').get()
let nightId = active.exists ? active.data().nightId ?? null : null

if (command === 'status') {
  if (!nightId) { console.log('no live night'); process.exit(0) }
  const snap = await db.doc(`nights/${nightId}`).get()
  if (!snap.exists) { console.log(`live night ${nightId} has no doc`); process.exit(0) }
  const n = snap.data()
  console.log(`${n.label} (${nightId}): act ${n.act}, beat ${n.beat ?? '-'}, ${n.phase}, doors ${n.joinOpen ? 'open' : 'closed'}, ${Object.keys(n.roster ?? {}).length} joined${n.dryRun ? ', DRY RUN' : ''}${n.rehearsal ? ', rehearsal case' : ''}${n.window && !n.window.settled ? `, window ${n.window.kind} open` : ''}`)
  process.exit(0)
}
if (!HOST_COMMANDS.some(c => c.name === command)) {
  console.error(`Unknown command: ${command}. Try --help.`)
  process.exit(2)
}
if (command === 'activate') nightId = arg
const result = await hostCommand(db, { nightId, command, arg })
console.log(JSON.stringify(result))
