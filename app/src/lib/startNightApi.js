// The workshop's road to the big Start button: the same `hostCommand` the
// phones use (functions/index.js lets the admin through), with
// { real, introAt }. With ?preview=1 on a dev server nothing is sent.
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { app } from '../firebase'
import { EMULATOR, EMULATOR_HOST, EMULATOR_PORTS, REGION } from './config'
import { PREVIEW } from './previewFlag'
import { introAtFor, fillInArg } from './startNight'

let call = null
export async function startNight({ real = false, fillIns = 0 } = {}) {
  const arg = { real, introAt: introAtFor({ real }), ...fillInArg({ real, fillIns }) }
  if (PREVIEW) return { ok: true, nightId: 'preview', real, introAt: arg.introAt }
  if (!call) {
    const functions = getFunctions(app, REGION)
    if (EMULATOR) connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions)
    call = httpsCallable(functions, 'hostCommand')
  }
  return (await call({ command: 'create', arg })).data
}
