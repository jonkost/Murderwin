import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import {
  loopFor, loopUrl, LOOP_OF, roomCode, ROOM_CODE_CATS, codeWords, meetUrl, CAT_NAMES, CAT_ROOMS,
  CAT_PICTURES, variant, catPicture, catPictureUrl, ROOM_GAME, RULES_LINES, rulesLine, GAME_NAMES,
} from '../src/lib/rooms.js'
import { MACHINES } from '../src/lib/house.js'
import { HOST_LINES } from '../../functions/lib/hosts.js'
import { ROOMS as ACT4_ROOMS } from '../../functions/lib/act4.js'
import { MEET_CATS } from '../src/lib/night.js'

// The cue list's screens (25 Oct 2026, docs/cue-list.md and DESIGN section 6):
// the loop slot on every idle screen, the room codes of Act 2, the Act 4
// rules cards with the cats' pictures, the join code, the birthday card and
// The End. Pure rules here; the source checks keep the JSX honest. Nothing
// here is a night: throwaway shapes only.

const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the loop slot: one file per screen in play/public/loops, the iPad borrows the Library\'s, Boo\'s camera has none', () => {
  assert.deepEqual(LOOP_OF, { living: 'living', study: 'study', memory: 'memory', ipad: 'memory', boo: 'boo', bedroom: 'bedroom', orangerie: 'orangerie' })
  assert.equal(loopFor('ipad'), 'memory', 'the iPad Pro stands in the Library in Act 2')
  assert.equal(loopFor('pose'), null, 'the camera is a mirror')
  assert.equal(loopFor('nonsense'), null)
  assert.equal(loopUrl('living', '/play/'), '/play/loops/living.mp4')
  assert.equal(loopUrl('ipad', '/play/'), '/play/loops/memory.mp4')
  assert.equal(loopUrl('pose', '/play/'), null)
  // the README lists the five files Jon makes, by their exact names, and says the Orangerie's is optional
  const readme = src('../public/loops/README.md')
  for (const f of ['living.mp4', 'study.mp4', 'memory.mp4', 'bedroom.mp4', 'boo.mp4']) assert.ok(readme.includes(`\`${f}\``), `README names ${f}`)
  assert.ok(readme.includes('`orangerie.mp4`') && readme.includes('optional'), 'the sixth is optional')
  assert.ok(!readme.includes('—'), 'no em dash in a doc Jon reads')
  // the loop files stay local, like the sounds (media/*): .gitignore keeps them out of the repo and the README in,
  // so Jon dropping the five files in never turns the tests red or sweeps 30 MB videos into a commit (26 Oct 2026)
  const ignore = src('../../.gitignore')
  assert.ok(ignore.includes('play/public/loops/*') && ignore.includes('!play/public/loops/README.md'), 'the loops are ignored and the README is kept')
  assert.ok(readme.includes('never committed') || readme.includes('stay local'), 'the README tells Jon the files stay local')
  // the slot itself: Idle plays the file muted and looping, the crest until it loads or when it fails
  const rooms = src('../src/screens/Rooms.jsx')
  assert.ok(rooms.includes('export function Idle({ title, line, loop = null })'), 'Idle takes a loop')
  assert.ok(rooms.includes('export function Loop({ which, children = null'), 'the Loop slot')
  assert.ok(rooms.includes('autoPlay muted loop playsInline'), 'silent, looping, inline')
  assert.ok(rooms.includes("onLoadedData={loaded} onError={() => setFailed(true)}"), 'the file says whether it is there')
  // the first frame also asks the video to play, in case the browser declined autoplay while it was transparent
  assert.ok(rooms.includes('e.currentTarget.play?.()'), 'play() on the first frame')
  const css = src('../src/styles.css')
  assert.ok(css.includes('.kiosk-loop {') && css.includes('opacity: 0;') && !/\.kiosk-loop \{[^}]*display: none/.test(css), 'the loop is transparent until ready, never display none (Safari autoplays only what is on screen)')
  assert.ok(!rooms.includes('fetch(') && !rooms.includes("method: 'HEAD'"), 'never a request to find out')
  // every kiosk's idle branch names its loop
  const kiosk = src('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("loop={loopFor(which)}"), 'the no-night crest plays the kiosk\'s loop')
  assert.ok(kiosk.includes("loop={captionsOnly ? 'memory' : 'living'}"), 'the TV and the iPad')
  assert.ok(kiosk.includes('<Loop which="bedroom" className="behind" />'), 'the bedroom\'s loop behind the closed door')
  assert.ok(kiosk.includes('loop="study"'), 'the study')
  assert.ok(rooms.includes('loop="memory"') && rooms.includes('loop="boo"') && rooms.includes('loop="orangerie"'), 'the Library, Boo\'s wall and the Orangerie')
  assert.ok(!kiosk.includes('—') && !rooms.includes('—'), 'no em dash on a room screen')
})

