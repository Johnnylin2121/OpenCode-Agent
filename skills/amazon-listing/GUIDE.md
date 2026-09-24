# Amazon Listing Skill 使用指南

## 适用范围

本指南用于 OpenCode 版 `amazon-listing`。默认只读用户资料，报告写入 OpenCode 非 Vault 目录。

## 六步流程

### Step 0：确认站点与政策

确认站点、产品类目、用户实际产品资料和 75/125/200 字符限制。

### Step 1：竞品与关键词

抓取顺序：`webfetch` → Playwright MCP → 用户粘贴。竞品页面失败时不反复重试。

使用：

```powershell
$SKILL = "$env:USERPROFILE\.config\opencode\skills\amazon-listing"
& python "$SKILL\scripts\kw_analysis.py" -i competitors.txt
```

脚本输出词频，agent 再筛选 Top 10 并标注 category、function、attribute、material、scenario、audience。

### Step 2：Title 与 Item Highlights

- Title ≤73 characters，目标上限 75；
- Item Highlights ≤125 characters；
- Title + Highlights ≤200 characters；
- Highlights 使用短语，不重复 Title；
- 未确认的产品声明标记 `[待确认]`。

### Step 3：五点

每点不超过 500 characters，分别覆盖核心价值、功能、材料、尺寸兼容性和包装售后。

### Step 4：后台搜索词

不超过 249 UTF-8 bytes，使用完整相关词组，不写品牌、ASIN、促销词或碎片词。

### Step 5：投放后回检

用户提供广告报告后，再进行关键词曝光、转化和浪费词分析。没有自然位导出时标记 `B级数据未取到，自然位未验证`。

## 硬性规则

| 项目 | 限制 |
|---|---|
| Title | ≤75 characters，建议 ≤73 |
| Item Highlights | ≤125 characters |
| Title + Highlights | ≤200 characters |
| Bullet | ≤500 characters each |
| Backend terms | ≤249 bytes |
| 重复词 | Title 内一般不超过两次 |
| 未确认声明 | 必须标记 `[待确认]` |

## 输出

默认输出：

`{OPENCODE_CONFIG_ROOT}\outputs\amazon\listing\YYYY-MM-DD-{ASIN}-{product}-listing.md`

禁止写入 Obsidian、`工作/` 目录或 Amazon 账户。

## 常见错误

1. 竞品声称不是本产品事实；
2. Highlights 不是每条 125，而是整个字段 125；
3. Title 达到 75 可能不显示 Highlights，应留余量；
4. 后台词不能用 plus、con、单个重音字母等碎片；
5. 没有自然位数据时不能声称已有自然排名。
