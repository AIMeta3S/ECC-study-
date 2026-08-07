# ECC 仓库 Agents 使用分析

> 本文分析 "Everything Claude Code (ECC)" 插件仓库中 agents（subagents）的定义、加载/调用机制，以及在实际开发任务中的使用方式。所有结论均来自对 `agents/`、`commands/`、`skills/`、`rules/`、`docs/`、`.claude-plugin/`、`scripts/` 的实际探索。

---

## 1. 本质：agent 是什么

仓库里每个 agent 就是一个带 YAML frontmatter 的 Markdown 文件，统一放在 [agents/](../agents/) 目录，共 **67 个**。典型结构（以 [agents/code-reviewer.md](../agents/code-reviewer.md) 为例）：

```yaml
---
name: code-reviewer
description: Use immediately after writing or modifying code. MUST BE USED for all code changes.
tools: ["Read", "Grep", "Glob", "Bash"]
model: sonnet
---
（正文：角色定位、执行流程、输出格式，开头通常是一段 Prompt Defense Baseline）
```

- **一个 `.md` 文件 = 一个 subagent**，文件名与 `name` 一致。
- 正文是该 subagent 被激活后的"系统提示"，规定它怎么工作。
- 主会话（你直接对话的那个 Claude）通过内置的 Task/Agent 工具把任务委派给某个 subagent，subagent 在独立的上下文、受限的工具白名单、指定的 model 下执行，完成后把结果回传。

---

## 2. 定义规范（frontmatter 四字段）

校验逻辑在 [scripts/ci/validate-agents.js](../scripts/ci/validate-agents.js)，是 `npm test` 的一环。

| 字段 | 作用 | 备注 |
|---|---|---|
| `name` | subagent 标识，与文件名一致 | 主会话调用时引用它 |
| `description` | **最关键字段**，决定"何时用" | 既是语义线索，也是运行时路由依据；常见 `Use PROACTIVELY` / `MUST BE USED` 措辞 |
| `tools` | 该 subagent 的工具白名单 | 审查类多只读 `Read,Grep,Glob,Bash`；构建修复类加 `Write,Edit` |
| `model` | 强制字段，合法值 `haiku`/`sonnet`/`opus` | 分布：sonnet ~58、opus 8、haiku 1 |

**model 分布规律**：贵模型（opus）只用在需要深度推理的地方——`planner`、`architect`、`spec-miner`、gan 三件套（`gan-planner/gan-generator/gan-evaluator`）、`healthcare-reviewer`、`chief-of-staff`。便宜的 haiku 给机械活——`doc-updater`。其余几乎都是 sonnet。

### 67 个 agent 的职责分类

| 分类 | 代表 agent | 数量 |
|---|---|---|
| 规划/架构 | `planner`、`architect`、`code-architect`、`a11y-architect`、`spec-miner` | 7 |
| 代码审查（通用+跨语言） | `code-reviewer`、`security-reviewer`、`silent-failure-hunter` | 3 |
| 语言专项审查 | `python-reviewer`、`typescript-reviewer`、`rust-reviewer`、`go-reviewer`、`java-reviewer`、`kotlin-reviewer`、`swift-reviewer`、`cpp-reviewer`、`csharp-reviewer`、`fsharp-reviewer`、`php-reviewer` | 11 |
| 框架/领域专项审查 | `react-reviewer`、`vue-reviewer`、`flutter-reviewer`、`django-reviewer`、`fastapi-reviewer`、`database-reviewer`、`mle-reviewer`、`healthcare-reviewer`、`network-config-reviewer` | 9 |
| 构建错误修复 | `<lang>-build-resolver`：`rust/go/java/kotlin/swift/cpp/dart/django/pytorch/react-build-resolver` + 通用 `build-error-resolver` | 11 |
| 测试 | `tdd-guide`、`e2e-runner`、`pr-test-analyzer` | 3 |
| 文档/分析 | `docs-lookup`、`doc-updater`、`code-explorer`、`comment-analyzer`、`conversation-analyzer`、`type-design-analyzer`、`code-simplifier`、`refactor-cleaner` | 8 |
| 开源发布流水线 | `opensource-forker`、`opensource-sanitizer`、`opensource-packager` | 3 |
| GAN Harness | `gan-planner`、`gan-generator`、`gan-evaluator`（全 opus） | 3 |
| Harness/Loop 运维 | `harness-optimizer`、`loop-operator`、`agent-evaluator` | 3 |
| 网络/系统排障 | `network-troubleshooter`、`harmonyos-app-resolver`、`performance-optimizer` | 3 |
| 业务/沟通/内容 | `chief-of-staff`、`marketing-agent`、`seo-specialist` | 3 |

