import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { voiceBuffer, hasVoice, sayVoices, stopVoice, resetVoices, armVoice, takeArmedVoice, ARM_MS } from '../src/lib/voicekit.js'
import { petVoiceUrl, irwinSpeech, SPEECH_LEAD_MS, SPEECH_FRESH_MS, CATS_SPEAK_BY_THEMSELVES } from '../src/lib/petvoice.js'

// The pets' voices on the page (12 Nov 2026, Jon: "Can we get voices reading
// for the pets"). The files are made ahead (scripts/pet-voices.mjs; the list
// and the names are tested in scripts/test/pet-voices.test.mjs). Here: the
// page plays them through its one sound, never throws, never waits on a
// sound, and a voice can never cost a clue.

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')

// a stand-in for the page's sound: it only remembers what was started
function fakeCtx(state = 'running') {
  const started = [], gains = []
  return {
    state, currentTime: 10, destination: {}, started, gains,
    decodeAudioData(data, ok, bad) { if (data?.broken) bad(new Error('not a sound')); else ok({ duration: data.seconds }) },
    createGain() { const g = { gain: { value: 1 }, connect() {}, disconnect() { g.off = true } }; gains.push(g); return g },
    createBufferSource() { const s = { buffer: null, connect() {}, start(at) { started.push({ at: +at.toFixed(3), seconds: s.buffer.duration, src: s }) }, stop() { s.stopped = true }, onended: null }; return s },
  }
}
// a stand-in for the site: a file is there with its length, or it is not
const site = files => async url => {
  const f = files[url]
  if (f === undefined) return { ok: false, headers: { get: () => 'text/plain' } }
  if (f === 'page') return { ok: true, headers: { get: () => 'text/html; charset=utf-8' }, arrayBuffer: async () => ({}) }
  if (f === 'broken') return { ok: true, headers: { get: () => 'audio/mp4' }, arrayBuffer: async () => ({ broken: true }) }
  return { ok: true, headers: { get: () => 'audio/mp4' }, arrayBuffer: async () => ({ seconds: f }) }
}

test('a voice file: fetched and decoded once; a missing one, the site\'s own page or a broken file is no voice', async () => {
  resetVoices()
  const ctx = fakeCtx()
  let fetched = 0
  const fetchImpl = async url => { fetched++; return site({ '/v/a.m4a': 2, '/v/page.m4a': 'page', '/v/bad.m4a': 'broken' })(url) }
  assert.equal((await voiceBuffer('/v/a.m4a', { ctx, fetchImpl })).duration, 2)
  await voiceBuffer('/v/a.m4a', { ctx, fetchImpl })
  assert.equal(fetched, 1, 'once')
  assert.equal(await voiceBuffer('/v/none.m4a', { ctx, fetchImpl }), null)
  assert.equal(await voiceBuffer('/v/page.m4a', { ctx, fetchImpl }), null, 'the site answers a missing file with its own page: not a sound')
  assert.equal(await voiceBuffer('/v/bad.m4a', { ctx, fetchImpl }), null)
  assert.equal(await voiceBuffer(null, { ctx, fetchImpl }), null)
  assert.equal(await voiceBuffer('/v/a.m4a', { ctx: null, fetchImpl }), null, 'a browser with no sound')
  assert.equal(await hasVoice(['/v/none.m4a', '/v/a.m4a'], { ctx, fetchImpl }), true, 'any line with a voice is enough for the button')
  assert.equal(await hasVoice(['/v/none.m4a'], { ctx, fetchImpl }), false)
  assert.equal(await hasVoice([], { ctx, fetchImpl }), false)
})

test('saying a card: the lines one after another, a gap between, lines with no voice skipped', async () => {
  resetVoices()
  const ctx = fakeCtx()
  const fetchImpl = site({ '/v/hint.m4a': 4, '/v/bag.m4a': 3 })
  const seconds = await sayVoices(['/v/hint.m4a', '/v/none.m4a', '/v/bag.m4a'], { ctx, fetchImpl, gapMs: 350 })
  assert.deepEqual(ctx.started.map(s => [s.at, s.seconds]), [[10.06, 4], [14.41, 3]], 'back to back, 0.35 s apart')
  assert.ok(Math.abs(seconds - 7.41) < 0.01, 'and it says how long it will take')
  // a second card cuts in: the first stops
  await sayVoices(['/v/bag.m4a'], { ctx, fetchImpl })
  assert.ok(ctx.started[0].src.stopped && ctx.started[1].src.stopped, 'the voice that was talking is stopped')
  assert.equal(ctx.started.length, 3)
  stopVoice()
  assert.ok(ctx.started[2].src.stopped)
  stopVoice() // twice is nothing
})

