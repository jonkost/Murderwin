// The Home rows' one call: the `sealedCounts` Cloud Function
// (functions/lib/counts.js), Jon's admin account only. It answers with
// numbers and one yes or no, never anything sealed, so nothing secret
// enters the page.
//
// On a dev server with ?preview=1 (no sign-in) a pretend server answers.

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { app } from '../firebase'
import { EMULATOR, EMULATOR_HOST, EMULATOR_PORTS, REGION } from './config'
import { PREVIEW } from './previewFlag'

let real = null
function realCall() {
  if (!real) {
    const functions = getFunctions(app, REGION)
    if (EMULATOR) connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions)
    const call = httpsCallable(functions, 'sealedCounts')
    real = async () => (await call({})).data
  }
  return real
}

export async function fetchSealedCounts() {
  if (PREVIEW) return { ok: true, packing: { made: true, bags: 10 }, leans: { questions: 0, of: 51 }, pictures: { made: 0, of: 9 } }
  return realCall()()
}
