import { tool } from '@opencode-ai/plugin'
import { preflight } from '../skills/_shared/opencode-runtime.mjs'

export default tool({
  description: 'Check the local OpenCode runtime and non-Vault output prerequisites without network access.',
  args: {},
  async execute() {
    return {
      title: 'OpenCode runtime preflight',
      output: JSON.stringify(preflight(), null, 2)
    }
  }
})
