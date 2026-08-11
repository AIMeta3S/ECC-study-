---
name: orch-add-feature
description: 编排全新功能的端到端完整构建过程——research、plan、TDD implementation、review 与 gated commit——通过将每个阶段委托给匹配的 agent 完成。当添加尚不存在的功能时使用。
metadata:
  origin: ECC
---

# orch-add-feature

Actor · action · target: **orch · add · feature**。这是共享引擎（[`orch-pipeline`](../orch-pipeline/SKILL.md)）之上的 thin wrapper。

## 使用时机

- 用户想要一个**尚不存在**的功能（"添加"、"构建"、"实现"、"支持 …"）。
- 这是全新的行为——不是修复缺陷（`orch-fix-defect`），也不是对现有行为的变更（`orch-change-feature`）。

## 运行设置

- **默认 size 下限：** standard——除非明显较小，否则运行 Research + Plan。
- **Phase mask：** 0 → 1 → 2 → 4 → 5 → 6（跳过阶段 3 Scaffold；该阶段仅用于 MVP）。
- **First move（phase 4）：** 为新行为编写*新的*失败测试，然后实现至通过（green）。

## 工作原理

1. 使用上述设置运行 `orch-pipeline` 引擎。
2. 首先进行规模分类；small / trivial 功能会收敛到 4 → 5 → 6。
3. 在 **Gate 1**（plan 审批）和 **Gate 2**（pre-commit）处停止。
4. 如果该功能涉及 security trigger，则加入 `security-reviewer`。

> 相关：`/feature-dev` 是此流程的独立版本。`orch-add-feature` 的不同之处在于，它与系列中的其他成员共享 `orch-pipeline` 引擎——即 size classifier 和两道 gate——因此能将 trivial 功能合理精简至 4 → 5 → 6。

## 示例

```
orch-add-feature: add OAuth2 login to nws-poller
→ research existing auth libs 
→ plan task_list  [GATE 1: approve]
→ TDD each task 
→ code-review (+ security-reviewer: auth path)
→ commit  [GATE 2: confirm]
```
