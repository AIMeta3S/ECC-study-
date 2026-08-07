---
description: 端到端编排构建一个全新功能——调研、规划、TDD、审查、gated commit。用于启动 orch-add-feature skill 的包装器。
---

# /orch-add-feature

手动启动 **orch-add-feature** orchestrator：一条带 gate 的
调研 → 规划 → TDD → 审查 → 提交 pipeline，面向全新能力。

## 用法

```
/orch-add-feature <what to add>
```

示例：

```
/orch-add-feature add OAuth2 login to nws-poller
/orch-add-feature support CSV export in the dashboard
```

## 它的作用

以 `$ARGUMENTS` 作为请求调用 `orch-add-feature` skill。该 skill
（通过共享的 `orch-pipeline` 引擎）将：

1. 评估规模并用一行说明所属 tier。
2. 调研现有的 library/pattern，然后规划一个 `task_list`。→ **GATE 1**（批准 plan）。
3. 对每个 task 进行 TDD（新增失败 test → green），然后交由 `code-reviewer`
   （若触及 security trigger，则额外加入 `security-reviewer`）。
4. 按 conventional commits 规范以 `feat:` 类型提交。→ **GATE 2**（提交前确认）。

遵守两个 gate——在 Gate 1 之前不写实现，在 Gate 2 之前不提交。

如果 `$ARGUMENTS` 为空，询问用户要添加什么能力。