test('a card stops only its own voice, and a file that is not a sound is asked for once', async () => {
  resetVoices()
  const ctx = fakeCtx()
  let fetched = 0
  const files = site({ '/v/a.mp3': 2, '/v/b.mp3': 3, '/v/bad.mp3': 'broken' })
  const fetchImpl = async url => { fetched++; return files(url) }
  const cardA = {}, cardB = {}
  await sayVoices(['/v/a.mp3'], { ctx, fetchImpl, owner: cardA })
  await sayVoices(['/v/b.mp3'], { ctx, fetchImpl, owner: cardB }) // B cuts in: A's voice stops
  assert.ok(ctx.started[0].src.stopped, 'a new voice cuts in')
  stopVoice(cardA) // card A leaves the screen while B is talking
  assert.ok(!ctx.started[1].src.stopped, 'a card that leaves never stops another card\'s voice')
  stopVoice(cardB)
  assert.ok(ctx.started[1].src.stopped, 'its own, it stops')
  await sayVoices(['/v/a.mp3'], { ctx, fetchImpl, owner: cardA })
  stopVoice() // no owner: whoever is talking (Sir Irwin's card going from the TV)
  assert.ok(ctx.started[2].src.stopped)
  // a file that will not decode: no voice, and it is not fetched again and again
  fetched = 0
  assert.equal(await voiceBuffer('/v/bad.mp3', { ctx, fetchImpl }), null)
  assert.equal(await voiceBuffer('/v/bad.mp3', { ctx, fetchImpl }), null)
  assert.equal(fetched, 1, 'asked for once')
  // a dropped connection is not remembered: the next card that wants the line asks again
  let drops = 0
  const dropping = async () => { drops++; throw new Error('offline') }
  assert.equal(await voiceBuffer('/v/gone.mp3', { ctx, fetchImpl: dropping }), null)
  assert.equal(await voiceBuffer('/v/gone.mp3', { ctx, fetchImpl: dropping }), null)
  assert.equal(drops, 2, 'asked for again')
})

test('nothing is said, and nothing throws, when there is no voice or the page\'s sound is asleep', async () => {
  resetVoices()
  const fetchImpl = site({ '/v/a.m4a': 2 })
  const asleep = fakeCtx('suspended')
  assert.equal(await sayVoices(['/v/a.m4a'], { ctx: asleep, fetchImpl }), 0, 'a page nobody has tapped stays quiet')
  assert.equal(asleep.started.length, 0)
  const ctx = fakeCtx()
  assert.equal(await sayVoices(['/v/none.m4a'], { ctx, fetchImpl }), 0)
  assert.equal(await sayVoices([], { ctx, fetchImpl }), 0)
  assert.equal(await sayVoices(null, { ctx, fetchImpl }), 0)
  assert.equal(await sayVoices(['/v/a.m4a'], { ctx: null, fetchImpl }), 0)
  const throws = { ...fakeCtx(), createGain() { throw new Error('no sound here') } }
  resetVoices()
  assert.equal(await sayVoices(['/v/a.m4a'], { ctx: throws, fetchImpl }), 0, 'a sound that breaks is a sound that stays silent')
})

