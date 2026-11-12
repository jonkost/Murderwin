// The music, Hue scene and projector planner. Pure: given what the night
// said before and what it says now, return what the brain should do with
// Apple Music, the Hue scenes and the projector's plug. The mapping itself
// is the safe config file cues/scenes.json (the cue sheet: Jon's cue list of
// 25 Oct 2026, docs/cue-list.md); this file only reads it.
//
// Inputs are the public docs any phone may read:
//   night  nights/{id}                 { act 0-7, beat, phase, pausedFrom }
//   cues   nights/{id}/public/cues     { hall, scene: { name, at }, music: { command, at }, cake: { at } }
//   relay  nights/{id}/public/relay    { state, doorOpen }
//   sounds nights/{id}/public/sounds   { current: { id, at, clips?, ... } }
//   study  nights/{id}/public/study    { state: 'idle'|'playing'|'reproducing'|'entering'|'done'|'absent' }
//
// The planner is edge-triggered on the sheet: it acts only when the answer
// for the current moment changes, so a beat inside an act changes nothing
// unless scenes.json says so, a relay restarted mid-night puts the right
// music, lights and projector back once, and a host's own choice (the Host
// tab's scene or music buttons) holds until the sheet next changes.

import { SOUND_IDS, SOUND_STALE_MS, phaseOf, stamp, blackoutStageOf } from './cues.js'
import { musicShortcutProblems } from './shortcutMusic.js'
import { blackoutShortcutProblems } from './blackoutShortcuts.js'

// The drawing is running while public/relay.state is one of these.
export const DRAWING_RUNNING = ['intro', 'walk', 'turn', 'vote', 'lockout']
export const MUSIC_COMMANDS = ['play', 'pause', 'next']
export const PHASES = ['lobby', 'act', 'blackout', 'prompt', 'paused']
export const PROJECTOR_STATES = ['on', 'off']
export const OFF = 'off'

// The door is open once the drawing's last picture is named, or the hall is green.
export function doorOpen(docs = {}) {
  return !!docs.relay?.doorOpen || docs.cues?.hall === 'green'
}

export function drawingRunning(docs = {}) {
  return DRAWING_RUNNING.includes(docs.relay?.state) && !doorOpen(docs)
}

// Where the night is. A paused night counts as the phase it was paused from.
export function momentOf(night, now = Date.now()) {
  if (!night) return null
  return { act: Number(night.act) || 0, beat: night.beat ?? null, phase: phaseOf(night, now) }
}

function pick(key, ...layers) {
  for (const l of layers) if (l && Object.hasOwn(l, key)) return l[key]
  return null
}

// The three settings every layer may carry: music (a playlist key, 'off' or
// null), hue (a scene name or null), projector ('on', 'off' or null).
export const LAYER_KEYS = ['music', 'hue', 'projector']

function layerOver(base, layer) {
  if (!layer) return base
  const out = { ...base }
  for (const k of LAYER_KEYS) if (Object.hasOwn(layer, k) && layer[k] !== null) out[k] = layer[k]
  return out
}

// What the sheet wants now: { music, hue, projector }, each null for "leave
// it as it is". The phase layer (the blackout, the power returning) wins
// over the beat, which wins over the act. Then, outside those dark phases,
// the drawing's overlays in its acts: `drawing` while the relay runs and the
// door is shut (cue 17: intense at 35, the Drawing scene), and
// `drawing.unlocked` once the door is open (cue 18: the music comes up to 60
// the moment the third picture is named, before the host presses Next).
// `cut` is the newscast having begun (planScenes keeps it): the music is off.
export function targetFor(docs = {}, cfg, { cut = false, now = Date.now() } = {}) {
  const m = momentOf(docs.night, now)
  if (!m || !cfg) return { music: null, hue: null, projector: null }
  const actCfg = cfg.acts?.[String(m.act)] ?? null
  const beatCfg = (m.beat && actCfg?.beats?.[m.beat]) || null
  const phaseCfg = cfg.phases?.[m.phase] ?? null
  let t = { music: pick('music', phaseCfg, beatCfg, actCfg), hue: pick('hue', phaseCfg, beatCfg, actCfg), projector: pick('projector', phaseCfg, beatCfg, actCfg) }
  const dark = m.phase === 'blackout' || m.phase === 'prompt'
  const d = cfg.drawing
  if (!dark && d && (d.acts ?? []).includes(m.act)) {
    if (drawingRunning(docs)) t = layerOver(t, d)
    else if (doorOpen(docs)) t = layerOver(t, d.unlocked)
  }
  if (cut) t.music = OFF
  // the blackout's press (A1): the music stops the moment it is pressed, ahead of the dark
  if (blackoutStageOf(docs.night, now) === 'press') t.music = OFF
  return t
}

