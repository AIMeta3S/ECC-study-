# ECC agents 说明文档

> 本文档基于 `agents/` 目录下全部 **67 个**子智能体（subagent）定义文件整理。每个 agent 是一份 YAML frontmatter（`name` / `description` / `tools` / `model`）+ 正文的 Markdown，正文包含工作流步骤与对 skill / 其他 agent / MCP / 命令的依赖。

## 它解决什么问题

子智能体（subagent）是主 Claude（编排者）可以**委派任务**的独立进程，拥有受限的工具范围与上下文。其核心价值（来自《长文指南》）：

- **节省上下文**：子智能体返回摘要而非堆砌全部内容
- **按任务复杂度选模型，控成本**：简单任务用 Haiku，编码主力用 Sonnet，复杂推理/安全用 Opus
- **可沙箱化**：按 agent 配置允许的工具、MCP、权限

## 模型档位图例

每个 agent 名后的上标标注其默认模型档位（直接影响 token 成本）：

| 标记 | 模型 | 典型用途 |
|------|------|---------|
| 〔Opus〕 | opus | 复杂推理、架构决策、安全分析、对抗评估 |
| 〔Sonnet〕 | sonnet | 编码主力（90% 任务）、代码审查、构建修复 |
| 〔Haiku〕 | haiku | 结构简单的轻量任务（如生成文档） |

## 分类大纲

按用途 / 使用场景分为 12 类：

