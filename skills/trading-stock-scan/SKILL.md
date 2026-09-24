---
name: trading-stock-scan
description: >
  对个股进行结构化深度研究，整合公开行情、公告、财务、技术面、商品锚和事件信息。
  仅用户手动触发，报告写入 OpenCode 非 Vault 目录，不访问账户或执行交易。
  当用户说“深度扫描”“研究一下”“看看某股票”时使用。
compatibility: opencode
metadata:
  vault-access: read-only
  output-policy: opencode-non-vault
---

## OpenCode 双端执行约定

本文中的 `powershell` 代码块是 Windows 示例；macOS 使用 `bash`/`zsh`。统一先设置 `SKILL_ROOT` 和 `PY`：Windows 使用 `$env:USERPROFILE\.config\opencode\skills\<skill>` 与 `python`，macOS 使用 `$HOME/.config/opencode/skills/<skill>` 与 `python3`。优先使用 `runtime-preflight`、`safe-output` 和 `market-data` 工具；不要把示例中的路径直接复制到另一端。输出必须位于本机 OpenCode 输出根，Vault 默认只读。

# OpenCode 执行边界

1. Vault、wiki、entity、持仓和交易计划文件只读。
2. 禁止创建、修改、移动、删除或回写任何 Obsidian 文件。
3. 默认报告写入 `{OPENCODE_CONFIG_ROOT}\outputs\trading\stock-scan\`。
4. 仅用户实际触发时访问公开行情、公告和新闻。
5. 不访问账户、Cookie、Token 或交易凭据，不执行任何交易动作。
6. 不调用 MiMo、DSH、Obsidian 或 domain-memory 专用工具。
7. “已预授权纪律线”只能作为提醒，不得由本 skill 执行。

# 个股深度扫描

## 触发方式

- 用户明确说“深度扫描 XXX”“研究一下 XXX”“XXX 怎么样”或“帮我看看 XXX”时执行。
- 不在复盘、盘前预测或后台任务中自动执行。

## 标的确认

- 优先使用用户提供的股票名称或代码；
- 名称无法确认时，读取用户允许的本地 entity 文件或使用公开搜索确认；
- 代码、站点或标的无法确认时停止扫描，不猜测。

## 数据来源

- 东方财富公开行情和财务页面；
- 新浪公开行情；
- 腾讯公开行情；
- 用户提供的公告、研报或历史数据；
- `webfetch` 和 `websearch` 获取的公开页面。

所有来源记录 URL、采集时间和口径。网络失败一次后停止重试，缺失项标 `[待补]`。

## 行情入口

```powershell
$MK = "$env:USERPROFILE\.config\opencode\skills\_shared\opencode-market.mjs"
node "$MK" stocks "{code}"
node "$MK" sina "{market_symbol}"
node "$MK" tencent "{market_symbol}"
node "$MK" kline "{symbol}" 101 30
node "$MK" sector 20
node "$MK" get "<公开页面 URL>"
```

- 东方财富作为主要口径；
- 新浪和腾讯交叉复核；
- K 线用于量价趋势、背离和关键位；
- 板块资金用于同行和行业比较；
- 个股主力资金没有直接来源时，使用板块资金、K 线和用户提供的历史记录三层代理，并明确标注。

## 执行流程

### 第一步：确定模式

- 首次扫描：没有用户指定的基线报告时，生成完整扫描；
- 增量复扫：用户指定基线时，先读取基线，再输出“基线 vs 现状”、支柱变化和规则触发距离。

### 第二步：采集数据

按以下顺序采集：

1. 实时行情和估值快照；
2. 日 K 线和近 5 日、近 20 日变化；
3. 近 30 天公告；
4. 机构评级和目标价；
5. 近四季度财务数据；
6. 行业和板块资金；
7. 商品锚和事件驱动；
8. 公开新闻和舆情。

公告或评级页面为空时使用 `[待补]`；机构评级可以使用“自评”，但不能伪装成机构数据。

### 第三步：持仓和计划关联

只读检查用户允许读取的当前持仓、交易计划和操作规则：

- 持仓中：输出逻辑支柱、触发距离和失效条件；
- 待入场：输出入场条件完成度；
- 不在计划中：标记为观察中；
- 任何预授权纪律线只输出提醒，不执行交易。

### 第四步：生成报告

默认输出：

`{OPENCODE_CONFIG_ROOT}\outputs\trading\stock-scan\YYYY-MM-DD-{股票名}-深度扫描.md`

报告包含：

1. 标的与数据范围；
2. 数据来源和缺口；
3. 基本面快照；
4. 财务趋势；
5. 商品锚核验；
6. 公告和事件；
7. 机构动态；
8. 资金和量价；
9. 技术面；
10. 风险提示；
11. 持仓或计划关联；
12. 首次扫描结论或增量复扫结论；
13. 需要人工决策的事项。

## 增量复扫

增量报告必须包含：

| 支柱 | 基线状态 | 当前状态 | 变化证据 |
|---|---|---|---|
| {支柱} | {状态} | {状态} | {来源和日期} |

结论只说明逻辑是否发生变化，不自动给出买卖指令。

## 失败处理

- 实时行情失败时不使用旧价格冒充当前价格；
- 财务或评级缺失时保留数据缺口；
- 商品异动必须有公开来源或标记 `[待补]`；
- 多源冲突并列展示并说明采用的口径；
- 任何结果不写入 Vault。