// Is the newscast's cut on at this moment? `cut: { acts, beats, trigger }`:
// on that act and beat, once the trigger has been seen (a clips-only sound,
// the closing bulletin's first part, for 'clips'; or a sound id), the music
// is off and stays off for that beat. The next beat's music applies when the
// beat changes (the credits, cue 22).
export function cutKey(m, cfg) {
  const c = cfg?.cut
  if (!c || !m || !(c.acts ?? []).includes(m.act) || !(c.beats ?? []).includes(m.beat)) return null
  return `${m.act}/${m.beat}`
}

export function cutTriggered(docs = {}, cfg) {
  const cur = docs.sounds?.current
  if (!cur) return false
  const trigger = cfg?.cut?.trigger ?? 'clips'
  if (trigger === 'clips') return !cur.id && (cur.clips?.length ?? 0) > 0
  return cur.id === trigger
}

// The dim study scene (cue 11): while the study's public state says a group
// is at the wall (`study.states`) in `study.acts`, the `playing` scene; when
// it leaves them, the `idle` scene. Edge-triggered; nothing until the first
// group plays. Returns 'playing' | 'idle'.
export function studyWants(docs = {}, cfg) {
  const s = cfg?.study
  const m = momentOf(docs.night)
  if (!s || !m) return 'idle'
  const dark = m.phase === 'blackout' || m.phase === 'prompt'
  if (dark || !(s.acts ?? []).includes(m.act)) return 'idle'
  return (s.states ?? []).includes(docs.study?.state) ? 'playing' : 'idle'
}

// (The Parlour HomePod is no longer lent to Susan's MacBook Pro in Act 4:
// the sheet's `boo` block, a leftover from the Entryway's first game, went on
// 11 Nov 2026. Every HomePod stays in the house music all night.)

// `moment` is the act, beat and phase the planner last saw, as one word: the
// stop is sent again when it moves while the sheet still wants silence.
export function emptySceneState() {
  return { music: null, hue: null, projector: null, playlist: null, cut: null, study: null, moment: null, cakeCmd: null, musicCmd: null, sceneCmd: null }
}

// The moment as one word, for telling when the night has moved.
export function momentKey(m) {
  return m ? `${m.act}/${m.beat ?? ''}/${m.phase}` : null
}

function playAction(cfg, key, why) {
  const p = cfg.playlists[key]
  return { type: 'music', do: 'play', playlist: key, name: p.name, volume: p.volume, why }
}

function fresh(at, now) {
  return !at || now - at < SOUND_STALE_MS
}

