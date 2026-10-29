import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { finaleStage, elapsed, namesReady, secondsUntilNames, shownStats, shownAchievements, releasedNames, achievementsOf, EPILOGUE_AFTER_MS, hushLines, HUSH_LINE, revealView, revealCharacterId, creditsAwards } from '../src/lib/finale.js'

// Pure helpers for the living room screen in Act 7. Sample docs are shaped
// as the server writes them; no names in them are anything but samples.

const at = 1_000_000
const doc = (extra = {}) => ({
  at: new Date(at), stage: 'stats',
  schedule: { stats: 0, awards: 34_000, graph: 50_000, names: 80_000 },
  stats: [{ label: 'A', value: '1', showAt: 0 }, { label: 'B', value: '2', showAt: 4_000 }, { label: 'C', value: '3', showAt: 8_000 }],
  achievements: [{ name: 'X', title: 'T', line: 'l', showAt: 34_000 }],
  names: {}, epilogue: null, victimAt: null, holdAt: null, held: 0,
  ...extra,
})

test('the clock runs the stats, the achievements and the graph; a name shows only when the host has released it', () => {
  const f = doc()
  assert.equal(finaleStage(f, at), 'stats')
  assert.equal(finaleStage(f, at + 33_999), 'stats')
  assert.equal(finaleStage(f, at + 34_000), 'awards')
  assert.equal(finaleStage(f, at + 50_000), 'graph')
  assert.equal(finaleStage(f, at + 500_000), 'graph', 'the screen waits on the graph for the host, however long')
  assert.equal(namesReady(f, at + 79_999), false)
  assert.equal(namesReady(f, at + 80_000), true)
  assert.equal(secondsUntilNames(f, at + 70_000), 10)
  assert.equal(secondsUntilNames(f, at + 90_000), 0)
  // no achievements: the awards segment is skipped
  assert.equal(finaleStage(doc({ achievements: [] }), at + 40_000), 'stats')
  // the host's press wins over the clock
  assert.equal(finaleStage(doc({ stage: 'murderer', names: { murderer: { name: 'J' } } }), at + 90_000), 'murderer')
  assert.equal(finaleStage(doc({ stage: 'motive' }), at + 90_000), 'motive')
  const victim = doc({ stage: 'victim', epilogue: 'And so.', victimAt: new Date(at + 100_000) })
  assert.equal(finaleStage(victim, at + 100_000 + EPILOGUE_AFTER_MS - 1), 'victim')
  assert.equal(finaleStage(victim, at + 100_000 + EPILOGUE_AFTER_MS), 'done')
  assert.equal(finaleStage(doc({ stage: 'victim', epilogue: null, victimAt: new Date(at) }), at + 500_000), 'victim', 'no story, no done screen')
  assert.deepEqual(releasedNames(doc()), [])
  assert.deepEqual(releasedNames(doc({ stage: 'motive' })), ['murderer', 'motive'])
  assert.deepEqual(releasedNames(doc({ stage: 'victim' })), ['murderer', 'motive', 'victim'])
  assert.equal(finaleStage(null, at), 'stats')
})

test('the reel shows each line at its moment; a hold freezes the clock where it stood', () => {
  const f = doc()
  assert.deepEqual(shownStats(f, at + 3_999).map(s => s.label), ['A'])
  assert.deepEqual(shownStats(f, at + 8_000).map(s => s.label), ['A', 'B', 'C'])
  assert.deepEqual(shownAchievements(f, at + 33_000), [])
  assert.equal(shownAchievements(f, at + 34_000).length, 1)
  const held = doc({ holdAt: new Date(at + 5_000) })
  assert.equal(elapsed(held, at + 60_000), 5_000)
  assert.equal(finaleStage(held, at + 60_000), 'stats')
  assert.deepEqual(shownStats(held, at + 60_000).map(s => s.label), ['A', 'B'])
  assert.equal(namesReady(held, at + 90_000), false)
  // held after the Victim: the story waits too
  const heldVictim = doc({ stage: 'victim', epilogue: 'And so.', victimAt: new Date(at + 100_000), holdAt: new Date(at + 101_000) })
  assert.equal(finaleStage(heldVictim, at + 200_000), 'victim')
})

