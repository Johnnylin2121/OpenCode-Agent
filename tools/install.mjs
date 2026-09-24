import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const targetIndex = args.indexOf('--target')
const apply = args.includes('--apply')
const target = targetIndex >= 0 ? args[targetIndex + 1] : null
if (!target) throw new Error('Usage: node tools/install.mjs --target <opencode-config-root> [--apply]')
const targetRoot = path.resolve(target)
const forbidden = ['.obsidian', '交易体系', '早读复核', '财经早读', '交易记忆', '亚马逊工作管理']
const targetParts = targetRoot.split(path.sep).map((part) => process.platform === 'win32' ? part.toLowerCase() : part)
if (targetParts.some((part) => forbidden.includes(part))) throw new Error(`Refusing knowledge-base target: ${targetRoot}`)
if (process.env.VAULT_PATH) {
  const vault = path.resolve(process.env.VAULT_PATH)
  const relative = path.relative(vault, targetRoot)
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('Target is inside VAULT_PATH')
}
const groups = ['skills', 'commands', 'agents', 'tools']
const excluded = new Set(['node_modules', '__pycache__', 'archive', 'outputs', 'output'])
const files = []
const replacements = new Map([
  ['{OPENCODE_CONFIG_ROOT}', targetRoot],
  ['{OPENCODE_OUTPUT_ROOT}', path.join(targetRoot, 'outputs')],
  ['{SKILLS_ROOT}', path.join(targetRoot, 'skills')],
  ['{USERPROFILE}', os.homedir()],
  ['{VAULT_PATH}', process.env.VAULT_PATH || '{VAULT_PATH}']
])
function render(text) {
  for (const [key, value] of replacements) text = text.replaceAll(key, () => value)
  return text
}
function collect(source) {
  if (!fs.existsSync(source)) return
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Symlink refused: ${path.join(source, entry.name)}`)
    if (entry.isDirectory() && excluded.has(entry.name)) continue
    const full = path.join(source, entry.name)
    if (entry.isDirectory()) collect(full)
    else if (!entry.name.endsWith('.pyc') && !entry.name.endsWith('.pyo')) files.push(path.relative(root, full))
  }
}
for (const group of groups) collect(path.join(root, group))
for (const relative of files) console.log(`${apply ? 'copy' : 'plan'} ${path.join(targetRoot, relative)}`)
if (apply) {
  for (const relative of files) {
    const source = path.join(root, relative)
    const destination = path.join(targetRoot, relative)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    const content = fs.readFileSync(source, 'utf8')
    fs.writeFileSync(destination, render(content), 'utf8')
  }
  console.log(`installed ${files.length} files into ${targetRoot}`)
} else {
  console.log(`dry-run only: ${files.length} files planned`)
}
