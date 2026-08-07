---
name: orch-change-feature
description: 精心策划对现有运行正常的功能进行修改，使其行为符合新的预期——更新其测试用例以适应新规范，修改实现以与之匹配，进行代码审查，并执行 gated commit。现有功能本身没有问题，但预期行为有所不同时使用。
metadata:
  origin: ECC
---

# orch-change-feature

Actor · action · target: **orch · change · feature**。这是共享引擎（[`orch-pipeline`](../orch-pipeline/SKILL.md)）之上的 thin wrapper。

## 使用时机

- 现有功能**正常运行**，但期望的行为有所不同（"修改"、"调整"、"让它也能……"、"不要 X 改成 Y"）。
- 与同类命令区分：
  - **没有**BUG → 不是 `orch-fix-defect`（没有 bug 需要复现）。
  - **非**新功能 → 不是 `orch-add-feature`（该能力已存在）。

## 操作设置

- **默认 size 下限：** small —— 大多数调整只涉及一两个 function。
- **Phase mask：** 0 →（仅在新的行为需要调研时才执行 1）→ light 2 → 4 → 5 → 6。
- **First move（phase 4）：** 更新*现有*测试以表达新的期望行为，然后修改实现，直到测试通过为止。先改测试是将 tweak 与 fix 区分开来的关键。

## 工作原理

1. 使用上述设置运行 `orch-pipeline` engine。
2. 保持 plan 轻量 —— 只有 size 为 `standard` 以上时才需要完整的 `planner` 流程。
3. 在 **Gate 1**（plan / changed-test approval）和 **Gate 2**（pre-commit）处停止。
4. 如果变更涉及 security trigger，则加入 `security-reviewer`。

## 示例

```
orch-change-feature: make nws-poller alert at 2 warnings instead of 3
→ update threshold tests to new spec 
→ change impl to green 
→ code-review 
→ commit  [GATE 2: confirm]
```
