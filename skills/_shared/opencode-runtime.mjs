import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const base = path.dirname(fileURLToPath(import.meta.url))
const VAULT_LIKE_PARTS = new Set(['.obsidian', '交易体系', '早读复核', '财经早读', '交易记忆', '亚马逊工作管理'])

export const OPENCODE_SKILLS_ROOT = path.resolve(base, '..')
export const OPENCODE_CONFIG_ROOT = path.resolve(base, '..', '..')
export const OPENCODE_OUTPUT_ROOT = process.env.OPENCODE_OUTPUT_ROOT || path.join(OPENCODE_CONFIG_ROOT, 'outputs')

export function resolveOpenCodePath(...parts) {
  return path.resolve(OPENCODE_SKILLS_ROOT, ...parts)
}

export function resolvePython() {
  if (process.env.OPENCODE_PYTHON) return process.env.OPENCODE_PYTHON
  return process.platform === 'win32' ? 'python' : 'python3'
}

export function resolveVaultPath() {
  return process.env.VAULT_PATH ? path.resolve(process.env.VAULT_PATH) : null
}

export function isWithin(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child))
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
}

function comparable(value) {
  return process.platform === 'win32' ? value.toLowerCase() : value
}

function pathParts(value) {
  return path.resolve(value).split(path.sep).map(comparable)
}

export function assertNonVaultOutput(outputPath, vaultPath = resolveVaultPath()) {
  const target = path.resolve(outputPath)
  if (vaultPath && isWithin(vaultPath, target)) {
    throw new Error(`Vault write denied: ${target}`)
  }
  const parts = pathParts(target)
  if (path.basename(target).toLowerCase() === 'memory.md' || parts.some((part) => VAULT_LIKE_PARTS.has(part))) {
    throw new Error(`Vault-like write denied: ${target}`)
  }
  return target
}

export function assertNoVaultMutation(paths, vaultPath = resolveVaultPath()) {
  for (const candidate of paths) {
    assertNonVaultOutput(candidate, vaultPath)
  }
  return true
}

export function defaultOutputPath(...parts) {
  if (parts.some((part) => path.isAbsolute(part) || path.win32.isAbsolute(part) || path.posix.isAbsolute(part))) {
    throw new Error(`Absolute output part denied: ${parts.join(', ')}`)
  }
  const target = path.resolve(OPENCODE_OUTPUT_ROOT, ...parts)
  if (!isWithin(OPENCODE_OUTPUT_ROOT, target)) {
    throw new Error(`Output path escapes OpenCode output root: ${target}`)
  }
  return assertNonVaultOutput(target)
}

export function preflight() {
  const checks = {}
  const python = resolvePython()
  try {
    checks.python = execFileSync(python, ['--version'], { encoding: 'utf8' }).trim()
  } catch (error) {
    checks.python = `unavailable: ${error.message}`
  }
  try {
    checks.packages = execFileSync(python, ['-c', "import importlib.util; print(','.join(n + '=' + str(importlib.util.find_spec(n) is not None) for n in ['pandas','numpy','openpyxl','yaml','akshare']))"], { encoding: 'utf8' }).trim()
  } catch (error) {
    checks.packages = `unavailable: ${error.message}`
  }
  checks.node = process.version
  checks.outputRoot = OPENCODE_OUTPUT_ROOT
  checks.vaultConfigured = Boolean(resolveVaultPath())
  checks.vaultWritable = false
  return checks
}

export function homePath(...parts) {
  return path.join(os.homedir(), ...parts)
}
