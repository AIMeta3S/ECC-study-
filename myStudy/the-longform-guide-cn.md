# Everything Claude Code 长文指南

![Header: The Longform Guide to Everything Claude Code](./assets/images/longform/01-header.png)

---

> **前置要求**：本指南建立在 [Everything Claude Code 精简指南](./the-shortform-guide-cn.md) 的基础之上。如果你尚未设置技能、钩子、子代理、MCP 和插件，请先阅读精简指南。

![Reference to Shorthand Guide](./assets/images/longform/02-shortform-reference.png)
*精简指南——请先阅读它*

在精简指南中，我讲解了基础设置：技能与命令、钩子、子代理、MCP、插件，以及构成高效 Claude Code 工作流骨干的配置模式。那是设置指南，也是基础架构。

本长文指南则深入那些决定一次会话高效还是浪费的具体技巧。如果你还没有读过精简指南，请先回去把配置设置好。接下来的内容默认你已经把技能、代理、钩子和 MCP 配置好并能正常运行。

本指南的主题包括：Token 经济学、内存持久化、验证模式、并行化策略，以及构建可复用工作流的复利效应。这些都是我在 10 个多月日常使用中反复打磨出来的模式，正是它们决定了你是在第一个小时内就被上下文腐化拖垮，还是能够连续数小时保持高效的会话。

精简指南和长文指南中涵盖的所有内容均可在 GitHub 上找到：`github.com/affaan-m/everything-claude-code`

---

## 技巧与窍门

### 某些 MCP 是可被替代的，替换它们能释放你的上下文窗口

对于版本控制（GitHub）、数据库（Supabase）、部署（Vercel、Railway）等场景的 MCP——这些平台大多已经有非常强大的 CLI 工具，MCP 本质上只是对它们的封装。MCP 是一个不错的封装，但它是有代价的。

要让 CLI 在不实际使用 MCP 的情况下发挥类似 MCP 的功能（同时避免因加载 MCP 而缩小的上下文窗口），可以考虑将相关功能打包成技能（skills）和命令（commands）。把 MCP 暴露的那些让事情变简单的工具剥离出来，将其转化为命令。

例如：与其让 GitHub MCP 始终处于加载状态，不如创建一个 `/gh-pr` 命令，用它来封装 `gh pr create` 并带上你偏好的选项。与其让 Supabase MCP 消耗上下文，不如创建直接使用 Supabase CLI 的技能。

借助懒加载（lazy loading），上下文窗口的问题基本就解决了。但 Token 用量和成本并不会以同样的方式得到解决。CLI + 技能的方式仍然是一种 Token 优化手段。

---

## 重要内容

### 上下文和记忆管理

要在不同会话之间共享记忆，最佳方案是使用一个技能或命令来总结并检查当前进度，然后将结果保存到 `.claude` 文件夹中的 `.tmp` 文件里，并在整个会话期间持续追加内容。第二天，它可以利用这些内容作为上下文，从上次中断的地方继续工作。每个会话创建一个新文件，这样就不会把旧的上下文污染到新的工作中。

![Session Storage File Tree](./assets/images/longform/03-session-storage.png)
*会话存储示例 -> <https://github.com/affaan-m/everything-claude-code/tree/main/examples/sessions>*

Claude 会创建一个汇总当前状态的文件。审查它，需要的话要求修改，然后从干净状态开始。对于新的对话，只需提供该文件路径。当你撞上上下文上限、需要继续复杂工作时，这尤其有用。这些文件应包含：
- What approaches worked (verifiably with evidence)
- 已经完成的 approaches（要有证据可验证）
- Which approaches were attempted but did not work
- 哪些 approaches 已经尝试过，但是失败了，或者没有工作
- Which approaches have not been attempted and what's left to do
- 哪些内容尚未尝试、还剩下哪些要做
> approaches：这里应该泛指任务的相关内容，例如方案、计划、工具、进度、阶段性结果等。单词本意：(待人接物或思考问题的)方式，方法，态度;(距离和时间上的)靠近，接近;要求;建议;接洽;
> attempted：这里应该泛指具体动作的执行，例如工具调用、命令执行、结论验证等。单词本意：尝试;试图;努力;

