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

// "Item — sense: property" -> {item, sense, property}
export const SENSES = ['sight', 'sound', 'smell', 'touch', 'taste']
export const bagCodec = {
  split(text) {
    const t = text ?? ''
    const i = t.indexOf('—')
    if (i < 0) return { item: t, sense: '', property: '' }
    const item = t.slice(0, i).trim()
    const rest = t.slice(i + 1).trim()
    const c = rest.indexOf(':')
    if (c < 0) return { item, sense: rest, property: '' }
    return { item, sense: rest.slice(0, c).trim().toLowerCase(), property: rest.slice(c + 1).trim() }
  },
  join({ item, sense, property }) {
    const a = (item ?? '').trim()
    const s = (sense ?? '').trim()
    const p = (property ?? '').trim()
    if (!s && !p) return a
    return `${a} — ${s}: ${p}`
  },
}

// "NAME IN CAPS — the title. Two or three sentences about them." -> {name, title, about}
export const npcCodec = {
  split(text) {
    const t = text ?? ''
    const i = t.indexOf('—')
    if (i < 0) return { name: '', title: '', about: t }
    const name = t.slice(0, i).trim()
    const rest = t.slice(i + 1).trim()
    const m = /^([^.]*)\.\s*/.exec(rest)
    // the title is a short phrase; a long first sentence is the About box
    if (!m || m[1].trim().split(/\s+/).length > 8) return { name, title: '', about: rest }
    return { name, title: m[1].trim(), about: rest.slice(m[0].length) }
  },
  join({ name, title, about }) {
    const n = (name ?? '').trim()
    const ti = (title ?? '').trim()
    const ab = (about ?? '').trim()
    const body = ti && ab ? `${ti}. ${ab}` : ti ? `${ti}.` : ab
    if (!n) return body
    return `${n} — ${body}`
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
