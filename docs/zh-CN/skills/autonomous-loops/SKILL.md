---
name: autonomous-loops
description: "autonomous Claude Code loop 的 pattern 与架构——从简单的 sequential pipeline 到 RFC-driven 多 agent DAG 系统。"
metadata:
  origin: ECC
---

# Autonomous Loops 技能

> 兼容性说明（v1.8.0）：`autonomous-loops` 将保留一个 release。
> 当前的 canonical skill 名称为 `continuous-agent-loop`。新的 loop 指南
> 应在那里编写，同时此 skill 仍然保留可用，以避免
> 破坏现有 workflow。

以 autonomous loop 形式运行 Claude Code 的 pattern、架构与参考实现。涵盖从简单的 `claude -p` pipeline 到完整的 RFC-driven 多 agent DAG orchestration 的所有内容。

## 何时使用

- 建立无需人工干预即可运行的 autonomous 开发 workflow
- 为你的 problem 选择合适的 loop 架构（简单 vs 复杂）
- 构建 CI/CD 风格的持续开发 pipeline
- 运行并行 agent 并协调 merge
- 实现跨 loop 迭代的 context 持久化
- 为 autonomous workflow 添加 quality gate 和 cleanup pass

## Loop Pattern 谱系

从最简单到最复杂：

| Pattern | 复杂度 | 最适合 |
|---------|-----------|----------|
| [Sequential Pipeline](#1-sequential-pipeline-claude--p) | 低 | 日常开发步骤、脚本化 workflow |
| [NanoClaw REPL](#2-nanoclaw-repl) | 低 | 交互式持久 session |
| [Infinite Agentic Loop](#3-infinite-agentic-loop) | 中 | 并行内容生成、spec-driven 工作 |
| [Continuous Claude PR Loop](#4-continuous-claude-pr-loop) | 中 | 带 CI gate 的多天迭代项目 |
| [De-Sloppify Pattern](#5-the-de-sloppify-pattern) | 附加 | 在任意 Implementer 步骤之后的 quality cleanup |
| [Ralphinho / RFC-Driven DAG](#6-ralphinho--rfc-driven-dag-orchestration) | 高 | 大型 feature、带 merge queue 的多单元并行工作 |

---

## 1. Sequential Pipeline (`claude -p`)

**最简单的 loop。** 将日常开发拆分为一系列非交互式的 `claude -p` 调用。每次调用都是一个具有明确 prompt 的聚焦步骤。

### 核心见解

> 如果你想不出这样的 loop，意味着你甚至无法在交互模式下驱动 LLM 修复你的代码。

`claude -p` flag 以非交互方式运行 Claude Code 并带有一个 prompt，完成后退出。链式调用以构建 pipeline：

```bash
#!/bin/bash
# daily-dev.sh — 针对 feature branch 的 sequential pipeline

set -e

# Step 1：实现 feature
claude -p "Read the spec in docs/auth-spec.md. Implement OAuth2 login in src/auth/. Write tests first (TDD). Do NOT create any new documentation files."

# Step 2：De-sloppify（cleanup pass）
claude -p "Review all files changed by the previous commit. Remove any unnecessary type tests, overly defensive checks, or testing of language features (e.g., testing that TypeScript generics work). Keep real business logic tests. Run the test suite after cleanup."

# Step 3：验证
claude -p "Run the full build, lint, type check, and test suite. Fix any failures. Do not add new features."

# Step 4：提交
claude -p "Create a conventional commit for all staged changes. Use 'feat: add OAuth2 login flow' as the message."
```

### 关键设计原则

1. **每个步骤是隔离的** —— 每个 `claude -p` 调用使用全新的 context window，意味着步骤之间没有 context 串扰。
2. **顺序很重要** —— 步骤按顺序执行。每个步骤都建立在前一个步骤留下的 filesystem 状态之上。
3. **负面指令是危险的** —— 不要说"不要测试 type system"。相反，应添加一个单独的 cleanup 步骤（见 [De-Sloppify Pattern](#5-the-de-sloppify-pattern)）。
4. **exit code 会传播** —— `set -e` 在失败时停止 pipeline。

### 变体

**使用 model routing：**
```bash
# 使用 Opus 进行 Research（深度推理）
claude -p --model opus "Analyze the codebase architecture and write a plan for adding caching..."

# 使用 Sonnet 进行 Implement（快速、能力强）
claude -p "Implement the caching layer according to the plan in docs/caching-plan.md..."

# 使用 Opus 进行 Review（彻底）
claude -p --model opus "Review all changes for security issues, race conditions, and edge cases..."
```

**使用环境 context：**
```bash
# 通过文件传递 context，而不是通过 prompt 长度
echo "Focus areas: auth module, API rate limiting" > .claude-context.md
claude -p "Read .claude-context.md for priorities. Work through them in order."
rm .claude-context.md
```

**使用 `--allowedTools` 限制：**
```bash
# 只读分析 pass
claude -p --allowedTools "Read,Grep,Glob" "Audit this codebase for security vulnerabilities..."

# 只写实现 pass
claude -p --allowedTools "Read,Write,Edit,Bash" "Implement the fixes from security-audit.md..."
```

---

## 2. NanoClaw REPL

**ECC 内置的 persistent loop。** 一个 session 感知的 REPL，它以完整的对话历史同步调用 `claude -p`。

```bash
# 启动默认 session
node scripts/claw.js

# 带 skill context 的命名 session
CLAW_SESSION=my-project CLAW_SKILLS=tdd-workflow,security-review node scripts/claw.js
```

### 工作原理

1. 从 `~/.claude/claw/{session}.md` 加载对话历史
2. 每条用户消息都连同完整历史作为 context 发送给 `claude -p`
3. 响应被追加到 session 文件中（Markdown 作为数据库）
4. session 在重启后依然持久存在

### 何时使用 NanoClaw vs Sequential Pipeline

| 使用场景 | NanoClaw | Sequential Pipeline |
|----------|----------|-------------------|
| 交互式探索 | 是 | 否 |
| 脚本化自动化 | 否 | 是 |
| Session 持久化 | 内置 | 手动 |
| Context 累积 | 每轮递增 | 每步全新 |
| CI/CD 集成 | 差 | 优秀 |

详情请参阅 `/claw` 命令文档。

---

## 3. Infinite Agentic Loop

**一个 two-prompt 系统**，通过编排并行 sub-agent 来进行 spec-driven 生成。由 disler 开发（credit: @disler）。

### 架构：Two-Prompt System

```
PROMPT 1 (Orchestrator)              PROMPT 2 (Sub-Agents)
┌─────────────────────┐             ┌──────────────────────┐
│ Parse spec file      │             │ Receive full context  │
│ Scan output dir      │  deploys   │ Read assigned number  │
│ Plan iteration       │────────────│ Follow spec exactly   │
│ Assign creative dirs │  N agents  │ Generate unique output │
│ Manage waves         │             │ Save to output dir    │
└─────────────────────┘             └──────────────────────┘
```

### 该 Pattern

1. **Spec Analysis** —— Orchestrator 读取一个定义要生成什么的 specification 文件（Markdown）
2. **Directory Recon** —— 扫描现有输出以找到最高的迭代编号
3. **Parallel Deployment** —— 启动 N 个 sub-agent，每个带有：
   - 完整的 spec
   - 一个唯一的创作方向
   - 一个具体的迭代编号（无冲突）
   - 现有迭代的一份快照（用于唯一性）
4. **Wave Management** —— 对于 infinite 模式，每波部署 3-5 个 agent 直到 context 耗尽

### 通过 Claude Code Command 实现

创建 `.claude/commands/infinite.md`：

```markdown
Parse the following arguments from $ARGUMENTS:
1. spec_file — path to the specification markdown
2. output_dir — where iterations are saved
3. count — integer 1-N or "infinite"

PHASE 1: Read and deeply understand the specification.
PHASE 2: List output_dir, find highest iteration number. Start at N+1.
PHASE 3: Plan creative directions — each agent gets a DIFFERENT theme/approach.
PHASE 4: Deploy sub-agents in parallel (Task tool). Each receives:
  - Full spec text
  - Current directory snapshot
  - Their assigned iteration number
  - Their unique creative direction
PHASE 5 (infinite mode): Loop in waves of 3-5 until context is low.
```

**调用：**
```bash
/project:infinite specs/component-spec.md src/ 5
/project:infinite specs/component-spec.md src/ infinite
```

### Batching 策略

| 数量 | 策略 |
|-------|----------|
| 1-5 | 所有 agent 同时运行 |
| 6-20 | 每批 5 个 |
| infinite | 每波 3-5 个，逐步提升复杂度 |

### 关键见解：通过分配实现唯一性

不要依赖 agent 自行区分。orchestrator 为每个 agent **分配**具体的创作方向和迭代编号。这样可以防止并行 agent 之间出现重复的概念。

---

## 4. Continuous Claude PR Loop

**一个生产级别的 shell 脚本**，它以 continuous loop 运行 Claude Code，创建 PR、等待 CI 并自动 merge。由 AnandChowdhary 创建（credit: @AnandChowdhary）。

### 核心 Loop

```
┌─────────────────────────────────────────────────────┐
│  CONTINUOUS CLAUDE ITERATION                        │
│                                                     │
│  1. Create branch (continuous-claude/iteration-N)   │
│  2. Run claude -p with enhanced prompt              │
│  3. (Optional) Reviewer pass — separate claude -p   │
│  4. Commit changes (claude generates message)       │
│  5. Push + create PR (gh pr create)                 │
│  6. Wait for CI checks (poll gh pr checks)          │
│  7. CI failure? → Auto-fix pass (claude -p)         │
│  8. Merge PR (squash/merge/rebase)                  │
│  9. Return to main → repeat                         │
│                                                     │
│  Limit by: --max-runs N | --max-cost $X             │
│            --max-duration 2h | completion signal     │
└─────────────────────────────────────────────────────┘
```

### 安装

> **警告：** 在审查代码后从其 repository 安装 continuous-claude。不要将外部脚本直接 pipe 到 bash。

### 用法

```bash
# 基本用法：10 次迭代
continuous-claude --prompt "Add unit tests for all untested functions" --max-runs 10

# 按成本限制
continuous-claude --prompt "Fix all linter errors" --max-cost 5.00

# 按时间限制
continuous-claude --prompt "Improve test coverage" --max-duration 8h

# 带 code review pass
continuous-claude \
  --prompt "Add authentication feature" \
  --max-runs 10 \
  --review-prompt "Run npm test && npm run lint, fix any failures"

# 通过 worktree 并行执行
continuous-claude --prompt "Add tests" --max-runs 5 --worktree tests-worker &
continuous-claude --prompt "Refactor code" --max-runs 5 --worktree refactor-worker &
wait
```

### 跨迭代的 Context：SHARED_TASK_NOTES.md

关键创新：一个 `SHARED_TASK_NOTES.md` 文件在迭代之间持久存在：

```markdown
## Progress
- [x] Added tests for auth module (iteration 1)
- [x] Fixed edge case in token refresh (iteration 2)
- [ ] Still need: rate limiting tests, error boundary tests

## Next Steps
- Focus on rate limiting module next
- The mock setup in tests/helpers.ts can be reused
```

Claude 在迭代开始时读取该文件，并在迭代结束时更新它。这弥合了独立的 `claude -p` 调用之间的 context 鸿沟。

### CI 失败恢复

当 PR check 失败时，Continuous Claude 自动：
1. 通过 `gh run list` 获取失败的 run ID
2. 以 CI 修复 context 启动一个新的 `claude -p`
3. Claude 通过 `gh run view` 检查 log，修复代码，提交，推送
4. 重新等待 check（最多 `--ci-retry-max` 次尝试）

### 完成信号

Claude 可以通过输出一个 magic phrase 来发出"我已完成"的信号：

```bash
continuous-claude \
  --prompt "Fix all bugs in the issue tracker" \
  --completion-signal "CONTINUOUS_CLAUDE_PROJECT_COMPLETE" \
  --completion-threshold 3  # 连续 3 次信号后停止
```

连续三次迭代发出完成信号即停止 loop，避免在已完成的工作上浪费运行。

### 关键配置

| Flag | 用途 |
|------|---------|
| `--max-runs N` | 在 N 次成功迭代后停止 |
| `--max-cost $X` | 花费 $X 后停止 |
| `--max-duration 2h` | 超时后停止 |
| `--merge-strategy squash` | squash、merge 或 rebase |
| `--worktree <name>` | 通过 git worktree 并行执行 |
| `--disable-commits` | Dry-run 模式（无 git 操作） |
| `--review-prompt "..."` | 每次迭代添加 reviewer pass |
| `--ci-retry-max N` | 自动修复 CI 失败（默认：1） |

---

## 5. The De-Sloppify Pattern

**适用于任何 loop 的附加 pattern。** 在每个 Implementer 步骤之后添加一个专门的 cleanup/refactor 步骤。

### 问题

当你要求 LLM 用 TDD 实现时，它会过于字面地理解"编写测试"：
- 验证 TypeScript type system 是否工作的测试（测试 `typeof x === 'string'`）
- 对 type system 已经保证的事情进行过度防御性的 runtime check
- 测试 framework 行为而非业务逻辑的测试
- 掩盖实际代码的过度 error handling

### 为什么不使用负面指令？

在 Implementer prompt 中添加"不要测试 type system"或"不要添加不必要的检查"会有下游影响：
- model 对所有测试都变得犹豫
- 它会跳过合理的 edge case 测试
- 质量以不可预测的方式下降

### 解决方案：单独的 Pass

与其限制 Implementer，不如让它彻底发挥。然后添加一个专注的 cleanup agent：

```bash
# Step 1：实现（让它彻底发挥）
claude -p "Implement the feature with full TDD. Be thorough with tests."

# Step 2：De-sloppify（独立的 context，专注 cleanup）
claude -p "Review all changes in the working tree. Remove:
- Tests that verify language/framework behavior rather than business logic
- Redundant type checks that the type system already enforces
- Over-defensive error handling for impossible states
- Console.log statements
- Commented-out code

Keep all business logic tests. Run the test suite after cleanup to ensure nothing breaks."
```

### 在 Loop Context 中

```bash
for feature in "${features[@]}"; do
  # 实现
  claude -p "Implement $feature with TDD."

  # De-sloppify
  claude -p "Cleanup pass: review changes, remove test/code slop, run tests."

  # 验证
  claude -p "Run build + lint + tests. Fix any failures."

  # 提交
  claude -p "Commit with message: feat: add $feature"
done
```

### 关键见解

> 与其添加具有下游质量影响的负面指令，不如添加一个单独的 de-sloppify pass。两个专注的 agent 优于一个受限的 agent。

---

## 6. Ralphinho / RFC-Driven DAG Orchestration

**最复杂的 pattern。** 一个 RFC-driven 的多 agent pipeline，它将 spec 分解为一个 dependency DAG，让每个单元经过分层 quality pipeline，并通过 agent 驱动的 merge queue 落地。由 enitrat 创建（credit: @enitrat）。

### 架构概览

```
RFC/PRD Document
       │
       ▼
  DECOMPOSITION (AI)
  Break RFC into work units with dependency DAG
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  RALPH LOOP (up to 3 passes)                         │
│                                                      │
│  For each DAG layer (sequential, by dependency):     │
│                                                      │
│  ┌── Quality Pipelines (parallel per unit) ───────┐  │
│  │  Each unit in its own worktree:                │  │
│  │  Research → Plan → Implement → Test → Review   │  │
│  │  (depth varies by complexity tier)             │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌── Merge Queue ─────────────────────────────────┐  │
│  │  Rebase onto main → Run tests → Land or evict │  │
│  │  Evicted units re-enter with conflict context  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### RFC 分解

AI 读取 RFC 并生成 work unit：

```typescript
interface WorkUnit {
  id: string;              // kebab-case 标识符
  name: string;            // 人类可读的名称
  rfcSections: string[];   // 该 unit 涉及哪些 RFC 小节
  description: string;     // 详细描述
  deps: string[];          // 依赖（其他 unit ID）
  acceptance: string[];    // 具体的验收标准
  tier: "trivial" | "small" | "medium" | "large";
}
```

**分解规则：**
- 倾向于更少、更具内聚性的 unit（最小化 merge 风险）
- 最小化 unit 之间的文件重叠（避免冲突）
- 将测试与实现放在一起（绝不分离"实现 X"+"测试 X"）
- 仅在存在真实代码依赖时才设置依赖

dependency DAG 决定执行顺序：
```
Layer 0: [unit-a, unit-b]     ← 无依赖，并行运行
Layer 1: [unit-c]             ← 依赖 unit-a
Layer 2: [unit-d, unit-e]     ← 依赖 unit-c
```

### 复杂度分层

不同的 tier 会得到不同的 pipeline 深度：

| Tier | Pipeline 阶段 |
|------|----------------|
| **trivial** | implement → test |
| **small** | implement → test → code-review |
| **medium** | research → plan → implement → test → PRD-review + code-review → review-fix |
| **large** | research → plan → implement → test → PRD-review + code-review → review-fix → final-review |

这避免了对简单变更执行昂贵的操作，同时确保架构变更得到彻底审查。

### 独立的 Context Window（消除作者偏见）

每个阶段在独立的 agent 进程中运行，拥有自己的 context window：

| 阶段 | Model | 用途 |
|-------|-------|---------|
| Research | Sonnet | 阅读 codebase + RFC，产出 context 文档 |
| Plan | Opus | 设计实现步骤 |
| Implement | Codex | 按计划编写代码 |
| Test | Sonnet | 运行 build + test suite |
| PRD Review | Sonnet | Spec 合规性检查 |
| Code Review | Opus | 质量 + 安全检查 |
| Review Fix | Codex | 处理 review 问题 |
| Final Review | Opus | Quality gate（仅 large tier） |

**关键设计：** reviewer 从未编写过它所 review 的代码。这消除了作者偏见——这是 self-review 中最常导致问题被遗漏的根源。

### 带 Eviction 的 Merge Queue

quality pipeline 完成后，unit 进入 merge queue：

```
Unit branch
    │
    ├─ Rebase onto main
    │   └─ Conflict? → EVICT (capture conflict context)
    │
    ├─ Run build + tests
    │   └─ Fail? → EVICT (capture test output)
    │
    └─ Pass → Fast-forward main, push, delete branch
```

**文件重叠智能：**
- 不重叠的 unit 以投机方式并行落地
- 重叠的 unit 逐一落地，每次都进行 rebase

**Eviction 恢复：**
被 evict 时，会捕获完整的 context（冲突文件、diff、测试输出），并在下一次 Ralph pass 中反馈给 implementer：

```markdown
## MERGE CONFLICT — RESOLVE BEFORE NEXT LANDING

Your previous implementation conflicted with another unit that landed first.
Restructure your changes to avoid the conflicting files/lines below.

{full eviction context with diffs}
```

### 阶段之间的数据流

```
research.contextFilePath ──────────────────→ plan
plan.implementationSteps ──────────────────→ implement
implement.{filesCreated, whatWasDone} ─────→ test, reviews
test.failingSummary ───────────────────────→ reviews, implement (next pass)
reviews.{feedback, issues} ────────────────→ review-fix → implement (next pass)
final-review.reasoning ────────────────────→ implement (next pass)
evictionContext ───────────────────────────→ implement (after merge conflict)
```

### Worktree 隔离

每个 unit 都在隔离的 worktree 中运行（使用 jj/Jujutsu，而非 git）：
```
/tmp/workflow-wt-{unit-id}/
```

同一 unit 的 pipeline 阶段**共享**一个 worktree，在 research → plan → implement → test → review 之间保留状态（context 文件、plan 文件、代码变更）。

### 关键设计原则

1. **确定性执行** —— 提前分解锁定并行性与顺序
2. **在关键节点进行人工 review** —— work plan 是唯一最高杠杆的干预点
3. **分离关注点** —— 每个阶段在独立的 context window 中由独立的 agent 执行
4. **带 context 的冲突恢复** —— 完整的 eviction context 支持智能重跑，而非盲目重试
5. **Tier 驱动的深度** —— trivial 变更跳过 research/review；large 变更获得最大程度的审查
6. **可恢复的 workflow** —— 完整状态持久化到 SQLite；可从任意点恢复

### 何时使用 Ralphinho vs 更简单的 Pattern

| 信号 | 使用 Ralphinho | 使用更简单的 Pattern |
|--------|--------------|-------------------|
| 多个相互依赖的 work unit | 是 | 否 |
| 需要并行实现 | 是 | 否 |
| 可能出现 merge conflict | 是 | 否（顺序执行即可） |
| 单文件变更 | 否 | 是（sequential pipeline） |
| 多天项目 | 是 | 可能（continuous-claude） |
| Spec/RFC 已编写 | 是 | 可能 |
| 对单个事项快速迭代 | 否 | 是（NanoClaw 或 pipeline） |

---

## 选择合适的 Pattern

### 决策矩阵

```
Is the task a single focused change?
├─ Yes → Sequential Pipeline or NanoClaw
└─ No → Is there a written spec/RFC?
         ├─ Yes → Do you need parallel implementation?
         │        ├─ Yes → Ralphinho (DAG orchestration)
         │        └─ No → Continuous Claude (iterative PR loop)
         └─ No → Do you need many variations of the same thing?
                  ├─ Yes → Infinite Agentic Loop (spec-driven generation)
                  └─ No → Sequential Pipeline with de-sloppify
```

### 组合 Pattern

这些 pattern 可以很好地组合：

1. **Sequential Pipeline + De-Sloppify** —— 最常见的组合。每个 implement 步骤都有一个 cleanup pass。

2. **Continuous Claude + De-Sloppify** —— 为每次迭代添加带 de-sloppify 指令的 `--review-prompt`。

3. **任意 loop + Verification** —— 使用 ECC 的 `/verify` 命令或 `verification-loop` skill 作为 commit 前的 gate。

4. **在更简单的 loop 中使用 Ralphinho 的分层方法** —— 即使在 sequential pipeline 中，你也可以将简单 task 路由到 Haiku，将复杂 task 路由到 Opus：
   ```bash
   # 简单的格式化修复
   claude -p --model haiku "Fix the import ordering in src/utils.ts"

   # 复杂的架构变更
   claude -p --model opus "Refactor the auth module to use the strategy pattern"
   ```

---

## Anti-Pattern

### 常见错误

1. **没有退出条件的 infinite loop** —— 始终要有 max-runs、max-cost、max-duration 或 completion signal。

2. **迭代之间没有 context 桥接** —— 每个 `claude -p` 调用都全新开始。使用 `SHARED_TASK_NOTES.md` 或 filesystem 状态来桥接 context。

3. **重试同一个失败** —— 如果某次迭代失败，不要只是重试。捕获错误 context 并将其提供给下一次尝试。

4. **用负面指令代替 cleanup pass** —— 不要说"不要做 X"。添加一个单独的 pass 来移除 X。

5. **所有 agent 在同一个 context window 中** —— 对于复杂的 workflow，应将不同关注点分离到不同的 agent 进程中。reviewer 绝不应是作者。

6. **忽视并行工作中的文件重叠** —— 如果两个并行 agent 可能编辑同一个文件，你需要一个 merge 策略（顺序落地、rebase 或 conflict resolution）。

---

## 参考

| 项目 | 作者 | 链接 |
|---------|--------|------|
| Ralphinho | enitrat | credit: @enitrat |
| Infinite Agentic Loop | disler | credit: @disler |
| Continuous Claude | AnandChowdhary | credit: @AnandChowdhary |
| NanoClaw | ECC | 本 repo 中的 `/claw` 命令 |
| Verification Loop | ECC | 本 repo 中的 `skills/verification-loop/` |