test('the room codes of Act 2 (cue 7): each room screen shows its cat\'s code during the cat visits, and only then', () => {
  assert.deepEqual(ROOM_CODE_CATS, { study: 'granolia', memory: 'zimothy', ipad: 'zimothy', boo: 'boo', orangerie: 'salem' })
  for (const cat of Object.values(ROOM_CODE_CATS)) assert.ok(MEET_CATS.includes(cat), `${cat} is a cat a phone may meet`)
  // the kiosk -> cat map agrees with the server's room -> cat map (functions/lib/act4.js ROOMS)
  assert.equal(ROOM_CODE_CATS.study, ACT4_ROOMS.study.cat)
  assert.equal(ROOM_CODE_CATS.memory, ACT4_ROOMS.library.cat)
  assert.equal(ROOM_CODE_CATS.boo, ACT4_ROOMS.entryway.cat)
  assert.equal(ROOM_CODE_CATS.orangerie, ACT4_ROOMS.orangerie.cat)
  const cat = { act: 2, beat: 'cat', phase: 'act' }
  assert.equal(roomCode('study', cat), 'granolia')
  assert.equal(roomCode('ipad', cat), 'zimothy')
  assert.equal(roomCode('orangerie', cat), 'salem')
  assert.equal(roomCode('living', cat), null, 'the Parlour TV shows Sir Irwin\'s prompts, never a code')
  assert.equal(roomCode('pose', cat), null)
  assert.equal(roomCode('study', { act: 2, beat: 'peek' }), null, 'not before the visits')
  assert.equal(roomCode('study', { act: 2, beat: 'supper' }), null, 'not after')
  assert.equal(roomCode('study', { act: 4, beat: 'round1' }), null, 'Act 4 has the rules card instead')
  assert.equal(roomCode('ipad', { act: 2, beat: 'cat', phase: 'paused' }), null, 'a pause hides the code: the iPad shows One moment, like the TV (26 Oct 2026)')
  assert.equal(roomCode('study', null), null)
  // the address is the one the Game night page prints (app/src/pages/Night.jsx meetUrl)
  assert.equal(meetUrl('granolia', 'https://murderwin-at-sirwin-manor.web.app/play/'), 'https://murderwin-at-sirwin-manor.web.app/play/?meet=granolia')
  assert.equal(meetUrl('boo', 'http://x/play/?a=1'), 'http://x/play/?a=1&meet=boo')
  // the words beside the square, in the contract's shape
  assert.equal(codeWords('granolia'), 'Granolia Lickspittle, in the Study. Scan when your phone calls you.')
  assert.equal(codeWords('zimothy'), 'Zimothy Clawford, Esq., in the Library. Scan when your phone calls you.')
  assert.equal(codeWords('salem'), 'Salem Crooknog, in the Orangerie. Scan when your phone calls you.')
  assert.equal(codeWords('boo'), 'Miss Boo LaRue, in the Entryway. Scan when your phone calls you.')
  for (const c of MEET_CATS) { assert.ok(CAT_NAMES[c], `${c} has a name`); assert.ok(CAT_ROOMS[c], `${c} has a room`) }
  // the kiosk shows the code before any room branch, and the new Orangerie kiosk comes before the Parlour TV fallback
  const kiosk = src('../src/screens/Kiosk.jsx')
  const at = (t) => { const i = kiosk.indexOf(t); assert.ok(i >= 0, t); return i }
  assert.ok(at("else if (code) body = <RoomCode cat={code} />") < at("else if (which === 'bedroom')"), 'the code before the rooms')
  assert.ok(at("else if (which === 'orangerie') body = <Orangerie") < at("else body = <Living"), 'the Orangerie before the Parlour fallback')
  assert.ok(kiosk.includes("const code = roomCode(which, n)"), 'chosen by the pure rule')
})

