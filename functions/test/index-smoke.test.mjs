import { test } from 'node:test'
import assert from 'node:assert/strict'

// Loads functions/index.js the way the Functions runtime does, with no
// credentials, so a firebase-functions upgrade that moves an import, or a
// callable that fails to register, fails here before it fails on deploy.
// Nothing runs: the callables are registered, not invoked.

test('functions/index.js loads under the current firebase-functions and exports every callable the clients use', async () => {
  process.env.GCLOUD_PROJECT ??= 'demo-murderwin'
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:1' // never reached; getFirestore() is lazy
  const mod = await import('../index.js')
  for (const name of ['join', 'hostCommand', 'answer', 'ballot', 'eliminate', 'meetCat', 'leaveCat', 'notYet', 'lockIn', 'memoryStep', 'salemReady', 'salemSlip', 'salemPassed', 'booDone', 'stationCommand', 'relayAdvance', 'relayVote', 'relayGuess', 'steward', 'studyTest', 'gameTest', 'sealedCounts', 'morningAfter', 'posePhoto']) {
    assert.equal(typeof mod[name], 'function', `${name} is exported as a callable`)
  }
  assert.equal(mod.solve, undefined, 'the safe is gone, and its callable with it')
})
