---
description: 统筹构建全新功能 —— research、plan、TDD（为新行为写失败测试，再实现至 green）、review、gated commit。这是一个启动 orch-add-feature skill 的封装器。
---

# /orch-add-feature

手动启动 **orch-add-feature** orchestrator：一条带 gate 的流水线（Research → Plan → TDD → Review → Commit），用于面向全新能力。

## 用法

```
/orch-add-feature <功能描述>
```

示例：

```
/orch-add-feature 为 nws-poller 添加 OAuth2 登录
/orch-add-feature 支持在控制面板中导出 CSV 文件
```

## What It Does

以 `$ARGUMENTS` 作为请求参数调用 **orch-add-feature** skill。完整流程与约束（规模分级、Research + Plan、TDD、`code-reviewer`（触及安全触发点则追加 `security-reviewer`）、GATE 1 / GATE 2、`feat:` 提交）见该 skill。

如果 `$ARGUMENTS` 为空，询问用户要添加什么功能。
