import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HOST_COMMANDS, helpText } from '../lib/commands.js'

// The terminal host's --help is built from HOST_COMMANDS. This test greps the
// two switch statements that actually run host commands (run.js, and night.js
// which run.js falls through to) and checks the lists agree both ways.

const here = dirname(fileURLToPath(import.meta.url))
const src = (p) => readFileSync(join(here, '..', p), 'utf8')

function switchCases(text, fnName) {
  const start = text.indexOf(`export async function ${fnName}(`)
  assert.ok(start >= 0, `${fnName} is in the file`)
  // the function ends at the next top-level declaration
  const rest = text.slice(start + 1)
  const end = rest.search(/\n(export |async function |function |const |\/\/ -)/)
  const body = rest.slice(0, end > 0 ? end : rest.length)
  const cases = [...body.matchAll(/case '([a-z0-9-]+)':/g)].map(m => m[1])
  // commands handled before the switch by name
  const early = [...body.matchAll(/command === '([a-z0-9-]+)'/g)].map(m => m[1])
  return new Set([...cases, ...early])
}

test('every host command case in run.js and night.js is listed, and every listed command has a case', () => {
  const inCode = new Set([...switchCases(src('lib/run.js'), 'hostCommand'), ...switchCases(src('lib/night.js'), 'hostCommand')])
  const listed = new Set(HOST_COMMANDS.map(c => c.name))
  const missingFromList = [...inCode].filter(c => !listed.has(c))
  const missingFromCode = [...listed].filter(c => !inCode.has(c))
  assert.deepEqual(missingFromList, [], 'add these to functions/lib/commands.js')
  assert.deepEqual(missingFromCode, [], 'these are listed but have no case')
})

test('--help names every command, one per line, with a plain line each', () => {
  const help = helpText()
  for (const c of HOST_COMMANDS) {
    assert.ok(help.split('\n').some(l => l.trim().startsWith(c.name)), `${c.name} is in --help`)
    assert.ok(c.what.length > 10 && !c.what.includes('—'), `${c.name} has a plain line with no em dash`)
  }
  assert.ok(src('host.mjs').includes("from './lib/run.js'"), 'host.mjs runs commands through run.js')
  assert.ok(src('host.mjs').includes('helpText'), 'host.mjs prints the shared help')
})