test('the cats\' full pictures: Jon\'s file names kept and encoded, the leading-space one included, varied by a key and stable', () => {
  assert.deepEqual(Object.keys(CAT_PICTURES).sort(), ['boo', 'granolia', 'irwin', 'salem', 'zimothy'])
  assert.equal(CAT_PICTURES.boo[4], ' Boo 5.png', 'the file with the leading space is used, by its real name')
  for (const [cat, files] of Object.entries(CAT_PICTURES)) {
    for (const f of files) assert.ok(existsSync(new URL(`../public/household/full/${f}`, import.meta.url)), `${cat}: ${f} exists`)
  }
  assert.equal(catPictureUrl('boo', 'k', '/play/').startsWith('/play/household/full/'), true)
  assert.ok(catPictureUrl('granolia', 'g1', '/play/').includes('Granola%20'), 'spaces are encoded')
  const booUrls = CAT_PICTURES.boo.map((_, i) => catPictureUrl('boo', `k${i}`, '/play/'))
  assert.ok(CAT_PICTURES.boo.map(f => `/play/household/full/${encodeURIComponent(f)}`).includes('/play/household/full/%20Boo%205.png'))
  assert.ok(booUrls.every(u => u.startsWith('/play/household/full/')))
  // the same key always picks the same picture; different keys spread across the set
  assert.equal(catPicture('salem', 'g1'), catPicture('salem', 'g1'))
  assert.equal(variant('x', 1), 0)
  assert.equal(variant(null, 4) >= 0 && variant(null, 4) < 4, true)
  assert.equal(variant('anything', 0), 0, 'an empty set picks nothing')
  const picks = new Set(['round1', 'round2', 'round3', 'round4', 'round5'].map(k => catPicture('zimothy', k)))
  assert.ok(picks.size >= 3, `the rounds spread over at least three of Zimothy's pictures (${picks.size})`)
  assert.equal(catPicture('nobody', 'x'), null)
  assert.equal(catPictureUrl('nobody', 'x', '/play/'), null)
})

