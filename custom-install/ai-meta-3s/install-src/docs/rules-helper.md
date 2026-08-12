<!-- aimeta3s-doc: rules-helper | version: 1 | updated: 2026-08-12 | source: rules/**/*.md（精确路径见 manifest.json） -->

# ai-meta-3s 规则使用建议

本指南面向 `install-src/rules/` 下的 **33 条规则**，分布在 common / python / typescript / vue / web 五个目录。与同目录其他四份指南正交——《[命令使用建议](command-helper.md)》（39 条 `/命令`）、《[Skill 使用建议](skill-helper.md)》（34 个 skill）、《[Agent 使用建议](agent-helper.md)》（19 个 agent）、《[Hooks 使用建议](hooks-helper.md)》（28 条 hook）分别讲主动触发、按 description 匹配、spawn 委托、生命周期事件；本篇讲最底层的那一层——**被动注入的约束**：你不必"敲"它，它在你写代码时自动生效。

> 全文基于逐个规则文件的真实内容提炼。每条规则按「定义 / 性质 / 激活机制 / 适用场景 / 核心约束或处理流程 / 生成物与预期结果 / 关联」七维呈现。

---

## 一、先搞清楚：Rule 是什么、怎么激活

### Rule ≠ Command / Skill / Agent / Hook

| | 触发方式 | 本质 | 你怎么"用" |
|---|---|---|---|
| **Command** | 主动敲 `/xxx` | 明确指令入口 | 敲命令 |
| **Skill** | 按 `description` 被动匹配 | 领域知识包 / 工作流 | 让 Claude 在合适场景自动用上 |
| **Agent** | 命令执行中 spawn / 手动 | 专项大脑或执行单元 | 委托任务 |
| **Hook** | 生命周期事件触发 | 自动化脚本 | 配置后自动运行 |
| **Rule** | **被动注入上下文** | **编码 / 流程 / 安全约束** | **无需主动用——写代码时自动遵守** |

规则是这套体系里最"静"的一层：它不是动作，而是约束。它的价值体现在"写代码时 Claude 默认就这么做"。

### 三种激活机制（理解整个 rules 体系的关键）

这 33 条规则并非全都一直生效，按文件位置分三种激活方式：

| 激活方式 | 适用文件 | 机制 | 数量 |
|---|---|---|---|
| **always-follow**（常驻基座） | `common/*` | 无 frontmatter，作为通用基座规则始终注入上下文 | 10 |
| **paths glob 激活** | `python/*`、`typescript/*`、`vue/*` | 文件顶部 YAML frontmatter 的 `paths:` 列出文件名 glob，编辑匹配文件时自动注入 | 16 |
| **extends + 主题激活** | `web/*` | 无 frontmatter，正文开头用 `> This file extends common/xxx.md` 声明扩展关系，靠前端主题关联激活 | 7 |

> **关键差异**：python / typescript / vue 三族用 `paths:` frontmatter 精确控制"编辑哪种文件注入哪条规则"；web 族刻意不用 frontmatter，改用 `extends` 声明 + 主题匹配；common 族则永远在线，是所有语言族的公共基座。
>
> ⚠️ **待核实**：web 族"主题匹配激活"的具体机制（harness 按前端上下文判断，还是依赖 CLAUDE.md 显式声明）未在 `rules/web/*` 源文件找到明确触发依据。若 web 规则未如期注入，可在项目 CLAUDE.md 显式引用该规则。

### 六类性质

| 性质 | 含义 | 典型代表 |
|---|---|---|
| **原则清单型** | 原则 + 检查清单，约束代码属性 | coding-style、security、performance |
| **流程型** | 规定多步骤执行流程 | development-workflow、code-review、git-workflow、testing |
| **角色委托型** | 规定如何选 / 编排 / 委托 agent | agents |
| **框架领域型** | 针对特定框架 / 领域 | fastapi、design-quality |
| **横切机制型** | 说明某横切机制怎么用 | hooks、patterns |
| **语言扩展型** | 语言子目录下对 common 同名规则的扩展 | typescript/*、vue/*、python/*、web/* |

> 一条规则可能兼具两类（如各语言 `hooks.md` 既是语言扩展、又讲横切机制）。归类取最主要的一面。

---

## 二、33 个规则总览速查表

### common 族（10 条 · always-follow 基座）

| 文件 | 性质 | 一句话用途 |
|---|---|---|
| `common/coding-style.md` | 原则清单 | 编码根本原则：不可变性、KISS/DRY/YAGNI、命名、错误处理、输入校验 |
| `common/development-workflow.md` | 流程 | 新功能六阶段主流程：研究复用→规划→TDD→审查→提交→Pre-Review |
| `common/code-review.md` | 流程 | 审查触发条件 / 清单 / 四级严重度 / agent 分工 / 审查工作流 |
| `common/git-workflow.md` | 流程 | commit message 格式 + PR 创建流程 |
| `common/testing.md` | 流程 | 80% 覆盖率门槛、三种测试、TDD 六步、AAA 结构 |
| `common/security.md` | 原则清单 | commit 前 8 项强制安全清单 + secret 管理 + 响应协议 |
| `common/performance.md` | 横切机制 | 模型分层选择、context 20% 边界、Extended Thinking、build 修复 |
| `common/patterns.md` | 横切机制 | skeleton 复用评估、Repository 模式、API 响应 envelope |
| `common/agents.md` | 角色委托 | agent 自动选择映射、并行委托、委托完成约定、多视角协同 |
| `common/hooks.md` | 横切机制 | hook 三类型、Auto-Accept 谨慎用、TodoWrite 最佳实践 |

### python 族（6 条 · paths glob `**/*.py` `**/*.pyi`）

| 文件 | 性质 | 一句话用途 | 扩展自 |
|---|---|---|---|
| `python/coding-style.md` | 语言扩展 | PEP 8、类型注解、frozen dataclass、black/isort/ruff | common/coding-style |
| `python/fastapi.md` | 框架领域 | FastAPI 结构 / async / DI / Pydantic schema / 安全 / 测试 | —（独立并行） |
| `python/hooks.md` | 语言扩展 | PostToolUse 跑 black/ruff/mypy/pyright、`print()` 告警 | common/hooks |
| `python/patterns.md` | 语言扩展 | Protocol、dataclass DTO、上下文管理器、生成器 | common/patterns |
| `python/security.md` | 语言扩展 | dotenv 注入密钥、bandit 静态扫描 | common/security |
| `python/testing.md` | 语言扩展 | pytest、`--cov=src --cov-report=term-missing`、pytest.mark 分类 | common/testing |

### typescript 族（5 条 · paths glob `**/*.{ts,tsx,js,jsx}`）

| 文件 | 性质 | 一句话用途 | 扩展自 |
|---|---|---|---|
| `typescript/coding-style.md` | 语言扩展 | 显式类型、interface vs type、禁 any、Zod 校验、禁 console.log | common/coding-style |
| `typescript/hooks.md` | 横切机制 | PostToolUse Prettier / tsc / console.log 告警 + Stop 全量审计 | common/hooks |
| `typescript/patterns.md` | 语言扩展 | `ApiResponse<T>`、自定义 Hook、`Repository<T>` | common/patterns |
| `typescript/security.md` | 语言扩展 | 环境变量读密钥 + security-reviewer agent | common/security |
| `typescript/testing.md` | 语言扩展 | Playwright E2E + e2e-runner agent | common/testing |

### vue 族（5 条 · paths glob `**/*.vue`，hooks 兼 `*.{ts,tsx}`）

| 文件 | 性质 | 一句话用途 | 扩展自 |
|---|---|---|---|
| `vue/coding-style.md` | 语言扩展 | script setup + Composition API、ref/computed/watcher、v-for :key、onUnmounted 清理 | common/coding-style |
| `vue/hooks.md` | 语言扩展 | `vue-tsc --noEmit`、eslint-plugin-vue、prettier、Feature-Sliced 边界 | common/hooks |
| `vue/patterns.md` | 语言扩展 | composables、defineProps/Emits/Model、provide/inject、Pinia、vue-router、vue-query | common/patterns |
| `vue/security.md` | 语言扩展 | v-html / DOMPurify、URL scheme 校验、:style 白名单、VITE_* 不入 bundle | common/security |
| `vue/testing.md` | 语言扩展 | Vitest + @vue/test-utils、mount/shallowMount、createTestingPinia | common/testing |

### web 族（7 条 · 无 frontmatter · extends + 主题激活）

| 文件 | 性质 | 一句话用途 | 扩展自 |
|---|---|---|---|
| `web/coding-style.md` | 语言扩展 | 按特性组织目录、CSS token 化、合成器动画属性、语义化 HTML | common/coding-style |
| `web/design-quality.md` | 框架领域 | 反模板政策、10 项必备品质取 4、风格方向选择 | common/patterns |
| `web/hooks.md` | 横切机制 | PostToolUse 链（prettier→eslint→stylelint→tsc→build）、800 行守卫 | common/hooks |
| `web/patterns.md` | 语言扩展 | 复合组件、状态四分类、URL-as-state、SWR / 乐观更新 | common/patterns |
| `web/performance.md` | 语言扩展 | CWV 目标、bundle 预算、加载策略、图片 / 字体优化 | common/performance |
| `web/security.md` | 语言扩展 | nonce CSP、XSS、SRI、HSTS / 安全头、表单 CSRF | common/security |
| `web/testing.md` | 语言扩展 | 5 级测试优先级（视觉→a11y→性能→跨浏览器→响应式） | common/testing |

---

## 三、规则层级与协同网络

### 3.1 common 基底 ↔ 语言 / 框架扩展

四族语言 / 框架规则全部"长在" common 之上。同名规则是**叠加**关系（语言族补充专属条款，不替换基座）：

```text
       common/coding-style  common/security  common/testing  common/patterns  common/hooks  common/performance
               ▲                   ▲                ▲               ▲              ▲              ▲
               │                   │                │               │              │              │
         python/*            typescript/*        vue/*           web/*          (各语言 hooks)   web/performance
       (paths *.py)        (paths *.ts/tsx)   (paths *.vue)  (extends+主题)                     (extends)

                          python/fastapi（独立 paths：app/fastapi/*_api.py，不 extends，并行生效）
```

- **叠加原则**：编辑一个 `.vue` 文件时，`common/coding-style`（基座）+ `vue/coding-style`（Vue 专属）同时生效；common 的不可变性原则与 Vue 的 ref 规则共同约束。
- **fastapi 是例外**：它不 extends 任何 common 规则，而是 paths glob 独立激活（`app/**/*.py`、`fastapi/**/*.py`、`*_api.py`），与通用 python 规则并行生效。
- **web 族的 extends 指向值得注意**：`web/design-quality` 扩展自 `common/patterns`（而非 coding-style），因为它的本质是"前端设计模式 / 质量门槛"。

### 3.2 显式交叉引用网络（开发主流程链）

common 族之间有明确的流程串联，构成一条完整开发链：

```text
development-workflow（六阶段主流程，extends git-workflow）
   │  0.研究复用 ──→ common/patterns（skeleton 评估）+ common/agents（并行评估）
   │  1.规划     ──→ common/agents（planner）
   │  2.TDD      ──→ common/testing（TDD 六步）+ common/agents（tdd-guide）
   │  3.审查     ──→ common/code-review（清单/四级）+ common/security（安全清单）+ common/agents（reviewer 分工）
   │  4.提交     ──→ common/git-workflow（commit/PR）
   │  5.Pre-Review→ CI 通过后才请求人工 Review
   ▼
