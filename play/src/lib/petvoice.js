// The pets' voices (12 Nov 2026, Jon: "Can we get voices reading for the
// pets"). Every line a pet can say comes from an open bank, so each one is
// made ahead as a small sound file, in that pet's own voice
// (`npm run pet-voices`, scripts/pet-voices.mjs), and a phone or a room
// screen plays the file that belongs to the words it is showing.
//
// The file's name is worked out from the words themselves, the same way in
// the script and on the page, so nothing has to say which file goes with
// which line: play/public/voice/pets/<pet>-<key>.mp3. A line with no file
// (its words changed in the workshop, or the house is describing the cat and
// the cat says nothing) is simply silent. Nothing here is sealed: a phone
// only ever asks for the file of words it already holds.
//
// Pure (no React, no browser), so the script and the tests can both read it.

export const PETS = ['irwin', 'granolia', 'boo', 'zimothy', 'salem']
// The voice files are MP3s (Jon, 12 Nov 2026: "Make them MP3 files so it is easy to play out"): every
// browser and every player opens one.
export const PET_VOICE_EXT = '.mp3'

// Does a cat speak by itself on the phone that has just scanned its code? No:
// a cat speaks when the guest presses Hear on its card (12 Nov 2026, the
// review: Act 2 is for the guest's ears only, and a phone that talks by
// itself can be heard by the next guest in line before anyone can choose).
// The other way is built and tested: set this to true and a cat says its two
// lines once, by itself, at its own door, on that guest's own phone
// (lib/voicekit.js armVoice). Jon's to say.
export const CATS_SPEAK_BY_THEMSELVES = false

// The name each cat's lines call it by, when the house describes it ("Boo
// checks her reflection in your glass").
export const PET_SHORT = { irwin: 'Sir Irwin', granolia: 'Granolia', boo: 'Boo', zimothy: 'Zimothy', salem: 'Salem' }

// cyrb53: a small string hash (53 bits), the same in Node and in every browser.
function cyrb53(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

// The words as one line: every run of spaces and line breaks is one space.
export function tidyWords(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
}

// The key of a line's words (the words as shown, stage directions and all).
export function voiceKey(text) {
  return cyrb53(tidyWords(text)).toString(36)
}

// The file's name without its ending, or null when there is nothing to name.
export function petVoiceId(who, text) {
  const t = tidyWords(text)
  return PETS.includes(who) && t ? `${who}-${voiceKey(t)}` : null
}

// Where the page finds it, under the site's base (/play/).
export function petVoiceUrl(who, text, base = '/play/') {
  const id = petVoiceId(who, text)
  return id ? `${base}voice/pets/${id}${PET_VOICE_EXT}` : null
}

// What the voice says for a line on the screen: the words to speak, or ''
// when the pet says nothing because the line is the house describing the cat
// ("Boo looks you up and down."). Where the house quotes a cat ('Boo yawns.
// "So not it. Bye."') the voice says only what is between the quotes. A
// stage direction (*snort*) is not read out: the full stop before it is
// pause enough. A shouted word (EVERYTHING) is said, not spelled. Sir
// Irwin's lines and the motive rhymes are read whole.
export function speakable(text, who) {
  let t = tidyWords(text)
  if (!t) return ''
  if (who !== 'irwin') {
    const quoted = [...t.matchAll(/"([^"]+)"/g)].map(m => m[1].trim()).filter(Boolean)
    if (quoted.length) t = quoted.join(' ')
    else if (PET_SHORT[who] && t.startsWith(`${PET_SHORT[who]} `)) return ''
  }
  t = tidyWords(t.replace(/\*[^*\n]+\*/g, ' ').replace(/\b[A-Z]{2,}\b/g, w => w.toLowerCase()))
  return /[A-Za-z0-9]/.test(t) ? t : ''
}

// The lines of Sir Irwin's dessert speech, in the order the Parlour TV shows
// them (functions/lib/screen.js: his opener, the line that says how sure he
// is, the motives he names, his closer). `screen` is nights/{id}/public/screen.
export function irwinSpeech(screen) {
  const lines = (Array.isArray(screen?.lines) ? screen.lines : []).map(tidyWords).filter(Boolean)
  const rhymes = (Array.isArray(screen?.choices) ? screen.choices : []).map(c => tidyWords(c?.rhyme)).filter(Boolean)
  if (!rhymes.length) return lines
  return [...lines.slice(0, -1), ...rhymes, ...lines.slice(-1)]
}

// Does a screen that shows this now speak it? Only one that came up a moment
// ago: a TV reloaded minutes later never starts the speech again. `at` and
// `now` are milliseconds on the server's clock.
export const SPEECH_FRESH_MS = 20_000
export const SPEECH_LEAD_MS = 2200 // after the chime that opens the beat
export function speechFresh(at, now) {
  const since = Number(now) - Number(at)
  return Number.isFinite(since) && since >= -2000 && since < SPEECH_FRESH_MS
}
