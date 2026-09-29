---
name: trading-briefing-fetch
description: 早报自动层数据抓取（akshare+快讯）。商品价格表/美股指数/财联社系快讯 → 默认将自动层 markdown 输出到对话（stdout），需要持久化时写入 OpenCode 非 Vault 输出目录，作为「早读复核」（trading-briefing-review）的自动数据源与人工参考。用户说"跑早报"、"抓今天数据"、"生成早报草稿"时使用。
compatibility: opencode
metadata:
  vault-access: read-only
  output-policy: chat-or-opencode-non-vault
---

# OpenCode 执行边界

1. Vault 只读；禁止把自动层文件写入 `交易体系/`、`早读复核/`、`财经早读/` 或任何 Obsidian 知识库路径。
2. 默认只输出到标准输出；只有用户明确指定非 Vault 路径时才使用 `--output`。
3. 仅在用户实际触发时联网访问公开数据源；不访问账户、Cookie、Token 或其他凭据。
4. 使用当前 OpenCode 技能目录中的脚本和内置工具；不使用其他 Agent 专用工具或 RSS 插件。
5. 任何数据源失败都保留 `[待补]`，不猜测、不补造数值。

# 早报自动层数据抓取 (briefing-fetch)

## 定位

为 `trading-briefing-review` 提供自动数据层。数据层只负责公开行情和快讯采集，不生成审阅结论。

## 触发

用户说“跑早报”“抓今天的数据”“生成早报草稿”或明确要求调用本 skill 时执行。

## 执行步骤

1. 使用本机 Python 运行本 skill 的 `scripts/fetch_briefing.py`。
2. 默认省略 `--output`，将 Markdown 草稿直接返回对话。
3. 如用户明确要求持久化，使用 OpenCode 非 Vault 路径，例如 `{OPENCODE_OUTPUT_ROOT}/briefing/...`；不得传入 Vault 路径。
4. 展示商品、A股/外盘指数、US 指数和快讯四部分，并标出 `[待补]` 项。
5. 终筛和事实复核交给 `trading-briefing-review`，本 skill 不作结论。

## 数据口径

- 默认采集国内期货、外盘期货、A50、`.INX`、`.DJI`、`.IXIC` 和公开快讯。
- 期货代码可以通过 `--domestic`、`--foreign`、`--us` 覆盖。
- 快讯只做来源和关键词分类，不把分类当作投资判断。
- 任何实时或延迟数据都必须在结果中注明来源和采集时间。

## 失败处理

- 单个数据源失败不影响其他数据源。
- 失败项目写 `[待补]`，最多重试一次。
- 不把网络失败转换成零值或虚构数值。

## 依赖

- Python 3.12 或更高版本：Windows 用 `python` 或 `$env:OPENCODE_PYTHON`，macOS 用 `python3` 或 `$OPENCODE_PYTHON`；运行前可先执行 `runtime-preflight`。
- `akshare`、`pandas`。
- 用户触发时需要公开网络访问。
- 不需要账户、Cookie、Token 或 Obsidian 写入权限。
