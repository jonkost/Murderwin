// Miss Boo LaRue's Arcade on the night (30 Oct 2026, docs/handoff-2026-10-30.md):
// every player plays one round of each of the five games, and that round's
// score is saved with the night, per player and per game. The Act 7 reel
// shows the top scorer in each game and the best all round, by place
// (arcadeOverall's default), before the reveal.
//
// SEAL RULE: nothing here reads a case, a part dealt to anyone or anything
// sealed. A score is a number a guest made on the deck; the awards are worked
// out from the scores and the roster's names alone, so they can never hint at
// who did it or who died (G60).

import { NightError } from './night.js'

export const arcadePath = (nightId) => `nights/${nightId}/public/arcade`

// The five games, as the arcade names them (play/src/lib/arcade.js GAMES; a test keeps them equal).
export const ARCADE_GAMES = Object.freeze([
  { id: 'tail', name: 'Boo Chasing Her Tail' },
  { id: 'pointer', name: 'The Lazy Pointer' },
  { id: 'mice', name: 'Whack-a-Mouse' },
  { id: 'knock', name: 'Knock It Off the Table' },
  { id: 'yarn', name: 'Yarn Catch' },
])
const GAME_IDS = ARCADE_GAMES.map(g => g.id)
export const ARCADE_TITLE = "Miss Boo LaRue's Arcade"
export const OVERALL_TITLE = 'Top of the Arcade'
export const OVERALL_LINE = 'The best place across all five games.'
export const MAX_SCORE = 10000 // nothing on the deck scores near this; a bigger number is a mistake, not a score

// A round's score, written once: a guest's first counted round of a game is
// the one that counts (arcadeExit's default: a round left early never came
// here, so a guest may play it again). A second score for the same guest and
// game changes nothing and says so.
export async function recordArcadeScore(db, { nightId, guestKey, game, score, now = Date.now() }) {
  if (!nightId) throw new NightError('invalid', 'Which night?')
  const key = String(guestKey ?? '').trim()
  if (!key || key.includes('.') || key.includes('/')) throw new NightError('invalid', 'Which guest?')
  if (!GAME_IDS.includes(game)) throw new NightError('invalid', 'Which game?')
  const n = Number(score)
  if (!Number.isInteger(n) || n < 0 || n > MAX_SCORE) throw new NightError('invalid', 'A score is a whole number.')
  const nightSnap = await db.doc(`nights/${nightId}`).get()
  if (!nightSnap.exists) throw new NightError('no-night', 'No such night.')
  if (!nightSnap.data().roster?.[key]) throw new NightError('no-guest', 'No such guest.')
  const ref = db.doc(arcadePath(nightId))
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const scores = snap.exists ? snap.data().scores ?? {} : {}
    if (scores[key]?.[game]) return { ok: true, counted: false, already: true }
    const value = { score: n, at: new Date(now) }
    if (snap.exists) tx.update(ref, { [`scores.${key}.${game}`]: value })
    else tx.set(ref, { scores: { [key]: { [game]: value } } })
    return { ok: true, counted: true }
  })
}

function andList(names) {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// The awards from the scores: in each game the top scorer(s) with the score;
// and the best all round by place (arcadeOverall's default): in each game
// first place gets as many points as there are players, down to 1 for last,
// ties sharing the higher points, a game a player never played scoring
// nothing; most points wins, everyone tied named. `people` is the roster,
// [{ key, name }], every player at the party. Nothing else goes in.
export function arcadeAwards(scores = {}, people = []) {
  const n = people.length
  const nameOf = Object.fromEntries(people.map(p => [p.key, p.name]))
  const points = Object.fromEntries(people.map(p => [p.key, 0]))
  const games = []
  for (const g of ARCADE_GAMES) {
    const played = people.map(p => ({ key: p.key, score: scores[p.key]?.[g.id]?.score })).filter(x => Number.isInteger(x.score) && x.score >= 0)
    if (!played.length) continue
    const top = Math.max(...played.map(x => x.score))
    const winners = played.filter(x => x.score === top).map(x => nameOf[x.key])
    games.push({ game: g.id, title: g.name, names: winners, name: andList(winners), score: top })
    for (const x of played) {
      const higher = played.filter(y => y.score > x.score).length // standard places: ties share the higher place
      points[x.key] += Math.max(1, n - higher)
    }
  }
  const best = Math.max(0, ...Object.values(points))
  const overall = best > 0 ? { names: people.filter(p => points[p.key] === best).map(p => p.name), points: best } : null
  if (overall) overall.name = andList(overall.names)
  return { games, overall, points }
}

// The reel's lines: one a game, then the best all round. Empty when nobody played.
export function arcadeAchievements(awards) {
  const items = (awards?.games ?? []).map(g => ({ title: g.title, name: g.name, line: `${g.score} ${g.score === 1 ? 'point' : 'points'}` }))
  if (awards?.overall) items.push({ title: OVERALL_TITLE, name: awards.overall.name, line: OVERALL_LINE })
  return items
}
