---
name: grill-me
description: |-
  需求拷问器（PASSIVE-first）：把目标拆成决策树，逐轮"当前可答的全部问题"+推荐答案，直到无隐含假设。
  主动：grill me、拷问我、帮我理清需求、interview me。
  被动自动调用（无需点名）：新提出多步骤目标（新项目/skill/插件/系统搭建）且关键决策未澄清≥2个。
  熔断：用户明确要求直接执行、日常问答、小改动或单一查询时不触发。
  被动只出 1 轮 ≤5 问（附推荐答案），用户说"继续"才进完整多轮。
  Use when the user asks to clarify requirements, interview them, or resolve decisions in a multi-step goal; do not use for simple questions or small edits.
---

## 模式判定（先于一切）

- **完整模式（多轮）**：用户主动点名（"grill me"等）。按完整流程执行到底。
- **轻量模式（单轮）**：**匹配 description 被动条件时应自动进入**——直接开拷问，不要先假装开工。
  仅一轮：frontier 问题 ≤5 个，每问附推荐答案；结尾给三个选项让用户选——
  「继续深挖（进入多轮）/ 按推荐答案直接开工 / 取消」。
## 完整流程（原版）

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask *now* without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each round the user answers reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a *later* round, not this one.

Finding *facts* is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it — don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report — ask the rest of the frontier now. The *decisions* are the user's — put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
