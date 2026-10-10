import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { tool } from '@opencode-ai/plugin'
import { OPENCODE_SKILLS_ROOT } from '../skills/_shared/opencode-runtime.mjs'

const execFileAsync = promisify(execFile)
// The OpenCode host may be a self-contained binary: process.execPath then points at the
// host itself, not Node. Resolve `node` from PATH instead; OPENCODE_NODE overrides.
const nodeBin = process.env.OPENCODE_NODE || 'node'
const allowedCommands = new Set(['index', 'stocks', 'sector', 'sina', 'tencent', 'kline'])

export default tool({
  description: 'Run the read-only public market-data script through OpenCode. Network access occurs only when invoked.',
  args: {
    command: tool.schema.string().describe('index, stocks, sector, sina, tencent, or kline'),
    values: tool.schema.array(tool.schema.string()).optional().describe('Command arguments')
  },
  async execute(args) {
    if (!allowedCommands.has(args.command)) {
      throw new Error(`Unsupported market command: ${args.command}`)
    }
    const values = args.values || []
    const script = path.join(OPENCODE_SKILLS_ROOT, '_shared', 'opencode-market.mjs')
    const result = await execFileAsync(nodeBin, [script, args.command, ...values], {
      timeout: 30000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true
    })
    return {
      title: `Market data: ${args.command}`,
      output: result.stdout || result.stderr || 'No output'
    }
  }
})