code-review 显式集成 → testing（80%）+ security（安全清单）+ git-workflow + agents
```

- `development-workflow` extends `git-workflow`（补充 git 操作前的流程）。
- `code-review` 显式声明集成 `testing.md` / `security.md` / `git-workflow.md` / `agents.md` 四条规则。
- `performance` 与 `agents` 共享 build-error-resolver、多角色 sub-agents 的引用。

### 3.3 同主题跨语言对照（五族放一起看差异）

| 主题 | common（基座） | python | typescript | vue | web |
|---|---|---|---|---|---|
| **coding-style** | 不可变 / KISS / 命名 | PEP8 + 类型注解 + black | 显式类型 + 禁 any + Zod | script setup + ref/watcher | CSS token + 合成器动画 |
| **security** | 8 项 commit 前清单 | dotenv + bandit | env 读密钥 | v-html / DOMPurify + URL scheme | nonce CSP + HSTS + XSS |
| **testing** | 80% + TDD 六步 + AAA | pytest + cov + mark | Playwright E2E | Vitest + @vue/test-utils | 5 级优先级 + 视觉回归 |
| **patterns** | skeleton + Repository + envelope | Protocol + dataclass | `ApiResponse<T>` + Hook | composables + Pinia + vue-query | 复合组件 + 状态四分类 + SWR |
| **hooks** | 三类型 + TodoWrite | black / ruff / mypy | Prettier / tsc | vue-tsc / eslint-plugin-vue | 工具链 + 800 行守卫 |
| **performance** | 模型分层 + context 20% | — | — | — | CWV + bundle 预算 |

> 读法：基座给通用原则，每族补该栈的落地点。例如"安全"在 common 是"commit 前 8 项检查"，到 vue 细化为"v-html 必须 DOMPurify"，到 web 细化为"配置 nonce CSP"——同一安全意志在不同栈的具体投影。

---

## 四、逐条规则详解

> 卡片按 common → python → typescript → vue → web 顺序排列。"激活机制"一栏：`always-follow` = 常驻基座；`paths: <glob>` = 编辑匹配文件时注入；`extends common/xxx` = 在同名基座上叠加。

### common/coding-style.md
- **定义**：确立编码根本原则（不可变性、KISS/DRY/YAGNI）、文件组织、错误处理、输入校验、命名规范与 code smell 防范。
- **性质**：原则清单型。
- **激活机制**：always-follow。
- **适用场景**：编写或修改任意源码时；标记工作完成前对照质量检查清单。
- **核心约束**：1) 不可变性（CRITICAL）始终创建新对象绝不改原对象；2) KISS/DRY/YAGNI——最简方案、重复真实存在才抽象、不臆测通用设计；3) 文件 200-400 行为宜最多 800 行、按功能 / 领域组织；4) 错误每层显式处理、UI 友好、服务端记上下文、永不静默吞错；5) 输入在系统边界校验、schema-based、不信任外部数据；6) 命名（变量函数 camelCase、布尔加 is/has/should/can、类型 PascalCase、常量 UPPER_SNAKE_CASE、hook 加 use）；7) 防范过深嵌套（early return）/ magic number（命名常量）/ 长函数。
- **生成物 / 预期结果**：完成 7 项检查清单（可读 / 函数<50 行 / 文件<800 行 / 嵌套<4 层 / 错误处理 / 无硬编码 / 无 mutation）的统一风格代码。
- **关联**：无 extends；与 code-review.md 的质量清单条目几乎一致，共同构成基础编码约束。

### common/development-workflow.md
- **定义**：定义新功能实现的完整阶段流程（研究复用 → 规划 → TDD → 审查 → 提交 → Pre-Review），是 git 操作之前的开发主流程。
- **性质**：流程型。
- **激活机制**：always-follow；正文 extends common/git-workflow.md。
- **适用场景**：开始任何新功能实现前；从研究阶段到请求人工 Review 的全过程。
- **核心约束**：1) 研究及复用（强制）：先 `gh search repos/code` → 查官方文档 / Context7 → 不足时用 Exa → 查包注册表（npm/PyPI/crates.io）→ 优先采用成熟方案而非新写；2) 规划：planner agent 产出 PRD/architecture/system_design/tech_doc/task_list，识别依赖风险拆阶段；3) TDD：tdd-guide agent，RED→GREEN→IMPROVE，覆盖率≥80%；4) Code Review：code-reviewer agent，修 CRITICAL/HIGH 尽量修 MEDIUM；5) 提交推送：详细提交信息 + conventional commits（见 git-workflow）；6) Pre-Review Checks：CI 通过、冲突解决、分支同步后才请求人工 Review。
- **生成物 / 预期结果**：规划文档（PRD/architecture/system_design/tech_doc/task_list）、TDD 产出的测试与实现、完成审查与 Pre-Review 检查的可合并分支。
- **关联**：extends git-workflow；引用 planner/tdd-guide/code-reviewer agent（来自 agents）；与 testing、code-review、security 配合。

### common/code-review.md
- **定义**：定义代码审查的触发条件、审查清单、严重程度分级、agent 分工及完整审查工作流，确保 merge 前的质量 / 安全 / 可维护性。
- **性质**：流程型。
- **激活机制**：always-follow。
- **适用场景**：编写或修改代码后；向共享分支 commit 前；修改 security-sensitive 代码（认证 / 支付 / 用户数据）时；架构变更时；合并 PR 之前。
- **核心约束**：1) 审查前 CI 通过、冲突解决、分支同步；2) 工作流：git diff → 安全清单 → 质量清单 → 运行测试 → 覆盖率≥80% → 指派合适 agent；3) 质量阈值（函数<50 行 / 文件<800 行 / 嵌套<4 层 / 错误显式处理 / 无硬编码密钥 / 无 console.log）；4) 严重程度四级（致命阻断 / 高警告 / 中提示 / 低备注）；5) 安全触发清单（认证授权 / 用户输入 / DB 查询 / 文件系统 / 外部 API / 加解密 / 支付 → 停并转 security-reviewer）；6) 批准标准（无致命高→Approve / 仅高→Warning / 有致命→Block）。
- **生成物 / 预期结果**：完成审查清单的可观测状态、按等级分类的问题清单、明确 Approve/Warning/Block 裁决、覆盖率≥80% 验证记录。
- **关联**：显式集成 testing、security、git-workflow、agents 四条规则。

### common/git-workflow.md
- **定义**：规定 commit message 格式与 Pull Request 创建流程，是 git 操作层面的基础规范。
- **性质**：流程型。
- **激活机制**：always-follow；被 development-workflow extends。
- **适用场景**：撰写 commit message 时；创建 Pull Request 时。
- **核心约束**：1) Commit 格式 `<类型>: <描述>` + 可选主体，类型限定 feat/fix/refactor/docs/test/chore/perf/ci；2) 禁用共同作者署名：`~/.claude/settings.json` 设 `"includeCoAuthoredBy": false`；3) PR 流程：分析完整 commit 历史 → `git diff base...HEAD` → 起草全面摘要 → 包含带 TODO 的测试计划 → 新分支用 `-u` 推送。
- **生成物 / 预期结果**：符合类型规范的 commit message；带完整摘要与测试计划 TODO 的 PR。
- **关联**：被 development-workflow extends；与 code-review（审查触发于 commit 前）配合。

### common/testing.md
- **定义**：规定最低 80% 覆盖率、三种必需测试类型、TDD 强制工作流程、测试失败处理、AAA 结构与命名规范。
- **性质**：流程型。
- **激活机制**：always-follow。
- **适用场景**：编写新功能或 bug 修复时（强制 TDD）；测试失败需排查时；编写测试用例时。
- **核心约束**：1) 覆盖率门槛最低 80%；2) 三种必需测试（单元 / 集成 / E2E，按语言选框架）；3) TDD 强制流程：先写测试(RED)→运行应 FAIL→写最小实现(GREEN)→运行应 PASS→重构(IMPROVE)→验证覆盖率≥80%；4) 测试失败处理：tdd-guide agent → 检查 test isolation → 验证 mock → 修实现而非测试；5) AAA Pattern（Arrange-Act-Assert）；6) 描述性命名（如 `returns empty array when...`）。
- **生成物 / 预期结果**：覆盖率≥80% 的测试套件；含单元 / 集成 / E2E 三层的完整测试；遵循 AAA 与描述性命名的用例。
- **关联**：与 development-workflow（TDD 阶段）、code-review（80% 门槛一致）、agents（tdd-guide）配合；被 code-review 显式集成。

### common/security.md
- **定义**：定义任何 commit 前的强制性安全检查清单、secret 管理规范，以及发现安全问题时的响应协议。
- **性质**：原则清单型。
- **激活机制**：always-follow。
- **适用场景**：任何 commit 之前；处理 secret / 密钥时；发现或怀疑安全问题时。
- **核心约束**：1) Commit 前强制 8 项清单（无硬编码密钥 / 用户输入已校验 / SQL 注入防护参数化 / XSS 防护净化 HTML / CSRF 保护 / 认证授权验证 / endpoint rate limiting / 错误信息不泄露敏感数据）；2) Secret 管理（绝不硬编码、用环境变量或密钥管理器、启动时验证存在性、暴露后轮换）；3) 安全响应协议（立即停止 → security-reviewer 审核 → 修复 CRITICAL → 轮换暴露 secrets → 全代码库审查同类问题）。
- **生成物 / 预期结果**：通过 8 项检查清单的可提交状态；已轮换的暴露 secret；无 CRITICAL 问题的修复结果；全代码库同类问题审查记录。
- **关联**：与 code-review（安全审查触发条件与 security-reviewer 分工）、agents（security-reviewer）配合；被 code-review 显式集成。

### common/performance.md
- **定义**：规定模型选择策略（Haiku/Sonnet/Opus 分层）、Context Window 管理阈值、Extended Thinking + Plan Mode 控制方式，以及构建失败的处理流程。
- **性质**：横切机制型。
- **激活机制**：always-follow。
- **适用场景**：为 agent / 任务选择模型时；处理大规模 refactoring / 跨文件功能 / 复杂调试时；配置 Extended Thinking 预算时；build 失败时。
- **核心约束**：1) 模型分层（Haiku=轻量 agent / 结对 / worker，约 Sonnet 90% 能力省 3 倍成本；Sonnet=主要开发 / 编排 / 复杂编码；Opus=架构决策 / 最深推理 / 研究）；2) Context 管理：大规模重构 / 跨文件功能 / 复杂交互避免用最后 20%；3) Extended Thinking 默认启用（最多保留 31999 token），开关 Option/Alt+T，配置 `alwaysThinkingEnabled`，预算 `MAX_THINKING_TOKENS`，Ctrl+O 看详细；4) 复杂任务：Extended Thinking → Plan Mode → 多轮评审 → 多角色 sub-agents；5) Build 失败：build-error-resolver agent → 分析 → 逐步修复 → 每次修复后验证。
- **生成物 / 预期结果**：按任务复杂度匹配的模型选择；不触及 context 末尾 20% 的安全边界；配置好的 thinking 预算；通过验证的构建修复。
- **关联**：与 agents（多角色 sub-agents、build-error-resolver）配合。

### common/patterns.md
- **定义**：规定实现新功能时复用 skeleton projects 的评估流程，以及 Repository 模式和统一 API 响应 envelope 两种设计模式。
- **性质**：横切机制型。
- **激活机制**：always-follow。
- **适用场景**：实现新功能需选型 skeleton 项目时；设计数据访问层时；设计 API 响应格式时。
- **核心约束**：1) Skeleton 评估流程：搜索实战检验项目 → 并行 agents 评估（安全 / 可扩展性 / 相关性 / 实现规划）→ clone 最佳匹配 → 在验证结构内迭代；2) Repository 模式：封装 findAll/findById/create/update/delete，具体实现处理存储细节，业务逻辑依赖抽象接口，便于 mock 测试；3) API 响应 envelope：统一含成功 / 状态指示符 + data payload + 错误消息 + 分页 metadata（total/page/limit）。
- **生成物 / 预期结果**：基于经验证 skeleton 的项目结构；统一接口的数据访问层；格式一致的 API 响应。
- **关联**：与 development-workflow（研究复用阶段理念一致）、agents（并行评估）配合。

### common/agents.md
- **定义**：规定如何从系统提示词聚合的 agent 清单中自动选择匹配 agent，并约束并行委托、结果收集与多视角协同的编排规范。
- **性质**：角色委托型。
- **激活机制**：always-follow。
- **适用场景**：面临复杂功能规划、代码审查、TDD、架构决策、安全审查、构建修复、E2E 测试等任务需要决定是否委托 agent 时；以及需要并行分析独立模块时。
- **核心约束**：1) 根据 agent 的 description 自动选择最合适者（11 类典型映射：planner / code-reviewer / tdd-guide / architect / security-reviewer / build-error-resolver / e2e-runner 及各语言 reviewer）；2) 独立操作始终并行 Task 执行，避免不必要串行；3) 委托完成三约定（最终消息即交付物，不得以"等待后台 agent"结束回合；委派者必须收集并整合结果，禁止即发即忘；仅当单上下文无法完成时才分解）；4) 复杂问题采用多角色 sub-agents（事实审查员 / 资深工程师 / 安全专家 / 一致性审查员 / 冗余检查员）。
- **生成物 / 预期结果**：无孤立僵尸任务；每个委托链路都有整合后的最终返回；并行执行的独立分析全部被收集。
- **关联**：与 code-review（agent 使用表）、development-workflow（各阶段引用 agent）、security（security-reviewer）、performance（build-error-resolver）互相引用。

### common/hooks.md
- **定义**：说明 Hooks 系统的三种类型、Auto-Accept Permissions 的谨慎使用规则，以及 TodoWrite 的最佳实践。
- **性质**：横切机制型。
- **激活机制**：always-follow。
- **适用场景**：配置或使用 PreToolUse / PostToolUse / Stop hook 时；决定是否启用 Auto-Accept Permissions 时；跟踪多步任务进度时。
- **核心约束**：1) Hook 三类型（PreToolUse 执行前验证 / 改参、PostToolUse 执行后格式化 / 检查、Stop session 结束最终验证）；2) Auto-Accept 谨慎用（可信明确计划启用、探索性工作禁用、禁用 dangerously-skip-permissions、改用 settings.json 的 permissions.allow）；3) TodoWrite 用途（跟踪多步任务进度、验证对 instructions 的理解、Enable real-time steering、展示实施步骤）；4) Todo list 用作诊断（发现乱序 / 遗漏 / 冗余 / 粒度不当 / 误解需求）。
- **生成物 / 预期结果**：正确配置的 hook 与 permissions.allow；反映正确理解与粒度的 todo list。
- **关联**：无显式关联；是各语言 hooks.md 的扩展基座。

### python/coding-style.md
- **定义**：Python 代码风格规则，规定 PEP 8、类型注解、不可变数据与格式化工具链的使用。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.py` `**/*.pyi`；extends common/coding-style.md。
- **适用场景**：编写或修改任意 `.py`/`.pyi` 文件时自动注入；定义函数签名、数据类、import 顺序、提交前格式化时。
- **核心约束**：1) 遵循 PEP 8；2) 所有函数签名加类型注解；3) 优先不可变结构（`@dataclass(frozen=True)`、`NamedTuple`）；4) 用 black 格式化、isort 排序 import、ruff lint。
- **生成物 / 预期结果**：函数签名 100% 带类型；数据传输用 frozen dataclass / NamedTuple；代码通过 black / isort / ruff 检查无 diff。
- **关联**：extends common/coding-style；引导参考 skill `python-patterns`。

