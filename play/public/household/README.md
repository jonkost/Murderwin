# The household

Pictures of the four cats and Sir Irwin, Boo's gold coin for her arcade, plus one
photo for the end credits.
The game finds a picture by its exact file name, spaces and capitals
included. Brought up to date 23 October 2026.

## What the game reads

**faces/** — head and shoulders, square. Shown small on the phone's Cats tab
and anywhere a cat speaks to you in a line of text. Miss Boo LaRue's Arcade
shows all five too: in Whack-a-Mouse as Sir Irwin and his friends, to leave
alone, in Boo Chasing Her Tail as the friends in Boo's way, and Boo's on her
own keys, each fitted to its key by where the animal sits in the picture. So after you
swap in a new face picture, ask Claude Code to fit it again: its checks will
say so until it does.

| File | Who |
|---|---|
| `Irwin Face.png` | Sir Irwin, the dog |
| `Granola Face.png` | Granolia Lickspittle |
| `Boo Face.png` | Miss Boo LaRue |
| `Zimmy Face.png` | Zimothy Clawford, Esq. |
| `Salem Face.png` | Salem Crooknog |
| `Boo Coin.png` | Boo's gold coin (29 October): each player's tokens in Miss Boo LaRue's Arcade, on the Stream Deck and on the Mac's screen. Fitted by where the coin sits in the picture, like the faces: swap it and ask Claude Code to fit it again. |

**full/** — the full portraits. All but one are used:

| File | Where it shows |
|---|---|
| `Irwin 1.png` to `Irwin 5.png` | His five moods on the living room TV, in his Act 5 countdown (by how clear the night has become, the same five steps as the trace). `Irwin 5.png` also shows on his rules slides and door slide in Act 6, and on his last card after the end credits. One of the five, varied, is on the Happy Birthday card, on the phones and the TV. |
| `Boo 1.png` to ` Boo 5.png`, `Granola 1.png` to `Granola 4.png`, `Salem 1.png` to `Salem 6.png`, `Zimmy 1.png` to `Zimmy 5.png` | On the room screens, one of each cat's pictures, changing through the night: since 26 October each cat on its room's rules card in Act 4 and Granolia on the Study's screen, and since 29 October Zimothy and Salem beside the winners of In Duplicate and Get Off My Lawn!. Boo's five are also her moods on the Mac's screen in Miss Boo LaRue's Arcade (since 28 October). The fifth Boo's name starts with a space. |

`Salem Boo.png` is not shown anywhere yet. Where it should show is your call:
tell Claude Code and it wires it in.

**sydney.jpg** — Sydney's photo for the end credits, saved straight in this
folder as `play/public/household/sydney.jpg`. Without it the card shows his
name only.

## Not used yet

**intro/** and **play/** are empty and no screen reads them. Tell Claude Code
before you draw for them.

Keep the names exactly as above: a face with a different name shows as a
broken picture. A missing Irwin mood falls back to a plain round face. Run
`npm run deploy:site` after adding pictures to put them online.
