// The Morning after page's one call: the `morningAfter` Cloud Function
// (functions/lib/morning.js), Jon's account only. Before the party it
// answers no and why. After the party night's reveal, and only once Jon has
// typed OPEN, it sends the case that ran, for this page's React state and
// nowhere else: nothing is written to the browser.
//
// On a dev server with ?preview=1 (no sign-in) a pretend server answers
// with an obviously made-up case, so the page can be looked at.

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { app } from '../firebase'
import { EMULATOR, EMULATOR_HOST, EMULATOR_PORTS, REGION } from './config'
import { PREVIEW } from './previewFlag'

let real = null
function realCall() {
  if (!real) {
    const functions = getFunctions(app, REGION)
    if (EMULATOR) connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions)
    const call = httpsCallable(functions, 'morningAfter')
    real = async data => (await call(data)).data
  }
  return real
}

// The pretend server: ready, then open, with a made-up case in brackets.
const pretend = { opened: false, secrets: null }
const PRETEND_VIEW = {
  label: '(Preview night)', rehearsal: false,
  answer: { murderer: { name: '(Guest A)', character: '(A character)', bag: 3 }, victim: { name: '(Guest B)', character: '(Another character)', bag: 7 }, motive: { n: 0, rhyme: '(a made-up motive)', family: '(A family)' } },
  people: [
    { name: '(Guest A)', character: '(A character)', bag: 3, role: 'The Murderer', ruledOut: ['(Family one)', '(Family two)'] },
    { name: '(Guest B)', character: '(Another character)', bag: 7, role: 'The Ghost (the victim)', ruledOut: ['(Family three)'] },
    { name: '(Guest C)', character: '(A third character)', bag: 1, role: 'Detective', ruledOut: ['(Family one)', '(Family four)'] },
  ],
  news: ['(Family two)'], dial: { level: 4, total: 5, pushes: { ghost: 6, murderer: 4 } },
  bags: { murderer: 3, ghost: 7, list: [{ n: 1, items: ['(a thing)', '(another thing)'] }, { n: 3, items: ['(a third thing)'] }] },
  drawing: [{ round: 1, picture: '(a picture)' }, { round: 2, picture: 'a made-up picture (the bank had none)' }],
  leans: 17, spills: 0,
}
async function pretendCall(data) {
  await new Promise(r => setTimeout(r, 150))
  switch (data.op) {
    case 'status': return pretend.opened
      ? { ok: true, opened: true, ready: true, why: 'Open. The case is in the archive.', secrets: pretend.secrets, label: '(Preview night)' }
      : { ok: true, opened: false, ready: true, why: 'Ready. The party night has had its reveal.', label: '(Preview night)' }
    case 'open': if (String(data.confirm).trim().toUpperCase() !== 'OPEN') throw new Error('Type OPEN to open the case.'); pretend.opened = true; return { ok: true, parts: 20 }
    case 'read': return { ok: true, view: PRETEND_VIEW, secrets: pretend.secrets }
    case 'secrets': pretend.secrets = data.choice === 'clear' ? 'cleared' : 'kept'; return { ok: true, secrets: pretend.secrets }
    default: throw new Error('Which op?')
  }
}

export function morningCall(data) {
  return PREVIEW ? pretendCall(data) : realCall()(data)
}
