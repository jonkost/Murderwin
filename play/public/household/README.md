# The household

Pictures of the four cats and Sir Irwin, plus one photo for the end credits.
The game finds a picture by its exact file name, spaces and capitals
included. Brought up to date 23 October 2026.

## What the game reads

**faces/** — head and shoulders, square. Shown small on the phone's Cats tab
and anywhere a cat speaks to you in a line of text. Miss Boo LaRue's Arcade
shows all five too, as the pets in Whack-a-Mouse (and Boo's on her own keys),
each fitted to its key by where the animal sits in the picture. So after you
swap in a new face picture, ask Claude Code to fit it again: its checks will
say so until it does.

| File | Who |
|---|---|
| `Irwin Face.png` | Sir Irwin, the dog |
| `Granola Face.png` | Granolia Lickspittle |
| `Boo Face.png` | Miss Boo LaRue |
| `Zimmy Face.png` | Zimothy Clawford, Esq. |
| `Salem Face.png` | Salem Crooknog |

**full/** — the full portraits. Only Sir Irwin's five are used today:

| File | Where it shows |
|---|---|
| `Irwin 1.png` to `Irwin 5.png` | His five moods on the living room TV, in his Act 5 countdown (by how clear the night has become, the same five steps as the trace). `Irwin 5.png` also shows on his rules slides and door slide in Act 6, and on his last card after the end credits. |

The other pictures in full/ (Boo 1 to 5, Granola 1 to 4, Salem 1 to 6,
Salem Boo, Zimmy 1 to 5) are not shown anywhere yet. The study screen draws
a plain circle for Granolia. Where the cats' full pictures should show is
your call: tell Claude Code and it wires them in.

**sydney.jpg** — Sydney's photo for the end credits, saved straight in this
folder as `play/public/household/sydney.jpg`. Without it the card shows his
name only.

## Not used yet

**intro/** and **play/** are empty and no screen reads them. Tell Claude Code
before you draw for them.

Keep the names exactly as above: a face with a different name shows as a
broken picture. A missing Irwin mood falls back to a plain round face. Run
`npm run deploy:site` after adding pictures to put them online.
