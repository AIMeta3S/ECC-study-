# Claude Code 全方位长篇指南

![标题: Claude Code 全方位长篇指南](./assets/images/longform/01-header.png)

---

> **先决条件**：本指南基于 [Claude Code 速查指南](./the-shortform-guide.md) 构建。如果你尚未设置 skill、hook、subagent、MCP 和 plugin，请先阅读该指南。

![参考速查指南](./assets/images/longform/02-shortform-reference.png)
*速查指南 —— 请先阅读*

在速查指南中，我介绍了基础设置：skill 与 command、hook、subagent、MCP、plugin，以及构成高效 Claude Code 工作流骨干的配置模式。那是设置指南和基础架构。

而本篇长篇指南将深入探讨那些区分高效会话与低效会话的技巧。如果你还没有阅读速查指南，请返回并先完成配置。以下内容假定你已经配置好并正常使用 skill、agent、hook 和 MCP。

这里涉及的主题包括：token 经济学、记忆持久化、验证模式、并行化策略，以及构建可复用工作流所带来的复合效应。这些是我在 10 个月以上的日常使用中打磨出来的模式，它们决定了是会在第一个小时内就被 context 腐化所困扰，还是能够连续数小时保持高效会话。

速查指南与长篇指南中的所有内容均可在 GitHub 获取：`github.com/affaan-m/everything-claude-code`

---

## 技巧与窍门

### 部分 MCP 可被替代，从而释放你的 context window

对于 version control (GitHub)、databases (Supabase)、deployment (Vercel, Railway) 等 MCP —— 这些平台大多已有健壮的 CLI，MCP 本质上只是对其进行了封装。这个封装虽然好用，但也是有代价的。

要让 CLI 在不实际使用 MCP（以及由此带来的 context window 缩减）的情况下，运作得更像 MCP，可以考虑将相关功能打包进 skill 和 command 中。把 MCP 为简化操作而暴露的工具剥离出来，转化为 command。

示例：不必始终加载 GitHub MCP，而是创建一个 `/gh-pr` command 来封装 `gh pr create` 并带上你偏好的选项。与其让 Supabase MCP 吃掉 context，不如创建直接使用 Supabase CLI 的 skill。

采用 lazy loading 后，context window 问题已基本解决。但 token 用量和成本并未以同样方式解决。CLI + skill 的方案仍然是一种 token 优化方法。

---

## 重要内容

### Context 与 Memory 管理

要在多个 session 间共享 memory，最佳方案是使用一个 skill 或 command：先总结并登记进度，然后保存到 `.claude` 文件夹中的 `.tmp` 文件，并在 session 期间持续追加，直到 session 结束。第二天它可以将该文件作为 context 使用，从上次中断的地方继续。为每个 session 创建新文件，以免将旧 context 污染到新工作中。

![Session 存储文件树](./assets/images/longform/03-session-storage.png)
*Session 存储示例 -> <https://github.com/affaan-m/everything-claude-code/tree/main/examples/sessions>*

Claude 会创建一个总结当前状态的文件。请先审阅，必要时要求修改，然后全新开始。对于新对话，只需提供该文件路径。这在接近 context 上限且需要继续复杂工作时尤其有用。这些文件应包含：
- 哪些方法有效（有可验证的证据）
- 哪些方法已尝试但无效
- 哪些方法尚未尝试，以及还有哪些工作待完成

**有策略地清除 Context：**

一旦你制定了 plan 并清除了 context（Claude Code 中 plan mode 的默认选项），你就可以基于 plan 工作。这在你积累了大量不再与执行相关的探索性 context 时非常有用。要进行战略性 compact，请禁用 auto compact。在逻辑间隔点手动 compact，或创建一个 skill 来帮你完成。

**高级：动态 System Prompt 注入**

我掌握的一个模式：与其把所有内容都放在每次 session 都加载的 CLAUDE.md（用户作用域）或 `.claude/rules/`（项目作用域）中，不如使用 CLI 标志动态注入 context。

```bash
claude --system-prompt "$(cat memory.md)"
```

这让你能更精准地控制加载哪些 context。system prompt 内容的优先级高于用户消息，而用户消息的优先级又高于工具结果。

**实践设置：**

```bash
# 日常开发
alias claude-dev='claude --system-prompt "$(cat ~/.claude/contexts/dev.md)"'

# PR review 模式
alias claude-review='claude --system-prompt "$(cat ~/.claude/contexts/review.md)"'

# 研究/探索模式
alias claude-research='claude --system-prompt "$(cat ~/.claude/contexts/research.md)"'
```

**高级：Memory 持久化 Hook**

有一些大多数人不知道的 hook，有助于 memory：

- **PreCompact Hook**：在 context compaction 发生前，将重要状态保存到文件
- **Stop Hook (Session End)**：在 session 结束时，将经验持久化到文件
- **SessionStart Hook**：在新 session 开始时，自动加载之前的 context

我已经构建了这些 hook，它们位于仓库 `github.com/affaan-m/everything-claude-code/tree/main/hooks/memory-persistence` 中。

