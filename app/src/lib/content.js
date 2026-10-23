import seed from '../../../seed/safe-content.json' with { type: 'json' }
import charactersFile from '../../../seed/characters.json' with { type: 'json' }
import motivesFile from '../../../seed/motives.json' with { type: 'json' }
import bagItemsFile from '../../../seed/bag-items.json' with { type: 'json' }
import parlourFile from '../../../seed/parlour-games.json' with { type: 'json' }
import { labelCodec, dashCodec, bagCodec, npcCodec, echoCodec, fillerCodec, characterCodec, plainCodec, SENSES, HOUSEHOLD } from './codecs.js'
import { TIMELINE_TASKS, TIMELINE_DECISIONS, RETIRED_FOR_TIMELINE, STANDIN_SOUND_TASKS } from './timelineTasks.js'

// The fourteen characters are fixed (seed/characters.json): the game deals
// them and keys the cats' moods off the job. The workshop writes the persona
// only. The saved line keeps its old shape, NAME — the Job. Persona., with
// the job filled in from the seed so it can never drift.
export const CHARACTERS = charactersFile.characters.map(c => ({ name: c.name, profession: c.profession }))
const byName = (name) => CHARACTERS.find(c => c.name.toLowerCase() === (name ?? '').trim().toLowerCase())
export const bioCodec = {
  split(text) {
    const v = characterCodec.split(text)
    const c = byName(v.name)
    return { ...v, name: c ? c.name : v.name, profession: c ? c.profession : v.profession }
  },
  join(values) {
    const c = byName(values.name)
    return characterCodec.join({ ...values, profession: c ? c.profession : values.profession })
  },
}

export const CATS = [
  { key: 'irwin', name: 'Sir Irwin', tag: 'the dog' },
  { key: 'salem', name: 'Salem Crookshank', tag: 'the long-time groundskeeper' },
  { key: 'zimothy', name: 'Zimothy Clawford, Esq.', tag: 'the old family solicitor' },
  { key: 'boo', name: 'Miss Boo LaRue', tag: 'family friend and socialite' },
  { key: 'granolia', name: 'Granolia Lickspittle', tag: 'taken in by the family when no one else would' },
]

export const POOLS = ['room', 'time', 'duration', 'count', 'place', 'crowd']
export const POOL_NAMES = { room: 'Rooms', time: 'Times of day', duration: 'How long', count: 'How many times', place: 'Places in town', crowd: 'Who was watching' }

export const ACTS = ['act1', 'act2', 'act3', 'act4', 'act5', 'act6', 'act7']
// Decided 13 Oct 2026 (Canon page).
export const ACT_NAMES = { act1: 'The Invitation', act2: 'Lights Out', act3: 'Supper Is Served', act4: 'Behind Closed Doors', act5: 'One Candle', act6: 'The Final Hour', act7: 'Unmasked' }

export const TAB_KINDS = {
  cats: { list: CATS.map(c => c.key), field: 'cat', label: k => CATS.find(c => c.key === k).name },
  // Sir Irwin adores everyone and never brushes anyone off, so no Irwin tab here.
  cats4: { list: CATS.filter(c => c.key !== 'irwin').map(c => c.key), field: 'cat', label: k => CATS.find(c => c.key === k).name },
  pools: { list: POOLS, field: 'pool', label: k => POOL_NAMES[k] ?? k },
  acts: { list: ACTS, field: 'act', label: k => `Act ${k.slice(3)}: ${ACT_NAMES[k]}` },
}

// Every label a phone or the dealer reads from the phone's own lines. The
// notices are the cards between beats (NOTICE MEET is the Act 1 "meet the
// household" card); NUMBERS and NOTICE SCRAP carry the safe's three numbers
// with [A] [B] [C] where they go; STOPS is the five words of the Cats tab
// slider, low to high, with commas.
export const NOTICE_KEYS = ['meet', 'introduce', 'ready', 'orient', 'news', 'checkin', 'down', 'bulletin', 'roam', 'irwin', 'door', 'eyes']
const NOTICE_WHAT = {
  meet: 'Act 1, meet the household', introduce: 'Act 1, say who you are out loud', ready: 'Act 1, settle in before the dark', orient: 'Act 2, where things are on the phone',
  news: 'Act 2, eyes up at the big screen', checkin: 'Act 2, read your clues before dinner', down: 'Act 3, phones down at dinner', bulletin: 'Act 3, the bulletin was heard',
  roam: 'Act 5, cake in hand', irwin: 'Act 5, Sir Irwin is about to speak', door: 'Act 6, the door is open', eyes: 'Act 7, eyes on the screen for the reveal',
}
export const UI_LABELS = [
  { value: 'DOORS', label: 'DOORS: the doors are not open yet' }, { value: 'JOIN', label: 'JOIN: who are you, tap your name' }, { value: 'JOIN BUTTON', label: 'JOIN BUTTON: the button that lets you in' },
  { value: 'JOIN AGAIN', label: 'JOIN AGAIN: coming back on a new phone' }, { value: 'LOBBY', label: 'LOBBY: in, waiting for Act 1' }, { value: 'BAG', label: 'BAG: which bag to collect' },
  { value: 'OFFLINE', label: 'OFFLINE: no signal' }, { value: 'PAUSED', label: 'PAUSED: the night is paused' }, { value: 'PAUSED BY HOST', label: 'PAUSED BY HOST: the strip on a paused phone' },
  { value: 'SUPERSEDED', label: 'SUPERSEDED: this character moved to another phone' },
  { value: 'POWER', label: 'POWER: the power comes back' }, { value: 'ORIENT', label: 'ORIENT: the power is back, for a phone with no card yet' },
  { value: 'YOUR ROLE', label: 'YOUR ROLE: the heading over the role card' }, { value: 'SHOW ROLE', label: 'SHOW ROLE: the button that shows the role card again' }, { value: 'HIDE ROLE', label: 'HIDE ROLE: the button that puts it away' },
  { value: 'HIDE', label: 'HIDE: the hide-this button' }, { value: 'HOLD', label: 'HOLD: keep reading, nearly there' },
  { value: 'RETICULE', label: 'RETICULE: the tabs at the bottom' }, { value: 'START NIGHT', label: 'START NIGHT: the hosts start the night' }, { value: 'HOST', label: 'HOST: the hosts’ own tab' },
  { value: 'NOT FOR YOU', label: 'NOT FOR YOU: a hosts-only page opened by a guest' },
  { value: 'STOPS', label: 'STOPS: the five words of the Cats tab slider, low to high, with commas' },
  { value: 'NUMBERS', label: 'NUMBERS: the safe’s three numbers inside a testimony, with [A], [B] and [C]' },
  { value: 'NOTICE SCRAP', label: 'NOTICE SCRAP: the scrap of paper a cat leaves when it will not talk, with [A], [B] and [C]' },
  { value: 'FILLER', label: 'FILLER: a phone with nothing to do while others are choosing' },
  { value: 'RELAY RULES', label: 'RELAY RULES: the rules of the drawing, on the living room screen' },
  ...NOTICE_KEYS.map(k => ({ value: `NOTICE ${k.toUpperCase()}`, label: `NOTICE ${k.toUpperCase()}: ${NOTICE_WHAT[k]}` })),
]

