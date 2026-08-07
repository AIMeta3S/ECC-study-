---
description: 运行一个 generator/evaluator 设计循环，用于前端或视觉工作，带有限定的迭代次数和评分。
---

从 $ARGUMENTS 中解析以下内容：
1. `brief` — 用户对要构建内容的简短描述
2. `--max-iterations N` — （可选，默认 15）generator-evaluator 的最大循环次数
3. `--pass-threshold N` —（可选，默认 7.5）达标所需的加权分数（设计模式下默认值更高）

## GAN-Style Design Harness

一个专注于前端设计质量的双 agent loop（Generator + Evaluator）。无需 planner——brief 本身就是 spec。

### Setup
1. 创建 `gan-harness/` 目录
2. 将 brief 直接写入 `gan-harness/spec.md`
3. 编写一份面向设计的 `gan-harness/eval-rubric.md`，重点关注 Design Quality 和 Originality

### Design-Specific Eval Rubric
```markdown
### 设计质量 (Design Quality) (weight: 0.35)
### 原创性 (Originality) (weight: 0.30)
### 工艺 (Craft) (weight: 0.25)
### 功能性 (Functionality) (weight: 0.10)
```

注：Originality 权重更高（0.30 对 0.20），以推动创意突破。Functionality 权重更低，因为设计模式侧重视觉质量。

### Loop
与 `/gan-build` 阶段 2 相同，但：
- 跳过 planner
- 使用面向设计的 rubric
- Generator 的 prompt 强调视觉质量而非功能完备性
- Evaluator 的 prompt 强调“这能赢得设计奖吗？”而非“所有功能都能正常工作吗？”

### 与 gan-build 的关键区别
Generator 被告知：“你的首要目标是视觉上的卓越。一个惊艳但半成品的应用胜过一个功能完整但丑陋的应用。追求创意飞跃——不寻常的布局、定制的动画、独特的色彩处理。”