test('on the page: a cat speaks when its Hear button is pressed, never by surprise, and a voice can never cost a clue', () => {
  const cards = read('../src/screens/Cards.jsx')
  const voice = read('../src/screens/PetVoice.jsx')
  const kiosk = read('../src/screens/Kiosk.jsx')
  // a cat speaks at a press. Speaking by itself at its door is built and switched off (12 Nov 2026: Act 2 is
  // for the guest's ears only, and a phone that talks by itself is heard by the next guest in line)
  assert.equal(CATS_SPEAK_BY_THEMSELVES, false, 'the cats wait for the button')
  // and if it is ever switched on: at the cat's door only, never a note left at supper, never in the Clues list
  assert.ok(cards.includes('<HearIt who={card.cat} lines={[...lines, card.hint?.text, card.bag?.text].filter(Boolean)} cardId={card.id} auto={CATS_SPEAK_BY_THEMSELVES && !compact && !card.note} />'), 'the cat card')
  // a room's cat on its bag hint, which a whole group gets at once: a press only
  assert.ok(cards.includes('{card.cat && card.bag?.text && <HearIt who={card.cat} lines={[card.bag.text]} cardId={card.id} />}'), 'the room\'s card, never by itself')
  assert.equal((cards.match(/<HearIt /g) ?? []).length, 2, 'and nowhere else on a phone')
  // it speaks by itself once a card, and only when its sound is awake; a press wakes the sound
  assert.ok(voice.includes('if (auto && !alreadySaid(cardId) && takeArmedVoice(who)) sayVoices(urls, { owner: me.current }).then(seconds => { if (seconds > 0) markSaid(cardId) })'), 'once, only on the phone that has just scanned this cat, and only counted when it really spoke')
  // a card stops only a voice it started itself (lib/voicekit.js stopVoice with an owner)
  assert.ok(voice.includes('return () => { live = false; stopVoice(me.current) }'), 'a card that leaves the screen stops its own voice, no one else\'s')
  // the scan, and "Cannot scan? I am with ...", are what arm it; nothing else does
  const finder = read('../src/screens/Viewfinder.jsx')
  assert.ok(finder.indexOf('armVoice(target.cat)') > 0 && finder.indexOf('armVoice(target.cat)') < finder.indexOf('callMeet({ nightId, cat: target.cat })'), 'the scan arms the cat\'s voice before it tells the house')
  assert.ok(cards.includes('const meetByHand = () => { armVoice(lights.cat); return call(callMeet, { cat: lights.cat }) }'), 'and so does Cannot scan? I am with ...')
  assert.equal((cards.match(/meetByHand/g) ?? []).length, 3, 'both Cannot scan? buttons go through it')
  for (const f of ['../src/App.jsx', '../src/screens/Act4.jsx', '../src/screens/Rest.jsx']) assert.ok(!read(f).includes('armVoice'), `${f} never arms a voice`)
  assert.ok(voice.includes('onClick={() => { markSaid(cardId); sayVoices(urls, { wake: true, owner: me.current }) }}'), 'a press wakes the page\'s sound, and the voice is marked as this card\'s')
  assert.ok(voice.includes('if (!found) return null'), 'a card with no voice has no button')
  // whatever breaks in a voice, the card around it stands
  assert.ok(voice.includes('static getDerivedStateFromError() { return { broken: true } }') && voice.includes('render() { return this.state.broken ? null : this.props.children }'), 'the boundary shows nothing when a voice breaks')
  assert.ok(voice.includes('return <Quiet><HearItInner {...props} /></Quiet>') && voice.includes('return <Quiet><IrwinSpeechInner {...props} /></Quiet>'), 'both voices sit inside it')
  // Sir Irwin's dessert speech: on the Parlour TV's card only, once, fresh, after the chime
  assert.ok(kiosk.includes("{screen?.kind === 'irwin' && serverNow && <IrwinSpeech screen={screen} serverNow={serverNow} />}"), 'on Sir Irwin\'s card')
  assert.ok(kiosk.includes("if (view === 'card') return <ScreenCard screen={screen} serverNow={serverNow} />"), 'the Parlour TV hands it the server\'s clock')
  assert.equal((kiosk.match(/<IrwinSpeech /g) ?? []).length, 1, 'one place only')
  assert.ok(voice.includes('if (!speechFresh(at, now)) return undefined'), 'a TV reloaded later stays quiet')
  assert.ok(SPEECH_LEAD_MS >= 1500 && SPEECH_LEAD_MS <= 4000 && SPEECH_FRESH_MS > SPEECH_LEAD_MS, 'after the chime, within the fresh window')
  // the files are asked for under the site's own base, by the words on the card
  assert.equal(petVoiceUrl('irwin', irwinSpeech({ lines: ['Hello.'] })[0], '/play/'), petVoiceUrl('irwin', 'Hello.', '/play/'))
  assert.ok(voice.includes('const BASE = import.meta.env.BASE_URL'))
  // and nothing here keeps or sends anything about a guest: the only memory is which card this tab has said
  assert.ok(!/fetch\(|callHost|firebase/.test(voice), 'the voice parts call nothing but the voice kit')
})

test('if the cats are ever switched to speak by themselves: only on the phone that has just come to that cat\'s door', () => {
  resetVoices()
  // nothing armed: a card the house sent a guest who never left the Parlour, a note at supper, a reload
  assert.equal(takeArmedVoice('boo', 1000), false)
  // the scan of Boo's code arms Boo's voice on this phone, once, for a short while
  armVoice('boo', 1000)
  assert.equal(takeArmedVoice('salem', 2000), false, 'not another cat\'s card')
  assert.equal(takeArmedVoice('boo', 2000), true, 'the card that arrives takes it')
  assert.equal(takeArmedVoice('boo', 2100), false, 'once only')
  armVoice('boo', 1000)
  assert.equal(takeArmedVoice('boo', 1000 + ARM_MS + 1), false, 'a card that arrives much later waits for the button')
  armVoice('boo', 1000)
  armVoice('zimothy', 1500)
  assert.equal(takeArmedVoice('boo', 1600), false, 'the newest scan is the one that counts')
  assert.equal(takeArmedVoice('zimothy', 1600), true)
  assert.ok(ARM_MS >= 15_000 && ARM_MS <= 60_000, 'long enough for the card to come, short enough to mean this visit')
  armVoice(null)
  assert.equal(takeArmedVoice(null, 0), false)
})
