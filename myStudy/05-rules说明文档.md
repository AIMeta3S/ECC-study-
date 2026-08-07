# ECC rules 机制完整解读

> 解读对象：[rules/](../rules/) 目录（共 22 个子目录、121 个 `.md` 文件）
> 权威说明：[rules/README.md](../rules/README.md)（结构 / 安装 / 优先级 / Rules vs Skills）
> 配套安装器：[install.sh](../install.sh) → [scripts/install-apply.js](../scripts/install-apply.js)
> 风格基准：同系列 [04-hook说明文档.md](04-hook说明文档.md)

---

## 一、概述与定位

### 1. rules 是什么

rules 是 ECC 给 Claude Code 的**必须遵守的规范层** —— 一组按语言 / 框架分目录组织的 `.md` 文件，定义"做什么、不做什么"的标准与检查清单（如"80% 覆盖率"、"禁止硬编码密钥"、"函数 < 50 行"）。它们被安装进 `~/.claude/rules/` 后，由 Claude Code 原生的规则加载机制注入上下文，对模型行为形成持续约束。

在 ECC 五大组件中的定位：

| 组件 | 目录 | 性质 | 作用 |
|---|---|---|---|
| **Rules** | [rules/](../rules/) | 规范层 | 标准、约定、检查清单（**做什么**） |
| Skills | [skills/](../skills/) | 知识层 | 深度可操作参考（**怎么做**） |
| Agents | [agents/](../agents/) | 执行层 | 委派给有限作用域的子代理 |
| Hooks | [hooks/](../hooks/) | 自动化层 | 工具事件触发的硬约束 |
| Commands | [commands/](../commands/) | 入口层 | 斜杠命令兼容层 |

### 2. Rules vs Skills（核心分工）

[rules/README.md](../rules/README.md) 明确：

> - **Rules** define standards, conventions, and checklists that apply broadly.
> - **Skills** provide deep, actionable reference material for specific tasks.
> - Rules tell you _what_ to do; skills tell you _how_ to do it.

几乎所有语言规则文件结尾都有 `See skill: xxx`，把"深度操作手册"指向 [skills/](../skills/) 下对应 SKILL.md。例如 [rules/rust/patterns.md](../rules/rust/patterns.md) 引用 `rust-patterns` skill，[rules/php/patterns.md](../rules/php/patterns.md) 引用 `laravel-patterns` skill。

### 3. README 描述与实际仓库的差异（重要）

仓库根 [README.zh-CN.md](../README.zh-CN.md) 只列了 `common / typescript / python / golang / swift / php` 共 **6 个** rules 目录，但实际 [rules/](../rules/) 下有 **22 个**目录、121 个文件。本文档以**实际仓库**为准。

实际目录全景（22 个）：

| 类别 | 目录 | 数量 |
|---|---|---|
| 通用层 | [common](../rules/common/) | 1 |
| 主流后端语言 | typescript、python、golang、java、kotlin、rust、swift、cpp | 8 |
| 其他语言 | csharp、fsharp、php、ruby、perl、dart、arkts | 7 |
| 前端框架 | react、vue、angular、nuxt、web、react-native | 6 |

### 4. 一句话定位

> rules 是一套**双层（common always + 语言/框架 paths 条件）+ 路径触发**的分层规范系统：通用原则常驻上下文，语言/框架规则按你正在编辑的文件类型按需注入，冲突时"特定覆盖通用"。

---

## 二、核心运行机制

### 1. 双层架构：common（always）+ 语言/框架（条件加载）

这是 rules 机制的设计精髓。通过对 121 个文件 frontmatter 的全量扫描，存在两种截然不同的加载策略：

| 层 | 目录 | frontmatter | 加载方式 | 文件数 |
|---|---|---|---|---|
| **common 层** | [common/](../rules/common/) | **无** | **always 常驻**（无触发条件，每次会话都在上下文） | 10 |
| **语言/框架层** | 其余 21 个目录 | 有 `paths:` | **按 glob 条件加载**（编辑匹配文件时才注入） | 111 |

> 例外：[web/](../rules/web/) 7 个文件也**无 frontmatter**，但它不在 common，定位是"通用前端参考"，需手动引用，不会自动路径触发（详见第五节）。

为什么这么设计？
- **common 层**承载普适原则（不可变性、TDD、安全清单等），不依赖任何文件触发，永远生效——这是所有项目的基线。
- **语言层**通过 `paths` 实现"按需触发"，避免无关语言规则污染上下文（写 Go 时不会加载 Rust 规则）。

### 2. frontmatter 的真实字段是 `paths`（不是 globs）

Claude Code 官方插件文档常见 `globs` / `name` / `description` 字段，但 ECC 的 rules **统一用单一字段 `paths`**，值是 glob 字符串数组。这是该仓库的统一约定。

示例 —— [rules/python/coding-style.md](../rules/python/coding-style.md) 开头：

```yaml
---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Coding Style
> This file extends [common/coding-style.md](../common/coding-style.md) with Python specific content.
```

加载语义：当 Claude Code 正在编辑/读取的文件路径命中 `paths` 中**任一** glob 时，该 rule 文件被注入上下文。

### 3. 安装与物理路径

rules 不靠 [CLAUDE.md](../CLAUDE.md) 的 `@import` 拉取，而是靠**安装脚本把文件物理复制**进 Claude Code 的规则目录，再由原生机制接管。

**安装入口**：[install.sh](../install.sh) 是薄壳，解析根目录后 `exec node scripts/install-apply.js`。实际逻辑在 [scripts/install-apply.js](../scripts/install-apply.js)，其 help 文本定义了两种目标：

```
claude         (default) - 安装到 ~/.claude/，rules/skills 托管在 rules/ecc 和 skills/ecc 下
claude-project           - 安装到 ./.claude/（项目级），同样托管在 rules/ecc 下
```

**三种安装方式**（来自 [rules/README.md](../rules/README.md)）：

```bash
# 方式 1：安装脚本（按需选语言）
./install.sh typescript python

# 方式 2：手动安装到用户级 ECC 命名空间
mkdir -p ~/.claude/rules/ecc
cp -r rules/common     ~/.claude/rules/ecc/
cp -r rules/typescript ~/.claude/rules/ecc/   # 按技术栈选

# 方式 3：项目级
mkdir -p .claude/rules/ecc
cp -r rules/common     .claude/rules/ecc/
```