### python/fastapi.md
- **定义**：FastAPI 项目专项规则，约束应用构造、路由分层、异步、依赖注入、Schema、安全与测试的组织方式。
- **性质**：框架领域型。
- **激活机制**：paths `**/app/**/*.py` `**/fastapi/**/*.py` `**/*_api.py`（无 extends，与通用 Python 规则并行生效）。
- **适用场景**：编辑 FastAPI 项目目录（app/、fastapi/）或任何 `*_api.py` 文件时；搭建 app、写路由、定义 schema、配置 CORS/JWT、编写测试时。
- **核心约束**：1) 结构：app 构造放 `create_app()`，路由保持薄、业务下沉 services/CRUD，request/update/response schema 分离，DB 会话与鉴权作 dependencies；2) 异步：I/O 端点用 `async def`，使用 async DB/HTTP 客户端，禁止在 async 路由内调用 `requests`/同步 SQLAlchemy/阻塞 IO；3) DI：通过 `Depends` 注入，禁止 handler 内 `SessionLocal()` 或持有长生命周期客户端；4) Schema：响应模型不含密码 / 令牌 / 内部鉴权状态，用 `response_model`，用 Pydantic 字段约束替代手写校验；5) 安全：CORS 来源环境隔离、禁通配符 + 凭证组合、校验 JWT expiry/issuer/audience/algorithm、限流 auth 与重写端点、日志脱敏；6) 测试：精确 override `Depends`、测试后清理 `app.dependency_overrides`、优先 async 测试客户端。
- **生成物 / 预期结果**：分层清晰（路由薄 / services 承载业务 / 依赖承载 session/auth）；async 链路无阻塞调用；响应模型不泄露敏感字段；auth / 写端点有限流；测试通过 dependency_overrides 隔离且用后即清。
- **关联**：无 extends；与 python/coding-style、python/security、python/testing 同目录规则叠加；引用 skill `fastapi-patterns`。

