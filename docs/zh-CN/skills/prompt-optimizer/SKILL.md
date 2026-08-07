---
name: prompt-optimizer
description: >-
  分析原始 prompt，识别意图与缺口，匹配 ECC 组件
  (skills/commands/agents/hooks)，并输出可直接粘贴的优化后
  prompt。仅作顾问角色——绝不自行执行任务。
  TRIGGER when：用户说 "optimize prompt"、"improve my prompt"、
  "how to write a prompt for"、"help me prompt"、"rewrite this prompt"，
  或明确要求提升 prompt 质量。亦在以下中文等效说法下触发：
  "优化prompt"、"改进prompt"、"怎么写prompt"、"帮我优化这个指令"。
  DO NOT TRIGGER when：用户希望直接执行任务，或说
  "just do it" / "直接做"。DO NOT TRIGGER when 用户说 "优化代码"、
  "优化性能"、"optimize performance"、"optimize this code"——这些是
  重构/性能任务，而非 prompt 优化。
metadata:
  origin: community
  author: YannJY02
  version: "1.0.0"
---

# Prompt Optimizer

分析 draft prompt，对其评审，匹配到 ECC 生态组件，
并输出一个用户可直接粘贴运行的完整优化后 prompt。

## 何时使用

- 用户说 "optimize this prompt"、"improve my prompt"、"rewrite this prompt"
- 用户说 "help me write a better prompt for..."
- 用户说 "what's the best way to ask Claude Code to..."
- 用户说 "优化prompt"、"改进prompt"、"怎么写prompt"、"帮我优化这个指令"
- 用户粘贴一个 draft prompt 并要求反馈或增强
- 用户说 "I don't know how to prompt for this"
- 用户说 "how should I use ECC for..."
- 用户显式调用 `/prompt-optimize`

### 何时不使用

- 用户希望直接完成任务（仅执行）
- 用户说 "优化代码"、"优化性能"、"optimize this code"、"optimize performance"——这些是重构任务，而非 prompt 优化
- 用户询问 ECC 配置（改用 `configure-ecc`）
- 用户希望获取 skill 清单（改用 `skill-stocktake`）
- 用户说 "just do it" 或 "直接做"

## 工作原理

**仅作顾问——不要执行用户的任务。**

不要编写代码、创建文件、运行命令或采取任何实现动作。你唯一的输出是一份分析加上一个优化后的 prompt。

如果用户说 "just do it"、"直接做" 或 "don't optimize, just execute"，不要在此 skill 中切换到实现模式。告知用户此 skill 仅产出优化后的 prompt，并指示他们若希望执行任务则发起一个常规任务请求。

按顺序运行此 6 阶段 pipeline。使用下方的 Output Format 呈现结果。

### 分析 Pipeline

### Phase 0：项目检测

在分析 prompt 之前，检测当前项目上下文：

1. 检查工作目录中是否存在 `CLAUDE.md`——阅读它以了解项目约定
2. 从项目文件中检测 tech stack：
   - `package.json` → Node.js / TypeScript / React / Next.js
   - `go.mod` → Go
   - `pyproject.toml` / `requirements.txt` → Python
   - `Cargo.toml` → Rust
   - `build.gradle` / `pom.xml` → Java / Kotlin（然后在 build 文件中检查 `quarkus` → Quarkus，或 `spring-boot` → Spring Boot）
   - `Package.swift` → Swift
   - `Gemfile` → Ruby
   - `composer.json` → PHP
   - `*.csproj` / `*.sln` → .NET
   - `Makefile` / `CMakeLists.txt` → C / C++
   - `cpanfile` / `Makefile.PL` → Perl
3. 记录检测到的 tech stack，供 Phase 3 和 Phase 4 使用

如果未找到项目文件（例如 prompt 比较抽象或针对新项目），跳过检测并在 Phase 4 中标记为 "tech stack unknown"。

### Phase 1：意图检测

将用户的任务分类为一个或多个类别：

