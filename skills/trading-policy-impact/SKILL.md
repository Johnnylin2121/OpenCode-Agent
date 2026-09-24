---
name: trading-policy-impact
description: >
  分析重大政策或事件的影响链路，映射受益与受损方向，并追踪公开市场反应。
  仅用户手动触发，结果写入 OpenCode 非 Vault 记录，不自动更新 Obsidian。
  当用户说“追踪这个政策”“分析政策影响”“政策追踪”时使用。
compatibility: opencode
metadata:
  vault-access: read-only
  output-policy: opencode-non-vault
---

## OpenCode 双端执行约定

本文中的 `powershell` 代码块是 Windows 示例；macOS 使用 `bash`/`zsh`。统一先设置 `SKILL_ROOT` 和 `PY`：Windows 使用 `$env:USERPROFILE\.config\opencode\skills\<skill>` 与 `python`，macOS 使用 `$HOME/.config/opencode/skills/<skill>` 与 `python3`。优先使用 `runtime-preflight`、`safe-output` 和 `market-data` 工具；不要把示例中的路径直接复制到另一端。输出必须位于本机 OpenCode 输出根，Vault 默认只读。

# OpenCode 执行边界

1. Vault、财经早读、wiki 和 entity 文件只读。
2. 禁止创建、修改、移动、删除或回写任何 Obsidian 文件。
3. 默认输出到 `{OPENCODE_CONFIG_ROOT}\outputs\trading\policy-impact\`。
4. 仅在用户实际触发时使用公开网络和行情数据。
5. 不访问账户、Cookie、Token 或交易凭据。
6. 不调用 MiMo、DSH、Obsidian 或 domain-memory 专用工具。

# 政策事件追踪

## 触发方式

- 用户明确要求追踪政策、分析政策影响或分析重大事件时执行。
- 不创建后台追踪任务，不自动更新状态。

## 重大事件判定

以下任一条件可视为重大事件：

- 核心部委、央行、证监会或发改委发布政策；
- 补贴、限产、准入、税费等行业调整；
- 制裁、冲突、贸易摩擦等地缘事件；
- CPI、PMI、GDP 等宏观数据显著偏离预期；
- 重大技术突破、并购或产业周期变化。

日常资讯不自动触发本 skill。

## 执行流程

### 第一步：识别事件

从用户提供的早读、公告或网页中提取：

- 事件名称；
- 发布机构；
- 发布日期；
- 涉及行业和板块；
- 核心内容；
- 原文 URL。

原文缺失时标记 `[待补]`，不凭标题扩写事实。

### 第二步：公开信息检索

用户触发后使用 `websearch` 和 `webfetch` 搜索：

```text
"{政策名}" 影响 板块 行业 受益 利空
"{政策名}" 历史 先例
"{政策名}" 实施细则
```

每条结论必须附来源、发布日期和检索时间。不同来源冲突时并列呈现，不自动选择未说明的来源。

### 第三步：市场反应

需要行情时使用 OpenCode 本地入口：

```powershell
$MK = "$env:USERPROFILE\.config\opencode\skills\_shared\opencode-market.mjs"
node "$MK" index
node "$MK" stocks "1.600000,0.000001"
node "$MK" sector 20
node "$MK" sina "sh600519,sz000001"
node "$MK" tencent "sh600519,sz000001"
```

- 东方财富作为板块涨跌幅和成交额基准；
- 新浪和腾讯用于交叉验证；
- 数据冲突必须显著标注；
- 不用未采集的数据填补市场反应。

### 第四步：影响链路

分别分析：

1. 直接受益行业和公司；
2. 通过产业链传导的间接受益方向；
3. 可能受损行业和公司；
4. 影响时滞；
5. 需要人工确认的政策不确定性。

### 第五步：历史先例

检索类似政策的历史市场反应，记录：

- 政策或事件；
- 发布日期；
- 当时板块和个股反应；
- 持续时间；
- 与当前环境的差异；
- 证据 URL。

### 第六步：关联已有资料

只读检索用户指定的知识库目录，匹配行业、实体和主题关键词。不得更新 entity 的 `sources` 字段或 wiki 文件。

## 输出位置

默认文件：`{OPENCODE_CONFIG_ROOT}\outputs\trading\policy-impact\YYYY-MM-DD-{政策名}-政策追踪.md`。

用户未要求文件时，直接在对话中输出完整报告。

## 输出模板

```markdown
# {政策名} 政策追踪

> 发布机构：{机构}
> 发布日期：{日期}
> 数据范围：{日期范围}
> 公开来源：{URL 列表}

## 政策概要

## 影响链路

### 直接受益

| 方向或标的 | 代码 | 逻辑 | 影响程度 | 证据 |
|---|---|---|---|---|

### 间接受益

| 方向或标的 | 代码 | 逻辑 | 影响程度 | 证据 |
|---|---|---|---|---|

### 可能受损

| 方向或标的 | 代码 | 逻辑 | 影响程度 | 证据 |
|---|---|---|---|---|

## 历史先例

## 市场反应

| 日期 | 板块或标的 | 实际反应 | 数据来源 | 备注 |
|---|---|---|---|---|

## 影响时滞

## 后续关注节点

## 数据缺口与人工决策
```

## 失败处理

- 搜索或行情接口失败一次后停止重试；
- 失败来源写 `[待补]`，不使用猜测值；
- 缺少政策原文时只分析已确认标题，不扩写政策细节；
- 任何结果都不写入 Vault。