### python/hooks.md
- **定义**：Python 专属的 hook 配置指导，说明编辑 `.py` 后应挂接的格式化、类型检查与告警 hook。
- **性质**：语言扩展型（兼横切机制型）。
- **激活机制**：paths `**/*.py` `**/*.pyi`；extends common/hooks.md。
- **适用场景**：编辑 `.py`/`.pyi` 后的 PostToolUse 时机；配置 `~/.claude/settings.json` 自动跑 black/ruff/mypy/pyright、对 `print()` 告警。
- **核心约束**：1) PostToolUse 配置 black/ruff 在编辑 `.py` 后自动格式化；2) PostToolUse 配置 mypy/pyright 做类型检查；3) 对编辑文件中出现 `print()` 给告警，引导改用 `logging`。
- **生成物 / 预期结果**：settings.json 中存在针对 `.py` 的 PostToolUse hook 配置；编辑后自动格式化与类型检查反馈；生产代码无残留 `print()`。
- **关联**：extends common/hooks；与 python/coding-style（black/ruff/isort）、python/testing（pytest）工具链一致。

### python/patterns.md
- **定义**：Python 常用模式速查，提供 Protocol 鸭子类型、dataclass 作为 DTO、上下文管理器与生成器等惯用法。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.py` `**/*.pyi`；extends common/patterns.md。
- **适用场景**：编写 `.py`/`.pyi` 时需定义接口契约、设计 DTO/请求响应对象、管理资源或构建惰性迭代时。
- **核心约束**：1) 用 `typing.Protocol` 定义结构性接口（如 Repository，含 `find_by_id`/`save` 签名）；2) 用 `@dataclass` 作为 DTO；3) 用 `with` 上下文管理器管理资源；4) 用生成器实现惰性求值与内存高效迭代。
- **生成物 / 预期结果**：接口以 Protocol 表达；数据载体用 dataclass；资源管理走 `with`；大数据流走生成器。
- **关联**：extends common/patterns；引用 skill `python-patterns`；与 python/coding-style（不可变 dataclass）理念一致。

### python/security.md
- **定义**：Python 安全规则，规定密钥通过环境变量 / dotenv 注入，并用 bandit 做静态安全扫描。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.py` `**/*.pyi`；extends common/security.md。
- **适用场景**：编写涉及密钥 / 凭证的 `.py` 代码时；提交前对 `src/` 做安全扫描时；加载 `.env` 配置时。
- **核心约束**：1) 密钥管理：用 `python-dotenv` 的 `load_dotenv()` + `os.environ["KEY"]`（缺失抛 KeyError 显式失败）；2) 静态扫描：用 `bandit -r src/` 对源码递归扫描。
- **生成物 / 预期结果**：无硬编码密钥；密钥缺失时立即报错；bandit 扫描纳入 CI / 提交流程；可审计的安全报告。
- **关联**：extends common/security；引用 skill `django-security`（Django 场景适用时）；与 python/fastapi 的 CORS/JWT/日志脱敏条款互补。

### python/testing.md
- **定义**：Python 测试规则，确立 pytest 为测试框架，规定覆盖率命令与基于 `pytest.mark` 的测试分类。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.py` `**/*.pyi`；extends common/testing.md。
- **适用场景**：编写或修改 `.py`/`.pyi` 测试代码时；提交前跑覆盖率；为测试打标记区分 unit/integration 时。
- **核心约束**：1) 框架统一用 pytest；2) 覆盖率用 `pytest --cov=src --cov-report=term-missing`；3) 用 `pytest.mark`（如 `@pytest.mark.unit`、`@pytest.mark.integration`）对测试分类。
- **生成物 / 预期结果**：测试以 pytest 编写并带分类标记；终端产出 `term-missing` 覆盖率报告；可按 mark 选择性执行 unit/integration 套件。
- **关联**：extends common/testing；引用 skill `python-testing`；与 python/fastapi 的 Testing 小节（dependency_overrides、async test client）配合。

