import { test } from 'node:test'
import assert from 'node:assert/strict'

// With no settings at all, the phone client points at today's live project.
// (Under node there is no import.meta.env, which is exactly the "no env"
// build; Vite fills it in from VITE_* when they are set.)

test('no env: the live project, the live square-code address, no emulator', async () => {
  const c = await import('../src/lib/config.js')
  assert.equal(c.EMULATOR, false)
  assert.equal(c.PROJECT_ID, 'murderwin-at-sirwin-manor')
  assert.equal(c.PLAY_URL, 'https://murderwin-at-sirwin-manor.web.app/play/')
  assert.deepEqual(c.firebaseConfig, {
    apiKey: 'AIzaSyBmb8V5vrj1Qt5l2m8Ook24vHWUfLiXGbA',
    authDomain: 'murderwin-at-sirwin-manor.firebaseapp.com',
    projectId: 'murderwin-at-sirwin-manor',
    storageBucket: 'murderwin-at-sirwin-manor.firebasestorage.app',
    messagingSenderId: '155269832197',
    appId: '1:155269832197:web:09f0ff7a92255b97b4466c',
  })
  assert.equal(c.REGION, 'us-central1')
})

test('the workshop config is the same module with a different header', async () => {
  const { readFileSync } = await import('node:fs')
  const strip = (s) => s.split('\n').filter(l => !l.startsWith('//')).join('\n')
  const play = readFileSync(new URL('../src/lib/config.js', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../../app/src/lib/config.js', import.meta.url), 'utf8')
  assert.equal(strip(play), strip(app))
})

// Firebase Auth finds the project from the API key, not from projectId. A
// build pointed at another project by VITE_FIREBASE_PROJECT_ID alone would
// sign every phone in to the live party and then fail to read the other
// project's database, so it refuses to start instead.
test('another project with no keys of its own fails loudly at load', async () => {
  const { configFor, firebaseConfig: liveConfig } = await import('../src/lib/config.js')
  assert.throws(() => configFor({ VITE_FIREBASE_PROJECT_ID: 'murderwin-dev-placeholder' }), e =>
    /murderwin-dev-placeholder/.test(e.message)
    && /VITE_FIREBASE_API_KEY/.test(e.message)
    && /VITE_FIREBASE_APP_ID/.test(e.message)
    && /VITE_FIREBASE_MESSAGING_SENDER_ID/.test(e.message))
  // a partial set is still refused, and the message names what is missing
  assert.throws(() => configFor({ VITE_FIREBASE_PROJECT_ID: 'murderwin-dev-placeholder', VITE_FIREBASE_API_KEY: 'k' }), e => {
    const missing = e.message.split('missing ')[1].split('.')[0]
    return !missing.includes('VITE_FIREBASE_API_KEY') && missing.includes('VITE_FIREBASE_APP_ID') && missing.includes('VITE_FIREBASE_MESSAGING_SENDER_ID')
  })
  // all four settings: the other project, with its own keys and nothing of the live project's
  const dev = configFor({
    VITE_FIREBASE_PROJECT_ID: 'murderwin-dev-placeholder',
    VITE_FIREBASE_API_KEY: 'dev-key',
    VITE_FIREBASE_APP_ID: '1:1:web:dev',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '1',
  })
  assert.equal(dev.EMULATOR, false)
  assert.equal(dev.PROJECT_ID, 'murderwin-dev-placeholder')
  assert.deepEqual(dev.firebaseConfig, {
    apiKey: 'dev-key',
    authDomain: 'murderwin-dev-placeholder.firebaseapp.com',
    projectId: 'murderwin-dev-placeholder',
    storageBucket: 'murderwin-dev-placeholder.firebasestorage.app',
    messagingSenderId: '1',
    appId: '1:1:web:dev',
  })
  // the emulators check no keys, so the demo project needs none, and never borrows the live ones
  const emu = configFor({ VITE_EMULATOR: '1' })
  assert.equal(emu.EMULATOR, true)
  assert.equal(emu.PROJECT_ID, 'demo-murderwin')
  assert.notEqual(emu.firebaseConfig.apiKey, liveConfig.apiKey)
  assert.notEqual(emu.firebaseConfig.appId, liveConfig.appId)
  assert.equal(emu.PLAY_URL, 'http://127.0.0.1:5000/play/')
  assert.equal(configFor({ VITE_EMULATOR: '1', VITE_FIREBASE_PROJECT_ID: 'demo-other' }).PROJECT_ID, 'demo-other')
  // the live project by name is the same as no settings at all
  assert.deepEqual(configFor({ VITE_FIREBASE_PROJECT_ID: 'murderwin-at-sirwin-manor' }).firebaseConfig, liveConfig)
  assert.deepEqual(configFor({}).firebaseConfig, liveConfig)
})