---

### 持续学习 / Memory

如果你曾多次重复同一段 prompt，而 Claude 反复遇到相同问题或给出你听过的回答 —— 这些模式必须被追加到 skill 中。

**问题所在：** 浪费 token，浪费 context，浪费时间。

**解决方案：** 当 Claude Code 发现某些非琐碎的知识 —— 一种调试技巧、一个变通方案、某种项目特有的模式 —— 就将其保存为一个新的 skill。下次类似问题出现时，该 skill 会被自动加载。

我已经构建了一个实现此功能的 continuous learning skill：`github.com/affaan-m/everything-claude-code/tree/main/skills/continuous-learning`

**为什么使用 Stop Hook（而非 UserPromptSubmit）：**

关键设计决策是使用 **Stop hook** 而非 UserPromptSubmit。UserPromptSubmit 在每条消息上运行 —— 给每次 prompt 增加延迟。Stop hook 在 session 结束时运行一次 —— 轻量，不会在 session 期间降低速度。

---

### Token 优化

**首要策略：Subagent 架构**

优化你使用的工具，以及 subagent 架构，将其设计为委托给满足任务需求的最便宜模型。

**模型选择快速参考：**

![模型选择表](./assets/images/longform/04-model-selection.png)
*在不同常见任务上假设性的 subagent 设置及选择理由*

| 任务类型                  | 模型   | 原因                                       |
| ------------------------- | ------ | ------------------------------------------ |
| 探索/搜索                | Haiku  | 快速、便宜，足以胜任文件查找               |
| 简单编辑                  | Haiku  | 单文件修改，指令清晰                       |
| 多文件实现                | Sonnet | 编程任务的最佳平衡                         |
| 复杂架构                  | Opus   | 需要深度推理                               |
| PR review                 | Sonnet | 理解 context，捕捉细微差异                 |
| 安全分析                  | Opus   | 容不得遗漏漏洞                             |
| 编写文档                  | Haiku  | 结构简单                                   |
| 调试复杂 bug              | Opus   | 需要将整个系统装在脑中                     |

90% 的 coding 任务默认使用 Sonnet。当首次尝试失败、任务跨越 5 个以上文件、涉及架构决策或安全关键代码时，升级到 Opus。

**定价参考：**

![Claude 模型定价](./assets/images/longform/05-pricing-table.png)
*来源: <https://platform.claude.com/docs/en/about-claude/pricing>*

**工具特定优化：**

用 mgrep 替代 grep —— 与传统 grep 或 ripgrep 相比，平均 token 消耗减少约 50%：

![mgrep 基准测试](./assets/images/longform/06-mgrep-benchmark.png)
*在我们的 50 任务基准测试中，mgrep + Claude Code 的 token 消耗约为基于 grep 的工作流的 1/2，且评判质量相似或更优。来源：mgrep by @mixedbread-ai*

**模块化代码库的好处：**

拥有一个更模块化的代码库，主文件在数百行而非数千行，既有助于降低 token 优化成本，也有助于一次性正确完成任务。

---

### 验证循环与 Evals

**基准测试工作流：**

对比在有无 skill 的情况下要求相同内容，并检查输出差异：

Fork 对话，在其中一个没有 skill 的分支中初始化一个新 worktree，最后拉出 diff，查看记录了什么。

**Eval 模式类型：**

- **Checkpoint-Based Evals**：设置明确检查点，对照定义标准验证，在继续前修复
- **Continuous Evals**：每 N 分钟或重大变更后运行，执行完整 test suite + lint

**关键指标：**

```
pass@k: k 次尝试中至少有一次成功
        k=1: 70%  k=3: 91%  k=5: 97%

pass^k: 所有 k 次尝试必须全部成功
        k=1: 70%  k=3: 34%  k=5: 17%
```

当你只需要它能工作时使用 **pass@k**。当一致性至关重要则使用 **pass^k**。

---

## 并行化

在多终端 Claude 设置中 fork 对话时，务必确保 fork 和原对话中的操作 scope 定义明确。力求在代码变更方面重叠最小。

**我偏好的模式：**

主聊天用于代码修改，fork 用于询问代码库及其当前状态的问题，或研究外部服务。

**关于任意终端数量：**

![Boris 谈并行终端](./assets/images/longform/07-boris-parallel.png)
*Boris (Anthropic) 关于运行多个 Claude 实例的观点*

Boris 提供了一些关于并行化的技巧。他建议过比如本地运行 5 个 Claude 实例，上游再运行 5 个。我建议不要设定任意的终端数量。增加终端应该出于真正的必要。

你的目标应该是：**以最少可行的并行化程度完成尽可能多的工作。**

**用于并行实例的 Git Worktrees：**

```bash
# 为并行工作创建 worktree
git worktree add ../project-feature-a feature-a
git worktree add ../project-feature-b feature-b
git worktree add ../project-refactor refactor-branch

# 每个 worktree 拥有自己的 Claude 实例
cd ../project-feature-a && claude
```

