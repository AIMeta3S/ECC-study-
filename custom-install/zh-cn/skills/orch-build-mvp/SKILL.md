---
name: orch-build-mvp
description: 编排从设计或规格文档引导构建可工作的最小可行产品 — 读取文档，规划薄垂直切片，搭建首个端到端切片，然后进行 TDD 实现、审查和门控提交。用于将 SDD/PRD 转化为可运行的起点。
metadata:
  origin: ECC
---

# orch-build-mvp

Actor · action · target: **orch · build · mvp**。这是共享引擎（[`orch-pipeline`](../orch-pipeline/SKILL.md)）之上的 thin wrapper。

## 何时使用

- 用户拥有**设计/规格文档**（SDD、PRD、系统设计），并希望从中引导构建出一个可工作的垂直切片。
- 以文档路径作为参数，例如 `civicpulse/docs/SDD-v0.6.md`。

## 运行设置

- **默认 size 下限：** large —— 这是包含 Scaffold 阶段的完整流水线。
- **Phase mask：** 0（read the spec）→ 1 → 2（heavy）→ 3（scaffold）→ 4 → 5 → 6。
- **First move（phase 0 → 2）：** 读取文档；提取范围、已锁定的决策以及功能列表；将其排序为**细粒度 vertical slice**（先打通一条端到端路径，而不是先做完所有 model 再做完所有 view）。阶段3负责建立该首个切片。

## 工作原理

1. 使用上述设置运行 `orch-pipeline` 引擎。
2. **复用现有的 GAN harness**，而不是手动编写迭代循环：
   - 将 SDD 转换为 `gan-harness/spec.md` + `gan-harness/eval-rubric.md`（此产出代替了 `gan-planner` 会生成的内容 — 因为你已有规格文档）。
   - 使用 `/gan-build "<单行简述>" --skip-planner` 驱动构建（默认参数：`--max-iterations 15`，`--pass-threshold 7.0`，`--eval-mode playwright`；对于非 UI 切片使用 `--eval-mode code-only`）。
   - 该命令会运行 `gan-generator` → `gan-evaluator` 循环，并将结果写入 `gan-harness/feedback/feedback-NNN.md`，直到分数通过或进入平台期。
3. 在 **Gate 1**（切片计划）和 **Gate 2**（pre-commit）处停止。将脚手架及每个切片作为单独的 `feat:` 提交进行提交。
4. 对任何触及 security trigger 的切片，加入 `security-reviewer`。

## 示例

```
orch-build-mvp: civicpulse/docs/SDD-v0.6.md
→ read SDD 
→ slice list (vertical) 
→ scaffold slice 1  [GATE 1: approve]
→ /gan-build --skip-planner (generator → evaluator loop) scores vs spec 
→ review
→ commit feat:  [GATE 2: confirm] → next slice
```
