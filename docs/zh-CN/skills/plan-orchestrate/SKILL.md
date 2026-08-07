---
name: plan-orchestrate
description: 读取计划文档，将其分解为步骤，从 ECC catalogue 中为每个步骤设计 agent chain，并生成可直接粘贴的 /orchestrate custom prompts。仅生成——绝不自行调用 /orchestrate。当用户拥有多步骤计划并希望通过 orchestrate 驱动而无需手动组合 chains 时使用。
metadata:
  origin: ECC
---

# Plan Orchestrate

将计划文档桥接到 `/orchestrate custom`，为每个步骤生成一条可直接粘贴的调用。本 skill 仅生成内容——它从不执行 `/orchestrate`。用户在就绪时逐行粘贴。

## 何时激活

- 用户拥有多步骤计划文档（PRD、RFC、implementation plan），并希望通过 `/orchestrate` 驱动它。
- 用户说"orchestrate this plan"、"give me orchestrate prompts for each step"、"compose chains for this plan"。
- 存在分步计划，但用户不想为每个步骤手动挑选 agents。

跳过条件：
- 工作是单个临时步骤 → 直接调用 `/orchestrate custom`。
- 计划不可读或为空。仅缺少显式编号不是跳过条件——见下文"No clear steps"边界情况。

## 输入

```
<plan-doc-path> [--lang=python|typescript|go|rust|cpp|java|kotlin|flutter|auto] [--scope=all|step:<n>|range:<a>-<b>] [--dry-run]
```

- `<plan-doc-path>` —— 必需；相对或绝对路径（接受 `@docs/...`）。
- `--lang` —— reviewer 语言变体；默认为 `auto`（从项目检测）。
- `--scope` —— 限制输出的步骤；默认为 `all`。
- `--dry-run` —— 仅打印分解 + chain 理由；不输出最终 prompts。

## 权威 `/orchestrate` 形态（不得偏离）

```
{ORCH_CMD} custom "<agent1>,<agent2>,...,<agentN>" "<task description>"
```

其中 `{ORCH_CMD}` 在 Phase 0 中确定（见下文）。输出中的命令字符串**始终使用一种具体形态**——绝不混用两者，绝不使用占位符。

- `custom` 是一个顺序 chain；每个 agent 的 HANDOFF 传递给下一个。
- 逗号分隔的 agent 列表。首选无空格；容忍一个空格。
- 不存在 `--mode` / `--gate` / `--agents=...` flags——绝不捏造它们。
- Agent 名来自本 skill 的 catalogue。任务描述中的内嵌双引号转义为 `\"`。

## ECC 安装形态与命名空间

两种安装形态决定了 **slash command 和每个 agent 名**两者上的前缀。二者必须保持同步——每个输出使用一种形态，绝不混用：

设 `<claude-home>` 表示 Claude Code 主目录：macOS/Linux 上为 `~/.claude`，Windows 上为 `%USERPROFILE%\.claude`。按宿主平台解析用户主目录的方式解析它（不要硬编码 `~`）。

| 形态 | 检测方式 | `{ORCH_CMD}` | Agent 名格式 |
|---|---|---|---|
| Plugin install（1.9.0+） | 存在 `<claude-home>/plugins/marketplaces/everything-claude-code/` | `/everything-claude-code:orchestrate` | `everything-claude-code:<name>` |
| Legacy bare install | 上述不存在；agent 文件位于 `<claude-home>/agents/` | `/orchestrate` | `<name>` |

为何重要：在 plugin install 下，agents 注册为 `everything-claude-code:tdd-guide`。裸名强制 fuzzy matching，这在并行调用下会间歇性失败。在 legacy 下，带前缀的形态未注册，会直接失败。

## 可用 agent catalogue（必须从中挑选）

