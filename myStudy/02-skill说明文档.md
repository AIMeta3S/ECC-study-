# ECC skills 目录说明文档（详尽手册）

> 本文档对 `skills/` 目录下全部 **277 个 skill** 逐个阅读 `SKILL.md` 正文后编写，按**用途/使用场景**分为 15 章，每章一张 6 列表。
> 仓库版本：v2.0.0。配套阅读：[`纯手动安装过程分析.md`](./纯手动安装过程分析.md)、[`命令说明文档.md`](./命令说明文档.md)、[`三组件对比.md`](./三组件对比.md)。

---

## 怎么用这些 skill（安装与触发要点）

源自 [`纯手动安装过程分析.md`](./纯手动安装过程分析.md) 的关键结论：

1. **`./install.sh --profile full` 装的 skill 无法直接用**。它把 skill 放到 `~/.claude/skills/ecc/<name>/`（多一层 `ecc/`），而 Claude Code 只从 `~/.claude/skills/` 的**直接子目录**发现 skill（不递归）。`ecc/` 命名空间是为**插件形态**设计的。
2. **正确装 skill 的两种方式**：
   - **扁平复制**（手动）：`cp -r skills/<name> ~/.claude/skills/`（目标无 `ecc/` 中间层）。
   - **插件方式**：`/plugin install ecc@ecc`，skill 在 `ecc` 命名空间下（`/ecc:<name>`）。
3. **触发方式**：
   - **自动触发**（最常见）：Claude 按 `SKILL.md` frontmatter 的 `description` 判断相关性自动加载。
   - **显式触发**：`/<目录名>`（手动扁平安装）或 `/ecc:<目录名>`（插件）。**skill 名 = 目录名**，不是 frontmatter 的 `name` 字段。
4. **插件方式不分发 `rules/`**，需另行手动复制 `rules/` 目录。

---

## 阅读约定

- 表格 4 列：`skill`（目录名=触发名）｜`功能/用途`｜`适用场景`｜`详细说明`（链接到附件1 对应章节）。各 skill 的「执行步骤/流程」「依赖」「说明」见附件1《02-skill说明文档-附件1》。
- **真实性**：步骤与依赖均来自各 `SKILL.md` 正文实读，正文未明确处标注「正文未明示」「自包含」，**无臆造**。
- **依赖里的 agent** 对照仓库 `agents/` 下 67 个子 agent（如 `planner`、`code-reviewer`、`tdd-guide`、各语言 `*-reviewer`/`*-build-resolver`）。
- 个别 skill 因语义与名称不符，已在「说明」列如实标注归类偏差（见下方「勘误」）。

### 勘误（语义与分类名的偏差，已在表中说明列标注）

- **`benchmark-methodology`**（归第八章「性能·基准」）：实为**竞争者分析评分工具**（9 维度打分），依赖 `competitive-platform-analysis`，与性能基准无关。
- **`token-budget-advisor`**（归第八章）：实为**回答深度选择器**（按 25/50/75/100% 选档），非 LLM token 成本预算工具。
- **`agent-sort`**（归第四章）：偏「为仓库排 ECC 安装计划」，非测试类。
- 部分供应链 skill（`carrier-*`/`customs-*`/`energy-*` 等）的 frontmatter `description` 为空（YAML `>` 折叠空），其功能已从正文小节补全。

---

## 一、ECC 安装·配置·元工具（6 个）

