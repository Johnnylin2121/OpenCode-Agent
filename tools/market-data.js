import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { tool } from '@opencode-ai/plugin'
import { OPENCODE_SKILLS_ROOT } from '../skills/_shared/opencode-runtime.mjs'

const execFileAsync = promisify(execFile)
const allowedCommands = new Set(['index', 'stocks', 'sector', 'sina', 'tencent', 'kline', 'get'])

export default tool({
  description: 'Run the read-only public market-data script through OpenCode. Network access occurs only when invoked.',
  args: {
    command: tool.schema.string().describe('index, stocks, sector, sina, tencent, kline, or get'),
    values: tool.schema.array(tool.schema.string()).optional().describe('Command arguments')
  },
  async execute(args) {
    if (!allowedCommands.has(args.command)) {
      throw new Error(`Unsupported market command: ${args.command}`)
    }
    const values = args.values || []
    if (args.command === 'get') {
      const url = new URL(values[0] || '')
      if (url.protocol !== 'https:') throw new Error('Only HTTPS URLs are allowed')
    }
    const script = path.join(OPENCODE_SKILLS_ROOT, '_shared', 'opencode-market.mjs')
    const result = await execFileAsync(process.execPath, [script, args.command, ...values], {
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