关键约束：
- 使用 `rules/ecc/` 这个**独立命名空间**，避免与非 ECC 规则包冲突。
- `CLAUDE_RULES_DIR` 环境变量可覆盖规则目录位置（见 [scripts/install-apply.js](../scripts/install-apply.js)）。
- ⚠️ **必须整目录拷贝，不能 `/*` 拍平**——common 与语言目录里有同名文件（如都叫 `coding-style.md`），拍平会让语言文件覆盖 common 文件，并破坏语言文件里 `../common/xxx.md` 的相对引用。

### 4. 优先级：specific overrides general

[rules/README.md](../rules/README.md) 的 "Rule Priority" 节明确：冲突时**语言特定规则优先于 common**，类比 CSS 特异性或 `.gitignore` 优先级。

- [rules/common/](../rules/common/) 定义适用于所有项目的通用默认值。
- [rules/golang/](../rules/golang/)、[rules/python/](../rules/python/) 等在语言惯用法不同处覆盖默认值。

**实例**：[common/coding-style.md](../rules/common/coding-style.md) 推荐"不可变性"为默认原则；[golang/coding-style.md](../rules/golang/coding-style.md) 可声明"Go 惯用的指针接收器突变优先于此处的不可变性"。

common 中可能被覆盖的规则会显式标注：

> **Language note**: This rule may be overridden by language-specific rules for languages where this pattern is not idiomatic.

### 5. 标准 5 文件矩阵 + 扩展声明 + skill 引用

所有 21 个语言/框架目录都严格遵循同一套文件骨架（对应 common 同名文件并显式声明扩展关系）：

| 文件 | 职责 | common 对应 |
|---|---|---|
| `coding-style.md` | 格式工具、命名、不可变性、错误处理 | [common/coding-style.md](../rules/common/coding-style.md) |
| `patterns.md` | 语言级设计模式（Repository、DI、状态机等） | [common/patterns.md](../rules/common/patterns.md) |
| `testing.md` | 测试框架、组织、覆盖率、命名 | [common/testing.md](../rules/common/testing.md) |
| `security.md` | 密钥管理、SQL 注入、输入校验、扫描工具 | [common/security.md](../rules/common/security.md) |
| `hooks.md` | PostToolUse 自动化（格式化 / lint / 类型检查） | [common/hooks.md](../rules/common/hooks.md) |

每个文件都遵守两个固定约定：

1. **首行扩展声明**（blockquote）：
   > `This file extends [common/xxx.md](../common/xxx.md) with <Language> specific content.`
   
   建立显式的分层链接，配合优先级规则形成逻辑层级。

2. **结尾 skill 引用**：
   > `See skill: rust-patterns` / `See skill: laravel-tdd`
   
   把深度操作手册指向 [skills/](../skills/)。

> **特例**：[rules/react/hooks.md](../rules/react/hooks.md) 讲的是 **React 框架的 hooks**（useState/useEffect 等），**不是** Claude Code 运行时 hook 系统，文件开头专门加了一段澄清说明以消歧义。这是 121 个文件中唯一名称歧义者。

### 6. paths 的四类触发策略

不同目录的 `paths` 呈现四种截然不同的触发策略（这是语言目录与前端框架目录的核心差异）：

| 策略 | 代表目录 | 特征 |
|---|---|---|
| **A. 按语言扩展名** | csharp(`*.cs`)、fsharp(`*.fs`)、php(`*.php`)、ruby(`*.rb`)、perl(`*.pl/.pm`)、dart(`*.dart`)、typescript(`*.ts/.tsx`) | 匹配该语言源文件 + 包管理配置（composer.json / Gemfile / pubspec.yaml 等） |
| **B. 按框架扩展名** | vue(`*.vue`)、arkts(`*.ets/.ts`)、swift(`*.swift`)、rust(`*.rs`)、golang(`*.go`) | 匹配框架/语言专属扩展名 + 构建清单（Package.swift / Cargo.toml / go.mod） |
| **C. 按框架命名/目录约定** | react、angular、nuxt | 不仅看扩展名，还看 Angular CLI 角色后缀、Next.js/Nuxt 目录约定、自定义 hook 文件名模式 |
| **D. 无 frontmatter** | common（always）、web（不自动触发） | common 永远生效；web 需手动引用 |

还有一个极端：[rules/react-native/](../rules/react-native/) 8 个文件 `paths` **完全相同**（`**/*.ts`, `**/*.tsx`），触发条件最宽泛——碰任何 TS/TSX 就全部加载（因 RN 项目几乎所有代码都是 `.ts/.tsx`）。

### 7. 与 CLAUDE.md / RULES.md / 记忆系统的关系

| 文件 | 位置 | 定位 | 加载 |
|---|---|---|---|
| [CLAUDE.md](../CLAUDE.md) | 仓库根 | 项目主记忆，总览一切；把 rules 描述为 "Always-follow guidelines" | always（一级项目记忆） |
| `~/.claude/rules/ecc/common/*.md` | 安装目录 | 模块化拆分的 always 规则 | always（common 层） |
| `~/.claude/rules/ecc/<lang>/*.md` | 安装目录 | 条件规则 | 按 `paths` glob 触发 |
| [RULES.md](../RULES.md) | 仓库根 | 给人看的 Must Always / Must Never 摘要 | **不参与自动加载** |

层级关系：`CLAUDE.md`（总览） + `.claude/rules/ecc/common/`（always 模块化规则） + `.claude/rules/ecc/<lang>/`（条件规则）。这等于把传统"塞进一个大 CLAUDE.md"的做法，拆成了模块化、文件粒度、可条件加载的规则系统。

---

## 三、common/ 通用规则层（10 个文件详解）

[rules/common/](../rules/common/) 是所有项目**必装**的通用原则层，10 个文件**全部无 frontmatter → always 常驻上下文**，承载语言无关的基线规范。

> 注意：README 的目录树只列了 8 个 common 文件，实际是 **10 个**（多出 `code-review.md` 和 `development-workflow.md`）。

| 文件 | 核心主题 |
|---|---|
| [coding-style.md](../rules/common/coding-style.md) | 编码风格核心原则 |
| [testing.md](../rules/common/testing.md) | 测试要求与 TDD |
| [code-review.md](../rules/common/code-review.md) | 代码审查标准与分级 |
| [development-workflow.md](../rules/common/development-workflow.md) | 特性开发全流程 |
| [git-workflow.md](../rules/common/git-workflow.md) | 提交规范与 PR 流程 |
| [security.md](../rules/common/security.md) | 安全检查清单 |
| [agents.md](../rules/common/agents.md) | 子代理编排 |
| [patterns.md](../rules/common/patterns.md) | 通用设计模式 |
| [performance.md](../rules/common/performance.md) | 模型选型与上下文管理 |
| [hooks.md](../rules/common/hooks.md) | Hook 系统与 TodoWrite |

