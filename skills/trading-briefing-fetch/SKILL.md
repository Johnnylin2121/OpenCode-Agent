---
name: trading-briefing-fetch
description: 早报自动层数据抓取（akshare+快讯）。商品价格表/美股指数/财联社系快讯 → 默认输出到对话（stdout）；需要持久化时写入 {VAULT_PATH}/交易体系/09.新闻资讯/早读复核/（用户授权的唯一 Vault 目录，无「早报数据/」中间层），作为「早读复核」（trading-briefing-review）的自动数据源与人工参考。用户说"跑早报"、"抓今天数据"、"生成早报草稿"时使用。
compatibility: opencode
metadata:
  vault-access: scoped-write
  vault-write-scope: 交易体系/09.新闻资讯/早读复核
  output-policy: chat-or-scoped-vault
---

# OpenCode 执行边界

1. **Vault 写入限定范围**：只允许写入 `{VAULT_PATH}/交易体系/09.新闻资讯/早读复核/`。该目录之外的任何 Vault 路径一律拒绝（含 `交易体系/01.财经早读/` 正式早读正文）。守卫按「最长前缀、并列全放行」判定——本 skill 与 `trading-briefing-review` 共用这一格授权目录。落盘前可先过 `safe-output`：`{ path, skill: "trading-briefing-fetch" }`；脚本层另有 `safe_output_path()` 强制，Vault 根取自环境变量 `VAULT_PATH` 或本机标记文件 `~/.config/opencode/VAULT_PATH`。
2. 默认只输出到标准输出；用户要求落盘时使用 `--output` 指向上述授权目录，或用非 Vault 的 OpenCode 输出根。
3. 每次 Vault 落盘后，必须在 `_系统/日志/log.md` 追加七字段审计（写入者 `OpenCode` / 带时区 ISO 8601 时间 / 操作 / 目标 / 摘要 / 来源依据 / 验证），文件内不得留空缺声明。
4. 仅在用户实际触发时联网访问公开数据源；不访问账户、Cookie、Token 或其他凭据。
5. 使用当前 OpenCode 技能目录中的脚本和内置工具；不使用其他 Agent 专用工具或 RSS 插件。
6. 任何数据源失败都保留 `[待补]`，不猜测、不补造数值。
7. **永不修改正式早读正文**（`交易体系/01.财经早读/`）——自动层只是对照输入，修订权属于用户。

# 早报自动层数据抓取 (briefing-fetch)

## 定位

为 `trading-briefing-review` 提供自动数据层。数据层只负责公开行情和快讯采集，不生成审阅结论。

## 触发

用户说“跑早报”“抓今天的数据”“生成早报草稿”或明确要求调用本 skill 时执行。

## 执行步骤

1. 使用本机 Python 运行本 skill 的 `scripts/fetch_briefing.py`。
2. 默认省略 `--output`，将 Markdown 草稿直接返回对话。
3. 落盘三选一，按优先级：
   - **Vault 授权目录（用户需要与早读复核同处一地时）**：
     `python scripts/fetch_briefing.py --date 2026-09-30 --output "<VAULT_PATH>/交易体系/09.新闻资讯/早读复核/2026-09-30-财经早报-自动草稿.md"`
   - OpenCode 非 Vault 输出根：`--output 2026-09-30-财经早报-自动草稿.md`（只给文件名即落到 `outputs/trading/briefing-fetch/`）
   - 省略 `--output` → 标准输出
4. 落盘到 Vault 后立即追加 `_系统/日志/log.md` 审计条目（见执行边界第 3 条），写入者填 `OpenCode`。
5. 展示商品、A股/外盘指数、US 指数和快讯四部分，并标出 `[待补]` 项。
6. 终筛和事实复核交给 `trading-briefing-review`，本 skill 不作结论。

### ⚠️ 单文件单写者（与 vault 侧脚本的碰撞）

Vault 里已有一支 DSH 侧脚本会写**同名文件**：
`_系统/scripts/fetch-briefing.ps1`（包装 `fetch-briefing.py`）→ 输出
`交易体系/09.新闻资讯/早读复核/YYYY-MM-DD-财经早报-自动草稿.md`

- **默认不落 Vault**（输出到对话 / OpenCode 输出根），这是首选。
- 只有当用户明确要求把 OpenCode 的抓取结果落到 Vault 时才用 `--output`；**一旦落盘，同日该文件应由本 skill 独占**，并提示用户 DSH 侧同日不再跑 vault 脚本。
- **禁止**写入 `早读复核/rss-digest/`——那是 DSH 的 `dsh-rss-digest` 插件的目录，脚本与守卫双重拒绝。

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
- Vault 落盘时需要能定位 Vault 根：`$env:VAULT_PATH` 或本机标记文件 `~/.config/opencode/VAULT_PATH`（机器本地状态，不跨端同步）。
- 用户触发时需要公开网络访问。
- 不需要账户、Cookie、Token。
