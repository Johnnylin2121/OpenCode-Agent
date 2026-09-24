# PORTABILITY — OpenCode 跨环境内容规范

> 本目录技能面向 OpenCode，兼容 Windows、macOS 和具备 Node/Python 的环境。
> 所有业务产物默认写入 OpenCode 非 Vault 输出目录。

---

## 1. 三条硬规则

| # | 规则 | 禁止 | 应该写成 |
|---|---|---|---|
| 1 | 不写死用户目录 | `C:\Users\<用户>\...`、用户专属绝对路径 | `$env:USERPROFILE\.config\opencode\...`、`$HOME/.config/opencode/...` |
| 2 | 不依赖旧 Agent 的解释器变量或硬编码路径 | 旧 Agent 专用变量、机器专属 Python 路径 | `python`、`$OPENCODE_PYTHON`，或先执行运行时预检 |
| 3 | 不写入 Obsidian Vault | 创建、修改、移动、删除、回写 Vault 文件 | `{OPENCODE_CONFIG_ROOT}\outputs\...` 或用户明确指定的非 Vault 路径 |

Vault、wiki、交易体系、记忆文件和原始输入默认只读。

## 2. 占位符表

| 占位符 | 含义 | 取值来源 |
|---|---|---|
| `{OPENCODE_CONFIG_ROOT}` | OpenCode 配置根 | `$env:USERPROFILE\.config\opencode` 或 `$HOME/.config/opencode` |
| `{SKILLS_ROOT}` | 技能根 | `{OPENCODE_CONFIG_ROOT}/skills` |
| `{OPENCODE_PYTHON}` | Python 解释器 | `python` 或用户设置的 `OPENCODE_PYTHON` |
| `{OPENCODE_OUTPUT_ROOT}` | 非 Vault 产物根 | `{OPENCODE_CONFIG_ROOT}/outputs` |

## 3. 环境对照

| 场景 | Windows / OpenCode | macOS / OpenCode |
|---|---|---|
| Python | `python` 或 `$env:OPENCODE_PYTHON` | `python3` 或 `$OPENCODE_PYTHON` |
| 技能脚本 | `& $PY "$SKILL/scripts/x.py" args` | `"$PY" "$SKILL/scripts/x.py" args` |
| 共享行情 | OpenCode `market-data` tool | OpenCode `market-data` tool |
| 网页来源 | `webfetch`、`websearch`，按权限询问 | `webfetch`、`websearch`，按权限询问 |
| 浏览器 | `playwright-mcp:playwright`，仅用户触发 | `playwright-mcp:playwright`，仅用户触发 |
| Excel 探查 | `_shared/excel-probe.py` | `_shared/excel-probe.py` |
| 输出目录 | `{OPENCODE_OUTPUT_ROOT}` | `{OPENCODE_OUTPUT_ROOT}` |
| 编码 | UTF-8 | UTF-8 |

## 4. OpenCode 执行规则

1. 先运行 `runtime-preflight`，再调用本地 Python 或 Node 脚本。
2. 写入前使用 `safe-output` 校验路径。
3. 公开网络只由用户实际触发；记录来源、采集时间和缺口。
4. 只读 subagent 不得拥有 `edit` 权限。
5. 失败数据写 `[待补]`，不使用猜测值替代。
6. 不创建后台任务、定时任务、账户连接或外部通知。

## 5. 提交前检查

1. 运行 `node tests/smoke.mjs`。
2. 运行 `opencode debug config` 验证 commands、agents 和 permissions。
3. 确认 frontmatter `name` 与目录名一致。
4. 确认目标技能没有旧 Agent 专用变量、用户绝对路径或机器专属工具路径。
5. 确认没有密钥、真实业务数据、缓存或 Vault 写入。
6. 只提交 OpenCode 配置、工具、技能和测试改动。
