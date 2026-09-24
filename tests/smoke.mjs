import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertNonVaultOutput, defaultOutputPath, preflight, resolveOpenCodePath } from '../skills/_shared/opencode-runtime.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skillRoot = path.join(root, 'skills')
const skillNames = fs.readdirSync(skillRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name !== '_shared').map((entry) => entry.name)
const legacy = /MIMOCODE_HOME|MIMO_PYTHON|\.config[\\/]mimocode|C:[\\/]Users[\\/]|\/Users\/|\/home\//
for (const name of skillNames) {
  const file = path.join(skillRoot, name, 'SKILL.md')
  assert.ok(fs.existsSync(file), `missing ${file}`)
  const text = fs.readFileSync(file, 'utf8')
  assert.match(text, /^---\n/, `frontmatter missing ${name}`)
  assert.match(text, /\n---\n/, `frontmatter end missing ${name}`)
  assert.doesNotMatch(text, legacy, `legacy path in ${name}`)
  const match = text.match(/^---\n([\s\S]*?)\n---/)
  const metadata = {}
  if (match) {
    for (const line of match[1].split('\n')) {
      const item = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
      if (item) metadata[item[1]] = item[2].trim()
    }
  }
  assert.equal(metadata.name, name, `name mismatch ${name}`)
  assert.ok(metadata.description, `description missing ${name}`)
  for (const locale of ['zh-CN.json', 'en-US.json']) {
    const localeFile = path.join(skillRoot, name, 'locales', locale)
    if (fs.existsSync(localeFile)) JSON.parse(fs.readFileSync(localeFile, 'utf8'))
  }
}
for (const group of ['commands', 'agents']) {
  const directory = path.join(root, group)
  for (const entry of fs.readdirSync(directory)) {
    if (!entry.endsWith('.md')) continue
    const text = fs.readFileSync(path.join(directory, entry), 'utf8')
    assert.match(text, /^---\n/, `frontmatter missing ${group}/${entry}`)
  }
}
const checks = preflight()
assert.equal(checks.vaultWritable, false)
assert.ok(checks.outputRoot)
assert.equal(resolveOpenCodePath('_shared', 'opencode-runtime.mjs'), path.join(root, 'skills', '_shared', 'opencode-runtime.mjs'))
assert.equal(defaultOutputPath('fixture.md'), path.join(checks.outputRoot, 'fixture.md'))
assert.throws(() => defaultOutputPath('..', 'fixture.md'))
assert.throws(() => defaultOutputPath(path.resolve('outside.md')))
assert.throws(() => assertNonVaultOutput(path.join(root, '.obsidian', 'fixture.md')))
assert.throws(() => assertNonVaultOutput(path.join(root, 'MEMORY.md')))
console.log(JSON.stringify({ ok: true, skills: skillNames.length, commands: fs.readdirSync(path.join(root, 'commands')).length, agents: fs.readdirSync(path.join(root, 'agents')).length, preflight: checks }, null, 2))