test('achievementsOf reads the workshop list as Title: line, numbered as the host taps them', () => {
  const content = { achievements: [{ text: 'Clean Plate Club: nothing left.' }, { text: 'No colon here' }, { text: '  ' }, { text: 'Two: parts: kept' }] }
  assert.deepEqual(achievementsOf(content), [
    { n: 1, title: 'Clean Plate Club', line: 'nothing left.' },
    { n: 2, title: 'No colon here', line: '' },
    { n: 4, title: 'Two', line: 'parts: kept' },
  ])
  assert.deepEqual(achievementsOf(null), [])
  assert.deepEqual(achievementsOf({ achievements: { items: [{ text: 'A: b' }] } }), [{ n: 1, title: 'A', line: 'b' }])
})

test('the hush under the graph: the spotlight lines when the host pressed Hush, nothing otherwise', () => {
  // the Host tab promised "the reveal will say so": the server writes
  // finale.spotlight from the one exposure record, and the TV shows it
  const spot = [{ role: 'ghost', act: 4, text: '[hush line for one role]' }]
  assert.deepEqual(hushLines({ graph: { hush: true }, spotlight: spot }), ['[hush line for one role]'])
  assert.deepEqual(hushLines({ graph: { hush: true }, spotlight: [...spot, { role: 'murderer', act: 2, text: '[hush line for the other]' }] }), ['[hush line for one role]', '[hush line for the other]'])
  assert.deepEqual(hushLines({ graph: { hush: true } }), [HUSH_LINE], 'the flag alone still says so')
  assert.deepEqual(hushLines({ graph: { hush: false } }), [])
  assert.deepEqual(hushLines({ graph: { hush: false }, spotlight: [] }), [])
  assert.deepEqual(hushLines(null), [])
})

// The closing bulletin as the server writes it: each press puts that stage's parts in news.<stage>
// (the part that carries a card ends its lead-in) and the moment its card may show in cardAt.<stage>.
const P = (who, text, card) => ({ who, text, ...(card ? { card } : {}) })
const NEWS = {
  murderer: [P('Anchor', '[studio opens]'), P('Field', '[on the lookout for...]', 'murderer')],
  motive: [P('Field', '[it all started over...]', 'motive')],
  victim: [P('Field', '[and it ended in the murder of...]', 'ghost'), P('Field', '[be careful out there]'), P('Anchor', '[studio closes]')],
}

test('BK-11 each name card cuts in only after its lead-in has played; the words come first', () => {
  const pressed = at + 90_000
  // the Murderer pressed: Ava and Mic's lead-in, no card yet
  const m = doc({ stage: 'murderer', names: { murderer: { name: 'J', characterName: 'C' } }, news: { murderer: NEWS.murderer }, cardAt: { murderer: new Date(pressed + 15_000) } })
  const before = revealView(m, pressed + 1_000)
  assert.deepEqual(before.cards, [], 'no name on the TV while the studio is talking')
  assert.equal(before.fresh, null)
  assert.equal(before.waiting, true)
  assert.deepEqual(before.captions.map(c => c.text), ['[studio opens]', '[on the lookout for...]'])
  const after = revealView(m, pressed + 15_000)
  assert.deepEqual(after.cards, ['murderer'])
  assert.equal(after.fresh, 'murderer')
  assert.deepEqual(after.captions, [], 'the lead-in is over: nothing left to caption')
  // the Motive pressed: the Murderer's card stays up through Mic's line, then the Motive's cuts in
  const mo = doc({ stage: 'motive', news: { ...m.news, motive: NEWS.motive }, cardAt: { murderer: new Date(pressed + 15_000), motive: new Date(pressed + 63_000) } })
  assert.deepEqual(revealView(mo, pressed + 61_000).cards, ['murderer'])
  assert.deepEqual(revealView(mo, pressed + 61_000).captions.map(c => c.text), ['[it all started over...]'])
  assert.deepEqual(revealView(mo, pressed + 63_000).cards, ['murderer', 'motive'])
  // the Victim: "...and it ended in the murder of..." first, then the card, then the sign-off and the close under the cards
  const v = doc({ stage: 'victim', news: { ...mo.news, victim: NEWS.victim }, cardAt: { ...mo.cardAt, victim: new Date(pressed + 103_000) } })
  const lead = revealView(v, pressed + 101_000)
  assert.deepEqual(lead.cards, ['murderer', 'motive'])
  assert.deepEqual(lead.captions.map(c => c.text), ['[and it ended in the murder of...]'])
  const end = revealView(v, pressed + 104_000)
  assert.deepEqual(end.cards, ['murderer', 'motive', 'victim'])
  assert.equal(end.fresh, 'victim')
  assert.deepEqual(end.captions.map(c => c.text), ['[be careful out there]', '[studio closes]'])
  // a hold stops this clock too
  const held = { ...m, holdAt: new Date(pressed + 2_000) }
  assert.deepEqual(revealView(held, pressed + 60_000).cards, [], 'held during the lead-in: the card waits')
  // a doc from before cardAt: the card at once, with all its words
  const old = doc({ stage: 'murderer', news: { murderer: NEWS.murderer } })
  assert.deepEqual(revealView(old, pressed).cards, ['murderer'])
  assert.equal(revealView(old, pressed).captions.length, 2)
  assert.deepEqual(revealView(doc(), at), { cards: [], fresh: null, waiting: false, captions: [] })
  // the TV draws from revealView, with the character's portrait on the people's cards
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  assert.ok(kiosk.includes('const rv = revealView(finale, now)'))
  assert.ok(kiosk.includes('rv.cards.map(') && kiosk.includes('rv.captions.map('))
  assert.ok(kiosk.includes('className="reveal-portrait"'))
  // the chime sounds as a card cuts in, never for a screen reloaded during the story, the journey or the credits
  assert.ok(kiosk.includes('NAME_STAGES.includes(finaleStage(finale, serverNow())) ? revealView(finale, serverNow()).fresh : null'))
})

