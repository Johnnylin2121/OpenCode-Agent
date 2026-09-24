# 可移植性说明

[English](portability.md) | 简体中文

## 基本规则

- 使用 `{OPENCODE_CONFIG_ROOT}`、`{SKILLS_ROOT}`、`{OPENCODE_OUTPUT_ROOT}` 和 `{VAULT_PATH}`。
- `$env:USERPROFILE` 和 `$HOME` 只能出现在明确标注平台的命令块中。
- Python 解析顺序：`OPENCODE_PYTHON` → Windows `python` / macOS `python3`。
- 优先使用 Node 内置模块；npm 依赖写入 `package.json` 和 `package-lock.json`。
- 文本使用 UTF-8 无 BOM、LF 换行。
- 禁止提交机器路径、凭据、Cookie、账户数据、导出文件、数据库、生成报告、缓存或 Vault 内容。
- 禁止使用符号链接或目录联接把一个 Agent 的运行时连接到另一个 Agent。

## 知识库边界

知识库是受控的跨 Agent 交换层。默认只读；写入必须有明确任务授权、来源/时间/范围记录，且不得包含秘密。运行时配置和本地状态始终属于各 Agent。
