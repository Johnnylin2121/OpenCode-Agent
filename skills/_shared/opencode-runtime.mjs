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

// 用户授权的 Vault 写入白名单（2026-09-30 实测校正）。key = skill 名，value = 相对 Vault 根的子目录。
// 2026-09-30 起无「早报数据/」中间层：复核报告、自动草稿、rss-digest 同放 早读复核/ 下。
// 两个 skill 共用同一格 —— 共享授权格必须让两者都能写，故判定用「最长前缀且并列全部放行」。
export const VAULT_WRITE_SCOPES = {
  'trading-briefing-fetch': ['交易体系', '09.新闻资讯', '早读复核'],
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
// 授权目录内仍然只读的子目录（由其他 Agent / 外部工具拥有）。
// 授权目录只约束「前缀」，不自动放行其中每一个子目录——rss-digest/ 是 DSH 插件产物。
export const VAULT_READONLY_SUBDIRS = ['rss-digest']

function readOnlyViolation(vaultPath, target) {
  for (const name of VAULT_READONLY_SUBDIRS) {
    if (isWithin(path.resolve(vaultPath, '交易体系', '09.新闻资讯', '早读复核', name), target)) {
      return name
    }
  }
  return null
}

export function assertScopedVaultOutput(outputPath, skill, vaultPath = resolveVaultPath()) {
  const subdir = VAULT_WRITE_SCOPES[skill]
  if (!subdir) throw new Error(`该 skill 未登记 Vault 写权限: ${skill}（可用: ${Object.keys(VAULT_WRITE_SCOPES).join(', ')}）`)
  if (!vaultPath) throw new Error('Vault 根未配置（VAULT_PATH 环境变量或 ~/.config/opencode/VAULT_PATH），拒绝一切 Vault 写入')
  const target = path.resolve(outputPath)
  const locked = readOnlyViolation(vaultPath, target)
  if (locked) {
    throw new Error(`Vault write denied: ${target}\n${locked}/ 由 DSH 的 dsh-rss-digest 插件拥有（写方在 Vault 之外），OpenCode 只读不改。`)
  }
  // 最具体授权优先：命中最长前缀的那一格；若多格并列（同层共享），并列者全部放行。
  const owners = []
  let depth = -1
  for (const [name, subdir] of Object.entries(VAULT_WRITE_SCOPES)) {
    if (!isWithin(path.resolve(vaultPath, ...subdir), target)) continue
    if (subdir.length > depth) {
      depth = subdir.length
      owners.length = 0
      owners.push(name)
    } else if (subdir.length === depth) {
      owners.push(name)
    }
  }
  if (!owners.includes(skill)) {
    throw new Error(
      `Vault write denied: ${target}\n` +
        (owners.length
          ? `该路径归 ${owners.join(' / ')} 所有（授权目录: ${VAULT_WRITE_SCOPES[owners[0]].join('/')}/），${skill} 无权写入。`
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
