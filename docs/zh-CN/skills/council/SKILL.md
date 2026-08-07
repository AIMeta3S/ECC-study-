---
name: council
description: 针对模糊决策、权衡取舍和 go/no-go 决策，召集一个由四种声音组成的 council。当存在多条可行路径、且你需要在做出选择前获得结构化异议时使用。
metadata:
  origin: ECC
---

# Council

针对模糊决策召集四位顾问：
- 当前的 Claude 声音
- 一个 Skeptic subagent
- 一个 Pragmatist subagent
- 一个 Critic subagent

这用于**模糊情况下的决策**，而非 code review、实现规划或架构设计。

## 何时使用

在以下情况使用 council：
- 某个决策存在多条可行路径，且没有明显的最优选项
- 你需要显式地呈现权衡取舍
- 用户要求第二意见、反对意见或多方视角
- 对话锚定（conversational anchoring）是真实风险
- 某个 go/no-go 决策会从对抗性挑战中受益

示例：
- monorepo vs polyrepo
- 现在发布 vs 等待完善后再发布
- feature flag vs 全面推出
- 精简范围 vs 保留战略广度

## 何时不使用

| 不要用 council | 改用 |
| --- | --- |
| 验证输出是否正确 | `santa-method` |
| 将一个功能拆解为实现步骤 | `planner` |
| 设计系统架构 | `architect` |
| 审查代码中的 bug 或安全问题 | `code-reviewer` 或 `santa-method` |
| 直接的事实性问题 | 直接回答即可 |
| 显而易见的执行任务 | 直接执行任务即可 |

## 角色

| 声音 | 视角 |
| --- | --- |
| Architect | 正确性、可维护性、长期影响 |
| Skeptic | 前提挑战、简化、打破假设 |
| Pragmatist | 发布速度、用户影响、运营现实 |
| Critic | edge case、下行风险、失败模式 |

三个外部声音应作为全新的 subagent 启动，并且只提供**问题和相关上下文**，而非完整的当前对话。这就是反锚定机制。

## 工作流程

### 1. 提取真实问题

把决策精炼为一个明确的 prompt：
- 我们在决定什么？
- 哪些约束条件重要？
- 什么算成功？

如果问题模糊，在召集 council 之前先问一个澄清性问题。

### 2. 只收集必要的上下文

如果决策与特定 codebase 相关：
- 收集相关的文件、代码片段、issue 文本或指标
- 保持紧凑
- 只包含做出该决策所需的上下文

如果决策是战略性的/通用的：
- 跳过仓库代码片段，除非它们会实质性地改变答案

### 3. 先形成 Architect 的立场

在阅读其他声音之前，先写下：
- 你的初始立场
- 支持它的三个最强理由
- 你偏好路径中的主要风险

先做这一步，这样综合时就不会简单地照搬外部声音。

### 4. 并行启动三个独立的声音

每个 subagent 获得：
- 决策问题
- 必要时提供紧凑的上下文
- 一个严格的角色
- 不包含不必要的对话历史

Prompt 形式：

```text
You are the [ROLE] on a four-voice decision council.

Question:
[decision question]

Context:
[only the relevant snippets or constraints]

Respond with:
1. Position — 1-2 sentences
2. Reasoning — 3 concise bullets
3. Risk — biggest risk in your recommendation
4. Surprise — one thing the other voices may miss

Be direct. No hedging. Keep it under 300 words.
```

角色侧重：
- Skeptic：挑战问题框架、质疑假设、提出最简单的可信替代方案
- Pragmatist：为速度、简单性和实际执行做优化
- Critic：呈现下行风险、edge case 以及计划可能失败的原因

### 5. 带偏见防护地进行综合

你既是参与者也是综合者，因此请遵循以下规则：
- 不要不加解释地否定某个外部观点
- 如果某个外部声音改变了你的建议，要明确说明
- 始终包含最强烈的异议，即使你拒绝了它
- 如果有两个声音联合反对你的初始立场，要将其视为真实信号
- 在给出裁决前，让原始立场保持可见

### 6. 呈现一个紧凑的裁决

使用以下输出格式：

```markdown
## Council: [short decision title]

**Architect:** [1-2 sentence position]
[1 line on why]

**Skeptic:** [1-2 sentence position]
[1 line on why]

**Pragmatist:** [1-2 sentence position]
[1 line on why]

**Critic:** [1-2 sentence position]
[1 line on why]

### Verdict
- **Consensus:** [where they align]
- **Strongest dissent:** [most important disagreement]
- **Premise check:** [did the Skeptic challenge the question itself?]
- **Recommendation:** [the synthesized path]
```

保持它在手机屏幕上可快速浏览。

## 持久化规则

不要从这个 skill 向 `~/.claude/notes` 或其他影子路径写入临时笔记。

如果 council 实质性地改变了建议：
- 使用 `knowledge-ops` 把经验教训存储到正确的持久化位置
- 或者如果结果属于会话记忆，使用 `/save-session`
- 或者如果决策改变了实际执行真相，直接更新相关的 GitHub / Linear issue

只有当决策会改变某些真实事物时才进行持久化。

## 多轮跟进

默认是一轮。

如果用户想要再进行一轮：
- 让新问题保持聚焦
- 仅在必要时包含上一轮的裁决
- 尽量让 Skeptic 保持干净，以保留反锚定价值

## 反模式

- 用 council 来做 code review
- 当任务只是实现工作时使用 council
- 把整个对话记录喂给 subagent
- 在最终裁决中隐藏异议
- 不管重要性如何，把每个决策都持久化为笔记

## 相关 skill

- `santa-method` — 对抗性验证
- `knowledge-ops` — 正确地持久化持久的决策增量
- `search-first` — 如有需要，在 council 之前收集外部参考资料
- `architecture-decision-records` — 当决策变成长期的系统策略时，将结果正式化

## 示例

问题：

```text
Should we ship ECC 2.0 as alpha now, or hold until the control-plane UI is more complete?
```

可能的 council 形态：
- Architect 主张结构完整性，避免一个令人困惑的界面
- Skeptic 质疑 UI 是否真的是决定性因素
- Pragmatist 追问在不损害信任的前提下现在可以发布什么
- Critic 聚焦于支持负担、期望债务和发布混乱

价值不在于一致同意。价值在于做出选择之前让分歧变得清晰可见。
