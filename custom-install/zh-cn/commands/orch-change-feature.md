---
description: 将现有可工作功能调整为新的期望行为——按新规范更新现有测试、变更实现以匹配、review、gated commit。这是一个启动 orch-change-feature skill 的封装器。
---

# /orch-change-feature

手动启动 **orch-change-feature** 编排器：将已经可工作的行为改为新的期望规范，测试先行。

## 用法

```
/orch-change-feature <the new desired behavior>
```

示例：

```
/orch-change-feature make nws-poller alert at 2 warnings instead of 3
/orch-change-feature instead of sorting by date, sort by priority
```

## What It Does

以 `$ARGUMENTS` 作为请求，调用 **orch-change-feature** skill。完整流程、约束（规模分级、轻量 plan、先更新现有测试再改实现、`code-reviewer`（触及安全触发点则追加 `security-reviewer`）、GATE 1 / GATE 2、`feat:` 提交）与使用边界见该 skill。

如果 `$ARGUMENTS` 为空，询问用户应改变什么行为。