test('F31 Held shows on the Parlour TV only on a rehearsal, like the Rehearsal tag; on the party night the Host tab says so (Jon, 29 Oct 2026)', () => {
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  const finale = kiosk.slice(kiosk.indexOf('export function Finale('), kiosk.indexOf('// The calculating bar'))
  assert.equal((finale.match(/<p className="kiosk-next">Held<\/p>/g) ?? []).length, 3, 'the counting, the graph slot and the reveal')
  assert.equal((finale.match(/\{held && finale\.rehearsal && <p className="kiosk-next">Held<\/p>\}/g) ?? []).length, 3, 'every one behind the rehearsal test')
  assert.ok(finale.includes('{finale.rehearsal && <p className="kiosk-next">Rehearsal</p>}'), 'the same test as the Rehearsal tag')
  // the hold itself still stops the screen on every night
  assert.ok(kiosk.includes("animationPlayState: finale.holdAt ? 'paused' : 'running'"), 'the bar and the credits stand still')
  // and the host still knows: the Host tab's reveal panel says so and offers Carry on
  const host = readFileSync(new URL('../src/screens/Host.jsx', import.meta.url), 'utf8')
  const panel = host.slice(host.indexOf('export function RevealPanel('), host.indexOf('export function AchievementsPanel('))
  assert.ok(panel.includes("held ? 'The screen is held where it is.'"), 'the reveal panel says the screen is held')
  assert.ok(panel.includes('>Carry on</button>') && panel.includes('>Hold the screen</button>'), 'and offers Carry on')
})

test('a named card finds its character for the portrait, by id, by character name, or by a unique guest name', () => {
  const characters = [{ id: 'rye', name: 'Dorothy Rye' }, { id: 'arms', name: 'Roger Arms' }]
  const roster = { a: { name: 'Ana', characterId: 'arms' }, b: { name: 'Ben', characterId: 'rye' }, c: { name: 'Ben', characterId: 'arms' } }
  assert.equal(revealCharacterId({ name: 'X', characterName: 'Y', characterId: 'fume' }, { characters, roster }), 'fume')
  assert.equal(revealCharacterId({ name: 'Ana', characterName: 'Dorothy Rye' }, { characters, roster }), 'rye')
  assert.equal(revealCharacterId({ name: 'Ana', characterName: '' }, { characters, roster }), 'arms')
  assert.equal(revealCharacterId({ name: 'Ben', characterName: '' }, { characters, roster }), null, 'two guests share the name: no guess')
  assert.equal(revealCharacterId(null, { characters, roster }), null)
  assert.equal(revealCharacterId({ name: 'Zed' }), null)
})