| 分类 | 数量 | 关注点 |
|------|------|--------|
| [A. 规划与架构设计](#a-规划与架构设计) | 8 | 摸清现状、产出可执行蓝图 / 规格 |
| [B. 通用与专项代码审查](#b-通用与专项代码审查) | 10 | 跨语言的质量 / 安全 / 测试覆盖 / 领域审查 |
| [C. 语言/框架代码审查](#c-语言框架代码审查) | 16 | 按语言 / 框架分工的代码审查 |
| [D. 构建与错误修复](#d-构建与错误修复) | 12 | 让失败的红构建 / 测试快速转绿 |
| [E. 测试](#e-测试) | 2 | TDD 与 E2E |
| [F. 重构与性能优化](#f-重构与性能优化) | 3 | 死码清理、简化、性能 |
| [G. 文档](#g-文档) | 2 | codemap / 文档更新、外部文档查阅 |
| [H. 网络运维](#h-网络运维) | 2 | 网络配置审计、故障诊断 |
| [I. 开源发布流水线](#i-开源发布流水线) | 3 | fork → 清洗 → 打包三阶段 |
| [J. GAN 对抗式多智能体](#j-gan-对抗式多智能体) | 3 | Planner-Generator-Evaluator 迭代框架 |
| [K. Harness 调优与自主循环](#k-harness-调优与自主循环) | 2 | 调 harness 配置、操作自主循环 |
| [L. 业务沟通与营销](#l-业务沟通与营销) | 4 | 通讯、营销文案、SEO、对话分析 |

> 「代码审查」拆成 B（通用/专项）与 C（语言/框架）纯粹为控制单表长度，二者用途一致，只是分工不同。C 类各 reviewer 模式高度一致（git diff → 静态分析 → 聚焦改动 → CRITICAL/HIGH/MEDIUM 分级 → Approve/Warning/Block），表中只保留各语言特性与差异。

---

## A. 规划与架构设计

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| planner 〔Opus〕 | 复杂功能与重构的实现规划 | 用户提出功能实现 / 架构变更 / 复杂重构时主动触发 | 需求分析（澄清+成功标准）→ 架构评审（现有代码+可复用模式）→ 步骤拆解（文件路径+依赖+复杂度+风险）→ 实现排序（按依赖，支持增量测试） | 无显式依赖（仅 Read/Grep/Glob） | 计划须具体到文件 / 函数 / 变量名；大功能拆成可独立交付阶段（Phase1 最小可用 → Phase4 优化） |
| architect 〔Opus〕 | 系统架构设计、可扩展性、技术决策 | 规划新功能、重构大型系统、做架构决策 | 现状分析（架构+技术债+扩展性）→ 需求收集（功能 / 非功能 / 集成 / 数据流）→ 设计提案（架构图+组件职责+API 契约）→ 权衡分析（Pros/Cons/Alternatives/Decision） | 无（仅 Read/Grep/Glob） | 提供模块化 / 扩展性 / 可维护性 / 安全 / 性能五大原则与 ADR 模板 |
| code-architect 〔Sonnet〕 | 分析现有代码模式，产出功能实现蓝图 | 需要契合现有约定的新功能实现方案 | 模式分析（代码组织+命名+既有模式+测试）→ 架构设计（最简架构，避免投机抽象）→ 实现蓝图（每组件文件路径+接口+数据流）→ 构建顺序（types → 逻辑 → 集成 → UI → 测试 → 文档） | 无（仅 Read/Grep/Glob/Bash） | 输出含设计决策、待建 / 改文件表、构建顺序 |
| code-explorer 〔Sonnet〕 | 深度分析现有代码，追踪执行路径、映射架构层 | 新开发前需要摸清现有功能如何运作 | 入口点发现 → 执行路径追踪（调用链+分支+异步+错误路径）→ 架构层映射（层间通信+复用边界）→ 模式识别 → 依赖文档（外部库+内部模块） | 无（仅 Read/Grep/Glob） | 输出含入口点、执行流程、关键文件表、对新开发的建议（遵循 / 复用 / 避免） |
| a11y-architect 〔Sonnet〕 | WCAG 2.2 无障碍设计（Web / iOS / Android） | 设计 UI 组件、建立设计系统、审计无障碍 | 上下文发现（平台+交互+障碍识别）→ 策略实施（语义化代码+焦点流+触摸目标）→ 验证文档（对照 WCAG 2.2 AA 清单） | skill: `accessibility` | 输出含语义化代码、无障碍树、WCAG 准则映射、ADR-ACC 模板 |
| network-architect 〔Sonnet〕 | 企业 / 多站点网络架构设计 | 园区 / 分支 / WAN / 数据中心 / 混合云网络规划 | 复述目标约束 → 识别缺失需求 → 选定拓扑 → 路由与分段优先于硬件 → 管理平面 / 监控 / 回滚模型 → 分阶段实施计划 → 残余风险 | skill: `network-config-validation`、`network-bgp-diagnostics`、`network-interface-health`、`cisco-ios-patterns`、`netmiko-ssh-automation` | 只读评审不下配置；优先路由边界而非延伸二层；选满足规模的最简设计 |
| homelab-architect 〔Sonnet〕 | 家庭 / 小型实验室网络规划 | 按硬件 + 目标 + 经验水平设计分阶段可回滚方案 | 硬件盘点 → 确认目标（隔离 / 访客 / 广告拦截 / 远程 / 备份 / 监控）→ 目标与能力匹配 → 最小可用拓扑 → 回滚与访问安全 → 实施顺序 | skill: `homelab-network-readiness`、`homelab-network-setup`、`network-config-validation`、`network-interface-health` | 不建议管理界面暴露公网、不禁防火墙 / 分段作为排障捷径；DHCP DNS 切换前须有静态地址与健康检查 |
| spec-miner 〔Opus〕 | 从现有代码提取行为规格（OpenSpec） | 棕地项目接入规格驱动开发 | Phase1 范围发现（最小扫描+按 capability 聚类）→ Phase2 逐模块深挖（沿调用链，>15 文件或连 3 文件无新断言则停）→ Phase3 规格生成（每 capability 一个 spec.md，扁平 Requirement/Invariant 块+元数据） | agent（下游）: `code-explorer`、`planner`、`tdd-guide`、`code-reviewer` | 绝不臆造行为（不确定用 uncertainty 注释）；以调用方依赖交叉验证；只标记不修复 |

---

## B. 通用与专项代码审查

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| code-reviewer 〔Sonnet〕 | 通用代码质量 / 安全 / 可维护性审查 | 写或改代码后立即用；所有代码变更必备 | 收集上下文（git diff）→ 理解范围 → 读周边代码 → 应用审查清单（CRITICAL → LOW）→ 报告（仅 >80% 把握） | 命令: `git diff`/`git log`；文件: `CLAUDE.md` | 零发现亦是合法结果；不许编造发现以"对得起调用"；HIGH/CRITICAL 须举证 |
| security-reviewer 〔Sonnet〕 | 安全漏洞检测与修复建议 | 处理用户输入 / 认证 / API / 敏感数据后主动用 | 初始扫描（npm audit+密钥搜索+高危区审查）→ OWASP Top 10 逐项核查 → 代码模式评审（给严重度+修复） | 命令: `npm audit`、`eslint --plugin security`；skill: `security-review` | CRITICAL 进应急流程（告警+示例+验证+轮换密钥）；安全须偏执主动；注意误报（.env.example / 测试凭证 / 公开 key） |
| silent-failure-hunter 〔Sonnet〕 | 猎杀静默失败 / 吞错误 / 糟糕回退 / 缺失错误传播 | 对静默失败零容忍的代码审查 | 排查 5 类：空 catch 块 → 不充分日志 → 危险回退（`.catch(() => [])`）→ 错误传播问题（丢栈 / 泛化重抛）→ 缺失错误处理（网络 / 文件 / DB 无超时无回滚） | 无（仅 Read/Grep/Glob/Bash） | 每项给 location / severity / issue / impact / fix recommendation |
| comment-analyzer 〔Sonnet〕 | 代码注释准确性 / 完整性 / 可维护性 / 腐化风险 | 注释质量审查 | 事实准确性（对照代码验证）→ 完整性（复杂逻辑 / 副作用 / 公共 API）→ 长期价值（标记仅复述代码的注释+TODO/FIXME 债）→ 误导元素（与代码矛盾 / 陈旧引用） | 无（仅 Read/Grep/Glob） | 输出按 Inaccurate / Stale / Incomplete / Low-value 分组，属建议性 |
| type-design-analyzer 〔Sonnet〕 | 类型设计质量分析（封装 / 不变式表达 / 有用性 / 强制） | 评估类型是否让非法状态难以表示 | 按四维评估：封装（不变式可被外部违反?）→ 不变式表达（类型编码业务规则?）→ 不变式有用性（防真实 bug?）→ 强制执行（类型系统强制? 有逃逸口?） | 无（仅 Read/Grep/Glob） | 每个被评类型给四维评分 + 总体评估 + 改进建议 |
| pr-test-analyzer 〔Sonnet〕 | PR 测试覆盖质量与完整性评审 | 判断测试是否真正覆盖变更行为 | 识别变更代码（映射函数 / 类 / 模块 → 定位测试 → 找未测新路径）→ 行为覆盖（功能 / 边界 / 错误 / 集成）→ 测试质量（断言 / 隔离 / 命名）→ 缺口按影响分级 | 无（仅 Read/Grep/Glob/Bash） | 强调行为覆盖而非行覆盖；标记 flaky；输出含关键缺口与正面观察 |
| agent-evaluator 〔Sonnet〕 | 对子智能体输出按 5 维打分 | `agent-self-evaluation` skill 激活时；任意非平凡任务后评估 | 理解任务（原始请求 vs 输出）→ 收集证据（grep / 测试验证 API / 路径 / 签名）→ 按 5 维（准确 / 完整 / 清晰 / 可操作 / 简洁）各 1-5 分 → 生成记分卡 | skill: `agent-self-evaluation`；脚本: `scripts/evaluate.py`；命令（只读）: `grep`/`cat`/`ls`/`find` | Bash 仅只读验证，禁写入 / 删除 / 推送；不重做原任务；不给无证据的 5 分 |
| healthcare-reviewer 〔Opus〕 | 医疗应用代码审查（临床安全 / CDSS / PHI / 数据完整性） | EMR / EHR、临床决策支持、健康信息系统 | CDSS 引擎（药物交互 / 剂量 / 临床评分是否符合已发表标准）→ PHI 保护（日志 / URL / RLS / 跨机构隔离）→ 临床工作流（就诊锁 / 审计轨迹 / 告警不可关）→ 数据完整性（无 CASCADE DELETE / 并发编辑 / 孤儿记录） | 无外部工具（仅 Read/Grep/Glob）；引用 NEWS2 / qSOFA / HL7 FHIR / ICD-10 / SNOMED | 临床准确性存疑一律 NEEDS REVIEW；PHI 泄露无论多小都 CRITICAL；绝不批准静默吞 CDSS 错误的代码 |
| database-reviewer 〔Sonnet〕 | PostgreSQL 查询优化 / 模式设计 / 安全 / 性能 | 写 SQL / 建迁移 / 设计 schema / 排查性能 | 查询性能（CRITICAL: 索引 / EXPLAIN ANALYZE / N+1 / 复合索引列序）→ 模式设计（HIGH: 类型 / 约束 / snake_case）→ 安全（CRITICAL: RLS / `auth.uid()` / 最小权限 / 撤销 public） | 命令: `psql`、`EXPLAIN ANALYZE`、`pg_stat_*`；skill: `postgres-patterns`、`database-migrations` | 融入 Supabase 最佳实践；附反模式清单 |
| mle-reviewer 〔Sonnet〕 | 生产级 ML 工程审查 | ML / MLOps / 训练 / 推理 / 特征存储 / 评估代码变更 | 确认可审 → 查近期变更 → 定位触及环节（数据 / 特征 / 训练 / 评估 / 产物 / 推理 / 监控 / 部署）→ 跑轻量检查 → 按生产 ML 清单审查（指标 / 数据契约防泄漏 / 可复现 / 评估晋升门 / 训练-服务一致性 / 监控回滚） | agent: `python-reviewer`、`pytorch-build-resolver`、`database-reviewer`、`security-reviewer`、`performance-optimizer` 等（复用而非取代）；skill: `mle-workflow`；命令: `pytest`/`ruff`/`mypy` | 结论 APPROVE / APPROVE WITH WARNINGS / BLOCK；常见阻断：时间相关数据随机切分、训练预处理手抄进服务、回滚需重训 |

---

## C. 语言/框架代码审查

> 这 16 个 reviewer 共性流程：`git diff` 看变更 → 跑静态分析 / 构建检查 → 聚焦改动文件 → 按 CRITICAL/HIGH/MEDIUM 分级 → 给 Approve/Warning/Block。下表只列各语言特性与差异。

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| typescript-reviewer 〔Sonnet〕 | TS / JS 类型安全 / async / Node 与 Web 安全 / 惯用法 | 所有 TS/JS 代码变更；TS/JS 项目必用 | 确立范围（gh pr view / git diff）→ 查合并就绪度 → 跑 canonical typecheck → 跑 eslint → 聚焦评审 | 命令: `tsc --noEmit`、`eslint`、`npm audit`；agent: `react-reviewer`（.tsx/.jsx 同调）、`security-reviewer` | 通用 TS lane；React 专属由 `react-reviewer`；批准标准无 CRITICAL/HIGH；tsconfig 被放宽须显式指出 |
| react-reviewer 〔Sonnet〕 | React hook 正确性 / 渲染性能 / RSC 边界 / 可访问性 / React 安全 | 触及 .tsx/.jsx 或组件逻辑；React 项目必用 | 确立范围 → 查合并就绪度 → 跑 lint（查 react-hooks 规则）→ 跑 typecheck → 聚焦评审 | 命令: `gh pr view`、`git diff`、`eslint`、`tsc`；库: `eslint-plugin-react-hooks`/`jsx-a11y`、`DOMPurify`、`zod`；agent: `typescript-reviewer`、`security-reviewer` | 只负责 React lane；通用 TS 由 `typescript-reviewer`；批准标准无 CRITICAL/HIGH |
| vue-reviewer 〔Sonnet〕 | Vue Composition API / 响应式 / 组件架构 / 模板安全 / 性能 | 触及 .vue 或 Vue 生态（Pinia / Vue Router / Nuxt）；Vue 项目必用 | 确立范围 → 查合并就绪度 → 跑 lint（eslint-plugin-vue）→ 跑 typecheck（vue-tsc）→ 聚焦评审 | 命令: `gh pr view`、`eslint`、`vue-tsc`；库: `eslint-plugin-vue`、`DOMPurify`、`zod`；agent: `typescript-reviewer`、`security-reviewer` | 只负责 Vue lane；Vue 3.5+ 解构 props 已稳定但不可直接 watch 解构 prop |
| python-reviewer 〔Sonnet〕 | Python PEP 8 / Pythonic / 类型提示 / 安全 / 性能 | 所有 Python 代码变更；Python 项目必用 | `git diff -- '*.py'` → 跑静态分析（ruff/mypy/pylint/black）→ 聚焦改动文件 → 评审 | 命令: `mypy`、`ruff`、`black`、`bandit`、`pytest --cov`；skill: `python-patterns` | 框架覆盖 Django / FastAPI / Flask；批准标准无 CRITICAL/HIGH；不重构只报告 |
| go-reviewer 〔Sonnet〕 | Go 惯用法 / 并发模式 / 错误处理 / 性能 | 所有 Go 代码变更；Go 项目必用 | `git diff -- '*.go'` → 跑 `go vet`/`staticcheck` → 聚焦改动文件 → 评审 | 命令: `go vet`、`staticcheck`、`golangci-lint`、`go build -race`、`govulncheck`；skill: `golang-patterns` | 审批门槛：无 CRITICAL/HIGH 才 Approve；CRITICAL 含 SQL/命令注入、unsafe、竞态、硬编码密钥 |
| rust-reviewer 〔Sonnet〕 | Rust 所有权 / 生命周期 / 错误处理 / unsafe / 惯用法 | 所有 Rust 代码变更；Rust 项目必用 | 跑 `cargo check`/`clippy`/`fmt`/`test`（任一失败则停）→ `git diff -- '*.rs'` → 聚焦改动文件 → 评审 | 命令: `cargo clippy`/`fmt`/`test`/`audit`；skill: `rust-patterns` | CI 须绿且无冲突；批准标准无 CRITICAL/HIGH；CRITICAL 含生产路径 `unwrap`、无 justification 的 unsafe |
| swift-reviewer 〔Sonnet〕 | Swift 面向协议 / 值语义 / ARC / Swift Concurrency / 惯用法 | 所有 Swift 代码变更；Swift 项目必用 | 跑 `swift build`/`swiftlint`/`swift test`（任一失败则停）→ `git diff -- '*.swift'` → 聚焦改动文件 → 评审 | 命令: `swift build`、`swiftlint`、`swift test`；rules: `swift/*`；skill: `swift-concurrency-6-2`、`swiftui-patterns`、`swift-protocol-di-testing` | CI 须绿；批准标准无 CRITICAL/HIGH；CRITICAL 含强制解包、`try!`、`as!`、UserDefaults 存敏感数据 |
| kotlin-reviewer 〔Sonnet〕 | Kotlin 惯用模式 / 协程安全 / Compose / 整洁架构 / Android 陷阱 | Kotlin / Android / KMP 代码审查 | 收集上下文（git diff）→ 理解项目结构（Android/KMP/Compose Multiplatform）→ 安全审查（CRITICAL 升级 `security-reviewer`）→ 清单审查 → 报告（仅 >80% 把握） | agent: `security-reviewer`（CRITICAL 安全升级）；命令: `git diff`/`log` | 输出 Review Summary 表 + Verdict（Approve/Block）；附 BAD/GOOD 代码对照（协程取消、Compose 稳定 lambda） |
| java-reviewer 〔Sonnet〕 | Java（Spring Boot / Quarkus）分层架构 / JPA / Panache / MongoDB / 安全 / 并发 | 所有 Java 代码变更；Java 项目必用 | 框架检测（pom/gradle）→ `git diff -- '*.java'` → 跑构建检查（`mvnw verify`/`gradlew check`）→ 聚焦评审 | skill: `springboot-patterns`、`quarkus-patterns`；agent: `security-reviewer`；命令: `git diff`、`mvnw`/`gradlew` | 自动检测 Spring vs Quarkus 套用不同规则；含 OWASP CVE 扫描建议；CRITICAL 安全问题升级 `security-reviewer` |
| csharp-reviewer 〔Sonnet〕 | C# .NET 约定 / async / 安全 / 可空引用类型 / 性能 | 所有 C# 代码变更；C# 项目必用 | `git diff -- '*.cs'` → 跑 `dotnet build`/`dotnet format --verify` → 聚焦改动文件 → 评审 | 命令: `dotnet build`/`format`/`test`；skill: `dotnet-patterns`、`csharp-testing` | 覆盖 ASP.NET Core / EF Core / Minimal APIs / Blazor 专项 |
| fsharp-reviewer 〔Sonnet〕 | F# 函数式惯用法 / 类型安全 / 模式匹配 / 计算表达式 / 性能 | 所有 F# 代码变更；F# 项目必用 | `git diff -- '*.fs' '*.fsx'` → 跑 `dotnet build`/`fantomas --check` → 聚焦改动文件 → 评审 | 命令: `dotnet build`、`fantomas`、`dotnet test`；skill: `dotnet-patterns`、`fsharp-testing` | 输出 `[SEVERITY] 标题 / File / Issue / Fix`；强调类型系统与函数式惯用法 |
| cpp-reviewer 〔Sonnet〕 | C++ 内存安全 / 现代 C++ 惯用法 / 并发 / 性能 | 所有 C++ 代码变更；C++ 项目必用 | `git diff -- '*.cpp' '*.hpp'` → 跑 `clang-tidy`/`cppcheck`（若可用）→ 聚焦改动文件 → 评审 | 命令: `git diff`、`clang-tidy`、`cppcheck`、`cmake --build`；skill: `cpp-coding-standards` | Approve / Warning / Block 三档；优先级：内存安全 / 安全 > 并发 / 质量 > 性能 |
| php-reviewer 〔Sonnet〕 | PHP PSR-12 / 类型系统 / Eloquent ORM / 安全 / 性能 | 所有 PHP 代码变更；PHP 项目必用 | `git diff -- '*.php'` → 跑 PHPStan / Psalm / Pint（若可用）→ 聚焦改动文件 → 评审 | 命令: `phpstan`/`psalm`/`pint`/`phpunit`、`composer audit`；skill: `laravel-patterns`、`laravel-security`、`laravel-tdd` | 覆盖 Laravel / Livewire / Filament / 原生 PHP；批准标准无 CRITICAL/HIGH |
| flutter-reviewer 〔Sonnet〕 | Flutter widget / 状态管理 / Dart 惯用法 / 性能 / 无障碍 / 整洁架构 | Flutter / Dart 代码审查 | 收集上下文（git diff）→ 理解项目（读 pubspec / 分析状态管理方案 BLoC / Riverpod / Provider）→ 安全审查（CRITICAL 转 `security-reviewer`）→ 清单审查 → 报告 | agent: `security-reviewer`；命令: `git diff`、`flutter pub outdated`；skill: `flutter-dart-code-review` | 库无关（适配任何状态管理）；不重构只报告；Approve / Block |
| django-reviewer 〔Sonnet〕 | Django ORM 正确性 / DRF / 迁移安全 / 安全配置 / 生产实践 | 所有 Django 代码变更；Django 项目必用 | `git diff -- '*.py'` → `python manage.py check` → ruff / mypy（若可用）/ `gh pr checks` → 聚焦改动 .py 与迁移 | 命令: `git diff`、`manage.py check`/`makemigrations --check`、`ruff`、`mypy`、`bandit`、`pytest --cov`；skill: `django-patterns`、`django-security`、`django-tdd` | 建议配合 `python-reviewer` 做通用 Python 检查；CRITICAL 含安全 / ORM / 迁移安全 |
| fastapi-reviewer 〔Sonnet〕 | FastAPI async 正确性 / 依赖注入 / Pydantic / 安全 / OpenAPI / 测试 | FastAPI 应用审查 | 定位入口（main.py / app.py）→ 识别 routers / schemas / dependencies → 跑 `pytest`/`ruff`/`mypy` → 先审改动再查相邻定义 → 报告 | 命令: `pytest`、`ruff`、`mypy`、`uv run pytest` | 通用 Python 质量交 `python-reviewer`；Critical 含硬编码密钥 / SQL 插值 / 鉴权绕过 |

---

## D. 构建与错误修复

> 这 12 个 build-resolver 共性流程：跑诊断命令 → 解析错误 → 读文件 → 最小修复 → 重跑验证 → 跑测试确保无回归。**共同原则**：仅外科式修复，不重构，不改签名，同错 3 次未解或引入更多错误则停止上报。

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| build-error-resolver 〔Sonnet〕 | 构建 / TypeScript 错误修复（通用） | 构建失败或类型错误时；快速让构建转绿 | 收集全部错误（`npx tsc --noEmit --pretty` 分类）→ 最小改动修复（类型注解 / null 检查 / 导入）→ 验证不破坏其他 → 迭代直到构建通过 | 命令: `npx tsc --noEmit`、`npm run build`、`npx eslint`；agent（转交）: `refactor-cleaner`、`architect`、`planner`、`tdd-guide`、`security-reviewer` | 严格不重构 / 不改名 / 不加功能；成功指标：改动行数 <5% 且测试通过 |
| react-build-resolver 〔Sonnet〕 | React 构建失败修复（Vite / webpack / Next.js / CRA / Parcel / esbuild / Bun） | React 构建失败时；React 项目必用 | 构建系统检测 → 跑构建脚本+独立 typecheck（`tsc --noEmit`）→ 识别错误层（TS / 配置 / 运行时 / hydration）→ 最小修复 → 重新构建验证 | 命令: `npm`/`pnpm`/`yarn`/`bun build`、`tsc --noEmit`、`next`/`vite`/`webpack build`；agent: `react-reviewer`（转绿后）；rules: `react/*`；skill: `react-patterns`、`frontend-patterns` | 不为转绿而禁类型检查 / lint；RSC 边界重设计属架构改动须停 |
| cpp-build-resolver 〔Sonnet〕 | C++ / CMake / 编译 / 链接器 / 模板错误修复 | C++ 构建失败时 | `cmake --build build` 解析错误 → 读受影响文件 → 最小修复 → 重跑 `cmake --build` 验证 → `ctest` 确保无破坏 | 命令: `cmake --build`、`clang-tidy`、`cppcheck`、`ctest`；skill: `cpp-coding-standards` | 禁 `#pragma` 抑制警告；不改函数签名 |
| dart-build-resolver 〔Sonnet〕 | Dart / Flutter 构建 / 分析 / 依赖 / build_runner 错误修复 | Dart / Flutter 构建失败时 | `flutter analyze` 解析错误 → 读受影响文件 → 最小修复 → 重跑 analyze 验证 → `flutter test` 确保无破坏 | 命令: `flutter`/`dart analyze`、`pub get`/`deps`/`upgrade`、`build_runner build`/`clean`、`flutter build`/`clean`、`pod install`；skill: `flutter-dart-code-review` | 禁 `// ignore:` 抑制与用 `dynamic` 消音；含 null safety / build_runner / Android / iOS 排障表 |
| django-build-resolver 〔Sonnet〕 | Django / Python 构建 / 迁移 / 依赖错误修复 | Django 启动或初始化失败时 | 复现错误 → 识别类别（依赖 / 迁移 / 配置 / 导入 / DB / 静态 / runserver）→ 读受影响文件 → 最小修复 → `manage.py check` 验证 → 跑测试 | 命令: `python`/`pip`、`manage.py check`/`showmigrations`/`migrate`/`makemigrations`/`collectstatic`/`runserver`、`poetry`；skill: `django-patterns`、`django-security` | 绝不删迁移文件（用 `--fake`）；绝不重构 |
| go-build-resolver 〔Sonnet〕 | Go 构建 / vet / linter 错误修复 | Go 构建失败时 | 按序诊断（`go build`/`vet`/`staticcheck`/`golangci-lint`/`go mod verify`/`tidy`）→ 解析错误 → 最小修复 → `go build` 验证 → `go vet` → `go test` | 命令: `go build`/`vet`、`staticcheck`、`golangci-lint`、`go mod verify`/`tidy`/`why`、`go test`；skill: `golang-patterns` | 未经批准不加 `//nolint`；改 import 后须 `go mod tidy` |
| java-build-resolver 〔Sonnet〕 | Java / Maven / Gradle 构建 / 编译 / 依赖错误修复（自动检测 Spring / Quarkus） | Java 构建失败时 | 框架检测（pom/gradle）→ 按序诊断（`mvnw compile`/`test` 或 `gradlew build`/依赖树 / checkstyle / spotbugs）→ 最小修复 → 构建+测试验证 | 命令: `mvnw`/`gradlew compile`/`test`/`build`、`dependency:tree`、`checkstyle`/`spotbugs:check`、`quarkus:dev`；skill: `springboot-patterns`、`quarkus-patterns` | Quarkus 优先 `quarkus ext add` 而非手改 pom；不加 `@SuppressWarnings` |
| kotlin-build-resolver 〔Sonnet〕 | Kotlin / Gradle 构建 / 编译 / 依赖错误修复 | Kotlin 构建失败时 | 按序诊断（`gradlew build`/`detekt`/`ktlintCheck`/`dependencies`）→ 解析错误 → 最小修复 → `gradlew build` 验证 → `gradlew test` | 命令: `gradlew build`/`test`/`detekt`/`ktlintCheck`/`dependencies`/`clean`、`--refresh-dependencies`；skill: `kotlin-patterns` | 优先补具体 import 而非通配；不抑制警告 |
| rust-build-resolver 〔Sonnet〕 | Rust cargo build / 借用检查器 / Cargo.toml 错误修复 | Rust 构建失败时 | 诊断（`cargo check`/`clippy`/`fmt --check`/`tree`/`audit`）→ 解析错误码 → 读所有权 / 生命周期上下文 → 最小修复 → `cargo check` 验证 → `clippy` → `cargo test` | 命令: `cargo check`/`clippy`/`fmt`/`tree`/`test`/`audit`；skill: `rust-patterns` | 不加 `#[allow(unused)]` 除非批准；不用 unsafe 绕借用检查；用 `?` 传播而非 `.unwrap()` |
| swift-build-resolver 〔Sonnet〕 | Swift / Xcode / SPM / 代码签名错误修复 | Swift 构建失败时 | 诊断（`swift build`/`swiftlint`/`package resolve`/`swift test`；Xcode 另跑 `xcodebuild`/`simctl`）→ 解析错误码 → 读类型 / 协议上下文 → 最小修复 → `swift build` 验证 → `swiftlint` → `swift test` | 命令: `swift build`/`package`/`test`、`xcodebuild`、`simctl`、`security find-identity`；rules: `swift/*`；skill: `swift-concurrency-6-2`、`swift-actor-persistence` | 不加 `swiftlint:disable` 除非批准；不用强制解包 `!` 静默 optional；缺失 provisioning profile 须用户操作 |
| pytorch-build-resolver 〔Sonnet〕 | PyTorch 运行时 / CUDA / 训练错误修复（张量形状 / 设备 / 梯度 / DataLoader / 混合精度） | PyTorch 训练或推理崩溃时 | 诊断（torch 版本 / CUDA / cuDNN / nvidia-smi / 张量测试）→ 读回溯定位失败行 → 读模型 / 训练上下文 → 追踪张量 shape/dtype/device → 最小修复 → 跑失败脚本验证 → 检查梯度流 | 命令: `python -c "import torch..."`、`pip list`、`nvidia-smi`；库: `torchsummary` | 不擅自改模型架构；不用 `warnings.filterwarnings` 静默；先用 `batch_size=2` 测试；`batch_size=1` 仍 OOM 则停 |
| harmonyos-app-resolver 〔Sonnet〕 | HarmonyOS / OpenHarmony（ArkTS / ArkUI）开发：审查 V2 状态管理合规 + 修复构建 | HarmonyOS / OpenHarmony 项目（审查 + 修复双重职责） | 理解项目（`module.json5`/`oh-package.json5`）→ 审查或实现（标记 V1 装饰器 / `@ohos.router` 建议迁 V2+Navigation；检查 API level / 权限 / `$r()` / i18n）→ 验证（`hvigorw assembleHap`） | 命令: `hvigorw assembleHap`；rules: `rules/arkts/`；文件: `module.json5`、`oh-package.json5`、`build-profile.json5` | 强制：状态管理必须 V2 禁 V1；路由必须 Navigation+NavPathStack 禁 `@ohos.router`；动画中禁频繁改 width/height/padding/margin |

---

## E. 测试

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| tdd-guide 〔Sonnet〕 | 测试驱动开发（先写测试） | 写新功能 / 修 bug / 重构时；确保 80%+ 覆盖 | 先写测试（RED，描述期望行为）→ 跑测试确认失败 → 写最小实现（GREEN）→ 跑测试通过 → 重构（IMPROVE，测试保持绿）→ 验证覆盖（`npm run test:coverage`，各维 80%+） | 命令: `npm test`、`npm run test:coverage`；skill: `tdd-workflow` | 覆盖单元 / 集成 / E2E（Playwright）+8 类边界；避免测实现细节 / 测试依赖 / 断言过少 / 未 mock 外部依赖；关键路径合并前达 pass^3 |
| e2e-runner 〔Sonnet〕 | E2E 端到端测试（优先 Vercel Agent Browser，回退 Playwright） | 生成 / 维护 / 运行 E2E 测试，确保关键用户流程可用 | 规划（识别关键用户旅程+按风险分级）→ 创建（Page Object Model+`data-testid` 定位器+条件等待）→ 执行（本地跑 3-5 次查不稳定+`test.fixme` 隔离+上传产物） | 工具: `agent-browser`（open/snapshot/click/fill/screenshot）；Playwright（`npx playwright test`/`show-report`）；skill: `e2e-testing` | 成功指标：关键旅程 100% 通过 / 整体 >95% / 不稳定率 <5% / 时长 <10 分钟 |

---

## F. 重构与性能优化

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| refactor-cleaner 〔Sonnet〕 | 死码清理与整合（运行 knip / depcheck / ts-prune 识别后安全移除） | 移除未用代码 / 重复项 / 重构；长会话后清理 | 分析（并行跑检测工具，按风险 SAFE / CAREFUL / RISKY 分类）→ 验证（grep 所有引用含动态导入+查公共 API+查 git 历史）→ 安全移除（先 SAFE，每批后跑测试提交）→ 整合重复（选最完整实现，更新 import，删重复） | 命令: `npx knip`/`depcheck`/`ts-prune`/`eslint --report-unused-disable-directives`、`git` | 检测未用+grep 无引用+非公共 API+移除后测试通过方可移除；保守优先，存疑不移除 |
| code-simplifier 〔Sonnet〕 | 保持行为不变的代码简化（清晰 / 一致 / 可维护） | 默认聚焦近期改动代码 | 读改动文件 → 识别简化机会（结构 / 可读性 / 质量三类）→ 仅应用功能等价改动 → 验证未引入行为变化 | 无（Read/Write/Edit/Bash/Grep/Glob） | 结构：提取嵌套 / 早返回 / async-await / 去死码；质量：去 console.log / 合并重复 / 拆过度抽象 |
| performance-optimizer 〔Sonnet〕 | 性能分析与优化（profiling / 内存泄漏 / 渲染 / 算法 / 打包 / DB / 网络） | 识别瓶颈 / 优化慢代码 / 缩减打包 / 提升运行时性能 | 识别问题（Core Web Vitals 阈值）→ 算法分析（嵌套循环 → Map/Set）→ React 优化（memo / 虚拟化 / 懒加载 / code split）→ 打包优化（tree shaking / knip）→ DB 优化（避免 N+1 / 索引 / 缓存 / 分页）→ 网络（Promise.all / 防抖 / 批处理）→ 内存泄漏检测 | 命令: `bundle-analyzer`、`source-map-explorer`、`lighthouse`、`node --prof`/`--inspect`；库: `web-vitals`、`knip` | 红线：bundle>500KB gzip / LCP>4s / 内存持续增长；目标 Lighthouse >90 且 Core Web Vitals 达标 |

---

## G. 文档

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| doc-updater 〔Haiku〕 | 文档与 codemap 更新 | 主动更新 codemap 与文档；运行 `/update-codemaps`、`/update-docs` | 分析仓库（workspace / 包 / 目录 / 入口 / 框架）→ 分析模块（导出 / 导入 / 路由 / DB 模型）→ 生成 codemap（INDEX / frontend / backend / database / integrations / workers.md）→ 文档更新（抽取 JSDoc / README / 环境变量，更新 README / guides） | 命令: `npx tsx scripts/codemaps/generate.ts`、`npx madge --image`、`npx jsdoc2md` | 单一真实来源（从代码生成）；单 codemap 控制在 500 行内；必带更新日期 |
| docs-lookup 〔Sonnet〕 | 用 Context7 MCP 抓取最新库 / 框架 / API 文档 | 用户问如何使用库 / 框架 / API 或需最新代码示例 | 解析库（`resolve-library-id` 按名称 / 基准分 / 版本选最佳）→ 抓取文档（`query-docs` 针对具体问题，resolve+query 合计 ≤3 次）→ 返回答案（附代码片段+库与版本） | MCP: `mcp__context7__resolve-library-id`、`mcp__context7__query-docs` | 抓取文档视为不可信内容（抗 prompt 注入）；Context7 不可用则据知识回答并注明可能过时 |

---

## H. 网络运维

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| network-config-reviewer 〔Sonnet〕 | 路由器 / 交换机配置审计（安全 / 正确性 / 悬空引用 / 危险命令） | 审计 Cisco IOS / IOS-XE 运行配置或变更片段 | 识别设备角色 / 平台 / 变更意图 → 解析各配置段（接口 / 路由 / ACL / line vty / AAA / SNMP / logging / NTP）→ 先审拟变更再查相邻配置 → 仅报有证据发现 → 区分硬阻断与最佳实践 | 命令（只读）: `show running-config`/`access-lists`/`route`/`logging`/`interfaces` | 明文 / 默认凭证 / Telnet / 无回滚的 reload / erase / format 判 BLOCK；只读命令可建议，状态变更须标修复+维护窗口+回滚 |
| network-troubleshooter 〔Sonnet〕 | 网络连通性 / 路由 / DNS / 接口 / 策略故障只读诊断 | 系统化排查连通性 / 丢包 / 慢链路 / DNS / BGP / VLAN / ACL 问题 | 刻画症状（什么失败 / 谁受影响 / 何时开始 / 近期变更）→ 选定起始层级随证据上下延展（L1/2 查接口 / VLAN / STP；L3 查路由 / next-hop；DNS 用 dig；策略用 ACL 计数器）→ 确认根因解释所有症状 → 根因总结+验证计划 | 命令: `show interfaces`/`vlan brief`/`spanning-tree`/`ip interface brief`/`ip route`、`ping`/`traceroute`、`dig`/`nslookup`、`show ip access-lists`/`logging` | 证据优先于猜测；绝不建议临时移除 ACL / 防火墙 / 认证来测试；状态变更类命令须标为修复步骤 |

---

## I. 开源发布流水线

> 这三个 agent 是 `opensource-pipeline` skill 的三个阶段，**按序执行**：`opensource-forker`（阶段 1）→ `opensource-sanitizer`（阶段 2）→ `opensource-packager`（阶段 3）。核心思想：forker 清洗、sanitizer 独立审计（从不信任 forker 产物）、packager 打包发布。

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| opensource-forker 〔Sonnet〕 | 将私有项目 fork 成开源就绪副本（剥密钥+替换内部引用+清 git 历史） | 开源化第一阶段 | 分析源项目 → `rsync` 创建暂存副本（排除 .git / node_modules / .env）→ 秘密检测与剥离（20+ 正则 → .env.example）→ 内部引用替换（域名 / 路径 / IP / 邮箱 / org → 占位符）→ 生成 .env.example → 清理 git 历史（单一初始提交）→ FORK_REPORT.md | 命令: `find`、`rsync`、`git`；agent（下游）: `opensource-sanitizer` | 绝不在输出遗留任何密钥；不确定是否秘密时按秘密处理；只改配置与引用不改源码逻辑 |
| opensource-sanitizer 〔Sonnet〕 | 验证 fork 已彻底清洗（独立审计，从不信任 forker 产物） | 公开发布前；开源化第二阶段 | 秘密扫描（API key / AWS / DB URL / JWT / 私钥等命中即 FAIL）→ PII 扫描（个人邮箱 / 内网 IP / SSH 串）→ 内部引用扫描 → 危险文件检查（.env / *.pem / credentials.json 存在即 FAIL）→ 配置完整性（.env.example 覆盖所有变量）→ git 历史审计 → SANITIZATION_REPORT.md | 命令: `git log`、`git log -p \| grep`；agent（下游）: `opensource-packager`（PASS 后） | 永不显示完整密钥值（截断前 4 字符）；任一 CRITICAL 即整体 FAIL；偏执优先——可接受误报不可接受漏报 |
| opensource-packager 〔Sonnet〕 | 为已清洗项目生成完整开源打包（CLAUDE.md / setup.sh / README / LICENSE / CONTRIBUTING / issue 模板） | 开源化第三阶段 | 项目分析（package.json / requirements / Cargo / docker-compose / Makefile / README / .env.example / 测试）→ 生成 CLAUDE.md（<100 行，命令可复制可用）→ 生成 setup.sh（chmod+`set -euo pipefail`+检查前置）→ 增强 README（含 Using with Claude Code 段）→ 加 LICENSE / CONTRIBUTING / issue 模板 | 命令: `chmod`、`git` | CLAUDE.md 每条命令必须真实可运行（错误命令比没命令更糟）；已有好文档则增强而非替换；生成文件不得含内部引用 |

---

## J. GAN 对抗式多智能体

> GAN Harness 是 **Planner（产品经理）→ Generator（开发者）→ Evaluator（评估者）** 的对抗迭代框架。流程：planner 写规格 → generator 实现 → evaluator 测试打分（阈值 7.0）→ generator 按反馈迭代，直到达质量阈值。三者通过约定目录 `gan-harness/` 下的文件协作。

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| gan-planner 〔Opus〕 | 一行提示扩展成完整产品规格（功能 / Sprint / 评估标准 / 设计方向） | GAN 框架启动阶段 | 读用户简短提示 → 研究（读已有示例 / 规格）→ 写 `gan-harness/spec.md`（Vision / 设计方向 / 按优先级功能 / 技术栈 / 评估标准 / Sprint 计划）→ 写 `gan-harness/eval-rubric.md` 供 evaluator 消费 | 文件: `gan-harness/spec.md`、`gan-harness/eval-rubric.md` | 刻意雄心勃勃（12-16 个功能）；须含具体颜色十六进制 / 命名应用 / 边界空错载状态 / 具体交互（拖放 / 快捷键 / 动画）+ 反 AI 套路指令 |
| gan-generator 〔Opus〕 | 按规格实现功能，读评估反馈迭代至质量阈值 | GAN 框架开发阶段 | 首轮：读 spec → 搭脚手架 → 实现 Sprint 1 Must-Have → 启 dev server（`npm run dev` :3000）→ 自检 → `git commit iteration-001` → 写 generator-state.md。后续轮：读最新 feedback → 列问题 → 按功能 bug → 工艺 → 设计 → 创意 优先级逐一修复 → 重启 dev server → commit iteration-NNN → 更新 state | 文件: `gan-harness/spec.md`、`feedback/feedback-NNN.md`、`generator-state.md`；命令: `npm run dev`、`git` | 先读规格与反馈；修复每个问题；不自我评判；迭代间用 git 提交；保持 dev server 运行；低于 5 分视为关键问题；即使觉得建议不对也要尝试 |
| gan-evaluator 〔Opus〕 | 用 Playwright 测试真实运行的应用，按评分量表打分向生成者反馈 | GAN 框架评估阶段 | 读 eval-rubric / spec / generator-state → 启动浏览器测试（Playwright 导航 localhost:3000，初始截图）→ 系统化测试（第一印象 / 功能走查含边界错态 / 设计审计 / 交互质量）→ 按 1-10 量表评分（加权：design 0.3+originality 0.2+craft 0.3+functionality 0.2）→ 写 `feedback/feedback-NNN.md`（分数表+PASS/FAIL 阈值 7.0+问题与修复+下轮建议） | MCP: `mcp__playwright__navigate`/`click`/`fill`/`screenshot`；命令: `npx playwright test`、`curl`、`npm run build`/`test`、`npx eslint`；文件: `gan-harness/` 目录约定 | "冷酷严格"——不能为鼓励而给分，禁 "overall good effort" 套话，重罚 AI 套路美学；每问题配"如何修复"并尽量量化 |

---

## K. Harness 调优与自主循环

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| harness-optimizer 〔Sonnet〕 | 分析改进本地 agent harness 配置（可靠性 / 成本 / 吞吐） | 通过调配置（非改产品代码）提升 agent 完成质量 | 跑 `/harness-audit` 采集基线分数 → 识别前 3 高杠杆领域（hooks / evals / 路由 / 上下文 / 安全）→ 提出最小可逆配置变更 → 应用并跑验证 → 报告 before/after 差值 | 命令 / skill: `/harness-audit` | 偏好有可测效果的小改动；保持跨平台行为；兼容 Claude Code / Cursor / OpenCode / Codex |
| loop-operator 〔Sonnet〕 | 操作自主 agent 循环，监控进度，停滞时安全介入 | 自主循环执行与监控 | 从显式 pattern 与 mode 启动循环 → 跟踪进度检查点 → 检测停滞与重试风暴 → 失败重复时暂停并缩减范围 → 仅验证通过后恢复 | 无明确外部工具；依赖循环配置（检查点 / 质量门 / eval 基线 / 回滚路径 / worktree 隔离） | 升级触发：连续两检查点无进展 / 相同堆栈重复失败 / 成本漂出预算 / 合并冲突阻塞队列 |

---

## L. 业务沟通与营销

| agent | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 说明 |
|-------|----------|---------|--------------|------|------|
| chief-of-staff 〔Opus〕 | 个人通讯参谋（分流 email / Slack / LINE / Messenger+生成草稿+hook 强制跟进） | 多渠道通讯工作流管理 | 并行拉取（Gmail CLI / 日历 / Slack MCP / LINE / Messenger）→ 分类（skip → info_only → meeting_info → action_required）→ 执行（归档 / 摘要 / 对照日历 / 加载关系上下文生成草稿）→ 生成草稿（读 relationships.md+SOUL.md，`calendar-suggest.js` 算空闲）→ 发送后跟进（建事件 / 更新待办 / 归档 / git commit&push） | 命令: Gmail CLI（gog）；MCP: Slack（`conversations_search`/`history` 等）；脚本: `calendar-suggest.js`（Node 18+）；文件: `relationships.md`/`SOUL.md`/`preferences.md`/`todo.md`；hook: PostToolUse 强制清单；可选 Matrix bridge（LINE）/ Chrome+Playwright（Messenger） | 强调"hooks 比 prompts 可靠"（LLM 约 20% 概率遗忘指令）；确定性逻辑交脚本而非 LLM |
| marketing-agent 〔Sonnet〕 | 营销策略与文案（活动策划 / 受众研究 / 定位 / 文案创作 / 评审） | 产品发布 / 营销活动策划与执行 | 识别范围 → 受众与竞品研究（描绘受众+映射 3+ 竞品）→ 定位与活动角度 → 按序产出（定位 → 落地页 → 邮件序列 → 社交帖 → 短视频脚本 → 广告变体 → 内容日历）→ 每件过文案评审清单（5 秒测试 / 单一 CTA / 无空洞最高级） | skill: `market-research`、`brand-voice`、`content-engine`、`crosspost`、`marketing-campaign`；工具: `WebSearch`/`WebFetch` | 禁词：game-changing / revolutionary / cutting-edge / "In today's competitive landscape" / 空泛 CTA（Learn more）/ 标题党；质量门槛：无填充 / 无通用 AI 腔 / 跨平台同作者感 |
| seo-specialist 〔Sonnet〕 | 技术 SEO 审计 / 页面优化 / 结构化数据 / Core Web Vitals / 内容关键词映射 | 站点审计 / meta 评审 / schema 标记 / sitemap 与 robots 问题 / SEO 整改 | 确定范围（全站 / 页面 / schema / 性能 / 内容）→ 读相关源文件与部署资产 → 按严重度与排名影响排序 → 给具体改动建议（确切文件 / URL / 实现笔记） | skill: `skills/seo`；工具: `WebSearch`/`WebFetch` | 拒绝含糊 SEO 民间说法 / 操纵式模式建议；建议须可被工程师或内容负责人直接落地 |
| conversation-analyzer 〔Sonnet〕 | 分析对话记录，找出值得用 hook 防止的问题行为 | 不带参数的 `/hookify` 触发 | 寻找明确纠正（"No, don't"）→ 寻找挫败反应（回滚改动 / 重复否定 / 手动修复 / 语气升级）→ 寻找重复问题 → 寻找回滚改动（`git checkout`/`restore` / 重编辑）→ 为每行为输出 YAML 规则建议 | 无（仅 Read/Grep）；输出对接 hook 系统（bash / file / stop / prompt 事件，block / warn 动作） | 优先高频高严重度行为；输出含 behavior / frequency / severity / suggested_rule |

---

## 常见问题

### Q1：reviewer 和 build-resolver 怎么配对用？

同一语言 / 框架通常成对出现，**构建失败先 build-resolver，代码审查用 reviewer**：

| 语言 / 框架 | 构建 / 错误修复 | 代码审查 |
|------------|---------------|---------|
| TypeScript / 通用 | build-error-resolver | typescript-reviewer |
| React | react-build-resolver | react-reviewer |
| C++ | cpp-build-resolver | cpp-reviewer |
| Dart / Flutter | dart-build-resolver | flutter-reviewer |
| Django | django-build-resolver | django-reviewer |
| Go | go-build-resolver | go-reviewer |
| Java（Spring/Quarkus） | java-build-resolver | java-reviewer |
| Kotlin | kotlin-build-resolver | kotlin-reviewer |
| Rust | rust-build-resolver | rust-reviewer |
| Swift | swift-build-resolver | swift-reviewer |
| PyTorch | pytorch-build-resolver | mle-reviewer（生产 ML） |
| HarmonyOS | harmonyos-app-resolver（审查+修复合一） | — |
| FastAPI / PHP / C# / F# / Vue | —（暂无专属 build-resolver） | fastapi-reviewer / php-reviewer / csharp-reviewer / fsharp-reviewer / vue-reviewer |

### Q2：多个 reviewer 之间如何并行调用？

为覆盖前端 PR，应在同一次变更中**并行**调用职责不重叠的 reviewer，避免漏审：

- `.tsx` / `.jsx` PR → `react-reviewer`（React 专属 lane）+ `typescript-reviewer`（通用 TS lane）+ 可选 `security-reviewer`
- `.vue` PR → `vue-reviewer`（Vue 专属 lane）+ `typescript-reviewer`（通用 TS lane）
- Django PR → `django-reviewer`（框架专属）+ `python-reviewer`（通用 Python）
- 任一 PR 发现 CRITICAL 安全问题 → 各 reviewer 都会**升级**给 `security-reviewer`

### Q3：架构类 agent 怎么选？

| 需求 | 选谁 |
|------|------|
| 给出分阶段、含文件路径的实施计划 | planner |
| 系统级架构决策、技术选型、ADR | architect |
| 契合现有代码模式的实现蓝图（含构建顺序） | code-architect |
| 摸清现有功能如何运作（调用链 / 依赖图） | code-explorer |
| 从现有代码提取行为规格（OpenSpec） | spec-miner |
| 无障碍设计（WCAG 2.2） | a11y-architect |
| 企业 / 多站点网络架构 | network-architect |
| 家庭 / 小型实验室网络 | homelab-architect |

### Q4：开源发布三阶段能否跳过 sanitizer？

**不能**。sanitizer 的设计就是作为独立审计者，**从不信任 forker 的产物**。forker 与 sanitizer 用的虽然是相同的 20+ 正则，但 sanitizer 独立重扫并在 PASS 前拒绝进入 packager 阶段——这是纵深防御，避免 forker 遗漏密钥直接泄露到公开仓库。

### Q5：哪些 agent 只读、绝不改代码？

- **只读评审**：architect、code-explorer、所有 reviewer（B/C 类）、network-architect、network-config-reviewer、network-troubleshooter、homelab-architect、opensource-sanitizer、comment-analyzer、type-design-analyzer、silent-failure-hunter、pr-test-analyzer、healthcare-reviewer、agent-evaluator
- **会改代码**：所有 build-resolver（D 类）、tdd-guide、refactor-cleaner、code-simplifier、performance-optimizer、security-reviewer（修漏洞）、doc-updater、spec-miner（只写 spec.md）、GAN 三件套、opensource-forker / packager、harmonyos-app-resolver、harness-optimizer

---

## 附录：模型档位分布

| 档位 | 数量 | agent |
|------|------|-------|
| 〔Opus〕 | 8 | planner, architect, spec-miner, healthcare-reviewer, chief-of-staff, gan-planner, gan-generator, gan-evaluator |
| 〔Sonnet〕 | 58 | 编码主力，覆盖绝大多数审查 / 构建修复 / 重构 / 业务 agent |
| 〔Haiku〕 | 1 | doc-updater（结构简单的文档生成） |

> 模型选择反映「按任务复杂度匹配成本」的原则（见《长文指南》）：探索 / 简单编辑用 Haiku，编码主力用 Sonnet，复杂架构 / 安全 / 对抗推理用 Opus。Opus 集中在规划、架构、GAN 评估、医疗安全与通讯参谋这类需要深度推理或高代价误判的场景。
