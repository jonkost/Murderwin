import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { troubleLine, withoutStatus, isSentence, SAID_BY_SERVER, DID_NOT_ANSWER } from '../src/lib/trouble.js'

// No programming words on a screen a guest sees (Jon, 29 Oct 2026): a failed
// call shows the server's own sentence without the HTTP status the Firebase
// library puts after it, or the screen's own plain words, never a bare code.
// Sample errors made here; the server's words are open copy.

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const read = p => readFileSync(join(root, p), 'utf8')
const FALLBACK = 'The house did not answer. Try again.'

test('F31 a server sentence shows without its [400], [409] or [403]', () => {
  assert.equal(troubleLine({ code: 'functions/invalid-argument', message: 'Not yet. Wait in the Parlour; your phone will call you. [400]' }, FALLBACK), 'Not yet. Wait in the Parlour; your phone will call you.')
  assert.equal(troubleLine({ code: 'functions/already-exists', message: 'This phone is already Jon. Find the host to change it. [409]' }, FALLBACK), 'This phone is already Jon. Find the host to change it.')
  assert.equal(troubleLine({ code: 'functions/permission-denied', message: 'Only a host can do that. [403]' }, FALLBACK), 'Only a host can do that.')
  assert.equal(troubleLine({ code: 'functions/failed-precondition', message: 'The ballot is not open. [400]' }, FALLBACK), 'The ballot is not open.')
  assert.equal(troubleLine({ code: 'functions/not-found', message: 'This phone is not at the party. [404]' }, FALLBACK), 'This phone is not at the party.')
  assert.equal(troubleLine({ code: 'functions/resource-exhausted', message: 'Every character is spoken for tonight. Find the host. [429]' }, FALLBACK), 'Every character is spoken for tonight. Find the host.')
  assert.equal(troubleLine({ code: 'functions/invalid-argument', message: 'Which cat?' }, FALLBACK), 'Which cat?', 'a question is a sentence, and no bracket is fine too')
  // the code with or without the library's functions/ prefix
  assert.equal(troubleLine({ code: 'invalid-argument', message: 'Those pairs do not match. [400]' }, FALLBACK), 'Those pairs do not match.')
  assert.equal(withoutStatus('Not yet. Keep going. [400]'), 'Not yet. Keep going.')
  assert.equal(withoutStatus('  Not yet. Keep going.  '), 'Not yet. Keep going.')
  assert.equal(withoutStatus('Act [2] is on. [400]'), 'Act [2] is on.', 'only the bracket at the end comes off')
})

test('F31 a bare code, an empty message, a message with no code or a plain throw: the screen\'s own words', () => {
  // a dropped connection, a call that ran out of time, a function that broke
  for (const [code, message] of [
    ['functions/internal', 'internal [0]'], ['functions/internal', 'internal'], ['functions/deadline-exceeded', 'deadline-exceeded'],
    ['functions/unavailable', 'unavailable [503]'], ['functions/unknown', 'unknown'], ['functions/not-found', 'not-found [404]'],
    ['functions/internal', 'INTERNAL [500]'], ['functions/internal', 'Something broke on the Manor side. Try again. [500]'],
    // a call that went out without the phone's pass: a guest never signs in, so "Sign in first." is not for them
    ['functions/unauthenticated', 'Sign in first. [401]'], ['unauthenticated', 'Sign in first.'],
  ]) assert.equal(troubleLine({ code, message }, FALLBACK), FALLBACK, `${code} ${message}`)
  // the library's own words for a refused call, and a developer's note, are not sentences
  assert.equal(troubleLine({ code: 'functions/invalid-argument', message: 'Bad Request [400]' }, FALLBACK), FALLBACK)
  assert.equal(troubleLine({ code: 'functions/permission-denied', message: 'Permission Denied [403]' }, FALLBACK), FALLBACK)
  assert.equal(troubleLine({ code: 'functions/unauthenticated', message: 'Unauthenticated [401]' }, FALLBACK), FALLBACK)
  assert.equal(troubleLine({ code: 'functions/invalid-argument', message: 'Unknown command: frob [400]' }, FALLBACK), FALLBACK)
  // an empty message, or the bracket alone
  assert.equal(troubleLine({ code: 'functions/invalid-argument', message: '' }, FALLBACK), FALLBACK)
  assert.equal(troubleLine({ code: 'functions/invalid-argument', message: '[400]' }, FALLBACK), FALLBACK)
  assert.equal(troubleLine({ code: 'functions/invalid-argument' }, FALLBACK), FALLBACK)
  // a sentence with no code is not the server speaking (a browser's own error, say)
  assert.equal(troubleLine({ message: 'Not yet. Keep going.' }, FALLBACK), FALLBACK)
  assert.equal(troubleLine(new TypeError('Failed to fetch.'), FALLBACK), FALLBACK)
  // a plain thrown string, null, nothing
  assert.equal(troubleLine('internal', FALLBACK), FALLBACK)
  assert.equal(troubleLine('Not yet. Keep going.', FALLBACK), FALLBACK)
  assert.equal(troubleLine(null, FALLBACK), FALLBACK)
  assert.equal(troubleLine(undefined, FALLBACK), FALLBACK)
  assert.equal(troubleLine(42, FALLBACK), FALLBACK)
  // with no words of its own, a screen still says something plain
  assert.equal(troubleLine(null), DID_NOT_ANSWER)
  assert.ok(!/[—\[\]]|\d/.test(DID_NOT_ANSWER))
  assert.equal(isSentence('Bad Request'), false)
  assert.equal(isSentence('Try again.'), true)
  assert.equal(isSentence('“Not this room.”'), true)
})

