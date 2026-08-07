---
name: product-capability
description: 将 PRD 意图、路线图诉求或产品讨论转化为可实施的能力计划，在多服务工作启动前暴露约束、不变量、接口与未决决策。当用户需要 ECC 原生的 PRD 到 SRS 通道，而非含糊的规划性叙述时使用。
metadata:
  origin: ECC
---

# 产品能力

本 skill 将产品意图转化为显式的工程约束。

当问题不在于「我们该构建什么？」，而在于「实现开始之前究竟必须满足哪些条件？」时，请使用本 skill。

## 使用时机

- 已存在 PRD、路线图条目、讨论或创始人备忘，但实现约束仍然隐含未明
- 某个功能跨越多个服务、仓库或团队，在编码之前需要一份能力契约
- 产品意图清晰，但架构、数据、生命周期或策略的影响仍然模糊
- 资深工程师在评审过程中反复重申相同的隐藏假设
- 你需要一份可跨 harness 与 session 持久复用的产物

## 规范产物

如果仓库已有持久化的产品上下文文件，例如 `PRODUCT.md`、`docs/product/` 或某个 program-spec 目录，请在那里更新。

如果尚不存在能力清单，请使用以下模板创建一份：

- `docs/examples/product-capability-template.md`

目标不是再造一套规划栈。目标是让隐藏的能力约束变得持久且可复用。

## 不可妥协的规则

- 不要捏造产品真相。明确标记未决问题。
- 将用户可见的承诺与实现细节区分开。
- 指出哪些是固定策略，哪些是架构偏好，哪些仍属开放问题。
- 如果请求与既有仓库约束冲突，请明确说明，而非粉饰掩盖。
- 优先产出一份可复用的能力产物，而非散落的临时笔记。

## 输入

只阅读必要内容：

1. 产品意图
   - issue、讨论、PRD、路线图备忘、创始人消息
2. 当前架构
   - 相关的仓库文档、契约、schema、路由、既有工作流
3. 既有能力上下文
   - `PRODUCT.md`、设计文档、RFC、迁移备忘、运营模型文档
4. 交付约束
   - 认证授权、计费、合规、发布、向后兼容、性能、评审策略

## 核心工作流

### 1. 复述能力

将该诉求压缩为一句精确的陈述：

- 用户或运维人员是谁
- 上线后将存在什么新能力
- 因此会发生什么结果变化

如果该陈述含糊无力，实现就会漂移。

### 2. 厘清能力约束

提取在实现之前必须成立的约束：

- 业务规则
- 范围边界
- 不变量
- 信任边界
- 数据所有权
- 生命周期转换
- 发布 / 迁移要求
- 失败与恢复预期

这些内容往往只存在于资深工程师的记忆中。

### 3. 定义面向实现的契约

产出一份 SRS 风格的能力计划，包含：

- 能力概述
- 显式的非目标
- 参与者与界面
- 必需的状态与转换
- 接口 / 输入 / 输出
- 数据模型影响
- 安全 / 计费 / 策略约束
- 可观测性与运维要求
- 阻塞实现的开放问题

### 4. 转化为执行

以明确的交接结尾：

- 可直接进入实现
- 需先进行架构评审
- 需先进行产品澄清

如果有帮助，指向下一个 ECC 原生通道：

- `project-flow-ops`
- `workspace-surface-audit`
- `api-connector-builder`
- `dashboard-builder`
- `tdd-workflow`
- `verification-loop`

## 输出格式

按以下顺序返回结果：

```text
CAPABILITY
- one-paragraph restatement

CONSTRAINTS
- fixed rules, invariants, and boundaries

IMPLEMENTATION CONTRACT
- actors
- surfaces
- states and transitions
- interface/data implications

NON-GOALS
- what this lane explicitly does not own

OPEN QUESTIONS
- blockers or product decisions still required

HANDOFF
- what should happen next and which ECC lane should take it
```

## 良好结果

- 产品意图现已足够具体，可进入实现，无需在 PR 中途重新挖掘隐藏约束。
- 工程评审拥有一份持久产物，而非依赖记忆或 Slack 上下文。
- 最终计划可跨 Claude Code、Codex、Cursor、OpenCode 以及 ECC 2.0 规划界面复用。
