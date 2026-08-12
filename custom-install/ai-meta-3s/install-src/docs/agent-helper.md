<!-- aimeta3s-doc: agent-helper | version: 1 | updated: 2026-08-12 | source: agents/*.md（精确路径见 manifest.json） -->

# ai-meta-3s Agent 使用建议

本指南面向 `agents/` 下的 **19 个 agent**。这些 agent 分属五个族系，职责边界与触发入口各不相同，单看每个 agent 文件难以判断"我这个任务该 spawn 哪个 agent / 哪条命令会用到它"。本文档把视角从「按 agent 查」翻转为「按场景用」：

1. 先给出按族归类的**总览速查表**；
2. 再逐个 agent 拆解**适用场景 / 触发条件 / 处理流程 / 生成物 / 特别约束**四维度；
3. 把常被串联调用的 agent 画成**协作关系**；
4. 最后给出**场景 → agent 推荐**与**选型决策树**。

> **agent 与 command 的关系**：命令（`/`）是用户入口，agent 是命令在执行中 `spawn` 的专项大脑或执行单元。一个 agent 可能被多条命令复用，也可能没有任何命令入口、只能手动 spawn。
>
> **model 分工提示**：`opus`（5 个，重型思考：architect / planner / gan-planner / gan-generator / gan-evaluator）、`sonnet`（13 个，执行与审查）、`haiku`（1 个，轻量文档：doc-updater）。

---

## 一、Agent 总览速查表

### 规划与架构族

| agent | model | 一句话职责 | 谁调用它 |
|---|---|---|---|
| `architect` | opus | 系统架构设计、技术权衡、产出 ADR | 无命令入口，手动 spawn |
| `planner` | opus | 复杂功能/重构的可执行实施计划 | `/plan`（可选委托，默认内联） |
| `code-architect` | sonnet | 基于现有 codebase 模式设计 feature 实现蓝图 | `/feature-dev` |

### 探索与诊断族

| agent | model | 一句话职责 | 谁调用它 |
|---|---|---|---|
| `code-explorer` | sonnet | 深入分析现有代码如何运作，为新开发提供参考 | `/feature-dev`、`/orch-fix-defect` |
| `build-error-resolver` | sonnet | 最小改动修复构建/类型错误，不重构 | 无命令入口，手动 spawn |

### 审查族（统一 CRITICAL/HIGH/MEDIUM/LOW 分级 + 批准/警告/阻塞判决）

| agent | model | 一句话职责 | 谁调用它 |
|---|---|---|---|
| `code-reviewer` | sonnet | 广谱变更审查（7 类清单） | `/feature-dev`、`/orch-add-feature`、`/orch-refine-code`、`/orch-change-feature`、`/orch-fix-defect` |
| `python-reviewer` | sonnet | Python 专项（PEP 8 / 类型 / Pythonic / 安全） | `/python-review` |
| `typescript-reviewer` | sonnet | TS/JS 专项（类型安全 / async / Node 安全） | 经 `/vue-review` 触发；**无独立命令** |
| `vue-reviewer` | sonnet | Vue 专项（响应式 / composables / 模板安全） | `/vue-review` |
| `fastapi-reviewer` | sonnet | FastAPI 专项（async / DI / Pydantic / 安全） | `/fastapi-review` |
| `database-reviewer` | sonnet | PostgreSQL 查询/表结构/RLS（Supabase 最佳实践） | 无命令入口，手动 spawn |
| `security-reviewer` | sonnet | OWASP Top 10 漏洞检测与修复 | `/orch-*`（条件追加）、`/vue-review`（配套） |

### 执行与清理族

| agent | model | 一句话职责 | 谁调用它 |
|---|---|---|---|
| `tdd-guide` | sonnet | 强制 test-first，Red-Green-Refactor，80%+ 覆盖 | 无命令入口，手动 spawn |
| `refactor-cleaner` | sonnet | dead code 识别与安全移除、重复整合 | `/orch-refine-code` |
| `e2e-runner` | sonnet | E2E 测试生成/维护/运行（Agent Browser 优先） | 无命令入口，手动 spawn |
| `doc-updater` | haiku | codemap 与文档同步，保持反映代码真相 | 无命令入口，手动 spawn |

### GAN 生产族（全 opus，经 `gan-harness/` 目录文件通信）

| agent | model | 一句话职责 | 谁调用它 |
|---|---|---|---|
| `gan-planner` | opus | 一句 brief 扩展为完整 product spec | `/gan-build`（`/gan-design` 跳过） |
| `gan-generator` | opus | 按 spec 实现，按 feedback 迭代 | `/gan-build`、`/gan-design`、`/orch-build-mvp` |
| `gan-evaluator` | opus | Playwright 测 live 应用，按 rubric 打分反馈 | `/gan-build`、`/gan-design`、`/orch-build-mvp` |

---

## 二、Agent 分族详解

> 每个 agent 统一给出：**适用场景 / 触发条件 / 处理流程 / 生成物 / 特别约束 / 配套命令**。审查族额外列「审查维度」，GAN 族额外列「rubric 与阈值」。

### 规划与架构族

#### architect（opus）

- **适用场景**：规划新功能、重构大型系统、做出架构决策。
- **触发条件**：无命令入口，需手动 spawn。
- **处理流程**：现状分析（审查架构/识别模式/记录债务/评估可扩展性）→ 需求收集（功能/非功能/集成点/数据流）→ 设计提案（架构图/组件职责/数据模型/API 契约）→ 权衡分析（优点/缺点/替代方案/决定）。
- **生成物**：架构设计提案、ADR（架构决策记录，附模板）、系统设计检查清单（功能/非功能/技术/运维四类）。
- **特别约束**：遵循模块化/可扩展性/可维护性/安全/性能五大原则；警惕反模式（Big Ball of Mud、Golden Hammer、Premature Optimization、God Object 等）；ADR 必须记录优点/缺点/替代方案/决定及理由。仅分析不写业务代码（tools 仅 Read/Grep/Glob）。
- **配套命令**：无（手动 spawn）。

#### planner（opus）

- **适用场景**：复杂功能实现、架构变更、复杂重构。
- **触发条件**：`/plan` 可选委托（默认走内联规划，仅当本地已暴露该 subagent 且用户明确要求委托时启用；不可用则回退内联）。
- **处理流程**：需求分析（理解请求/澄清问题/成功标准/假设约束）→ 架构评审（分析代码库/受影响组件/类似实现）→ 步骤拆解（具体操作/文件路径/依赖/复杂度/风险）→ 实施顺序（按依赖优先/分组变更/增量测试）。
- **生成物**：实施计划文档（Markdown），含概述、需求、架构变更、分阶段实施步骤、测试策略、风险与缓解、成功标准。
- **特别约束**：使用确切文件路径/函数名/变量名；优先扩展现有代码而非重写；遵循现有项目约定；每个阶段都应能独立合并；重构时保留现有功能并制定向后兼容/迁移计划。
- **配套命令**：`/plan`（可选）。

#### code-architect（sonnet）

- **适用场景**：设计能自然融入现有 codebase 模式的新 feature 架构，需要具体实现蓝图时。
- **触发条件**：`/feature-dev` Phase 4（Architecture Design），产出蓝图后需等待用户 approval 才进入实现。
- **处理流程**：Pattern Analysis（研究代码组织/命名约定/已采用模式/dependency graph）→ Architecture Design（融入现有模式/选最简架构）→ Implementation Blueprint（file path/purpose/interfaces/dependencies/data flow）→ Build Sequence（types → core logic → integration → UI → tests → docs）。
- **生成物**：Implementation blueprint（设计决策、要创建的文件表、要修改的文件表、数据流描述、构建顺序）。
- **特别约束**：选择满足需求的最简 architecture；避免 speculative abstractions（除非 repo 已在使用）；在提出新 abstractions 前先理解 dependency graph。
- **配套命令**：`/feature-dev`。

### 探索与诊断族

#### code-explorer（sonnet）

- **适用场景**：新工作开始前需要理解已有 features 如何工作时；为新功能开发提供参考。
- **触发条件**：`/feature-dev` Phase 2（Codebase Exploration）；`/orch-fix-defect` 根因不明时排查。
- **处理流程**：Entry Point Discovery（找入口点/trace stack）→ Execution Path Tracing（call chain/branching/async boundaries/error paths）→ Architecture Layer Mapping（识别 layer/通信方式/boundaries）→ Pattern Recognition（已用模式/命名约定）→ Dependency Documentation（外部库/内部模块/shared utilities）。
- **生成物**：探索报告（入口点、执行流程、架构洞察、关键文件表、外部/内部依赖、新开发建议：Follow / Reuse / Avoid）。
- **特别约束**：**仅分析不修改代码**（tools 仅 Read/Grep/Glob）；输出需明确区分外部与内部依赖；需提供「遵循/复用/避免」三类建议。
- **配套命令**：`/feature-dev`、`/orch-fix-defect`。

#### build-error-resolver（sonnet）

- **适用场景**：构建失败或类型错误发生时；构建完全破坏、单文件失败、Linter 警告。
- **触发条件**：无命令入口——`/build-fix` 是**自包含命令**（自己的流程里不 spawn 此 agent），需手动 spawn。
- **处理流程**：收集所有错误（`npx tsc --noEmit` / 分类 / 排优先级）→ 修复策略（仔细阅读错误/找最小修复/验证不破坏其他代码/迭代）→ 常见修复（按错误类型对照表）。
- **生成物**：修复后的代码（最小改动，针对 TS 错误、构建错误、依赖问题、配置错误）。
- **特别约束**：**仅最小改动，改动行数少于受影响文件的 5%**；禁止重构无关代码/改变架构/重命名变量/添加新功能/改变逻辑流/优化性能；成功指标 = `tsc` 退出码 0 + `npm run build` 成功 + 无新错误 + 测试仍通过；明确路由到其他 agent（重构 → refactor-cleaner、架构 → architect、新功能 → planner、测试失败 → tdd-guide、安全 → security-reviewer）。
- **配套命令**：无（`/build-fix` 自包含；手动 spawn）。

### 审查族

> 七个审查 agent 共享同一输出范式：按 `[SEVERITY] 标题 / 文件:行号 / 问题 / 修复` 分级报告，末尾给出 `批准 / 警告 / 阻塞` 判决（批准 = 无 CRITICAL/HIGH）。

#### code-reviewer（sonnet）

- **适用场景**：编写或修改代码后立即使用；声明「必须用于所有代码变更」。
- **触发条件**：`/feature-dev`、`/orch-add-feature`、`/orch-refine-code`、`/orch-change-feature`、`/orch-fix-defect`（高频复用，被 5 条命令调用）。
- **处理流程**：收集上下文（`git diff --staged` / `git diff` / `git log`）→ 理解范围（识别文件/特性关联）→ 阅读周围代码（不孤立审查）→ 应用审查清单（CRITICAL → LOW）→ 报告。
- **生成物**：按严重程度分级的发现报告，每条含标题/文件:行号/问题/修复；末尾「审查摘要」表（CRITICAL/HIGH/MEDIUM/LOW 数量与状态）；结论 `APPROVE` / `WARNING` / `Block`。
- **审查维度**：**安全 (CRITICAL)** 硬编码凭证/SQL 注入/XSS/路径遍历/CSRF/认证绕过；**代码质量 (HIGH)** 大型函数(>50 行)/大型文件(>800 行)/深度嵌套(>4 层)/缺错误处理/死代码；**React/Next.js Patterns (HIGH)** 缺依赖数组/渲染中更新状态/列表缺 key/属性钻取；**Node.js/Backend (HIGH)** 未验证输入/缺速率限制/无界查询/N+1；**性能 (MEDIUM)**；**最佳实践 (LOW)**。
- **特别约束**：报告前四项检查（能引用确切行 / 能描述失败模式 / 已读周边上下文 / 严重性可辩护）；HIGH/CRITICAL 必须含代码片段+行号+失败场景+为何现有保护不够；置信度 <80% 不报告；只报未改动代码中的 CRITICAL 安全问题；接受并期望零发现（干净审查即 APPROVE）。
- **配套命令**：`/feature-dev`、`/orch-add-feature`、`/orch-refine-code`、`/orch-change-feature`、`/orch-fix-defect`。

#### python-reviewer（sonnet）

- **适用场景**：所有 Python 代码变更；Python 项目必须使用。
- **触发条件**：`/python-review`。
- **处理流程**：运行 `git diff -- '*.py'` → 运行静态分析（ruff / mypy / pylint / black --check）→ 聚焦修改的 `.py` 文件 → 立即审查。
- **生成物**：分级发现列表 + 批准/警告/阻塞结论。
- **审查维度**：**安全 (CRITICAL)** SQL 注入(f-string)/命令注入/eval/exec/不安全反序列化/硬编码 secrets/弱加密(MD5/SHA1)/YAML 不安全加载；**错误处理 (CRITICAL)** bare except/吞异常/缺 context manager；**类型提示 (HIGH)** 缺 type annotations/滥用 `Any`/缺 `Optional`；**Pythonic (HIGH)** 列表推导/`isinstance`/可变默认参数；**代码质量 (HIGH)**；**并发 (HIGH)** 无锁共享状态/sync-async 混用/N+1；**最佳实践 (MEDIUM)** PEP 8/缺 docstring/`print` 替代 logging；**框架检查** Django(`select_related`/`atomic()`)/FastAPI(CORS/Pydantic/异步)/Flask(CSRF)。
- **特别约束**：参考 `python-patterns` skill；以「能否通过一线 Python 团队或开源项目审查」为心态。
- **配套命令**：`/python-review`。

#### typescript-reviewer（sonnet）

- **适用场景**：所有 TypeScript / JavaScript 代码变更；TS/JS 项目必须使用。
- **触发条件**：**无独立命令**——当 `.vue` 或含 Vue import 的 `.ts/.js` 变更时经 `/vue-review` 触发，或手动 spawn。
- **处理流程**：确立范围（PR 用 `gh pr view`，本地用 `git diff --staged`）→ 检查合并就绪状态 → 运行项目 typecheck（或 `tsc --noEmit -p`）→ 运行 eslint → 阅读周围上下文 → 审查。
- **生成物**：分级发现报告 + 批准/警告/阻塞结论。
- **审查维度**：**安全 (CRITICAL)** eval/`new Function`/XSS(`innerHTML`/`v-html`)/SQL/路径遍历/硬编码 secrets/Prototype pollution/`child_process`；**类型安全 (HIGH)** 无正当理由的 `any`/非空断言 `value!`/绕过检查的 `as`/减弱严格性的 tsconfig；**Async (HIGH)** 未处理 promise rejection/floating promise/`async`+`forEach`；**错误处理 (HIGH)** 吞错误/无 try-catch 的 `JSON.parse`；**惯用法 (HIGH)** 可变共享状态/`var`/`==` 而非 `===`；**Node.js (HIGH)** 同步 fs/边界缺输入验证(zod)/未验证 `process.env`；**Vue/Nuxt (MEDIUM，回退给 vue-reviewer)**；**性能 (MEDIUM)**；**最佳实践 (MEDIUM)**。
- **特别约束**：**不得重构或重写代码，仅报告发现**；绝不要硬编码 `main` 作为基础分支；CI failing/conflict 时停止审查；纯 JS 项目跳过 typecheck 不使审查失败；与 `vue-reviewer` 有明确分工（通用 TS 类型/async/Node 安全归本 agent，Vue 专属问题归 vue-reviewer，发现不重叠）。
- **配套命令**：`/vue-review`（无独立命令）。

#### vue-reviewer（sonnet）

- **适用场景**：触及 `.vue`、含 Vue import 的 `.ts/.js`、Vue 生态（Pinia / Vue Router / Nuxt）的变更；Vue 项目必须使用。
- **触发条件**：`/vue-review`。
- **处理流程**：确定范围（PR 用 `gh pr view`，本地 `git diff --staged -- '*.vue' '*.ts' '*.js'`）→ 检查合并就绪状态 → 运行 lint（`eslint-plugin-vue`）→ 运行 `vue-tsc --noEmit` → 若无 `.vue` 变更则交给 `typescript-reviewer` → 聚焦已修改文件 → 审查。
- **生成物**：分级报告（标题/File:行号/问题/原因/修复）+ Review Summary 表 + 判决。
- **审查维度**：**Vue 安全 (CRITICAL)** `v-html` 未净化/`:href` `javascript:`/SSR 泄漏 secret/`localStorage` 存 token；**响应式 (CRITICAL)** 解构响应式 props(Vue <3.5)/`ref()` 漏 `.value`/`reactive()` 基本类型/Watcher source 缺 `.value`；**Composable (HIGH)** 模块作用域副作用/缺 cleanup/返回非响应式；**模板安全 (HIGH)** `v-for` 缺 `:key` 或用 index/`v-if`+`v-for` 同元素/`v-model` 绑定无 setter 的 computed；**组件架构 (HIGH)** SFC >300 行/props mutation/缺 prop 验证；**Vue Router (HIGH)**；**Pinia (HIGH)**；**SSR/Nuxt (HIGH)** 缺 `process.client` 守卫用浏览器 API/`useAsyncData` 缺 key；**性能 (MEDIUM)**；**表单 (MEDIUM)**；**Composition (MEDIUM)**。
- **特别约束**：仅负责 Vue 特定 lanes（通用 TS 类型/async/Node 安全由 `typescript-reviewer` 负责）；不得重构或重写代码；关联 `skills/vue-patterns/`。
- **配套命令**：`/vue-review`。

#### fastapi-reviewer（sonnet）

- **适用场景**：审查 FastAPI 应用（构建、路由、中间件、Pydantic、异步 DB/HTTP、DI、认证/授权/CORS/速率限制、测试、OpenAPI）。
- **触发条件**：`/fastapi-review`。
- **处理流程**：定位应用入口（`main.py`/`app.py`）→ 识别 router/schema/依赖/DB session/测试 → 安全运行本地检查（`pytest`/`ruff`/`mypy`/`uv run pytest`）→ 先审查改动文件再查相邻定义 → 报告。
- **生成物**：分级发现列表 + 结尾附「已检查的测试:」（运行命令或跳过原因）与「遗留问题:」（无法核实事项）。
- **审查维度**：**Critical** 硬编码 secret/字符串拼接 SQL/响应模型暴露密码或认证字段/可被绕过或未校验的认证依赖；**High** 异步路由中阻塞 DB/HTTP 调用/处理器中直接创建 DB session（非依赖）/测试覆盖错误目标依赖/`allow_origins=["*"]` 配合 credentialed CORS/写 endpoint 缺请求校验；**Medium** 列表 endpoint 缺分页/OpenAPI 缺响应模型/重复路由逻辑应抽到 service/外部 HTTP 客户端缺超时。
- **特别约束**：**不审查非 FastAPI 框架**（除非直接交互）、**不覆盖通用 Python 风格**（由 `python-reviewer` 负责）、不审查无具体问题和维护理由的依赖添加。
- **配套命令**：`/fastapi-review`。

#### database-reviewer（sonnet）

- **适用场景**：编写 SQL、创建迁移脚本、库表设计、排查数据库性能瓶颈时；PostgreSQL + Supabase 最佳实践。
- **触发条件**：无命令入口，需手动 spawn。
- **处理流程**：诊断命令（`psql`、`pg_stat_statements`、`pg_stat_user_tables`、`pg_stat_user_indexes`）→ 查询性能审查 (CRITICAL) → 表结构设计审查 (HIGH) → 安全审查 (CRITICAL)。
- **生成物**：审查清单（checkbox）核对结果 + 反模式标记 + 按阶段发现 + 关键原则与反模式清单。
- **审查维度**：**查询性能 (CRITICAL)** WHERE/JOIN 列索引/复杂查询 `EXPLAIN ANALYZE` 查顺序扫描/N+1/复合索引列顺序（等值在前、范围在后）；**表结构 (HIGH)** 类型选择（ID `bigint`、字符串 `text`、时间 `timestamptz`、金额 `numeric`、标志 `boolean`）/约束（PK/FK 含 `ON DELETE`/`NOT NULL`/`CHECK`）/`lowercase_snake_case`；**安全 (CRITICAL)** 多租户表启用 RLS/`(SELECT auth.uid())` 模式/RLS 策略列索引/最小权限/撤销 public 模式权限。
- **特别约束**：始终遵循 Supabase 最佳实践；**外键创建索引「始终如此，没有例外」**；核心职责含查询性能/表结构/安全与 RLS/连接管理/并发/监控；参考 `postgres-patterns` 与 `database-migrations` skill；用 `EXPLAIN ANALYZE` 验证假设；**反模式**：生产 `SELECT *`、ID 用 `int`、无理由 `varchar(255)`、不带时区 `timestamp`、随机 UUID 作 PK、大表 OFFSET 分页、未参数化查询、`GRANT ALL`。
- **配套命令**：无（手动 spawn）。

#### security-reviewer（sonnet）

- **适用场景**：编写处理 user input / authentication / API endpoints / sensitive data 的代码后；新增 API endpoints、auth 变更、用户输入处理、DB 查询变更、文件上传、支付代码、外部 API 集成、依赖更新时 **ALWAYS**；生产事故、依赖 CVE、用户安全报告、重大版本发布前 **IMMEDIATELY**。
- **触发条件**：`/orch-*`（触及安全触发点条件追加）、`/vue-review`（项目范围安全审计配套）、手动 spawn。
- **处理流程**：初始扫描（`npm audit --audit-level=high`、`eslint-plugin-security`、搜硬编码 secrets、审高风险区域 auth/API/DB/上传/支付/webhooks）→ OWASP Top 10 检查 → 代码模式审查（按模式表标记）。
- **生成物**：按模式表（模式 / Severity / 修复）的发现；发现 CRITICAL 漏洞时启动应急响应（详细报告/通知负责人/安全代码示例/验证修复/必要时轮换 secrets）。
- **审查维度**：**OWASP Top 10** Injection / Broken Auth（bcrypt/argon2 哈希、JWT 校验、session 安全）/ Sensitive Data（HTTPS、env vars、PII 加密）/ XXE / Broken Access（路由 auth、CORS）/ Misconfiguration（默认凭证、debug、安全 headers）/ XSS（输出 escape、CSP）/ Insecure Deserialization / Known Vulnerabilities（依赖最新、npm audit 干净）/ Insufficient Logging；**代码模式表** 硬编码 secrets(CRITICAL→`process.env`)/带用户输入 shell(CRITICAL→execFile)/字符串拼接 SQL(CRITICAL→参数化)/`innerHTML`(HIGH→textContent/DOMPurify)/`fetch(userProvidedUrl)`(HIGH→白名单域)/明文密码比较(CRITICAL→`bcrypt.compare`)/路由无认证(CRITICAL)/无锁余额检查(CRITICAL→事务 `FOR UPDATE`)/无 rate limiting(HIGH)/记录密码(MEDIUM→sanitize)。
- **特别约束**：五大原则（纵深防御/最小权限/安全失败/不信任输入/定期更新依赖）；标记前必须核实上下文以排除误报（`.env.example` 变量、明确标注的测试凭据、公开 API keys、校验和用 SHA256/MD5）；成功指标 = 无 CRITICAL + 所有 HIGH 已处理 + 无 secrets + 依赖最新 + 清单完成；参考 `security-review` skill。
- **配套命令**：`/orch-add-feature`、`/orch-change-feature`、`/orch-fix-defect`、`/orch-build-mvp`（条件）、`/vue-review`（配套）。

### 执行与清理族

#### tdd-guide（sonnet）

- **适用场景**：编写新功能、修复 bug、重构代码时。
- **触发条件**：无命令入口——`/plan` 提到的 `tdd-workflow` 是 **skill** 不是本 agent；需手动 spawn。
- **处理流程**：先写测试 (RED) → 运行验证失败（`npm test`）→ 编写最小实现 (GREEN) → 运行验证通过 → Refactor (IMPROVE，测试保持 green) → 验证覆盖率（`npm run test:coverage`，要求 80%+）。
- **生成物**：测试套件（单元测试、集成测试、端到端测试）；附 Eval-Driven TDD 输出 `pass@1` / `pass@3` 指标。
- **特别约束**：**先写 red test（必须验证失败）**；覆盖率 80%+（分支/函数/行/语句均需达标）；必须测试 8 类边界情况（Null/Undefined、空、无效类型、边界值、错误路径、竞态、大数据量、特殊字符）；避免测试反模式（测试实现细节、相互依赖、断言过少、未模拟外部依赖）；参考 `tdd-workflow` skill；发布关键路径须达 `pass^3` stability。
- **配套命令**：无（手动 spawn）。

#### refactor-cleaner（sonnet）

- **适用场景**：移除未使用的代码、重复项和重构时。
- **触发条件**：`/orch-refine-code`（重构流程中作为死代码清理子任务委托）。
- **处理流程**：分析（并行运行 knip/depcheck/ts-prune，按风险分类 SAFE/CAREFUL/RISKY）→ 验证（Grep 搜索所有引用/检查公开 API/查 git 历史）→ 安全移除（仅 SAFE 开始，按 依赖→exports→文件→重复项 顺序，一次一类）→ 合并重复（选最佳实现/更新 import/删重复）。
- **生成物**：清理后的代码（移除 dead code、合并重复、清理依赖）。
- **特别约束**：**每删一项/每批后跑一次测试并提交**；有疑问时不删除；绝不删除活跃功能开发期间或部署前；仅在测试覆盖充分且理解代码时使用；一次只处理一个类别；分类必须区分 SAFE/CAREFUL/RISKY。**铁律：先 clean 后 refactor**。
- **配套命令**：`/orch-refine-code`。

#### e2e-runner（sonnet）

- **适用场景**：生成、维护和运行 E2E 测试；验证关键用户旅程（认证、核心功能、支付、CRUD）。
- **触发条件**：无命令入口，需手动 spawn。
- **处理流程**：规划（识别关键用户旅程/定义场景/按风险排优先级 HIGH-MEDIUM-LOW）→ 创建（Page Object Model/data-testid 定位器/关键步骤断言/截图/正确等待）→ 执行（本地运行 3-5 次检查不稳定性/隔离 flaky 测试/上传产物到 CI）。
- **生成物**：E2E 测试代码、HTML 报告、JUnit XML、测试产物（截图、视频、追踪）。
- **特别约束**：优先使用 Agent Browser（语义化选择器/AI 优化/自动等待），Playwright 作为回退；语义定位器（`data-testid` > CSS > XPath）；**等待条件而非时间**（`waitForResponse` > `waitForTimeout`，绝不使用 `waitForTimeout`）；测试彼此独立无共享状态；成功指标 = 关键旅程 100% 通过 + 整体通过率 >95% + 不稳定率 <5% + 时长 <10 分钟；参考 `e2e-testing` skill。
- **配套命令**：无（手动 spawn）。

#### doc-updater（haiku）

- **适用场景**：更新 codemaps 和文档时；**始终更新**：新增主要功能、API 路由变更、添加/删除依赖、架构变更、设置流程修改；**可选**：次要 BUG 修复、外观变更、内部重构。
- **触发条件**：无命令入口——`/update-docs`、`/update-codemaps` 都是**自包含命令**（不 spawn 此 agent）；需手动 spawn。
- **处理流程**：分析仓库（识别 workspace/目录结构/入口点/框架模式）→ 分析 Module（exports/imports/routes/DB models/workers）→ 生成 Codemap（输出到 `docs/CODEMAPS/`）→ 文档更新（提取 JSDoc/README/env/API → 更新 README/guides/package.json/API 文档 → 验证文件存在/链接可用/示例可运行）。
- **生成物**：`docs/CODEMAPS/*` 目录（INDEX.md、frontend.md、backend.md、database.md、integrations.md、workers.md），更新的 README 和指南；codemap 含架构 ASCII 图、关键模块表、数据流、外部依赖。
- **特别约束**：**单一事实来源——从代码生成而非手写**；始终包含最后更新日期；每个 codemap 不超过 500 行（token 效率）；包含真正有效的设置命令；交叉引用相关文档；**与现实不符的文档比没有文档更糟**。
- **配套命令**：无（`/update-docs`、`/update-codemaps` 自包含；手动 spawn）。

### GAN 生产族

> 三个 agent 经 `gan-harness/` 目录下的文件通信形成闭环，采用 4 维 rubric，**权重因模式不同**：`/gan-build` 用默认 **Design 0.3 / Originality 0.2 / Craft 0.3 / Functionality 0.2**（加权 PASS 阈值 7.0）；`/gan-design` 由 `gan-planner` 写入设计导向权重 **Design 0.35 / Originality 0.30 / Craft 0.25 / Functionality 0.10**（Originality 提权、Functionality 降权）到 `gan-harness/eval-rubric.md`。

#### gan-planner（opus）

- **适用场景**：GAN Harness 流程的规划阶段，输入一句简要 brief 需扩展为完整 product specification 时。
- **触发条件**：`/gan-build`（`/gan-design` 显式跳过 planner，brief 即 spec）。
- **处理流程**：阅读用户 brief prompt → Research（若指向特定 app 类型，阅读 codebase 已有 examples/specs）→ 写完整 spec 到 `gan-harness/spec.md` → 同时写精简 evaluation criteria 到 `gan-harness/eval-rubric.md`。
- **生成物**：`gan-harness/spec.md`（App Name、Vision、Design Direction[色彩/字体/布局/视觉识别]、功能分级[Must-Have Sprint 1-2 / Should-Have Sprint 3-4 / Nice-to-Have Sprint 5+]、Technical Stack、Evaluation Criteria、Sprint Plan）+ `gan-harness/eval-rubric.md`。
- **rubric**：Design Quality 0.3 / Originality 0.2 / Craft 0.3 / Functionality 0.2。
- **特别约束**：**Be deliberately ambitious**（保守规划导致平庸）；push for 12-16 features、丰富视觉设计、精致 UX；指定精确颜色（如 `#1a73e8 primary, #f8f9fa background` 而非 "blue theme"）；**Anti-AI-slop directives**（明确避免 gradient abuse、stock illustrations、generic cards）；include edge cases（empty/error/loading/responsive）；明确交互细节（drag-and-drop、快捷键、动画）。
- **配套命令**：`/gan-build`。

#### gan-generator（opus）

- **适用场景**：GAN Harness 流程的实施阶段，根据 spec 实现 features 并根据 Evaluator feedback 迭代。
- **触发条件**：`/gan-build`、`/gan-design`、`/orch-build-mvp`（复用 GAN harness）。
- **处理流程**：**首轮** 读 `spec.md` → 项目 scaffolding → 实现 Must-Have (Sprint 1) → 启动 dev server → self-check → `git commit "iteration-001"` → 写 `generator-state.md`；**后续迭代** 读最新 `feedback/feedback-NNN.md` → 列出所有 issues → 按 score impact 修复 → 重启 dev server → `git commit "iteration-NNN"` → 更新 `generator-state.md`。
- **生成物**：实现的应用代码 + git commits（`iteration-NNN`）+ `gan-harness/generator-state.md`（已构建内容 / 本次迭代变化[已修复/改进/新增] / 已知问题 / Dev Server URL+状态+命令）。
- **rubric / 修复优先级**：Functionality bugs 优先 → Craft issues 其次 → Design improvements 再次 → Originality 最后（低于 5 分视为 critical）。
- **特别约束**：首先读 spec、每次迭代（除第一次）读 feedback、**解决每一个 issue（feedback 不是建议）**、不要 self-evaluate、iteration 间 commit、保持 dev server 运行；Frontend 用 modern React+TS + CSS-in-JS/Tailwind（**绝不用全局 class 的 plain CSS**）+ mobile-first responsive + 处理所有状态（loading/empty/error/success）；Backend 用 Express/FastAPI + SQLite + input validation + proper error responses；Code Quality 文件 ≤1000 行、严格 TS 禁 `any`、proper async error handling；**Avoiding AI Slop**（避免通用 gradient `#667eea→#764ba2`、过度圆角、stock hero "Welcome to [App]"、默认 MUI/Shadcn 主题、placeholder 图片、通用 card grid）；若建议看似不对仍要尝试。
- **配套命令**：`/gan-build`、`/gan-design`、`/orch-build-mvp`。

#### gan-evaluator（opus）

- **适用场景**：GAN Harness 流程的评估阶段，对 Generator 构建并运行的 application 打分反馈。
- **触发条件**：`/gan-build`、`/gan-design`、`/orch-build-mvp`。
- **处理流程**：读 rubric（`eval-rubric.md`）/spec/generator-state → 启动浏览器测试（Playwright MCP 导航+截图）→ 系统化测试 [A. First Impression 30 秒 / B. Feature Walk-Through（happy path + edge cases：空输入/超长文本/特殊字符/快速连续点击；error states）/ C. Design Audit（色彩/字体层级/responsive 375-768-1440px/spacing/AI-slop 排查）/ D. Interaction Quality（可点击元素/键盘导航/loading states/transitions/form validation）] → 打分 → 写 feedback。
- **生成物**：`gan-harness/feedback/feedback-NNN.md`，含得分表（Criterion/Score/Weight/Weighted）、Verdict（`PASS`/`FAIL`，阈值 7.0）、严重问题（必须修复）、主要问题（应该修复）、次要问题（最好修复）、与上次迭代相比改进/退化、下一次迭代建议、截图描述。
- **rubric / 打分校准**：Design 0.3 / Originality 0.2 / Craft 0.3 / Functionality 0.2；加权公式 `weighted = (design*0.3)+(originality*0.2)+(craft*0.3)+(functionality*0.2)`；1-3 不能用/令人尴尬；4-5 功能可用但明显 AI/tutorial-quality；6 还行无亮点；7 Good 初级开发者水平；8 Very good 专业质量少量 rough edges；9 Excellent 高级开发者 polished；10 Exceptional 可直接发布。
- **特别约束**：**Be Ruthlessly Strict**（天然倾向宽容，必须对抗）；切勿说 "overall good effort"/"solid foundation"；切勿为 "努力"/"潜力" 给分；重罚 AI-slop 美学；测试 edge cases；与专业人类开发者交付对比；**Feedback 质量规则**——每个 issue 必含 "how to fix"、引用具体元素、尽可能量化、与 spec 对比、认可真正改进；三种 Evaluation Mode：`playwright`（默认完整浏览器）/ `screenshot`（只截图视觉分析）/ `code-only`（APIs/libraries，run tests/check build/analyze code quality）。
- **配套命令**：`/gan-build`、`/gan-design`、`/orch-build-mvp`。

---

## 三、Agent 协作关系

### GAN 闭环（文件通信，最明确的闭环）

```text
gan-planner ──写──▶ gan-harness/spec.md + eval-rubric.md
                          │
                          ▼
gan-generator ──读 spec──▶ 实现 + 写 generator-state.md ──commit──▶ dev server 运行
      ▲                                                       │
      │ 读 feedback                                            ▼
      └──────────────── gan-evaluator（读 rubric + Playwright 测 live 应用）
                            │ 打分（加权 4 维，阈值 7.0）
                            ▼ 写
                  gan-harness/feedback/feedback-NNN.md
```

- 三者通过 `gan-harness/` 目录下的文件通信，不直接传参；迭代至加权分 ≥ 7.0 或迭代到顶。
- `/gan-design` 复用同一循环但**跳过 planner**（brief 即 spec）；`/orch-build-mvp` 在 TDD 阶段复用 harness 驱动 generator→evaluator 循环。

### feature-dev 顺序接力

```text
code-explorer（Phase 2 探索现有代码）
        │  探索报告
        ▼
code-architect（Phase 4 基于探索产出设计蓝图，等 approval）
        │  implementation blueprint
        ▼
      实现（偏好 TDD）
        │
        ▼
code-reviewer（Phase 6 审查实现）
```

前一步的发现是后一步的输入；不含 GATE、不强制 TDD、手动驱动。

### orch-fix-defect 排查链

```text
根因不明？──是──▶ code-explorer 排查
                  │
                  ▼
            写 red test 复现 bug ──▶ 修复至 green ──▶ code-reviewer / security-reviewer 审查
```

### 审查纵深（互补，非互斥）

```text
code-reviewer（广谱 7 类清单）
        │
        ├─▶ 语言/框架专项：python-reviewer | typescript-reviewer | vue-reviewer | fastapi-reviewer
        │
        └─▶ security-reviewer（OWASP Top 10，正交于 diff，覆盖 agent/hook/MCP 表面）
```

- 广谱 `code-reviewer` 与专项 reviewer 维度不重叠；非该语言/框架的问题回流到 code-reviewer。
- `security-reviewer` 正交于 git diff，覆盖范围更广（agent/hook/MCP/permission/secret），与上面**都做**。

### Vue 双审并行

```text
.vue 或 Vue 生态变更 ──▶ vue-reviewer（Vue 专属 lanes：响应式/composables/模板安全/SSR）
                    └─▶ typescript-reviewer（通用 TS 类型/async/Node 安全）
```

两者同时运行，明确声明「发现不重叠」，按职责切分。纯 TS/JS 变更（非 Vue）可直接调 `typescript-reviewer`。

### orch 族封装

orch-* 命令是同名 skill 的封装器，agent 组合在被调用的 skill 内部：

| orch 命令 | 介入的 agent |
|---|---|
| orch-add-feature | code-reviewer（审查）+ security-reviewer（触及安全触发点时） |
| orch-change-feature | code-reviewer + security-reviewer（条件） |
| orch-fix-defect | code-explorer（根因不明时）+ code-reviewer / security-reviewer |
| orch-refine-code | refactor-cleaner（死代码清理）+ code-reviewer |
| orch-build-mvp | gan-generator + gan-evaluator（复用 GAN harness）+ security-reviewer（条件） |

### 「大脑型」与「执行型」之分

- **大脑型（只分析不写业务代码）**：architect、planner、code-architect、code-explorer、所有 *-reviewer、gan-evaluator。
- **执行型（写代码/测试/文档）**：tdd-guide、refactor-cleaner、e2e-runner、doc-updater、build-error-resolver、gan-generator、gan-planner（写 spec/rubric 文件）、database-reviewer（tools 含 Write/Edit）。

---

## 四、场景 → Agent 推荐

> 每个场景统一格式：**场景** → **推荐 agent** → **入口命令（若有）**。

### 4.1 架构与规划

| 子场景 | 推荐 agent | 入口 |
|---|---|---|
| 全新系统/大重构的架构设计、技术选型、ADR | `architect` | 手动 spawn |
| 复杂功能/架构变更/重构的可执行实施计划 | `planner` | `/plan`（可选委托） |
| 基于 codebase 现有模式设计 feature 实现蓝图 | `code-architect` | `/feature-dev` |

**三者区分**：`architect` 偏宏观系统设计（含 ADR、可扩展性规划）；`planner` 偏可执行步骤拆解（确切文件路径、分阶段、风险缓解）；`code-architect` 偏贴合现有代码模式的 feature 蓝图（构建顺序、接口、数据流）。

### 4.2 排查与理解现有代码

| 子场景 | 推荐 agent | 入口 |
|---|---|---|
| 新工作前需理解已有 feature 如何运作 | `code-explorer` | `/feature-dev`、`/orch-fix-defect` |
| bug 根因不明，需 trace 执行路径 | `code-explorer` | `/orch-fix-defect` |
| 构建失败 / 类型错误堆积 | `build-error-resolver` | 手动 spawn（`/build-fix` 是自包含命令，不 spawn 此 agent） |

**区分**：`code-explorer` 理解「代码如何运作」（只读分析）；`build-error-resolver` 修复「构建/类型错误」（最小改动，<5%，不重构）。

### 4.3 代码审查

按「广谱 → 语言/框架专项 → 安全纵深」收敛：

| 阶段 | 推荐 agent | 入口 |
|---|---|---|
| 广谱变更审查（本地/PR） | `code-reviewer` | `/feature-dev`、`/orch-*` |
| Python 深化 | `python-reviewer` | `/python-review` |
| TypeScript/JavaScript 深化 | `typescript-reviewer` | `/vue-review` 或手动 spawn |
| Vue 深化（与 typescript-reviewer 同跑） | `vue-reviewer` | `/vue-review` |
| FastAPI 深化 | `fastapi-reviewer` | `/fastapi-review` |
| PostgreSQL/Supabase 深化 | `database-reviewer` | 手动 spawn |
| 项目级安全表面（OWASP/agent/hook/MCP） | `security-reviewer` | `/orch-*`（条件）、`/vue-review`（配套）、手动 spawn |

### 4.4 测试与质量

| 子场景 | 推荐 agent | 入口 |
|---|---|---|
| 新功能/修 bug/重构，要 test-first | `tdd-guide` | 手动 spawn |
| 关键用户旅程的端到端测试 | `e2e-runner` | 手动 spawn |

**区分**：`tdd-guide` 是单元/集成级 Red-Green-Refactor（80%+ 覆盖）；`e2e-runner` 是浏览器级端到端（Agent Browser 优先，Playwright 回退）。

### 4.5 重构与清理

| 子场景 | 推荐 agent | 入口 |
|---|---|---|
| 移除 dead code / 合并重复 | `refactor-cleaner` | `/orch-refine-code` |

> **铁律：先 clean 后 refactor**。`refactor-cleaner` 每删一项跑一次测试并提交；有疑问不删；活跃开发期/部署前不删。

### 4.6 文档同步

| 子场景 | 推荐 agent | 入口 |
|---|---|---|
| 刷新 codemap / 同步 README/指南/env/API 文档 | `doc-updater` | 手动 spawn（`/update-docs`、`/update-codemaps` 自包含） |

### 4.7 GAN 自动生产

| 子场景 | 推荐 agent | 入口 |
|---|---|---|
| brief → 完整 spec（功能完备优先） | `gan-planner` | `/gan-build` |
| 按 spec 实现 + 按 feedback 迭代 | `gan-generator` | `/gan-build`、`/gan-design`、`/orch-build-mvp` |
| Playwright 测 live 应用 + 打分 + feedback | `gan-evaluator` | 同上 |

---

## 五、选型决策树（关键岔路口）

### 岔路 1：架构决策用 architect 还是 planner 还是 code-architect？

```text
宏观系统设计 / 技术选型 / 要 ADR              → architect
可执行的分阶段实施步骤（确切文件路径/风险）   → planner
贴合 codebase 现有模式的 feature 实现蓝图     → code-architect（/feature-dev）
```

### 岔路 2：审查用 code-reviewer 还是专项 reviewer？要不要再叠 security-reviewer？

```text
广谱变更审查（任何语言，本地/PR）             → code-reviewer（7 类清单）
某语言/框架深化                              → python-reviewer | typescript-reviewer | vue-reviewer | fastapi-reviewer
                                               （与 code-reviewer 维度不重叠，都做）
PostgreSQL/Supabase 表结构与查询              → database-reviewer
项目级安全表面（OWASP/agent/hook/MCP/secret） → security-reviewer（正交于 diff，与上面都做）
```

> 触及安全触发点（user input / auth / API / sensitive data / 文件上传 / 支付 / 依赖更新）→ **ALWAYS** 叠加 `security-reviewer`。

### 岔路 3：代码出问题是 build-error-resolver 还是 code-explorer？

```text
构建/类型错误，要让 build 通过（最小修复）     → build-error-resolver（<5% 改动，不重构）
行为不对/根因不明，要 trace 执行路径           → code-explorer（只读分析）
```

> 注意：`/build-fix` 命令是自包含流程，**不 spawn** `build-error-resolver`；要用该 agent 须手动 spawn。

### 岔路 4：Vue 项目为何要 vue-reviewer + typescript-reviewer 同跑？

`vue-reviewer` 只负责 Vue 专属 lanes（响应式、composables、模板安全、Pinia/Router/Nuxt/SSR）；通用 TS 类型安全、async 正确性、Node 安全由 `typescript-reviewer` 负责。两者明确分工、**发现不重叠**，故 `.vue` 变更须同时运行。纯 TS/JS（非 Vue）变更可直接调 `typescript-reviewer`。

### 岔路 5：GAN 三角缺一不可？gan-design 为何跳过 planner？

| 维度 | gan-build | gan-design |
|---|---|---|
| Planner | **有**（brief → 完整 spec） | **无**（brief 即 spec，跳过） |
| 取向 | 功能完备优先 | 视觉/创意优先 |
| Generator / Evaluator | 都有（同一循环） | 都有（同一循环，prompt 强调视觉卓越） |
| pass 阈值 | 7.0 | 7.5（更严） |

`gan-planner` 仅 `/gan-build` 显式 spawn；`/gan-design` 把 brief 直接当 spec，故三角变两点（generator ↔ evaluator）。

---

## 六、Agent 速查索引 + 易混淆边界提醒

### 从「我想做什么」反查 agent

- **架构设计 / 技术选型**：`architect`
- **实施计划**：`planner`
- **feature 实现蓝图**：`code-architect`
- **理解现有代码 / 根因排查**：`code-explorer`
- **修构建/类型错误**：`build-error-resolver`
- **广谱代码审查**：`code-reviewer`
- **Python 审查**：`python-reviewer`
- **TS/JS 审查**：`typescript-reviewer`
- **Vue 审查**：`vue-reviewer`
- **FastAPI 审查**：`fastapi-reviewer`
- **PostgreSQL 审查**：`database-reviewer`
- **安全审查**：`security-reviewer`
- **TDD**：`tdd-guide`
- **死代码清理**：`refactor-cleaner`
- **E2E 测试**：`e2e-runner`
- **文档/codemap 同步**：`doc-updater`
- **GAN 规划/生成/评估**：`gan-planner` / `gan-generator` / `gan-evaluator`

### 无命令入口、需手动 spawn 的 6 个 agent

`architect`、`tdd-guide`、`build-error-resolver`、`doc-updater`、`e2e-runner`、`database-reviewer`

### ⚠️ 易混淆边界（重要）

- **自包含命令不 spawn 同名 agent**：`/build-fix`、`/code-review`、`/update-docs`、`/update-codemaps` 都是自包含流程，命令本身**不调用** `build-error-resolver` / `code-reviewer` / `doc-updater`。要用这些 agent 须手动 spawn（或经其他命令，如 `/feature-dev`、`/orch-*` 会 spawn `code-reviewer`）。
- **两个 planner 别混淆**：`/plan` 里的 "planner" 指独立 agent `planner`（可选委托）；`/gan-*` 里的 "planner" 指另一个 agent `gan-planner`（GAN Harness 专用）——两者不同。
- **tdd-workflow 是 skill 不是 agent**：`/plan` 提到的 `tdd-workflow` 是 skill；要执行 TDD 的 agent 是 `tdd-guide`。
- **typescript-reviewer 无独立命令**：只能经 `/vue-review` 触发或手动 spawn。

---

*本指南基于 `agents/` 下 19 个 agent 文件的 frontmatter（name/description/tools/model）、正文流程与检查清单，以及 `commands/` 对 agent 的调用关系整理。每个 agent 的完整内部步骤请参阅各 agent 文件本身。*

---

## 姊妹文档（aimeta3s 资料导航）

| 文档 | 主题 |
|---|---|
| `command-helper.md` | 命令总览、9 条流水线、选型决策树 |
| `skill-helper.md` | Skill 触发机制、相似抉择、34 张详解卡 |
| `agent-helper.md` | Agent 分工、协作关系、spawn 入口 |
| `rules-helper.md` | Rule 三种激活机制、跨语言矩阵、master checklist |
| `hooks-helper.md` | Hook 阻塞语义三态、profile 矩阵、数据流 |

> 这 5 份文档随 `docs/` 安装到 `~/.claude/docs/aimeta3s/`，供 `/aimeta3s-help` 命令按需读取；资源名→路径的精确映射见同目录 `manifest.json`。
