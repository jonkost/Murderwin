import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeArea, subscribeTasks, subscribeDecisions, whoAmI } from '../lib/store'
import { AREAS, TAB_KINDS, goalForTab } from '../lib/content'
import { isComplete } from '../lib/scenarios'
import { OWNERS, leftByOwner, leftLine, nextCards, byLabel, momentName, momentIndex } from '../lib/timeline'
import { Decision } from '../components/DecisionsPanel'

// Where we are (rebuilt 23 Oct 2026): the live hub of the project. Decisions
// live on the Canon page; jobs live on the Timeline, one card each, with an
// owner, a moment and sometimes a "by" date. This page counts the open cards
// by owner, shows Jon's next three, lists every open decision, and links to
// the documents. Then what is built, what is still to write, and what waits
// for after the party. Nothing here is sealed.

// The Claude Docs and pages everyone works from (links, no content).
const LINKS = [
  ['The Canon', 'every settled decision', 'https://claude.ai/artifact/CU4JQVHtzuyLBiqt2WuWVk'],
  ['Start Here', 'the map for any Claude chat, and the latest status', 'https://claude.ai/artifact/P7eHcmr7R5PDLxGufmCK2A'],
  ['The 22 Oct handoff', 'the newest decisions, applied', 'https://claude.ai/artifact/ToauNmr1RgPGUfw8WcHGBS'],
  ['The W-O-O-F News script', 'every line to record', 'https://claude.ai/artifact/GJAR2uwXZ356opX6xNvMNN'],
  ['The Cat Hint Lines', 'what each cat says, by how much it likes you', 'https://claude.ai/artifact/Mb39Qkpd4s7jtz59Kdw2vV'],
  ['The Relay Drawing', 'how the Act 6 drawing plays', 'https://claude.ai/artifact/HjTxtHxUckbN9qR1xRchgt'],
  ['The rules deck', 'the slides for Act 1', 'https://claude.ai/artifact/QGuBNcSDWkyfFqRg35V7yz'],
  ['The intro script', 'the welcome and the rules, to read or record', 'https://claude.ai/artifact/DQiHjrdudoaKrLkCKjCLRx'],
]