// Granolia's lines on the study screen, by moment. The screen has a plain
// default for each until one is written here.
export const STUDY_LABELS = [
  { value: 'IDLE', label: 'IDLE: before anyone touches a panel' }, { value: 'PLAYING', label: 'PLAYING: the wall is showing a pattern' },
  { value: 'REPRODUCING', label: 'REPRODUCING: now the group touches it back' }, { value: 'ENTERING', label: 'ENTERING: press the colour and number on the button box' },
  { value: 'SLOW', label: 'SLOW: after a few misses, the pattern again, slower' }, { value: 'MAP', label: 'MAP: the panels numbered on screen' },
  { value: 'HALF COLOUR', label: 'HALF COLOUR: the number was right, the colour was not' }, { value: 'HALF NUMBER', label: 'HALF NUMBER: the colour was right, the number was not' },
  { value: 'NEITHER', label: 'NEITHER: both halves wrong' }, { value: 'TIME', label: 'TIME: three minutes left' },
  { value: 'SOLVED', label: 'SOLVED: the three jewels are lit' }, { value: 'CAPPED', label: 'CAPPED: fifteen minutes are up' },
]

// The Act 4 station cards, one line each. CAT may carry [CAT] for the cat's
// name; BAGS may carry [PROPERTY] and [COUNT] (two or three).
export const STATION_LABELS = [
  { value: 'STUDY', label: 'STUDY: go up to the study' }, { value: 'CAT', label: 'CAT: find the cat, with [CAT] for its name' },
  { value: 'BAGS', label: 'BAGS: the bags, with [PROPERTY] and [COUNT]' }, { value: 'PUZZLE', label: 'PUZZLE: the small shape puzzle on the phones' },
  { value: 'CHECKIN', label: 'CHECKIN: sit down together and compare' },
]

// The fourteen traces, one line each: what the bedroom screen says was left
// behind when the dial reads clearest. Never a name.
const traceLabel = (trace) => `TRACE ${String(trace).toUpperCase().split('-').join(' ')}`
export const TRACE_LABELS = charactersFile.characters.map(c => ({ value: traceLabel(c.trace), label: `${traceLabel(c.trace)}: ${c.traceLabel}` }))

// "Title: one line" for the achievements list. The title keeps its case; the
// first colon splits the line.
export const achievementCodec = {
  split(text) {
    const t = text ?? ''
    const m = /^([^:\n]+):[ \t]*/.exec(t)
    if (!m) return { title: '', text: t }
    return { title: m[1].trim(), text: t.slice(m[0].length) }
  },
  join({ title, text }) {
    const a = (title ?? '').trim()
    const b = text ?? ''
    return a ? `${a}: ${b}` : b
  },
}

// A field is one box on screen. kind: text | textarea | select. The box
// marked main takes the cursor and the Speak button.
const line = (label, placeholder, extra = {}) => ({ key: 'text', label, placeholder, kind: 'textarea', main: true, ...extra })

