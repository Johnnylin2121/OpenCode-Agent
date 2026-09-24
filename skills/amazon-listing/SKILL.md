---
name: amazon-listing
description: >
  Amazon listing optimization workflow. Analyzes competitor listings, extracts core keywords,
  writes title, Item Highlights, bullet points and backend search terms, and supports post-launch
  feedback. Uses webfetch, Playwright MCP or user-pasted data; never writes Obsidian by default.
compatibility: opencode
metadata:
  vault-access: read-only
  output-policy: opencode-non-vault
---

## OpenCode 双端执行约定

本文中的 `powershell` 代码块是 Windows 示例；macOS 使用 `bash`/`zsh`。统一先设置 `SKILL_ROOT` 和 `PY`：Windows 使用 `$env:USERPROFILE\.config\opencode\skills\<skill>` 与 `python`，macOS 使用 `$HOME/.config/opencode/skills/<skill>` 与 `python3`。优先使用 `runtime-preflight`、`safe-output` 和 `market-data` 工具；不要把示例中的路径直接复制到另一端。输出必须位于本机 OpenCode 输出根，Vault 默认只读。

# OpenCode 执行边界

1. 用户输入和竞品资料只读；不修改或删除原始资料。
2. 禁止写入 Obsidian Vault、`工作/` 目录或任何 Amazon 工作管理 Vault 路径。
3. 默认结果写入 `{OPENCODE_CONFIG_ROOT}\outputs\amazon\listing\`；用户未要求文件时直接输出对话。
4. 仅用户实际触发时访问公开网页；默认不访问 Amazon 账户、登录态、Cookie 或扩展数据。
5. 不调用 MiMo、DSH、browser-skill 或账户类工具。
6. 竞品声称不能直接变成本产品事实；未确认的规格、认证和兼容性统一标记 `[待确认]`。

# Amazon Listing Optimization Workflow

## Overview

六个阶段，每个阶段完成后等待用户确认：

1. 确认站点和产品类目；
2. 收集竞品并提取核心关键词；
3. 生成 Title 和 Item Highlights；
4. 生成五条 Bullet Points；
5. 生成后台搜索词；
6. 用户提供后续广告数据后进行回检。

## Policy Limits

| 字段 | 限制 |
|---|---|
| Title | 75 characters including spaces；目标不超过 73 |
| Item Highlights | 125 characters total |
| Title + Highlights | 200 characters total |
| Bullet points | 5 points，each ≤500 characters |
| Backend search terms | ≤249 UTF-8 bytes |

媒体类目可能不适用这些限制，服装类可能需要更短标题；不确定时先询问用户。

## Step 0：确认站点和政策

确认：

- marketplace；
- 产品类目；
- 用户实际产品资料；
- 是否使用 2026-07 政策；
- 输出格式和目标站点语言。

所有产品事实必须来自用户资料或用户明确确认的来源。

## Step 1：收集竞品和关键词

### 抓取顺序

1. 使用 `webfetch` 获取公开商品页；
2. 页面截断、CAPTCHA 或需要登录时，使用当前 Playwright MCP `playwright-mcp:playwright`；
3. 仍无法获取时，请用户粘贴标题和五点；
4. 不使用 DSH `browser_*`、`read_page` 或 browser-skill；
5. 每个来源最多尝试两次，失败后记录 `[待补]`。

### 关键词脚本

使用当前 `python` 和 OpenCode 技能目录：

```powershell
$SKILL = "$env:USERPROFILE\.config\opencode\skills\amazon-listing"
& $PY "$SKILL\scripts\kw_analysis.py" -i competitors.txt
```

其中 `$PY = "python"`。脚本只负责 1-gram 和 2-gram 权重统计；agent 负责同根词合并、Top 10 筛选和需求类型标注。

关键词必须标注：

- category；
- function；
- attribute；
- material；
- scenario；
- audience。

如果存在场景词或人群词，五点中必须自然覆盖至少一个；不存在时明确说明，不编造。

## Step 2：Title 和 Item Highlights

- Title 前 3 至 5 个词放置品类核心词；
- 目标长度不超过 73；
- Highlights 使用短语，不写完整句子；
- Highlights 不重复 Title 已有词；
- 合计不超过 200 characters；
- 未确认的认证、协议、兼容性和材料声明标记 `[待确认]`。

输出字符数、关键词落位表和待确认项。

## Step 3：Bullet Points

生成五条，每条不超过 500 characters：

1. 主要使用场景和核心价值；
2. 关键功能或规格；
3. 材料和结构；
4. 尺寸、兼容性和安装；
5. 包装、配件和售后。

不得照抄竞品文案，不得把竞品功能写成用户产品事实。场景词和人群词必须进入关键词落位表或说明未放入的原因。

## Step 4：后台搜索词

后台词只使用与产品高度相关的完整词组：

- 优先使用用户提供的 ABA、关键词调研或自然位导出；
- 其次使用竞品标题词形和用户提供的评论语言；
- 不使用碎片词、品牌名、ASIN、促销词或无关设备词；
- 排除 Title、Highlights 和 Bullets 已使用的词；
- 单复数取一，使用小写和单空格；
- UTF-8 按字节计算，不超过 249 bytes；
- 输出词组、字节数、来源和相关性检查。

## Step 5：投放后回检

用户在上架后提供广告搜索词报告时：

1. 对比 Title 和 Highlights 中的核心词；
2. 找出已覆盖但未曝光、已曝光但未转化和持续浪费的词；
3. 给出下一版 Listing 修改建议；
4. 如用户另行授权，再调用 `amazon-ad-analysis`；
5. 不自动暂停广告、不修改 Amazon 后台、不写入 Vault。

自然位数据默认使用用户导出或公开替代源；没有数据时标记 `B级数据未取到，自然位未验证`，不使用猜测替代。

## 输出

默认输出文件：

`{OPENCODE_CONFIG_ROOT}\outputs\amazon\listing\YYYY-MM-DD-{ASIN}-{product}-listing.md`

输出包含：

1. 站点和政策；
2. 竞品来源；
3. Top 10 关键词和需求类型；
4. Title 与字符数；
5. Item Highlights 与字符数；
6. 五点和字符数；
7. 后台搜索词与字节数；
8. 待用户确认的事实；
9. 投放后回检记录。

## 禁止事项

- 不把输出写入 Obsidian；
- 不访问账户或凭据；
- 不自动执行广告操作；
- 不把竞品声称当作用户产品事实；
- 不用单一来源替代缺失的多源证据；
- 不生成超过政策限制的字段。
