// The task board, filed under the night (22 Oct 2026). Every card carries a
// `moment`: the key of the place on the Timeline page where it belongs
// (lib/timeline.js). Added once by the ADDITIONS entry
// '2026-10-22-night-timeline' in content.js, which also retires the old
// cards these replace. Safe content only: nothing here says who did what.

const sound = (order, moment, id, when) => ({
  order, moment, status: 'todo', who: 'Jon',
  title: `Sound: ${id}`,
  detail: `Plays when ${when}. Two to five seconds, with one second of silence first. Name the file ${id} and put it in media/ on the brain. A stand-in tone plays until you do.`,
})

export const TIMELINE_TASKS = [
  // Before the freeze, by Saturday 7 November
  { order: 100, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Put the game live', detail: 'In Terminal: npm run deploy. Nothing that has been built reaches the phones until you do. If it asks to turn on Cloud Scheduler, say yes.' },
  { order: 101, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Bring in the 21 October build', detail: 'The "how the case gets solved" build (the Act 2 cat rooms, the memory match, the study paying the Ghost’s trace) is waiting in a side copy and is not committed yet. Ask Claude to merge it.' },
  { order: 102, moment: 'freeze', status: 'todo', who: 'Jon and Susan', title: 'A rehearsal on your phones', detail: 'Open the game, tap "Host? Start the night", type your name, and press Next through every act with Susan’s phone and a spare joined. Every night is a rehearsal unless the party box is ticked.' },
  { order: 103, moment: 'freeze', status: 'todo', who: 'Jon', title: 'The hardware evening', detail: 'The Nanoleaf wall, the Stream Deck and the Hue bulb plugged in. node scripts/hardware-check.mjs prints PASS or FAIL. One run of the study and one grid of the drawing.' },
  { order: 104, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Press Freeze', detail: 'Saturday 7 November, on the Game night page. Every list goes read-only. After this, anything not working is cut, not fixed.' },

  // The week before
  { order: 110, moment: 'week', status: 'todo', who: 'Jon', title: 'Make the secrets', detail: 'In Terminal: npm --prefix scripts run generate, then npm --prefix scripts run validate. Read only the PASS line. The secrets rows on this page turn green.' },
  { order: 111, moment: 'week', status: 'todo', who: 'Jon', title: 'Make the cats’ leans', detail: 'In Terminal: npm --prefix scripts run leans. It prints counts only. Which way each cat leans in the Parlour Games is written blind.' },
  { order: 112, moment: 'week', status: 'todo', who: 'Jon', title: 'Make the packing list', detail: 'In Terminal: node scripts/pack-bags.mjs. It prints counts only; the list goes to Jenna’s page.' },
  { order: 113, moment: 'week', status: 'todo', who: 'Jenna', title: 'Jenna reads every secret and says done', detail: 'She reads every set on her page and tells you "done" or "needs more", never what is in them.' },
  { order: 114, moment: 'week', status: 'todo', who: 'Jenna', title: 'The bags packed to Jenna’s list', detail: 'Six things in each numbered bag, exactly as her page says.' },
  { order: 115, moment: 'week', status: 'todo', who: 'Jon', title: 'A dry run with eight fake players', detail: 'In Terminal: npm run fake-night. One line per act, a tally, PASS. Nothing it prints is a clue.' },
  { order: 116, moment: 'week', status: 'todo', who: 'Jon', title: 'Both hosts’ names on the Game night page', detail: 'So you and Susan always get the Professors.' },

  // Sunday 15 November, setting up
  { order: 120, moment: 'setup', status: 'todo', who: 'Jon', title: 'Router, Hue bulb and both Nanoleaf controllers on', detail: 'First of all. Give them five minutes.' },
  { order: 121, moment: 'setup', status: 'todo', who: 'Jon', title: 'Start the brain', detail: 'On the M3 Air, ethernet in, sleep off: cd cues && npm start. It refuses to start while a sound file is missing and says which.' },
  { order: 122, moment: 'setup', status: 'todo', who: 'Jon', title: 'Start the study', detail: 'On the Host tab, under The study, save a key word. Put the same word in station/.env on the M1 Air, quit the Elgato app, then cd station && npm start.' },
  { order: 123, moment: 'setup', status: 'todo', who: 'Jon', title: 'Open the screens', detail: 'Living room TV ?kiosk=living, bedroom ?kiosk=bedroom with the door closed, the iPad ?kiosk=ipad. Tap each once to wake it, then leave it alone.' },
  { order: 124, moment: 'setup', status: 'todo', who: 'Jon', title: 'The four cat-room codes up', detail: 'One square code in each cat’s room: Granolia in the Study, Salem in the Orangerie, Zimothy in the Library, Boo in the Entryway. No cat in the living room.' },
  { order: 125, moment: 'setup', status: 'todo', who: 'Jon and Susan', title: 'Set the orangery table', detail: 'Before guests arrive, so Salem can stay in the Orangerie through Act 2.' },
  { order: 126, moment: 'setup', status: 'todo', who: 'Jon and Susan', title: 'Charge everything', detail: 'Spare phone chargers in the orangery for dinner.' },
  { order: 127, moment: 'setup', status: 'todo', who: 'Jon', title: 'Tick "This is the party night"', detail: 'On the Game night page, before you start the night. Untick it afterwards.' },

  // Act 1
  { order: 130, moment: 'act1.arrive', status: 'todo', who: 'Jon', title: 'The square code up at the door', detail: 'Save it from the Game night page. Guests scan it, type a name, and get a character and a bag number.' },
  { order: 131, moment: 'act1.arrive', status: 'todo', who: 'Jon and Susan', title: 'The numbered bags at the door', detail: 'Handed out at sign-in. A guest may look in their own; the others stay closed unless the holder is asked.' },
  { order: 132, moment: 'act1.arrive', status: 'todo', who: 'Jon', title: 'The welcome speech', detail: 'Out loud, near the start: the rules, and what a Murderer and a Ghost each do, so nobody has to ask later and give themselves away. Notes for yourself can go in Host notes.' },
  { order: 133, moment: 'act1.meet', status: 'todo', who: 'Jon and Susan', title: 'The household photos', detail: 'Faces, full, intro cards and in-play pictures of the four cats and Sir Irwin. The folders are ready.' },
  sound(134, 'act1.ready', 'blackout', 'every phone goes dark at the end of Act 1'),

  // Act 2
  sound(140, 'act2.orient', 'power', 'the power returns and Act 2 begins'),
  sound(141, 'act2.news', 'chime-news', 'the news flash comes up on the living room screen'),
  { order: 142, moment: 'act2.news', status: 'todo', who: 'Claude', title: 'The news voiceover, written blind', detail: 'Rules out one or two motive families for everyone. Stand-in words today; the generator writes the real ones and Jenna checks them.' },
  { order: 143, moment: 'act2.cat', status: 'todo', who: 'Claude', title: 'Each cat’s private hint, written blind', detail: 'The one hint a cat greets a guest with, ruling out another motive family. Stand-in words today; the generator writes the real ones and Jenna checks them.' },
  { order: 144, moment: 'act2.puzzle', status: 'todo', who: 'Jon', title: 'The seven stationery pictures', detail: 'The blank papers the documents are printed on. Upload them on the Stationery page. Stand-ins work until then.' },

  // Act 3
  { order: 150, moment: 'act3.down', status: 'todo', who: 'Jon and Susan', title: 'Dinner on the table in the orangery', detail: 'Phones down and charging while everyone eats.' },
  { order: 151, moment: 'act3.down', status: 'todo', who: 'Jon', title: 'Music for the radio', detail: 'Atmosphere only: no sound in the game ever carries information.' },
  sound(152, 'act3.bulletin', 'sounder-bulletin', 'the bulletin comes up during dinner'),

  // Act 4
  sound(160, 'act4.study', 'sting-solved', 'a group solves the study'),
  { order: 161, moment: 'act4.puzzle', status: 'todo', who: 'Jon', title: 'Pick where the memory match iPad sits', detail: 'Somewhere a group can sit together while another group is in the study.' },

  // Act 5
  { order: 170, moment: 'act5.roam', status: 'todo', who: 'Jon and Susan', title: 'The cake, with one candle', detail: 'Sir Irwin’s first birthday.' },
  sound(171, 'act5.irwin', 'chime-irwin', 'Sir Irwin is about to speak on the living room screen'),

  // Act 6
  { order: 180, moment: 'act6.drawing', status: 'todo', who: 'Jon', title: 'The paper roll and the markers', detail: 'Measure the roll: the cell size and the paper width are still open in the drawing game.' },
  sound(181, 'act6.door', 'sting-door', 'the third drawing is named and the bedroom door opens'),
  { order: 182, moment: 'act6.eliminate', status: 'todo', who: 'Jon and Claude', title: 'Design how a trace is matched to a person', detail: 'Not designed yet (21 Oct). How players link a trace to a character in the Big Solve. A short session with Claude.' },

  // Act 7
  sound(190, 'act7.reveal', 'sting-reveal', 'the reveal begins on the living room screen'),
  sound(191, 'act7.result', 'sting-result', 'every phone shows its own result'),

  // After the party
  { order: 195, moment: 'after', status: 'todo', who: 'Jon', title: 'Untick "This is the party night"', detail: 'On the Game night page, so the next night you start is a rehearsal again.' },
  { order: 196, moment: 'after', status: 'todo', who: 'Claude', title: 'The morning after: open the case to you', detail: 'Built after the party: once a post-party switch is flipped, the case that ran opens to you, it is archived, and you decide whether to keep or clear the secrets.' },
]

// Decisions still open, each filed under the moment it changes. Only Jon
// answers them.
export const TIMELINE_DECISIONS = [
  { key: 'newsFamilies', moment: 'act2.news', question: 'How many motive families does the Act 2 news rule out for everyone?', options: ['One', 'Two'], answer: null },
  { key: 'ipadDinner', moment: 'act3.down', question: 'The iPad through dinner: the captions screen in the orangery, or the spare phone only?', options: ['Captions in the orangery', 'Spare phone only'], answer: null },
  { key: 'bagsAct4', moment: 'act4.bags', question: 'Do the bags stay as an Act 4 station?', options: ['Keep the bags station', 'Cut it'], answer: null },
  { key: 'handOn', moment: 'allnight', question: 'Hand this phone on: one tap on the Host tab, or ask twice?', options: ['One tap', 'Ask twice'], answer: null },
]

// The old cards the timeline replaces. Each is marked done once, with the
// reason added to its detail. Nothing is deleted.
export const RETIRED_FOR_TIMELINE = [
  { order: 1, detail: 'Done: sign-in, the staff list and the rules are live.' },
  { order: 2, detail: 'Done: the seed is in and every list has an editor.' },
  { order: 3, detail: 'Done: every list the game reads has an editor.' },
  { order: 4, detail: 'Done: Home shows a bar for every list.' },
  { order: 5, detail: 'Done: the board and the decisions are on Home.' },
  { order: 6, detail: 'Done: the Stationery page.' },
  { order: 7, detail: 'Built: the secrets generator and its checker, counts only.' },
  { order: 8, detail: 'Filed under the night (22 Oct 2026): the cat lists sit under Act 2, Go to a cat.' },
  { order: 9, detail: 'Filed under the night (22 Oct 2026): every list sits under the moment it is used, with its live count.' },
  { order: 10, detail: 'Filed under the night (22 Oct 2026): every list sits under the moment it is used, with its live count.' },
  { order: 11, detail: 'Filed under the night (22 Oct 2026): Act 2, The first puzzle.' },
  { order: 12, detail: 'Filed under the night (22 Oct 2026): The week before, Make the secrets.' },
  { order: 13, detail: 'Retired 22 Oct 2026: affection is rolled 1 to 5 at the door and moves only through the Parlour Games.' },
  { order: 16, detail: 'Retired 22 Oct 2026: more puzzle kinds are for after the party.' },
  { order: 17, detail: 'Filed under the night (22 Oct 2026): After the party.' },
  { order: 18, detail: 'Done: a character reaches a phone by square code.' },
  { order: 19, detail: 'Built: the case is dealt from a seed at the blackout. The ten-thousand-run proof is for after the party.' },
  { order: 20, detail: 'Built: npm run fake-night.' },
  { order: 21, detail: 'Done: rehearsals run on the emulator, and the party box is on the Game night page.' },
  { order: 22, detail: 'Filed under the night (22 Oct 2026): Act 2, Go to a cat.' },
  { order: 24, detail: 'Done: Home shows who has been writing, and every change is kept.' },
  { order: 25, detail: 'Done: the bag items list is full.' },
  { order: 29, detail: 'Filed under the night (22 Oct 2026): Before the freeze, Put the game live.' },
]