**命名约定**：`<lang>-reviewer`（审查）/ `<lang>-build-resolver`（构建修复）/ `<role>`（其他）。

---

## 3. 加载与部署机制

放到 `~/.claude/agents/`（全局）或 `.claude/agents/`（项目级）目录下的 agents 会被自动发现，harness 会加载所有 agents 的 description 到上下文中，并生成语义路由。

### 3.1 model 可被环境变量覆盖

[docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) 提到 `CLAUDE_CODE_SUBAGENT_MODEL=haiku` 可把所有 subagent 工作路由到更便宜的模型——省钱手段。

### 3.2 安装部署（两条互斥路径）

详见 [README.md](README.md)（"Pick one path only"）：

1. **插件（推荐）**：`/plugin marketplace add ...` + `/plugin install ecc@ecc`。agents/skills/commands/hooks 自动加载。**注意**：插件机制不能分发 `rules/`，需手动 `cp -R rules/common ~/.claude/rules/ecc/`。
2. **手动安装器**：`./install.sh --profile <p> --target claude`，由 [manifests/install-modules.json](../manifests/install-modules.json) 的 `agents-core` 模块驱动，把文件原样复制到 `~/.claude/agents/`（[scripts/lib/install-targets/claude-home.js](../scripts/lib/install-targets/claude-home.js) 对 agents 不做命名空间重映射，正是为了让"按约定发现"能找到它们）。

---

## 4. 调用机制

### 4.1 底层通路：Task 工具委派 + description 语义路由

主会话**不**通过硬编码 API 调 subagent，流程是：

1. 主会话同时持有"用户请求"和"所有 agent 的 description"；
2. 做语义匹配，命中后通过内置 Task/Agent 工具（指定 `subagent_type: <name>`）启动该 subagent；
3. subagent 在白名单工具 + 指定 model 下独立执行，结果回传主会话。

### 4.2 四种触发来源

agent 被调用只有一条底层通路（见 4.1），但**由谁、在什么场景下发起**这次调用，有四种来源：

| 触发来源 | 说明 | 例子 |
|---|---|---|
| **① 主会话自动委派**（隐式） | 主会话据 description 语义匹配自动发起，无需 command 介入。触发规则写死在 [AGENTS.md](../AGENTS.md) 的 "Agent Orchestration" 段 + [rules/common/agents.md](../rules/common/agents.md)（"No user prompt needed"主动委派，独立任务一律并行 Task 执行） | "Complex feature requests → planner"、"Code just written/modified → code-reviewer"、"Security-sensitive code → security-reviewer" |
| **② command 正文委托**（显式，最常见） | command 正文写"使用 Task 工具调用 `<agent>` agent"（"invoke `<agent>` agent via Task tool"） | [commands/rust-build.md](../commands/rust-build.md) → `rust-build-resolver` |
| **③ command frontmatter 声明** | 此方式只在 opencode 环境下有效。command 的 frontmatter 写 `agent: xxx:security-reviewer` + `subtask: true`，harness 自动在 subagent 中跑。 | - |
| **④ 编排器 skill 分派** | `orch-*` 命令包装 [skills/orch-pipeline/](../skills/orch-pipeline/SKILL.md) 引擎，按阶段把任务派给不同 agent | `/orch-add-feature`、`/orch-fix-defect` |

---

## 5. 按场景的实际使用流程