// Every list. `moment` says which part of the night the list feeds (shown as
// a chip on Home and at the top of the list). `fields` and `codec` turn one
// saved line into boxes; a list without them is a single box. `why` is the
// one-sentence summary on Home; the full card (what it is, where a guest
// meets it, what goes in each box, an example) lives in cards.js.
export const AREAS = {
  // — The characters —
  bios: { label: 'The fourteen characters', moment: 'Act 1, dealt at the door when a guest taps their name, then on the phone all night', why: 'The line each guest reads about who they are tonight. The fourteen names and jobs are fixed; you write who they are.', group: 'The characters', tabs: null, guide: 'bio', goal: 14,
    codec: bioCodec,
    fields: [
      { key: 'name', label: 'Who', placeholder: 'Pick one', kind: 'select', options: CHARACTERS.map(c => ({ value: c.name, label: `${c.name}, the ${c.profession}` })) },
      { key: 'persona', label: 'Who they are, in a line or two', placeholder: 'e.g. Up since four. Has opinions about everyone else’s bread.', kind: 'textarea', main: true },
    ] },

  // — The household —
  npc_cards: { label: 'Meet the household', moment: 'Act 1, when guests meet the cats and Sir Irwin', why: 'A short introduction to each cat and to Sir Irwin, read on the phone before anyone goes looking for them.', group: 'The household', tabs: null, guide: 'npc_card', goal: 5,
    codec: npcCodec,
    fields: [
      { key: 'who', label: 'Who', placeholder: 'Pick one', kind: 'select', options: HOUSEHOLD.map(h => ({ value: h.key, label: `${CATS.find(c => c.key === h.key).name}, ${h.title}` })) },
      { key: 'about', label: 'About them, two or three sentences, ending with where they keep themselves', placeholder: 'e.g. Arrived for a party some years back and has seen no reason to declare it over. Found wherever the light is best.', kind: 'textarea', main: true },
    ] },
  openers: { label: 'What a cat says first', moment: 'Acts 2 and 4, the moment a cat starts talking to you', why: 'The greeting at the top of a cat’s testimony. Claude writes the secret middle; you write the hello.', group: 'The household', tabs: 'cats', guide: 'opener', goalPerTab: 8,
    fields: [line('The greeting', 'How this cat says hello, before it says anything useful')] },
  closers: { label: 'What a cat says last', moment: 'Acts 2 and 4, the moment a cat finishes', why: 'The sign-off at the bottom of a cat’s testimony, after the secret middle has landed.', group: 'The household', tabs: 'cats', guide: 'closer', goalPerTab: 8,
    fields: [line('The sign-off', 'One short sentence in this cat’s voice, adding nothing')] },
  refusals: { label: 'What a cat says to brush you off', moment: 'Acts 2 and 4, when a cat will not talk to you', why: 'What a cat says when it declines to talk to this guest. Funny, in character, and it gives nothing away.', group: 'The household', tabs: 'cats4', guide: 'refusal', goalPerTab: 8,
    fields: [line('The brush-off', 'How this cat says no, in a sentence or two')] },
  smalltalk: { label: 'Cat chatter, passing by', moment: 'All night: a passing line on each phone, and on the room screens', why: 'A line a cat mutters as it passes a phone at rest, and on the room screens beside the real lines. Never about the case.', group: 'The household', tabs: 'cats', guide: 'smalltalk', goalPerTab: 8,
    fields: [line('The line', 'Something this cat would mutter about the house')] },
  status_lines: { label: 'How a cat feels about you', moment: 'All night, on the Cats tab of each phone', why: 'The phone never shows a number for affection. It shows one of these lines instead: locked out, warming up, or in.', group: 'The household', tabs: 'cats', guide: 'status_line', goalPerTab: 3, goalByTab: { irwin: 1 },
    codec: labelCodec,
    fields: [
      { key: 'label', label: 'Standing', placeholder: 'Pick one', kind: 'select', options: [
        { value: 'LOCKED', label: 'Locked out' }, { value: 'WARMING', label: 'Warming up' }, { value: 'IN', label: 'In' }],
        onlyForTab: { irwin: ['IN'] } },
      { key: 'text', label: 'The line the guest reads', placeholder: 'One sentence about where this guest stands with the cat', kind: 'textarea', main: true },
    ] },
  study_lines: { label: 'Granolia in the study', moment: 'Act 4, on the study screen while a group plays the light puzzle', why: 'What Granolia says on the study screen at each moment of the light puzzle: before it starts, while the wall plays, after a miss, when time is short. The screen has a plain default for each.', group: 'The household', tabs: null, guide: null, goal: STUDY_LABELS.length,
    codec: labelCodec,
    fields: [
      { key: 'label', label: 'Which moment', placeholder: 'Pick one', kind: 'select', options: STUDY_LABELS },
      { key: 'text', label: 'What Granolia says', placeholder: 'e.g. Again, slower. I have all day. Well. Fifteen minutes.', kind: 'textarea', main: true },
    ] },
  trailoffs: { label: 'Granolia losing her thread (retired)', moment: 'Retired: Granolia misremembers one detail instead', why: 'The old way. Granolia now gets one detail wrong instead of trailing off, so nothing reads these.', group: 'The household', tabs: null, guide: 'trailoff', goal: 8, hidden: true, retired: true,
    fields: [line('The aside', 'e.g. … that’s how I remember it, anyway. *snrk.* Mostly.')] },

  // — Words on the phones —
  rules_text: { label: 'The rules, one section each', moment: 'All night, on the Rules tab of each phone', why: 'What the Rules tab on every phone says. A heading and a short paragraph each.', group: 'Words on the phones', tabs: null, guide: 'rules', goal: 10,
    codec: dashCodec,
    fields: [
      { key: 'title', label: 'Heading, in capitals', placeholder: 'e.g. YOUR PHONE', kind: 'text' },
      { key: 'body', label: 'What it says, one to three sentences', placeholder: 'e.g. It is your notebook, your map, and your memory tonight. Keep it on you.', kind: 'textarea', main: true },
    ] },
  ui_copy: { label: 'The phone’s own little lines', moment: 'All night: the door, the lobby, no signal, paused, every notice', why: 'The fixed words that no character is speaking: the door, the lobby, no signal, paused, the notices between beats, the safe’s numbers. The phone has a plain default for each until you write yours.', group: 'Words on the phones', tabs: null, guide: 'ui_copy', goal: UI_LABELS.length,
    codec: labelCodec,
    fields: [
      { key: 'label', label: 'Which screen', placeholder: 'Pick one', kind: 'select', options: UI_LABELS },
      { key: 'text', label: 'The line', placeholder: 'e.g. The Manor cannot hear your phone. Stay where you are: it will reconnect on its own. Nothing is lost.', kind: 'textarea', main: true },
    ] },
  act_scripts: { label: 'What each act asks of you', moment: 'The top of every phone when an act begins, under the act’s name', why: 'One sentence per act, under its fixed name, saying where to be and what to do.', group: 'Words on the phones', tabs: 'acts', guide: 'act_script', goalPerTab: 1,
    codec: labelCodec,
    fields: [
      { key: 'label', label: 'Which line', placeholder: 'Pick one', kind: 'select', options: [
        { value: 'OBJECTIVE', label: 'Objective: where to be, what to do' }] },
      { key: 'text', label: 'The words', placeholder: 'e.g. Find your partner and choose a room together. Anything the household kept quiet earlier comes back tonight.', kind: 'textarea', main: true },
    ] },
  station_text: { label: 'The five stations', moment: 'Act 4, the card a group gets at each station', why: 'One line per station: the study, a cat, the bags, the small puzzle, the check-in. The phone has a plain default for each until you write yours.', group: 'Words on the phones', tabs: null, guide: null, goal: STATION_LABELS.length,
    codec: labelCodec,
    fields: [
      { key: 'label', label: 'Which station', placeholder: 'Pick one', kind: 'select', options: STATION_LABELS },
      { key: 'text', label: 'The line', placeholder: 'e.g. Your phone names a property. Two or three bags in the house have it. Ask people to open theirs.', kind: 'textarea', main: true },
    ] },
  achievements: { label: 'Achievements', moment: 'Acts 1 to 5, given from the Host tab with a tap; on the phone at once and on the living room screen at the end', why: 'Pre-written achievements, a title and one line each. On the night you tap a guest, then one of these. Nothing is typed on the night.', group: 'Words on the phones', tabs: null, guide: null, goal: 20,
    codec: achievementCodec,
    fields: [
      { key: 'title', label: 'The title', placeholder: 'e.g. Clean Plate Club', kind: 'text' },
      { key: 'text', label: 'One line, read out on the screen', placeholder: 'e.g. Nothing left on the plate, not even the garnish.', kind: 'textarea', main: true },
    ] },
  scenarios: { label: 'Parlour Games', moment: 'Acts 2, 4 and 6, four times each, popping up on every phone at once', why: 'Silly sets of three questions with two answers each. Every guest answers the same set at the same moment. Each night deals twelve of these at random, so seventeen means five spare. The points only matter for the Murderer and the Ghost: they move how clear the clues come out. How the cats feel about a Detective is decided by the cats, not the points.', group: 'Words on the phones', tabs: null, guide: null, goal: 17, editor: 'questions' },
  motive_notes: { label: 'What each motive means', moment: 'All night, the small i beside a rhyme on the Motives tab', why: 'A plain explanation of the rhyme for anyone who does not get the joke. Everyone reads these from Act 1, so never a hint about tonight.', group: 'Words on the phones', tabs: null, guide: null, goal: 19,
    codec: labelCodec,
    fields: [
      { key: 'label', label: 'Which motive', placeholder: 'Pick one', kind: 'select', options: motivesFile.motives.map(m => ({ value: `MOTIVE ${m.n}`, label: `${m.n} · ${m.rhyme}` })) },
      { key: 'text', label: 'What it means, in a sentence or two', placeholder: 'e.g. Someone ate the last slice and left the empty tin in the pantry.', kind: 'textarea', main: true },
    ] },
  role_cards: { label: 'The cards in the blackout', moment: 'Act 1, the blackout, when roles land', why: 'When the lights come back every phone shows one card: Murderer, Ghost or Detective. All three the same length and shape, so a lit screen gives nothing away.', group: 'Words on the phones', tabs: null, guide: 'role_card', goal: 3,
    codec: labelCodec,
    fields: [
      { key: 'label', label: 'Which card', placeholder: 'Pick one', kind: 'select', options: [
        { value: 'MURDERER', label: 'Murderer card' }, { value: 'GHOST', label: 'Ghost card' }, { value: 'DETECTIVE', label: 'Detective card (everyone else)' }] },
      { key: 'text', label: 'The card', placeholder: 'e.g. The Manor has lost you tonight. No one knows, and no one knows why, not even you. Walk, talk, and play on.', kind: 'textarea', main: true },
    ] },
  filler: { label: 'Old filler messages', moment: 'Retired: the Parlour Games replaced these', why: 'The old way of keeping ordinary phones busy during a question window. Kept, not used.', group: 'Words on the phones', tabs: null, guide: 'filler', goal: 20, hidden: true, retired: true,
    codec: fillerCodec,
    fields: [
      { key: 'message', label: 'The message', placeholder: 'e.g. Open your bag and pick out the one thing you would never want to smell twice.', kind: 'textarea', main: true },
      { key: 'button', label: 'What the button says', placeholder: 'e.g. Done, I have picked one', kind: 'text' },
    ] },
  event_cards: { label: 'Event notes', moment: 'Notes only: event copy is written blind by Claude', why: 'Event copy is written blind by Claude; this list is only for notes.', group: 'Words on the phones', tabs: null, guide: 'event_card', goal: 12, hidden: true, retired: true,
    fields: [line('A note', 'e.g. A CONVENIENT FOG (Act 2): one room’s screen stays dark this act.')] },
  lore: { label: 'House history (retired)', moment: 'Retired: nothing on the night reads it', why: 'The old house-history paragraphs. Nothing reads them; a family paragraph belongs in the rules if wanted.', group: 'Words on the phones', tabs: null, guide: 'lore', goal: 4, hidden: true, retired: true,
    codec: labelCodec,
    fields: [
      { key: 'label', label: 'Title, in capitals', placeholder: 'e.g. THE FAMILY', kind: 'text' },
      { key: 'text', label: 'The paragraph', placeholder: 'e.g. Papa Sirwin inherited everything, including his opinions.', kind: 'textarea', main: true },
    ] },

  // — Blanks and frames —
  pools: { label: 'Blanks: rooms, times, counts', moment: 'Acts 2 and 4, dropped into a cat’s testimony', why: 'Cat lines have blanks like [ROOM]. These short phrases fill them. Lowercase, no full stop.', group: 'Blanks and frames', tabs: 'pools', goalPerTab: 10,
    fields: [line('A short phrase', 'e.g. the scullery')] },
  echo_frames: { label: 'News frames', moment: 'Acts 2 and 4, the news bulletin on a room screen', why: 'A radio or newspaper wrapper with one gap. The gap is filled with a secret fragment on the night.', group: 'Blanks and frames', tabs: null, guide: 'echo_frame', goal: 8,
    codec: echoCodec,
    fields: [
      { key: 'before', label: 'Before the gap (start with ...)', placeholder: 'e.g. ...the morning post brings word of', kind: 'textarea', main: true },
      { key: 'after', label: 'After the gap (end with ...)', placeholder: 'e.g. , which the household calls exaggerated and the post calls Tuesday...', kind: 'textarea' },
    ] },
  templates: { label: 'Stationery designs', moment: 'Acts 2 and 4, the paper a solved puzzle pays out', why: 'The seven blank documents (receipt, telegram…) that get secret text printed on them live.', group: 'Blanks and frames', tabs: null, guide: 'template', goal: 7 },
  epilogue_frames: { label: 'The closing story', moment: 'Act 7, on the living room screen after the three reveals', why: 'The closing paragraph at the reveal, with blanks for the names. The screen picks one.', group: 'Blanks and frames', tabs: null, guide: 'epilogue_frame', goal: 2,
    fields: [line('The paragraph, with [MURDERER], [VICTIM] and [MOTIVE_RHYME] where the names go', 'e.g. And so it was [MURDERER]. Not for money, not for love, for this: [MOTIVE_RHYME]. And [VICTIM] never saw it coming.')] },

  // retired 22 Oct 2026 (Jon): the trace's top level is the picture and its name, nothing more; lines already written are kept
  trace_lines: { label: 'What was left behind (retired)', moment: 'Retired: the trace now shows just its name at the top level', why: 'The old one-line description under a trace. The screens now show the picture and the trace\'s name only, so nothing reads these. Kept, not used.', group: 'Blanks and frames', tabs: null, guide: null, goal: TRACE_LABELS.length, hidden: true, retired: true,
    codec: labelCodec,
    fields: [
      { key: 'label', label: 'Which trace', placeholder: 'Pick one', kind: 'select', options: TRACE_LABELS },
      { key: 'text', label: 'The line', placeholder: 'e.g. a splash of ink, still wet, beside the writing desk', kind: 'textarea', main: true },
    ] },

  // — The bags —
  bag_items: { label: 'Things in the bags', moment: 'All night, the numbered bags guests carry', why: 'Every item you might put in a bag, with the one sense it stands out to. The game decides the packing without you.', group: 'The bags', tabs: null, guide: 'bag_item', goal: 108,
    codec: bagCodec,
    fields: [
      { key: 'item', label: 'The item', placeholder: 'e.g. Mint tea bag', kind: 'text', main: true },
      { key: 'sense', label: 'Which sense notices it', placeholder: 'Pick one', kind: 'select', options: SENSES },
      { key: 'property', label: 'What that sense notices, one word or two', placeholder: 'e.g. minty', kind: 'text' },
    ] },

  // — Everything else —
  ops_docs: { label: 'Host notes', moment: 'Your own notes for running the night', why: 'Notes to yourselves for the night: the welcome speech, the note to guests, the fix-it sheet.', group: 'Everything else', tabs: null, guide: 'ops_doc', goal: 8, hidden: true,
    codec: labelCodec,
    fields: [
      { key: 'label', label: 'Title, in capitals', placeholder: 'e.g. WELCOME SPEECH', kind: 'text' },
      { key: 'text', label: 'The note', placeholder: 'e.g. Good evening, and welcome to Sirwin Manor.', kind: 'textarea', main: true },
    ] },
  guests: { label: 'Guest list (retired)', moment: 'Retired: guests type their name on their own phone', why: 'The old guest list. Nobody is cast ahead of the night: a guest types their name at the door and is dealt a character.', group: 'Everything else', tabs: null, guide: 'guest', goal: 0, hidden: true, retired: true,
    fields: [line('A name', 'e.g. Jessa')] },
  art_assets: { label: 'Pictures', moment: 'Screens, portraits and the big TV', why: 'A checklist of pictures still to make.', group: 'Everything else', tabs: null, guide: 'art_asset', checklist: true, upload: 'image', hidden: true },
  av_assets: { label: 'Sounds', moment: 'The speakers: chimes, crackle, thunder', why: 'A checklist of sounds still to make.', group: 'Everything else', tabs: null, guide: 'av_asset', checklist: true, upload: 'audio', hidden: true },
}

