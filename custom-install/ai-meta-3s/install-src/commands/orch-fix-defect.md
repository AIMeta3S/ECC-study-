---
description: 修复 bug 的流程——以失败的 regression test 复现、修复至 green、review、gated commit。这是一个启动 orch-fix-defect skill 的封装器。

---

# /orch-fix-defect

手动启动 **orch-fix-defect** orchestrator：用一个 red test 证明 bug，然后修复至 green。

## 用法

```
/orch-fix-defect <what is broken>
```

示例：

```
/orch-fix-defect poller crashes on empty NWS response
/orch-fix-defect login returns 500 when email has a plus sign
```

## What It Does

以 `$ARGUMENTS` 作为请求，调用 **orch-fix-defect** skill。完整流程、约束（规模分级、根因不明时用 `code-explorer` 排查、先写失败 regression test 复现再修复至 green、`code-reviewer` / `security-reviewer`、GATE 2、`fix:` 提交）与使用边界见该 skill。

若 `$ARGUMENTS` 为空，请要求用户描述该缺陷。
