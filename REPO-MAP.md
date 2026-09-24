# Repository map

## Ownership boundaries

| Area | Owner | May contain | Must not contain |
|---|---|---|---|
| `skills/` | OpenCode workflow definitions | prompts, portable scripts, references, synthetic examples | secrets, real exports, machine paths, Vault data |
| `commands/` | OpenCode user entrypoints | short prompts and `$ARGUMENTS` templates | shell-specific state, credentials |
| `agents/` | OpenCode orchestration | prompts, permissions, read-only roles | other Agent configuration |
| `tools/` | OpenCode custom tools | local validation, runtime preflight, read-only data access | writes to Vault by default |
| `tests/` | Repository maintainers | synthetic fixtures and offline checks | real business data |
| `profiles/` | User-local deployment notes | placeholders and layout contracts | Vault files or copied notes |
| `.github/` | CI | validation workflow | secrets or deployment credentials |

## Runtime flow

```text
OpenCode host
  -> global/project config
  -> commands and primary agents
  -> skills and references
  -> tools or local scripts
  -> OpenCode output root
```

OpenCode loads skills by `SKILL.md` frontmatter. A skill directory name must match its `name`. Commands and agents are host-level orchestration; they do not register tools in other Agents.

## Data flow

```text
user-approved local files or public source
  -> read-only agent/tool
  -> deterministic local script
  -> validated OpenCode output
  -> optional user-approved knowledge-base record
```

Inputs are never overwritten. Network tools are invoked only by a user-triggered workflow. Generated data stays outside Git.

## Knowledge-base sharing

The knowledge base is a controlled exchange layer, not a shared runtime. Each Agent may read approved records. A write needs explicit authorization, source, timestamp, scope, and a record of the decision. Credentials, cookies, account data, and private runtime state never cross this boundary.

## Extension points

- Add a skill under `skills/<name>/` with `SKILL.md`, optional `references/`, `scripts/`, `config/`, and `locales/`.
- Add a user command under `commands/` and bind it to an OpenCode primary agent.
- Add a read-only role under `agents/` with explicit permissions.
- Add a custom tool under `tools/` only when a deterministic local operation needs a stable interface.
- Add tests under `tests/` and update `tools/validate-repo.mjs` when a new invariant is introduced.

## Non-goals

- No shared Agent configuration tree.
- No automatic synchronization between Mimo, DSH, OpenCode, or other Agents.
- No unattended schedulers, account connections, or background notifications.
- No public publication of private knowledge-base or business data.