// How many a tab needs: the list's per-tab goal, unless one tab says otherwise
// (Sir Irwin is always in, so he needs one standing line, not three).
export function goalForTab(spec, t) {
  return spec.goalByTab?.[t] ?? spec.goalPerTab ?? 0
}
export function goalOf(spec) {
  if (!spec.tabs) return spec.goal ?? 0
  return TAB_KINDS[spec.tabs].list.reduce((n, t) => n + goalForTab(spec, t), 0)
}

// Boxes for a list, and the codec that joins them. A list with no fields is
// one plain box.
const PLAIN_FIELDS = [line('The line', '')]
export function fieldsFor(area) {
  const spec = AREAS[area]
  return spec?.fields ?? PLAIN_FIELDS
}
export function codecFor(area) {
  return AREAS[area]?.codec ?? plainCodec
}
export function mainFieldKey(area) {
  const fs = fieldsFor(area)
  return (fs.find(f => f.main) ?? fs.find(f => f.kind === 'textarea') ?? fs[0]).key
}

export const AREA_GROUPS = ['The characters', 'The household', 'Words on the phones', 'Blanks and frames', 'The bags']

// One sentence under each group heading on the home page.
export const GROUP_WHY = {
  'The characters': 'Who the guests become. The game deals these at random on the night.',
  'The household': 'The four cats and Sir Irwin. You write their manners; Claude writes their secrets.',
  'Words on the phones': 'Everything a phone says that no character is speaking, and the questions every phone asks.',
  'Blanks and frames': 'Fill-in-the-blank pieces. On the night the game drops its secret words into these.',
  'The bags': 'The one physical part of the night.',
}

