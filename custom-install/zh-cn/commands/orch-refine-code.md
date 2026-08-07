---
description: 编排一次保持行为不变的重构——以现有测试套件为安全网（不写新行为测试），先确认测试绿色并规划重组方案，小步调整结构、全程保持测试绿色，code-review 后以 refactor: 带门禁提交（diff 行为中性）。这是一个启动 orch-refine-code skill 的封装器。

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

## What It Does

使用 `$ARGUMENTS` 作为重构请求调用 **orch-refine-code** skill。完整流程与约束（规模分级、不写新行为测试以现有套件为安全网、改动前确认测试 green、小步重构全程保持 green、死代码 / 重复清理委托 `refactor-cleaner`、`code-reviewer` 审查、GATE 1 / GATE 2、`refactor:` 提交且 diff 行为中性）见该 skill。

若 `$ARGUMENTS` 为空，询问用户要重构什么。
