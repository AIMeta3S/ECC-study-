---
description: 编排从设计/规格文档引导构建一个可运行的 MVP —— 摄取、切片、scaffold、TDD、review、gated commit（复用 GAN harness）。orch-build-mvp skill 的包装器。
---

# /orch-build-mvp

手动启动 **orch-build-mvp** orchestrator：将一份 SDD/PRD/system-design
文档变成一个可运行的 vertical slice。

## 用法

```
/orch-build-mvp <path to design/spec doc>
```

示例：

```
/orch-build-mvp civicpulse/docs/SDD-v0.6.md
```

## 它做什么

以 `$ARGUMENTS` 作为文档路径，调用 `orch-build-mvp` skill。该 skill
（通过共享的 `orch-pipeline` 引擎，包含 Scaffold 的完整 pipeline）将：

1. 阅读规格文档；提取范围、已锁定的决策，以及一个按
**thin vertical slices** 排序的功能列表（先做一条端到端路径）。→ **GATE 1**（批准 slice 计划）。
2. Scaffold 第一个端到端 slice。
3. 复用 GAN harness：将 SDD 转换为 `gan-harness/spec.md` +
   `eval-rubric.md`，然后驱动 `/gan-build "<brief>" --skip-planner`
   （generator → evaluator 循环），直到评分通过或趋于平稳。
4. `code-reviewer`（在任何 security-trigger slice 上额外运行 `security-reviewer`），然后
   将 scaffold 和每个 slice 作为独立的 `feat:` commit 提交。→ **GATE 2**。

如果 `$ARGUMENTS` 为空，向用户询问设计/规格文档的路径。
