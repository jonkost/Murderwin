// A2 (11 Nov 2026): the Host tab's Sound test list, the brain's missing-stop warning,
// and every room screen a speaker.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SOUND_TEST_LIST, stopShortcutName, stopWarning } from '../src/lib/soundList.js'
import { CUE_IDS, cueDue, CUE_LEAD_MS } from '../src/lib/cueSounds.js'
import { MACHINES, QUIET_SCREENS } from '../src/lib/house.js'

const src = p => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the Sound test list: every cue once, by its id, and Silence; the ids are the server\'s', () => {
  const ids = SOUND_TEST_LIST.map(([id]) => id)
  assert.deepEqual([...ids].sort(), [...CUE_IDS].sort())
  assert.equal(new Set(ids).size, ids.length)
  for (const [, label] of SOUND_TEST_LIST) assert.ok(label && label.length <= 20, label)
  const server = src('../../functions/lib/screen.js')
  for (const id of ids) assert.ok(server.includes(`'${id}'`), id)
  const list = src('../src/screens/SoundList.jsx')
  assert.ok(list.includes("onClick={() => run('sound-test', id)}"))
  assert.ok(list.includes("onClick={() => run('music', 'pause')}>Silence</button>"))
  const host = src('../src/screens/Host.jsx')
  assert.ok(host.includes("<SoundList busy={busy} run={run} brainSound={brainSound} brainAlive={!!house.machines.find(m => m.key === 'cues')?.alive} />"))
  assert.ok(host.includes('brainSound={screenSound.cues}'))
  assert.ok(!host.includes('The chime on every HomePod'), 'no HomePod words for the screens\' sounds')
  const run = src('../../functions/lib/run.js')
  assert.ok(run.includes("const id = arg ? String(arg) : 'chime-phone'") && run.includes("if (!screen.SOUND_IDS.includes(id)) throw new NightError('invalid', 'No such sound.')"))
})

test('the missing stop: a warning only when the brain is up and says it cannot stop the music, with the Shortcut\'s name', () => {
  assert.equal(stopShortcutName(JSON.parse(src('../../cues/scenes.json'))), 'PANIC')
  assert.equal(stopShortcutName({ musicShortcuts: { off: ['Stop All', 'Other'] } }), 'Stop All')
  assert.equal(stopShortcutName({}), null)
  assert.equal(stopWarning(true, true), null)
  assert.equal(stopWarning(null, true), null, 'not on the Shortcut road: nothing to say')
  assert.equal(stopWarning(false, false), null, 'a brain not heard from lately: its dot says so')
  assert.match(stopWarning(false, true), /no Shortcut called “PANIC”/)
  assert.match(stopWarning(false, true, {}), /no Shortcut is named to stop it/)
  // the presence map keeps the brain's yes, no and nothing apart
  assert.ok(src('../src/lib/hooks.js').includes("sound[p.guestKey] = typeof p.sound === 'boolean' ? p.sound : null"))
  // the brain sends the yes-or-no (cues/lib/cues.js presenceRow), and the relay checks its Shortcuts at the start, listing only
  assert.ok(src('../../cues/lib/cues.js').includes("...(typeof canStop === 'boolean' ? { sound: canStop } : {})"))
  assert.ok(src('../../cues/cues.mjs').includes('if (shortcutNames.length || blackoutSheet.dark || blackoutSheet.after) { await checkShortcuts(); heartbeat() }'))
})

test('every room screen is a speaker, the Orangerie\'s included; only a second display stays silent; phones too', () => {
  const kiosk = src('../src/screens/Kiosk.jsx')
  assert.ok(kiosk.includes("silent={which === 'decor'}"))
  assert.ok(!QUIET_SCREENS.has('kiosk-orangerie') && QUIET_SCREENS.has('cues'))
  assert.ok(MACHINES.some(m => m.key === 'kiosk-orangerie'))
  assert.ok(src('../src/App.jsx').includes('useCueSounds(sounds, serverNow, { scope: nightId })'))
  // the scream at the blackout: a plain cue, played the moment it comes
  const due = cueDue(null, { current: { id: 'blackout', at: 1000 } }, 1000)
  assert.deepEqual(due, { id: 'blackout', key: 'blackout@1000', waitMs: CUE_LEAD_MS })
  // the sound wakes again on every page load, at the first tap, not only at Allow
  assert.ok(src('../src/main.jsx').includes('installUnlock()'))
  assert.ok(src('../src/lib/soundkit.js').includes("audioSession"))
})