这是本文最实用的部分——遇到某类任务时，该走哪条 agent 链路。

| 开发任务 | 典型 agent 链路 | 入口命令/skill |
|---|---|---|
| **写新功能（轻量）** | `code-explorer`(理解现状) → `code-architect`(出蓝图) → 实现(倾向 TDD) → `code-reviewer` | `/feature-dev` |
| **写新功能（带门控）** | 同上阶段 + 计划后/提交前两个人工 gate + 触及安全路径时自动加 `security-reviewer` | `/orch-add-feature` |
| **修 bug** | `code-explorer`(根因) → 把 bug 复现为**失败的回归测试** → 修复至绿 → `code-reviewer` | `/orch-fix-defect` |
| **代码审查（通用）** | 7 类质量+安全审查 → `code-reviewer` | `/code-review` |
| **代码审查（语言专项）** | `python-reviewer`/`rust-reviewer`/…；TSX/JSX 的 PR 会**同时**跑 `react-reviewer` + `typescript-reviewer` | `/python-review`、`/rust-review`… |
| **修构建错误** | 通用 `/build-fix` 内联；语言专项委派 `rust-build-resolver`/`go-build-resolver`/`react-build-resolver` 等（一次修一个错，3 次或架构变更时升级） | `/build-fix`、`/rust-build`… |
| **写测试** | `tdd-guide`(红→绿→重构)；关键链路 → `e2e-runner`(Playwright) | `/tdd`、`/e2e` |
| **架构/模糊决策** | 系统设计 → `architect`；需正反方辩论的通过/否决 → `council` skill（Skeptic/Pragmatist/Critic + Architect 四声并行） | `architect`、`/council` |
| **引导 MVP / 大规模生成** | `gan-planner`(规格) → `gan-generator`↔`gan-evaluator`(对抗循环到达标或 plateau) | `/gan-build` |
| **发布前对抗性双重审查** | 并行两个独立 reviewer（Claude `code-reviewer`@opus + 外部模型 codex/gemini），双通过才推，最多 3 轮 | `/santa-loop` |
| **文档** | 更新 codemap/文档 → `doc-updater`(haiku，便宜)；查第三方 API → `docs-lookup`(Context7 MCP) | `/update-docs` |
| **开源准备** | `opensource-forker`(剥离密钥) → `opensource-sanitizer`(核验 PASS/FAIL) → `opensource-packager`(生成 README/LICENSE/setup.sh) | `opensource-pipeline` skill |

### orch-pipeline 引擎的阶段映射

[skills/orch-pipeline/](skills/orch-pipeline/) 定义了通用阶段管道，是 `/orch-*` 系列的共享引擎：

| 阶段 | 主 agent | 兜底/升级 |
|---|---|---|
| 理解现状 | `code-explorer` | 追踪现有路径 |
| 规划 | `planner` | `architect`、`code-architect` |
| 实现 | `tdd-guide` | `build-error-resolver` / `/build-fix`（构建断了） |
| 审查 | `code-reviewer` | 语言专项 reviewer（`python-reviewer`、`typescript-reviewer`…） |
| 安全 | `security-reviewer` | — |
| MVP 内循环 | `/gan-build --skip-planner` | `gan-generator` → `gan-evaluator` |

各 `/orch-*` 命令的差别只在"首操作"和"阶段掩码"。例如 `orch-fix-defect` 第一步是"把 bug 复现为新的失败测试再修绿"，`orch-add-feature` 第一步是"为新行为写新的失败测试"。

---

## 6. 多 agent 编排的三种典型模式

### 模式 A：GAN 对抗闭环（[commands/gan-build.md](commands/gan-build.md) + [skills/gan-style-harness/](skills/gan-style-harness/)）

```
gan-planner (出规格 spec.md)
  → gan-generator (按规格实现，读上一轮反馈迭代)
  ↔ gan-evaluator (用 Playwright 测线上应用，按 rubric 打分)
  → 达到 pass_threshold 或检测到 plateau 则停
```