// Every code the server's sentences arrive with is one the phones show, and
// every sentence the server writes in full ends as a sentence, so none of the
// server's own words falls back by mistake.
test('F31 the server\'s codes and sentences are the ones the phones show', () => {
  const index = read('functions/index.js')
  const map = index.slice(index.indexOf('const CODE_MAP = {'), index.indexOf('}', index.indexOf('const CODE_MAP = {')))
  const codes = [...map.matchAll(/:\s*'([a-z-]+)'/g)].map(m => m[1])
  assert.ok(codes.length >= 7, `read ${codes.length} codes`)
  assert.match(index, /CODE_MAP\[e\.code\] \?\? 'failed-precondition'/, 'a code missing from the map arrives as failed-precondition')
  for (const code of [...codes, 'failed-precondition'].filter(c => c !== 'unauthenticated')) assert.ok(SAID_BY_SERVER.has(code), code)
  assert.ok(!SAID_BY_SERVER.has('internal'), 'a function that broke: the screen\'s own words')
  assert.ok(!SAID_BY_SERVER.has('unauthenticated'), 'the phone signs itself in: "Sign in first." is never a guest\'s to do')
  const files = ['functions/index.js', ...readdirSync(join(root, 'functions/lib')).filter(f => f.endsWith('.js')).map(f => `functions/lib/${f}`)]
  const said = /new (?:NightError|HttpsError)\(\s*'([a-z-]+)'\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\)/g
  let n = 0
  const short = []
  const signIn = new Set()
  for (const f of files) {
    for (const m of read(f).matchAll(said)) {
      if (m[1] === 'unauthenticated') signIn.add(m[2].slice(1, -1))
      if (m[1] === 'internal' || m[1] === 'unauthenticated') continue
      n++
      if (!isSentence(m[2].slice(1, -1))) short.push(`${f} (${m[1]})`)
    }
  }
  assert.ok(n > 100, `read ${n} sentences`)
  assert.deepEqual(short, [], 'every sentence the server says on purpose ends as a sentence')
  // the phones show their own words for 'unauthenticated' because this is all it ever says; a new line
  // meant for a guest under that code would never show, so it would need a code of its own
  assert.deepEqual([...signIn], ['Sign in first.'])
})

// Every file under play/src a screen is drawn from.
function walk(dir) {
  const out = []
  for (const name of readdirSync(join(root, dir))) {
    const p = join(dir, name)
    if (statSync(join(root, p)).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.jsx')) out.push(p)
  }
  return out
}
// The code a file runs, without its comments, and without its console lines (a log is not a screen).
const runs = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1').split('\n').filter(l => !l.includes('console.')).join('\n')
const RAW = /\b(?:e|err|error|ex|reason)\??\.message\b/

test('F31 no screen shows a failed call\'s raw message: every one goes through troubleLine, with the screen\'s own words', () => {
  const screens = walk('play/src')
  assert.ok(screens.length > 20, `read ${screens.length} screens`)
  const hits = screens.filter(f => RAW.test(runs(read(f))))
  assert.deepEqual(hits, [], 'no screen file reads e.message itself')
  // the check bites
  assert.ok(RAW.test('setMsg(e?.message || \'Try again.\')') && RAW.test('setError(err.message)') && !RAW.test('troubleLine(e, \'Try again.\')'))
  assert.ok(!RAW.test(runs('// setMsg(e?.message)\nconsole.warn(\'x\', error?.message)')), 'a comment or a log is not a screen')
  // each place a call can fail on a guest's phone, or the host's, with its own words
  for (const [file, words, times] of [
    ['play/src/App.jsx', 'The cat did not answer. Try the code again.', 1],
    ['play/src/screens/Cards.jsx', 'The house did not answer. Try again.', 1],
    ['play/src/screens/Act4.jsx', 'The house did not answer. Try again.', 1],
    ['play/src/screens/Join.jsx', 'The Manor did not answer. Try again.', 1],
    ['play/src/screens/Windows.jsx', 'The Manor did not hear that. Try again.', 3],
    // the Host tab: true whether the connection dropped or a function broke (the Manor did answer then)
    ['play/src/screens/Host.jsx', 'press it again.', 2],
    ['play/src/screens/Host.jsx', 'The Manor did not answer.', 1],
  ]) {
    const src = read(file)
    assert.equal(src.split(`troubleLine(e, '${words}')`).length - 1, times, `${file}: ${words}`)
    assert.ok(/import \{ troubleLine \} from '\.\.?\/lib\/trouble'/.test(src), `${file} imports the helper`)
  }
  // the Parlour Game's retry hands the error over whole, and a reply the server did not give says the same words
  const windows = read('play/src/screens/Windows.jsx')
  assert.ok(windows.includes('const retry = (e = null) => {') && windows.includes('else retry(e)') && windows.includes('else retry()'))
})