通用：
- `planner` —— 需求重述、风险分解、步骤规划
- `architect` —— 架构、系统设计、refactor 提案
- `tdd-guide` —— 写测试 → 实现 → 80%+ 覆盖率
- `code-reviewer` —— 通用 code review
- `security-reviewer` —— 安全审计、OWASP、secret 泄露
- `refactor-cleaner` —— 死代码、重复项、knip-class 清理
- `doc-updater` —— 文档、codemap、README
- `docs-lookup` —— 第三方库 API 查找（Context7）
- `e2e-runner` —— 端到端测试编排
- `database-reviewer` —— PostgreSQL schema、migration、性能
- `harness-optimizer` —— 本地 agent harness 配置
- `loop-operator` —— 长时运行的 autonomous loops
- `chief-of-staff` —— 多渠道 triage（很少适用于计划步骤）

构建错误 resolvers：
- `build-error-resolver`（通用）/ `cpp-build-resolver` / `go-build-resolver` / `java-build-resolver` / `kotlin-build-resolver` / `rust-build-resolver` / `pytorch-build-resolver`

代码 reviewers：
- `python-reviewer` / `typescript-reviewer` / `go-reviewer` / `rust-reviewer` / `cpp-reviewer` / `java-reviewer` / `kotlin-reviewer` / `flutter-reviewer`

拼写错误的 agent 名会导致 `/orchestrate` 失败。输出前对照此列表交叉检查。

## 工作原理

### Phase 0 —— 检测 ECC 模式 + 语言

1. 读取 `<plan-doc-path>`。若缺失或为空，报告并停止。
2. 一次性检测 ECC 安装形态并冻结到 `ECC_MODE`。算法（按顺序执行，命中第一个即停止）：
   1. 若存在 `<claude-home>/plugins/marketplaces/everything-claude-code/` → `ECC_MODE=plugin`。
   2. 否则，若 `<claude-home>/agents/` 存在且包含至少一个 ECC agent 文件（如 `tdd-guide.md`、`code-reviewer.md`）→ `ECC_MODE=legacy`。
   3. 否则 → 默认 `ECC_MODE=legacy` 并在输出顶部生成一行警告：`> Warning: could not detect ECC install; defaulting to legacy form. If you use the plugin install, edit the prefixes manually.`
   4. 若两个标记都存在（mixed install），`plugin` 胜出——plugin 命名空间是唯一能无需 fuzzy matching 解析 agent 名的形态。

   从此时起，每行输出在 **slash command 和每个 agent 名**两者上使用匹配的前缀。**绝不在同一输出中输出两种形态。**
3. 解析 `--lang`。当为 `auto` 时，运行 polyglot 感知的检测：
   - 探测标记：`pyproject.toml` / `uv.lock` / `requirements.txt` → python；`package.json` → typescript；`go.mod` → go；`Cargo.toml` → rust；`CMakeLists.txt` 或顶层 `*.cpp` → cpp；`pom.xml` / `build.gradle`（Java）→ java；`build.gradle.kts` 或顶层 Kotlin → kotlin；`pubspec.yaml` → flutter。
   - **Polyglot 平局处理**：若多个标记匹配，选择源文件数量最多的语言（通过 `git ls-files` 计数，排除 `vendor/`、`node_modules/`、`dist/`、`build/`、`.venv/`、生成文件和明显的 test fixtures）。平局或无语言超过 60% 源文件时，设 `lang=unknown`。
   - 无标记匹配 → 设 `lang=unknown`。
   - `lang=unknown` 是一个哨兵值——它**不是** agent 名。Phase 2 规则 4 和 5 在 chain 组合时将其转为 `code-reviewer` / `build-error-resolver`。
4. 检测 **PyTorch 子 profile**：当 `lang=python` 且 `pyproject.toml` / `requirements.txt` / `uv.lock` 中任一声明了对 `torch` 的依赖时，设 `pytorch=true`。这仅影响 `build` chain 选择（见下文 Phase 2 规则）；reviewer 仍为 `python-reviewer`。
5. **规范化计划中声明的任何 agent 名**：若计划文本以 plugin 前缀形态引用 agents（如 `everything-claude-code:tdd-guide`），在验证或组合 chains 之前剥离前缀以获得裸 catalogue 名。重新加前缀仅在输出时按 `ECC_MODE` 进行（Phase 4）。绝不让预先带前缀的名流入 chain 组合——它在 plugin 模式下会导致双重前缀。