const ART_ASSET_SEED = [
  'Portrait — Sir Irwin', 'Portrait — Salem Crookshank', 'Portrait — Zimothy Clawford',
  'Portrait — Miss Boo LaRue', 'Portrait — Granolia Lickspittle',
  'Sirwin Manor crest / wax seal (splash + mourning card)',
  'Kiosk chrome — cat encounter state', 'Kiosk chrome — echo broadcast state', 'Kiosk chrome — idle state',
  'Reveal screen — Murderer', 'Reveal screen — Motive', 'Reveal screen — Victim',
  'Act title cards ×7 (big screen)', 'Player character avatars (~10)',
  'Calling-card phone layout', 'QR join placard + Wi-Fi sign', 'Victorian menu card (refreshments)',
]

const AV_ASSET_SEED = [
  'Chimes (clock / door)', 'Fireplace crackle', 'Thunder / storm layer', 'Manor room tone',
  'Blackout sting (power-cut)', 'Phone buzz / flash pattern spec',
  'Act stingers ×7', 'Reveal fanfares ×3', 'Echo broadcast bed (static, tuning)',
  'Big-screen ambience loop', 'Playlist — arrival', 'Playlist — investigation acts',
  'Playlist — pre-reveal + celebration',
]

export const GUIDES = seed.guides

