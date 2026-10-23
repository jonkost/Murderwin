// The workshop's data store. The real one talks to the database; the
// preview one keeps pretend data in memory so the screens can be looked at
// on a dev server without signing in. Same functions either way.
import * as real from './store.firestore'
import { PREVIEW } from './previewFlag'

// The pretend store is loaded only on a dev server, so the build never
// carries it.
const impl = import.meta.env.DEV && PREVIEW ? await import('./preview') : real

export const {
  ensureSeeded, subscribeArea, saveArea, whoAmI, subscribeHistory,
  subscribeTasks, updateTask, addTask, subscribeDecisions, answerDecision, fileDecision,
  subscribeLatestValidation, uploadFile, uploadReference, applyAdditions,
  subscribeGame, saveGame, subscribeReviews, saveReview, countLinesBy,
} = impl