### 1. coding-style.md

- **作用**：所有语言的编码风格基线。
- **核心要点**：
  - **不可变性（CRITICAL）**：永远创建新对象，不修改原对象（附 WRONG vs CORRECT 伪代码对比）。
  - **三原则**：KISS（最简方案）、DRY（抽取重复逻辑）、YAGNI（不做投机性抽象）。
  - **文件组织**：多小文件优于少大文件；200–400 行典型，**800 行上限**；按 feature/domain 而非 type 组织。
  - **命名约定**：变量/函数 camelCase、布尔值加 `is/has/should/can` 前缀、类型 PascalCase、常量 UPPER_SNAKE_CASE、hooks 加 `use` 前缀。
  - **错误处理**：在系统边界做校验、显式处理错误、永不静默吞错。
  - **代码异味**：深嵌套（>4 层用早返回）、魔术数字（用命名常量）、长函数（>50 行拆分）。
- **触发**：always（无 frontmatter）。会被 golang 等语言的"指针接收器突变"覆盖。

### 2. testing.md

- **作用**：测试要求的统一基线。
- **核心要点**：
  - **最低覆盖率 80%**，Unit / Integration / E2E 三类全部要求。
  - **TDD 强制流程**：RED（先写测试并失败）→ GREEN（最小实现通过）→ IMPROVE（重构）→ 验证覆盖率。
  - **AAA 模式**：Arrange-Act-Assert。
  - **测试命名**：用描述行为的长句。
  - 失败排查优先用 `tdd-guide` 代理；改实现而非改测试。
- **触发**：always。各语言 `testing.md` 给出具体框架（pytest / JUnit5 / cargo test 等）。

### 3. code-review.md

- **作用**：代码审查的触发时机、清单与严重度分级。
- **核心要点**：
  - **强制审查触发点**：写/改代码后、提交共享分支前、安全敏感代码、架构变更、合并 PR 前。
  - **审查前要求**：CI 通过、冲突解决、分支最新。
  - **清单**：函数 <50 行、文件 <800 行、嵌套 <4 层、无硬编码密钥、覆盖率 ≥80%。
  - **严重度分级**：CRITICAL（阻止合并）/ HIGH（警告）/ MEDIUM（建议）/ LOW（可选）。
  - **安全触发器**：遇到认证、用户输入、数据库查询、加密、支付等必须停并用 `security-reviewer` 代理。
- **触发**：always。文末交叉引用 testing / security / git-workflow / agents。

### 4. development-workflow.md

- **作用**：补全 git 操作之前的完整开发流程（扩展 [git-workflow.md](../rules/common/git-workflow.md)）。
- **核心要点**：
  - **第 0 步 Research & Reuse（强制）**：先 `gh search repos` / `gh search code`，再查 Context7 / 官方文档，最后才用 Exa；查包注册表（npm/PyPI/crates.io），优先采用成熟实现而非手写。
  - **五步流程**：Plan（planner 代理）→ TDD（tdd-guide 代理）→ Code Review（code-reviewer 代理）→ Commit & Push → Pre-Review Checks。
- **触发**：always。

### 5. git-workflow.md

- **作用**：提交信息规范与 PR 流程。
- **核心要点**：
  - 提交格式：`<type>: <description>`，type 含 feat/fix/refactor/docs/test/chore/perf/ci。
  - attribution 全局禁用（通过 `~/.claude/settings.json`）。
  - PR 流程：分析完整 commit 历史、`git diff base...HEAD`、写综合摘要、附测试计划。
- **触发**：always。

### 6. security.md

- **作用**：提交前强制安全检查清单与响应协议。
- **核心要点**：
  - **提交前清单**：无硬编码密钥、输入已校验、SQL 注入/XSS/CSRF 防护、认证授权、限流、错误信息不泄漏敏感数据。
  - **密钥管理**：永不硬编码、用环境变量或密钥管理器、启动时校验、泄漏即轮换。
  - **响应协议**：发现问题→立即停止→用 `security-reviewer` 代理→修 CRITICAL→轮换密钥→全代码库排查同类问题。
- **触发**：always。

### 7. agents.md

- **作用**：子代理调度时机与并行编排原则。
- **核心要点**：
  - 列出 `~/.claude/agents/` 下 11 个可用代理（planner、architect、tdd-guide、code-reviewer、security-reviewer、build-error-resolver、e2e-runner、refactor-cleaner、doc-updater、rust-reviewer、harmonyos-app-resolver 等）。
  - **即时调度（无需用户提示）**：复杂特性→planner、刚写完代码→code-reviewer、修 bug/新特性→tdd-guide、架构决策→architect。
  - **强制并行**：独立操作必须并行启动多代理，而非串行。
  - **多视角分析**：复杂问题用分裂角色子代理（事实审查、资深工程师、安全专家、一致性审查、冗余检查）。
- **触发**：always。

### 8. patterns.md

- **作用**：语言无关的通用设计模式。
- **核心要点**：
  - **骨架项目**：实现新功能先找成熟骨架，用并行代理做安全/扩展性/相关性评估，克隆最佳匹配再迭代。
  - **Repository 模式**：数据访问封装于统一接口（findAll/findById/create/update/delete），业务逻辑依赖抽象接口。
  - **API 响应封装**：统一信封——success 状态 + data + error message + 分页元数据（total/page/limit）。
- **触发**：always。

### 9. performance.md

- **作用**：模型选型、上下文窗口管理、扩展思考。
- **核心要点**：
  - **模型选型**：Haiku（轻量代理、省 3 倍成本）、Sonnet（主力开发、编排）、Opus（最深推理、架构决策）。默认 Sonnet 覆盖 90% 编码任务。
  - **上下文窗口管理**：避免在上下文末 20% 做大规模重构/多文件特性/复杂调试。
  - **扩展思考**：默认开启，预留 31999 tokens；`MAX_THINKING_TOKENS` 预算、Ctrl+O verbose。
  - 构建失败用 `build-error-resolver` 代理，增量修复。
- **触发**：always。

### 10. hooks.md

