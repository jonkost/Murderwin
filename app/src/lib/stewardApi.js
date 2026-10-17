// The one call Jenna's page makes: the `steward` Cloud Function
// (functions/lib/steward.js). Every op goes through it; the server decides
// who gets in by verified email hash. Nothing here touches Firestore from
// the client, so nothing sealed enters the client cache; the answers live
// in the page's React state and nowhere else.
//
// On a dev server with ?preview=1 (no sign-in) a pretend version answers
// with an obviously synthetic set, so the page can be looked at.

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { app } from '../firebase'
import { EMULATOR, EMULATOR_HOST, EMULATOR_PORTS, REGION } from './config'
import { PREVIEW } from './previewFlag'
import { syntheticSet, setField } from './steward'

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
  const codes = ['PREV1', 'PREV2', 'PREV3']
  const sets = Object.fromEntries(codes.map(c => [c, { content: syntheticSet(c), original: null, version: 0, editedAt: null, editedBy: null, review: '' }]))
  const bags = {
    ok: true, packed: true, packedAt: Date.now(), packedBy: 'packer', stackedPairs: 2, counts: { bags: 2, items: 4 }, properties: {},
    bags: [
      { n: 1, items: [{ id: 'a', text: '(Preview item one) — smell: preview', twice: false }, { id: 'b', text: '(Preview item two) — taste: preview', twice: true }] },
      { n: 2, items: [{ id: 'c', text: '(Preview item three) — touch: preview', twice: false }] },
    ],
  }
  return {
    call: async data => {
      await new Promise(r => setTimeout(r, 120))
      switch (data.op) {
        case 'whoami': return { ok: true }
        case 'list': return { ok: true, generated: true, generatedAt: Date.now(), bags: true, codes: codes.map(code => ({ code, edited: Boolean(sets[code].editedAt), editedAt: sets[code].editedAt, version: sets[code].version, review: sets[code].review, complete: true })) }
        case 'read': return { ok: true, code: data.code, motive: { n: 0, rhyme: '(Preview: the riddle this set serves goes here)' }, ...sets[data.code], generatedAt: Date.now(), shape: { ok: true, fails: [] } }
        case 'write': {
          const s = sets[data.code]
          if (!s.original) s.original = structuredClone(s.content)
          s.content = setField(s.content, data.field, data.value)
          s.version += 1; s.editedAt = Date.now(); s.editedBy = 'steward'
          return { ok: true, code: data.code, field: data.field, version: s.version, shape: { ok: true, fails: [] } }
        }
        case 'mark': sets[data.code].review = data.review; return { ok: true, code: data.code, review: data.review }
        case 'bags': return bags
        default: throw new Error('Which op?')
      }
    },
  }
}

export function stewardApi() {
  return PREVIEW ? previewApi() : realApi()
}
