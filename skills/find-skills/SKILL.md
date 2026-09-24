---
name: find-skills
description: |-
  在开放技能生态中搜索与安装可扩展能力的技能。触发词：找 skill、有没有技能能、find a skill、
  how do I do X（X 可能已有现成 skill）、帮我搜技能、skills.sh、扩展能力。
  Use when the user wants to discover installable agent skills or extend capabilities via the open skills ecosystem.
---

## OpenCode 双端执行约定

本文中的 `powershell` 代码块是 Windows 示例；macOS 使用 `bash`/`zsh`。统一先设置 `SKILL_ROOT` 和 `PY`：Windows 使用 `$env:USERPROFILE\.config\opencode\skills\<skill>` 与 `python`，macOS 使用 `$HOME/.config/opencode/skills/<skill>` 与 `python3`。优先使用 `runtime-preflight`、`safe-output` 和 `market-data` 工具；不要把示例中的路径直接复制到另一端。输出必须位于本机 OpenCode 输出根，Vault 默认只读。

# Find Skills — 技能发现与安装（OpenCode 适配）

基于 [vercel-labs/skills](https://github.com/vercel-labs/skills) 的 find-skills，Windows 兼容改法来自 [KimYx0207/findskill](https://github.com/KimYx0207/findskill)。安装目标已固定为 **OpenCode 全局技能根**，不写入 OpenCode。

## 触发

- 「找一个 X 的 skill」「有没有技能能……」「how do I do X」「帮我搜技能」「skills.sh」

## 前置

- 需要 **Node.js**（`node`、`npm`、`npx`）。本机 shell：Windows 为 PowerShell；macOS 为 bash/zsh。
- OpenCode 已将 CLI 固定安装到 `{OPENCODE_CONFIG_ROOT}\node_modules\.bin\skills.cmd`，版本 `1.7.0`。
- **搜索关键字仅英文**（中文先对照下表翻译）。

## 命令（双端）

**Windows / OpenCode：**

```powershell
$SKILLS = "$env:USERPROFILE\.config\opencode\node_modules\.bin\skills.cmd"
& $SKILLS find '[query]'
& $SKILLS list -g --agent opencode --json
& $SKILLS update -g --agent opencode -y
```

若本地 CLI 缺失，先在 OpenCode 配置目录安装：

```powershell
npm install --prefix "$env:USERPROFILE\.config\opencode" --save-exact skills@1.7.0
```

**macOS：**

```bash
SKILLS="$HOME/.config/opencode/node_modules/.bin/skills"
"$SKILLS" find '[query]'
"$SKILLS" list -g --agent opencode --json
```

浏览目录: https://skills.sh/

## 工作流

1. **理解需求** — 领域 + 具体任务（如 react performance / pr review / changelog）
2. **搜索** — `npx skills find '<english query>'`（见上双端写法）
3. **展示结果** — 名称、简介、skills.sh 链接、安装命令
4. **确认后安装**

### 装进 OpenCode（重要）

安装命令必须显式指定 `opencode`，并使用 `--copy` 禁止符号链接。未经用户确认不得安装第三方 skill。

```powershell
$SKILLS = "$env:USERPROFILE\.config\opencode\node_modules\.bin\skills.cmd"
& $SKILLS add <owner/repo@skill> -g --agent opencode --copy -y
```

安装前必须向用户展示名称、来源、用途和目标路径。安装后确认：

1. 最终目录位于 `{OPENCODE_CONFIG_ROOT}\skills\<skill-id>`；
2. 目录内存在 `SKILL.md`，frontmatter `name` 与目录名一致；
3. 没有指向其他 Agent、OpenCode、DSH 或 Vault 的链接；
4. 相对引用和外部依赖完整；
5. 退出并重新启动 OpenCode 后，新会话能发现该 skill。

## 常用查询类别

| 类别 | 英文 query 示例 |
|------|-----------------|
| Web | react, nextjs, typescript, tailwind |
| 测试 | testing, playwright, e2e |
| DevOps | deploy, docker, ci-cd |
| 文档 | changelog, api-docs |
| 代码质量 | code review, refactor |
| 设计 | ui, ux, design-system |
| 数据 | data analysis, pandas |

## 中英关键词对照（搜索只认英文）

| 中文 | English |
|------|---------|
| 数据分析 | data analysis |
| 做PPT | ppt, presentation |
| 写文章 | writing |
| 代码审查 | code review |
| 部署 | deploy |
| 写测试 | testing |
| 做视频 | video, remotion |

## 无结果时

1. 说明未找到
2. 用通用能力直接帮做
3. 可建议 `npx skills init` 自建，并将普通目录放在 OpenCode 全局技能根

## 禁止

- 不向 OpenCode、DSH 或 vault 写入本技能
- 不把未确认的 skill 直接塞进业务目录
- 不创建到 OpenCode 技能库或其他代理目录的符号链接、目录联接
- 安装前向用户复述将写入的路径

## 出处

- Original: https://github.com/vercel-labs/skills
- Windows fix: https://github.com/KimYx0207/findskill
- OpenCode 适配：从 OpenCode 静态快照一次性调整