如果你要开始扩展实例数量，并且有多个 Claude 实例在代码上有重叠的工作，那么必须使用 git worktrees 并为每个实例制定非常明确的 plan。使用 `/rename <在此命名>` 为所有对话命名。

![双终端设置](./assets/images/longform/08-two-terminals.png)
*起始设置：左终端用于编码，右终端用于提问 —— 使用 /rename 和 /fork*

**Cascade 方法：**

在运行多个 Claude Code 实例时，按 “cascade” 模式组织：

- 在右侧新标签页中打开新任务
- 从左到右，从旧到新处理
- 一次最多关注 3-4 个任务

---

## 基础工作

**双实例启动模式：**

对于我自己的工作流管理，我喜欢用一个空仓库启动 2 个 Claude 实例。

**实例 1：Scaffolding Agent**
- 负责搭建脚手架和基础工作
- 创建项目结构
- 设置配置（CLAUDE.md、rules、agent）

**实例 2：Deep Research Agent**
- 连接到你所有的服务、网页搜索
- 创建详细 PRD
- 创建架构 mermaid 图表
- 使用实际的文档片段汇编参考资料

**llms.txt 模式：**

如果可用，在访问许多文档参考页面时，你可以通过在其文档页面后执行 `/llms.txt` 来找到 `llms.txt`。这会为你提供一个干净、面向 LLM 优化的文档版本。

**哲学：构建可复用 Pattern**

来自 @omarsar0：“早期，我花了时间构建可复用的工作流/pattern。构建过程很繁琐，但随着模型和 agent 框架的改进，这产生了惊人的复合效应。”

**值得投入的方向：**

- Subagent
- Skill
- Command
- Planning pattern
- MCP 工具
- Context 工程 pattern

---

## Agent 与 Sub-Agent 最佳实践

**Sub-Agent Context 问题：**

Sub-agent 的存在是为了通过返回摘要而非倾倒所有内容来节省 context。但 orchestrator 拥有 sub-agent 所缺乏的语义 context。sub-agent 只知道字面查询，而不知道请求背后的 PURPOSE。

**迭代检索 Pattern：**

1. Orchestrator 评估每个 sub-agent 的返回结果
2. 在接受之前提出后续问题
3. Sub-agent 返回源头，获取答案，再返回
4. 循环直到充分（最多 3 个周期）

**关键：** 传递目标 context，而不仅仅是查询。

**具有顺序阶段的 Orchestrator：**

```markdown
Phase 1: RESEARCH (使用 Explore agent) → research-summary.md
Phase 2: PLAN (使用 planner agent) → plan.md
Phase 3: IMPLEMENT (使用 tdd-guide agent) → 代码更改
Phase 4: REVIEW (使用 code-reviewer agent) → review-comments.md
Phase 5: VERIFY (必要时使用 build-error-resolver) → 完成或循环回退
```

**关键规则：**

1. 每个 agent 接收一个明确的输入，产生一个明确的输出
2. 输出成为下一阶段的输入
3. 绝不跳过阶段
4. 在 agent 之间使用 `/clear`
5. 将中间输出存储在文件中

---

## 有趣内容 / 不重要但有趣的技巧

### 自定义 Status Line

你可以使用 `/statusline` 进行设置 —— 然后 Claude 会说你还没有，但可以帮你设置，并询问你想要什么内容。

另见：ccstatusline（用于自定义 Claude Code status line 的社区项目）

### 语音转录

用你的声音与 Claude Code 交谈。对许多人来说比打字更快。

- Mac 上的 superwhisper、MacWhisper
- 即使有转录错误，Claude 也能理解意图

### 终端别名

```bash
alias c='claude'
alias gb='github'
alias co='code'
alias q='cd ~/Desktop/projects'
```

---

## 里程碑

![25k+ GitHub Stars](./assets/images/longform/09-25k-stars.png)
*不到一周获得 25,000+ GitHub stars*

---

## 资源

**Agent Orchestration：**

- claude-flow — 社区构建的企业级 orchestration 平台，拥有 54+ 个专业 agent

**自我完善的 Memory：**

- 见本仓库 `skills/continuous-learning/`
- rlancemartin.github.io/2025/12/01/claude_diary/ - Session 反射 pattern

**System Prompt 参考：**

- system-prompts-and-models-of-ai-tools — AI system prompt 的社区集合（110k+ stars）

**官方：**

- Anthropic Academy: anthropic.skilljar.com

---

## 参考资料

- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [YK: 32 Claude Code Tips](https://agenticcoding.substack.com/p/32-claude-code-tips-from-basics-to)
- [RLanceMartin: Session Reflection Pattern](https://rlancemartin.github.io/2025/12/01/claude_diary/)
- @PerceptualPeak: Sub-Agent Context Negotiation
- @menhguin: Agent Abstractions Tierlist
- @omarsar0: Compound Effects Philosophy

---

*两篇指南中涵盖的所有内容均可在 GitHub 仓库 [everything-claude-code](https://github.com/affaan-m/everything-claude-code) 找到*