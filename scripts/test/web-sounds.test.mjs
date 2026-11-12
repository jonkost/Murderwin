// A2 (11 Nov 2026): the cue sounds for the screens and phones, made from media/.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, existsSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { webSoundPlan, isStandIn, writeWebSounds, WEB_FILTER } from '../web-sounds.mjs'
import { samplesFor, wavBytes } from '../make-placeholder-sounds.mjs'
import { SOUND_IDS, CLIP_IDS } from '../../cues/lib/cues.js'

const tone = (hz, seconds, pad = 1, rate = 22050) => {
  const out = new Int16Array(Math.round(rate * (pad + seconds)))
  for (let i = Math.round(rate * pad), k = 0; i < out.length; i++, k++) out[i] = Math.round(Math.sin(2 * Math.PI * hz * k / rate) * 0.2 * 32767)
  return wavBytes(out, rate)
}

test('the plan: the nine cue sounds only, never a recording; a stand-in tone is left out; a missing one is counted', () => {
  const files = ['chime-phone.wav', 'blackout.wav', 'sting-door.m4a', 'bulletin2-opening.wav', 'woof-close-field-out.wav', 'newsflash-bathroom.wav', 'notes.txt']
  const bytes = { 'chime-phone.wav': wavBytes(samplesFor('chime-phone')), 'blackout.wav': tone(300, 1) }
  const plan = webSoundPlan(files, f => bytes[f] ?? null)
  assert.deepEqual(plan.make, [{ id: 'sting-door', file: 'sting-door.m4a' }, { id: 'blackout', file: 'blackout.wav' }])
  assert.deepEqual(plan.standIns, ['chime-phone'])
  assert.equal(plan.make.length + plan.standIns.length + plan.missing.length, SOUND_IDS.length)
  for (const m of plan.make) assert.ok(!CLIP_IDS.includes(m.id) && SOUND_IDS.includes(m.id))
  assert.ok(isStandIn('chime-news', wavBytes(samplesFor('chime-news'))))
  assert.ok(!isStandIn('chime-news', wavBytes(samplesFor('chime-phone'))), 'another id\'s tone is not this one\'s')
  assert.ok(!isStandIn('chime-news', null))
})

test('the copy: the silence in front off and made loud, as an mp3 in the folder; a stand-in makes none and loses an old copy', { skip: spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0 && 'no ffmpeg here' }, () => {
  assert.match(WEB_FILTER, /^silenceremove=start_periods=1.*loudnorm=I=-14/)
  const media = mkdtempSync(join(tmpdir(), 'web-sounds-media-'))
  const out = mkdtempSync(join(tmpdir(), 'web-sounds-out-'))
  writeFileSync(join(media, 'sting-door.wav'), tone(440, 0.8, 1))
  writeFileSync(join(media, 'chime-phone.wav'), wavBytes(samplesFor('chime-phone')))
  writeFileSync(join(out, 'chime-phone.mp3'), 'old')
  writeFileSync(join(media, 'bulletin2-opening.wav'), tone(200, 0.5))
  const lines = []
  const r = writeWebSounds({ media, out, log: l => lines.push(l) })
  assert.equal(r.made, 1)
  assert.deepEqual(r.failed, [])
  assert.ok(existsSync(join(out, 'sting-door.mp3')))
  assert.ok(!existsSync(join(out, 'chime-phone.mp3')), 'the copy of a stand-in goes')
  assert.ok(!existsSync(join(out, 'bulletin2-opening.mp3')), 'never a recording')
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(out, 'sting-door.mp3')]).stdout.toString()
  assert.ok(parseFloat(probe) < 1.2, `the second of silence is gone (${probe.trim()} s)`)
  assert.match(lines.join('\n'), /1 made, 0 up to date, 1 stand-in tones left out/)
  // a second run keeps the copy
  const before = statSync(join(out, 'sting-door.mp3')).mtimeMs
  assert.equal(writeWebSounds({ media, out, log: () => {} }).kept, 1)
  assert.equal(statSync(join(out, 'sting-door.mp3')).mtimeMs, before)
})

test('media-import runs it, the folder is out of git with its README kept, and npm run web-sounds is there', () => {
  const src = p => readFileSync(new URL(p, import.meta.url), 'utf8')
  assert.ok(src('../media-import.mjs').includes('const web = writeWebSounds({ media: MEDIA })'))
  const ignore = src('../../.gitignore')
  assert.ok(ignore.includes('play/public/sound/*\n!play/public/sound/README.md'))
  assert.ok(existsSync(new URL('../../play/public/sound/README.md', import.meta.url)))
  assert.equal(JSON.parse(src('../../package.json')).scripts['web-sounds'], 'node scripts/web-sounds.mjs')
})
