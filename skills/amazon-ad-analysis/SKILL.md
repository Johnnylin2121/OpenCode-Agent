---
name: amazon-ad-analysis
description: >
  亚马逊广告与经营分析工作流，支持 CSV/Excel 的产品表现、广告表现、品牌归因和搜索词数据，
  输出全店总览、ASIN 深挖、关键词、否定词、Listing 覆盖和行动建议到 OpenCode 非 Vault 目录。
  当用户上传 Amazon 数据或要求广告分析、ACOS 优化、产品表现分析时使用。
compatibility: opencode
metadata:
  vault-access: read-only
  output-policy: opencode-non-vault
---

## OpenCode 双端执行约定

本文中的 `powershell` 代码块是 Windows 示例；macOS 使用 `bash`/`zsh`。统一先设置 `SKILL_ROOT` 和 `PY`：Windows 使用 `$env:USERPROFILE\.config\opencode\skills\<skill>` 与 `python`，macOS 使用 `$HOME/.config/opencode/skills/<skill>` 与 `python3`。优先使用 `runtime-preflight`、`safe-output` 和 `market-data` 工具；不要把示例中的路径直接复制到另一端。输出必须位于本机 OpenCode 输出根，Vault 默认只读。

# OpenCode 执行边界

1. 用户上传或指定的原始文件只读；不覆盖、删除或移动输入文件。
2. 禁止写入 Obsidian Vault、`工作/` 目录、`亚马逊工作管理/` 或 `MEMORY.md`。
3. 默认产物写入 `{OPENCODE_CONFIG_ROOT}\outputs\amazon\ad-analysis\`。
4. 仅用户实际触发时访问公开 Amazon 页面或关键词来源；不访问 Amazon 账户、登录态或 Cookie。
5. 不调用 MiMo、DSH、Obsidian、domain-memory 或 Excel 专用工具。
6. 所有结论必须能追溯到输入文件行或公开来源；缺失数据写 `[待补]`。

# Amazon 广告与经营分析

## 数据架构

### 产品表现文件

粒度通常为 ASIN × 日期，包含销量、销售额、订单、Sessions、CVR、广告花费、ACOS、TACOS、ROAS 和自然订单。

### 广告表现文件

粒度通常为广告活动 × 日期，包含曝光、点击、花费、销售额、订单、ACOS、CPC、CTR 和 CVR。

### 品牌广告归因文件

按日或导出口径读取，聚合时不得假设原文件已经是一 ASIN 一行。

### 搜索词文件

支持两种日期结构：

- 单日期列：所有行按日读取；
- 开始日期和结束日期：单日行用于分析，多日行只用于总览校验。

## 运行时

```powershell
$SKILL = "$env:USERPROFILE\.config\opencode\skills\amazon-ad-analysis"
$PY = "python"
& $PY "$SKILL\scripts\analysis_v2.py" --help
```

大文件先探查：

```powershell
$PROBE = "$env:USERPROFILE\.config\opencode\skills\_shared\excel-probe.py"
& $PY "$PROBE" describe --input <file.xlsx> --n 8
& $PY "$PROBE" columns --input <file.xlsx>
```

脚本支持 CSV 和 Excel；所有输出路径必须是非 Vault 路径。

## Phase 0：需求确认

一次确认以下口径：

1. 分类标准；
2. 是否评估优化潜力；
3. 广告、Listing 或全面范围；
4. 是否需要页面内容方案；
5. 是否需要周趋势；
6. 优先 ASIN；
7. Listing 数据来源；
8. OpenCode 非 Vault 输出目录。

## Phase 1：导入、清洗和验证

对每个文件执行：

- 读取 CSV 或 Excel；
- 根据 `config/analysis_config.yaml` 归一化列名；
- 清洗 `--`、百分比字符串和数值列；
- 识别搜索词日期结构；
- 检查必需列、行数、空值和异常值；
- 输出数据质量报告；
- 不在输入文件旁写默认产物。

## Phase 2：全店总览

### 2A 健康度

计算总销售额、总广告花费、整体 ACOS、调整后 ACOS、TACOS、自然订单占比、ROAS 和广告订单占比。

### 2B 周趋势

按数据首日动态切分 W1 至 W4，输出每个 ASIN 的销量、销售额、订单、Sessions、CVR、花费、ACOS、TACOS、ROAS 和自然订单变化。

### 2C 广告结构

分别分析 SP、SB、SBV、SD 的花费、订单、ACOS 和占比。

### 2D 集中度

按 ASIN 计算活动数、Top1 花费占比、Top3 占比、HHI、top1_ratio 和 hhi_ratio。活动数不足时跳过并说明。

## Phase 3：产品定位

按照销量、ACOS、CVR 和优化潜力将 ASIN 分为：

- 明星产品；
- 问题产品；
- 潜力产品；
- 淘汰产品；
- 待评估。

优化潜力至少命中两项且没有反证时才进入潜力组。阈值统一读取 `config/analysis_config.yaml`。

## Phase 4：ASIN 深挖

### 4A Listing 数据

优先级：

1. 用户提供的 `listing.json`；
2. 公开页面的 `webfetch`；
3. Playwright MCP 读取公开页面；
4. 用户手工粘贴。

不默认使用登录账户或 Sorftime。B 级自然位数据只接受用户导出或公开替代源。

### 4B 广告活动和品牌归因

按周输出广告活动花费、订单、ACOS 和趋势；品牌归因按日聚合后计算调整后 ACOS。

### 4C 搜索词聚合

按词根统计花费、订单、销售额、CVR 和 ACOS，并生成词根与否定词结果。

## Phase 5：关键词与自然结构

### 5.1 词根汇总

按 category、function、attribute、material、scenario、audience 标注需求类型。

### 5.2 否定词

依据高 ACOS、无订单、竞品 ASIN、持续低效和趋势恶化生成 P0 至 P3 清单。只生成建议，不修改 Amazon 后台。

### 5.3 Listing 覆盖

将搜索词根与用户提供的 listing.json 交叉比对，输出已覆盖、部分覆盖和未覆盖词。listing 数据缺失时只输出 `[待补]`。

### 5.4 付费与自然结构

- A 级：使用广告花费环比和自然订单环比作为代理指标；
- B 级：仅在用户提供自然位导出或公开替代数据时执行；
- C 级：缺产品或搜索词数据时只登记，不给结论。

## Phase 6：策略和行动

对每个 ASIN 输出：

- 生命周期阶段及依据；
- 销售情况；
- 优化难度；
- 策略方向；
- 具体动作；
- 数字依据；
- 预期结果；
- 验证日期；
- 回滚条件；
- 难度和负责人。

建议不替代供应链、利润、合规和人工决策。

## Phase 7：产出和校验

默认输出到：

`{OPENCODE_CONFIG_ROOT}\outputs\amazon\ad-analysis\YYYY-MM-DD\`

产物包括：

- 全店 Markdown 报告；
- ASIN Markdown 报告；
- 9-sheet Excel 数据簿；
- 数据质量报告；
- 阈值校准草稿。

Excel 校验命令：

```powershell
& $PY "$SKILL\scripts\validate_output.py" --input <non_vault_workbook.xlsx>
```

校验失败时停止交付，修复后重新生成。所有校准记录只写 OpenCode 非 Vault 草稿，不写 Vault 台账。

## 可直接调用的脚本子命令

```powershell
& $PY "$SKILL\scripts\analysis_v2.py" clean --input <product.csv> --output <non_vault.xlsx> --report
& $PY "$SKILL\scripts\analysis_v2.py" roots --input <search.csv> --output <non_vault.xlsx> --category usb_hub
& $PY "$SKILL\scripts\analysis_v2.py" negations --input <search.csv> --output <non_vault.xlsx> --category usb_hub
& $PY "$SKILL\scripts\analysis_v2.py" coverage --input <search.csv> --listing <listing.json> --output <non_vault.xlsx>
& $PY "$SKILL\scripts\analysis_v2.py" validate --input <product.csv> --type product
```

`run` 子命令只提供 agent 编排提示，完整 Phase 由 OpenCode agent 按本文件执行。

## 失败处理

- 输入文件格式不支持时停止并说明；
- 必需列缺失时列出缺失列；
- 多源冲突时并列展示；
- B 级自然位数据缺失时降为 C 级；
- 不用估算值替代缺失的原始数据；
- 任何产物不写入 Vault。