- **作用**：Hook 系统认知与 TodoWrite 最佳实践（注意：这里的 hooks 指 Claude Code 运行时 hook，详见 [04-hook说明文档.md](04-hook说明文档.md)）。
- **核心要点**：
  - **三种 Hook**：PreToolUse（校验/改参数）、PostToolUse（自动格式化/检查）、Stop（结束前终检）。
  - **自动接受权限**：谨慎使用，探索性工作禁用，永不用 `dangerously-skip-permissions`，改用 `~/.claude.json` 的 `allowedTools`。
  - **TodoWrite 最佳实践**：跟踪多步任务、验证理解、实时引导、暴露乱序/缺失/多余/粒度问题。
- **触发**：always。

---

## 四、语言特定规则层（15 个目录）

### 1. 共性结构

15 个语言目录共 76 个文件（python 6 个，其余 14 个各 5 个），全部严格遵循"标准 5 文件矩阵 + extends 声明 + skill 引用"。每个 `hooks.md` 都指 Claude Code 运行时 PostToolUse/Stop hook 配置，统一包含三类工具：

- **Formatter**：Prettier / black / gofmt / clang-format / rustfmt / SwiftFormat / ktlint / google-java-format / dotnet format / fantomas / perltidy / dart format
- **Linter/Type Checker**：tsc / mypy / go vet / clippy / SwiftLint / detekt / checkstyle / clang-tidy / PHPStan / RuboCop / perlcritic / dart analyze
- **Compile check**：`cargo check` / `swift build` / `./gradlew build` / `./mvnw compile` / `dotnet build` / `hvigorw`（按语言）

### 2. 全目录总览表

| 目录 | 文件数 | 核心 paths（源码 + 构建/配置） | 特色文件 | 主要引用 skill |
|---|---|---|---|---|
| [typescript](../rules/typescript/) | 5 | `*.ts/.tsx/.js/.jsx` | — | typescript-lsp |
| [python](../rules/python/) | 6 | `*.py/.pyi` | **fastapi.md**（框架层） | python-patterns/testing、django-security |
| [golang](../rules/golang/) | 5 | `*.go` + `go.mod/go.sum` | — | golang-patterns/testing |
| [java](../rules/java/) | 5 | `*.java` + `pom.xml/build.gradle`（hooks） | — | springboot-*/quarkus-*/jpa-patterns |
| [kotlin](../rules/kotlin/) | 5 | `*.kt/.kts` + `build.gradle.kts`（hooks） | — | kotlin-coroutines-flows、android-clean-architecture |
| [rust](../rules/rust/) | 5 | `*.rs` + `Cargo.toml`（hooks） | — | rust-patterns/testing |
| [swift](../rules/swift/) | 5 | `*.swift` + `Package.swift` | — | swift-actor-persistence、swift-protocol-di-testing |
| [cpp](../rules/cpp/) | 5 | 6 种扩展名 + `CMakeLists.txt` | — | cpp-coding-standards/testing |
| [csharp](../rules/csharp/) | 5 | `*.cs/.csx` + `*.csproj/.sln`（hooks） | — | — |
| [fsharp](../rules/fsharp/) | 5 | `*.fs/.fsx` + `*.fsproj/.sln`（hooks） | — | — |
| [php](../rules/php/) | 5 | `*.php` + `composer.json` | — | backend-patterns、laravel-*、api-design |
| [ruby](../rules/ruby/) | 5 | `*.rb/.rake` + `Gemfile/.gemspec/config.ru` | — | — |
| [perl](../rules/perl/) | 5 | `*.pl/.pm/.t/.psgi/.cgi` | — | perl-patterns/security/testing |
| [dart](../rules/dart/) | 5 | `*.dart` + `pubspec.yaml` | — | flutter-dart-code-review |
| [arkts](../rules/arkts/) | 5 | `*.ets/.ts` + `module.json5` 等 | — | — |

### 3. 各语言目录差异详述

> 下方只讲**该语言相对 common 的差异与特色**；与 common 重复的 5 文件骨架职责不再赘述。

#### typescript

- **coding-style.md**：公开 API 必须显式类型注解，局部类型让 TS 推断；`interface` 用于可扩展对象形状、`type` 用于联合/交叉/工具类型；**字符串字面量联合优于 `enum`**；禁用 `any`，外部输入用 `unknown` 后安全收窄；不可变更新（spread + `Readonly<T>`）；用 **Zod** 做 schema 校验并推断类型。
- **hooks.md**：PostToolUse 配 Prettier 自动格式化、`tsc` 类型检查、`console.log` 警告；Stop 钩子做会话结束前的 console.log 审计。

#### python（唯一有 6 个文件的语言）

- **coding-style.md**：遵循 PEP 8；所有函数签名加类型注解；优先不可变（`@dataclass(frozen=True)`、`NamedTuple`）；工具链 black + isort + ruff。
- **security.md**：`os.environ["KEY"]` 缺失抛 KeyError；bandit 静态安全扫描。
- **fastapi.md**（**框架级扩展，python 独有**）：
  - **paths 更精细**：`**/app/**/*.py`、`**/fastapi/**/*.py`、`**/*_api.py`——是路径形态而非纯扩展名。
  - 内容：`create_app()` 工厂；router 保持薄、业务下沉到 service/CRUD；async endpoint 内禁用同步 `requests`/同步 SQLAlchemy；`Depends` 依赖注入；响应 schema 独立于请求 schema 且绝不能包含密码/token；CORS 不得 wildcard + credentials 同时启用。
  - **意义**：暗示"语言层之下还可以再分框架层"的扩展点。

#### golang

- 所有文件 paths 统一含 `**/go.mod`、`**/go.sum`（模块清单）。
- **coding-style.md**：gofmt + goimports 强制（无风格争议）；"accept interfaces, return structs"；接口保持 1-3 方法；错误用 `fmt.Errorf("...: %w", err)` 包装。
- **patterns.md**：Functional Options 模式（`WithPort` / `NewServer(opts ...Option)`）；小接口在使用处定义而非实现处。
- **testing.md**：标准 `go test` + table-driven tests；必带 `-race` 标志；`go test -cover` 覆盖率。

#### java（内容最详尽的语言之一）