test('D1-26 the end-credit awards show only in the credits; the early reel keeps the host\'s achievements', () => {
  const f = doc({ credits: { awards: [{ name: 'Y', title: 'Credit award', line: '' }] } })
  assert.deepEqual(shownAchievements(f, at + 49_000).map(a => a.title), ['T'], 'the early reel: the host\'s achievements only')
  assert.deepEqual(creditsAwards(f).map(a => a.title), ['T', 'Credit award'], 'the credits: the achievements, then the awards')
  assert.deepEqual(creditsAwards(doc({ achievements: [] })).map(a => a.title), [])
  assert.deepEqual(creditsAwards(null), [])
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  assert.ok(kiosk.includes('creditsAwards(finale).map('), 'the credits roll reads both lists')
})

test('F18 the dial\'s journey is shown only after the reveal: after the Victim\'s name and the closing story, never before', async () => {
  const { JOURNEY_AFTER_MS, CREDITS_AFTER_MS } = await import('../src/lib/finale.js')
  const graph = { points: [{ act: 2, role: 'ghost', delta: 2 }], running: [{ act: 2, value: 2 }, { act: 4, value: 2 }, { act: 6, value: 2 }], high: 2, low: 0, clues: [{ label: 'The supper bulletin', level: 4 }] }
  // before any name, on the clock: the stats, the awards, the graph slot (which shows W-O-O-F News coming), never the journey
  for (let t = 0; t <= 200_000; t += 5_000) assert.notEqual(finaleStage(doc({ graph }), at + t), 'journey', 'F18 not before the names')
  // through the first two names: never the journey
  for (const stage of ['murderer', 'motive']) assert.notEqual(finaleStage(doc({ graph, stage }), at + 500_000), 'journey')
  // the Victim named: the closing story first, then the journey, then the credits
  const victimAt = at + 300_000
  const v = doc({ graph, stage: 'victim', epilogue: '(the closing story)', victimAt: new Date(victimAt) })
  assert.equal(finaleStage(v, victimAt + EPILOGUE_AFTER_MS - 1), 'victim')
  assert.equal(finaleStage(v, victimAt + EPILOGUE_AFTER_MS), 'done')
  assert.equal(finaleStage(v, victimAt + JOURNEY_AFTER_MS - 1), 'done')
  assert.equal(finaleStage(v, victimAt + JOURNEY_AFTER_MS), 'journey', 'F18 the journey after the reveal')
  assert.equal(finaleStage(v, victimAt + CREDITS_AFTER_MS), 'credits')
  assert.notEqual(finaleStage({ ...v, epilogue: null }, victimAt + JOURNEY_AFTER_MS), 'journey', 'no closing story yet, no journey')
  // the screen draws the tug of war and the clue levels on the journey only, as dots, never a number
  const kiosk = readFileSync(new URL('../src/screens/Kiosk.jsx', import.meta.url), 'utf8')
  const finale = kiosk.slice(kiosk.indexOf('export function Finale('), kiosk.indexOf('// The calculating bar'))
  assert.equal((finale.match(/<TugOfWar /g) ?? []).length, 1, 'one tug of war')
  const journey = finale.slice(finale.indexOf("if (stage === 'journey') return ("), finale.indexOf("if (stage === 'credits')"))
  assert.ok(journey.includes('<TugOfWar graph={finale.graph} />'), 'F18 the tug of war is on the journey')
  assert.match(journey, /finale\.graph\.clues\.map\(c => <li key=\{c\.label\}><span>\{c\.label\}<\/span><span className="clue-level">\{'●'\.repeat\(c\.level\)\}\{'○'\.repeat\(5 - c\.level\)\}<\/span><\/li>\)/, 'F18 each dial clue at the level it landed, as five dots')
  const graphSlot = finale.slice(finale.indexOf("if (stage === 'graph') return ("), finale.indexOf("if (stage === 'journey') return ("))
  assert.ok(!graphSlot.includes('TugOfWar') && !graphSlot.includes('clues'), 'F18 the graph slot before the names shows none of it')
})
