import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea, subscribeTasks, subscribeDecisions, whoAmI } from '../lib/store'
import { AREAS } from '../lib/content'
import { OWNERS, leftByOwner, leftLine, nextCards, byLabel, momentName, openDecisions, decisionsForJon, firstSentence, listStatus, LEFT_OUT_LISTS } from '../lib/timeline'
import { Decision } from '../components/DecisionsPanel'

// Where we are (rebuilt 23 Oct 2026; 24 Oct 2026, plain for a non-coder):
// the live hub of the project. Decisions live on the Canon page; jobs live
// on the Timeline, one card each, with an owner, a moment and sometimes a
// "by" date. This page counts the open cards by owner, shows Jon's next
// three, lists every open decision, and links to the documents. Then what
// is built, kept apart from what has been tried for real, the few lists
// the night leaves out while they are empty, and what waits for after the
// party. Nothing here is sealed.

// The Claude Docs and pages everyone works from (links, no content).
const LINKS = [
  ['The Canon', 'every settled decision', 'https://claude.ai/artifact/CU4JQVHtzuyLBiqt2WuWVk'],
  ['Start Here', 'the map for any Claude chat, and the latest status', 'https://claude.ai/artifact/P7eHcmr7R5PDLxGufmCK2A'],
  ['The 23 Oct handoff', 'the newest decisions, applied 24 Oct', 'https://github.com/jonkost/Murderwin/blob/main/docs/handoff-2026-10-23.md'],
  ['The W-O-O-F News script', 'every line to record', 'https://claude.ai/artifact/GJAR2uwXZ356opX6xNvMNN'],
  ['The Cat Hint Lines', 'what each cat says, by how much it likes you', 'https://claude.ai/artifact/Mb39Qkpd4s7jtz59Kdw2vV'],
  ['The Relay Drawing', 'how Sir Irwin Needs a Hand plays', 'https://claude.ai/artifact/HjTxtHxUckbN9qR1xRchgt'],
  ['The rules deck', 'the slides for Act 1', 'https://claude.ai/artifact/QGuBNcSDWkyfFqRg35V7yz'],
  ['The intro script', 'the welcome and the rules, to read or record', 'https://claude.ai/artifact/DQiHjrdudoaKrLkCKjCLRx'],
  ['The Steward Handbook', 'Jenna’s brief', 'https://claude.ai/artifact/XZC51qsxGg6myKa8FSoH2q'],
]

