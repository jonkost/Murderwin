import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { scanTarget, SCAN_LINES, SCAN_CATS, gameHosts } from '../src/lib/scan.js'
import { startScanner } from '../src/lib/scanner.js'
import { MEET_CATS } from '../src/lib/night.js'
import { meetUrl } from '../src/lib/rooms.js'

// A camera inside the app (handoff 11 Nov 2026, A12).
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const PLAY = 'https://murderwin-at-sirwin-manor.web.app/play/'
const at = { playUrl: PLAY, origin: 'https://murderwin-at-sirwin-manor.web.app' }

test('every code the house makes is acted on: the four cats’ (and the game rooms’) codes and the join code', () => {
  assert.deepEqual([...SCAN_CATS].sort(), [...MEET_CATS].sort(), 'the same four cats as the address')
  for (const cat of MEET_CATS) {
    assert.deepEqual(scanTarget(meetUrl(cat, PLAY), at), { kind: 'meet', cat }, `the room code a screen shows for ${cat}`)
    assert.deepEqual(scanTarget(`${PLAY}?meet=${cat}`, at), { kind: 'meet', cat })
  }
  assert.deepEqual(scanTarget(PLAY, at), { kind: 'join' }, 'the join code')
  assert.deepEqual(scanTarget('https://murderwin-at-sirwin-manor.web.app/play', at), { kind: 'join' })
  assert.deepEqual(scanTarget('https://murderwin-at-sirwin-manor.firebaseapp.com/play/?meet=boo', at), { kind: 'meet', cat: 'boo' }, 'the site’s other name')
  assert.deepEqual(scanTarget('  https://murderwin-at-sirwin-manor.web.app/play/?meet=salem \n', at), { kind: 'meet', cat: 'salem' })
  // the emulator's play address works the same
  const emu = { playUrl: 'http://192.168.1.20:5000/play/', origin: 'http://192.168.1.20:5000' }
  assert.deepEqual(scanTarget('http://192.168.1.20:5000/play/?meet=granolia', emu), { kind: 'meet', cat: 'granolia' })
})

test('a code the house does not know, another site’s address and junk: nothing happens but the line', () => {
  for (const text of [
    `${PLAY}?meet=irwin`, `${PLAY}?meet=`, `${PLAY}?meet=granolia&kiosk=study`,
    `${PLAY}?kiosk=boo`, `${PLAY}?setup=1`, `${PLAY}?look=1`, 'https://murderwin-at-sirwin-manor.web.app/workshop/',
    'https://murderwin-at-sirwin-manor.web.app/setup',
    'https://evil.example/play/?meet=granolia', 'https://murderwin-at-sirwin-manor.web.app.evil.example/play/?meet=boo',
    'javascript:alert(1)', 'data:text/html,hi', 'mailto:a@b.c',
    'hello', '', null, undefined, 'x'.repeat(5000), '12345',
  ]) assert.deepEqual(scanTarget(text, at), { kind: 'other' }, String(text).slice(0, 60))
  assert.equal(SCAN_LINES.unknown, 'That is not one of the house’s codes.')
  assert.equal(SCAN_LINES.point, 'Point at a code.')
  assert.ok(gameHosts(at).has('murderwin-at-sirwin-manor.firebaseapp.com'))
})

test('the reader is a dynamic import, loaded only at the first tap', () => {
  const scanner = read('../src/lib/scanner.js')
  assert.ok(scanner.includes("await import('qr-scanner')"), 'loaded inside the function')
  assert.ok(!/^import .*qr-scanner/m.test(scanner), 'never a static import')
  for (const f of ['../src/App.jsx', '../src/screens/ScanButton.jsx', '../src/screens/Viewfinder.jsx', '../src/screens/Rest.jsx', '../src/main.jsx']) {
    assert.ok(!/from 'qr-scanner'/.test(read(f)), `${f} never imports the reader`)
  }
  const pkg = JSON.parse(read('../package.json'))
  assert.match(pkg.dependencies['qr-scanner'], /^\d+\.\d+\.\d+$/, 'pinned to one version')
})

test('no camera, or a no: "Use your phone’s camera instead." and the printed codes work as before', async () => {
  assert.equal(SCAN_LINES.refused, 'Use your phone’s camera instead.')
  await assert.rejects(() => startScanner({}, () => {}, {}), /no-camera/, 'a browser with no camera says so before loading anything')
  await assert.rejects(() => startScanner({}, () => {}, undefined), /no-camera/)
  const vf = read('../src/screens/Viewfinder.jsx')
  assert.ok(vf.includes('setLine(SCAN_LINES.refused)'))
  // the camera is asked for at the first tap, never at sign-in: the permissions screen asks for three things, none a camera
  const perm = read('../src/lib/permissions.js')
  assert.ok(!/getUserMedia|qr-scanner/.test(perm + read('../src/screens/Allow.jsx')))
  assert.ok(perm.includes('only at the first tap on the scan button'))
})

test('the button and the viewfinder: the approved look, top right on every tab, mounted in one line; nothing scanned is ever opened', () => {
  const btn = read('../src/screens/ScanButton.jsx')
  assert.ok(btn.includes('aria-label="Scan a code"'))
  assert.ok(btn.includes('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'))
  const css = read('../src/screens/scan.css')
  for (const rule of ['width: 48px', 'height: 48px', 'border-radius: 50%', 'border: 2px solid #A6A253', 'background: #0c2634', 'color: #d6cf86', 'width: 24px; height: 24px']) assert.ok(css.includes(rule), rule)
  const app = read('../src/App.jsx')
  assert.ok(app.includes("import ScanButton from './screens/ScanButton'"))
  assert.ok(app.includes('{scanOn && <ScanButton nightId={nightId} onNote={setMeetNote} />}'))
  assert.ok(app.includes("scanOn = !over && !heldCard && lock !== 'over'"), 'never over a Parlour Game or a held card')
  const vf = read('../src/screens/Viewfinder.jsx')
  assert.ok(vf.includes("playSound('ding')") && vf.includes('callMeet({ nightId, cat: target.cat })'), 'the same call as the address, with a ding')
  assert.ok(vf.includes("Point at a code.") === false && vf.includes('SCAN_LINES.point'), 'its words come from lib/scan.js')
  assert.ok(vf.includes('if (stop) stop()') && vf.includes("visibilityState === 'hidden'"), 'the camera stops on close and when the page is hidden')
  for (const f of [vf, btn, read('../src/lib/scan.js'), read('../src/lib/scanner.js')]) {
    assert.ok(!/location\.(assign|replace|href\s*=)|window\.open\(/.test(f), 'never opens what it read')
  }
  assert.ok(vf.includes('playsInline muted'), 'an iPhone shows the picture in place')
})
