import { tool } from '@opencode-ai/plugin'
import {
  assertNonVaultOutput,
  assertScopedVaultOutput,
  defaultOutputPath,
  resolveVaultPath,
  VAULT_WRITE_SCOPES,
} from '../skills/_shared/opencode-runtime.mjs'

export default tool({
  description:
    'Validate an OpenCode output path. Rejects Obsidian Vault writes by default; pass `skill` to validate against that skill user-authorized Vault subdirectory.',
  args: {
    path: tool.schema.string().describe('Output path to validate'),
    useDefault: tool.schema.boolean().optional().describe('Resolve under the OpenCode output root'),
    skill: tool.schema
      .enum(Object.keys(VAULT_WRITE_SCOPES))
      .optional()
      .describe('Only for skills with an authorized Vault subdirectory; otherwise Vault writes are denied'),
  },
  async execute(args) {
    const target = args.skill ? assertScopedVaultOutput(args.path, args.skill) : args.useDefault ? defaultOutputPath(args.path) : assertNonVaultOutput(args.path)
    return {
      title: 'Validated OpenCode output path',
      output: JSON.stringify({
        path: target,
        vaultConfigured: Boolean(resolveVaultPath()),
        vaultWritable: Boolean(args.skill),
        vaultWriteScope: args.skill ? VAULT_WRITE_SCOPES[args.skill].join('/') : null,
      }, null, 2),
    }
  },
})
