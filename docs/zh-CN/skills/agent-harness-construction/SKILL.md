---
name: agent-harness-construction
description: 设计并优化 AI agent 的 action space、tool 定义与 observation 格式，以获得更高的 completion rate。
metadata:
  origin: ECC
---

# Agent Harness 构建

当你需要改进 agent 进行规划、调用 tool、从错误中恢复并收敛至完成的方式时，使用本 skill。

## 核心模型

Agent 的输出质量受以下因素制约：
1. Action space 质量
2. Observation 质量
3. 恢复质量
4. Context budget 质量

## Action Space 设计

1. 使用稳定、明确的 tool 名称。
2. 保持输入 schema-first 且范围狭窄。
3. 返回确定性的输出结构。
4. 除非无法隔离，否则避免使用大而全的 tool。

## 粒度规则

- 对高风险操作（deploy、migration、权限）使用微型 tool。
- 对常见的编辑/读取/搜索循环使用中型 tool。
- 仅当往返开销成为主要成本时，才使用宏 tool。

## Observation 设计

每个 tool 的响应都应包含：
- `status`: success|warning|error
- `summary`: 一行结果
- `next_actions`: 可执行的后续动作
- `artifacts`: 文件路径 / ID

## 错误恢复契约

对每条错误路径，都应包含：
- 根因提示
- 安全的重试指令
- 明确的停止条件

## Context 预算

1. 保持 system prompt 精简且不变。
2. 将大量指引移入按需加载的 skill。
3. 优先使用对文件的引用，而非内联长文档。
4. 在阶段边界处执行 compact，而非在任意 token 阈值处。

## 架构模式指引

- ReAct：最适合路径不确定的探索性任务。
- Function-calling：最适合结构化的确定性流程。
- 混合（推荐）：ReAct 规划 + 类型化 tool 执行。

## 基准测试

追踪以下指标：
- 完成率
- 每个任务的重试次数
- pass@1 和 pass@3
- 每个成功任务的成本

## 反模式

- 过多语义重叠的 tool。
- 不透明的 tool 输出，且无恢复提示。
- 仅输出错误而无下一步动作。
- Context 被无关引用过载。
