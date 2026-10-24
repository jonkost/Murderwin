// The music and Hue scene planner. Pure: given what the night said before and
// what it says now, return what the brain should do with Apple Music and the
// Hue scenes. The mapping itself is the safe config file cues/scenes.json
// (the cue sheet, handoff 23 Oct section 2d); this file only reads it.
//
// Inputs are the public docs any phone may read:
//   night  nights/{id}                 { act 0-7, beat, phase, pausedFrom }
//   cues   nights/{id}/public/cues     { hall, scene: { name, at }, music: { command, at } }
//   relay  nights/{id}/public/relay    { state, doorOpen }
//   sounds nights/{id}/public/sounds   { current: { id, at, ... } }
//
// The planner is edge-triggered on the sheet: it acts only when the answer
// for the current moment changes, so a beat inside an act changes nothing
// unless scenes.json says so, a relay restarted mid-night puts the right
// music and lights back once, and a host's own choice (the Host tab's scene
// or music buttons) holds until the sheet next changes.

import { SOUND_IDS, SOUND_STALE_MS, stamp } from './cues.js'

// The drawing is running while public/relay.state is one of these.
export const DRAWING_RUNNING = ['intro', 'walk', 'turn', 'vote', 'lockout']
export const MUSIC_COMMANDS = ['play', 'pause', 'next']
export const PHASES = ['lobby', 'act', 'blackout', 'prompt', 'paused']
export const OFF = 'off'

// The door is open once the drawing's last picture is named, or the hall is green.
export function doorOpen(docs = {}) {
  return !!docs.relay?.doorOpen || docs.cues?.hall === 'green'
}

export function drawingRunning(docs = {}) {
  return DRAWING_RUNNING.includes(docs.relay?.state) && !doorOpen(docs)
}

// Where the night is. A paused night counts as the phase it was paused from.
export function momentOf(night) {
  if (!night) return null
  const phase = night.phase === 'paused' ? (night.pausedFrom || 'act') : (night.phase || 'act')
  return { act: Number(night.act) || 0, beat: night.beat ?? null, phase }
}

function pick(key, ...layers) {
  for (const l of layers) if (l && Object.hasOwn(l, key)) return l[key]
  return null
}

// What the sheet wants now: { music: playlist key | 'off' | null, hue: scene name | null }.
// null means "leave it as it is". `over` is the night's music being done
// (offForTheNight).
export function targetFor(docs = {}, cfg, { over = false } = {}) {
  const m = momentOf(docs.night)
  if (!m || !cfg) return { music: null, hue: null }
  const actCfg = cfg.acts?.[String(m.act)] ?? null
  const beatCfg = (m.beat && actCfg?.beats?.[m.beat]) || null
  const phaseCfg = cfg.phases?.[m.phase] ?? null
  let music = pick('music', phaseCfg, beatCfg, actCfg)
  const hue = pick('hue', phaseCfg, beatCfg, actCfg)
  const dark = m.phase === 'blackout' || m.phase === 'prompt'
  if (!dark && cfg.drawing && (cfg.drawing.acts ?? []).includes(m.act) && drawingRunning(docs)) music = cfg.drawing.music ?? music
  if (over) music = OFF
  return { music, hue }
}

export function emptySceneState() {
  return { music: null, hue: null, playlist: null, over: false, musicCmd: null, sceneCmd: null }
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
// `why` is 'sheet' (scenes.json) or 'host' (a Host tab button).
export function planScenes(prev = emptySceneState(), docs = {}, now = Date.now(), cfg = null) {
  const actions = []
  const state = { ...emptySceneState(), ...prev }
  if (!cfg) return { actions, state }
  const m = momentOf(docs.night)

  // after the reveal sting the music stays off for the rest of that act
  const off = cfg.offForTheNight
  const inOffAct = !!(off && m && (off.acts ?? []).includes(m.act))
  state.over = inOffAct && (!!prev.over || docs.sounds?.current?.id === off.sound)

  const t = targetFor(docs, cfg, { over: state.over })
  if (t.music !== null && t.music !== prev.music) {
    if (t.music === OFF) actions.push({ type: 'music', do: 'pause', why: 'sheet' })
    else if (cfg.playlists?.[t.music]) { actions.push(playAction(cfg, t.music, 'sheet')); state.playlist = t.music }
    state.music = t.music
  }
  if (t.hue !== null && t.hue !== prev.hue) {
    actions.push({ type: 'scene', name: t.hue, why: 'sheet' })
    state.hue = t.hue
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

// Does this cue action make a sound here (so Music ducks under it)? A
// bulletin the Parlour TV plays as video makes none of its own.
export function ducksFor(action) {
  return action?.type === 'sound' && (!!action.id || (action.clips?.length ?? 0) > 0)
}

// How long after a cue has finished before Music comes back up: a short
// tail, or for a chime whose bulletin plays on the TV as video, until
// videoHoldSeconds after the cue began.
export const DUCK_TAIL_MS = 800
export function unduckDelayMs(action, startedAt, now, cfg) {
  if (!action?.video) return DUCK_TAIL_MS
  const hold = Math.max(0, Number(cfg?.videoHoldSeconds) || 0) * 1000
  return Math.max(DUCK_TAIL_MS, startedAt + hold - now)
}

// Every Hue scene name the sheet uses: the ones Jon makes in the Hue app.
export function sceneNames(cfg) {
  const names = new Set()
  const add = l => { if (typeof l?.hue === 'string') names.add(l.hue) }
  for (const p of Object.values(cfg?.phases ?? {})) add(p)
  for (const a of Object.values(cfg?.acts ?? {})) { add(a); for (const b of Object.values(a?.beats ?? {})) add(b) }
  return [...names]
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
  }
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
    if (!Array.isArray(cfg.drawing.acts)) out.push('drawing.acts is not a list of acts')
  }
  if (cfg.offForTheNight) {
    if (!soundIds.includes(cfg.offForTheNight.sound)) out.push('offForTheNight.sound is not one of the ten sounds')
    if (!Array.isArray(cfg.offForTheNight.acts)) out.push('offForTheNight.acts is not a list of acts')
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
