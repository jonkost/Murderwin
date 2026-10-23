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
  { order: 306, moment: 'act2.puzzle', status: 'todo', who: 'Jon', standin: true, title: 'The seven stationery pictures', detail: 'Only if the safe’s document stays (the cats’ secret lines decision, Act 2, Go to a cat). Your seven designs replace the stand-in files in play/public/stationery, same names: receipt, telegram, household-notice, citation-form, personal-letter, playbill, mourning-card. Give the pictures to Claude Code, which puts them in and deploys. The upload on the Stationery page is a reference copy only and never reaches the phones.' },
  { order: 327, moment: 'act2.news', status: 'todo', who: 'Claude Code', title: 'Play the W-O-O-F News videos on the TV', detail: 'Only if you choose video (the W-O-O-F News decision above). Bulletin 1 and the closing bulletin as video on the living room TV, with the three cards cut into the closing one. Bulletin 2 stays sound on the Orangerie HomePod.' },
  { order: 340, moment: 'act2.cat', status: 'todo', who: 'Jon', by: '2026-10-25', title: 'Time one round of cat visits', detail: 'At this weekend’s practice game, time one guest’s four cat visits. Tell Claude Code the minutes: Act 2’s length and the visit timings are set from them.' },

  // Act 3
  { order: 307, moment: 'act3.down', status: 'todo', who: 'Jon', title: 'Music for dinner', detail: 'Atmosphere only. The W-O-O-F News recordings are the only sounds that carry clues, and their words are always on a screen too.' },
  { order: 302, moment: 'act3.groups', status: 'todo', when: 'later', who: 'Jon', title: 'Move the iPad to the Library', detail: 'After supper, carry the iPad Pro to its small stand in the Library, with Zimothy. Open ?kiosk=memory and tap once to wake it.' },
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
  { key: 'act4Granolia', moment: 'act4.cat', question: 'The Act 4 cat station: may it send a group to Granolia, or does it skip her, since her room, the Study, holds the light puzzle?', options: ['Skip Granolia in Act 4 (she is in the Study)', 'Granolia may be the cat too'], answer: 'Skip Granolia in Act 4 (she is in the Study)', answeredBy: 'settled by default', note: 'Settled by default on 23 Oct 2026, as built. You may change it.' },
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

// Every card the timeline seeded, for looking a live card up by its order.
export const ALL_TIMELINE_TASKS = [...TIMELINE_TASKS, ...STANDIN_SOUND_TASKS, ...HANDOFF_TASKS, ...HANDOFF_BUILT_TASKS, ...AUDIT_TASKS]

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
