import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = path.dirname(fileURLToPath(import.meta.url))
const VAULT_LIKE_PARTS = new Set(['.obsidian', '.trash', '工作', '交易体系', '早读复核', '财经早读', '交易记忆', '亚马逊工作管理'])

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

// 用户授权的 Vault 写入白名单（2026-09-29 立）。key = skill 名，value = 相对 Vault 根的子目录。
// 只有列在此处的 skill 可写 Vault；其余（含所有 Amazon 域 skill 与通用守卫）一律拒绝。
export const VAULT_WRITE_SCOPES = {
  'trading-briefing-fetch': ['交易体系', '09.新闻资讯', '早读复核', '早报数据'],
  'trading-briefing-review': ['交易体系', '09.新闻资讯', '早读复核'],
}

export function resolveVaultPath() {
  if (process.env.VAULT_PATH) return path.resolve(process.env.VAULT_PATH)
  // 本机标记文件（机器本地状态，不跨端同步、不进 Vault）
  try {
    const marker = path.join(OPENCODE_CONFIG_ROOT, 'VAULT_PATH')
    const raw = readFileSync(marker, 'utf8').trim()
    if (raw) return path.resolve(raw)
  } catch {}
  return null
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

/**
 * 白名单 Vault 写入校验：仅 VAULT_WRITE_SCOPES 中登记的 skill 可写 Vault，
 * 且必须落在自己那一格授权子目录内（逐段前缀匹配，防同名目录伪装）。
 * ⚠️ 通用守卫（assertNonVaultOutput / safe-output 默认模式）**仍然一律拒绝 Vault**——
 *    Amazon 域 skill 与其他未登记 skill 不因本函数而获得任何 Vault 写权限。
 */
export function assertScopedVaultOutput(outputPath, skill, vaultPath = resolveVaultPath()) {
  const subdir = VAULT_WRITE_SCOPES[skill]
  if (!subdir) throw new Error(`该 skill 未登记 Vault 写权限: ${skill}（可用: ${Object.keys(VAULT_WRITE_SCOPES).join(', ')}）`)
  if (!vaultPath) throw new Error('Vault 根未配置（VAULT_PATH 环境变量或 ~/.config/opencode/VAULT_PATH），拒绝一切 Vault 写入')
  const target = path.resolve(outputPath)
  // 最具体授权优先：目标可能同时落在多个 skill 的授权区内（早报数据 嵌在 早读复核 下），
  // 只有「命中最长前缀」的那个 skill 拥有它，避免 review 去改 fetch 的自动层数据。
  let owner = null
  let ownerDepth = -1
  for (const [name, subdir] of Object.entries(VAULT_WRITE_SCOPES)) {
    const allowed = path.resolve(vaultPath, ...subdir)
    if (isWithin(allowed, target) && subdir.length > ownerDepth) {
      owner = name
      ownerDepth = subdir.length
    }
  }
  if (owner !== skill) {
    throw new Error(
      `Vault write denied: ${target}\n` +
        (owner
          ? `该路径归 ${owner} 所有（授权目录: ${VAULT_WRITE_SCOPES[owner].join('/')}/），${skill} 无权写入。`
          : `${skill} 只允许写入 ${subdir.join('/')}/`),
    )
  }
  // 已落在授权前缀内，不再叠加 VAULT_LIKE_PARTS（否则会把授权路径自身的 交易体系/早读复核 误判）
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