- **coding-style.md**（篇幅最长）：google-java-format / Checkstyle；强不可变（`record`、`final` 字段、`List.copyOf()`）；现代特性清单（records、sealed classes、pattern matching for instanceof、text blocks、switch expressions，逐项标注引入版本）；`Optional<T>` 规则（仅作返回类型、禁止做字段/参数、禁裸 `get()`）；流保持短（3-4 步）。
- **hooks.md**：paths 额外含 `pom.xml` / `build.gradle` / `build.gradle.kts`；跑 `./mvnw compile` 或 `./gradlew compileJava` 编译验证。
- **patterns.md**：Repository 接口、Service 层、**强制构造器注入禁字段注入**、Record DTO 映射、Builder、Sealed 类型领域建模。
- **testing.md**：JUnit 5 + AssertJ + Mockito + Testcontainers；`@ParameterizedTest` + `@CsvSource`；`@Testcontainers` 集成测试；JaCoCo 80%+ 覆盖率。

#### kotlin（覆盖 Android/KMP，同样详尽）

- **coding-style.md**：ktlint/Detekt；默认 `val` 禁 `var`；接口不加 `I` 前缀；**严禁 `!!`**，用 `?:`/`requireNotNull`；sealed + 穷尽 `when`（禁 `else`）；错误用 `Result<T>`/`runCatching` 且绝不吞 `CancellationException`。
- **patterns.md**（最丰富）：DI 用 Koin（KMP）或 Hilt（Android）；ViewModel 单一状态单向数据流；Repository 用 `suspend` + `Result<T>` + `Flow`；UseCase 用 `operator fun invoke`；KMP 的 `expect/actual`；协程作用域规则。
- **testing.md**：**Turbine 测 Flow**；`kotlinx-coroutines-test` 的 `runTest`；**优先手写 Fake 胜过 Mock**。

#### rust（内容最完整的语言之一）

- **coding-style.md**（篇幅最长）：rustfmt + clippy（`-D warnings`）；默认 `let` 不可变、用 `Cow<'_, T>` 避免无谓分配；所有权——默认借用 `&T`、参数收 `&str` 而非 `String`、构造器用 `impl Into<String>`；错误处理库用 `thiserror`、应用用 `anyhow` + `.with_context()`。
- **patterns.md**：trait 仓储（`pub trait OrderRepository: Send + Sync`）；**Newtype 模式**防参数混淆（`struct UserId(u64)`）；枚举状态机"让非法状态无法表达"；**Sealed Trait** 控制可扩展性。
- **security.md**（极详尽）：`std::env::var` + 早失败；sqlx 参数化查询；**Parse, don't validate** 用类型系统强制不变量；`unsafe` 块必须配 `// SAFETY:` 注释；`cargo audit` + `cargo deny check`。
- **testing.md**：`#[test]` + `#[cfg(test)]` 模块内嵌单测、`tests/` 集成测试、`benches/` Criterion；rstest 参数化、proptest 属性测试、`#[tokio::test]` 异步测试；`cargo llvm-cov --fail-under-lines 80`。

#### swift（相对精简）

- 所有文件 paths 统一含 `**/Package.swift`。
- **coding-style.md**：SwiftFormat + SwiftLint；优先 `let`、`struct` 值语义；Swift 6 typed throws；启用严格并发检查，优先 `Sendable` 值类型 + Actor + 结构化并发。
- **security.md**：**Keychain Services 存敏感数据，禁用 UserDefaults**；`.xcconfig` 管构建期密钥；App Transport Security 默认启用且禁关闭。
- **testing.md**：用新版 **Swift Testing**（`import Testing`、`@Test`、`#expect`）而非 XCTest。

#### cpp（扩展名最多的语言）

- 所有文件 paths 统一含 6 种源/头扩展名（`*.cpp/.hpp/.cc/.hh/.cxx/.h`）+ `**/CMakeLists.txt`。
- **coding-style.md**：现代 C++（C++17/20/23）；**RAII everywhere**，禁裸 `new`/`delete`，用 `std::make_unique`/`make_shared`；clang-format 强制。
- **hooks.md**：章节叫 "Build Hooks"（与其他语言略不同）；clang-format dry-run、clang-tidy、cmake build、ctest；给出推荐 CI 流水线 5 步（format → clang-tidy → cppcheck → cmake build → ctest with sanitizers）。
- **security.md**：禁裸 `new`/`delete`/C 数组/`malloc`/`reinterpret_cast`；`.at()` 边界检查；UB 防范；CI 必带 ASan+UBSan `-fsanitize=address,undefined`。

#### csharp / fsharp（.NET 双语言，结构镜像）

- **csharp**：启用 nullable 引用类型；优先 `record`/`record struct` 建不可变值对象；`async/await` 优先于 `.Result/.Wait()`，公共异步 API 透传 `CancellationToken`；`dotnet format`。hooks 额外含 `*.csproj/.sln/Directory.Build.props`。
- **fsharp**：默认不可变；可辨识联合（DU）建模领域、record 建模数据；`|>` 管道 + 模式匹配优先于 if/else；`Option/Result` 代替 null/异常；**计算表达式**（`result { }`/`task { }`）；用 record-of-functions 而非接口做 DI。
- 两者 security.md 都额外匹配 `**/appsettings*.json`（防泄密）；hooks.md 都警告提交 appsettings。

#### php

- 所有文件 paths 含 `**/composer.json`。
- **coding-style.md**：PSR-12 + `declare(strict_types=1)`；不可变 DTO/值对象（`readonly` 属性）；PHP-CS-Fixer/Pint + PHPStan/Psalm；抛异常而非返回 false/null。
- **patterns.md**：瘦控制器 + 显式 Service 层；DTO/值对象替代关联数组；引用 `backend-patterns`、`laravel-patterns`、`api-design` skills。
- **security.md**：额外含 `composer.lock`；`composer audit` 审依赖；引用 `laravel-security`。
- **testing.md**：额外含 `phpunit.xml`；PHPUnit 默认，Pest 已配置则用 Pest 不混用。

#### ruby（Rails 生态）

- paths 含 `*.rb/.rake` + `Gemfile/.gemspec/config.ru`。
- **coding-style.md**：Ruby 3.3+、生产环境测后再开 YJIT；`# frozen_string_literal: true`；Rails 8+ 用 `rubocop-rails-omakase`；用 `bin/rails`/`bin/rake` binstub。
- **patterns.md**：Rails Way 优先；多机生产用 PostgreSQL；Solid Queue vs Sidekiq 决策树；Hotwire 优先，复杂交互才上 SPA；Rails 8 认证生成器 vs Devise 决策。
- **security.md**：额外含 `Gemfile.lock` + `config/credentials*.yml.enc`；`bundle-audit`+`brakeman`；`html_safe/raw` 视为安全敏感代码。
- **testing.md**：额外含 `test/**` + `spec/**`；Minitest（默认栈）vs RSpec（已建立约定）不混用。

