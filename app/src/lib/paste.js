// Paste a lot at once. Jon writes in Notes or a chat and pastes the lot;
// this reads it into lines and boxes without him retyping anything.
//
// The reader is forgiving: blank lines separate entries when there are any,
// otherwise every line is an entry; "Name · Job", "Name - Job", "Name: Job"
// and "Name | Job" all split the same way; bullets and numbers are dropped.
// Pure module (no React, no Firebase), tested by test/paste.test.mjs.

import { normalizeBeats, emptyBeat, CHOICE_KEYS, MAX_CHOICES } from './scenarios.js'

const BULLET = /^\s*(?:[-*•·▪◦]|\d+[.)]|[a-z][.)])\s+/i
const SEPARATORS = [' · ', ' — ', ' – ', ' | ', '\t', ': ', ' - ', ' -- ']

function clean(line) {
  return line.replace(/\s+$/, '').replace(BULLET, '')
}

// Split "Left · Right" on the first separator found, in priority order.
function splitFirst(line, seps = SEPARATORS) {
  for (const sep of seps) {
    const i = line.indexOf(sep)
    if (i > 0) return [line.slice(0, i).trim(), line.slice(i + sep.length).trim()]
  }
  return [line.trim(), '']
}

// Paragraphs: runs of lines separated by blank lines, cleaned.
function paragraphs(raw) {
  const text = String(raw ?? '').replace(/\r\n?/g, '\n')
  return text.split(/\n\s*\n/).map(p => p.split('\n').map(clean).filter(l => l.trim())).filter(p => p.length)
}

// Blocks for one-line lists: every line is a block. With blank lines, the
// paragraphs are kept for the lists that want them.
function blocks(raw) {
  const paras = paragraphs(raw)
  if (paras.length <= 1) return (paras[0] ?? []).map(l => [l])
  return paras
}

// A header line opens an entry: "Name · Job", "LOCKED: the line", "HOW TO
// WIN — body". Short on the left, something on the right, no sentence end.
const ATTACHMENT = /^(costume|what to wear|about|note|notes)\s*:/i
function isHeader(line) {
  if (ATTACHMENT.test(line)) return false
  const [a, b] = splitFirst(line)
  return !!b && a.split(/\s+/).length <= 5 && !/[.!?]$/.test(a)
}

// Entries for lists with a header and words under it: a header line starts
// a new entry; plain lines attach to the entry above. Works with or without
// blank lines between entries.
function entries(raw) {
  const out = []
  for (const p of paragraphs(raw)) {
    let current = null
    for (const line of p) {
      if (isHeader(line) || !current) { current = [line]; out.push(current) }
      else current.push(line)
    }
  }
  return out
}

