---
description: 为前端或视觉作品运行 generator/evaluator 设计 loop，具有有界迭代和评分机制。
---

从 $ARGUMENTS 中解析以下内容：
1. `brief` — 用户对要创建的设计的描述
2. `--max-iterations N` —（可选，默认 10）设计-评估循环的最大次数
3. `--pass-threshold N` —（可选，默认 7.5）达标所需的加权分数（设计模式默认值更高）

## GAN-Style Design Harness

一个专注于前端设计质量的双 agent loop（Generator + Evaluator）。无需 planner——brief 本身就是 spec。

这正是 Anthropic 在其前端设计实验中所使用的模式，他们借此实现了诸如带 CSS perspective 和门洞导航的 3D 荷兰艺术博物馆之类的创意突破。

### 初始设置
1. 创建 `gan-harness/` 目录
2. 将 brief 直接写入 `gan-harness/spec.md`
3. 编写一份面向设计的 `gan-harness/eval-rubric.md`，对 Design Quality 和 Originality 赋予更高权重

### 面向设计的 Eval Rubric
```markdown
### Design Quality (weight: 0.35)
### Originality (weight: 0.30)
### Craft (weight: 0.25)
### Functionality (weight: 0.10)
```

注：Originality 权重更高（0.30 对 0.20），以推动创意突破。Functionality 权重更低，因为设计模式侧重视觉质量。

### Loop
与 `/project:gan-build` 阶段 2 相同，但：
- 跳过 planner
- 使用面向设计的 rubric
- Generator 的 prompt 强调视觉质量而非功能完备性
- Evaluator 的 prompt 强调“这能赢得设计奖吗？”而非“所有功能都能正常工作吗？”

### 与 gan-build 的关键区别
Generator 被告知：“你的首要目标是视觉上的卓越。一个惊艳但半成品的应用胜过一个功能完整但丑陋的应用。追求创意飞跃——不寻常的布局、定制的动画、独特的色彩处理。”
