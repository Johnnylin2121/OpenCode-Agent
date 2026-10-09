# BSR Top100 全量读取与类目格局分析（2026-10-08 实证定式）

> 归属：`amazon-listing` skill。`amazon-product-selection`（品类格局）与 `amazon-ad-analysis`（定位竞品池）**引用本文，不复制**。
> 工具：同技能 `scripts/bsr_top100.py`（stdlib only，`$OPENCODE_PYTHON` / `python` / `python3` 可跑）。
> 边界：只读公开榜单页，不访问 Amazon 账户、Cookie 或登录态；产出写 OpenCode 非 Vault 目录（见文末"输出与边界"）。

---

## 1. 根因：为什么逐页抓 BSR 只能拿到 30/50

- Amazon BSR 每页设计 50 条，但**服务端只渲染前 30 条**（`div#gridItemRoot`），后 20 条靠前端 JS 滚动加载；
- Jina Reader（markdown 或 `x-respond-with: html` 模式）不滚动页面 → `pg=1` 只得 #1–30，`pg=2` 只得 #51–80，**永久缺 #31–50 与 #81–100**；
- 对目标选择器（`x-target-selector=#gridItemRoot`）同样只能拿到已渲染的 30 条——选择器不解决"未渲染"。

## 2. 正确解法（两步，勿走回头路）

### Step A — 骨架：`data-client-recs-list` JSON（每页 50 条全量）

1. 抓取：`https://r.jina.ai/http://amazon.com/gp/bestsellers/{dept}/{node}?pg={N}`，请求头 `x-respond-with: html`、`x-timeout: 30`；
2. 在 HTML 中定位属性 `data-client-recs-list="..."`（HTML 实体转义的 JSON 数组）；
3. `html.unescape` → `json.loads` → 每条含 `id`（ASIN）与 `metadataMap["render.zg.rank"]`（榜单排名）；
4. 两页（`?pg=1` / `?pg=2`）合并即得 **#1–#100 → ASIN 完整映射**。

### Step B — 补详情：并行抓 dp 页

1. 对骨架中缺标题/价格的 ASIN（通常 40+ 个）**并行抓取** `https://r.jina.ai/http://amazon.com/dp/{ASIN}`（6 线程实测安全）；
2. 每页提取：`Title:` 行（剥 `Amazon.com:` 前缀与 `: Electronics` 后缀）、`([0-9.]+) out of 5 stars` 评分、reviews 计数、`This item:` 段内首个价格；
3. **限流退避**：HTTP 429 时该条转串行重试（间隔 ≥8s，最多 3 次）——并行批次末尾最易撞限流；
4. 与既有详情（如前次抓取残留）按 rank 合并前，**校验 rank→ASIN 一致性**（BSR 日内会波动，冲突以骨架为准并记录）。

> 产出结构：`[{rank, asin, title, rating, reviews, price, src: "bsr"|"dp"|"skeleton-only"}]`，验收线 = **100/100 有 title**。

## 3. 工程参数（实测）

| 参数 | 值 | 说明 |
|---|---|---|
| 并行线程 | 6 | 41 条并行仅尾部 7 条 429；再高易整批限流 |
| 单页超时 | 90–120s | Jina 冷启动慢 |
| 429 退避 | 8s × 3 次 | 串行重试成功率高 |
| 两页骨架耗时 | ~60–90s | 详情补抓视数量 ~1–6min |

## 4. 格局分析框架（拿到 100 条后必做）

1. **lane 分类**：`usbc-dock`（含 HDMI/Dock/Ethernet/PD/读卡）> `usbc-hub` > `a-multiport`（A口≥5）> `a4-port`（A口4口）> `other`——脚本已带 `lane` 字段（按当前类目关键词划分，换类目时按该类目形态改 `lane_of()`）；
2. **价格带**：中位数/均值/极值；识别"价格锚集群"（如 $9.99 无源 4 口集群）；
3. **对标筛选**：同 lane + 价格带邻域（如 ±$10）+ 评分 ≥4.3，取 4–6 个抓完整 Listing 进入本 skill Step 1 词频；
4. **自家占位**：按品牌名（title 内）标出自家产品名次——**自家多款在榜 = 标题公式可复用的榜内证据**；
5. **体量之王识别**：同 lane 内 reviews 最高者（体量锚，评论差距属结构性，靠关键词与价值表达补位而非价格战）。

## 5. 常见坑（勿重复踩）

- ❌ 用 markdown 模式逐页抓并宣称"只有 30 条"——数据在 HTML 属性里，不在渲染区；
- ❌ 详情补抓无退避全并行——尾批 429；
- ❌ 混淆页内序号 `N.` 与榜单排名 `#N`（`pg=2` 页内是 1–30、榜单是 51–80，取错会把第二页全量去重丢弃）；
- ❌ 价格快照当稳态——deal/券使到手价≠标价，格局报告须注明快照日期。

## 6. 已验证案例

2026-10-08 · USB Hubs（BSR node `pc/<nodeId>`）：骨架 100/100 + 详情补抓 41 条（7 条 429 重试成功）→ lane 分布 dock 57 / usbc-hub 18 / a-multiport 17 / a4-port 8；发现 #50 Sabrent HB-UM43（188k 评体量之王）与 #31 自家品牌 8 口款（榜内标题公式与 4 口重做标题同源）。产出用于同店 4 口款 Listing 重做（业务 ASIN 不入库）。

## 7. 运行（OpenCode）

Windows：

```powershell
$SKILL = "$env:USERPROFILE\.config\opencode\skills\amazon-listing"
$PY = $env:OPENCODE_PYTHON; if (-not $PY) { $PY = "python" }
& $PY "$SKILL\scripts\bsr_top100.py" --url "https://www.amazon.com/gp/bestsellers/pc/<node>" --output bsr100.json
```

macOS：技能目录 `$HOME/.config/opencode/skills/amazon-listing`，解释器 `python3` 或 `$OPENCODE_PYTHON`。

常用参数：`--workers 6`（详情并行数）、`--skeleton-only`（只要 rank→ASIN 骨架）、`--pages 2`（Top100=2）。运行前可先执行 `runtime-preflight`。

## 8. 输出与边界

- JSON 结果默认写当前工作目录；需要留档时写入 `{OPENCODE_OUTPUT_ROOT}/amazon/listing/`（macOS 为 `$HOME/.config/opencode/outputs/amazon/listing/`）；
- 报告须标注快照日期；不写入 Obsidian Vault、`工作/` 或任何 Amazon 工作管理知识库路径；
- 不访问 Amazon 账户、Cookie、Token；竞品数据仅作对标参考，不直接变成本产品事实，未确认项标 `[待确认]`。
