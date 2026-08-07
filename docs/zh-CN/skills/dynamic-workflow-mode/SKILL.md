---
name: dynamic-workflow-mode
description: "为 Claude dynamic workflow mode 及其他 adaptive agent harness 设计 task-local harness、eval gate 与可复用的 skill 提取。"
metadata:
  origin: ECC
---

# Dynamic Workflow Mode

当编码 agent 能够生成或适配一个 task-local harness，而不是仅仅遵循静态命令流程时，使用此 skill。目标是把 dynamic workflow mode 转变成一个规范化的系统：为一次性工作建立临时 harness、为重复工作建立共享 skill 提取，以及为团队提供可观测的 control pane checkpoint。

## 何时激活

- 用户提到 dynamic workflow、custom harness、harness-per-task、adaptive workflow 或 Claude Code dynamic workflow mode。
- 一个任务需要自定义 loop、evaluator、爬虫、fixture 生成器、监听器或本地 dashboard。
- 多个 agent 需要相同的可重复流程，但该流程尚未被捕获为共享 skill。
- 一个 workflow 需要在 merge 前具备持久的 handoff artifact、eval 证据或操作者批准。

## 核心契约

只有当 harness 比手动驱动相同步骤更廉价、更安全时，dynamic workflow mode 才应产生一个 task-local harness。该 harness 必须具备：

- **目标**：它所负责的产出，以及它明确不负责的产出。
- **输入**：文件、URL、prompt、数据源、凭证策略以及用户提供的约束。
- **输出**：commit、报告、截图、状态文件或 control pane 快照。
- **Eval**：至少一个与任务绑定的 pass/fail 检查，而不仅仅是"它运行了"。
- **Handoff**：一个简短的 artifact，告诉下一个操作者发生了什么、什么被阻塞以及如何恢复。

## Dynamic Harness 决策树

1. **一次性任务**：保持内联。不要凭空发明 harness。
2. **带变化输入的重复任务**：创建一个 task-local harness，并将其保留在临时或项目本地的工作区下。
3. **跨队友或仓库的重复任务**：将模式提取为共享 skill。
4. **带外部状态、排队或审批的任务**：在添加更多自动化之前，先添加 control pane 可见性。
5. **带安全风险的任务**：在自主执行之前，添加一个 eval gate 和一个人工 merge gate。

## Task-Local Harness 模板

在编写代码之前使用此结构：

```markdown
# Dynamic Workflow Harness

Objective:
- Ship:
- Do not ship:

Inputs:
- Repo or workspace:
- External systems:
- Credentials policy:

Loop:
1. Discover current state.
2. Generate or update the smallest useful artifact.
3. Run eval checks.
4. Record status and handoff.
5. Stop on failed gate, unclear ownership, or unsafe external action.

Eval:
- Command:
- Expected pass signal:
- Failure owner:

Handoff:
- Status:
- Evidence:
- Next action:
```

## 共享 Skill 提取

仅在以下条件中至少两项为真时，才将一个 task-local harness 提升为共享 skill：

- 相同的 workflow 出现在多个 session、仓库、团队或启动中。
- 该 workflow 需要特定的语言、工具或安全顺序。
- 失败反复出现，因为操作者跳过 gate 或丢失 context。
- 该 workflow 有稳定的输入/输出契约。
- 该 workflow 受益于 control pane、状态板或团队 handoff。

提取时，先将 skill 写入 `skills/<name>/SKILL.md`。仅当仍需要遗留的 slash 入口时，才添加 command shim。

## Control Pane Checkpoint

当 dynamic workflow mode 暴露状态时，它就变得可供团队使用。每当任务跨越多个 session 时，记录以下 checkpoint：

- **Plan**：目标、负责人、验收标准以及有风险的外部系统。
- **Queue**：work item、已分配的 agent 角色、branch/worktree 以及依赖边。
- **Run**：活跃 harness、当前 loop 步骤、近期的 eval 结果，以及（如果可用）token/cost 信号。
- **Gate**：测试结果、浏览器截图、安全审查以及 merge 就绪状态。
- **Handoff**：已完成什么、什么失败了、什么需要人工决策。

如果 repo 启用了 ECC2 state，优先通过 ECC control pane 或由 state store 支撑的脚本来添加或读取 checkpoint，而不是散布未被跟踪的 note。

## Eval Gate

每个 dynamic harness 都需要一个针对任务的 eval。选择最廉价且可靠的 gate：

| 工作类型 | Eval Gate |
| --- | --- |
| 代码功能 | 聚焦测试、lint、coverage 以及一条 integration 路径 |
| UI/control pane | 带截图的浏览器 smoke 测试以及溢出/错误检查 |
| Agent workflow | Fixture transcript 或带预期路由的 seeded work item |
| 研究/内容 | 源中立的简报、claim 检查清单以及可发布的提纲 |
| Integration | Dry-run command、config 校验以及 no-secret 扫描 |

在 eval 能被另一位队友重新运行之前，不要声称一个 dynamic workflow 是可复用的。

## 反模式

- 生成对操作者隐藏真实决策逻辑的脚本。
- 把 dynamic workflow mode 当作跳过测试的许可。
- 当共享 skill 或状态 artifact 才是真正产品时，却创建一次性文档。
- 在没有 ownership、merge gate 或冲突策略的情况下运行多个 agent。
- 让原始的私有研究数据泄露到公开文档中。

## 输出标准

完成时应包含：

- harness 或 skill 的路径。
- eval 命令及结果。
- control pane 或 handoff artifact 的路径。
- 下一个可复用的提取候选。