### typescript/coding-style.md
- **定义**：TypeScript/JavaScript 编码风格规则，规定类型 / 接口、不可变性、错误处理、输入校验、日志等编码规范。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.ts` `**/*.tsx` `**/*.js` `**/*.jsx`；extends common/coding-style.md。
- **适用场景**：编写或修改任何 `.ts/.tsx/.js/.jsx` 文件时；设计公开 API、定义类型 / 接口、写 React props、异步错误处理、Zod 校验、写 `.js` 的 JSDoc 时。
- **核心约束**：1) 公开 API（导出函数 / 共享工具 / 公共类方法）必须显式标注参数与返回类型，局部变量让 TS 推断；2) `interface` 用于可扩展对象形状，`type` 用于联合 / 交叉 / 元组 / 映射 / 工具类型，优先字符串字面量联合而非 `enum`；3) 禁用 `any`，外部 / 不可信输入用 `unknown` 后安全收窄，依赖调用者类型用泛型；4) React 组件 props 用具名 `interface`/`type`，回调显式标注，非必要不用 `React.FC`；5) `.js/.jsx` 在迁移 TS 不现实时用 JSDoc 且与运行时一致；6) 不可变更新用 spread（`Readonly<User>`）；7) 错误处理 async/await + try-catch，错误经 `unknown` 安全收窄；8) 输入校验用 Zod + `z.infer` 推导类型；9) 生产代码禁 `console.log`，改用正规日志库。
- **生成物 / 预期结果**：类型显式、无 `any`、不可变更新、错误经安全收窄、输入经 Zod 校验、无 `console.log` 的 TS/JS 代码；公开 API 具显式签名；`.js` 的 JSDoc 与运行时一致。
- **关联**：extends common/coding-style；与 typescript/hooks（console.log 自动检测）配合；被同目录 security、testing 协同。

### typescript/hooks.md
- **定义**：TypeScript/JavaScript 专属的 hooks 配置说明，列出编辑后与 session 结束前对 JS/TS 文件执行的自动化检查。
- **性质**：横切机制型（兼语言扩展型）。
- **激活机制**：paths `**/*.ts` `**/*.tsx` `**/*.js` `**/*.jsx`；extends common/hooks.md。
- **适用场景**：配置或审查 `~/.claude/settings.json` 中的 JS/TS 自动化 hooks 时；编辑 JS/TS 文件后（PostToolUse）和 session 结束前（Stop）。
- **核心约束**：1) PostToolUse - Prettier 编辑后自动格式化；2) PostToolUse - TypeScript check 编辑 `.ts/.tsx` 后运行 `tsc`；3) PostToolUse - console.log warning 对已编辑文件告警；4) Stop - console.log audit session 结束前检查所有已修改文件。
- **生成物 / 预期结果**：settings.json 配置好上述 PostToolUse 与 Stop hooks；JS/TS 编辑后自动格式化、类型检查、console.log 实时告警，session 结束前完成全量审计。
- **关联**：extends common/hooks；与 typescript/coding-style（console.log 禁令、类型要求）配套执行。

### typescript/patterns.md
- **定义**：TypeScript/JavaScript 常用设计模式参考，给出 API 响应格式、自定义 Hook、Repository 三类可复用 TS 骨架。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.ts` `**/*.tsx` `**/*.js` `**/*.jsx`；extends common/patterns.md。
- **适用场景**：编写 TS/JS 文件时需设计 API 响应结构、写 React 自定义 Hook、实现数据访问 Repository 时。
- **核心约束**：1) API 响应：泛型 `ApiResponse<T>`，含 `success: boolean`、可选 `data: T`、可选 `error: string`、可选 `meta: {total, page, limit}`；2) Custom Hooks：以 `useDebounce<T>` 为示例，`useState` + `useEffect` + setTimeout 并返回清理函数；3) Repository：泛型 `Repository<T>` 接口，规范 `findAll/findById/create/update/delete` 五方法。
- **生成物 / 预期结果**：API 响应统一 `ApiResponse<T>` 形态；自定义 Hook 遵循 useState/useEffect + 副作用清理；数据访问层抽象为 `Repository<T>`。
- **关联**：extends common/patterns；无其他显式引用。

### typescript/security.md
- **定义**：TypeScript/JavaScript 安全规则，重点约束密钥管理，并指引调用安全审计 agent。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.ts` `**/*.tsx` `**/*.js` `**/*.jsx`；extends common/security.md。
- **适用场景**：编写 / 修改涉及密钥、凭据、外部 API 调用的 TS/JS 代码时；需全面安全审计时。
- **核心约束**：1) 禁止硬编码密钥（如 `const apiKey = "sk-proj-xxxxx"`）；2) 始终通过环境变量读取（`process.env.API_KEY`），缺失时抛错（`throw new Error('API_KEY not configured')`）；3) 用 security-reviewer agent 做全面审计。
- **生成物 / 预期结果**：无硬编码密钥，所有密钥经环境变量注入且缺失显式失败；可由 security-reviewer agent 产出审计结果。
- **关联**：extends common/security；引用 security-reviewer agent。

