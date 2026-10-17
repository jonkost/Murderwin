import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HOST_COMMANDS } from '../../functions/lib/commands.js'

// The docs Jon reads on the day must name only things that exist. This file
// greps them against the code: every command in docs/on-the-night.md, the
// "not built yet" list in docs/play-side.md, and the workshop's Status page.

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const read = p => readFileSync(join(root, p), 'utf8')
const scriptsOf = p => Object.keys(JSON.parse(read(p)).scripts ?? {})

const runbook = read('docs/on-the-night.md')
const hostJsx = read('play/src/screens/Host.jsx')
const spans = (text, re) => [...text.matchAll(re)].map(m => m[1])

test('on-the-night.md: every npm command it names is a script that exists', () => {
  const rootScripts = scriptsOf('package.json')
  const ticks = spans(runbook, /`([^`\n]+)`/g)
  let checked = 0
  for (const t of ticks) {
    const atRoot = /^npm run ([a-z:-]+)/.exec(t)
    if (atRoot) { checked++; assert.ok(rootScripts.includes(atRoot[1]), `root package.json has "${atRoot[1]}" (from \`${t}\`)`); continue }
    if (t === 'npm test') { checked++; assert.ok(rootScripts.includes('test')); continue }
    const inDir = /^cd ([a-z]+) && npm (start|run [a-z:-]+)/.exec(t)
    if (inDir) {
      checked++
      const [, dir, what] = inDir
      const name = what === 'start' ? 'start' : what.slice(4)
      assert.ok(existsSync(join(root, dir, 'package.json')), `${dir}/package.json exists`)
      assert.ok(scriptsOf(`${dir}/package.json`).includes(name), `${dir}/package.json has "${name}" (from \`${t}\`)`)
      continue
    }
    const prefixed = /npm --prefix ([a-z]+) run ([a-z:-]+)/.exec(t)
    if (prefixed) { checked++; assert.ok(scriptsOf(`${prefixed[1]}/package.json`).includes(prefixed[2]), `${prefixed[1]} has "${prefixed[2]}"`); continue }
    const host = /^node functions\/host\.mjs ([a-z-]+)/.exec(t)
    if (host) { checked++; assert.ok(host[1] === 'status' || HOST_COMMANDS.some(c => c.name === host[1]), `host.mjs knows "${host[1]}"`); continue }
  }
  assert.ok(checked >= 12, `found ${checked} commands to check`)
  assert.ok(ticks.some(t => t === 'npm run deploy'), 'the one line to run is there')
  assert.ok(ticks.some(t => t.startsWith('npm run fake-night')), 'the fake players are there')
})

test('on-the-night.md: every bold phrase is a button on the Host tab, and there are no em dashes', () => {
  const bold = [...new Set(spans(runbook, /\*\*(.+?)\*\*/g))]
  assert.ok(bold.length >= 8, `found ${bold.length} buttons`)
  for (const label of bold) {
    const ok = hostJsx.includes(label) || hostJsx.includes(label.replace('&', '&amp;'))
    assert.ok(ok, `Host.jsx has a button "${label}"`)
  }
  assert.ok(!runbook.includes('—'), 'no em dash in on-the-night.md')
  for (const flag of ['--emulator', '--real-secrets', '--live', '--i-know-this-is-the-party-database']) {
    assert.ok(read('scripts/fake-players.mjs').includes(`'${flag}'`), `fake-players.mjs takes ${flag}`)
  }
  for (const kiosk of ['living', 'bedroom', 'study']) assert.ok(runbook.includes(`?kiosk=${kiosk}`), `the ${kiosk} screen is named`)
})

// What is built, as the code knows it. These phrases must not be listed as
// "not built yet" or "next" anywhere Jon reads.
const BUILT = [
  'case generator', 'Cat testimony', 'event windows', 'question windows', 'ballot in Act 7',
  'Cats tab as sliders', 'Eight fake', 'fake test players', 'Kiosks and the study', 'Dinner, dessert, the Big Solve',
]

test('play-side.md: the "not built yet" list names nothing the code already does', () => {
  const doc = read('docs/play-side.md')
  const start = doc.indexOf('## What is not built yet')
  assert.ok(start >= 0, 'the section exists')
  const rest = doc.slice(start + 1)
  const end = rest.search(/\n## /)
  const section = rest.slice(0, end > 0 ? end : rest.length)
  // the bullets are the list; the paragraph under them may say what was built since
  const bullets = section.split('\n').filter(l => /^\s*- /.test(l)).join('\n')
  assert.ok(bullets.length > 0, 'the list has bullets')
  for (const phrase of BUILT) assert.ok(!bullets.toLowerCase().includes(phrase.toLowerCase()), `"${phrase}" is built; it must not be listed as not built`)
  assert.ok(!section.includes('—'), 'no em dash in the refreshed section')
})

test('Status.jsx: the NEXT list names nothing built, and deferred work sits under "after the party"', () => {
  const src = read('app/src/pages/Status.jsx')
  const block = (name) => {
    const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\]`).exec(src)
    assert.ok(m, `${name} is declared`)
    return m[1]
  }
  const next = block('NEXT')
  for (const phrase of BUILT) assert.ok(!next.toLowerCase().includes(phrase.toLowerCase()), `NEXT must not list "${phrase}"`)
  const after = block('AFTER')
  assert.ok(after.includes('nested') || after.includes('scenarios'), 'the full event system is deferred')
  assert.ok(src.includes('After the party'), 'the page has an after-the-party section')
  for (const name of ['BUILT', 'NEXT', 'AFTER']) assert.ok(!block(name).includes('—'), `no em dash in ${name}`)
})