### Phase 1 —— 分解步骤

按优先级顺序识别"步骤单元"：

1. 显式编号：`## Step N` / `### Phase N` / `## N. ...` / 顶层有序列表。
2. 表格中的"Step"列。
3. 以 `---` 分隔且以动词引导标题的块。
4. 否则将每个 H2 视为一个步骤。

每个步骤提取 `id`（从 1 开始）、`title`（≤ 80 字符）、`intent`（1–3 句）、`tags`。

### Phase 2 —— 打标签并挑选 chain

按 intent 打标签（允许多标签；chain 由 primary + 叠加的 secondaries 构成）：

下方的 trigger words 按不区分大小写匹配。支持多语言计划：只要词干含义与列出的英文 trigger words 一致，即可匹配任何语言。

| 标签 | Trigger words | 默认 chain |
|---|---|---|
| `design` | architecture, design, choose, evaluate, RFC | `planner,architect` |
| `plan` | plan, breakdown, milestone | `planner` |
| `impl` | implement, build, add, create, port | `tdd-guide,<lang>-reviewer` |
| `test` | test, coverage, e2e, integration | `tdd-guide,e2e-runner` |
| `refactor` | refactor, cleanup, dedupe, split | `architect,refactor-cleaner,<lang>-reviewer` |
| `migration` | migrate, upgrade, rewrite, port | `architect,tdd-guide,<lang>-reviewer` |
| `db` | schema, migration, index, SQL, Postgres, alembic, sqlmodel | `database-reviewer,<lang>-reviewer` |
| `security` | encrypt, auth, secret, OWASP, PII | `security-reviewer,<lang>-reviewer` |
| `build` | build, compile, lint failure, CI | `<lang>-build-resolver`（回退到 `build-error-resolver`） |
| `docs` | docs, readme, codemap, changelog | `doc-updater` |
| `lookup` | lookup, reference, API usage | `docs-lookup` |
| `review` | review, audit, verify | `<lang>-reviewer,code-reviewer` |
| `loop` | loop, autonomous, watchdog | `loop-operator` |

Chain 组合规则：
1. **Primary tag 选择**：当一个步骤匹配多个标签时，**按表格顺序的第一个**（表格顶部 = 最高优先级）为 primary；其余为 secondaries。下文组合规则 2 和 3 显式处理特定的多标签组合；否则，按标签表格顺序追加 secondary chains。
2. `impl` + `security` → `tdd-guide,<lang>-reviewer,security-reviewer`。
3. `impl` + `db` → `tdd-guide,database-reviewer,<lang>-reviewer`。
4. 对结果 chain **去重**（保留首次出现）。例如 `review` + `lang=unknown` 在规则 5 后会产生 `code-reviewer,code-reviewer`；去重后折叠为 `code-reviewer`。
5. 当 `lang=unknown` 时，`<lang>-reviewer` 解析为 `code-reviewer`。
6. 当 `lang=unknown` 时，`<lang>-build-resolver` 解析为 `build-error-resolver`。**特殊情况**：若 Phase 0 设定了 `pytorch=true`，则无论 `<lang>` 如何，对 `build` chains 使用 `pytorch-build-resolver`。不存在 `python-build-resolver`；未设 `pytorch=true` 的 `--lang=python` 解析为 `build-error-resolver`。
7. **零标签步骤**：若无 trigger word 匹配，将 chain 设为 `code-reviewer` 并在"Chain rationale"下写入 `no tag matched; default review-only chain`。
8. 去重后 chain 长度 ≤ 4。若超出，丢弃最弱的标签（先 `lookup` 和 `docs`）。
9. 不要在 `impl` chain 中配对 `planner` 和 `architect`（浪费 token）。仅在 `design` 步骤中配对它们。
10. 标记为 `impl`、`refactor` 或 `migration` 的步骤以一个 **reviewer-class** agent 收尾——`<lang>-reviewer`、`code-reviewer`、`security-reviewer` 或 `database-reviewer` 中的任一个。最具领域特异性的 reviewer 占据收尾位置（例如规则 2 的 `impl+security` 以 `security-reviewer` 收尾；规则 3 的 `impl+db` 以 `<lang>-reviewer` 收尾，因为 `database-reviewer` 已在 chain 更早处 gate 了 migration）。`test` 和 `build` 步骤由各自的 validator gate（分别是 `e2e-runner` 和 build resolver），不需要额外的 reviewer。