const BUILT = [
  ['Live', 'Deployed on 23 October. Each later build needs one more deploy; the last one is on the Timeline, in the days before the party.'],
  ['The invitation page', 'Live at jonkost.com/Murderwin. The Enter the Manor button opens the game.'],
  ['Guests join by phone', 'Scan the square code, type a name, get a character and a bag number. Works on a real phone.'],
  ['The phone at rest', 'Character with portrait, bag number, the Reticule: motives to cross off, the cats, the rules.'],
  ['The Host tab', 'On your phone and Susan’s: doors, the seven acts, Blackout, Power returns, Pause, who is here, Salem petted and Fetch Champion, how many guests have seen all four cats, and a dot for every room screen.'],
  ['The moments', 'Blackout goes dark on every phone; Power returns holds a prompt fifteen seconds; Pause says Irwin needs the garden.'],
  ['The look', 'Blue and red, the seal, the wallpaper, New York and SF, on the invitation, the phones and here.'],
  ['The art', 'Fourteen portraits and fourteen traces, the five household faces and Sir Irwin’s five moods, in the repo, named for the game.'],
  ['This workshop', 'Every list opens with a card: what it is, which part of the night it feeds, what goes in each box, an example. One box per thing. Speak buttons.'],
  ['The Timeline and this page', 'Every job is a card on the Timeline, filed under its moment, with its owner and, for some, a date. This page counts them by owner.'],
  ['The Parlour Games', 'Twelve a night, on their own at random times: five in Act 2, five in Act 4, two as Act 6 opens. Boo hosts each one. Three silly questions, two choices each, the same set on every phone.'],
  ['The whole night on the phone', 'One button, Next, runs every beat of every act: role cards at the blackout, the four cat visits, Supper’s ready, Start Act 4 and its four rooms, the drawing, the deduction round, the ballot, the reveal and each phone’s result.'],
  ['How the case gets solved', 'Bulletin 1 crosses off a wrong family for everyone; in Act 2 all four cats give each guest a motive hint and a clue about the Murderer’s bag; bulletin 2 at supper; in Act 4 each room pays a reward and a clue about the Ghost’s bag; Sir Irwin’s countdown of motive cards at dessert; the study pays the Ghost’s trace; the bedroom door shows the Murderer’s.'],
  ['W-O-O-F News', 'Bulletin 1 in Act 2, bulletin 2 armed from your phone at supper and played on the Orangerie HomePod, and the closing bulletin at the reveal, each name card shown after its lead-in line. Your recordings play as sound with the words on screen.'],
  ['Act 4 on the phones', 'A two-minute warning, the groups with portraits and Locked in, then ten-minute rounds: each group visits all four rooms, Granolia’s Lightbulb Moment, In Duplicate, Get Off My Lawn! and Boo’s Catwalk, and waits in the Parlour between them, where Parlour Games wait on the phone.'],
  ['The study light game', 'Granolia’s Lightbulb Moment: the station on the M1 Air, the Nanoleaf walls, the Stream Deck, Granolia’s screen. Ten minutes a group.'],
  ['The Relay Drawing', 'Sir Irwin Needs a Hand: his rules slides on the TV, a practice smiley, three rounds, a player called by portrait and character name, the room’s guess on the Parlour screen, then Irwin’s Pawsome! slide on the TV and the trace on the bedroom screen. Hall light red to green through the cue relay.'],
  ['The screens for every beat', 'W-O-O-F News, Sir Irwin’s countdown at cake, the board of strikes and the door on the TV; the iPad keeps the words up through supper; a sound for every cue, with stand-in tones until you record yours.'],
  ['The hosts’ lines', 'Boo opens each Parlour Game, Granolia the study, Zimothy the memory match, Salem the final picks, and Sir Irwin speaks over the trace.'],
  ['The end credits', 'The closing bulletin, the dial’s journey, the awards from the final sliders, the joke counters, the room’s split, the thanks and Sydney, then Sir Irwin’s last card.'],
  ['Safety nets', 'A dead phone, a borrowed phone, a late arrival, a pause that stops every clock, the role card readable all night, and a big red REHEARSAL band on every screen on a rehearsal night.'],
  ['Jenna’s page', 'Their own page for the packing list, the cats’ leans and the real checks, opening for their account only; yours is refused by the server.'],
  ['The bags', 'Your 24 items, fourteen clue words, a packer that never shows you the packing, and the cats’ bag clues: a compass, not a pointer. Sir Irwin’s sixteen prompts on the Parlour TV.'],
  ['The checks', 'npm run checks deals 1,000 stand-in cases and plays a fake night. The Health page shows the last run: one line per group.'],
  ['Rehearsing without the party', 'Eight fake players that play a whole night and throw it away, one test command for everything, deploys that refuse an empty site, and the day-of runbook. A pretend Firebase on your Mac too, once Java is installed (a card on the Timeline).'],
  ['Spill the Beans and the Hush', 'Your two safeguard buttons on the Host tab, under "If something goes wrong". Spill works through Act 5 and the Manor decides silently; the Hush stops a found-out player’s answers from counting.'],
]

// Decided for after the party. Listed so they are not mistaken for gaps.
const AFTER = [
  ['The ten-thousand-run solvability proof', 'The validator assuming the worst dial.'],
  ['More puzzles', 'Beyond the study light game and the memory match.'],
  ['A recap button and idle art', 'Nice to have. Not for the first birthday.'],
]

function suggestion(area, spec, items) {
  const live = items.filter(i => !i.deleted)
  if (spec.checklist) return null
  if (spec.tabs) {
    const def = TAB_KINDS[spec.tabs]
    const short = def.list.map(t => ({ t, n: live.filter(i => i[def.field] === t).length, need: goalForTab(spec, t) })).filter(x => x.n < x.need).sort((a, b) => (a.n - a.need) - (b.n - b.need))
    if (!short.length) return { done: true }
    const first = short[0]
    return { done: false, text: `Thinnest: ${def.label(first.t)} has ${first.n} of ${first.need}. ${short.length} of ${def.list.length} still short.`, to: `/edit/${area}?tab=${first.t}&focus=3` }
  }
  const goal = spec.goal ?? 0
  const n = spec.editor === 'questions' ? live.filter(i => isComplete(i.beats)).length : live.length
  if (n >= goal) return { done: true }
  return { done: false, text: `${n} of ${goal}. ${goal - n} to go.`, to: `/edit/${area}?focus=3` }
}