#### perl

- 所有文件 paths 统一为 5 个 Perl 扩展名（`*.pl/.pm/.t/.psgi/.cgi`）——唯一一个所有文件 paths 完全相同的语言目录。
- **coding-style.md**：`use v5.36`（启用 strict/warnings/say/签名）；用子程序签名而非解包 `@_`；Moo + `is => 'ro'` + `Types::Standard`；perltidy；perlcritic 严重级 3。
- **security.md**：CGI/_web 脚本开 `-T` **污点模式**；allowlist 正则 untaint；三参 open + `Cwd::realpath` 防路径穿越；列表形式 `system()` + IPC::Run3。
- **testing.md**：Test2::V0（非 Test::More）；`prove -l`；Devel::Cover 80%+。

#### dart（Flutter 生态）

- paths 含 `*.dart` + `pubspec.yaml` + `analysis_options.yaml`。
- **coding-style.md**：`dart format`（80 字符，多行尾逗号）；`final`/`const` 优先；避免 `!`；sealed class + 穷尽 switch；`await` 或 `unawaited()` 显式。
- **patterns.md**：Repository 接口；**BLoC/Cubit + Riverpod 两套状态管理范式**；`get_it` DI；Clean Architecture 分层（domain 禁依赖 Flutter）；GoRouter 导航；freezed 不可变状态。
- **security.md**：额外含 `AndroidManifest.xml` + `Info.plist`；`flutter_secure_storage`（Keychain/EncryptedSharedPreferences）；强制 HTTPS + `network_security_config.xml`；deep link 校验；`FLAG_SECURE` 防截屏。
- **testing.md**：flutter_test/dart:test + mockito/mocktail + bloc_test；Fakes over Mocks；测试类型表（Unit/Widget/Golden/Integration）。

#### arkts（HarmonyOS / ArkTS）

- paths 含 `*.ets/.ts` + 三个 HarmonyOS 配置（`module.json5`/`oh-package.json5`/`build-profile.json5`）。
- **coding-style.md**：ArkTS 是 **TS 严格子集**，列出大量禁用特性（禁 `any/unknown`、禁解构赋值、禁 `for...in`、禁 JSX、禁 `require()`/`export =`、禁 `#` 私有字段、禁映射类型等）；每文件一个 `@ComponentV2`；用 `hilog` 记录错误。
- **patterns.md**：**必须用状态管理 V2**（`@ComponentV2/@Local/@Param/@Event/@Provider/@Consumer/@Monitor/@Computed`），**V1 装饰器全部禁用**；**必须用 `Navigation`+`NavPathStack`**（禁 `@ohos.router`）；MVVM 架构；`LazyForEach` 大列表。
- **hooks.md**：`hvigorw assembleHap` 构建校验；**PreToolUse V1 装饰器守卫**（警告禁用 `@State/@Prop/@Link` 等 V1）。
- **testing.md**：额外含 `ohosTest/**`；`@ohos/hypium` 框架；`@ohos.UiTest` 的 `Driver`+`ON` 做 UI 测试。

---

## 五、前端框架规则层（6 个目录）

### 1. 与语言目录的核心差异

前端框架目录的 `paths` 触发方式与语言目录不同：**除匹配扩展名外，还大量依赖框架特定的文件命名约定和目录结构约定**作为触发条件。

| 策略 | 目录 | 触发依据 |
|---|---|---|
| 仅框架扩展名 | vue | 仅 `*.vue` |
| 框架扩展名 + 配置 | arkts | `*.ets/.ts` + HarmonyOS 配置 |
| **命名/目录约定** | react | `*.tsx` + `components/**` + `hooks/**` + `use-*` 文件名 |
| **角色后缀约定** | angular | `*.component.ts` / `*.service.ts` / `*.guard.ts` 等 |
| **配置 + 目录约定** | nuxt | `nuxt.config.*` / `app.vue` / `pages/**` / `middleware/**` |
| 无 frontmatter | web | 不自动触发 |
| 最宽泛 | react-native | 统一 `*.ts/.tsx`（碰任何 TS/TSX 全加载） |

### 2. 各框架目录详解

#### react（5 文件）

- **coding-style.md**：`.tsx` 含 JSX、`.ts` 纯逻辑；PascalCase 组件 + camelCase hook；优先 `type Props = {}`；禁类组件；**Server/Client Component 边界**（默认 Server，按需 `"use client"`）。paths 不仅按扩展名，还按 `components/**`、`hooks/**` 目录约定匹配。
- **hooks.md**（**讲 React hooks，非 CC 运行时 hook**）：Rules of Hooks 强制；`useEffect` 仅用于同步外部系统；依赖数组完备性；React 19 新 hook（`use()/useFormStatus/useOptimistic/useTransition`）。paths 额外含 `use-*.ts/tsx` 自定义 hook 文件名模式。
- **patterns.md**：Container/Presentational 分离；状态位置决策树；RSC 边界；Suspense+Error Boundary 配对。末尾"Out of Scope"明确 Next.js 深度模式和 React Native 是独立轨道，建议未来拆出独立 `rules/nextjs/`。
- **testing.md**：**仅匹配测试文件命名约定**（`.test/.spec` + `__tests__` 目录）；React Testing Library + Vitest/Jest；查询优先级（role→label→text→testid）；禁组件快照测试；覆盖率分层目标（util≥90%/hook≥85%/组件≥80%）。

#### vue（5 文件）

- coding-style/patterns/security/testing 四个文件 **paths 仅 `*.vue`**（最纯粹）。
- **coding-style.md**：强制 `<script setup lang="ts">` + Composition API（禁 Options API）；块顺序 script→template→style scoped；`ref` 主力；3.4+ `defineModel`；禁 `v-if`+`v-for` 同元素。
- **hooks.md**（CC 运行时 hook）：paths 含 `*.ts/.tsx`（因 Vue 项目含这些文件）；`vue-tsc --noEmit`（非 `tsc`，因要解析 SFC）；ESLint `eslint-plugin-vue`。
- **security.md**：`{{ }}`/`:attr` 自动转义，但 `v-html` 是直接 XSS 向量（用 DOMPurify）；`:href`/`:src` 不转义需校验 scheme。
- **patterns.md**：Composable 单元（`useXxx`，`MaybeRefOrGetter<T>`）；`defineModel<T>` 双向绑定；provide/inject 用 `InjectionKey<T>` 类型安全键；Pinia setup store。

