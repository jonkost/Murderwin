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
