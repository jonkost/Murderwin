// The Game night page's Replay box (card 324): what it shows, from the
// server's record of the last rehearsals (meta/replay, functions/lib/seed.js)
// and the box's own word (meta/game.replay_seed). Pure, so app/test can run it.

// A word as the server will read it: lower case, letters, numbers and dashes.
// Keep in step with cleanSeed in functions/lib/seed.js.
export function cleanSeed(text) {
  return String(text ?? '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
}

function millis(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (v instanceof Date) return v.getTime()
  if (typeof v.seconds === 'number') return v.seconds * 1000
  return Number(v) || 0
}

export function replayView({ replay = null, game = {} } = {}) {
  const party = game?.party_night === true
  const waiting = cleanSeed(game?.replay_seed)
  const recent = (Array.isArray(replay?.recent) ? replay.recent : []).filter(r => r?.seed).map(r => ({
    seed: r.seed,
    // the default label is the date again, so only a name of its own is shown
    label: r.label && !/^Night of /.test(r.label) ? r.label : '',
    at: millis(r.at),
    note: [r.replayed ? 'a replay' : null, r.gameTest ? 'a Game test night' : null].filter(Boolean).join(', '),
  }))
  return {
    party,
    waiting: party ? '' : waiting,
    status: party
      ? 'Not on the party night: the party is never replayed. Untick This is the party night above to replay a rehearsal.'
      : waiting ? `Waiting: the next night started from a phone is dealt from ${waiting}.`
        : 'Empty: the next night started from a phone is dealt from a fresh word.',
    recent,
  }
}