#### angular（5 文件）

- **paths 按 Angular CLI 角色后缀匹配**：`*.component.ts`、`*.service.ts`、`*.directive.ts`、`*.pipe.ts`、`*.guard.ts`、`*.resolver.ts`、`*.module.ts`。
- **coding-style.md**：先查 Angular 版本；standalone 组件 + OnPush；`inject()` 代替构造函数注入；**Signals**（`signal/computed/linkedSignal/resource/effect`）；v17+ 块语法 `@for`/`@if` 必带 `track`。
- **patterns.md**：Smart/Dumb 分离；Service 拥有所有数据访问（组件禁直接用 HttpClient）；`resource()` 异步获取；`takeUntilDestroyed()` 清理订阅（禁手动 ngOnDestroy）；RxJS 操作符选择（switchMap/mergeMap/exhaustMap）。
- **testing.md**：**仅匹配 `*.spec.ts/.test.ts`**；`TestBed.configureTestingModule`；`fixture.componentRef.setInput()` 设 signal input；Angular CDK component harnesses 优先于 DOM 查询。

#### nuxt（5 文件）

- **paths 按 Nuxt 框架文件匹配**：`nuxt.config.*`、`app.config.*`、`app.vue`、`pages/**`、`layouts/**`、`middleware/**`。
- **coding-style.md**：默认 `srcDir` 是 `app/`；自动导入纪律（禁手动 import `useFetch/useState/navigateTo`）；`definePageMeta` 是编译时宏；三配置文件分离（`nuxt.config.ts` 构建时 / `runtimeConfig` 运行时 env / `app.config.ts` 公共构建固定）。
- **patterns.md**：数据获取选择（`useFetch` SSR-safe 首屏 / `useAsyncData` 自定义异步 / `$fetch` 仅客户端事件）；`useState` SSR-safe 共享（**禁 `export const x = ref()` 模块作用域——SSR 跨请求泄漏**）。
- **security.md**：`runtimeConfig.public` 进每个 page payload（密钥禁放）；h3 校验读取器（`readValidatedBody` + Zod）；SSRF 防护（pin `apiBase`、拒用户绝对 URL）。
- **testing.md**：`@nuxt/test-utils`；`mountSuspended`/`renderSuspended`/`mockNuxtImport`/`registerEndpoint`。

#### web（7 文件 —— **全部无 frontmatter**）

⚠️ **特殊**：[rules/web/](../rules/web/) 7 个文件全部无 frontmatter，**不会被自动路径触发**，需手动引用或作为通用前端参考。这是与 common（也无 fm 但 always）的关键区别——web 不在 common，不自动加载。

| 文件 | 核心要点 |
|---|---|
| coding-style.md | 按 feature 组织目录；CSS 自定义属性做设计 token；只动画 transform/opacity/clip-path |
| **design-quality.md**（web 独有） | 反模板政策（禁默认卡片网格/stock hero/Tailwind 默认外观）；每前端表面须体现 10 项"必要品质"中至少 4 项；列举值得追求的风格（Editorial/Neo-brutalism/Glassmorphism/Bento 等） |
| hooks.md | PostToolUse 链（prettier→eslint→`timeout 60 tsc --noEmit --incremental`→stylelint）；PreToolUse 800 行文件大小守卫；Stop 跑 `pnpm build` |
| patterns.md | 复合组件/Render Props/Container-Presentational；URL 作为状态；SWR 数据获取 |
| **performance.md**（web 独有） | Core Web Vitals 目标（LCP<2.5s/INP<200ms/CLS<0.1）；JS/CSS bundle 预算；加载策略 |
| security.md | CSP（nonce-based 优先）；XSS 防护；第三方脚本 SRI；HTTPS 安全头 |
| testing.md | 优先级（视觉回归→a11y→性能→跨浏览器→响应式）；E2E 用 Playwright |

#### react-native（8 文件 —— 移动端特色 + 最宽触发）

⚠️ **8 个文件 paths 完全相同**（`**/*.ts`, `**/*.tsx`）——触发条件最宽泛，碰任何 TS/TSX 全部加载。

| 文件 | 核心要点 |
|---|---|
| coding-style.md | 禁 `React.FC`；保持 screen 瘦；选一种样式系统（`StyleSheet.create` 或 NativeWind）；平台差异用 `.ios.tsx`/`.android.tsx` |
| **accessibility.md**（RN 独有） | 每个交互元素必带 `accessibilityRole`+`accessibilityLabel`；最小触摸目标 44x44pt + `hitSlop`；Dynamic Type；WCAG AA 对比度 |
| hooks.md（CC 运行时） | `tsc --noEmit` + `npx expo lint`（SDK 53+ flat config）+ `prettier`；周期性 `expo-doctor` |
| patterns.md | Expo Router 文件路由；deep link 参数必 Zod 校验；FlatList/FlashList（禁 `.map()` 大数组在 ScrollView）；**警告不要在 RN 项目安装 `web/` 规则集** |
| **performance.md**（RN 独有） | `React.memo`/`useCallback` 仅防真实重渲染；FlatList 调优；`expo-image` 缓存；`react-native-reanimated` 优先；**New Architecture（Fabric+TurboModules）SDK 55+ 强制**；Hermes 启用 |
| **production-readiness.md**（RN 独有） | New Architecture 强制；EAS Build/Submit + 分 build profile；EAS Update OTA 仅 JS 改动；Sentry；发布前 gate 检查清单 |
| security.md | **bundle 视为公开**（二进制可被反编译，禁装真密钥）；`expo-secure-store`（Keychain/Keystore）存 token（禁 AsyncStorage/MMKV）；强制 HTTPS 考虑证书绑定 |
| testing.md | Jest + `jest-expo` + `@testing-library/react-native`；按 role/label 查询；Maestro（推荐）或 Detox 做 E2E；覆盖率继承 common 80% |

---

## 六、触发策略与设计模式汇总

### 1. 四类触发策略对比

| 策略 | 加载条件 | 代表 | 适用场景 |
|---|---|---|---|
| **always（无 fm）** | 无条件常驻 | common（10） | 普适基线，所有项目必装 |
| **A. 语言扩展名** | 匹配源码 + 包配置 | csharp/fsharp/php/ruby/perl/dart/typescript | 单一语言生态 |
| **B. 框架扩展名** | 匹配框架专属扩展名 + 构建清单 | vue/arkts/swift/rust/golang | 有专属扩展名的框架/语言 |
| **C. 命名/目录约定** | 匹配角色后缀或目录结构 | react/angular/nuxt | 前端框架（无专属扩展名，靠约定） |
| **D. 不自动触发（无 fm）** | 需手动引用 | web（7） | 通用参考，非强制 |
| **极端宽泛** | 碰任意 TS/TSX 全加载 | react-native | 项目内几乎所有文件同型 |