// Built: in the game and on the live site (put live 24 October), tried
// only by the tests and the eight fake phones unless the next list says so.
const BUILT = [
  ['Live', 'On the live site since 24 October. Each later build has to be put live once more; the last time is a card on the Timeline, in the days before the party.'],
  ['The invitation page', 'Live at jonkost.com/Murderwin. The Enter the Manor button opens the game.'],
  ['Guests join by phone', 'Scan the square code, type a name, get a character and a bag number, then one Allow for motion, sound and keeping the screen awake.'],
  ['The phone at rest', 'Character with portrait, bag number, the Reticule: motives to cross off, the cats, the clues, the rules.'],
  ['The Host tab', 'On your phone and Susan’s: doors, the seven acts, Blackout, Power returns, Pause, who is here, Salem petted and Fetch Champion, Supper’s ready, Start Act 4, the light scenes and the music, and a dot for every room screen.'],
  ['The moments', 'Blackout goes dark on every phone and the power comes back on its own five seconds later; one button, then the role card for fifteen seconds; Pause says Irwin needs the garden.'],
  ['The look', 'Blue and red, the seal, the wallpaper, New York and SF, on the invitation, the phones and here.'],
  ['The art', 'Fourteen portraits and fourteen traces, the five household faces and Sir Irwin’s five moods, in the game, named for it.'],
  ['This workshop', 'Every list opens with a card: what it is, which part of the night it feeds, what goes in each box, an example. Speak buttons.'],
  ['The Timeline and this page', 'Every job is a card on the Timeline, filed under its moment, with its owner and, for some, a date. This page counts them by owner.'],
  ['Game test', 'Every game of Acts 4 and 6, and the Parlour Games, to try before the night, with a note to Claude Code from each.'],
  ['The Parlour Games', 'Twelve a night: five in Act 2 on every phone at once, five in Act 4 that wait on each phone, two as Act 6 opens. Boo hosts each one. Three silly questions, two choices each.'],
  ['The whole night on the phone', 'One button, Next, runs every beat of every act: role cards at the blackout, the four cat visits, Supper’s ready, Start Act 4 and its four rooms, the drawing, the deduction round, the ballot, the reveal and each phone’s result.'],
  ['How the case gets solved', 'Bulletin 1 crosses off a wrong family for everyone; in Act 2 all four cats give each guest a motive hint and a clue about the Murderer’s bag; bulletin 2 at supper; in Act 4 each room pays a reward and a clue about the Ghost’s bag; Sir Irwin’s countdown of motive cards at dessert; the study pays the Ghost’s trace; the bedroom door shows the Murderer’s.'],
  ['W-O-O-F News', 'Bulletin 1 and the closing bulletin play as video on the Parlour TV once the videos are in and the box on the Game night page is ticked; until then the brain plays your recordings and the TV shows the words. Bulletin 2 is armed from your phone at supper and plays on all four HomePods, with its words on the Orangerie iPad.'],
  ['Act 4 on the phones', 'A two-minute warning, the groups with portraits and Locked in, then ten-minute rounds: each group visits all four rooms, Granolia’s Lightbulb Moment, In Duplicate, Get Off My Lawn! and Boo’s Catwalk, and waits in the Parlour between them, where Parlour Games wait on the phone.'],
  ['Granolia’s Lightbulb Moment', 'The study station, the two Nanoleaf walls, the Stream Deck, Granolia’s screen. Ten minutes a group.'],
  ['Miss Boo LaRue’s Arcade, for testing', 'Built 28 October, on a page of its own: five little games on the Stream Deck + XL (or on the deck drawn on the screen), and a practice visit with two tokens each, turns, a clue after each player’s second game, Boo’s line for a trio’s third, the winner, free play and the chime. Not on the night yet: you chose it for the Entryway on 29 Oct, for a clue about the Ghost, and it goes on the night with the card The arcade on the night; until then the night still runs Boo’s Catwalk. Try it on Game test.'],
  ['Sir Irwin Needs a Hand', 'His rules slides on the TV, a practice smiley, three rounds, a player called by portrait and character name, the room’s guess tapped on the host’s phone (the Parlour TV’s names as the fallback), then Irwin’s Pawsome! slide and the trace on the bedroom screen. The hall light turns from red to green.'],
  ['The brain', 'Every sound, the three playlists by moment (Murderwin · Jazz, Intense and Credits, dipped under every cue), the six Hue scenes, the hall light by phase, the projector’s plug, Cake! and Salem’s colours on the string lights. Nine sounds, two of them required, each a simple tone until you record yours.'],
  ['The screens for every beat', 'W-O-O-F News, Sir Irwin’s countdown at cake, the board of strikes and the door on the TV; the iPad keeps the words up through supper.'],
  ['The hosts’ lines', 'Boo opens each Parlour Game, Granolia the study, Zimothy the memory match, Salem the final picks, and Sir Irwin speaks over the trace.'],
  ['The end credits', 'The closing bulletin, the dial’s journey, the awards from the final sliders, the joke counters, the room’s split, the thanks and Sydney, then Sir Irwin’s last card.'],
  ['Safety nets', 'A dead phone, a borrowed phone, a late arrival, a pause that stops every clock, the role card readable all night, and a big red REHEARSAL band on every screen on a rehearsal night.'],
  ['Jenna’s page', 'Their own page for the packing list, the cats’ leans and the real checks, opening for their account only; yours is refused by the server.'],
  ['The bags', 'Your 24 items, fourteen clue words, packed on 24 October without anyone seeing it (ten bags, every rule passed), and the cats’ bag clues: a compass, not a pointer. Sir Irwin’s sixteen prompts on the Parlour TV.'],
  ['The checks', 'A thousand made-up cases dealt and checked, and a fake night played. The Health page shows the last run.'],
  ['Rehearsing without the party', 'Eight fake players that play a whole night and throw it away, and the day-of runbook. A pretend copy of the game on your Mac too, once Claude Code installs Java (a card on the Timeline).'],
  ['Spill the Beans and the Hush', 'Your two safeguard buttons on the Host tab, under "If something goes wrong". Spill the Beans changes the story only before the first clue reaches anyone, so in practice in the first minutes of Act 2, and says nothing either way; the Hush stops a found-out player’s answers from counting.'],
]