**策略性地清理上下文：**

一旦你制定好计划并清空了上下文（Claude Code 中 plan 模式的默认选项），你就可以基于该计划开展工作。当你积累了大量不再与执行相关的探索性上下文时，这非常有用。对于策略性的压缩，可以禁用自动压缩，改为在逻辑间隔处手动压缩，或者创建一个技能来自动完成这项工作。

**Advanced：动态系统提示词注入**

我学到的一个模式：不要只是将所有内容都放在 CLAUDE.md 文件中（属于用户范围），或者放在`.claude/rules/`目录下（属于项目范围），因为那样会每个会话都会加载它们到上下文信息中。可以使用 CLI flags 动态注入上下文信息。

```bash
claude --system-prompt "$(cat memory.md)"
```

这让你能更精准地控制何时加载哪些上下文。系统提示内容的权威性高于用户消息，而用户消息的权威性高于工具结果。

**实用配置：**

```bash
# 日常开发
alias claude-dev='claude --system-prompt "$(cat ~/.claude/contexts/dev.md)"'

# PR 审查模式
alias claude-review='claude --system-prompt "$(cat ~/.claude/contexts/review.md)"'

# 研究 / 探索模式
alias claude-research='claude --system-prompt "$(cat ~/.claude/contexts/research.md)"'
```

**Advanced：内存持久化钩子**

有一些大多数人不知道的、对内存管理很有帮助的钩子：

- **PreCompact Hook**：在上下文压缩发生之前，把重要状态保存到文件
- **Stop Hook (Session End)**：在会话结束时，把学到的内容持久化到文件
- **SessionStart Hook**：在新会话开始时，自动加载上一次的上下文

我已经构建了这些钩子，它们位于仓库的 `github.com/affaan-m/everything-claude-code/tree/main/hooks/memory-persistence`

---

### 持续学习 / 记忆

如果多次重复同一个提示词，而 Claude 又陷入同样的问题，或给出你已经见过的回复——这些模式必须被追加到技能中。

**问题所在：** 浪费 Token，浪费上下文，浪费时间。

**解决方案：** 当 Claude Code 发现某些非琐碎的内容时——比如一种调试技巧、一个变通方案、某些项目特定的模式——它会将该知识保存为一个新的技能。下次遇到类似问题时，该技能会被自动加载。

我已经构建了一个做这件事的持续学习技能：`github.com/affaan-m/everything-claude-code/tree/main/skills/continuous-learning`

**为什么用 Stop 钩子（而不是 UserPromptSubmit）：**

关键的设计决策是使用 **Stop hook**而不是 UserPromptSubmit。UserPromptSubmit 会在每一条消息上运行——给每个提示都增加延迟。而 Stop 只在会话结束时运行一次——轻量，不会拖慢你工作时的速度。

---

### Token 优化

**首要策略：Subagent 架构**

优化你所使用的工具，并设计 subagent 架构，把任务委派给能够胜任的、最便宜的模型。

**模型选择速查表：**

![Model Selection Table](./assets/images/longform/04-model-selection.png)
*针对各类常见任务的子代理假设配置及其选择理由*

| 任务类型             | 模型   | 原因                              |
| -------------------- | ------ | --------------------------------- |
| 探索 / 搜索          | Haiku  | 快速、便宜，用来查找文件足够好    |
| 简单编辑             | Haiku  | 单文件改动，指令清晰              |
| 多文件实现           | Sonnet | 编码的最佳平衡                    |
| 复杂架构             | Opus   | 需要深度推理                      |
| PR 审查              | Sonnet | 能理解上下文，捕捉细微差别        |
| 安全分析             | Opus   | 不能放过任何漏洞                  |
| 撰写文档             | Haiku  | 结构简单                          |
| 调试复杂 Bug         | Opus   | 需要把整个系统装在脑子里          |

