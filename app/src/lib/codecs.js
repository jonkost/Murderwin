// How one saved line splits into boxes, and joins back.
//
// Every list keeps one `text` line per item in the database, so nothing
// already written changes shape. A codec turns that line into named boxes
// for the screen ({label, text}, {item, sense, property}, ...) and joins the
// boxes back into the line on every keystroke. The round trip must be
// lossless for well-formed lines, and must never throw on a malformed one:
// a line that does not fit lands whole in the main box, untouched.
//
// Pure module: no React, no Firebase, no JSON imports. Tested by
// test/codecs.test.mjs (node --test).

const CAPS_LABEL = /^([A-Z][A-Z0-9 '&/]*):[ \t]*/

// "LABEL: the line" -> {label, text}. Only a CAPS label counts, so a plain
// sentence with a colon in it stays whole.
export const labelCodec = {
  split(text) {
    const t = text ?? ''
    const m = CAPS_LABEL.exec(t)
    if (!m) return { label: '', text: t }
    return { label: m[1], text: t.slice(m[0].length) }
  },
  // A label is always capitals (the game files lines by it), so a label
  // typed in lowercase is stored in capitals rather than swallowed.
  join({ label, text }) {
    const l = (label ?? '').trim().toUpperCase()
    const b = text ?? ''
    if (!l) return b
    return `${l}:${/^\s/.test(b) || !b ? '' : ' '}${b}`
  },
}

// "TITLE — body" -> {title, body}
export const dashCodec = {
  split(text) {
    const t = text ?? ''
    const i = t.indexOf('—')
    if (i < 0) return { title: '', body: t }
    return { title: t.slice(0, i).trim(), body: t.slice(i + 1).replace(/^\s+/, '') }
  },
  join({ title, body }) {
    const a = (title ?? '').trim()
    const b = body ?? ''
    return a ? `${a} — ${b}` : b
  },
}

// "Item — sense: word; sense: word · kind · stock N · looks like: note · tag: tag"
// -> {item, words, kind, stock, looks, tag}. The final bag items (Jon bought
// them 23 Oct 2026, docs/handoff-2026-10-23.md §15). `words` keeps the
// "sense: word" pairs as written ("no clue words" for an item with none). A
// September line ("Item — sense: property", no kind) splits to item and
// words only, and joins back as it was.
export const SENSES = ['sight', 'sound', 'smell', 'touch', 'taste']
export const BAG_KINDS = ['food, two singles', 'food, one pack', 'touch', 'extra']
export const BAG_TAGS = ['spooky', 'fun', 'no-no']
export const bagCodec = {
  split(text) {
    const t = text ?? ''
    const i = t.indexOf('—')
    const empty = { item: t, words: '', kind: '', stock: '', looks: '', tag: '' }
    if (i < 0) return empty
    const [words, ...tail] = t.slice(i + 1).split('·').map(s => s.trim())
    const out = { ...empty, item: t.slice(0, i).trim(), words }
    for (const seg of tail) {
      const low = seg.toLowerCase()
      if (BAG_KINDS.includes(low)) out.kind = low
      else if (/^stock\s/.test(low)) out.stock = seg.slice(5).trim()
      else if (low.startsWith('looks like:')) out.looks = seg.slice(seg.indexOf(':') + 1).trim()
      else if (low.startsWith('tag:')) out.tag = seg.slice(seg.indexOf(':') + 1).trim().toLowerCase()
    }
    return out
  },
  join({ item, words, kind, stock, looks, tag }) {
    const a = (item ?? '').trim()
    const w = (words ?? '').trim()
    const parts = [kind, stock && `stock ${String(stock).trim()}`, looks && `looks like: ${String(looks).trim()}`, tag && `tag: ${tag}`].map(x => (x ?? '').trim()).filter(Boolean)
    if (!w && !parts.length) return a
    return [`${a} — ${w || 'no clue words'}`, ...parts].join(' · ')
  },
}

// "MISS BOO LARUE — family friend and socialite. Two or three sentences." -> {who, about}
// The five of the household have fixed names and titles, so the card is one
// pick (who) and one box (about); the name and title are filled in from the
// pick. A line whose name is not one of the five lands whole in About.
// Salem is Crooknog, never Crookshank (Canon): a line saved under the old
// heading still opens as Salem's card, and saving it writes the new one.
export const HOUSEHOLD = [
  { key: 'irwin', name: 'SIR IRWIN', title: 'the dog' },
  { key: 'salem', name: 'SALEM CROOKNOG', title: 'the long-time groundskeeper' },
  { key: 'zimothy', name: 'ZIMOTHY CLAWFORD, ESQ.', title: 'the old family solicitor' },
  { key: 'boo', name: 'MISS BOO LARUE', title: 'family friend and socialite' },
  { key: 'granolia', name: 'GRANOLIA LICKSPITTLE', title: 'taken in by the family when no one else would' },
]
const whoByName = (name) => {
  const n = (name ?? '').trim().toLowerCase().replace(/[.,]/g, '')
  return HOUSEHOLD.find(h => h.name.toLowerCase().replace(/[.,]/g, '') === n || n.includes(h.key))?.key ?? ''
}
export const npcCodec = {
  split(text) {
    const t = text ?? ''
    const i = t.indexOf('—')
    if (i < 0) return { who: '', about: t }
    const who = whoByName(t.slice(0, i))
    if (!who) return { who: '', about: t }
    let rest = t.slice(i + 1).trim()
    const h = HOUSEHOLD.find(x => x.key === who)
    if (rest.toLowerCase().startsWith(h.title.toLowerCase())) rest = rest.slice(h.title.length).replace(/^\.?\s*/, '')
    return { who, about: rest }
  },
  join({ who, about }) {
    const h = HOUSEHOLD.find(x => x.key === who)
    const ab = (about ?? '').trim()
    if (!h) return ab
    return ab ? `${h.name} — ${h.title}. ${ab}` : `${h.name} — ${h.title}.`
  },
}

// "...the lead-in ███, and the rest..." -> {before, after}. The gap itself is
// never typed: it is drawn between the two boxes.
const GAP = /█+/
export const echoCodec = {
  split(text) {
    const t = text ?? ''
    const m = GAP.exec(t)
    if (!m) return { before: t, after: '' }
    const after = t.slice(m.index + m[0].length).replace(/^\s+/, '')
    // a gap with nothing after it stays in the first box, so it is never lost
    if (!after) return { before: t, after: '' }
    return { before: t.slice(0, m.index).replace(/\s+$/, ''), after }
  },
  // The gap is drawn once there is something on both sides, or once the
  // writer has started the second box. A line with no gap and an empty
  // second box stays exactly as it was.
  join({ before, after }) {
    const a = (before ?? '').replace(/\s+$/, '')
    const b = (after ?? '').replace(/^\s+/, '')
    if (!b) return before ?? ''
    const a2 = a.replace(/\s*\u2588+\s*$/, '')
    const glue = /^[,.;:!?)'"\u201d\u2019]/.test(b) ? '' : ' '
    return `${a2}${a2 ? ' ' : ''}\u2588\u2588\u2588${glue}${b}`
  },
}

// "Message for the guest. Button: what it says" -> {message, button}
const BUTTON = /\s*\bButton:\s*/
export const fillerCodec = {
  split(text) {
    const t = text ?? ''
    const m = BUTTON.exec(t)
    if (!m) return { message: t, button: '' }
    return { message: t.slice(0, m.index), button: t.slice(m.index + m[0].length) }
  },
  join({ message, button }) {
    const a = (message ?? '').replace(/\s+$/, '')
    const b = (button ?? '').trim()
    return b ? `${a} Button: ${b}` : a
  },
}

// "NAME — the Profession. Who they are. Costume: what to wear" -> four boxes.
export const characterCodec = {
  split(text) {
    const t = (text ?? '').trim()
    const dash = t.indexOf('—')
    const name = dash >= 0 ? t.slice(0, dash).trim() : ''
    let rest = dash >= 0 ? t.slice(dash + 1).trim() : t
    let costume = ''
    const c = rest.search(/Costume:/i)
    if (c >= 0) { costume = rest.slice(c + 8).trim(); rest = rest.slice(0, c).trim() }
    let profession = ''
    const m = /^(the\s+[^.]+)\.\s*/i.exec(rest)
    if (m) { profession = m[1].replace(/^the\s+/i, '').trim(); rest = rest.slice(m[0].length) }
    return { name, profession, persona: rest.trim(), costume }
  },
  join({ name, profession, persona, costume }) {
    const parts = []
    if (profession?.trim()) parts.push(`the ${profession.trim().replace(/^the\s+/i, '')}.`)
    if (persona?.trim()) parts.push(persona.trim().replace(/([^.!?…])$/, '$1.'))
    if (costume?.trim()) parts.push(`Costume: ${costume.trim().replace(/([^.!?…])$/, '$1.')}`)
    const body = parts.join(' ')
    return name?.trim() ? `${name.trim().toUpperCase()} — ${body}` : body
  },
}

// A single box.
export const plainCodec = {
  split(text) { return { text: text ?? '' } },
  join({ text }) { return text ?? '' },
}

// Does the first box hold anything? Used to decide whether a draft is empty.
export function hasContent(values) {
  return Object.values(values ?? {}).some(v => typeof v === 'string' && v.trim())
}