// Tried for real: on a real phone, screen or light, not only in the tests.
const TRIED = [
  ['8 Oct', 'Joining by square code, on your phone.'],
  ['24 Oct', 'The hall bulb went red and green from the brain, through the Hue bridge.'],
  ['24 Oct', 'Both study walls answered and showed the game’s lights. Two of the ten taps were taught; none was kept.'],
]
// Not tried for real yet. The weekend practice game and the hardware
// evening are the first tries; Game test has a way into each game.
const NOT_TRIED = [
  'A whole night with real people on real phones, and the length of Act 2 and Act 4.',
  'The Parlour TV, the iPad Pro at its four stations (the Library code, the captions, the memory match, the bedroom), Jenna’s iPad Pro as Boo’s camera and Susan’s MacBook Pro on the projector, on their real machines.',
  'The sound on the HomePods (there is no AirPlay group yet), the music and the Hue scenes.',
  'The study taps, the Stream Deck and the M1 Air; the string lights; Boo’s wall on the projector.',
  'Miss Boo LaRue’s Arcade on the real Stream Deck + XL: its keys, dials and touch strip in Google Chrome, and how fast each game feels.',
  'Get Off My Lawn! on real phones, and how touchy the shake feels.',
  'Sir Irwin Needs a Hand in the house, the door and the trace.',
  'The party-night version on the real leans and drawing pictures.',
]
// Not built: on the board, or waiting on a question.
const NOT_BUILT = [
  ['The worst-dial proof', 'A check that every guest can still reach two of the three answers however foggy the dial gets. You asked for it before the second tech run (24 Oct): Claude chat is building it, and Claude Code puts it in.'],
  ['The motive card pictures in the countdown', 'Sir Irwin shows the rhymes until your pictures are in and Claude Code builds the slot (a card on the Timeline).'],
  ['Replay a night by its seed', 'A card on the Timeline for Claude Code.'],
]

// Decided for after the party. Listed so they are not mistaken for gaps.
const AFTER = [
  ['More puzzles', 'Beyond the study light game and the memory match.'],
  ['A recap button and idle art', 'Nice to have. Not for the first birthday.'],
]

// The lists the night leaves out while they are empty: the game has no
// words of its own for them (lib/timeline.js STANDIN_LISTS has the rest).
const LEFT_OUT = LEFT_OUT_LISTS