const firstSentence = (text) => {
  const t = String(text ?? '').trim()
  const m = /^(.+?[.!?])(\s|$)/.exec(t)
  return m ? m[1] : t
}

export default function Status() {
  const [data, setData] = useState({})
  const [tasks, setTasks] = useState(null)
  const [decisions, setDecisions] = useState(null)
  const [saveErr, setSaveErr] = useState(false)
  const [me, setMe] = useState(null)
  useEffect(() => {
    const unsubs = Object.keys(AREAS).map(area => subscribeArea(area, items => setData(d => ({ ...d, [area]: items })), () => {}))
    unsubs.push(subscribeTasks(setTasks, () => {}))
    unsubs.push(subscribeDecisions(setDecisions, () => {}))
    return () => unsubs.forEach(u => u())
  }, [])
  useEffect(() => { whoAmI().then(setMe) }, [])
  const canAnswer = me?.name === 'Jon' || me?.name === 'Preview'

  const rows = Object.entries(AREAS).filter(([, spec]) => !spec.checklist && !spec.retired).map(([area, spec]) => ({ area, spec, s: suggestion(area, spec, data[area] ?? []) }))
  const todo = rows.filter(r => r.s && !r.s.done)
  const done = rows.filter(r => r.s?.done)

  const counts = tasks ? leftByOwner(tasks) : null
  const next = tasks ? nextCards(tasks) : []
  const open = (decisions ?? []).filter(d => d.answer == null)
    .sort((a, b) => momentIndex(a.moment) - momentIndex(b.moment) || String(a.key).localeCompare(String(b.key)))

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
              <li key={o}><Link to={`/timeline?who=${encodeURIComponent(o)}`}><span>{o}</span><b>{counts[o]}</b></Link></li>
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
                    <br /><span className="list-moment">{t.moment ? momentName(t.moment) ?? 'Not filed yet' : 'Not filed yet'}</span>
                    {t.detail && <><br /><span className="hint">{firstSentence(t.detail)}</span></>}
                  </li>
                ))}
              </ol>
            )}
        <p className="night-line"><Link className="ghost dl" to="/timeline?who=Jon">All of Jon’s cards on the Timeline</Link></p>
      </section>

      <section className="panel">
        <h2>Decisions waiting on Jon</h2>
        <p className="why">{decisions === null ? 'Counting…' : open.length === 0 ? 'None. Every question on the board has an answer.' : `${open.length} open. Only Jon answers these. Each one sits on the Timeline at the moment it changes.`}</p>
        <ul className="hub-decisions">
          {open.map(d => (
            <li key={d.key}>
              <span className="list-moment">{d.moment ? momentName(d.moment) ?? 'Not filed yet' : 'Not filed yet'}</span>
              <Decision d={d} canAnswer={canAnswer} onError={() => setSaveErr(true)} onSaved={() => setSaveErr(false)} />
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Where everything lives</h2>
        <ul className="hub-links">
          {LINKS.map(([t, d, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer"><b>{t}</b></a> <span className="hint">{d}</span></li>)}
          <li><Link to="/timeline"><b>The Timeline</b></Link> <span className="hint">every job, in the order of the night</span></li>
          <li><Link to="/night"><b>Game night</b></Link> <span className="hint">start a night, the hosts, the freeze</span></li>
          <li><Link to="/devices"><b>Every device</b></Link> <span className="hint">room by room, with its address</span></li>
          <li><Link to="/health"><b>Health</b></Link> <span className="hint">the last run of the checks: one line per group</span></li>
          <li><Link to="/jenna"><b>For Jenna</b></Link> <span className="hint">what Jenna reads, and her page</span></li>
        </ul>
      </section>

      <section className="panel">
        <h2>Works today</h2>
        <ul className="audit">
          {BUILT.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}
        </ul>
      </section>

      <section className="panel">
        <h2>Writing still needed</h2>
        <p className="why">Each line links straight into the list with a three-line goal. The suggestion is simply the thinnest spot.</p>
        {todo.length === 0 && <p className="hint">Every list has reached its goal.</p>}
        <ul className="audit">
          {todo.map(r => (
            <li key={r.area}><Link to={r.s.to}><b>{r.spec.label}</b></Link> <span className="list-moment">{r.spec.moment}</span><br />{r.s.text}</li>
          ))}
        </ul>
        {done.length > 0 && <p className="hint">At goal: {done.map(r => r.spec.label).join(', ')}.</p>}
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
