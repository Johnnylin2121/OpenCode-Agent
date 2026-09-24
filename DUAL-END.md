# Windows and macOS maintenance

[English](DUAL-END.md) | [简体中文](DUAL-END.zh-CN.md)

## Common source rule

The Git repository stores portable OpenCode definitions. Each machine owns its local OpenCode configuration and deployment. Do not edit another Agent's files, do not create cross-Agent links, and do not commit machine-local state.

## Prerequisites

- Node.js `>=22.20.0`
- Python 3.11+
- Git with SSH access
- A user-approved knowledge-base path, configured locally and never committed

## Windows

```powershell
git clone git@github.com:Johnnylin2121/OpenCode-Agent.git "$env:USERPROFILE\source\OpenCode-Agent"
Set-Location "$env:USERPROFILE\source\OpenCode-Agent"
npm ci
npm run check
node tools/install.mjs --target "$env:USERPROFILE\.config\opencode"
```

Use `OPENCODE_PYTHON` when the default `python` is not suitable. Use PowerShell paths only inside Windows-labelled blocks.

## macOS

```bash
git clone git@github.com:Johnnylin2121/OpenCode-Agent.git "$HOME/source/OpenCode-Agent"
cd "$HOME/source/OpenCode-Agent"
npm ci
npm run check
node tools/install.mjs --target "$HOME/.config/opencode"
```

Use `python3` or set `OPENCODE_PYTHON`. Do not assume PowerShell, Windows Python paths, or Windows browser binaries are available.

## Deployment rules

1. Pull and rebase the repository before editing.
2. Run `npm run check` before staging.
3. Use the installer in dry-run mode and inspect the target.
4. Apply only intended files to the machine-local OpenCode root.
5. Restart OpenCode after deployment.
6. Run one public, non-sensitive smoke workflow.

The installer never copies local config, credentials, Vault data, outputs, caches, `node_modules`, or browser state.

## Two-end synchronization

```text
pull --rebase
  -> edit portable repository files
  -> npm run check
  -> inspect git diff
  -> selective git add
  -> commit
  -> push
  -> deploy separately to Windows and macOS
```

Do not use `git add -A` blindly. Do not force-push. Do not use a Mac absolute path in a Windows block or the reverse. Keep platform-specific commands adjacent and update the CI matrix.

## Knowledge-base exchange

Agents may read approved records from the shared knowledge base. A write is allowed only for the specific task the user requested, with source, time, scope, and no secrets. Keep each Agent's runtime output separate even when the business topic is shared.

## Conflict handling

- Prefer the repository definition over machine-generated edits.
- Preserve both platform variants when behavior differs.
- Record unresolved portability issues in the pull request or maintenance note.
- Never resolve a conflict by copying Vault content or credentials into Git.
