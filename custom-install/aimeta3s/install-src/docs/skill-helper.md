<!-- aimeta3s-doc: skill-helper | version: 1 | updated: 2026-08-12 | source: skills/*/SKILL.md（精确路径见 manifest.json） -->

# aimeta3s Skill 使用建议

本指南面向 `install-src/skills/` 下的 **35 个 skill**。与同目录的《[command-helper.md](command-helper.md)》（41 条**命令**指南）正交——那篇讲「该敲哪条 `/命令`」，本篇讲「Claude 会在什么场景自动用上哪个 skill、以及你该如何主动引导」。

> 全文基于逐个 SKILL.md 真实内容提炼，每个 skill 按「定位 / 适用场景 / 触发条件 / 处理流程 / 生成物 / 边界 / 关联」七维呈现。

---

## 一、先搞清楚：Skill 是什么、怎么触发

### Skill ≠ Command

| | Command（命令） | Skill（技能） |
|---|---|---|
| 触发方式 | 用户**主动**敲 `/xxx`（如 `/plan`、`/code-review`） | Claude 按 `description` **被动自动匹配**加载；用户也可显式点名 |
| 本质 | 明确的指令入口 | 领域知识包 / 工作流定义 |
| 你怎么「用」 | 敲命令 | 多数情况是**让 Claude 在合适场景自动用上**，或在 prompt 里点名「用 xxx skill」 |

### 本包 skill 的两种角色

1. **独立领域知识包**（大多数）——触及相关技术栈时自动激活，提供模式、检查清单、代码模板。如 `python-patterns`、`postgres-patterns`、`vue-patterns`。
2. **被 command / agent 委托的工作流定义**——典型是 `orch-*` 族，它把请求分类后委托给 `planner` / `tdd-guide` / `code-reviewer` 等 agent 与 `/plan` `/code-review` 等命令。

### 触发可靠性提示

- Skill 靠 `description` 里的关键词和「When to Activate」章节匹配。**任务描述里带上明确的技术栈/关键词**（如「FastAPI + Pydantic v2」「Playwright E2E」），命中率更高。
- 没自动激活时，直接在 prompt 点名：「按 `tdd-workflow` skill 走 Red-Green-Refactor」。
- 安装后 skill 扁平放在 `~/.claude/skills/<name>/`，**skill 名即目录名**（见下表第一列）。

---

## 二、34 个 Skill 总览速查表

按域分组，每个一行。`→` 指向主要委托对象，`|` 表示二选一。

### 横切方法论（基座，优先看）

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `coding-standards` | 跨项目编码规范基座（命名/可读性/不可变性/质量评审） | 编码规范、code review、代码质量、重构、命名 | PASS/FAIL 对照判断、lint/评审 checklist |
| `tdd-workflow` | 强制 TDD 流程，要求 80%+ coverage | 新 feature、修 bug、refactor、`*.plan.md` | 先失败后通过的测试、coverage 报告、`.tdd.md` 证据 |

### 编排族 orch（端到端工作流，被命令/agent 委托）

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `orch-pipeline` | orch 族**共享引擎**（通常不直接调） | 被操作 skill 间接加载 | 流水线定义（task_list 驱动实现） |
| `orch-add-feature` | 编排**全新功能**端到端构建 | 添加尚不存在的能力 | task_list、TDD 实现、`feat:` commit |
| `orch-build-mvp` | 从设计/规格文档构建可运行 MVP | 持有 SDD/PRD 文档、从 spec 起步 | spec/rubric、垂直切片、`feat:` commit |
| `orch-change-feature` | 调整**现有正常功能**的行为 | 修改/调整/让它也能 X 改成 Y | 更新的测试+实现、commit |
| `orch-fix-defect` | 编排 bug 修复（红测试复现→绿） | 输出错误、报错、crash、regression | 回归测试、`fix:` commit |
| `orch-refine-code` | 保行为重构 | 提取模块、消除重复、清理死代码 | 重构计划、`refactor:` commit |

### Python 生态

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `python-patterns` | Pythonic 惯用法/PEP 8/类型提示/性能 | `.py` 文件、Python 惯用法、类型注解、并发 | Pythonic 代码示例、`pyproject.toml`、反模式清单 |
| `python-testing` | pytest + TDD 测试策略/fixtures/mock/覆盖率 | `pytest`、`conftest.py`、`@pytest.fixture`、`--cov` | 测试代码、fixtures、覆盖率报告 |
| `fastapi-patterns` | 生产级 FastAPI 全栈范式（Pydantic v2/DI/async/JWT） | FastAPI、APIRouter、AsyncSession、OAuth2 | 项目骨架、fixtures、OpenAPI 响应模型 |
| `django-security` | Django 安全清单（认证/CSRF/SQL注入/XSS/部署） | Django settings、AbstractUser、csrf_token、SECURE_* | 生产安全配置、权限类、检查清单 |

### JS/TS 后端与 API

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `backend-patterns` | Node/Express/Next.js API routes 后端架构 | 分层架构、repository/service、N+1、Redis、JWT/RBAC | TS 分层模板、错误/缓存/Auth 模式 |
| `bun-runtime` | Bun 一体化工具链与 Node 迁移指南 | Bun、`bun install`、`bun.lock`、Bun on Vercel | 命令对照、迁移注意、最小示例 |
| `api-design` | 生产级 REST API 契约设计（状态码/分页/版本） | REST API、endpoint、状态码、cursor、rate limit、versioning | 资源命名/错误响应/分页约定、review checklist |

### 前端框架与构建

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `frontend-patterns` | React/Next.js 前端模式（组件/Hooks/状态/性能） | React 组件、useState/useReducer、SWR/React Query、memoization | TS 代码片段、模式选型建议 |
| `vue-patterns` | Vue 3 Composition API 全栈指南（Nuxt/Pinia/Router） | Vue/Nuxt/Pinia、`.vue`、composables、响应式 | 命名/结构/状态选型规范、反模式表 |
| `vite-patterns` | Vite 构建工具配置/插件/env/库模式手册 | `vite.config.ts`、Vite 插件、proxy、`build.lib` | config 片段、插件选型、避坑 checklist |
| `nextjs-turbopack` | Next.js 16+ 与 Turbopack 使用/选型 | Next.js 16、Turbopack、dev 启动慢、`proxy.ts` | 用/不用 Turbopack 决策、排障命令 |
| `e2e-testing` | Playwright E2E 模式（POM/CI/抗 flaky） | Playwright、`*.spec.ts`、Page Object、flaky 治理 | POM 类、config、CI workflow、报告模板 |

### UI 设计与可访问性

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `design-system` | 生成/审计设计系统、识别 AI 套路 | design system、视觉一致性、样式 PR review、audit UI | `DESIGN.md`、design-tokens.json、评分报告 |
| `accessibility` | WCAG 2.2 AA 无障碍设计与审计（Web/iOS/Android） | a11y、ARIA、语义化、焦点管理、屏幕阅读器、WCAG | 跨平台 ARIA/trait 映射、合规 checklist |
| `liquid-glass-design` | iOS 26 Liquid Glass 材质实现（SwiftUI/UIKit/Widget） | Liquid Glass、iOS 26、`glassEffect`、widget accented | 三端玻璃材质代码片段、容器方案 |

### Swift/iOS

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `swiftui-patterns` | SwiftUI 架构/状态/导航/性能模式 | SwiftUI、`@Observable`、NavigationStack、重渲染 | SwiftUI 片段、包装器选择决策 |
| `swift-actor-persistence` | actor 线程安全本地持久化（内存+文件） | actor、线程安全、persistence、cache、离线优先 | 泛型 actor 仓储模板 |
| `swift-protocol-di-testing` | 协议依赖注入 + Swift Testing 可测性 | protocol、DI、mock、Swift Testing、`@Test` | 协议+Mock+注入+测试骨架 |

### 数据存储

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `postgres-patterns` | PostgreSQL 查询优化/schema/索引/安全速查 | PostgreSQL/PG、索引、B-tree/GIN/BRIN、RLS、慢查询 | SQL 片段、索引/类型选型、诊断查询 |
| `clickhouse-io` | ClickHouse OLAP 表设计/查询/数据工程 | ClickHouse、MergeTree、物化视图、OLAP、留存/漏斗 | 建表 DDL、分析 SQL 模板、摄取代码 |
| `database-migrations` | 安全可逆零停机 schema 变更（多 ORM） | migration、schema change、backfill、zero-downtime、CONCURRENTLY | migration 文件、backfill 脚本、零停机时间线 |

### DevOps + ML

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `docker-patterns` | Docker/Compose 本地开发/安全/网络/卷手册 | docker-compose.yml、Dockerfile、容器化、multi-stage | compose/Dockerfile 骨架、加固清单、`.dockerignore` |
| `pytorch-patterns` | PyTorch 训练管线/模型/数据加载最佳实践 | PyTorch、training loop、nn.Module、DataLoader、AMP | 训练/评估模板、checkpoint 函数、反模式清单 |

### 安全

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `security-review` | 应用代码安全编码清单（密钥/注入/认证/云） | 认证授权、用户输入、API 端点、密钥、支付 | FAIL/PASS 修正、部署前 17 项清单 |
| `security-scan` | AgentShield 扫描 `.claude/` 配置漏洞 | 扫描 .claude 配置、审计 Claude Code 安全、agentshield | 评级报告（A-F）、`--fix` 改写、CI Action |

### 元系统（学习闭环）

| Skill | 一句话用途 | 触发线索 | 主要生成物 |
|---|---|---|---|
| `continuous-learning-v2` | 基于本能的会话学习系统（观察→instinct→演化） | hooks 自动观察、`/instinct-status`、`/evolve`、`/promote` | instinct yaml、evolved skill/command/agent |

---

## 三、按场景选 Skill

### 场景 → Skill 决策表

| 我要做什么 | 首选 Skill | 配合命令/agent |
|---|---|---|
| 加一个全新功能 | `orch-add-feature` | → `planner`/`tdd-guide`/`code-reviewer` |
| 从 SDD/PRD 搭可运行 MVP | `orch-build-mvp` | → `/gan-build --skip-planner` |
| 改一个现有功能的预期行为 | `orch-change-feature` | 先改测试再改实现 |
| 修一个 bug | `orch-fix-defect` | 先写复现测试（红）再修 |
| 不改行为地重构 | `orch-refine-code` | → `refactor-cleaner` |
| 写 FastAPI 接口 | `fastapi-patterns` | + `python-testing` 测试 |
| 写 Django 且关心安全 | `django-security` | + `python-patterns` 风格 |
| 写 Node/Next.js 后端 | `backend-patterns` | + `api-design` 契约 |
| 设计 REST API 契约 | `api-design` | 状态码/分页/版本 |
| 写 React 组件 | `frontend-patterns` | + `coding-standards` 基座 |
| 写 Vue 3 应用 | `vue-patterns` | + `vite-patterns` 构建 |
| 配 Vite 构建 | `vite-patterns` | env/proxy/库模式 |
| 排查 Next.js dev 慢 | `nextjs-turbopack` | Turbopack vs webpack |
| 写 Playwright E2E | `e2e-testing` | POM + CI workflow |
| 做 WCAG 无障碍审计 | `accessibility` | Web/iOS/Android 三端 |
| 建设计系统/审视觉一致性 | `design-system` | → design tokens |
| 做 iOS 26 玻璃材质 UI | `liquid-glass-design` | SwiftUI/UIKit/Widget |
| 写 SwiftUI 视图 | `swiftui-patterns` | 状态/导航/性能 |
| 做 Swift 线程安全持久化 | `swift-actor-persistence` | actor 仓储模板 |
| 让 Swift 代码可测 | `swift-protocol-di-testing` | 协议 + Mock + Swift Testing |
| 优化 PostgreSQL 查询 | `postgres-patterns` | 索引/RLS/诊断 |
| 做 OLAP 分析查询 | `clickhouse-io` | MergeTree/物化视图 |
| 做数据库 schema 变更 | `database-migrations` | 零停机/expand-contract |
| 写 Dockerfile/Compose | `docker-patterns` | 本地开发+安全加固 |
| 写 PyTorch 训练脚本 | `pytorch-patterns` | AMP/checkpoint/可复现 |
| 做安全编码自查 | `security-review` | 代码层 FAIL/PASS |
| 扫描 .claude 配置漏洞 | `security-scan` | AgentShield 评级 |
| 走严格 TDD | `tdd-workflow` | /tdd，接续 `*.plan.md` |
| 让 Claude 自动学习会话模式 | `continuous-learning-v2` | 需启用 observer |

### 相似 Skill 抉择

- **编码规范**：`coding-standards`（跨项目基座）→ 框架专项让位 `frontend-patterns` / `backend-patterns` / `api-design` / 各 `*-patterns`。只想要最短规则层用 `rules/ecc/common/coding-style.md`。
- **测试**：`tdd-workflow`（通用 TDD 流程，含 plan handoff 安全节）→ Python 专项用 `python-testing` → E2E 用 `e2e-testing`。
- **安全（关键区分）**：`security-review` = **应用代码**的安全编码清单（认证/注入/XSS/密钥/云配置）；`security-scan` = **Claude Code 自身 `.claude/` 配置**的漏洞扫描（settings/MCP/hooks）。两者对象完全不同，别混。
- **数据库**：查询/索引/RLS 优化 → `postgres-patterns`；schema 变更/迁移 → `database-migrations`；OLAP 分析 → `clickhouse-io`。
- **UI/设计**：整体视觉一致性 → `design-system`；无障碍合规 → `accessibility`；iOS 26 玻璃材质 → `liquid-glass-design`。
- **前端框架 vs 构建工具**：`frontend-patterns`（React 组件）/ `vue-patterns`（Vue）是框架模式；`vite-patterns` / `nextjs-turbopack` 是构建/打包工具——常配合使用。
- **orch 五选一**：看「行为是否存在 + 是否有 bug」——新能力 `add`、现有功能改预期 `change`、有故障 `fix`、结构优化行为不变 `refine`、从文档起步 `build-mvp`。
- **Python Web 框架**：FastAPI 用 `fastapi-patterns`，Django 用 `django-security`（偏安全）+ `python-patterns`（风格）。
- **学习/沉淀**：单次 session 手动提取 → `/learn`；持续自动观察 → `continuous-learning-v2`；固化为 SKILL.md → `/skill-create`。

---

## 四、逐个 Skill 详解

> 按域顺序排列。每张卡：定位 / 适用场景 / 触发条件 / 处理流程 / 生成物 / 边界 / 关联。

### 横切方法论

#### coding-standards
- **定位**：跨项目的编码规范基座（shared floor），覆盖命名、可读性、不可变性、代码质量评审的通用约定。
- **适用场景**：①新项目/新模块起步确立基线；②代码质量与可维护性评审、识别 code smells；③重构既有代码使其符合规范；④配置 lint/format/type-check 规则；⑤向新成员宣讲编码约定。
- **触发条件**：description 的 "naming, readability, immutability, code-quality review"；关键词：编码规范/code review/代码质量/重构/命名规范/lint 配置。
- **处理流程 / 内容结构**：四大质量原则（Readability First / KISS / DRY / YAGNI）→ TS/JS 规范（命名、不可变 spread、错误处理、async 并行、类型安全）→ React 基础 → API 设计（REST/统一响应/zod）→ 文件组织 → 注释与 JSDoc → 性能 → 测试结构（AAA）→ Code Smell 检测（长函数/深嵌套/Magic Numbers）。
- **生成物 / 预期结果**：对代码给出 PASS/FAIL 对比与改写建议；可作 lint/类型规则与评审 checklist 的依据。
- **边界 / 不适用**：明确「基座层」——React 组合/hooks/渲染交 `frontend-patterns`；repository/service/endpoint/数据库分层交 `backend-patterns`/`api-design`；只需最短规则层用 `rules/ecc/common/coding-style.md`。
- **关联**：`frontend-patterns`、`backend-patterns`、`api-design`、`rules/ecc/common/coding-style.md`。

#### tdd-workflow
- **定位**：强制 TDD（Red-Green-Refactor）、要求 80%+ coverage（unit+integration+E2E）的开发工作流 skill。
- **适用场景**：①写新功能/API endpoint/component；②修 bug/排查 issue（先复现再修）；③refactor 既有代码；④接续 `/plan` 或任意 `*.plan.md` 的实施计划。
- **触发条件**：关键词「新 features/修 bug/refactor/TDD/80%+ coverage」；frontmatter 带 `argument-hint: <path/to/*.plan.md>`，传入 plan 文件路径时被显式调用。
- **处理流程 / 内容结构**：流程型 9 步——**Plan Handoff**（把 `*.plan.md` 当不可信数据，sanitize 嵌入命令）→ Step0 检测 test runner（npm/pnpm/yarn/Bun）→ Step1 写 User Journeys → Step2 生成 test cases → Step3 验证 RED（强制 gate）→ Step4 最小实现 → Step5 验证 GREEN → Step6 Refactor → Step7 验证 coverage≥80% → Step8 写证据报告 `docs/testing/<name>.tdd.md`；每阶段做 Git checkpoint commit。附 Jest/Vitest/Bun native/API/Playwright/Mock 模式。
- **生成物 / 预期结果**：先失败后通过的测试套件、≥80% coverage 报告、按阶段的 checkpoint commit、`<name>.tdd.md` 证据报告（journeys/guarantees 表/coverage/已知缺口）。
- **边界 / 不适用**：不跳过 RED gate（未编译/未执行的测试不算 RED）；纯文档/配置变更不适用；Bun 细节交 `bun-runtime`。
- **关联**：被 `orch-*` 族和 `/tdd` 命令引用为实现阶段执行器；接续 `/plan`、`*.plan.md`；cross-ref `bun-runtime`、`scripts/setup-package-manager.js`。

### 编排族 orch

> 本族是「有 gate、非自主」的端到端编排，统一委托 `orch-pipeline` 共享引擎。所有操作 skill 都是 thin wrapper：分类请求 → 选跑哪些阶段 → 每阶段委托 agent/command → 叠加 size classifier + 两道 gate。

#### orch-pipeline（共享引擎，通常不直接调）
- **定位**：orch 族共享编排引擎，定义带两道 human gate 的 Research-Plan-TDD-Review-Commit 流水线、size classifier、agent map。
- **适用场景**：①被操作 skill 间接加载；②向族内新增操作或调整共享 phases/gates/agent map 时直接阅读。
- **触发条件**：不直接触发，由 5 个操作 skill 委托加载。
- **处理流程 / 内容结构**：7 阶段——0 Intake（复述请求；MVP 读 spec）→ 1 Research & Reuse（gh search → Context7 → package registry → Exa）→ 2 Plan（委托 `planner`，输出按 thin vertical slice 排序的 task_list）【**GATE 1**】→ 3 Scaffold（仅 MVP）→ 4 Implement（`tdd-guide` 驱动 red→green→refactor）→ 5 Review（`code-reviewer`；触 security trigger 追加 `security-reviewer`）→ 6 Commit（conventional，每逻辑块一个 commit）【**GATE 2**】。
- **生成物 / 预期结果**：`task_list`（驱动 Implement）；较大工作另产 PRD/architecture/system_design；CRITICAL/HIGH review 发现须在 Gate 2 前解决。
- **边界 / 不适用**：用户应调操作 skill 而非本引擎；无状态 handoff——规划文档即唯一交接物。
- **关联**：`planner`/`architect`/`code-architect`（Plan）、`tdd-guide`/`tdd-workflow`（Implement）、`code-reviewer`/`/code-review`（Review）、`security-reviewer`（Security）、`code-explorer`（Intake）、`/gan-build`（MVP）、`build-error-resolver`/`/build-fix`（构建中断）。

#### orch-add-feature
- **定位**：编排全新功能（尚不存在的能力）的端到端构建。
- **适用场景**：添加新功能（"添加/构建/实现/支持…"），全新行为，非修复非调整。
- **触发条件**：用户请求添加尚不存在的功能。
- **处理流程 / 内容结构**：默认 size 下限 **standard**；Phase mask `0→1→2→4→5→6`（跳过 3 Scaffold）；First move：为**新行为**写**新的**失败测试，再实现至 green。
- **生成物 / 预期结果**：task_list（Gate1 审批）、TDD 实现、code-review（+ security-reviewer 若触 trigger）、`feat:` commit（Gate2 确认）。
- **边界 / 不适用**：有 bug → `orch-fix-defect`；现有功能调行为 → `orch-change-feature`。
- **关联**：委托 `orch-pipeline`；`planner`/`tdd-guide`/`code-reviewer`/`security-reviewer`；`/feature-dev` 是不共享 size/gates 的独立版本。

#### orch-build-mvp
- **定位**：从设计/规格文档引导构建可工作的最小可行产品（首个垂直切片）。
- **适用场景**：持有 SDD/PRD/系统设计文档，以文档路径为入参，需要从 spec 转出可运行起点。
- **触发条件**：从设计/规格文档启动 MVP 构建。
- **处理流程 / 内容结构**：默认 size 下限 **large**；Phase mask `0(read spec)→1→2(heavy)→3(scaffold)→4→5→6`（**唯一跑阶段 3**）；First move：读文档→提取范围/已锁定决策/功能列表→排序为细粒度 vertical slice；**复用 GAN harness**：SDD 转成 `gan-harness/spec.md`+`eval-rubric.md`，用 `/gan-build "<brief>" --skip-planner` 驱动（默认 `--max-iterations 15`、`--pass-threshold 7.0`、`--eval-mode playwright`；非 UI 用 `--eval-mode code-only`）。
- **生成物 / 预期结果**：`gan-harness/spec.md`、`eval-rubric.md`、`feedback/feedback-NNN.md`；切片计划（Gate1）；脚手架与每切片一个 `feat:` commit（Gate2）。
- **边界 / 不适用**：无 spec/design 文档输入不适用。
- **关联**：`orch-pipeline`；`/gan-build --skip-planner`（驱动 `gan-generator→gan-evaluator`）；`security-reviewer`。

#### orch-change-feature
- **定位**：编排对现有正常运行功能的修改（行为预期变化，无 bug）。
- **适用场景**：现有功能正常但期望行为不同（"修改/调整/让它也能/不要 X 改成 Y"）。
- **触发条件**：用户请求调整现有功能（无故障）。
- **处理流程 / 内容结构**：默认 size 下限 **small**；Phase mask `0→(1 仅新行为需调研时)→light 2→4→5→6`；First move：**先改现有测试**表达新期望行为，再改实现至 green——"先改测试"是与 fix 的关键区分。
- **生成物 / 预期结果**：更新后的测试与实现、code-review、commit（Gate2 确认）。
- **边界 / 不适用**：有 bug → `orch-fix-defect`；新能力 → `orch-add-feature`。
- **关联**：`orch-pipeline`；`planner`（standard+）；`tdd-guide`；`code-reviewer`；`security-reviewer`。

#### orch-fix-defect
- **定位**：编排 bug 修复（以失败回归测试复现→修复→review→commit）。
- **适用场景**：输出错误、报错、crash、regression。
- **触发条件**：现有行为出故障/出错。
- **处理流程 / 内容结构**：默认 size 下限 **small**（通常 trivial）；Phase mask `0→(light 2 仅根因不明显或 standard+ 时)→4→5→6`；**Research(1) 通常跳过**；First move：把 bug 复现为**新的失败测试**（回归测试）再修复至 green——"先证明 bug 存在"是与 tweak 的关键区分。根因不清先用 `code-explorer` 界定；构建中断升级 `build-error-resolver`/`/build-fix`。
- **生成物 / 预期结果**：回归测试（红→绿）、code-review、`fix:` commit（Gate2 确认）；Gate1 仅当产生 plan 时才停。
- **边界 / 不适用**：行为正确但预期不同 → `orch-change-feature`；能力不存在 → `orch-add-feature`。
- **关联**：`orch-pipeline`；`code-explorer`；`build-error-resolver`/`/build-fix`；`tdd-guide`；`code-reviewer`；`security-reviewer`。

#### orch-refine-code
- **定位**：编排保持行为不变的重构（结构更优，行为中性）。
- **适用场景**：提取模块、消除重复、清理死代码、减少嵌套、重命名提升清晰度。
- **触发条件**：功能不变，重构代码。
- **处理流程 / 内容结构**：默认 size 下限 **standard**（重构常跨多文件）；Phase mask `0→2(规划重构)→4(保持 green)→5→6`；**不写新行为测试**——现有测试套件即安全网；First move：改代码**之前**先确认相关测试**存在且全 green**，覆盖低则先补 characterization test，然后小步重构、每步 rerun。
- **生成物 / 预期结果**：重构计划（Gate1）、小步重构（全程 green）、code-review、`refactor:` commit（Gate2，diff 必须行为中性）。
- **边界 / 不适用**：行为有任何改变 → `orch-change-feature` 或 `orch-fix-defect`。
- **关联**：`orch-pipeline`；`refactor-cleaner` agent（运行 knip/depcheck/ts-prune 安全删除）；`planner`；`tdd-guide`；`code-reviewer`。

### Python 生态

#### python-patterns
- **定位**：Pythonic 惯用法、PEP 8、类型提示与构建健壮可维护 Python 应用的最佳实践参考库（知识型）。
- **适用场景**：①编写新 Python 代码；②review/refactor 既有 Python 代码；③设计包结构与模块划分；④选型并发模型（线程/进程/async）、性能优化；⑤配置工具链（black/isort/ruff/mypy/pytest/bandit/pyproject.toml）。
- **触发条件**：任务涉及 `.py` 文件、Python 语法/惯用法、类型注解、异常处理、装饰器、并发、打包。
- **处理流程 / 内容结构**：核心原则（可读性/显式优于隐式/EAFP）→ 类型提示 → 错误处理 → 上下文管理器 → 推导式与生成器 → dataclass/NamedTuple → 装饰器 → 并发 → 包组织 → 内存与性能 → 工具集成与 `pyproject.toml` → 惯用法速查 → 反模式（可变默认参数、`type()` 比较、`== None`、`import *`、裸 except）。
- **生成物 / 预期结果**：Pythonic 代码示例与「正确/错误」对照、`pyproject.toml` 配置、反模式检查清单。
- **边界 / 不适用**：不覆盖测试策略（→ `python-testing`）；不覆盖 Web 框架细节（→ `fastapi-patterns`/`django-security`）；是参考规范非自动执行工具。
- **关联**：无显式引用。

#### python-testing
- **定位**：基于 pytest + TDD（red/green/refactor）的 Python 测试策略与 fixtures/mocking/参数化/覆盖率知识库。
- **适用场景**：①对新 Python 代码做 TDD；②设计测试套件结构（unit/integration/e2e）；③审查覆盖率（80%+，关键路径 100%）；④搭建测试基础设施（conftest/markers/mock）；⑤测试异步代码或 API/DB 端点。
- **触发条件**：任务提到 `pytest`、`conftest.py`、`@pytest.fixture`、`mock.patch`、`--cov`、pytest-asyncio。
- **处理流程 / 内容结构**：TDD 哲学与覆盖率目标 → pytest 基础与断言 → Fixtures（scope/参数化/autouse/conftest）→ `@pytest.mark.parametrize` → markers → Mocking（函数/返回值/异常/autospec/PropertyMock）→ 异步测试 → 异常测试 → 副作用测试（`tmp_path`）→ 测试组织 → DO/DON'T → 常见模式（FastAPI/Flask/DB）→ 配置 → 运行命令速查。
- **生成物 / 预期结果**：可运行的 pytest 测试、conftest fixtures、测试目录骨架、`pytest.ini`/`pyproject.toml` 配置、HTML 覆盖率报告。
- **边界 / 不适用**：不教授生产代码风格（→ `python-patterns`）；不针对具体框架安全/路由（→ `fastapi-patterns`/`django-security`）。
- **关联**：无显式引用。

#### fastapi-patterns
- **定位**：生产级 FastAPI 全栈开发范式：项目结构、Pydantic v2 schemas、依赖注入、async、JWT 认证授权、事务化 Service 层、httpx+pytest 测试。
- **适用场景**：①从零搭 FastAPI 骨架；②Pydantic v2 schema 设计；③依赖注入（`DbDep`/`CurrentUserDep` 类型别名）；④async 路由 + 事务化 Service 层；⑤httpx+pytest-asyncio 做 ASGI 测试与依赖覆盖。
- **触发条件**：任务涉及 FastAPI、APIRouter、AsyncSession、`pydantic-settings`、`OAuth2PasswordBearer`、`@asynccontextmanager lifespan`。
- **处理流程 / 内容结构**：项目目录约定 → App Factory + lifespan → `pydantic-settings` 配置 → Pydantic v2 schemas → 依赖注入（`get_db` rollback、`get_current_user` JWT 解码、401 vs 403 隔离）→ 路由设计（CRUD + `/me` + `/token`，分页 `Query(ge=,le=)`）→ Service 层（bcrypt、原子约束、确定性排序、`model_dump(exclude_unset=)`）→ httpx+pytest-asyncio 测试（内存 sqlite、`dependency_overrides`、fixture 链）→ 反模式（业务塞路由、async 里同步 DB）→ 最佳实践。
- **生成物 / 预期结果**：完整项目骨架（main/config/schemas/dependencies/routers/services）、可复用 fixtures、OpenAPI 友好响应模型、反模式对照。
- **边界 / 不适用**：仅限 FastAPI；通用 Python 风格 → `python-patterns`，通用 pytest → `python-testing`；不涉及 Django（→ `django-security`）；示例用 SQLAlchemy 异步但不教 SQLAlchemy 本身。
- **关联**：无显式引用。

#### django-security
- **定位**：Django 应用安全最佳实践清单与范例：认证授权、CSRF、SQL 注入、XSS、文件上传、安全头、部署配置。
- **适用场景**：①配置 Django 生产安全 settings（DEBUG=False、HSTS、安全 cookie、密码校验器）；②实现认证（自定义 `AbstractUser`、Argon2/bcrypt、会话）；③设计权限与 RBAC；④防护 SQL 注入/XSS/CSRF/点击劫持/文件上传；⑤上线前安全审查与日志加固。
- **触发条件**：任务出现 `settings.py`、`AbstractUser`、`csrf_token`、`SECURE_*`、DRF throttle、`mark_safe`。
- **处理流程 / 内容结构**：核心安全 settings → 认证（自定义 User、PASSWORD_HASHERS 含 Argon2/BCryptSHA256）→ 授权（`PermissionRequiredMixin`、DRF 自定义 Permission、RBAC）→ SQL 注入防护（ORM 自动转义、`raw()` 必须 `%s` 参数化、禁 f-string 拼接）→ XSS（模板自动转义、禁 `mark_safe(user_input)`）→ CSRF → 文件上传（`python-magic`/`filetype` 按 magic bytes 校验）→ API 安全（DRF throttle）→ 安全头（CSP/X-Frame-Options/nosniff）→ 环境变量（django-environ）→ 安全事件日志（`django.security`）→ Quick Security Checklist。
- **生成物 / 预期结果**：可粘贴的 `production.py` 安全配置、自定义 User 模型、DRF 权限类、`SecurityHeaderMiddleware`/`CSPMiddleware`、文件类型校验器、12 项检查清单。
- **边界 / 不适用**：仅限 Django；不涉及 FastAPI（→ `fastapi-patterns`）；不教授通用 Python 规范（→ `python-patterns`）或 pytest（→ `python-testing`）；是安全规范非渗透工具。
- **关联**：无显式引用。

### JS/TS 后端与 API

#### backend-patterns
- **定位**：Node.js/Express/Next.js API routes 下的后端架构模式与服务器端最佳实践速查。
- **适用场景**：①设计 REST/GraphQL endpoint，repository/service/controller 分层；②优化数据库查询（N+1、索引、连接池、事务）；③引入缓存层（Redis、cache-aside）；④中间件（JWT 鉴权、RBAC、structured logging、background job）；⑤集中式错误处理与指数退避重试。
- **触发条件**：在 Node/TS/Next.js API routes 栈下，任务涉及"分层架构""repository/service""N+1""Redis 缓存""JWT/RBAC""background job""structured logging""retry/backoff""事务"。
- **处理流程 / 内容结构**：API 设计模式（RESTful URL/Repository/Service Layer/Middleware）→ Database（查询裁列、N+1 批量、事务 RPC）→ Caching（Redis Decorator、Cache-Aside）→ 错误处理（ApiError、集中 errorHandler、指数退避）→ Auth（JWT、requireAuth、requirePermission HOF）→ Rate Limiting → Background Jobs（JobQueue）→ Structured Logging（JSON Logger）。示例以 TS+Supabase+Next.js 为主。
- **生成物 / 预期结果**：可套用的 TS 代码模板与分层约定；作为编码时的内联参考，不产出独立文档。
- **边界 / 不适用**：HTTP 契约（状态码/错误格式/分页/版本）→ `api-design`；rate limiting 的 abuse review → `security-review`；不覆盖前端、非 Node 运行时。
- **关联**：显式引用 `api-design`、`security-review`。

#### bun-runtime
- **定位**：Bun 作为 runtime/package manager/bundler/test runner 的一体化工具链速查与 Node 迁移指南。
- **适用场景**：①新建 JS/TS 项目倾向单一工具链；②从 Node 迁移到 Bun（命令替换、lockfile）；③在 Vercel 配置 Bun；④编写/调试 Bun 脚本与 `bun:test`；⑤评估"该选 Bun 还是 Node"。
- **触发条件**：项目提及 "Bun"、`bun install`、`bun.lock`/`bun.lockb`、"Bun on Vercel"、"bun test"、"从 Node 迁移到 Bun"。
- **处理流程 / 内容结构**：When to Use（Bun vs Node 取舍）→ How It Works（四角色、Node 迁移映射、Vercel 配置）→ Examples（run/install、env、testing、`Bun.file`/`Bun.serve`）→ Best Practices（提交 lockfile、TS 原生执行）。
- **生成物 / 预期结果**：Bun 命令对照、迁移注意、最小可运行示例；不生成脚手架。
- **边界 / 不适用**：追求最大生态兼容、依赖 Node-only legacy 工具链、或某依赖在 Bun 下有问题时留在 Node。
- **关联**：无显式引用；被 `tdd-workflow` 在 Bun native 测试章节 cross-reference。

#### api-design
- **定位**：面向生产级、开发者友好的 REST API 契约设计规范（知识型 + checklist）。
- **适用场景**：①设计新 endpoint 或整体资源结构；②review 现有 API 契约一致性；③分页（offset vs cursor）、过滤、排序、稀疏字段；④错误响应格式与状态码规则；⑤版本策略与弃用节奏。
- **触发条件**：任务出现 "REST API""endpoint""状态码""分页""cursor""rate limit 头""versioning""错误响应格式"，或做 TS/Python/Go 的 API handler 实现。
- **处理流程 / 内容结构**：Resource Design → HTTP Methods 与 Status Code 语义表 → Response Format（success/collection/error）→ Pagination（offset vs cursor 选型表）→ Filtering/Sorting/Sparse → Auth（Bearer/API key、资源级/角色级授权）→ Rate Limiting（响应头、分层配额）→ Versioning（URL vs Header、5 条 breaking/non-breaking 判定、弃用流程）→ Implementation Patterns（Next.js+Zod/Django REST/Go net/http 三套示例）→ 上线前 API Design Checklist（12 项）。
- **生成物 / 预期结果**：统一的资源命名、状态码、错误响应、分页与版本约定，多语言实现模板；可作团队 API 规范底稿与 review 清单。
- **边界 / 不适用**：仅 HTTP 契约与 API 外观，不负责后端内部分层/缓存/事务（→ `backend-patterns`）；abuse/安全审查 → `security-review`；不覆盖 GraphQL/RPC/WebSocket。
- **关联**：与 `backend-patterns` 互补（backend-patterns 的 Rate Limiting 段把 HTTP 契约指向本 skill）。

### 前端框架与构建

#### frontend-patterns
- **定位**：React/Next.js 生态的现代前端开发模式速查（组件、Hooks、状态、性能、表单、动画、a11y）。
- **适用场景**：构建 React 组件（组合/复合组件/render props）；封装自定义 Hook；Context+Reducer 全局状态；性能优化（memo/lazy/虚拟列表）；受控表单+校验；ErrorBoundary、Framer Motion 动画、键盘/焦点可访问性。
- **触发条件**：任务涉及 React 组件设计、useState/useReducer/Zustand/Context、SWR/React Query、memoization/code splitting、受控表单+Zod、客户端路由、a11y 模式。
- **处理流程 / 内容结构**：Component Patterns（Composition/Compound/Render Props）→ Custom Hooks → State Management（Context+Reducer）→ Performance（memo/useCallback/lazy/virtualization）→ Form Handling → Error Boundary → Animation（Framer Motion）→ Accessibility（键盘/焦点），每节配 TS 代码示例。
- **生成物 / 预期结果**：可直接套用的 TS 代码片段与模式选型建议。
- **边界 / 不适用**：仅 React/Next.js 生态；Vue → `vue-patterns`；Vite 构建配置 → `vite-patterns`；Next.js 打包细节 → `nextjs-turbopack`。
- **关联**：被 `vue-patterns` 引用为跨框架参考；项目 CLAUDE.md 中 `react-patterns`/`react-testing` 关联 `/react-review`、`/react-build`、`/react-test`。

#### vue-patterns
- **定位**：Vue 3 Composition API（`<script setup>`）全栈开发指南，含 Nuxt/Pinia/Vue Router/Vitest。
- **适用场景**：feature-first 项目结构；编写 SFC（props/emits/slots/composables）；封装 composable；Pinia setup store；Vue Router + 守卫；Vue Test Utils 组件测试；Nuxt useAsyncData/server routes；Vue 3.5+ 新 API。
- **触发条件**：项目用 Vue/Nuxt/Vite+Vue/Pinia；问 Vue 组件架构/composables/响应式/状态；review `.vue`；配置 Router/Pinia/Vitest；Vue 专属 SSR。
- **处理流程 / 内容结构**：10 章——项目结构 → 组件架构 → Composables → 状态管理（选用表）→ Vue Router → 模板语法 → 性能（`v-memo`/shallowRef/KeepAlive）→ 测试 → Nuxt 专属 → Vue 3.5+ 新 API；附反模式表（11 条，含 v-if+v-for、mutating props、Options API、mixin）。
- **生成物 / 预期结果**：命名/结构/组件写法/状态选型/测试模板的成套规范 + 反模式对照表。
- **边界 / 不适用**：仅 Vue 3+ Composition API（明确反 Options API/mixin）；构建工具配置 → `vite-patterns`；跨框架 a11y → `accessibility`；TS 通用规范 → `typescript`。
- **关联**：Related Skills 显式列出 `accessibility`、`frontend-patterns`、`typescript`、`coding-standards`。

#### vite-patterns
- **定位**：Vite 8+ 构建工具与开发服务器的配置、插件、env、代理、库模式、预打包与生产陷阱手册。
- **适用场景**：写/调 `vite.config.ts`；`.env` 与 `VITE_` 前缀；dev server proxy；优化构建产物（manualChunks/minify/sourcemap）；`build.lib` 发 npm 包；排查预打包/CJS-ESM/HMR/Docker/monorepo 问题；选型排序插件。
- **触发条件**：任务涉及 `vite.config.ts/.js`、Vite 插件、env 变量、proxy、`build.lib`、`optimizeDeps`、HMR API、`vite build`/`vite dev`/`vite preview` 行为。
- **处理流程 / 内容结构**：How-It-Works 前置（dev=原生 ESM 按需转译；build=Rolldown/Rollup+Oxc；预打包用 esbuild；env 构建期静态内联）→ Config 结构 → 插件表（含"`vite build` 不做类型检查"告警）→ 自定义插件 hooks → HMR → env 安全（`VITE_` 非安全边界、`loadEnv('')` 陷阱、sourcemap 泄漏）→ proxy → 构建优化 → 库模式两大陷阱 → SSR externals → 预打包 → 常见坑（dev≠build、Docker host、monorepo fs.allow）→ 反模式 → Quick Reference。
- **生成物 / 预期结果**：可落地的 `vite.config.ts` 片段、插件选型决策、env/proxy/库模式模板、避坑 checklist。
- **边界 / 不适用**：只覆盖 Vite；Next.js 打包 → `nextjs-turbopack`；React 组件模式 → `frontend-patterns`；容器化 → `docker-patterns`。强调 `vite preview` 不是生产服务器、`vite build` 不做类型检查。
- **关联**：Related Skills 列出 `frontend-patterns`、`docker-patterns`、`nextjs-turbopack`。

#### nextjs-turbopack
- **定位**：Next.js 16+ 与 Turbopack（Rust 增量打包器）的使用与选型指引，重点在 dev 默认走 Turbopack。
- **适用场景**：日常 `next dev`（默认 Turbopack）；诊断 dev 启动慢/HMR 慢；切回 webpack（`--webpack`/`--no-turbopack`）应对 bug 或 webpack-only 插件；实验性 Bundle Analyzer（16.1+）；Next.js 16 的 `proxy.ts` 中间件命名。
- **触发条件**：开发/调试 Next.js 16+、排查 dev 启动/HMR 性能、优化生产 bundle、遇到 `proxy.ts` vs `middleware.ts` 疑问。
- **处理流程 / 内容结构**：How It Works（Turbopack=增量打包+FS 缓存、16 起 dev 默认、缓存位于 `.next`、Bundle Analyzer 16.1+）→ 命令（`next dev/build/start`）→ 专门强调 `proxy.ts` 是 16+ 正确文件名（不要改回 `middleware.ts`，会让中间件失效）→ Best Practices。
- **生成物 / 预期结果**：判断该不该用 Turbopack、如何排查慢 dev、避免 `proxy.ts` 误报的决策与命令清单。
- **边界 / 不适用**：聚焦打包器与 dev 体验，不教 Next.js 应用层写法；生产构建是否走 Turbopack 因版本而异，让读者查官方文档；非 Next.js 项目不适用。
- **关联**：被 `vite-patterns` 引用为"alternative bundler"。

#### e2e-testing
- **定位**：基于 Playwright 的 E2E 测试成套模式（POM、配置、CI、产物、抗 flaky、Web3/金融场景）。
- **适用场景**：组织 `tests/e2e` 目录；用 Page Object Model 封装页面；写 Playwright 用例；配置 `playwright.config.ts`（多浏览器/移动端、retries、reporter、webServer）；隔离诊断 flaky；管理截图/trace/video 产物；接 GitHub Actions CI；测钱包/Web3 与金融关键链路。
- **触发条件**：任务涉及 Playwright、`*.spec.ts`、`playwright.config.ts`、Page Object、`data-testid`、CI 跑 E2E、flaky 治理、Web3/交易流程 E2E。
- **处理流程 / 内容结构**：目录结构 → POM 类 → 测试用例模板 → 完整 config（projects/webServer/reporter）→ Flaky 治理（`test.fixme`/`--repeat-each`/`--retries`、竞态/网络/动画三类修复）→ 产物管理 → CI/CD workflow YAML → 测试报告 markdown 模板 → Web3 钱包 mock → 金融/交易流（含生产环境 skip 守卫）。
- **生成物 / 预期结果**：可复用的 POM 类、config、CI workflow、报告模板与抗 flaky 写法，产出稳定 E2E 套件及失败时的 HTML/截图/视频/trace 产物。
- **边界 / 不适用**：只覆盖 Playwright；单元/组件测试不在范围（Vue 项目见 `vue-patterns` 的 Vitest 章节）；不涉及性能测试与视觉回归。
- **关联**：项目根 CLAUDE.md 列出 `/e2e` 命令与本 skill 主题直接对应。

### UI 设计与可访问性

#### design-system
- **定位**：生成、审计或"反 AI 套路"检查视觉设计系统，保障 UI 一致性。
- **适用场景**：①新项目建设计系统；②审计既有代码库视觉一致性（"UI 看着不对劲但说不出哪不对"）；③重设计前现状盘点；④审查改动样式的 PR；⑤识别 AI 生成的通用化套路（紫蓝渐变、无意义玻璃拟态）。
- **触发条件**：任务涉及 design system/视觉一致性/样式 PR review/"audit UI"/"AI slop 检查"。
- **处理流程 / 内容结构**：三种模式并行——Mode1 Generate（扫描 CSS/Tailwind/styled-components → 抽取 token → 浏览器 MCP 调研竞品 → 提议 design token → 生成 DESIGN.md 与自包含 HTML 预览）；Mode2 Visual Audit（10 维度 0–10 打分，每项给 file:line 修复点）；Mode3 AI Slop Detection（通用渐变/紫蓝默认色/无意义 glass morphism/过度动画）。
- **生成物 / 预期结果**：`DESIGN.md`+`design-tokens.json`+`design-preview.html`（生成）；维度评分报告含 file:line 修复建议（审计）。
- **边界 / 不适用**：纯无障碍合规 → `accessibility`；iOS 26 Liquid Glass 专属 → `liquid-glass-design`；单一图表/数据可视化 → `dataviz`。
- **关联**：被 `accessibility` 在 Related Skills 引用；audit 第 8 维涉及 a11y 但不深入 WCAG。

#### accessibility
- **定位**：基于 WCAG 2.2 Level AA，为 Web/iOS/Android 设计、实现并审计无障碍属性。
- **适用场景**：①定义 UI 组件规范（三端）；②审计无障碍缺陷与合规差距；③落地 WCAG 2.2 新标准（Target Size 2.5.8、Focus Appearance 2.4.11、Redundant Entry 3.3.7）；④把设计要求映射为 ARIA roles/iOS traits/Android semantics；⑤修复 div-button、color-only meaning、模态焦点未围合等反模式。
- **触发条件**：关键词：accessibility/a11y/ARIA/语义化/焦点管理/屏幕阅读器/对比度/键盘可达/WCAG/可访问性审计。
- **处理流程 / 内容结构**：5 步——Step1 识别组件角色（优先语义原生元素）→ Step2 Perceivable（对比度 4.5:1/3:1、文本替代、400% 缩放重排）→ Step3 Operable（24×24 CSS px 触达、键盘可达+可见焦点、单指针替代拖拽）→ Step4 Understandable（一致导航、错误纠正、冗余录入）→ Step5 Robust（Name/Role/Value、`aria-live`）；附 POUR 原则、跨平台映射表、checklist、反模式清单。
- **生成物 / 预期结果**：跨平台 ARIA/trait/semantics 映射方案；Web/iOS/Android 代码示例；a11y 合规 checklist 与反模式诊断。
- **边界 / 不适用**：整体设计 token/视觉一致性 → `design-system`；iOS 26 玻璃材质实现 → `liquid-glass-design`；本 skill 只覆盖无障碍维度。
- **关联**：Related Skills 显式列出 `frontend-patterns`、`design-system`、`liquid-glass-design`、`swiftui-patterns`；引用 WCAG 2.2、WAI-ARIA、Apple HIG、Android Accessibility 官方文档。

#### liquid-glass-design
- **定位**：iOS 26 Liquid Glass 设计系统的实现模式库（SwiftUI/UIKit/WidgetKit 三端）。
- **适用场景**：①为 iOS 26+ 应用构建/迁移到新设计语言；②实现玻璃风格按钮/卡片/工具栏/容器；③多玻璃元素间 morphing 过渡；④给 WidgetKit 控件应用 Liquid Glass 外观（accented/tinted）；⑤把旧版 blur/material 迁移到新 API。
- **触发条件**：关键词：Liquid Glass/iOS 26/`glassEffect`/`UIGlassEffect`/glass morphing/`buttonStyle(.glass)`/widget accented mode。
- **处理流程 / 内容结构**：SwiftUI（`.glassEffect()` → 形状/着色/交互 → `.glass`/`.glassProminent` 按钮 → `GlassEffectContainer` → `glassEffectUnion` → `@Namespace`+`glassEffectID` morphing）→ UIKit（`UIGlassEffect`+`UIVisualEffectView` → `UIGlassContainerEffect` → scroll edge effects）→ WidgetKit（`widgetRenderingMode` 检测 accented → `widgetAccentable()` → `widgetAccentedRenderingMode(.monochrome)`）→ Key Design Decisions + Best Practices + Anti-Patterns。
- **生成物 / 预期结果**：三端 Liquid Glass 代码片段与容器组织方案；morphing/union/edge effect 指引；性能与反模式注意。
- **边界 / 不适用**：仅 iOS 26+ Liquid Glass 材质；跨平台视觉一致性 → `design-system`；玻璃上文本对比度 → `accessibility`；非 Apple 平台不适用。提醒"不要对所有 view 都加 glass"。
- **关联**：被 `accessibility` 在 Related Skills 引用。

### Swift/iOS

#### swiftui-patterns
- **定位**：SwiftUI 现代架构模式参考库，覆盖状态管理、视图组合、类型安全导航与性能优化。
- **适用场景**：构建 SwiftUI 视图并管理状态（`@State`/`@Observable`/`@Binding`/`@Environment`）；`NavigationStack`+`NavigationPath` 可编程路由；拆分子视图限制重渲染、写可复用 `ViewModifier`；优化列表/复杂布局渲染性能；`#Preview` 配合 mock 迭代。
- **触发条件**：在 Apple 平台写 SwiftUI 视图/ViewModel/导航流/性能调优；关键词：SwiftUI、`@Observable`、NavigationStack、View 组合、重渲染/性能、`@Environment`、`#Preview`。
- **处理流程 / 内容结构**：属性包装选择表 → `@Observable` ViewModel+视图消费+Environment 注入 → 子视图拆分+`ViewModifier` → 类型安全 NavigationStack 路由 → 性能（Lazy 容器、稳定 ID、避免 body 重活、`Equatable`）→ `#Preview`，末尾反模式清单。
- **生成物 / 预期结果**：可套用的 SwiftUI 代码片段与决策依据（用哪个包装器、何时拆视图、如何规避 `AnyView`/`ObservableObject`）。
- **边界 / 不适用**：纯数据持久化/线程安全 → `swift-actor-persistence`；可测试性/DI/单元测试 → `swift-protocol-di-testing`；UIKit/AppKit 非 SwiftUI 不在此。
- **关联**：文末显式引用 `swift-actor-persistence`、`swift-protocol-di-testing`。

#### swift-actor-persistence
- **定位**：用 Swift actor 构建线程安全本地持久化层（内存缓存 + 文件落盘，编译期消除数据竞争）。
- **适用场景**：iOS/macOS 本地数据存储；离线优先稍后同步；多处并发访问的共享可变状态（替代 `DispatchQueue`/`NSLock`）；用 `@Observable` ViewModel 驱动 UI 反应式更新。
- **触发条件**：Swift 5.5+ 项目要"线程安全的持久化/存储/缓存"、消除数据竞争、actor 仓储；关键词：actor、线程安全、persistence、cache、`Sendable`、离线优先。
- **处理流程 / 内容结构**：动机 → `LocalRepository<T: Codable & Identifiable>` actor 完整实现（同步 init 加载、save/delete/find/loadAll、原子写盘）→ 调用示例（全 `await`）→ 与 `@Observable` ViewModel 组合 → 关键设计决策表（actor vs class+lock、内存+文件、原子写、泛型约束）→ 最佳实践与反模式 → 适用场景。
- **生成物 / 预期结果**：可复用的泛型 actor 仓储模板，附设计依据与常见坑。
- **边界 / 不适用**：仅内存/无持久化不必引入文件落盘；UI 状态 → `swiftui-patterns`；外部依赖可测化 → `swift-protocol-di-testing`；复杂查询/迁移建议 CoreData/SwiftData。
- **关联**：无显式引用；与 `swiftui-patterns`（`@Observable` ViewModel 消费）天然配套。

#### swift-protocol-di-testing
- **定位**：Swift 基于协议的依赖注入，把文件系统/网络/外部 API 抽象为小协议，配合 Swift Testing 做无 I/O 确定性测试。
- **适用场景**：写访问文件系统/网络/iCloud 的 Swift 代码；需测试错误处理分支；同一模块要在 app/test/preview 三环境运行；Swift 并发下设计可测试架构。
- **触发条件**：任务涉及"让 Swift 代码可测""mock 文件/网络""依赖注入""Swift Testing"；关键词：protocol、DI、mock、`FileSystemProviding`、`Sendable`、`@Test`、`#expect`。
- **处理流程 / 内容结构**：流程型五步——(1) 定义单一职责小协议（均 `Sendable`）→ (2) 默认生产实现 → (3) 可配置错误的 Mock → (4) 默认参数注入（生产默认/测试注入 mock）→ (5) Swift Testing（`@Test`/`#expect`/`throws:`）写用例；附最佳实践与反模式。
- **生成物 / 预期结果**：一套"协议+默认实现+Mock+默认参数注入+Swift Testing 用例"骨架，使外部 I/O 可替换、错误路径可精确模拟。
- **边界 / 不适用**：类型本身无外部依赖不要过度设计；不要 mock 内部类型；不要用 `#if DEBUG` 替代 DI；UI 视图层 → `swiftui-patterns`，持久化并发 → `swift-actor-persistence`。
- **关联**：无显式引用；其 actor+`Sendable` 抽象可与 `swift-actor-persistence` 叠加。

### 数据存储

#### postgres-patterns
- **定位**：PostgreSQL 查询优化、schema 设计、索引、安全最佳实践的快速参考速查表。
- **适用场景**：①编写 SQL/migration 时选索引类型与数据类型；②设计 schema（ID/字符串/时间戳/金额字段选型）；③排查慢查询、未索引外键、表膨胀；④实现 RLS、UPSERT、游标分页、队列处理；⑤配置连接数、超时、监控扩展、public schema 权限。
- **触发条件**：任务涉及 PostgreSQL（编写/优化 SQL、设计 schema、排查慢查询、连接池/RLS）；关键词：PostgreSQL/PG、索引、B-tree/GIN/BRIN、`pg_stat_statements`、连接池。
- **处理流程 / 内容结构**：索引类型对照表 → 数据类型对照表 → 常见 SQL 模式（复合索引顺序、覆盖索引、部分索引、RLS、UPSERT、游标分页、`FOR UPDATE SKIP LOCKED` 队列）→ 反模式检测查询 → 配置模板。
- **生成物 / 预期结果**：可复用的 SQL 片段、索引/数据类型选型、性能诊断查询、配置参数模板。
- **边界 / 不适用**：仅快速参考，完整数据库审查 → `database-reviewer` agent；ClickHouse 分析 → `clickhouse-io`；后端/API 模式 → `backend-patterns`。
- **关联**：引用 agent `database-reviewer`；引用 skill `clickhouse-io`、`backend-patterns`。

#### clickhouse-io
- **定位**：面向高性能 OLAP/分析工作负载的 ClickHouse 表设计、查询优化与数据工程最佳实践。
- **适用场景**：①设计 ClickHouse 表 schema（MergeTree/ReplacingMergeTree/AggregatingMergeTree）；②写分析查询（聚合、窗口、quantile、留存/漏斗/同期群）；③优化性能（分区裁剪、排序键、物化视图、projections）；④批量/流式摄取，或从 PG/MySQL 迁移；⑤实时仪表板、时序分析、CDC 同步、ETL。
- **触发条件**：技术栈出现 ClickHouse（`@clickhouse/client`、`system.query_log`、MergeTree）；任务涉及"OLAP/列存/分析查询/物化视图/批量插入/时序分析/留存漏斗同期群"。
- **处理流程 / 内容结构**：表设计（三种 MergeTree 引擎对比）→ 查询优化（过滤顺序/聚合/窗口）→ 数据插入（TS 批量与流式）→ 物化视图（实时聚合 state/merge 函数）→ 性能监控（system 表）→ 常用分析模板（DAU/留存/漏斗/同期群）→ 数据管道（ETL、PostgreSQL CDC）→ 最佳实践清单。
- **生成物 / 预期结果**：建表 DDL、分析 SQL 模板、TS 摄取代码、system 表诊断查询、设计决策建议（引擎选择、排序键顺序、分区策略）。
- **边界 / 不适用**：仅 ClickHouse；PostgreSQL OLTP → `postgres-patterns`；schema 变更流程 → `database-migrations`。
- **关联**：无显式引用。

#### database-migrations
- **定位**：为生产系统提供安全、可逆、零停机的数据库 schema 变更最佳实践，覆盖 PostgreSQL 与主流 ORM/工具。
- **适用场景**：①创建/修改表，加/删列或索引；②运行 data migration（backfill、字段变换）；③规划零停机 schema 变更（expand-contract）；④为 Prisma/Drizzle/Kysely/Django/TypeORM/golang-migrate 设置工具；⑤处理大表锁、并发索引、NOT NULL 约束等高风险操作。
- **触发条件**：任务涉及 schema 变更、ORM（Prisma/Drizzle/Kysely/Django/TypeORM/golang-migrate）；关键词"migration/schema change/data backfill/zero-downtime/expand-contract/rollback/CONCURRENTLY"。
- **处理流程 / 内容结构**：流程+知识混合——核心五原则 → 应用前安全检查清单 → PostgreSQL 安全模式（加列、并发索引、重命名 expand-contract、删列、批量 backfill）→ 六大 ORM/工具工作流与代码示例 → 零停机三阶段策略与时间线 → 反模式对照表。
- **生成物 / 预期结果**：符合安全规范的 migration 文件（UP/DOWN）、批量 backfill 脚本、零停机变更时间线、ORM 命令序列、反模式修正建议。
- **边界 / 不适用**：仅管 schema 变更流程，不管查询优化（→ `postgres-patterns`/`clickhouse-io`）；ClickHouse 表设计 → `clickhouse-io`；完整审查 → `database-reviewer` agent。
- **关联**：覆盖 Prisma、Drizzle、Kysely、Django（含 SeparateDatabaseAndState）、golang-migrate、TypeORM。

### DevOps + ML

#### docker-patterns
- **定位**：Docker/Docker Compose 本地开发、容器安全、网络与卷策略、多服务编排的实战模式手册。
- **适用场景**：①用 Compose 搭本地全栈开发环境（app+db+redis+邮件测试）；②设计多阶段 Dockerfile（dev/build/prod）；③排查容器网络连通、DNS、卷挂载覆盖；④review Dockerfile/compose 的安全性与镜像体积；⑤从裸机迁移到容器化。
- **触发条件**：任务涉及 `docker-compose.yml`/`Dockerfile`、"容器化""本地开发环境""multi-stage build""容器网络/卷/安全""docker compose up"。
- **处理流程 / 内容结构**：Compose for Local Dev（标准栈、dev/prod 多阶段、override/prod 分文件）→ Networking（服务名 DNS、自定义网络、端口最小暴露）→ Volume Strategies（named/bind/anonymous）→ Container Security（固定 tag、非 root、只读 FS、`cap_drop`、`no-new-privileges`、密钥管理）→ `.dockerignore` → Debugging 命令 → Anti-Patterns（生产无编排、容器存数据、root 运行、`:latest`、密钥入库）。
- **生成物 / 预期结果**：可套用的 compose/Dockerfile 骨架、override/prod 分层、安全加固清单、`.dockerignore` 模板、排障命令。
- **边界 / 不适用**：生产级多容器编排 → Kubernetes/ECS/Swarm；CI/CD 流水线与镜像构建外的合规审计不覆盖。
- **关联**：无显式引用。

#### pytorch-patterns
- **定位**：PyTorch 深度学习惯用模式与最佳实践，面向稳健、高效、可复现的训练管线、模型架构与数据加载。
- **适用场景**：①从零写 PyTorch 模型/训练脚本；②审查 DL 代码质量；③调试训练/验证循环或数据管道 bug；④调优 GPU 显存与训练速度（AMP、gradient checkpointing、`torch.compile`）；⑤搭建可复现实验（seed、checkpoint 完整保存/恢复）。
- **触发条件**：任务提到 PyTorch、training loop、`nn.Module`、DataLoader、GPU/显存、混合精度/AMP、checkpoint、`torch.compile`，或代码评审涉及 `model.eval()` 误用、in-place 破坏 autograd、`.item()` 时序错误等陷阱。
- **处理流程 / 内容结构**：Core Principles（设备无关、Reproducibility 全种子、显式张量形状）→ Model Architecture（干净 nn.Module、显式初始化）→ Training Loop（AMP+GradScaler+grad clip 的 `train_one_epoch`；`@torch.no_grad()`+`model.eval()` 的 evaluate）→ Data Pipeline（自定义 Dataset、DataLoader 的 `num_workers`/`pin_memory`/`persistent_workers`/`drop_last`、自定义 `collate_fn`）→ Checkpointing（完整保存、`weights_only=True` 安全加载）→ Performance（混合精度/gradient checkpointing/`torch.compile` 三档）→ Quick Reference + Anti-Patterns。
- **生成物 / 预期结果**：可复制的训练/评估循环模板、Dataset/DataLoader 样板、checkpoint 存取函数、性能优化片段、反模式自检清单。
- **边界 / 不适用**：不覆盖分布式训练（DDP/FSDP/多机）、模型部署推理（ONNX/TorchServe）、超参搜索（Ray/Hydra）、其他框架（TF/JAX）。
- **关联**：建议用 `torch.profiler` 与 `torch.cuda.memory_summary()` 进一步分析。

### 安全

#### security-review
- **定位**：应用代码层面的安全编码检查清单与正反模式参考，供编码/审查时按章节对照核验。
- **适用场景**：实现认证/授权；处理用户输入或文件上传；创建新 API 端点；操作密钥或凭据；实现支付/区块链交易；存储/传输敏感数据；集成第三方 API。
- **触发条件**：description 关键任务（添加认证、处理用户输入、操作密钥、创建 API 端点、实现支付/敏感功能）出现时自动激活。
- **处理流程 / 内容结构**：知识型检查清单，主 SKILL.md 覆盖 10 主题——密钥管理、输入校验、SQL 注入、认证与授权、XSS、CSRF、限流、敏感数据泄露、区块链安全、依赖安全；含自动化安全测试样例与部署前 17 项清单。`cloud-infrastructure-security.md` 额外覆盖：IAM 最小权限与 MFA、云 Secrets 管理器与轮换、VPC/安全组/网络 ACL、CloudWatch 日志监控、CI/CD 流水线安全（OIDC、TruffleHog、依赖审计、签名 commit、分支保护）、Cloudflare/CDN 与 WAF（OWASP 规则集、DDoS）、备份与灾难恢复（PITR、RPO/RTO），以及常见错误配置（S3 公开、RDS publicly_accessible）。
- **生成物 / 预期结果**：FAIL/PASS 修正实现；勾选各章节"验证步骤"与部署前清单的合规确认；按需补充的安全测试用例。
- **边界 / 不适用**：仅应用代码与云配置的安全编码指引，不做工具化扫描。审计 Claude Code 自身配置 → `security-scan`；非安全类代码质量评审 → `code-review` 类 skill/agent。
- **关联**：与 `security-scan` 同属安全主题但分工不同（代码 vs 配置）。

#### security-scan
- **定位**：调用 AgentShield 工具对 Claude Code 自身配置目录（`.claude/`）做漏洞扫描与评级审计。
- **适用场景**：搭建新 Claude Code 项目时；修改 settings.json/CLAUDE.md/MCP 配置后；提交配置变更前；迁移配置到新仓库时；定期安全健康检查。
- **触发条件**：用户提到"扫描 .claude 配置""审计 Claude Code 安全""检查 settings/MCP/hooks 漏洞""agentshield""配置注入风险"。
- **处理流程 / 内容结构**：流程型工具操作指南。前置检查/安装 `ecc-agentshield`。扫描范围 5 类文件——CLAUDE.md（硬编码 secret、自动运行指令、prompt injection）、settings.json（宽松 allowlist、缺失 deny、危险 bypass）、mcp.json（风险 MCP server、npx 供应链）、hooks/（命令注入、数据外泄、静默错误抑制）、agents/*.md（无限制工具访问、缺失 model）。命令族：`scan`（`--path`/`--min-severity`/`--format` 终端/JSON/Markdown/HTML）、`scan --fix`（仅 auto-fixable）、`scan --opus --stream`（红队/蓝队/审计员三智能体对抗式深度分析，需 ANTHROPIC_API_KEY）、`init`（生成安全基线）、GitHub Action CI。Severity A-F 评级。
- **生成物 / 预期结果**：带评级的彩色终端报告（或 JSON/Markdown/HTML）；`--fix` 改写；安全配置骨架；CI 中阻断不安全配置的 GitHub Action。
- **边界 / 不适用**：只审 `.claude` 配置目录，不审业务应用代码。应用代码安全 → `security-review`；依赖外部工具 `ecc-agentshield`，未安装无法执行实际扫描。
- **关联**：外部依赖 AgentShield；无对其他 skill/command/agent 的显式引用。

### 元系统（学习闭环）

#### continuous-learning-v2
- **定位**：基于 instinct（本能）的会话学习系统——通过 hooks 观察会话，提炼带置信度的原子 instinct，并演化为 skill/command/agent。v2.1 增加项目作用域 instinct 防跨项目污染。
- **适用场景**：①想让 Claude Code 自动从会话学习可复用模式；②管理 project/global 作用域 instinct 库；③把高频 instinct 聚类升维为 skill/command/agent；④团队间导出/导入 instinct；⑤把 project 模式提升为 global。
- **触发条件**：通过 hooks（`observe.sh` 注册在 PreToolUse/PostToolUse）**被动观察**会话；用户用 `/instinct-status` `/evolve` `/promote` `/projects` `/instinct-export` `/instinct-import` 等命令主动查询/管理时激活。
- **处理流程 / 内容结构**：Session 活动 → hooks 捕获 prompts+tool use + 检测项目上下文（git remote/path）→ `observations.jsonl` → observer agent（Haiku，后台）检测 4 类模式（用户纠正/错误解决/重复 workflow/工具偏好）→ 创建/更新 instinct（yaml，带置信度，project 或 global）→ `/evolve` 聚类 + `/promote` 提升 → `evolved/`（skills/commands/agents）。
- **生成物 / 预期结果**：instinct yaml（trigger/action/evidence/confidence/scope）；evolved 出的 skill/command/agent 候选；项目注册表 `projects.json`。
- **边界 / 不适用**：默认 observer **关闭**（需手动启用才有自动学习）；只导出 instinct 模式，不含原始 observations/代码；instinct 是建议非强制（低置信度只建议）；非即时代码生成工具。
- **关联**：本 skill 自带命令 `/instinct-status` `/instinct-export` `/instinct-import` `/evolve` `/promote` `/projects`；ECC 顶层 `/learn` `/learn-eval` `/skill-create` `/skill-health`（学习闭环）；`instinct-cli.py` 提供 `status`/`import`/`export`/`evolve`/`promote`/`projects`(含 delete/merge/gc)/`prune` 子命令。

---

## 五、Skill 间的关联与组合

### 5.1 orch-* 委托关系（端到端编排的核心）

```
用户请求
   │
   ▼
[操作 skill 分类]  add / change / fix / refine / build-mvp
   │
   ▼  (统一委托)
[orch-pipeline 共享引擎]
   │
   ├─ Step0 size classifier ──→ trivial / small / standard / large（取最高，security/API 强制≥standard）
   │
   ├─ Phase 0 Intake   ──→ code-explorer
   ├─ Phase 1 Research ──→ gh search → Context7 → registry → Exa
   ├─ Phase 2 Plan     ──→ planner (结构性决策升级 architect/code-architect)  ──【GATE 1：用户批准才写代码】
   ├─ Phase 3 Scaffold ──→ 仅 orch-build-mvp（/gan-build --skip-planner）
   ├─ Phase 4 Implement──→ tdd-guide / tdd-workflow（red→green→refactor）  构建中断→build-error-resolver/​/build-fix
   ├─ Phase 5 Review   ──→ code-reviewer / /code-review  触 security trigger→security-reviewer
   └─ Phase 6 Commit   ──→ conventional commits  ──【GATE 2：用户确认才 commit】
```

**两道 gate 的意义**：GATE 1 防止没对齐方向就写代码；GATE 2 把关最终落盘（含 CRITICAL/HIGH 是否已解决）。两道 gate 之间不停顿流转。

**size classifier 四档**：

| 等级 | 触及文件 | 新依赖/契约 | 设计模糊度 |
|---|---|---|---|
| trivial | 1 个，几行 | 无 | 改动显而易见 |
| small | 1 文件/1 函数 | 无 | 读代码即清晰 |
| standard | 2–5 文件 | 可能新内部 module | 需做真实抉择 |
| large | 多个/横切 | 新 external dep、public API、spec | 多个未决问题 |

### 5.2 编码规范分层

```
coding-standards（跨项目基座：命名/可读性/不可变性/质量）
        │
        ├── frontend-patterns     （React/Next.js 专项）
        ├── backend-patterns      （Node/Express/Next API 专项）
        ├── api-design            （REST 契约专项）
        └── 各框架 *-patterns     （vue/swiftui/python/fastapi/django…）
```

越靠近根越通用；越靠近叶越框架专属。**基座层不该被框架专项覆盖，框架专项也不该重复基座**。

### 5.3 测试链

```
tdd-workflow（通用 TDD 流程，含 plan handoff 安全节 + 80% coverage gate）
   ▲
   │ 被 orch-* 族 Phase 4、/tdd 命令引用
   │
   ├── python-testing   （Python pytest 专项）
   ├── e2e-testing      （Playwright E2E 专项）
   └── vue-patterns     （Vitest 组件测试章节）
```

### 5.4 安全双轨

| 维度 | security-review | security-scan |
|---|---|---|
| 对象 | **应用代码**（认证/注入/XSS/密钥/云配置） | **Claude Code `.claude/` 配置**（settings/MCP/hooks/agents） |
| 形式 | 编码检查清单 + FAIL/PASS 对照 | AgentShield 工具扫描 + A-F 评级 |
| 触发 | 写认证/支付/用户输入/API 端点时 | 改 .claude 配置后、提交前 |

二者**对象不重叠**，常需同时用：代码过 `security-review`，配置过 `security-scan`。

### 5.5 学习闭环（instinct → skill）

```
continuous-learning-v2（自动、持续）
   observe.sh 被动捕获会话 → observer 检测模式 → instinct(yaml, 带置信度)
        │                                              │ scope: project(默认) | global
        │                                              ▼
        │                                  /promote（project→global，≥2 项目且≥0.8）
        │                                              │
        └──────────────► /evolve（聚类升维）──────────► evolved/(skills/commands/agents)
                                                        │
        /learn（手动、单次 session 提取）                 │
        /skill-create（从 git 历史固化 SKILL.md）◄────────┘
```

**作用域决策**：语言/框架约定、文件结构、代码风格、错误处理 → **project**；安全、通用最佳实践、工具工作流、git 实践 → **global**。数据存 `~/.claude` 之外的 `${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/`（避免 Claude Code 敏感路径防护）。**observer 默认关闭**，需在 `config.json` 设 `observer.enabled: true` 才有后台自动分析。

**置信度演化**：0.3 试探 / 0.5 中等 / 0.7 强（自动批准）/ 0.9 近确定；初始按观察频次（1-2→0.3, 3-5→0.5, 6-10→0.7, 11+→0.85）；每次确认 +0.05、矛盾 -0.1、每周无观察 -0.02 衰减。

---

## 六、使用注意事项

1. **Skill 是被动触发的**——靠 `description` 匹配。任务描述带上明确技术栈/关键词能提高命中率；没自动激活就显式点名。
2. **skill 名即目录名**。安装后扁平放在 `~/.claude/skills/<name>/`，Claude Code 只发现 `skills/` 直接子目录（不会递归识别嵌套子目录）。
3. **与命令版配合**：本文（skill）讲「Claude 自动用哪个知识包」，《[command-helper.md](command-helper.md)》（command）讲「你该敲哪条 `/命令`」。两者正交，配合阅读。
4. **`metadata.origin: ECC`** 标记 skill 源自 ECC 项目，便于追溯与升级。
5. **部分 skill 引用的对象需另行就位**：
   - `orch-*` 委托的 agent（`planner`/`code-reviewer`/`tdd-guide`/`security-reviewer`/`refactor-cleaner`/`code-explorer`/`build-error-resolver`）和命令（`/plan` `/code-review` `/build-fix` `/gan-build`）需对应 agents/commands 已安装。
   - `security-scan` 依赖外部工具 `ecc-agentshield`，未安装无法实际扫描。
   - `continuous-learning-v2` 的 observer 默认关闭，需手动启用。
6. **边界意识**：每个 skill 的「Scope Boundaries」都明确写了不适用情形与让位对象。遇到模糊场景先看边界，避免误用（如把 `security-scan` 当成代码安全审查）。
7. **两道 gate 不可绕过**：`orch-*` 族是 gated、非自主的——GATE 1 不批不写代码，GATE 2 不确认不 commit。这是刻意设计的安全阀。

---

## 姊妹文档（aimeta3s 资料导航）

| 文档 | 主题 |
|---|---|
| `command-helper.md` | 命令总览、9 条流水线、选型决策树 |
| `skill-helper.md` | Skill 触发机制、相似抉择、34 张详解卡 |
| `agent-helper.md` | Agent 分工、协作关系、spawn 入口 |
| `rules-helper.md` | Rule 三种激活机制、跨语言矩阵、master checklist |
| `hooks-helper.md` | Hook 阻塞语义三态、profile 矩阵、数据流 |

> 这 5 份文档随 `docs/` 安装到 `~/.claude/aimeta3s/docs/`，供 `/aimeta3s-help` 命令按需读取；资源名→路径的精确映射见同目录 `manifest.json`。