// What to do now. Actions:
//   { type: 'music', do: 'play', playlist, name, volume, why }   play that playlist (shuffle, repeat)
//   { type: 'music', do: 'pause', why }                           stop the music
//   { type: 'scene', name, why }                                  recall every Hue scene with that name
//   { type: 'projector', do: 'on'|'off', why }                     the projector's plug
//   { type: 'cake', song, volume, seconds, speakers?, why: 'host' } play that one song; the sheet comes back after
// `why` is 'sheet' (scenes.json), 'host' (a Host tab button), 'study' (the
// dim study scene) or 'cake' (the candles). A stop with `again: true` is the
// sheet's stop sent a second time: the night moved on (the rules, then the
// blackout) and the sheet still wants silence, so the brain asks again
// rather than trust that the first stop reached every HomePod (11 Nov 2026).
export function planScenes(prev = emptySceneState(), docs = {}, now = Date.now(), cfg = null) {
  const actions = []
  const state = { ...emptySceneState(), ...prev }
  if (!cfg) return { actions, state }
  const m = momentOf(docs.night, now)

  // the newscast's cut: sticky for its beat, forgotten when the beat changes
  const ck = cutKey(m, cfg)
  state.cut = ck && (prev.cut === ck || cutTriggered(docs, cfg)) ? ck : null

  const t = targetFor(docs, cfg, { cut: !!state.cut, now })
  const mk = momentKey(m)
  if (t.music !== null && t.music !== prev.music) {
    if (t.music === OFF) actions.push({ type: 'music', do: 'pause', why: 'sheet' })
    else if (cfg.playlists?.[t.music]) { actions.push(playAction(cfg, t.music, 'sheet')); state.playlist = t.music }
    state.music = t.music
  } else if (t.music === OFF && prev.music === OFF && prev.moment && mk && mk !== prev.moment) {
    // still silence, and the night has moved: the stop once more
    actions.push({ type: 'music', do: 'pause', why: 'sheet', again: true })
  }
  if (mk) state.moment = mk
  if (t.hue !== null && t.hue !== prev.hue) {
    actions.push({ type: 'scene', name: t.hue, why: 'sheet' })
    state.hue = t.hue
  }
  if (t.projector !== null && t.projector !== prev.projector && PROJECTOR_STATES.includes(t.projector)) {
    actions.push({ type: 'projector', do: t.projector, why: 'sheet' })
    state.projector = t.projector
  }

  // the dim study: its scene when a group starts at the wall, the idle scene when it stops
  if (cfg.study) {
    const want = studyWants(docs, cfg)
    if (want !== prev.study && (want === 'playing' || prev.study === 'playing')) {
      actions.push({ type: 'scene', name: want === 'playing' ? cfg.study.playing : cfg.study.idle, why: 'study' })
    }
    state.study = want
  }

  // Cake! (the Host tab's button, public/cues.cake.at): once per stamp, while
  // fresh: the song and the candles. The brain forgets the music and the
  // scene when the song ends, so the sheet puts them back.
  const cake = docs.cues?.cake
  if (cfg.cake && cake && stamp(cake.at)) {
    const at = stamp(cake.at)
    const key = `cake@${at}`
    if (key !== prev.cakeCmd) {
      state.cakeCmd = key
      if (fresh(at, now)) {
        actions.push({ type: 'cake', song: cfg.cake.song, volume: cfg.cake.volume, seconds: cfg.cake.seconds, ...(cfg.cake.speakers !== undefined ? { speakers: cfg.cake.speakers } : {}), why: 'host' })
        if (cfg.cake.hue) actions.push({ type: 'scene', name: cfg.cake.hue, why: 'cake' })
      }
    }
  }

  // the host's music buttons: once per press, and only while fresh
  const mc = docs.cues?.music
  if (mc && MUSIC_COMMANDS.includes(mc.command)) {
    const at = stamp(mc.at)
    const key = `${mc.command}@${at}`
    if (key !== prev.musicCmd) {
      state.musicCmd = key
      if (fresh(at, now)) {
        if (mc.command === 'pause') actions.push({ type: 'music', do: 'pause', why: 'host' })
        else {
          const keys = Object.keys(cfg.playlists ?? {})
          if (keys.length) {
            const choice = state.playlist && keys.includes(state.playlist)
              ? (mc.command === 'next' ? keys[(keys.indexOf(state.playlist) + 1) % keys.length] : state.playlist)
              : (keys.includes(t.music) ? t.music : keys[0])
            actions.push(playAction(cfg, choice, 'host'))
            state.playlist = choice
          }
        }
      }
    }
  }

  // the host's scene button: recall it once per press, while fresh
  const sc = docs.cues?.scene
  const name = typeof sc?.name === 'string' ? sc.name.trim() : ''
  if (name && name.length <= 64) {
    const at = stamp(sc.at)
    const key = `${name}@${at}`
    if (key !== prev.sceneCmd) {
      state.sceneCmd = key
      if (fresh(at, now)) actions.push({ type: 'scene', name, why: 'host' })
    }
  }
  return { actions, state }
}

// After the cake song: forget the music and the scene the sheet last set, so
// the next plan puts the moment's playlist and scene back (the jazz, Default).
export function afterCake(state) {
  return { ...state, music: null, hue: null }
}

// Does this cue action make a sound here (so Music ducks under it)? A
// bulletin the Parlour TV plays as video makes none of its own.
export function ducksFor(action) {
  return action?.type === 'sound' && (!!action.id || (action.clips?.length ?? 0) > 0)
}

// How long after a cue has finished before Music comes back up: a short
// tail, or for a chime whose bulletin plays on the TV as video, until
// videoHoldSeconds after the cue began (0 on the sheet since 25 Oct: the
// sheet stops the music for the news video itself).
// `elsewhere` (11 Nov 2026): the cue's sound is played by the screens and
// the phones, so nothing finishes here to time the tail by; the music stays
// down for SCREEN_CUE_HOLD_MS from the cue's start, long enough for a sting.
export const DUCK_TAIL_MS = 800
export const SCREEN_CUE_HOLD_MS = 3500
export function unduckDelayMs(action, startedAt, now, cfg, { elsewhere = false } = {}) {
  const tail = elsewhere ? Math.max(DUCK_TAIL_MS, startedAt + SCREEN_CUE_HOLD_MS - now) : DUCK_TAIL_MS
  if (!action?.video) return tail
  const hold = Math.max(0, Number(cfg?.videoHoldSeconds) || 0) * 1000
  return Math.max(tail, startedAt + hold - now)
}

