// Sir Irwin's voice for the drawing's slides (handoff 11 Nov 2026, A7 step 3;
// Jon: "Can I get a voiceover made for those slides?").
//
// One list, seed/irwin-lines.json, holds his seven rules slides and his door
// line: the words the Parlour TV shows AND the words his voice says, so the
// two can never drift apart. `npm run irwin-voice` (scripts/irwin-voice.mjs)
// makes one sound file a line, play/public/voice/<id>.m4a (not in git), and
// writes how long each one is to seed/irwin-voice.json (in git), with a short
// key of the words it was made from.
//
// The slides run on the server's clock, so the server needs those lengths: a
// slide with a recording stays up for the recording plus one second; a slide
// with none keeps the old timing (five seconds and 0.4 of a second a word)
// and is silent. A length whose words key no longer matches the slide's words
// (a line changed and the command not run again) counts as no recording, so
// the TV never plays a voice saying something the screen does not show.
//
// Nothing here is sealed: the words are safe content, written for everyone.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const seedDir = joinPath(here, '..', 'seed') // copied from ../seed by `npm run seed`
const readJson = (name, fallback) => {
  try { return JSON.parse(readFileSync(joinPath(seedDir, name), 'utf8')) } catch { return fallback }
}

export const IRWIN_LINES = readJson('irwin-lines.json', { slides: [], door: null })
export const VOICE_LENGTHS = readJson('irwin-voice.json', { voice: null, lines: {} })

// A recording stays up this much longer than it speaks (the handoff: "its recording plus one second").
export const VOICE_PAD_MS = 1_000
// The old timing, for a slide with no recording: five seconds, and 0.4 of a second a word.
export const SLIDE_BASE_MS = 5_000
export const SLIDE_WORD_MS = 400
const words = text => String(text ?? '').trim().split(/\s+/).filter(Boolean).length
export function slideMs(text) { return SLIDE_BASE_MS + SLIDE_WORD_MS * words(text) }

// A short key of a line's words: the same words, the same key (the script writes it beside each length).
export function wordsKey(text) {
  return createHash('sha1').update(String(text ?? '').trim().replace(/\s+/g, ' ')).digest('hex').slice(0, 12)
}

// How long a line's recording is, in seconds, or 0 when there is none (or it was made from other words).
export function voiceSeconds(line, lengths = VOICE_LENGTHS) {
  const row = lengths?.lines?.[line?.id]
  const s = Number(row?.seconds)
  if (!(s > 0) || row?.words !== wordsKey(line?.text)) return 0
  return s
}

// A line's time on the screen and its voice: { ms, voice } where voice is the
// file's id (play/public/voice/<id>.m4a) or null for a silent slide.
export function lineTiming(line, lengths = VOICE_LENGTHS) {
  const s = voiceSeconds(line, lengths)
  if (!s) return { ms: slideMs(line?.text), voice: null, voiceMs: 0 }
  const voiceMs = Math.round(s * 1000)
  return { ms: voiceMs + VOICE_PAD_MS, voice: line.id, voiceMs }
}

// Every id the command makes, in order: the seven slides, then the door.
export function voiceIds(lines = IRWIN_LINES) {
  return [...(lines?.slides ?? []).map(l => l.id), ...(lines?.door ? [lines.door.id] : [])]
}