90% 的编码任务默认用 Sonnet。当首次尝试失败、任务涉及 5 个以上文件、涉及架构决策，或设计安全性和关键性代码时，升级到 Opus。

**定价参考：**

![Claude Model Pricing](./assets/images/longform/05-pricing-table.png)
*来源：<https://platform.claude.com/docs/en/about-claude/pricing>*

**针对工具的优化：**

用 mgrep 替代 grep——相比传统的 grep 或 ripgrep，平均可减少约 50% 的 Token：

![mgrep Benchmark](./assets/images/longform/06-mgrep-benchmark.png)
*在我们 50 个任务的基准测试中，mgrep + Claude Code 所用 Token 约为基于 grep 工作流的一半，而质量相当或更优。来源：mgrep by @mixedbread-ai*

**模块化代码库的益处：**

拥有一个更加模块化的代码库——主文件是几百行而不是几千行——既有助于优化 Token 成本，也有助于在第一次尝试时就正确完成任务。

---

### 验证循环与评估

**基准测试工作流：**

对比有技能和无技能时要求做同一件事，检查输出差异：

fork 对话，在其中一个中创建一个新的 worktree，但不加载该技能，最后进行 diff 对比，查看日志记录了什么。

**评估模式类型：**

- **基于检查点的评估**：设置显式检查点，对照既定标准验证，先修复再继续
- **持续评估**：每 N 分钟或每次重大改动后运行，完整测试套件 + lint

**关键指标：**

```
pass@k: At least ONE of k attempts succeeds
        k=1: 70%  k=3: 91%  k=5: 97%

pass^k: ALL k attempts must succeed
        k=1: 70%  k=3: 34%  k=5: 17%
```

当你只需要它能跑通时，用 **pass@k**。当一致性至关重要时，用 **pass^k**。

---

## 并行化

在 multi-Claude 终端设置中 forking 对话时，要确保 fork 后的对话中和原始对话中的作用范围定义清晰。在代码变更方面，应力求最小重叠。

**我偏好的模式：**

主聊天用于代码改动；fork 对话用于关于代码库及其当前状态的提问，或对外部服务的研究。

**关于任意的终端数量：**

![Boris on Parallel Terminals](./assets/images/longform/07-boris-parallel.png)
*Boris（Anthropic）谈运行多个 Claude 实例*

Boris 对并行化有一些建议。他提过诸如本地跑 5 个 Claude 实例、上游跑 5 个之类的方法。我反对设定任意的终端数量。增加一个终端应当出于真正的必要。

你的目标应当是：**用最小可行的并行量，完成尽可能多的工作。**

**为并行实例使用 Git Worktrees：**

```bash
# 为并行工作创建 worktree
git worktree add ../project-feature-a feature-a
git worktree add ../project-feature-b feature-b
git worktree add ../project-refactor refactor-branch

# 每个 worktree 运行各自的 Claude 实例
cd ../project-feature-a && claude
```

如果你打算开始扩展实例数量，并且有多个 Claude 实例在彼此重叠的代码上工作，那么使用 Git worktree 并为每个实例准备一份定义清晰的计划是必须的。用 `/rename <name here>` 为你所有的聊天命名。

![Two Terminal Setup](./assets/images/longform/08-two-terminals.png)
*起步配置：左终端编码，右终端提问——使用 /rename 和 /fork*

**级联方法：**

运行多个 Claude Code 实例时，按"级联"模式组织：

- 在右侧的新标签页中打开新任务
- 从左往右扫视，从最旧到最新
- 同一时间最多聚焦 3-4 个任务

---

## 基础工作（GROUNDWORK）

**双实例启动模式：**

就我自己的工作流管理而言，我喜欢用一个空仓库、同时打开 2 个 Claude 实例来起步。