// Words that could point at the case, for the question lint: the animals'
// names and the role words. The motive rhymes are public from Act 1 and the
// questions are written blind, so a pie or a toilet seat in a question gives
// nothing away; a cat's name or the word murderer would.
export const CASE_WORDS = [
  'irwin', 'boo', 'larue', 'salem', 'crookshank', 'zimothy', 'clawford', 'granolia', 'lickspittle', 'sirwin',
  'murderer', 'murder', 'ghost', 'victim', 'motive', 'motives', 'detective', 'clue', 'clues', 'suspect', 'alibi',
]

// Live warnings: one plain sentence per line, shown while typing. Mirrors
// the format rules in each list's field guide, in the words of the boxes.
const VOICE_AREAS = ['openers', 'closers', 'smalltalk', 'refusals', 'status_lines']
const CAPS_PREFIX = /^[A-Z][A-Z0-9 '&/]*:\s/

export function lintItem(area, text) {
  if (!text?.trim()) return null
  if (VOICE_AREAS.includes(area)) {
    if (/\b(meow|meows|meowed|purr|purrs|purring|hiss|hisses|woof|barks?|barked)\b/i.test(text)) {
      return 'No animal sounds. They just talk.'
    }
    if (/\[[A-Za-z_]+\]/.test(text)) return 'Cat lines never have square-bracket blanks like [ROOM]. Those belong in the Blanks lists.'
    if (/talking (cat|dog|animal)|(cat|dog|animal)s? (can|could) talk/i.test(text)) {
      return 'Nobody ever remarks that the animals talk.'
    }
    if (area === 'status_lines' && !/^(LOCKED|WARMING|IN):\s/.test(text)) {
      return 'Pick a standing (locked, warming or in) in the first box.'
    }
    return null
  }
  switch (area) {
    case 'pools':
      if (/\.\s*$/.test(text)) return 'A blank is a phrase, not a sentence. Drop the full stop.'
      if (/^[A-Z]/.test(text)) return 'Start lowercase. The cat’s sentence carries the capital (names inside are fine).'
      return null
    case 'echo_frames': {
      const n = (text.match(/█+/g) ?? []).length
      if (n !== 1) return 'A news frame needs words in both boxes, so there is exactly one gap for the secret part.'
      if (!/^(\.\.\.|…)/.test(text) || /(\.\.\.|…)$/.test(text) === false) {
        return 'Start and end with three dots: the room tunes in mid-sentence and loses the signal after.'
      }
      return null
    }
    case 'epilogue_frames': {
      const missing = ['[MURDERER]', '[VICTIM]', '[MOTIVE_RHYME]'].filter(t => !text.includes(t))
      return missing.length ? `Still missing ${missing.join(' and ')}. The game fills those in.` : null
    }
    case 'achievements':
      return /^[^:\n]+:\s*\S/.test(text) ? null : 'Give it a title in the first box and a line in the second.'
    case 'ui_copy':
    case 'role_cards':
      if (!CAPS_PREFIX.test(text)) return 'Pick which screen or card this is in the first box.'
      if (/^(NUMBERS|NOTICE SCRAP):/.test(text) && !(text.includes('[A]') && text.includes('[B]') && text.includes('[C]'))) return 'Keep [A], [B] and [C] in the line: the safe’s numbers go there.'
      if (/^STOPS:/.test(text) && text.replace(/^STOPS:\s*/, '').split(',').filter(w => w.trim()).length !== 5) return 'Five words, low to high, with commas between them.'
      return null
    case 'study_lines':
      return CAPS_PREFIX.test(text) ? null : 'Pick which moment this is in the first box.'
    case 'station_text':
      return CAPS_PREFIX.test(text) ? null : 'Pick which station this is in the first box.'
    case 'trace_lines':
      if (!CAPS_PREFIX.test(text)) return 'Pick which trace this is in the first box.'
      return CHARACTERS.some(c => text.toLowerCase().includes(c.name.toLowerCase().split(' ').pop())) ? 'Never a name. The screen says what was left, not whose it is.' : null
    case 'ops_docs':
    case 'lore':
      return CAPS_PREFIX.test(text) ? null : 'Give it a title in capitals in the first box, like THE FAMILY.'
    case 'act_scripts':
      return /^(BANNER|OBJECTIVE|BEATS):\s/.test(text) ? null : 'Pick objective in the first box.'
    case 'event_cards':
      return null
    case 'rules_text':
      return /—/.test(text) ? null : 'Give the section a heading in the first box.'
    case 'bag_items': {
      if (!/—\s*(sight|sound|smell|touch|taste)\s*:\s*\S/i.test(text)) return 'Pick the sense and say what it notices, like smell: minty.'
      const m = /—\s*[a-z]+\s*:\s*([^;]+);/i.exec(text)
      if (m) return `Two things noticed on one line. The clue on the night uses the first one (${m[1].trim()}); the packer counts both.`
      return null
    }
    case 'filler': {
      if (!/\sButton:\s*\S/.test(text)) return 'Every old filler message ended with a button. This list is retired; write questions instead.'
      return null
    }
    case 'bios':
      return /—/.test(text) ? null : 'Give the character a name and what they do.'
    default:
      return null
  }
}

let counter = 0
function newId() {
  counter += 1
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`
}

function checklistItems(names) {
  return names.map((text, i) => ({ id: newId(), text, done: false, deleted: false, order: i }))
}

export function assetDocs() {
  return {
    art_assets: { items: checklistItems(ART_ASSET_SEED) },
    av_assets: { items: checklistItems(AV_ASSET_SEED) },
  }
}

// Transform seed/safe-content.json into the safe_content/{area} docs.
export function seedDocs() {
  const docs = {}
  for (const area of ['openers', 'closers']) {
    const items = []
    for (const cat of Object.keys(seed[area])) {
      seed[area][cat].forEach((text, i) =>
        items.push({ id: newId(), cat, text, deleted: false, order: i }))
    }
    docs[area] = { items }
  }
  {
    const items = []
    for (const pool of Object.keys(seed.pools)) {
      seed.pools[pool].forEach((text, i) =>
        items.push({ id: newId(), pool, text, deleted: false, order: i }))
    }
    docs.pools = { items }
  }
  docs.echo_frames = {
    items: seed.echo_frames.map((text, i) => ({ id: newId(), text, deleted: false, order: i })),
  }
  docs.templates = {
    items: seed.templates.map((t, i) =>
      ({ id: t.id, text: `${t.name} — ${t.brief}`, deleted: false, order: i })),
  }
  docs.scenarios = { items: [] }
  return { ...docs, ...assetDocs() }
}

export function seedTasks() {
  return import('../../../seed/tasks.json')
}

// Additive migrations for databases seeded before these areas/cards existed.
// Applied once each (guarded by meta/migrations); only ever ADDS, never rewrites.
export const ADDITIONS = [
  {
    id: '2026-08-29-content-inventory',
    areaDocs: assetDocs(),
    tasks: [
      { order: 13, status: 'todo', title: 'Profession → affection seeding grid', detail: 'Every cat × every profession: a starting affection number. Honor canon affinities (Salem–Farmer, Boo–Influencer/Medium, Granolia–learners, Zimothy–status). By construction some players must start locked out of Boo (<4) and Zimothy, and everyone must reach at least one reliable source. Blocked by: character roster, irwinAffection + salemSgtMajor decisions.' },
      { order: 14, status: 'todo', title: 'Guest roster + device audit', detail: 'Confirmed guests, ages, per-guest phone check (QR-capable? on Wi-Fi?). Flag who needs the charged loaner, pre-joined.' },
      { order: 15, status: 'todo', title: 'Cast guests to characters', detail: 'Who plays whom. Casting shapes cat access via profession, and the 11-year-old and 70-year-old need roles they can inhabit.' },
      { order: 16, status: 'todo', title: 'Design 4 content-agnostic document puzzles', detail: 'Build backlog, not workshop content: four puzzle mechanisms that gate the sealed document overlay. Must work identically for any payload so Jon stays blind. Instruction copy → UI copy area; cat input specs → Host & ops docs.' },
      { order: 17, status: 'todo', title: 'Post-party unseal + archive flow', detail: 'The morning-after ritual: a function that opens the manifest + sealed set to Jon once a post-party flag flips, archives what actually ran, and a keep-or-purge call on the sealed data.' },
    ],
    decisions: [
      { key: 'clueChannels', question: 'How do players deduce WHO? Motive clues are impersonal by design, but Act 4 (victim) and Act 6 (murderer) need evidence pointing at people.', options: ['Alibi/whereabouts pools with [CHARACTER] slots', 'Cat sightings layer', 'Blackout absence logic', 'Design session with Claude'] },
      { key: 'affectionEconomy', question: 'Can affection change mid-game, and how do players raise it? (A player dealt Boo below 4 currently has no path to her testimony.)', options: ['Static — profession-seeded only', 'Raisable via kiosk interactions', 'Design session with Claude'] },
      { key: 'acts35', question: 'What do players actually DO in Acts 3 and 5, the together interludes? (Currently: nothing is defined.)', options: ['Echo broadcasts + compare-notes rounds', 'Structured mini-activities', 'Design session with Claude'] },
      { key: 'eventDeck', question: 'Event decks: do Murderer and Ghost share one menu or hold separate decks, and what produces Act 6’s merged event?', options: ['Shared menu + merge table', 'Per-role decks + joint Act 6 pick', 'Design session with Claude'] },
      { key: 'act4Pairing', question: 'How do Act 4 pairs form?', options: ['App-assigned at random', 'Self-chosen', 'Seeded by profession/affection'] },
      { key: 'irwinAffection', question: 'Does Sir Irwin participate in the affection system?', options: ['Loves everyone — always max', 'His own gradient'] },
      { key: 'buzzFallback', question: 'iPhones can’t vibrate from the browser. What is the Act 1 blackout signal fallback?', options: ['Screen-flash pattern on ALL phones (uniform, no tells)', 'Room audio sting masks it', 'Mixed per device'] },
      { key: 'hostOps', question: 'Who fires Stream Deck cues while Jon is dispersed playing his own game?', options: ['Timer-driven automation', 'Co-host non-player on the deck', 'Jon fires from phone, in character'] },
      { key: 'scoring', question: 'Winner determination and prizes when zero or several players name all three?', options: ['All-three-or-nothing + gag superlatives', 'Points with partial credit', 'Design session with Claude'] },
    ],
  },
  {
    // 25 Sep: the Start Here build order, the motive-swap question, and the
    // gaps the Canon page lists as "safe — Jon writes it".
    id: '2026-09-25-build-order',
    tasks: [
      { order: 18, status: 'todo', title: 'Throwaway slice: one character onto a phone via QR', detail: 'Build order step 3 (Sep 29). Proves the whole chain: scan a QR code and a character appears on your phone. Thrown away afterwards.' },
      { order: 19, status: 'todo', title: 'Seed-based case generator + validator', detail: 'Build order step 4 (Oct 2). Type one seed word, get a whole case: murderer, victim, motive, where every clue goes. It also checks that every player can still reach two of the three answers even if the hidden roles hide as much as the rules allow.' },
      { order: 20, status: 'todo', title: 'Eight fake test players', detail: 'Build order step 5 (Oct 5). A script that plays as eight people, not eight friends. It plays a throwaway case that is binned afterwards — never kept, never shown to you.' },
      { order: 21, status: 'todo', title: 'Split dev and live', detail: 'Build order step 6 (Oct 7). So a broken afternoon can’t break the party.' },
      { order: 22, status: 'todo', title: 'Content sprint: cat deflection lines to 8 per cat', detail: 'Safe content, best drive-time task. What each cat says when the affection roll fails: in character, funny, zero information. Editor: Cat voices → Cat deflection lines.' },
      { order: 23, status: 'todo', title: 'Innocent-beat content for Acts 2, 4 and 6', detail: 'Safe — Jon writes it. Read-time parity: each innocent beat matches the event choice prompt in length and needs one required interaction before it can be dismissed. Editor: Player screens → Event cards.' },
      { order: 24, status: 'todo', title: 'Workshop: visible history view', detail: 'Every change you make in the workshop is kept, but there is no screen to browse that history yet. The Canon page says there must be one.' },
    ],
    decisions: [
      { key: 'swapMotive', question: 'Which of the 19 motives gets swapped, and for what?', options: ['Keep all 19', 'Swap one — tell Claude which'] },
    ],
  },
  {
    // 28 Sep: Jon and Susan supply the bag items; the packing is decided blind
    // and shown only to Jenna, the Steward.
    id: '2026-09-28-bags',
    areaDocs: { bag_items: { items: [] } },
    tasks: [
      { order: 25, status: 'todo', title: 'Bag items: Jon and Susan list the pool', detail: 'Workshop → Bags → Bag items. One line per item: Item — sense: property. Every property needs at least two items.' },
      { order: 26, status: 'todo', title: 'Blind bag packer', detail: 'Claude builds a tool that decides which items go in which numbered bag, without Jon or Susan ever seeing it, and saves the packing where only Jenna can see it. It checks every bag has at least two clueable properties and every property is in two or three bags, never one.' },
      { order: 27, status: 'todo', title: 'Jenna’s Steward view', detail: 'A page only Jenna can open: the packing list for the bags, and later the secret content to read and edit. Needs Jon’s approval to change the security rules.' },
    ],
  },
  {
    // 28 Sep: filler messages — the innocent screens during event windows.
    id: '2026-09-28-filler',
    areaDocs: { filler: { items: [] } },
  },
  {
    // 8 Oct: the play side. The guest list feeds the phones' "Who are you?"
    // screen; the Game night page in the workshop runs the night.
    id: '2026-10-08-play-side',
    areaDocs: { guests: { items: [] } },
    tasks: [
      { order: 28, status: 'todo', title: 'Guest list', detail: 'Workshop → Show night → Guest list. One line per guest, just the name. Mark the two of you “— host: Jonathan” and “— host: Susan” so you always get the Professors.' },
      { order: 29, status: 'todo', title: 'Put the play side live, then scan it', detail: 'Run the deploy command from docs/play-side.md once. Then open the play link on your phone, tap “Host? Start the night”, tap your name, and try the Host tab.' },
    ],
  },
  {
    // 12 Oct: Jon wrote the fourteen bios. They go into the characters list
    // as lines (name, profession, persona), skipping any name already
    // written there.
    id: '2026-10-12-bios-from-jon',
    appendItems: {
      bios: charactersFile.characters.map(c => characterCodec.join({ name: c.name, profession: c.profession, persona: c.bio, costume: '' })),
    },
  },
  {
    // 12 Oct: the Parlour Games replace the filler messages. Every
    // phone gets the same kind of question in Acts 2, 4 and 6.
    id: '2026-10-12-questions',
    areaDocs: { scenarios: { items: [] } },
    tasks: [
      { order: 30, status: 'todo', title: 'Write the Parlour Games', detail: 'Workshop → Words on the phones → Parlour Games. Three silly questions in a row, two choices each, a number on each choice. Seventeen of them is a full bank.' },
    ],
  },
  {
    // 18 Oct: Jon's 108 bag items (docs/bag-items-for-claude-code.md) go into
    // the bag items list, skipping any item already written there.
    id: '2026-10-18-bag-items',
    appendItems: { bag_items: bagItemsFile.items },
  },
  {
    // 18 Oct: the lists the game reads that the workshop could not edit, and
    // the board tidied: tasks the night has since answered are marked done,
    // decisions the canon has settled are answered.
    id: '2026-10-18-missing-lists',
    areaDocs: { study_lines: { items: [] }, station_text: { items: [] }, trace_lines: { items: [] } },
    retireTasks: [
      { order: 14, detail: 'Retired 18 Oct 2026: a guest types their name on their own phone and is dealt a character; a dead phone is replaced by typing the same name on any other.' },
      { order: 15, detail: 'Retired 18 Oct 2026: characters are dealt at random on the night and never cast ahead.' },
      { order: 23, detail: 'Retired 18 Oct 2026: the Parlour Games do this on every phone at once.' },
      { order: 26, detail: 'Built 18 Oct 2026: scripts/pack-bags.mjs, counts only.' },
      { order: 28, detail: 'Retired 18 Oct 2026: there is no guest list; the two hosts’ names are on the Game night page.' },
    ],
    answerDecisions: {
      irwinAffection: 'Loves everyone — always max',
      affectionEconomy: 'Moves through the Parlour Games, nothing else (12 Oct 2026)',
      act4Pairing: 'App-assigned at random',
      hostOps: 'Jon fires from phone, in character',
      buzzFallback: 'Screen-flash pattern on ALL phones (uniform, no tells)',
    },
  },
  {
    // 21 Oct: the seventeen Parlour Games from docs/parlour-games.md go into
    // the list, skipping any set whose first question is already there.
    id: '2026-10-21-parlour-bank',
    appendScenarios: { scenarios: parlourFile.sets.map(s => s.beats) },
    retireTasks: [
      { order: 30, detail: 'Filled 21 Oct 2026: the seventeen sets from docs/parlour-games.md are in the list. Change any words or points there.' },
    ],
  },
  {
    // 22 Oct: the board filed under the night. Every new card carries the
    // moment it belongs to on the Timeline page (lib/timeline.js); the
    // old cards it replaces are marked done with the reason.
    id: '2026-10-22-night-timeline',
    tasks: TIMELINE_TASKS,
    decisions: TIMELINE_DECISIONS,
    retireTasks: RETIRED_FOR_TIMELINE,
  },
  {
    // 22 Oct: the brain needs a file for every sound before it starts, so
    // the stand-in tones get their own card before the freeze.
    id: '2026-10-22-standin-sounds',
    tasks: STANDIN_SOUND_TASKS,
  },
]

// The bag item pool as the seed holds it, for the packer's tests and the
// Steward's packing list.
export const BAG_ITEM_SEED = bagItemsFile.items
