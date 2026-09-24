---
name: amazon-product-selection
description: >
  亚马逊选品分析工作流。支持卖家精灵标准关键词数据和 ABA 关键词趋势数据，
  输出分类、可行性评分、风险评估、深度分析和多维筛选报告到 OpenCode 非 Vault 目录。
  当用户说“选品分析”“ABA分析”“关键词趋势”“深度分析”或上传关键词数据时使用。
compatibility: opencode
metadata:
  vault-access: read-only
  output-policy: opencode-non-vault
---

## OpenCode 双端执行约定

本文中的 `powershell` 代码块是 Windows 示例；macOS 使用 `bash`/`zsh`。统一先设置 `SKILL_ROOT` 和 `PY`：Windows 使用 `$env:USERPROFILE\.config\opencode\skills\<skill>` 与 `python`，macOS 使用 `$HOME/.config/opencode/skills/<skill>` 与 `python3`。优先使用 `runtime-preflight`、`safe-output` 和 `market-data` 工具；不要把示例中的路径直接复制到另一端。输出必须位于本机 OpenCode 输出根，Vault 默认只读。

# OpenCode 执行边界

1. 输入文件只读；禁止修改、删除或移动用户原始数据。
2. 禁止写入 Obsidian Vault、`MEMORY.md` 或任何 `工作/`、`交易体系/` 路径。
3. 默认报告和清洗文件写入 `{OPENCODE_CONFIG_ROOT}\outputs\amazon\product-selection\`。
4. 仅使用本地 Python 和 pandas/openpyxl；不依赖 MiMo、DSH、Obsidian 或 Amazon 账户。
5. 生成的 Amazon 搜索链接只是公开链接，不自动打开、不抓取账户数据。
6. 输入字段缺失时列出缺口，不用猜测值替代。

# 亚马逊选品分析

## 支持的数据源

| 数据源 | 主要字段 | 命令 |
|---|---|---|
| 卖家精灵标准数据 | 月搜索量、商品数、需供比、评论、均价、增长率 | `report` |
| ABA 关键词趋势数据 | 周搜索量、SPR、PPC、标题密度、点击和转化占比 | `aba-report`、`deep-dive` |

## 运行时

使用当前 OpenCode 技能目录和本机 `python`：

```powershell
$SKILL = "$env:USERPROFILE\.config\opencode\skills\amazon-product-selection"
$PY = "python"
& $PY "$SKILL\scripts\analysis.py" --help
```

大文件先使用 OpenCode 共享探查脚本：

```powershell
$PROBE = "$env:USERPROFILE\.config\opencode\skills\_shared\excel-probe.py"
& $PY "$PROBE" describe --input <excel_path> --n 8
& $PY "$PROBE" columns --input <excel_path>
```

不安装依赖，不自动修改环境。

## ABA 工作流

### Phase 1：汇总调研

执行：

```powershell
& $PY "$SKILL\scripts\analysis.py" aba-report --input <excel_path> --output <non_vault_output>
```

报告包含：

1. 数据概览；
2. 关键词分类；
3. 四维可行性评分；
4. 按卖家类型的建议；
5. 风险评估；
6. 品类词详细分析；
7. 六种多维筛选；
8. 行动建议；
9. 方法说明。

关键词分类：

- 品牌词：跳过作为主攻方向；
- 品类词：主攻方向；
- 长尾词：补充机会，并标注场景词、人群词、功能词和属性词。

### Phase 2：深度分析

用户选定关键词后执行：

```powershell
& $PY "$SKILL\scripts\analysis.py" deep-dive --input <excel_path> --keyword "<关键词>" --output <non_vault_output>
```

输出关键词概况、前三名竞品、品牌、定价、广告效率、差异化机会、风险和行动清单。

## 卖家精灵标准数据

输入至少包含：

- 月搜索量；
- 商品数；
- 需供比；
- 评分数；
- 均价；
- 近三个月增长率；
- 关键词翻译。

执行：

```powershell
& $PY "$SKILL\scripts\analysis.py" report --input <excel_path> --output <non_vault_output>
```

分析趋势市场、机会市场、利润空间、综合评分、价格段和品类结构。

## 预处理

```powershell
& $PY "$SKILL\scripts\analysis.py" preprocess --input <excel_path> --type standard --output <non_vault_output>
& $PY "$SKILL\scripts\analysis.py" preprocess --input <excel_path> --type aba --output <non_vault_output>
```

未指定输出时，脚本使用 OpenCode 非 Vault 默认目录，不在输入文件旁或 Vault 中写入文件。

## 六种 ABA 筛选

```powershell
& $PY "$SKILL\scripts\analysis.py" trend --input <excel_path> --output <non_vault_output>
& $PY "$SKILL\scripts\analysis.py" potential --input <excel_path> --output <non_vault_output>
& $PY "$SKILL\scripts\analysis.py" surge --input <excel_path> --output <non_vault_output>
& $PY "$SKILL\scripts\analysis.py" low-competition --input <excel_path> --output <non_vault_output>
& $PY "$SKILL\scripts\analysis.py" ad-cost --input <excel_path> --output <non_vault_output>
& $PY "$SKILL\scripts\analysis.py" long-tail --input <excel_path> --output <non_vault_output>
```

## 四维评分

| 维度 | 权重 | 主要指标 |
|---|---:|---|
| 需求强度 | 30% | 周搜索量、SPR、展示量 |
| 竞争强度 | 30% | 标题密度、点击集中度、品牌集中度 |
| 市场结构 | 20% | 转化集中度、点击合计 |
| 广告效率 | 20% | PPC、PPC/SPR |

评分是决策辅助，不替代供应链、利润、合规和样品验证。

## 输出边界

- 所有输出路径必须位于 OpenCode 非 Vault 目录；
- 报告、清洗 Excel 和筛选结果不写入 Vault；
- 不自动打开 Amazon 前台搜索链接；
- 不访问账户、Cookie、Token 或任何私有数据；
- 如果用户后续指定非 Vault 输出目录，使用用户目录。
