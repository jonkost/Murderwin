// The task board, filed under the night (22 Oct 2026). Every card carries a
// `moment`: the key of the place on the Timeline page where it belongs
// (lib/timeline.js). Added once by the ADDITIONS entry
// '2026-10-22-night-timeline' in content.js, which also retires the old
// cards these replace. Safe content only: nothing here says who did what.
//
// `when: 'later'` marks a card that can only happen on the day (the cards
// under The week before, Setting up the house and After the party are later
// anyway). `standin: true` marks one the night already covers with a
// stand-in; `standinOnceDone` names the card that has to be done first for
// that stand-in to exist (the sound cards wait on the stand-in sounds). The
// Timeline reads all three by the card's order, so the live cards written
// before these fields existed are sorted the same way.

const sound = (order, moment, id, when) => ({
  order, moment, status: 'todo', who: 'Jon', standin: true, standinOnceDone: 105,
  title: `Sound: ${id}`,
  detail: `Plays when ${when}. Two to five seconds, with one second of silence first. Name the file ${id} and put it in media/ on the brain. A stand-in tone plays until you do, once the stand-in sounds are made (Before the freeze).`,
})

export const TIMELINE_TASKS = [
  // Before the freeze, by Saturday 7 November
  { order: 100, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Put the game live', detail: 'In Terminal: npm run deploy. Nothing that has been built reaches the phones until you do. If it asks to turn on Cloud Scheduler, say yes.' },
  { order: 101, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Bring in the 21 October build', detail: 'The "how the case gets solved" build (the Act 2 cat rooms, the memory match, the study paying the Ghost’s trace) is waiting in a side copy and is not committed yet. Ask Claude to merge it.' },
  { order: 102, moment: 'freeze', status: 'todo', who: 'Jon and Susan', title: 'A rehearsal on your phones', detail: 'Open the game, tap "Host? Start the night", type your name, and press Next through every act with Susan’s phone and a spare joined. Every night is a rehearsal unless the party box is ticked.' },
  { order: 103, moment: 'freeze', status: 'todo', who: 'Jon', title: 'The hardware evening', detail: 'The Nanoleaf wall, the Stream Deck and the Hue bulb plugged in. node scripts/hardware-check.mjs prints PASS or FAIL. One run of the study and one grid of the drawing.' },
  { order: 104, moment: 'freeze', status: 'todo', when: 'later', who: 'Jon', title: 'Press Freeze', detail: 'Saturday 7 November, on the Game night page. Every list goes read-only. After this, anything not working is cut, not fixed.' },

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
  { order: 130, moment: 'act1.arrive', status: 'todo', when: 'later', who: 'Jon', title: 'The square code up at the door', detail: 'Save it from the Game night page. Guests scan it, type a name, and get a character and a bag number.' },
  { order: 131, moment: 'act1.arrive', status: 'todo', when: 'later', who: 'Jon and Susan', title: 'The numbered bags at the door', detail: 'Handed out at sign-in. A guest may look in their own; the others stay closed unless the holder is asked.' },
  { order: 132, moment: 'act1.arrive', status: 'todo', who: 'Jon', title: 'The welcome speech', detail: 'Out loud, near the start: the rules, and what a Murderer and a Ghost each do, so nobody has to ask later and give themselves away. Notes for yourself can go in Host notes.' },
  { order: 133, moment: 'act1.meet', status: 'todo', who: 'Jon and Susan', title: 'The household photos', detail: 'Faces, full, intro cards and in-play pictures of the four cats and Sir Irwin. The folders are ready.' },
  sound(134, 'act1.ready', 'blackout', 'every phone goes dark at the end of Act 1'),

  // Act 2
  sound(140, 'act2.orient', 'power', 'the power returns and Act 2 begins'),
  sound(141, 'act2.news', 'chime-news', 'the news flash comes up on the living room screen'),
  { order: 142, moment: 'act2.news', status: 'todo', standin: true, who: 'Claude', title: 'The news voiceover, written blind', detail: 'Rules out one or two motive families for everyone. Stand-in words today; the generator writes the real ones and Jenna checks them.' },
  { order: 143, moment: 'act2.cat', status: 'todo', standin: true, who: 'Claude', title: 'Each cat’s private hint, written blind', detail: 'The one hint a cat greets a guest with, ruling out another motive family. Stand-in words today; the generator writes the real ones and Jenna checks them.' },
  { order: 144, moment: 'act2.puzzle', status: 'todo', standin: true, who: 'Jon', title: 'The seven stationery pictures', detail: 'The blank papers the documents are printed on. Upload them on the Stationery page. Stand-ins work until then.' },

  // Act 3
  { order: 150, moment: 'act3.down', status: 'todo', when: 'later', who: 'Jon and Susan', title: 'Dinner on the table in the orangery', detail: 'Phones down and charging while everyone eats.' },
  { order: 151, moment: 'act3.down', status: 'todo', who: 'Jon', title: 'Music for the radio', detail: 'Atmosphere only: no sound in the game ever carries information.' },
  sound(152, 'act3.bulletin', 'sounder-bulletin', 'the bulletin comes up during dinner'),

  // Act 4
  sound(160, 'act4.study', 'sting-solved', 'a group solves the study'),
  { order: 161, moment: 'act4.puzzle', status: 'todo', who: 'Jon', title: 'Pick where the memory match iPad sits', detail: 'Somewhere a group can sit together while another group is in the study.' },

  // Act 5
  { order: 170, moment: 'act5.roam', status: 'todo', when: 'later', who: 'Jon and Susan', title: 'The cake, with one candle', detail: 'Sir Irwin’s first birthday.' },
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

// Added after the first timeline cards were live (review, 22 Oct 2026):
// the brain refuses to start while any of the nine sound files is missing,
// so the stand-in tones have to be made once, before the freeze. Applied by
// its own ADDITIONS entry, '2026-10-22-standin-sounds'.
export const STANDIN_SOUND_TASKS = [
  { order: 105, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Make the stand-in sounds on the brain', detail: 'Once, on the M3 Air, in Terminal, in the Murderwin folder: node scripts/make-placeholder-sounds.mjs. It makes a stand-in tone for every sound you have not recorded yet. The brain will not start until all nine sounds have a file.' },
]

// From docs/handoff-2026-10-22.md (22 Oct 2026): the jobs it hands out,
// each under its moment, and the cards it settles. Applied by the ADDITIONS
// entry '2026-10-22-handoff'.
export const HANDOFF_TASKS = [
  { order: 200, moment: 'act2.news', status: 'todo', who: 'Jon', title: 'Record W-O-O-F News bulletin 1', detail: 'Video. Ava on camera for the opening and the sign-off, and the five family clips over B-roll. Every line is in the W-O-O-F News Recording Script.' },
  { order: 201, moment: 'act2.news', status: 'todo', who: 'Jon', title: 'The W-O-O-F News graphics', detail: 'The logo, the lower thirds and the studio look, for all three bulletins.' },
  { order: 202, moment: 'act3.bulletin', status: 'todo', who: 'Jon', title: 'Record the 25 lines of bulletin 2', detail: 'Audio only: five families, five dial levels each. The lines are in the W-O-O-F News Recording Script. It plays on the Orangerie HomePod near the end of supper.' },
  { order: 203, moment: 'act7.reveal', status: 'todo', who: 'Jon', title: 'Record the closing bulletin', detail: 'Ava in the studio, Mic outside the manor on the green screen. Generic lines only: the game cuts in the three cards, so you never need the answer.' },
  { order: 204, moment: 'act5.irwin', status: 'todo', who: 'Jon', title: 'Draw the motive cards', detail: 'One card per motive for Sir Irwin\'s countdown. "The last of the pie" shows pizza, not apple pie.' },
  { order: 205, moment: 'act1.meet', status: 'todo', who: 'Jon', title: 'A candle in the Medium\'s portrait', detail: 'Her trace is lilac candle wax, and players match traces to people from the portraits.' },
  { order: 206, moment: 'act6.drawing', status: 'todo', who: 'Jenna', title: 'The Relay Drawing pictures', detail: 'A sealed bank of simple thick-line pictures. You must never see it. Not the smiley, house or diamond samples.' },
  { order: 207, moment: 'act2.cat', status: 'todo', who: 'Claude', title: 'The Cat Hint Lines into the game', detail: 'The open bank of hint lines, by cat and affection level, in place of the stand-in. The game picks which line plays.' },
  { order: 208, moment: 'act3.bulletin', status: 'todo', who: 'Claude', title: 'Bulletin 2 and its Arm button', detail: 'Arm it from your phone near the end of supper; it plays 3 to 5 minutes later. Your phone says only Armed.' },
  { order: 209, moment: 'allnight', status: 'todo', who: 'Claude', title: 'Fetch Champion on the Host tab', detail: 'Pick the first player the real Irwin brings a toy to. The game also needs to know which seats are Jessa and Jake.' },
  { order: 210, moment: 'act6.drawing', status: 'todo', who: 'Claude', title: 'The Relay Drawing changes', detail: 'Practice first, a random player called to the paper, guessing on your work MacBook Pro, and the bedroom iPad showing the trace.' },
  { order: 211, moment: 'act7.result', status: 'todo', who: 'Claude', title: 'The end credits', detail: 'The dial\'s journey, the awards from final sliders, the fun achievements, the joke counters, then Sydney and Irwin.' },
  { order: 212, moment: 'act7.reveal', status: 'todo', who: 'Claude', title: 'The closing bulletin with the cards cut in', detail: 'Murderer, Motive, Victim, as B-roll in your recording.' },
  { order: 213, moment: 'allnight', status: 'todo', who: 'Claude', title: 'The hosts\' intro lines', detail: 'Irwin, Granolia, Zimothy, Boo and Salem each open the game they host, in their own voice.' },
]
export const RETIRED_FOR_HANDOFF = [
  { order: 101, detail: 'Done 22 Oct 2026: brought in and committed.' },
  { order: 142, detail: 'Replaced 22 Oct 2026: the news is W-O-O-F News bulletin 1, an open bank you record. It always crosses off exactly one family.' },
  { order: 143, detail: 'Replaced 22 Oct 2026: the hints are the Cat Hint Lines, an open bank. Only one of the four cats gives each guest a real hint.' },
  { order: 161, detail: 'Decided 22 Oct 2026: on a small stand in the Library, with Zimothy.' },
  { order: 182, detail: 'Closed 22 Oct 2026: players match traces from the portraits, which show each trace.' },
]

// Built the same evening (22 Oct 2026): the Claude cards above are done, and
// two new jobs for Jon. Applied by '2026-10-22-handoff-built'.
export const HANDOFF_BUILT_TASKS = [
  { order: 214, moment: 'week', status: 'todo', who: 'Jon', title: 'Make the drawing pictures', detail: 'In Terminal: npm --prefix scripts run relay-pictures. It prints counts only. The three real pictures for the Relay Drawing are drawn blind, and you never see them. Until then the party uses stand-in pictures.' },
  { order: 215, moment: 'act7.result', status: 'todo', who: 'Jon', title: 'A photo of Sydney for the end credits', detail: 'Save it as play/public/household/sydney.jpg. Without it the card shows his name only.' },
]
export const RETIRED_FOR_BUILT = [
  { order: 207, detail: 'Built 22 Oct 2026: every cat says its line from the bank, never the real answer.' },
  { order: 208, detail: 'Built 22 Oct 2026: Next on Arm the bulletin arms it; it plays 3 to 5 minutes later.' },
  { order: 209, detail: 'Built 22 Oct 2026: on the Host tab. Sir Irwin\'s two seats are on the Game night page.' },
  { order: 210, detail: 'Built 22 Oct 2026: practice, three rounds, the called player, the guess on the main computer, the bedroom iPad.' },
  { order: 211, detail: 'Built 22 Oct 2026: the dial\'s journey, the awards, the counters, the thanks and Sydney.' },
  { order: 212, detail: 'Built 22 Oct 2026: each name press plays its part of your recording.' },
  { order: 213, detail: 'Built 22 Oct 2026: Boo, Salem, Granolia, Zimothy and Sir Irwin each open their game.' },
]

// Every card the timeline seeded, for looking a live card up by its order.
export const ALL_TIMELINE_TASKS = [...TIMELINE_TASKS, ...STANDIN_SOUND_TASKS, ...HANDOFF_TASKS, ...HANDOFF_BUILT_TASKS]

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