export default function Status() {
  const [data, setData] = useState({})
  const [tasks, setTasks] = useState(null)
  const [decisions, setDecisions] = useState(null)
  const [saveErr, setSaveErr] = useState(false)
  const [me, setMe] = useState(null)
  useEffect(() => {
    const unsubs = LEFT_OUT.map(area => subscribeArea(area, items => setData(d => ({ ...d, [area]: items })), () => {}))
    unsubs.push(subscribeTasks(setTasks, () => {}))
    unsubs.push(subscribeDecisions(setDecisions, () => {}))
    return () => unsubs.forEach(u => u())
  }, [])
  useEffect(() => { whoAmI().then(setMe) }, [])
  const canAnswer = me?.name === 'Jon' || me?.name === 'Preview'

  const counts = tasks ? leftByOwner(tasks) : null
  const next = tasks ? nextCards(tasks) : []
  const open = decisions ? decisionsForJon(decisions) : []
  const asked = decisions ? openDecisions(decisions).filter(d => !open.includes(d)) : []

  return (
    <main className="dash">
      <section className="panel">
        <h2>Where we are</h2>
        <p className="why">
          The live state of the project. Decisions live on the Canon. Every job is one card on the <Link to="/timeline">Timeline</Link>,
          with who does it and when. Counts here are live.
        </p>
        {saveErr && <div className="banner error" role="alert">SAVE FAILED. That answer was not recorded. Pick and confirm again.</div>}
      </section>

      <section className="panel">
        <h2>What is left, by who</h2>
        <p className="why">{counts ? leftLine(counts) : 'Counting…'} Tap a name to see just their cards.</p>
        {counts && (
          <ul className="hub-owners">
            {OWNERS.map(o => (
              <li key={o}><Link to={o === 'Jon' || o === 'Jon and Susan' ? '/timeline' : `/timeline?who=${encodeURIComponent(o)}`}><span>{o}</span><b>{counts[o]}</b></Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Jon’s next three</h2>
        <p className="why">Jon’s open cards (and the ones for Jon and Susan), soonest first: the ones with a date, then the rest in the order of the night.</p>
        {tasks === null ? <p className="hint">Counting…</p>
          : next.length === 0 ? <p className="hint">Nothing on the board for Jon.</p>
            : (
              <ol className="hub-next">
                {next.map(t => (
                  <li key={t.id}>
                    <b>{t.title || 'A task with no name yet'}</b>
                    {byLabel(t) && <> <span className="tl-by">{byLabel(t)}</span></>}
                    {t.who && t.who !== 'Jon' && <> <span className="tl-who">{t.who}</span></>}
                    {t.moment && momentName(t.moment) && <><br /><span className="list-moment">{momentName(t.moment)}</span></>}
                    {t.detail && <><br /><span className="hint">{firstSentence(t.detail)}</span></>}
                  </li>
                ))}
              </ol>
            )}
        <p className="night-line"><Link className="ghost dl" to="/timeline">All of Jon’s cards on the Timeline</Link></p>
      </section>

      <section className="panel">
        <h2>Decisions waiting on Jon</h2>
        <p className="why">{decisions === null ? 'Counting…' : open.length === 0 ? 'None. Every question on the board has an answer.' : `${open.length} open. Only Jon answers these. Each one sits on the Timeline at the moment it changes, and until it is answered the game runs on its default.`}</p>
        <ul className="hub-decisions">
          {open.map(d => (
            <li key={d.key}>
              {d.moment && momentName(d.moment) && <span className="list-moment">{momentName(d.moment)}</span>}
              <Decision d={d} canAnswer={canAnswer} onError={() => setSaveErr(true)} onSaved={() => setSaveErr(false)} />
            </li>
          ))}
        </ul>
        {asked.length > 0 && <p className="hint">Also open, and asked when the time comes: {asked.map(d => `${d.question} (${d.who})`).join(' ')}</p>}
      </section>

      <section className="panel">
        <h2>Where everything lives</h2>
        <ul className="hub-links">
          {LINKS.map(([t, d, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer"><b>{t}</b></a> <span className="hint">{d}</span></li>)}
          <li><Link to="/timeline"><b>The Timeline</b></Link> <span className="hint">every job, in the order of the night</span></li>
          <li><Link to="/game-test"><b>Game test</b></Link> <span className="hint">try every game before the night</span></li>
          <li><Link to="/night"><b>Game night</b></Link> <span className="hint">the hosts, the party box, Freeze the workshop</span></li>
          <li><Link to="/devices"><b>Every device</b></Link> <span className="hint">room by room, with its address, and the order to switch on</span></li>
          <li><Link to="/health"><b>Health</b></Link> <span className="hint">the last run of the checks: one line per group</span></li>
          <li><Link to="/jenna"><b>For Jenna</b></Link> <span className="hint">Jenna’s jobs, and their page</span></li>
        </ul>
      </section>

      <section className="panel">
        <h2>Tried for real</h2>
        <p className="why">On a real phone, screen or light, not only in the tests. Everything else built has run only on the eight fake phones and in the checks.</p>
        <ul className="audit">
          {TRIED.map(([when, d]) => <li key={d}><b>{when}.</b> {d}</li>)}
        </ul>
        <h3>Not tried for real yet</h3>
        <ul className="audit">
          {NOT_TRIED.map(d => <li key={d}>{d}</li>)}
        </ul>
      </section>

      <section className="panel">
        <h2>Built</h2>
        <ul className="audit">
          {BUILT.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}
        </ul>
        <h3>Not built yet</h3>
        <ul className="audit">
          {NOT_BUILT.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}
        </ul>
      </section>

      <section className="panel">
        <h2>The writing</h2>
        <p className="why">You write nothing more (23 October). Claude chat writes what is left and Claude Code copies it in. Every other list already has the game’s own words. These four the night leaves out while they are empty:</p>
        <ul className="audit">
          {LEFT_OUT.map(area => {
            const s = listStatus({ list: area }, data[area])
            return <li key={area}><Link to={s.to}><b>{AREAS[area].label}</b></Link> <span className="hint">· {s.text}</span></li>
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>After the party</h2>
        <p className="why">Decided, not forgotten. None of these is needed on the night.</p>
        <ul className="audit">
          {AFTER.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}
        </ul>
      </section>
    </main>
  )
}