test('the Act 4 rules cards: each room\'s game, its host\'s line the same as the server\'s, the cat\'s picture and the room\'s code', () => {
  assert.deepEqual(ROOM_GAME, { study: 'study', memory: 'library', boo: 'entryway', orangerie: 'orangerie' })
  for (const id of Object.values(ROOM_GAME)) assert.ok(GAME_NAMES[id]?.name && GAME_NAMES[id]?.hook && GAME_NAMES[id]?.host, `${id} has a name, a hook and a host`)
  assert.deepEqual(Object.keys(RULES_LINES).sort(), ['entryway', 'library', 'orangerie', 'study'])
  // the Study's and the Library's lines are the server's open defaults (functions/lib/hosts.js), copied, not read
  assert.equal(RULES_LINES.study, HOST_LINES.granolia)
  assert.equal(RULES_LINES.library, HOST_LINES.zimothy)
  // a host line Jon changed in the workshop reaches the Study's and the Library's cards, as it reaches the phones
  // (functions/lib/hosts.js hostLine: the ui_copy line HOST GRANOLIA or HOST ZIMOTHY); nobody else's card changes (26 Oct 2026)
  assert.equal(rulesLine('study', null), HOST_LINES.granolia, 'no content: the default')
  assert.equal(rulesLine('library', { ui_copy: [{ text: 'HOST ZIMOTHY: Files. Everywhere. Fix it.' }] }), 'Files. Everywhere. Fix it.')
  assert.equal(rulesLine('study', { ui_copy: [{ text: 'HOST ZIMOTHY: Files.' }] }), HOST_LINES.granolia, 'another host\'s line changes nothing')
  assert.equal(rulesLine('orangerie', { ui_copy: [{ text: 'HOST SALEM: the Act 7 line' }] }), RULES_LINES.orangerie, 'Salem\'s HOST line is his Act 7 one, never his Get Off My Lawn! intro')
  assert.equal(rulesLine('entryway', { ui_copy: [{ text: 'HOST BOO 1: judging' }] }), RULES_LINES.entryway, 'Boo\'s six HOST lines are her Parlour Games verdicts')
  assert.equal(rulesLine('nothing'), null)
  // the rooms' cards carry Salem's and Boo's full lines; the phones carry the rule alone (Jon, 28 Oct 2026: fewer words), the same rule
  const act4 = src('../src/screens/Act4.jsx')
  assert.ok(act4.includes("intro: 'RED: shake. GREEN: freeze. Yes, backwards.'") && /RED means GO.*GREEN means FREEZE/.test(RULES_LINES.orangerie), 'Salem\'s phone rule agrees with his card')
  assert.ok(act4.includes("intro: 'Watch the wall. When the music stops, strike a pose.'") && /When the music stops, strike a pose/.test(RULES_LINES.entryway), 'Boo\'s phone rule agrees with her card')
  const rooms = src('../src/screens/Rooms.jsx')
  assert.ok(rooms.includes('export const BOO_INTRO = RULES_LINES.entryway'), 'the wall reads the same line')
  for (const line of Object.values(RULES_LINES)) assert.ok(!line.includes('—'), 'no em dash')
  // the card: the game's name (GameName), the picture varied by pick, the line, the code
  assert.ok(rooms.includes('export function RulesCard({ id, line, pick = null, code = true, frame = null'), 'the card')
  assert.ok(rooms.includes('<GameName id={id} />') && rooms.includes('catPictureUrl(cat, pick, BASE)') && rooms.includes('words="Scan the code to begin."'), 'name, picture, code')
  // where each room shows it: the Library between groups, Boo\'s wall idle and intro, the Orangerie all through Act 4, the Study while idle
  assert.ok(rooms.includes('<RulesCard id="library" line={rulesLine(\'library\', content)} pick={night.beat}>'), 'the Library, with the workshop\'s line first')
  assert.ok(rooms.includes('<RulesCard id="entryway" line={BOO_INTRO} pick={boo?.groupId ?? night?.beat'), 'Boo\'s wall, idle')
  assert.ok(rooms.includes('<RulesCard id="entryway" line={BOO_INTRO} frame="Boo 1.png" code={false}'), 'Boo\'s wall, her intro, no code to scan')
  // her three steps, on the card between groups and in her intro (27 Oct 2026)
  assert.equal((rooms.match(/<BooSteps \/>/g) ?? []).length, 2, 'the three steps on both')
  assert.ok(rooms.includes('<RulesCard id="orangerie" line={RULES_LINES.orangerie} pick={salem?.groupId ?? night.beat} code={!busy}>'), 'the Orangerie, its code only between groups')
  // a group is at play in the Orangerie while public/salem is intro, playing or passed; idle and cleared are between groups (26 Oct 2026)
  assert.ok(rooms.includes("const busy = ['intro', 'playing', 'passed'].includes(salem?.state)"), 'cleared is not busy')
  const kiosk = src('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes('<RulesCard id="study" line={rulesLine(\'study\', content)} pick={s.groupId ?? night.beat} className="papered">'), 'the Study, with the workshop\'s line first')
  // the study's card keeps Granolia's own start line and the station's silence, so docs/study-light-game.md stays true (26 Oct 2026)
  assert.ok(kiosk.includes('<p className="kiosk-line">{SAY.idle}</p>'), 'Touch any panel to begin, on the card')
  assert.ok(kiosk.indexOf('const stale = s.updatedAt') < kiosk.indexOf('<RulesCard id="study"'), 'the station\'s silence is known before the card')
  assert.equal((kiosk.match(/The station has gone quiet\. Find a host\./g) ?? []).length, 2, 'said on the card and on the game')
  // in practice (no night) the card has no code to scan: there is no night to join; Boo's intro has none either, the group has scanned
  assert.ok(rooms.includes('code={!!night}'), 'no code in practice')
  assert.ok(rooms.includes('<RulesCard id="entryway" line={BOO_INTRO} frame="Boo 1.png" code={false}'), 'no code on Boo\'s intro')
})

test('the join code on the TV, the rejoin code under the ballot clock, the birthday cards, the Orangerie kiosk and the host\'s two new dots', () => {
  const kiosk = src('../src/screens/Kiosk.jsx')
  const rooms = src('../src/screens/Rooms.jsx')
  // the join view draws the play address itself: the screen doc carries words only
  assert.ok(kiosk.includes("if (view === 'join') return <JoinScreen screen={screen} />"), 'the join view')
  assert.ok(rooms.includes('const qr = useQr(PLAY_URL, 720)') && rooms.includes('export function JoinScreen'), 'a big square of PLAY_URL')
  assert.ok(rooms.includes('export function RejoinCode()') && rooms.includes('words="Need to rejoin? Scan here."'), 'the rejoin code')
  assert.ok(kiosk.includes('{!captionsOnly && <RejoinCode />}'), 'under the ballot clock, on the TV only')
  // the shared hook lives in lib/qr.js; the Host tab still has its name
  const qr = src('../src/lib/qr.js')
  assert.ok(qr.includes('export function useQr(text, width = 360)'))
  const host = src('../src/screens/Host.jsx')
  assert.ok(host.includes("import { useQr } from '../lib/qr'") && host.includes('export { useQr }') && !host.includes("import QRCode from 'qrcode'"), 'Host.jsx shares the hook')
  // the birthday card: on the TV from the Cake! button's screen doc, on the phone from the roam notice's image
  assert.ok(kiosk.includes("if (view === 'birthday') return <BirthdayScreen screen={screen} />"), 'the TV')
  assert.ok(rooms.includes("catPictureUrl('irwin', ms(screen?.at) || 'cake', BASE)"), 'Irwin\'s picture, varied by the press')
  const cards = src('../src/screens/Cards.jsx')
  assert.ok(cards.includes("{card.image === 'birthday' && <Birthday seed={card.id} />}"), 'the phone draws the image the notice carries')
  assert.ok(cards.includes('Happy Birthday, Sir Irwin!'), 'the greeting')
  // the server writes that image on the roam notice
  const deal = src('../../functions/lib/deal.js')
  assert.ok(/NOTICE_IMAGES\s*=\s*\{[^}]*roam:\s*'birthday'/.test(deal), 'deal.js puts image birthday on the roam notice')
  // the Orangerie kiosk: its loop, Salem\'s code in Act 2 (above), the rules card in Act 4
  assert.ok(rooms.includes('export function Orangerie({ night, salem = null })'), 'the Orangerie')
  assert.ok(kiosk.includes("which === 'orangerie' ? `nights/${nightId}/public/salem` : null"), 'it reads Salem\'s public doc for the group due')
  const main = src('../src/main.jsx')
  assert.ok(main.includes('orangerie'), 'main.jsx names the kiosk')
  // the brain's browser shows the bell but never chimes: the brain's sound output is the HomePods, where the real sound already plays (26 Oct 2026)
  assert.ok(kiosk.includes("<Bell sounds={sounds.data} serverNow={serverNow} silent={which === 'orangerie'} />"), 'the Orangerie kiosk is silent')
  assert.ok(kiosk.includes('if (!first && !silent && soundFresh(sounds, serverNow())) chime(\'start\')'), 'silent skips the chime, the bell still shows')
  // the Host tab's dots: the Orangerie screen and Boo\'s camera
  const keys = MACHINES.map(m => m.key)
  assert.ok(keys.includes('kiosk-orangerie') && keys.includes('kiosk-pose'), 'both rows')
  assert.ok(keys.indexOf('kiosk-orangerie') < keys.indexOf('cues') && keys.indexOf('kiosk-pose') < keys.indexOf('cues'), 'before the brain\'s row')
  // the docs name the new kiosk and the codes on the screens
  const screensDoc = src('../../docs/room-screens.md')
  assert.ok(screensDoc.includes('`?kiosk=orangerie`'), 'room-screens.md has the Orangerie kiosk')
  for (const k of ['kiosk-join', 'kiosk-code-study', 'kiosk-rules-orangerie', 'kiosk-birthday', 'kiosk-end']) assert.ok(screensDoc.includes(k), `room-screens.md lists ${k}`)
  const night = src('../../docs/on-the-night.md')
  assert.ok(night.includes('?kiosk=orangerie'), 'on-the-night.md has the Orangerie kiosk')
})
