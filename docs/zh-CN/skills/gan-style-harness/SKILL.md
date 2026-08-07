---
name: gan-style-harness
description: "受 GAN 启发的 Generator-Evaluator agent harness，用于自主构建高质量应用程序。基于 Anthropic 2026 年 3 月的 harness 设计论文。"
metadata:
  origin: ECC-community
tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# GAN-Style Harness 技能

> 灵感来自 [Anthropic 的《Harness Design for Long-Running Application Development》](https://www.anthropic.com/engineering/harness-design-long-running-apps)（2026 年 3 月 24 日）

一个将**生成**与**评估**分离的多 agent harness，形成对抗性反馈循环，从而将质量推向远超单一 agent 所能达到的水平。

## Core Insight

> 当被要求评估自己的工作时，agent 是病态的乐观主义者——它们称赞平庸的输出，并自我说服放弃那些合理的问题。但工程化一个**独立的 evaluator** 使其严格无情，远比教会 generator 自我批评更容易实现。

这与 GAN（Generative Adversarial Networks，生成式对抗网络）的动态机制相同：Generator 生产，Evaluator 批评，而反馈驱动下一次迭代。

## When to Use

- 从一行 prompt 构建完整应用程序
- 需要高视觉质量的前端设计任务
- 需要可运行功能（而不仅仅是代码）的全栈项目
- 任何无法接受 "AI slop" 美学的任务
- 你愿意投入 50-200 美元以获得生产级质量输出的项目

## When NOT to Use

- 快速的单文件修复（使用标准 `claude -p`）
- 预算紧张的任务（<10 美元）
- 简单的 refactoring（改用 de-sloppify 模式）
- 已经通过测试充分明确的任务（使用 TDD workflow）

## Architecture

```
                    ┌─────────────┐
                    │   PLANNER   │
                    │  (Opus 4.6) │
                    └──────┬──────┘
                           │ Product Spec
                           │ (features, sprints, design direction)
                           ▼
              ┌────────────────────────┐
              │                        │
              │   GENERATOR-EVALUATOR  │
              │      FEEDBACK LOOP     │
              │                        │
              │  ┌──────────┐          │
              │  │GENERATOR │--build-->│──┐
              │  │(Opus 4.6)│          │  │
              │  └────▲─────┘          │  │
              │       │                │  │ live app
              │    feedback             │  │
              │       │                │  │
              │  ┌────┴─────┐          │  │
              │  │EVALUATOR │<-test----│──┘
              │  │(Opus 4.6)│          │
              │  │+Playwright│         │
              │  └──────────┘          │
              │                        │
              │   5-15 iterations      │
              └────────────────────────┘
```

## The Three Agents

### 1. Planner Agent

**角色：**产品经理——将简短的 prompt 扩展为完整的产品规格说明。

**关键行为：**
- 接收一行 prompt，产出包含 16 个 feature 的多 sprint 规格说明
- 定义 user story、技术需求和视觉设计方向
- 刻意追求**雄心勃勃**——保守的规划会导致平庸的结果
- 产出 Evaluator 后续将使用的评估标准

**Model：**Opus 4.6（规格扩展需要深度推理）

### 2. Generator Agent

**角色：**开发者——根据规格说明实现 feature。

**关键行为：**
- 在结构化的 sprint 中工作（或在较新模型中以连续模式工作）
- 在编写代码前与 Evaluator 协商一份 "sprint contract"
- 使用全栈工具：React、FastAPI/Express、数据库、CSS
- 管理 git 以在迭代之间进行版本控制
- 阅读 Evaluator 反馈并在下一次迭代中纳入

**Model：**Opus 4.6（需要强大的编码能力）

### 3. Evaluator Agent

**角色：**QA 工程师——测试正在运行的实际应用程序，而不仅仅是代码。

**关键行为：**
- 使用 **Playwright MCP** 与实际运行的应用程序交互
- 点击遍历 feature、填写表单、测试 API endpoint
- 按四项标准（可配置）打分：
  1. **Design Quality**——感觉起来是否像一个协调的整体？
  2. **Originality**——是自定义决策还是模板/AI 模式？
  3. **Craft**——排版、间距、动画、micro-interaction？
  4. **Functionality**——所有 feature 是否真的可用？
- 返回包含分数和具体问题的结构化反馈
- 经工程化设计为**严格无情**——从不称赞平庸的工作

**Model：**Opus 4.6（需要强大的判断力 + tool use）

## Evaluation Criteria

默认的四项标准，每项打分 1-10：

```markdown
## Evaluation Rubric

### Design Quality (weight: 0.3)
- 1-3: Generic, template-like, "AI slop" aesthetics
- 4-6: Competent but unremarkable, follows conventions
- 7-8: Distinctive, cohesive visual identity
- 9-10: Could pass for a professional designer's work

### Originality (weight: 0.2)
- 1-3: Default colors, stock layouts, no personality
- 4-6: Some custom choices, mostly standard patterns
- 7-8: Clear creative vision, unique approach
- 9-10: Surprising, delightful, genuinely novel

### Craft (weight: 0.3)
- 1-3: Broken layouts, missing states, no animations
- 4-6: Works but feels rough, inconsistent spacing
- 7-8: Polished, smooth transitions, responsive
- 9-10: Pixel-perfect, delightful micro-interactions

### Functionality (weight: 0.2)
- 1-3: Core features broken or missing
- 4-6: Happy path works, edge cases fail
- 7-8: All features work, good error handling
- 9-10: Bulletproof, handles every edge case
```

### Scoring

- **Weighted score** = (criterion_score * weight) 之和
- **Pass threshold** = 7.0（可配置）
- **Max iterations** = 15（可配置，通常 5-15 次即可）

## Usage

### 通过 Command

```bash
# Full three-agent harness
/project:gan-build "Build a project management app with Kanban boards, team collaboration, and dark mode"

# With custom config
/project:gan-build "Build a recipe sharing platform" --max-iterations 10 --pass-threshold 7.5

# Frontend design mode (generator + evaluator only, no planner)
/project:gan-design "Create a landing page for a crypto portfolio tracker"
```

### 通过 Shell 脚本

```bash
# Basic usage
./scripts/gan-harness.sh "Build a music streaming dashboard"

# With options
GAN_MAX_ITERATIONS=10 \
GAN_PASS_THRESHOLD=7.5 \
GAN_EVAL_CRITERIA="functionality,performance,security" \
./scripts/gan-harness.sh "Build a REST API for task management"
```

### 通过 Claude Code（手动）

```bash
# 第 1 步：Plan
claude -p --model opus "You are a Product Planner. Read PLANNER_PROMPT.md. Expand this brief into a full product spec: 'Build a Kanban board app'. Write spec to spec.md"

# 第 2 步：Generate（第 1 次迭代）
claude -p --model opus "You are a Generator. Read spec.md. Implement Sprint 1. Start the dev server on port 3000."

# 第 3 步：Evaluate（第 1 次迭代）
claude -p --model opus --allowedTools "Read,Bash,mcp__playwright__*" "You are an Evaluator. Read EVALUATOR_PROMPT.md. Test the live app at http://localhost:3000. Score against the rubric. Write feedback to feedback-001.md"

# 第 4 步：Generate（第 2 次迭代——读取反馈）
claude -p --model opus "You are a Generator. Read spec.md and feedback-001.md. Address all issues. Improve the scores."

# 重复第 3-4 步，直到满足 pass threshold
```

## Evolution Across Model Capabilities

随着模型能力提升，harness 应当简化。遵循 Anthropic 的演进路线：

### Stage 1 — 较弱模型（Sonnet 级别）
- 需要完整的 sprint 拆解
- sprint 之间重置 context（避免 context 焦虑）
- 至少 2 个 agent：Initializer + Coding Agent
- 大量脚手架以弥补模型能力的不足

### Stage 2 — 能力较强模型（Opus 4.5 级别）
- 完整的三 agent harness：Planner + Generator + Evaluator
- 每个实现阶段之前签订 sprint contract
- 针对复杂应用的 10 个 sprint 拆解
- context 重置依然有用，但不再那么关键

### Stage 3 — 前沿模型（Opus 4.6 级别）
- 简化的 harness：单次 planning，连续生成
- 评估精简为单次最终评估（模型更智能）
- 无需 sprint 结构
- 自动 compaction 处理 context 增长

> **核心原则：**每个 harness 组件都编码了一个关于"模型无法独立完成什么"的假设。当模型能力提升时，重新检验这些假设，剥离不再需要的部分。

## Configuration

### 环境变量

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `GAN_MAX_ITERATIONS` | `15` | Generator-Evaluator 最大循环次数 |
| `GAN_PASS_THRESHOLD` | `7.0` | 通过所需的 Weighted score（1-10） |
| `GAN_PLANNER_MODEL` | `opus` | planner agent 使用的 model |
| `GAN_GENERATOR_MODEL` | `opus` | generator agent 使用的 model |
| `GAN_EVALUATOR_MODEL` | `opus` | evaluator agent 使用的 model |
| `GAN_EVAL_CRITERIA` | `design,originality,craft,functionality` | 以逗号分隔的评估标准 |
| `GAN_DEV_SERVER_PORT` | `3000` | 实际运行的应用程序所用端口 |
| `GAN_DEV_SERVER_CMD` | `npm run dev` | 启动 dev server 的命令 |
| `GAN_PROJECT_DIR` | `.` | 项目工作目录 |
| `GAN_SKIP_PLANNER` | `false` | 跳过 planner，直接使用 spec |
| `GAN_EVAL_MODE` | `playwright` | `playwright`、`screenshot` 或 `code-only` |

### Evaluation Modes

| 模式 | 工具 | 最适用于 |
|------|-------|----------|
| `playwright` | Browser MCP + 实时交互 | 带 UI 的全栈应用 |
| `screenshot` | 截图 + 视觉分析 | 静态站点、纯设计 |
| `code-only` | 测试 + linting + build | API、library、CLI 工具 |

## Anti-Patterns

1. **Evaluator 过于宽松**——如果 evaluator 在第 1 次迭代就让所有内容通过，说明你的 rubric 过于宽松。收紧评分标准，并为常见的 AI 模式添加明确的惩罚项。

2. **Generator 忽视反馈**——确保反馈以文件形式传递，而非内联。generator 应在每次迭代开始时读取 `feedback-NNN.md`。

3. **死循环**——始终设置 `GAN_MAX_ITERATIONS`。如果 generator 在 3 次迭代后仍无法突破分数瓶颈，则停止并标记为人工审查。

4. **Evaluator 测试流于表面**——evaluator 必须使用 Playwright 与实际运行的应用程序**交互**，而不仅仅是截图。要点击按钮、填写表单、测试错误状态。

5. **Evaluator 为自己的修复叫好**——绝不能让 evaluator 提出修复建议后又去评估这些修复。evaluator 只负责批评；修复由 generator 完成。

6. **Context 耗尽**——对于长 session，使用 Claude Agent SDK 的自动 compaction，或在主要阶段之间重置 context。

## Results: What to Expect

基于 Anthropic 公布的结果：

| 指标 | Solo Agent | GAN Harness | 提升 |
|--------|-----------|-------------|-------------|
| 时间 | 20 分钟 | 4-6 小时 | 长 12-18 倍 |
| 成本 | $9 | $125-200 | 多 14-22 倍 |
| 质量 | 勉强可用 | 生产级可用 | 质变 |
| Core feature | 不可用 | 全部可用 | N/A |
| 设计 | 千篇一律的 AI slop | 独特、精致 | N/A |

**权衡很明确：**约 20 倍的时间和成本，换取输出质量的质变。这适用于质量至关重要的项目。

## References

- [Anthropic: Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps) — 原始论文，作者 Prithvi Rajasekaran
- [Epsilla: The GAN-Style Agent Loop](https://www.epsilla.com/blogs/anthropic-harness-engineering-multi-agent-gan-architecture) — 架构解构
- [Martin Fowler: Harness Engineering](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html) — 更广泛的行业背景
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) — OpenAI 的并行工作