### typescript/testing.md
- **定义**：TypeScript/JavaScript 测试规则，指定 E2E 测试框架并指引调用对应 agent。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.ts` `**/*.tsx` `**/*.js` `**/*.jsx`；extends common/testing.md。
- **适用场景**：为 TS/JS 项目编写或运行 E2E 测试时；选择 E2E 框架、为关键用户流程写 E2E、执行 Playwright 时。
- **核心约束**：1) 将 Playwright 作为关键用户流程的 E2E 测试框架；2) 用 e2e-runner agent（Playwright E2E 测试专家）。
- **生成物 / 预期结果**：关键用户流程具备 Playwright 编写的 E2E 用例；可由 e2e-runner agent 生成或运行；框架统一为 Playwright。
- **关联**：extends common/testing；引用 e2e-runner agent。

### vue/coding-style.md
- **定义**：Vue 单文件组件的编码风格规范，覆盖 SFC 结构、响应式 API 选择、computed/watcher 用法、生命周期与 DOM 交互、模板宏与指令约束。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.vue`；extends common/coding-style.md。
- **适用场景**：编写或修改 `.vue` 单文件组件时自动注入。
- **核心约束**：1) 必须用 `<script setup lang="ts">` + Composition API，禁止 Options API，block 顺序 script→template→style scoped，每文件一个 component；2) 命名组件 PascalCase，composables 以 `useXxx` 前缀；3) `ref` 为主要状态 API（`.value` 读写），不整体重新赋值 `reactive`，不得解构未经 `toRefs`/`storeToRefs` 处理的响应式对象；4) `computed` getter 必须纯函数，`watch` 传 getter 而非原始对象，`watchEffect` 第一个 `await` 后停止追踪；5) 每个 `v-for` 必须有稳定唯一 `:key`（禁用 index / 对象），同一元素禁 `v-if`+`v-for`；6) `onUnmounted` 清理 timers/listeners/subscriptions，DOM 读取须在 `await nextTick()` 后。
- **生成物 / 预期结果**：通过 `vue/vue3-recommended` ESLint + Prettier + `vue-tsc` 的 `.vue` 文件；SFC 结构与命名统一。
- **关联**：extends common/coding-style；与 vue/hooks（共享工具链）、vue/patterns（composable 写法）配合；引用 frontend-patterns、vite-patterns skills。

### vue/hooks.md
- **定义**：PostToolUse hook 在 Vue 项目中的具体配置与执行顺序，覆盖 typecheck、lint、format 与架构边界检查。
- **性质**：语言扩展型（兼横切机制型）。
- **激活机制**：paths `**/*.vue` `**/*.ts` `**/*.tsx`；extends common/hooks.md。
- **适用场景**：编辑 `.vue`/`.ts`/`.tsx` 文件后的 PostToolUse 阶段触发。
- **核心约束**：1) 作用域尽量限定为已变更文件；2) Typecheck 必须用 `vue-tsc --noEmit`（普通 `tsc` 无法读取 SFC），项目级、需防抖避免编辑器卡顿；3) Lint 用 `eslint --fix` + `eslint-plugin-vue`（flat-config `vue/vue3-recommended`）覆盖 template 和 script；4) Format 用 `prettier --write`，建议走 Prettier-via-ESLint 避免循环；5) 顺序：先逐文件 `eslint --fix` + `prettier --write`，最后跑 debounced `vue-tsc --noEmit`；6) 可选用 `@feature-sliced/steiger` 或 `eslint-plugin-boundaries` 强制 Feature-Sliced slice 边界。
- **生成物 / 预期结果**：编辑后自动 lint + format 修正；类型错误反映格式化后代码；跨 slice import 违规被阻断。
- **关联**：extends common/hooks；与 vue/coding-style（共同约束 ESLint/Prettier/vue-tsc）配合；引用 frontend-patterns、vite-patterns skills。

### vue/patterns.md
- **定义**：Vue 生态的可复用模式规范，覆盖 composables、props/emits/v-model、provide/inject、Pinia、vue-router、vue-query 的约定用法。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.vue`；extends common/patterns.md。
- **适用场景**：编写 `.vue` 文件涉及 composable、store、路由、server cache 等模式实现时。
- **核心约束**：1) Composable：输入接受 `MaybeRefOrGetter<T>` 并用 `toValue` 标准化，返回 `toRefs(reactive(...))` 以免解构丢响应性，含 lifecycle/provide-inject 的须在 setup 内同步调用；2) Props/Emits 用类型形式 `defineProps<Props>()` / 元组 `defineEmits<{ change: [id: number] }>()`，`defineModel<T>('name', { default })` 双向绑定；3) Provide/Inject：用 `Symbol() as InjectionKey<T>` 做 key，provider 负责所有 mutation，暴露 readonly ref + 显式 updater；4) Pinia：优先 setup stores，state/getters 用 `storeToRefs`，action 直接解构，禁把原始 auth token 存 `localStorage`；5) vue-router：路由组件动态 `import()` 懒加载，全局 `beforeEach` 基于 `meta.requiresAuth` 鉴权，watch `() => route.params.id`；6) vue-query：用 ref/computed 本身（非 `.value`）放入 queryKey。
- **生成物 / 预期结果**：可复用且类型安全的 composable/store；响应式不丢失；server-cache（vue-query）与 client state（Pinia）职责分离。
- **关联**：extends common/patterns；与 vue/coding-style（响应式用法）、vue/testing（测试方式对应）配合；引用 frontend-patterns、vite-patterns skills。

