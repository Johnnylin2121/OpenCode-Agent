import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertNonVaultOutput, defaultOutputPath, preflight, resolveOpenCodePath } from '../skills/_shared/opencode-runtime.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skillsDir = path.join(root, 'skills')
const commandsDir = path.join(root, 'commands')
const agentsDir = path.join(root, 'agents')
const toolsDir = path.join(root, 'tools')

const requiredSkills = [
  'trading-briefing-review', 'trading-briefing-fetch', 'trading-contradiction-check',
  'trading-daily-review', 'trading-memory-consolidate', 'trading-policy-impact',
  'trading-stock-scan', 'trading-value-investing', 'amazon-ad-analysis',
  'amazon-listing', 'amazon-product-selection', 'session-handoff', 'browser-skill'
]
const requiredCommands = [
  'trading-premarket.md', 'trading-intraday.md', 'trading-postmarket.md',
  'trading-memory-consolidate.md', 'trading-policy-impact.md', 'trading-stock-scan.md',
  'trading-briefing-fetch.md', 'trading-briefing-review.md', 'amazon-product-selection.md',
  'amazon-listing.md', 'amazon-ad-analysis.md', 'caveman.md', 'caveman-commit.md',
  'caveman-review.md', 'caveman-help.md', 'caveman-compress.md'
]
const requiredAgents = [
  'trading-researcher.md', 'document-reader.md', 'data-analyst.md', 'listing-reviewer.md',
  'opencode-trading.md', 'opencode-amazon.md', 'opencode-default.md'
]
const requiredTools = ['safe-output.js', 'runtime-preflight.js', 'market-data.js']
const forbidden = /\.config[\\/]mimocode|MIMO_PYTHON|MIMOCODE_HOME|MiMo Desktop API/

const listDirs = (dir) => fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'SKILL.md'))).map((entry) => entry.name)
const listFiles = (dir, ext) => fs.readdirSync(dir).filter((name) => name.endsWith(ext))

const discoveredSkills = listDirs(skillsDir)
for (const name of discoveredSkills) {
  const file = path.join(skillsDir, name, 'SKILL.md')
  const text = fs.readFileSync(file, 'utf8')
  assert.match(text, /^---\r?\n/, `frontmatter missing ${name}`)
  assert.match(text, /\r?\n---/, `frontmatter end missing ${name}`)
  assert.match(text, new RegExp(`^name:\\s*${name}\\s*$`, 'm'), `frontmatter name mismatch ${name}`)
  assert.doesNotMatch(text, forbidden, `legacy path in ${name}`)
  for (const refDir of ['references', 'assets', 'scripts', 'locales']) {
    const refRoot = path.join(skillsDir, name, refDir)
    if (!fs.existsSync(refRoot)) continue
    for (const entry of fs.readdirSync(refRoot, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const refText = fs.readFileSync(path.join(refRoot, entry.name), 'utf8')
      assert.doesNotMatch(refText, forbidden, `legacy path in ${name}/${refDir}/${entry.name}`)
    }
  }
}
for (const name of requiredSkills) assert.ok(discoveredSkills.includes(name), `missing skill ${name}`)

const discoveredCommands = listFiles(commandsDir, '.md')
for (const name of requiredCommands) assert.ok(discoveredCommands.includes(name), `missing command ${name}`)
for (const name of discoveredCommands) {
  const text = fs.readFileSync(path.join(commandsDir, name), 'utf8')
  assert.match(text, /^---\r?\n/, `frontmatter missing command ${name}`)
  assert.doesNotMatch(text, forbidden, `legacy path in command ${name}`)
}

const discoveredAgents = listFiles(agentsDir, '.md')
for (const name of requiredAgents) assert.ok(discoveredAgents.includes(name), `missing agent ${name}`)
for (const name of discoveredAgents) {
  const text = fs.readFileSync(path.join(agentsDir, name), 'utf8')
  assert.match(text, /^---\r?\n/, `frontmatter missing agent ${name}`)
  assert.match(text, /^mode:\s*(primary|subagent|all)\s*$/m, `mode missing agent ${name}`)
  assert.doesNotMatch(text, forbidden, `legacy path in agent ${name}`)
}

for (const name of requiredTools) assert.ok(fs.existsSync(path.join(toolsDir, name)), `missing tool ${name}`)

for (const name of ['opencode-market.mjs', 'opencode-runtime.mjs']) {
  const text = fs.readFileSync(path.join(skillsDir, '_shared', name), 'utf8')
  assert.doesNotMatch(text, forbidden, `legacy path in _shared/${name}`)
}

const configCandidates = ['opencode.jsonc', 'opencode.example.jsonc'].map((name) => path.join(root, name))
const configFile = configCandidates.find((file) => fs.existsSync(file))
assert.ok(configFile, 'no OpenCode config or example config found')
const config = fs.readFileSync(configFile, 'utf8')
assert.equal(config.match(/"default_agent"\s*:\s*"opencode-default"/) !== null, true, 'default_agent missing')
assert.equal(config.match(/"get"/) !== null, false, 'market get command must not be exposed')

const checks = preflight()
assert.ok(checks.vaultWritable === false)
assert.ok(checks.outputRoot)
assert.equal(resolveOpenCodePath('_shared', 'opencode-runtime.mjs'), path.join(root, 'skills', '_shared', 'opencode-runtime.mjs'))
assert.equal(defaultOutputPath('fixture.md'), path.join(root, 'outputs', 'fixture.md'))
assert.throws(() => assertNonVaultOutput(path.join(root, '交易体系', 'fixture.md')))
assert.throws(() => assertNonVaultOutput(path.join(root, '.obsidian', 'fixture.md')))
assert.throws(() => assertNonVaultOutput(path.join(root, '.trash', 'fixture.md')))
assert.throws(() => assertNonVaultOutput(path.join(root, '工作', 'fixture.md')))

const safeTool = (await import('../tools/safe-output.js')).default
const preflightTool = (await import('../tools/runtime-preflight.js')).default
const marketTool = (await import('../tools/market-data.js')).default
assert.equal((await safeTool.execute({ path: path.join(root, 'outputs', 'fixture.md') }, {})).title, 'Validated OpenCode output path')
assert.throws(() => assertNonVaultOutput(path.join(root, 'outputs', '..', 'MEMORY.md')))
await assert.rejects(() => marketTool.execute({ command: 'invalid' }, {}))
await assert.rejects(() => marketTool.execute({ command: 'get', values: ['https://example.com'] }, {}))
assert.equal((await preflightTool.execute({}, {})).title, 'OpenCode runtime preflight')

console.log(JSON.stringify({
  ok: true,
  skills: discoveredSkills.length,
  commands: discoveredCommands.length,
  agents: discoveredAgents.length,
  tools: requiredTools.length,
  preflight: checks
}, null, 2))