### Phase 3 —— 压缩任务描述

每个输出的 `<task description>` 必须：
- 自包含（第一个 agent 不需要打开计划文档）。
- 以 `[Plan: <path>#step-<id>]` 开头。
- 包含 1–3 条可验证的 Acceptance 条件。
- **仅当计划为此步骤声明了 Scope guard 时**才包含（`Out of scope: ...`）。逐字继承。若计划没有 out-of-scope 声明，完全省略该子句——不要捏造。
- 长度 200–600 字符；单行；内嵌的 `"` 转义为 `\"`；无字面换行。

### Phase 4 —— 输出

使用 **由 `ECC_MODE` 确定的形态**输出 Markdown。输出全程使用一种形态——每个 `{ORCH_CMD}` 和每个 agent 名都按 Phase 0 的匹配前缀渲染。**不要输出两种形态；不要在渲染输出中包含"这是 plugin 形态"/"剥离前缀"等说明。**

具体渲染规则：

- `{ORCH_CMD}` = 在 `plugin` 下为 `/everything-claude-code:orchestrate`，在 `legacy` 下为 `/orchestrate`。
- `{AGENT(name)}` = 在 `plugin` 下为 `everything-claude-code:<name>`，在 `legacy` 下为 `<name>`。
- 概览表的"Chain"列使用相同的 `{AGENT(name)}` 渲染。
- 每个步骤的 bash 块仅包含可运行命令。**没有 `# plugin form` 或 `# legacy form` 注释**——形态是隐式的且在整个输出中一致。

输出结构：

````markdown
# Plan-Orchestrate Result

**Plan**: `<path>`
**Lang**: `<detected-or-given>`
**ECC mode**: `<plugin | legacy>`
**Steps**: <N>
**Scope**: <all | step:n | range:a-b>

## Steps overview

| # | Title | Tags | Chain |
|---|---|---|---|
| 1 | ... | impl, db | `{AGENT(tdd-guide)},{AGENT(database-reviewer)},{AGENT(python-reviewer)}` |
| ... | | | |

---

## Step 1 — <title>

**Intent**: <1–3 sentences>
**Tags**: <a, b>
**Chain rationale**: <why this chain; which agent closes the loop>

```bash
{ORCH_CMD} custom "{AGENT(tdd-guide)},{AGENT(database-reviewer)},{AGENT(python-reviewer)}" "[Plan: docs/foo.md#step-1] <compressed task description>; Acceptance: <1–3 items>; Out of scope: <…>"
```
````

> 上文的 `{ORCH_CMD}` 和 `{AGENT(...)}` 记法描述了本 skill 在运行时执行的替换。实际输出的 Markdown 包含解析后的字符串，绝不包含占位符。

在末尾追加一个"Batch execution"块，按顺序聚合每个步骤的命令，以便用户一次性全部粘贴。**在 overview-only 模式下跳过 Batch 块**（见"Large plan"边界情况）：当仅输出概览表时，没有每步命令可聚合。

### Phase 5 —— 自检（输出前运行）

