// The one call Jenna's page makes: the `steward` Cloud Function
// (functions/lib/steward.js). Every op goes through it; the server decides
// who gets in by verified email hash. Nothing here touches Firestore from
// the client, so nothing sealed enters the client cache; the answers live
// in the page's React state and nowhere else.
//
// On a dev server with ?preview=1 (no sign-in) a pretend version answers
// with an obviously synthetic packing list and lean table, so the page can
// be looked at.

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { app } from '../firebase'
import { EMULATOR, EMULATOR_HOST, EMULATOR_PORTS, REGION } from './config'
import { PREVIEW } from './previewFlag'

let real = null
function realApi() {
  if (!real) {
    const functions = getFunctions(app, REGION)
    if (EMULATOR) connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions)
    const call = httpsCallable(functions, 'steward')
    real = { call: async data => (await call(data)).data }
  }
  return real
}

function previewApi() {
  const bags = {
    ok: true, packed: true, packedAt: Date.now(), packedBy: 'packer', counts: { bags: 2, items: 4 }, properties: {},
    bags: [
      { n: 1, items: [{ id: 'a', name: '(Preview item one)', looks: '(what it looks like)', words: 'smell: preview', twice: false }, { id: 'b', name: '2 (Preview candy)', looks: '(a wrapper)', words: 'taste: preview', twice: true }] },
      { n: 2, items: [{ id: 'c', name: '(Preview item three)', looks: '(round)', words: '', twice: false }] },
    ],
  }
  const blank = () => ({ granolia: '', boo: '', zimothy: '', salem: '' })
  const leans = {
    of: 24,
    sets: [1, 2].map(n => ({ id: `preview-${n}`, questions: [1, 2, 3].map(i => ({ q: `(Preview question ${n}.${i})`, a: '(First answer)', b: '(Second answer)', leans: blank() })) })),
  }
  return {
    call: async data => {
      await new Promise(r => setTimeout(r, 120))
      switch (data.op) {
        case 'whoami': return { ok: true }
        case 'bags': return bags
        case 'leans': return { ok: true, ...leans, filled: leans.sets.reduce((n, x) => n + x.questions.reduce((m, q) => m + Object.values(q.leans).filter(Boolean).length, 0), 0) }
        case 'lean': leans.sets.find(x => x.id === data.setId).questions[data.q].leans[data.cat] = data.value; return { ok: true }
        default: throw new Error('Which op?')
      }
    },
  }
}

export function stewardApi() {
  return PREVIEW ? previewApi() : realApi()
}