### 2. 文件扩展的"同心圆"规律

同一目录内，不同文件的 `paths` 范围有意识地区分：

- **内圈 · 源码文件**（coding-style / patterns）：通常只匹配语言扩展名。
- **外圈 · 构建/配置敏感文件**（hooks / security / testing）：额外匹配项目文件，确保编辑构建文件时也触发校验。

典型证据：

| 目录 | 内圈（源码） | 外圈（额外配置） |
|---|---|---|
| csharp | `*.cs/.csx` | hooks 加 `*.csproj/.sln/Directory.Build.props`；security 加 `appsettings*.json` |
| ruby | `*.rb/.rake` + Gemfile | security 加 `Gemfile.lock` + `config/credentials*.yml.enc`；testing 加 `test/**/spec/**` |
| php | `*.php` + composer.json | hooks 加 `phpstan.neon/psalm.xml`；testing 加 `phpunit.xml` |
| java | `*.java` | hooks 加 `pom.xml/build.gradle` |

### 3. 跨文件引用网络

rules 不是孤岛，形成三层引用：

```
            ┌─ 向上引用 common（首行 extends 声明）
语言/框架 .md ─┤
            ├─ 横向引用 skills（结尾 See skill: xxx）
            └─ 层间引用（react 同时引用 typescript/ + common/，因 React 建立在 TS 之上）
```

### 4. 内容详尽度的两极分化

同一机制下，rule 文件可"瘦"可"胖"：

- **重量级**（500+ 行，带完整代码示例）：java、kotlin、rust——多个子主题展开。
- **轻量级**（<60 行，只给方向 + 引 skill）：typescript/security.md、golang/*、swift/*。
- **中等**：cpp、python、csharp。

设计取向：rule 可以只声明规则 + 引 skill（瘦），也可以带可粘贴示例（胖），两种风格共存。

---

## 七、生命周期视图

一份 rule 文件从安装到生效的全流程：

```
[开发侧 · 仓库]
  rules/
    ├── common/      （10 文件，无 fm）
    └── <lang>/      （5 文件，有 paths fm）
          │
          ▼
[安装侧 · install.sh / install-apply.js]
  按技术栈选目录 → 物理拷贝（整目录，不拍平）
          │
          ├── ~/.claude/rules/ecc/common/     （用户级）
          └── ~/.claude/rules/ecc/<lang>/
          │    （或 .claude/rules/ecc/ 项目级；CLAUDE_RULES_DIR 可覆盖）
          ▼
[运行侧 · Claude Code 原生规则加载]
  会话启动
    │
    ├─ common/*.md（无 fm）──────────────────► always 注入上下文（基线常驻）
    │
    └─ <lang>/*.md（有 paths fm）── 用户编辑文件 ──► 路径匹配？
                                          │
                                    ┌─────┴─────┐
                                    否          是
                                    │           │
                                    │           ▼
                                    │     注入该 rule 进上下文
                                    │           │
                                    └─────┬─────┘
                                          ▼
[冲突仲裁]
  语言规则 vs common 冲突 ──► specific overrides general
  （语言规则胜；common 中可被覆盖者标注 Language note）
          │
          ▼
[深度延展]
  rule 结尾 "See skill: xxx" ──► 需"怎么做"时加载 skills/<xxx>/SKILL.md
```

---

## 八、使用建议与设计要点小结

### 1. 使用建议

- **必装 common**：所有项目都装 [rules/common/](../rules/common/)，它是基线。
- **按技术栈选语言目录**：只用你真正写的语言，避免无关规则占用上下文。
- **前端项目区分框架**：react/vue/angular/nuxt 各有独立目录，按实际框架装；RN 项目装 react-native（**勿装 web/**，RN patterns.md 明确警告）。
- **web/ 需手动引用**：它不自动触发，作为通用前端参考按需 `@` 引入。
- **整目录拷贝**：手动安装时务必整目录，切勿 `/*` 拍平。
- **新加语言**：照 [rules/README.md](../rules/README.md) 的 "Adding a New Language" 五步走（建目录 → 加 5 文件 → 首行 extends 声明 → 引 skill → 配 paths fm）。

### 2. 设计要点小结

1. **双层 + 路径触发**：common（always）+ 语言/框架（paths 条件）的分层配置系统，把传统"塞进一个大 CLAUDE.md"拆成模块化、文件粒度、可条件加载的规则。
2. **`paths` 而非 `globs`**：ECC 统一用 `paths` 字段做 glob 条件加载，common 与 web 无 fm 即 always / 不触发。
3. **specific overrides general**：语言特定规则覆盖 common 默认（类比 CSS 特异性），可被覆盖的 common 规则显式标注 Language note。
4. **标准 5 文件矩阵**：coding-style / patterns / testing / security / hooks，配 extends 声明 + skill 引用，形成高度一致的扩展骨架。
5. **四类触发策略**：语言扩展名 / 框架扩展名 / 框架命名·目录约定 / 无 fm。前端框架靠"角色后缀 + 目录约定"触发，这是它与语言目录的最大区别。
6. **同心圆 paths**：源码文件只匹配扩展名，构建/配置敏感文件额外匹配项目清单（go.mod / Cargo.toml / composer.json / pom.xml 等），确保改构建文件也触发校验。
7. **Rules vs Skills 分工**：Rules 定义"做什么"（标准/检查清单），Skills 提供"怎么做"（深度操作手册），语言规则结尾统一 `See skill: xxx` 衔接。
8. **可扩展到框架层**：python/fastapi.md（独立 paths `app/**/*.py`）暗示语言层之下还能再分框架层；react 的 "Out of Scope" 也预留了 nextjs 独立拆分。
9. **安装路径无关**：`rules/ecc/` 命名空间 + `CLAUDE_RULES_DIR` 环境变量 + install-apply.js 的目录探测，让规则在直装 / marketplace / 项目级等任意形态下都能正确定位。
10. **与记忆系统的关系**：CLAUDE.md（总览）+ rules/ecc/common（always 模块化）+ rules/ecc/\<lang\>（条件）三层协同，RULES.md 仅给人看不参与自动加载。
