# Sessions

A short log of every working session on Murderwin, newest first. One entry
per session: the date, the tool (Claude Code or Claude chat), what changed,
what is left, and the decisions taken.

Claude Code adds an entry at the end of every session (`CLAUDE.md`, HOW WE
WORK). A Claude chat's session gets its entry when its handoff is applied.
Jobs are not tracked here: they live on the workshop Timeline. Decisions live
on the Canon.

## 23 Oct 2026 · Claude Code

**What changed**
- Jon deployed everything built on 22 Oct.
- An audit of every doc, the Claude Docs and the workshop board against the
  code, then fixes the same day to the docs, the Claude Docs, the board and
  the code.
- Built in code (live after the next deploy):
  - Act 4 phones: the group card, the study card, the cat card (never
    Granolia), and "Free time" in place of Check-in, with one of the five tips.
  - Sir Irwin's Act 5 screen shows only his opener, the countdown line, the
    motive cards and his closer.
  - The closing bulletin: each name card waits for its lead-in line; the next
    name cuts off the recording that is playing; the brain's window prints
    only counts, and the recordings reach it under codes that do not name the
    family.
  - The Relay Drawing: Irwin's slides stay up long enough to read, slide 3
    shows the practice smiley's B1 square, the "Pawsome!" door slide shows on
    the TV, and the picture bank refuses trace and motive objects and a star.
  - Granolia's lines read cleanly. A big red REHEARSAL band on every phone and
    room screen on a rehearsal night. The end-credit awards show only in the
    credits.
  - The Host tab: a dot for the memory match iPad, and the Act 2 line "Cat
    visits: N of M guests have seen all four". A True Friend sees Salem's
    honour text on the Cats tab. The memory match cards have file-folder backs.
    The preview samples and the Host tab's beat texts match the new Act 2 and
    Act 6.
  - Sir Irwin's line over the trace reveal reads its words from the workshop,
    as the other hosts' lines do. The Victim's epilogue starts two seconds
    after the closing bulletin's last part, not over it.
  - Safety: the "murderwin" preview server now serves only `hosting/`, on this
    Mac only, and the phone dev server refuses the key files and `chats/`.
- Start Here rewritten as the map: right now, where things live, how we work,
  a dated status snapshot, the dates, and the freeze rules.
- The project system (CLAUDE.md, HOW WE WORK): decisions on the Canon, jobs on
  the workshop Timeline, the live status on "Where we are", Start Here as the
  map, dated handoffs from Claude chats, this log, and the end-of-session
  routine.

**What is left**
- The open decisions, each a card on the board (16): secretLines, newsVideo,
  stewardPictures, partnerAwards, diningName, rulesDeckScreen, tidyFolders,
  bagsAct4, handOn, tutorial8, swapMotive, grossnola, and four the audit
  found: ballotMajority (the room's majority pick in Act 7), bulletin2Voice
  and bulletin2Known (who records bulletin 2), dialMapping (the dial's
  direction is fixed in code, the rules say blind per night).
- The rules deck: twelve slides are edited but not published. Publishing was
  blocked by a permission check; Jon allows it or publishes them.
- Not built yet (cards on the board): replay a night by its seed; Home's
  count-only rows for whether the secrets, leans, packing list and drawing
  pictures exist; the motive card pictures slot; video playback (only if
  newsVideo says video); a Drawing pictures tab for Jenna (only if
  stewardPictures says yes); removing the unused echo fragments, study clue
  and Irwin lines from the generator and Jenna's page (after secretLines).
- Everything else is on the board. Next: the weekend practice game, 24-25 Oct.

**Decisions taken**
- The project system above.
- Settled by default (Jon may change either): the Act 4 cat station never
  sends a group to Granolia, because her room, the Study, holds the light
  puzzle; the deduction round comes after the door opens.

## 22 Oct 2026, evening · Claude Code

**What changed**
- Applied and built the 22 Oct handoff (`docs/handoff-2026-10-22.md`). Fifteen
  commits, c8b76a4 to f705587:
  - c8b76a4: the docs and the Canon to the handoff.
  - 568cc23, 0bf5f46, f4ebe71: the solving-the-case side copy merged into main.
  - 7fe0491: Irwin's five-card countdown; bulletin 1 crosses off one family;
    every guest visits all four cats in Act 2, with one real hint.
  - 897fb30, a103d67: Salem starts at 3, the Parlour Games stop him at 4,
    Salem petted on the Host tab; Act 6 opens on its two Parlour Games.
  - 82be5d5: the board files the handoff's jobs by moment.
  - 551e43e: W-O-O-F News. 37732ef: the Cat Hint Lines. 8051d40: the hosts'
    lines. 3b319a4: the end credits. ca7804c: the Relay Drawing.
  - 5d73852, f705587: the board marks the handoff's Claude cards done and adds
    two jobs for Jon (the drawing pictures, a photo of Sydney).

**Left out on purpose**
- The Partner in Crime and Ghost Whisperer awards (now decision partnerAwards).
- A drawing pictures tab on Jenna's page (now decision stewardPictures).

**What is left**
- Rehearsal mode for the weekend practice game (handoff section 12), the
  recordings, the art, and the blind runs the week before. All on the board.

**Decisions taken**
- None new in Claude Code. The handoff's decisions were taken by Jon in a
  Claude chat (below).

## 22 Oct 2026, daytime · three Claude Code sessions and a Claude chat

**What changed**
- Claude Code, the Parlour Games rebuild: twelve timed pop-ups a night from a
  seeded plan, one set for every phone, secretly listening cats with a sealed
  lean table on Jenna's page, the overlay on the phone. Commits 51d7061 and
  bc69a78. Earlier that morning c0b62ec committed the 21 Oct docs
  (`parlour-games.md`, `solving-the-case.md`, `test-plan.md`).
- Claude Code, how the case gets solved, built in a side copy (worktree
  epic-lehmann-fdcd31): motive families, the Act 2 room waves, the study pays
  the Ghost's trace, the memory match, Irwin's options. Committed as 568cc23
  and merged into main as 0bf5f46 that evening.
- Claude Code, the workshop Timeline: the night in order, every job filed by
  its moment (c7fcd30). Also that day: the workshop's Devices page (9070f29).
- Claude chat: wrote the 22 Oct handoff, the W-O-O-F News Recording Script,
  the Cat Hint Lines and The Relay Drawing · How to Play page.

**What was left**
- Applying the handoff. Done that evening (above).

**Decisions taken (Jon)**
- The twelve Parlour Games are one budget for the night: five, five and two;
  a game an act runs out of time for carries into the next act.
- The cats' leans are made blind by a script; Jenna may change any lean.
- The trace ladder: 1 black and white and hazy, 2 colour and less hazy, 3 two
  similar options, 4 the picture, 5 the picture and its name.
- Everything in the handoff: no hidden events in any act, the new clue path,
  the cat ladders, W-O-O-F News, the hosts, the Relay Drawing, the end credits.