**实例 1：脚手架 Agent**
- 搭建脚手架和基础框架
- 创建项目结构
- 设置配置（CLAUDE.md、rules、agents）

**实例 2：深度研究 Agent**
- 连接你所有的服务，网络搜索
- 创建详细的 PRD（产品需求文档）
- 创建 Mermaid 架构图
- 收集带有实际文档片段的参考资料

**llms.txt 模式：**

如果可用，你可以在许多文档站点上访问 `llms.txt`，方法是到达其文档页面后访问 `/llms.txt`。它会给你一份干净的、为 LLM 优化过的文档版本。

**理念：构建可复用的模式**

来自 @omarsar0："早期我花时间构建可复用的工作流 / 模式。构建起来很繁琐，但随着模型和智能体框架的进步，这产生了惊人的复利效应。"

**值得投入的方向：**

- Subagents
- Skills
- Commands
- Planning patterns
- MCP tools
- Context engineering patterns

---

## Agents & Sub-Agents 的最佳实践

**Sub-Agent 的上下文问题：**

Sub-agents 存在意义在于节省上下文——它们返回摘要而非倾倒全部信息。但编排器拥有 sub-agent 所缺乏的语义上下文。Sub-agent 只知道只会话上下文的意图，而不了解整个请求的真实**目的**。

**迭代检索模式：**

1. 编排器评估每个 sub-agent 的返回结果
2. 在接受结果之前提出追问
3. Sub-agent 返回数据源获取答案并返回
4. 循环直到足够满意（最多 3 个循环）

**关键：** 传递的是目标上下文（objective context），而不仅仅是查询。

**带顺序阶段的编排器：**

```markdown
阶段 1：调研（使用 Explore agent）→ research-summary.md
阶段 2：规划（使用 planner agent）→ plan.md
阶段 3：实施（使用 tdd-guide agent）→ code changes
阶段 4：审查（使用 code-reviewer agent）→ review-comments.md
阶段 5：验证（必要时使用 build-error-resolver）→ done or loop back
```

**关键规则：**

1. 每个 agent 获得**一个**明确的输入，产生**一个**明确的输出
2. 输出成为下一阶段的输入
3. 绝不跳过任何阶段
4. 在 agent 之间使用 `/clear`
5. 将中间输出存储到文件中


---

## 有趣的东西 / 不重要，只是好玩的提示

### 自定义状态栏

你可以用 `/statusline` 来设置 - 随后 Claude 会说你还没有状态栏，但可以替你设置好，并询问你想在其中显示什么。

另见：ccstatusline（用于自定义 Claude Code 状态栏的社区项目）

### 语音转写

用语音和 Claude Code 对话。对许多人来说比打字更快。

- superwhisper、MacWhisper（Mac 平台）
- 即便有转写错误，Claude 也能理解你的意图

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
*不到一周即获得 25,000+ GitHub stars*

---

## 资源

**智能体编排：**

- claude-flow — 社区构建的企业级编排平台，配备 54+ 个专用代理

**自我改进的记忆：**

- 参见本仓库的 `skills/continuous-learning/`
- rlancemartin.github.io/2025/12/01/claude_diary/ — 会话反思模式

**系统提示参考：**

- system-prompts-and-models-of-ai-tools — AI 系统提示的社区合集（110k+ stars）

**官方：**

- Anthropic Academy：anthropic.skilljar.com

---

## 参考资料

- [Anthropic：揭开 AI agents 评估的面纱](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [YK：32 条 Claude Code 技巧](https://agenticcoding.substack.com/p/32-claude-code-tips-from-basics-to)
- [RLanceMartin：会话反思模式](https://rlancemartin.github.io/2025/12/01/claude_diary/)
- @PerceptualPeak：Sub-Agent 上下文协商
- @menhguin：Agent 抽象层级榜
- @omarsar0：复利效应理念

---

*两份指南中涵盖的所有内容均可在 GitHub 上的 [everything-claude-code](https://github.com/affaan-m/everything-claude-code) 找到*