// Every Hue scene name the sheet uses: the ones Jon makes in the Hue app.
export function sceneNames(cfg) {
  const names = new Set()
  const add = l => { if (typeof l?.hue === 'string' && l.hue.trim()) names.add(l.hue) }
  for (const p of Object.values(cfg?.phases ?? {})) add(p)
  for (const a of Object.values(cfg?.acts ?? {})) { add(a); for (const b of Object.values(a?.beats ?? {})) add(b) }
  add(cfg?.drawing); add(cfg?.drawing?.unlocked)
  for (const k of ['playing', 'idle']) if (typeof cfg?.study?.[k] === 'string' && cfg.study[k].trim()) names.add(cfg.study[k])
  add(cfg?.cake)
  return [...names]
}

// The names the sheet needs in the Music app: the playlists, and the one song.
export function playlistNamesOf(cfg) {
  return [...new Set(Object.values(cfg?.playlists ?? {}).map(p => p?.name).filter(n => typeof n === 'string' && n.trim()))]
}

// Plain-English problems with a scenes.json (empty when it is fine). The
// messages name the place in the file, never a sound id.
export function sceneProblems(cfg, { soundIds = SOUND_IDS } = {}) {
  const out = []
  if (!cfg || typeof cfg !== 'object') return ['it is not a JSON object']
  const lists = cfg.playlists
  if (!lists || typeof lists !== 'object' || !Object.keys(lists).length) out.push('playlists is missing')
  for (const [k, p] of Object.entries(lists ?? {})) {
    if (k === OFF) out.push('a playlist may not be called off')
    if (typeof p?.name !== 'string' || !p.name.trim()) out.push(`playlists.${k} has no name`)
    if (!isLevel(p?.volume)) out.push(`playlists.${k}.volume is not 0 to 100`)
  }
  if (!isLevel(cfg.whisper)) out.push('whisper is not 0 to 100')
  if (!(Number(cfg.videoHoldSeconds) >= 0)) out.push('videoHoldSeconds is not a number of seconds')
  const checkLayer = (where, l) => {
    if (!l || typeof l !== 'object') { out.push(`${where} is not an object`); return }
    if (Object.hasOwn(l, 'music') && l.music !== null && l.music !== OFF && !lists?.[l.music]) out.push(`${where}.music is not a playlist, "off" or null`)
    if (Object.hasOwn(l, 'hue') && l.hue !== null && (typeof l.hue !== 'string' || !l.hue.trim())) out.push(`${where}.hue is not a scene name or null`)
    if (Object.hasOwn(l, 'projector') && l.projector !== null && !PROJECTOR_STATES.includes(l.projector)) out.push(`${where}.projector is not "on", "off" or null`)
  }
  const checkActs = (where, acts) => { if (!Array.isArray(acts) || !acts.every(a => Number.isInteger(a) && a >= 0 && a <= 7)) out.push(`${where}.acts is not a list of acts`) }
  for (const [p, l] of Object.entries(cfg.phases ?? {})) {
    if (!PHASES.includes(p)) out.push(`phases.${p} is not a phase`)
    checkLayer(`phases.${p}`, l)
  }
  for (const [a, l] of Object.entries(cfg.acts ?? {})) {
    if (!/^[0-7]$/.test(a)) out.push(`acts.${a} is not an act`)
    checkLayer(`acts.${a}`, l)
    for (const [b, bl] of Object.entries(l?.beats ?? {})) checkLayer(`acts.${a}.beats.${b}`, bl)
  }
  if (cfg.drawing) {
    checkLayer('drawing', cfg.drawing)
    checkActs('drawing', cfg.drawing.acts)
    if (cfg.drawing.unlocked) checkLayer('drawing.unlocked', cfg.drawing.unlocked)
  }
  if (cfg.offForTheNight) out.push('offForTheNight is gone since 25 Oct 2026: the newscast cut is "cut" (acts, beats, trigger)')
  out.push(...musicShortcutProblems(cfg))
  out.push(...blackoutShortcutProblems(cfg)) // Jon's two Shortcuts for the blackout (12 Nov 2026)
  if (cfg.cut) {
    checkActs('cut', cfg.cut.acts)
    if (!Array.isArray(cfg.cut.beats) || !cfg.cut.beats.length || !cfg.cut.beats.every(b => typeof b === 'string' && b.trim())) out.push('cut.beats is not a list of beat names')
    if (cfg.cut.trigger !== 'clips' && !soundIds.includes(cfg.cut.trigger)) out.push('cut.trigger is not "clips" (the newscast\'s recorded parts) or one of the sounds')
  }
  if (cfg.study) {
    checkActs('study', cfg.study.acts)
    for (const k of ['playing', 'idle']) if (typeof cfg.study[k] !== 'string' || !cfg.study[k].trim()) out.push(`study.${k} is not a scene name`)
    if (!Array.isArray(cfg.study.states) || !cfg.study.states.length || !cfg.study.states.every(s => typeof s === 'string' && s.trim())) out.push('study.states is not a list of the study\'s states')
  }
  if (cfg.boo) out.push('boo is gone since 11 Nov 2026: no HomePod is lent in Act 4, so take the boo block out')
  if (cfg.cueSounds !== undefined && !CUE_SOUND_ROADS.includes(cfg.cueSounds)) out.push('cueSounds is not "screens" or "brain"')
  if (cfg.cueSpeechDelaySeconds !== undefined && !(Number(cfg.cueSpeechDelaySeconds) >= 0 && Number(cfg.cueSpeechDelaySeconds) <= 10)) out.push('cueSpeechDelaySeconds is not 0 to 10 seconds')
  if (cfg.cake) {
    if (cfg.cake.speakers !== undefined && !cakeSpeakersOk(cfg.cake.speakers)) out.push('cake.speakers is not "homepods", "mac" or a list of speaker names')
    if (typeof cfg.cake.song !== 'string' || !cfg.cake.song.trim()) out.push('cake.song is not a song name')
    if (!isLevel(cfg.cake.volume)) out.push('cake.volume is not 0 to 100')
    if (cfg.cake.hue !== undefined && cfg.cake.hue !== null && (typeof cfg.cake.hue !== 'string' || !cfg.cake.hue.trim())) out.push('cake.hue is not a scene name or null')
    if (!(Number(cfg.cake.seconds) > 0)) out.push('cake.seconds is not a number of seconds')
  }
  for (const c of ['red', 'green', 'decor']) {
    const s = cfg.strings?.[c]
    if (!s) { out.push(`strings.${c} is missing`); continue }
    if (!(s.hue >= 0 && s.hue <= 360)) out.push(`strings.${c}.hue is not 0 to 360`)
    if (!isLevel(s.sat)) out.push(`strings.${c}.sat is not 0 to 100`)
    if (!isLevel(s.brightness)) out.push(`strings.${c}.brightness is not 0 to 100`)
  }
  return out
}

