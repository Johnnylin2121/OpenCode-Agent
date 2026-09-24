# Portability rules

[English](portability.md) | [简体中文](portability.zh-CN.md)

This repository is shared by Windows and macOS OpenCode installations.

## Required conventions

- Use `{OPENCODE_CONFIG_ROOT}`, `{SKILLS_ROOT}`, `{OPENCODE_OUTPUT_ROOT}`, and `{VAULT_PATH}` in documentation.
- Use `$env:USERPROFILE` and `$HOME` examples only in platform-labelled command blocks.
- Resolve Python as `OPENCODE_PYTHON`, then `python` on Windows or `python3` on macOS/POSIX.
- Use Node built-in modules where possible; pin npm dependencies in `package.json` and `package-lock.json`.
- Keep text files UTF-8 without BOM and LF line endings.
- Never commit machine paths, credentials, cookies, account data, exports, databases, generated reports, caches, or Vault content.
- Never use a symlink or directory junction to connect one Agent's runtime to another Agent's runtime.
- Keep Windows and macOS commands adjacent and test both in CI.

## Knowledge-base boundary

The knowledge base is a controlled cross-Agent exchange layer. Read only by default. A write requires an explicit task authorization, source/time/scope metadata, and no secret content. Runtime configuration and local state remain Agent-local.
