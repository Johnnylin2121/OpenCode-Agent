# OpenCode-Agent

Portable OpenCode skills, commands, agents, tools, and validation rules for Windows and macOS.

This repository is the shared source for OpenCode workflow definitions. It is not a runtime database, a knowledge base, or another Agent's configuration. Each machine keeps its own OpenCode configuration, credentials, local skills deployment, browser state, and generated outputs.

## Boundaries

- OpenCode owns only its own configuration and deployment.
- Mimo, DSH, and other Agents keep separate skill roots, tools, dependencies, and runtime state.
- No cross-Agent symlinks, directory junctions, shared config, or shared credential stores.
- The knowledge base is the controlled cross-Agent exchange layer for approved experience and data. It is read-only by default; writes require explicit task authorization and provenance.
- Public network access is user-triggered. Never commit credentials, cookies, account data, holdings, ASINs, exports, databases, or generated reports.

## Repository map

```text
agents/                 OpenCode primary and read-only subagents
commands/               User-triggered workflow commands
skills/                 Skill definitions, references, scripts, and locales
  _shared/              Cross-skill runtime, market, and table utilities
tools/                  Custom tools and repository validation
 tests/                 Offline smoke tests
profiles/               Optional knowledge-base layout notes; no user data
docs/                   Portability and maintenance notes
.github/workflows/      Windows/macOS/Linux validation matrix
```

See `REPO-MAP.md` for ownership and data flow, and `DUAL-END.md` for Windows/macOS maintenance.

## Requirements

- Node.js `>=22.20.0`
- Python 3.11 or newer
- `pandas`, `numpy`, `openpyxl`, `PyYAML`, and `akshare` for data workflows
- Optional browser MCP or `bsk` only when the user explicitly requests browser work

Install repository dependencies:

```bash
npm ci
```

## Deploy to a machine

Keep the repository clone separate from the local OpenCode configuration. Preview first:

```bash
node tools/install.mjs --target "$HOME/.config/opencode"
```

Windows PowerShell:

```powershell
node tools/install.mjs --target "$env:USERPROFILE\.config\opencode"
```

Apply only after reviewing the plan:

```bash
node tools/install.mjs --target "$HOME/.config/opencode" --apply
```

The installer copies skills, commands, agents, and tools. It does not copy `opencode.local.jsonc`, credentials, outputs, node_modules, Vault data, or browser state.

## OpenCode configuration

Copy `opencode.example.jsonc` to the machine-local OpenCode config and merge it with the existing configuration. Do not commit the resulting local file. Restart OpenCode after changing skills, agents, commands, tools, or configuration.

## Validation

```bash
npm run validate
npm test
npm run check
```

The validator checks skill metadata, path portability, secret patterns, caches, generated data, and required repository files. CI runs the same checks on Linux, macOS, and Windows.

## Maintenance

- Edit portable definitions in this repository, then deploy to each machine.
- Do not copy one machine's local config or generated output back into Git.
- Use selective staging, inspect the diff, run `npm run check`, and push only intended files.
- Use `main`, pull with rebase before pushing, and never force-push.
- Review third-party skill source and license before adding or redistributing it.
- Keep Windows and macOS instructions adjacent and update CI when adding platform-specific code.
