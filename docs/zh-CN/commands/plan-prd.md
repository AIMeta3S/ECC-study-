---
description: "生成一份精简的、以问题为先的 PRD，并交接给 /plan 进行实施规划。"
argument-hint: "[产品/功能构想]（留空 = 从提问开始）"
---

# PRD 命令

产出一份 **产品需求文档** —— SDLC 需求阶段的产物。捕获为达成成功所必须成立的 *what* 与 *why*，并在进入 *how* 之前止步。实现层面的拆解交由 `/plan` 处理。

**输入**：`$ARGUMENTS`

## 本命令的范围

| 本命令会做 | 本命令不会做 |
|---|---|
| 框定问题与用户 | 设计架构 |
| 捕获成功标准与范围 | 挑选文件或编写模式 |
| 列出开放问题与风险 | 枚举实现任务 |
| 编写 `.claude/prds/{name}.prd.md` | 产出实施计划 —— 那是 `/plan` 的职责 |

如果你发现自己在写实现细节，停下来删掉它。那属于 `/plan` 的范畴。

**反填充规则**：当信息缺失时，写入 `TBD — needs validation via {method}`。绝不编造听起来言之有理的需求。

## 工作流

四个阶段。每个阶段是一道单独的关卡 —— 提出问题，等待用户回答，然后继续。没有嵌套循环，没有并行调研的繁文缛节。

### 阶段 1 —— FRAME

如果 `$ARGUMENTS` 为空，提问：

> 你想构建什么？一两句话。

如果已提供，用一句话复述并询问：

> 我的理解是：*{restated}*。正确，还是需要我调整？

然后一次性提出以下框定问题：

> 1. **谁** 有这个问题？（具体的角色或群体）
> 2. **什么** 是可观察的痛点？（描述行为，而非假定的需求）
> 3. **为什么** 他们无法用现有的方案解决？
> 4. **为什么是现在？** —— 发生了什么变化，让这件事值得做？

等待用户回答。没有答案（或明确的 "skip"）不得继续。

### 阶段 2 —— GROUND

索要证据。这是最短却最吃重的一个阶段：

> 你有什么证据表明这个问题真实存在且值得解决？（用户原话、工单、指标、观察到的行为、失败的变通方案 —— 任何具体证据）

如果用户没有任何证据，将 PRD 的 Evidence 部分记录为 `Assumption — needs validation via {user research | analytics | prototype}`。这能让 PRD 保持诚实。

### 阶段 3 —— DECIDE

范围与假设一次性提出：

> 1. **Hypothesis** —— 补全：*We believe **{capability}** will **{solve problem}** for **{users}**. We'll know we're right when **{measurable outcome}**.*
> 2. **MVP** —— 验证该假设所需的最小集合是什么？
> 3. **Out of scope** —— 你明确 **不** 构建什么（即使用户提出要求）？
> 4. **Open questions** —— 哪些不确定性可能改变方案？

等待回答。

### 阶段 4 —— GENERATE & HAND OFF

如有需要则创建目录，编写 PRD，并汇报。

```bash
mkdir -p .claude/prds
```

**输出路径**：`.claude/prds/{kebab-case-name}.prd.md`

#### PRD 模板

```markdown
# {Product / Feature Name}

## Problem
{2–3 sentences: who has what problem, and what's the cost of leaving it unsolved?}

## Evidence
- {User quote, data point, or observation}
- {OR: "Assumption — needs validation via {method}"}

## Users
- **Primary**: {role, context, what triggers the need}
- **Not for**: {who this explicitly excludes}

## Hypothesis
We believe **{capability}** will **{solve problem}** for **{users}**.
We'll know we're right when **{measurable outcome}**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| {primary} | {number} | {method} |

## Scope
**MVP** — {the minimum to test the hypothesis}

**Out of scope**
- {item} — {why deferred}

## Delivery Milestones
<!-- 业务成果，而非工程任务。/plan 会把每一项转化为一份计划。 -->
<!-- 状态：pending | in-progress | complete -->

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | {name} | {user-visible change} | pending | — |
| 2 | {name} | {user-visible change} | pending | — |

## Open Questions
- [ ] {question that could change scope or approach}

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|

---
*Status: DRAFT — requirements only. Implementation planning pending via /plan.*
```

#### 向用户汇报

```
PRD created: .claude/prds/{name}.prd.md

Problem:    {one line}
Hypothesis: {one line}
MVP:        {one line}

Validation status:
  Problem  {validated | assumption}
  Users    {concrete | generic — refine}
  Metrics  {defined | TBD}

Open questions: {count}

Next step: /plan .claude/prds/{name}.prd.md
  → /plan will pick the next pending milestone and produce an implementation plan.
```

## 集成

- `/plan <prd-path>` —— 基于该 PRD，为下一个 pending 的里程碑产出实施计划。
- `tdd-workflow` skill —— 以测试优先的方式实施该计划。
- `/pr` —— 提交一个引用该 PRD 与计划的 PR。

## 成功标准

- **PROBLEM_CLEAR**：问题具体且有证据支撑（或标记为假设）。
- **USER_CONCRETE**：主要用户是一个具体的角色，而非泛指的 "users"。
- **HYPOTHESIS_TESTABLE**：包含可衡量的结果。
- **SCOPE_BOUNDED**：有明确的 MVP 和明确的 out-of-scope。
- **NO_IMPLEMENTATION_DETAIL**：不含文件路径、libraries 或任务拆解 —— 如果出现了，把它们移到 `/plan` 步骤。
