---
name: team-agent-orchestration
description: "使用 work item、ownership、agent Kanban、merge gate 和 control pane handoff，为 agent squad 运行团队式编排。"
metadata:
  origin: ECC
---

# Team Agent Orchestration

当 agent 被当作一个团队而非单个 assistant 来管理时，使用本 skill。其目标是让团队式编排变得可靠：清晰的 work item、显式的 ownership、agent Kanban 状态、branch 隔离、control pane 可见性，以及 merge gate。

## When To Activate

- 任务跨越多个 agent、tool、harness、branch 或 worktree。
- 用户提到 team orchestration、agent Kanban、squad、conductor、control pane、manager、desktop app、Zellij、tmux、Hermes、Devin、Codex、Claude Code 或 multi-agent 工作。
- 项目需要跨人员与 agent 的共享工作流状态。
- 现有的 agent fan-out 能产出内容，却无法产出可合并的产品。

## Operating Model

把每个 agent 视为一名队友，附带一份窄契约：

- **Owner**：对 work item 负责的人员或 agent。
- **Scope**：文件、branch、tool 范围以及禁区。
- **State**：backlog、ready、running、review、blocked、merged 或 archived。
- **Evidence**：测试、截图、log、review 备注或 eval 报告。
- **Merge gate**：允许集成的确切条件。

## Agent Kanban

当工作必须跨 session 可见时，使用 agent Kanban。

| Column | Meaning | Exit Criteria |
| --- | --- | --- |
| Backlog | 候选 work item，尚未成型 | 已写入验收标准 |
| Ready | 已成型且可分配 | 已分配 owner 和 branch/worktree |
| Running | agent 正在工作 | 存在 handoff artifact 和已变更的文件 |
| Review | 工作已完成但未合并 | 测试、diff review 和风险检查通过 |
| Blocked | 需要外部输入或未通过 gate | blocker 有 owner 和下一步动作 |
| Merged | 已集成进 mainline | PR 已合并或本地 main 已更新 |
| Archived | 不再相关 | 已记录原因 |

每张卡片应符合以下 schema：

```json
{
  "id": "agent-card-001",
  "title": "Build dynamic workflow skill",
  "owner": "codex",
  "state": "running",
  "branch": "product/dynamic-workflow-team-orchestration",
  "worktree": ".",
  "acceptance": [
    "Skill exists",
    "Tests cover required concepts",
    "Content artifact contains video and article angles"
  ],
  "merge_gate": "lint, focused tests, and catalog check pass",
  "handoff": "path/to/handoff.md"
}
```

## Team-Based Orchestration Flow

1. **塑造看板**：把模糊的构想转化为带 owner 和 merge gate 的 work item。
2. **选择执行模式**：single-agent、dynamic workflow mode、dmux/tmux、worktree fan-out 或外部 desktop orchestrator。
3. **分配边界**：每张卡片一个 owner，清晰的文件范围，且没有 integrator 时不得有重叠写入。
4. **运行 agent**：每个 agent 都要产出 evidence 和 handoff note，而不仅仅是代码。
5. **依次 review**：先测试，再 diff review，再安全/风险检查，再内容/产品打磨。
6. **审慎合并**：由一个 integrator 解决冲突，并更新 control pane 或 status artifact。
7. **抽取可复用 skill**：若卡片模式反复出现，将其提升到 `skills/` 中。

## Control Pane Requirements

一个对团队编排有用的 control pane 应展示：

- 活跃的 work item 及其 agent Kanban 状态。
- Owner、harness、branch、worktree 以及最近一次心跳。
- 指向 handoff artifact、测试、截图和 PR 的链接。
- 按 owner 和解除动作分组的 blocker。
- 按 gate 判断的合并就绪度，而非凭感觉。
- 应成为共享 skill 的可复用工作流候选。

在操作者能够回答"谁负责这件事、什么发生了变更、哪个 gate 失败了、什么可以安全合并"之前，不要追加更多自动化。

## Dynamic Workflow Compatibility

当一张卡片需要 dynamic workflow mode 时：

- 将 task-local harness 置于卡片 owner 之下。
- 在卡片上存储输入和输出。
- 在从 Running 迁移到 Review 之前，要求一次 eval。
- 只有在重复使用之后，才把该 harness 提升为共享 skill。

## Failure Modes To Watch

- **Agent soup**：许多 agent 在运行，却没有 owner 或 merge gate。
- **Invisible work**：有用的产出仅存在于 chat transcript 中。
- **Board theater**：Kanban 看板存在，但卡片没有验收标准。
- **Overlapping writes**：并行的 agent 在没有 worktree 的情况下编辑同一批文件。
- **No product artifact**：流程产出文档，却没有可运行或可发布的产物。

## Output Standard

每次编排轮次结束时，输出：

- 看板/卡片变更。
- 已合并或待处理的 branch。
- 测试和 eval evidence。
- 带 owner 和下一步动作的 blocker。
- 新的共享 skill 候选。
