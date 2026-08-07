---
name: product-lens
description: 在构建之前使用此 skill 验证“why”，运行产品诊断，并在请求成为实现契约之前对产品方向进行压力测试。
metadata:
  origin: ECC
---

# Product Lens — 构建之前先思考

这条 lane 负责产品诊断，而非实现就绪的规格说明编写。

如果用户需要持久的 PRD-to-SRS 或能力契约产物，交接给 `product-capability`。

## 何时使用

- 在启动任何功能之前 — 验证“why”
- 每周产品评审 — 我们在构建正确的东西吗？
- 在功能之间难以抉择时
- 发布之前 — 对用户旅程进行健全性检查
- 在工程规划启动之前，将模糊的想法转化为产品简报

## 工作原理

### 模式 1：产品诊断

类似于 YC 的 office hours，但是自动化的。提出那些尖锐的问题：

```
1. Who is this for? (specific person, not "developers")
2. What's the pain? (quantify: how often, how bad, what do they do today?)
3. Why now? (what changed that makes this possible/necessary?)
4. What's the 10-star version? (if money/time were unlimited)
5. What's the MVP? (smallest thing that proves the thesis)
6. What's the anti-goal? (what are you explicitly NOT building?)
7. How do you know it's working? (metric, not vibes)
```

输出：一份 `PRODUCT-BRIEF.md`，包含答案、风险和 go/no-go 建议。

如果结果是“yes, build this”，下一个 lane 是 `product-capability`，而不是更多的 founder-theater。

### 模式 2：创始人评审

通过创始人的视角评审你当前的项目：

```
1. Read README, CLAUDE.md, package.json, recent commits
2. Infer: what is this trying to be?
3. Score: product-market fit signals (0-10)
   - Usage growth trajectory
   - Retention indicators (repeat contributors, return users)
   - Revenue signals (pricing page, billing code, Stripe integration)
   - Competitive moat (what's hard to copy?)
4. Identify: the one thing that would 10x this
5. Flag: things you're building that don't matter
```

### 模式 3：用户旅程审计

梳理实际的用户体验：

```
1. Clone/install the product as a new user
2. Document every friction point (confusing steps, errors, missing docs)
3. Time each step
4. Compare to competitor onboarding
5. Score: time-to-value (how long until the user gets their first win?)
6. Recommend: top 3 fixes for onboarding
```

### 模式 4：功能优先级排序

当你有 10 个想法而需要选出 2 个时：

```
1. List all candidate features
2. Score each on: impact (1-5) × confidence (1-5) ÷ effort (1-5)
3. Rank by ICE score
4. Apply constraints: runway, team size, dependencies
5. Output: prioritized roadmap with rationale
```

## 输出

所有模式输出可操作的文档，而非长篇大论。每条建议都有一个具体的下一步。

## 集成

搭配使用：
- `/browser-qa` 用于验证用户旅程审计的发现
- `/design-system audit` 用于视觉打磨评估
- `/canary-watch` 用于发布后监控
- `product-capability`，当产品简报需要变成实现就绪的能力计划时