- [ ] 每个 chain 中的每个 agent 都来自 catalogue（在剥离计划中出现的任何 `everything-claude-code:` 前缀之后；见 Phase 0 步骤 5）。
- [ ] 解析后的 `{ORCH_CMD}` 和每个解析后的 `{AGENT(...)}` 使用**相同**的形态（`plugin` 或 `legacy`）——绝不在一个输出中混用。
- [ ] 渲染输出中不残留 `# plugin form` / `# legacy form` 注释，也不残留"剥离前缀"说明。
- [ ] 不捏造 `--mode` / `--gate` / `--agents=...` 字段。
- [ ] 每个任务描述为单行、双引号包裹、内嵌的 `"` 已转义。
- [ ] 每个任务描述以 `[Plan: <path>#step-<id>]` 开头并包含 Acceptance（1–3 项）。`Out of scope:` 子句仅在从计划继承时才出现。
- [ ] Phase 2 去重后任何 chain 中无重复 agent。
- [ ] Chain 长度 ≤ 4。
- [ ] 标记为 `impl`/`refactor`/`migration` 的步骤以 reviewer-class agent（`<lang>-reviewer`、`code-reviewer`、`security-reviewer` 或 `database-reviewer`）收尾。`test` 和 `build` 豁免——见 Phase 2 规则 10。
- [ ] 零标签步骤输出 `code-reviewer`，理由为 `no tag matched; default review-only chain`。
- [ ] 概览表列出计划中的每个步骤，无论 `--scope` 如何。
- [ ] 每步详情块数量与解析后的 `--scope` 匹配（`--scope=all` 时为完整计划；`step:n` 时为一个块；`range:a-b` 时为范围大小）。在 overview-only 模式下，不输出每步详情块，也不输出 Batch 块。

## 边界情况

- **No clear steps**：优先 H2/H3 拆分；若仍含糊，报告"no structured steps detected"并附文档大纲，请用户确认按大纲执行。
- **Large plan（>1500 行）**：进入 **overview-only 模式**——仅输出概览表，并请用户先用 `--scope` 缩小范围再重新运行获取详情。在此模式下，跳过每步详情块和 Batch execution 块。
- **Step too broad**（如"完成所有后端工作"）：不要强制单一 chain。建议拆分为 N.a 和 N.b 并提出拆分方案。
- **Plan declares agents**（罕见）：首先**剥离任何 `everything-claude-code:` 前缀**以获得裸 catalogue 名（Phase 0 步骤 5），再对照 catalogue 验证。替换无效的 agents 并在"Chain rationale"下解释。裸名在输出时按 `ECC_MODE` 重新加前缀。
- **`--lang=auto` 无法决出胜者的 polyglot 项目**：设 `lang=unknown`；reviewer 解析为 `code-reviewer`，build resolver 解析为 `build-error-resolver`。在"Chain rationale"下提及此回退。

## 示例

### 示例 1 —— Plugin 模式，Python 计划

输入：
```
plan-orchestrate @docs/plan/example-feature.md --lang=python
```

预期输出节选：
````markdown
## Step 2 — Encrypt sensitive UserProfile fields

**Intent**: Introduce an `EncryptedString` SQLAlchemy type and AES-GCM encrypt `birth_datetime` / `location` before persistence; load the key from an environment variable.
**Tags**: impl, security, db
**Chain rationale**: Security-sensitive write path, so `security-reviewer` closes the chain; `database-reviewer` validates the alembic migration; `python-reviewer` covers typing and PEP 8.

```bash
/everything-claude-code:orchestrate custom "everything-claude-code:tdd-guide,everything-claude-code:database-reviewer,everything-claude-code:python-reviewer,everything-claude-code:security-reviewer" "[Plan: docs/plan/example-feature.md#step-2] Implement EncryptedString SQLAlchemy type and migrate UserProfile.birth_datetime/location columns; key from ENV APP_DB_KEY; Acceptance: encrypt/decrypt roundtrip tests pass; alembic upgrade/downgrade clean on empty DB; no plaintext in DB after migrate; Out of scope: cross-tenant profile sharing logic"
```
````

### 示例 2 —— Legacy 模式，相同步骤

若检测到 `ECC_MODE=legacy`，相同步骤会作为一条统一命令输出（输出中任何地方都不带 plugin 前缀形态）：

```bash
/orchestrate custom "tdd-guide,database-reviewer,python-reviewer,security-reviewer" "[Plan: docs/plan/example-feature.md#step-2] ..."
```

上述两个示例说明了两种不同环境下的**两种可能输出**。一次 skill 调用只会端到端地产生其中一种。

## 备注

- 仅生成。绝不在本 skill 内部调用 `/orchestrate`。
- 任务描述与计划文档的语言保持一致（agent 名始终保持英文）。
- 除非用户明确要求，否则不要在输出中插入"Co-Authored-By"行或 emoji。
