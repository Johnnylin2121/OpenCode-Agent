import { tool } from '@opencode-ai/plugin'
import { assertNonVaultOutput, defaultOutputPath, resolveVaultPath } from '../skills/_shared/opencode-runtime.mjs'

export default tool({
  description: 'Validate an OpenCode output path and reject Obsidian Vault writes.',
  args: {
    path: tool.schema.string().describe('Output path to validate'),
    useDefault: tool.schema.boolean().optional().describe('Resolve under the OpenCode output root')
  },
  async execute(args) {
    const target = args.useDefault ? defaultOutputPath(args.path) : assertNonVaultOutput(args.path)
    return {
      title: 'Validated OpenCode output path',
      output: JSON.stringify({
        path: target,
        vaultConfigured: Boolean(resolveVaultPath()),
        vaultWritable: false
      }, null, 2)
    }
  }
})
