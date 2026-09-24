# Optional knowledge-base profile

[English](README.md) | [简体中文](README.zh-CN.md)

This directory contains no Vault files and no user data.

A Windows or macOS machine may configure its own knowledge-base paths locally. Keep the layout configurable, for example:

```text
{VAULT_PATH}/
  trading/
  reviews/
  memory/
```

OpenCode reads approved knowledge-base files only. Persistent OpenCode artifacts belong under `{OPENCODE_OUTPUT_ROOT}`. Any write to a knowledge base requires explicit task authorization, source attribution, and a record of what changed.
