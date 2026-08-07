---
name: orch-change-feature
description: 编排对现有正常运行功能的修改，使其达到新的预期行为——将相关测试更新为新 spec，修改实现以匹配，进行 review，并执行 gated commit。在功能未损坏但需要变更行为时使用。
metadata:
  origin: ECC
---

# orch-change-feature

执行者 · 动作 · 目标：**orch · change · feature**。是对
[`orch-pipeline`](../orch-pipeline/SKILL.md) 中共享 engine 的轻量封装。

## 使用时机

- 现有功能**正常运行**，但期望的行为不同（"修改"、"调整"、"让它也能……"、"不要 X 改成 Y"）。
- 与同类命令区分：
  - **未**损坏 → 不是 `orch-fix-defect`（没有 bug 需要复现）。
  - **非**新增 → 不是 `orch-add-feature`（该能力已存在）。

## 操作设置

- **默认 size 下限：** small —— 大多数调整只涉及一两个 function。
- **Phase mask：** 0 →（仅在新的行为需要调研时才执行 1）→ light 2 →
  4 → 5 → 6。
- **第一步（phase 4）：** 更新*现有*测试以表达新的期望行为，然后修改实现直到测试通过。先改测试是将调整与修复区分开来的关键。

## 工作原理

1. 使用上述设置运行 `orch-pipeline` engine。
2. 保持 plan 轻量 —— 只有 `standard`+ size 才需要完整的 `planner` 流程。
3. 在 **Gate 1**（plan / 已更改测试的审批）和 **Gate 2**（pre-commit）处停止。
4. 如果变更涉及 security trigger，则加入 `security-reviewer`。

## 示例

```
orch-change-feature: make nws-poller alert at 2 warnings instead of 3
→ update threshold tests to new spec → change impl to green
→ code-review → commit  [GATE 2: confirm]
```