### vue/security.md
- **定义**：Vue 模板与运行时的 XSS 防护规范，覆盖 `v-html`、URL/style/event 注入、客户端密钥管理。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.vue`；extends common/security.md。
- **适用场景**：编写 `.vue` 文件涉及渲染用户内容、动态绑定 href/src/style、客户端环境变量时。
- **核心约束**：1) Vue 自动转义仅覆盖 `{{ }}` 与动态属性绑定，下列入口不受保护；2) 模板只能来自可信源，禁运行时编译用户输入为模板，禁用户控制的 `:is`；3) `v-html`、render function、scoped slot 输出均为直接 XSS 向量，不可避免时先用 DOMPurify（allowlist）消毒或沙箱 iframe，后端持久化前亦应消毒；4) `:href`/`:src` 不转义，`javascript:` URL 会执行——校验 scheme 仅允许 http/https/mailto；5) `:style` 用对象语法 + 白名单属性，禁将用户输入绑到 `onclick`/`onfocus` 等事件属性；6) `import.meta.env.VITE_*` 会进浏览器 bundle，API key/token 留服务端，session token 用 httpOnly cookie。
- **生成物 / 预期结果**：不含用户可控模板、未消毒 v-html、危险 URL scheme、客户端硬编码密钥的 Vue 组件。
- **关联**：extends common/security；与 vue/patterns（Pinia 禁存 token）呼应；引用 frontend-patterns、vite-patterns skills。

### vue/testing.md
- **定义**：Vue 组件与 composable 的测试规范，覆盖测试栈选择、渲染 / 异步处理、测试范围、composable 与 Pinia 测试、mount 配置。
- **性质**：语言扩展型。
- **激活机制**：paths `**/*.vue`；extends common/testing.md。
- **适用场景**：为 `.vue` 组件、composable、Pinia store 编写或修改测试时。
- **核心约束**：1) Stack：Vitest + `@vue/test-utils`，DOM 环境用 happy-dom 或 jsdom（在 `vite.config.ts` 的 `test.environment` 配置）；2) `mount` 全渲染 / `shallowMount` stub 所有子组件，`trigger`/`setValue` 返回 promise 必须 await，`flushPromises` flush 已 resolve handler，`nextTick` 在状态变更后 settle DOM；3) 只测公共接口（props、emitted events、slots、rendered output），不测私有状态，不单靠 snapshot；4) Composable：仅用响应式 API 的可直接单测，含 lifecycle 或 `inject` 的必须通过 host 组件测试；5) Pinia：组件内用 `createTestingPinia()`（Vitest 下必须传 `createSpy: vi.fn`），通过 `global.plugins` 注入，默认 stubActions，隔离测试用 `setActivePinia(createPinia())`；6) Mount 配置：`global.plugins`/`stubs`/`mocks`/`provide`，用 `RouterLinkStub` stub `router-link`。
- **生成物 / 预期结果**：通过 Vitest 运行的组件/composable/store 测试，覆盖公共接口、不依赖 snapshot 单一来源、每测间 state 不泄漏。
- **关联**：extends common/testing；与 vue/patterns、vue/coding-style（script setup 写法对应 mount 测试）配合；引用 frontend-patterns、vite-patterns skills。

### web/coding-style.md
- **定义**：Web 前端编码风格规则，规定前端项目的文件组织、CSS token 化、动画属性选择、语义化 HTML 与命名约定。
- **性质**：语言扩展型。
- **激活机制**：extends common/coding-style.md（无独立 frontmatter，靠前端主题激活）。
- **适用场景**：编写 / 修改前端源码（`.tsx`/`.ts`/`.css`/组件文件）时，尤其涉及目录结构搭建、设计 token 定义、动画实现与 HTML 结构编写。
- **核心约束**：1) 按特性 / 界面区域组织目录（components/hooks/lib/styles），而非按文件类型分目录；2) 设计 token（颜色 / 字号 / 间距 / 时长 / 缓动）统一定义为 CSS 自定义属性，禁止重复硬编码；3) 动画只用合成器友好属性（transform/opacity/clip-path/filter），避免触发 layout 的属性（width/height/top/left/margin/padding/border/font-size）；4) 优先语义化 HTML（header/nav/main/section/footer）；5) 命名（组件 PascalCase、Hooks 用 `use` 前缀、CSS 类 kebab-case 或 utility、动画时间线 camelCase 含意图）。
- **生成物 / 预期结果**：按特性组织的目录结构、集中定义的 CSS 变量 token、仅用合成器属性的动画、语义化标签结构与一致的命名风格。
- **关联**：extends common/coding-style；与 web/performance（动画属性）、web/design-quality（设计 token）协同。

### web/design-quality.md
- **定义**：前端设计质量标准，禁止模板化 UI，要求每个界面呈现刻意的、有观点的、产品专属的视觉表达。
- **性质**：框架领域型。
- **激活机制**：extends common/patterns.md（无独立 frontmatter，靠前端主题激活）。
- **适用场景**：编写 / 产出前端界面代码前与交付前，尤其涉及新页面、组件视觉设计、主题 / 配色 / 字体选择时。
- **核心约束**：1) 反模板政策：禁止默认卡片网格、股票级 hero（居中标题 + 渐变 blob + 通用 CTA）、未改库默认值、扁平无层次、统一圆角 / 间距 / 阴影、灰白单一强调色、模板化 dashboard、默认字体栈；2) 每个有意义界面至少体现 10 项"必备品质"中的 4 项（层级对比 / 间距韵律 / 深度层次 / 字体配对 / 语义色彩 / 状态设计 / 网格突破 / 纹理氛围 / 澄清性动效 / 数据可视化纳入设计系统）；3) 编写前端前先定方向（选具体风格、刻意定义调色板、刻意选字体、收集真实参考、用 ECC 设计 / 前端 skill）；4) 候选风格（编辑 / 杂志、Neo-brutalism、Glassmorphism、奢华明暗、Bento、Scrollytelling、3D、Swiss、Retro-futurism），不默认暗色模式；5) 组件检查清单（非默认 Tailwind/shadcn 模板感、有 hover/focus/active 态、用层级而非均一强调、真实产品截图可信、明暗双主题皆刻意）。
- **生成物 / 预期结果**：通过组件检查清单、具备 4+ 项必备品质、避免模板观感、呈现明确视觉方向与意图的前端界面。
- **关联**：extends common/patterns；与 web/coding-style（token / 字体）、前端相关 skills 配合。

### web/hooks.md
- **定义**：Web 项目的 hook 配置建议，给出 PostToolUse / PreToolUse / Stop 各阶段的具体 hook 配置与推荐顺序。
- **性质**：横切机制型。
- **激活机制**：extends common/hooks.md（无独立 frontmatter，靠前端主题激活）。
- **适用场景**：为 web 项目配置 settings.json 的 PostToolUse / PreToolUse / Stop hook 时；编辑前端文件后触发自动化工具链时。
- **核心约束**：1) PostToolUse（matcher `Write|Edit`）按序：prettier → eslint --fix → stylelint --fix → tsc 类型检查 → build 验证；2) 类型检查必须 `--incremental` + `--tsBuildInfoFile` + `timeout 60`，防 tsc 多进程堆积与挂起；3) 优先用项目本地工具（pnpm/yarn/npm exec + repo-owned 依赖），禁 hook 连远程一次性包；4) PreToolUse 文件大小守卫：从 `tool_input.content` 统计行数，>800 行则 `exit 2` 阻断写入并提示拆分；5) Stop hook 跑 `pnpm build` 做会话结束前构建验证；6) Windows 无 GNU coreutils 时用 PowerShell wrapper 替代 `timeout`。
- **生成物 / 预期结果**：可用的 hook 配置块；编辑后自动 format/lint/type-check/构建；超过 800 行的写入被阻断；tsc 不堆积不挂起。
- **关联**：extends common/hooks；与 settings 配置机制、web/testing（构建验证）协同。

### web/patterns.md
- **定义**：Web 前端架构模式规则，规定组件组合、状态管理分类、URL-as-state 与数据获取（SWR / 乐观更新 / 并行加载）等前端常用模式。
- **性质**：语言扩展型。
- **激活机制**：extends common/patterns.md（无独立 frontmatter，靠前端主题激活）。
- **适用场景**：设计 / 实现前端组件结构、状态管理策略、数据获取逻辑与 URL 状态同步时。
- **核心约束**：1) 组件组合：复合组件（父持状态、子经 context 消费，优于 prop drilling）、render props/slots、Container/Presentational 分离；2) 状态分类隔离：server state（TanStack Query/SWR/tRPC）、client state（Zustand/Jotai/signals）、URL state（search params/route）、form state（React Hook Form 等），禁把 server state 复制进 client store；3) 派生值优先于冗余存储计算态；4) URL 作状态：filters/sort/pagination/active tab/search query 持久化到 URL；5) 数据获取：SWR（缓存即时返回 + 后台再验证）、乐观更新（快照→应用→失败回滚 + 可见错误反馈）、并行加载独立数据避免瀑布、合理预取下一路由。
- **生成物 / 预期结果**：遵循复合组件 / 容器展示分离、状态按关注点分类隔离、可分享状态入 URL、数据获取用 SWR 与乐观更新模式的前端代码。
- **关联**：extends common/patterns；与 web/coding-style（组件组织）、web/testing（测试形态）协同。

### web/performance.md
- **定义**：Web 性能规则，定义 Core Web Vitals 目标、bundle 预算、加载策略、图片 / 字体优化与动画性能约束。
- **性质**：语言扩展型。
- **激活机制**：extends common/performance.md（无独立 frontmatter，靠前端主题激活）。
- **适用场景**：前端性能优化、加载策略决策、图片 / 字体处理、动画实现、bundle 体积管控时。
- **核心约束**：1) CWV 目标：LCP<2.5s、INP<200ms、CLS<0.1、FCP<1.5s、TBT<200ms；2) Bundle 预算（gzip）：Landing JS<150kb/CSS<30kb、App JS<300kb/CSS<50kb、Microsite JS<80kb/CSS<15kb；3) 加载策略：inline 关键首屏 CSS、仅 preload hero 图与主字体、defer 非关键 CSS/JS、重库动态 import；4) 图片：显式 width/height、hero 用 `loading=eager`+`fetchpriority=high`、首屏下用 `loading=lazy`、AVIF/WebP 带 fallback、源图不超渲染尺寸；5) 字体：最多两族、`font-display: swap`、subset、仅 preload 关键字重；6) 动画：仅合成器属性、`will-change` 窄用且用完移除、简单过渡用 CSS、JS 动画用 rAF 或成熟库、避免 scroll handler 频繁触发（用 IntersectionObserver）；7) 性能检查清单。
- **生成物 / 预期结果**：页面达 CWV 目标与 bundle 预算；性能检查清单全过；图片 / 字体 / 动画按优化策略实现。
- **关联**：extends common/performance；与 web/coding-style（动画属性一致）、web/testing（性能测试引用其 CWV 目标）协同。

### web/security.md
- **定义**：Web 安全规则，覆盖 CSP、XSS 防护、第三方脚本、HTTPS 与安全头、表单安全等前端 / web 应用安全基线。
- **性质**：语言扩展型。
- **激活机制**：extends common/security.md（无独立 frontmatter，靠前端主题激活）。
- **适用场景**：配置生产环境安全头 / CSP、处理用户输入与 HTML 注入、引入第三方脚本、设计表单与提交端点时。
- **核心约束**：1) 必须配置生产 CSP，用 nonce-based CSP（每请求 nonce）替代 `'unsafe-inline'`，给出 default-src/script-src/style-src/img-src/font-src/connect-src/frame-src/object-src/base-uri 模板（按项目调整源，禁原样照搬）；2) XSS 防护：不注入未消毒 HTML、避免 `innerHTML`/`dangerouslySetInnerHTML`（必须用时先用 vetted 本地消毒器）、转义动态模板值；3) 第三方脚本：异步加载、CDN 用 SRI、季度审计、关键依赖尽量自托管；4) HTTPS 与安全头：HSTS（max-age 31536000 + includeSubDomains + preload）、X-Content-Type-Options: nosniff、X-Frame-Options: DENY、Referrer-Policy: strict-origin-when-cross-origin、Permissions-Policy 关闭 camera/microphone/geolocation；5) 表单：状态变更表单加 CSRF、提交端点限流、客户端 + 服务端双端校验、优先 honeypot 等轻量反滥用而非重型 CAPTCHA。
- **生成物 / 预期结果**：生产应用具备正确配置的 CSP 与安全响应头、无未消毒 HTML 注入点、第三方脚本带 SRI/异步、表单具备 CSRF 与限流。
- **关联**：extends common/security；与项目顶层 Prompt Defense Baseline 一致。

### web/testing.md
- **定义**：Web 测试规则，定义前端测试优先级顺序（视觉回归 → 可访问性 → 性能 → 跨浏览器 → 响应式）、E2E 形态与单元测试范围。
- **性质**：语言扩展型。
- **激活机制**：extends common/testing.md（无独立 frontmatter，靠前端主题激活）。
- **适用场景**：为前端编写 / 执行测试时，决定测试类型优先级、选择断点、设计 E2E 与单元测试覆盖时。
- **核心约束**：1) 优先级 1 视觉回归：截图关键断点 320/768/1024/1440、覆盖 hero/scrollytelling 与有意义状态、用 Playwright 截图、双主题皆测；2) 优先级 2 可访问性：自动化 a11y 检查、键盘导航、reduced-motion 行为、颜色对比；3) 优先级 3 性能：对有意义页面跑 Lighthouse、沿用 performance.md 的 CWV 目标；4) 优先级 4 跨浏览器：至少 Chrome/Firefox/Safari、测滚动 / 动效 / 降级；5) 优先级 5 响应式：测 320/375/768/1024/1440/1920、无溢出、触控交互；6) E2E 用 `@playwright/test`、避免 flaky timeout 断言、优先确定性等待；7) 单元测试：测工具 / 数据变换 / 自定义 hooks，高视觉组件优先视觉回归而非脆弱标记断言。
- **生成物 / 预期结果**：按 5 级优先级组织的前端测试套件；多断点 / 多浏览器 / 双主题视觉回归通过；E2E 用确定性等待；单元测试覆盖工具与 hooks。
- **关联**：extends common/testing；显式引用 web/performance（CWV 目标）；与 web/design-quality（视觉状态验收）协同。

---

## 五、场景 → 规则导航

> 规则无需主动调用，下表帮你在不同场景下知道"此刻哪些规则正在约束你"。

### 场景 1：开始一个新功能
→ `common/development-workflow`（六阶段主流程）→ 第 0 步研究复用看 `common/patterns`（skeleton 评估）→ 规划 / TDD / 审查阶段分别调 `common/agents`、`common/testing`、`common/code-review`。

### 场景 2：写代码时（按语言自动激活）

| 你在写 | 自动激活的规则 |
|---|---|
| `.py` / `.pyi` | common 全族 + python 全族 |
| `.ts` / `.tsx` / `.js` / `.jsx` | common 全族 + typescript 全族 |
| `.vue` | common 全族 + vue 全族 |
| 前端通用（无特定扩展名） | common 全族 + web 全族（靠主题） |
| FastAPI（app / fastapi / *_api.py） | 上面 python 规则 + python/fastapi |

### 场景 3：代码写完要审查
→ `common/code-review`（审查清单 / 四级严重度 / 工作流）→ 安全敏感代码触发 `common/security` + 对应语言 security → 用 `common/agents` 里的 reviewer 分工。

### 场景 4：写测试
→ `common/testing`（80% + TDD + AAA）→ 按语言加 typescript / python / vue / web 的 testing（Playwright / pytest / Vitest / 视觉回归）。

### 场景 5：提交与 PR
→ `common/git-workflow`（commit 格式 + PR 流程）← 属于 development-workflow 的第 4 阶段。

### 场景 6：调性能
→ `common/performance`（模型 / context / thinking）→ 前端再加 `web/performance`（CWV / bundle）。

### 场景 7：委托 agent
→ `common/agents`（选择映射 / 并行 / 委托完成约定 / 多视角）。

### 场景 8：配 hooks
→ `common/hooks`（三类型 / permissions.allow / TodoWrite）→ 按语言加对应 hooks（工具链配置）。

### 场景 9：写 FastAPI
→ python 全族 + `python/fastapi`（结构 / async / DI / schema / 安全 / 测试）。

### 场景 10：写前端 UI
→ web 全族，尤其 `web/design-quality`（反模板 / 必备品质）+ `web/coding-style`（token / 动画）。

---

## 六、检查清单总表（master checklist）

把散落各规则的检查点聚合成一份可执行清单。

**提交前必过（来自 common/security + common/code-review）**
- [ ] 无硬编码密钥 / 凭证
- [ ] 用户输入已校验
- [ ] SQL 注入防护（参数化查询）
- [ ] XSS 防护（HTML 净化）
- [ ] CSRF 保护已启用
- [ ] 认证 / 授权已验证
- [ ] endpoint 启用 rate limiting
- [ ] 错误信息不泄露敏感数据

**代码质量（来自 common/coding-style + common/code-review）**
- [ ] 函数 <50 行、文件 <800 行、嵌套 <4 层
- [ ] 错误显式处理，无静默吞错
- [ ] 无 magic number、无 console.log / print
- [ ] 遵循不可变性（无 mutation）
- [ ] 命名规范（camelCase / PascalCase / UPPER_SNAKE_CASE）

**测试（来自 common/testing）**
- [ ] 覆盖率 ≥80%
- [ ] 含单元 / 集成 / E2E 三层
- [ ] 遵循 AAA 结构与描述性命名

**前端额外（来自 web/*）**
- [ ] CWV 达标（LCP<2.5s / INP<200ms / CLS<0.1）
- [ ] bundle 在预算内
- [ ] 配置 CSP 与安全头
- [ ] 非默认模板观感（design-quality 4+ 项品质）

**Git（来自 common/git-workflow）**
- [ ] commit 符合 `<类型>: <描述>` 格式
- [ ] PR 含完整摘要与带 TODO 的测试计划

---

## 七、速查索引

从"我想做什么"→ 该遵循哪些规则：

- **写新功能**：development-workflow · patterns · agents
- **编码风格**：coding-style（+ 对应语言族）
- **审查**：code-review · security（+ 语言族 security）
- **测试**：testing（+ 语言族 testing）
- **提交 / PR**：git-workflow
- **性能**：performance · web/performance
- **委托 agent**：agents
- **配 hooks**：hooks（+ 语言族 hooks）
- **设计模式**：patterns（+ 语言族 patterns）
- **FastAPI**：python/fastapi
- **前端 UI**：web/design-quality · web/coding-style · web/performance
- **安全**：security（+ 语言族 security）· web/security

---

*本指南基于 `rules/` 下 33 个规则文件的用途、激活机制、核心约束与相互引用关系整理。每条规则的完整条款请参阅各规则文件本身。*

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
