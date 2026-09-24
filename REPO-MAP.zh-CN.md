# OpenCode-Agent 仓库地图

[English](REPO-MAP.md) | 简体中文

## 目录职责与归属

| 区域 | 归属 | 可以包含 | 禁止包含 |
|---|---|---|---|
| `skills/` | OpenCode 工作流定义 | prompts、可移植脚本、references、合成示例 | 秘密、真实导出、机器路径、Vault 数据 |
| `commands/` | OpenCode 用户入口 | 简短 prompt 和 `$ARGUMENTS` 模板 | shell 状态、凭据 |
| `agents/` | OpenCode 编排层 | prompt、权限、只读角色 | 其他 Agent 配置 |
| `tools/` | OpenCode 自定义工具 | 本地校验、runtime preflight、只读数据访问 | 默认写 Vault |
| `tests/` | 仓库维护者 | 合成 fixture 和离线检查 | 真实业务数据 |
| `profiles/` | 用户本地部署说明 | 占位符和布局契约 | Vault 文件或复制的笔记 |
| `.github/` | CI | 验证工作流 | 秘密或部署凭据 |

## 运行链路

```text
OpenCode 宿主
  -> 全局/项目配置
  -> commands 和主 agents
  -> skills 和 references
  -> tools 或本地脚本
  -> OpenCode 输出根
```

OpenCode 通过 `SKILL.md` frontmatter 发现 skill；目录名必须等于 `name`。commands 和 agents 属于 OpenCode 宿主编排，不会向其他 Agent 注册工具。

## 数据链路

```text
用户批准的本地文件或公开来源
  -> 只读 agent/tool
  -> 确定性本地脚本
  -> 校验后的 OpenCode 产物
  -> 用户批准的知識库记录（可选）
```

输入文件永不覆盖。网络工具只在用户触发的工作流中调用。生成数据不进入 Git。

## 知识库共享

知识库是受控交换层，不是共享运行时。各 Agent 可以读取批准记录；写入必须有明确授权、来源、时间、范围和决策记录。凭据、Cookie、账户数据和私有运行时状态不得跨边界。

## 扩展规则

- 新 skill：`skills/<name>/SKILL.md`，可配 `references/`、`scripts/`、`config/`、`locales/`。
- 新命令：`commands/`，绑定 OpenCode 主 Agent。
- 新角色：`agents/`，明确只读/写入权限。
- 新工具：`tools/`，仅在需要稳定确定性接口时增加。
- 新测试：`tests/`，同时更新 `tools/validate-repo.mjs` 的不变量。

## 非目标

- 不共享 Agent 配置树。
- 不在 Mimo、DSH、OpenCode 或其他 Agent 之间自动同步。
- 不创建无人值守任务、账户连接或后台通知。
- 不公开私有知识库或业务数据。
