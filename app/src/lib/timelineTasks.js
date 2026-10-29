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
  // moment was Act 2's safe beat, gone 23 Oct 2026 with the safe; the card is retired with it
  { order: 144, moment: 'act2.cat', status: 'todo', standin: true, who: 'Jon', title: 'The seven stationery pictures', detail: 'The blank papers the documents are printed on. Upload them on the Stationery page. Stand-ins work until then.' },

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

// The audit of 22 to 23 Oct 2026: every job it found that had no card, each
// under its moment with its owner (Jon, Susan, Jon and Susan, Jenna, Claude
// Code or Claude chat) and, where the audit gave one, a `by` date. Numbered
// from 300, clear of any card added by hand. Applied by '2026-10-23-audit'.
// Jobs that wait on an open decision say so in their detail.
export const AUDIT_TASKS = [
  // Before the freeze
  { order: 300, moment: 'freeze', status: 'todo', who: 'Jon', by: '2026-11-06', title: 'The last deploy before the freeze', detail: 'After every picture, sound and build is in. In Terminal, in the Murderwin folder: git pull (so any picture you added on the GitHub website comes down), then npm run deploy. Or ask Claude Code to do both. If it asks to turn on Cloud Scheduler, say yes. Anything added after this is not in the party.' },
  { order: 304, moment: 'freeze', status: 'todo', who: 'Jon and Susan', by: '2026-10-30', title: 'Finish the lists the secrets read', detail: 'Things in the bags, the Parlour Games, and the cats’ greetings, sign-offs, brush-offs and blanks. The secrets, the leans and the packing list are made from these on Saturday 31 October.' },
  { order: 305, moment: 'freeze', status: 'todo', who: 'Jon', by: '2026-11-06', title: 'Remake any set Jenna marked needs more', detail: 'Only if Jenna said needs more. Ask Claude Code to remake just those sets: it works by code and prints counts only. Then Jenna reads them once more.' },
  { order: 329, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Install Java once, for the rules test', detail: 'In Terminal: brew install --cask temurin (it may ask for your Mac password). Then ask Claude Code to run the rules test, which proves your account cannot read the secrets. It reports PASS or FAIL only.' },
  { order: 330, moment: 'freeze', status: 'todo', who: 'Jon', title: 'The .env files for the study and the brain', detail: 'On the M1 Air: copy station/.env.example to station/.env. On the brain: copy cues/.env.example to cues/.env. Put the same key word after STATION_KEY= in both: the word you save on the Host tab under The study. The Nanoleaf tokens and the Hue key go on their own lines; ask Claude Code which line each goes on. These files are never committed.' },
  { order: 331, moment: 'freeze', status: 'todo', who: 'Jon and Susan', title: 'The shopping', detail: 'If the bags station stays (the decision under Act 4, The bags): every item on Things in the bags (one of each, two of each Taste item; leftovers become party favours) and ten bags with the numbers 1 to 10 on them. Buy the whole list, so the shopping never shows which items are in play. Always: a telescoping pointer for the study wall, a small iPad stand for the Library, the paper roll and the markers, and prizes if you want any.' },
  { order: 332, moment: 'freeze', status: 'todo', who: 'Jon and Susan', by: '2026-11-05', title: 'The full tech run', detail: 'A rehearsal night with every machine on at once: the brain and speakers, the living room TV, the iPad, the study station and walls, the hall bulb, and two phones. Press Next from Act 1 to Act 7 and check every sound plays and every screen changes on its own. Do it twice, the second time by Thursday 5 November, so anything broken can still be fixed.' },
  { order: 334, moment: 'freeze', status: 'todo', who: 'Jon and Susan', title: 'Supper menu and timing', detail: 'Supper must be nearly done when you arm bulletin 2 (it plays 3 to 5 minutes later), and dessert is the cake with one candle.' },
  { order: 336, moment: 'freeze', status: 'todo', who: 'Jon', title: 'The sounds at party volume, with the animals home', detail: 'On the hardware evening: play the blackout and sting sounds at party volume with the cats and Sir Irwin in the house.' },
  { order: 338, moment: 'freeze', status: 'todo', who: 'Claude chat', title: 'Full play-through review with Claude chat', detail: 'Build order step 12. Open a Claude chat, give it the Canon and the newest handoff, and walk the whole night act by act. Anything it finds goes on this board.' },
  { order: 339, moment: 'freeze', status: 'todo', who: 'Jon', title: 'The canary person walks the game', detail: 'Build order step 13. One person who is not coming to the party plays a rehearsal night on a phone, start to finish, before the guests do, and says where they got stuck.' },
  { order: 341, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Refresh what Claude chat knows', detail: 'In the Claude project, replace the Project Knowledge with current copies: the Canon, CLAUDE.md, and from the repo’s docs folder the 22 Oct handoff, solving-the-case, parlour-games, relay-drawing-game and test-plan. Do not upload murderwin-handoff.zip, its CLAUDE.md or the old START-HERE: they are out of date.' },
  { order: 313, moment: 'freeze', status: 'todo', who: 'Claude chat', title: 'READ-FIRST and the cat lore', detail: 'From the 22 Oct handoff: READ-FIRST gets the night plan, Sir Irwin’s trace lines, the bulletins, the cat ladders, the hosts and the closing bulletin; cat-lore-final.md gets Salem’s and Boo’s new Trusting lines. Open a Claude chat in the project that holds them and paste the handoff link. (Claude Code updates the rules deck and the intro script itself.)' },
  { order: 314, moment: 'freeze', status: 'todo', who: 'Claude Code', title: 'The Health page and the check commands', detail: 'Not built yet. As docs/test-plan.md has it: npm run checks (1,000 stand-in cases), a Health page in the workshop (one line per group, a tick or a cross and a count, and "All clear. The game is ready." when all is green), and a Run the checks button on Jenna’s page. The real checks run on the server and show only on her page.' },
  { order: 315, moment: 'freeze', status: 'todo', who: 'Jenna', by: '2026-11-05', title: 'Jenna runs the real checks', detail: 'Once the secrets are made and the Health page is built: she presses Run the checks on her page. It shows PASS or FIX NEEDED with a check number there. She tells Jon only PASS or FIX NEEDED.' },
  { order: 317, moment: 'freeze', status: 'todo', who: 'Jenna', title: 'Jenna reads the lists cold', detail: 'The rules, the fourteen characters, the Parlour Games and the cat lines, in the order the For Jenna page gives. Under each list she marks Reads clearly or Needs another look. Before the freeze: the lists lock then.' },
  { order: 318, moment: 'freeze', status: 'todo', who: 'Jenna', by: '2026-11-05', title: 'Jenna looks over the cats’ leans (optional)', detail: 'After Make the cats’ leans: her page, tab The cats’ leans. She may change any lean.' },
  { order: 324, moment: 'freeze', status: 'todo', who: 'Claude Code', title: 'Replay a night by its seed', detail: 'Not built yet. A Replay box on the Game night page, for rehearsals only: start a night with a seed word and it deals the same characters, roles, motive, cat hints, Parlour Game times and drawing order every time, so a run that went wrong can be played again. Greyed out when This is the party night is ticked.' },
  { order: 325, moment: 'freeze', status: 'todo', who: 'Claude Code', title: 'Home rows for the secrets, the leans, the packing list and the pictures', detail: 'Not built yet. Count-only rows on Home beside the motive sets: the packing list made or not, the cats’ leans N of M questions, the drawing pictures N of 9. A server call returns the numbers and never any content.' },
  { order: 326, moment: 'freeze', status: 'todo', who: 'Claude Code', title: 'Take the unused secret parts out', detail: 'Waits on the cats’ secret lines decision (Act 2, Go to a cat). The echo fragments, the old study clue and Sir Irwin’s three secret lines are no longer shown on the night: take them out of the generator and off Jenna’s page.' },

  // The week before
  { order: 321, moment: 'week', status: 'todo', who: 'Jon', title: 'Jessa’s and Jake’s names for Sir Irwin’s awards', detail: 'Game night page, Sir Irwin’s two awards: type the name each of them will type on their phone.' },
  { order: 333, moment: 'week', status: 'todo', who: 'Susan', title: 'Who is coming, and their phones', detail: 'The final headcount (ten bags means ten guests at most). For each guest: a phone that scans a square code and opens a web page, and the house wifi password. Anyone without a phone, the 11-year-old included, gets the spare iPad, charged and on the join screen.' },
  { order: 335, moment: 'week', status: 'todo', who: 'Susan', title: 'Where the animals are', detail: 'Which rooms the cats and Sir Irwin may be in, where Salem can be petted, and a quiet room for any animal that has had enough.' },

  // Setting up the house
  { order: 301, moment: 'setup', status: 'todo', who: 'Jon', title: 'Open the TV, the study screen and the iPad', detail: 'Living room TV: ?kiosk=living. Study M1 Air: ?kiosk=study. The iPad Pro on its stand in the orangery: ?kiosk=ipad, for the captions at supper. The older iPad on the plain game address, as the spare phone. Tap each screen once to wake it.' },
  { order: 322, moment: 'setup', status: 'todo', who: 'Jon', title: 'The Orangerie HomePod in the brain’s speakers', detail: 'Bulletin 2 plays on the Orangerie HomePod. Make sure it is in the AirPlay group the brain plays to. Then, on the brain, in the Murderwin folder, type afplay media/sounder-bulletin.wav (or .m4a) and hear it in the orangery. Try it on the hardware evening too.' },

  // On every phone, all night
  { order: 319, moment: 'allnight', status: 'todo', when: 'later', who: 'Jon', title: 'Salem petted, when it happens', detail: 'If a guest pets the real Salem, press Salem petted on the Host tab and pick them. Never you or Susan.' },
  { order: 320, moment: 'allnight', status: 'todo', when: 'later', who: 'Jon', title: 'Fetch Champion, when it happens', detail: 'The first guest the real Sir Irwin brings a toy to: press Fetch Champion on the Host tab and pick them.' },

  // Act 1
  { order: 311, moment: 'act1.meet', status: 'todo', who: 'Jon', title: 'Paste the new Trusting lines', detail: 'Workshop, Meet the household. On Salem’s card, replace what follows "Trusting Salem:" (or add it at the end if it is not there) with: Most days, he’s got it backwards, so flip whatever he tells you. Win him over and he might set it straight. Only a true friend gets it right every time. On Boo’s card, do the same after "Trusting Boo:" with: The more she likes you, the more she’ll say. Bore her and you get a look. Win her over and she might be useful. Before the freeze: the lists lock then.' },

  // Act 2
  // moment was Act 2's safe beat, gone 23 Oct 2026 with the safe; the card is retired with it
  { order: 306, moment: 'act2.cat', status: 'todo', who: 'Jon', standin: true, title: 'The seven stationery pictures', detail: 'Only if the safe’s document stays (the cats’ secret lines decision, Act 2, Go to a cat). Your seven designs replace the stand-in files in play/public/stationery, same names: receipt, telegram, household-notice, citation-form, personal-letter, playbill, mourning-card. Give the pictures to Claude Code, which puts them in and deploys. The upload on the Stationery page is a reference copy only and never reaches the phones.' },
  { order: 327, moment: 'act2.news', status: 'todo', who: 'Claude Code', title: 'Play the W-O-O-F News videos on the TV', detail: 'Only if you choose video (the W-O-O-F News decision above). Bulletin 1 and the closing bulletin as video on the living room TV, with the three cards cut into the closing one. Bulletin 2 stays sound on the Orangerie HomePod.' },
  { order: 340, moment: 'act2.cat', status: 'todo', who: 'Jon', by: '2026-10-25', title: 'Time one round of cat visits', detail: 'At this weekend’s practice game, time one guest’s four cat visits. Tell Claude Code the minutes: Act 2’s length and the visit timings are set from them.' },

  // Act 3
  { order: 307, moment: 'act3.down', status: 'todo', who: 'Jon', title: 'Music for dinner', detail: 'Atmosphere only. The W-O-O-F News recordings are the only sounds that carry clues, and their words are always on a screen too.' },
  { order: 302, moment: 'act4.groups', status: 'todo', when: 'later', who: 'Jon', title: 'Move the iPad to the Library', detail: 'After supper, carry the iPad Pro to its small stand in the Library, with Zimothy. Open ?kiosk=memory and tap once to wake it.' },
  { order: 337, moment: 'act3.bulletin', status: 'todo', who: 'Jon', title: 'Update your Apple Reminder about bulletin 2', detail: 'It still has the old design. Change it to: Bulletin 2: record 25 audio lines (5 families x 5 dial levels) from the W-O-O-F News Recording Script. Arm it from my phone near the end of supper; it plays on the Orangerie HomePod 3 to 5 minutes later. Or delete it and use the card Record the 25 lines of bulletin 2.' },

  // Act 5
  { order: 303, moment: 'act5.roam', status: 'todo', when: 'later', who: 'Jon', title: 'Carry the iPad into the bedroom', detail: 'Right after dessert, open ?kiosk=bedroom on the iPad Pro, tap once, and close the bedroom door. It shows nothing until the third drawing is named.' },
  { order: 308, moment: 'act5.irwin', status: 'todo', who: 'Claude Code', title: 'Show the motive card pictures', detail: 'Not built yet. In Sir Irwin’s countdown and at the reveal, show each motive’s picture from play/public/motives/1.png to 19.png (the motive’s number), and the rhyme when a picture is missing.' },
  { order: 309, moment: 'act5.irwin', status: 'todo', who: 'Jon', title: 'Draw the nineteen motive cards', detail: 'One picture per motive, saved as play/public/motives/<number>.png, 1 to 19. "The last of the pie" shows pizza, not apple pie. Until a picture is in, the card shows the rhyme. Then ask Claude Code to deploy, so the pictures reach the screens.' },

  // Act 6
  { order: 328, moment: 'act6.drawing', status: 'todo', who: 'Claude Code', title: 'A Drawing pictures tab for Jenna', detail: 'Only if you say yes to Jenna seeing the pictures (the decision above). A tab on her page that shows each picture with its name and its wrong answers, and a redo mark; the next relay-pictures run replaces only the marked ones.' },
]

// The seeded card a number means, by its title, so a card added by hand that
// shares the number is never touched.
const SEEDED_BEFORE_AUDIT = [...TIMELINE_TASKS, ...STANDIN_SOUND_TASKS, ...HANDOFF_TASKS, ...HANDOFF_BUILT_TASKS]
const seededTitle = (order) => SEEDED_BEFORE_AUDIT.find(t => t.order === order)?.title
const withTitle = (r) => ({ ...r, title: r.title ?? seededTitle(r.order) })

// The stale cards the audit names, marked done once with the reason.
export const RETIRED_FOR_AUDIT = [
  { order: 27, title: 'Jenna’s Steward view', detail: 'Built: Jenna’s page, with the secrets, the packing list and the cats’ leans.' },
  { order: 100, detail: 'Done 23 Oct 2026: deployed. The last deploy before the freeze is its own card.' },
  { order: 123, detail: 'Replaced 23 Oct 2026: at setup, open the TV, the study and the iPad in the orangery. The iPad Pro then moves (cards under Act 3 and Act 5).' },
  { order: 133, detail: 'Done 23 Oct 2026: the five faces and Sir Irwin’s five moods are in. Nothing on the night shows intro cards or in-play pictures. If you want them shown, ask Claude Code first.' },
  { order: 144, detail: 'Replaced 23 Oct 2026: the same job, now saying where the files go (see the new card).' },
  { order: 151, detail: 'Replaced 23 Oct 2026: the W-O-O-F News recordings do carry clues, so the card is reworded (see the new card).' },
  { order: 204, detail: 'Replaced 23 Oct 2026: the same job, now saying where the pictures go (see the new card).' },
  { order: 206, detail: 'Replaced 22 Oct 2026: the pictures are made blind by the script (Make the drawing pictures). Jenna’s page cannot show them yet; see the decision under Act 6, The drawing.' },
].map(withTitle)

// Cards the audit moves or dates. The secrets, the leans, the drawing
// pictures and the packing list are made by Saturday 31 October and read by
// Jenna by Thursday 5 November, all before the freeze, so a set that needs
// more can still be remade (CLAUDE.md: the generator is never cut).
export const FILED_FOR_AUDIT = [
  { order: 110, from: 'week', moment: 'freeze', by: '2026-10-31', note: 'Made once on 20 Oct 2026 (19 sets passed). Run it again after you answer the cats’ secret lines question (Act 2, Go to a cat), and whenever the bag items change. Sets Jenna has edited or marked are kept.' },
  { order: 111, from: 'week', moment: 'freeze', by: '2026-10-31', note: 'Nothing waits on this one: it can be run now.' },
  { order: 112, from: 'week', moment: 'freeze', by: '2026-10-31', note: 'Made once on 20 Oct 2026 (ten bags). Only if the bags station stays (the decision under Act 4, The bags). If you change the bag items, tell Claude Code: the packing and the secrets are remade together.' },
  { order: 113, from: 'week', moment: 'freeze', by: '2026-11-05' },
  { order: 214, from: 'week', moment: 'freeze', by: '2026-10-31', note: 'Nothing waits on this one: it can be run now.' },
  { order: 205, note: 'Then ask Claude Code to deploy, so the picture reaches the phones.' },
  { order: 215, note: 'Then ask Claude Code to deploy, so the photo reaches the screens.' },
  // The W-O-O-F News cards plan video; the game plays sound today
  { order: 200, note: 'Video or sound waits on the W-O-O-F News decision (Act 2, News flash). Today the game plays your recording as sound, with the words on the TV.' },
  { order: 201, note: 'Only matters if you choose video (the W-O-O-F News decision, Act 2, News flash). Today the TV shows the words only.' },
  { order: 203, note: 'Video or sound waits on the W-O-O-F News decision (Act 2, News flash). Today the game plays your recording as sound, with the three cards on the TV.' },
].map(withTitle)

// Decisions the audit adds, each filed under the moment it changes. Only
// Jon answers the open ones. The two with an answer were settled by default
// (23 Oct 2026); Jon may change either.
export const AUDIT_DECISIONS = [
  { key: 'secretLines', moment: 'act2.cat', question: 'Do the cats’ secret lines and the Act 2 safe’s document stay as extra clues, or are they retired so the cats say only their open hint lines? (Making the secrets waits on this.)', options: ['Keep them as extra clues', 'Retire them'], answer: null },
  { key: 'diningName', moment: 'act2.cat', question: 'Call the real dining room "the Library" everywhere, or keep "the dining hall" in the cats’ room list?', options: ['The Library, everywhere', 'Keep "the dining hall"'], answer: null },
  { key: 'newsVideo', moment: 'act2.news', question: 'W-O-O-F News bulletin 1 and the closing bulletin: video on the living room TV, or your recordings as sound with the words on screen (as built today)?', options: ['Sound, with the words on screen', 'Video on the TV'], answer: null },
  { key: 'rulesDeckScreen', moment: 'act1.arrive', question: 'In Act 1, which screen shows the rules deck and the join code?', options: ['The living room TV, back to the game before the blackout', 'Another screen (the iPad Pro, or a phone on the TV)'], answer: null },
  { key: 'stewardPictures', moment: 'act6.drawing', question: 'Should Jenna see and swap the Relay Drawing pictures on her page?', options: ['Yes, give her a Drawing pictures tab', 'No, the blind script is enough'], answer: null },
  { key: 'partnerAwards', moment: 'act7.result', question: 'The Partner in Crime and Ghost Whisperer awards: cut them, or have Claude Code build them (once it has checked they give nothing away about the dial)?', options: ['Cut them', 'Build them'], answer: null },
  { key: 'tidyFolders', moment: 'freeze', question: 'Tidy the repo folder: remove the merged solving-the-case side copy, and move the 25 Sep handoff bundle out of the repo? Nothing is deleted.', options: ['Yes, tidy them', 'Leave them'], answer: null },
  { key: 'ballotMajority', moment: 'act7.result', question: 'Act 7: the rules say "majority decides", but as built each phone just scores itself. Should the TV also show the room’s majority pick as the official answer?', options: ['No, each phone scores itself (as built)', 'Yes, show the room’s majority too'], answer: null },
  { key: 'bulletin2Voice', moment: 'act3.bulletin', question: 'Who reads the 25 lines of bulletin 2?', options: ['Ava Waves (you, in the studio voice)', 'Mic Cameron', 'Someone else'], answer: null },
  { key: 'bulletin2Known', moment: 'act3.bulletin', question: 'You record all 25 lines of bulletin 2, so on the night you will know which family the line points at, even an obscure one. Accept that, or have someone else record them?', options: ['Accept it', 'Someone else records them'], answer: null },
  { key: 'dialMapping', moment: 'allnight', question: 'The rules say each night decides blind how the Murderer’s and the Ghost’s answers move the dial. As built, it is fixed: the Ghost pushes toward clear, the Murderer toward foggy. Keep it fixed, or have Claude Code build the blind mapping?', options: ['Keep it fixed (as built)', 'Build the blind mapping'], answer: null },
  { key: 'act4Granolia', moment: 'act4.groups', question: 'The Act 4 cat station: may it send a group to Granolia, or does it skip her, since her room, the Study, holds the light puzzle?', options: ['Skip Granolia in Act 4 (she is in the Study)', 'Granolia may be the cat too'], answer: 'Skip Granolia in Act 4 (she is in the Study)', answeredBy: 'settled by default', note: 'Settled by default on 23 Oct 2026, as built. You may change it.' },
  { key: 'solveOrder', moment: 'act6.eliminate', question: 'The deduction round: after the bedroom door opens, or before the drawing?', options: ['After the door, as built', 'Before the drawing'], answer: 'After the door, as built', answeredBy: 'settled by default', note: 'Settled by default on 23 Oct 2026, as built. You may change it.' },
]

// Older decisions with no moment, filed where they belong.
export const FILED_DECISIONS_FOR_AUDIT = { tutorial8: 'act1.arrive', grossnola: 'act1.meet', swapMotive: 'freeze', scoring: 'act7.result' }

// Decisions the handoff and the build already settled (the audit checked
// each). Answered only if nobody has answered them.
export const ANSWERED_FOR_AUDIT = {
  ipadDinner: 'Captions in the orangery',
  scoring: 'As built 22 Oct 2026: each phone shows how many of the three it got, and the awards come in the end credits.',
  eventDeck: 'Closed 22 Oct 2026: no hidden events in any act. The Parlour Games are the only events.',
  clueChannels: 'Settled 21 to 22 Oct 2026: by traces. The portraits show each trace, the study shows the Ghost’s, the bedroom door shows the Murderer’s.',
  acts35: 'Settled 22 Oct 2026: supper has W-O-O-F News bulletin 2 and table talk; dessert has Sir Irwin’s countdown.',
  salemSgtMajor: 'Not needed 22 Oct 2026: everyone starts Salem at 3.',
}

// 23 Oct 2026, Jon: the cats' secret lines and the safe's document are
// retired (secretLines), and the Act 2 safe is taken out with them. The
// cats say only their open hint lines, so there are no secret sets to make,
// read or remake. Applied by '2026-10-23-secret-lines'.
export const SECRET_LINES_ANSWER = { secretLines: 'Retire them' }
export const SECRET_LINES_DECISIONS = [
  { key: 'act2Safe', moment: 'act2.cat', question: 'With the safe’s document retired, what happens to the Act 2 safe?', options: ['Take it out', 'Keep it, paying out a keepsake with no clue'], answer: 'Take it out', answeredBy: 'Jon', note: 'Jon, 23 Oct 2026: Act 2 is the four cat visits. The cats give no numbers, and there is no safe, document or stationery.' },
]
export const SECRET_LINES_TASKS = [
  { order: 342, moment: 'freeze', status: 'todo', who: 'Jon and Susan', by: '2026-10-30', title: 'Finish the lists the leans and the packing read', detail: 'Things in the bags and the Parlour Games. The cats’ leans and the packing list are made from these on Saturday 31 October.' },
  { order: 343, moment: 'freeze', status: 'todo', who: 'Claude Code', title: 'Home rows for the leans, the packing list and the pictures', detail: 'Not built yet. Count-only rows on Home: the packing list made or not, the cats’ leans N of M questions, the drawing pictures N of 9. A server call returns the numbers and never any content.' },
  { order: 344, moment: 'freeze', status: 'todo', who: 'Jon', by: '2026-10-24', title: 'Deploy before the practice game', detail: 'In Terminal, in the Murderwin folder: npm run deploy. It asks whether to delete the function solve (the old Act 2 safe): type y. Then start a new rehearsal night on the Game night page.' },
]
const RETIRED_REASON = 'Retired 23 Oct 2026: the cats’ secret lines and the safe’s document are retired (your answer), so there are no secret sets.'
export const RETIRED_FOR_SECRET_LINES = [
  { order: 110, title: 'Make the secrets', detail: RETIRED_REASON },
  { order: 113, title: 'Jenna reads every secret and says done', detail: `${RETIRED_REASON} Jenna still looks over the cats’ leans and packs the bags.` },
  { order: 304, title: 'Finish the lists the secrets read', detail: 'Replaced 23 Oct 2026: the cats’ greetings, sign-offs, brush-offs and blanks fed only the secret sets, which are retired. See Finish the lists the leans and the packing read.' },
  { order: 305, title: 'Remake any set Jenna marked needs more', detail: RETIRED_REASON },
  { order: 306, title: 'The seven stationery pictures', detail: 'Retired 23 Oct 2026: the Act 2 safe is taken out, so nothing shows a document.' },
  { order: 325, title: 'Home rows for the secrets, the leans, the packing list and the pictures', detail: 'Replaced 23 Oct 2026: the secret sets are retired. See Home rows for the leans, the packing list and the pictures.' },
  { order: 326, title: 'Take the unused secret parts out', detail: 'Done 23 Oct 2026: the whole secret set is out of the game, the generator and Jenna’s page.' },
]
export const FILED_FOR_SECRET_LINES = [
  { order: 112, title: 'Make the packing list', note: '(23 Oct 2026: the secret sets are retired, so only the packing is made from the bag items.)' },
  { order: 315, title: 'Jenna runs the real checks', note: '(23 Oct 2026: the secret sets are retired, so this waits only on the Health page.)' },
]

// docs/handoff-2026-10-23.md, applied 24 Oct 2026 (sections 10, 15 and 16):
// what Claude Code built from it, marked done; the jobs it hands to Jon,
// Susan, Jenna and Claude chat, each under its moment; the cards it replaces
// marked done with the reason; and the decisions it settles with their
// defaults. Numbered from 400. Applied by '2026-10-24-handoff-1023'.
const BUILT_1024 = 'Built 24 Oct 2026.'
export const HANDOFF_1023_TASKS = [
  // Built by Claude Code (section 10, items 2 to 13, and sections 15 and 16)
  { order: 400, moment: 'act2.cat', status: 'done', who: 'Claude Code', title: 'The bag clue engine', detail: `${BUILT_1024} Each cat's bag clue: in Act 2 about the Murderer's bag, in Act 4 about the Ghost's, from the packing, at the rung the cat's affection sets. Salem is backwards at 1 to 3. A rehearsal shows a stand-in in square brackets.` },
  { order: 401, moment: 'act2.cat', status: 'done', who: 'Claude Code', title: 'Act 2: four cats each, Not yet, and Supper’s ready', detail: `${BUILT_1024} Every guest visits all four cats; each gives a motive hint and a bag clue. Not yet puts a guest back in the queue; no cat sits idle. Supper comes on its own when everyone has seen all four, or when you press Supper’s ready.` },
  { order: 402, moment: 'act4.groups', status: 'done', who: 'Claude Code', title: 'Act 4: the warning, the groups, Locked in and the four rooms', detail: `${BUILT_1024} Start Act 4 on the Host tab: a two-minute warning, the title card, groups of two or three with portraits, Locked in, then ten-minute rounds on the clock. Each group visits every room once; a group with no room waits in the Parlour, where Parlour Games wait on the phone.` },
  { order: 403, moment: 'act4.puzzle', status: 'done', who: 'Claude Code', title: 'In Duplicate: the memory match in three rounds', detail: `${BUILT_1024} Seven, ten and fourteen pairs, all fourteen traces as art, Zimothy’s lines. The same game on its own for fun: ?kiosk=memory&play=1.` },
  { order: 404, moment: 'act4.orangerie', status: 'done', who: 'Claude Code', title: 'Get Off My Lawn! on the phones', detail: `${BUILT_1024} Red means shake, green means freeze; a slip restarts the round; thirty seconds clean passes it; three rounds. The phones tint their screens, so it works with no lights at all.` },
  { order: 405, moment: 'act4.entryway', status: 'done', who: 'Claude Code', title: 'Boo’s Catwalk on the wall', detail: `${BUILT_1024} ?kiosk=boo on Susan’s MacBook Pro, projected: Boo struts, the music stops, three poses, and she judges each one.` },
  { order: 406, moment: 'setup', status: 'done', who: 'Claude Code', title: 'The brain: the tenth sound, music, Hue scenes and the string lights', detail: `${BUILT_1024} chime-phone is the tenth sound. The brain plays the three playlists by act and ducks them under the news, recalls the four Hue scenes, and mirrors Salem’s colours to the string lights. Each is switched on by a line in cues/.env (its own card).` },
  { order: 407, moment: 'act2.news', status: 'done', who: 'Claude Code', title: 'W-O-O-F News as video on the Parlour TV', detail: `${BUILT_1024} Bulletin 1 and the closing bulletin play as video once the files are in and the box on the Game night page is ticked (Put the bulletin videos in). Until then the recordings play with the words on the TV, as before.` },
  { order: 408, moment: 'act1.arrive', status: 'done', who: 'Claude Code', title: 'The permissions screen at sign-in', detail: `${BUILT_1024} One tap allows motion and sound and keeps the screen awake. Allow again is on the You tab.` },
  { order: 409, moment: 'freeze', status: 'done', who: 'Claude Code', title: 'npm run checks, the Health page and Jenna’s checks', detail: `${BUILT_1024} npm run checks deals 1,000 stand-in cases and plays a fake night; the Health page (Where we are links to it) shows the last run. Jenna’s page has Run the checks for the real packing, leans and pictures.` },
  { order: 410, moment: 'act1.arrive', status: 'done', who: 'Claude Code', title: 'The final bag items in the game', detail: `${BUILT_1024} Your 24 items are the Things in the bags list; the 108 September items are retired (kept, not shown). Fourteen clue words, four or five things a bag, and Sir Irwin’s sixteen prompts.` },
  { order: 411, moment: 'act4.groups', status: 'done', who: 'Claude Code', by: '2026-10-30', title: 'Put the game names in the game', detail: `${BUILT_1024} Granolia’s Lightbulb Moment, In Duplicate, Get Off My Lawn!, Boo’s Catwalk and Sir Irwin Needs a Hand, each with its line under it, on the phones and on each room’s screen.` },
  { order: 412, moment: 'freeze', status: 'done', who: 'Claude Code', title: 'The docs: the Parlour, Crooknog, the device table, no freeze date', detail: `${BUILT_1024} The night’s runbook, the room screens, the test plan, the bags, the Devices page and CLAUDE.md say what was decided on 23 and 24 October.` },
  { order: 413, moment: 'allnight', status: 'done', who: 'Claude Code', title: 'Scenes and music on the Host tab', detail: `${BUILT_1024} Under The house: the four light scenes, and play, pause and next for the music.` },

  // The tenth sound
  sound(420, 'act2.supper', 'chime-phone', 'supper is ready, Act 4 starts, each Act 4 round changes, and the Act 6 Parlour Games open (every phone chimes too)'),

  // Jon and Susan
  { order: 421, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Three playlists on the brain', detail: 'In Apple Music on the M3 Air: playlists named Arrival, Investigation and Supper. Curating only. Then add the line MUSIC=on to cues/.env. The brain plays each at its act and ducks it under the news.' },
  { order: 422, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Four Hue scenes', detail: 'In the Hue app: scenes named Arrival, Blackout, Lights Out and Reveal. Five minutes. Then add the line HUE_SCENES=on to cues/.env. Nothing waits on a light.' },
  { order: 423, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Try the string lights from the brain', detail: 'On the hardware evening: give the Holiday String Lights a fixed address on the router, then ask Claude Code for the two lines (NANOLEAF_STRINGS_HOST and NANOLEAF_STRINGS_TOKEN) for cues/.env. If they will not answer, stop there: Get Off My Lawn! runs on the phones alone.' },
  { order: 424, moment: 'freeze', status: 'todo', who: 'Jon', title: 'The projector for Boo’s wall', detail: 'Borrow the work projector and a short HDMI cable. On the hardware evening: Susan’s MacBook Pro on the upstairs landing, ?kiosk=boo, aimed at the triangle wall above the Parlour opening.' },
  { order: 425, moment: 'freeze', status: 'todo', who: 'Jon and Susan', title: 'The last shopping', detail: 'Ten black velvet drawstring bags, 9 by 12 inches, numbered 1 to 10 (if you do not have them yet). A telescoping pointer for the study wall. A small stand for the older iPad in the Library. The paper roll and markers. Prizes if you want any.' },
  { order: 426, moment: 'act2.news', status: 'todo', who: 'Jon', title: 'Put the bulletin videos in', detail: 'When bulletin 1 and the closing bulletin are cut: one .mp4 per part, named as its clip in seed/woof-news.json, into play/public/video. Give them to Claude Code, which puts them in and deploys. Then tick The bulletins are videos on the Game night page. Until then the brain plays your recordings and the TV shows the words.' },
  { order: 427, moment: 'act2.news', status: 'todo', who: 'Jon', title: 'Tell Claude Code how long the videos are', detail: 'Once both bulletins are cut. The brain holds the music down while a video plays; today it guesses 90 seconds.' },
  { order: 428, moment: 'week', status: 'todo', who: 'Jon', title: 'Tell Jenna they pack the bags at the house', detail: 'Jenna comes to the party and does not play. Before the guests arrive they pack the ten bags from their page, then keep them closed. Nobody who plays watches.' },
  { order: 429, moment: 'act5.roam', status: 'todo', when: 'later', who: 'Jon', title: 'Move Susan’s MacBook Pro to the bedroom', detail: 'After Act 4, carry it from the landing into the bedroom, open ?kiosk=bedroom, tap once and close the door. It shows nothing until the third drawing is named.' },
  { order: 430, moment: 'setup', status: 'todo', who: 'Jon', title: 'The older iPad in the Library', detail: 'On its small stand, with Zimothy: ?kiosk=memory, tap once to wake it. It stays there all night and waits for each group.' },
  { order: 431, moment: 'freeze', status: 'todo', who: 'Jon and Susan', by: '2026-11-11', title: 'The second full tech run', detail: 'Every machine on at once, Act 1 to Act 7, Monday 9 to Wednesday 11 November. The last new feature lands Wednesday 11 November; after that, checks and fixes only.' },
  { order: 432, moment: 'act4.orangerie', status: 'todo', who: 'Jon and Susan', title: 'Try Get Off My Lawn! on two phones', detail: 'On a rehearsal night in Act 4: two phones scan the Orangerie code. Red: shake. Green: freeze. Tell Claude Code if the shake feels too touchy or too dull.' },
  { order: 433, moment: 'act4.entryway', status: 'todo', who: 'Jon', title: 'Runway music for Boo’s Catwalk (optional)', detail: 'Today the wall plays a simple beat. For a real song, save it as play/public/boo/catwalk.mp3 and ask Claude Code to deploy.' },
  { order: 434, moment: 'week', status: 'todo', who: 'Jon', by: '2026-11-14', title: 'Press Freeze the workshop when the lists are final', detail: 'On the Game night page, Thursday 12 to Saturday 14 November, your call: there is no fixed freeze date. Every list goes read-only.' },
  { order: 435, moment: 'week', status: 'todo', who: 'Jon', by: '2026-11-14', title: 'The last deploy', detail: 'In the checks-and-fixes days, Thursday 12 to Saturday 14 November, after every picture, sound and video is in. In Terminal, in the Murderwin folder: git pull, then npm run deploy. Or ask Claude Code to do both.' },

  // Claude chat
  { order: 440, moment: 'freeze', status: 'todo', who: 'Claude chat', title: 'Mark the project copy of the 23 Oct handoff Applied', detail: 'In the claude.ai project, at the top of claude/handoff-2026-10-23.md: Applied 24 Oct 2026 by Claude Code. The repo copy already says it.' },
  { order: 441, moment: 'freeze', status: 'todo', who: 'Claude chat', title: 'Two slides in the rules deck', detail: 'The Reticule slide still shows four tabs and an old screenshot; the Act 7 slide does not mention the dial’s journey or the end credits. Where they name the Act 4 games and the drawing, use the game names.' },

  // Nice to have
  { order: 450, moment: 'act7.result', status: 'todo', who: 'Claude Code', title: 'The pose photo for the end credits (nice to have)', detail: 'Section 10 item 14: only when everything else is done. The iPad Pro in the Entryway takes one photo of each group’s last pose for the credits.' },
]

const RETIRED_1024 = 'Replaced 24 Oct 2026 (the 23 Oct handoff):'
export const RETIRED_FOR_1023 = [
  { order: 104, title: 'Press Freeze', detail: `${RETIRED_1024} there is no freeze date. See Press Freeze the workshop when the lists are final.` },
  { order: 300, title: 'The last deploy before the freeze', detail: `${RETIRED_1024} there is no freeze date. See The last deploy.` },
  { order: 302, title: 'Move the iPad to the Library', detail: `${RETIRED_1024} the older iPad does the memory match all night. See The older iPad in the Library.` },
  { order: 303, title: 'Carry the iPad into the bedroom', detail: `${RETIRED_1024} Susan’s MacBook Pro goes to the bedroom. See Move Susan’s MacBook Pro to the bedroom.` },
  { order: 314, title: 'The Health page and the check commands', detail: 'Built 24 Oct 2026: npm run checks, the Health page, and Run the checks on Jenna’s page.' },
  { order: 327, title: 'Play the W-O-O-F News videos on the TV', detail: 'Built 24 Oct 2026: the TV plays them once the files are in. See Put the bulletin videos in.' },
  { order: 331, title: 'The shopping', detail: `${RETIRED_1024} the bag items are bought. What is left is on The last shopping.` },
]
export const FILED_FOR_1023 = [
  { order: 112, title: 'Make the packing list', note: '(24 Oct 2026: your final 24 items are in. After the deploy, open the workshop once so it loads them, then in Terminal: npm --prefix scripts run pack-bags -- --repack. It prints counts only.)' },
  { order: 114, title: 'The bags packed to Jenna’s list', note: '(24 Oct 2026: four or five things in each bag, and Jenna packs them at the house.)' },
  { order: 124, title: 'The four cat-room codes up', note: '(24 Oct 2026: the same four codes serve Act 2 and Act 4. The living room is the Parlour.)' },
  { order: 301, title: 'Open the TV, the study screen and the iPad', note: '(24 Oct 2026, the device table: the older iPad is the memory match in the Library, ?kiosk=memory; Susan’s MacBook Pro shows Boo’s wall, ?kiosk=boo; the old iPhone 11 is the spare phone.)' },
  { order: 315, title: 'Jenna runs the real checks', note: '(24 Oct 2026: built. Jenna’s page, tab The checks.)' },
  { order: 332, title: 'The full tech run', note: '(24 Oct 2026: the first run is the hardware evening, Monday 2 to Friday 6 November; the second has its own card.)' },
]
// Section 12's "close the card" defaults, and the two answered on 23 Oct.
export const ANSWERED_FOR_1023 = {
  newsVideo: 'Video on the TV',
  bagsAct4: 'They stay: the Act 2 and Act 4 bag clues, and sharing in the Parlour (Jon, 23 Oct 2026)',
  tutorial8: 'Keep it buried',
  stewardPictures: 'No, the blind script is enough',
  partnerAwards: 'Cut them',
  dialMapping: 'Keep it fixed (as built)',
}
// Decisions filed under moments the night no longer has.
export const REFILED_FOR_1023 = {
  bagsAct4: { from: 'act4.bags', to: 'act2.cat' },
  act4Granolia: { from: 'act4.cat', to: 'act4.groups' },
}

// 24 Oct 2026, later: the board made plain for a non-coder (the Game test
// tab's day). The cards that are done marked done; the cards that told Jon
// to type in Terminal reworded as "Ask Claude Code to ...", with the exact
// line kept for Claude Code in `tech` (shown in a closed fold on the
// Timeline); the old words (the living room, the orangery, the freeze,
// Crookshank, nine sounds, the bulletin videos as undecided) replaced; the
// cards that had grown dated corrections rewritten as one instruction each;
// today's hardware jobs and the missing night jobs added, numbered from 460;
// and the decisions tidied. Applied by '2026-10-24-cleanup'. The words a
// rewrite replaces stay on the card (lib/additions.js).
export const CLEANUP_TASKS = [
  // Done today, with no card until now
  { order: 470, moment: 'freeze', status: 'done', who: 'Jon', title: 'Pair the Hue bridge with the brain', detail: 'Done 24 Oct 2026: the brain is paired with the Hue bridge.' },
  { order: 471, moment: 'freeze', status: 'done', who: 'Jon', title: 'Try the hall light from the brain', detail: 'Done 24 Oct 2026: the hall bulb outside the bedroom went red and green from the brain.' },

  // Before the second tech run
  { order: 462, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Add the Holiday String Lights back in the Nanoleaf app', detail: 'Holding their button on 24 Oct reset their wifi. In the Nanoleaf app on your phone, add them again and put them back on the house wifi. Then they can have a fixed address and be tried from the brain.' },
  { order: 463, moment: 'freeze', status: 'todo', who: 'Jon', title: 'The brain’s network cable', detail: 'The brain should be wired to the router, but on 24 Oct its cable adapter showed no link, so it is on wifi. Try another cable, or another socket on the router. If it still will not link, tell Claude Code: wifi works, it is only less steady.' },
  { order: 474, moment: 'freeze', status: 'todo', who: 'Claude Code', by: '2026-11-02', title: 'Set up the study station on the M1 Air', detail: 'On the night the study runs on the M1 Air, by the walls. Bring it up to date and set the study station up there, with the Stream Deck, so Jon can press every button and teach the taps on it.', tech: 'On the M1 Air: the current main (origin/main is behind; pushing is Jon’s call, or copy the repo across), npm install in station/ with the optional @elgato-stream-deck/node, station/.env from station/.env.example with STATION_KEY set to the saved key word, quit the Elgato app, then cd station && npm start.' },
  { order: 464, moment: 'freeze', status: 'todo', who: 'Jon', by: '2026-11-06', title: 'The Stream Deck on the M1 Air', detail: 'Once Claude Code has set up the study on the M1 Air: plug the Stream Deck into it by the walls and press every button once. Then teach the taps (the card Teach the taps on the white wall).' },
  { order: 465, moment: 'freeze', status: 'todo', who: 'Jon', title: 'Fixed addresses on the router', detail: 'In the router’s app, give a fixed address to the brain, the Hue bridge, both Nanoleaf controllers (the study walls) and the Holiday String Lights, so none of them moves on the night. Ask Claude Code if you want a hand.' },
  { order: 466, moment: 'freeze', status: 'todo', who: 'Claude Code', by: '2026-10-31', title: 'The party-night dry run on the real secrets', detail: 'After the cats’ leans and the drawing pictures are made: eight fake phones play a party night on the real secrets and throw it away. It prints counts and PASS or FAIL only. Jon closes the TV and the room screens and keeps his phone off the game while it runs.', tech: 'GOOGLE_APPLICATION_CREDENTIALS=scripts/service-account.json npm run fake-night -- --real-secrets --live --i-know-this-is-the-party-database (it refuses while any night is live).' },
  { order: 475, moment: 'freeze', status: 'todo', who: 'Claude Code', by: '2026-11-02', title: 'A Start button on the brain’s and the study’s desktops', detail: 'On the night nobody can wait on a chat to bring a machine up. Put a Start the brain button on the M3 Air’s desktop and a Start the study button on the M1 Air’s: a double-click opens a window that runs it and stays open all night. Jon tries each once, on the first full tech run.', tech: 'A .command file on each desktop that cds into the repo (an absolute path, not the file’s own folder) and runs npm start in cues/ (the brain) or station/ (the study), in a visible Terminal window; chmod +x. Then the Devices page and cards 121 and 122 are true.' },
  { order: 472, moment: 'freeze', status: 'todo', who: 'Claude Code', title: 'Run the checks once, so the Health page has a result', detail: 'The Health page has never had a result. Run the checks once; they print counts only.', tech: 'npm run checks (it saves the counts for the Health page unless --local).' },

  // The study's two: teaching the taps waits on the M1 Air; the key word can be saved now
  { order: 460, moment: 'freeze', status: 'todo', who: 'Jon', by: '2026-11-06', title: 'Teach the taps on the white wall', detail: 'After Claude Code has set up the study on the M1 Air (the card Set up the study station on the M1 Air): stand at the white wall with your phone, open the Game test tab, and under Granolia’s Lightbulb Moment tap Teach the taps. Touch each hexagon when it asks. The taps are kept on the Mac that runs the study, so they must be taught while the M1 Air runs it. Two of ten were taught on 24 Oct, on another Mac, and nothing was kept.', tech: 'station/lib/teach.js writes station/touch-map.json on whichever Mac runs the station; copy it across if taught on another.' },
  { order: 461, moment: 'setup', status: 'todo', when: 'now', who: 'Jon', by: '2026-10-26', title: 'Save the study key word', detail: 'At the top of the Game test tab, type the key word the study station and the brain already use, and tap Save. Not sure what it is? Ask Claude Code to save it for you: it copies it across without showing it. Until it is saved, the game turns the study station away, and the brain skips the bulletin 2 recordings. It is kept from night to night.', tech: 'meta/game.station_key must equal STATION_KEY in station/.env and cues/.env (functions/lib/station.js stationAllowed). To save it for Jon: copy STATION_KEY from station/.env into meta/game.station_key with the Admin SDK, without printing it.' },

  // On every phone, all night
  { order: 469, moment: 'allnight', status: 'todo', who: 'Claude chat', title: 'Achievements: write twenty', detail: 'The Achievements list is empty, so the Host tab has none to give and the end credits skip them. Write twenty, a title and one line each, in a Claude chat handoff. Claude Code copies them into the workshop.' },

  // Act 4
  { order: 473, moment: 'act4.study', status: 'todo', who: 'Claude Code', title: 'Put Granolia’s new study words in (the default)', detail: 'Unless you pick Keep the old words on the question above: Granolia’s hello when a group reaches the Study changes to the new words, which say to touch the wall first and use the buttons at the end.', tech: 'functions/lib/hosts.js HOST_LINES.granolia; the words are in docs/study-light-game.md section 11.' },
  { order: 467, moment: 'act4.orangerie', status: 'todo', when: 'later', who: 'Jon and Susan', title: 'Clear the Orangerie table after supper', detail: 'After supper, before you press Start Act 4: clear the table, so a group has room to stand and shake their phones for Get Off My Lawn!' },
  { order: 468, moment: 'act4.entryway', status: 'todo', when: 'later', who: 'Jon', title: 'Fan lights off for Boo’s Catwalk', detail: 'All through Act 4, keep the Parlour fan’s lights off so Boo’s wall shows on the triangle wall. On the hardware evening, aim the projector so its beam misses the fan.' },
]

// The cards that are done in fact, marked done once with the reason.
export const RETIRED_FOR_CLEANUP = [
  { order: 105, title: 'Make the stand-in sounds on the brain', detail: 'Done 24 Oct 2026: a simple tone is on the brain for all ten sounds, chime-phone included.' },
  { order: 112, title: 'Make the packing list', detail: 'Done 24 Oct 2026: packed on your final 24 items. Ten bags, every rule passed, every bag with three clue words.' },
  { order: 307, title: 'Music for dinner', detail: 'Replaced 24 Oct 2026: the Supper playlist on the brain. See Three playlists on the brain.' },
  { order: 328, title: 'A Drawing pictures tab for Jenna', detail: 'Not needed: you answered no, the blind script is enough.' },
  { order: 341, title: 'Refresh what Claude chat knows', detail: 'Done 23 Oct 2026 by Claude chat (the 23 Oct handoff, section 14).' },
  { order: 342, title: 'Finish the lists the leans and the packing read', detail: 'Done 24 Oct 2026: your 24 bag items and the seventeen Parlour Games are in.' },
  { order: 344, title: 'Deploy before the practice game', detail: 'Done 24 Oct 2026: deployed.' },
]

// The ten sound cards: the Parlour TV, a simple tone already playing (the
// stand-ins were made on 24 Oct), and the file handed to Claude Code.
const soundRewrite = (order, id, when, length = 'Two to five seconds') => ({
  order, title: `Sound: ${id}`,
  set: {
    detail: `Plays when ${when}. ${length}, with one second of silence first. Name the file ${id} and give it to Claude Code, which puts it on the brain in place of the simple tone that plays there now.`,
    tech: `media/${id}.m4a (or .mp3, .wav or .aiff) on the brain, and delete the stand-in media/${id}.wav. media/README.md lists all ten.`,
  },
})

// Cards whose words change, not grow: one clean instruction each.
export const REWRITTEN_FOR_CLEANUP = [
  soundRewrite(134, 'blackout', 'every phone goes dark at the end of Act 1'),
  soundRewrite(140, 'power', 'the power returns and Act 2 begins'),
  soundRewrite(141, 'chime-news', 'the news flash comes up on the Parlour TV'),
  soundRewrite(152, 'sounder-bulletin', 'W-O-O-F News bulletin 2 starts, near the end of supper'),
  soundRewrite(160, 'sting-solved', 'a group solves the study'),
  soundRewrite(171, 'chime-irwin', 'Sir Irwin is about to speak on the Parlour TV'),
  soundRewrite(181, 'sting-door', 'the third drawing is named and the bedroom door opens'),
  soundRewrite(190, 'sting-reveal', 'the reveal begins on the Parlour TV'),
  soundRewrite(191, 'sting-result', 'every phone shows its own result'),
  soundRewrite(420, 'chime-phone', 'supper is ready, Act 4 starts, each Act 4 round changes, and the Act 6 Parlour Games open (every phone chimes too)', 'About one second'),

  // Before the second tech run
  { order: 103, title: 'The hardware evening', set: { title: 'The hardware check, on the hardware evening', by: '2026-11-06', detail: 'With the study walls, the Stream Deck and the hall bulb plugged in, ask Claude Code to run the hardware check: it says pass or fail for each. Already done on 24 Oct: the Hue bridge is paired, the hall bulb went red and green from the brain, and both study walls show the game’s lights. Then one round of the study and one grid of the drawing.', tech: 'node scripts/hardware-check.mjs' } },
  { order: 111, title: 'Make the cats’ leans', set: { who: 'Claude Code', title: 'Make the cats’ leans', detail: 'Claude Code runs it: it works out which way each cat leans in the Parlour Games without anyone seeing it, and says only how many it made. Before Saturday 31 October, ahead of the party-night dry run. Then Jenna may look them over on their page.', tech: 'npm --prefix scripts run leans (counts and PASS or FAIL only; needs scripts/.env). It must never overwrite a lean Jenna changed.' } },
  { order: 214, title: 'Make the drawing pictures', set: { who: 'Claude Code', title: 'Make the drawing pictures', detail: 'Claude Code runs it: it draws the three real pictures for Sir Irwin Needs a Hand without anyone seeing them, and says only how many it made. Until then a rehearsal uses made-up pictures. Before Saturday 31 October, ahead of the party-night dry run.', tech: 'npm --prefix scripts run relay-pictures (counts and PASS or FAIL only).' } },
  { order: 313, title: 'READ-FIRST and the cat lore', set: { title: 'The cat lore: Salem’s and Boo’s new Trusting lines', detail: 'READ-FIRST was rewritten on 23 Oct. What may be left: cat-lore-final.md gets the same new Trusting lines for Salem and Boo as the game has. Open a Claude chat in the project and check.' } },
  { order: 315, title: 'Jenna runs the real checks', set: { detail: 'On their page, tab The checks: once the cats’ leans and the drawing pictures are made, Jenna presses Run the checks. Each check shows pass or fail, with its number. Jenna tells Jon only done or needs more.' } },
  { order: 317, title: 'Jenna reads the lists cold', set: { detail: 'The rules, the fourteen characters, the Parlour Games and the cat lines, in the order the For Jenna page gives. Under each list Jenna marks Reads clearly or Needs another look. Before the second tech run, Wednesday 11 November.' } },
  { order: 322, title: 'The Orangerie HomePod in the brain’s speakers', set: { title: 'All four HomePods in one AirPlay group on the brain', moment: 'freeze', detail: 'Every sound, the music and bulletin 2 play from the brain through one AirPlay group of all four HomePods: the Entryway, the Study, the Orangerie, and the fourth where you put it (the Parlour is the obvious place). On the brain, make the group and pick it as the sound output. Then ask Claude Code to play a test chime, and listen for it in every room.', tech: 'afplay media/chime-news.wav on the brain.' } },
  { order: 329, title: 'Install Java once, for the rules test', set: { who: 'Claude Code', title: 'Install Java and run the rules test', detail: 'The rules test proves Jon’s account cannot read the secrets. It reports pass or fail only. Installing Java may ask Jon to type his Mac password once.', tech: 'brew install --cask temurin, then npm run test:rules.' } },
  { order: 330, title: 'The .env files for the study and the brain', set: { who: 'Claude Code', title: 'The settings files for the study and the brain', detail: 'The brain’s file has the key word, the Hue key and the Nanoleaf tokens (24 Oct). Two things are left: the string lights’ two lines are not named the way the brain reads them, and the study’s file goes onto the M1 Air when the station moves there.', tech: 'cues/.env: rename NANOLEAF_STRING_HOST and NANOLEAF_STRING_TOKEN to NANOLEAF_STRINGS_HOST and NANOLEAF_STRINGS_TOKEN (cues/cues.mjs reads those). station/.env on the M1 Air from station/.env.example, STATION_KEY set to the saved key word. Never commit either file, never print a value.' } },
  { order: 332, title: 'The full tech run', set: { title: 'The first full tech run (the hardware evening)', by: '2026-11-06', detail: 'A rehearsal night with every machine on at once, Monday 2 to Friday 6 November: the brain and the four HomePods, the Parlour TV, the captions iPad, the older iPad, Boo’s wall on the projector, the study station and walls, the hall bulb, and two phones. Press Next from Act 1 to Act 7 and check every sound plays and every screen changes on its own. The second run has its own card.' } },
  { order: 421, title: 'Three playlists on the brain', set: { detail: 'In Apple Music on the M3 Air, three playlists named exactly Murderwin · Arrival (Acts 1 and 5), Murderwin · Investigation (Acts 2, 4 and 6) and Murderwin · Supper (Act 3). A hyphen in place of the dot works too. Curating only. Then ask Claude Code to switch the music on. The brain plays each at its act and ducks it under the news.', tech: 'MUSIC=on in cues/.env; npm start -- --check-music once, for the Music permission.' } },
  { order: 422, title: 'Four Hue scenes', set: { detail: 'In the Hue app, four scenes named exactly Murderwin Arrival (Acts 1, 5 and 7), Murderwin Blackout (every Hue light off), Murderwin Lights Out (dim amber, Acts 2, 3, 4 and 6) and Murderwin Reveal (from the Act 7 reveal). Leave the hall bulb outside the bedroom out of all four, so it keeps its red and green: give it a Hue room of its own first. Then ask Claude Code to switch the scenes on. Nothing waits on a light.', tech: 'HUE_SCENES=on in cues/.env; the names are in cues/scenes.json.' } },
  { order: 423, title: 'Try the string lights from the brain', set: { detail: 'On the hardware evening, once the string lights are back in the Nanoleaf app and have a fixed address: ask Claude Code to connect them to the brain and try them. If they will not answer, stop there: Get Off My Lawn! runs on the phones alone.', tech: 'NANOLEAF_STRINGS_HOST and NANOLEAF_STRINGS_TOKEN in cues/.env; npm start -- --check-strings.' } },
  { order: 424, title: 'The projector for Boo’s wall', set: { detail: 'Borrow the work projector and a short HDMI cable. On the hardware evening: Susan’s MacBook Pro on the upstairs landing, showing Boo’s wall (the Devices page has its address), aimed at the triangle wall above the Parlour opening, with the beam clear of the fan.', tech: '?kiosk=boo' } },

  // The weeks before
  { order: 115, title: 'A dry run with eight fake players', set: { title: 'Ask Claude Code for a dry run with eight fake players', detail: 'Eight fake phones play a whole rehearsal night and throw it away. It says one line per act and PASS or FAIL. Nothing it prints is a clue.', tech: 'npm run fake-night' } },
  { order: 435, title: 'The last deploy', set: { title: 'Ask Claude Code to put the last changes live', detail: 'In the checks-and-fixes days, Thursday 12 to Saturday 14 November, after every picture, sound and video is in. Anything added after it is not in the party.', tech: 'git pull (for any picture added on the GitHub website), then npm run deploy.' } },

  // Setting up the house
  { order: 114, title: 'The bags packed to Jenna’s list', set: { moment: 'setup', detail: 'At the house, before the guests arrive: Jenna packs four or five things into each numbered bag, exactly as their page says, and keeps the bags closed. Nobody who plays watches.' } },
  { order: 120, title: 'Router, Hue bulb and both Nanoleaf controllers on', set: { title: 'Router, Hue bridge and bulb, both Nanoleaf controllers and the string lights on', detail: 'First of all. Give them five minutes.' } },
  { order: 121, title: 'Start the brain', set: { detail: 'On the M3 Air: network cable in, sleep off. Double-click Start the brain on its desktop; a window opens and stays open all night. It will not start while any of the ten sounds is missing, and says which.', tech: 'The desktop button (card 475) runs cd cues && npm start in a Terminal window Jon can see. Until it exists, Claude Code runs that line.' } },
  { order: 122, title: 'Start the study', set: { detail: 'On the M1 Air: quit the Elgato app, then double-click Start the study on its desktop; a window opens and stays open all night. The study key word must already be saved on the Game test tab; it is kept from night to night.', tech: 'The desktop button (card 475) runs cd station && npm start (STATION_KEY in station/.env must match the saved key word). Until it exists, Claude Code runs that line.' } },
  { order: 124, title: 'The four cat-room codes up', set: { detail: 'One square code in each cat’s room: Granolia in the Study, Salem in the Orangerie, Zimothy in the Library, Boo in the Entryway. None in the Parlour. The same four codes serve Act 2 and Act 4. Print them from the Game night page.' } },
  { order: 125, title: 'Set the orangery table', set: { title: 'Set the Orangerie table' } },
  { order: 126, title: 'Charge everything', set: { detail: 'Every phone, iPad and laptop, the old iPhone 11 spare included. Spare phone chargers in the Orangerie for supper.' } },
  { order: 301, title: 'Open the TV, the study screen and the iPad', set: { title: 'Open the Parlour TV, the study screen and the captions iPad', detail: 'The Parlour screen on your work MacBook Pro on the TV. The study screen on the M1 Air. The captions screen on your iPad Pro, on its stand in the Orangerie, for supper. Tap each one once to wake it. The Devices page has every address, with a square code for each. The older iPad and Susan’s MacBook Pro have their own cards.', tech: '?kiosk=living, ?kiosk=study, ?kiosk=ipad' } },
  { order: 430, title: 'The older iPad in the Library', set: { detail: 'On its small stand, with Zimothy: open the memory match (the Devices page has its address) and tap once to wake it. It stays there all night and waits for each group.', tech: '?kiosk=memory' } },

  // Act 1
  { order: 311, title: 'Paste the new Trusting lines', set: { who: 'Claude Code', title: 'Put the new Trusting lines on Salem’s and Boo’s cards', detail: 'Meet the household. Salem’s card gets the new Trusting Salem line: “Most days, he’s got it backwards, so flip whatever he tells you. Win him over and he might set it straight. Only a true friend gets it right every time.” Save it once so its heading reads Salem Crooknog: under the old heading, Crookshank, the phones skip the card. On Boo’s card, check that Trusting Boo reads: “The more she likes you, the more she’ll say. Bore her and you get a look. Win her over and she might be useful.”' } },

  // Act 2 and Act 3: the bulletins, decided
  { order: 200, title: 'Record W-O-O-F News bulletin 1', set: { detail: 'Video, on the Parlour TV (decided 23 Oct). Ava on camera for the opening and the sign-off, and the five family clips over B-roll. Every line is in the W-O-O-F News Recording Script. Keep a sound recording of each part too: the brain plays those if the video cannot.' } },
  { order: 201, title: 'The W-O-O-F News graphics', set: { detail: 'The logo, the lower thirds and the studio look, for the two bulletin videos.' } },
  { order: 426, title: 'Put the bulletin videos in', set: { detail: 'When bulletin 1 and the closing bulletin are cut: give Claude Code one video file per part, named as the W-O-O-F News Recording Script names each part. It puts them in and puts them live. Then tick The bulletins are videos on the Game night page. Until then the brain plays your recordings and the TV shows the words.', tech: 'play/public/video/<clip>.mp4, the clip names in seed/woof-news.json.' } },
  { order: 150, title: 'Dinner on the table in the orangery', set: { title: 'Supper on the table in the Orangerie' } },
  { order: 202, title: 'Record the 25 lines of bulletin 2', set: { detail: 'Audio only: five families, five dial levels each, plus the opening and the sign-off. The lines are in the W-O-O-F News Recording Script. Near the end of supper it plays on all four HomePods, with its words on the Orangerie iPad. Who reads them is the question above.' } },
  { order: 337, title: 'Update your Apple Reminder about bulletin 2', set: { detail: 'It still has the old design. Change it to: Bulletin 2: record 25 audio lines (5 families x 5 dial levels) from the W-O-O-F News Recording Script. Arm it from my phone near the end of supper; it plays on all four HomePods 3 to 5 minutes later. Or delete it and use the card Record the 25 lines of bulletin 2.' } },

  // Act 4
  { order: 432, title: 'Try Get Off My Lawn! on two phones', set: { detail: 'On the Game test tab: open the Get Off My Lawn! practice and join from two phones. Red: shake. Green: freeze. Then tell Claude Code, from the same tab, whether the shake feels too touchy or too dull.' } },
  { order: 433, title: 'Runway music for Boo’s Catwalk (optional)', set: { detail: 'Today the wall plays a simple beat. For a real song, give it to Claude Code, which puts it in and puts it live.', tech: 'play/public/boo/catwalk.mp3, then deploy.' } },

  // Act 5
  { order: 309, title: 'Draw the nineteen motive cards', set: { detail: 'One picture per motive, numbered 1 to 19 by the motive’s number. "The last of the pie" shows pizza, not apple pie. Give them to Claude Code, which puts them in. Until a picture is in, the card shows the rhyme.', tech: 'play/public/motives/<number>.png, 1 to 19, then deploy; card 308 shows them.' } },
  { order: 429, title: 'Move Susan’s MacBook Pro to the bedroom', set: { detail: 'After Act 4, carry it from the landing into the bedroom, open the bedroom screen (the Devices page has its address), tap once and close the door. It shows nothing until the third drawing is named.', tech: '?kiosk=bedroom' } },

  // Act 7
  { order: 203, title: 'Record the closing bulletin', set: { detail: 'Video, on the Parlour TV (decided 23 Oct). Ava in the studio, Mic outside the manor on the green screen. Generic lines only: the game cuts in the three name cards, so you never need the answer. Keep a sound recording of each part too, as the fallback.' } },
  { order: 205, title: 'A candle in the Medium\'s portrait', set: { detail: 'Her trace is lilac candle wax, and players match traces to people from the portraits. Then give the new picture to Claude Code, which puts it in the game.', tech: 'play/public/portraits/mourningstone.png, then deploy.' } },
  { order: 215, title: 'A photo of Sydney for the end credits', set: { detail: 'Give the photo to Claude Code, which puts it in the end credits. Without it his card shows his name only.', tech: 'play/public/household/sydney.jpg, then deploy.' } },
]

// The question the study light game raised (docs/study-light-game.md
// section 11). Jon's to answer; the default is the new words (card 473).
export const CLEANUP_DECISIONS = [
  { key: 'worstDial', moment: 'freeze', question: 'The check that every guest can still find two of the three answers when the dial is at its foggiest: build it before the second tech run, or after the party?', options: ['After the party', 'Before the second tech run'], answer: null, note: 'Default: after the party. A check that the motive can always be found already runs.' },
  { key: 'granoliaIntro', moment: 'act4.study', question: 'Granolia’s hello when a group reaches the Study says “Copy it on the buttons”, but the puzzle is played by touching the wall. Change it to the new words?', options: ['The new words: touch the wall, then the buttons', 'Keep the old words'], answer: null, note: 'Default: the new words, which Claude Code puts in unless you pick Keep the old words. They read: “Oh! You’re here! The wall flashes a pattern. Touch the same lights in the same order. Do that three times, then press the colour and the number on the buttons, and press submit. Made a mistake? Press undo. I used to know the whole pattern, but... yeah.”' },
]

// Decisions moved or reworded. act4Granolia is retired (Act 4 has no cat
// station), tidyFolders is repo housekeeping that Claude Code asks Jon
// about when it gets there, and three decisions lose the old room names.
// A decision is matched by the moment it is still filed under.
export const REFILED_FOR_CLEANUP = {
  act4Granolia: { from: 'act4.groups', to: 'retired', set: { retired: true, note: 'Retired 24 Oct 2026: Act 4 is four game rooms, so there is no cat station to send a group anywhere.' } },
  tidyFolders: { from: 'freeze', to: 'freeze', set: { who: 'Claude Code', question: 'Tidy two old folders inside the Murderwin folder? Nothing is deleted.', note: 'Housekeeping in the Murderwin folder, nothing the night needs. Claude Code asks you once, when it gets there. Default: yes, tidy them; nothing is deleted.' } },
  rulesDeckScreen: { from: 'act1.arrive', to: 'act1.arrive', set: { options: ['The Parlour TV, back to the game before the blackout', 'Another screen (the iPad Pro, or a phone on the TV)'] } },
  newsVideo: { from: 'act2.news', to: 'act2.news', set: { question: 'W-O-O-F News bulletin 1 and the closing bulletin: video on the Parlour TV, or your recordings as sound with the words on screen?' } },
  ipadDinner: { from: 'act3.down', to: 'act3.down', set: { question: 'The iPad through supper: the captions screen in the Orangerie, or the spare phone only?', options: ['Captions in the Orangerie', 'Spare phone only'] } },
}

// 24 Oct 2026, evening: docs/handoff-2026-10-24.md, from a Claude chat. Jon
// cast the news team (Jon plays Mic Cameron, Susan plays Ava Waves), set up
// the practice run on Sunday 25 October, and answered bulletin2Voice (Susan
// reads bulletin 2, as Ava Waves), bulletin2Known (accepted) and worstDial
// (build the proof now, before the second tech run; Claude chat builds it
// and sends a patch). The recording cards get their new owners and the dates
// Where we are plans (the sounds by 30 October, bulletin 2 by 6 November,
// the videos and the graphics by 8 November); the two bulletin 2 questions
// name the cast; the three answers go on the board where it has none yet
// (the live board has Claude chat's already); six questions answered on
// 31 August, which later decisions replaced, say what is true now (the old
// answer is kept on each); the morning-after reveal and the pose photo are
// for now, not after the party (Jon: as soon as possible); and four new
// cards, numbered from 476. Applied by '2026-10-24-news-cast'.
export const NEWS_CAST_TASKS = [
  { order: 476, moment: 'setup', status: 'todo', when: 'now', who: 'Jon and Susan', by: '2026-10-25', title: 'The practice run, Sun 25 Oct', detail: 'A rehearsal night, the whole night, Acts 1 to 7, with every screen on: the Parlour TV, the study on the M1 Air with the walls and the Stream Deck, the older iPad, the iPad Pro, Susan’s MacBook Pro and the brain. You and Susan play, with the spare iPhone 11 as a third player. Follow the run sheet: https://claude.ai/artifact/3Ekk4JUd8VpN31NJWx56AK. Note anything that feels wrong on the Game test tab or tell Claude Code.' },
  { order: 477, moment: 'freeze', status: 'todo', who: 'Claude chat', title: 'Refresh the claude.ai project’s copies', detail: 'Two copies in the claude.ai project are out of date. Its CLAUDE.md still says the freeze is 7 November: replace it with the repo’s CLAUDE.md, which has no freeze date (the last new feature lands Wednesday 11 November). Its copy of the 23 Oct handoff still says it is not yet applied: replace it with the repo’s copy, marked Applied 24 Oct 2026. Open a Claude chat in the project to do both.' },
  { order: 478, moment: 'freeze', status: 'todo', who: 'Claude Code', by: '2026-11-11', title: 'Put in the worst-dial proof when Claude chat sends it', detail: 'You answered build it now (24 Oct): the check that every guest can still find two of the three answers when the dial is at its foggiest. Claude chat is building it and sends it with how to put it in. Claude Code puts it in and runs every test, before the second tech run. Claude Code does not start it on its own.', tech: 'docs/patches/2026-10-24-worst-dial.patch (not there yet on 24 Oct), applied as its own notes say. Checks G07, G08 and G42 (the bag solver at dial 1) in docs/test-plan.md; mark their rows when it is in.' },
  { order: 479, moment: 'freeze', status: 'todo', who: 'Claude Code', by: '2026-11-11', title: 'The checks the test plan still has as Not yet', detail: 'You asked on 24 Oct for everything left to be built as soon as possible. The test plan lists every check the game should pass; the ones with no test yet get one, each printing pass or fail only, before the second tech run.', tech: 'docs/test-plan.md, What is left (24 October), items 2 to 6: first F11, F09, G05 (both host seats), G03, G19, F22, F23 and F25, then the rest marked Not yet in the table (G07, G08 and G42 come with the worst-dial patch, card 478; G22 with replay by seed, card 324). Rename the tests with no ID, and add each to npm run checks.' },
]

// The Claude chat card the new one takes in.
export const RETIRED_FOR_NEWS_CAST = [
  { order: 440, title: 'Mark the project copy of the 23 Oct handoff Applied', detail: 'Replaced 24 Oct 2026: part of Refresh the claude.ai project’s copies.' },
]

// The dates Where we are plans, given only to a card that has none (a date
// Jon set himself stands).
const SOUND_CARDS = [[134, 'blackout'], [140, 'power'], [141, 'chime-news'], [152, 'sounder-bulletin'], [160, 'sting-solved'], [171, 'chime-irwin'], [181, 'sting-door'], [190, 'sting-reveal'], [191, 'sting-result'], [420, 'chime-phone']]
export const FILED_FOR_NEWS_CAST = [
  ...SOUND_CARDS.map(([order, id]) => ({ order, title: `Sound: ${id}`, by: '2026-10-30' })),
  { order: 200, title: 'Record W-O-O-F News bulletin 1', by: '2026-11-08' },
  { order: 201, title: 'The W-O-O-F News graphics', by: '2026-11-08' },
  { order: 202, title: 'Record the 25 lines of bulletin 2', by: '2026-11-06' },
  { order: 203, title: 'Record the closing bulletin', by: '2026-11-08' },
]

// The three recording cards, with the new cast (bulletin2Voice answered:
// Susan reads bulletin 2, as Ava Waves). And the two Claude Code cards Jon
// wants built as soon as possible, not after the party.
export const REWRITTEN_FOR_NEWS_CAST = [
  { order: 200, title: 'Record W-O-O-F News bulletin 1', set: { who: 'Susan', detail: 'Video, on the Parlour TV. Susan reads the opening and the sign-off on camera as Ava Waves, and the five family clips go over B-roll. Every line is in the W-O-O-F News Recording Script. Keep a sound recording of each part too: the brain plays those if the video cannot.' } },
  { order: 202, title: 'Record the 25 lines of bulletin 2', set: { who: 'Susan', detail: 'Audio only: five families, five dial levels each, plus the opening and the sign-off. Susan reads them all as Ava Waves (you decided on 24 Oct). The lines are in the W-O-O-F News Recording Script. Near the end of supper it plays on all four HomePods, with its words on the Orangerie iPad.' } },
  { order: 203, title: 'Record the closing bulletin', set: { who: 'Jon and Susan', detail: 'Video, on the Parlour TV. Susan, as Ava Waves, opens and closes it in the studio; you, as Mic Cameron, do the four field parts outside the manor on the green screen. Generic lines only: the game cuts in the three name cards, so neither of you needs the answer. Keep a sound recording of each part too, as the fallback.' } },
  { order: 196, title: 'The morning after: open the case to you', set: { who: 'Claude Code', when: 'now', detail: 'Not built yet. Built now, used after the party (you asked on 24 Oct for it as soon as possible): once a post-party switch is flipped, the case that ran opens to you, it is archived, and you decide whether to keep or clear the secrets.' } },
  { order: 450, title: 'The pose photo for the end credits (nice to have)', set: { detail: 'Not built yet. You asked on 24 Oct for it as soon as possible, with the rest. The iPad Pro in the Entryway takes one photo of each group’s last pose for the credits.' } },
]

// The answers Jon gave on 24 Oct, evening, for a board that has none yet,
// and the two the live board has had since 31 Aug and 8 Oct (the Canon
// copied them that evening). The live board has every one already, and an
// answer is never overwritten.
export const ANSWERED_FOR_NEWS_CAST = {
  bulletin2Voice: 'Ava Waves (Susan)',
  bulletin2Known: 'Accept it',
  worstDial: 'Before the second tech run',
  grossnola: 'Keep it offstage',
  swapMotive: 'Keep all 19',
}

// worstDial on the live board was made by Claude chat: filed under the
// freeze rows if it came with no moment (never moved if it has one).
export const FILED_DECISIONS_FOR_NEWS_CAST = { worstDial: 'freeze' }

// The two bulletin 2 questions with the new cast, and the worst-dial question
// (the cleanup's) naming its checks, each saying what Jon answered. An
// answer that was one of the old options moves to the new one in its place.
export const REFILED_FOR_NEWS_CAST = {
  bulletin2Voice: { from: 'act3.bulletin', to: 'act3.bulletin', set: { question: 'Who reads the 25 lines of bulletin 2?', options: ['Ava Waves (Susan)', 'Mic Cameron (Jon)', 'Someone else'], note: 'Answered 24 Oct 2026: Ava Waves, so Susan reads them. The card Record the 25 lines of bulletin 2 is hers.' } },
  bulletin2Known: { from: 'act3.bulletin', to: 'act3.bulletin', set: { question: 'Whoever records bulletin 2 knows which family each line points at. Accept?', options: ['Accept it', 'Someone who does not play records them'], note: 'Answered 24 Oct 2026: accepted, since Susan records the lines. Every line is open for anyone to read anyway; only which one plays on the night is secret.' } },
  worstDial: { from: 'freeze', to: 'freeze', set: { note: 'Answered 24 Oct 2026: build it now (“All needs to be built as soon as possible”). These are checks G07 and G08 in the test plan, with G42, the bag solver at dial 1. Claude chat is building it and sends it to Claude Code to put in (card 478). A check that the motive can always be found (G32) already runs.' } },
}

// Six questions answered on 31 August that later decisions replaced. Each
// answer becomes one plain line saying what is true now (CLAUDE.md and the
// Canon); the 31 August answer is kept on the decision.
export const SUPERSEDED_FOR_NEWS_CAST = {
  acts35: 'Replaced 22 and 23 Oct 2026: at supper (Act 3) the bags come to the table, everyone shares, and W-O-O-F News bulletin 2 plays; at dessert (Act 5) there is the cake, then Sir Irwin’s countdown of motive cards.',
  affectionEconomy: 'Replaced 12 and 22 Oct 2026: affection moves only through the Parlour Games, and the Salem petted button puts one guest’s Salem at 5.',
  salemSgtMajor: 'Replaced 22 Oct 2026: everyone starts at 3 with Salem, whatever their job, so no job counts with him.',
  eventDeck: 'Replaced 22 Oct 2026: there are no hidden events in any act; the Parlour Games are the only events, and the Murderer’s and the Ghost’s answers move the clarity dial.',
  scoring: 'Replaced 22 Oct 2026: everyone wins the same way, by naming the Murderer, the Motive and the Victim; each phone shows how many of the three it got, and the awards come in the end credits.',
  clueChannels: 'Replaced 21 to 23 Oct 2026: only the bags and the traces point at a person; Act 2 bag clues are about the Murderer, Act 4 bag hints about the Ghost, the study shows the Ghost’s trace and the bedroom screen the Murderer’s.',
}

// 25 Oct 2026: the 24 Oct evening handoff's item 4 built by Claude Code (the
// Home rows, the motive card pictures, the morning after, replay by seed, the
// pose photo, the test plan's Not yet checks). The build cards marked done;
// Jon's two new jobs on the night (Boo's camera, the morning after) and one
// before it (try Boo's camera), numbered from 480. Applied by '2026-10-25-item4'.
const BUILT_1025 = 'Built 25 Oct 2026:'
export const ITEM4_TASKS = [
  { order: 480, moment: 'after', status: 'todo', when: 'later', who: 'Jon', title: 'Open the case, the morning after', detail: 'On the Game night page, under After the party: The morning after. It opens only once the party night’s reveal has played to the end, on the party day or later. Type OPEN, read what really happened, then choose Keep the secrets or Clear the secrets (the archive keeps a copy either way). Then untick This is the party night.' },
  { order: 481, moment: 'act4.warn', status: 'todo', when: 'later', who: 'Jon', title: 'Boo’s camera: the iPad Pro to the Entryway (nice to have)', detail: 'After supper, before you press Start Act 4, carry the iPad Pro from the Orangerie to the end of the catwalk, facing where the group poses. Open Boo’s camera (the Devices page has the address and a square code), full screen, and tap Turn on the camera. It takes one photo of each group’s last pose for the end credits. Skip it and the catwalk runs the same.', tech: '?kiosk=pose' },
  { order: 482, moment: 'act4.entryway', status: 'todo', who: 'Jon', title: 'Try Boo’s camera on the Game test tab (nice to have)', detail: 'Game test tab, Boo’s Catwalk: open Boo’s camera, the practice show, on the iPad Pro, stand it facing you and tap Turn on the camera, then Start the show. At the last pose it takes a photo and keeps it on its own screen; nothing is sent. Note anything wrong in the box.', tech: '?kiosk=pose&practice=1' },
]
// Two questions the test plan's checks turned up (card 479), each with what
// is built as the default, and stringsLead (below).
export const ITEM4_DECISIONS = [
  { key: 'dialSpill', moment: 'act2.news', question: 'After Spill the Beans, does the clarity dial start again in the middle, or keep where it was?', options: ['Start again in the middle (as built)', 'Keep where it was'], answer: null, note: 'Default: start again, as built (a spill also clears the Hush). The Canon says the dial never resets, so the checks found the two disagree. A spill only works at the very start of Act 2, before any clue, so the dial has barely moved by then either way.' },
  // and one from the house's hardware the same day (the lighting and audio session): the string
  // lights run through Apple Home and trail the phones by a second or two
  { key: 'stringsLead', moment: 'act4.orangerie', question: 'The string lights lag 1 to 2 seconds behind the phones (Apple Home). Salem’s intro says “Watch the lights, not your phones”. Change it so the phones lead?', options: ['The phones lead: change Salem’s line', 'Keep the line'], answer: null, note: 'Default: the phones lead. In Get Off My Lawn! the colour flips every 1.5 to 6.5 seconds, so anyone following the lights would be blamed for slips; the phones change colour on time. Nothing is built yet: if you keep the default, Claude chat rewrites Salem’s intro and ready lines (handoff of 23 Oct, section 9.6) and Claude Code copies them in.' },
  { key: 'senseClue', moment: 'act2.cat', question: 'In a small party (four to six guests), about once in a thousand deals a cat’s vaguest bag clue (a sense only) points at the Murderer’s bag alone. Leave it, or have Claude Code rule it out?', options: ['Leave it: it never happens at nine guests', 'Rule it out'], answer: null, note: 'Default: leave it, as built. In 2,000 deals each at eight, nine and ten guests it never happened. It is check G09 in the test plan.' },
]
export const RETIRED_FOR_ITEM4 = [
  { order: 343, title: 'Home rows for the leans, the packing list and the pictures', detail: `${BUILT_1025} Home shows the packing list (made or not), the cats’ leans (questions with every lean, of all of them) and the drawing pictures (good ones, of nine). Numbers only.` },
  { order: 308, title: 'Show the motive card pictures', detail: `${BUILT_1025} each picture shows beside its motive in Sir Irwin’s countdown and on the motive’s card at the reveal; the rhyme alone until it is in. Drawing them is the card Draw the nineteen motive cards.` },
  { order: 196, title: 'The morning after: open the case to you', detail: `${BUILT_1025} on the Game night page, under After the party. Your card for the morning after is Open the case, the morning after.` },
  { order: 324, title: 'Replay a night by its seed', detail: `${BUILT_1025} every rehearsal is dealt from a seed word. The Game night page lists the last five, and Play it again deals one again. Never the party.` },
  { order: 450, title: 'The pose photo for the end credits (nice to have)', detail: `${BUILT_1025} Boo’s camera on the iPad Pro. Each group’s last pose shows in the end credits. Your cards: Try Boo’s camera on the Game test tab, and Boo’s camera: the iPad Pro to the Entryway.` },
  { order: 423, title: 'Try the string lights from the brain', detail: 'Done 25 Oct: the brain runs three Apple Shortcuts (Red Murderwin Strings, Green Murderwin Strings v2, Decor Murderwin Strings), each running one Home scene. Red, green and decor all changed the real lights, each in 1 to 2 seconds. STRINGS_SHORTCUTS=on in cues/.env. Pairing is not the way: holding the button resets their Wi-Fi.' },
  { order: 462, title: 'Add the Holiday String Lights back in the Nanoleaf app', detail: 'Done 25 Oct: the lights are back on the Wi-Fi and the brain runs them through Apple Home (see Try the string lights from the brain), so the Nanoleaf pairing is not needed.' },
  { order: 479, title: 'The checks the test plan still has as Not yet', detail: `${BUILT_1025} every check marked Not yet has a test, the tests carry their IDs, and the new case checks run in npm run checks (20,042 of 20,042). Two wait on your answer as questions on the board (the dial after Spill the Beans, and a sense-only bag clue in a small party); the half second over the Wi-Fi is measured at the tech run.` },
]

// 25 Oct 2026, evening: Jon's cue list, step 3 (the blackout returns the
// power on its own; the interruption button and the role card's fifteen
// seconds), built by Claude Code. The power sound is gone (cueSounds, the
// handoff's default: the music and the lights coming back are the cue), so
// its sound card closes; the brain's start card says which two sounds it
// needs; and the one question the build turned up. Applied by
// '2026-10-25-cue-list-blackout'. The cue list's other cards come with its
// last step, the board.
export const RETIRED_FOR_CUE_LIST_3 = [
  { order: 140, title: 'Sound: power', detail: 'Done 25 Oct 2026: there is no power sound any more (your cue list, cue 5; cueSounds). The music and the lights coming back are the cue, and the blackout sound is the last thing heard. Nothing to record.' },
]
export const REWRITTEN_FOR_CUE_LIST_3 = [
  { order: 121, title: 'Start the brain', set: { detail: 'On the M3 Air: network cable in, sleep off. Double-click Start the brain on its desktop; a window opens and stays open all night. It will not start while the chime (chime-phone) or the blackout sound has no file, and says which; the other seven sounds are optional, silent until their file is in, and the other chimes borrow the chime’s file.' } },
]
export const CUE_LIST_3_DECISIONS = [
  { key: 'promptScreen', moment: 'act2.orient', question: 'While the phones show the interruption button and the role cards, is the Parlour TV dark (as built) or back on its loop at once (cue 5)?', options: ['Dark until your first Next (as built)', 'Back on its loop at once, as cue 5 says'], answer: null, note: 'Default: dark, as built. Every screen stays black through the five seconds and the fifteen seconds of role cards, until your first Next in Act 2, so nothing on a wall draws an eye away from the phone while people read their roles. The lights and the music come back on their own either way (the brain reads the phase). Cue 5 says the loop returns right after the blackout; if you want that, Claude Code changes it in a few lines.' },
]

// 26 Oct 2026: the board for Jon's cue list (docs/cue-list.md, canon from
// 25 Oct, and docs/handoff-2026-10-25.md section 5, item 9). Claude Code
// built the cue list in seven steps on 25 and 26 Oct (the brain, the
// blackout, the Host tab buttons, the night's shape, the screens, the Notes
// tab, the devices): each step is a done card under its moment, so the
// Timeline records what landed. Jon's hardware cards from section 9: the
// playlists and the song (card 421 reworded), the six scenes (422), the
// Patio light in the Decor strings scene, the projector's plug in Home with
// two scenes and two Shortcuts, the five loops; his device moves, filed at
// the moment each happens; and two checks for the practice run and the
// hardware evening. The five questions from section 3 are decision cards,
// open, each with its default built (only Jon decides; nobody asks twice);
// rulesDeckScreen is answered by the cue list (cues 2 and 3: the Parlour
// TV). The cards the device key and the cue list made stale are closed or
// reworded with the dated reason; a rewrite keeps the old words on the card
// (lib/additions.js). Numbered from 490. Applied by '2026-10-26-cue-list'.
const BUILT_CUE = 'Built 25 Oct 2026:'
export const CUE_LIST_TASKS = [
  // Jon's hardware cards (section 9); cards 421 and 422 are reworded below
  { order: 490, moment: 'freeze', status: 'todo', who: 'Jon', title: 'The Patio light in the Decor Murderwin Strings scene', detail: 'In the Home app, put the Patio light into your Decor Murderwin Strings scene, warm at 100%, with the seasonal lights. That scene is what the Orangerie shows whenever Salem’s game is not running, supper included (your cue 8). Nothing else to do: the brain already recalls the scene by its name.' },
  { order: 491, moment: 'freeze', status: 'todo', who: 'Jon', title: 'The projector’s plug in the Home app, with two scenes and two Shortcuts', detail: 'Name the projector’s plug (the IKEA smart switch) in the Home app and make two scenes with only that plug in them: one that turns it on, one that turns it off. In Shortcuts on the brain, make two shortcuts that each run one scene, named exactly Projector Murderwin On and Projector Murderwin Off. Then tell Claude Code, which switches the projector on from the brain: off for the blackout, the drawing and The End, on again when the power returns and for the ballot. Until then the brain only says what it would do, and you tap the plug in the Home app yourself.', tech: 'PROJECTOR_SHORTCUTS=on in cues/.env (PROJECTOR_SHORTCUT_ON and PROJECTOR_SHORTCUT_OFF only if the Shortcuts have other names). npm start -- --check-projector switches the plug off, waits five seconds and switches it on. docs/cues-relay.md, steps 14 and 15.' },
  { order: 492, moment: 'freeze', status: 'todo', who: 'Jon', title: 'The five loops: short silent videos for the idle screens', detail: 'Five short silent videos that every idle screen plays round and round: living (Sir Irwin in the Parlour, for the TV), study (Granolia, for the study Mac), memory (Zimothy in the Library, for the iPad Pro), bedroom (Salem in the bedroom) and boo (Sir Irwin’s portrait and Boo walking, for the projector, mapped to the space above the Parlour). A sixth, orangerie, is optional, for the brain’s browser. Ten to sixty seconds each, no sound, in the screen’s own shape. Give them to Claude Code, which puts them in and puts them live. Until a file is in, that screen shows its crest, so nothing waits on them.', tech: 'play/public/loops/<name>.mp4 (H.264, silent, under about 30 MB; 16:9 for the TV, the study Mac and the projector, 4:3 for the iPad), then npm run deploy:site. play/public/loops/README.md has the table. The files are gitignored and go up with the deploy, like media/.' },
  { order: 493, moment: 'freeze', status: 'todo', who: 'Jon', by: '2026-11-06', title: 'Check Boo’s wall comes back on the projector when the plug returns', detail: 'On the hardware evening, with Boo’s wall up on Susan’s MacBook Pro: switch the projector’s plug off and on in the Home app. When the projector comes back, the full-screen browser must come back on the projector, not on the MacBook’s own screen. If it lands on the MacBook, tell Claude Code: on the night the plug goes off for the blackout and the drawing and comes back twice.' },

  // Act 3
  { order: 494, moment: 'act3.down', status: 'todo', who: 'Jon', title: 'Check the supper notice words in the workshop', detail: 'The built supper notice says: Supper is in the Orangerie. Leave your phone here in the Parlour, charging, and bring your bag to the table. If you have written a NOTICE DOWN line on the UI copy list, your line plays instead, so check it says the same, or clear it. Three new labels sit on the same list: NOTICE MOTIVES (after supper), NOTICE UPDATE (after Sir Irwin speaks) and NOTICE BREAK (the start of Act 6). The built words play until you write your own.' },
  { order: 495, moment: 'act3.down', status: 'todo', when: 'later', who: 'Jon', title: 'Carry the iPad Pro to the Orangerie for the captions', detail: 'On your way in to supper, carry the iPad Pro from the Library to its stand on the Orangerie table and tap it once. The address stays the same: it shows bulletin 2’s words through supper and the wrap-up.' },

  // Act 4
  { order: 496, moment: 'act4.warn', status: 'todo', when: 'later', who: 'Jon', title: 'The iPad Pro back to the Library before Start Act 4', detail: 'After supper, before you press Start Act 4: carry the iPad Pro from the Orangerie to its small stand in the Library, with Zimothy, open the memory match on it (the Devices page has the address and a square code) and tap once. Jenna’s iPad Pro comes out as Boo’s camera at the same time (the card Boo’s camera).', tech: '?kiosk=memory' },

  // Act 6
  { order: 497, moment: 'act6.games', status: 'todo', when: 'later', who: 'Jon', title: 'Carry the iPad Pro into the bedroom before the drawing', detail: 'After Act 4, while the two Parlour Games play: carry the iPad Pro from the Library into the bedroom, open the bedroom screen on it (the Devices page has the address and a square code), tap once and close the door. It says The door is closed until the third drawing is named.', tech: '?kiosk=bedroom' },
  { order: 498, moment: 'act6.drawing', status: 'todo', who: 'Jon', title: 'Check Act 6 still fits, with At the paper pressed briskly', detail: 'At the practice run or a tech run: press At the paper on your phone the moment each drawer reaches the paper (turns are fifteen seconds, a walk twenty at most). The drawing has 26 minutes for up to 44 turns, and Act 6 runs about 34 to 46 minutes all told. See where the clock lands and tell Claude Code if it runs long.' },

  // Built by Claude Code (section 5, items 2 to 8), one card a step
  { order: 500, moment: 'act1.ready', status: 'done', who: 'Claude Code', title: 'The brain follows the cue list', detail: `${BUILT_CUE} the hall bulb by phase (green for the welcome, off in the blackout, red from the power’s return, green when the door opens); the projector’s plug off for the blackout, the drawing and The End and on again when the power returns and for the ballot, through two Shortcuts on the brain; the six Murderwin scenes and the three playlists at their volumes, cue by cue; the study’s other lamp dimmed while a group plays the wall; Cake! plays Happy Birthday for Dogs and the candles scene, then the jazz again; nine sounds, of which only the chime and the blackout are needed to start, the other chimes borrowing the chime’s file and the stings silent while they have none.`, tech: 'cues/scenes.json (playlists jazz 55, jazzLow 30, intense35, intense60, credits 35; the cut on the first Name press; cake; study), cues/lib/cues.js hallColour, REQUIRED_SOUND_IDS and CHIME_FALLBACK, cues/lib/strings.js PROJECTOR_SHORTCUTS; docs/cues-relay.md rewritten.' },
  { order: 501, moment: 'act1.ready', status: 'done', who: 'Claude Code', title: 'The blackout returns the power on its own', detail: `${BUILT_CUE} one press of Blackout: every phone and screen goes dark, the hall bulb goes out and the projector’s plug goes off; five seconds later, on the server’s clock, the power returns on its own (Power returns stays on the Host tab as the hand button and does nothing once the power is back). Then each phone shows one button, Sorry for the interruption, continue here, with a buzz where the phone can; then its role card for fifteen seconds with no button; then the main page on its own. The role stays on the You tab. The question blackoutAuto lets you choose the hand button instead.`, tech: 'functions/lib/run.js blackout waits BLACKOUT_POWER_MS (an injectable sleep) then runs the power sequence; power returns { already: true } once the phase has left the blackout; play/src/lib/night.js promptStage (continue, card, done) with PROMPT_HOLD_MS on the server clock; notes byNight[nightId].continued; CLAUDE.md client rule rewritten.' },
  { order: 502, moment: 'allnight', status: 'done', who: 'Claude Code', title: 'Host tab: Sound test, Cake!, At the paper and the drawing’s guess on your phone', detail: `${BUILT_CUE} Sound test, under The house, plays the chime on every HomePod. Cake!, above Next in Act 5, plays Happy Birthday for Dogs on every HomePod, dims the lights for the candles and puts the birthday card on the TV; the jazz comes back when the song ends. In the drawing, At the paper ends the walk the moment the drawer is there (the walk is a twenty-second limit, not a wait), and the room’s guess is tapped on your phone from the same four names; the TV’s names still take a tap as the fallback. Turns are fifteen seconds (your note), so the drawing has 26 minutes for up to 44 turns.`, tech: 'commands sound-test, cake and at-the-paper in functions/lib/commands.js HOST_COMMANDS; HostRelayPanel and callRelayGuess in play/; relay TURN_MS 15000, WALK_MS 20000, PULL_MS 20000, DRAW_BUDGET_MS 26 minutes, MAX_TURNS 44; docs/relay-drawing-game.md §4 and §5.' },
  { order: 503, moment: 'allnight', status: 'done', who: 'Claude Code', title: 'The night’s shape follows the cue list', detail: `${BUILT_CUE} four new beats: The house rules in Act 1 (the music stops and the lights dim for the video and the slides), Dinner wrap-up in Act 3 (every phone asks for the motives to be crossed off; the TV shows the join code again), Update your motives in Act 5 (after Sir Irwin speaks) and The End in Act 7. The supper notice says to leave the phone in the Parlour, charging; the dessert chime plays with the Happy Birthday Irwin card; a break line opens Act 6 before its two Parlour Games; at the drawing the phones say to be in the Parlour for the final event; the ballot is a card on the Now tab with every tab reachable; through the reveal every phone shows Eyes on the screen, through the result its own result with Thank you for playing, and at The End it opens up for good with everything readable. Three new lines on the UI copy list: NOTICE MOTIVES, NOTICE UPDATE and NOTICE BREAK.`, tech: 'seed/night.json beats rules, wrap, update, end; functions/lib/deal.js NOTICES down, motives, update, break (roam carries image birthday); run.js action end writes nights/{id}.over; play/src/lib/night.js placement and phoneLock. npm --prefix functions run seed after a night.json change, or the functions read the old copy.' },
  { order: 504, moment: 'setup', status: 'done', who: 'Claude Code', title: 'The screens: the loops, the join code, the room codes, the rules cards, the birthday card, The End', detail: `${BUILT_CUE} every idle screen plays its loop once the file is in, its crest until then. The Parlour TV shows the join code, big, through Act 1 and again at the dinner wrap-up, and a small one under the ballot clock. During the Act 2 cat visits each room’s screen shows its cat’s code: Granolia’s on the study Mac, Zimothy’s on the iPad Pro in the Library, Boo’s on the wall from the projector, Salem’s on the brain’s own browser in the Orangerie (a new screen). In Act 4, between groups, each room shows its game’s rules card: the name and its line, the host cat’s words, a full picture of the cat that changes through the night, and the room’s code. The Happy Birthday Irwin card is on the phones at dessert and on the TV from Cake!. At The End every screen goes black. Printing the codes from the Game night page stays the fallback.`, tech: 'play/src/screens/Kiosk.jsx Idle(which) plays BASE_URL loops/<which>.mp4; screen kinds join, birthday and black; ?kiosk=orangerie with a MACHINES row in play/src/lib/house.js; Rooms.jsx codes and rules cards from play/src/lib/rooms.js; roomDark(night, screen); Preview.jsx entries; docs/room-screens.md; play/public/loops/README.md.' },
  { order: 505, moment: 'allnight', status: 'done', who: 'Claude Code', title: 'A Notes tab on every phone', detail: `${BUILT_CUE} a seventh tab, Notes, after Clues: a box for the guest’s own scribbles, saved to that phone alone as they type, never read by anyone else (you included), and still there to read at The End. The welcome names it. A phone that changes hands keeps its notes with it, so a guest reads them across first.`, tech: 'play/src/screens/Rest.jsx Notes tab; notes/{uid}.byNight[nightId].text, written with writeNotes after about 800 ms and on blur; firestore.rules already owner-only.' },
  { order: 506, moment: 'setup', status: 'done', who: 'Claude Code', title: 'The devices follow your key', detail: `${BUILT_CUE} the Devices page, the night’s runbook and CLAUDE.md follow your cue list’s key. Susan’s MacBook Pro feeds the projector all night and never moves (its loop from Act 1, Boo’s code in Act 2, Boo’s Catwalk in Act 4, off during the drawing, on for Act 7, off at The End). Your iPad Pro roams: the Library with Zimothy’s code in Act 2, the captions in the Orangerie for supper, the memory match in the Library in Act 4, the bedroom from Act 6. Jenna’s iPad Pro is Boo’s camera. The brain’s own browser is the Orangerie’s screen. The older family iPad is out unless you say it stays (the question olderIpad, under Setting up the house). If the Parlour TV dies, the spare is a browser on the brain, not the busy iPad Pro. Your device cards on this board say the same.`, tech: 'app/src/lib/devices.js DEVICE_ROOMS, SWITCH_ON and WHEN_ONE_DIES; docs/on-the-night.md Which machine does what and the start order; docs/room-screens.md; docs/relay-drawing-game.md §3 and §8; CLAUDE.md HARDWARE.' },
]

// The five questions from the handoff's section 3, each filed under the
// moment it changes, open, with the default that is built. Only Jon answers.
export const CUE_LIST_DECISIONS = [
  { key: 'blackoutAuto', moment: 'act1.ready', question: 'Does the power come back on its own five seconds after Blackout, with Power returns kept as the hand button?', options: ['Yes, on its own after 5 seconds', 'No, I press Power returns'], answer: null, note: 'Default: yes, as built. One press of Blackout; five seconds later the lights and the music come back and every phone shows its button. Power returns stays on the Host tab as the hand button, and does nothing once the power is back.' },
  { key: 'olderIpad', moment: 'setup', question: 'Your device key has no older family iPad, and the iPad Pro does the memory match in Act 4. Is the older iPad out?', options: ['Out: the iPad Pro roams', 'It stays: the memory match all night, the iPad Pro stays in the Orangerie until the bedroom'], answer: null, note: 'Default: out, as built. If it stays, it keeps In Duplicate on its small stand in the Library all night, and the iPad Pro stays in the Orangerie from Act 2 until it goes to the bedroom: open the Orangerie screen address on it there (the Library address shows Zimothy’s code).' },
  { key: 'cueSounds', moment: 'freeze', question: 'Your audio list has three recordings; the brain had a slot for ten sounds. One chime for every chime moment, the stings optional and no power sound, or record every sound?', options: ['One chime and the thunder; the stings optional', 'Record every sound'], answer: null, note: 'Default: one chime, as built. The chime’s recording (chime-phone) also plays for the news chime, Sir Irwin’s chime and the bulletin sounder while they have no file of their own; the four stings are silent while they have none; there is no power sound (the music and the lights coming back are the cue). The brain starts once the chime and the blackout have a file. A simple tone still sits in every slot from 24 Oct; ask Claude Code to take any away.' },
  { key: 'roomMusic', moment: 'act4.groups', question: 'In Act 4 your cue list gives each room its own music, and puts bulletin 2 on the Orangerie HomePod alone. The brain plays one stream to every HomePod in the group. One playlist for the whole house, or each room its own player?', options: ['One playlist for the whole house, and bulletin 2 on every HomePod', 'Each room its own player, through Home scenes'], answer: null, note: 'Default: one playlist for the whole house, as built; bulletin 2 plays on every HomePod (the other rooms are empty at supper). The Orangerie HomePod’s own volume is set in the Home app. The other way is more to set up and untried: the HomePods would play their own playlists through Home scenes the brain runs like the string lights, with the chimes from each room’s screen instead; it would be tried on the hardware evening and cut if a chime fought it.' },
  { key: 'bedroomName', moment: 'act6.door', question: 'Cue 18 says "head to the [bedroom’s name]". Does the bedroom get a game name, like the Library and the Orangerie?', options: ['The bedroom, as the house table has it', 'A game name (tell Claude chat the words)'], answer: null, note: 'Default: "the bedroom", as built. When the door opens the phones say the light in the hall is green and the bedroom screen is showing what was left behind; the Devices page and the runbook say the bedroom too.' },
]

// Answered by the cue list (cues 2 and 3, 25 Oct 2026): the Parlour TV shows
// the join code through Act 1, and the intro video and the rules slides come
// from a second tab or a player on the same Mac. Its first option, as the
// cleanup reworded it. Never overwrites an answer Jon gave.
export const ANSWERED_FOR_CUE_LIST = { rulesDeckScreen: 'The Parlour TV, back to the game before the blackout' }

// Done or stale, marked done once with the dated reason.
export const RETIRED_FOR_CUE_LIST = [
  { order: 472, title: 'Run the checks once, so the Health page has a result', detail: 'Done 25 Oct 2026: run and saved, all clear. The Health page has its result.' },
  { order: 473, title: 'Put Granolia’s new study words in (the default)', detail: 'Built 25 Oct 2026: Granolia’s hello says to touch the wall first and use the buttons at the end. You may still pick Keep the old words on the question above.' },
  { order: 429, title: 'Move Susan’s MacBook Pro to the bedroom', detail: 'Replaced 26 Oct 2026 (your device key): Susan’s MacBook Pro stays beside the projector all night and never moves; the iPad Pro goes to the bedroom instead. See Carry the iPad Pro into the bedroom before the drawing.' },
  { order: 430, title: 'The older iPad in the Library', detail: 'Out by default (the question olderIpad, 26 Oct 2026): your device key has no older iPad, so the iPad Pro runs In Duplicate in the Library in Act 4. If you answer that it stays, ask Claude Code to bring this card back.' },
]

// The sound cards under cueSounds' default. Three chime moments borrow the
// chime's file while they have none of their own; the four stings are
// optional. Every slot still holds the simple tone made on 24 Oct, so the
// card says what is heard today and what to ask for. Titles and moments
// stay (a test pins them to the cue ids).
const borrowsChime = (order, id, when) => ({
  order, title: `Sound: ${id}`,
  set: {
    detail: `Optional. Plays when ${when}. A simple tone plays there today (the stand-in from 24 Oct). Ask Claude Code to take the tone away and the chime’s recording (chime-phone) plays here instead, so one chime serves every chime moment (your cueSounds default). Or give it a sound of its own: two to five seconds, with one second of silence first, named ${id}, given to Claude Code.`,
    tech: `Delete the stand-in media/${id}.wav and CHIME_FALLBACK (cues/lib/cues.js) plays chime-phone’s file; or put media/${id}.m4a (or .mp3, .wav or .aiff) on the brain. media/README.md lists all nine.`,
  },
})
const optionalSting = (order, id, when) => ({
  order, title: `Sound: ${id}`,
  set: {
    detail: `Optional. Plays when ${when}. A simple tone plays there today (the stand-in from 24 Oct). Ask Claude Code to take the tone away and that moment is silent; the night runs the same (your cueSounds default). Or give it a sound of its own: two to five seconds, with one second of silence first, named ${id}, given to Claude Code.`,
    tech: `Delete the stand-in media/${id}.wav for silence (the brain’s first lines count the optional sounds with no file); or put media/${id}.m4a (or .mp3, .wav or .aiff) on the brain. media/README.md lists all nine.`,
  },
})

// Cards whose words change, not grow: one clean instruction each.
export const REWRITTEN_FOR_CUE_LIST = [
  // The two sounds the brain needs
  { order: 134, title: 'Sound: blackout', set: { detail: 'One of the two sounds the brain needs (with the chime). Plays when every phone goes dark at the end of Act 1: big thunder, a crash and an eek or a scream (your cue 4: it has to hit, and hit hard). It is the last thing heard before the power returns on its own. Two to five seconds, with one second of silence first. Name the file blackout and give it to Claude Code, which puts it on the brain in place of the simple tone that plays there now.', tech: 'media/blackout.m4a (or .mp3, .wav or .aiff) on the brain, and delete the stand-in media/blackout.wav. REQUIRED_SOUND_IDS in cues/lib/cues.js.' } },
  { order: 420, title: 'Sound: chime-phone', set: { detail: 'The one chime, and one of the two sounds the brain needs (with the blackout). It plays when supper is ready, when Act 4 starts and at each round change, at dessert, when the Act 6 Parlour Games open, and on Sound test; and it stands in for the news chime, Sir Irwin’s chime and the bulletin sounder while those have no file of their own (your cueSounds default). About one second, with one second of silence first. Name the file chime-phone and give it to Claude Code, which puts it on the brain in place of the simple tone that plays there now.', tech: 'media/chime-phone.m4a (or .mp3, .wav or .aiff) on the brain, and delete the stand-in media/chime-phone.wav. REQUIRED_SOUND_IDS and CHIME_FALLBACK in cues/lib/cues.js; media/README.md lists all nine.' } },
  // The three chime moments that borrow it, and the four optional stings
  borrowsChime(141, 'chime-news', 'the news flash comes up on the Parlour TV'),
  borrowsChime(152, 'sounder-bulletin', 'W-O-O-F News bulletin 2 starts, near the end of supper'),
  borrowsChime(171, 'chime-irwin', 'Sir Irwin is about to speak on the Parlour TV'),
  optionalSting(160, 'sting-solved', 'a group solves the study'),
  optionalSting(181, 'sting-door', 'the third drawing is named and the bedroom door opens'),
  optionalSting(190, 'sting-reveal', 'the reveal begins on the Parlour TV'),
  optionalSting(191, 'sting-result', 'every phone shows its own result'),

  // Before the second tech run: the brain's names, from the cue list
  { order: 421, title: 'Three playlists on the brain', set: { title: 'Three playlists and one song in the Music app on the brain', detail: 'In the Music app on the M3 Air, three playlists named exactly Murderwin · Jazz (light jazz, the house’s music for most of the night), Murderwin · Intense (the drawing, the door, the ballot and the tally) and Murderwin · Credits (fun music for the credits). The dot is Option-Shift-9; a hyphen in its place works too. Curating only: the brain picks the playlist and sets the volume cue by cue (the jazz lower for the drawing’s intro, the intense music up from the door). Fold the old Arrival, Investigation and Supper playlists into Jazz. Add the song Happy Birthday for Dogs to the library too, by that exact name: the brain plays it on Cake! (the link is in your cue list, cue 13). Then ask Claude Code to switch the music on and check it.', tech: 'MUSIC=on in cues/.env; npm start -- --check-music once, for the Music permission. The names and volumes are cues/scenes.json playlists (jazz 55, jazzLow 30, intense35, intense60, credits 35) and cake.song.' } },
  { order: 422, title: 'Four Hue scenes', set: { title: 'Six Hue scenes', detail: 'In the Hue app, six scenes named exactly Murderwin Default (the house’s normal look, warm), Murderwin Dimmed (Default, dimmed for a screen: the rules, the news, the drawing’s intro, the tally), Murderwin Blackout (every light off), Murderwin Drawing (the Cloud light at 100%, everything in the Parlour very low), Murderwin Candles (Default dimmed for the cake) and Murderwin Study Dim (the other light in the study low, the rest as Default; you know which lamp that is). Leave the hall bulb outside the bedroom out of all six, so it keeps its green, off and red: give it a Hue room of its own first. Then ask Claude Code to switch the scenes on. Nothing waits on a light.', tech: 'HUE_SCENES=on in cues/.env; the names are in cues/scenes.json; npm start -- --scene "Murderwin Dimmed" tries one.' } },
  { order: 424, title: 'The projector for Boo’s wall', set: { title: 'The projector for Boo’s wall, all night', detail: 'Borrow the work projector and a short HDMI cable. Susan’s MacBook Pro sits beside it on the upstairs landing all night and never moves, showing Boo’s wall (the Devices page has its address), aimed at the triangle wall above the Parlour opening, with the beam clear of the fan. The projector hangs off its plug in the Home app, which the brain switches: off for the blackout and the drawing, on again when the power returns and for the ballot (the card The projector’s plug in the Home app). It takes a moment to warm up each time.', tech: '?kiosk=boo' } },
  { order: 425, title: 'The last shopping', set: { detail: 'Ten black velvet drawstring bags, 9 by 12 inches, numbered 1 to 10 (if you do not have them yet). A telescoping pointer for the study wall. A small stand for the iPad Pro in the Library (it is the memory match there in Act 4). The paper roll and markers. Prizes if you want any.' } },
  { order: 330, title: 'The settings files for the study and the brain', set: { detail: 'The brain’s file is right (25 Oct 2026): the key word, the Hue key, the string lights’ two lines named the way the brain reads them, and the string lights’ Shortcuts switched on. Left: the projector’s Shortcuts switched on once Jon has made them (the card The projector’s plug in the Home app), and the study’s file on the M1 Air when the station moves there (the card Set up the study station on the M1 Air).', tech: 'cues/.env: PROJECTOR_SHORTCUTS=on once the two Shortcuts exist. station/.env on the M1 Air from station/.env.example, STATION_KEY set to the saved key word. Never commit either file, never print a value.' } },
  { order: 332, title: 'The first full tech run (the hardware evening)', set: { detail: 'A rehearsal night with every machine on at once, Monday 2 to Friday 6 November: the brain and the four HomePods, the Parlour TV, the study station and walls, the iPad Pro at its four stations (the Library, the Orangerie, the Library again, the bedroom), Jenna’s iPad Pro as Boo’s camera, Susan’s MacBook Pro and the projector on its plug, the hall bulb, and two phones. Press Next from Act 1 to Act 7 and check every sound plays, every screen changes on its own, and the projector comes back after the blackout and the drawing. The second run has its own card.' } },

  // Setting up the house: the device key
  { order: 120, title: 'Router, Hue bridge and bulb, both Nanoleaf controllers and the string lights on', set: { title: 'Router, Hue bridge and bulb, both Nanoleaf controllers, the string lights and the projector’s plug on', detail: 'First of all. Give them five minutes. The projector’s plug is on, in the Home app, with the projector on it.' } },
  { order: 124, title: 'The four cat-room codes up', set: { title: 'The four cat-room codes: on the screens, printed as the fallback', detail: 'During the Act 2 cat visits each room’s screen shows its cat’s code, big: Granolia’s on the study Mac, Salem’s on the brain’s browser in the Orangerie, Zimothy’s on the iPad Pro in the Library, Boo’s on the wall from the projector. The same codes serve Act 4, on each room’s rules card. Print the four from the Game night page too and put one up in each room (none in the Parlour): the fallback for a screen that dies or a code that will not scan.' } },
  { order: 301, title: 'Open the Parlour TV, the study screen and the captions iPad', set: { title: 'Open the Parlour TV, the study screen, the iPad Pro and the brain’s browser', detail: 'The Parlour screen on your work MacBook Pro on the TV: it shows the join code through Act 1 (the intro video and the rules slides go in a second browser tab or a player; switch back to the game tab for the next beat). The study screen on the M1 Air. The iPad Pro in the Library with Zimothy, where it shows his code in Act 2; it moves to the Orangerie for the captions at supper (its own card). The brain’s own browser, full screen, facing the Orangerie table. Tap each one once to wake it. The Devices page has every address, with a square code for each. Susan’s MacBook Pro by the projector has its own card.', tech: '?kiosk=living, ?kiosk=study, ?kiosk=ipad, ?kiosk=orangerie' } },

  // Act 4: Boo's camera is Jenna's iPad Pro
  { order: 481, title: 'Boo’s camera: the iPad Pro to the Entryway (nice to have)', set: { title: 'Boo’s camera: Jenna’s iPad Pro at the end of the catwalk (nice to have)', detail: 'Before you press Start Act 4, stand Jenna’s iPad Pro on its stand at the end of the catwalk, facing where the group poses. Jenna is at the house to pack the bags and never plays, so it is free all night; nothing is carried from the Orangerie. Open Boo’s camera on it (the Devices page has the address and a square code), full screen, and tap Turn on the camera. It takes one photo of each group’s last pose for the end credits. Skip it and the catwalk runs the same.', tech: '?kiosk=pose' } },
  { order: 482, title: 'Try Boo’s camera on the Game test tab (nice to have)', set: { detail: 'Game test tab, Boo’s Catwalk: open Boo’s camera, the practice show, on Jenna’s iPad Pro (any iPad does for the try), stand it facing you and tap Turn on the camera, then Start the show. At the last pose it takes a photo and keeps it on its own screen; nothing is sent. Note anything wrong in the box.', tech: '?kiosk=pose&practice=1' } },
]

// Every card the timeline seeded, for looking a live card up by its order.
export const ALL_TIMELINE_TASKS = [...TIMELINE_TASKS, ...STANDIN_SOUND_TASKS, ...HANDOFF_TASKS, ...HANDOFF_BUILT_TASKS, ...AUDIT_TASKS, ...SECRET_LINES_TASKS, ...HANDOFF_1023_TASKS, ...CLEANUP_TASKS, ...NEWS_CAST_TASKS, ...ITEM4_TASKS, ...CUE_LIST_TASKS]

// Decisions still open, each filed under the moment it changes. Only Jon
// answers them.
export const TIMELINE_DECISIONS = [
  { key: 'newsFamilies', moment: 'act2.news', question: 'How many motive families does the Act 2 news rule out for everyone?', options: ['One', 'Two'], answer: null },
  { key: 'ipadDinner', moment: 'act3.down', question: 'The iPad through dinner: the captions screen in the orangery, or the spare phone only?', options: ['Captions in the orangery', 'Spare phone only'], answer: null },
  { key: 'bagsAct4', moment: 'act2.cat', question: 'Do the bags stay as an Act 4 station?', options: ['Keep the bags station', 'Cut it'], answer: null },
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

// Jon's Game test notes of 26 Oct 2026, three of four fixed the same evening
// (marked done, so each game's chip goes back to Not tried yet). Boo's
// Catwalk (10002) stays open: Jon sends the shape he wants for the wall.
// Applied by '2026-10-26-game-test-notes'.
export const RETIRED_FOR_GAME_TEST_1026 = [
  { order: 10000, detail: 'Fixed 26 Oct 2026: the first round is 6 pairs on a 4 by 3 grid (then 10 and 14). Try it again.' },
  { order: 10001, detail: 'Fixed 26 Oct 2026: each square’s line is cut at the box’s edge, the drawing’s screens are black, and Sir Irwin’s slides read from the left. Try it again.' },
  { order: 10003, detail: 'Fixed 26 Oct 2026: the study screen is in the house look (manor blue under the red wallpaper, a serif title, the clock in brass, Granolia’s own picture beside one panel of words), and so is its card between groups. Try it again.' },
]

// 27 Oct 2026: Jon's Game test note on Boo's Catwalk ("I don't get the game",
// card 10002). The wall is a lit runway with Boo in a spotlight; every moment
// says what to do; the music stops with a record scratch.
export const RETIRED_FOR_BOO_1027 = [
  { order: 10002, detail: 'Fixed 27 Oct 2026: Boo’s wall is a lit runway with Boo in a spotlight. Her card lists the three steps; while she struts it says Strut!, with the pose dots; the music stops with a record scratch; STRIKE A POSE! flashes with a big count; her verdict is a speech bubble. The phones say the same. Try it again: Boo’s wall, the whole show, a sample.' },
]

// 27 Oct 2026 (Jon): in Act 4 the Parlour HomePod plays Boo's music from
// Susan's MacBook Pro, not the house jazz. The brain takes it out of the
// house music for Act 4 and puts it back after; the wall runs the music two
// seconds ahead of itself for the AirPlay delay.
export const BOO_1027_TASKS = [
  { order: 507, moment: 'freeze', status: 'todo', who: 'Jon', by: '2026-11-06', title: 'Boo’s music on the Parlour HomePod: the HomePod’s name', detail: 'On the brain, in Terminal, in the cues folder, run npm start -- --speakers. If the Mac asks whether Terminal may control Music, click OK. It lists every HomePod Music can see and says whether the Parlour’s is the one the brain will take out of the house music in Act 4 (it looks for one called Living Room). If the Parlour’s HomePod has another name, tell Claude Code the name.', tech: 'cues/scenes.json boo.speaker. The first try from Claude Code on 27 Oct hung on that permission question.' },
  { order: 508, moment: 'act4.warn', status: 'todo', when: 'later', who: 'Jon', title: 'Susan’s MacBook Pro plays to the Parlour HomePod before Start Act 4', detail: 'Before you press Start Act 4: on Susan’s MacBook Pro by the projector, open Control Centre, Sound, and pick the Parlour HomePod. The brain lets go of that HomePod when Act 4 starts and takes it back for dessert, so do it each night, after the two-minute warning. If it will not connect, Boo’s music plays from the MacBook itself: pick its own speakers and open Boo’s wall with &airplay=0 on the end of the address.' },
  { order: 509, moment: 'freeze', status: 'todo', who: 'Jon', by: '2026-11-11', title: 'Tune Boo’s music to the wall by ear on the tech run', detail: 'With Susan’s MacBook Pro playing to the Parlour HomePod, stand where a group would and watch Boo’s wall. The record scratch should land as STRIKE A POSE! flashes. It is set two seconds early for the HomePod. If the scratch comes after the flash, add &airplay=3 to the wall’s address; if before, &airplay=1 (0 to 5, halves allowed). Tell Claude Code the number that worked and it becomes the default. Also press Sound test on the Host tab while the show runs and check Boo’s music is still there after the chime.', tech: '?kiosk=boo&airplay=<seconds> (play/src/lib/night.js booLead, BOO_AIRPLAY_MS). The chimes play through the brain’s own sound output: if that includes the Parlour HomePod, a chime may take it back from Susan’s MacBook Pro.' },
]

// 28 Oct 2026: In Duplicate takes turns (Jon, 27 Oct), and the Entryway's
// game waits on Jon: the projector cannot reach the landing.
export const TURNS_1028_TASKS = [
  { order: 510, moment: 'act4.puzzle', status: 'todo', who: 'Jon', by: '2026-11-06', title: 'Try In Duplicate’s turns on the iPad', detail: 'In Duplicate now takes turns: the Library screen says whose turn it is (the group’s own names, from the Act 4 groups), a pair keeps the turn and a miss passes it on, and each board starts with someone else. Try it on a rehearsal night with two or three people at the iPad.', tech: 'play/src/screens/Rooms.jsx Board players/first; play/src/lib/rooms.js turnNames; the memory kiosk reads public/rotation.' },
]
export const TURNS_1028_DECISIONS = [
  { key: 'entrywayGame', moment: 'act4.entryway', question: 'The projector cannot reach the landing. What does the Entryway play in Act 4?', options: ['Miss Boo LaRue’s Arcade on Susan’s MacBook Pro and the Stream Deck + XL', 'Keep Boo’s Catwalk on any screen'], answer: null, note: 'Default: the Catwalk stays, as built, until Jon decides. The arcade as talked through on 28 Oct: five games on the + XL (Boo Chasing Her Tail, the Lazy Pointer, Whack-a-Mouse, Knock It Off the Table, Yarn Catch), turns with two tokens each, each player’s own Ghost bag clue on the Mac’s screen after their second game (a trio’s third gets Boo’s line), free play until the chime, "Be on your way." at the chime, and a just-for-fun winner in the arcade, In Duplicate and Get Off My Lawn!. Dropping Boo’s motive cross-off needs a second answer: In Duplicate crosses off two, or accept that foggy nights (dial 1 and 2) end on one motive about 8 in 10 times.' },
]

// 28 Oct 2026, evening: Jon's five Game test notes, and the phone's look
// ("way too many words"; "make it look pretty... a hierarchy system").
export const RETIRED_FOR_PHONE_LOOK_1028 = [
  { order: 10004, detail: 'Done 28 Oct 2026: Jon tried Granolia’s Lightbulb Moment at the walls and says it is good to ship.' },
  { order: 10005, detail: 'Answered 28 Oct 2026: open the address in Safari on the iPad, tap Share, then Add to Home Screen, and open it from that icon: it fills the screen with no Safari bars. One icon per station (In Duplicate, the Library, the bedroom). Try it again.' },
  { order: 10006, detail: 'Filed 28 Oct 2026: a decision on the board (studySecondScreen), what the study Mac’s second screen shows.' },
  { order: 10007, detail: 'Fixed 28 Oct 2026: the brain only followed the night’s game, never the Game test practice. It follows the practice now. Start the brain again once (cd cues && npm start), then try it again. The lights still run a second or two behind the phones (stringsLead).' },
  { order: 10008, detail: 'Fixed 28 Oct 2026: while a round plays, the phone is only red or green, the whole screen, no words. The rule shows once, before the first round: a red Shake tile and a green Freeze tile. Try it again.' },
]
export const PHONE_LOOK_1028_TASKS = [
  { order: 511, moment: 'freeze', status: 'todo', who: 'Jon', by: '2026-11-06', title: 'Put each iPad station on its Home Screen', detail: 'On the iPad Pro, for each address it shows on the night (?kiosk=ipad, ?kiosk=memory, ?kiosk=bedroom): open it in Safari, tap Share, then Add to Home Screen, and name it (the Library, In Duplicate, the bedroom). Open each one from its icon: no Safari bars. Tap once to wake it, as before.' },
  { order: 512, moment: 'freeze', status: 'todo', who: 'Jon', by: '2026-11-06', title: 'Look over the phone’s new look', detail: 'The phone has fewer words, a type scale (small brass labels, serif titles, the household’s words in serif), lifted cards, and a tab bar with an icon over each word. Salem’s game is only red or green while it plays. After the next deploy, on your phone: murderwin-at-sirwin-manor.web.app/play/?preview=tour walks every screen with a button (Salem’s round on its own: ?preview=salem-round). Or play a rehearsal. Tell Claude Code anything that reads wrong.' },
]
export const PHONE_LOOK_1028_DECISIONS = [
  { key: 'studySecondScreen', moment: 'act4.study', question: 'The study’s Mac (SKMBA) will have a second screen. What goes on it?', options: ['The study’s screen, full screen on the second display, facing the walls; the Mac’s own screen keeps the station’s window', 'Something new on the second screen'], answer: null, note: 'Default: the first, which needs nothing built: ?kiosk=study moves to the second display, full screen, and the station’s window stays in sight on the Mac. A new view (for example the walls’ map big on one screen and Granolia’s words on the other) is new work, and the last new feature lands 11 November.' },
]

// 28 Oct 2026, night (Jon: "We need to get boos game up for testing. Not the
// cat walk the arcade games."): Miss Boo LaRue's Arcade, built to try on its
// own page, reviewed and fixed 29 Oct. The night keeps Boo's Catwalk until
// Jon answers entrywayGame. And Jon's just-for-fun winners for In Duplicate
// and Get Off My Lawn! (28 Oct: "Make boo's, zimmy's, and Salem have a
// winner. Just for fun."). Card 518 is a mismatch noticed on the way, while
// putting entrywayGame on the Canon: roomMusic.
export const ARCADE_1028_TASKS = [
  { order: 513, moment: 'act4.entryway', status: 'done', who: 'Claude Code', title: 'Miss Boo LaRue’s Arcade, built to try', detail: 'Built 28 Oct 2026 and reviewed and fixed 29 Oct: the arcade from your 28 Oct talk, on a page of its own, to try before you answer entrywayGame. Five games on the Stream Deck + XL (Boo Chasing Her Tail, The Lazy Pointer, Whack-a-Mouse, Knock It Off the Table, Yarn Catch), picked from the middle of the second row of keys; the left three dials steer left and right, the right three up and down, and a press on any dial knocks. Free play, or a practice visit: two or three names, two tokens each in turns, two minutes a game (80 seconds for three, and shorter when the round runs low, so each clue usually comes before the chime), each player’s clue on the screen after their second game (in practice a line in square brackets), a trio’s third player gets “Didn’t I give you enough? Now be off! I’m done playing games.”, Boo’s winner, free play, and at the chime “Be on your way.” No Stream Deck? The deck is drawn on the screen too, for the mouse and the keyboard. Nothing here touches a night.', tech: '/play/?kiosk=boo&play=1 (&visit=1, &names=); play/src/lib/arcade.js (the games and the visit, pure), arcadeArt.js, arcadeDeck.js (WebHID, Chrome or Edge only; one tab holds the deck by the Web Lock arcade-deck), arcadeSound.js, screens/Arcade.jsx; docs/boo-arcade.md; checks G54, G55, G56, L09 (play/test/arcade.test.mjs, arcadeDeck.test.mjs, arcadeMedia.test.mjs). The study station now opens only a fifteen-key deck (station/lib/streamdeck.js isStudyDeck), so the + XL never confuses it; it reaches the study Mac with the next deploy.' },
  { order: 514, moment: 'act4.entryway', status: 'todo', who: 'Jon', by: '2026-11-01', title: 'Try Miss Boo LaRue’s Arcade with the Stream Deck + XL', detail: 'On a Mac, in Google Chrome (Safari can’t reach the Stream Deck), with the Stream Deck app quit, the Mac’s sound on its own speakers and the + XL plugged in: open the Game test tab, Miss Boo LaRue’s Arcade, The arcade, free play. Tap Connect the Stream Deck and pick it. Play all five games. Then tap Practise a group’s visit at the bottom of the same page, type two names and play the visit until the chime (or Ring the chime). In the section’s note box, say what to change: which games feel stingy or generous, and whether Boo’s winner feels fair (with two long games the chime can come before the winner). Then answer entrywayGame.', tech: 'WebHID needs Chrome or Edge on the https site (or localhost). The browser remembers the deck after the first Connect. One arcade tab holds the deck at a time: the tab opened last takes it, and the other says so, with Connect to take it back (after a replug, whichever tab asks first gets it).' },
  { order: 515, moment: 'act4.entryway', status: 'todo', who: 'Claude Code', title: 'The arcade on the night, if entrywayGame picks it', detail: 'Only if you answer entrywayGame with the arcade. Then: the Entryway’s Act 4 round runs the arcade on Susan’s MacBook Pro; each player’s own clue about the Ghost on the Mac’s screen; the chime ends it with “Be on your way.”; Boo’s Catwalk comes out. From your try: even out the five games’ points, so a game played well pays about the same in each (today the winner leans on which games were picked), and whether a miss in Knock It Off the Table should cost a point or two (today a steady press without looking clears the table). Things to ask you then: whether each player’s clue goes by their own Boo affection or the group’s average, as in the other rooms; the second answer for Boo’s motive cross-off; whether the arcade’s sounds play from the Mac’s own speakers or the Parlour HomePod; what a player gets who has not had their clue when the chime rings; whether two-minute games stay (in ten minutes they leave little room for Boo’s winner and a trio’s third player’s line); and whether Boo’s treat in Boo Chasing Her Tail (and its key on the menu) stays a fish, since fish-shaped is one of the bag clue words.', tech: 'functions/lib/act4.js (the Entryway’s reward), the night’s ?kiosk=boo, play/src/lib/arcade.js visit with a real clue in place of STAND_IN_CLUE; the points constants at the top of arcade.js (the reviewers’ bot players gave about 90 for the tail, 8 to 30 for the pointer, 57 to 156 for the mice, 80 for the knock, 94 to 111 for the yarn); the visit’s timing (GAME_MS, TRIO_GAME_MS, CLUE_KEEP_MS, CUT_MIN_MS; docs/boo-arcade.md §5); checks G32, G48, G51 and the fake night.' },
  { order: 516, moment: 'act4.puzzle', status: 'todo', who: 'Claude Code', title: 'A just-for-fun winner in In Duplicate', detail: 'You, 28 Oct: “Make boo’s, zimmy’s, and Salem have a winner. Just for fun.” In Duplicate: whoever found the most pairs. The screen already knows whose turn it is, so each pair counts for whoever found it. The Library’s screen names the winner at the end of the group’s visit, in Zimothy’s voice. It changes nothing and earns no clue.', tech: 'play/src/screens/Rooms.jsx Board (turns, turnNames in play/src/lib/rooms.js); the memory kiosk.' },
  { order: 517, moment: 'act4.orangerie', status: 'todo', who: 'Claude Code', title: 'A just-for-fun winner in Get Off My Lawn!', detail: 'You, 28 Oct: Salem’s winner is whoever “did better”: the fewest slips. The game counts the group’s slips today; it needs to count them per phone. The Orangerie’s screen names the winner at the end of the group’s visit, in Salem’s voice. It changes nothing and earns no clue.', tech: 'functions/lib/act4.js (Salem’s slips, counted per group today), play/src/screens/Act4.jsx, the Orangerie’s kiosk.' },
  { order: 518, moment: 'act4.groups', status: 'todo', who: 'Claude Code', title: 'roomMusic: the Canon says answered, the board says open', detail: 'Noticed 29 Oct 2026: the Canon (Sound, music and lights) and the Start Here page say you answered roomMusic on 25 Oct: one Apple Home scene per cue, each run by a Shortcut the brain fires, so each room plays its own music. The board still has the question open, and the build follows its default: one playlist for the whole house through the brain’s AirPlay group (and since 27 Oct, Boo’s music on the Parlour HomePod in Act 4). Ask you once which stands, then make the Canon, the board and the build agree.', tech: 'app/src/lib/timelineTasks.js roomMusic (answer: null); the Canon’s Sound, music and lights section; CLAUDE.md Decisions (roomMusic listed open); cues/ (the brain’s music and scenes.json); docs/cues-relay.md; docs/sessions.md, 25 to 26 Oct.' },
]

// 29 Oct 2026: Jon's two just-for-fun winners, built (cards 516 and 517), and
// his try. Neither changes a reward or earns a clue.
export const RETIRED_FOR_WINNERS_1029 = [
  { order: 516, title: 'A just-for-fun winner in In Duplicate', detail: 'Done 29 Oct 2026: each pair counts for whoever’s turn it was, over all three boards. After the third board the Library’s screen names whoever found the most pairs, in Zimothy’s voice; a tie names everyone tied. The whole group is paid the same.' },
  { order: 517, title: 'A just-for-fun winner in Get Off My Lawn!', detail: 'Done 29 Oct 2026: each slip counts against the phone that made it. Once Salem’s game is cleared the Orangerie’s screen names whoever slipped least, in Salem’s voice; a tie names everyone tied. A phone that can’t feel a shake never slips, so it is left out rather than winning by standing still. The whole group is paid the same.' },
]
export const WINNERS_1029_TASKS = [
  { order: 519, moment: 'act4.groups', status: 'todo', who: 'Jon', by: '2026-11-06', title: 'Try the two just-for-fun winners', detail: 'After the next update of the site, on a rehearsal night that reaches Act 4 (the tech run will do): at the end of each group’s visit, the Library’s screen names whoever found the most pairs in In Duplicate, in Zimothy’s voice, and the Orangerie’s screen (the brain’s browser) names whoever slipped least in Get Off My Lawn!, in Salem’s voice. Check each names the right person. To see the two screens first without playing, the Game test tab has a sample of each under its game. Tell Claude Code anything that reads wrong.', tech: 'Samples: /play/?preview=kiosk-memory-winner, kiosk-memory-tie, kiosk-orangerie-winner, kiosk-orangerie-tie. play/src/screens/Rooms.jsx (MemoryRounds, Orangerie, RoomWinner), play/src/lib/rooms.js (mostPairs, fewestSlips), functions/lib/act4.js (memoryStep pairsBy, salemSlip slipsBy, salemPassed feltBy); checks G57 and G58; docs/room-screens.md. The Game test practices name no winner: the memory match on its own has no names, and Salem’s practice has no group.' },
]

// 29 Oct 2026 (Jon: "lets add a decoy element to the mouse", then "all the
// pets. zimmy is a similar color. I think after 3 missed your out, or it ends
// at 2 mins"): Whack-a-Mouse's pets, built (card 520, done). Then the same day
// "Lets use the black cat emoji for the tail" (on the Tail key of the menu,
// card 521) and "Make sure all strike systems show some verbage in the touch
// screen" (card 522), both built. Jon's try of the arcade (514) gains a line
// about them, and the arcade-on-the-night card (515) changes with them: the
// mice's points, and the menu's fish is gone.
export const MICE_PETS_1029_TASKS = [
  { order: 520, moment: 'act4.entryway', status: 'done', who: 'Claude Code', title: 'Whack-a-Mouse’s pets', detail: 'Built 29 Oct 2026, from your words: “lets add a decoy element to the mouse” and “all the pets. zimmy is a similar color. I think after 3 missed your out, or it ends at 2 mins”. From five seconds in, the household’s pets pop up among the mice, about one in four of what pops up: Sir Irwin, Granolia, Boo, Zimothy and Salem, each their own face picture, up as long as a mouse. A pet tapped scores nothing and shows on red for a moment, and the third ends the game: “You tapped three pets.”, and Boo says “Not the household, darling. Out you go.” The strip and the screen count them (Pets tapped: 1 of 3). A mouse that hides, or a tap on an empty key, costs nothing; otherwise the game ends at its two minutes, as before. A key a mouse has just left stays empty for half a second, so a tap a moment late never lands on a pet. The points come out about a quarter lower, as there are fewer mice. You try it with the rest of the arcade (Try Miss Boo LaRue’s Arcade with the Stream Deck + XL).', tech: 'play/src/lib/arcade.js (PETS; MICE_PETS_FROM_MS 5000, MICE_PET_ONE_IN 4, MICE_PETS_OUT 3, MICE_OOPS_MS 600, MICE_REST_MS 500 and rests; tallyOf, LOSE_WORDS.mice, BOO_LINES.pets), arcadeArt.js (PET_FILES from play/public/household/faces/, PET_BOXES, PETS_DRAWN), screens/Arcade.jsx (.arcade-tally); docs/boo-arcade.md §4 and §8; check G54 (play/test/arcade.test.mjs, arcadeMedia.test.mjs). Pretend players who never tap a pet: about 113, 106 and 45 in two minutes; one who takes one pet in 20 for a mouse (Zimothy one in ten) is out about one game in four.' },
  { order: 521, moment: 'act4.entryway', status: 'done', who: 'Claude Code', title: 'A black cat on the Tail key', detail: 'Built 29 Oct 2026, from your words: “Lets use the black cat emoji for the tail”, on the Tail key of the menu (your answer when asked where). The key for Boo Chasing Her Tail on the arcade’s menu shows a black cat over its name, with a pale glow so it shows on the dark blue. The treat Boo chases in the game stays a fish. You see it when you try the arcade (Try Miss Boo LaRue’s Arcade with the Stream Deck + XL).', tech: 'play/src/lib/arcadeArt.js (PICTURE.cat, MENU.tail, menu()); check G54 (play/test/arcadeMedia.test.mjs); docs/boo-arcade.md §1 and §8.' },
  { order: 522, moment: 'act4.entryway', status: 'done', who: 'Claude Code', title: 'Every strike says so on the touch strip', detail: 'Built 29 Oct 2026, from your words: “Make sure all strike systems show some verbage in the touch screen”. On the Stream Deck’s touch strip, for a moment in place of the points: “Strike 1! That’s a pet.” and then “Strike 2! That’s a pet.” when a pet is tapped in Whack-a-Mouse (a second and a half each, while you tap mice too), and “Too soon!” or “Too late!” when a press misses in Knock It Off the Table. Before Whack-a-Mouse starts, the strip says its rule: “Three pets and you’re out.” When any game ends, the strip says how, beside the points (“Boo bit her own tail.”, “Boo caught the red dot.”, “You tapped three pets.”, “Time’s up.”). Yarn Catch has no strikes: a ball that falls past the basket only scores nothing, so while it plays its strip shows the points, as before. You see it when you try the arcade (Try Miss Boo LaRue’s Arcade with the Stream Deck + XL).', tech: 'play/src/lib/arcade.js (STRIKE_WORDS_MS 1500; a game’s said, set by a pet tapped and a knock miss, cleared only by a knock; saidOf; GAMES rule and ruleOf on the ready and count strips; outcomeOf on the result’s strip and in resultLine); checks G54 and G56 (play/test/arcade.test.mjs); docs/boo-arcade.md §1, §3 and §4.' },
]
export const FILED_FOR_MICE_PETS_1029 = [
  { order: 514, title: 'Try Miss Boo LaRue’s Arcade with the Stream Deck + XL', note: '(29 Oct 2026: Whack-a-Mouse has the pets now, the Tail key on the menu is a black cat, and every strike says so on the touch strip. Say in the note box whether the pets come too often or too rarely, whether Zimothy is too easy to tap by mistake, and whether the words on the strip are easy to read.)' },
]
export const REWRITTEN_FOR_MICE_PETS_1029 = [
  { order: 515, title: 'The arcade on the night, if entrywayGame picks it', set: { detail: 'Only if you answer entrywayGame with the arcade. Then: the Entryway’s Act 4 round runs the arcade on Susan’s MacBook Pro; each player’s own clue about the Ghost on the Mac’s screen; the chime ends it with “Be on your way.”; Boo’s Catwalk comes out. From your try: even out the five games’ points, so a game played well pays about the same in each (today the winner leans on which games were picked), and whether a miss in Knock It Off the Table should cost a point or two (today a steady press without looking clears the table). Things to ask you then: whether each player’s clue goes by their own Boo affection or the group’s average, as in the other rooms; the second answer for Boo’s motive cross-off; whether the arcade’s sounds play from the Mac’s own speakers or the Parlour HomePod; what a player gets who has not had their clue when the chime rings; whether two-minute games stay (in ten minutes they leave little room for Boo’s winner and a trio’s third player’s line); and whether Boo’s treat in Boo Chasing Her Tail stays a fish, since fish-shaped is one of the bag clue words.', tech: 'functions/lib/act4.js (the Entryway’s reward), the night’s ?kiosk=boo, play/src/lib/arcade.js visit with a real clue in place of STAND_IN_CLUE; the points constants at the top of arcade.js (the reviewers’ bot players gave about 90 for the tail, 8 to 30 for the pointer, 45 to 113 for the mice since the pets of 29 Oct (57 to 156 before), 80 for the knock, 94 to 111 for the yarn); the visit’s timing (GAME_MS, TRIO_GAME_MS, CLUE_KEEP_MS, CUT_MIN_MS; docs/boo-arcade.md §5); checks G32, G48, G51 and the fake night.' } },
]

// 29 Oct 2026, later (Jon, looking at the arcade's menu: "Use the boo face
// image. Make the drop shadow less noticeable on the "tail." Knock should be
// the cat paws.  instead of the stars on the top row. Make it flashing like an
// arcade game."): the menu's look, built (card 523, done). Jon's try of the
// arcade (514) gains a line about it.
export const ARCADE_MENU_1029_TASKS = [
  { order: 523, moment: 'act4.entryway', status: 'done', who: 'Claude Code', title: 'The arcade’s menu: Boo’s face, paws and a flashing top row', detail: 'Built 29 Oct 2026, from your words: “Use the boo face image. Make the drop shadow less noticeable on the ‘tail.’ Knock should be the cat paws. instead of the stars on the top row. Make it flashing like an arcade game.” Boo’s face picture is on the top row’s middle key: a fresh page already showed it, and the screen now draws its keys again whenever the pictures come in, so a page left open while the code changes shows it too. The black cat on the Tail key has a much fainter glow. The Knock key shows Boo’s paws, the paws she swipes with in the game; the vase stays on her table. The top row is brass paws in place of the stars, flashing like an arcade’s sign: one paw in three lit, the lights running in towards Boo four times a second, and the winner’s top row flashes the same way. If you meant Boo’s face along the top row rather than paws, say so in the note box. You see it when you try the arcade (Try Miss Boo LaRue’s Arcade with the Stream Deck + XL).', tech: 'play/src/lib/arcade.js (MARQUEE_STEP_MS 250, marquee(), menuFaces(a, now), the winner stage; faces paw and paw-lit in FACE_IDS, star gone), play/src/lib/arcadeArt.js (FACES paw and paw-lit, pawPrint, litBrass; MENU.knock is swipe with no glow; the cat once at 0.35, blur 2), play/src/screens/Arcade.jsx (artReady a count, one more each time loadArt settles: a Vite hot update makes a new art module with no pictures); check G54 (play/test/arcade.test.mjs, arcadeMedia.test.mjs); docs/boo-arcade.md §1, §3 and the technical notes.' },
]
export const FILED_FOR_ARCADE_MENU_1029 = [
  { order: 514, title: 'Try Miss Boo LaRue’s Arcade with the Stream Deck + XL', note: '(29 Oct 2026, later: the menu’s top row is flashing paws with Boo’s face in the middle, the Knock key shows Boo’s paws, and the black cat’s glow is fainter. Say in the note box whether the flashing is too fast or too busy on the Stream Deck itself.)' },
]

// 29 Oct 2026, evening: Jon's three Game test notes on the arcade ("The
// stream deck is the game.", "Think glam!", the tail "not cat like") and his
// line after them, "Catwalk is 100% scarped", with his words since: "we can do far more the
// touch strip", "We need to use green for all sucessful input" and "make the
// yawn use the touch strip for left and right controls". The arcade made
// again (card 524, done) and the three notes closed by number. Jon answered
// entrywayGame ("its not motive its a ghost clue"), so the night card (515)
// loses its if and Claude chat gets the rules deck and the Intro script
// (525); he asked whether the Ghost has clues enough (ghostProof, his
// decision). His try (514) is written again for the new games.
export const RETIRED_FOR_ARCADE_REWORK_1029 = [
  { order: 10009, detail: 'Fixed 29 Oct 2026: the Stream Deck is the game, and while it is connected the Mac’s screen shows the points, the time, the strikes and Boo, big, never the controls. Whack-a-Mouse goes faster and up to six mice at once, with its three strikes as boxes on the touch strip. Boo Chasing Her Tail and The Lazy Pointer use only the two outside dials, one key a click. Knock It Off the Table is four tables, presses only, and things slide one key at a time. Yarn Catch drops the yarn one row at a time and the touch strip moves the basket. Every key answers at once, in black and gold from the house’s colours. No root beer: the tables are Boo’s own, not a copy of a classic game. Try it again.' },
  { order: 10010, detail: 'Fixed 29 Oct 2026: the games stay on the Stream Deck, made smooth: the key you press is drawn first, every picture is made once and kept, and the touch strip goes in six pieces, so it never holds up a key. The look is glam: black lacquer and gold with claret and parchment, a green tick for every success, a red cross for every strike, and a gold scoreboard on the Mac. If it is still not smooth on the Stream Deck, say so, and the games move to the Mac’s screen with the Stream Deck as the controller. Try it again.' },
  { order: 10011, detail: 'Fixed 29 Oct 2026: Boo herself chases her tail now, all over the keys: a fluffy black tail with a white tip that runs about by itself, its end and its middle in her way, so you catch the tip from behind or from the side. (Filed under Boo’s Catwalk, but it was the arcade’s tail: the Catwalk is scrapped.) Try it again.' },
]
export const ARCADE_REWORK_1029_TASKS = [
  { order: 524, moment: 'act4.entryway', status: 'done', who: 'Claude Code', title: 'Miss Boo LaRue’s Arcade, made again from your notes', detail: 'Built 29 Oct 2026, from your three notes from the Game test tab (“The stream deck is the game.”, “Think glam!” and the tail that is “not cat like”) and your words since: “we can do far more the touch strip”, “We need to use green for all sucessful input. Like a check if you get the mouse.” and “make the yawn use the touch strip for left and right controls”. The Stream Deck is the game. While it is connected, the Mac’s screen is the scoreboard, in big type: the game, the points, the time, the strikes, how many you have caught, Boo’s words, and a pop for every point and every strike. With no Stream Deck the deck is still drawn on the screen, to play with the mouse. The keys are black lacquer and gold with claret and parchment, the house’s colours, and no dark blue. Every success is a green tick and every strike a red cross. The keys answer at once: the key you pressed is drawn before anything else, every picture is made once and kept, and the touch strip is sent in six pieces, so it never holds up a key. The touch strip shows the points, the time as eight lights going out, and the three strikes as boxes, crossed in red as they go. The games: in Boo Chasing Her Tail a fluffy black tail with a white tip runs about the keys and you catch the tip (made again after your try: the card Boo Chasing Her Tail over the whole board). The Lazy Pointer moves one key a click, the left dial left and right and the right dial up and down; grab the sparkles, and Boo catching the dot is a strike. Whack-a-Mouse starts with two mice at once and goes up to six, faster as it goes, and Sir Irwin and his friends still come. Knock It Off the Table has four tables: things slide one key at a time towards the end of each, and you press the end key as one gets there; three misses and you’re out. Yarn Catch drops the yarn one row at a time, never skipping a row, and a tap on the left or the right of the touch strip moves the basket. No root beer: the tables are Boo’s own, not a copy of a classic game.', tech: 'play/src/lib/arcade.js (the five games made again: the constants at the top; the outside dials only, LEFT_DIAL 0 and RIGHT_DIAL 5, one key a click; stripOf with marks, lights, zones and dials; screenOf with tally, marks, said and count), arcadeArt.js (black lacquer and gold faces; hit is the green tick #33bd66, miss the house red cross; the tail as one band, tail-end, tail-fur and tail-tip; the four tables; drawStrip with the strike boxes, eight time lights and Yarn Catch’s halves), arcadeDeck.js (deckPainter: the pressed key first, then pictures, then flat keys, one write a turn; the strip in six 200-pixel bands by fillLcdRegion, or whole with &strip=whole; encodeJpeg keeps each face’s JPEG; warm), screens/Arcade.jsx (a 16 ms tick; the Scoreboard while the deck is connected; pops), styles.css (.arcade-board, .arcade-strikes, .arcade-pops); checks G54 to G56 and L09 (play/test/arcade.test.mjs, arcadeDeck.test.mjs, arcadeMedia.test.mjs); docs/boo-arcade.md. Perfect bot players over two minutes: about 314 for the tail (a click every 64 milliseconds), 262 for the mice, 117 for the knock, 113 for the yarn; one who never dodges Boo is out of the pointer in 18 seconds, and one who never presses is out of the knock in 9 (the tail and the mice changed again with card 528).' },
  { order: 525, moment: 'act1.rules', status: 'todo', who: 'Claude chat', by: '2026-11-06', title: 'The rules deck and the Intro script: the Entryway plays Boo’s arcade', detail: 'Jon scrapped Boo’s Catwalk on 29 Oct 2026. In Act 4 the Entryway plays Miss Boo LaRue’s Arcade, five little games on the Stream Deck + XL beside Susan’s MacBook Pro, two tokens each, in turns. After their second game each of the first two players gets their own clue about the Ghost from Boo (a trio’s third player gets a line from her instead), and no motive is crossed off there. Wherever the rules deck or the Intro and Rules Script names the Catwalk, striking a pose, or a motive crossed off in the Entryway, change it to the arcade, and end with a handoff.', tech: 'The rules deck: Claude Doc https://claude.ai/artifact/QGuBNcSDWkyfFqRg35V7yz. The Intro and Rules Script: https://claude.ai/artifact/DQiHjrdudoaKrLkCKjCLRx. The arcade: docs/boo-arcade.md.' },
  { order: 526, moment: 'allnight', status: 'done', who: 'Claude Code', title: 'No setup words on the guests’ screens on the night', detail: 'Built 29 Oct 2026, from your words: “make sure there is no programing things like connect stream deck and such visible to the players on the real game”. On the party night the room screens lose the corner dot and the Tap once to wake this screen note (the first tap anywhere still wakes the sound, and your Host tab has a dot for every screen under The house); nothing shows in the corners while a room is dark; the TV no longer says Held during a hold (your Host tab says so); and the Study says “Granolia has dozed off. Find a host.” if its station goes quiet. On the phones, a call that fails shows the screen’s own plain words, never a code like [400]; the Rehearsal text tag shows only on a rehearsal; and the Library’s line says the game is on the screen, not the iPad. Rehearsals and the practice pages keep their setup words. It is a rule in CLAUDE.md now, so every new screen keeps it. Still to do: the arcade’s Connect line and its Tap once to wake this screen note, and the words Boo’s camera shows before it is on, both with the card The arcade on the night; and the note in brackets a guest would see if a cat’s hint or the Study’s trace were ever missing (the card Never a note about the game on a guest’s screen).', tech: 'play/src/lib/screen.js showSetup(night, { looked }) (the dot and the wake note on a rehearsal and with no night, never on the party night, and not before the screen has looked for its night); Kiosk.jsx (StaleDot drawn only then, Wake hidden with its listener kept, Held only when finale.rehearsal, the Study’s stale line); styles.css (.kiosk.dark ~ .kiosk-dot, .kiosk-bell, .kiosk-wake: display none); Rooms.jsx (the Library’s own failed-send line, never e.message); play/src/lib/trouble.js troubleLine(e, fallback) at every call site (the server’s sentence without its [nnn] when its code is one the server says on purpose, else the screen’s words; never unauthenticated or internal); Cards.jsx RehearsalNight context (default true, App.jsx gives isRehearsalNight around Rest); Act4.jsx “The game is on the screen.”; Host.jsx “That didn’t work: press it again.”; app/src/lib/devices.js alive lines point at the Host tab; docs/room-screens.md, docs/play-side.md; check F31 (play/test/screen, rooms, finale, house, trouble, night, phone and gametest). Not covered yet: the arcade’s Connect line and wake corner (card 515), Boo’s camera’s setup words (card 515), and the server’s bracketed stand-ins for a missing hint or study line (functions/lib/deal.js HINT_PLACEHOLDER, station.js STUDY_PLACEHOLDER), which show untagged on the party night if a line is missing (card 529).' },
  { order: 527, moment: 'act4.puzzle', status: 'todo', who: 'Claude Code', by: '2026-11-11', title: 'In Duplicate: a finished board the house did not hear is never sent again', detail: 'Found 29 Oct 2026. In the Library, when a group finds the last pair and the iPad’s message does not reach the house (a dropped signal), the screen says “The Library did not hear that. Try the last pair again.”, but every card is already face up and nothing sends it again: only a reload (the group plays that board again) or the next board gets past it. Make the finished board send itself again until the house hears it, and the line go once it does.', tech: 'play/src/screens/Rooms.jsx: Board guards onClear with sent.current === boardKey, so a failed callMemoryStep in MemoryRounds’ send() is never retried, and its msg is not cleared on the next board. Retry with a short backoff while the board is the one on the table (check that functions/lib/act4.js memoryStep is safe to repeat for the same board and step), clear msg on success and on a new boardKey; a test in play/test/rooms.test.mjs. Found by the setup-words sweep’s check, 29 Oct.' },
  { order: 528, moment: 'act4.entryway', status: 'done', who: 'Claude Code', title: 'Boo Chasing Her Tail over the whole board, Back, and bigger coins', detail: 'Built 29 Oct 2026, from your try on the Mac: “the Tail game is better(on the mac but I can just hold an arrow button and it circles and win. Make it run over the entire board and out boos face for the front. make the paws boos face and dont let players hit it from the front. It blocks them. As time goes on it goes fast and add obsticals like maybe walls and other pets.” Boo Chasing Her Tail is played on all 36 keys now, and you move Boo herself, her face on a gold key: the left dial left and right, the right dial up and down, or the arrow keys. Her tail runs about the keys by itself, its end first and its white tip at the back, and runs from her when she comes close. Catch the white tip from behind or from the side: its end and its middle block her, so it is never caught head-on. It gets quicker as the game goes on, and from 15 seconds in a brick wall or one of her friends comes out every 15 seconds, up to six, and stays put; nothing is ever shut in. Holding an arrow key down no longer wins: a whole game of it catches one tip at most (it caught about 209 before). If you meant Boo’s face at the head of her own long tail, like a snake, say so and it changes. Every click of a dial is one key now, however quick the turn. The decoys in Whack-a-Mouse are Sir Irwin and his friends, not pets (“I want a better name than pets as they have these personas of friends to the family and the birthday boy”): Leave Sir Irwin and his friends alone, and a strike says who, for example “Strike 2! That’s Zimothy Clawford, Esq.” (Sir Irwin is “the birthday boy”). More mice are up at once as it goes on, two at first and up to six. Every strike is a big red cross on its key. Boo’s coins are bigger, on the keys (“They need to be bigger.”) and about two and a half times bigger on the screen. And the practice page has Back at the top (“on the pratice page I need a back button. Im stuck and cant get back.”): Back to the games leaves a free-play game, and Back to free play ends a practice visit at once.', tech: 'play/src/lib/arcade.js: the tail on the whole board (TAIL_STEP_MS 650 to TAIL_STEP_END_MS 300, TAIL_TURN_ONE_IN 4, TAIL_FLEE_KEYS 3, TAIL_AWAY_KEYS 4, TAIL_BLOCKS_FROM_MS and TAIL_BLOCKS_EVERY_MS 15000, TAIL_BLOCKS_MAX 6, TAIL_POINTS 2; a wall, then a friend, only where every free key keeps two free neighbours and all stay joined; TAIL_FRIENDS, never Boo); DIAL_MAX_KEYS 6, one key a click with each step checked; Whack-a-Mouse’s next mouse after its up time over miceAtOnce, never under MICE_SPAWN_MIN_MS; the friends’ words (FRIEND_NAMES); gold counted in the fun facts; Knock It Off the Table forgives a press within KNOCK_GONE_MS 300 after a thing got away, and draws the things over the flashes; no device’s name in the engine’s words; arcadeBack. arcadeArt.js: rug, tail-boo, wall, the strike crosses (strike()), COIN_ACROSS 64, the strike words fitted between the boxes and the time lights. screens/Arcade.jsx: Back at the top (leave(), LEAVABLE, Escape), the moment’s Start, Back and OK only with the deck drawn on the screen, pops in fixed spots; styles.css .arcade-back and the tokens min(3.2vw, 5.2vh). Checks G54 to G56 and L09. Perfect bot players over two minutes: the tail about 107 points at a key every 250 milliseconds, 208 at 150 and 527 at 64 (a shortest-way chaser, presses at exactly those gaps, 40 games each); the mice about 512 (289 before); a held arrow catches one tip at most (about 209 before).' },
  { order: 529, moment: 'allnight', status: 'todo', who: 'Claude Code', by: '2026-11-11', title: 'Never a note about the game on a guest’s screen', detail: 'Found 29 Oct 2026, by the check for setup words. If a cat’s hint or the Study’s trace were ever missing on the party night, the guest would see the house’s own note in brackets instead, such as “(Here the cat would rule something out.)”. A rehearsal marks that note; the party night shows it plain. Make sure it never reaches a guest: the checks find any missing line before the night, and if one is still missing on the night, your Host tab is told and the guest sees plain words of the house’s own (you say which), never a note about the game.', tech: 'functions/lib/deal.js HINT_PLACEHOLDER (hintLine, placeholder and none true: a case with no family for the guest, or a cat with no line) and functions/lib/station.js STUDY_PLACEHOLDER (studyClueCard with no reveal). The phones mark them only on a rehearsal (play/src/screens/Cards.jsx RehearsalNight, the Rehearsal text tag; Kiosk.jsx the trace’s Rehearsal line). functions/lib/checks.js skips a missing line (if (!line.text) continue) rather than failing: add a check, counts only, that every guest and cat on the dealt practice nights gets a real line. Named by card 526, from the F31 sweep, 29 Oct.' },
]
export const ANSWERED_FOR_ARCADE_REWORK_1029 = {
  entrywayGame: 'Miss Boo LaRue’s Arcade, for a clue about the Ghost and no motive (Jon, 29 Oct 2026: Boo’s Catwalk is scrapped)',
}
export const ARCADE_REWORK_1029_DECISIONS = [
  { key: 'ghostProof', moment: 'freeze', question: 'Nothing yet proves every guest can find the Ghost on the foggiest night. Build that check now in Claude Code, or wait for Claude chat’s patch?', options: ['Wait for Claude chat’s patch', 'Build it now in Claude Code'], answer: null, note: 'You, 29 Oct: “there is not enough to reveal the ghost”. Default: wait (worstDial, 24 Oct: Claude chat builds the check for the foggiest dial and sends it as a patch). The Ghost’s clues are the Study’s trace and a bag word from each cat in Act 4, and since 29 Oct a clue from Boo’s arcade for each player. Built now, the check would deal practice nights only, at the foggiest dial, and say only pass or fail and counts, never a clue. If it finds the Ghost too hard, more clues are a separate decision.' },
]
export const REWRITTEN_FOR_ARCADE_REWORK_1029 = [
  { order: 514, title: 'Try Miss Boo LaRue’s Arcade with the Stream Deck + XL', set: { detail: 'Once the site has the new arcade (Claude Code tells you): on a Mac, in Google Chrome (Safari can’t reach the Stream Deck), with the Stream Deck app quit, the Mac’s sound on its own speakers and the + XL plugged in, open the Game test tab, Miss Boo LaRue’s Arcade, The arcade, free play. Tap Connect the Stream Deck and pick it: the Mac’s screen becomes the scoreboard and the Stream Deck is the game. Play all five games: Back to the games, at the top of the screen, leaves one early. Then tap Try a group’s visit at the bottom of the same page, type two names and play the visit until the chime (or Ring the chime; Back to free play, beside it, leaves the visit at once). In the section’s note box, say: whether Boo Chasing Her Tail is right now (Boo herself chasing her tail all over the keys, the walls and her friends in the way); whether the keys now answer in time; which games are too fast or too slow; whether a tap on the left of the touch strip moves Yarn Catch’s basket left; whether the touch strip ever looks scrambled; whether Sir Irwin and his friends come too often in Whack-a-Mouse; whether Boo’s coins are big enough now; and whether Boo’s winner feels fair.', tech: 'WebHID needs Chrome or Edge on the https site (or localhost). The browser remembers the deck after the first Connect. One arcade tab holds the deck at a time: the tab opened last takes it, and the other says so, with Connect to take it back (after a replug, whichever tab asks first gets it). If the touch strip looks scrambled, add &strip=whole to the address: the strip is then sent whole, as before 29 Oct, slower but the same picture. The arcade alone: /play/?kiosk=boo&play=1.' } },
  { order: 515, title: 'The arcade on the night, if entrywayGame picks it', set: { title: 'The arcade on the night', detail: 'You answered entrywayGame on 29 Oct 2026: Boo’s Catwalk is scrapped, and Boo’s arcade gives a clue about the Ghost, not a motive (“its not motive its a ghost clue”). So: the Entryway’s Act 4 round runs the arcade on Susan’s MacBook Pro and the Stream Deck + XL; after their second game each of the first two players gets their own clue about the Ghost on the Mac’s screen, and a trio’s third gets Boo’s line; the chime ends it with “Be on your way.”; Boo’s Catwalk comes out of the night and the Game test tab, and her motive cross-off goes with it, with nothing in its place. On the night the Mac’s screen shows only the game: no Connect, no words about the Stream Deck or the browser, no Tap once to wake this screen, no practice buttons (you, 29 Oct: “make sure there is no programing things like connect stream deck and such visible to the players on the real game”); the Stream Deck is set up before the guests arrive. After your try: even out the five games’ points, so a game played well pays about the same in each. Things to ask you then, one at a time: whether each player’s clue goes by their own Boo affection or the group’s average, as in the other rooms; whether the arcade’s sounds play from the Mac’s own speakers or the Parlour HomePod; what a player gets who has not had their clue when the chime rings; whether two-minute games stay (in ten minutes they leave little room for Boo’s winner and a trio’s third player’s line); and whether Boo’s camera (Jenna’s iPad Pro, which took each group’s last pose on the Catwalk for the end credits) goes with the Catwalk or takes a photo of each group at the arcade instead.', tech: 'functions/lib/act4.js (the Entryway’s reward: each player’s Ghost bag clue in place of Boo’s cross-off), the night’s ?kiosk=boo, play/src/lib/arcade.js visit with a real clue in place of STAND_IN_CLUE; the points constants at the top of arcade.js (perfect bot players since the tail was made again on 29 Oct: about 107 for the tail at a key every 250 milliseconds, 208 at 150 and 527 at 64, about 512 for the mice, 117 for the knock, 113 for the yarn); the visit’s timing (GAME_MS, TRIO_GAME_MS, CLUE_KEEP_MS, CUT_MIN_MS; docs/boo-arcade.md §5); Boo’s Catwalk out of the night and the Game test tab; checks G32, G48, G51 and the fake night; the decision ghostProof. Boo’s camera (?kiosk=pose, play/src/screens/Pose.jsx): its setup words and its Turn on the camera button show until tapped, and again after a reload, so if it stays they go once it is set up (no setup words in front of the guests).' } },
]