**为什么分离 evaluator**：[skills/gan-style-harness/](skills/gan-style-harness/) 指出，这是为了对抗"agent 评估自己工作时的病态乐观主义"——让独立的 evaluator 用真实浏览器去测，而不是让生成者自评。

### 模式 B：共享引擎的 orch 系列

五个命令（`/orch-add-feature`、`/orch-fix-defect`、`/orch-change-feature`、`/orch-refine-code`、`/orch-build-mvp`）共用 [skills/orch-pipeline/](skills/orch-pipeline/) 引擎，差别只在首操作和阶段掩码。整套系列带两个**人工 gate**（计划批准、提交确认）。

### 模式 C：并行无记忆双重审查（[commands/santa-loop.md](commands/santa-loop.md)）

```
并行启动两个 reviewer（同一条消息里并发）：
  Reviewer A：Claude code-reviewer @ opus（必跑）
  Reviewer B：外部模型 codex/gemini（都没装则回退第二个 code-reviewer）
→ 双通过才推；不通过则修复，最多 3 轮，每轮换新 reviewer（无记忆，避免前轮结论污染）
```

这是"检查两次"（measure twice）模式在 AI 编码上的落地。

---

## 7. 使用原则：何时委派、何时内联

来自 [rules/common/agents.md](rules/common/agents.md) 与 [commands/plan.md](commands/plan.md)：

- **偏向委派**：领域专项工作（审查、构建修复、规划、安全）→ 用对应 agent；独立任务尽量**并行** Task。
- **偏向内联**：简单事务直接做。[commands/plan.md](commands/plan.md) 甚至显式写"默认内联，**不要**调用 Task 工具或任何 subagent"——保证即便没装 agent 文件，`/plan` 也能用。
- **强制升级**：diff 触及认证 / 用户输入 / 数据库查询 / 文件系统 / 外部 API / 加密 / 支付时，[rules/common/code-review.md](rules/common/code-review.md) 要求 `STOP and use security-reviewer agent`。
- **标准管道**：[rules/common/development-workflow.md](rules/common/development-workflow.md) 规定 `planner → tdd-guide → code-reviewer`。

### 一句话总结

> ECC 的 agent 体系 = **"按目录约定自动发现 + description 语义路由 + Task 工具委派（可并行）"**。日常任务走"语言专项 reviewer / build-resolver"单点委派；高影响工作（功能、MVP、发布门控）走 `orch-*` / `gan` / `santa-loop` 多 agent 编排；简单事务仍保持内联。

---

## 8. 关键文件速查表

| 用途 | 路径 |
|---|---|
| Agent 定义目录（67 个） | [agents/](agents/) |
| Frontmatter 校验逻辑 | [scripts/ci/validate-agents.js](scripts/ci/validate-agents.js) |
| 仓库级编排说明 | [AGENTS.md](AGENTS.md) |
| 给 Claude 读的 agent 使用规则 | [rules/common/agents.md](rules/common/agents.md) |
| "agents 按约定发现、禁止入 manifest" | [.claude-plugin/PLUGIN_SCHEMA_NOTES.md](.claude-plugin/PLUGIN_SCHEMA_NOTES.md) |
| 插件清单 | [.claude-plugin/plugin.json](.claude-plugin/plugin.json) |
| 安装模块定义（agents-core） | [manifests/install-modules.json](manifests/install-modules.json) |
| Claude 安装目标适配器 | [scripts/lib/install-targets/claude-home.js](scripts/lib/install-targets/claude-home.js) |
| 安装执行入口 | [scripts/install-apply.js](scripts/install-apply.js) |
| subagent model 环境变量 | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |
| 共享编排引擎 | [skills/orch-pipeline/](skills/orch-pipeline/) |
| GAN 对抗闭环说明 | [skills/gan-style-harness/](skills/gan-style-harness/) |
| 强制安全审查触发器 | [rules/common/code-review.md](rules/common/code-review.md) |
| 标准开发管道 | [rules/common/development-workflow.md](rules/common/development-workflow.md) |
