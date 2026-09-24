# OpenCode-Agent

Windows 与 macOS 共用的 OpenCode skills、commands、agents、tools 和验证规则。

[English](README.md) | 简体中文

## 仓库定位

本仓库是 OpenCode 工作流定义的可移植真源，不是运行时数据库、知识库或其他 Agent 的配置。每台机器独立保存自己的 OpenCode 配置、凭据、本地部署、浏览器状态和生成产物。

## 隔离边界

- OpenCode 只维护自己的配置和部署。
- Mimo、DSH 及其他 Agent 各自维护 skills、tools、依赖和运行时。
- 不使用跨 Agent 符号链接、目录联接、共享配置或共享凭据。
- 知识库是受控的跨 Agent 经验/数据交换层，默认只读；写入必须有明确任务授权和来源记录。
- 公网访问由用户触发；禁止提交凭据、Cookie、账户数据、持仓、ASIN、导出文件、数据库或生成报告。

## 目录地图

```text
agents/                 OpenCode 主 Agent 与只读 subagent
commands/               用户触发的命令入口
skills/                 Skill 定义、references、scripts、locales
  _shared/              跨 skill 的 runtime、行情和表格工具
tools/                  自定义 tools 与仓库校验器
tests/                  离线 smoke tests
profiles/               可选知识库布局说明，不含用户数据
docs/                   便携性与维护说明
.github/workflows/      Windows/macOS/Linux CI
```

详细说明见 [REPO-MAP.zh-CN.md](REPO-MAP.zh-CN.md)；双端维护见 [DUAL-END.zh-CN.md](DUAL-END.zh-CN.md)。

## 环境要求

- Node.js `>=22.20.0`
- Python 3.11+
- 数据流程需要 `pandas`、`numpy`、`openpyxl`、`PyYAML`、`akshare`
- 浏览器 MCP 或 `bsk` 仅在用户明确要求浏览器操作时使用

安装仓库依赖：

```bash
npm ci
```

## 部署到机器

仓库副本与本机 OpenCode 配置分开保存。先预览：

```bash
node tools/install.mjs --target "$HOME/.config/opencode"
```

Windows PowerShell：

```powershell
node tools/install.mjs --target "$env:USERPROFILE\.config\opencode"
```

确认计划后才应用：

```bash
node tools/install.mjs --target "$HOME/.config/opencode" --apply
```

安装器只复制 skills、commands、agents、tools；不会复制本机配置、凭据、输出、`node_modules`、Vault 数据或浏览器状态。

## OpenCode 配置

将 `opencode.example.jsonc` 合并到机器本地配置，不要提交合并后的本机文件。修改 skills、agents、commands、tools 或配置后重启 OpenCode。

## 验证

```bash
npm run validate
npm test
npm run check
```

校验器检查 skill 元数据、路径便携性、敏感信息、缓存、生成数据和必需文件。CI 在 Linux、macOS、Windows 执行同样检查。

## 后续维护

- 在本仓库修改可移植定义，再分别部署到 Windows/macOS。
- 不把某台机器的本地配置或生成产物复制回 Git。
- 使用选择性暂存，检查 diff，运行 `npm run check`，只提交目标文件。
- 使用 `main`，推送前 rebase，禁止 force-push。
- 新增第三方 skill 前记录来源、版本/commit、许可证和审查日期。
- 新增平台相关代码时同步更新中文/英文说明和 CI 矩阵。