管理 ECC 自身安装、配置审计、skill/规则质量评估与 distill 的元工具。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| configure-ecc | 交互式 ECC 安装向导，引导用户选择并安装 skill 与规则到用户级或项目级目录，验证路径并可选优化 | 用户说"configure ecc / install ecc / setup everything claude code"；想选择性安装 skill 或规则；想验证或修复已存在的 ECC 安装；想为项目优化已安装文件 | [configure-ecc](./02-skill说明文档-附件1.md#configure-ecc) |
| ecc-guide | 通过读取实时仓库现状回答用户关于 ECC 的导航、安装、选择、上手等问题（不靠记忆硬编码） | 用户问 ECC 包含什么；想找某个 skill/command/agent/hook/rule；新手需要导览；问"how do I do X with ECC"；想知道哪些 ECC 组件适配某项目；需要命令/skill/agent/hook/rule 的轻量关系解释；对安装路径、重复安装、reset/卸载、选择性安装感到困惑 | [ecc-guide](./02-skill说明文档-附件1.md#ecc-guide) |
| ecc-recipes | 将工作流描述映射到正确的 ECC command-GROUP（含 run-order 与 stop condition），并浏览所有 command-group 配方族 | 用户说"which commands for X / what command group runs X / show ECC recipes / list ECC pipelines / how do I run a workflow with ECC"；或调用 `/ecc-recipes`（带或不带描述） | [ecc-recipes](./02-skill说明文档-附件1.md#ecc-recipes) |
| skill-comply | 可视化测量 skill/rule/agent 定义是否被真正遵守：自动生成场景（3 档 prompt 严格度）、运行 agent、分类工具调用序列、输出含完整时间线的合规率报告 | 用户运行 `/skill-comply <path>`；问"is this rule actually being followed?"；新增 rule/skill 后验证合规；作为质量维护的周期性检查 | [skill-comply](./02-skill说明文档-附件1.md#skill-comply) |
| skill-scout | 在创建新 skill 前搜索本地、marketplace、GitHub、Web 既有 skill，避免重复造轮子，外部来源须先审查 | 用户说"create / build / make / new skill"；问"is there a skill for X? / does a skill exist that does Y?"；描述工作流且即将建议创建新 skill；想 fork 或扩展既有 skill | [skill-scout](./02-skill说明文档-附件1.md#skill-scout) |
| skill-stocktake | 审计所有 Claude skill 与 command 的质量，支持 Quick Scan（仅变更项）与 Full Stocktake 两种模式，基于质量清单 + AI 整体判断 | 审计 Claude skill/command 质量；Quick Scan（results.json 存在时默认，5–10 分钟）复核自上次以来变更项；Full Stocktake（results.json 缺失或 `/skill-stocktake full`，20–30 分钟）全量复核 | [skill-stocktake](./02-skill说明文档-附件1.md#skill-stocktake) |

## 二、上下文·记忆·持续学习（14 个）

会话上下文管理、跨会话记忆持久化、从会话提取模式形成"本能"、自省与 prompt 优化。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| agent-introspection-debugging | 结构化的 agent 失败自调试工作流，通过 capture、diagnosis、contained recovery 与 introspection report 四阶段让 agent 在升级人类前先系统自检 | 达到最大工具调用/loop-limit；反复重试无进展；context 膨胀或 prompt drift 致输出质量下降；文件系统或环境状态与预期不符；工具失败可能通过诊断+小修复动作恢复 | [agent-introspection-debugging](./02-skill说明文档-附件1.md#agent-introspection-debugging) |
| agent-self-evaluation | 在完成复杂任务后让 agent 用 5 轴 rubric（accuracy、completeness、clarity、actionability、conciseness）自评输出，每轴 1-5 分并附具体证据，产出结构化记分卡与改进建议 | 写了跨 3+ 文件或 50+ 行代码后；完成多步 workflow（implement→test→review）后；3+ 次尝试的 debugging 后；产出设计文档/架构决策/书面分析后；用户问"how good was that? / rate yourself"；任何 Stop hook（若配置 references/hook-integration.md） | [agent-self-evaluation](./02-skill说明文档-附件1.md#agent-self-evaluation) |
| blueprint | 将一句话目标转为多 session、多 agent 工程项目的 step-by-step 构造计划，每步含自包含 context brief 让全新 agent 冷启动执行；含对抗式审查门、依赖图、并行步骤检测、反模式目录与计划变更协议 | 将大 feature 拆为多 PR 并明确依赖顺序；规划跨多 session 的重构或迁移；协调跨 sub-agent 的并行工作流；任何 session 间 context 丢失会导致返工的任务 | [blueprint](./02-skill说明文档-附件1.md#blueprint) |
| ck | 每项目持久化记忆（Context Keeper）：session 开始自动加载项目上下文、跟踪 session 与 git 活动、写入原生记忆；命令运行确定性 Node.js 脚本，行为跨模型版本一致 | 注册项目并初始化上下文（`/ck:init`）；保存 session 状态（`/ck:save`）；获取完整简报（`/ck:resume`）；快速快照（`/ck:info`）；查看项目组合（`/ck:list`）；删除项目（`/ck:forget`）；从 v1 数据迁移到 v2（`/ck:migrate`） | [ck](./02-skill说明文档-附件1.md#ck) |
| code-tour | 创建 CodeTour `.tour` 文件——面向 persona 的逐步代码导览，锚定真实文件与行号；用于 onboarding、架构导览、PR 导览、RCA 导览与结构化"explain how this works" | 用户要 code tour / onboarding tour / architecture walkthrough / PR tour；说"explain how X works"且想要可复用导览 artifact；为新工程师或 reviewer 准备 ramp-up 路径；任务用引导序列比 flat summary 更合适 | [code-tour](./02-skill说明文档-附件1.md#code-tour) |
| codebase-onboarding | 系统分析陌生代码库并产出结构化 onboarding 指南：架构图、关键入口、约定与起步 CLAUDE.md | 首次用 Claude Code 打开项目；加入新团队或仓库；用户说"help me understand this codebase / onboard me / walk me through this repo"；要为项目生成 CLAUDE.md | [codebase-onboarding](./02-skill说明文档-附件1.md#codebase-onboarding) |
| continuous-learning | [已废弃] v1 legacy stop-hook session 模式提取器；v2 是其严格超集（基于本能、项目作用域、hook 可靠），新安装勿用 v1 | 设置自动从 session 末尾提取模式；配置 Stop hook 做 session 评估；审查或整理 `~/.claude/skills/learned/`；调整提取阈值或模式类别；对比 v1（本）与 v2（基于本能）方法 | [continuous-learning](./02-skill说明文档-附件1.md#continuous-learning) |
| continuous-learning-v2 | 基于本能（instinct）的学习系统：通过 hooks 观察 session、创建带置信度评分的原子本能、演化为 skill/command/agent；v2.1 增加项目作用域避免跨项目污染 | 设置从 Claude Code session 自动学习；配置基于 hook 的本能行为提取；调整学习行为的置信度阈值；审查/导出/导入本能库；将本能演化为完整 skill/command/agent；管理项目作用域 vs 全局本能；将本能从项目晋升到全局 | [continuous-learning-v2](./02-skill说明文档-附件1.md#continuous-learning-v2) |
| dynamic-workflow-mode | 为 Claude dynamic workflow mode 等 adaptive agent harness 设计 task-local harness、eval gate 与可复用 skill 提取 | 用户提及 dynamic workflows / custom harnesses / harness-per-task / adaptive workflows / Claude Code dynamic workflow mode；任务需要自定义 loop/evaluator/crawler/fixture generator/watcher/local dashboard；多 agent 需要相同可重复流程但流程尚未捕获为共享 skill；workflow 需要持久交接 artifact / eval 证据 / 合并前操作者批准 | [dynamic-workflow-mode](./02-skill说明文档-附件1.md#dynamic-workflow-mode) |
| growth-log | 教如何写增长日志——从复杂任务、失败或复盘中提取可复用模式（不是日记条目）；与任何笔记系统兼容 | 完成复杂任务（多文件、新功能、架构变更）后；失败、错误或"比预期难"的时刻之后；想回顾一段时间学到了什么 | [growth-log](./02-skill说明文档-附件1.md#growth-log) |
| iterative-retrieval | 通过渐进式细化上下文检索解决多 agent 工作流中的"子 agent 上下文问题"（子 agent 直到开始工作才知道自己需要什么上下文） | spawn 需要代码库上下文但无法预先知道的子 agent；构建上下文被渐进细化的多 agent 工作流；遇到"context too large / missing context"失败；为代码探索设计 RAG 式检索流水线；优化 agent 编排中的 token 用量 | [iterative-retrieval](./02-skill说明文档-附件1.md#iterative-retrieval) |
| nanoclaw-repl | 操作和扩展 NanoClaw v2——ECC 基于 claude -p 构建的零依赖、session 感知 REPL | 运行或扩展 `scripts/claw.js`；需要持久 markdown-backed session、模型切换、动态 skill 加载、session 分支、跨 session 搜索、历史压缩、导出、session 指标 | [nanoclaw-repl](./02-skill说明文档-附件1.md#nanoclaw-repl) |
| prompt-optimizer | 分析原始 prompt，识别意图与缺口，匹配 ECC 组件（skill/command/agent/hook），输出可直接粘贴的优化 prompt；仅建议不执行任务 | 用户说"optimize prompt / improve my prompt / how to write a prompt for / help me prompt / rewrite this prompt"或中文"优化prompt / 改进prompt / 怎么写prompt / 帮我优化这个指令"；粘贴 draft prompt 求反馈；说"I don't know how to prompt for this / how should I use ECC for..."；显式 `/prompt-optimize` | [prompt-optimizer](./02-skill说明文档-附件1.md#prompt-optimizer) |
| strategic-compact | 在逻辑边界（而非任意自动压缩点）建议手动 `/compact`，以跨任务阶段保留上下文 | 跑长 session 接近 context limit（200K+ tokens）；多阶段任务（research→plan→implement→test）；同 session 内切换不相关任务；完成大里程碑后开始新工作；响应变慢或不连贯（context pressure） | [strategic-compact](./02-skill说明文档-附件1.md#strategic-compact) |

---

## 三、Agent 编排·自主循环（22 个）

多 agent 委派、orch-* 流水线、自主循环（autonomous loops）、RFC/DAG 编排、团队编排、意图驱动开发等——把任务拆给多个子 agent 协同完成。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| agentic-engineering | 以 eval 优先、任务拆解、成本感知模型路由的方式做 AI agent 工程化开发 | AI agent 主导实现、人类负责质量与风险控制的工程化流程 | [agentic-engineering](./02-skill说明文档-附件1.md#agentic-engineering) |
| agentic-os | 把 Claude Code 当作持久化运行时/OS，搭建内核路由+专家 agent+文件式记忆+定时自动化 | 构建多 agent 工作流、需要跨会话保活的项目状态、做"个人 OS"；用户说"agentic OS""personal OS""multi-agent""agent coordinator"时 | [agentic-os](./02-skill说明文档-附件1.md#agentic-os) |
| autonomous-agent-harness | 把 Claude Code 变成持续自驱的 agent 系统：持久记忆+定时任务+远程 dispatch+computer use+任务队列 | 用户要 agent 持续/定时运行；构建跨会话记忆的个人 AI 助手；说"每天跑""持续监控"时；想复刻 Hermes/AutoGPT 等自治框架 | [autonomous-agent-harness](./02-skill说明文档-附件1.md#autonomous-agent-harness) |
| autonomous-loops | 自治 Claude Code 循环的模式与架构集（顺序管线到 RFC 驱动多 agent DAG），v1.8 已被 continuous-agent-loop 取代保留兼容 | 搭建无人工干预的自治开发流；为问题选对循环架构；CI/CD 式持续开发管线；并行 agent 合并协调 | [autonomous-loops](./02-skill说明文档-附件1.md#autonomous-loops) |
| claude-devfleet | 通过 Claude DevFleet 编排多 agent 编码任务：规划项目、并行派发隔离 worktree agent、监控、读结构化报告 | 需要并行派多个 Claude Code agent 做编码任务，每个 agent 跑在隔离 git worktree 中 | [claude-devfleet](./02-skill说明文档-附件1.md#claude-devfleet) |
| continuous-agent-loop | 持续自治 agent 循环模式：质量门、eval、恢复控制（v1.8+ 规范名，取代 autonomous-loops） | 选择并运行带质量门与恢复控制的持续循环 | [continuous-agent-loop](./02-skill说明文档-附件1.md#continuous-agent-loop) |
| dmux-workflows | 用 dmux（基于 tmux 的 agent pane 管理器）编排多 agent 并行工作流，跨 Claude Code/Codex/OpenCode 等 harness | 跑多个并行 agent 会话；跨 harness 协调；复杂任务用分治并行；用户说"并行跑""拆这个活""用 dmux""multi-agent"时 | [dmux-workflows](./02-skill说明文档-附件1.md#dmux-workflows) |
| enterprise-agent-ops | 长期运行 agent 工作负载的可观测、安全边界、生命周期管理 | 云托管或持续运行的 agent 系统，需超出单 CLI 会话的运维控制 | [enterprise-agent-ops](./02-skill说明文档-附件1.md#enterprise-agent-ops) |
| hermes-imports | 把本地 Hermes 操作者工作流转成脱敏的 ECC skill 与 release-pack 制品 | Hermes 工作流重复到可复用；本地 operator prompt 要变公开 ECC skill；发布前需剥离私有工作区状态/凭证/本地路径 | [hermes-imports](./02-skill说明文档-附件1.md#hermes-imports) |
| hookify-rules | 编写 hookify 规则（带 YAML frontmatter 的 markdown 文件），按事件触发时给 Claude 注入消息或阻断操作 | 用户要创建/编写/配置 hookify 规则，或需要 hookify 语法与模式指导 | [hookify-rules](./02-skill说明文档-附件1.md#hookify-rules) |
| intent-driven-development | 把模糊或高影响的产品/工程变更转成可观测、可验证的验收标准，在实现前或并行进行 | 用户要求澄清特性、定义验收标准、为安全/数据/迁移/集成变更降风险、准备给其他 agent 的实现需求、把复杂请求变可测；显式调用 /intent-driven-development | [intent-driven-development](./02-skill说明文档-附件1.md#intent-driven-development) |
| loop-design-check | 设计目标导向的 agent loop 并按"五种崩法"体检：空转烧 token、Goodhart 作弊验证器、把错误答案跑到底 | 设计自治 agent loop，或已有 loop 担心它会跑飞/作弊/跑到错误终点；中文"写 loop/设计 loop/loop 体检/五个崩法" | [loop-design-check](./02-skill说明文档-附件1.md#loop-design-check) |
| orch-add-feature | 编排全新特性端到端构建：research、plan、TDD 实现、review、gate 提交，每阶段委派对应 ECC agent | 加一个尚不存在的能力（"add""build""implement""support…"），非修正也非改造 | [orch-add-feature](./02-skill说明文档-附件1.md#orch-add-feature) |
| orch-build-mvp | 编排从设计/规格文档（SDD/PRD）引导可运行 MVP：读文档→切薄垂直片→scaffold 首片→TDD→review→门控提交 | 用户有设计/规格文档（SDD、PRD、system_design），想要从它引导出可运行垂直切片（参数为文档路径） | [orch-build-mvp](./02-skill说明文档-附件1.md#orch-build-mvp) |
| orch-change-feature | 编排改造已有可用特性到新行为：先改测试到新规格→改实现到绿→review→门控提交 | 特性"能用但想不同"（"change""adjust""make it also""instead of X do Y"），非损坏也非全新 | [orch-change-feature](./02-skill说明文档-附件1.md#orch-change-feature) |
| orch-fix-defect | 编排修复 bug：先把 bug 复现成失败回归测试→修到绿→review→门控提交，每阶段委派 ECC agent | 现有行为坏了/错了（错误输出、崩溃、回归），非"想改不同"也非"新能力" | [orch-fix-defect](./02-skill说明文档-附件1.md#orch-fix-defect) |
| orch-pipeline | orch-* 家族的共享编排引擎：门控 Research-Plan-TDD-Review-Commit 管线+大小分类器+agent 映射+两个人工门（通常不直接调用） | 间接被任一 orch-* 操作 skill 加载；直接读仅用于新增家族操作或调优共享阶段/门/agent 映射 | [orch-pipeline](./02-skill说明文档-附件1.md#orch-pipeline) |
| orch-refine-code | 编排行为保持的重构：确认测试绿→重构中保持绿→review→门控提交，结构改善而行为不变 | 同行为要更好结构（抽模块、去重复、杀死代码、降嵌套、重命名清晰）；行为若要变即用错 skill | [orch-refine-code](./02-skill说明文档-附件1.md#orch-refine-code) |
| plan-orchestrate | 读计划文档→拆步骤→为每步设计 ECC 目录内的 agent 链→生成可直接粘贴的 /orchestrate custom 提示（仅生成不执行） | 用户有多步计划文档（PRD/RFC/实现计划）想通过 /orchestrate 驱动；不想手挑每步 agent；说"orchestrate this plan""compose chains for this plan" | [plan-orchestrate](./02-skill说明文档-附件1.md#plan-orchestrate) |
| ralphinho-rfc-pipeline | RFC 驱动的多 agent DAG 执行模式：质量门、merge queue、work unit 编排 | 特性太大单个 agent 一次跑不完，需拆成独立可验证的 work unit | [ralphinho-rfc-pipeline](./02-skill说明文档-附件1.md#ralphinho-rfc-pipeline) |
| team-agent-orchestration | 把 agent 当团队成员编排：work item、所有权、agent Kanban、merge 门、控制面板交接 | 任务跨多 agent/工具/harness/分支/worktree；提到 team orchestration/agent Kanban/squad/conductor/控制面板/Hermes/Devin/Codex/多 agent；现有 fan-out 有产出但合不出可合并产品 | [team-agent-orchestration](./02-skill说明文档-附件1.md#team-agent-orchestration) |
| team-builder | 交互式 agent 选择器：浏览+组合+并行派发临时团队 | 有多个 agent persona markdown，想为任务挑哪些；想跨域组队（Security+SEO+Architecture）；想先浏览可用 agent 再决定 | [team-builder](./02-skill说明文档-附件1.md#team-builder) |

---

## 四、TDD·测试·验证（11 个）

测试驱动开发、E2E/浏览器/桌面测试、评估框架（eval-harness）、持续验证循环、agent 自评——保障代码正确性的通用测试与验证 skill（语言专属的 *-testing/*-tdd 见第十四章）。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| agent-eval | 对比不同编码 agent（Claude Code、Aider、Codex 等）在自定义任务上的通过率、成本、耗时与一致性指标 | 选型或采纳新 agent/model 前做数据化对比；agent 升级后的回归检测；为团队产出数据支撑的 agent 选型决策 | [agent-eval](./02-skill说明文档-附件1.md#agent-eval) |
| agent-harness-construction | 设计并优化 AI agent 的动作空间、工具定义、观察格式以提升任务完成率 | 改进 agent 的规划、工具调用、错误恢复与收敛能力；提升单 agent pass@1/pass@3 | [agent-harness-construction](./02-skill说明文档-附件1.md#agent-harness-construction) |
| agent-sort | 基于仓库实际证据将 ECC 各组件（skills/commands/rules/hooks/extras）分类为 DAILY 与 LIBRARY 桶，输出可执行的安装规划 | 仓库只需 ECC 子集而全量安装过载；需要可重复、基于 grep 证据而非主观判断的安装决策；区分 always-loaded 与可搜索引用；仓库需要清理错误的语言/规则/hook | [agent-sort](./02-skill说明文档-附件1.md#agent-sort) |
| ai-regression-testing | 针对 AI 辅助开发的回归测试策略：sandbox 模式无 DB 依赖的 API 测试、bug-check 自动化流程、识别"同模型写又审"的系统性盲区 | AI agent（Claude Code/Cursor/Codex）改动 API 路由或后端逻辑；修复 bug 后需防回归；项目有 sandbox/mock 模式可做无 DB 测试；运行 `/bug-check` 等审查命令；存在多代码路径（sandbox vs 生产、feature flag） | [ai-regression-testing](./02-skill说明文档-附件1.md#ai-regression-testing) |
| browser-qa | 部署后用浏览器自动化做可视化测试与 UI 交互验证（smoke、交互、视觉回归、可访问性四阶段） | 功能部署到 staging/preview 后；需跨页面验证 UI 行为；发布前确认布局/表单/交互；评审改前端代码的 PR；可访问性审计与响应式测试 | [browser-qa](./02-skill说明文档-附件1.md#browser-qa) |
| click-path-audit | 追踪每个用户可见按钮/触点的完整状态变化序列，找出"函数单独正确但彼此抵消/最终状态错误/UI 不一致"的 bug | 系统化调试找不到 bug 但用户报告按钮失效；改动任何 Zustand store action 后审查所有调用方；触碰共享状态的重构后；发布前关键用户流程；按钮"点了没反应"的专属工具 | [click-path-audit](./02-skill说明文档-附件1.md#click-path-audit) |
| e2e-testing | Playwright E2E 测试模式：Page Object Model、配置、CI/CD 集成、artifact 管理、flaky 策略 | 构建 Playwright E2E 测试套件；编写稳定可维护的浏览器端到端测试；处理 flaky 测试；将 E2E 接入 GitHub Actions；钱包/Web3 与金融关键流程测试 | [e2e-testing](./02-skill说明文档-附件1.md#e2e-testing) |
| eval-harness | 为 Claude Code 会话实现 eval-driven development（EDD）的正式评估框架，定义 pass/fail 与 pass@k/pass^k 指标 | 搭建 EDI/AI 辅助工作流的评估流程；为任务完成定义 pass/fail；用 pass@k 度量 agent 可靠性；为 prompt/agent 变更建回归测试；跨模型版本基准对比 | [eval-harness](./02-skill说明文档-附件1.md#eval-harness) |
| tdd-workflow | 强制 TDD 开发，覆盖单元/集成/E2E 全层测试，要求 80%+ 覆盖率；可接收 `*.plan.md` 作为规划输入 | 写新功能；修 bug；重构；加 API endpoint；建新组件；从 `/plan` 输出或任意 `*.plan.md` 实施计划继续 | [tdd-workflow](./02-skill说明文档-附件1.md#tdd-workflow) |
| verification-loop | 会话级综合验证系统：构建→类型→lint→测试→安全→diff 六阶段质量门 | 完成功能或重大改动后；建 PR 前；重构后；长会话每 15 分钟或重大改动后做综合验证 | [verification-loop](./02-skill说明文档-附件1.md#verification-loop) |
| windows-desktop-e2e | Windows 原生桌面应用（WPF/WinForms/Win32-MFC/Qt 5.x-6.x）的 E2E 测试，基于 pywinauto + Windows UI Automation | 为 Windows 原生桌面应用编写/运行 E2E；从零搭建桌面 GUI 测试套件；诊断 flaky 桌面自动化；为现有应用补 AutomationId/可测性；将桌面 E2E 接入 GitHub Actions windows-latest | [windows-desktop-e2e](./02-skill说明文档-附件1.md#windows-desktop-e2e) |

---

## 五、代码审查·质量·门禁（15 个）

代码审查、生产就绪审计、代码健康度（CodeScene）、PR/canary 监控、规则 distill、对抗式审查（council/santa-method/gan）、配置与成本审计——把住代码质量与上线门禁。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| agent-architecture-audit | 对 agent/LLM 应用做全栈诊断，审计 12 层 agent stack（wrapper 回归、memory 污染、工具纪律、隐藏修复回路、渲染损坏等），产出按严重度排序的发现与代码优先修复方案 | 发布任何 agent/LLM 应用前；加入新 prompt 层、工具定义、memory 系统后行为退化；用户报告"agent 变差了/工具不靠谱"；同一 model 在 playground 正常但在 wrapper 中失败；调试 agent 行为超过 15 分钟仍未定位 | [agent-architecture-audit](./02-skill说明文档-附件1.md#agent-architecture-audit) |
| automation-audit-ops | 证据优先的自动化清单与重叠审计工作流：回答哪些 job/hook/connector/MCP/wrapper 在运行、损坏、冗余或缺失，在动手修复前先给清单与 keep/merge/cut/fix-next 建议 | 用户问"我有哪些自动化/哪些在线/哪些坏了/哪些重叠"；任务横跨 cron、GitHub Actions、本地 hook、MCP、connector、wrapper、app 集成；需要知道从其它 agent 系统迁移后还差什么；工作区出现多套同义做法需要收敛到一条主路径 | [automation-audit-ops](./02-skill说明文档-附件1.md#automation-audit-ops) |
| canary-watch | 部署后对已上线 URL 做冒烟/canary 验证：检查 HTTP 端点、SSE 流、静态资源、控制台错误、性能回归（LCP/CLS/INP）等，循环监控直到停止或窗口到期 | 部署到生产或 staging 后；合并高风险 PR 后；验证某个修复是否真正生效；发布窗口内持续监控；依赖升级之后 | [canary-watch](./02-skill说明文档-附件1.md#canary-watch) |
| codehealth-mcp | 通过 CodeScene MCP 提供实时结构化 Code Health 反馈：编辑前审查、变更后验证分数 delta、门禁 commit 与 PR，用于代码质量审查、重构、检查 AI 改动是否劣化可维护性 | 用户要求审查代码质量/重构文件/检查 AI 改动是否劣化；编辑 hotspot、legacy 模块或不熟悉文件前；commit/PR 前需可维护性护栏；大段 agent 生成的 diff 之后验证未回归；与 verification-loop、tdd-workflow、/quality-gate 配合做结构性检查 | [codehealth-mcp](./02-skill说明文档-附件1.md#codehealth-mcp) |
| council | 为模糊决策、权衡、go/no-go 召集四声 council（in-context Claude + Skeptic + Pragmatist + Critic 三个子 agent），用结构化对抗获得决策 | 决策存在多条可信路径且无明显赢家；需要显式权衡；用户要第二意见/异议/多视角；对话锚定是真风险；go/no-go 受益于对抗性挑战（如 monorepo vs polyrepo、立即发布 vs 打磨、feature flag vs 全量上线）；不用于代码审查、实现规划、架构设计、事实性问题或显然的执行任务 | [council](./02-skill说明文档-附件1.md#council) |
| ecc-tools-cost-audit | 证据优先的 ECC Tools 烧钱与计费审计：调查失控的 PR 创建、配额绕过、premium-model 泄漏、重复 job、GitHub App 成本飙升（针对兄弟 ECC-Tools 仓库） | 用户怀疑 ECC Tools GitHub App 烧钱、过度创建 PR、绕过用量限制、把免费用户路由到 premium 分析路径；任务位于兄弟 ECC-Tools 仓库且依赖 webhook 处理、队列 worker、用量预留、PR 创建逻辑或付费门；客户反馈 App 创建过多 PR/计费错误/分析无产出 | [ecc-tools-cost-audit](./02-skill说明文档-附件1.md#ecc-tools-cost-audit) |
| flutter-dart-code-review | 库无关的 Flutter/Dart 代码审查清单，覆盖 widget 最佳实践、状态管理（BLoC/Riverpod/Provider/GetX/MobX/Signals）、Dart 惯用法、性能、无障碍、安全与 clean architecture | 审查 Flutter/Dart 应用代码；项目用任一状态管理方案（BLoC、Riverpod、Provider、GetX、MobX、Signals 等）；需要在 widget、状态管理、性能、测试、无障碍、平台差异、安全、依赖、路由、错误处理、国际化、DI、静态分析等维度做全面 review | [flutter-dart-code-review](./02-skill说明文档-附件1.md#flutter-dart-code-review) |
| gan-style-harness | 基于 GAN 思想的 Generator-Evaluator 多 agent harness：把生成与评估分离成对抗反馈回路，驱动远超单 agent 的应用质量（灵感来自 Anthropic 2026 年 3 月 harness 设计论文） | 从一行 prompt 构建完整应用；前端设计任务需高视觉质量；全栈项目要可运行功能而非只要代码；不能接受"AI slop"美学；愿投入 $50–200 换取生产级输出；不用于单文件修复、<$10 紧预算、简单重构、已用 TDD 充分规约的任务 | [gan-style-harness](./02-skill说明文档-附件1.md#gan-style-harness) |
| plankton-code-quality | 基于 Plankton 的写入时代码质量执行：通过 PostToolUse 钩子在每次文件编辑时自动格式化、lint，并派生 Claude 子进程修复 agent 漏掉的违规（credit: @alxfazio） | 希望每次文件编辑都自动格式化/lint（非仅 commit 时）；需要防御 agent 改 linter 配置以通过检查；需要按违规复杂度分层 model 路由（Haiku 简单样式、Sonnet 逻辑、Opus 类型系统）；多语言项目（Python/TS/Shell/YAML/JSON/TOML/Markdown/Dockerfile） | [plankton-code-quality](./02-skill说明文档-附件1.md#plankton-code-quality) |
| production-audit | 本地证据优先的生产就绪审计：为已发布应用、上线前审查、post-merge 检查、"上线会坏什么"问题打分，不把仓库数据外送第三方审计服务 | 用户问"是否可上线/生产会坏什么/我们漏了什么/审计这个仓库/ready to ship"；合并后需 pre-deploy 或 post-merge 风险扫描；临近公开发布/演示/客户上线/投资人 review；CI 绿但想要生产风险视角；有部署 URL/release 分支/PR/当前 checkout 可取证；不用于主动实现期的行级安全编码（先用 security-review）、纯库/模板/文档仓、正式合规审计、仅有 idea 无任何运行面 | [production-audit](./02-skill说明文档-附件1.md#production-audit) |
| recursive-decision-ledger | 为重复 rollout、"Prime Gauss"式递归 prompt、高维搜索、随机优化、局部最优探索、ensemble 比较、需要可见证据链的递归推理保留有用部分（重复试验/前验记忆/新信息/显式 mark），剔除"假装回路能证明确定性"的不安全部分 | 用户要求重复 rollout/标记化决策过程/高维搜索/随机优化/局部最优探索/ensemble 比较/带证据链的递归推理；交易、资金分配、生产部署、迁移或破坏性运维场景 | [recursive-decision-ledger](./02-skill说明文档-附件1.md#recursive-decision-ledger) |
| repo-scan | 跨栈源码资产审计：对每个文件分类、检测内嵌第三方库、按模块给出四级判定（Core Asset/Extract & Merge/Rebuild/Deprecate），并产出可交互 HTML 报告 | 接手大型 legacy 代码库需结构性概览；大重构前识别核心/重复/死代码；审计直接内嵌源码而非声明在包管理器的第三方依赖；为 monorepo 重组准备架构决策记录 | [repo-scan](./02-skill说明文档-附件1.md#repo-scan) |
| rules-distill | 扫描已安装 skill，提取出现在多个 skill 中的横切原则，蒸馏为 rules——追加到既有 rule 文件、修订过时内容或新建 rule 文件 | 周期性 rules 维护（每月或装新 skill 后）；skill-stocktake 后发现应上升为 rule 的模式；感觉 rules 相对于所用 skill 不完整 | [rules-distill](./02-skill说明文档-附件1.md#rules-distill) |
| santa-method | 多 agent 对抗式验证框架：两个独立 review agent 都须 PASS 才放行，未过则修复后重审直到收敛或达上限升级（"列两次清单，naughty 修到 nice"） | 输出将被发布/部署/给终端用户消费；须满足合规、监管或品牌约束；代码无人工 review 直上线；内容准确性重要（技术文档、教育材料、客户文案）；批量生成抽查会漏系统性模式；幻觉风险高（声明、统计、API 引用、法律措辞）；不用于内部草稿、探索性研究或可确定性验证的任务（交给 build/test/lint） | [santa-method](./02-skill说明文档-附件1.md#santa-method) |
| workspace-surface-audit | 只读审计 skill：审计当前 repo、MCP server、plugin、connector、env 面与 harness 配置，并推荐最高价值的 ECC 原生 skill/hook/agent/operator workflow | 用户说"帮我配置 Claude Code/推荐自动化/我该用哪些 plugin 或 MCP/我还缺什么"；装机或装新 skill 前审计机器/仓库；比较官方 marketplace plugin 与 ECC 原生覆盖；审查 .env/.mcp.json/plugin 设置/connected-app 面以发现缺失工作流；判断某能力应是 skill/hook/agent/MCP/外部 connector | [workspace-surface-audit](./02-skill说明文档-附件1.md#workspace-surface-audit) |

---

## 六、架构·系统设计模式（18 个）

API 设计、后端/前端架构模式、数据库迁移、部署/Docker/K8s 模式、错误处理、六边形架构、ADR、MCP server 构建、产品能力建模——跨语言的系统级设计模式与工程实践。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| ai-first-engineering | 为 AI 代理承担大量实现产出的团队提供工程运作模型（流程、评审、架构、招聘、测试标准） | 当需要为"AI 辅助生成代码占大头"的团队设计过程、评审机制与架构时；用户探讨 AI-first 团队的工程规范与代码评审重点时 | [ai-first-engineering](./02-skill说明文档-附件1.md#ai-first-engineering) |
| api-connector-builder | 严格匹配目标仓库既有集成模式来新增一个 API connector/provider（不另起架构） | "为该项目建一个 Jira connector"；"按现有模式加一个 Slack provider"；"新建一个 API 集成"；"构建匹配仓库 connector 风格的插件" | [api-connector-builder](./02-skill说明文档-附件1.md#api-connector-builder) |
| api-design | REST API 设计模式：资源命名、状态码、分页、过滤、错误响应、版本与限流 | 设计新 API 端点；评审既有 API 契约；加分页/过滤/排序；为 API 实现错误处理；规划 API 版本策略；构建公开或合作方 API | [api-design](./02-skill说明文档-附件1.md#api-design) |
| architecture-decision-records | 将会话中产生的架构决策捕获为结构化 ADR 文档，自动检测决策时刻、记录上下文/备选/理由，维护 ADR 日志 | 用户明说"记录这个决策"/"ADR this"；在重大备选间做选择（框架/库/模式/数据库/API 设计）；出现"我们决定…"或"为何选 X"的讨论；规划阶段讨论架构权衡时 | [architecture-decision-records](./02-skill说明文档-附件1.md#architecture-decision-records) |
| backend-patterns | 后端架构模式、API 设计、数据库优化、服务端最佳实践（Node.js/Express/Next.js API routes） | 设计 REST/GraphQL 端点；实现 repository/service/controller 层；优化查询（N+1、索引、连接池）；加缓存（Redis、内存、HTTP 头）；后台任务/异步处理；API 错误处理与校验；构建中间件（auth、日志、限流） | [backend-patterns](./02-skill说明文档-附件1.md#backend-patterns) |
| config-gc | Claude Code 配置垃圾回收：周期性扫描 ~/.claude（skills/memory/hooks/permissions/MCP/caches）找出冗余/陈旧/孤儿/低价值项，逐项确认后清理 | 用户说"清理我的配置"/"config GC"/"skill 太多"/"审计我的 setup"/"我的 .claude 太臃肿"；安装大型 skill 包后想消解重叠；月度/周期性配置审查 | [config-gc](./02-skill说明文档-附件1.md#config-gc) |
| database-migrations | 跨 PostgreSQL/MySQL 与常见 ORM（Prisma、Drizzle、Kysely、Django、TypeORM、golang-migrate）的数据库迁移最佳实践：schema 变更、数据迁移、回滚、零停机部署 | 创建/修改表；增删列或索引；执行数据迁移（回填/转换）；规划零停机 schema 变更；为新项目搭建迁移工具 | [database-migrations](./02-skill说明文档-附件1.md#database-migrations) |
| deployment-patterns | 部署工作流、CI/CD 流水线、Docker 化、健康检查、回滚策略、生产就绪 checklist | 搭建 CI/CD 流水线；Docker 化应用；规划部署策略（蓝绿/金丝雀/滚动）；实现健康检查与 readiness probe；准备生产发布；配置环境差异化 | [deployment-patterns](./02-skill说明文档-附件1.md#deployment-patterns) |
| docker-patterns | Docker 与 Docker Compose 模式：本地开发、容器安全、网络、卷策略、多服务编排 | 为本地开发搭 Docker Compose；设计多容器架构；排查容器网络或卷问题；评审 Dockerfile 的安全与体积；从本地 dev 迁移到容器化工作流 | [docker-patterns](./02-skill说明文档-附件1.md#docker-patterns) |
| error-handling | 跨 TypeScript/Python/Go 的健壮错误处理模式：类型化错误、错误边界、重试、断路器、用户可见错误信息 | 为新模块/服务设计错误类型或异常层级；为不可靠外部依赖加重试或断路器；评审 API 端点的错误处理缺失；实现用户可见错误信息；调试级联失败或静默吞错 | [error-handling](./02-skill说明文档-附件1.md#error-handling) |
| frontend-patterns | 前端开发模式：React/Next.js、状态管理、性能优化、UI 最佳实践 | 构建 React 组件（组合、props、渲染）；管理状态（useState/useReducer/Zustand/Context）；实现数据获取（SWR/React Query/server components）；性能优化（memoization、虚拟化、代码分割）；表单处理；客户端路由；可访问、响应式 UI | [frontend-patterns](./02-skill说明文档-附件1.md#frontend-patterns) |
| git-workflow | Git 工作流模式：分支策略、提交规范、merge vs rebase、冲突解决、协作开发 | 为新项目设定 Git 工作流；选分支策略（GitFlow/trunk-based/GitHub flow）；写提交信息与 PR 描述；解决合并冲突；管理发布与版本 tag；向新成员宣讲 Git 实践 | [git-workflow](./02-skill说明文档-附件1.md#git-workflow) |
| hexagonal-architecture | 设计、实现、重构 Ports & Adapters（六边形）系统：清晰领域边界、依赖倒置、可测试的用例编排（TS/Java/Kotlin/Go） | 构建长期可维护性与可测试性优先的新功能；重构分层或框架耦合重的代码；为同一用例支持多接口（HTTP/CLI/queue/cron）；在不改业务规则的前提下替换基础设施 | [hexagonal-architecture](./02-skill说明文档-附件1.md#hexagonal-architecture) |
| kubernetes-patterns | 生产级 Kubernetes 工作负载模式：资源管理、RBAC、探针、自动伸缩、ConfigMap/Secret、kubectl 调试 | 写 K8s manifest（Deployment/Service/Ingress/Job）；配置资源 requests/limits 与 liveness/readiness 探针；搭 RBAC/namespace/ServiceAccount；管理配置与密钥；排查 CrashLoopBackOff/OOMKilled/Pending/ImagePullBackOff；配 HPA 或 PDB；评审 K8s YAML 的安全性与正确性 | [kubernetes-patterns](./02-skill说明文档-附件1.md#kubernetes-patterns) |
| mcp-server-patterns | 用 Node/TypeScript SDK 构建 MCP server：tools/resources/prompts、Zod 校验、stdio vs Streamable HTTP | 实现新 MCP server；加 tools 或 resources；选 stdio vs HTTP；升级 SDK；调试 MCP 注册与传输问题 | [mcp-server-patterns](./02-skill说明文档-附件1.md#mcp-server-patterns) |
| product-capability | 将 PRD 意图/路线图/产品讨论转化为可直接实施的 capability 计划，显式暴露约束、不变量、接口与未决决策 | PRD/路线图/讨论存在但实现约束仍隐式；功能跨多服务/多仓/多团队需 capability 契约；产品意图清晰但架构/数据/生命周期/策略含义仍模糊；资深工程师反复重述同一隐藏假设；需要跨 harness/session 复用的产物 | [product-capability](./02-skill说明文档-附件1.md#product-capability) |
| product-lens | 在动手前验证"为什么"、运行产品诊断、压力测试产品方向，使其在变成实施契约之前经受检验 | 任何功能启动前验证"why"；周度产品评审；在多个功能间纠结时；上线前对用户旅程做 sanity check；把模糊想法转成产品 brief（再交 product-capability 落地） | [product-lens](./02-skill说明文档-附件1.md#product-lens) |
| regex-vs-llm-structured-text | 解析结构化文本时在 regex 与 LLM 之间做选择的决策框架：先用 regex，仅对低置信边界用例加 LLM | 解析有重复模式的结构化文本（题目、表单、表格）；在 regex 与 LLM 间抉择；构建二者混合管线；优化文本处理的成本/准确率权衡 | [regex-vs-llm-structured-text](./02-skill说明文档-附件1.md#regex-vs-llm-structured-text) |

---

## 七、安全·合规（6 个）

Claude Code 配置安全扫描、代码安全审查、安全门禁（gateguard / delivery-gate / safety-guard）、漏洞猎捕——防止破坏性操作与安全风险。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| delivery-gate | Stop hook，在 Claude 结束会话前用确定性检查（文件 mtime、磁盘空间、transcript 正则）拦截，强制复杂任务必须留下学习记录 | 复杂任务（≥3 次 Edit/Write）完成后；防止"ship and forget"导致学习库长期不更新；磁盘临界保护 | [delivery-gate](./02-skill说明文档-附件1.md#delivery-gate) |
| gateguard | PreToolUse hook，强制在 Edit/Write/Bash（含 MultiEdit）前完成具体调查（导入方、数据 schema、用户原话），相比无门禁代理平均提升 +2.25 分 | 修改影响多模块的代码库；处理含特定 schema/日期格式的数据文件；团队要求 AI 代码贴合既有模式；代理倾向猜测而非调查时 | [gateguard](./02-skill说明文档-附件1.md#gateguard) |
| safety-guard | 防止破坏性操作的三模式安全保护（Careful 拦截危险命令、Freeze 锁定目录、Guard 合并两者），用于生产系统或自主代理 | 生产系统操作；代理全自动驾驶（codex -a never）；限制代理只能编辑指定目录；迁移/部署/数据变更等敏感操作 | [safety-guard](./02-skill说明文档-附件1.md#safety-guard) |
| security-bounty-hunter | 猎取可远程触达、具备赏金申报价值的真实漏洞，过滤掉本地-only 或理论性发现 | 扫描仓库寻找可利用漏洞；准备 Huntr/HackerOne 等赏金申报；判断"这个漏洞是否真能拿到赏金"而非"理论上是否安全" | [security-bounty-hunter](./02-skill说明文档-附件1.md#security-bounty-hunter) |
| security-review | 代码安全审查清单（10 大领域 + 部署前清单），覆盖密钥管理、输入校验、SQLi、认证授权、XSS、CSRF、限流、敏感数据、Solana 区块链、依赖安全 | 实现认证/授权；处理用户输入或文件上传；创建 API 端点；处理密钥凭证；实现支付功能；存储/传输敏感数据；集成第三方 API | [security-review](./02-skill说明文档-附件1.md#security-review) |
| security-scan | 扫描 Claude Code 配置（.claude/ 目录）的安全漏洞、误配、注入风险，覆盖 CLAUDE.md、settings.json、MCP、hooks、agent 定义 | 新建 Claude Code 项目；修改 .claude/settings.json、CLAUDE.md、MCP 配置后；提交配置变更前；接入带既有配置的新仓库；定期安全巡检 | [security-scan](./02-skill说明文档-附件1.md#security-scan) |

## 八、性能·成本·基准（10 个）

性能基准测量与优化循环、LLM 成本/Token 预算、上下文预算审计、并行加速、延迟敏感系统——量化和压降 token/延迟/成本。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| benchmark | 测量性能基线、检测 PR 前后回归、对比技术栈方案，含页面/API/构建/前后对比四模式 | PR 前后测性能影响；建立项目性能基线；用户反馈"感觉慢"；上线前达标验证；对比技术栈替代方案 | [benchmark](./02-skill说明文档-附件1.md#benchmark) |
| benchmark-methodology | 将竞争者分析产出的分 tier 竞争者集，按 9 个加权维度打可比较、有证据锚定的 1-5 分（注意：本 skill 属竞争分析，非性能基准） | competitive-platform-analysis 已产出分 tier 竞争者集；需要可比、证据锚定的跨竞争者评分（非直觉排序）；客户战略张力（双轴定义目标空白区）已建立；准备为 competitive-report-structure 产出 profile 卡 | [benchmark-methodology](./02-skill说明文档-附件1.md#benchmark-methodology) |
| benchmark-optimization-loop | 把"让它快 20 倍"或"试 50 种递归优化"转化为有界测量循环，覆盖延迟/吞吐/成本/内存基准 | 用户要求加速某操作；尝试多种变体；递归优化；基准延迟/吞吐/成本；通过重复测量选择最佳实现 | [benchmark-optimization-loop](./02-skill说明文档-附件1.md#benchmark-optimization-loop) |
| context-budget | 审计 Claude Code 会话中跨 agents/skills/MCP/rules 的上下文窗口消耗，识别臃肿与冗余，产出优先级 token 节省建议 | 会话性能迟缓或输出质量下降；近期加了大量 skills/agents/MCP；想知道实际上下文余量；计划新增组件前评估空间；运行 /context-budget 命令 | [context-budget](./02-skill说明文档-附件1.md#context-budget) |
| cost-aware-llm-pipeline | LLM API 成本优化模式集——按任务复杂度路由模型、不可变成本跟踪、窄重试逻辑、prompt 缓存，组合成管道 | 构建调用 LLM API（Claude/GPT）的应用；处理复杂度不一的批量任务；需在 API 花费预算内；优化成本不牺牲复杂任务质量 | [cost-aware-llm-pipeline](./02-skill说明文档-附件1.md#cost-aware-llm-pipeline) |
| cost-tracking | 从本地 ECC cost-tracker 指标日志读取并报告 Claude Code token 用量、花费、预算，按模型/会话/日期分解 | 用户问"花了多少"/"这次会话多少钱"/"token 用量"；提到预算/限额/超支；要按模型/会话/日期分解或导出 CSV | [cost-tracking](./02-skill说明文档-附件1.md#cost-tracking) |
| data-throughput-accelerator | 加速大数据摄入/backfill/导出/ETL/仓库加载/清单补齐/表同步，同时保持数据正确性 | 大数据摄入瓶颈；backfill；导出；ETL；仓库加载；manifest 补齐；表同步——需要"更快且正确" | [data-throughput-accelerator](./02-skill说明文档-附件1.md#data-throughput-accelerator) |
| latency-critical-systems | 延迟敏感系统（实时仪表盘、市场数据、流式代理、执行网关、队列、缓存、HFT 类基础设施）的优化方法，关注新鲜度与 p95 | 实时仪表盘；市场数据；流式代理；执行网关；队列；缓存；HFT 类基础设施——用户在意实时行为/热路径/流式新鲜度/执行速度 | [latency-critical-systems](./02-skill说明文档-附件1.md#latency-critical-systems) |
| parallel-execution-optimizer | 通过并行工作/并发代理/批量工具调用/隔离 worktree/多独立验证通道加速任务，不丢正确性 | 用户要把任务做得更快；repo 检查、文件读、API 检查、浏览器检查、构建/测试通道、部署 readback、多 worktree 实现并行 | [parallel-execution-optimizer](./02-skill说明文档-附件1.md#parallel-execution-optimizer) |
| token-budget-advisor | 在回答前向用户提供响应深度选择（25/50/75/100%），让用户控制 token 消耗（注意：是回答深度控制，非成本预算） | 用户明确要控制响应长度/深度/token 预算；说"token budget"/"token count"/"response length"/"answer depth"/"short version"/"tldr"/"brief"/"exhaustive"等；任何用户想预先选深度/细节级别的场景 | [token-budget-advisor](./02-skill说明文档-附件1.md#token-budget-advisor) |

---

## 九、研究·调研（11 个）

写码前/决策前的调研——多源深度研究、Web/神经搜索、文档查阅、市场研究、学术与专利数据库、代码库 onboarding 与导览。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| deep-research | 用 firecrawl + exa MCP 对任意主题做带引用的多源深度研究，产出含出处与置信度的研究报告 | 用户说"research / deep dive / investigate / what's the current state of"；竞品分析、技术评估、市场规模、尽职调查；任何需要跨多源综合的问题 | [deep-research](./02-skill说明文档-附件1.md#deep-research) |
| documentation-lookup | 通过 Context7 MCP 拉取库/框架的实时文档，替代训练数据，用于 setup 问题、API 参考、代码示例 | 用户问 setup/配置类问题；代码依赖某库（"写个 Prisma 查询…"）；需要 API/参考信息；点名 React/Next.js/Vue/Svelte/Express/Tailwind/Prisma/Supabase 等框架 | [documentation-lookup](./02-skill说明文档-附件1.md#documentation-lookup) |
| exa-search | 通过 Exa MCP 做神经搜索，覆盖 web 内容、代码、公司、人物 | 需要当前 web 信息/新闻；找代码示例/API 文档/技术参考；调研公司/竞品/市场玩家；找领域内的专业档案/人物；任何开发任务的前置背景研究；用户说"search for / look up / find / what's the latest on" | [exa-search](./02-skill说明文档-附件1.md#exa-search) |
| market-research | 做市场调研、竞品分析、投资尽职调查、行业情报，产出带来源且面向决策的摘要 | 研究市场/品类/公司/投资人/技术趋势；构建 TAM/SAM/SOM 估算；比较竞品或相邻产品；外联前准备投资人档案；在 build/投资/进入市场前压测论点 | [market-research](./02-skill说明文档-附件1.md#market-research) |
| research-ops | ECC 研究栈的"操作员包装层"，决定何时/如何组合 exa-search、deep-research、market-research 等子 skill，把重复查询变成监控工作流 | 用户说"research / look up / compare / who should I talk to / what's the latest"；答案依赖当前公开信息；用户已提供证据希望纳入新建议；任务可能反复出现、应转为监控而非一次性查询 | [research-ops](./02-skill说明文档-附件1.md#research-ops) |
| scientific-db-pubmed-database | 直接查 PubMed 与 NCBI E-utilities，做生物医学文献检索、MeSH 查询、PMID 查找、引文获取、API 支撑的文献监控 | 检索 MEDLINE/生命科学文献；用 MeSH、字段标签、日期、文章类型构建 PubMed 查询；查 PMID/摘要/出版元数据/相关引文；做需可复现检索串的系统综述检索；用 Python/shell/HTTP 客户端直连 NCBI E-utilities | [scientific-db-pubmed-database](./02-skill说明文档-附件1.md#scientific-db-pubmed-database) |
| scientific-db-uspto-database | 用 USPTO 专利与商标数据做官方记录查询、PatentSearch 检索、TSDR 核验、所有权转让记录，产出可复现的 IP 研究日志 | 检索已授权专利或预授权公开；查专利申请状态/file wrapper/转让/公开审查历史；查商标状态/文档/转让；构建可复现的现有技术/组合/IP 布局研究日志；与 Google Patents/Lens.org/Semantic Scholar 等次级源交叉核验 | [scientific-db-uspto-database](./02-skill说明文档-附件1.md#scientific-db-uspto-database) |
| scientific-pkg-gget | 用 gget CLI / Python 包跨基因组参考库做快速生物信息查询、序列查找、BLAST 风格检索、富集检查，产出可复现证据日志 | 找 Ensembl ID / 基因元数据 / 转录本 / 序列；不搭本地 pipeline 跑快速 BLAST/BLAT；从 Ensembl 取参考基因组链接与注释；通过单一接口查蛋白结构/通路/癌症/表达/疾病关联；在升级到 Biopython/Snakemake/Nextflow/BLAST+/专用客户端前做可复现的一轮证据收集 | [scientific-pkg-gget](./02-skill说明文档-附件1.md#scientific-pkg-gget) |
| scientific-thinking-literature-review | 系统性文献综述工作流，覆盖检索规划、来源筛选、综合、引文核验与证据日志，适用于学术/生物医学/技术/科学主题 | 构建系统/范围/叙述性文献综述；综合某研究问题的技术现状；找空白/矛盾/未来方向；为论文或报告准备带引用的背景章节；跨同行评审论文、预印本、专利、技术报告比较证据 | [scientific-thinking-literature-review](./02-skill说明文档-附件1.md#scientific-thinking-literature-review) |
| scientific-thinking-scholar-evaluation | 用可复用的评分准则对学术作品（论文/提案/文献综述/方法节）做结构化评估，覆盖证据质量、引文支撑与研究写作反馈 | 评审研究论文/提案/论文章节/文献综述；核查主张是否被引用证据支撑；评估方法/研究设计/分析/局限；比较两篇以上论文的质量或相关性；产出结构化修改反馈 | [scientific-thinking-scholar-evaluation](./02-skill说明文档-附件1.md#scientific-thinking-scholar-evaluation) |
| search-first | 写码前的研究工作流——在动手写自定义代码前先搜现成工具/库/模式，触发 researcher 类 agent | 启动一个很可能已有现成方案的新功能；加依赖或集成；用户说"加 X 功能"且你正要写代码；创建新 utility/helper/抽象之前 | [search-first](./02-skill说明文档-附件1.md#search-first) |

---

## 十、内容创作·媒体·品牌（17 个）

长文写作、多平台内容引擎、品牌声音、幻灯片/视频/动画生成、社交图谱与分发、SEO——内容生产与多渠道运营。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| article-writing | 写博客、指南、教程、newsletter 等长文，匹配示例或品牌声音，避免通用 AI 写作套路 | 起草博客/随笔/发布公告/指南/教程/newsletter；把笔记/转录/研究整理成文；按既有创始人或品牌声音写作；打磨已写长文的结构与节奏 | [article-writing](./02-skill说明文档-附件1.md#article-writing) |
| brand-discovery | 通过多会话结构化访谈发现并阐述品牌身份（目的/定位/受众/人格/声音/叙事/创始人张力），产出可恢复的会话与主品牌手册 90_SYNTHESIS.md | 品牌新建/重塑/需要书面身份参考以简报协作者；预期跨多次会话（数天或数周）；多位创始人需分别访谈再调和；需要可重复方法而非临时聊天；既有品牌资料分散/隐含/依赖创始人需显式化 | [brand-discovery](./02-skill说明文档-附件1.md#brand-discovery) |
| brand-voice | 从真实帖子/文章/邮件/文档/站点文案提炼可复用的写作风格画像（VOICE PROFILE），跨内容与社交工作流保持声音一致 | 用户要在特定声音下写内容或外联；为 X/LinkedIn/邮件/发布公告/threads/产品更新写作；把已知作者语气适配到多渠道；需要可复用风格系统而非一次性模仿 | [brand-voice](./02-skill说明文档-附件1.md#brand-voice) |
| competitive-platform-analysis | 在任何基准测评开始前，界定、分类、打分筛选竞争对手集合——决定谁算竞争对手、属于哪个层级、从哪些来源挖掘；三技能竞争管线第一步，先于 benchmark-methodology | 即将启动竞争基准测评需先定义对手集；拿不准 Direct/Adjacent/Aspirational 分层；市场格局报告需要可辩护的精简范围；已有定位简报想找出谁争夺该位置；运行 benchmark-methodology 之前的第一步 | [competitive-platform-analysis](./02-skill说明文档-附件1.md#competitive-platform-analysis) |
| competitive-report-structure | 在 benchmark-methodology 产出已打分的对手画像卡之后，把发现组装成决策级报告：市场格局图、对手画像、基准矩阵、白地分析、战略建议、团队对齐触发问题；三技能竞争管线终点 | 所有对手画像卡已完成并准备组装；需向创始人/领导团队/董事会呈现竞争发现；报告必须驱动决策（与谁竞争、如何竞争、护城河在哪）而非仅记录格局；准备可审计可辩护的客户交付物 | [competitive-report-structure](./02-skill说明文档-附件1.md#competitive-report-structure) |
| content-engine | 为 X、LinkedIn、TikTok、YouTube、newsletter 及多平台复用创作原生平内容系统——社交帖、threads、脚本、内容日历，或把单一源资产干净地适配到多平台 | 写 X 帖或 threads；起草 LinkedIn 帖或发布公告；为短视频或 YouTube 解说写脚本；把文章/播客/演示/文档/内部笔记转为公开内容；围绕产品/洞见/叙事构建发布序列或持续内容系统 | [content-engine](./02-skill说明文档-附件1.md#content-engine) |
| content-hash-cache-pattern | 用 SHA-256 内容哈希缓存高成本文件处理结果（PDF 解析、文本抽取、图像分析）——与路径无关、内容变化自动失效，附服务层分离 | 构建文件处理管线（PDF/图像/文本抽取）；处理成本高且同一文件反复处理；需要 --cache/--no-cache CLI 选项；想给既有纯函数加缓存而不改动它们 | [content-hash-cache-pattern](./02-skill说明文档-附件1.md#content-hash-cache-pattern) |
| fal-ai-media | 通过 fal.ai MCP 统一生成图像/视频/音频——文生图（Nano Banana）、文/图生视频（Seedance/Kling/Veo 3）、文生语音（CSM-1B）、视频生音频（ThinkSound） | 用户想从文本生成图像；从文本或图像生成视频；生成语音/音乐/音效；任何媒体生成任务；用户说"生成图像""做视频""文生语音""做个缩略图"等 | [fal-ai-media](./02-skill说明文档-附件1.md#fal-ai-media) |
| frontend-slides | 从零创建或把 PowerPoint 转成动画丰富、零依赖的 HTML 演示文稿，通过视觉探索帮非设计师发现美学（而非抽象选择） | 创建演讲/路演/工作坊/内部演示 deck；把 .ppt/.pptx 转成 HTML 演示；改进既有 HTML 演示的布局/动效/排版；与尚不知自己设计偏好的用户探索演示风格 | [frontend-slides](./02-skill说明文档-附件1.md#frontend-slides) |
| manim-video | 用 Manim 构建可复用的技术讲解动画——概念图、工作流、架构图、系统图、产品演示，必要时交接给更广的 ECC 视频栈 | 用户要技术讲解动画；概念是图/工作流/架构/指标推进/系统图；想要用于 X 或落地页的短产品/发布讲解；视觉应精准而非泛泛电影感 | [manim-video](./02-skill说明文档-附件1.md#manim-video) |
| marketing-campaign | 端到端营销战役规划与执行——受众研究、定位、战役角度、落地页文案、邮件序列、社交帖、广告文案、短视频脚本、内容日历；作为多渠道产品发布的编排层 | 规划产品或功能发布；从单一产品简报构建全套内容套件；在写任何文案前定义定位与战役角度；跨渠道编排多种内容类型；审核文案的转化质量与品牌一致性 | [marketing-campaign](./02-skill说明文档-附件1.md#marketing-campaign) |
| openclaw-persona-forge | 为 OpenClaw AI Agent 锻造完整龙虾灵魂方案——身份定位、SOUL.md 灵魂描述、角色化底线规则、名字和头像生图提示词；按偏好或随机抽卡输出 | 从零创建 OpenClaw 龙虾灵魂/角色设定/SOUL.md/IDENTITY.md；通过引导式问答或抽卡模式快速得到完整 persona 方案；已有粗糙设定但缺名字/边界规则/头像提示词/成套输出文件 | [openclaw-persona-forge](./02-skill说明文档-附件1.md#openclaw-persona-forge) |
| remotion-video-creation | Remotion（用 React 做视频）的最佳实践，29 条领域规则覆盖 3D/动画/音频/字幕/图表/转场等 | 只要涉及 Remotion 代码即用此 skill 获取领域知识；需要用 React 编程式生成视频、合成 UI、加字幕、做转场、嵌图表、Three.js/Lottie 等场景 | [remotion-video-creation](./02-skill说明文档-附件1.md#remotion-video-creation) |
| seo | 审计、规划并实施 SEO 改进——技术 SEO、页内优化、结构化数据、Core Web Vitals、内容策略；提升搜索可见性 | 审计可抓取性/可索引性/canonical/重定向；改进 title 标签/meta description/heading 结构；添加或验证结构化数据；改进 Core Web Vitals；做关键词研究并把关键词映射到 URL；规划内链或 sitemap/robots 改动 | [seo](./02-skill说明文档-附件1.md#seo) |
| social-graph-ranker | 加权社交图谱排名引擎——用于 X 与 LinkedIn 的暖引荐发现、桥分值、网络缺口分析 | 想按引荐价值给既有互关/联系人排名；想映射到目标列表的暖路；测一阶/二阶桥价值；决定哪些目标该走暖引荐而非冷启动外联；想独立于 lead-intelligence 或 connections-optimizer 理解图谱数学 | [social-graph-ranker](./02-skill说明文档-附件1.md#social-graph-ranker) |
| video-editing | AI 辅助视频编辑工作流——剪切/结构化/增强真实素材；六层管线从原始素材经 FFmpeg/Remotion/ElevenLabs/fal.ai 到 Descript/CapCut 终抛光 | 编辑/剪切/结构化视频素材；把长录像转短视频；从原始捕获做 vlog/教程/演示；给既有视频加叠层/字幕/音乐/旁白；为 YouTube/TikTok/Instagram 重新构图；用户说"编辑视频""剪素材""做 vlog""视频工作流" | [video-editing](./02-skill说明文档-附件1.md#video-editing) |
| videodb | 视频与音频的"感知+记忆+行动"平台——桌面会话捕获与实时上下文、视频摄取与流化、索引与搜索、时间线编辑、直播监控与告警 | 桌面感知：启停桌面会话（屏+麦克风+系统音频）、流式实时上下文与会话记忆、实时告警、会话摘要与可搜索时间线；视频摄取与流：从文件/URL/RTSP 取流返回可播放链接、转码归一化（codec/bitrate/fps/分辨率/宽高比）；索引与搜索：建视觉/口述/关键词索引、按时间戳搜瞬间并自动剪辑；时间线编辑：字幕生成/翻译/烧录、文本图片品牌叠层、背景音乐/旁白/配音、程序化合成与导出；直播 RTSP 与监控：连 RTSP 流、实时视听理解并发事件告警 | [videodb](./02-skill说明文档-附件1.md#videodb) |

---

## 十一、外部服务集成·运维 Ops（18 个）

GitHub/Jira/Linear/Google Workspace/Stripe/Mailtrap/X 等外部服务的操作工作流，邮件/消息/通知统一处理，仓库执行与发布——把外部系统纳入 ECC 工作流。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| connections-optimizer | 以 review-first 方式重整 X 与 LinkedIn 网络，输出清理队列、加关注建议和按渠道拟稿的暖路径外联 | 用户想清理 X following、重整关注/连接关系、寻找暖路径外联、说出"清理我的人脉""我该取关谁"时 | [connections-optimizer](./02-skill说明文档-附件1.md#connections-optimizer) |
| crosspost | 多平台内容分发（X/LinkedIn/Threads/Bluesky），按平台约束改写、绝不发同一份拷贝 | 想跨平台发布同一观点、launch/update/essay 需要平台化版本、说"crosspost""post this everywhere""为 X 和 LinkedIn 改写" | [crosspost](./02-skill说明文档-附件1.md#crosspost) |
| customer-billing-ops | 操作 Stripe 等计费工作流：订阅、退款、流失分诊、portal 恢复、套餐分析 | 客户称计费出错/要退款/无法取消；排查重复订阅、误收费、续费失败、流失风险；审查套餐构成；创建/验证计费门户流程；审计涉及订阅/发票/退款的客诉 | [customer-billing-ops](./02-skill说明文档-附件1.md#customer-billing-ops) |
| email-ops | evidence-first 邮箱分诊、起草、发送验证与 sent-mail 闭环 | 用户要整理收件箱/归档低信号邮件；要草稿、回复或新外联；想知道某邮件是否已发；需要证明用了哪个账户/线程/Sent 条目 | [email-ops](./02-skill说明文档-附件1.md#email-ops) |
| github-ops | 用 gh CLI 管理 GitHub 仓库运营：issue 分诊、PR 管理、CI/CD 调试、release、安全监控 | 分诊 issue（分类/打标/去重/回复）；管 PR（评审状态、CI、stale、合并就绪）；调试 CI/CD；准备 release 与 changelog；监控 Dependabot/安全告警；管理开源贡献者体验 | [github-ops](./02-skill说明文档-附件1.md#github-ops) |
| google-workspace-ops | 把 Google Drive/Docs/Sheets/Slides 当作一个工作流 surface 操作：查找、摘要、编辑、迁移、清理 | 找文件/表/幻灯片并就地更新；整合散在 Drive 的计划/追踪/笔记/客户清单；清理或重构共享表格；导入/修复/重排 Slides；从 Docs/Sheets/Slides 产出决策摘要 | [google-workspace-ops](./02-skill说明文档-附件1.md#google-workspace-ops) |
| jira-integration | 通过 MCP（mcp-atlassian）或直接 REST 检索 Jira ticket、分析需求、更新状态、评论、转换 issue | 拉 ticket 理解需求；抽取可测验收标准；加进度评论；转换状态（To Do→In Progress→Done）；链接 MR/分支；JQL 查询 | [jira-integration](./02-skill说明文档-附件1.md#jira-integration) |
| knowledge-ops | 跨多层存储（本地文件、Claude Memory、MCP memory、向量库、KB repo、Supabase）的知识库管理、摄入、同步、去重、检索 | 保存信息到 KB；摄入文档/对话/数据；跨系统同步知识；去重或整理现有知识；说"save this to KB""sync knowledge""ingest this" | [knowledge-ops](./02-skill说明文档-附件1.md#knowledge-ops) |
| lead-intelligence | AI 原生的 lead 智能与外联 pipeline，替代 Apollo/Clay/ZoomInfo：信号评分、互关排序、暖路径发现、源派生语音建模、按渠道外联 | 在特定行业找 lead/潜在客户；为合作/销售/融资建外联名单；研究该找谁及最佳路径；给联系人评分/排序；找暖介绍路径 | [lead-intelligence](./02-skill说明文档-附件1.md#lead-intelligence) |
| mailtrap-email-integration | 用 Mailtrap Email API 集成事务邮件发送：沙箱测试、域名验证、API 鉴权 | 实现"发邮件"功能（注册确认、密码重置、通知、收据）；调试 dev/staging 邮件不达；首次集成邮件发送；评审无沙箱隔离的直调 API 代码 | [mailtrap-email-integration](./02-skill说明文档-附件1.md#mailtrap-email-integration) |
| messages-ops | evidence-first 实时消息工作流：读短信/DM、恢复一次性验证码、回复前检视线程、证明查的是哪个消息源 | 说"读我的消息""check texts""看 DM""找验证码"；任务依赖实时线程或最近发到本地消息面的验证码；要证明查的是哪个源/线程 | [messages-ops](./02-skill说明文档-附件1.md#messages-ops) |
| opensource-pipeline | 三阶段 pipeline 安全开源私有项目：fork（剥密）→ sanitize（验证干净）→ package（CLAUDE.md+setup.sh+README），链接 3 个 agent | 说"open source this project""make this public"；准备私有 repo 公开；推 GitHub 前剥密；调 /opensource fork/verify/package | [opensource-pipeline](./02-skill说明文档-附件1.md#opensource-pipeline) |
| project-flow-ops | 在 GitHub（公共）与 Linear（内部执行）之间运营执行流：分诊 issue/PR、链接活跃工作、保持两端一致 | 分诊 PR/issue backlog；决定进 Linear 还是留 GitHub；链接活跃 GitHub 工作到内部执行道；将 PR 分为 merge/port-rebuild/close/park；审计评审评论/CI/stale 是否阻塞执行 | [project-flow-ops](./02-skill说明文档-附件1.md#project-flow-ops) |
| social-publisher | 通过 SocialClaw 跨 13 平台 agent 驱动调度与发布社交帖子 | 发内容到 X/LinkedIn/Instagram/TikTok 等；跨平台批量排期；上传媒体；上线前校验排期；监控发布运行状态与送达分析 | [social-publisher](./02-skill说明文档-附件1.md#social-publisher) |
| terminal-ops | evidence-first 仓库执行工作流：跑命令、检查 repo、调试 CI 失败、推送窄修复，附确切执行证明 | 说"fix/debug/run this/check the repo/push it"；任务依赖命令输出/git 状态/测试结果/本地修复；需区分"本地改了/本地验了/已提交/已推送" | [terminal-ops](./02-skill说明文档-附件1.md#terminal-ops) |
| uncloud | 用 uc CLI 管理 Uncloud 集群：部署服务、配置 Caddy ingress、加静态代理路由、发布端口、扩缩容、查日志、管机器与卷 | 引导/加入机器（uc machine）；从 Compose 文件部署（uc deploy）；发布 HTTP/HTTPS/TCP/UDP 端口；配 Caddy ingress（x-caddy/x-ports/--caddyfile）；路由非集群设备经集群代理；查日志/服务状态/卷/DNS/机器放置 | [uncloud](./02-skill说明文档-附件1.md#uncloud) |
| unified-notifications-ops | 把通知当作一个 ECC 原生工作流跨 GitHub/Linear/桌面/hooks/通信面运营：告警路由、去重、升级、收件箱坍缩 | 想要跨 GitHub/Linear/本地 hook/桌面告警/聊天/邮件的统一通知道；CI 失败/评审请求/issue 更新散落各处；现状只产噪音不产动作；要合并重叠通知分支 | [unified-notifications-ops](./02-skill说明文档-附件1.md#unified-notifications-ops) |
| x-api | X/Twitter API 集成：发推/发 thread、读时间线、搜索、分析，覆盖 OAuth 鉴权、速率限制、平台原生内容发布 | 想编程发推/thread；读时间线/提及/用户数据；搜 X 内容/趋势；建 X 集成或 bot；分析与跟踪互动；说"post to X""tweet""X API" | [x-api](./02-skill说明文档-附件1.md#x-api) |

---

## 十二、网络·Homelab（11 个）

家庭/实验网络规划（VLAN/DNS/WireGuard/Pi-hole）、路由器交换机配置与诊断（BGP/接口健康/配置校验）、Cisco IOS 与 Netmiko SSH 自动化、Flox 可复现环境。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| cisco-ios-patterns | Cisco IOS/IOS-XE 评审模式：show 命令、配置层级、wildcard mask、ACL 位置、接口卫生、变更窗口验证 | 计划变更前评审 IOS 配置；为排障选择只读 show 命令；核对 ACL wildcard mask 与接口方向；解释 global/interface/line 配置模式；验证变更是否落入 running-config 并已保存 | [cisco-ios-patterns](./02-skill说明文档-附件1.md#cisco-ios-patterns) |
| flox-environments | 基于 Nix 的声明式、跨平台（macOS/Linux）可复现开发环境 | 需系统级包（编译器/数据库/openssl 等原生库）；多工具共存（Python+PG+Redis+Node）；跨平台一致；团队锁版本；AI agent 需项目内无 sudo 装工具；解决"works on my machine" | [flox-environments](./02-skill说明文档-附件1.md#flox-environments) |
| homelab-network-readiness | 家庭/小型实验网变更前的就绪检查清单（VLAN 分段、本地 DNS 过滤、WireGuard 式远程访问） | 拟将扁平网拆为 trusted/IoT/guest/server/management VLAN；迁移 DHCP 客户端到 Pi-hole/AdGuard/Unbound；新增 WireGuard/Tailscale/ZeroTier/OpenVPN；评审变更是否会把自己锁在网关/交换机/AP/DNS/VPN 之外 | [homelab-network-readiness](./02-skill说明文档-附件1.md#homelab-network-readiness) |
| homelab-network-setup | 家庭/小型实验网络规划：网关、交换机、AP、IP 段、DHCP 预留、DNS、布线与常见新手错误 | 新装或重构 ISP-router-only 网络；选网关/交换机/AP 角色；设计 IP 段/DHCP 范围/静态预留/DNS；为未来 VLAN/Pi-hole/NAS/服务器/VPN 做准备；排查双 NAT/不稳定 Wi-Fi/服务器地址漂移 | [homelab-network-setup](./02-skill说明文档-附件1.md#homelab-network-setup) |
| homelab-pihole-dns | Pi-hole 安装、屏蔽列表管理、DNS-over-HTTPS、DHCP 集成、本地 DNS 记录与 DNS 故障排查 | 在树莓派/Linux 上装 Pi-hole；将 Pi-hole 配为家网 DNS；管理屏蔽列表；配 DoH 上游；建本地 DNS 记录（nas.home.lan 等）；排查装 Pi-hole 后设备断网；Pi-hole 兼作/替代 DHCP | [homelab-pihole-dns](./02-skill说明文档-附件1.md#homelab-pihole-dns) |
| homelab-vlan-segmentation | 家庭网络按 IoT/guest/trusted/server/management 分 VLAN 隔离（UniFi、pfSense/OPNsense、MikroTik），含 trunk、防火墙规则、SSID 映射 | 首次给家网配 VLAN；隔离 IoT（智能灯/摄像头/TV）与可信设备；建不能触达内网的 guest Wi-Fi；向新人解释 VLAN；配 trunk/access 端口与 SSID-to-VLAN；排查 inter-VLAN 路由或防火墙规则 | [homelab-vlan-segmentation](./02-skill说明文档-附件1.md#homelab-vlan-segmentation) |
| homelab-wireguard-vpn | WireGuard VPN 服务端搭建、peer 配置、密钥生成、split tunnel vs full tunnel、移动/笔记本远程访问 | 在树莓派/Linux/pfSense/路由器上搭 WireGuard 服务端；生成 keypair 并写 peer 配置；从手机/笔记本远程接入家网；解释 split（只走路由家网）vs full（全走 VPN）；排查连不上的 WireGuard；批量生成 peer 配置 | [homelab-wireguard-vpn](./02-skill说明文档-附件1.md#homelab-wireguard-vpn) |
| netmiko-ssh-automation | 安全的 Python Netmiko 模式：只读采集、有界批量 SSH、TextFSM 解析、受守卫的配置变更、超时与异常处理 | 用 Netmiko 跨路由/交换/防火墙采 show 输出；写小型审计脚本（接口/路由/配置证据）；给网络 SSH 脚本加超时与异常；有模板时用 TextFSM 解析；评审即将触碰生产设备的自动化 | [netmiko-ssh-automation](./02-skill说明文档-附件1.md#netmiko-ssh-automation) |
| network-bgp-diagnostics | 只读诊断型 BGP 排障：邻居状态、路由交换、前缀策略、AS path 检查、安全证据采集 | 邻居卡在 Idle/Connect/Active/OpenSent/OpenConfirm；会话 Established 但缺路由；route-map/prefix-list/max-prefix/AS path 可能过滤；需变更前后证据；评审解析 BGP summary 的自动化 | [network-bgp-diagnostics](./02-skill说明文档-附件1.md#network-bgp-diagnostics) |
| network-config-validation | 路由器/交换机配置的部署前校验：危险命令、重复地址、子网重叠、过期引用、管理面风险、IOS 式安全卫生 | 部署前评审 Cisco IOS/IOS-XE 片段；审计脚本/模板生成的配置；查危险命令/重复 IP/子网重叠；查 ACL/route-map/prefix-list/interface 引用未定义；为网络自动化写轻量 pre-flight | [network-config-validation](./02-skill说明文档-附件1.md#network-config-validation) |
| network-interface-health | 诊断接口错误、丢包、CRC、双工不匹配、flapping、速率协商问题与计数器趋势（路由器/交换机/Linux 主机） | 主机或 VLAN 丢包/延迟尖刺/间歇性不可达；交换机/路由器接口出现 CRC/runts/giants/drops/resets/flap；需对比链路两端再换硬件；变更窗口需前后接口计数器证据；监控 ifInErrors/ifOutErrors/ifOutDiscards 上升 | [network-interface-health](./02-skill说明文档-附件1.md#network-interface-health) |

---

## 十三、前端体验·设计系统·Apple 平台（23 个）

可访问性、设计系统与方向、动效（motion 系列）、UI 质感、iOS 26 Liquid Glass、Apple FoundationModels 与 Swift 并发、图标/截图/演示生成、Vue 转换——前端/移动端的视觉、交互与平台能力。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| accessibility | 按 WCAG 2.2 Level AA 设计、实现并审计无障碍数字产品，生成 Web ARIA 与 iOS/Android traits | 为 Web/iOS/Android 定义组件规格；审计既有代码的无障碍缺陷；实现 WCAG 2.2 新标准（目标尺寸、焦点外观）；把设计需求映射为 ARIA 角色与 traits | [accessibility](./02-skill说明文档-附件1.md#accessibility) |
| blender-motion-state-inspection | 在截图不足以判断时，检查 Blender 角色、绑定、姿态、动画重定向、地面接触、朝向、模型与动作对齐 | 角色看起来扭曲/镜像/塌陷/偏移/滑步；需判断导入的 avatar/armature/重定向动作是否符合预期姿态；需将渲染证据与骨骼/包围盒/接触/朝向等结构化事实比对；要判定模型是角色、道具、代理网格、控制绑定还是损坏导入 | [blender-motion-state-inspection](./02-skill说明文档-附件1.md#blender-motion-state-inspection) |
| dashboard-builder | 为 Grafana/SigNoz 等平台构建能回答运维真实问题的监控仪表盘，而非虚荣面板 | "建一个 Kafka 监控面板"；"为 Elasticsearch 做 Grafana 仪表盘"；"为该服务做 SigNoz 仪表盘"；"把这份指标列表变成可运维的仪表盘" | [dashboard-builder](./02-skill说明文档-附件1.md#dashboard-builder) |
| design-system | 生成或审计设计系统，检查视觉一致性，审查触及样式的 PR | 新项目需要设计系统；审计既有代码库的视觉一致性；改版前摸底；UI 看着"不对劲"但说不清；审查改样式的 PR | [design-system](./02-skill说明文档-附件1.md#design-system) |
| foundation-models-on-device | Apple FoundationModels 框架的端侧 LLM 集成——文本生成、@Generable 引导生成、工具调用、快照流式（iOS 26+） | 用 Apple Intelligence 构建端侧 AI 功能；无需云端生成/摘要文本；从自然语言抽取结构化数据；为领域专属 AI 动作实现工具调用；流式结构化响应驱动实时 UI；需要隐私保护（数据不离设备） | [foundation-models-on-device](./02-skill说明文档-附件1.md#foundation-models-on-device) |
| frontend-a11y | React/Next.js 无障碍模式——语义化 HTML、ARIA、表单标注、键盘导航、焦点管理、屏幕阅读器支持 | 构建或评审表单组件（input/select/textarea）；创建交互元素（modal/dropdown/tooltip/tabs）；在 div/span 上用 onClick；添加 aria-* 属性；实现键盘导航或焦点管理；收到 CodeRabbit/ESLint a11y 的评审反馈；构建需支持屏幕阅读器的组件 | [frontend-a11y](./02-skill说明文档-附件1.md#frontend-a11y) |
| frontend-design-direction | 为生产级 UI 设定 ECC 专属的前端设计方向，让界面有目的、打磨到位、贴合产品领域 | 用户要构建网页/应用/仪表盘/组件/落地页/视觉工具等任意 Web UI；要让界面更精致、独特、少 generic；需要做视觉层级、字体、色彩、动效、布局、交互选择；当前 UI 能用但显得扁平/模板化/与受众错配 | [frontend-design-direction](./02-skill说明文档-附件1.md#frontend-design-direction) |
| inherit-legacy-style | 防止 AI 在手写遗留项目上产生"风格漂移"——扫描 4 维元架构隐式约定、与用户逐项消解冲突、固化成可执行的 .ai-style-rules.md，全程语言/框架无关 | 用户输入 /inherit-legacy-style；要让 AI 接入手写遗留项目；担心 AI 生成代码偏离既有项目约定；想抽取并成文化项目的隐式编码规则 | [inherit-legacy-style](./02-skill说明文档-附件1.md#inherit-legacy-style) |
| ios-icon-gen | 从 SF Symbols（5000+ Apple 原生）或 Iconify API（275k+ 开源图标，200+ 集合）生成 Xcode asset catalog 用的 PNG 图标 imageset | 为 iOS/macOS Xcode 项目生成图标资产；跨开源集合搜索图标；创建 imageset（1x/2x/3x）；用生产级资产替换占位图标；匹配 Xcode 项目既有图标风格 | [ios-icon-gen](./02-skill说明文档-附件1.md#ios-icon-gen) |
| liquid-glass-design | iOS 26 Liquid Glass 设计系统——含模糊、反射、交互 morphing 的动态玻璃材质，覆盖 SwiftUI/UIKit/WidgetKit | 为 iOS 26+ 构建或更新应用采用新设计语言；实现玻璃风格按钮/卡片/工具栏/容器；创建玻璃元素间的 morphing 过渡；给 widget 应用 Liquid Glass；把既有模糊/材质迁移到新 Liquid Glass API | [liquid-glass-design](./02-skill说明文档-附件1.md#liquid-glass-design) |
| make-interfaces-feel-better | 应用具体的设计工程细节让界面感觉打磨到位——间距、字体、边框、阴影、动效、命中区、图标、文本换行、交互状态 | 用户说 UI 感觉 off/扁平/通用/拥挤/跳动/未完成；在构建控件/卡片/列表/仪表盘/导航/表单/工具栏；组件需要 hover/active/focus/enter/exit/loading/empty 状态；前端评审需要具体的前后对比建议 | [make-interfaces-feel-better](./02-skill说明文档-附件1.md#make-interfaces-feel-better) |
| motion-advanced | React/Next.js 高级动效模式——拖放、手势、文字动画、SVG path 绘制、自定义 hook、useAnimate 命令式序列、加载器及完整 API 决策树 | 构建拖拽消失 sheet/滑动手势/可重排列表；逐词/逐字/计数器文字动画；SVG path 绘制/图标 morph/环形进度；写自定义动画 hook（useScrollReveal/磁吸按钮/光标跟随）；用 useAnimate 编排多步命令式序列；构建 spinner/shimmer 骨架/pulse/按钮加载态；motion-patterns 不够用时 | [motion-advanced](./02-skill说明文档-附件1.md#motion-advanced) |
| motion-foundations | React/Next.js 用 motion/react 的动效 token、spring 预设、性能规则、设备适配、无障碍强制与 SSR 安全——基础层，所有其他 motion skill 依赖它 | 从零构建任何动画组件；设置 token/spring 预设/easing；实现 prefers-reduced-motion 支持；调试动画 initial 态的 hydration mismatch；评估某动画是否该存在 | [motion-foundations](./02-skill说明文档-附件1.md#motion-foundations) |
| motion-patterns | React/Next.js 生产就绪的常用 UI 动画模式——button/modal/toast/stagger/page transition/exit/scroll/layout，基于 motion-foundations 的 token 与 spring | 动画按钮/卡片/模态/toast 通知；构建带 stagger 的列表入场；Next.js App Router 页面过渡；为条件渲染加入场出场；实现滚动揭示/滚动联动进度/粘性叙事；构建展开卡片/手风琴/共享元素过渡 | [motion-patterns](./02-skill说明文档-附件1.md#motion-patterns) |
| motion-ui | React/Next.js 生产级 UI 动效系统，聚焦性能、无障碍与可用性而非装饰，覆盖 token/性能规则/设备适配/无障碍/SSR/调试 | 动画用于引导注意（onboarding/关键动作）、传达状态（loading/success/error/过渡）、保持空间连续（布局变化/导航）；交互组件、状态过渡、导航与布局连续 | [motion-ui](./02-skill说明文档-附件1.md#motion-ui) |
| react-performance | React/Next.js 性能优化模式（改编自 Vercel Engineering react-best-practices），按 8 个优先级类别组织 70+ 规则——waterfall/bundle/server/client-fetch/rerender/rendering/js/advanced | 编写或评审 React/Next.js 性能代码；诊断慢页面加载/慢交互/客户端高 CPU；审计 bundle 体积或 Lighthouse Core Web Vitals 回归；消除 Server Components/API 路由的 waterfall；减少客户端 re-render；优化长列表/动画/hydration；审计触及 app//pages//components//数据层的 PR | [react-performance](./02-skill说明文档-附件1.md#react-performance) |
| swift-actor-persistence | 用 Swift actor 实现线程安全的数据持久化——内存缓存+文件后端，编译期消除数据竞争 | 在 Swift 5.5+ 构建数据持久层；需要线程安全访问共享可变状态；想消除手动同步（locks/DispatchQueues）；构建 offline-first 带本地存储的应用 | [swift-actor-persistence](./02-skill说明文档-附件1.md#swift-actor-persistence) |
| swift-concurrency-6-2 | Swift 6.2 Approachable Concurrency——默认单线程、@concurrent 显式后台卸载、isolated conformances 处理 MainActor 类型协议 | 从 Swift 5.x 或 6.0/6.1 迁移到 6.2；解决数据竞争安全编译错误；设计 MainActor 为中心的应用架构；把 CPU 密集工作卸到后台线程；为 MainActor 隔离类型实现协议遵循；在 Xcode 26 启用 Approachable Concurrency 构建设置 | [swift-concurrency-6-2](./02-skill说明文档-附件1.md#swift-concurrency-6-2) |
| swift-protocol-di-testing | 用基于协议的依赖注入让 Swift 代码可测——以聚焦小协议 mock 文件系统/网络/外部 API，配合 Swift Testing | 写访问文件系统/网络/外部 API 的 Swift 代码；需在不触发真实失败的情况下测试错误处理路径；构建跨环境（app/test/SwiftUI preview）工作的模块；用 Swift 并发（actors/Sendable）设计可测架构 | [swift-protocol-di-testing](./02-skill说明文档-附件1.md#swift-protocol-di-testing) |
| swiftui-patterns | SwiftUI 架构模式——@Observable 状态管理、视图组合、导航、性能优化与现代 iOS/macOS UI 最佳实践 | 构建 SwiftUI 视图并管理状态（@State/@Observable/@Binding）；用 NavigationStack 设计导航流；结构化 ViewModel 与数据流；为列表与复杂布局优化渲染；用 environment 值与依赖注入 | [swiftui-patterns](./02-skill说明文档-附件1.md#swiftui-patterns) |
| taste | 给音乐视频与短视频编辑加一层创意方向（taste）——angelcore/cloud-trance/hyperpop 视觉家族的命名流派美学词汇表、mood+color+light 系统、节拍同步剪辑语法，并串联 ECC 视频 skill 形成一条生产管线 | 构建音乐视频/歌词视频/fancam/visualizer；做短篇 edit/reel 且"感觉"比信息重要；驱动 AI b-roll 生成（fal.ai/Veo/Kling）需要连贯方向而非一次性氛围；做 moodboard 或在渲染前选视觉流派；用户说"taste"/"make it feel like X"/"angelcore"/"cloud trance"/"hyperpop edit"/"Bladee"/"dreamcore"或点名参考；当前编辑能看但显扁平/通用/AI-slop/风格不连贯 | [taste](./02-skill说明文档-附件1.md#taste) |
| ui-demo | 用 Playwright 录制精致的 UI 演示视频，产出带可见光标、自然节奏、专业感的 WebM 视频 | 用户要"演示视频"/"屏幕录制"/"walkthrough"/"tutorial"；要视觉展示某功能或工作流；需要文档/onboarding/向利益相关者汇报用的视频 | [ui-demo](./02-skill说明文档-附件1.md#ui-demo) |
| ui-to-vue | 把 UI 截图或设计导出图批量转换为 Vue 3 组件代码（尤适合 Vant/Element Plus/Ant Design Vue） | 用户提供设计截图或设计导出图目录；目标应用是 Vue 3；需要页面组件/共享组件/路由接线的初稿；用户指定 Vant/Element Plus/Ant Design Vue 作为组件库 | [ui-to-vue](./02-skill说明文档-附件1.md#ui-to-vue) |

---

## 十四（1）Python 生态与数据库（14 个）

Python 惯用法与测试、FastAPI/Django（含 Celery、安全、TDD、验证）、PyTorch；数据库模式：PostgreSQL/MySQL/Redis/ClickHouse/Prisma——Python 后端 + 持久层模式。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| python-patterns | Pythonic 惯用法、PEP 8、类型提示与构建稳健可维护 Python 应用的最佳实践 | 编写新 Python 代码；评审/重构 Python 代码；设计 Python 包/模块 | [python-patterns](./02-skill说明文档-附件1.md#python-patterns) |
| python-testing | 基于 pytest 的 Python 测试策略、TDD 方法论、fixture、mock、参数化与覆盖率要求 | 编写新 Python 代码（遵循 TDD）；设计测试套件；评审覆盖率；搭建测试基础设施 | [python-testing](./02-skill说明文档-附件1.md#python-testing) |
| fastapi-patterns | FastAPI 生产级最佳实践：项目结构、Pydantic v2 schema、依赖注入、async、认证/授权、事务 Service 层、httpx+pytest 测试 | 构建现代 FastAPI 应用；设计异步 API；配置认证与授权；编写 service 层；搭建测试基础设施 | [fastapi-patterns](./02-skill说明文档-附件1.md#fastapi-patterns) |
| django-celery | Django + Celery 异步任务模式：配置、任务设计、Beat 调度、重试、canvas 工作流、监控与测试 | 添加后台作业/异步处理；周期/定时任务；从请求周期卸载慢操作（邮件、PDF、API）；Celery Beat；调试任务失败/重试/队列积压；编写任务测试 | [django-celery](./02-skill说明文档-附件1.md#django-celery) |
| django-patterns | Django 架构模式：DRF REST API、ORM 最佳实践、缓存、信号、中间件与生产级应用 | 构建 Django web 应用；设计 DRF API；ORM/模型设计；项目结构搭建；实现缓存/信号/中间件 | [django-patterns](./02-skill说明文档-附件1.md#django-patterns) |
| django-security | Django 安全最佳实践：认证、授权、CSRF、SQL 注入防护、XSS 防护、安全部署配置 | 配置 Django 认证与授权；实现权限/角色；配置生产安全设置；安全评审；部署到生产 | [django-security](./02-skill说明文档-附件1.md#django-security) |
| django-tdd | Django TDD 测试策略：pytest-django、factory_boy、mocking、覆盖率、DRF API 测试 | 编写新 Django 应用；实现 DRF API；测试 model/view/serializer；搭建 Django 测试基础设施 | [django-tdd](./02-skill说明文档-附件1.md#django-tdd) |
| django-verification | Django 项目验证循环：迁移、lint、覆盖率测试、安全扫描、部署就绪检查（PR/发布前） | 开 Django PR 前；模型/迁移/依赖大改后；staging/生产部署前验证；运行完整 环境→lint→test→security→deploy pipeline；验证迁移安全性与覆盖率 | [django-verification](./02-skill说明文档-附件1.md#django-verification) |
| pytorch-patterns | PyTorch 深度学习模式与最佳实践：稳健高效可复现的训练 pipeline、模型架构与数据加载 | 编写新 PyTorch 模型/训练脚本；评审深度学习代码；调试训练循环/数据 pipeline；优化 GPU 显存/训练速度；搭建可复现实验 | [pytorch-patterns](./02-skill说明文档-附件1.md#pytorch-patterns) |
| postgres-patterns | PostgreSQL 数据库模式：查询优化、schema 设计、索引与安全（基于 Supabase 最佳实践） | 编写 SQL 查询/迁移；设计 schema；排查慢查询；实现行级安全（RLS）；配置连接池 | [postgres-patterns](./02-skill说明文档-附件1.md#postgres-patterns) |
| mysql-patterns | MySQL 与 MariaDB 的 schema、查询、索引、事务、复制、连接池生产模式 | 设计 MySQL/MariaDB 表/索引/约束；评审大表迁移；调试慢查询/锁等待/死锁/连接耗尽；加 keyset 分页/upsert/全文搜索/JSON 列/队列；配置连接池/读副本/TLS/慢日志 | [mysql-patterns](./02-skill说明文档-附件1.md#mysql-patterns) |
| redis-patterns | Redis 数据结构模式、缓存策略、分布式锁、限流、Pub/Sub 与生产连接管理 | 加缓存；实现限流/节流；构建分布式锁/协调；session/token 存储；Pub/Sub 或 Redis Streams 消息；生产配置（池/驱逐/集群） | [redis-patterns](./02-skill说明文档-附件1.md#redis-patterns) |
| clickhouse-io | ClickHouse 数据库模式：查询优化、分析与数据工程最佳实践，面向高性能分析型负载 | 设计 ClickHouse 表 schema（MergeTree 引擎选择）；编写分析查询（聚合/窗口/连接）；优化查询性能（分区裁剪/projection/物化视图）；大批量数据摄入（批量/Kafka）；从 PostgreSQL/MySQL 迁移分析；实时看板或时序分析 | [clickhouse-io](./02-skill说明文档-附件1.md#clickhouse-io) |
| prisma-patterns | Prisma ORM（TypeScript 后端）模式：schema 设计、查询优化、事务、分页，及 updateMany 返回 count、$transaction 超时、migrate dev 重置 DB、@updatedAt 在批量写失效、serverless 连接耗尽等关键陷阱 | 设计/修改 Prisma schema 与关系；编写查询/事务/分页；用 updateMany/deleteMany 等批量操作；运行/规划迁移；部署 serverless（Vercel/Lambda/Cloudflare Workers）；实现软删除或多租户行过滤 | [prisma-patterns](./02-skill说明文档-附件1.md#prisma-patterns) |

---

## 十四（2）JVM 生态：Java·Kotlin·Spring Boot·Quarkus（18 个）

Java 编码规范、JPA/Hibernate、Kotlin（协程/Exposed/Ktor/测试）、Spring Boot 与 Quarkus 的 patterns/security/tdd/verification 四件套、Android Clean Architecture、Compose Multiplatform、tinystruct。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| java-coding-standards | 为 Spring Boot 与 Quarkus 服务提供 Java（17+）可读、可维护的编码规范：命名、不可变、Optional、流、异常、泛型、CDI、响应式与项目布局 | 编写或评审 Spring Boot/Quarkus 的 Java 代码；强制命名/不可变/异常约定；使用 records、sealed、模式匹配（Java 17+）；评审 Optional、流、泛型；规划包结构与项目布局；Quarkus 下处理 CDI 作用域、Panache 实体、响应式管道 | [java-coding-standards](./02-skill说明文档-附件1.md#java-coding-standards) |
| jpa-patterns | Spring Boot 下 JPA/Hibernate 的实体设计、关联、查询优化、事务、审计、索引、分页与连接池调优模式 | 设计 JPA 实体与表映射；定义关联（@OneToMany/@ManyToOne/@ManyToMany）；优化查询（防 N+1、fetch 策略、投影）；配置事务、审计、软删除；分页/排序/自定义仓库方法；调优 HikariCP 连接池或二级缓存 | [jpa-patterns](./02-skill说明文档-附件1.md#jpa-patterns) |
| kotlin-coroutines-flows | Android 与 KMP 项目下 Kotlin 协程与 Flow 的结构化并发、Flow 操作符、StateFlow、错误处理与测试模式 | 用 Kotlin 协程编写异步代码；使用 Flow/StateFlow/SharedFlow 做响应式数据；处理并发（并行加载、debounce、retry）；测试协程与 Flow；管理协程作用域与取消 | [kotlin-coroutines-flows](./02-skill说明文档-附件1.md#kotlin-coroutines-flows) |
| kotlin-exposed-patterns | JetBrains Exposed ORM 模式：DSL 查询、DAO、事务、HikariCP 连接池、Flyway 迁移与 repository 模式 | 用 Exposed 建立数据库访问；写 DSL 或 DAO 查询；配置 HikariCP 连接池；用 Flyway 建迁移；实现 repository 模式；处理 JSON 列与复杂查询 | [kotlin-exposed-patterns](./02-skill说明文档-附件1.md#kotlin-exposed-patterns) |
| kotlin-ktor-patterns | Ktor server 模式：routing DSL、plugins、认证、Koin DI、kotlinx.serialization、WebSockets 与 testApplication 测试 | 构建 Ktor HTTP 服务器；配置插件（Auth/CORS/ContentNegotiation/StatusPages）；实现 REST API；用 Koin 做 DI；用 testApplication 写集成测试；处理 WebSocket | [kotlin-ktor-patterns](./02-skill说明文档-附件1.md#kotlin-ktor-patterns) |
| kotlin-patterns | 地道 Kotlin 模式与最佳实践：null 安全、不可变、sealed、协程、扩展函数、DSL、Gradle Kotlin DSL | 编写新 Kotlin 代码；评审 Kotlin 代码；重构既有 Kotlin 代码；设计 Kotlin 模块或库；配置 Gradle Kotlin DSL 构建 | [kotlin-patterns](./02-skill说明文档-附件1.md#kotlin-patterns) |
| kotlin-testing | Kotlin 测试模式：Kotest、MockK、协程测试、属性测试与 Kover 覆盖率，遵循 TDD 方法论 | 编写新 Kotlin 函数或类；为既有 Kotlin 代码补测试；实现属性测试；在 Kotlin 项目走 TDD 流程；配置 Kover 覆盖率 | [kotlin-testing](./02-skill说明文档-附件1.md#kotlin-testing) |
| springboot-patterns | Spring Boot 架构与 API 模式：REST、分层 service、JPA 数据访问、缓存、异步、日志、限流 | 用 Spring MVC 或 WebFlux 构建 REST API；搭 controller→service→repository 分层；配置 Spring Data JPA、缓存、异步处理；加校验、异常处理、分页；用 profile 切 dev/staging/prod；用 Spring Events 或 Kafka 做事件驱动 | [springboot-patterns](./02-skill说明文档-附件1.md#springboot-patterns) |
| springboot-security | Spring Boot 服务的认证/授权、校验、CSRF、密钥、安全头、限流与依赖安全的最佳实践 | 加认证（JWT、OAuth2、Session）；做授权（@PreAuthorize、RBAC）；校验用户输入；配置 CORS/CSRF/安全头；管理密钥（Vault、环境变量）；加限流或暴力破解防护；CI 扫依赖 CVE | [springboot-security](./02-skill说明文档-附件1.md#springboot-security) |
| springboot-tdd | Spring Boot 的 TDD 工作流：JUnit 5、Mockito、MockMvc、Testcontainers、JaCoCo，目标覆盖率 80%+ | 新功能或端点；修 Bug 或重构；加数据访问逻辑或安全规则 | [springboot-tdd](./02-skill说明文档-附件1.md#springboot-tdd) |
| springboot-verification | Spring Boot 项目发布/PR 前的验证闭环：构建→静态分析→测试与覆盖率→安全扫描→diff 评审 | 开 Spring Boot 服务 PR 前；重大重构或依赖升级后；上线前 staging/production 验证；跑完整 build→lint→test→安全扫描流水线；校验覆盖率达标 | [springboot-verification](./02-skill说明文档-附件1.md#springboot-verification) |
| quarkus-patterns | Quarkus 3.x LTS 架构模式：Camel 消息、REST API、CDI 服务、Panache 数据访问、异步处理，面向云原生事件驱动服务 | 用 JAX-RS 或 RESTEasy Reactive 建 REST API；搭 resource→service→repository 分层；用 Apache Camel + RabbitMQ 做事件驱动；配置 Hibernate Panache、缓存或响应式流；加校验、异常映射、分页；用 YAML 配 profile；自定义 LogContext + Logback/Logstash 日志；用 CompletableFuture 做异步；实现条件流处理；做 GraalVM native 编译 | [quarkus-patterns](./02-skill说明文档-附件1.md#quarkus-patterns) |
| quarkus-security | Quarkus 安全最佳实践：认证、授权、JWT/OIDC、RBAC、输入校验、CSRF、密钥、依赖安全 | 加认证（JWT、OIDC、Basic Auth）；用 @RolesAllowed 或 SecurityIdentity 做授权；校验输入；配置 CORS 或安全头；管理密钥（Vault、环境变量、config source）；加限流或暴力破解防护；扫依赖 CVE；使用 MicroProfile JWT 或 SmallRye JWT | [quarkus-security](./02-skill说明文档-附件1.md#quarkus-security) |
| quarkus-tdd | Quarkus 3.x LTS 的 TDD：JUnit 5、Mockito、REST Assured、Camel 测试、JaCoCo，覆盖率 80%+，面向事件驱动服务 | 新功能或 REST 端点；修 Bug 或重构；加数据访问/安全/响应式流；测 Apache Camel 路由与事件处理器；测 RabbitMQ 事件驱动服务；测条件流逻辑；校验 CompletableFuture 异步；测 LogContext 传递 | [quarkus-tdd](./02-skill说明文档-附件1.md#quarkus-tdd) |
| quarkus-verification | Quarkus 项目发布/PR 前的验证闭环：构建→静态分析→测试覆盖率→安全扫描→native 编译→diff 评审 | 开 Quarkus 服务 PR 前；重大重构或依赖升级后；上线前 staging/production 验证；跑完整 build→lint→test→安全扫描→native 编译流水线；校验覆盖率（80%+）；测试 native 兼容 | [quarkus-verification](./02-skill说明文档-附件1.md#quarkus-verification) |
| android-clean-architecture | Android 与 KMP 项目的 Clean Architecture 模式：模块结构、依赖规则、UseCase、Repository 与数据层模式 | 规划 Android 或 KMP 项目模块；实现 UseCase/Repository/DataSource；设计 domain/data/presentation 三层间数据流；用 Koin 或 Hilt 做 DI；在分层架构中使用 Room、SQLDelight 或 Ktor | [android-clean-architecture](./02-skill说明文档-附件1.md#android-clean-architecture) |
| compose-multiplatform-patterns | Compose Multiplatform 与 Jetpack Compose 模式：状态管理、导航、主题、性能与平台特定 UI | 构建 Compose UI（Jetpack 或 Multiplatform）；用 ViewModel 与 Compose state 管理 UI 状态；在 KMP 或 Android 项目做导航；设计可复用 composable 与设计系统；优化重组与渲染性能 | [compose-multiplatform-patterns](./02-skill说明文档-附件1.md#compose-multiplatform-patterns) |
| tinystruct-patterns | tinystruct Java 框架开发专家指引：Application 类、@Action 路由、ActionRegistry、HTTP/CLI 双模式、内置 HTTP 服务器、事件系统、Builder/Builders JSON、AbstractData 持久化、POJO 生成、SSE、文件上传、出站 HTTP 联网、MCP 工具集成 | 创建继承 AbstractApplication 的 Application 模块；用 @Action 定义路由与命令行动作；经 Context 处理每请求状态；用原生 Builder/Builders 做 JSON 序列化；用 AbstractData POJO 做数据库持久化；用 generate 命令从表生成 POJO；实现 SSE 实时推送；multipart 文件上传；用 URLRequest/HTTPHandler 发出站请求；在 application.properties 配数据库与系统；排查路由冲突或 CLI 参数解析 | [tinystruct-patterns](./02-skill说明文档-附件1.md#tinystruct-patterns) |

---

## 十四（3）JS/TS Web 框架（11 个）

React/Vue/Nuxt/Nest/Angular 模式与测试、Next.js Turbopack、Vite 构建、Bun 运行时、跨语言编码基线 coding-standards——JavaScript/TypeScript 前后端框架。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| angular-developer | 生成 Angular 代码并提供架构指导（组件、服务、信号、表单、DI、路由、SSR、ARIA、动画、测试、CLI） | 在任何 Angular 项目中工作；新建/脚手架项目或库；生成 components、services、directives、pipes、guards、resolvers；用 Signals/linkedSignal/resource 实现响应式；处理 signal/reactive/template-driven 表单；配置 DI、路由、lazy loading、route guards；添加 ARIA、动画、组件样式；编写或调试单元/组件 harness/E2E 测试；配置 Angular CLI 或 Angular MCP server | [angular-developer](./02-skill说明文档-附件1.md#angular-developer) |
| bun-runtime | Bun 作为运行时、包管理器、打包器和测试器的使用与迁移指南 | 采用 Bun；从 Node 迁移；编写/调试 Bun 脚本或测试；在 Vercel 等平台配置 Bun；新 JS/TS 项目或安装/运行速度敏感的脚本；单一工具链诉求（run+install+test+build） | [bun-runtime](./02-skill说明文档-附件1.md#bun-runtime) |
| coding-standards | 跨项目编码规范基线——命名、可读性、不可变性、代码质量审查 | 新建项目或模块；代码质量/可维护性审查；重构代码遵循规范；统一命名/格式/结构；配置 lint/format/type-check 规则；向新成员介绍编码规范 | [coding-standards](./02-skill说明文档-附件1.md#coding-standards) |
| nestjs-patterns | NestJS 架构模式——模块、控制器、providers、DTO 校验、guards、interceptors、配置与生产级 TypeScript 后端 | 构建 NestJS API 或服务；组织 modules/controllers/providers；添加 DTO 校验、guards、interceptors、exception filters；配置环境感知设置与数据库集成；测试 NestJS 单元或 HTTP 端点 | [nestjs-patterns](./02-skill说明文档-附件1.md#nestjs-patterns) |
| nextjs-turbopack | Next.js 16+ 与 Turbopack——增量打包、文件系统缓存、dev 加速与 Turbopack vs webpack 选型 | 开发或调试 Next.js 16+ 应用；诊断 dev 启动慢或 HMR 慢；优化生产 bundle；Turbopack（默认 dev）用于日常开发；webpack（legacy dev）仅在遇到 Turbopack bug 或依赖 webpack-only 插件时用 | [nextjs-turbopack](./02-skill说明文档-附件1.md#nextjs-turbopack) |
| nuxt4-patterns | Nuxt 4 应用模式——hydration 安全、性能、route rules、lazy loading、SSR 安全数据获取（useFetch/useAsyncData） | 构建或调试 Nuxt 4 应用涉及 SSR、混合渲染、route rules 或页面级数据获取；hydration mismatch；路由级渲染决策（prerender/SWR/ISR/client-only）；lazy loading/lazy hydration/payload 大小性能优化；页面或组件用 useFetch/useAsyncData/$fetch 取数；路由 params、middleware、SSR/客户端差异相关问题 | [nuxt4-patterns](./02-skill说明文档-附件1.md#nuxt4-patterns) |
| react-patterns | React 18/19 模式——hooks 纪律、server/client 组件边界、Suspense+error boundary、form actions、数据获取、状态管理决策树、可访问性优先组合 | 编写或修改 React 函数组件、自定义 hooks、组件树；审查 JSX/TSX；设计 state 形状或组件组合；迁移 class 组件或老旧 forwardRef/useEffect 密集代码；在本地 state/提升 state/context/外部 store 间选择；Server/Client Components（Next.js App Router、RSC）；React 19 form actions 或受控输入；接入 TanStack Query/SWR/RSC 数据获取 | [react-patterns](./02-skill说明文档-附件1.md#react-patterns) |
| react-testing | React 组件测试——React Testing Library、Vitest/Jest、MSW 网络模拟、axe 可访问性断言、组件测试与 Playwright/Cypress E2E 的边界 | 为 React 组件/hooks/页面编写测试；给遗留未测组件补测试；从 Enzyme 或 class 组件时代模式迁到 RTL；为新 React 项目搭建 Vitest 或 Jest；测试中 mock HTTP 请求；断言可访问性违规；判断哪些测试归 RTL、哪些归 Playwright Component Testing 或完整 E2E | [react-testing](./02-skill说明文档-附件1.md#react-testing) |
| react-native-patterns | React Native 与 Expo 应用模式——Expo Router 导航、状态分层（server/client/route/form）、TanStack Query+Zod 数据获取、性能化列表、NativeWind/StyleSheet 样式、原生 API 与安全存储 | 构建或编辑 React Native/Expo 屏幕、组件、导航；用 Expo Router 脚手架路由（文件式 `app/`）；决定状态归属（server cache vs client store vs route params vs form）；用 TanStack Query 接数据并用 Zod 校验；渲染长或重列表；选择/应用样式方案（NativeWind 或 StyleSheet）；访问原生设备 API（相机、定位、通知）或安全存储；审查 RN 代码的移动端问题。禁止套用 Web/React-DOM 模式（URL-as-state、`<div>`、SWR-for-browser 不适用） | [react-native-patterns](./02-skill说明文档-附件1.md#react-native-patterns) |
| vite-patterns | Vite 构建工具模式——配置、插件、HMR、env、proxy、SSR、library mode、依赖预打包、构建优化 | 配置 `vite.config.ts`/`vite.config.js`；设置环境变量或 `.env`；为 API 后端配 dev server proxy；优化构建产物（chunks/minify/assets）；用 `build.lib` 发布库；排查依赖预打包或 CJS/ESM 互操作；调试 HMR/dev server/build 错误；选择或排序 Vite 插件 | [vite-patterns](./02-skill说明文档-附件1.md#vite-patterns) |
| vue-patterns | Vue.js 3 Composition API 模式——组件架构、响应式最佳实践、Pinia 状态管理、Vue Router 导航、Nuxt SSR 模式 | 项目用 Vue.js（任何版本）、Nuxt、Vite+Vue 或 Pinia；问 Vue 组件架构、composables、响应式或状态管理；审查 Vue 单文件组件（.vue）；搭建 Vue Router、Pinia store 或 Vite/Vitest 配置；讨论 Vue 专属性能、安全或 SSR 模式 | [vue-patterns](./02-skill说明文档-附件1.md#vue-patterns) |

---

## 十四（4）系统编程·PHP·.NET·移动·Laravel（18 个）

Rust/Go/C++ 模式与测试、C#/.NET/F# 测试、Perl 三件套（patterns/security/testing）、Laravel 四件套 + 插件发现、Dart/Flutter 模式——其余语言/框架生态。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| cpp-coding-standards | 基于 C++ Core Guidelines 的现代 C++（C++17/20/23）编码规范，强调类型安全、资源安全、不可变与清晰 | 编写新 C++ 代码（类/函数/模板）；评审或重构现有 C++；C++ 项目架构决策；统一代码风格；在语言特性间做取舍（enum vs enum class、裸指针 vs 智能指针） | [cpp-coding-standards](./02-skill说明文档-附件1.md#cpp-coding-standards) |
| cpp-testing | 基于 GoogleTest/GoogleMock + CMake/CTest 的现代 C++（C++17/20）测试工作流 | 编写/修复 C++ 测试；设计单元/集成测试覆盖；加测试覆盖率、CI 门禁、回归保护；配置 CMake/CTest；排查失败或 flaky 测试；启用 sanitizers 做内存/竞 race 诊断 | [cpp-testing](./02-skill说明文档-附件1.md#cpp-testing) |
| csharp-testing | C#/.NET 测试模式：xUnit + FluentAssertions + 模拟 + 集成测试与组织实践 | 为 C# 代码编写新测试；评审测试质量与覆盖率；为 .NET 项目搭建测试基础设施；调试 flaky 或慢测试 | [csharp-testing](./02-skill说明文档-附件1.md#csharp-testing) |
| dotnet-patterns | 地道的 C#/.NET 模式：约定、依赖注入、async/await 与构建健壮可维护应用的最佳实践 | 编写新 C# 代码；评审 C# 代码；重构现有 .NET 应用；用 ASP.NET Core 设计服务架构 | [dotnet-patterns](./02-skill说明文档-附件1.md#dotnet-patterns) |
| fsharp-testing | F# 测试模式：xUnit + FsUnit + Unquote + FsCheck 属性测试 + 集成测试与组织实践 | 为 F# 代码编写新测试；评审测试质量与覆盖率；为 F# 项目搭建测试基础设施；调试 flaky 或慢测试 | [fsharp-testing](./02-skill说明文档-附件1.md#fsharp-testing) |
| golang-patterns | 地道的 Go 模式、最佳实践与约定，构建健壮高效可维护的 Go 应用 | 编写新 Go 代码；评审 Go 代码；重构现有 Go 代码；设计 Go package/module | [golang-patterns](./02-skill说明文档-附件1.md#golang-patterns) |
| golang-testing | Go 测试模式：table-driven tests、subtests、benchmarks、fuzzing 与覆盖率，遵循 TDD 方法论 | 编写新 Go 函数/方法；为现有代码加测试覆盖；为性能关键代码做 benchmark；实现 fuzz 测试做输入验证；在 Go 项目中走 TDD 流程 | [golang-testing](./02-skill说明文档-附件1.md#golang-testing) |
| perl-patterns | 现代 Perl 5.36+ 地道模式、最佳实践与约定，构建健壮可维护应用 | 编写新 Perl 代码/模块；评审 Perl 代码地道性；将遗留 Perl 重构到现代标准；设计 Perl 模块架构；从 5.36 前代码迁移到现代 Perl | [perl-patterns](./02-skill说明文档-附件1.md#perl-patterns) |
| perl-security | Perl 安全全景：taint mode、输入校验、安全进程执行、DBI 参数化查询、Web 安全（XSS/SQLi/CSRF）与 perlcritic 安全策略 | 在 Perl 应用处理用户输入；构建 Perl Web 应用（CGI/Mojolicious/Dancer2/Catalyst）；评审 Perl 代码安全漏洞；用用户路径做文件操作；从 Perl 执行系统命令；编写 DBI 数据库查询 | [perl-security](./02-skill说明文档-附件1.md#perl-security) |
| perl-testing | Perl 测试模式：Test2::V0、Test::More、prove runner、mocking、Devel::Cover 覆盖率与 TDD 方法论 | 编写新 Perl 代码（走 TDD red/green/refactor）；为 Perl 模块/应用设计测试套件；评审 Perl 测试覆盖率；搭建 Perl 测试基础设施；从 Test::More 迁移到 Test2::V0；调试失败的 Perl 测试 | [perl-testing](./02-skill说明文档-附件1.md#perl-testing) |
| dart-flutter-patterns | 生产级 Dart/Flutter 模式：null safety、不可变状态、async 组合、widget 架构、状态管理（BLoC/Riverpod/Provider）、GoRouter、Dio、Freezed 与 clean architecture | 开启新 Flutter 功能需要状态管理/导航/数据访问的地道模式；评审/编写 Dart 代码需 null safety/sealed types/async 组合指导；新 Flutter 项目在 BLoC/Riverpod/Provider 间选型；实现安全 HTTP 客户端/WebView/本地存储；为 widget/Cubit/Riverpod provider 写测试；接入带认证守卫的 GoRouter | [dart-flutter-patterns](./02-skill说明文档-附件1.md#dart-flutter-patterns) |
| laravel-patterns | 生产级 Laravel 架构模式：路由/控制器、Eloquent ORM、服务层、队列、事件、缓存与 API resources | 构建 Laravel Web 应用或 API；结构化 controller/service/domain 逻辑；使用 Eloquent 模型与关系；设计带 resource 和分页的 API；加队列、事件、缓存与后台任务 | [laravel-patterns](./02-skill说明文档-附件1.md#laravel-patterns) |
| laravel-plugin-discovery | 通过 LaraPlugins.io MCP 发现并评估 Laravel 包，查包健康度、Laravel/PHP 版本兼容性 | 用户想为某功能找 Laravel 包（auth/permissions/admin panel 等）；问"该用哪个包做…"；查包是否活跃维护；验证 Laravel 版本兼容；在加入项目前评估包健康度 | [laravel-plugin-discovery](./02-skill说明文档-附件1.md#laravel-plugin-discovery) |
| laravel-security | Laravel 安全最佳实践：认证、授权、Eloquent 安全、CSRF、XSS 防护、API 安全与安全部署配置 | 配置 Laravel 认证与授权（Sanctum/Passport/Jetstream/Breeze）；实现用户角色/权限/policy；配置生产安全设置与环境变量；评审 Laravel 应用安全漏洞；部署 Laravel 到生产；编写安全 Eloquent 查询与迁移 | [laravel-security](./02-skill说明文档-附件1.md#laravel-security) |
| laravel-tdd | Laravel 测试策略：PHPUnit、Pest、model factories、HTTP 测试、Sanctum 认证测试、mocking 与覆盖率 | 编写新 Laravel 应用或功能；实现带 Sanctum/Passport 认证的 API 端点；测试 Eloquent 模型/关系/scope/accessor；搭建 Laravel 测试基础设施；为 HTTP controller 和 form request 写 feature 测试；mock 外部服务（队列/邮件/通知/HTTP） | [laravel-tdd](./02-skill说明文档-附件1.md#laravel-tdd) |
| laravel-verification | Laravel 项目验证循环：环境检查、lint、静态分析、带覆盖率的测试、安全扫描与部署就绪度 | 在 Laravel 项目开 PR 前；重大重构或依赖升级后；发往 staging/production 前的预部署验证；跑完整 lint→test→security→deploy readiness 流水线 | [laravel-verification](./02-skill说明文档-附件1.md#laravel-verification) |
| rust-patterns | 地道的 Rust 模式：所有权、错误处理、trait、并发与构建安全高性能应用的最佳实践 | 编写新 Rust 代码；评审 Rust 代码；重构现有 Rust 代码；设计 crate 结构与模块布局 | [rust-patterns](./02-skill说明文档-附件1.md#rust-patterns) |
| rust-testing | Rust 测试模式：单元测试、集成测试、async 测试、属性测试、mocking 与覆盖率，遵循 TDD 方法论 | 编写新 Rust 函数/方法/trait；为现有代码加测试覆盖；为性能关键代码做 benchmark；实现属性测试做输入验证；在 Rust 项目中走 TDD 流程 | [rust-testing](./02-skill说明文档-附件1.md#rust-testing) |

---

## 十五（1）医疗合规与供应链运营（13 个）

医疗 CDSS/EMR 模式、HIPAA/PHI 合规、医疗评估门禁；供应链——承运商管理、关税合规、能源/库存/生产计划、质量与退货逆向物流。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| healthcare-cdss-patterns | 临床决策支持系统（CDSS）开发模式：药物相互作用检查、剂量校验、临床评分（NEWS2、qSOFA）、告警分级与 EMR 集成 | 实现药物相互作用检查；构建剂量校验引擎；实现 NEWS2/qSOFA/APACHE/GCS 临床评分；设计异常临床值告警系统；构建带安全检查的医嘱录入；将检验结果解读与临床上下文集成 | [healthcare-cdss-patterns](./02-skill说明文档-附件1.md#healthcare-cdss-patterns) |
| healthcare-emr-patterns | 电子病历（EMR/EHR）开发模式：患者安全优先、就诊工作流、处方生成、CDSS 集成、医疗数据无障碍 UI | 构建就诊工作流（主诉/查体/诊断/处方）；临床笔记（结构化+自由文本+语音转文本）；处方模块含药物相互作用检查；集成 CDSS；检验结果带参考范围高亮；临床数据审计；设计医疗数据录入无障碍 UI | [healthcare-emr-patterns](./02-skill说明文档-附件1.md#healthcare-emr-patterns) |
| healthcare-eval-harness | 医疗应用部署的患者安全评估门禁：CDSS 准确性、PHI 泄露、数据完整性、临床工作流、集成合规的自动化测试，失败即阻断部署 | EMR/EHR 任何部署前；修改 CDSS 逻辑后；改动触及患者数据的数据库 schema 后；修改认证/访问控制后；配置医疗应用 CI/CD 流水线时；临床模块合并冲突解决后 | [healthcare-eval-harness](./02-skill说明文档-附件1.md#healthcare-eval-harness) |
| healthcare-phi-compliance | 受保护健康信息（PHI）/个人身份信息（PII）合规模式：数据分类、行级安全（RLS）、审计轨迹、加密、常见泄露向量；适用 HIPAA(US)/DISHA(India)/GDPR(EU) | 触及患者记录的任何功能；临床系统访问控制/认证；医疗数据数据库 schema 设计；返回患者/医生数据的 API；实现审计轨迹或日志；数据暴露漏洞代码评审；多租户医疗系统的行级安全（RLS） | [healthcare-phi-compliance](./02-skill说明文档-附件1.md#healthcare-phi-compliance) |
| hipaa-compliance | HIPAA 专属入口：当任务明确围绕 HIPAA、PHI 处理、覆盖实体、BAA、违规态势或美国医疗合规时的轻量规范化入口 | 请求明确提及 HIPAA/PHI/覆盖实体/业务伙伴/BAA；构建或评审存储/处理/导出/传输 PHI 的美国医疗软件；评估日志/分析/LLM prompt/存储/支持流程是否产生 HIPAA 暴露；设计对患者/临床人员的最小必要访问与可审计系统 | [hipaa-compliance](./02-skill说明文档-附件1.md#hipaa-compliance) |
| carrier-relationship-management | 承运商组合管理：运费费率谈判、承运商绩效追踪、运量分配、RFP 流程、市场情报、FMCSA 合规审查；15+ 年运输管理经验沉淀 | 新承运商上线与安全/保险/资质审查；年度或专线 RFP 费率基准对标；构建或更新承运商记分卡与绩效评审；运力紧张或承运商表现下滑时重新分配货量；谈判费率上调、燃油附加费或附加费清单 | [carrier-relationship-management](./02-skill说明文档-附件1.md#carrier-relationship-management) |
| customs-trade-compliance | 海关与贸易合规：HS 关税归类、关税优化、受限方筛查、跨境监管合规（US/EU/UK/APAC）；15+ 年贸易合规专家经验沉淀 | 为进出口商品做 HS/HTS 关税归类；准备海关单证（商业发票、原产地证、ISF 申报）；对交易各方做禁运/受限名单筛查（SDN、Entity List、EU 制裁）；评估 FTA 资格与关税节省；应对海关审计、CF-28/CF-29 请求或罚单 | [customs-trade-compliance](./02-skill说明文档-附件1.md#customs-trade-compliance) |
| energy-procurement | 电力与天然气采购、电价结构优化、需求侧收费管理、可再生 PPA 评估、多设施能源成本管理；15+ 年大型工商业用户能源采购经验沉淀 | 多设施电力/天然气供应 RFP；电价结构分析与费率档优化；需求侧收费缓解策略（负荷转移、储能、功率因数校正）；评估 PPA（ onsite 或虚拟可再生）；年度能源预算与对冲持仓策略；应对市场波动（极地涡旋、热浪、监管变更） | [energy-procurement](./02-skill说明文档-附件1.md#energy-procurement) |
| inventory-demand-planning | 需求预测、安全库存优化、补货计划、促销提升估算；多门店零售（40-200 店）300-800 SKU 管理经验沉淀 | 为现有或新 SKU 生成/复核需求预测；按需求波动与服务水平目标设安全库存；季节性切换/促销/新品上市的补货计划；评估预测准确率并调整模型或覆写；在供应商 MOQ 约束或交付期变更下做采购决策 | [inventory-demand-planning](./02-skill说明文档-附件1.md#inventory-demand-planning) |
| production-scheduling | 生产排程、作业排序、线平衡、换型优化、瓶颈消除；离散与批次制造 15+ 年排程经验沉淀 | 生产订单争抢受限工作中心；中断（故障/缺料/缺勤）需快速重排；换型与批次的经济权衡需显式决策；新工单插入既有排程而不破坏冻结窗口；换层级瓶颈变化需重新指派鼓点 | [production-scheduling](./02-skill说明文档-附件1.md#production-scheduling) |
| quality-nonconformance | 质量控制、不合格品调查、根因分析、纠正预防措施（CAPA）、供应商质量管理；FDA/IATF 16949/AS9100/ISO 13485 受监管制造 15+ 年经验沉淀 | 进货/过程/终检不合格品（NCR）调查；用 5-Why/石川/故障树做根因分析；不合格物料处置决定（照用/返工/报废/退供应商）；创建或评审 CAPA 计划；解读 SPC 与控制图信号；应对或准备监管审核发现 | [quality-nonconformance](./02-skill说明文档-附件1.md#quality-nonconformance) |
| returns-reverse-logistics | 退货授权（RMA）、收货与检验、处置决策、退款处理、欺诈检测、保修索赔管理；零售/电商/全渠道 15+ 年退货运营经验沉淀 | 处理退货请求并判定 RMA 资格；检验退货并给定状态评级以驱动处置；路由处置决策（重新上架/翻新/清货/报废/退供应商 RTV）；调查退货欺诈或政策滥用；管理保修索赔与供应商追偿扣款 | [returns-reverse-logistics](./02-skill说明文档-附件1.md#returns-reverse-logistics) |
| logistics-exception-management | 货运异常处理：延误、损毁、灭失、短缺、拒收；承运商争议、索赔程序、升级协议；全运输方式（LTL/FTL/parcel/intermodal/ocean/air）15+ 年运营经验沉淀 | 货物延误/损坏/丢失/到货拒收；承运商对责任/附加费/压车费的争议；因错过交付窗口或错发导致的客户升级；向承运商或保险公司提货运索赔并管理；构建异常处理 SOP 或升级协议 | [logistics-exception-management](./02-skill说明文档-附件1.md#logistics-exception-management) |

---

## 十五（2）金融·预测市场·Web3·ML·其它垂直（21 个）

融资材料与触达、计费/财务运营、Itô 预测市场 basket、prediction-market 研究与风险审查、Web3 安全（DeFi/钱包/Keccak/支付 x402）、ML 工程方法论、推荐系统、文档处理/翻译/Python 打包/数据采集。

| skill | 功能/用途 | 适用场景 | 详细说明 |
|---|---|---|---|
| agent-payment-x402 | 为 AI agent 添加 x402 支付执行能力，含每任务预算、支出管控与非托管钱包 | agent 需为 API 调用付费、购买服务、与其它 agent 结算、强制每任务支出上限、或管理非托管钱包 | [agent-payment-x402](./02-skill说明文档-附件1.md#agent-payment-x402) |
| data-scraper-agent | 构建全自动 AI 数据采集 agent，按计划抓取公开来源、用免费 LLM 富化、存入 Notion/Sheets/Supabase 并从反馈学习，100% 跑在 GitHub Actions 免费额度 | 用户想监控/采集任意公开网站或 API；跟踪招聘、价格、新闻、GitHub repo、体育比分、活动；需零成本托管且随用户决策变聪明 | [data-scraper-agent](./02-skill说明文档-附件1.md#data-scraper-agent) |
| defi-amm-security | Solidity AMM 合约、流动性池与 swap 流程的安全检查清单与加固模式（重入、CEI、捐赠/通胀攻击、预言机操纵、滑点、整数数学） | 编写或审计 Solidity AMM/流动性池合约；实现持有代币余额的 swap/deposit/withdraw/mint/burn；审查使用 balanceOf(address(this)) 做份额或储备数学的合约；为 DeFi 协议添加 fee/pauser/oracle/admin 函数 | [defi-amm-security](./02-skill说明文档-附件1.md#defi-amm-security) |
| evm-token-decimals | 防止 EVM 链上代币小数位静默不匹配导致余额/美元值错几个数量级 | 在 Python/TS/Solidity 读取 ERC-20 余额；从链上余额算法币价值；跨多链比较代币数量；处理桥接资产；构建组合追踪器、bot、聚合器 | [evm-token-decimals](./02-skill说明文档-附件1.md#evm-token-decimals) |
| finance-billing-ops | ECC 内部财务运营：基于证据的销售快照、定价对比、退款诊断、团队计费与"代码背书的计费真相" | 用户问 Stripe 销售/退款/MRR/近期客户活动；质疑团队计费/按席位/配额叠加是否在代码中真实存在；要竞品定价对比或定价模型基准；问题混合了营收事实与产品实现真相 | [finance-billing-ops](./02-skill说明文档-附件1.md#finance-billing-ops) |
| generating-python-installer | 商业级 Windows Python 安装包专家：Nuitka 极限编译、dist 瘦身、DLL 占用分析、Inno Setup 封装，追求最小体积最快启动 | 用户明确要求高级 Python 打包或体积/启动优化（Nuitka 极限/商业级、最小安装包、最快启动、dist 瘦身、DLL 分析、Inno Setup 元数据封装）；不适用于基础脚本转 exe | [generating-python-installer](./02-skill说明文档-附件1.md#generating-python-installer) |
| investor-materials | 创建/更新路演 deck、单页、投资人备忘、加速器申请、财务模型等融资材料，保证多份材料内部一致 | 创建或修订路演 deck；写投资人备忘/单页；构建财务模型、里程碑计划、资金用途表；回答加速器/孵化器申请问题；围绕单一真相来源对齐多份融资文档 | [investor-materials](./02-skill说明文档-附件1.md#investor-materials) |
| investor-outreach | 撰写冷邮件、热络引荐、跟进、更新邮件等融资触达信息，简短、具体、可执行 | 写冷邮件给投资人；起草热络引荐请求；会后或无回应后跟进；融资过程中发投资人更新；按基金主题或合伙人契合度定制触达 | [investor-outreach](./02-skill说明文档-附件1.md#investor-outreach) |
| ito-basket-compare | 将 Itô 预测市场 basket 与用户知识库/组合笔记/财务上下文/观察列表/研究论点做只读对比与缺口分析 | 用户想把一个 basket/theme/市场集与知识库、组合笔记、研究备忘、CRM 上下文或陈述论点对比（只读） | [ito-basket-compare](./02-skill说明文档-附件1.md#ito-basket-compare) |
| ito-data-atlas-agent | 设计后台 Data Atlas 风格 agent，用于 Itô basket 研究、市场发现、参数起草与人在环编辑（架构与工作流规划，非实盘） | 想设计一个监控数据源、构建候选预测市场 basket、起草参数变更、交人审核的 agent | [ito-data-atlas-agent](./02-skill说明文档-附件1.md#ito-data-atlas-agent) |
| ito-market-intelligence | 为 Itô basket 工作流研究预测市场事件、venue、底层、流动性与新闻上下文（只读市场情报、API 门控 Itô 探索、有出处的简报） | 用户想要预测市场上下文、事件发现、venue 对比、basket 主题探索或 Itô API 支持的市场简报 | [ito-market-intelligence](./02-skill说明文档-附件1.md#ito-market-intelligence) |
| ito-trade-planner | 为 Itô 或 venue 工作流构建非建议性预测市场交易计划工作表（审视 venue/底层/约束/下单前提/手动执行步骤，不下单不建议仓位） | 用户想要针对预测市场想法、basket 调整、venue 对比或手动执行计划的结构化工作表 | [ito-trade-planner](./02-skill说明文档-附件1.md#ito-trade-planner) |
| llm-trading-agent-security | 自主交易 agent（有钱包或交易权限）的安全模式：提示注入、支出限额、发送前模拟、熔断、MEV 防护、密钥处理 | 构建会签名发送交易的 AI agent；审计交易 bot 或链上执行助手；为 agent 设计钱包密钥管理；给 LLM 访问下单/swap/国库操作的权限 | [llm-trading-agent-security](./02-skill说明文档-附件1.md#llm-trading-agent-security) |
| ml-adoption-playbook | AI agent 与软件工程师把机器学习算法加进现有非 ML 代码库的端到端方法论（问题框架、数据就绪、架构解耦、基线模型集成） | 用户想"给现有代码库加 ML/加算法"；规划把新模型（推荐/分类/预测）集成进非 ML 应用；为 agent 结构化构建/训练/部署 ML 组件的工作流 | [ml-adoption-playbook](./02-skill说明文档-附件1.md#ml-adoption-playbook) |
| mle-workflow | 生产级 ML 工程工作流：数据契约、可复现训练、模型评估、部署、监控、回滚 | 规划/审查生产 ML 特征、模型刷新、排序/推荐/分类/embedding/预测管道；把 notebook 代码转成可复用训练/评估/批/在线推理管道；设计模型晋升标准、离线/在线评估、实验追踪、回滚路径；调试数据漂移/标签泄漏/陈旧特征/artifact 不匹配/训练-服务不一致；加模型监控、金丝雀、影子流量、部署后质量检查 | [mle-workflow](./02-skill说明文档-附件1.md#mle-workflow) |
| nodejs-keccak256 | 防止 JS/TS 中的 Ethereum 哈希 bug：Node 的 sha3-256 是 NIST SHA3，不是以太坊 Keccak-256 | 计算以太坊函数选择器或事件 topic；在 JS/TS 构建 EIP-712/签名/Merkle/存储槽助手；审查用 Node crypto 直接哈希以太坊数据的代码 | [nodejs-keccak256](./02-skill说明文档-附件1.md#nodejs-keccak256) |
| nutrient-document-processing | 用 Nutrient DWS API 处理/转换/OCR/提取/编辑/签名/填写文档（PDF、DOCX、XLSX、PPTX、HTML、图片） | 跨格式转换文档；从 PDF 提取文本/表格/键值；扫描件或图片 OCR；分享前脱敏 PII；给草稿或机密文档加水印；数字签名合同/协议；程序化填写 PDF 表单 | [nutrient-document-processing](./02-skill说明文档-附件1.md#nutrient-document-processing) |
| prediction-market-oracle-research | 把预测市场作为数据源/预言机信号研究，用于产品、agent、仪表盘与企业决策智能（有出处的市场隐含概率、警示与集成模式分析） | 预测市场被考虑作为数据源、预测输入、类预言机信号或决策智能层 | [prediction-market-oracle-research](./02-skill说明文档-附件1.md#prediction-market-oracle-research) |
| prediction-market-risk-review | 审查预测市场、basket、预言机与交易 agent 工作流的合规、安全、数据质量、隐私与执行风险（在触及 venue auth/组合数据/API 密钥/交易规划前用） | 预测市场工作流触及用户财务上下文、venue 认证、组合数据、自动化或执行能力工具之前 | [prediction-market-risk-review](./02-skill说明文档-附件1.md#prediction-market-risk-review) |
| recsys-pipeline-architect | 用六阶段 Source→Hydrator→Filter→Scorer→Selector→SideEffect 框架设计可组合的推荐/排序/feed 管道（受 xAI 开源 For You 算法启发） | 构建任何"为(用户,上下文)挑 top K 物品"的系统：社交 feed、内容 CMS、RAG reranker、任务优先级、通知分诊、搜索重排、广告排序 | [recsys-pipeline-architect](./02-skill说明文档-附件1.md#recsys-pipeline-architect) |
| visa-doc-translate | 把签证申请文档（图片）翻译成英文并生成"原图+英文翻译"双语 PDF | 用户提供签证申请文档图片路径（存款证明、收入证明、在职证明、退休证明、房产证明、营业执照、身份证/护照等） | [visa-doc-translate](./02-skill说明文档-附件1.md#visa-doc-translate) |

---


## 附：文档生成说明

- **数据源**：`skills/<name>/SKILL.md`（共 277 个），逐个实读 frontmatter + 正文。
- **分类方法**：前缀规则 + 精确名集合，无重复无遗漏（脚本校验 277 个全部归位）。
- **生成方式**：按 15 章（大类拆为 17 个子批次）并行子 agent 精读 → 各自产出分章节 → 合并为本单文件。
- **依赖字典**：`agents/` 67 个子 agent 名单 + 常见 MCP（firecrawl/exa/context7/playwright 等）+ 常见 CLI（gh/docker/kubectl/pytest 等）。
- **限制**：步骤/依赖以 `SKILL.md` 自身为准；部分 skill（如 `remotion-video-creation`）的细则外置于子文件（`rules/*.md`），本表只索引其清单，深入需另读对应子文件。

如发现某 skill 描述与实际行为不符，以仓库 `skills/<name>/SKILL.md` 原文为准。