| 类别 | 信号词 | 示例 |
|----------|-------------|---------|
| New Feature | build, create, add, implement, 创建, 实现, 添加 | "Build a login page" |
| Bug Fix | fix, broken, not working, error, 修复, 报错 | "Fix the auth flow" |
| Refactor | refactor, clean up, restructure, 重构, 整理 | "Refactor the API layer" |
| Research | how to, what is, explore, investigate, 怎么, 如何 | "How to add SSO" |
| Testing | test, coverage, verify, 测试, 覆盖率 | "Add tests for the cart" |
| Review | review, audit, check, 审查, 检查 | "Review my PR" |
| Documentation | document, update docs, 文档 | "Update the API docs" |
| Infrastructure | deploy, CI, docker, database, 部署, 数据库 | "Set up CI/CD pipeline" |
| Design | design, architecture, plan, 设计, 架构 | "Design the data model" |

### Phase 2：范围评估

如果 Phase 0 检测到项目，则以 codebase 大小作为信号。否则，仅根据 prompt 描述进行估算，并标记估算为不确定。

| Scope | Heuristic | Orchestration |
|-------|-----------|---------------|
| TRIVIAL | 单文件，< 50 行 | 直接执行 |
| LOW | 单个 component 或 module | 单个 command 或 skill |
| MEDIUM | 多个 component，同一 domain | Command chain + /verify |
| HIGH | 跨 domain，5+ 文件 | 先 /plan，再分阶段执行 |
| EPIC | 多 session、多 PR、架构性变革 | 使用 blueprint skill 制定多 session 计划 |

### Phase 3：ECC 组件匹配

将 intent + scope + tech stack（来自 Phase 0）映射到具体的 ECC 组件。

#### 按 Intent 类型

| Intent | Commands | Skills | Agents |
|--------|----------|--------|--------|
| New Feature | /plan, /tdd, /code-review, /verify | tdd-workflow, verification-loop | planner, tdd-guide, code-reviewer |
| Bug Fix | /tdd, /build-fix, /verify | tdd-workflow | tdd-guide, build-error-resolver |
| Refactor | /refactor-clean, /code-review, /verify | verification-loop | refactor-cleaner, code-reviewer |
| Research | /plan | search-first, iterative-retrieval | — |
| Testing | /tdd, /e2e, /test-coverage | tdd-workflow, e2e-testing | tdd-guide, e2e-runner |
| Review | /code-review | security-review | code-reviewer, security-reviewer |
| Documentation | /update-docs, /update-codemaps | — | doc-updater |
| Infrastructure | /plan, /verify | docker-patterns, deployment-patterns, database-migrations | architect |
| Design (MEDIUM-HIGH) | /plan | — | planner, architect |
| Design (EPIC) | — | blueprint（作为 skill 调用） | planner, architect |

#### 按 Tech Stack

| Tech Stack | 待添加的 Skills | Agent |
|------------|--------------|-------|
| Python / Django | django-patterns, django-tdd, django-security, django-verification, python-patterns, python-testing | python-reviewer |
| Go | golang-patterns, golang-testing | go-reviewer, go-build-resolver |
| Spring Boot / Java | springboot-patterns, springboot-tdd, springboot-security, springboot-verification, java-coding-standards, jpa-patterns | java-reviewer |
| Quarkus / Java | quarkus-patterns, quarkus-tdd, quarkus-security, quarkus-verification, java-coding-standards, jpa-patterns | java-reviewer |
| Kotlin / Android | kotlin-coroutines-flows, compose-multiplatform-patterns, android-clean-architecture | kotlin-reviewer |
| TypeScript / React | frontend-patterns, backend-patterns, coding-standards | code-reviewer |
| Swift / iOS | swiftui-patterns, swift-concurrency-6-2, swift-actor-persistence, swift-protocol-di-testing | code-reviewer |
| PostgreSQL | postgres-patterns, database-migrations | database-reviewer |
| Perl | perl-patterns, perl-testing, perl-security | code-reviewer |
| C++ | cpp-coding-standards, cpp-testing | code-reviewer |
| Other / Unlisted | coding-standards（通用） | code-reviewer |

### Phase 4：缺失上下文检测

扫描 prompt 以检查缺失的关键信息。逐项检查并标记是 Phase 0 自动检测到的，还是用户必须提供的：

- [ ] **Tech stack**——在 Phase 0 中检测到，还是必须由用户指定？
- [ ] **Target scope**——是否提到了文件、目录或 module？
- [ ] **验收标准**——如何判断任务完成？
- [ ] **错误处理**——是否处理了 edge case 和 failure mode？
- [ ] **安全要求**——Auth、input validation、secrets？
- [ ] **测试期望**——unit、integration、E2E？
- [ ] **性能约束**——负载、延迟、资源限制？
- [ ] **UI/UX 需求**——设计规范、响应式、a11y？（若为前端）
- [ ] **数据库变更**——schema、migration、索引？（若为数据层）
- [ ] **现有 patterns**——需遵循的参考文件或约定？
- [ ] **Scope 边界**——不要做什么？