// Match a typed label to a dropdown option: by stored value, by the plain
// label's first words, case-blind. Returns the stored value or ''.
function matchOption(label, options) {
  if (!options?.length) return label
  const want = label.trim().toLowerCase().replace(/[:.]$/, '')
  if (!want) return ''
  for (const o of options) {
    const value = typeof o === 'string' ? o : o.value
    const plain = typeof o === 'string' ? o : o.label
    if (value.toLowerCase() === want) return value
    if (plain.toLowerCase() === want) return value
    if (plain.toLowerCase().split(/[:(]/)[0].trim() === want) return value
  }
  // "locked" ~ "Locked out", "banner" ~ "Banner: the title card"
  for (const o of options) {
    const value = typeof o === 'string' ? o : o.value
    const plain = typeof o === 'string' ? o : o.label
    if (plain.toLowerCase().startsWith(want) || value.toLowerCase().startsWith(want)) return value
  }
  // "boo" ~ "Miss Boo LaRue, family friend…": a word of the label
  for (const o of options) {
    const value = typeof o === 'string' ? o : o.value
    const plain = typeof o === 'string' ? o : o.label
    const words = plain.toLowerCase().split(/[^a-z0-9]+/)
    if (want.split(/\s+/).every(w => words.includes(w))) return value
  }
  return ''
}

// Read pasted text for one list. Returns the entries as box values plus any
// lines that could not be read, in plain words.
export function parsePaste(area, raw, { fields, codec, options = {} } = {}) {
  if (area === 'scenarios') return parseScenarios(raw)
  const keys = (fields ?? []).map(f => f.key)
  const out = { items: [], skipped: [] }
  const push = (values) => out.items.push({ values, text: codec ? codec.join(values) : values[keys[0]] ?? '' })

  // one box: every line is a line (paragraph lists keep their line breaks)
  if (keys.length <= 1) {
    const key = keys[0] ?? 'text'
    const paragraphs = ['epilogue_frames', 'lore', 'ops_docs'].includes(area)
    const entries = paragraphs ? blocks(raw).map(b => b.join('\n')) : blocks(raw).flat()
    for (const line of entries) {
      let text = line
      if (area === 'echo_frames') text = text.replace(/\[(gap|secret|blank)\]|_{3,}|\(gap\)/gi, '███')
      if (text.trim()) push({ [key]: text })
    }
    return out
  }

  const grouped = ['bag_items', 'echo_frames'].includes(area) ? blocks(raw) : entries(raw)
  for (const block of grouped) {
    const [first, ...rest] = block
    const values = {}
    if (area === 'bios') {
      const [name, job] = splitFirst(first)
      // the fourteen names are fixed: match the pasted name to one of them
      const nameOpts = fields.find(f => f.key === 'name')?.options
      const matched = nameOpts ? matchOption(name, nameOpts) : name
      if (!matched) { out.skipped.push(`${first} (not one of the fourteen)`); continue }
      values.name = matched
      const persona = []
      // "Name · Job · persona" on one line, or "Name · persona"
      const [maybeJob, inline] = splitFirst(job)
      const looksLikeJob = /^(the )?[a-z ]{2,24}$/i.test(job)
      if (inline) persona.push(inline)
      else if (job && !looksLikeJob) persona.push(job)
      values.profession = inline ? maybeJob : (looksLikeJob ? job : '')
      for (const l of rest) {
        if (/^costume\s*:/i.test(l)) continue // nobody dresses up; dropped
        persona.push(l)
      }
      values.persona = persona.join(' ')
      push(values)
      continue
    }
    if (area === 'npc_cards') {
      const [name, after] = splitFirst(first)
      const who = matchOption(name, fields.find(f => f.key === 'who')?.options)
      if (!who) { out.skipped.push(`${first} (not one of the five)`); continue }
      // "Boo · family friend and socialite. About…" or "Boo · About…"
      const title = fields.find(f => f.key === 'who')?.options.find(o => o.value === who)?.label.split(', ').slice(1).join(', ') ?? ''
      let about = after
      if (title && about.toLowerCase().startsWith(title.toLowerCase())) about = about.slice(title.length).replace(/^\.?\s*/, '')
      values.who = who
      values.about = [about, ...rest].filter(Boolean).join(' ')
      push(values)
      continue
    }
    if (area === 'bag_items') {
      const parts = first.split(/\s*(?:·|—|–|\||,|\t)\s*/).map(p => p.trim()).filter(Boolean)
      let [item, sense, property] = parts
      if (sense && sense.includes(':') && !property) [sense, property] = sense.split(':').map(x => x.trim())
      values.item = item ?? ''
      values.sense = matchOption(sense ?? '', fields.find(f => f.key === 'sense')?.options)
      values.property = property ?? ''
      if (!values.item) { out.skipped.push(first); continue }
      push(values)
      continue
    }
    if (area === 'echo_frames') {
      const line = block.join(' ').replace(/\[(gap|secret|blank)\]|_{3,}|\(gap\)/gi, '███')
      push(codec.split(line))
      continue
    }
    // two boxes: a label or heading, then the words
    const [labelKey, textKey] = keys
    const labelField = fields.find(f => f.key === labelKey)
    let label = ''
    let text = ''
    if (rest.length && first.split(/\s+/).length <= 5 && !/[.!?]$/.test(first)) {
      label = first.replace(/[:\-–—]\s*$/, '')
      text = rest.join('\n')
    } else {
      const [l, t] = splitFirst(first)
      if (t) { label = l; text = [t, ...rest].join('\n') }
      else { label = ''; text = block.join('\n') }
    }
    if (labelField?.kind === 'select') {
      const matched = matchOption(label, labelField.options)
      if (label && !matched) { out.skipped.push(`${first} (no such ${labelField.label.toLowerCase()}: ${label})`); continue }
      label = matched
    }
    values[labelKey] = label
    values[textKey] = text
    if (!text.trim()) { out.skipped.push(first); continue }
    push(values)
  }
  return out
}

// Push and pull sets. A set is three questions, each followed by its
// choices with points, like:
//   Do you care which way your toilet paper sits?
//   Yes +5
//   No 0
//   Which way?
//   Over +5
//   Under -1
//   ...
// or on one line per question: "Which way? | Over +5 | Under -1".
// A blank line starts a new set; so does a fourth question.
const CHOICE = /^(.*?)\s*[([]?\s*([+-]?\d+)\s*[)\]]?\s*$/
export function parseScenarios(raw) {
  const out = { items: [], skipped: [] }
  let beats = []
  let beat = null
  const closeBeat = () => {
    if (!beat) return
    const b = { q: beat.q, n: Math.max(2, Math.min(MAX_CHOICES, beat.choices.length)) }
    CHOICE_KEYS.slice(0, b.n).forEach((k, i) => { b[k] = beat.choices[i]?.text ?? ''; b[`${k}v`] = beat.choices[i]?.value ?? 0 })
    beats.push(b)
    beat = null
  }
  const closeSet = () => {
    closeBeat()
    if (beats.length) {
      while (beats.length < 3) beats.push(emptyBeat())
      out.items.push({ beats: normalizeBeats(beats.slice(0, 3)), text: beats[0].q })
    }
    beats = []
  }
  const lines = String(raw ?? '').replace(/\r\n?/g, '\n').split('\n')
  for (const rawLine of lines) {
    const line = clean(rawLine)
    if (!line.trim()) { closeSet(); continue }
    // one line per question: "Q? | A +5 | B 0"
    if (line.includes('|')) {
      const [q, ...cs] = line.split('|').map(x => x.trim())
      closeBeat()
      if (beats.length === 3) closeSet()
      beat = { q, choices: [] }
      for (const c of cs) {
        const m = CHOICE.exec(c)
        if (m && m[1].trim()) beat.choices.push({ text: m[1].trim(), value: Number(m[2]) })
        else if (c) beat.choices.push({ text: c, value: 0 })
      }
      continue
    }
    const m = CHOICE.exec(line)
    const isChoice = m && m[1].trim() && !/\?$/.test(m[1]) && beat && beat.choices.length < MAX_CHOICES
    if (isChoice) { beat.choices.push({ text: m[1].trim(), value: Number(m[2]) }); continue }
    if (beat && beat.choices.length < 2 && !/\?$/.test(line)) {
      // a choice with no points yet
      beat.choices.push({ text: line.trim(), value: 0 })
      continue
    }
    closeBeat()
    if (beats.length === 3) closeSet()
    beat = { q: line.trim(), choices: [] }
  }
  closeSet()
  return out
}
