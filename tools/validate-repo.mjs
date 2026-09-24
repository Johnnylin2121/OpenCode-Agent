import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const warnings = []
const excludedDirs = new Set(['.git', 'node_modules', '__pycache__', 'archive', 'outputs', 'output'])
const requiredFiles = ['README.md', 'README.zh-CN.md', 'REPO-MAP.md', 'REPO-MAP.zh-CN.md', 'DUAL-END.md', 'DUAL-END.zh-CN.md', 'PORTABILITY.md', 'PORTABILITY.zh-CN.md', 'SECURITY.md', 'SECURITY.zh-CN.md', 'THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.zh-CN.md', 'docs/portability.md', 'docs/portability.zh-CN.md', 'profiles/obsidian-trading/README.md', 'profiles/obsidian-trading/README.zh-CN.md', 'package.json', 'package-lock.json', 'requirements.txt', 'opencode.example.jsonc']
const oldPathPatterns = [/MIMOCODE_HOME/, /MIMO_PYTHON/, /\.config[\\/]mimocode/i, /MiMo Desktop API/i]
const privateKeyMarker = '-----BEGIN '
const privateKeyTail = '[A-Z ]+PRIVATE KEY-----'
const secretPatterns = [new RegExp(privateKeyMarker + privateKeyTail), /\bsk-[A-Za-z0-9]{20,}\b/, /\bghp_[A-Za-z0-9]{20,}\b/, /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/, /Authorization\s*:\s*Bearer\s+[A-Za-z0-9._-]{20,}/i, /ANTHROPIC_API_KEY\s*=\s*[A-Za-z0-9_-]{20,}/]
const actualUserPathPatterns = [/(?:^|[\s"'`])(?:[A-Za-z]:[\\/]Users[\\/]|\/Users\/|\/home\/)(?!<|{)[A-Za-z0-9._-]+/i]

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isSymbolicLink()) {
      errors.push(`symlink: ${path.relative(root, full)}`)
      continue
    }
    if (entry.isDirectory()) walk(full)
    else checkFile(full)
  }
}

function checkFile(file) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/')
  const data = fs.readFileSync(file)
  if (data.length > 2 * 1024 * 1024) errors.push(`large file: ${relative}`)
  if (data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) errors.push(`BOM: ${relative}`)
  if (data.includes(0x0d)) errors.push(`CRLF: ${relative}`)
  if (path.extname(file).toLowerCase() === '.pyc' || relative.includes('/__pycache__/')) errors.push(`cache: ${relative}`)
  if (relative.includes('/archive/')) errors.push(`deprecated archive: ${relative}`)
  let text
  try {
    text = data.toString('utf8')
  } catch {
    errors.push(`non UTF-8: ${relative}`)
    return
  }
  if (relative !== 'tools/validate-repo.mjs' && relative !== 'tests/smoke.mjs') {
    for (const pattern of oldPathPatterns) if (pattern.test(text)) errors.push(`legacy path in ${relative}`)
  }
  for (const pattern of actualUserPathPatterns) if (pattern.test(text)) errors.push(`machine path in ${relative}: ${pattern}`)
  for (const pattern of secretPatterns) if (pattern.test(text)) errors.push(`possible secret in ${relative}`)
  if (file.endsWith('.json')) {
    try { JSON.parse(text) } catch { errors.push(`invalid JSON: ${relative}`) }
  }
}

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)
  if (!match) return null
  const values = {}
  for (const line of match[1].split('\n')) {
    const item = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (item) values[item[1]] = item[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return values
}

for (const file of requiredFiles) if (!fs.existsSync(path.join(root, file))) errors.push(`missing required file: ${file}`)
const packagePath = path.join(root, 'package.json')
if (fs.existsSync(packagePath)) {
  try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    if (packageData.name !== 'opencode-agent') errors.push('package name must be opencode-agent')
    for (const dependency of ['@opencode-ai/plugin', 'skills']) if (!packageData.dependencies?.[dependency]) errors.push(`missing dependency: ${dependency}`)
  } catch (error) {
    errors.push(`package.json: ${error.message}`)
  }
}
const skillsRoot = path.join(root, 'skills')
if (fs.existsSync(skillsRoot) && fs.statSync(skillsRoot).isDirectory()) {
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '_shared') continue
    const file = path.join(skillsRoot, entry.name, 'SKILL.md')
    if (!fs.existsSync(file)) {
      errors.push(`missing SKILL.md: ${entry.name}`)
      continue
    }
    const metadata = frontmatter(file)
    if (!metadata) errors.push(`missing frontmatter: ${entry.name}`)
    else {
      if (metadata.name !== entry.name) errors.push(`name mismatch: ${entry.name}`)
      if (!metadata.description) errors.push(`missing description: ${entry.name}`)
    }
  }
}
for (const directory of ['commands', 'agents']) {
  const directoryPath = path.join(root, directory)
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) continue
  for (const entry of fs.readdirSync(directoryPath)) {
    if (!entry.endsWith('.md')) continue
    const file = path.join(directoryPath, entry)
    if (!frontmatter(file)) errors.push(`missing frontmatter: ${directory}/${entry}`)
  }
}
walk(root)
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`)
  process.exitCode = 1
} else {
  for (const warning of warnings) console.warn(`WARN ${warning}`)
  console.log('repository validation passed')
}
