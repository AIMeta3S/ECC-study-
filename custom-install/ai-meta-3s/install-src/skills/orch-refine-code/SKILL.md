---
name: orch-refine-code
description: 编排一次保持行为不变的重构——确认测试通过（green）、在不改变行为的前提下重构、保持测试通过（green）、进行代码审查，并进行 gated commit。当结构需要改进但行为不能改变时使用。
metadata:
  origin: ECC
---

# orch-refine-code

Actor · action · target: **orch · refine · code**。这是共享引擎（[`orch-pipeline`](../orch-pipeline/SKILL.md)）之上的 thin wrapper。

## 何时使用

- 行为不变，**结构更优**：提取模块、消除重复、清理死代码、减少嵌套、重命名以提升清晰度。
- 与同类 skill 的区分：如果行为有任何改变，就不应使用本 skill（应使用 `orch-change-feature` / `orch-fix-defect`）。

## 运行设置

- **默认 size 下限：** standard —— 重构会触及多个文件。
- **Phase mask：** 0 → 2（规划重构）→ 4（保持测试通过（green））→ 5 → 6。不编写新的行为测试 —— 现有测试套件就是安全网。
- **First move（phase 4）：** 在修改代码**之前**，确认相关的测试用例**存在且全部通过（green）**；如果代码覆盖率较低，则先添加特性分析测试。然后分小步重构代码，每次重构后都重新运行测试。

## 工作原理

1. 使用上述设置运行 `orch-pipeline` 引擎。
2. 对于死代码 / 重复代码清理，委托给 `refactor-cleaner` agent（它会运行 knip / depcheck / ts-prune 并安全删除）。
3. 在 **Gate 1**（重构计划）和 **Gate 2**（pre-commit）处暂停。
4. 以 `refactor:` 类型提交——diff 必须保持行为中性。

## 示例

```
orch-refine-code: extract the NWS HTTP client out of poller.py
→ confirm tests green 
→ plan extraction  [GATE 1: approve]
→ move in small steps, tests green throughout 
→ code-review
→ commit refactor:  [GATE 2: confirm]
```
