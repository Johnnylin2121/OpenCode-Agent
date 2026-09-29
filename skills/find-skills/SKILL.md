---
name: find-skills
description: |-
  在开放技能生态中搜索与安装可扩展能力的技能。触发词：找 skill、有没有技能能、find a skill、
  how do I do X（X 可能已有现成 skill）、帮我搜技能、skills.sh、扩展能力。
  Use when the user wants to discover installable agent skills or extend capabilities via the open skills ecosystem.
compatibility: opencode
metadata:
  vault-access: read-only
  output-policy: opencode-non-vault

---

# Find Skills — 技能发现与安装（OpenCode 适配）

基于 [vercel-labs/skills](https://github.com/vercel-labs/skills) 的 find-skills，Windows 兼容改法来自 [KimYx0207/findskill](https://github.com/KimYx0207/findskill)。安装目标已固定为 **OpenCode 全局技能根**，不写入其他 Agent 的技能目录或知识库。

## 触发

- 「找一个 X 的 skill」「有没有技能能……」「how do I do X」「帮我搜技能」「skills.sh」

## 前置

- 需要 **Node.js**（`node`、`npm`）。本机 shell：Windows 为 PowerShell；macOS 为 bash/zsh。
- OpenCode 已将 CLI 固定安装到本机 OpenCode 配置根下：Windows 为 `$env:USERPROFILE\.config\opencode\node_modules\.bin\skills.cmd`，macOS 为 `$HOME/.config/opencode/node_modules/.bin/skills`，版本 `1.7.0`。
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
2. **搜索** — 使用上方已固定安装的本地 CLI：Windows `& $SKILLS find '<english query>'`，macOS `"$SKILLS" find '<english query>'`
3. **展示结果** — 名称、简介、skills.sh 链接、安装命令
4. **确认后安装**

### 装进 OpenCode（重要）

安装命令必须显式指定 `opencode`，并使用 `--copy` 禁止符号链接。未经用户确认不得安装第三方 skill。

```powershell
$SKILLS = "$env:USERPROFILE\.config\opencode\node_modules\.bin\skills.cmd"
& $SKILLS add <owner/repo@skill> -g --agent opencode --copy -y
```

安装前必须向用户展示名称、来源、用途和目标路径。安装后确认：

1. 最终目录位于 `{OPENCODE_CONFIG_ROOT}/skills/<skill-id>`（Windows 为 `$env:USERPROFILE\.config\opencode\skills\<skill-id>`，macOS 为 `$HOME/.config/opencode/skills/<skill-id>`）；
2. 目录内存在 `SKILL.md`，frontmatter `name` 与目录名一致；
3. 没有指向其他 Agent 目录或知识库 Vault 的链接；
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
3. 可建议用同一本地 CLI 自建（Windows `& $SKILLS init`，macOS `"$SKILLS" init`），并将普通目录放在 OpenCode 全局技能根

## 禁止

- 不把本技能写入其他 Agent 的技能目录或知识库 Vault
- 不把未确认的 skill 直接塞进业务目录
- 不创建到其他 Agent 技能库或代理目录的符号链接、目录联接
- 安装前向用户复述将写入的路径

## 出处

- Original: https://github.com/vercel-labs/skills  
- Windows fix: https://github.com/KimYx0207/findskill  
- OpenCode 适配：安装目标固定为 OpenCode 全局技能根，CLI 路径、子命令和参数已固定
