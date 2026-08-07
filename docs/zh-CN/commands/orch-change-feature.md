---
description: 编排：将已有的、可正常工作的功能改造为新的期望行为——更新测试以符合新 spec、修改实现、审查、gated commit。orch-change-feature skill 的封装。
---

# /orch-change-feature

手动启动 **orch-change-feature** orchestrator：将已经可正常工作的行为改造为新的期望 spec，测试先行。

## 用法

```
/orch-change-feature <the new desired behavior>
```

示例：

```
/orch-change-feature make nws-poller alert at 2 warnings instead of 3
/orch-change-feature instead of sorting by date, sort by priority
```

## 它的作用

以 `$ARGUMENTS` 作为请求，调用 `orch-change-feature` skill。该 skill（通过共享的
`orch-pipeline` 引擎）将：

1. 判定规模（默认下限：small）并说明所属 tier。
2. 仅当新行为需要调研时，才进行轻量 plan。→ **GATE 1**（批准修改后的测试 plan）。
3. **更新现有测试**以表达新行为，然后修改实现直到 green。（先修改测试，这正是它成为
   tweak 而非 fix 的原因。）
4. `code-reviewer`（当存在安全 trigger 时附加 `security-reviewer`），然后 commit。→ **GATE 2**。

仅当功能**可正常工作**但需要改变行为时使用此命令——不适用于 bugs
（`/orch-fix-defect`）或全新能力（`/orch-add-feature`）。

如果 `$ARGUMENTS` 为空，询问用户应改变什么行为。