function isLevel(v) {
  return Number.isInteger(v) && v >= 0 && v <= 100
}

// Who makes a cue's sound (11 Nov 2026, "the game felt quiet"). "screens",
// the default: every room screen and every phone plays the cue itself, the
// moment it is called (a chime, a sting, the scream, bulletin 2's sounder),
// so the brain plays no cue sound at all: it only speaks the recordings that
// only it has (bulletin 2), a moment after the sounder (cueSpeechDelayMs).
// "brain": the brain plays every cue from its own sound output as well, as
// it did before 11 Nov; beside the screens that is an echo about a second
// late, so it is for a night when the screens' sound has failed.
export const CUE_SOUND_ROADS = ['screens', 'brain']
export function cueSoundsRoad(cfg) {
  return cfg?.cueSounds === 'brain' ? 'brain' : 'screens'
}

// Does the brain play this cue's own sound (its id) from its own output?
// Its recordings, when it has any to speak, play here either way.
export function brainPlaysId(action, cfg) {
  return action?.type === 'sound' && !!action.id && cueSoundsRoad(cfg) === 'brain'
}

// How long the brain waits before it speaks, after a cue whose sound the
// screens and phones are playing: long enough for the sounder to ring out,
// so the first word is never under it. cueSpeechDelaySeconds on the sheet.
export const CUE_SPEECH_DELAY_MS = 2000
export function cueSpeechDelayMs(cfg) {
  const s = Number(cfg?.cueSpeechDelaySeconds)
  return Number.isFinite(s) && s >= 0 ? Math.round(s * 1000) : CUE_SPEECH_DELAY_MS
}

// Where the cake's song plays: "homepods" (every HomePod the Music app can
// see, the default), "mac" (the Music app's own output, as before 11 Nov), or
// a list of speaker names from the Music app's AirPlay list.
function cakeSpeakersOk(v) {
  if (v === 'homepods' || v === 'mac') return true
  return Array.isArray(v) && v.length > 0 && v.every(n => typeof n === 'string' && n.trim())
}