**如果缺失 3+ 个关键项**，在生成优化后的 prompt 之前向用户提出最多 3 个澄清问题。然后将答案整合进优化后的 prompt。

### Phase 5：Workflow 与 Model 建议

确定此 prompt 在开发生命周期中所处的位置：

```
Research → Plan → Implement (TDD) → Review → Verify → Commit
```

对于 MEDIUM 及以上的任务，始终以 /plan 开始。对于 EPIC 任务，使用 blueprint skill。

**Model 建议**（包含在输出中）：

| Scope | 推荐的 Model | 理由 |
|-------|------------------|-----------|
| TRIVIAL-LOW | Sonnet 4.6 | 快速，对简单任务成本高效 |
| MEDIUM | Sonnet 4.6 | 面向标准工作的最佳编码 model |
| HIGH | Sonnet 4.6（主）+ Opus 4.6（规划） | Opus 负责架构，Sonnet 负责实现 |
| EPIC | Opus 4.6（blueprint）+ Sonnet 4.6（执行） | 为多 session 规划提供深度推理 |

**多 prompt 拆分**（适用于 HIGH/EPIC scope）：

对于超出单个 session 的任务，拆分为顺序的多个 prompt：
- Prompt 1：Research + Plan（使用 search-first skill，然后 /plan）
- Prompt 2-N：每个 prompt 实现一个阶段（每个以 /verify 结束）
- 最终 Prompt：跨所有阶段的 integration test + /code-review
- 使用 /save-session 和 /resume-session 在 session 之间保留 context

---

## Output Format

按此精确结构呈现你的分析。以与用户输入相同的语言回应。

### Section 1：Prompt 诊断

**优势：**列出原始 prompt 做得好的地方。

**问题：**

| Issue | 影响 | 建议的修复 |
|-------|--------|---------------|
| （问题） | （后果） | （如何修复） |

**需要澄清：**编号列出用户应回答的问题。如果 Phase 0 已自动检测到答案，则直接说明而非提问。

### Section 2：推荐的 ECC 组件

| Type | Component | 用途 |
|------|-----------|---------|
| Command | /plan | 编码前规划架构 |
| Skill | tdd-workflow | TDD 方法论指导 |
| Agent | code-reviewer | 实现后审查 |
| Model | Sonnet 4.6 | 推荐用于此 scope |

### Section 3：优化后的 Prompt——完整版

在单个 fenced code block 中呈现完整的优化后 prompt。该 prompt 必须自包含且可即拷即用。包括：
- 清晰的任务描述及上下文
- Tech stack（检测到的或指定的）
- 在正确 workflow 阶段调用 /command
- 验收标准
- 验证步骤
- Scope 边界（不要做什么）

对于引用 blueprint 的条目，写为："Use the blueprint skill to..."（不要写 `/blueprint`，因为 blueprint 是一个 skill，而非 command）。

### Section 4：优化后的 Prompt——速查版

面向有经验 ECC 用户的精简版本。按 intent 类型变化：

| Intent | Quick Pattern |
|--------|--------------|
| New Feature | `/plan [feature]. /tdd to implement. /code-review. /verify.` |
| Bug Fix | `/tdd — write failing test for [bug]. Fix to green. /verify.` |
| Refactor | `/refactor-clean [scope]. /code-review. /verify.` |
| Research | `Use search-first skill for [topic]. /plan based on findings.` |
| Testing | `/tdd [module]. /e2e for critical flows. /test-coverage.` |
| Review | `/code-review. Then use security-reviewer agent.` |
| Docs | `/update-docs. /update-codemaps.` |
| EPIC | `Use blueprint skill for "[objective]". Execute phases with /verify gates.` |

### Section 5：增强理由

| Enhancement | 原因 |
|-------------|--------|
| （添加了什么） | （为何重要） |

### 页脚

> 不是你需要的？告诉我如何调整，或若你希望执行任务而非 prompt 优化，请发起一个常规任务请求。

---

## 示例

### 触发示例

- "Optimize this prompt for ECC"
- "Rewrite this prompt so Claude Code uses the right commands"
- "帮我优化这个指令"
- "How should I prompt ECC for this task?"

