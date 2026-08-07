---
name: orch-build-mvp
description: 编排从设计或 spec 文档引导出一个可运行的 MVP —— 读取文档、规划细粒度 vertical slice、搭建首个端到端 slice，然后用 TDD 实现、评审，并通过 gate 提交。用于将 SDD/PRD 转化为可运行的起点。
metadata:
  origin: ECC
---

# orch-build-mvp

Actor · action · target：**orch · build · mvp**。是 [`orch-pipeline`](../orch-pipeline/SKILL.md) 中共享
engine 的轻量封装。

## 何时使用

- 用户有一份**设计 / spec 文档**（SDD、PRD、system_design），希望从中引导出一个
  可运行的 vertical slice。
- 接受一个文档路径作为参数，例如 `civicpulse/docs/SDD-v0.6.md`。

## 运行设置

- **默认规模下限：**large —— 这是包含 Scaffold 的完整 pipeline。
- **Phase 掩码：**0（读取 spec）→ 1 → 2（重度）→ 3（scaffold）→ 4 → 5 → 6。
- **首步动作（phase 0 → 2）：**读取文档；提取范围、已锁定的决策以及
  feature 列表；将其排序为**细粒度 vertical slice**（先打通一条端到端
  路径，而不是先做完所有 model 再做完所有 view）。Phase 3 会把这个首个 slice 搭建起来。

## 工作原理

1. 使用上述设置运行 `orch-pipeline` engine。
2. **复用既有的 GAN harness**，而不是手动实现一个 iterate 循环：
   - 将 SDD 翻译为 `gan-harness/spec.md` + `gan-harness/eval-rubric.md`
     （这相当于替代 `gan-planner` 本会生成的内容——你已经有 spec 了）。
   - 用 `/gan-build "<一句话 brief>" --skip-planner` 驱动构建
     （默认值：`--max-iterations 15`、`--pass-threshold 7.0`、
     `--eval-mode playwright`；对非 UI slice 使用 `--eval-mode code-only`）。
   - 该命令会运行 `gan-generator` → `gan-evaluator` 循环，并写入
     `gan-harness/feedback/feedback-NNN.md`，直到分数通过或进入平台期。
3. 在 **Gate 1**（slice 计划）和 **Gate 2**（提交前）停下。将
   scaffold 和每个 slice 作为独立的 `feat:` commit 提交。
4. 对任何触及 security trigger 的 slice，加入 `security-reviewer`。

## 示例

```
orch-build-mvp: civicpulse/docs/SDD-v0.6.md
→ read SDD → slice list (vertical) → scaffold slice 1  [GATE 1: approve]
→ /gan-build --skip-planner (generator → evaluator loop) scores vs spec → review
→ commit feat:  [GATE 2: confirm] → next slice
```
