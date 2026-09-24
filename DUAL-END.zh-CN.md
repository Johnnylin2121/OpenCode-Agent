# Windows 与 macOS 双端维护指南

[English](DUAL-END.md) | 简体中文

## 共同原则

Git 仓库保存可移植的 OpenCode 定义；每台机器独立拥有本地 OpenCode 配置和部署。不得修改其他 Agent 文件，不创建跨 Agent 链接，不提交机器本地状态。

## 前置条件

- Node.js `>=22.20.0`
- Python 3.11+
- 可使用 SSH 的 Git
- 用户批准的知識库路径，仅在本机配置，不提交

## Windows

```powershell
git clone git@github.com:Johnnylin2121/OpenCode-Agent.git "$env:USERPROFILE\source\OpenCode-Agent"
Set-Location "$env:USERPROFILE\source\OpenCode-Agent"
npm ci
npm run check
node tools/install.mjs --target "$env:USERPROFILE\.config\opencode"
```

默认 `python` 不合适时设置 `OPENCODE_PYTHON`。PowerShell 路径只能出现在明确标注 Windows 的代码块中。

## macOS

```bash
git clone git@github.com:Johnnylin2121/OpenCode-Agent.git "$HOME/source/OpenCode-Agent"
cd "$HOME/source/OpenCode-Agent"
npm ci
npm run check
node tools/install.mjs --target "$HOME/.config/opencode"
```

macOS 使用 `python3` 或设置 `OPENCODE_PYTHON`，不能假设 PowerShell、Windows Python 路径或 Windows 浏览器二进制存在。

## 部署规则

1. 编辑前先 pull 并 rebase。
2. 暂存前运行 `npm run check`。
3. 先运行安装器 dry-run 并检查目标路径。
4. 只把目标文件应用到本机 OpenCode 根目录。
5. 部署后重启 OpenCode。
6. 运行一个公开、非敏感的 smoke workflow。

安装器不会复制本机配置、凭据、Vault 数据、输出、缓存、`node_modules` 或浏览器状态。

## 双端同步流程

```text
pull --rebase
  -> 修改可移植仓库文件
  -> npm run check
  -> 检查 git diff
  -> 选择性 git add
  -> commit
  -> push
  -> 分别部署到 Windows 和 macOS
```

不要盲目 `git add -A`，不要 force-push，不要在 Windows 代码块使用 Mac 绝对路径，反之亦然。平台差异必须保留为并列实现，并同步更新 CI。

## 知识库交换

Agent 可以读取共享知识库中的批准记录。只有用户明确要求、记录来源/时间/范围且不含秘密时才允许写入。即使业务主题相同，各 Agent 的运行时产物仍保持分离。

## 冲突处理

- 仓库定义优先于机器生成文件。
- 平台行为不同则保留两个平台版本。
- 未解决的可移植性问题记录在 PR 或维护说明中。
- 不通过复制 Vault 内容或凭据解决冲突。
