---
description: 编排一次保持行为不变的重构——确认测试通过，在不改变行为的前提下重构结构，保持通过，进行审查，带门禁提交。orch-refine-code skill 的包装器。
---

# /orch-refine-code

手动启动 **orch-refine-code** orchestrator：在行为保持不变的前提下改进结构，以现有测试套件作为安全网。

## 用法

```
/orch-refine-code <what to restructure>
```

示例：

```
/orch-refine-code extract the NWS HTTP client out of poller.py
/orch-refine-code remove dead code and duplication in the dashboard module
```

## 它的作用

调用 `orch-refine-code` skill，将 `$ARGUMENTS` 作为请求传入。该 skill（通过共享的 `orch-pipeline` 引擎）会：

1. 判定规模（默认下限：standard——重构会触及多个文件）。
2. 确认相关测试存在，并在改动代码**之前已经通过**；若覆盖较薄，先补 characterization tests。规划重构。→ **GATE 1**。
3. 以小步进行重构，每步之后重新运行测试（不写新的行为测试——现有套件即证明行为未变）。死代码/重复代码清理委托给 `refactor-cleaner`。
4. 交由 `code-reviewer` 审查，随后以 `refactor:` 类型提交（diff 必须行为中立）。→ **GATE 2**。

仅当行为**不得**改变时才使用此命令。若行为需要任何改变，请改用 `/orch-change-feature` 或 `/orch-fix-defect`。

若 `$ARGUMENTS` 为空，询问用户要重构什么。
