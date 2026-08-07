---
name: architecture-decision-records
description: 在 Claude Code 会话期间将架构决策捕获为结构化的 ADR。自动检测决策时刻，记录上下文、考虑过的备选方案以及决策依据。维护一份 ADR 日志，让未来的开发者理解代码库为何呈现当前形态。
metadata:
  origin: ECC
---

# 架构决策记录

在编码会话期间实时捕获架构决策。决策不再仅存在于 Slack 讨论串、PR 评论或某人的记忆中，本 skill 生成与代码并存的结构化 ADR 文档。

## 何时激活

- 用户明确说“记录这个决策”或“把这个做成 ADR”
- 用户在重要的备选方案之间做选择（框架、库、模式、数据库、API 设计）
- 用户说“我们决定……”或“我们做 X 而不是 Y 的原因是……”
- 用户问“我们为什么选择 X？”（读取已有 ADR）
- 在讨论架构 trade-off 的规划阶段

## ADR 格式

使用 Michael Nygard 提出的轻量级 ADR 格式，并针对 AI 辅助开发做了适配：

```markdown
# ADR-NNNN: [Decision Title]

**Date**: YYYY-MM-DD
**Status**: proposed | accepted | deprecated | superseded by ADR-NNNN
**Deciders**: [who was involved]

## Context

What is the issue that we're seeing that is motivating this decision or change?

[2-5 sentences describing the situation, constraints, and forces at play]

## Decision

What is the change that we're proposing and/or doing?

[1-3 sentences stating the decision clearly]

## Alternatives Considered

### Alternative 1: [Name]
- **Pros**: [benefits]
- **Cons**: [drawbacks]
- **Why not**: [specific reason this was rejected]

### Alternative 2: [Name]
- **Pros**: [benefits]
- **Cons**: [drawbacks]
- **Why not**: [specific reason this was rejected]

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive
- [benefit 1]
- [benefit 2]

### Negative
- [trade-off 1]
- [trade-off 2]

### Risks
- [risk and mitigation]
```

## 工作流程

### 捕获新 ADR

当检测到决策时刻：

1. **初始化（仅首次）** — 如果 `docs/adr/` 不存在，在创建该目录、带有 index 表头的 `README.md`（见下方 ADR Index Format）以及供手动使用的空白 `template.md` 之前，先请求用户确认。未经明确同意不要创建文件。
2. **识别决策** — 提取正在做出的核心架构选择
3. **收集上下文** — 是什么问题促成了这一决策？存在哪些约束？
4. **记录备选方案** — 还考虑过哪些其他选项？为什么它们被拒绝？
5. **陈述后果** — 有哪些 trade-off？什么变得更容易/更困难？
6. **分配编号** — 扫描 `docs/adr/` 中已有的 ADR 并递增
7. **确认并写入** — 将 ADR 草稿呈现给用户审阅。只有在明确批准后才写入 `docs/adr/NNNN-decision-title.md`。如果用户拒绝，丢弃草稿，不写入任何文件。
8. **更新索引** — 追加到 `docs/adr/README.md`

### 读取已有 ADR

当用户问“我们为什么选择 X？”：

1. 检查 `docs/adr/` 是否存在 — 如果不存在，回复：“本项目未找到任何 ADR。是否要开始记录架构决策？”
2. 如果存在，扫描 `docs/adr/README.md` 索引查找相关条目
3. 读取匹配的 ADR 文件，并展示 Context 和 Decision 部分
4. 如果没有匹配项，回复：“未找到该决策对应的 ADR。是否现在记录一条？”

### ADR 目录结构

```
docs/
└── adr/
    ├── README.md              ← 所有 ADR 的索引
    ├── 0001-use-nextjs.md
    ├── 0002-postgres-over-mongo.md
    ├── 0003-rest-over-graphql.md
    └── template.md            ← 供手动使用的空白模板
```

### ADR Index Format

```markdown
# Architecture Decision Records

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-use-nextjs.md) | Use Next.js as frontend framework | accepted | 2026-01-15 |
| [0002](0002-postgres-over-mongo.md) | PostgreSQL over MongoDB for primary datastore | accepted | 2026-01-20 |
| [0003](0003-rest-over-graphql.md) | REST API over GraphQL | accepted | 2026-02-01 |
```

## 决策检测信号

留意对话中表明正在发生架构决策的这些模式：

**显式信号**
- “就用 X 吧”
- “我们应该用 X 而不是 Y”
- “这个 trade-off 值得，因为……”
- “把这个记录为一条 ADR”

**隐式信号**（建议记录一条 ADR — 未经用户确认不要自动创建）
- 比较两个框架或库并得出结论
- 在陈述理由的情况下做出数据库 schema 设计选择
- 在架构模式之间做选择（monolith vs microservices、REST vs GraphQL）
- 决定 authentication/authorization 策略
- 在评估备选方案后选择部署基础设施

## 好的 ADR 长什么样

### 要
- **要具体** — “Use Prisma ORM”而不是“use an ORM”
- **记录为什么** — 理由比决定本身更重要
- **包含被拒绝的备选方案** — 未来的开发者需要知道考虑过什么
- **诚实陈述后果** — 每个决策都有 trade-off
- **保持简短** — 一条 ADR 应能在 2 分钟内读完
- **使用现在时** — “We use X”而不是“We will use X”

### 不要
- 记录琐碎的决定 — 变量命名或格式选择不需要 ADR
- 写成长文 — 如果 context 部分超过 10 行，就太长了
- 省略备选方案 — “我们就这么选的”不是有效的理由
- 回填时不标注 — 如果记录的是过去的决策，注明原始日期
- 让 ADR 过期失效 — 被 superseded 的决策应指向其替代者

## ADR 生命周期

```
proposed → accepted → [deprecated | superseded by ADR-NNNN]
```

- **proposed**：决策正在讨论中，尚未确定
- **accepted**：决策已生效并正在被遵循
- **deprecated**：决策不再相关（例如，feature 已移除）
- **superseded**：一条更新的 ADR 替代了本条（始终链接到替代者）

## 值得记录的决策类别

| 类别 | 示例 |
|----------|---------|
| **技术选型** | 框架、编程语言、数据库、云服务商 |
| **架构模式** | Monolith vs microservices、event-driven、CQRS |
| **API 设计** | REST vs GraphQL、版本策略、auth 机制 |
| **数据建模** | Schema 设计、范式化决策、缓存策略 |
| **基础设施** | 部署模型、CI/CD pipeline、监控技术栈 |
| **安全** | Auth 策略、加密方式、密钥管理 |
| **测试** | 测试框架、覆盖率目标、E2E 与 integration 的平衡 |
| **流程** | 分支策略、review 流程、发布节奏 |

## 与其他 skill 的集成

- **Planner agent**：当 planner 提出架构变更时，建议创建一条 ADR
- **Code reviewer agent**：标记引入架构变更但没有对应 ADR 的 PR