### Example 1：模糊的中文 Prompt（已检测到项目）

**用户输入：**
```
帮我写一个用户登录页面
```

**Phase 0 检测到：**`package.json` 含 Next.js 15、TypeScript、Tailwind CSS

**优化后的 Prompt（完整）：**
```
使用项目现有技术栈（Next.js 15 + TypeScript + Tailwind CSS）实现用户登录页面。

技术要求：
- 沿用项目现有的组件结构和路由约定
- 表单验证使用项目中已有的验证方案（检查是否已用 Zod/Yup/其他）
- 认证方式：沿用项目现有认证方案（如无，默认 JWT）
- 包含：邮箱/密码登录表单、表单验证、错误提示、加载状态、响应式布局

工作流：
1. /plan 先规划组件结构和认证流程，参考现有页面的模式
2. /tdd 测试先行：编写登录表单的单元测试和认证流程的集成测试
3. 实现登录页面和认证逻辑
4. /code-review 审查实现
5. /verify 验证所有测试通过且页面正常渲染

安全要求：
- 密码不明文传输
- 防止暴力破解（rate limiting）
- XSS 防护
- CSRF token

验收标准：
- 所有测试通过，覆盖率 80%+
- 页面在移动端和桌面端正常渲染
- 登录成功跳转到 dashboard，失败显示错误信息

不要做：
- 不要实现注册页面
- 不要实现忘记密码功能
- 不要修改现有的路由结构
```

### Example 2：中等复杂度的英文 Prompt

**用户输入：**
```
Add a REST API endpoint for user profile updates with validation
```

**Phase 0 检测到：**`go.mod` 含 Go 1.22、Chi router

**优化后的 Prompt（完整）：**
```
Add a REST API endpoint for user profile updates (PATCH /api/users/:id).

Tech stack: Go 1.22 + Chi router (detected from project)

Requirements:
- PATCH /api/users/:id — partial update of user profile
- Input validation for fields: name, email, avatar_url, bio
- Auth: require valid token, users can only update own profile
- Return 200 with updated user on success
- Return 400 with validation errors on invalid input
- Return 401/403 for auth failures
- Follow existing API patterns in the codebase

Workflow:
1. /plan the endpoint structure, middleware chain, and validation logic
2. /tdd — write table-driven tests for success, validation failure, auth failure, not-found
3. Implement following existing handler patterns
4. /go-review
5. /verify — run full test suite, confirm no regressions

Do not:
- Modify existing endpoints
- Change the database schema (use existing user table)
- Add new dependencies without checking existing ones first (use search-first skill)
```

### Example 3：EPIC 项目

**用户输入：**
```
Migrate our monolith to microservices
```

**优化后的 Prompt（完整）：**
```
Use the blueprint skill to plan: "Migrate monolith to microservices architecture"

Before executing, answer these questions in the blueprint:
1. Which domain boundaries exist in the current monolith?
2. Which service should be extracted first (lowest coupling)?
3. Communication pattern: REST APIs, gRPC, or event-driven (Kafka/RabbitMQ)?
4. Database strategy: shared DB initially or database-per-service from start?
5. Deployment target: Kubernetes, Docker Compose, or serverless?

The blueprint should produce phases like:
- Phase 1: Identify service boundaries and create domain map
- Phase 2: Set up infrastructure (API gateway, service mesh, CI/CD per service)
- Phase 3: Extract first service (strangler fig pattern)
- Phase 4: Verify with integration tests, then extract next service
- Phase N: Decommission monolith

Each phase = 1 PR, with /verify gates between phases.
Use /save-session between phases. Use /resume-session to continue.
Use git worktrees for parallel service extraction when dependencies allow.

Recommended: Opus 4.6 for blueprint planning, Sonnet 4.6 for phase execution.
```

---

## 相关组件

| Component | 何时参考 |
|-----------|------------------|
| `configure-ecc` | 用户尚未设置 ECC |
| `skill-stocktake` | 审计已安装哪些组件（用它代替硬编码的 catalog） |
| `search-first` | 优化后 prompt 中的 research 阶段 |
| `blueprint` | EPIC scope 的优化后 prompt（作为 skill 调用，而非 command） |
| `strategic-compact` | 长 session 的上下文管理 |
| `cost-aware-llm-pipeline` | Token 优化建议 |
