# SKILL 详细说明

## 一、ECC 安装·配置·元工具（6 个）

管理 ECC 自身安装、配置审计、skill/规则质量评估与 distill 的元工具。

### configure-ecc
- **执行步骤**：1) Step 0 克隆 ECC 仓库到 /tmp 并设 ECC_ROOT，失败则询问本地路径；2) Step 1 用 AskUserQuestion 选安装级别（user-level / project-level / both）并 mkdir 目标目录；3) Step 2 选 skill 范围（Core / Core+niche / Niche only），按 7 大类（Framework & Language、Database、Workflow & Quality、Business & Content、Research & APIs、Social & Content Distribution、Media Generation、Orchestration）确认 individual skills 后 cp -R 整目录；4) Step 3 multiSelect 选规则集（Common / TS-JS / Python / Go）并 cp；5) Step 4 自动验证：文件存在性 + grep 路径引用 + skill 间交叉引用（如 django-tdd→django-patterns）+ 报告问题；6) Step 5 可选优化：读 SKILL.md、按技术栈精简或调整规则覆盖率（仅改 $TARGET，不动 $ECC_ROOT）；7) Step 6 清理 /tmp 并打印安装汇总（级别、路径、清单、验证结果、优化项）
- **依赖**：AskUserQuestion 工具、git clone、cp -R、grep；引用 skills: continuous-learning、continuous-learning-v2（含 hooks 与 scripts 需整目录复制）、crosspost、content-engine、x-api、deep-research、exa-search、fal-ai-media、video-editing、dmux-workflow；引用 rules: common、typescript、python、golang
- **说明**：ECC 原生（metadata.origin: ECC）。bootstrap 方式：`/plugin install ecc@ecc` 或手动复制到 `~/.claude/skills/configure-ecc/`。注意 Core skills 在 `.agents/skills/` 而 Niche 在 `skills/`，源路径不同；`continuous-learning-v2` 的 `~/.claude/homunculus/` 始终为 user-level 属预期行为

### ecc-guide
- **执行步骤**：正文以清单+模板给出，含：① 新用户上手：给出短菜单（install/reset、pick skills、commands vs skills、hooks audit、harness audit、find workflow）并指向 README.md 与 /project-init；② Feature Discovery：用 `find skills -maxdepth 2 -name SKILL.md` 与 `rg -n "<query>" skills commands agents docs` 检索，优先 skill，命令仅在 maintained shim 或显式要求时推荐；③ Install Guidance：用 `node scripts/install-plan.js --list-profiles`、`--profile minimal --target claude --json`、`--skills <id> --target claude --json`、`node scripts/install-apply.js --dry-run` 生成 plan，警告勿叠加 plugin 与 full manual install；④ Project Onboarding：/project-init 序列（detect stack → dry-run plan → inspect CLAUDE.md → ask → apply）；⑤ Troubleshooting：先问目标 harness 与安装路径，再 inspect plugin metadata、各 harness `.claude/`/`.cursor/`/`.codex/` 等、hooks.json、install-state；⑥ 输出模板：Short Recommendation / Search Results / Install Plan Summary
- **依赖**：node（catalog.js、install-plan.js、install-apply.js）、find、rg；关联 commands/skills：/project-init、/harness-audit、/skill-health、/skill-create、/security-scan；npm scripts: harness:audit、observability:ready
- **说明**：第三方贡献（metadata.origin: community）。核心原则"answer from current files, not memory"——catalog 计数、特性列表、安装说明易过期。响应风格：先答案后下一步，避免默认 dump 全 catalog；不要用 manual cp 替代 managed installer；不要推荐已退役的 command shim

### ecc-recipes
- **执行步骤**：1) Live-read：解析 commands 目录（依次查 `~/.claude/plugins/marketplaces/ecc/commands`、`~/.claude/plugins/cache/ecc/ecc/*/commands`、`./commands`、`./.claude/commands`、`~/.claude/commands`），`find -maxdepth 1 -name '*.md'` 列名称；2) 按前缀分族（orch-\*、multi-\*、prp-\*、epic-\*、loop-\*、gan-\*、\*-build/\*-review/\*-test、hookify-\*、learn/instinct-\*/evolve/promote/prune、singletons）；3) 无描述→CATALOG MODE：输出每族成员数+含义+run-order+总数；有描述→MATCH MODE：1 句重述任务 → 选 1-2 个最匹配族并说 WHY → 输出 run-order 命令序列 → 明确 stop condition（max-runs/completion-signal/review-passes/single-shot，autonomous loop 警告订阅消耗并建议加 backstop）→ 给出 commands/<name>.md 路径与 /ecc-guide <name>；4) Advisory only：永不执行匹配到的命令
- **依赖**：find、bash；可选读 manifests/install-\*.json；关联 ecc-guide（单命令深档）、prompt-optimizer（改写 prompt）、loop-operator 相关命令（loop-start、loop-status、santa-loop）
- **说明**：第三方（origin: community，author: KyroZinLatt，v1.0.0）。命令 `/ecc-recipes <workflow description / empty>`。填补 ecc-guide（flat catalog）与 prompt-optimizer（单 prompt）之间的 family grouping + run-order + stop-condition 层。Do Not Use：用户想直接执行任务 / 想要单命令深档（用 ecc-guide）/ 想改写 draft prompt（用 prompt-optimizer）。永不 hardcode 命令数与成员列表

### skill-comply
- **执行步骤**：1) 自动从 .md 文件生成 expected behavioral sequence（spec）；2) 自动生成场景，prompt 严格度递减（supportive → neutral → competing）；3) 运行 `claude -p` 并通过 stream-json 捕获 tool call trace；4) 用 LLM（非 regex）将 tool call 对照 spec 步骤分类；5) 确定性检查时序（temporal ordering）；6) 生成自包含报告：spec、各场景 prompts、合规分、带 LLM 分类标签的 tool call 时间线。Dry run（`--dry-run`）只生成 spec+场景不消耗调用
- **依赖**：Tools: Read、Bash；`uv run python -m scripts.run`；`claude -p`（stream-json）；可选 `--gen-model haiku --model sonnet <path>` 自定义模型
- **说明**：ECC 原生。目标支持 skills/\*/SKILL.md、rules/common/\*.md、agents/\*.md（agent 调用验证，内部 workflow 验证尚不支持）。核心概念 Prompt Independence：测量 skill/rule 在 prompt 未显式支持时是否仍被遵守。报告可选附带 hook promotion 建议（针对低合规步骤）——主价值是合规可视化本身

### skill-scout
- **执行步骤**：1) Capture Intent：提取任务、触发条件、领域/工具/框架/数据源、3-5 个搜索关键词+同义词；2) Search Local：`find ~/.claude/skills` 与 `~/.claude/plugins/marketplaces` 下 SKILL.md（-maxdepth 2），grep frontmatter description；3) Search Remote：`gh search repos "claude code skill keyword" --limit 10 --sort stars`、`gh search code "name: keyword" --filename SKILL.md --limit 10`，外加至多 3 条 web 搜索；4) Vet External：读 SKILL.md frontmatter 与说明，查找可疑 shell/文件写入/网络调用/凭证处理/包安装，检查仓库维护状态，优先复制到 fresh 分支审 diff 而非改 marketplace 原件；5) Rank：精确名匹配 > 描述匹配 > 本地/marketplace > 维护活跃的 GitHub > 仅 web 提及，上限 10 条；6) Present：表格（Use existing / Fork or extend / Create fresh），仅在用户选择或无匹配时才创建
- **依赖**：find、grep；gh search（repos、code）；Web 搜索工具；关联 search-first skill（通用 search-before-building）、skill-stocktake（审计已安装 skill）、agent-sort（分类组织）
- **说明**：第三方（origin: community）。来源：salvaged from stale community PR #1232 by redminwang。反模式：可直接搜索时跳过创建；未读就安装外部 skill；冗长无排序的弱匹配列表；把 web-only 当可信源；就地编辑 marketplace 原件

### skill-stocktake
- **执行步骤**：Quick Scan：1) 读 results.json；2) `bash ~/.claude/skills/skill-stocktake/scripts/quick-diff.sh results.json`（项目目录从 $PWD/.claude/skills 自动探测）；3) 输出 `[]` 则报告无变更并停止；4) 用相同 Phase 2 标准重评变更项；5) 未变更项 carry forward；6) 仅输出 diff；7) save-results.sh 持久化。Full Stocktake：Phase 1 Inventory 用 scan.sh 枚举+frontmatter+mtime，呈现扫描摘要与清单表；Phase 2 Quality Evaluation 启动 general-purpose subagent（约 20 skill/chunk，逐块存 results.json `status:"in_progress"`，支持 resume），对每个 skill 按 4 项 checklist（内容重叠、与 MEMORY/CLAUDE.md 重叠、技术引用新鲜度、使用频次）出 verdict（Keep/Improve/Update/Retire/Merge into [X]）+自包含 reason；Phase 3 输出汇总表；Phase 4 Consolidation：Retire/Merge 逐文件说明问题+替代+影响并经用户确认，Improve 给具体改进，Update 给更新后内容，MEMORY.md >100 行则建议压缩
- **依赖**：Agent 工具（general-purpose subagent）；bash 脚本 scan.sh / quick-diff.sh / save-results.sh；可选 WebSearch 验证技术引用新鲜度；缓存 `~/.claude/skills/skill-stocktake/results.json`
- **说明**：ECC 原生。命令 `/skill-stocktake [full]`，作用域：`~/.claude/skills/` + `{cwd}/.claude/skills/`（若存在），项目级 skill 需从项目根目录运行。evaluated_at 必须用 `date -u +%Y-%m-%dT%H:%M:%SZ`，禁止 date-only 近似。评估 blind：不分 skill 来源分支标准；归档/删除必须用户显式确认

## 二、上下文·记忆·持续学习（14 个）

会话上下文管理、跨会话记忆持久化、从会话提取模式形成"本能"、自省与 prompt 优化。

### agent-introspection-debugging
- **执行步骤**：四阶段循环：Phase 1 Failure Capture 记录错误类型/堆栈/最近有意义工具调用序列/当前目标/context 压力源（重复 prompt、超大 log、重复 plan）/环境假设（cwd、branch、服务状态、预期文件），用最小 capture 模板；Phase 2 Root-Cause Diagnosis 将失败匹配已知模式表（loop/context overflow/ECONNREFUSED/429/文件丢失后 stale diff/测试仍失败）并问诊断问题（逻辑/状态/环境/策略失败？是否丢了真实目标？确定性还是瞬时？最小可逆验证动作？）；Phase 3 Contained Recovery 用最小动作改变诊断面（停止重复重试+重述假设、裁剪低信号 context、重查真实文件/branch/进程、收窄到一个失败命令/文件/测试、从推测切到直接观察、高风险则升级人类），填恢复 checklist；Phase 4 Introspection Report 输出可读报告（session、failure、root cause、recovery action、result、token/time burn、follow-up、待编码的预防性变更）。恢复启发式：重述目标 → 验证世界状态 → 缩小失败范围 → 跑一个判别性检查 → 才重试
- **依赖**：关联 verification-loop（恢复后若改了代码）、continuous-learning-v2（失败模式值得转 instinct/skill）、council（决策模糊而非技术失败时）、workspace-surface-audit（冲突本地状态或 repo drift 致失败）
- **说明**：ECC 原生。是 workflow skill 而非隐藏 runtime——教 agent 系统自调试。Scope 边界：feature 验证用 verification-loop；框架特定调试用更窄的 ECC skill；不要承诺当前 harness 无法自动 enforce 的 runtime。输出标准：不能只说"I fixed it"，必须给 failure pattern + root-cause hypothesis + recovery action + 证据

### agent-self-evaluation
- **执行步骤**：1) Collect Raw Material：原请求、最终输出、验证用的工具输出（测试/lint/exit code）、过程中用户反馈；2) Score Each Axis Independently：逐轴读问题→找证据→打 1-5 分→<5 则写一句引用具体 gap 的改进 note，禁止先平均再倒推；3) Produce Evaluation Report：一行 summary、5 轴 scorecard（score+evidence）、overall（简单平均，1 位小数）、按 impact 排序的 1-3 条具体改进、自检"Would the user agree?"；4) Apply the Improvement：任何轴 ≤3 则说明会怎么做不同，若 gap 可在 30 秒内修复则立即修，需返工则显式标记并说明重跑能提升分数。证据规则：每个 <5 的分数必须引用具体证据，"Show the gap, don't just name it"
- **依赖**：模板 templates/evaluation-report.md；关联 agent-eval（多 agent 头对头对比）、verification-loop（系统验证产出）、security-review（安全代码审查）
- **说明**：ECC 原生。5 轴：Accuracy（事实是否正确）、Completeness（是否覆盖所有要求）、Clarity（是否清晰结构化）、Actionability（用户能否立即行动）、Conciseness（是否最精简）。评分 5=Exceptional 至 1=Poor。反模式：全 5 无证据（自我恭维）；因 scope creep 过度扣分（只对照用户实际请求）；用评估重审已定设计；把个人偏好混入客观 gap

### blueprint
- **执行步骤**：5 阶段流水线：1) Research 预检（git、gh auth、remote、default branch）+ 读项目结构、既有 plans、memory 文件收集 context；2) Design 将目标拆成 one-PR-sized 步骤（典型 3–12 步），赋依赖边、并行/串行序、model tier（最强 vs default）、rollback 策略；3) Draft 写自包含 Markdown plan 到 `plans/`，每步含 context brief、任务清单、验证命令、exit criteria，使新 agent 无需读前序步骤即可执行；4) Review 委派对抗式审查给最强模型 sub-agent（如 Opus），对照 checklist 与反模式目录审查，修复所有 critical findings 后定稿；5) Register 保存 plan、更新 memory index、呈现步数与并行度汇总。自动探测 git/gh：有则生成 branch/PR/CI 全流程 plan，无则切 direct mode（原地编辑、不开分支）
- **依赖**：Claude Code（`/blueprint`）；可选 git + GitHub CLI（启用 branch/PR/CI，缺失则自动切 direct mode）；最强模型 sub-agent（如 Opus）做对抗式审查
- **说明**：第三方（origin: community）。frontmatter description 非空但任务要求从正文补全——正文明确：把一句话目标变成可冷启动执行的构造计划。灵感源自 antbotlab/blueprint。纯 Markdown skill：整个仓库只有 .md，无 hooks/shell scripts/可执行代码/package.json/build step，零运行时风险。不适用：单 PR 可完成、<3 个工具调用、用户说"just do it"。特性：cold-start execution、adversarial review gate、branch/PR/CI workflow（优雅降级）、parallel step detection、plan mutation protocol（split/insert/skip/reorder/abandon 带审计轨迹）

### ck
- **执行步骤**：数据布局 `~/.claude/ck/`（projects.json + contexts/<name>/context.json 真源 + CONTEXT.md 生成视图禁手改）。命令：`/ck:init` 跑 init.mjs 输出自动检测的 JSON，呈现确认稿→用户批准→echo 确认 JSON pipe 给 `save.mjs --init`；`/ck:save`（唯一需 LLM 分析）分析对话产出 summary（≤10 词）、leftOff、nextSteps、decisions[{what,why}]、blockers、可选 goal→展示草稿→确认→pipe 给 save.mjs；`/ck:resume [arg]` 跑 resume.mjs，verbatim 展示输出后问"Continue from here?"，若用户报告变化则立即跑 /ck:save；`/ck:info` 跑 info.mjs verbatim 展示无追问；`/ck:list` 跑 list.mjs，若用户回数字/名称则跑 /ck:resume；`/ck:forget` 先解析项目名→确认→跑 forget.mjs；`/ck:migrate` 支持 `--dry-run`，将 v1 CONTEXT.md+meta.json 转 v2 context.json，原文件备份为 meta.json.v1-backup 不删除
- **依赖**：Node.js（commands/\*.mjs：init、save、resume、info、list、forget、migrate）；SessionStart hook（hooks/session-start.mjs，需注册到 `~/.claude/settings.json`，每 session 注入约 100 tokens 的 5 行紧凑摘要，检测未保存 session、自上次 save 以来的 git 活动、与 CLAUDE.md 的 goal 不匹配）
- **说明**：第三方（origin: community，author: sreedhargs89，v2.0.0，repo: github.com/sreedhargs89/context-keeper）。命令大小写不敏感（/CK:SAVE 等同 /ck:save）。规则：始终将 `~` 展开为 `$HOME`；脚本 exit 1 时将其 stdout 当错误消息展示；禁止直接编辑 context.json 或 CONTEXT.md（必须用脚本）；projects.json 损坏则告知用户并提议 reset 为 `{}`

### code-tour
- **执行步骤**：1) Discover：探索 README、package/应用入口、目录结构、相关 config，PR 导览则看变更文件，未理解代码形状前不写步骤；2) Infer reader：按请求推断 persona 与深度（new-joiner 9-13 步、vibecoder 5-8、architect 14-18、pr-reviewer/rca-investigator/security-reviewer/feature-explainer/bug-fixer 7-11）；3) Read and verify anchors：确认每个文件路径存在、行号在范围、selection 块准确、易漂移文件优先 pattern anchor，禁猜行号；4) Write `.tour` 到 `.tours/<persona>-<focus>.tour`；5) Validate：所有引用路径存在、行/selection 有效、首步锚定真实文件/目录、`ref` 指向的分支/commit 真实包含每个引用文件。步骤类型：Content（少用，常作收尾）、Directory、File+line（默认）、Selection、Pattern（行易漂移时）、URI。写作规则 SMIG：每条 description 回答 Situation/Mechanism/Implication/Gotcha
- **依赖**：CodeTour 扩展（`.tour` JSON 格式，上游 microsoft/codetour）；关联 codebase-onboarding、coding-standards、council
- **说明**：ECC 原生。只创建 `.tour` JSON，不改源码。`ref` 字段陷阱：PR tour 必须指向 PR 分支（指 base 会让新文件步骤打不开）；onboarding/architecture 指向读者所在分支（常 main）或省略；不确定则省略让 CodeTour 直接读磁盘。叙事弧：orientation → module map → core execution path → edge case/gotcha → closing。反模式：flat 文件清单、通用描述、猜 anchor、quick tour 步数过多、首步 content-only、persona 错配

### codebase-onboarding
- **执行步骤**：四阶段：Phase 1 Reconnaissance 并行跑包清单检测（package.json/go.mod/Cargo.toml/pyproject.toml 等）+ 框架指纹（next.config/django settings/fastapi main 等）+ 入口识别（main./index./app./server./cmd/）+ 目录树快照（top 2 层，忽略 node_modules/vendor/.git/dist/build）+ config/工具检测（.eslintrc/tsconfig/Makefile/Dockerfile/CI/.env.example）+ 测试结构检测；Phase 2 Architecture Mapping 从侦察数据识别技术栈（语言版本/框架/数据库/ORM/构建工具/CI）、架构模式（monolith/monorepo/microservices/serverless、前后端拆分、API 风格 REST/GraphQL/gRPC/tRPC）、关键目录映射、数据流（trace 一个 request 从 entry→validation→business logic→database）；Phase 3 Convention Detection 识别命名（kebab/camel/Pascal/snake）、代码模式（错误处理、DI、状态管理、async 风格）、git 约定（branch/commit/PR workflow，浅克隆则注明）；Phase 4 Generate Artifacts 产出 Output 1 Onboarding Guide（Overview/Tech Stack 表/Architecture/Key Entry Points/Directory Map/Request Lifecycle/Conventions/Common Tasks/Where to Look）与 Output 2 Starter CLAUDE.md（已存在则先读后增强，保留项目特定指令并标注新增）
- **依赖**：Glob、Grep、Read（侦察阶段）；可选 git 历史；输出写 CLAUDE.md 到项目根
- **说明**：ECC 原生。最佳实践：不要全读（用 Glob/Grep 而非 Read 每文件）、verify 别 guess（config 与代码不一致时信代码）、尊重既有 CLAUDE.md（增强非替换，标注新增 vs 既有）、保持精简（指南 2 分钟可扫完）、标 unknown（"Could not determine test runner"胜过错误答案）。反模式：CLAUDE.md 超 100 行、列每个依赖、描述 src/ 等显而易见目录、复制 README（指南应提供 README 缺的结构洞察）

### continuous-learning
- **执行步骤**：作为 Stop hook 在每 session 末运行：1) Session Evaluation 检查消息数是否足够（默认 10+）；2) Pattern Detection 识别可提取模式；3) Skill Extraction 将有用模式保存到 `~/.claude/skills/learned/`。可编辑 config.json 调整 min_session_length、extraction_threshold、auto_approve、learned_skills_path、patterns_to_detect（error_resolution/user_corrections/workarounds/debugging_techniques/project_specific）、ignore_patterns（simple_typos/one_time_fixes/external_api_issues）。Hook 设置：在 `~/.claude/settings.json` 的 Stop hook 注册 `evaluate-session.sh`
- **依赖**：Stop hook（evaluate-session.sh）、config.json、`~/.claude/skills/learned/` 目录；关联 `/learn` 命令（手动 mid-session 提取）
- **说明**：ECC 原生。**DEPRECATED 2026-04-28**——frontmatter description 与正文顶部双标注。v2 严格超集：Stop hook 观察变为 PreToolUse/PostToolUse（100% 可靠）、完整 skill 变为带置信度评分的原子本能、仅全局存储变为项目作用域+全局晋升。文件保留作归档参考与旧安装向后兼容。研究笔记对比了 Homunculus v2 的更复杂方案并指出 v2 增强方向（本能化、后台 observer、置信度衰减、domain 标签、演化路径）

### continuous-learning-v2
- **执行步骤**：工作流（正文流水图）：Session Activity（git 仓库内）→ Hooks 捕获 prompts+tool use（100% 可靠）+ 检测项目 context（git remote / repo path）→ 写 `projects/<project-hash>/observations.jsonl` → Observer agent 后台读（Haiku）做 PATTERN DETECTION（用户纠正→本能、错误解决→本能、重复 workflow→本能、scope 决策 project 或 global）→ 创建/更新本能（personal/inherited，带 confidence 0.3-0.9 与 domain 标签）→ `/evolve` 聚类 + `/promote` 晋升 → evolved/ 目录生成 skill/command/agent。项目检测优先级：CLAUDE_PROJECT_DIR > `git remote get-url origin`（哈希得 portable ID）> `git rev-parse --show-toplevel`（机器特定）> 全局 fallback。数据目录在 `~/.claude` 之外（CLV2_HOMUNCULUS_DIR > $XDG_DATA_HOME/ecc-homunculus > $HOME/.local/share/ecc-homunculus）避开敏感路径守卫。命令：/instinct-status、/evolve、/instinct-export、/instinct-import、/promote [id]、/projects
- **依赖**：PreToolUse/PostToolUse hooks（observe.sh，plugin 安装则 Claude Code v2.1+ 自动加载 hooks/hooks.json）、Observer background agent（Haiku）、instinct-cli.py、config.json、scripts/migrate-homunculus.sh；关联 ECC-Tools GitHub App、Homunculus（启发了 v2 架构的社区项目）、`/learn` 命令
- **说明**：ECC 原生（v2.1.0）。v2.1 vs v2.0：存储从全局 `~/.claude/homunculus/` 改为项目作用域 `${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/projects/<hash>/`、加项目检测、加 promote/projects 命令（共 6 条）。v2 vs v1：观察从 Stop hook（session 末）变为 PreToolUse/PostToolUse（100% 可靠）、分析从主 context 变为后台 Haiku agent、粒度从完整 skill 变为原子本能、加 0.3-0.9 置信度、加 instinct→cluster→skill/command/agent 演化路径、加 export/import。手动安装需在 settings.json 加 PreToolUse+PostToolUse hook 块；plugin 安装则勿重复加（会导致双执行与 ${CLAUDE_PLUGIN_ROOT} 解析错误）。自动晋升标准：同一 instinct 在 2+ 项目出现且平均置信度 ≥0.8。隐私：观察仅本地；本能可导出但不含原始代码/对话；项目作用域隔离

### dynamic-workflow-mode
- **执行步骤**：正文以决策框架+模板给出，含：① Core Contract：harness 必须有 Objective（own 与 not own）、Inputs（文件/URL/prompts/数据源/凭证策略/用户约束）、Outputs（commit/report/screenshot/status file/control pane snapshot）、Eval（≥1 个 pass/fail 检查而非仅"it ran"）、Handoff（短 artifact 告诉下一操作者发生了什么/阻塞/如何恢复）；② Dynamic Harness Decision Tree：one-shot→inline、repeated+changing input→task-local harness、repeated across teammates/repos→shared skill、external state/queue/approval→加 control pane、safety risk→加 eval gate+人工 merge gate；③ Task-local Harness Template（Objective/Inputs/Loop 5 步/Eval/Handoff）；④ Shared Skill Extraction 准则（5 条中 ≥2 真：多 session/repo/team 出现、需特定语言或安全排序、失败因跳过 gate、稳定 I/O 契约、受益于 control pane）；⑤ Control Pane Checkpoints（Plan/Queue/Run/Gate/Handoff）；⑥ Eval Gates 表（Code=测试+lint+覆盖率+1 集成路径、UI=browser smoke+screenshot、Agent workflow=fixture transcript、Research=source-neutral brief+claim checklist、Integration=dry-run+config 验证+no-secret scan）
- **依赖**：ECC control pane / state-store-backed scripts（若启用 ECC2 state）；后续提取为 `skills/<name>/SKILL.md`（仅在需 legacy slash 入口时才加 command shim）
- **说明**：ECC 原生。原则：仅当 harness 比手动驱动相同步骤更便宜更安全时才产出 task-local harness。反模式：生成隐藏真实决策逻辑的脚本、把 dynamic workflow mode 当作跳过测试的借口、创建一次性文档（真正产品应是 shared skill 或 status artifact）、多 agent 无 ownership/merge gate/conflict policy 跑、让原始私有研究数据流入公开文档。输出标准：以 harness 或 skill 路径、eval 命令与结果、control pane 或 handoff artifact 路径、下一个可复用提取候选收尾

### growth-log
- **执行步骤**：三规则：Rule 1 Failures > Achievements（一个 2 小时找到的 bug 比 3 个一次成功的 feature 教得更多）；Rule 2 Bole Principle（伯乐原则）——写新条目前问"是否与我已记的本质相同？"，同根因不同症状→合并非复制，新根因→新条目（用关键词搜既有条目检查）；Rule 3 Must Be Transferable——每条必须回答"下次遇类似情况我会做什么不同"，提取模式 5 步：一句话陈述事件 → 迭代问 why 至根因（通常 3-5 why）→ 泛化"这是哪类问题" → 写成"下次见[signal]我 will[action]" → 命名 signal（什么可观察物告诉你这模式在起作用）。条目模板含 Context / Root Cause / The Pattern（transferable + Signal to recognize）/ Related。条目类型 4 种：Failure（强调 Root Cause）、Methodology（强调 Context/Pattern）、Pattern Discovery（强调 Pattern）、Capability Change（强调 before vs after Context）
- **依赖**：任意笔记系统（Markdown/Notion/Obsidian/plain text）；可选 delivery-gate Stop hook（检查学习文件是否当日修改）
- **说明**：ECC 原生（v1.1.0）。门槛判断：任务是否涉及 debugging/redoing/rollback/非显然决策？是→写条目；否（typo 修复、单行 tweak、无调试的 config 改）→跳过。条目典型 4-8 句：>2 分钟=在叙述事件；<30 秒=还不够深。质量 checklist：标题命名 pattern 而非 event、有"Next time I will..."句、Signal 足够具体、搜过重复（伯乐原则）、区分根因与症状、交叉链接相关条目、4-8 句。反模式："Fixed bug in X"、照抄 commit message、每次 commit 都写、跳过 transferable 句、同模式不同标题重复

### iterative-retrieval
- **执行步骤**：4 阶段循环（最多 3 周期）：Phase 1 DISPATCH 初始宽泛查询收集候选文件（按 patterns + keywords + excludes）；Phase 2 EVALUATE 评估检索内容相关性（High 0.8-1.0 直接实现 / Medium 0.5-0.7 相关模式或类型 / Low 0.2-0.4 弱相关 / None 0-0.2 排除，并 identifyMissingContext）；Phase 3 REFINE 根据评估更新查询（加高相关文件中发现的新 pattern、加代码库术语、排除确认无关路径、target 具体缺口）；Phase 4 LOOP 用细化后的条件重复（最多 3 周期，当 high-relevance ≥3 且无 critical gap 时提前返回）。实用示例：Bug Fix（token 过期）经 2 周期找到 session-manager.ts/jwt-utils.ts；Feature（rate limiting）经 3 周期发现代码库用"throttle"而非"limit"术语
- **依赖**：正文以伪 JavaScript 代码示例（retrieveFiles、evaluateRelevance、refineQuery、iterativeRetrieve）说明；关联 The Longform Guide（subagent orchestration 节）、continuous-learning skill、ECC 内置 agent 定义（手动安装路径 agents/）
- **说明**：ECC 原生。问题本质：标准方法失败——send everything 超 context limit、send nothing 缺关键信息、guess what's needed 经常错。最佳实践：从宽到窄渐进、第一周期常揭示命名约定、显式追踪缺口驱动细化、"good enough"停止（3 个高相关胜过 10 个平庸）、自信排除低相关文件（不会变相关）。可在 agent prompt 中嵌入"开始宽泛关键词搜索→评估每文件相关性（0-1）→识别缺失上下文→细化查询重复（最多 3 周期）→返回 relevance ≥0.7 文件"的指令

### nanoclaw-repl
- **执行步骤**：正文以能力清单+操作指引给出，含：① Capabilities：persistent markdown-backed sessions、`/model` 模型切换、`/load` 动态 skill 加载、`/branch` session 分支、`/search` 跨 session 搜索、`/compact` 历史压缩、`/export` 导出 md/json/txt、`/metrics` session 指标；② Operating Guidance：保持 session 任务聚焦、高风险变更前先 branch、重大里程碑后 compact、分享或归档前 export；③ Extension Rules：保持零外部 runtime 依赖、保留 markdown-as-database 兼容性、保持命令处理器确定性与本地
- **依赖**：`scripts/claw.js`、`claude -p`
- **说明**：ECC 原生。**正文信息特别单薄**——SKILL.md 仅约 30 行，远短于其他 skill，无 When to Activate 节、无数字编号步骤、无示例。所有能力以一句话罗列，操作与扩展规则各 3-4 条要点。是 ECC 自带的 NanoClaw REPL 操作手册而非完整工作流 skill

### prompt-optimizer
- **执行步骤**：6 阶段顺序流水（仅产出分析+优化 prompt，禁写代码/建文件/跑命令）：Phase 0 Project Detection 读 CLAUDE.md + 从 package.json/go.mod/pyproject.toml/Cargo.toml/build.gradle(pom.xml)/Package.swift/Gemfile/composer.json/*.csproj/Makefile/CMakeLists.txt/cpanfile 检测技术栈；Phase 1 Intent Detection 分类（New Feature/Bug Fix/Refactor/Research/Testing/Review/Documentation/Infrastructure/Design）；Phase 2 Scope Assessment（TRIVIAL/LOW/MEDIUM/HIGH/EPIC，按代码库大小或描述估）；Phase 3 ECC Component Matching 按意图+技术栈映射 command/skill/agent（如 New Feature→/plan+/tdd+/code-review+/verify+tdd-workflow+verification-loop+planner/tdd-guide/code-reviewer；Bug Fix→/tdd+/build-fix+/verify+tdd-workflow+tdd-guide/build-error-resolver；EPIC Design→blueprint skill）；Phase 4 Missing Context Detection 11 项 checklist（技术栈/目标 scope/验收标准/错误处理/安全/测试/性能/UI-UX/数据库变更/既有模式/scope 边界），缺失 ≥3 项则问用户至多 3 个澄清问题；Phase 5 Workflow & Model Recommendation 定位 Research→Plan→Implement(TDD)→Review→Verify→Commit 生命周期，MEDIUM+ 起手用 /plan，EPIC 用 blueprint skill，并给模型建议表（TRIVIAL-LOW→Sonnet、MEDIUM→Sonnet、HIGH→Sonnet 主+Opus 规划、EPIC→Opus blueprint+Sonnet 执行）+ 多 prompt 拆分建议。输出 5 段：Prompt Diagnosis / Recommended ECC Components / Optimized Prompt Full / Optimized Prompt Quick / Enhancement Rationale
- **依赖**：关联组件：configure-ecc（未安装时）、skill-stocktake（审计已装组件）、search-first（研究阶段）、blueprint（EPIC scope 优化 prompt，作为 skill 而非 command 调用）、strategic-compact（长 session context 管理）、cost-aware-llm-pipeline（token 优化）；引用大量 command（/plan、/tdd、/code-review、/verify、/build-fix、/refactor-clean、/e2e、/test-coverage、/update-docs、/update-codemaps、/save-session、/resume-session）与 agent（planner、architect、tdd-guide、code-reviewer、build-error-resolver、refactor-cleaner、e2e-runner、security-reviewer、doc-updater、python-reviewer、go-reviewer、go-build-resolver、java-reviewer、kotlin-reviewer、database-reviewer）
- **说明**：第三方（origin: community，author: YannJY02，v1.0.0）。frontmatter description 非空但任务要求从正文补全——正文细化了完整的 6 阶段分析与 5 段输出格式。Do Not Use：用户想直接执行任务、说"just do it / 直接做"、说"优化代码/优化性能/optimize this code/optimize performance"（属重构/性能任务）、问 ECC 配置（用 configure-ecc）、要 skill 清单（用 skill-stocktake）。即便用户说"just do it"也不切实现模式，应告知本 skill 仅产优化 prompt 并请用户改用正常任务请求

### strategic-compact
- **执行步骤**：正文以机制+决策指南给出，含：① Why Strategic Compaction：auto-compaction 在任意点触发（常 mid-task 丢上下文、无任务边界感知、可中断多步操作），strategic compaction 在逻辑边界（探索后执行前、里程碑后、major context shift 前）；② How It Works：suggest-compact.js 在 PreToolUse(Edit/Write) 跑，组合两信号——Context size（主）从 transcript_path 的最新 usage 记录求 input_tokens+cache_read+cache_creation（真实 context 大小），按 window-scaled 阈值建议（200k 窗口 160k、1M 窗口 250k，从 [1m] model marker 探测或观察 token 已超 200k 推断），之后每多 60k 提醒一次；Tool-call count（次）按调用数建议（默认 50，之后每 25 次）；③ Hook Setup 注册 PreToolUse(Edit)+(Write) 到 `~/.claude/settings.json`；④ Configuration 环境变量（COMPACT_THRESHOLD、COMPACT_CONTEXT_THRESHOLD、COMPACT_CONTEXT_INTERVAL、COMPACT_STATE_TTL_DAYS）；⑤ Compaction Decision Guide（Research→Planning=是、Planning→Implementation=是、Implementation→Testing=视情况、Debugging→Next feature=是、Mid-implementation=否、失败方法后=是）；⑥ What Survives Compaction 表（CLAUDE.md/TodoWrite/Memory/Git/磁盘文件 持续 vs 中间推理/读过的文件内容/多步对话/工具历史/口头偏好 丢失）；⑦ Token Optimization Patterns（trigger-table lazy loading、context composition awareness、duplicate instruction detection、token-optimizer MCP、context-mode）
- **依赖**：Node.js 脚本 suggest-compact.js（PreToolUse hook，matcher Edit/Write）、session transcript（transcript_path、usage 记录）；环境变量：COMPACT_THRESHOLD、COMPACT_CONTEXT_THRESHOLD、COMPACT_CONTEXT_INTERVAL、COMPACT_STATE_TTL_DAYS；可选 token-optimizer MCP、context-mode；关联 Memory persistence hooks、continuous-learning skill（session 结束前提取模式）
- **说明**：ECC 原生。核心洞察：tool count 是 window pressure 的弱代理（几次大文件读/MCP 响应即可填满 window，反之大量小调用可近空 window 越过 50），context-size 信号才在真正必要时触发。最佳实践：planning 后 compact、debugging 后 compact、不要 mid-implementation compact、读建议后自己决定是否采纳、compact 前先把重要 context 写文件/memory、`/compact` 带自定义 summary（如 `/compact Focus on implementing auth middleware next`）

## 三、Agent 编排·自主循环（22 个）

多 agent 委派、orch-* 流水线、自主循环（autonomous loops）、RFC/DAG 编排、团队编排、意图驱动开发等——把任务拆给多个子 agent 协同完成。

### agentic-engineering
- **执行步骤**：正文以原则集给出，含：①先定义完成标准再执行 ②拆成 agent 大小单元（15 分钟单元规则，每单元独立可验、单一主风险、明确 done 条件） ③按复杂度路由模型（Haiku 分类/样板，Sonnet 实现/重构，Opus 架构/根因） ④eval 优先循环（定义能力 eval+回归 eval→基线→实现→重跑对比 delta） ⑤会话策略（紧耦单元续会话、阶段切换起新会话、里程碑后压缩） ⑥成本纪律（按任务跟踪 model/token/retries/耗时/成败，仅在低层失败且推理不足时升级）；review 重点关注不变量、错误边界、安全/认证假设、隐式耦合、滚动风险
- **依赖**：ECC 原生；自包含（仅方法论，不绑定具体 agent/MCP/CLI）
- **说明**：单元规则、模型分层、成本纪律可直接落地；正文无显式 agent/MCP/CLI 依赖

### agentic-os
- **执行步骤**：1)写内核 CLAUDE.md（Identity、Agent Registry、Routing Rules、Model Policies）保持小而声明式 2)在 agents/ 下定义专家 agent 文件（Identity、Memory Scope、Tool Access、Constraints） 3)在 .claude/commands/ 放 slash 命令（/daily-sync、/outreach、/research 等） 4)用 data/ 下 JSON+markdown 做文件式记忆（daily-logs/projects/decisions/inbox/contacts/templates，append-only，schema 演进只加字段不改名） 5)用外部 cron（macOS LaunchAgent / Linux systemd timer / pm2）跑定时任务 6)每会话末写 reflection；并发多 agent 时内核做 sequential/parallel 路由
- **依赖**：ECC 原生；claude CLI（--cwd --command）、LaunchAgent/systemd/pm2；无外部数据库（纯文件）
- **说明**：反模式明确列出（单体重型 agent、无状态会话、硬编码凭证、为简单状态上 PostgreSQL、路由逻辑写进代码）；推荐 CLAUDE.md<200 行、每 agent 文件<100 行

### autonomous-agent-harness
- **执行步骤**：1)配置 MCP（memory、scheduled-tasks、computer-use，写入 ~/.claude.json） 2)建基础 cron（每日早会、每周学习抽取） 3)初始化记忆图（创建 user/projects/contacts 实体+observations） 4)可选启用 computer use（授权浏览器/桌面控制） 5)维护任务队列（写 ~/.claude/projects/*/memory/task-queue.md，TodoWrite+memory 文件） 6)按场景跑示例（自治 PR 评审/个人研究/会议准备）
- **依赖**：memory MCP、scheduled-tasks MCP、computer-use MCP、github MCP、exa MCP、supabase MCP、browser-use MCP、claude -p；参考 Hermes
- **说明**：ECC 原生；安全边界要求显式授权+范围限定；提供 Hermes→ECC 组件映射表；约束：cron 隔离会话、computer use 需显式权限、dispatch 有速率限制

### autonomous-loops
- **执行步骤**：正文以模式谱系给出，含：①Sequential Pipeline（claude -p 链式调用，每步独立上下文） ②NanoClaw REPL（scripts/claw.js，会话感知持久循环） ③Infinite Agentic Loop（两 prompt 系统：Orchestrator 解析 spec→扫描输出→并行部署 N 子 agent→wave 管理） ④Continuous Claude PR Loop（建分支→claude -p→commit→PR→等 CI→失败自动修→合并，SHARED_TASK_NOTES.md 桥接上下文） ⑤De-Sloppify Pattern（任何循环后接独立清理 pass 优于负面指令） ⑥Ralphinho/RFC-Driven DAG（RFC→AI 拆解为 WorkUnit+依赖 DAG→分层并行跑 research/plan/implement/test/review→merge queue 带驱逐恢复）；含决策矩阵与组合建议
- **依赖**：ECC 原生；claude -p、scripts/claw.js（NanoClaw）、continuous-claude CLI、gh（pr checks/run view）、git worktree、jj/Jujutsu（Ralphinho 用）；credit @enitrat、@disler、@AnandChowdhary
- **说明**：兼容保留一版；新循环建议写进 continuous-agent-loop；Ralphinho 是最复杂模式（tier 分级管线、独立上下文消除作者偏置、worktree 隔离、SQLite 持久化可恢复）

### claude-devfleet
- **执行步骤**：1)安装并启动 DevFleet server（独立项目 github.com/LEC-AI/claude-devfleet），claude mcp add devfleet 连接 2)Plan：plan_project(prompt) 返回 project_id+任务依赖链（auto_dispatch=true） 3)展示计划给用户确认 4)Dispatch：dispatch_mission(根 mission) 启动，依赖满足后自动续派 5)Monitor：get_mission_status 或 get_dashboard 轮询（30-60s） 6)Report：get_report 汇总 files_changed/what_done/errors/next_steps
- **依赖**：第三方（community）；DevFleet MCP server（`http://localhost:18801/mcp`）、git worktree（每 agent 一个隔离分支自动 merge）；并发默认上限 3（DEVFLEET_MAX_AGENTS）
- **说明**：工具集：plan_project/create_project/create_mission/dispatch_mission/cancel_mission/wait_for_mission/get_mission_status/get_report/get_dashboard/list_projects/list_missions；长任务建议轮询而非 wait_for_mission 阻塞；循环依赖禁止；merge 冲突留在分支待人工

### continuous-agent-loop
- **执行步骤**：正文以流程+清单给出，含：①Loop Selection Flow（需严格 CI/PR 控制→continuous-pr；需 RFC 拆解→rfc-dag；需探索式并行生成→infinite；否则→sequential） ②推荐生产组合栈（RFC 拆解+质量门+eval 循环+会话持久化） ③失败模式（循环空转无进展、同根因反复重试、merge queue 停滞、成本漂移） ④恢复手段（冻结循环→跑 /harness-audit→缩范围到失败单元→用明确验收标准重放）
- **依赖**：ECC 原生；ralphinho-rfc-pipeline、plankton-code-quality、/quality-gate、eval-harness、nanoclaw-repl、/harness-audit；关联 autonomous-loops
- **说明**：正文偏精炼（流程图+清单，无长示例）；明确与 autonomous-loops 的兼容关系

### dmux-workflows
- **执行步骤**：正文以模式集给出，含：①Research+Implement（研究轨+实现轨并行后合并） ②Multi-File Feature（按独立文件分 pane） ③Test+Fix Loop（watch 轨+修复轨） ④Cross-Harness（不同 pane 用不同 AI 工具） ⑤Code Review Pipeline（多视角并行评审） ⑥ECC 编排助手 scripts/orchestrate-worktrees.js（按 plan.json 建 worktree+tmux pane+per-worker task/handoff/status 文件，支持 seedPaths 覆盖本地未提交文件）
- **依赖**：ECC 原生；dmux（tmux pane 管理器，需另装 github.com/standardagents/dmux）、tmux、git worktree、Codex/Cline/Gemini/Qwen 等 harness；Superset（终端 IDE）
- **说明**：最佳实践：仅并行独立任务、清晰边界、合并前 review、文件冲突用 worktree、pane≤5-6；ECC 自带 orchestrate-worktrees.js 助手脚本

### enterprise-agent-ops
- **执行步骤**：正文以领域集给出，含：①四大运维域（运行时生命周期、可观测性 logs/metrics/traces、安全控制 scopes/permissions/kill switch、变更管理 rollout/rollback/audit） ②基线控制（不可变部署产物、最小权限凭证、环境级密钥注入、硬超时+重试预算、高风险审计日志） ③追踪指标（成功率、平均重试、恢复时间、每成功任务成本、失败分类分布） ④事故模式（冻结新 rollout→抓代表性 trace→隔离失败路由→最小安全补丁→回归+安全检查→逐步恢复） ⑤部署集成（PM2/systemd/容器编排/CI-CD 门）
- **依赖**：ECC 原生；PM2、systemd、容器编排器、CI/CD gates
- **说明**：正文简短（原则清单，无示例与代码）；定位于企业级运维治理

### hermes-imports
- **执行步骤**：1)识别可重复的 operator loop 2)剥离私有输入输出 3)本地路径改写为 repo-relative 4)一次性指令转成 When To Use+短流程 5)加具体输出要求 6)开 PR 前跑密钥+本地路径扫描；脱敏清单覆盖绝对路径、~/.hermes、API key/token、电话邮箱、客户/家庭名、收入/健康/CRM、私有系统日志
- **依赖**：ECC 原生；自包含（脱敏方法论）；来源 Hermes（operator shell）
- **说明**：输出契约：候选 skill 名+脱敏工作流摘要+必需公开输入+已移除私有输入+残留风险+待建/改文件；明确"需要私有状态才能讲通的 workflow 保留本地"

### hookify-rules
- **执行步骤**：正文以格式指南给出，含：①基本结构（name kebab-case/动词开头、enabled、event bash|file|stop|prompt|all、action warn|block、pattern regex） ②高级多条件（conditions 含 field+operator regex_match/contains/equals/not_contains/starts_with/ends_with，全满足才触发） ③按事件类型（bash 匹配命令、file 匹配 Edit/Write、stop 完成检查、prompt 匹配用户输入） ④正则技巧与陷阱（转义、宽窄平衡、YAML 转义） ⑤文件组织（.claude/hookify.{name}.local.md，加入 .gitignore） ⑥命令 /hookify、/hookify-list、/hookify-configure、/hookify-help
- **依赖**：第三方（无 origin 标注）；python3（测试正则用）；对应命令 /hookify、/hookify-list、/hookify-configure、/hookify-help
- **说明**：规则文件存放 .claude/hookify.{rule-name}.local.md；本地规则建议 gitignore

### intent-driven-development
- **执行步骤**：1)Inspect context first（先读仓库/文档/schema/测试基建取技术事实，产品/业务约束只能问用户） 2)Choose depth（Quick Capture 3-7 条 vs Full Acceptance Brief 用于安全/数据/迁移/跨系统） 3)Ask minimally（只问无法推断且实质影响范围的问题） 4)Write observable criteria（每条 AC-NNN 含 scenario/trigger/expected/prohibited side effect/verification/priority，禁用"correctly""securely"等模糊词） 5)Proceed or hand off（无阻塞风险则记录后继续，有风险则列阻塞等确认） 6)Handle revision（实现中遇约束致 AC 失败时标 [revised]、改 scope 或验证法、增版本号、只重提变更条目）
- **依赖**：第三方（无 origin）；自包含（方法论+模板）；不调用其他 skill/agent
- **说明**：10 条操作规则严格（不从代码推断业务约束、默认不阻塞实现、仅安全/数据/迁移/合同破坏等才需确认、测试是证据非真理、禁含真实密钥等）；附 Pass/Fail 例子与 Rubric 自检

### loop-design-check
- **执行步骤**：Action1 写 loop（5 步）：①减法优先（4 条件门：周重复+可自动验证+预算扛得住+有可跑可看的工具，任缺不建） ②定义机器可判定目标（五点框架：done 可机判、边界条件、失败兜底重试上限 N+升级人工、目标分层、优先对账而非断言） ③选 loop 类型（servo 有 done 测试/regulator 维持状态/regulator 带退出/包 schedule） ④选骨架（维护型=文档驱动 dispatch；新建型=plan-build-judge 三角色，judge 独立+确定性+build 不得改验收） ⑤加阻尼（重试上限+硬停+人工翻最后开关；分三阶段落地：手跑一次→固化 skill/子 agent→挂 cron）；Action2 体检：跑五失败模式表（目标正确但空泛→空转；验证靠"看着行"→自判；只门"测试全过"→删测试；指望运行中澄清→不会；文档/记忆陈旧→越快越错）+三条红线（判断留人、责任不转移、越自改越严审）
- **依赖**：ECC 原生；autonomous-loops、continuous-agent-loop（机制层，本 skill 不重复）；plan/build/judge 三角色（Claude Code 子 agent）
- **说明**：定位机制层之上的"判断层"；附 nightly green-keeper 评审示例；强调可判定目标+对账优先+人工守标准

### orch-add-feature
- **执行步骤**：1)跑 orch-pipeline 引擎（设置：默认 standard 起步含 Research+Plan；phase mask 0→1→2→4→5→6 跳 3 Scaffold；phase4 先写新行为失败测试再实现） 2)先分类大小，small/trivial 塌缩到 4→5→6 3)Gate 1 计划审批停 4)实现+code-reviewer，触安全 trigger 加 security-reviewer 5)Gate 2 pre-commit 确认后提交
- **依赖**：orch-pipeline（共享引擎）；planner、architect、code-architect、tdd-guide、code-reviewer、security-reviewer、build-error-resolver；/feature-dev、/code-review、/build-fix
- **说明**：ECC 原生；/feature-dev 是独立版，本 skill 共享 size 分类器+两门；提交 feat:

### orch-build-mvp
- **执行步骤**：1)跑 orch-pipeline 引擎（设置：默认 large 含 Scaffold；phase 0 读 spec→1→2 重→3 scaffold→4→5→6；phase 0→2 先读文档抽取 scope/锁定决策/特性列表，排成薄垂直片，先一条端到端通路） 2)复用 GAN harness：把 SDD 译成 gan-harness/spec.md+eval-rubric.md 3)/gan-build "<brief>" --skip-planner（默认 --max-iterations 15 --pass-threshold 7.0 --eval-mode playwright，非 UI 用 --eval-mode code-only）跑 gan-generator→gan-evaluator 循环写 feedback-NNN.md 4)Gate 1 切片计划确认、Gate 2 pre-commit 5)触安全 trigger 加 security-reviewer
- **依赖**：orch-pipeline；/gan-build、gan-planner、gan-generator、gan-evaluator、security-reviewer；playwright（eval-mode）
- **说明**：ECC 原生；slice 与 MVP 提交分开 feat: commit

### orch-change-feature
- **执行步骤**：1)跑 orch-pipeline 引擎（设置：默认 small；phase 0→(1 仅需研究时)→轻 2→4→5→6；phase4 先把现有测试改成新行为再改实现到绿） 2)计划保持轻，仅 standard+ 才走完整 planner 3)Gate 1 计划/改后测试确认、Gate 2 pre-commit 4)触安全 trigger 加 security-reviewer
- **依赖**：orch-pipeline；planner、tdd-guide、code-reviewer、security-reviewer
- **说明**：ECC 原生；"先改测试"是区分 tweak 与 fix 的关键；与 orch-fix-defect/orch-add-feature 的区分表明确

### orch-fix-defect
- **执行步骤**：1)跑 orch-pipeline 引擎（设置：默认 small 常 trivial；phase 0→(轻 2 仅根因不明显或 standard+)→4→5→6，Research(1) 通常跳；phase4 先写复现 bug 的失败回归测试再修到绿） 2)根因不清先用 code-explorer 限定范围，构建挂了升级 build-error-resolver 或 /build-fix 3)Gate 1（仅产出了计划才停）、Gate 2 pre-commit 4)触安全路径加 security-reviewer
- **依赖**：orch-pipeline；code-explorer、tdd-guide、code-reviewer、security-reviewer、build-error-resolver；/build-fix
- **说明**：ECC 原生；"先证 bug 存在"是区分 fix 与 tweak 的关键；提交 fix:

### orch-pipeline
- **执行步骤**：1)Step 0 分类大小（按文件数/新依赖或契约/设计模糊度三信号取最高 tier：trivial→4-5-6、small→(轻1)-4-5-6、standard→1-2-4-5-6、large→1-2-(3)-4-5-6；触安全 trigger 或公共 API 至少 standard） 2)Phase 0 Intake（复述请求，MVP 时读 spec 抽 scope/锁定决策/特性表） 3)Phase 1 Research&Reuse（gh search repos/code→Context7/厂商文档→包注册表→Exa，优先采用成熟实现） 4)Phase 2 Plan 委派 planner（或 architect/code-architect）出 task_list 薄垂直片 →GATE 1 5)Phase 3 Scaffold（仅 MVP 立首端到端片） 6)Phase 4 Implement 用 tdd-guide/tdd-workflow 红→绿→重构 7)Phase 5 Review code-reviewer//code-review，触安全 trigger 加 security-reviewer 8)Phase 6 Conventional commits 一逻辑块一提交 →GATE 2
- **依赖**：planner、architect、code-architect、tdd-guide、tdd-workflow（skill）、code-reviewer、security-reviewer、build-error-resolver、code-explorer、各语言 reviewer（python-reviewer、typescript-reviewer 等）、gan-generator、gan-evaluator；gh、Context7、Exa；/feature-dev、/plan、/code-review、/build-fix、/refactor-clean、/gan-build
- **说明**：ECC 原生；orch-* 五操作（add/change/fix/refine/build-mvp）共享此引擎+size 分类器+两门；安全 trigger=认证授权/用户输入/DB 查询/文件系统路径/外部 API/加密/密钥；两门：GATE1 计划审批、GATE2 提交确认，门间不停

### orch-refine-code
- **执行步骤**：1)跑 orch-pipeline 引擎（设置：默认 standard（重构多文件）；phase 0→2 计划重构→4 保持绿→5→6，不写新行为测试，现有套件是安全网；phase4 先确认相关测试存在且绿，覆盖薄则先加 characterization 测试，再小步重构每步重跑测试） 2)死代码/重复扫描委派 refactor-cleaner（跑 knip/depcheck/ts-prune 安全移除） 3)Gate 1 重构计划确认、Gate 2 pre-commit 4)提交 refactor: 必须 behavior-neutral
- **依赖**：orch-pipeline；planner、refactor-cleaner、code-reviewer；knip、depcheck、ts-prune（由 refactor-cleaner 跑）
- **说明**：ECC 原生；强调先绿后动；与 orch-change-feature/orch-fix-defect 区分明确

### plan-orchestrate
- **执行步骤**：1)Phase 0 检测 ECC 模式+语言（plugin 装在 ~/.claude/plugins/marketplaces/everything-claude-code/ 则 {ORCH_CMD}=/everything-claude-code:orchestrate、agent 加前缀；否则 legacy /orchestrate 裸名；--lang auto 多语言探测+PyTorch 子配置） 2)Phase 1 拆步骤（显式编号/表格 Step 列/---分隔块/否则按 H2） 3)Phase 2 打标签选链（按触发词分 design/plan/impl/test/refactor/migration/db/security/build/docs/lookup/review/loop，默认链表+组合规则：impl+security→tdd-guide,reviewer,security-reviewer；impl+db→tdd-guide,database-reviewer,reviewer；去重；链长≤4；impl/refactor/migration 必须以 reviewer 收尾） 4)Phase 3 压缩任务描述（[Plan: path#step-id]+1-3 验收+可选 Out of scope，200-600 字单行转义引号） 5)Phase 4 输出 Markdown（总览表+每步 bash 块+批量执行块，>1500 行进 overview-only 模式） 6)Phase 5 自检（agent 全来自目录、前后缀同形不混、无虚构 flag、每步单行双引号、链长≤4、reviewer 收尾等）
- **依赖**：planner、architect、tdd-guide、code-reviewer、security-reviewer、refactor-cleaner、doc-updater、docs-lookup、e2e-runner、database-reviewer、harness-optimizer、loop-operator、chief-of-staff、各 build-resolver（cpp/go/java/kotlin/rust/pytorch-build-resolver、build-error-resolver）、各 reviewer（python/typescript/go/rust/cpp/java/kotlin/flutter-reviewer）；Context7（docs-lookup 用）；/orchestrate custom
- **说明**：ECC 原生；仅生成不执行；agent 目录写死须严格匹配；plugin/legacy 两种安装形式前缀必须全程一致不可混；关联命令 /orchestrate

### ralphinho-rfc-pipeline
- **执行步骤**：正文以阶段+模板给出，含：①七阶段管线（RFC intake→DAG 拆解→unit 分配→unit 实现→unit 验证→merge queue 集成→最终系统验证） ②Unit Spec 模板（id/depends_on/scope/acceptance_tests/risk_level/rollback_plan） ③复杂度 tier（Tier1 隔离文件+确定性测试；Tier2 多文件行为变更中等集成风险；Tier3 schema/auth/perf/security 变更） ④每 unit 质量管线（research→实现计划→实现→测试→review→merge-ready 报告） ⑤Merge queue 规则（依赖失败不合并、总是 rebase 到最新集成分支、每次排队合并后重跑集成测试） ⑥恢复（unit 卡住：驱逐出队→快照发现→重生成窄 scope→带更新约束重试）；输出 RFC 执行日志/unit 记分卡/依赖图快照/集成风险摘要
- **依赖**：ECC 原生；参考 humanplane 风格；与 autonomous-loops 中 Ralphinho 模式同源（@enitrat）；git rebase、集成测试 runner
- **说明**：正文偏模板化（无完整代码示例）；autonomous-loops 的 Ralphinho 段有更细的 tier 分级管线、独立上下文消除作者偏置、worktree 隔离（jj/Jujutsu）说明，可互参

### team-agent-orchestration
- **执行步骤**：1)Shape the board（把模糊意图变成有 owner+merge 门的 work item） 2)Pick execution mode（单 agent/dynamic workflow/dmux-tmux/worktree fan-out/外部桌面编排器） 3)Assign boundaries（一卡一 owner、清晰文件 scope、无重叠写入除非有 integrator） 4)Run agents（每个 agent 写证据+交接笔记而非只代码） 5)Review in sequence（测试→diff review→安全/风险→内容/产品打磨） 6)Merge deliberately（一个 integrator 解冲突并更新控制面板） 7)Extract reusable skill（卡模式重复则提升进 skills/）；Agent Kanban 七列：Backlog/Ready/Running/Review/Blocked/Merged/Archived（各列明确退出条件）
- **依赖**：ECC 原生；dmux、tmux、Zellij、Hermes、Devin、Codex、Claude Code（多 harness 并存）；worktree fan-out；card JSON schema 含 owner/branch/worktree/acceptance/merge_gate/handoff
- **说明**：失败模式清单（agent soup、invisible work、board theater、overlapping writes、no product artifact）；控制面板必须答：谁拥有/改了什么/哪个门失败/什么能安全合并

### team-builder
- **执行步骤**：1)Discover（跑 claude agents 取全表：plugin 加 plugin-name: 前缀用冒号后做名+插件名做域；user 无前缀读 ~/.claude/agents 或 ./agents 的 md，子目录布局域=文件夹名/扁平布局按首段前缀≥2 文件聚合，名取首个 # Heading 否则文件名 title-case，描述取首段） 2)Present domain menu（显示域+每域 agent 数，跳过空域） 3)Handle selection（数字"1,3"/名字"security + seo"模糊匹配/"all from engineering"；>5 个则按字母序列出请收窄） 4)Spawn in parallel（读 md→prompt 任务→用 Agent 工具 subagent_type general-purpose 并行派发，独立无互通，失败内联标注继续） 5)Synthesize（按 agent 分组+共识/冲突/下一步；单 agent 跳过综合）
- **依赖**：第三方（community）；claude CLI（claude agents 命令）、Agent 工具（并行 general-purpose 子 agent）；支持 ECC marketplace plugin agent（everything-claude-code: 前缀）
- **说明**：规则：纯动态发现不硬编码、每队≤5、并行 Agent 调用而非 TeamCreate（仅当需 agent 辩论才用 TeamCreate）；扁平布局按首段 `-` 拆分，多词域（如 product-management）建议用子目录布局

## 四、TDD·测试·验证（11 个）

测试驱动开发、E2E/浏览器/桌面测试、评估框架（eval-harness）、持续验证循环、agent 自评——保障代码正确性的通用测试与验证 skill（语言专属的 *-testing/*-tdd 见第十四章）。

### agent-eval
- **执行步骤**：1) 在 `tasks/` 目录编写 YAML 任务定义（含 prompt、目标文件、judge 判定、固定 commit）；2) 运行 `agent-eval run --task ... --agent ... --runs 3`，每次自动创建 git worktree 隔离、执行 prompt、跑 judge、记录 pass/fail 与 cost/time；3) 运行 `agent-eval report --format table` 生成对比报告
- **依赖**：外部 CLI：agent-eval（需从其仓库安装）；git（worktree 隔离）；可选被测 agent：claude-code、aider、codex 等；judge 类型：pytest、npm build、grep、LLM-as-judge
- **说明**：自包含；最佳实践：每 agent 至少 3 次试验取方差、固定 commit 可复现、每任务至少一个确定性 judge、任务定义按 fixture 版本化管理

### agent-harness-construction
- **执行步骤**：正文以清单/模式给出，含：①动作空间设计（稳定显式工具名、schema-first 输入、确定性输出、避免 catch-all）；②粒度规则（高危用 micro-tool、常见循环用 medium、往返开销主导时用 macro）；③观察设计（status/summary/next_actions/artifacts）；④错误恢复契约（根因提示、安全重试、显式停止条件）；⑤上下文预算（最小化 system prompt、按需加载 skill、引用文件而非内联、相位边界压缩）；⑥架构模式（ReAct/Function-calling/Hybrid）；⑦反模式
- **依赖**：自包含；可选关联：benchmarking 指标（completion rate、retries、pass@1/pass@3、cost/success）
- **说明**：自包含；无外部依赖；定位为方法论指南而非可执行工具

### agent-sort
- **执行步骤**：1) 读取仓库，确立真实技术栈（语言/框架/包管理器/测试/lint/部署）；2) 为每个候选组件构建证据表（路径/类型/桶/证据/理由）；3) 依据证据决定 DAILY vs LIBRARY；4) 转化为安装计划（DAILY→安装到 `.claude/`、LIBRARY→保持可搜索）；5) 可选创建 `skill-library` 路由；6) 验证结果（文件存在、过时规则已清、不兼容 hook 未装），返回 DAILY/LIBRARY 计数与残留问题报告
- **依赖**：CLI：rg（ripgrep）、cat；并行 subagent（可选，按 6 路并行：agents/skills/commands/rules/hooks/extras）；关联 skill：configure-ecc、skill-stocktake、strategic-compact
- **说明**：注：归入本测试章节为名义归类，实际偏"安装规划"；输出格式为 STACK/DAILY/LIBRARY/INSTALL PLAN/VERIFICATION 五段式

### ai-regression-testing
- **执行步骤**：正文以清单/模式给出，含：①sandbox-mode API 测试（强制 SANDBOX_MODE=true，无数据库依赖）；②createTestRequest/parseResponse 测试辅助；③按"找到 bug 处写测试"原则编写回归用例（命名如 BUG-R1）；④sandbox/production 契约一致性测试；⑤集成到 bug-check 命令的工作流（先 npm test 与 build、再 AI 评审、再为每 fix 写回归测试）；⑥常见 AI 回归模式（路径不一致、SELECT 漏字段、错误状态泄漏、缺少 rollback、类型转换掩盖 null）
- **依赖**：CLI/工具：vitest、npm run build；框架：Next.js App Router（示例）；关联命令：/bug-check（自定义 .claude/commands/bug-check.md）；关联 skill：systematic-debugging、verification-before-completion、test-driven-development（同 superpowers 命名空间）
- **说明**：自包含；核心论点"AI 写+AI 审=系统性盲区，只有自动化测试能截住"；策略是"测 bug 出现的地方，不追覆盖率"；Top1 AI 回归=sandbox/production 路径不一致

### browser-qa
- **执行步骤**：1) Phase 1 Smoke：导航到 URL、过滤 console 错误、查 4xx/5xx、桌面+移动端首屏截图、核对 Core Web Vitals（LCP<2.5s、CLS<0.1、INP<200ms）；2) Phase 2 交互：点每个 nav 链接、有效/无效表单提交、auth 登录→保护页→登出流程、关键用户旅程（默认只读，变更类旅程需显式 opt-in 且仅在 staging）；3) Phase 3 视觉回归：3 断点（375/768/1440px）截图比对 baseline、标记布局位移>5px、查暗色模式；4) Phase 4 可访问性：跑 axe-core、查 WCAG 2.2 AA 违例、键盘导航、屏幕阅读器 landmark；5) 输出 QA Report（含 SHIP/SHIP WITH FIXES/DO NOT SHIP 判定）
- **依赖**：MCP：claude-in-chrome（首选）、Playwright via browserbase、Puppeteer 脚本；工具：axe-core；关联命令：/canary-watch（部署后监控配对）
- **说明**：自包含；安全硬约束：默认只读、变更类旅程需显式 opt-in+staging URL、用测试凭据非生产凭据、截图前脱敏；无 baseline 时报 INCONCLUSIVE 而非静默 PASS；axe-core 仅覆盖约 30–40% WCAG，自动化通过≠可访问

### click-path-audit
- **执行步骤**：1) Step 1 映射状态 stores：为每个 store action 记录 sets 与 resets，标注"DANGEROUS RESETS"（动作清理了不属于自己的字段）；2) Step 2 审计每个触点：按 handler 内调用顺序 trace（读/写/副作用/是否 reset），核对最终状态是否符合按钮文案预期、是否有竞态；3) Step 3 报告：每 bug 给 CLICK-PATH-NNN 编号、严重级、触点位置、bug 模式（Sequential Undo/Async Race/Stale Closure/Missing Transition/Dead Path/useEffect Interference）、trace、expected/actual/fix
- **依赖**：关联 skill：systematic-debugging（先运行，找其余 54 类 bug）、verification-before-completion（后运行验证修复）、test-driven-development（每个 bug 应配测试）；可并行 subagent（Agent 1 映射 stores 必须先完成，作为其余 page-agent 的共享上下文）
- **说明**：自包含；范围控制：全应用/单页/store-focused 三档；非 API/styling/performance 工具（用 systematic-debugging 或 profiling）；灵感案例="New Email"按钮被 selectThread 副作用静默 reset composeMode

### e2e-testing
- **执行步骤**：正文以清单/模式给出，含：①测试文件组织（auth/features/api 分类、fixtures、playwright.config.ts）；②Page Object Model 模板（locator 用 data-testid、goto/search/waitForResponse）；③测试结构（beforeEach goto、断言、screenshot）；④Playwright 配置（fullyParallel、retries、reporter html/junit/json、trace on-first-retry、多浏览器 project）；⑤flaky 处理（test.fixme/quarantine、--repeat-each/--retries 识别、竞态/网络/动画时序修复用 locator auto-wait + waitForResponse）；⑥artifact 管理（screenshot/trace/video）；⑦CI/CD（GitHub Actions 安装 browser、上传 report artifact）；⑧Web3 注入 mock window.ethereum；⑨金融流程跳过 production
- **依赖**：CLI：playwright（npx playwright install/test）；工具：@playwright/test、GitHub Actions（actions/upload-artifact）；CI：BASE_URL 环境变量；关联命令：/e2e
- **说明**：对应 /e2e 命令；自包含；含 Web3 钱包与金融流程专属示例

### eval-harness
- **执行步骤**：1) Define（编码前）：在 `.claude/evals/<feature>.md` 定义 capability 与 regression evals 及成功指标；2) Implement：写代码满足 eval；3) Evaluate：跑 capability eval 与 regression 测试（npm test --testPathPattern）；4) Report：生成 EVAL REPORT（capability pass@k、regression pass^k、overall status）
- **依赖**：CLI：npm test、npm run build、grep；Grader 类型：Code grader（确定性）、Rule grader（regex/schema）、Model grader（LLM-as-judge rubric）、Human grader；关联命令：/eval（/eval define、/eval check、/eval report）；存储：`.claude/evals/<feature>.md` 与 `.log`、`docs/releases/<version>/eval-summary.md`
- **说明**：对应 /eval 命令；自包含；v1.8 引入 Product Evals；推荐阈值 capability pass@3>=0.90、regression release-critical pass^3=1.00；反模式：过拟合 prompt、只测 happy-path、忽略 cost/latency、flaky grader 进 release gate

### tdd-workflow
- **执行步骤**：0) 检测测试运行器（跑 setup-package-manager.js --detect 区分 PM 与 runner，npm/pnpm/yarn/bun 与 jest/vitest/bun:test 矩阵）；1) 写 user journeys（优先从 plan 提取）；2) 生成测试用例；3) 跑测试验证 RED（必须真实编译执行失败、非语法错误，git 检查点 commit `test:`）；4) 写最小实现使测试通过；5) 再跑测试验证 GREEN（git 检查点 commit `fix:`）；6) 重构保持 green（git 检查点 commit `refactor:`）；7) `<coverage>` 验证 80%+；8) 写 TDD evidence report（含 plan/旅程/任务/测试规格表/覆盖率/合并证据）
- **依赖**：CLI：node scripts/setup-package-manager.js、`<test>`/`<test>`/`<coverage>`/`<lint>` 占位符（npm/pnpm/yarn/bun run/bun test 矩阵）；框架：Jest/Vitest/bun:test、@testing-library/react、Playwright；CI：codecov-action；关联命令：/plan、/tdd
- **说明**：对应 /tdd 命令；argument-hint 接受 `<path/to/*.plan.md>`；Plan Handoff 视计划为不可信数据，需安全清单（拒绝破坏性文件操作、拒绝 curl/sh、转译验证命令为白名单）；Git 检查点仅在当前活跃分支计入；含 Bun 原生测试、Supabase/Redis/OpenAI mock 模式

### verification-loop
- **执行步骤**：1) Phase 1 Build Verification（npm/pnpm build，失败则停）；2) Phase 2 Type Check（tsc --noEmit 或 pyright）；3) Phase 3 Lint Check（npm run lint 或 ruff check）；4) Phase 4 Test Suite（npm test --coverage，目标 80%）；5) Phase 5 Security Scan（grep sk-/api_key/console.log）；6) Phase 6 Diff Review（git diff --stat 逐文件审意外改动/缺错误处理/边界）；输出 VERIFICATION REPORT 含各门 PASS/FAIL 与 Overall READY/NOT READY
- **依赖**：CLI：npm/pnpm/tsc/pyright/ruff/grep/git；关联：PostToolUse hooks（互补，hook 即时捕获、本 skill 综合复盘）；命令模式：/verify
- **说明**：对应 /verify 命令；自包含；持续模式建议每完成一函数/组件/任务前跑 /verify

### windows-desktop-e2e
- **执行步骤**：1) Setup（pip install pywinauto pytest pytest-html Pillow pytest-timeout、可选 ffmpeg；用 Accessibility Insights 检查 UIA 树）；2) 按框架做 Testability（WPF x:Name/WinForms AccessibleName/Win32 控件 ID/Qt setObjectName+setAccessibleName）；3) Page Object Model（base_page 含 by_id/by_name/by_class、wait_visible/wait_gone/wait_window/wait_until、click/type_text/get_text/screenshot）；4) conftest.py 启动 fixture（含失败截图、Qt5 设 QT_ACCESSIBILITY=1）；5) 定位策略 AutomationId>Name>ClassName+index>XPath；6) 三档隔离 Tier1 tmp_path env redirect / Tier2 Job Object / Tier3 Windows Sandbox；7) CI（windows-latest、setup-python、pytest 跑+上传 artifact）；8) Qt 专属（QComboBox/QMessageBox/QTableWidget 处理、Qt5/6 class_name_re）；9) Fallback 截图模式（pyautogui+opencv matchTemplate，DPI 缩放三铁律）
- **依赖**：CLI/库：pywinauto（UIA backend）、pytest、pytest-html、pytest-timeout、Pillow、ffmpeg（录屏）、Accessibility Insights for Windows（检视）；Fallback：pyautogui、opencv-python；CI：GitHub Actions windows-latest、actions/setup-python、actions/upload-artifact；关联 skill：e2e-testing（Web）、cpp-testing、cpp-coding-standards
- **说明**：自包含；不适用 Web/Electron/CEF/WebView2（用 e2e-testing）、移动、纯单元测试；Tier 1 为默认强制使用；QComboBox 下拉是独立顶层窗口需用 Desktop 查找；Qt 5.7–5.14 需手动 QT_ACCESSIBILITY=1；set_edit_text 在 Qt5.x 失败时回退 keyboard.send_keys；含 Per-Step Trace（E2E_TRACE=1，默认关闭，凭据测试禁用 E2E_TRACE_INCLUDE_TEXT）

## 五、代码审查·质量·门禁（15 个）

代码审查、生产就绪审计、代码健康度（CodeScene）、PR/canary 监控、规则 distill、对抗式审查（council/santa-method/gan）、配置与成本审计——把住代码质量与上线门禁。

### agent-architecture-audit
- **执行步骤**：1) Phase 1 Scope：明确目标系统、入口点、model stack、症状、时间窗、待审计的层；2) Phase 2 Evidence Collection：用 rg 搜索源码/日志/配置/memory 文件中的反模式（tool_call、隐藏 LLM 调用、fallback/retry、memory admit、输出 mutate 等）；3) Phase 3 Failure Mapping：为每个发现记录症状/机制/来源层/根因/证据 file:line/置信度；4) Phase 4 Fix Strategy：按 code-first 顺序修复（code-gate 工具要求→移除隐藏修复 agent→削减上下文重复→收紧 memory admission→收紧 distillation→减少渲染变更→转 typed JSON envelope）；最后按 critical/high/medium/low 严重度排序输出，附结构化 report JSON
- **依赖**：Read、Write、Edit、Bash、Grep、Glob；关联 skill：agent-introspection-debugging、agent-eval、security-review、autonomous-agent-harness、agent-harness-construction
- **说明**：metadata.origin=oh-my-agent-check；明确"不要用于"通用代码调试、代码审查、安全扫描、agent 性能基准；输出报告 schema 为 ecc.agent-architecture-audit.report.v1

### automation-audit-ops
- **执行步骤**：1) Inventory the real surface：读取 repo hook、GitHub Actions、MCP 配置、connector/app 集成、wrapper 脚本，按 local runtime/repo CI/外部系统/消息通知/计费/研究监控分组；2) Classify each item by live state：逐项标注 configured/authenticated/recently verified/stale or broken/missing，并归类问题类型（active breakage/auth outage/stale status/overlap/missing）；3) Trace the proof path：每条重要声明挂具体证据（文件路径/workflow run/hook log/config/命令输出/失败签名），状态不明时直说；4) End with keep/merge/cut/fix-next：对每个重叠或可疑面给出一个处置决策；按 CURRENT SURFACE/FINDINGS/RECOMMENDATION/NEXT ECC MOVE 输出
- **依赖**：关联 ECC skill：workspace-surface-audit、knowledge-ops、github-ops、ecc-tools-cost-audit、research-ops、verification-loop
- **说明**：metadata.origin=ECC；护栏：默认只读，不因 skill/config 引用就断言"在线"；不先出证据表就合并/删除重叠面

### canary-watch
- **执行步骤**：监控项正文以清单给出，含：① HTTP Status（200？）② Console Errors（新错误？）③ Network Failures（5xx？）④ Performance（LCP/CLS/INP 对比基线）⑤ Content（h1/nav/footer/CTA 是否消失）⑥ API Health（关键端点 SLA 内响应）⑦ Static Assets（JS/CSS/图片/字体 2xx/3xx 且 content type 正确）⑧ SSE Streams（连接并收到首事件/心跳）；监控模式：Quick check（单次）/Sustained watch（每 N 分钟持续 M 小时）/Diff mode（staging vs 生产 对比）；阈值分 critical（HTTP 非 200、控制台错误>5、LCP>4s、API 5xx、静态资源 4xx/5xx、SSE 无法连接）/warning/info；触发 critical 时发桌面通知（macOS/Linux）+可选 Slack/Discord webhook+写日志 ~/.claude/canary-watch.log；输出 Canary Report 表格
- **依赖**：配套：/browser-qa（部署前验证）；可作为 git push 的 PostToolUse hook 自动触发；可在 GitHub Actions 部署步骤后运行
- **说明**：metadata.origin=ECC；触发命令 /canary-watch；输出 markdown 报告含 Status、各检查项 Result/Baseline/Delta

### codehealth-mcp
- **执行步骤**：1) Connect the MCP server：把 mcp-configs/mcp-servers.json 的 codescene 条目拷入 harness 配置（~/.claude.json 或项目 .mcp.json），设置 CS_ACCESS_TOKEN；2) Call standalone tools only：仅调 code_health_review（改文件前完整结构分析）、code_health_score（每次改动后数值 delta）、pre_commit_code_health_safeguard（阻止回归的 commit）、analyze_change_set（PR 前分支级检查），禁用平台专属工具；3) Interpret scores（1–10）：9.0–10 绿/4.0–8.9 黄/1.0–3.9 红；4) Run the feedback loop：改文件前跑 code_health_review 记基线→按分数限定范围（<5 仅最小 diff；5–7 不大重构；>7 较安全）→每次改动后跑 code_health_score 比较，回归则先修→每次 commit 前跑 pre_commit_code_health_safeguard→PR 前跑 analyze_change_set
- **依赖**：CodeScene MCP（codehealth-mcp，stdio via npx @codescene/codehealth-mcp）；环境变量 CS_ACCESS_TOKEN；关联 skill：coding-standards、plankton-code-quality、verification-loop、/quality-gate、security-review、tdd-workflow、documentation-lookup
- **说明**：metadata.origin=community；上游 codescene-oss/codescene-mcp-server；ECC 默认 opt-in 不自动启用（可用 ECC_DISABLED_MCPS=codescene 排除）；MCP 不可用时不许编造分数，须告知用户跳过；提供 AGENTS.md/CLAUDE.md 的强制写法示例

### council
- **执行步骤**：1) Extract the real question：把决策压缩成一个显式 prompt（决定什么/约束/成功标准），模糊则先问一个澄清；2) Gather only the necessary context：代码相关则收集相关文件/snippet/issue/metrics，策略类则跳过 repo 片段；3) Form the Architect position first：写下初始立场、三个最强理由、主要风险（避免被外部声音带偏）；4) Launch three independent voices in parallel：三个全新子 agent，只给问题+紧凑上下文+严格角色+无完整对话历史，要求输出 Position/Reasoning/Risk/Surprise（<300 字）；5) Synthesize with bias guardrails：不得无故驳回外部观点、外部改变推荐须明说、永远保留最强异议、两票反对初始立场视为真实信号；6) Present a compact verdict：输出 Architect/Skeptic/Pragmatist/Critic 各 1-2 句+Verdict（共识/最强异议/前提检查/推荐）
- **依赖**：三个外部子 agent（Skeptic、Pragmatist、Critic）；关联 skill：santa-method、knowledge-ops、search-first、architecture-decision-records、planner、architect、code-reviewer
- **说明**：metadata.origin=ECC；持续性规则：不得写 ad-hoc 笔记到 ~/.claude/notes；只有实质性改变推荐时才用 knowledge-ops 或 /save-session 持久化；反模式：用于代码审查/实现工作/给子 agent 喂全部对话/隐藏异议

### ecc-tools-cost-audit
- **执行步骤**：1) Freeze repo scope：切到 ECC-Tools 仓库，检查分支/diff，锁定受审面（webhook router/queue producer/consumer/PR 创建/用量预留与计费/model routing）；2) Trace ingress before theorizing：先看 src/index.* 入口，映射所有 enqueue 路径，确认哪些 GitHub 事件共用同一队列；3) Trace the worker and side effects：确认队列分析是否一定以 PR/分支创建/文件更新/premium 调用/用量增加收尾，识别 burn-with-broken-output；4) Audit the high-signal burn paths：PR 乘法（去重/synchronize/已有 PR 复用）、quota bypass（检查点 vs 预留/计入点）、premium-model leakage（free 用户是否命中 premium）、retry burn（重复 job/确定性失败重跑）；5) Fix in burn order：停自动 PR 乘法→停 quota bypass→停 premium 泄漏→停重复 job fanout 与无意义重试→补 rerun/update 安全缺口；6) Verify with the smallest proving steps：只重跑受影响测试切片，最终状态区分 changed locally/verified locally/pushed/deployed/still blocked
- **依赖**：关联 ECC skill：autonomous-loops、agentic-engineering、customer-billing-ops、search-first、security-review、verification-loop、tdd-workflow
- **说明**：metadata.origin=ECC；范围护栏：只在 ECC-Tools 仓库、默认只读、不混合客户计费推断与代码事实、把 app 生成分支视为 P0 递归风险直至证伪；正文含 5 类高信号失败模式（单队列全触发/后置用量预留/free tier 上 premium 路径/app 分支回流 webhook/持久化前昂贵计算）

### flutter-dart-code-review
- **执行步骤**：正文以分章节清单给出，含：① General Project Health（目录结构/关注点分离/pubspec/analysis_options/print 检查/生成文件）；② Dart Language Pitfalls（隐式 dynamic/null 滥用/类型提升/过宽 catch/捕获 Error/无用 async/late 滥用/StringBuffer/可变集合暴露/Dart 3 模式匹配与 records）；③ Widget Best Practices（拆分/const/Key/主题/build 复杂度）；④ State Management 库无关原则（架构/不可变与值相等/响应式纪律/state shape 用 sealed/重建优化/订阅与 disposal/local vs global）；⑤ Performance；⑥ Testing（unit/widget/integration/golden，80%+ 覆盖）；⑦ Accessibility；⑧ Platform-Specific（iOS/Android/responsive）；⑨ Security；⑩ Package/Dependency Review（pub points≥130/160、版本约束、melos）；⑪ Navigation/Routing；⑫ Error Handling；⑬ i18n/l10n；⑭ DI；⑮ Static Analysis；附"State Management Quick Reference"跨方案对照表
- **依赖**：无外部 agent/MCP 依赖；引用 Effective Dart、Flutter 官方文档（性能/测试/无障碍/国际化/导航/错误处理/状态管理）等公开来源
- **说明**：metadata.origin=ECC；纯清单式 reference，无数字 workflow；明确"library-agnostic"——按项目实际状态管理方案适配

### gan-style-harness
- **执行步骤**：架构正文以三 agent 角色给出，含：① Planner（Opus 4.6，PM 角色，把简短 prompt 扩展成 16 特性多 sprint 规格并定义评估标准，刻意追求 ambitious）；② Generator（Opus 4.6，开发者角色，按 sprint 实现，与 Evaluator 协商"sprint contract"，读 feedback 迭代）；③ Evaluator（Opus 4.6+Playwright，QA 角色，用 Playwright MCP 真实点击/填表/测 API，按 4 准则打分 Design Quality 0.3/Originality 0.2/Craft 0.3/Functionality 0.2，加权≥7.0 通过，迭代 5–15 次）；评估模式 playwright/screenshot/code-only；可经 /project:gan-build 或 /project:gan-design 或 scripts/gan-harness.sh 触发；随模型能力演进 Stage1（弱模型，2-agent+重脚手架）→Stage2（3-agent+sprint contract）→Stage3（前沿模型，单次规划+连续生成+末次评估）
- **依赖**：Playwright MCP（Evaluator 用）；三 agent 均建议 Opus 4.6；环境变量：GAN_MAX_ITERATIONS、GAN_PASS_THRESHOLD、GAN_PLANNER/GENERATOR/EVALUATOR_MODEL、GAN_EVAL_CRITERIA、GAN_DEV_SERVER_PORT/CMD、GAN_PROJECT_DIR、GAN_SKIP_PLANNER、GAN_EVAL_MODE 等
- **说明**：metadata.origin=ECC-community；关键反模式：评估器过宽/生成器忽略反馈/无限循环/评估器只截图不交互/评估器评估自己的修复建议/上下文耗尽；正文给出 Anthropic 公布的对照数据（单 agent 20min/$9 vs GAN 4-6h/$125-200）

### plankton-code-quality
- **执行步骤**：三阶段架构正文给出：① Phase 1 Auto-Format（静默跑 ruff format/biome/shfmt/taplo/markdownlint，静默修 40-50%）；② Phase 2 Collect Violations（收集不可自动修的违规为 JSON：line/column/code/message/linter，仍不输出给主 agent）；③ Phase 3 Delegate+Verify（spawn claude -p 子进程，按复杂度路由 Haiku 120s/Sonnet 300s/Opus 600s，再跑 Phase 1+2 验证，干净 exit 0 否则 exit 2 上报主 agent）；配置保护三层（PreToolUse 阻止改 linter 配置 + Stop hook git diff 检测 + 受保护文件清单）；包管理器 PreToolUse 钩子封禁 pip/poetry/npm/yarn/pnpm（改用 uv/bun）；ECC 共存建议：禁用 ECC Prettier PostToolUse 让位 Plankton biome
- **依赖**：Plankton 钩子（PostToolUse multi_linter.sh、PreToolUse protect_linter_configs.sh、Stop hook stop_config_guardian.sh）；依赖 jaq、ruff、uv、biome、shellcheck、shfmt、yamllint、markdownlint-cli2、hadolint、taplo 等（按语言可选）；Claude 子进程分层 model（haiku/sonnet/opus）；与 ECC verification-loop、AgentShield 配合
- **说明**：metadata.origin=community；上游 Plankton（@alxfazio），需手动安装（brew+uv sync）；ECC v1.8 增加 ECC_HOOK_PROFILE=strict、ECC_QUALITY_GATE_FIX/STRICT、config tamper guard、CI 集成模式、健康指标（edits flagged/平均修复时间/重复违规/合并阻断）

### production-audit
- **执行步骤**：1) Establish the release surface；2) Read recent changes and current branch state；3) Inspect 实际存在的 runtime/auth/data/payment/background-job/AI/deployment 边界；4) Check CI、测试、迁移、环境变量文档、回滚路径；5) Produce 一句 ship/block 建议+具体修复；证据收集从 git status/log/diff 起步，再查 package 脚本/CI/Docker/部署 manifest/API/webhook/auth middleware/worker/cron/migration/env 文档/可观测性/E2E；风险视角含 Security And Auth、Data Integrity、Payments And Webhooks、Operations、User Experience；评分 0-49 Blocked/50-69 Risky/70-84 Launchable With Caveats/85-100 Strong；命中（敏感数据无 auth、webhook 非幂等、迁移不安全、secret 暴露、无回滚）则封顶 69；CI 非绿或关键路径未 E2E 则封顶 84
- **依赖**：关联 skill：security-review、deployment-patterns、e2e-testing、tdd-workflow、verification-loop
- **说明**：metadata.origin=community；maintainer-safe 重写版（移除 unpinned 远程执行与第三方数据共享）；反模式：默认跑 npx <pkg>@latest、外送源码/secret、给分却不列证据、把绿 CI 当生产就绪、用"随你"收尾

### recursive-decision-ledger
- **执行步骤**：1) Ledger Contract：每次 rollout 记录 id/时间戳、prior accepted winner 与 watchlist、摄入的新信息、搜索空间大小、使用的 model 家族或启发式、试验数与有效试验数、top 候选、decision marks、对前 ledger 的 coherence marks、promotion gate 结果（JSONL append-only，markdown 做人类摘要）；2) Rollout Loop：加载前 ledger→捕获 time-step 0 新信息→跑有界搜索→给每个候选打 mark（accept/watch/reject/decay watch/needs replay）→与前 winner 及最近 marked rollout 比较→漂移/尾部风险/陈旧数据/重跑失败则降级→append 后再总结；3) Coherence Mark：输出 ensemble/recursive/latest 是否匹配前 winner、live promotion 是否允许及原因；4) Promotion Rules：默认 paper/dry-run/read-only/preview/staged，仅当候选在选定指标上超过前 winner、正确性与 replay 检查通过、风险限额显式、证据持久、用户批准 live 步骤时才 promote；5) Summary Shape：先给决策与状态（如 watch, not live），再给下一道闸
- **依赖**：Read、Write、Edit、Bash、Grep、Glob
- **说明**：metadata.origin=ECC；核心立论：递归置信≠批准；强制 paper/dry-run/read-only 默认模式；摘要"先决策后剧情"

### repo-scan
- **执行步骤**：1) Classify the repo surface：枚举文件并标记 project code/third-party/build artifact；2) Detect embedded libraries：检查目录名/头文件/license/版本标记识别内嵌依赖与可能版本（覆盖 50+ 已知库如 FFmpeg/Boost/OpenSSL）；3) Score each module：按模块/子系统分组，依据所有权/重复度/维护成本给出四级判定；4) Highlight structural risks：标出 dead-weight 构建产物、重复 wrapper、过时 vendored 代码、应被抽取/重建/废弃的模块；5) Produce the report：返回简明摘要+可交互深色主题 HTML（含 per-module 下钻），支持 monorepo 分层扫描；分析深度分 fast（1-2 文件/模块）/standard（2-5，默认）/deep（5-10，加线程安全/内存/API 一致性）/full（全文件，pre-merge）
- **依赖**：来自 GitHub haibindev/repo-scan 的外部 skill（pinned commit 2742664 安装）；跨 C/C++、Java/Android、iOS(OC/Swift)、Web(TS/JS/Vue)
- **说明**：metadata.origin=community；上游 github.com/haibindev/repo-scan；安装需 git fetch --depth 1 后拷入 ~/.claude/skills/repo-scan；示例：5 万文件 C++ monorepo 找出 FFmpeg 2.x（2015）、SDK wrapper 重复 3 次、636MB 构建产物、3MB 项目代码 vs 596MB 第三方

### rules-distill
- **执行步骤**：三阶段：1) Phase 1 Inventory（确定性收集）：1a 跑 scan-skills.sh 收集 skill 清单，1b 跑 scan-rules.sh 收集 rules 索引，1c 汇总给用户；2) Phase 2 Cross-read, Match & Verdict（LLM 判断）：按主题分批，每批用 general-purpose 子 agent 携全部 rules 文本做单遍提取+匹配，入选条件四必满足（出现在 2+ skill、可写成 do X/don't do Y 的可执行行为、有明确违规风险、不在既有 rules 中），跨批合并去重并按"全批累计 2+ skill"复核，verdict 取 Append/Revise/New Section/New File/Already Covered/Too Specific；3) Phase 3 User Review & Execution：输出 Summary 表（原则/verdict/target/置信度）+ 详情，用户按编号 Approve/Modify/Skip，永不自动改 rules，结果存 results.json（UTC 时间戳、kebab-case 候选 id、状态 applied/skipped）
- **依赖**：Bash 脚本 scan-skills.sh、scan-rules.sh；general-purpose 子 agent（做横切分析与 verdict）；"确定性收集 + LLM 判断"原则
- **说明**：metadata.origin=ECC；设计原则：只提"做什么"不提"怎么做"，draft 含 See skill 反向链接，三层过滤（2+ skill 证据/可执行行为测试/违规风险）防过度抽象；target 命名如 rules/common/security.md §Input Validation

### santa-method
- **执行步骤**：1) Phase 1 Make a List（Generate）：按正常流程生成 deliverable，Santa 是生成后验证层；2) Phase 2 Check It Twice（独立双审）：并行 spawn 两个 review agent，四个不变量——上下文隔离/同一 rubric/相同输入（spec+output）/结构化输出（verdict+checks+critical_issues+suggestions），rubric 须有客观 pass/fail 条件（factual accuracy/hallucination-free/completeness/compliance/internal consistency/technical correctness，并可按 content/code/compliance 扩展）；3) Phase 3 Naughty or Nice（Verdict Gate）：两审皆 PASS 才 NICE 放行，否则合并去重 critical_issues 与 suggestions 标 NAUGHTY（单一审捕获即真问题，另一审盲区恰是 Santa 存在意义）；4) Phase 4 Fix Until Nice（收敛回路）：MAX_ITERATIONS=3，仅修被标 issue、不重构不加需求，每轮用全新 agent 重审（避免锚定偏置），超限则 escalate_to_human；实现模式：Claude Code 子 agent（首选，真隔离）/顺序 inline（兜底，显式清上下文）/批量采样（100+ 项时抽 10-15% 最少 5 项，按失败类型分类后整批定向修复再抽检）
- **依赖**：两个独立 review 子 agent（Reviewer B、Reviewer C，无共享上下文）；fix agent（仅修被标问题）；可配合 verification-loop（确定性检查先跑）、eval harness（结果喂指标）、continuous-learning v2（失败转 instinct）、strategic compact（compact 前先跑 Santa）
- **说明**：metadata.origin=Ronald Skelton - RapportScore.ai；失败模式表含无限循环/rubber stamping/主观漂移/fix 回归/审阅一致偏置/成本爆炸及对应缓解；指标：首过率>70%、平均收敛<1.5 轮、逃逸率=0；成本≈生成的 2-3 倍 token

### workspace-surface-audit
- **执行步骤**：三阶段：1) Phase 1 Inventory What Exists：产出紧凑清单（active harness target、已装 plugin、已配 MCP/LSP server、env key 名隐含的服务、已有相关 ECC skill），仅以 primitive 存在的也标出；2) Phase 2 Benchmark Against Official and Installed Surfaces：对比官方 Claude plugin、本地已装 plugin、connected app，对每个对比回答"它实际做什么/ECC 是否已对等/ECC 仅有 primitive/ECC 完全缺失该工作流"；3) Phase 3 Turn Gaps Into ECC Decisions：每个真实缺口推荐正确 ECC 形态（可重复 operator workflow→Skill、自动执行/副作用→Hook、专门委托角色→Agent、外部工具桥→MCP 或 connector、安装/引导→setup/audit skill）；输出五段：Current surface/Parity/Primitive-only gaps/Missing integrations/Top 3-5 next moves（按影响排序）
- **依赖**：只读检查 repo surface（package.json、lockfile、.mcp.json、.lsp.json、.claude/settings*.json、.codex/、AGENTS.md、CLAUDE.md、install manifest、hook 配置）、env surface、connected tool surface、ECC surface
- **说明**：metadata.origin=ECC；不可破坏规则：绝不打印 secret 值（只露 provider 名/能力名/路径/是否存在）、优先 ECC 原生而非"再装一个 plugin"、把外部 plugin 视作基准与灵感而非产品边界；明确区分"已可用/有但未包装好/完全缺失需新集成"三类

## 六、架构·系统设计模式（18 个）

API 设计、后端/前端架构模式、数据库迁移、部署/Docker/K8s 模式、错误处理、六边形架构、ADR、MCP server 构建、产品能力建模——跨语言的系统级设计模式与工程实践。

### ai-first-engineering
- **执行步骤**：正文以清单/原则给出，含：①Process Shifts——计划质量重于打字速度、Eval 覆盖重于主观信心、评审重心从语法转向系统行为；②Architecture Requirements——偏好显式边界、稳定契约、类型化接口、确定性测试，避免隐式行为；③Code Review——聚焦行为回归、安全假设、数据完整性、失败处理、发布安全，最小化风格类问题；④Hiring Signals——分解模糊工作、定义可度量验收标准、产出高信号 prompt 与 eval；⑤Testing Standard——触达域需回归覆盖、显式边界用例断言、接口边界集成检查
- **依赖**：自包含
- **说明**：origin: ECC；无命令、无外部 agent/MCP 依赖；偏"原则与运作模型"，非步骤式工作流

### api-connector-builder
- **执行步骤**：1)Learn the house style——检查至少 2 个既有 connector/provider，映射文件布局、抽象边界、config、retry/pagination、registry hooks、测试 fixture 与命名；2)Narrow the target integration——仅定义仓库实际需要的面：auth flow、关键实体、核心读写、分页与限流、webhook 或轮询；3)Build in repo-native layers——按 config/schema、client/transport、mapping、connector/provider entrypoint、registration、tests 切片构建；4)Validate against the source pattern——新 connector 应在代码库里显得"理所当然"，而非来自异质生态
- **依赖**：关联 skill：backend-patterns、mcp-server-patterns、github-ops
- **说明**：origin: ECC direct-port adaptation；附 Provider-style/Connector-style/TypeScript plugin-style 三种参考布局与质量检查清单；核心护栏：禁止臆造新集成架构、禁止仅凭 vendor docs 起步

### api-design
- **执行步骤**：正文以清单/模式集给出，含：①资源设计——URL 结构（名词复数 kebab-case）、命名规则、子资源、慎用动词；②HTTP 方法与状态码——方法语义表（GET/POST/PUT/PATCH/DELETE 幂等性与安全性）、成功/客户端/服务端状态码参考、常见误用纠正；③响应格式——success、collection+分页、error（含字段级 details）、Envelope 两种变体；④分页——offset-based vs cursor-based 及选型表；⑤过滤/排序/搜索/稀疏字段集；⑥认证授权——Bearer/API key、资源级与角色级；⑦限流——Headers 与分级限流表；⑧版本——URL path（推荐）vs header、版本策略与弃用时间线；⑨实现样例（TS Next.js / Python DRF / Go net/http）；⑩上线前 checklist
- **依赖**：自包含
- **说明**：origin: ECC；跨语言（TS/Python/Go）实现示例；附 13 项 API 设计 checklist

### architecture-decision-records
- **执行步骤**：捕获新 ADR：1)Initialize（首次）——若无 docs/adr/ 则征得同意后创建目录、README.md 索引表、template.md；2)Identify the decision——提取核心架构选择；3)Gather context——记录触发问题与约束；4)Document alternatives——记录备选及否决理由；5)State consequences——列权衡；6)Assign a number——扫描既有 ADR 自增编号；7)Confirm and write——草稿先经用户确认，获批后才写入 docs/adr/NNNN-title.md，否则丢弃；8)Update the index——追加到 README.md。读取既有 ADR：1)检查 docs/adr/ 是否存在；2)扫描索引；3)读取匹配项并展示 Context/Decision；4)无匹配则询问是否记录
- **依赖**：关联 agent：planner（提议架构变更时建议建 ADR）、code-reviewer（PR 引入架构变更但缺对应 ADR 时标记）
- **说明**：origin: ECC；采用 Michael Nygard 轻量 ADR 格式（适配 AI 辅助开发）；状态机 proposed→accepted→deprecated/superseded；附"值得记录的决策类别"表与 Do/Don't 规则；严禁未确认自动写文件

### backend-patterns
- **执行步骤**：正文以模式集给出，含：①API 设计——RESTful 结构、Repository 模式、Service Layer、Middleware 模式；②数据库——查询优化（只取必要列）、N+1 预防（批量 fetch）、事务模式（Supabase RPC + SQL function 异常回滚）；③缓存——Redis 缓存层（装饰 repository）、Cache-Aside；④错误处理——集中式 errorHandler（ApiError/ZodError/兜底 500）、指数退避重试；⑤认证授权——JWT 校验、RBAC（角色→权限映射 + requirePermission HOF）；⑥限流——必须用 Redis/网关/平台原生限流器，禁用进程内存计数器；⑦后台任务——简单 JobQueue 模式；⑧日志——结构化 JSON Logger
- **依赖**：关联 skill：api-design（HTTP 契约）、security-review（滥用案例评审）
- **说明**：origin: ECC；明确声明限流不得用进程内存计数器（部署后重置、跨副本分裂、serverless 下 fail-open）

### config-gc
- **执行步骤**：1)Scan——扫描全部或指定 channel，收集候选（路径/channel/触发信号/size/mtime）；2)Rank——按置信度排序（破损/孤儿=高，仅老旧=低），以编号表呈现，单轮上限约 20 项；3)Confirm one by one——逐项展示证据并问 [y/n/skip]，用户可随时停止；4)Soft-delete——skill/hook 优先 .disabled 重命名，文件移至 _gc_trash/<date>/；permission 条目备份 settings 后用 jq 移除并逐字记录；仅当用户明确要求才硬删；5)Log——写入 ~/.claude/gc_log.md（时间戳、操作项、撤销说明）；6)Report——回收空间、健康 channel、建议下次审查日期
- **依赖**：关联 skill：skill-stocktake、workspace-surface-audit、configure-ecc、continuous-learning、security-review；外部 CLI：jq（permission 清理）、find/du（macOS/BSD 兼容）
- **说明**：origin: ECC；8 个扫描 channel 含 skills/memory/hooks/permissions/MCP/scheduled jobs/project history/runtime caches；强制 human-in-the-loop（无"yes to all"）；软删优先、保留撤销路径；禁止越界到 ~/.claude 之外的源码树

### database-migrations
- **执行步骤**：正文以原则+模式集给出，含：①Core Principles——每次变更是迁移、生产 forward-only、schema 与 data 分离、生产规模测试、已部署迁移不可变；②Safety Checklist；③PostgreSQL 模式——安全加列、CREATE INDEX CONCURRENTLY、expand-contract 改名、安全删列、批量数据迁移（SKIP LOCKED 分批）；④Prisma（migrate dev/deploy/reset、自定义 SQL）；⑤Drizzle（generate/migrate/push）；⑥Kysely（kysely-ctl 工作流、迁移文件、programmatic Migrator）；⑦Django（makemigrations/migrate、RunPython 数据迁移、SeparateDatabaseAndState）；⑧golang-migrate（create/up/down/force）；⑨零停机 expand-contract（EXPAND→MIGRATE→CONTRACT 三阶段时间线）；⑩反模式表
- **依赖**：自包含
- **说明**：origin: ECC；含 UP/DOWN、CONCURRENTLY 注意事项（不能在事务块内）、NOT NULL 必须带 default 等关键约束；附反模式对照表（手动 SQL、编辑已部署迁移、schema+data 混合等）

### deployment-patterns
- **执行步骤**：正文以策略+模板集给出，含：①部署策略——Rolling（默认，零停机但需向后兼容）、Blue-Green（瞬时回滚，2x 基础设施）、Canary（按流量百分比渐进，需监控）；②Docker——Node/Go/Python(Django) 三套多阶段 Dockerfile 与最佳/坏实践清单；③CI/CD——GitHub Actions 标准 pipeline（test→build→deploy）与 PR/merge 两套 stage 流程；④健康检查——简单与详细 /health 端点（TS 实现）、Kubernetes liveness/readiness/startup probe；⑤环境配置——Twelve-Factor 与 Zod 启动时校验；⑥回滚——kubectl rollout undo / vercel rollback / prisma migrate resolve 等命令与回滚 checklist；⑦生产就绪 checklist（应用/基础设施/监控/安全/运维）
- **依赖**：外部 CLI：kubectl（回滚）、vercel、railway、docker（buildx/build-push-action）、GitHub Actions
- **说明**：origin: ECC；跨 Node/Go/Python 多语言 Dockerfile；含 Twelve-Factor 与 Zod 配置校验示例

### docker-patterns
- **执行步骤**：正文以模式集给出，含：①本地开发 Compose——标准 Web app 栈（app/db/redis/mailpit + healthcheck + bind mount + 匿名卷保护 node_modules）；②开发 vs 生产多阶段 Dockerfile（deps/dev/build/production）；③Override 文件（自动加载 dev override 与显式 prod）；④网络——服务发现（按服务名解析）、自定义网络隔离、仅暴露必要端口（127.0.0.1 绑定）；⑤卷策略——named/bind/anonymous 三种及常见组合；⑥容器安全——Dockerfile 加固（固定 tag、non-root、drop capabilities、read-only rootfs）、Compose security_opt、secret 管理（env/Docker secrets，禁止硬编码）；⑦.dockerignore 模板；⑧调试命令（logs/exec/inspect/rebuild/network 排障）；⑨反模式（生产用 compose 无编排、容器存数据、root 运行、:latest、单容器塞全部服务、密钥入 compose）
- **依赖**：外部 CLI：docker、docker compose；镜像：postgres、redis、mailpit
- **说明**：origin: ECC；强调"生产多容器应上 Kubernetes/ECS/Swarm，而非裸 Compose"；附 .dockerignore 与常见排障命令

### error-handling
- **执行步骤**：正文以原则+多语言模式集给出，含：①Core Principles——快速且响亮地失败、类型化错误优于字符串、用户信息≠开发者信息、绝不静默吞错、错误是 API 契约的一部分；②TypeScript——AppError 层级（NotFoundError/ValidationError/UnauthorizedError/RateLimitError）、Result 模式（no-throw）、Next.js/Express API 错误处理器、React ErrorBoundary；③Python——自定义异常层级、FastAPI 全局异常处理器；④Go——sentinel errors + errors.Is/errors.As + fmt.Errorf %w 包装、handler 层解包决定响应；⑤指数退避重试（withRetry + retryIf + jitter）；⑥用户可见错误信息映射表；⑦合并前 checklist
- **依赖**：自包含
- **说明**：origin: ECC；TS 侧强调 Object.setPrototypeOf 维持 instanceof；Go 侧强调 %w 包装不丢原始错误；附 8 项 checklist

### frontend-patterns
- **执行步骤**：正文以模式集给出，含：①组件模式——组合优于继承、Compound Components、Render Props；②自定义 Hooks——useToggle 状态钩子、useQuery 异步数据获取（ref 稳定 refetch 防无限循环）、useDebounce；③状态管理——Context + useReducer；④性能优化——useMemo（排序前先拷贝）、useCallback、React.memo、lazy+Suspense 代码分割、@tanstack/react-virtual 长列表虚拟化；⑤表单——受控表单 + 校验；⑥Error Boundary；⑦动画——Framer Motion 列表与 Modal；⑧可访问性——键盘导航（ArrowDown/Up/Enter/Escape）、焦点管理（Modal 开关保存/恢复焦点）
- **依赖**：自包含（示例库：React、Next.js、Zod、SWR/React Query、@tanstack/react-virtual、framer-motion）
- **说明**：origin: ECC；特别提醒：Array.prototype.sort 原地修改需先拷贝；useQuery 必须把 fetcher/options 存进 ref 否则会触发无限 fetch 循环

### git-workflow
- **执行步骤**：正文以策略+命令集给出，含：①分支策略——GitHub Flow（推荐多数）、Trunk-Based（高速团队）、GitFlow（企业/定期发布）+ 选型表；②提交信息——Conventional Commits 格式与 type 表（feat/fix/docs/style/refactor/test/chore/perf/ci/revert）、好坏示例、.gitmessage 模板；③Merge vs Rebase——各自适用场景、rebase 工作流、何时绝不 rebase（已推送共享/受保护分支）；④PR 工作流——标题格式、描述模板、code review checklist（评审者与作者双视角）；⑤冲突解决——识别、手动/mergetool/--ours/--theirs、预防策略；⑥分支管理——命名约定、清理、stash；⑦发布管理——Semantic Versioning、annotated tag、changelog 生成；⑧Git 配置——essential configs 与 alias；⑨.gitignore 模板；⑩常见工作流（新功能/更新 PR/同步 fork/撤销错误/Git hooks）
- **依赖**：外部 CLI：git、npx conventional-changelog；外部平台：GitHub/GitLab
- **说明**：origin: ECC；附大量命令速查与反模式（直提交 main、提交密钥、巨型 PR、模糊提交信息、改写公共历史、长寿分支）

### hexagonal-architecture
- **执行步骤**：1)Model a use case boundary——定义单一用例与清晰输入输出 DTO，把传输细节挡在边界外；2)Define outbound ports first——把每个副作用识别为 port（persistence/external/cross-cutting），建模能力而非技术；3)Implement the use case with pure orchestration——用例经构造函数接收 port，校验应用不变量、协调领域规则、返回纯数据；4)Build adapters at the edge——inbound 适配器做协议转换，outbound 适配器映射到具体 API/ORM，映射留在适配器内；5)Wire everything in a composition root——集中注入，避免隐藏 service locator；6)Test per boundary——用例用 fake port 单测、适配器用真实基础设施集成测试、用户流 E2E
- **依赖**：自包含（跨 TS/Java/Kotlin/Go）
- **说明**：origin: ECC；含 mermaid 架构图、feature-first 模块布局、多语言映射（包结构/port 形式/组合根位置）；迁移手册 7 步 + Strangler 重构策略；附反模式（领域实体导入 ORM/框架类型、用例直读 req/res、行直返、适配器互调）与最佳实践 checklist

### kubernetes-patterns
- **执行步骤**：正文以 copy-pasteable YAML + kubectl 速查给出，含：①生产 Deployment 模板（securityContext、rollingUpdate、三类 probe、resources、envFrom）；②Probes——startup/liveness/readiness 决策表与 failureThreshold×periodSeconds 计算；③Service（ClusterIP/LoadBalancer）与 Ingress+TLS（cert-manager）；④ConfigMap（envFrom/文件挂载）与 Secret（base64 警告，推荐 Sealed Secrets/ESO）；⑤Resource 管理——requests vs limits 规则与按工作类型（Web API/Worker/JVM/Sidecar）的取值表；⑥RBAC——两种模式：App 不需 K8s API（关闭 token automount）vs 需要（最小权限 Role/RoleBinding）；⑦HPA（需 requests）与 PDB；⑧Namespace 与 ResourceQuota；⑨Job/CronJob（restartPolicy）；⑩kubectl 调试速查与常见错误诊断；⑪反模式与 checklist
- **依赖**：外部 CLI：kubectl；关联 skill：docker-patterns、deployment-patterns、security-review、git-workflow（GitOps：ArgoCD/Flux）
- **说明**：origin: ECC；强调禁用 :latest、non-root、 readOnlyRootFilesystem、drop ALL capabilities、最小权限 RBAC；Secret 仅为 base64 非加密，生产须上 Sealed Secrets/ESO

### mcp-server-patterns
- **执行步骤**：正文以概念+示例给出，含：①Core concepts——Tools（可调用动作，registerTool/tool）、Resources（只读数据，含 uri 参数）、Prompts（参数化模板）、Transport（stdio 本地 / Streamable HTTP 远程，旧 HTTP/SSE 仅兼容）；②Connecting with stdio——创建 stdio transport 传入 connect 方法，API 因 SDK 版本而异；③Remote Streamable HTTP——单 MCP HTTP 端点；④安装与 server setup（npm install @modelcontextprotocol/sdk zod）；⑤注册 API 注意版本差异（positional args vs object vs registerTool）；⑥Best Practices——schema first、结构化错误、幂等优先、限流与成本、版本固定
- **依赖**：外部依赖：@modelcontextprotocol/sdk（npm）、zod；MCP：context7（query-docs for "MCP" 取最新 API）；官方文档：modelcontextprotocol.io；关联文档：docs/capability-surface-selection.md（路由决策）
- **说明**：origin: ECC；明确 SDK API 演进频繁，注册方法签名历史变更多次，须以 Context7 或官方文档核对当前签名以免复制粘贴出错；附 Go/C# 官方 SDK 指针

### product-capability
- **执行步骤**：1)Restate the capability——压缩为"谁是用户、上线后的新能力、产出带来什么变化"的精确陈述；2)Resolve capability constraints——提取业务规则、范围边界、不变量、信任边界、数据所有权、生命周期转换、发布/迁移要求、失败与恢复预期；3)Define the implementation-facing contract——产出 SRS 式计划：capability 摘要、显式 non-goals、actors/surfaces、必需状态与转换、接口/输入输出、数据模型影响、安全/计费/策略约束、可观测性与运维要求、阻塞实现的 open questions；4)Translate into execution——给出交付判定（可直接实施/需架构评审/需产品澄清），并指向下一个 ECC lane（project-flow-ops、workspace-surface-audit、api-connector-builder、dashboard-builder、tdd-workflow、verification-loop）
- **依赖**：关联 skill/ECC lane：project-flow-ops、workspace-surface-audit、api-connector-builder、dashboard-builder、tdd-workflow、verification-loop
- **说明**：origin: ECC；产物优先落到既有 PRODUCT.md/docs/product/program-spec 目录，否则用 docs/examples/product-capability-template.md；铁律：不臆造产品真相、未决项显式标记、区分固定策略与架构偏好、与既有仓库约束冲突时直言；输出固定 6 段（CAPABILITY/CONSTRAINTS/IMPLEMENTATION CONTRACT/NON-GOALS/OPEN QUESTIONS/HANDOFF）

### product-lens
- **执行步骤**：正文以 4 模式给出，含：①Mode 1 Product Diagnostic（类 YC office hours，7 个硬问题：为谁/痛点量化/为何现在/10-star 版本/MVP/反目标/如何度量，产出 PRODUCT-BRIEF.md + go/no-go）；②Mode 2 Founder Review（读 README/CLAUDE.md/package.json/commits，推断项目本质，0-10 评分 PMF 信号——使用增长/留存/收入信号/护城河，找出能 10x 的那一件事，标记不值得做的事）；③Mode 3 User Journey Audit（以新用户身份安装，记录每个摩擦点并计时，对比竞品，给 time-to-value 评分与 top3 修复）；④Mode 4 Feature Prioritization（impact×confidence÷effort 的 ICE 评分排序，叠加 runway/团队/依赖约束输出 roadmap）
- **依赖**：关联：product-capability（产物转实施契约）；建议配合 /browser-qa（验证用户旅程审计）、/design-system audit（视觉打磨）、/canary-watch（上线后监控）
- **说明**：origin: ECC；明确自身只负责诊断不写实施契约，需要时交棒 product-capability；所有模式输出可执行文档而非散文，每条建议都附具体下一步

### regex-vs-llm-structured-text
- **执行步骤**：正文以决策框架+混合管线给出，含：①Decision Framework——格式一致且重复(>90%)则先用 regex，regex 覆盖<95% 才为边界加 LLM，自由格式则直接 LLM；②架构模式——Regex Parser(95-98%) → Text Cleaner → Confidence Scorer → 高置信直出/低置信走 LLM Validator；③实现（Python）——parse_structured_text（re 模式 + ParsedItem dataclass）、score_confidence（few_choices/missing_answer/short_text 扣分）、validate_with_llm（用最便宜的 Haiku 级模型）、process_document 混合管线；④真实指标（410 题管线：regex 成功 98%、低置信 2%、LLM 调用约 5 次、较全 LLM 节省约 95%、测试覆盖 93%）；⑤Best Practices 与反模式
- **依赖**：自包含（Python re + dataclasses）；LLM 校验示例用 claude-haiku 类模型
- **说明**：origin: ECC；核心理念"regex 处理 95-98%、LLM 只救边界案例"；附反模式（全量送 LLM、用 regex 处理自由文本、跳过置信度评分、解析对象原地修改）

## 七、安全·合规（6 个）

Claude Code 配置安全扫描、代码安全审查、安全门禁（gateguard / delivery-gate / safety-guard）、漏洞猎捕——防止破坏性操作与安全风险。

### delivery-gate
- **执行步骤**：1) 读取 transcript 尾部 + 磁盘用量 + 5 个学习库 mtime； 2) 检查 rationalization 正则（如 "skip tests for now"、"pre-existing bug"）→ 命中仅警告； 3) 检查学习库（growth-log/、decisions/log.md、output-index.md、ratings-tracker.md、tooling_capabilities.md）是否今日更新； 4) 检查磁盘：<50GB 警告、<15GB 阻断（exit 2）； 5) 阻断条件：磁盘临界、或 ≥3 库 stale、或 growth-log stale 且复杂任务 → exit 2
- **依赖**：Python 3.8+（仅 stdlib）；注册为 Stop hook（settings.json）；配置 LIBS 列表对应 memory 目录
- **说明**：ECC 自研（v1.1.1）；机制性门禁，非内容质量审查；与 self-audit（推理质量门禁）互补；不验证内容质量，仅验证文件是否被 touch

### gateguard
- **执行步骤**：三阶段门禁：1) DENY 阻断首次 Edit/Write/Bash； 2) FORCE 告知必须采集的事实（Edit 门：列出所有导入方、受影响公开函数、数据字段+格式、逐字引用用户指令；Write 门：调用点、查重、数据 schema、用户指令；破坏性 Bash 门：受影响文件、回滚步骤、用户指令；常规 Bash 门：一句话任务说明、命令产出）； 3) ALLOW 采集后允许重试；首个文件/命令触发后不重复触发；ECC_GATEGUARD=off 可临时关闭
- **依赖**：ECC 自带 scripts/hooks/gateguard-fact-force.js；或 pip install gateguard-ai + gateguard init（生成 .gateguard.yml）；可与 ECC_DISABLED_HOOKS 配合
- **说明**：origin: community；A/B 测试数据：门禁 9.0 vs 无门禁 6.75；仅首次完整拒绝 GATEGUARD_FACT_FORCE_FULL_DENIALS（默认 3）发四事实块，后续精简（#2142）；反模式：禁用自我评估替代（"are you sure?" 实验无效）

### safety-guard
- **执行步骤**：三模式：①Careful Mode 拦截危险命令（rm -rf、git push --force、git reset --hard、DROP TABLE、docker system prune、kubectl delete、chmod 777、npm publish、--no-verify）→ 显示影响、要求确认、建议替代； ②Freeze Mode 锁定写入到指定目录树（/safety-guard freeze src/components/）→ 越界 Write/Edit 被阻断； ③Guard Mode 二者合并（/safety-guard guard --dir src/api/ --allow-read-all）→ 可读任意位置但仅写指定目录；/safety-guard off 解除
- **依赖**：PreToolUse hook（拦截 Bash/Write/Edit/MultiEdit）；ECC 2.0 可观测性风险评分；日志写入 ~/.claude/safety-guard.log
- **说明**：ECC 自研；建议为 codex 全自动会话默认启用；与 gateguard 互补（safety-guard 是运行时拦截，gateguard 是编辑前调查）

### security-bounty-hunter
- **执行步骤**：1) 先查 scope：项目规则、SECURITY.md、披露渠道、排除项； 2) 找真实入口：HTTP handlers、上传、后台任务、webhook、解析器、集成端点； 3) 跑静态工具（semgrep）作 triage 输入，非结论； 4) 完整阅读真实代码路径； 5) 证明用户控制能到达有意义 sink； 6) 用最小安全 PoC 确认可利用性与影响； 7) 起草报告前查重； 8) 按报告结构（Description / Vulnerable Code / PoC / Impact / Affected Version）输出
- **依赖**：semgrep CLI（--config=auto --severity=ERROR --severity=WARNING --json）；ECC direct-port adaptation（v1.0.0）
- **说明**：关注模式：SSRF(CWE-918)、Auth bypass(CWE-287)、反序列化 RCE(CWE-502)、SQLi(CWE-89)、命令注入(CWE-78)、路径穿越(CWE-22)、自动触发 XSS(CWE-79)；跳过本地-only pickle/torch.load、CLI-only eval、shell=True 硬编码、单纯缺安全 header、Self-XSS、demo/test 代码；质量门禁要求：可达 + 用户可控 + sink 有意义 + PoC 可用 + 非重复 + 在 scope 内

### security-review
- **执行步骤**：正文以清单给出，含 10 大领域验证项：①密钥管理（env 变量、gitignore、git 历史）； ②输入校验（zod schema、文件上传 size/type/extension、白名单）； ③SQL 注入防护（参数化查询、Supabase、无字符串拼接）； ④认证授权（httpOnly cookie 而非 localStorage、授权检查、RLS、RBAC）； ⑤XSS（DOMPurify、CSP 严格策略避免 unsafe-inline）； ⑥CSRF（CSRF token、SameSite=Strict）； ⑦限流（API + 高成本操作、IP + 用户维度）； ⑧敏感数据暴露（日志脱敏、通用错误信息）； ⑨Solana 钱包签名 + 交易验证； ⑩依赖安全（npm audit、lockfile、Dependabot）；末尾附 17 项部署前清单
- **依赖**：无外部 MCP/agent 依赖（自包含清单）；示例用 zod、DOMPurify、express-rate-limit、Supabase、@solana/web3.js 等库
- **说明**：ECC 自研；对应 /security-review 命令；输出 FAIL/PASS 对照代码示例 + Verification Steps 勾选清单；引用 OWASP Top 10、Next.js Security、Supabase Security、PortSwigger Web Security Academy

### security-scan
- **执行步骤**：1) 检查/安装 AgentShield（npx ecc-agentshield --version）； 2) 运行扫描（npx ecc-agentshield scan，可选 --path / --min-severity）； 3) 选择输出格式（终端/JSON/Markdown/HTML）； 4) 可选自动修复（--fix，仅修复标记为 auto-fixable 的项，如硬编码密钥→env 引用、收紧通配权限）； 5) 可选 Opus 深度分析（--opus --stream，需 ANTHROPIC_API_KEY，跑红队→蓝队→审计三 agent 流水线）； 6) 按 A-F 评级解读（A:90-100 安全 / F:0-39 严重漏洞）
- **依赖**：npx ecc-agentshield（AgentShield CLI）；ANTHROPIC_API_KEY（仅 --opus 模式）；可选 GitHub Action affaan-m/agentshield@v1
- **说明**：ECC 自研；对应 /security-scan 命令；扫描项：CLAUDE.md（硬编码密钥、自动执行指令、提示注入）、settings.json（过度宽松 allow、缺 deny、危险 bypass）、mcp.json（危险 MCP、硬编码 env、npx 供应链）、hooks/（命令注入、数据外泄、错误静默）、agents/*.md（不受限工具访问）；严重项示例：Bash(*) 允许、${file} 插值注入、shell 运行 MCP

## 八、性能·成本·基准（10 个）

性能基准测量与优化循环、LLM 成本/Token 预算、上下文预算审计、并行加速、延迟敏感系统——量化和压降 token/延迟/成本。

### benchmark
- **执行步骤**：四模式：①Page Performance 经 browser MCP 测 Core Web Vitals（LCP<2.5s、CLS<0.1、INP<200ms、FCP<1.8s、TTFB<800ms）+ 资源体积（页面<1MB、JS<200KB gzip）+ 请求数 + 渲染阻塞； ②API Performance 端点打 100 次，测 p50/p95/p99 + 10 并发，对比 SLA； ③Build Performance 冷构建 + HMR + 测试套件 + TS 检查 + Lint + Docker； ④Before/After 对比：/benchmark baseline 存基线 → 改 → /benchmark compare 出 Delta+Verdict 表
- **依赖**：browser MCP（Mode 1）；基线存 .ecc/benchmarks/ JSON，git 跟踪
- **说明**：ECC 自研；CI 集成：每个 PR 跑 /benchmark compare；建议与 /canary-watch（部署后监控）、/browser-qa（上线前清单）配合

### benchmark-methodology
- **执行步骤**：1) 先建立客户定位 brief（战略张力双轴、差异化、品牌平衡）； 2) 按 9 维度评分（①定位清晰度 18% ②品牌语调 15% ③视觉/站点工艺 15% ④服务打包 12% ⑤证据/可信度 12% ⑥企业成熟度 10% ⑦思想领导力 8% ⑧定价透明度 5% ⑨客户战略张力 5% 双极分别打分不平均）； 3) 按 1-5 rubric 锚定可观察证据； 4) 按最便宜信号优先顺序采集数据（官网→案例→评论目录→LinkedIn→作品集→内容渠道）； 5) 每维度记录：分数+一行理由+来源链接； 6) 产出竞争者 profile 卡（含 tension 2×2 象限）交给 competitive-report-structure
- **依赖**：无外部 MCP/agent；前端依赖 competitive-platform-analysis（产出 tier 集）；后端衔接 competitive-report-structure（组装报告）
- **说明**：描述虽简但正文详尽；偏置控制：不产单一综合分、断言 vs 证实降级、审美亲和偏差、幸存者偏差、跨集合校准；反模式：平均张力双轴、无证据评分、跑前未 scope 竞争者集；本 skill 实为营销/竞争分析工具，被归入"基准"类但与性能基准无关

### benchmark-optimization-loop
- **执行步骤**：1) 建立基线（操作定义+正确性门禁+指标：wall time/p95/rows-per-sec/cost-run/memory/error rate+当前基线+搜索预算：变体数/时间/花费/数据影响）； 2) 测量基线； 3) 从证据识别瓶颈； 4) 生成每变体测一假设的变体； 5) 同输入形状跑变体； 6) 拒绝未通过正确性/安全/可复现的； 7) 晋升最快安全变体； 8) 脚本化胜出路径； 9) 重跑基线+胜者确认 delta；递归搜索：持久化每次运行到账本、对比前一接受胜者、保留 holdout、噪声内/正确性失败/超预算/变量过多时停止
- **依赖**：自包含（Read/Write/Edit/Bash/Grep/Glob）；晋升门禁：正确性测试通过+性能 delta 可重复+回滚明显+源码固化+含精确命令与测量
- **说明**：ECC 自研；变体表（Variant/Hypothesis/Command/Time/Correct?/Notes）跟踪；措辞用"最佳测量安全变体"而非"全局最优"除非搜索空间真穷尽

### context-budget
- **执行步骤**：四阶段：①Inventory 扫描 agents/（>200 行重、description>30 词臃肿）、skills/（>400 行、查 .agents/skills 重复副本）、rules/（>100 行、同语言模块内容重叠）、MCP（每工具 ~500 token schema、>20 工具或包装 gh/git/npm/supabase/vercel CLI 的服务器）、CLAUDE.md 链（合计 >300 行）； ②Classify 分桶（Always/Sometimes/Rarely needed → 保留/按需/移除）； ③Detect Issues（臃肿 agent description、重型 agent、冗余组件、MCP 过度订阅>10 服务器、CLAUDE.md 臃肿）； ④Report 输出估算总开销+组件分解表+按 token 节省排序的 Top 3 优化+潜在节省百分比
- **依赖**：自包含（无外部 MCP/agent）；对应 /context-budget 命令；token 估算：prose words×1.3、code chars/4
- **说明**：ECC 自研；MCP 是最大杠杆（30 工具服务器比全部 skills 还贵）；agent description 即使不调用也每次进 Task 上下文；verbose 模式给逐文件/逐工具/逐重复行的细粒度分解；任何变更后跑审计防漂移

### cost-aware-llm-pipeline
- **执行步骤**：正文以模式集给出，含 4 大模式：①Model Routing 按复杂度选模型（text≥10000 字符或 items≥30 用 Sonnet，否则 Haiku，便宜 3-4 倍）； ②Immutable Cost Tracking frozen dataclass 累计花费，每次 add 返回新 tracker； ③Narrow Retry 仅对瞬态错误（APIConnectionError/RateLimitError/InternalServerError）指数退避重试 ≤3 次，认证/参数错误立即失败； ④Prompt Caching 长 system prompt 加 cache_control: ephemeral；组合：select_model→查 over_budget→call_with_retry+缓存→add CostRecord
- **依赖**：无外部 MCP/agent；Python anthropic SDK 示例；无独立 CLI
- **说明**：ECC 自研；定价参考（2025-2026）：Haiku 4.5 $0.80/$4.00、Sonnet 4.6 $3.00/$15.00、Opus 4.5 $15.00/$75.00；反模式：全用最贵模型、所有错误都重试、mutate 状态、硬编码模型名、重复 system prompt 不缓存；prompt >1024 token 才值得缓存

### cost-tracking
- **执行步骤**：1) 用 node 验证 ~/.claude/metrics/costs.jsonl 存在（不用 sqlite3，因为是 JSONL）； 2) 解析每行（timestamp/session_id/transcript_path/model/input-output_tokens/cache_write-read_tokens/estimated_cost_usd），累计快照按 session 取最新行求和（不能逐行相加，会重复计数）； 3) 输出：今日 vs 昨日花费、总会话总计、按模型分解、会话数； 4) 格式：<1 美元留 4 位小数，≥1 美元留 2 位； 5) 会话钻取或 CSV 导出迭代同一 latest 集
- **依赖**：ECC stop:cost-tracker hook 写入 ~/.claude/metrics/costs.jsonl；node（跨平台，不用 sqlite3）；无独立 MCP/agent
- **说明**：origin: community；对应 /cost-report 命令；反模式：逐行求和（会多重计数）、用原始 token 数手算成本（应优先 estimated_cost_usd）、假设日志存在、硬编码当前模型定价、推荐装未审查 hook；关联 skill：cost-aware-llm-pipeline、token-budget-advisor、strategic-compact

### data-throughput-accelerator
- **执行步骤**：1) 先区分瓶颈类型（源抽取/网络传输/仓库加载/转换/服务表新鲜度/任务运行期间的实时尾部增长）； 2) 读源/目标/manifest 契约； 3) 测量 backlog（外部文件、manifest 行、raw/derived 行、min/max 时间戳、未处理数）； 4) 跑安全补齐或采样基准； 5) 对比变体（batch size、worker 数、仓库 SQL、文件分组、staging 形状、manifest 更新方式）； 6) 仅晋升保持计数和时间戳连贯的最快路径； 7) 固化为 CLI/调度任务/workflow/runbook； 8) 固化后重跑最终对账
- **依赖**：自包含（Read/Write/Edit/Bash/Grep/Glob）；仓库原生扫描/连接/追加
- **说明**：ECC 自研；Fast Path 启发式：算力移到数据所在地、manifest/checkpoint 跳过已完成、分区+聚类匹配读写模式、批量小文件、幂等写入、raw/derived/serving 分账；输出硬对账块（发现文件数/处理数/raw 行/derived 行/剩余尾部/运行时/正确性门禁）；护栏：不删 raw 美化指标、不静默跳过失败文件、不混历史 backfill 与实时尾部新鲜度、金融/医疗/监管数据保留 replay 证据

### latency-critical-systems
- **执行步骤**：1) 拆分指标（p50/p95/p99 延迟、吞吐、新鲜度 age、队列深度、缓存命中率、provider/API 响应、浏览器渲染、负载下正确性、失败重试）； 2) 画热路径图（source event→provider API→ingest worker→queue→cache→edge route→client stream→browser render→用户可见状态），逐段测； 3) 按优化顺序执行：①删不必要往返 ②缓存稳定读+新鲜度元数据 ③批量小调用 ④算力靠近数据/用户 ⑤冷热路径分离 ⑥队列无限增长前加背压 ⑦流式仅在新颖度提升时用 ⑧加陈旧数据/降级 provider/坏缓存 canary； 4) 用真实 readback 验证（HTTP 时序+响应头、provider 新鲜度时间戳、队列状态、edge/cache 状态、浏览器验证、重试日志）
- **依赖**：自包含（Read/Write/Edit/Bash/Grep/Glob）；市场数据/执行路径还需验 orderbook age、VWAP 假设、provider 状态、kill-switch
- **说明**：ECC 自研；不授权实盘交易或金融建议（仅工程层）；护栏：不以放弃必要验证换延迟、不掩盖陈旧数据、不凭客户端标签声称毫秒级、无显式审批门禁不跑实盘/破坏性迁移/影响客户的部署、日志与基准产物不含 secret

### parallel-execution-optimizer
- **执行步骤**：1) 定义目标与完成信号； 2) 拆工作为通道； 3) 标每通道为 parallel/sequential/gated； 4) 并行跑独立读/检查； 5) 写入按文件/worktree/分支/服务/数据集隔离； 6) 仅在证据显示通道兼容后合并； 7) 以验证表收尾，非含糊速度声明；通道矩阵（Lane/可并行?/写入面/风险/验证）记录；写入面不冲突才并行
- **依赖**：自包含（Read/Write/Edit/Bash/Grep/Glob）；大无关实现通道用隔离 worktree
- **说明**：ECC 自研；执行规则：批量文件读/搜索/状态检查、长跑测试/构建/backfill/部署分会话后刻意 poll、发现阻塞暂停依赖通道；禁止：并发产生冲突编辑、基准工具而非任务、未证正确就当完成、忘记 poll、成功摘要后藏跳过的检查、并行破坏性命令/迁移/同表写入/影响客户部署（除非显式门禁）

### token-budget-advisor
- **执行步骤**：1) 估算输入 token（prose: words×1.3、code: chars/4，混合用主导类型）； 2) 按复杂度分类（Simple 3-8×、Medium 8-20×、Medium-High 10-25×、Complex 15-40×、Creative 10-30×）乘输入 token 得响应窗口； 3) 答前呈现深度选项块（Input~N tokens / Type / Complexity / Language + 4 级 25/50/75/100% 各自估算 token）； 4) 按所选级别响应（25% 直接答案 2-4 句、50% 答案+上下文+1 例、75% 结构化+多例+对比、100% 无限制）；快捷：用户已说级别（"1"/"25% depth"/"tldr" 等）直接响应不问
- **依赖**：自包含（无 tokenizer，纯启发式）；引用 context-budget 的校准指引；源项目附 Python 估算脚本但本仓库保持纯启发式
- **说明**：origin: community（源：TBA — Token Budget Advisor for Claude Code）；精度 ~85-90%（±15%），必须显示免责声明；不触发：本会话已设级别（静默维持）、一词可答、"token"指 auth/session/payment token；描述虽空但正文完整，是回答深度选择器而非 LLM 成本预算工具，被归入"token 预算"类但语义不同

## 九、研究·调研（11 个）

写码前/决策前的调研——多源深度研究、Web/神经搜索、文档查阅、市场研究、学术与专利数据库、代码库 onboarding 与导览。

### deep-research
- **执行步骤**：1) 理解目标：问 1-2 个澄清问题（目标=学习/决策/写作？角度与深度？），若用户说"just research it"则用默认值直接跳过；2) 规划研究：把主题拆为 3-5 个子问题；3) 多源搜索：对每个子问题用 firecrawl_search / web_search_exa / web_search_advanced_exa 跑 2-3 种关键词变体，目标 15-30 条唯一来源，优先级 学术/官方/权威新闻 > 博客 > 论坛；4) 深读关键源：对最有价值的 URL 用 firecrawl_scrape 或 crawling_exa(tokensNum=5000) 取全文，精读 3-5 篇；5) 综合写报告：按 Executive Summary + 多个主题章节 + Key Takeaways + Sources + Methodology 结构，每条结论内联引用；6) 交付：短主题直接发 chat，长报告发摘要+保存全文到文件；可选：用 Task 工具并行起 3 个 research 子代理分头研究再汇总
- **依赖**：firecrawl MCP、exa MCP、Claude Code Task 子代理
- **说明**：正文明确为"易漂移 skill"，要求先用前验证 MCP 工具名/配额；质量规则要求每条主张必须有来源、交叉核验、偏好近 12 个月来源、承认空白、不臆造、区分事实与推断

### documentation-lookup
- **执行步骤**：1) 解析 Library ID：调 resolve-library-id(libraryName, query=user 完整问题) 取 Context7 兼容 ID（/org/project）；2) 选最佳匹配：按名称精确度、benchmark 分（满分 100）、来源声誉、用户指定版本（如 React 19/Next.js 15）筛选；3) 拉取文档：调 query-docs(libraryId, query=具体问题)，取相关片段；4) 使用文档：用取回的当前信息回答，附代码示例，必要时标注版本；硬上限：resolve-library-id 与 query-docs 每个问题合计不超过 3 次，超限就声明不确定并给最佳已知信息
- **依赖**：context7 MCP（resolve-library-id、query-docs）
- **说明**：跨 harness 通用（Claude Code/Cursor/Codex，凡配了 Context7 MCP 的）；要求查询前对用户问题做敏感数据脱敏（API key/密码/token）；优先官方包而非社区 fork

### exa-search
- **执行步骤**：正文以工具+用法模式给出，核心两工具：① web_search_exa(query, numResults=8, type=auto, livecrawl=fallback, category 可选如 company/research paper) —— 通用 web/公司/人物发现；② get_code_context_exa(query, tokensNum=5000，范围 1000-50000) —— 从 GitHub/Stack Overflow/文档站找代码示例；典型模式：快速查询（numResults=3）、代码研究（tokensNum=3000）、公司或人物检索（category=company 或 site:linkedin.com/in）、技术深挖（先 web_search 再 get_code_context 组合）
- **依赖**：exa MCP（web_search_exa、get_code_context_exa，需 EXA_API_KEY 配置）
- **说明**：自标"易漂移 skill"——Exa 工具名/参数/账户限额会变，依赖前先验证当前暴露的工具面；提示用 site:、引号短语、intitle: 收窄结果；关联 deep-research（firecrawl+exa 组合）、market-research（带决策框架的业务研究）

### market-research
- **执行步骤**：正文以模式集给出，含：① 投资/基金尽调（收集 fund 规模/阶段/check size、相关组合公司、公开 thesis 与近期活动、是否匹配、红旗）；② 竞品分析（产品真实情况而非营销文案、融资与投资人历史、traction、分销与定价线索、强弱与定位缺口）；③ 市场规模（自上而下报告/数据集 + 自下而上获客假设校验，每个逻辑跳跃显式声明假设）；④ 技术/供应商研究（工作原理、权衡与采纳信号、集成复杂度、锁定/安全/合规/运营风险）；输出格式固定为：1.executive summary 2.key findings 3.implications 4.risks and caveats 5.recommendation 6.sources
- **依赖**：自包含（方法论 skill）
- **说明**：标语"产出支撑决策的研究，而非 research theater"；研究标准要求每条重要主张有来源、偏好近期数据并标注陈旧数据、纳入反向证据与下行案例、把事实/推断/建议分开；交付前过 quality gate（数字有源或标为估算、建议源自证据、含风险与反驳）

### research-ops
- **执行步骤**：1) 从用户已给材料出发：把已有内容归一化为"已证据化事实 / 待核验 / 开放问题"，不从头分析；2) 分类诉求：选车道（快速事实 / 比较或决策备忘 / 线索富集 / 反复监控候选）；3) 先走最轻路径：exa-search 做快速发现 → 多源综合时升级到 deep-research → 需要建议时用 market-research → 目标排序或暖路径发现交给 lead-intelligence；4) 按证据边界报告：把重要主张标为 sourced fact / user-supplied context / inference / recommendation，对时效敏感的答案必须给具体日期；5) 决定是否留人工：若同一问题会反复问，显式建议加监控/工作流层而非永远手动搜
- **依赖**：exa-search、deep-research、market-research、lead-intelligence、knowledge-ops（均为 ECC 关联 skill）
- **说明**：护栏明确：不拿陈旧记忆答当前问题（当新鲜搜索很便宜时）；不因本地代码/文档已能回答就启动重型研究；输出固定模板为 QUESTION TYPE / EVIDENCE / INFERENCE / RECOMMENDATION；陷阱提醒别把推断混入 sourced fact、别忽略用户提供的证据、别给时效敏感答案却不带日期

### scientific-db-pubmed-database
- **执行步骤**：1) 构造查询：把研究问题拆成概念，用 Boolean 组合（concept_1 AND concept_2 AND filter；synonym_a OR synonym_b；NOT exclusion_term），用字段标签 [ti]/[ab]/[tiab]/[au]/[ta]/[mh]/[majr]/[pt]/[dp]/[la] 等；2) MeSH 与副主题词：优先用稳定受控词，副主题词写在字段标签前（如 diabetes mellitus, type 2/drug therapy[mh]），主题必须为核心时才用 [majr]；3) 过滤器：按出版类型（clinical trial / meta-analysis / RCT / review / systematic review / guideline）、日期（如 2020:2026[dp]）、可获性（free full text[sb]、hasabstract[text]）；4) E-utilities 工作流：esearch.fcgi 搜索返回 PMID → esummary.fcgi 取轻量元数据 → efetch.fcgi 取摘要/全记录（XML/MEDLINE/text）→ elink.fcgi 找相关文章；批量用 history server（usehistory=y、WebEnv、query_key）；5) 输出纪律：每次搜索记录 精确检索串 / 数据库 / 搜索日期 / 过滤器 / 结果数 / 导出格式 / 人工剔除项
- **依赖**：NCBI E-utilities API（esearch/esummary/efetch/elink）、NCBI_EMAIL 与 NCBI_API_KEY 环境变量
- **说明**：API key 必须存环境变量，禁入提交文件或 shell 历史；rate limit 需调 sleep（示例 0.35s）且 HTTP 必须 raise_for_status；区分 sourced fact / 推断；不做法律/临床决策（属数据收集与记录核验工作流）

### scientific-db-uspto-database
- **执行步骤**：1) 源选择：优先官方/USPTO 支持的源——Open Data Portal(ODP)、Patent File Wrapper、PatentSearch API、TSDR Data API、Assignment Search、PTAB 数据；次级源仅作索引，重要结论交叉核验官方记录；2) PatentSearch 工作流：识别端点 → 构建 JSON 查询（显式过滤器）→ 只请求需要的字段 → 确定性地排序分页 → 记录端点/查询体/日期/数据时点说明/结果数；请求头带 X-Api-Key；3) TSDR 商标工作流：规范化序列号/注册号 → 查当前 TSDR API 指示与所需 key 头 → 先取状态再按需取文档 → 遵守 PDF/ZIP/多案下载更低速率限制 → 捕获检索日期与标识；4) File Wrapper：用精确标识（申请号/公开号/专利号/当事人名），记录是已授权/预授权/待审；5) 转让工作流：按专利/申请/注册号或 reel/frame 检索，记录 conveyance 文本/执行日/记录日/当事方，区分转让记录与当前法律所有权；每次研究产出日志表（Source / Date / Identifier / Filters / Results / Notes）
- **依赖**：USPTO Open Data Portal、PatentSearch API（PatentsView，PATENTSVIEW_API_KEY / USPTO_API_KEY 环境变量）、TSDR Data API、Assignment Search
- **说明**：明确声明不提供法律建议，仅作数据收集与记录核验；关键步骤要求复用查询前验证当前端点名/字段路径/参数/key 可用性；最终写法把 官方记录事实 / 推断分析 / 次级源便利匹配 / 待法律审查的未决缺口 分开

### scientific-pkg-gget
- **执行步骤**：1) 安装：干净 venv 中 pip/uv pip install --upgrade gget，先 gget --help；2) 基本形态：CLI `gget <module> [args] [options]`，Python `import gget; gget.search([...], species="human")`；3) 通用工作流：① 确认物种/组装/基因 ID 类型/所需数据库 ② 查当前模块文档参数 ③ 先跑小查询 ④ 用显式文件名+日期存输出 ⑤ 记录模块名/版本/参数/数据库假设；4) 常用模块：search/info/seq/ref（Ensembl ID 与元数据）、blast/blat/muscle/diamond（序列比对）、alphafold/pdb（蛋白结构）、enrichr/opentargets/archs4/bgee/cbio/cosmic（富集/靶点/表达/癌症/疾病关联）；5) 可复现性日志：记录 日期 / gget 版本 / 模块 / 查询 / 物种或组装 / 输出 / 备注
- **依赖**：gget CLI / Python 包（pip 或 uv 安装）、可选 uv、Python 环境；上游数据库（Ensembl/UniProt/AlphaFold/PDB 等）
- **说明**：注意：临床解读/高通量生产/精细版本控制应改用专用工作流；上游数据库会变化，依赖前需升级 gget 并复查模块文档；非每个模块都支持所有 Python 版本或依赖集；结果须标为"数据库输出"而非临床解读

### scientific-thinking-literature-review
- **执行步骤**：1) 定义问题：把 prompt 转成可检索的研究问题，临床/生物医学用 PICO（Population/Intervention/Comparator/Outcome），技术工作用 系统/方法/比较基线/评估指标；2) 规划检索：定 数据库集合（PubMed 生物医学、arXiv CS/数学/物理/量化生物预印本、Semantic Scholar 或 Crossref 通用学术，必要时加临床试验注册库/专利库/标准机构）、日期范围、语言、出版类型、纳入/排除标准、精确检索串；3) 搜索并记日志：保留 数据库/搜索日期/查询/过滤器/结果数/导出 的表格；4) 去重：按 DOI → PMID/arXiv ID → 精确标题 → 规范化标题+一作+年份；5) 筛选：分阶段（标题 → 摘要 → 全文），系统综述记录剔除原因（错误人群/干预/结局/非原始研究/重复/无全文/超期）；6) 数据抽取：结构化表格（研究/设计/人群或数据/方法/对照/结局/关键发现/局限）；7) 综合：按主题而非逐篇总结，视角含 最强证据/冲突证据/方法学弱点/局限/新近性与可复现/实用启示/未决问题，按高/中/低置信度分级；8) 核验引文：验证 DOI/PMID/arXiv ID/官方 URL，核对作者与年份，不替不相关主张背书，预印本标预印本，综述与原始证据区分
- **依赖**：自包含（方法论 skill）；建议数据库集：PubMed、arXiv、Semantic Scholar、Crossref
- **说明**：默认未指定时：探索性走 scoping review，发表或临床主张走 systematic review；陷阱提醒：别把搜索片段当证据、别混淆预印本/综述/原始研究、别隐瞒负面或冲突结果、无可复现协议不得自称"systematic review"、宽泛主张别只用单一数据库；提供固定输出模板

### scientific-thinking-scholar-evaluation
- **执行步骤**：1) 识别工件类型：实证研究/理论论文/技术报告/系统或叙述性综述/研究提案/论文章节/会议摘要；2) 选范围：comprehensive（全维度）/ targeted（一到两个维度，如方法或引文）/ comparative（多作品同准则排序）；3) 按 9 维 rubric 各打 1-5 分（5=优秀可直接发表，N/A 表示不适用）：① 问题与研究问题 ② 文献与背景 ③ 方法学 ④ 数据与证据 ⑤ 分析 ⑥ 结果与解释 ⑦ 局限与效度威胁 ⑧ 写作与结构 ⑨ 引文；4) 评审流程：读摘要/引言/图表/结论把握主张 → 读方法与结果评证据质量 → 把最强主张对照引用源核验 → 给各维度打分 → 把关键 blocker 与修改建议分开 → 以具体下一步编辑收尾；5) 按模板输出：Overall Assessment（总分/置信度/3-5 句摘要）+ Dimension Scores 表 + Critical Issues + Recommended Revisions + Evidence Checks Needed
- **依赖**：自包含（评估准则 skill）
- **说明**：陷阱提醒：别用分数代替具体反馈、工件范围外不存在的维度别扣分、别以引用数/期刊/作者名声当作质量证明、别因摘要里出现就接受无证据支撑的主张

### search-first
- **执行步骤**：0) 工具可用性预检：检查相关渠道——仓库搜索（rg --files 与定向 rg）、包注册表（npm --version / python -m pip --version 或项目包管理器）、GitHub CLI（gh auth status）、MCP/docs 工具、本地 skills 目录（ls ~/.claude/skills ~/.codex/skills），缺失渠道如实声明；1) 需求分析：定义所需功能、识别语言/框架约束；2) 并行搜索（researcher agent）：跨 npm/PyPI、MCP/Skills、GitHub/Web 并行检索；3) 评估：按 功能性/维护/社区/文档/许可证/依赖 给候选打分；4) 决策（决策矩阵）：精确匹配且维护良好、MIT/Apache → Adopt；部分匹配好底子 → Extend/Wrap；多个弱匹配 → Compose 组合小包；无合适项 → Build 自定义但基于研究；5) 实施：装包 / 配 MCP / 写最小自定义代码
- **依赖**：researcher 类 agent（subagent_type="general-purpose"，旧版称 Task(...)）、gh、rg、项目包管理器（npm/PyPI 等）、可选 iterative-retrieval skill
- **说明**：对应命令 /search-first；与 planner、architect agent 协作点：planner 应在 Phase 1 架构评审前先调 researcher，architect 用它做技术栈/集成模式/参考架构决策；提供搜索快捷分类（Dev Tooling、AI/LLM 集成、Data&APIs、Content&Publishing）；反模式：跳过搜索直接写码、忽略 MCP、搜索渠道不可用时沉默跳过、把库包得过厚丧失好处、为小功能引入巨包

## 十、内容创作·媒体·品牌（17 个）

长文写作、多平台内容引擎、品牌声音、幻灯片/视频/动画生成、社交图谱与分发、SEO——内容生产与多渠道运营。

### article-writing
- **执行步骤**：1)明确受众与目的；2)搭硬骨架（每节只承担一个任务）；3)以证据/作品/冲突/例子开头；4)只在下一句配得上空间时才展开；5)删掉模板化、过度解释、自我恭维的内容。另含核心规则：具体先于例子后解释、句子收紧、用证据替代形容词、绝不臆造事实；并附 banned patterns 删除清单与质量门（事实有据、无 AI 套话、声音匹配 VOICE PROFILE、每节有新意、格式契合媒介）
- **依赖**：关联 skill：brand-voice（获取 VOICE PROFILE）；自包含
- **说明**：ECC origin；技术指南类须用代码/命令/截图开头，观点类以张力或矛盾开篇，newsletter 首屏要做实事；最终通过 Quality Gate 才交付

### brand-discovery
- **执行步骤**：会话启动协议：1)检查既有模块文件与 state.json 检查点，无则确认品牌名/参与者/保存路径并从首模块开始；2)读取当前模块文件的 Raw 节；3)用两三句向用户报告所在模块、状态、剩余工作并问「继续或切换」。访谈纪律：每次一个问题；答后短复述+一个深挖探针或闭合；laddering 连问 Why 直到核心价值；5 Whys 推根因；检测浅答要具体例子；每模块用一次投射技术；饱和信号即闭合。模块末写 Raw+Synthesis 并更新 state.json。8 个模块依次完成（10_purpose-why / 20_positioning / 30_audience-niche / 40_personality-archetype / 50_voice-tone / 60_narrative-story / 70_founder-tension / 90_SYNTHESIS）。多创始人模式按 founders/{participant}.md 落盘后做调和
- **依赖**：自包含；frontmatter description 文本实际较长（被声明为空属误判），正文非常详尽
- **说明**：ECC origin；写作框架：Sinek Golden Circle、Dunford "Obviously Awesome"、Baker、Mark & Pearson 12 原型、J.Aaker 5 维、Neumeier trueline、Kapferer 棱镜、Aaker 品牌系统、Enns "Win Without Pitching"；强校验 outputPath 必须为项目内绝对路径、participant 名仅字母数字与连字符；反模式：跳过状态读取、一次问多题、未饱和就 Synthesis、跳过多创始人调和、当作一次性会话；关联 competitive-platform-analysis 与 brand-voice

### brand-voice
- **执行步骤**：采集流程：1)尽量收集 5–20 篇代表性样本；2)优先近期材料（除非用户指旧作更权威）；3)区分「公开发布声音」与「私下工作声音」；4)若有 X 实时访问用 x-api 拉近期原创帖；5)若站点文案重要纳入 ECC 落地页与 repo/plugin 文案。提取维度：节奏与句长、压缩 vs 解释、大小写规范、括号使用、提问频率与目的、断言锐度、数字/机制/凭据密度、过渡方式、作者从不做的事。产出按 references/voice-profile-schema.md 的 VOICE PROFILE 块。落盘规则：会话内复用最新确认 profile；用户要持久化才写入指定位置；不创建仓库内个人声音指纹文件除非明确要求
- **依赖**：关联 skill / 工具：x-api（拉取近期 X 原创帖）、content-engine、crosspost、lead-intelligence、article 与外联写作；下游消费方多
- **说明**：ECC origin；附 Affaan/ECC 默认声音画像（直接、压缩、具体、机制与凭据优先、括号用于限定、常规大小写、提问罕见不作诱饵、可锐利直白怀疑干燥、过渡要挣得）；Hard Bans 清单删除虚假好奇钩子、"not X, just Y"、"no fluff"、强制小写、LinkedIn 领导者节奏、诱饵问题、"Excited to share"、创始人之旅填充、俗气括号；自诩为 voice 的权威来源

### competitive-platform-analysis
- **执行步骤**：1)建立客户定位简报（身份/美学调性、Offer、目标客户、差异化、范围后果、战略张力），缺失则先跑 brand-discovery 访谈绝不臆造；2)按 7 条选择轴评估候选（规模/模型、利基重叠、地理市场、定价与协作模式、作品风格、技术深度、品牌强度）；3)沿 8 大玩家分类轴布点（定位姿态、专业化、规模/模型、协作格式、差异化姿态、证据/可信度模型、运营者品牌强度、市场覆盖）；4)分三层落地——Direct/Adjacent/Aspirational，并留意替代品威胁向量；5)按数据源维度匹配检索（作品集/精选展示、奖项、对手官网、LinkedIn、评论目录、公开作品、会议/播客/newsletter），每个属性至少双源交叉验证；6)用打分矩阵模板预筛（Offer overlap/Distinctiveness/Commercial credibility/Craft proximity 各 1–5），保留差异化或可信度高分者，输出典型 10–18 候选 → 8–12 入册的分级对手集并交予 benchmark-methodology
- **依赖**：关联 skill：brand-discovery（先出定位简报）、benchmark-methodology（后续打分步骤）；competitive-report-structure（管线终点）
- **说明**：ECC origin；frontmatter description 非空（实为长文），正文附完整示例（精品品牌识别工作室配 memorability × hireability 战略张力，5 候选 8 轴布点+预筛打分+输出移交）；反模式：无简报盲定范围、罗列所有相似公司、模糊三层、依赖单一来源、跳过 scoping 直接打分；声明本步只 scope 与 tier，打分交给下游

### competitive-report-structure
- **执行步骤**：1)先建立定位简报（战略张力、品牌配比、差异化、目标象限）；2)按 8 节组装报告：①Executive summary 3–5 条决策优先要点；②Market landscape & category framing 多轴图（至少 2×2，理想用 benchmark-methodology 的张力图）；③Competitor tiers Direct/Adjacent/Aspirational 各一段；④Benchmarking matrix 全对手×九维度表（第 9 维战略张力拆两子列，热力图，禁加合计列，含客户自评行）；⑤Deep dives 3–5 个最有教益对手叙事；⑥White-space & threats 白地论证+威胁清单；⑦Strategic recommendations 按影响力×工作量排序并回绑品牌配比；⑧Sources/methodology 附录。结尾用触发问题驱动团队对齐会（目标象限是否真空、12 个月内最尖锐威胁与反击、品牌配比是否需调、补哪个维度让哪个维度、扩大差异化又不伤可雇用性的那一招）
- **依赖**：关联 skill：benchmark-methodology（前置产出画像卡）、competitive-platform-analysis（提供三层结构）、brand-discovery（补建定位简报）
- **说明**：ECC origin；frontmatter description 非空（长文）；强调 framing principle——整份报告围绕战略张力与品牌配比，建议若打破配比须显式标注；反模式：用方法论开篇、给数字不给张力图、省略决策框架、画像卡未齐就开工、矩阵加合计列；决策框架必须回答三问（与谁竞争、如何竞争、护城河在哪）

### content-engine
- **执行步骤**：源优先工作流：1)识别源集（已发文章、笔记/备忘、产品演示、文档/changelog、转录、截图、作者既有帖）；2)需要声音一致且多输出时先跑 brand-voice 建 VOICE PROFILE；3)按平台适配——X 以最强主张/作品/张力开头保留压缩，thread 每帖推进论点；LinkedIn 仅在必要时为圈外人展开，禁企业励志与赞美堆叠；短视频按视觉序列与证据点写脚本，前几秒给结果/问题/包袱；YouTube 早给结果或张力按论点组织；newsletter 直入要点每节有新意。复用流：1)选锚资产；2)抽 3–7 条原子主张/场景；3)按锐度新颖度证据排序；4)每条输出配一个强点子；5)按平台适配结构；6)剥除平台形填充；7)过质量门
- **依赖**：关联 skill：brand-voice（声音权威层）、crosspost（平台分发）、x-api（拉近期帖与发布审核后的 X）；自包含
- **说明**：ECC origin；Non-Negotiables：从源材料出发而非模板、按平台而非人设适配、一帖一主张、具体胜形容词、除非用户明要求否则不掺互动诱饵；Hard Bans 删除"rapidly evolving landscape"、"game-changer/revolutionary/cutting-edge"、纯为刷回复的 LinkedIn 收尾问、LinkedIn 假随意、源材料中没有的假互动填充；交付物含可选短声音画像、核心角度、平台原生草稿、发布顺序、发布前须补的缺口

### content-hash-cache-pattern
- **执行步骤**：正文以模式集给出，含：①内容哈希缓存键（SHA-256，64KB 分块读取大文件，文件改名/移动=命中，内容变更=自动失效）；②frozen dataclass 缓存条目（CacheEntry 含 file_hash/source_path/document，slots=True）；③基于文件的缓存存储（每条 {hash}.json，O(1) 查找，无需索引）；④服务层包装（extract_with_cache 保持 extract_text 纯函数，SRP 单一职责，corruption 返回 None 视为未命中优雅降级）。配套 Python 代码示例：compute_file_hash、CacheEntry、write_cache/read_cache、extract_with_cache；关键设计决策表（SHA-256/{hash}.json/服务层包装/手动 JSON 序列化/损坏返回 None/懒建目录）；最佳实践与反模式对照（禁路径键、禁把缓存逻辑塞进处理函数、禁对嵌套 frozen dataclass 用 dataclasses.asdict）；何时不用（必须实时新鲜的数据、缓存条目极大、结果依赖文件内容之外参数）
- **依赖**：自包含（纯 Python 模式，仅用标准库 hashlib/json/dataclasses/pathlib/typing）；无外部 agent/MCP/CLI
- **说明**：ECC origin；与 content-engine 名称相近但实质是缓存设计模式 skill，属通用工程模式而非内容生产；强调 Hash content not paths、Chunk large files、Keep processing functions pure、Log cache hit/miss、Handle corruption gracefully

### fal-ai-media
- **执行步骤**：通用调用模式：1)按任务选 app_id（图像用 fal-ai/nano-banana-2 快速迭代或 fal-ai/nano-banana-pro 高保真；视频用 fal-ai/seedance-1-0-pro、fal-ai/kling-video/v3/pro、fal-ai/veo-3；语音用 fal-ai/csm-1b；视频生音频用 fal-ai/thinksound）；2)用 generate(app_id,input_data) 提交，需要图/视频输入先 upload(file_path) 拿 URL 再塞进 input_data；3)estimate_cost 先估成本再跑贵视频；4)search/find/models 做模型发现。图像参数：prompt/image_size(square/portrait_4_3/landscape_16_9 等)/num_images/seed/guidance_scale；图像编辑用 Nano Banana 2 配 input image 做 inpainting/outpainting/style transfer。视频参数：prompt/duration(5s,10s)/aspect_ratio(16:9,9:16,1:1)/seed/image_url。Tips：用 seed 复现；低价模型迭代 prompt 后切 Pro 出终稿；视频 prompt 聚焦运动与场景；图生视频比纯文生视频更可控
- **依赖**：MCP：fal.ai（fal-ai-media MCP server，需配 FAL_KEY；提供 search/find/generate/result/status/cancel/estimate_cost/models/upload 工具）；可选 ElevenLabs API（专业语音，非 MCP）；可选 VideoDB（generative audio）；关联 skill：videodb、video-editing、content-engine
- **说明**：ECC origin；自标"drift-prone skill"——fal.ai 模型 ID/定价/输入/MCP 工具名变化快，使用前先 search 或 fetch 最新模型元数据；附完整参数表与各模型代码示例；另含 ElevenLabs 直接 API 调用示例与 VideoDB generate_voice/generate_music/generate_sound_effect 用法

### frontend-slides
- **执行步骤**：1)检测模式（新建 / PPT 转换 / 增强）；2)发现内容（仅问最小必要：目的、长度、内容状态，已有内容先粘贴再谈风格）；3)发现风格（默认视觉探索：问 deck 该制造何种感觉→在 .ecc-design/slide-previews/ 生成 3 个单页预览文件，各自自包含且约 100 行内→让用户选保留或混搭；已知 preset 则跳过预览直接用）；4)构建演示（输出 presentation.html 或 [name].html，仅含图片时用 assets/，需语义化 slide 节、STYLE_PRESETS.md 的 viewport-safe CSS 基底、CSS 自定义属性主题值、键盘/滚轮/触控导航控制器、IntersectionObserver 揭示动画、reduced-motion 支持）；5)强制 viewport 适配（.slide 用 height:100vh/100dvh;overflow:hidden，clamp() 缩放，溢出就拆页，绝不用缩小字号解决溢出）；6)在 1920x1080/1280x720/768x1024/375x667/667x375 五档校验；7)交付（删临时预览、用平台对应 opener 打开、汇总路径/preset/页数/主题定制点）
- **依赖**：可选 python3 + python-pptx（PPT/PPTX 提取文字/图片/备注）；可选浏览器自动化（校验阶段）；关联 skill：frontend-patterns、liquid-glass-design、e2e-testing
- **说明**：ECC origin；灵感来源致谢 @zarazhangrui；Non-Negotiables：零依赖默认单 HTML 文件内联 CSS/JS、viewport 适配强制、展示而非讲述、独特设计避免通用紫渐变 Inter-on-white、生产质量；前端规则：Google Fonts/Fontshare、抽象形状/渐变/网格/噪点/几何而非插画；附内容密度上限表（标题页/内容页/特性网格≤6 卡/代码 8-10 行/引用/图片）；反模式：通用创业渐变、系统字体 deck、长 bullet 墙、需滚动代码块、短屏破裂的固定高度、非法 -clamp(...) 负函数

### manim-video
- **执行步骤**：1)用一句话定义核心视觉论点；2)把概念拆成 3–6 个场景；3)决定每个场景证明什么；4)先写场景大纲再写 Manim 代码；5)先渲染最小可工作版本；6)渲染成功后再收紧排版/间距/颜色/节奏；7)仅当能增值时才交接给更广视频栈。场景规划规则：每场景证明一件事、避免过度堆砌的图、优先渐进揭示而非满屏杂乱、用运动解释状态变化而非凑热闹、标题卡短而有分量。默认输出：16:9 短 MP4 + 一张缩略图/海报帧 + 故事板与场景计划。社交图讲解默认：先展示当前图再展示优化图、区分低信号关注杂乱与高信号桥、高亮暖路节点与目标集群、必要时加展示自改进谱系的终场。渲染惯例：默认 16:9 横屏、先低质量冒烟测试、构图与时间稳定后才推高画质、导出一帧社交尺寸可读的干净缩略图。assets/network_graph_scene.py 可作网络图讲解起点（manim -ql assets/network_graph_scene.py NetworkGraphExplainer）
- **依赖**：CLI：manim（场景渲染）、ffmpeg（后处理）；关联 skill：video-editing（最终打磨）、remotion-video-creation（合成 UI/字幕/运动层）、content-engine（动画纳入更广发布）
- **说明**：ECC origin；返回结构：核心视觉论点/故事板/场景大纲/渲染计划/后续打磨建议；与 fal-ai-media 互补——前者做精准技术动画，后者做生成式媒体

### marketing-campaign
- **执行步骤**：Phase 1 研究：用 market-research 做受众画像（JTBD/恐惧/语言/在用替代品）+3 个以上直接或邻近竞手（定位/缺口/讯息弱点）+1–3 条战役角度可利用的受众洞察，产出研究简报。Phase 2 定位：产出核心收益陈述（一句无功能清单无行话）、定位公式"[Product] helps [audience] [achieve outcome] by [mechanism]"、战役角度、调性画像（委托 brand-voice 持久捕获），定位与角度未批前不写文案。Phase 3 内容生产按序：①落地页文案（hero/problem/solution/features/how it works/proof/CTA）；②邮件序列（按 problem→education→agitation→solution→proof→urgency→final CTA 弧线，每封一目的）；③社交帖（content-engine 平台原生，LinkedIn 与 X 是不同格式非同稿缩放）；④短视频脚本（按时间戳分块，为屏幕与耳朵而写）；⑤广告文案变体（3–4 个测不同角度或细分）；⑥内容日历（按天的渠道/类型/时间/依赖）。Phase 4 审核：5 秒测所有 hero 文案、CTA 审计、调性一致性、主张审计（具体且可支撑）、跨渠道一致性（广告主张=落地页、邮件正文=主题）
- **依赖**：关联 skill：brand-voice（写前捕获声音）、content-engine（平台原生内容）、crosspost（多平台分发）、market-research（受众与竞争情报）、seo（落地页页内优化）
- **说明**：ECC origin；输出契约 9 件交付物（定位简报/落地页/邮件序列/LinkedIn 3+ 帖/X 5+ 帖含 1 thread/短视频脚本 2+/广告变体/内容日历/文案审核摘要）；Hard Bans 删除 game-changing/revolutionary/world-class/cutting-edge、"In today's competitive landscape"、无真实截止的假紧迫、无具体数字的空洞社会证明、learn more/find out more/click here 等通用 CTA、可原样塞进竞手战役的文案；Quality Gate 要求同一作者感、无空洞最高级、CTA 具体且挣得、跨平台不逐字重复、hero 过 5 秒测、邮件主题与正文一致、广告主张与落地页精确一致

### openclaw-persona-forge
- **执行步骤**：触发判断三模式：引导模式 / 抽卡模式 / 打磨模式。Step 1 选方向（引导）：展示 10 类虾生方向（落魄重启/巅峰无聊/错位人生/主动叛逃/神秘来客/天真入世/老江湖/异世穿越/自我放逐/身份错乱），可编号展开每类 4 个备选、混搭或转抽卡。Step 1-B 抽卡：必须执行 python3 ${SKILL_DIR}/gacha.py [次数]（默认 1 次最多 5 次，从 800 万组合真随机），以创世神语气点评亮点。Step 2 锻造身份张力（references/identity-tension.md）：前世身份×当下处境×内在矛盾→一句话灵魂。Step 3 推导底线规则（references/boundary-rules.md）：用角色语言表达 2–4 条而非通用条款。Step 4 锻造名字（references/naming-system.md）：给 3 个候选各附策略类型与搭配理由并表达偏好。Step 5 生成头像（references/avatar-style.md）：填 7 个个性化变量拼 STYLE_BASE+个性化提示词，检查当前环境是否有已审核生图 skill——有则写临时文件调用生图，无则输出完整英文提示词供 Gemini/ChatGPT/Midjourney 手动生成。Step 6 输出完整方案（references/output-template.md）并引导用 Write 工具落盘 SOUL.md 与 IDENTITY.md
- **依赖**：CLI：python3（必需，运行 gacha.py 抽卡引擎）；可选：当前环境已审核的生图 skill（自动生成头像，未安装则输出提示词文本）；references 含 identity-tension/boundary-rules/naming-system/avatar-style/output-template/error-handling 六份子文档
- **说明**：community origin；本 skill 本身为中文撰写；对话以"龙虾创世神亚当"视角，原则先点评再提问、每次语气变化、有态度但不强迫、用锻造/熔炼/赋予灵魂等创世隐喻；核心理念：好灵魂=身份张力+底线规则+性格缺陷+名字+视觉锚点五者互证；避坑：极端毒舌第 3 天就烦、过度角色扮演写正式邮件出戏、过度温暖失灵于批评、完美无缺是说明书非角色；降级策略：Python 不可用跳过 gacha 从 10 类预设随机、生图未装输出提示词、生图失败重试 1 次再退提示词、任何未预期错误记录并跳过；自声明不含网络请求或文件发送代码

### remotion-video-creation
- **执行步骤**：正文以规则清单给出，含 29 条规则文件链接：3d（Three.js/React Three Fiber）、animations（基础动画）、assets（导入图片/视频/音频/字体）、audio（音频导入/裁剪/音量/速度/音高）、calculate-metadata（动态设定 composition 时长/尺寸/props）、can-decode（Mediabunny 检测浏览器可解码性）、charts（图表与数据可视化）、compositions（定义 compositions/stills/folders/default props/dynamic metadata）、display-captions（TikTok 式分页字幕+单词高亮）、extract-frames（Mediabunny 按时间戳抽帧）、fonts（Google Fonts 与本地字体）、get-audio-duration / get-video-dimensions / get-video-duration（Mediabunny 取时长/尺寸）、gifs（GIF 与时间线同步）、images（Img 组件嵌入图片）、import-srt-captions（@remotion/captions 导入 .srt）、lottie（嵌入 Lottie 动画）、measuring-dom-nodes / measuring-text（测节点尺寸/文本尺寸/适配容器/检测溢出）、sequencing（延迟/裁剪/限时序模式）、tailwind（TailwindCSS）、text-animations（排版与文本动画）、timing（linear/easing/spring 插值曲线）、transcribe-captions（音频转字幕）、transitions（场景转场）、trimming（裁剪动画首尾）、videos（嵌入视频——裁剪/音量/速度/循环/音高）。每条规则读对应 rules/*.md 取详解与代码示例
- **依赖**：依赖：Remotion（React 视频框架）、Mediabunny（媒体探测库，用于 can-decode/extract-frames/get-audio-duration/get-video-dimensions/get-video-duration）、Three.js / React Three Fiber（3d 规则）、@remotion/captions（字幕）、Lottie（lottie 规则）、TailwindCSS（tailwind 规则）；关联 skill：manim-video、video-editing（共享视频栈）
- **说明**：非 ECC origin（frontmatter 用 tags 而非 metadata.origin），属 Remotion 官方风格规则集；frontmatter description 仅一句但规则索引非常完整；与 manim-video（精准技术动画）、video-editing（真实素材剪辑）形成互补——本 skill 专注 React 编程式视频合成

### seo
- **执行步骤**：正文以清单+规则给出，含：原则（先修技术阻塞再优化内容、一页一明确搜索意图、重长期质量信号而非操纵模式、移动优先、建议须页级可落地）；技术 SEO 清单——可抓取性（robots.txt 放行重要页挡低价值面、无重要页意外 noindex、浅点击深度、重定向链≤2 跳、canonical 自洽无环）、可索引性（URL 格式一致、多语言 hreflang、sitemap 反映公开面、无重复 URL 争排名而无 canonical）、性能（LCP<2.5s、INP<200ms、CLS<0.1，常见修法预加载 hero 资产/减渲染阻塞/预留布局/砍重 JS）、结构化数据（首页 Organization/Business、编辑页 Article/BlogPosting、产品页 Product+Offer、内页 BreadcrumbList、Q&A 仅当内容真匹配才用 FAQPage）；页内规则——title 标签约 50–60 字符主关键词靠前且人读得懂、meta description 约 120–160 字符诚实描述含主话题、heading 一个清晰 H1 且 H2/H3 反映真实层级；关键词映射 5 步（定义搜索意图→收集现实变体→按意图/价值/竞争排序→一主关键词/主题映射一 URL→检测并避免同站相食）；内链（强页链向目标排名页、描述性锚文本、避免通用锚、新页回链相关旧页）。附 title 公式、meta description 公式、JSON-LD Article 示例、审计输出格式（[HIGH] 问题/Location/Issue/Fix）
- **依赖**：关联 skill：seo-specialist、frontend-patterns、brand-voice、market-research；自包含（无强制 CLI/MCP）
- **说明**：ECC origin；反模式表：关键词堆砌→先为用户写、薄近重复页→合并或差异化、schema 对不上实际内容→让 schema 匹配现实、未读真实页就给内容建议→先读真页、通用"改进 SEO"输出→每条建议绑定具体页或资产

### social-graph-ranker
- **执行步骤**：1)构建加权目标集 T；2)从 X/LinkedIn/两者拉用户图谱 M；3)计算直接桥分值 B(m)=Σ w(t)·λ^(d(m,t)-1)，λ 通常 0.5 每跳折半；4)对最高价值互关展开二阶候选 B_ext(m)=B(m)+α·ΣΣ w(t)·λ^(d(m',t))，α 通常 0.3 折扣二阶；5)按响应调整最终排名 R(m)=B_ext(m)·(1+β·engagement(m))，β 通常 0.2；6)返回三层：Tier 1 高 R 且直接桥→暖引荐请求，Tier 2 中 R 且一跳桥→有条件引荐请求，Tier 3 低 R 或无桥→直接外联或填缺口。打分信号：目标加权用角色/头衔对齐、公司/行业契合、当前活跃与近期、地理相关、影响力/触达、响应概率；互关加权用进入目标集的加权路径数、路径直接度、响应史、做引荐的情境契合
- **依赖**：关联 skill：lead-intelligence（在更广目标发现与外联管线内调用本排名模型）、connections-optimizer（用同一桥逻辑决定保留/剪除/新增）、brand-voice（起草引荐请求或直接外联前先跑）、x-api（X 图谱访问与可选执行路径）；自包含（数学模型为主，无强制外部 CLI）
- **说明**：ECC origin；明确边界——本 skill 只做排名引擎，完整线索生成与外联排序用 lead-intelligence，网络修剪/再平衡/增长用 connections-optimizer；输出格式固定（SOCIAL GRAPH RANKING 头+Priority Set/Platforms/Decay Model+Top Bridges/Conditional Paths/No Warm Path 三段）

### video-editing
- **执行步骤**：六层管线（不可跳层不可让一工具干所有）：Layer 1 捕获（Screen Studio 做应用演示/编码/浏览器流程的精美录屏；原始相机素材；VideoDB 桌面捕获）；Layer 2 组织（Claude/Codex 转录打标、规划结构、识别死段、生成剪辑决策清单 EDL、脚手架 FFmpeg/Remotion 代码）；Layer 3 确定性剪切（FFmpeg 按时间戳抽段、按 EDL 批量切、concat 拼接、做代理提速、抽音频转录、loudnorm 归一化音量、scene 检测、silence 检测自动剪死气）；Layer 4 可编程合成（Remotion 做叠层/数据可视化/动效图形/可复用模板/产品演示标注，npx remotion render 输出）；Layer 5 生成资产（ElevenLabs 文生语音；fal.ai 经 fal-ai-media 做背景音乐/ThinkSound 视频生音频/转场声/Nano Banana Pro 生成缩略图与 b-roll；VideoDB 生成式音频）；Layer 6 终抛光（Descript/CapCut 做节奏/字幕清理/调色/混音/平台导出，这层是人类品味）。社交重构图：YouTube 16:9 1920x1080、TikTok/Reels 9:16 1080x1920、Instagram Feed 1:1 1080x1080、X 16:9 或 1:1；FFmpeg crop 重构图或 VideoDB reframe 智能主体跟踪
- **依赖**：CLI/工具：FFmpeg（确定性剪切与格式转换）、Remotion（React 可编程合成，npx remotion render）、ElevenLabs（API 旁白）、Screen Studio（屏幕录制）、Descript/CapCut（终抛光）；MCP：fal.ai（经 fal-ai-media skill 生成音乐/音效/视觉）；关联 skill：fal-ai-media、videodb、content-engine
- **说明**：ECC origin；核心论点——AI 视频编辑价值在压缩/结构化/增强真实素材而非从 prompt 生成整段；六原则：编辑非生成、结构先于风格、FFmpeg 是骨干、Remotion 求可复用、选择性生成只用 AI 补不存在的资产、品味是最后一层；附各工具优劣势表（Claude/Codex 组织强但非品味层、FFmpeg 确定性但无 UI、Remotion 可组合但有学习曲线、Screen Studio 仅录屏、ElevenLabs 非工作流中心、Descript/CapCut 手动不可自动化）

### videodb
- **执行步骤**：工作流以 Python SDK 内联调用为主（避免写脚本文件，>3 句用 heredoc）：1)先 from dotenv import load_dotenv; load_dotenv(".env") 加载 VIDEO_DB_API_KEY（缺失 videodb.connect() 抛 AuthenticationError）；2)conn = videodb.connect() 取连接，coll = conn.get_collection() 取集合；3)按任务调用——上传 coll.upload(url/file_path)、转录与字幕 video.index_spoken_words(force=True)+get_transcript_text()+add_subtitle()、搜索 video.search 包 try/except InvalidRequestError 处理 No results found、场景搜索 video.index_scenes（已存在则用 re.search(r"id\s+([a-f0-9]+)", str(e)) 抽既有 scene_index_id）+ search(score_threshold=0.3+ 过滤）、时间线编辑 Timeline+VideoAsset(start/end/asset_id)+TextAsset（先校验 start≥0 且 start<end 且 end≤length）、转码 conn.transcode(mode/VideoConfig/AudioConfig)、重构图 video.reframe(target=vertical/square/landscape，优先用 start/end 限段否则 callback_url 异步)、生成式媒体 coll.generate_image/generate_voice/generate_music/generate_sound_effect。桌面捕获仅支持 macOS：用 scripts/ws_listener.py --clear 启 WebSocket 监听、cat videodb_ws_id 取 ID、事件落 videodb_events.jsonl 再 json 解析按 channel 过滤 transcript/visual_index
- **依赖**：依赖：VideoDB Python SDK（pip install "videodb[capture]" python-dotenv，Linux 装不下 capture 则 pip install videodb python-dotenv）、VIDEO_DB_API_KEY（用户自设于环境或 .env，免费 50 上传 console.videodb.io）；前置工具 Read/Grep/Glob/Bash(python:*)（frontmatter allowed-tools）；关联 skill：fal-ai-media、video-editing、content-engine；明确禁用 ffmpeg/moviepy/本地编码工具做 VideoDB 已支持的操作
- **说明**：ECC origin；frontmatter description 极长覆盖全部能力；明确边界——VideoDB 服务端处理 trimming/拼接/音频叠层/字幕/文本图片叠层/转码/分辨率/宽高比/重构图/转录/媒体生成，仅 transitions/速度变更/crop zoom/调色/混音才回退本地工具；reframe() 是慢操作须限段或 callback；时间线负时间戳会被静默接受产出损坏流；常见陷阱表覆盖 7 类（已索引重复、场景索引已存在、搜索无果、reframe 超时、负时间戳、套餐限制等）；reference/ 目录九份子文档（api-reference/search/editor/streaming/generative/rtstream/rtstream-reference/capture/capture-reference/use-cases）

## 十一、外部服务集成·运维 Ops（18 个）

GitHub/Jira/Linear/Google Workspace/Stripe/Mailtrap/X 等外部服务的操作工作流，邮件/消息/通知统一处理，仓库执行与发布——把外部系统纳入 ECC 工作流。

### connections-optimizer
- **执行步骤**：1) 收集优先级、不可触碰清单、平台选择与模式（light-pass/default/aggressive）；2) 拉取当前 following/连接清单；3) 对清理候选评分并给出理由；4) 对保留候选评分并给出理由；5) 用 lead-intelligence + research 排序扩展候选；6) 按温度选渠道（X DM / LinkedIn / Apple Mail 草稿）；7) 起草前先跑 brand-voice；8) 在任何 apply 之前返回 review pack
- **依赖**：x-api、lead-intelligence、social-graph-ranker、brand-voice、Exa/deep research、browser control、Apple Mail；关联 content-engine
- **说明**：安全默认：仅 review-first 不盲删；X 只动 following 不动 followers；LinkedIn 一度连接默认人工复核；不自动发送 DM/邀请/邮件

### crosspost
- **执行步骤**：1) 从最强源版本开始（X 帖/文章/launch note/thread/changelog），需要时先跑 content-engine；2) 跑 brand-voice 捕获 VOICE PROFILE 复用；3) 按平台约束改写（X 压缩；LinkedIn 仅补必要上下文；Threads 直接；Bluesky 简洁）；按发布顺序（先发最强原生版本，再适配次级平台，按需错峰）
- **依赖**：content-engine、brand-voice、x-api
- **说明**：禁止模式：不得发"Excited to share""Here's what I learned""What do you think?"等套话；发布前做质量门（同作者不同约束、无重复拷贝、无水分）

### customer-billing-ops
- **执行步骤**：1) 以最强标识符干净地确认客户身份（email/Stripe customer ID/订阅 ID/发票 ID/GitHub 用户名），返回身份摘要；2) 将问题分桶（重复个人订阅/真实多席位/支付失败/缺自服务/产品失败）；3) 先做最安全可逆动作（恢复自服务 → 修计费状态 → 仅退受影响款项 → 记录原因 → 发跟进文案）；4) 检查运营侧产品缺口（无 billing portal、无用量可见性、无取消流程等）；5) 产出运营 handoff（客户状态/动作/收入影响/跟进文案/待建产品项）
- **依赖**：Stripe（首选连接计费工具）、email、GitHub、issue tracker（仅作佐证）；托管 billing/customer portal 优先
- **说明**：严禁泄露密钥/完整卡号/多余 PII；不盲目退款，先分类；年付/团队/按比例计费需先核契约形态

### email-ops
- **执行步骤**：1) 先确定确切 surface（哪个邮箱账户、哪个线程/收件人、任务是分诊/草稿/回复/发送、草稿-only 还是实发）；2) 起草前读线程（回复时读上下文与未答问题，外联时判温度并选发件账户+跑 brand-voice）；3) 起草后验证（草稿-only 给最终稿；实发先验正文再发并确认落入 Sent）；4) 用确切状态词报告（drafted/approval-pending/sent/blocked/awaiting verification）
- **依赖**：brand-voice、investor-outreach、customer-billing-ops、knowledge-ops、research-ops；邮件发送 surface（如 Apple Mail）
- **说明**：不在未确认 Sent 落地前声称已发；不混用账户；DM/iMessage 类交给 messages-ops

### github-ops
- **执行步骤**：正文以工作流清单给出，含：① Issue 分诊（读标题/正文/评论 → 搜重复 → 加 label → 提问/标 good-first-issue/标 duplicate）；② PR 管理（CI 检查、可合并性、>5 天无评审告警、stale 策略：14 天标 stale、7 天催、30 天关闭）；③ CI/CD 失败处理（看 run 日志、识别失败步骤、区分 flaky vs 真失败、修根因）；④ Release（主分支绿、查未发布变更、生 changelog、gh release create）；⑤ 安全监控（Dependabot、secret scanning、依赖 PR）
- **依赖**：gh CLI（gh auth login）；GitHub API；Dependabot、secret scanning
- **说明**：质量门：所有分诊有标签、无 PR>7 天无评审、CI 失败已排查（非仅重跑）、release 含准确 changelog、安全告警已跟踪

### google-workspace-ops
- **执行步骤**：1) 用 Drive 搜索定位确切文件、兄弟资产、疑似重复、最近修改版；2) 编辑前先检查（摘要结构、tabs/标题/页数、判局部清理 vs 结构手术、选最小安全工具）；3) 精准编辑（Docs 用 index-aware 编辑、Sheets 显式 tab/范围、Slides 区分内容编辑与视觉清理/模板迁移，视觉类需迭代验证）；4) 维护工作系统整洁（标出重复追踪表、过时幻灯片、陈旧 vs canonical 文档、是否归档/合并/重命名）
- **依赖**：Google Drive、Docs、Sheets、Slides；Google Workspace API
- **说明**：不靠文件名猜结构，先检查；输出含 ASSET/CURRENT STATE/ACTION/FOLLOW-UPS

### jira-integration
- **执行步骤**：正文以清单给出，含：① Prerequisites：装 mcp-atlassian MCP 或配 REST env（JIRA_URL/JIRA_EMAIL/JIRA_API_TOKEN）；② MCP/REST 工具引用（jira_search、jira_get_issue、jira_create/update/transition_issue、jira_add_comment、jira_get_sprint_issues、jira_create_issue_link、jira_get_issue_development_info）；③ Analyzing：抽功能需求/验收标准/可测行为/角色/数据/集成点、测类型（单元/集成/E2E/API）、边界与错误场景、结构化分析输出；④ Updating：按工作流步骤映射（开工→In Progress、测试写完→评论覆盖、分支创建→评论分支名、PR 创建→评论链接、合并→Done）；⑤ Security/Troubleshooting/Best Practices
- **依赖**：mcp-atlassian MCP（推荐）或 Jira REST API v3（curl）；uvx（Python 3.10+）；env: JIRA_URL/JIRA_EMAIL/JIRA_API_TOKEN
- **说明**：安全：token 永不硬编码、用环境变量/密钥管理、.env 加 .gitignore、最小权限、泄露立即轮换；转换前先 jira_get_transitions

### knowledge-ops
- **执行步骤**：正文以分层架构 + 摄入工作流给出，含：① 6 层架构（活动执行真相=GitHub/Linear；Claude Memory=~/.claude/projects/\*/memory/；MCP memory=知识图谱；KB repo=持久文档；外部库=Supabase/PG；本地 context/archive）；② Ingestion：1) Classify（决策/路线图/偏好/引用/大文档/会话各归位）；2) Deduplicate（搜 memory/MCP/GitHub/Linear，更新而非新建）；3) Store（更新对应层）；4) Index；③ Sync Operations（对话同步、工作区状态同步、GitHub/Linear 同步、跨源知识同步）；④ Memory Patterns（TodoWrite/session、memory 文件、GitHub+Linear、KB、MCP 知识图谱）
- **依赖**：GitHub、Linear、MCP memory server（create_entities/create_relations/add_observations/search_nodes）、Claude Code Memory、Supabase/PostgreSQL、KB repo
- **说明**：质量门：无重复条目、敏感数据从 Git 脱敏、索引与摘要已更新、层级选择正确、交叉引用齐全；一条事实一个 canonical 来源

### lead-intelligence
- **执行步骤**：正文以 5 阶段 pipeline 给出：1) Stage 1 Signal Scoring（Exa/X 搜索，按角色 30%/行业 25%/近期活跃 20%/粉丝 10%/地理 10%/互动 5% 加权）；2) Stage 2 Mutual Ranking（拉 X following+LinkedIn 连接，用 social-graph-ranker 模型 B(m)=Σw(t)·λ^(d-1) 打分，互关按 40%/角色 20%/地理 15%/行业 15%/可识别性 10% 排序）；3) Stage 3 Warm Path Discovery（找最短介绍链，路径类型：直接互关→投资→前同事校友→活动重叠→内容互动）；4) Stage 4 Enrichment（全名/职位/公司规模/融资/近 30 天 X 帖/共同兴趣/近期事件）；5) Stage 5 Outreach Draft（渠道选 email>LinkedIn>X，跑 brand-voice，产草稿不自动发）；内含子 agent
- **依赖**：Exa MCP（web_search_exa）、X API（X_BEARER_TOKEN + OAuth 1.0a 四件套）、LinkedIn（API 或 browser control）、Apollo/Clay（可选）、GitHub MCP、Apple Mail；agents/: signal-scorer、mutual-mapper、enrichment-agent、outreach-drafter；关联 brand-voice、connections-optimizer、social-graph-ranker
- **说明**：不从通用销售文案起草；不自动发送；email 默认 Apple Mail 草稿；渠道选 1 主 + 强理由才多渠道；反模式：通用模板/多重要求/假熟

### mailtrap-email-integration
- **执行步骤**：正文以概念+反模式+最佳实践清单给出，含：① 核心概念（Sandbox vs Production 分离：沙箱截获不送达、生产需已验证域名；Bearer token 鉴权 per project；生产需 SPF/DKIM/DMARC DNS 验证）；② Code Examples（生产 fetch send.api.mailtrap.io；非生产路由 sandbox.api.mailtrap.io）；③ Anti-Patterns（dev 用生产端点、token 硬编码、未验域即发、无重试/错误处理）；④ Best Practices（沙箱与生产 token 分环境变量、上线前验 DNS、记失败上下文、视邮件为可失败网络调用 try/catch）
- **依赖**：Mailtrap Email API（Bearer token）、MAILTRAP_API_TOKEN、MAILTRAP_INBOX_ID；关联 api-and-interface-design、security-and-hardening、ci-cd-and-automation
- **说明**：自包含代码示例为主，无多步 agent 流程；强调环境隔离与域名验证

### messages-ops
- **执行步骤**：1) 先确定确切线程（消息 surface、发件人/收件人/服务、时间窗、任务是检索/检视/准备回复）；2) 起草前先读（读最近入站、识别开放环路、必要时交给外联 skill）；3) 验证码作为聚焦检索任务（先搜最近本地消息窗口、按服务/发件人收窄、找到即停或穷尽即停）；4) 报告确切证据（用过的源、线程/发件人、时间窗、状态：read/code-found/blocked/awaiting reply draft）
- **依赖**：email-ops、connections-optimizer、lead-intelligence、knowledge-ops；本地消息 surface、X/社交 DM、browser-gated 消息面
- **说明**：不混淆邮箱与 DM/短信；不点名源不得声称已查；auth/MFA 受阻时报告确切阻塞点，不盲目重试

### opensource-pipeline
- **执行步骤**：正文以命令协议给出，含：① /opensource fork PROJECT：1) Gather Parameters（路径、license、GitHub org、repo name、description）；2) 建 staging 目录；3) 跑 opensource-forker agent（复制文件+剥密+占位+.env.example+清 git 史+FORK_REPORT.md）；4) 跑 opensource-sanitizer agent（6 类扫描：secrets/PII/内部引用/危险文件 CRITICAL + 配置完整性 WARNING + git 史审计，出 SANITIZATION_REPORT.md，FAIL 可修最多重试 3 次）；5) 跑 opensource-packager agent（生 CLAUDE.md/setup.sh/README/LICENSE/CONTRIBUTING/.github 模板）；6) Final Review；7) 用户批准后 gh repo create --public 推送；② /opensource verify；③ /opensource package；④ list；⑤ status
- **依赖**：agents: opensource-forker、opensource-sanitizer、opensource-packager；gh CLI（gh repo create）；staging 目录 $HOME/opensource-staging/；关联 security-review
- **说明**：反模式：未经用户批准不推 GitHub、不跳 sanitizer（它是安全门）、FAIL 不修不继续、不残留 .env/\*.pem/credentials.json

### project-flow-ops
- **执行步骤**：1) 先读公共面（GitHub issue/PR 状态、作者、分支、评审评论、CI、关联 issue）；2) 分类工作（Merge/Port-Rebuild/Close/Park）；3) 决定是否需 Linear（仅当 active/delegated/scheduled/cross-functional/够重要）；4) 保持两端一致（活跃时 GitHub 说公开进展、Linear 跟内部 owner/优先级/执行道；shipped 或 rejected 时回写 GitHub 并标 Linear）
- **依赖**：GitHub、Linear；关联 github-ops
- **说明**：运营模型：GitHub=公共真相、Linear=内部执行真相；不机械镜像一切；评审规则：不靠标题合并、外部特性视价值 rebuild、CI 红必分类修或阻塞

### social-publisher
- **执行步骤**：正文以核心工作流清单给出：① Setup（export SC_API_KEY、验证、npm i -g socialclaw）；② 1) List connected accounts（socialclaw accounts list/connect）；2) Upload media（socialclaw assets upload）；3) Build schedule.json（provider/account_id/text/scheduled_at）；4) Validate（socialclaw validate -f schedule.json）；5) Publish（socialclaw apply -f schedule.json，得 run_id）；6) Monitor（socialclaw status/posts list）；支持 13 provider（x/linkedin/linkedin_page/instagram_business/instagram/facebook/tiktok/youtube/reddit/wordpress/discord/telegram/pinterest）
- **依赖**：SocialClaw（SC_API_KEY workspace-scoped、socialclaw CLI）；可选 TweetClaw（OpenClaw 插件 @xquik/tweetclaw@1.6.31 作 X 证据源）；关联 x-api、social-graph-ranker
- **说明**：仅外联 getsocialclaw.com；OAuth 在 SocialClaw dashboard，不暴露给 agent；TweetClaw 仅作研究输入，凭证放其插件配置，非默认依赖

### terminal-ops
- **执行步骤**：1) 先确定工作面（确切 repo 路径、分支、本地 diff 状态、模式：inspect/fix/verify/push）；2) 先读失败面（错误、文件或测试、git 状态、用已给日志）；3) 保持修复窄（一次解决一个主导失败、先用最小证明命令、相同签名反复失败则停宽重试并收窄）；4) 用确切状态词报告（inspected/changed locally/verified locally/committed/pushed/blocked）
- **依赖**：verification-loop、tdd-workflow、security-review、github-ops、knowledge-ops；仓库本地脚本与 helpers
- **说明**：检查后再改；用户只要审计则保持只读；不声称已修除非重跑过证明命令；不用破坏性 git；区分本地 vs 上游

### uncloud
- **执行步骤**：正文以 CLI 速查 + 扩展配置清单给出，含：① Core Concepts（无中心控制面、WireGuard mesh、Caddy 全局自动 TLS、overlay 10.210.0.0/16、Caddyfile 自动生成勿手改）；② CLI 速查（Machines/Services/Images/Volumes/Caddy/DNS/Context 各命令）；③ Port Publishing（HTTP/HTTPS 经 Caddy：`[hostname:]port/protocol`；TCP/UDP 经 host：`host_port:container_port/protocol@host`）；④ Compose 扩展（x-ports 带域名、x-caddy 自定义片段含模板函数 {{upstreams}}/{{.Name}}/{{.Upstreams}}、x-machines 放置约束）；⑤ 路由外部设备（写 caddyfile 片段 + pause 容器注册）；⑥ Service DNS；⑦ Scaling & Global；⑧ Image Tag 模板（{{gitsha}}/{{gitdate}}/{{date}}）；⑨ Common Workflows & Mistakes
- **依赖**：uc CLI（Uncloud）、Docker、Caddy、WireGuard；Let's Encrypt TLS；compose.yaml
- **说明**：零停机部署自动；uc service rm 保留命名卷；Caddyfile 不可手改；HTTPS 自签上游需 tls_insecure_skip_verify；通配 DNS 避免逐服务改记录

### unified-notifications-ops
- **执行步骤**：1) 盘点当前面（事件源、当前渠道、现有发告警的 hooks/scripts、同事件重复路径、沉默失败缺口，标出 ECC 已拥有的）；2) 决定什么值得打断（按事件族答：谁需要知道、多快、打断/批/仅日志）；3) 加渠道前去重（找同 PR 事件在 GitHub+Linear+本地日志重复、hook 重复、应摘要而非转发的 churn）；4) 设计 ECC 原生工作流（每个真实通知需求定 source/gate/shape/channel/action，优先 ECC 已有原语：skill/hook/agent/MCP）；5) 返回行动导向设计（keep/suppress/merge/wrap next）
- **依赖**：GitHub、Linear、本地 hook、桌面通知原语、已连邮件/聊天；关联 workspace-surface-audit、project-flow-ops、github-ops、knowledge-ops、customer-billing-ops
- **说明**：不可商量规则：不暴露 token/密钥/webhook secret；分离事件源/严重度/路由渠道/运营动作；不确定打断成本时默认 digest；不 fan-out 每事件到每渠道；根因是分诊/hook/项目流时直说而非掩盖

### x-api
- **执行步骤**：正文以操作清单 + 集成流程给出，含：① Authentication（OAuth 2.0 Bearer Token 仅 app 读；OAuth 1.0a 用户上下文用于发推/管账户/DM，env：X_CONSUMER_KEY/SECRET、X_ACCESS_TOKEN/SECRET）；② Core Operations（Post Tweet、Post Thread 串发、Read User Timeline、Search Tweets、Pull Recent Original Posts for Voice、Get User by Username、Upload Media and Post 两步）；③ Rate Limits（查文档、读 x-rate-limit-remaining/reset 头、运行时退避）；④ Error Handling（201 成功、429 限流、403 禁止）；⑤ Security；⑥ Integration with Content Engine（1 拉 voice 样本；2 建 VOICE PROFILE；3 content-engine 生 X 原生内容；4 校验长度/线程结构；5 草稿待批；6 批准后发；7 public_metrics 跟踪）
- **依赖**：X API（Bearer Token + OAuth 1.0a：X_CONSUMER_KEY、X_CONSUMER_SECRET、X_ACCESS_TOKEN、X_ACCESS_TOKEN_SECRET）；requests/requests_oauthlib；关联 brand-voice、content-engine、crosspost、connections-optimizer
- **说明**：标注"drift-prone"：X 端点/访问层/配额/写权限频繁变动，引用前查最新文档；token 永不硬编码；只读场景用只读 token；轮换用 developer.x.com

## 十二、网络·Homelab（11 个）

家庭/实验网络规划（VLAN/DNS/WireGuard/Pi-hole）、路由器交换机配置与诊断（BGP/接口健康/配置校验）、Cisco IOS 与 Netmiko SSH 自动化、Flox 可复现环境。

### cisco-ios-patterns
- **执行步骤**：1) 用只读命令采集当前状态；2) 评审候选配置；3) 确认管理通道不会被锁死；4) 在维护窗口最小化应用变更；5) 重新读取状态与基线对比，验证通过后再保存
- **依赖**：network-config-reviewer（agent）、network-troubleshooter（agent）、network-config-validation（skill）、network-interface-health（skill）、SSH/控制台/OOB
- **说明**：元数据 origin: community；偏 review/安全模式；正文以清单+模式集给出，含：①只读命令清单（show version/interfaces/route 等）；②ACL placement 检查项；③接口卫生模板；④变更前后验证命令；⑤反模式列表；强调先只读采集，禁用 ACL/认证做排障

### flox-environments
- **执行步骤**：正文以模式集给出，含：①flox init/search/show/install/list/activate 命令；②manifest.toml 结构（install/vars/hook/profile/options）；③版本固定与平台特定包；④Python/Node/Rust/Go/C++ 配方；⑤Hook 与 Profile 写法；⑥共享（git/FloxHub/include）
- **依赖**：Flox CLI（flox.dev/docs 安装）、git、FloxHub（远程环境）；关联 skill：flox-services、flox-builds、flox-containers、flox-sharing、flox-cuda
- **说明**：元数据 origin: Flox；环境定义在 .flox/env/manifest.toml；$FLOX_ENV/$FLOX_ENV_CACHE/$FLOX_ENV_PROJECT 关键变量；反模式：绝对路径、hook 内 exit、manifest 存密钥、无幂等守卫的慢 hook；AI/vibe-coding 友好（无 sudo、可逆、项目作用域）

### homelab-network-readiness
- **执行步骤**：正文以清单/计划给出，含：①必采清单（Internet edge/gateway/switching/Wi-Fi/addressing/DNS-DHCP/management/recovery）；②VLAN 与信任区规划表；③DNS 过滤就绪 6 步；④远程访问就绪表与端口转发前提；⑤变更序列 8 步：1)快照当前拓扑/IP/DHCP/DNS/防火墙；2)预留基础设施地址；3)创建新区/VLAN 但不迁关键设备；4)迁一个测试客户端验证；5)加窄防火墙例外；6)迁低风险设备组；7)加最窄 VPN 策略；8)文档化最终状态与回滚
- **依赖**：homelab-network-setup（skill）、network-config-validation（skill）、network-interface-health（skill）；要求带外/同室控制台访问
- **说明**：元数据 origin: community；规划/评审类（非粘贴即用配置）；需先确认平台、当前拓扑、回滚路径、控制台、维护窗口；安全规则：只读优先、不暴露管理面板到公网、IoT/guest/camera/lab 视为不同信任区

### homelab-network-setup
- **执行步骤**：正文以计划给出，含：①设备角色分层（Internet→Modem/ONT→Gateway→Managed switch→AP→Servers/Clients）；②网关选型表（ISP/UniFi/OPNsense/pfSense/MikroTik/Linux）；③IP 规划（避开 192.168.1.0/24，示例 10/20/30/40/99 多 /24，home.arpa 本地域）；④DHCP 与 DNS 实践；⑤布线与 Wi-Fi；⑥示例：新手升级 4 步与 VLAN-Ready 4 步
- **依赖**：network-interface-health（skill）、network-config-validation（skill）；建议设备：支持 VLAN 的网关/交换机、PoE 交换机、UPS
- **说明**：元数据 origin: community；规划/搭建类；约定网关 .1、基础设施预留 .2-.49、DHCP 池 .50-.240、备用 .241-.254；反模式：双 NAT、用 192.168.1.0/24（与 VPN 冲突）、NAS/Pi-hole/Home Assistant 动态地址、消费路由器做 AP 仍开 DHCP

### homelab-pihole-dns
- **执行步骤**：正文以步骤给出，含：①Docker compose 部署（推荐，固定 release tag，密码走 .env 600 权限）；②裸金属安装（先静态 IP→curl 安装脚本审阅→bash 运行→交互式 5 步）；③三方式指向 Pi-hole（路由器 DHCP DNS 推荐/逐设备/作 DHCP 服务器）；④屏蔽列表管理（StevenBlack 默认+malware+tracking，Update Gravity，白名单，Query Log）；⑤DoH（cloudflared 5053 + systemd）；⑥本地 DNS 记录与 CNAME；⑦故障排查（pihole -q/-w/status/restartdns/-g 等）
- **依赖**：pihole CLI、Docker、cloudflared、树莓派 OS/Debian/Ubuntu；关联 skill：homelab-network-setup、homelab-vlan-segmentation、homelab-wireguard-vpn
- **说明**：元数据 origin: community；规划/搭建类；推荐本地后缀用 home.arpa（RFC 8375），避免 .local（与 mDNS 冲突）；反模式：单点无回退、无静态 IP、双 DHCP 服务器、从不更新 gravity；PIHOLE_WEBPASSWORD 须走 .env

### homelab-vlan-segmentation
- **执行步骤**：正文以平台配方给出，含：①VLAN 设计模板（10/20/30/40/99 五区）；②典型场景（端口行为+防火墙规则：IoT↔Trusted BLOCK、IoT→Servers 仅放 Pi-hole:53、Guest 仅上网）；③UniFi 配置（Networks/WiFi/Traffic Rules）；④pfSense/OPNsense（VLANs→Assignments→DHCP→规则自上而下首匹配，Pi-hole DNS 规则须先于 RFC1918 阻断）；⑤MikroTik 7 步（bridge vlan-filtering→bridge port→bridge vlan→vlan 接口→IP→DHCP pool/server/network→firewall filter）；⑥trunk vs access 端口说明
- **依赖**：UniFi/pfSense/OPNsense/MikroTik 设备、Pi-hole（关联）；关联 skill：homelab-network-setup、homelab-pihole-dns、homelab-wireguard-vpn
- **说明**：元数据 origin: community；规划/搭建类；强调"所有防火墙规则只增隔离、不撤现有保护"，维护窗口逐步验证；反模式：建 VLAN 不加防火墙、Pi-hole 放 IoT VLAN、native VLAN=management、IoT 与 trusted 同密码；建议 native VLAN 用未用 ID（如 999）防 VLAN hopping

### homelab-wireguard-vpn
- **执行步骤**：正文以步骤+配方给出，含：①Linux 服务端（apt 装 wireguard→umask 077 生成 server 密钥→wg0.conf：Address 10.8.0.1/24、ListenPort 51820、scoped iptables PostUp/PostDown→chmod 600→开 ip_forward→wg-quick up + systemctl enable）；②客户端配置（每端独立 keypair、PersistentKeepalive 25）；③split vs full tunnel（含多子网 split）；④Python 批量 keypair/配置生成；⑤pfSense/OPNsense 配置；⑥DDNS（Cloudflare 凭据走 env 文件/DuckDNS+cron）；⑦故障排查（wg show/ufw status/查 ip_forward/AllowedIPs）
- **依赖**：wg/wireguard、wg-quick、iptables、sysctl、systemctl、cloudflared（DoH 可选）、Docker（DDNS 可选）、pfSense/OPNsense；关联 skill：homelab-network-setup、homelab-vlan-segmentation、homelab-pihole-dns
- **说明**：元数据 origin: community；规划/搭建类；密钥不得入版本库、须 mode 600；反模式：私钥入 git、移动端盲目 0.0.0.0/0、不设 PersistentKeepalive、开 51820 却忘开 ip_forward、共享 keypair、宽泛 FORWARD ACCEPT；iptables 规则限定 wg0 接口与方向

### netmiko-ssh-automation
- **执行步骤**：正文以模式集给出，含：①安全默认（默认只读、小而显式的 inventory、凭据走环境变量/getpass、设超时、限并发、send_config_set 须显式标志、不自动 save_config）；②只读连接模式（ConnectHandler+异常分级 NetmikoAuthenticationException/Timeout/ReadTimeout）；③批量采集（ThreadPoolExecutor max_workers 低）；④结构化解析（use_textfsm=True、raise_parsing_error=False，保留原始输出）；⑤受守卫配置模式（APPLY_NETWORK_CHANGES=1 才下发，下发前后各取 show 留证，save_config 独立审批）；⑥评审清单
- **依赖**：Python、Netmiko、TextFSM/TTP/Genie（可选）、SSH；关联 skill：cisco-ios-patterns、network-config-validation、network-interface-health
- **说明**：元数据 origin: community；偏 review/安全模式；示例用文档保留地址段（192.0.2.x）；反模式：硬编码口令/enable secret/私钥、把 send_config_set 当默认路径、扫 CIDR 而非已审 inventory、把解析成功当作设备状态正确

### network-bgp-diagnostics
- **执行步骤**：正文以流程+清单给出，含：①只读分诊 5 步：1)定位邻居/地址族/VRF/本地与远端 ASN；2)采 summary 与 last reset 原因；3)证明到 peer 源地址可达；4)查路由策略引用；5)对比 advertised/received/installed 路由；②状态解读表（Established 有/0 前缀、Active、Connect、OpenSent/OpenConfirm、Idle 各自首查项）；③传输检查（ping/traceroute 带 source、update-source）；④路由策略检查；⑤AS path 与前缀复查（正则 `_65001_` 而非 65001）；⑥Python 解析器；⑦仅变更窗口动作清单（清会话/改认证改 timer/启 received-routes/放宽 ACL）
- **依赖**：cisco-ios-patterns（skill）、network-config-validation（skill）、network-interface-health（skill）；SSH、show 命令；不依赖外部 agent（仅引用 skill）
- **说明**：元数据 origin: community；diagnostics-only（只读诊断），重置/策略变更属变更窗口需审批；反模式：默认 Active=远端宕、忽略 VRF/AFI/update-source、宽泛 AS 正则、未读 reset 原因就 hard-reset、把缺 received-routes 当作没收到

### network-config-validation
- **执行步骤**：正文以分层校验流程给出，含：①分层顺序 5 步：1)破坏性命令；2)凭据与管理面暴露；3)重复地址与子网重叠；4)过期引用；5)运行卫生（NTP/时间戳/远程日志/banner）；②Python 危险命令检测（reload/erase/format/no router/interface/aaa new-model/crypto key）；③重复 IP 与子网重叠（ipaddress 标准库+Counter）；④管理面检查（按 line vty 分块，禁 Telnet/查 access-class/exec-timeout）；⑤安全卫生检查（SNMP 公共串/SSH v1/enable password/username password）与最佳实践缺失告警（NTP/timestamps/logging/SNMPv3 priv/banner）
- **依赖**：Python、ipaddress 标准库；可作 Netmiko/NAPALM/Ansible/厂商 API 自动化的前置门控；network-config-reviewer（agent）、network-troubleshooter（agent）、network-interface-health（skill）
- **说明**：元数据 origin: community；明确为 pre-flight 警示而非完整解析器，最终仍需工程师审意图/语法/回滚；反模式：把 regex 当设备解析器、不带 dry-run diff 就下发、推荐 SNMPv2、VTY 块跨节误匹配、靠禁 ACL 测防火墙

### network-interface-health
- **执行步骤**：正文以流程给出，含：①原理：计数器是证据但趋势更重要，取基线→等间隔→再取→比增量；②采集命令（show interfaces/status/logging；Linux：ip -s link/ethtool/ethtool -S）；③计数器参考表（CRC/input errors/runts/giants/input drops/output drops/resets/collisions 含常见原因）；④诊断流：CRC/输入错误 5 步（确认计数在涨→查两端→换线/光模块清灰→确认 speed/duplex 双边匹配→查日志 flap）；丢包 4 步（区分 input/output、对容量、查 QoS/队列/超分、先证拥塞再谈队列调优）；双工速率（首选双边 auto，固定须双边显式并记录）；⑤Python 安全解析器（按 header 切块，禁字符窗口）；⑥示例（单端口 CRC 排查 5 步、慢但 LAN 正常 4 步）
- **依赖**：network-troubleshooter（agent）、network-config-validation（skill）、homelab-network-setup（skill）；show interfaces、ethtool、ip -s link
- **说明**：元数据 origin: community；diagnostics-only（只读诊断）；强调查链路两端、保留基线再清零；反模式：未存基线就清零、只看一端、把历史 CRC 当现行问题、一端 auto 一端固定、未查拥塞就把 output drops 当线材问题

## 十三、前端体验·设计系统·Apple 平台（23 个）

可访问性、设计系统与方向、动效（motion 系列）、UI 质感、iOS 26 Liquid Glass、Apple FoundationModels 与 Swift 并发、图标/截图/演示生成、Vue 转换——前端/移动端的视觉、交互与平台能力。

### accessibility
- **执行步骤**：1) 识别组件功能角色（button/link/tab），优先用语义化原生元素；2) 定义可感知属性：对比度 4.5:1（普通文字）/3:1（大字），非文本提供替代，支持 400% 缩放重排；3) 实现可操作控件：≥24x24 CSS px 目标尺寸（SC 2.5.8），键盘可达且焦点可见（SC 2.4.11），拖拽提供单指替代；4) 确保逻辑可理解：导航一致、错误描述带修正建议（SC 3.3.3）、冗余输入（SC 3.3.7）；5) 验证健壮兼容：Name/Role/Value 模式、aria-live 动态更新
- **依赖**：自包含（附跨平台映射表：Web HTML/ARIA、iOS SwiftUI、Android Compose）
- **说明**：ECC 自有；关联 frontend-patterns、design-system、liquid-glass-design、swiftui-patterns；含 Best Practices Checklist 与反模式（div-button、纯颜色传达、模态焦点未囚禁、冗余 alt）

### blender-motion-state-inspection
- **执行步骤**：1) 盘点场景（mesh/armature/empty/camera/light/modifier/父子/隐藏物，区分角色与辅助几何，记录对象空间与世界包围盒）；2) 识别骨架（armature 名、pose bone、head/tail/roll、父链、约束、语义骨映射、缺失左右对）；3) 确定前/上/侧轴（用骨盆/脊柱/肩/髋/头/足综合判断，比较局部与世界轴及 glTF Y-up vs Blender Z-up）；4) 采样动画帧（首/中/接触/腾空/极端，记录根位置、朝向、骨盆高度、躯干倾角、足部离地、网格边界）；5) 在怪罪重定向前先核对模型完整性（保留原始 mesh/material/armature/skinning）；6) 诊断接触与动作问题（地面穿透、滑步、腿交叉、扭转损伤、缩放漂移）；7) 先报告事实后给观点（帧号、对象/骨骼名、世界坐标、阈值）
- **依赖**：Blender（需在 Blender 自身解释器中运行 bpy，例如 `blender --background scene.blend --python collect_motion_state.py`）；可选 JSON state exporter
- **说明**：frontmatter 声明 tools: Read/Write/Edit/Bash/Grep/Glob；含 Recommended Report Shape、实用阈值（穿透 >1-2cm、缩放突变 >5%、根朝向跳变 >30°/帧）、反模式（不要改身体比例强行匹配姿态、不要单机位角作证）

### dashboard-builder
- **执行步骤**：1) 定义运维问题（按 health/availability、latency/performance、throughput/volume、saturation/resources、service-specific risk 组织）；2) 研究目标平台 schema（既有仪表盘的 JSON/查询语言/变量/阈值样式/分区）；3) 构建最小有用面板（overview→performance→resources→service-specific）；4) 砍掉虚荣面板（每块面板必须回答真实问题）
- **依赖**：自包含（示例覆盖 Elasticsearch/Kafka/API gateway）
- **说明**：ECC direct-port 改编；关联 research-ops、backend-patterns、terminal-ops；含 Quality Checklist 与 guardrails（不从视觉布局起步、不堆砌全部指标）

### design-system
- **执行步骤**：三模式：模式 1 生成设计系统：1) 扫描 CSS/Tailwind/styled-components 既有模式；2) 抽取 colors/typography/spacing/border-radius/shadows/breakpoints；3) 经 browser MCP 研究 3 个竞品站；4) 提出设计 token 集（JSON + CSS 自定义属性）；5) 生成 DESIGN.md 含每条决策理由；6) 创建自包含交互式 HTML 预览页（输出 DESIGN.md + design-tokens.json + design-preview.html）。模式 2 视觉审计：按 10 维（色彩一致性/字体层级/间距节奏/组件一致性/响应式/暗色模式/动画/可访问性/信息密度/打磨度）各打 0-10 分并给文件:行号修复。模式 3 AI Slop 检测：识别通用 AI 生成模式（无意义渐变、紫到蓝默认、玻璃拟态卡片、不该圆角却圆角、滚动动画、通用 hero、无个性字体）
- **依赖**：browser MCP（用于竞品研究）
- **说明**：ECC 自有；提供 `/design-system generate|audit|slop-check` 命令示例

### foundation-models-on-device
- **执行步骤**：正文以核心模式集给出，含：①可用性检查（SystemLanguageModel.default.availability 枚举全分支处理）；②基础会话（单轮 LanguageModelSession.respond、多轮复用 session+instructions）；③@Generable 引导生成（定义 @Generable 类型 + @Guide 约束 .range/.count/description，respond 时 generating: Type.self，访问 response.content 字段）；④工具调用（实现 Tool 协议 name/description/Arguments/call → LanguageModelSession(tools:) → 处理 ToolCallError）；⑤快照流式（session.streamResponse generating: 生成 PartiallyGenerated 类型，for try await 迭代；SwiftUI .task 集成）
- **依赖**：Apple FoundationModels 框架（iOS 26+）、Xcode Instruments
- **说明**：关键约束：端侧执行保隐私/离线；4096 token 上下文窗口（instructions+prompt+output 合计）；快照而非 delta；用 response.content 而非 .output；单 session 单请求（isResponding 守卫）；GenerationOptions(temperature:) 调创意

### frontend-a11y
- **执行步骤**：正文以模式集给出，含：①表单无障碍（htmlFor/id 配对、必填 aria-required + 视觉星号 aria-hidden、错误用 aria-describedby + role="alert" 关联）；②语义化 HTML（用 button 而非 div onClick、a 而非 div 导航、标题层级不跳级）；③ARIA 属性（aria-label vs aria-labelledby、aria-describedby 补充描述、aria-live=polite/assertive 动态通知、aria-expanded + aria-controls 折叠面板）；④键盘导航（自定义 Dropdown 的 ArrowDown/ArrowUp/Enter/Space/Escape 处理）；⑤焦点管理（Modal 打开时聚焦+关闭时还原前焦点，完整焦点陷阱用 focus-trap-react）；⑥图像图标（装饰图 alt="" + aria-hidden、含义图 alt 描述、图标按钮 aria-label）；⑦减弱动画（useReducedMotion 监听 prefers-reduced-motion）
- **依赖**：focus-trap-react（可选，完整焦点陷阱）
- **说明**：社区来源；关联 frontend-patterns、design-system、motion-ui；含完整 LoginForm 示例与 Anti-Patterns（占位符当 label、正 tabIndex、focusable 上 aria-hidden 等）

### frontend-design-direction
- **执行步骤**：1) 选定设计方向前先定：Purpose（界面做什么）、Audience（谁在反复用，先扫什么）、Tone（utilitarian/editorial/playful/industrial/refined/technical/maximal/minimal/dense/calm 等）、Memorable detail（一个让结果显用心的设计点）、Constraints（框架/无障碍/性能/响应式/既有设计系统）；2) 实施指导：先建可用首屏而非营销文案；优先复用既有组件/token/图标库/路由；用真实或生成视觉资产；偏好上下文化排版间距而非通用巨型 hero；保持调色板多维度（避免单色族垄断）；用 CSS 变量或既有 token 保持一致；显式设计响应式约束；克制但有目的地用动效；验证移动端与桌面端文本适配
- **依赖**：自包含
- **说明**：社区来源（ salvaged 自 linus707 的 stale PR #1659）；ECC 故意不复打包官方 Anthropic frontend-design，需用时从 anthropics/skills 安装；含 Anti-Patterns（紫渐变、装饰 blob、超大卡片、卡片套卡片、把主产品藏在营销段后等）与 Review Checklist

### inherit-legacy-style
- **执行步骤**：0) 自动检测模式（项目根有无 .ai-style-rules.md）；分支 A 首次全量扫描：1) 量规模选扫描档（≲50 全读 / 50-500 基建层全读+业务层抽样 / ≳500 严格抽样+预算上限）；2) 沿 4 维扫描（File Anatomy 文件解剖、State & Control Flow 状态与控制流、Infrastructure 基建位置、Error Handling 错误处理）；3) 信号阈值降噪（弱信号<5% 且<10 自动压制，强信号近均分则拷问，小项目≲50 时"3 对 2"不算多数需拷问）；4) 一次拷问一个冲突（4 选项：跟随 X/跟随 Y/这是演进更新规则/我有新规则）；5) 生成 .ai-style-rules.md（[Golden Files]/[Naming & State-Control Rules]/[DONTs] 三段）；6) 安装持久 hook（AskUserQuestion 选 soft/hard/no）；分支 B 增量嗅探：读既有规则→git diff delta→对比新代码→冲突走拷问→追加 Evolution Log（绝不覆盖旧规则）；Per-Turn Enforcement：每个写码任务开头声明遵循的 exemplar 与规避的 DONTs
- **依赖**：Git（推荐；非 Git 用文件时间戳兜底）、AskUserQuestion（询问 hook 强度）
- **说明**：社区来源；allowed-tools: Read/Glob/Grep/Bash/Edit/Write/AskUserQuestion；关联 init、code-review、simplify；含 Anti-Patterns（跳过规模测量、堆叠多个冲突问题、增量覆盖旧规则、默认硬 hook、评判语法栈好坏、复制 exemplar 里的 bug）

### ios-icon-gen
- **执行步骤**：1) 评估需求（图标代表什么、风格、颜色、尺寸；若有既有图标用 `sips -g pixelWidth -g pixelHeight` 查尺寸）；2) 搜索图标（Iconify：`iconify_gen.sh search "关键词" [--prefix mdi]` 或 `collections`；SF Symbols：浏览 SF Symbols app 或查常见名表）；3) 预览（可选，`iconify_gen.sh preview mdi:xxx`）；4) 生成（Iconify：`iconify_gen.sh mdi:xxx 名称 --color 007AFF --output ./Assets.xcassets/icons`，选项 --size/--color/--output；SF Symbols：`swift generate_icons.swift 符号名 名称 --color --weight --output`）；5) 验证并集成（读 @2x PNG 目视核对，复制到 asset catalog，构建项目验证）
- **依赖**：Iconify API（互联网，`iconify_gen.sh`）、SF Symbols（仅 macOS，`generate_icons.swift`）、sips（查既有图标尺寸）
- **说明**：社区来源；默认 1x=68px/2x=136px/3x=204px；含 8 个常用 Iconify 集合表（mdi/ph/solar/tabler/lucide/ri/carbon/heroicons）；反模式（不查既有风格就生成、用默认色、错误尺寸、未目视核对就提交）

### liquid-glass-design
- **执行步骤**：正文以核心模式集给出，含：①SwiftUI（`.glassEffect()` 基础 + `.regular.tint(.color).interactive()` in .rect/.capsule；`.buttonStyle(.glass)`/`.glassProminent`；GlassEffectContainer(spacing:) 包多元素并控融合距离；glassEffectUnion 合并多玻璃为单一形状；@Namespace + glassEffectID 实现 morphing 过渡；横向滚动延伸到侧栏下）；②UIKit（UIGlassEffect.tintColor/.isInteractive + UIVisualEffectView + cornerRadius/clipsToBounds；UIGlassContainerEffect.spacing；scrollView.top/bottom/left/rightEdgeEffect；UIBarButtonItem.hidesSharedBackground 退出共享背景）；③WidgetKit（widgetRenderingMode == .accented 分支；widgetAccentable() 划分 accent group；widgetAccentedRenderingMode(.monochrome)；containerBackground(for: .widget)）
- **依赖**：Apple iOS 26 Liquid Glass API（SwiftUI/UIKit/WidgetKit）
- **说明**：关键决策：GlassEffectContainer 包裹提升性能并启用 morphing；spacing 控融合距离；interactive() 显式开启触控/指针反应；@Namespace + glassEffectID 启用平滑 morphing；测试覆盖亮/暗/着色模式并保证文字对比度

### make-interfaces-feel-better
- **执行步骤**：正文以原则集给出，含：①Concentric Radius（外圆角=内圆角+padding，padding 大时按独立表面处理）；②Optical Alignment（图标按钮/三角/箭头/星等不对称图标需像素级偏移）；③Shadows And Borders（边框用于分隔与焦点环、层叠阴影用于深度、透明且微妙）；④Text Wrapping（标题 text-wrap: balance、短中正文用 pretty、长文代码禁用、动态数字用 font-variant-numeric: tabular-nums）；⑤Font Smoothing（macOS 根布局加 -webkit-font-smoothing: antialiased）；⑥Image Outlines（img 加 1px rgba 黑/白 alpha inset outline，禁用品牌色调）；⑦Motion（CSS transition 用于可重定向交互态、keyframe 用于一次性入场/加载；入场含 opacity+translateY+可选 blur；出场更短更安静约 150ms；按下 scale(0.96)；图标切换交叉淡入）；⑧Transition Scope（禁 transition: all 与 will-change: all）；⑨Hit Areas（≥40x40px，理想 44x44px，伪元素扩展但不可重叠）；评审输出用 before/after 行表
- **依赖**：自包含
- **说明**：社区来源（salvaged 自 linus707 的 stale PR #1659）；含 Review Checklist（嵌套圆角光学一致、图标视觉居中、动态数字 tabular、入场出场分开且可打断、按钮有触觉按下态、命中区可用等）

### motion-advanced
- **执行步骤**：正文以规则集+代码示例集给出，含 8 条强制规则：①拖拽必须在触屏测试（不仅鼠标）；②无限动画需在 document.visibilityState === "hidden" 时暂停；③滑动手势阈值必须显式（offset + velocity 合判）；④useAnimate 的 scope ref 必须挂载到 DOM 元素；⑤MotionValue 不可在 render 里 new（用 useMotionValue）；⑥所有 token 必须来自 motion-foundations；⑦自定义 hook 必须 cleanup（addEventListener 配对 removeEventListener）；⑧SVG morph 需相等 path 命令数。配套示例：draggable card、drag-to-dismiss sheet、Reorder.Group、swipe/long-press hook、word-by-word reveal、number counter、SVG path draw-on、stroke progress ring、useScrollReveal、cursor follower、shimmer skeleton、loading button、visibility-pause pulse
- **依赖**：motion/react（即 motion 包）、motion-foundations（前置，提供 motionTokens/springs/useSafeMotion/SSR guard）
- **说明**：作者 jeff，category: frontend；明确不覆盖 token/spring 定义（见 motion-foundations）、标准 UI 模式（见 motion-patterns）、CSS-only、Canvas/WebGL、dnd-kit 等；含 API 决策表与 8 条反模式对照

### motion-foundations
- **执行步骤**：正文以规则集给出，含 8 条强制规则：①只用 motion/react，禁 framer-motion 混用；②initial 必须匹配服务端输出（无例外）；③减弱动画覆盖一切（useReducedMotion 为真时仅留 ≤0.2s opacity 淡入）；④禁动画 layout 属性（width/height/top/left/margin/padding），只用 transform 与 opacity；⑤所有 token 来自 motionTokens（禁内联数字）；⑥所有 spring 来自 springs 映射（禁内联 stiffness/damping）；⑦import motion/react 的文件必须 "use client"；⑧禁模块级读 window/navigator（用 typeof guard）。配套：motionTokens（duration instant/fast/normal/slow/crawl、easing smooth/sharp/bounce/linear、distance xs-xl、scale subtle/press/pop）、springs（snappy/gentle/bouncy/instant/release）、motionConfig（isLowEnd/prefersReduced/shouldAnimate/duration）、useSafeMotion hook、SSR guard 范式
- **依赖**：motion/react（motion 包）、React/Next.js
- **说明**：作者 jeff，基础层；下游 motion-patterns 与 motion-advanced 消费此处 token/springs/hook，不重复定义；含 Anti-Patterns 对照 8 规则与 duration/spring 选择决策表

### motion-patterns
- **执行步骤**：正文以规则集+模式集给出，含 8 条规则：①条件渲染必须 AnimatePresence 包裹并给直接子元素 key（否则 exit 不触发）；②定义 initial+animate 时必须同时定义 exit；③页面过渡用 mode="wait"（出场完才入场）；④禁在 >5 子节点或深嵌套 DOM 上用 layout（改用显式 x/y transform）；⑤staggerChildren 限 0.05-0.10s；⑥模态必须含焦点陷阱+Escape 关闭+滚动锁+role="dialog"+aria-modal="true"；⑦滚动揭示用 viewport={{ once: true }}；⑧token 必须来自 motion-foundations。配套模式：button 反馈、stagger 列表、modal、toast 栈、Next.js 页面过渡包装器、scroll reveal、scroll progress bar、expanding card、shared-element crossfade（layoutId）、accordion；含 AnimatePresence 契约三要素与 layout/layoutId 选择指南
- **依赖**：motion/react（motion 包）、motion-foundations（前置）、Next.js usePathname（页面过渡）
- **说明**：作者 jeff；不覆盖 token 定义（见 foundations）、拖拽/手势/SVG/文字/自定义 hook（见 advanced）；含 mode=wait/sync/popLayout 决策表与 8 条反模式对照

### motion-ui
- **执行步骤**：正文以清单集给出，含：①核心原则（动画必须引导注意/传达状态/保持空间连续，否则删除）；②安装 `npm install motion`；③版本（motion/react 为现代默认，framer-motion 为遗留，禁混用——混用会破坏内部调度器与 AnimatePresence 上下文）；④Motion Tokens（duration fast/normal/slow、easing smooth/sharp、distance sm/md/lg）；⑤性能规则（安全: transform/opacity；避免: width/height/top/left）；⑥设备适配（isLowEnd 综合 deviceMemory + hardwareConcurrency）；⑦无障碍（useReducedMotion + CSS @media prefers-reduced-motion + Tailwind motion-safe/motion-reduce）；⑧架构模式表（whileHover/whileTap/whileInView/useScroll+useTransform/AnimatePresence/layout/useAnimate 及大容器禁 layout）；⑨AnimatePresence mode（wait/sync/popLayout）必须显式指定；⑩模态要点（焦点陷阱+Escape+滚动锁+ARIA+mode="wait"）含完整 useFocusTrap/useScrollLock/Modal 示例；⑪SSR 安全；⑫调试清单；⑬QA 清单
- **依赖**：motion（或遗留 framer-motion）包、React/Next.js
- **说明**：ECC 自有；含完整 Modal 含焦点陷阱实现与 6+ 反模式（动画 layout 属性、无目的无限动画、staggerChildren >0.1s、忽略 reduced-motion、大容器用 layout、AnimatePresence 不设 mode、纯装饰动效）

### react-performance
- **执行步骤**：正文以 8 级优先级规则集给出：①CRITICAL 消除 Waterfall（async-，cheap 条件前置 await、延后到用再 await、Promise.all 并行、部分依赖早启动晚 await、Suspense 流式、Server Component 组合并行）；②CRITICAL Bundle 体积（bundle-，直接导入而非 barrel、静态可分析路径、动态导入重组件、延迟三方脚本、条件加载、hover 预加载）；③HIGH 服务端（server-，Server Action 像 API 一样鉴权、React.cache 单请求去重、LRU 跨请求缓存、RSC props 避免重复序列化、静态 I/O 提升到模块作用域、禁可变模块状态、最小化传给 Client 的数据、嵌套 fetch 按 item Promise.all、after() 非阻塞）；④MEDIUM-HIGH 客户端取数（client-，SWR/TanStack Query 去重、全局监听去重、passive scroll、localStorage 版本化+最小化）；⑤MEDIUM Re-render（rerender-，不订阅仅 callback 用的状态、memo 包重活、提升默认非原始 props、effect 用原始依赖、订阅派生布尔、render 期间派生、函数式 setState、lazy 初始器、简单原始值别 memo、拆 hook、逻辑进事件处理器、startTransition、useDeferredValue、useRef 暂态、别在组件内定义组件）；⑥MEDIUM Rendering（rendering-，动画包 div 而非 SVG、content-visibility: auto、提升静态 JSX、SVG 降坐标精度、hydration 防闪烁内联 script、窄域 suppressHydrationWarning、<Activity>、三元优于 &&、useTransition loading、react-dom preload/preconnect、defer/async script）；⑦LOW-MEDIUM JS 性能（js-，批量 DOM/CSS、Map 重复查找、循环缓存属性长度、纯函数记忆化、localStorage 缓存读、filter+map 合一、先查 length、early return、RegExp 提到循环外、min/max 用循环、Set/Map 成员判定、toSorted、flatMap、requestIdleCallback）；⑧LOW 高级（advanced-，useEffectEvent 依赖、事件 handler ref、模块单例 init once、useLatest）
- **依赖**：React 18/19 + Next.js、SWR/TanStack Query（可选客户端取数）、@next/bundle-analyzer、React Compiler/Turbopack（自动化）
- **说明**：ECC 自有，改编自 Vercel Labs react-best-practices（MIT, v1.0.0）；关联 react-patterns/react-testing/frontend-patterns/accessibility/nextjs-turbopack 与 rules/react/；agent: react-reviewer、react-build-resolver；命令 /react-review、/react-build、/react-test；附 LCP/INP/CLS/TBT 与各类别映射表

### swift-actor-persistence
- **执行步骤**：1) 定义泛型 `public actor LocalRepository<T: Codable & Identifiable> where T.ID == String`，私有 cache 字典 + fileURL；2) init 同步加载（actor 隔离尚未激活，同步从文件读入 cache）；3) 公共 API：save/delete/find/loadAll（actor 隔离自动序列化）；4) 私有 persistToFile 用 JSONEncoder + Data.write(options: .atomic) 原子写；5) 调用方全部 await；6) 与 @Observable ViewModel 组合（repository 注入，load/add 方法异步调用并刷新 questions）
- **依赖**：Swift 5.5+ actor 模型、Foundation JSONEncoder/JSONEncoder、@Observable（组合 ViewModel）
- **说明**：ECC 自有；关键设计：actor 而非 class+lock、内存缓存+文件持久、同步 init 加载、Dictionary 按 ID O(1) 查找、泛型 Codable & Identifiable、.atomic 原子写；反模式（用 DispatchQueue/NSLock、暴露内部 cache、用 nonisolated 绕过隔离）

### swift-concurrency-6-2
- **执行步骤**：正文以核心模式集给出，含：①核心问题（Swift 6.1 及之前 async 函数会被隐式卸载到后台引发数据竞争；6.2 修复为留在调用 actor）；②Isolated Conformances（MainActor 类型可安全遵循非隔离协议：`extension StickerModel: @MainActor Exportable`，编译器保证仅在主 actor 使用）；③全局与静态变量（用 @MainActor 保护共享可变状态；或启用 MainActor default inference 模式自动推断）；④MainActor Default Inference Mode（opt-in 模式下无需手写 @MainActor 注解，推荐用于 app/script/executable target）；⑤@concurrent 后台执行（标记容器类型 nonisolated、加 @concurrent、加 async、调用处 await——用于真正需要并行性的 CPU 密集工作）；迁移步骤：1) Xcode Build Settings 启用；2) SPM 用 SwiftSettings API；3) 用 swift.org/migration 工具；4) 先开 MainActor 默认；5) profile 后再 @concurrent；6) 充分测试（数据竞争成编译期错误）
- **依赖**：Swift 6.2、Xcode 26、SPM（SwiftSettings API）
- **说明**：关键决策：默认单线程消除数据竞争、async 留调用 actor、isolated conformances 替代 nonisolated 变通、@concurrent 显式 opt-in 后台、MainActor 默认推断减样板、opt-in 渐进迁移；需启用 SE-0466 + SE-0461，否则代码有数据竞争

### swift-protocol-di-testing
- **执行步骤**：1) 定义聚焦小协议（每个协议只处理一个外部关注点，如 FileSystemProviding/FileAccessorProviding/BookmarkStorageProviding，带 Sendable）；2) 创建默认生产实现（struct + init，对接 FileManager.default / Data(contentsOf:) / Data.write(.atomic)）；3) 创建测试用 Mock 实现（final class + @unchecked Sendable，带 files 字典与 readError/writeError 可配置错误）；4) 用默认参数注入依赖（生产代码用默认值，测试注入 mock：`init(fileSystem: = Default..., fileAccessor: = Default...)`）；5) 用 Swift Testing 写测试（`import Testing`、`@Test("...")`、`#expect(throws: ...)`、`#expect(result == ...)`，注入 mock 并配置 files/error）
- **依赖**：Swift Testing 框架（`import Testing`、@Test、#expect）、Swift 并发（actors/Sendable）
- **说明**：ECC 自有；最佳实践：单一职责（不造 god protocol）、Sendable 必备、默认参数让生产代码无感、Mock 设计可配置错误属性、只 mock 外部边界不 mock 内部类型；反模式（造一个大协议覆盖全部外部访问、mock 无外部依赖的内部类型、用 #if DEBUG 替代正规 DI、过度工程化）

### swiftui-patterns
- **执行步骤**：正文以模式集给出，含：①状态管理（属性包装器选择表 @State/@Binding/@Observable+@State/@Observable 无包装/@Bindable/@Environment；@Observable ViewModel 替代 ObservableObject 做属性级追踪；View 用 @State 持有并 init 注入；Environment 注入用 .environment() 替代 @EnvironmentObject）；②视图组合（拆小子视图限制失效；ViewModifier 复用样式如 CardModifier + .cardStyle() 扩展）；③导航（类型安全 NavigationStack + NavigationPath + Router @Observable + Destination Hashable 枚举 + navigationDestination(for:)）；④性能（LazyVStack/LazyHStack 大集合；ForEach 用稳定唯一 id 别用数组索引；body 内禁 I/O/网络/重计算改用 .task{}；少在滚动视图里用 .shadow/.blur/.mask；ExpensiveChartView 实现 Equatable 跳过不必要重渲染）；⑤预览（#Preview 宏 + inline mock 数据）
- **依赖**：SwiftUI、Apple Observation 框架（@Observable）、NavigationStack/NavigationPath
- **说明**：反模式：新代码用 ObservableObject/@Published/@StateObject/@EnvironmentObject（应迁 @Observable）、body/init 里直接做 async（应 .task{}）、子视图里 @State 持有不属于自己的 ViewModel（应从父传入）、用 AnyView 类型擦除（应 @ViewBuilder/Group）；关联 swift-actor-persistence、swift-protocol-di-testing

### taste
- **执行步骤**：正文以美学系统+剪辑语法+管线集给出，含：①Core Thesis（taste 是最后一层但必须最先决定、连贯胜过新奇、按歌剪不按素材剪、选择性生成无情编辑）；②Aesthetic Vocabulary（6 大流派家族 Ethereal-divine/Hyperpop-Y2K-cyber/Dark-occult/Retro-print/Organic-textural/Systemic-data，选一个主家族+至多一个 accent）；③Mood System（调色板：near-black #05060a + bone white #f4f1ea 为底、金/橙 #ffb24d→#ff7a18 为神圣暖色、紫蓝粉 #8a6bff/#4fc3ff/#ff6ad5 为结晶 boom、危险红 #ff2a2a 仅一两次冲击剪辑；一镜一 accent）；④Light & texture；⑤Motion；⑥Editing Grammar（7 条：beat-locked 硬切、hero-on-black macro 插入、bloom/explosion 揭示、单色上 color-pop、speed-ramp 进 drop、caption keyword、PiP 反应——含 do-nots）；⑦Pipeline 8 步（0 TASTE →1 STRUCTURE video-editing →2 GENERATE fal-ai-media →3 CUT video-editing/FFmpeg →4 COMPOSE remotion-video-creation →5 MOTION motion-* →6 AUDIO fal-ai-media →7 POLISH →8 DISTRIBUTE content-engine）；⑧Beat Math（138 BPM 常量）；⑨Beat-Mapped Shot Plan（Intro→Verse→Drop→Bridge→Drop→Outro）；⑩fal.ai Prompt Presets；⑪FFmpeg Recipes（9:16 reframe、beat-cut、concat、裁 UI chrome）；⑫Remotion Composition Skeleton（beat(n) 函数 + Sequence + Bloom）
- **依赖**：video-editing、fal-ai-media、remotion-video-creation、motion-foundations/motion-patterns/motion-advanced/motion-ui、videodb、content-engine、FFmpeg、Remotion、Ableton（音轨本身）
- **说明**：ECC 自有；companion 文件 references/genre-taxonomy.md 持完整 70 流派目录；关联 frontend-design-direction（UI 上同样的"先定方向"纪律）；7 条 Key Principles（先定流派再生成、一镜一 accent、硬切落拍、hero-on-black 是签名、生成 10 留 2、裁掉 chrome、taste 先决后判）

### ui-demo
- **执行步骤**：三阶段流程，禁跳过直接录：①Discover——写脚本前先 `page.evaluate` dump 每页的交互元素（input/select/textarea/button/contenteditable 的 tag/type/name/placeholder/text/role），观察表单字段类型/选项值文本/富文本支持/必填/动态内容/按钮文本/表头映射，输出每页 field map；②Rehearse——用 ensureVisible 包装逐个验证 selector，失败时 dump 可见元素并报错，全过才继续；③Record——录前确认 Discovery 完成+彩排过+headless+1280x720+光标字幕每次导航后重注入；录时遵循 Storytelling Flow（Entry→Context→Action→Variation→Result）、Pacing（登录后 4s/导航后 3s/点击后 2s/步骤间 1.5-2s/末尾 3s/打字 25-40ms 每字符）、Cursor Overlay（注入 SVG 箭头光标随 mousemove）、Mouse Movement（moveAndClick 先移后点不瞬移）、Typing（typeSlowly 逐字 pressSequentially）、Scrolling（smooth scroll）、Dashboard Panning（panElements 遍历关键元素）、Subtitles（injectSubtitleBar + showSubtitle "Step N - Action"）
- **依赖**：Playwright（chromium、recordVideo）、Node.js
- **说明**：ECC 自有；提供完整脚本模板（含 REHEARSAL 模式 `--rehearse`）与 12 条 Common Pitfalls（导航后光标消失、视频太快、光标变圆点、瞬移、select 选错、模态太突兀、文件路径随机、selector 失败被吞、字段类型臆断、功能臆断、占位符值像真的、弹窗产生独立视频）

### ui-to-vue
- **执行步骤**：1) 准备输入目录（按模块与页面状态分组，如 HomePage/List/Default@3x.png，支持 cut-images/assets/icons/sprites/cut/images 目录名）；2) 转换模型（页面分组：list/detail/form/loading/empty 状态合并为一个页面组件；UI 库映射：把原生视觉元素映射到 Vant/Element Plus/Ant Design Vue；cut-image 优先级：页面级 > 模块级 > 全局共享；组件抽取：重复区域出现 >1 次则抽为共享组件）；3) CLI 运行（`export DASHSCOPE_API_KEY=...` 后 `npx ui-to-vue-converter@1.0.2 --input ./screenshots --ui vant --output ./src`，选项 --input/--ui[vant/element-plus/antd-vue]/--output/--config）；4) API Key 处理（优先环境变量，配置文件需 .gitignore）；5) 输出评审（views/ 下页面组件、components/ 共享、router 兼容目标风格、UI 库一致、CSS 单位匹配设计基线、过 formatter/lint/typecheck/build、审查占位文案与 mock）
- **依赖**：DashScope API（DASHSCOPE_API_KEY）、npx、ui-to-vue-converter@1.0.2 npm 包、目标 UI 库（Vant/Element Plus/Ant Design Vue）
- **说明**：社区来源；明确禁用场景（仅一张截图要 bespoke 组件、目标非 Vue、需详细交互/数据流/无障碍评审、含不可外发的客户隐私数据）；含 Troubleshooting 表（401、command not found、cut 图被忽略、组件忽略 UI 库、布局尺寸错）与安全提示（pin 版本、审查生成代码、不提交 config/key/截图）

## 十四（1）Python 生态与数据库（14 个）

Python 惯用法与测试、FastAPI/Django（含 Celery、安全、TDD、验证）、PyTorch；数据库模式：PostgreSQL/MySQL/Redis/ClickHouse/Prisma——Python 后端 + 持久层模式。

### python-patterns
- **执行步骤**：正文以清单/模式集给出，含：①核心原则（可读性优先、显式优于隐式、EAFP）；②类型提示（基础注解、3.9+ 内置类型、TypeAlias/TypeVar、Protocol 鸭子类型）；③错误处理（特定异常、异常链、自定义异常层级）；④上下文管理器（资源管理、contextmanager、类式）；⑤推导式与生成器；⑥dataclass/NamedTuple；⑦装饰器（函数、带参、类式）；⑧并发模式（线程/进程/async）；⑨包组织与导入约定；⑩性能（`__slots__`、生成器、join）；⑪工具链（black/isort/ruff/mypy/bandit）；⑫反模式（可变默认参数、裸 except、from import * 等）
- **依赖**：black、isort、ruff、pylint、mypy、pytest、bandit、pip-audit、safety（均为示例命令引用，非硬依赖）
- **说明**：通用 Python 基础 skill；提供 pyproject.toml 配置示例与 Python 习惯用法速查表

### python-testing
- **执行步骤**：正文以清单/模式集给出，含：①TDD 红绿重构循环；②覆盖率要求（目标 80%+、关键路径 100%、pytest --cov）；③pytest 基础（断言、异常测试）；④fixture（基础、setup/teardown、scope、参数化、autouse、conftest.py）；⑤参数化（@pytest.mark.parametrize、多参数、ids）；⑥标记与测试选择（slow/integration/unit 标记、-m 过滤、pytest.ini 注册）；⑦mocking（patch 函数/返回值/异常/上下文管理器、autospec、mock 类实例/属性）；⑧异步测试（pytest-asyncio、async fixture、mock 异步函数）；⑨异常与副作用测试（tmp_path/tmpdir/tempfile）；⑩测试组织（unit/integration/e2e 目录、测试类）；⑪最佳实践（DO/DON'T）；⑫pytest 配置（pytest.ini、pyproject.toml）；⑬运行命令清单
- **依赖**：pytest、pytest-asyncio、pytest-cov（mock 用 stdlib unittest.mock）
- **说明**：通用 Python 测试 skill；提供 FastAPI/Flask 端点测试与数据库操作测试的通用模式

### fastapi-patterns
- **执行步骤**：正文以清单/模式集给出，含：①项目结构（app/main/config/dependencies/database/routers/models/schemas/services）；②App Factory + lifespan（启动建表、关闭 dispose、CORS 中间件）；③pydantic-settings 配置（.env、列表字面量）；④Pydantic v2 schema（UserBase/Create/Update/Response/List、model_validator、from_attributes）；⑤依赖注入（get_db、get_current_user JWT 解码、get_current_active_user、DbDep/CurrentUserDep/ActiveUserDep 类型别名）；⑥Router 设计（POST/GET/PATCH/分页/token 端点、response_model）；⑦Service 层（get_by_email、create、list 分页、update、authenticate、bcrypt + JWT、IntegrityError→DuplicateUserError）；⑧httpx + pytest-asyncio 测试（ASGITransport、dependency_overrides、注册/认证 fixture）；⑨反模式（业务逻辑写在路由、async 路由用同步 DB）；⑩最佳实践（response_model 防 PII 泄漏、事务边界、确定性排序、401 vs 403 分离）
- **依赖**：FastAPI、Pydantic v2、pydantic-settings、SQLAlchemy(async)、httpx、pytest、pytest-asyncio、jose(jwt)、passlib(bcrypt)、aiosqlite（测试）
- **说明**：ECC 自有 skill；强调薄路由 + 事务 service 层、原子 DB 约束而非应用层预检查

### django-celery
- **执行步骤**：正文以清单/模式集给出，含：①项目搭建（pip 安装 celery[redis]、django-celery-results、django-celery-beat；celery.py 入口 autodiscover_tasks；settings 配置 broker/序列化/时间限制/prefetch/acks_late/beat scheduler）；②worker/beat 启动命令（dev/prod、多队列高优先级）；③任务设计（基础任务、可重试任务 max_retries+退避+jitter、幂等任务 status guard、软超时 SoftTimeLimitExceeded 清理）；④调用任务（delay/apply_async countdown/eta、队列路由、apply 同步仅测试）；⑤Beat 调度（代码 CELERY_BEAT_SCHEDULE crontab、数据库 PeriodicTask/CrontabSchedule）；⑥Canvas（chain、group、chord）；⑦错误处理与死信队列（task_failure 信号接 Sentry、max_retries 后持久化 FailedCharge）；⑧测试（单元测试 patch service、CELERY_TASK_ALWAYS_EAGER 集成测试、重试测试 throw=True）；⑨监控（inspect active/stats/reserved、redis-cli llen、flower）；⑩反模式（传 ORM 对象、生产视图同步调用、非幂等任务）；⑪生产 checklist 表
- **依赖**：Celery、Redis 或 RabbitMQ(broker)、django-celery-results、django-celery-beat、Flower(可选)、Sentry(可选)、pytest、pytest-django
- **说明**：ECC 自有 skill；关联 django-patterns（ORM/service）、django-tdd（测试）、python-testing（pytest）；强调幂等性、传 PK 不传 ORM、ACKS_LATE

### django-patterns
- **执行步骤**：正文以清单/模式集给出，含：①项目结构（config/ + apps/ 多 app、每 app 含 models/views/serializers/urls/permissions/filters/services/tests）；②Split Settings（base/development/production/test）；③模型设计（AbstractUser 自定义 User、字段/索引/约束、save 重写 slugify）；④QuerySet 最佳实践（自定义 QuerySet active/with_category(select_related)/with_tags(prefetch_related)/search，as_manager）；⑤Manager 方法（get_or_none、create_with_tags、bulk_update_stock）；⑥DRF Serializer（ModelSerializer、SerializerMethodField、字段/对象级 validate、UserRegistration 密码）；⑦ViewSet（ModelViewSet、get_serializer_class、perform_create、@action featured/purchase/my_products、DjangoFilterBackend/Search/Ordering）；⑧Service 层（@transaction.atomic create_order、process_payment）；⑨缓存（cache_page 视图级、模板片段 cache、低层 cache get/set、QuerySet 缓存）；⑩Signals（post_save 建 Profile、ready() 导入）；⑪中间件（ActiveUserMiddleware、RequestLoggingMiddleware）；⑫性能（select_related/prefetch_related 防 N+1、索引、bulk_create/update/delete）；⑬速查表
- **依赖**：Django、Django REST Framework、django-filter、django-cors-headers、WhiteNoise、debug_toolbar(dev)、PostgreSQL、Redis(可选缓存)
- **说明**：ECC 自有 skill；Django 五件套之 patterns；强调分层（thin view/service 层）、select_related/prefetch_related

### django-security
- **执行步骤**：正文以清单/模式集给出，含：①核心安全设置（DEBUG=False、ALLOWED_HOSTS、SSL/HSTS/Cookie Secure/HttpOnly/SameSite、SECRET_KEY 环境变量、密码校验器 min_length=12）；②认证（自定义 User(AbstractUser) email 登录、PASSWORD_HASHERS Argon2/PBKDF2/BCrypt、Session 配置）；③授权（Model Meta permissions、LoginRequiredMixin/PermissionRequiredMixin、自定义 DRF Permission IsOwnerOrReadOnly/IsAdminOrReadOnly/IsVerifiedUser、RBAC role 字段 + AdminRequiredMixin）；④SQL 注入防护（ORM 自动转义、raw 参数化、禁止 f-string 拼接、Q 对象）；⑤XSS 防护（模板自动转义、escape/striptags/escapejs、format_html、mark_safe 仅信任内容、SecurityHeaderMiddleware）；⑥CSRF（CSRF_COOKIE_SECURE/HTTPONLY/SAMESITE、CSRF_TRUSTED_ORIGINS、模板 csrf_token、AJAX 取 cookie、@csrf_exempt 谨慎用于 webhook）；⑦文件上传安全（magic bytes 校验 + 扩展名交叉校验、大小限制、python-magic 或 filetype、独立媒体域）；⑧API 安全（DRF Throttling Anon/User/Burst/Sustained、JWT/Token/Session 认证类）；⑨CSP（CSP_DEFAULT_SRC/SCRIPT_SRC 等 + CSPMiddleware）；⑩环境变量管理（django-environ）；⑪安全事件日志（django.security logger）；⑫速查 checklist
- **依赖**：Django、Django REST Framework、djangorestframework-simplejwt、python-magic 或 filetype、django-environ、bandit/safety/pip-audit(扫描工具)
- **说明**：ECC 自有 skill；Django 五件套之 security；强调 DEBUG=False、最小权限、CSP/HSTS、不在生产 mark_safe 用户输入

### django-tdd
- **执行步骤**：正文以清单/模式集给出，含：①TDD 红绿重构循环；②pytest 配置（pytest.ini DJANGO_SETTINGS_MODULE、--reuse-db、--nomigrations、--cov=apps、--strict-markers）；③测试 settings（sqlite :memory:、DisableMigrations、MD5PasswordHasher 提速、console email、CELERY_TASK_ALWAYS_EAGER）；④conftest.py（user/admin_user/authenticated_client/api_client/authenticated_api_client fixture）；⑤factory_boy（DjangoModelFactory、Sequence、Faker、fuzzy、SubFactory、post_generation tags、create_batch）；⑥Model 测试（创建/superuser/str/slug/校验/manager/库存管理）；⑦View 测试（list/detail/需登录/已登录/POST）；⑧DRF Serializer 测试（序列化/反序列化/字段校验）；⑨API ViewSet 测试（list/retrieve/未授权/已授权/patch/delete/过滤/搜索）；⑩mocking（patch stripe、@override_settings locmem email backend + mail.outbox）；⑪集成测试（完整结账流程）；⑫最佳实践 DO/DON'T；⑬覆盖率目标表（Models 90%+/Serializers 85%+/Views 80%+/Services 90%+/Overall 80%+）
- **依赖**：pytest、pytest-django、factory_boy、pytest-cov、Django、Django REST Framework
- **说明**：ECC 自有 skill；Django 五件套之 tdd；是 /django-test 系列命令背后的测试方法 skill；强调 factory_boy 替代手工建对象、--reuse-db/--nomigrations 提速

### django-verification
- **执行步骤**：1) Phase 1 环境检查（python 版本、venv、DJANGO_SECRET_KEY）；2) Phase 2 代码质量（mypy/ruff --fix/black --check/isort/python manage.py check --deploy）；3) Phase 3 迁移（showmigrations/makemigrations --check/migrate --plan/migrate/--merge 冲突）；4) Phase 4 测试+覆盖率（pytest --cov=apps、-m 过滤、覆盖率目标表）；5) Phase 5 安全扫描（pip-audit/safety/bandit/gitleaks/DEBUG 检查）；6) Phase 6 Django 管理命令（check/collectstatic/数据库完整性/cache 验证）；7) Phase 7 性能（Debug Toolbar N+1 检查、查询计数、缺失索引）；8) Phase 8 静态资源（npm audit/build/findstatic）；9) Phase 9 配置评审（DEBUG/SECRET_KEY/ALLOWED_HOSTS/HTTPS/HSTS/DB shell 检查）；10) Phase 10 日志配置；11) Phase 11 API 文档（generateschema / drf-yasg swagger）；12) Phase 12 Diff 评审（grep TODO/print/pdb/DEBUG=True）；输出模板 + 部署前 checklist + GitHub Actions 示例
- **依赖**：Python、mypy、ruff、black、isort、pytest、pytest-django、pytest-cov、bandit、safety、pip-audit、gitleaks(可选)、PostgreSQL、GitHub Actions(CI)
- **说明**：ECC 自有 skill；Django 五件套之 verification，作为 PR/部署前的验证门禁；含 12 个阶段与 CI 工作流示例

### pytorch-patterns
- **执行步骤**：正文以清单/模式集给出，含：①核心原则（设备无关代码 .to(device)、可复现性 set_seed 全设种子 + cudnn.deterministic、显式 shape 注释）；②模型架构（干净 nn.Module 结构 Sequential、权重初始化 `_init_weights` apply Kaiming/BatchNorm）；③训练循环（train_one_epoch、optimizer.zero_grad(set_to_none=True)、AMP autocast + GradScaler、`clip_grad_norm_`）；④验证循环（@torch.no_grad() + model.eval()）；⑤数据 pipeline（自定义 Dataset type hints、DataLoader 优化 num_workers/pin_memory/persistent_workers/drop_last、变长 collate_fn pad_sequence）；⑥检查点（完整保存 model+optimizer+epoch+loss、weights_only=True 安全加载）；⑦性能优化（AMP、gradient_checkpointing checkpoint() use_reentrant=False、torch.compile mode）；⑧反模式（验证忘 model.eval、inplace 破坏 autograd、循环内反复 .cuda()、.item() 在 backward 前、torch.save 整个 model）
- **依赖**：PyTorch、NumPy、PIL/Pillow（示例用）、CUDA（可选 GPU）
- **说明**：ECC 自有 skill；强调 device-agnostic、可复现、内存意识；附 PyTorch 习惯用法速查表

### postgres-patterns
- **执行步骤**：正文以清单/模式集给出，含：①索引速查表（B-tree/Composite/GIN jsonb 全文/BRIN 时序）；②数据类型速查（ID bigint、字符串 text、时间 timestamptz、金额 numeric(10,2)、标志 boolean）；③常见模式（复合索引顺序 等式列在前、覆盖索引 INCLUDE、部分索引 WHERE、RLS 策略包 SELECT auth.uid()、UPSERT ON CONFLICT DO UPDATE、游标分页 id > $last_id、队列处理 FOR UPDATE SKIP LOCKED）；④反模式检测（未索引外键 SQL、pg_stat_statements 慢查询、pg_stat_user_tables 表膨胀）；⑤配置模板（max_connections/work_mem/idle_in_transaction_session_timeout/statement_timeout/pg_stat_statements/REVOKE SCHEMA public）
- **依赖**：PostgreSQL、pg_stat_statements 扩展
- **说明**：ECC 自有 skill；明确指向 database-reviewer agent 做完整评审；致谢 Supabase Agent Skills (MIT)

### mysql-patterns
- **执行步骤**：正文以清单/模式集给出，含：①版本检查（SELECT VERSION()、MySQL 用行别名 MariaDB 用 VALUES(col)、SKIP LOCKED 仅限队列场景）；②Schema 默认（BIGINT UNSIGNED 主键、BINARY(16) UUID、DECIMAL 金额、utf8mb4、DATETIME 应用管 UTC、deleted_at 软删除、避免 ENUM）；③索引（复合顺序 等式在前再范围、EXPLAIN 风险信号 ALL/NULL key/Using temporary/filesort、不要盲目加索引）；④查询模式（跨引擎 upsert ON DUPLICATE KEY UPDATE、行别名 vs VALUES(col)、keyset 分页、JSON 生成列 + 索引、全文搜索 FULLTEXT）；⑤事务（短事务、按 id 排序加锁、死锁 checklist、SKIP LOCKED 队列 worker claim）；⑥连接池（SQLAlchemy pool_size/pool_recycle/pool_pre_ping、Node mysql2 connectionLimit、recycle 低于 wait_timeout）；⑦诊断（SHOW FULL PROCESSLIST/INNODB STATUS/慢日志）；⑧复制（读副本延迟、read-your-write 不走副本、SHOW REPLICA STATUS）；⑨安全（CREATE USER 最小权限、REQUIRE SSL、删除匿名用户）；⑩配置 ini；⑪反模式表（SELECT */深 OFFSET/长事务/直接改 mysql.user 等）
- **依赖**：MySQL 或 MariaDB、SQLAlchemy 或 mysql2(Node)、PgBouncer/Supabase pooler(可选)
- **说明**：ECC 自有 skill；关联 postgres-patterns、database-migrations、backend-patterns、security-review、database-reviewer agent；强调先验引擎/版本、输出含验证计划与回滚标准

### redis-patterns
- **执行步骤**：正文以清单/模式集给出，含：①数据结构速查（String 缓存/Hash session/Sorted Set 排行榜/Set 唯一访客/List feed/Stream 事件/HLL）；②核心模式（Cache-Aside setex、Write-Through、标签失效 pipeline、Session Hash 存储）；③限流（固定窗口 pipeline incr+expire、滑动窗口 Lua ZREMRANGEBYSCORE+ZCARD 原子）；④分布式锁（单节点 SET NX PX + Lua 脚本释放 token 校验、多节点用 redlock-py）；⑤Pub/Sub 与 Streams（fire-and-forget 发布订阅、Streams xadd/xreadgroup/xack 至少一次投递 + 消费者组）；⑥Key 设计（命名约定 resource:id:field、TTL 策略表，强制设 TTL）；⑦连接管理（ConnectionPool、RedisCluster、Sentinel master_for/slave_for）；⑧驱逐策略表（noeviction/allkeys-lru/volatile-lru 等）；⑨反模式（无 TTL、KEYS * 生产用 SCAN、大 blob、单实例混用、缓存击穿 lock）；⑩缓存击穿防护（双重检查锁）；⑪速查表 + 示例场景
- **依赖**：Redis、redis-py、redlock-py(多节点锁可选)、RedisCluster/Sentinel
- **说明**：ECC 自有 skill；关联 postgres-patterns、backend-patterns、database-migrations、django-patterns（缓存框架）、database-reviewer agent

### clickhouse-io
- **执行步骤**：正文以清单/模式集给出，含：①概述（列存 OLAP、压缩、并行查询、分布式、实时分析）；②表设计（MergeTree PARTITION BY toYYYYMM + ORDER BY、ReplacingMergeTree 去重、AggregatingMergeTree 预聚合 AggregateFunction sumMerge 等）；③查询优化（高效过滤 索引列在前、聚合 toStartOfDay/uniq/avg、quantile 替代 percentile、窗口函数累积求和）；④数据插入（TypeScript 批量插入、流式插入 stream）；⑤物化视图（实时聚合 mv + sumMerge/countMerge/uniqMerge）；⑥性能监控（system.query_log 慢查询、system.parts 表大小统计）；⑦常见分析查询（时序 DAU、留存 countIf 阈值、漏斗、cohort）；⑧数据 pipeline（ETL PostgreSQL→ClickHouse、CDC LISTEN/NOTIFY）；⑨最佳实践（分区策略、ORDER BY 高基数在前、最小数据类型/LowCardinality/Enum、避免 SELECT */FINAL/过多 JOIN/小批量插入、监控合并与磁盘）
- **依赖**：ClickHouse、clickhouse Node 客户端、PostgreSQL(pg Client，CDC 用)、Kafka(可选摄入)
- **说明**：ECC 自有 skill；偏分析型 DB；用 TypeScript/JavaScript 示例（非 Python），强调按查询模式设计表 + 批量插入 + 物化视图

### prisma-patterns
- **执行步骤**：正文以清单/模式集给出，含：①版本检查（npx prisma --version，新包名/adapter/prisma.config.ts 差异）；②ID 策略（cuid 默认/uuid 互操作/autoincrement 内部）；③Schema 默认（@unique 自带索引、@@index 外键与 WHERE/ORDER BY 列、deletedAt 前置声明、updatedAt 仅 update/upsert 生效）；④include vs select 速查；⑤事务形态选择（数组式独立操作/交互式依赖/外部调用放事务外，禁用外层 prisma 仅用 tx）；⑥PrismaClient 单例（globalForPrisma 防热重载重复实例、adapter 初始化 vs 直接初始化）；⑦N+1 问题（循环内查关系 vs include，Prisma5 relationJoins JOIN 优劣 benchmark）；⑧游标分页（take+1 检测 hasNextPage、二级 orderBy id 防重复时间戳不稳）；⑨软删除（显式过滤不用中间件）；⑩错误处理（PrismaClientKnownRequestError P2002/P2025/P2003 映射领域错误）；⑪serverless 连接池（DATABASE_URL 内嵌 connection_limit=1 + pool_timeout、PgBouncer pgbouncer=true）；⑫反模式（updateMany 返回 count 非 record、$transaction 交互式 5s 超时禁外部调用、migrate dev 可能重置 DB、手改迁移文件致 P3006 校验失败、破坏性 schema 须 expand-and-contract 多步迁移、@updatedAt 不触发 updateMany、软删除 + findUniqueOrThrow 泄漏已删行改用 findFirstOrThrow、deleteMany 无 where 清空表）；⑬最佳实践表
- **依赖**：Prisma（或 @prisma/client）、TypeScript、PrismaPg adapter（或其它 driver adapter）、PostgreSQL、PgBouncer/Supabase pooler(serverless)、NestJS(关联 skill)
- **说明**：ECC 自有 skill；面向 TS 后端的 Prisma ORM（非 Python，但归数据库子节）；关联 nestjs-patterns、postgres-patterns、database-migrations、backend-patterns；通篇强调版本敏感与非显见陷阱

## 十四（2）JVM 生态：Java·Kotlin·Spring Boot·Quarkus（18 个）

Java 编码规范、JPA/Hibernate、Kotlin（协程/Exposed/Ktor/测试）、Spring Boot 与 Quarkus 的 patterns/security/tdd/verification 四件套、Android Clean Architecture、Compose Multiplatform、tinystruct。

### java-coding-standards
- **执行步骤**：正文以清单+示例给出，先按构建文件做框架探测：①检测构建文件含 `quarkus`→应用 [QUARKUS] 约定，含 `spring-boot`→应用 [SPRING] 约定，均无则仅用共享约定；随后按主题覆盖：②命名（PascalCase 类、camelCase 方法、UPPER_SNAKE 常量；Quarkus 用 *Resource、Spring 用 *Controller）；③不可变（优先 records/ final 字段；Panache 实体用 public 字段）；④Optional（find* 返回 Optional，用 map/orElseThrow）；⑤流（短管道、复杂场景用循环）；⑥依赖注入（Spring 构造器注入、Quarkus @ApplicationScoped/@Inject，避免 @Singleton 误用）；⑦[QUARKUS] 响应式（返回 Uni/Multi，禁阻塞、禁重复订阅）；⑧异常（unchecked 域异常、集中处理 @ControllerAdvice/ExceptionMapper/@ServerExceptionMapper）；⑨项目结构与日志、配置、测试期望（JUnit 5+AssertJ+Mockito；Spring 切片测试；Quarkus @QuarkusTest/@InjectMock/Dev Services）
- **依赖**：JUnit 5、Mockito、AssertJ、MockMvc、REST Assured、Testcontainers、Spring Boot、Quarkus、Panache、JBoss Logging、SLF4J、Bean Validation
- **说明**：ECC 出品；自动按构建文件区分 Spring/Quarkus 约定；正文列出多项 [QUARKUS] 专属反模式（@Singleton vs @ApplicationScoped、混用 resteasy 经典/响应式、Panache active-record 与 repository 混用）

### jpa-patterns
- **执行步骤**：正文以清单+示例给出：①实体设计（@Entity/@Table 索引、@CreatedDate/@LastModifiedDate 审计，配合 @EnableJpaAuditing）；②关联与防 N+1（默认懒加载、集合禁 EAGER、读路径用 JOIN FETCH 或 DTO 投影）；③仓库模式（JpaRepository + @Query + 基于投影接口的轻量查询）；④事务（@Transactional，读路径加 readOnly=true）；⑤分页（PageRequest + Sort，游标式用 id > :lastId）；⑥索引与性能（按过滤条件建索引、复合索引、避免 select *、批量 saveAll + hibernate.jdbc.batch_size）；⑦HikariCP 推荐参数（maximum-pool-size=20、validation-timeout=5000 等，PostgreSQL LOB 加 non_contextual_creation）；⑧缓存与迁移（优先一级缓存；Flyway/Liquibase 迁移，禁生产用 Hibernate 自动 DDL）；⑨测试（@DataJpaTest + Testcontainers，开 SQL 日志校验效率）
- **依赖**：Spring Data JPA、Hibernate、HikariCP、Flyway、Liquibase、Testcontainers
- **说明**：ECC 出品；Spring Boot 专用（Quarkus 数据访问见 quarkus-patterns 的 Panache）；强调防 N+1 与短事务

### kotlin-coroutines-flows
- **执行步骤**：正文以模式集+示例给出：①结构化并发（禁 GlobalScope，用 viewModelScope/LaunchedEffect；coroutineScope+async 做并行分解；supervisorScope 让子失败不连环）；②Flow 模式（冷流 flow{}；StateFlow 用 stateIn(WhileSubscribed(5_000)) 挺过配置变更；combine 合并多流；debounce/distinctUntilChanged/flatMapLatest/catch 做搜索；retryWhen 做指数退避；SharedFlow + sealed Effect 做一次性事件）；③Dispatchers（Default CPU、IO 阻塞、Main UI；KMP 中 IO 仅 JVM/Android，跨平台用 Default 或 DI 提供）；④取消（长循环 ensureActive 协作取消；try/finally 清理；勿捕获 CancellationException）；⑤测试（Turbine 测 StateFlow；runTest + advanceUntilIdle；Fake 仓库用 MutableStateFlow 模拟）；⑥反模式（GlobalScope、init{} 收集、可变集合进 MutableStateFlow、flowOn(Main) 收集等）
- **依赖**：kotlinx.coroutines、Turbine、kotlinx.coroutines.test、关联 skill：compose-multiplatform-patterns、android-clean-architecture
- **说明**：ECC 出品；偏 Android/KMP；强调结构化并发与 WhileSubscribed(5_000) 保活策略

### kotlin-exposed-patterns
- **执行步骤**：正文以清单+完整示例给出：①How It Works 总述（DSL vs DAO；HikariConfig 管池；Flyway 启动跑版本化 SQL；newSuspendedTransaction 保证协程安全与原子性；repository 接口解耦业务层，测试可用 H2 内存库）；②建库（DatabaseFactory + HikariCP 配置；Flyway 配 locations/baselineOnMigrate；SQL 迁移文件含 UUID 主键、索引）；③表定义（UUIDTable/ varchar/ uniqueIndex/ jsonb/ references/ 复合主键）；④DSL 查询（insertAndGetId/selectAll.where/orderBy 单值；join、聚合 count/groupBy、子查询 inSubQuery、LIKE 转义防注入、分页 Page data class、batchInsert、upsert）；⑤DAO 模式（UUIDEntity/UUIDEntityClass，referrersOn 关联）；⑥事务（newSuspendedTransaction + runCatching，savepoint 嵌套、事务隔离级别）；⑦Repository 接口与 ExposedUserRepository 实现；⑧JSON 列（自定义 jsonb ColumnType + kotlinx.serialization + PGobject）；⑨测试（Kotest FunSpec + H2 内存库 + SchemaUtils.create）；⑩Gradle 依赖与速查表
- **依赖**：JetBrains Exposed、HikariCP、Flyway、kotlinx.serialization、PostgreSQL Driver、H2、Kotest
- **说明**：ECC 出品；DSL 与 DAO 并行覆盖；强调 newSuspendedTransaction 协程安全与 LIKE 输入转义

### kotlin-ktor-patterns
- **执行步骤**：正文以清单+完整示例给出：①标准项目布局（Application.kt 入口 + plugins/ routes/ models/ services/ repositories/ di/）；②入口 Application.module() 串装各 configure* 函数；③路由 DSL（route/get/post/put/delete，参数缺失 return@get，authenticate("jwt") 包保护路由）；④ContentNegotiation + kotlinx.serialization（@Serializable 数据类、ApiResponse/PaginatedResponse 包装、InstantSerializer 自定义）；⑤JWT 认证（HMAC256 verifier + 校验 audience + challenge；ApplicationCall.userId() 取 JWT claim）；⑥StatusPages 错误处理（按异常类型映射状态码 + 兜底 Throwable→500）；⑦CORS 配置（限定 origin、允许凭据）；⑧Koin DI（module 定义 single/get，Application.configureDI() install(Koin)，路由内 by inject<T>()）；⑨请求校验（require 表达式或扩展函数 validate()）；⑩WebSockets（install(WebSockets) + webSocket{} 广播用快照防 ConcurrentModificationException）；⑪testApplication 测试（普通路由与受保护路由、bearerAuth 注入 JWT）；⑫application.yaml 配置与读取
- **依赖**：Ktor、Koin、kotlinx.serialization、JWT (HMAC256)、Kotest、关联 skill：kotlin-exposed-patterns（仓库实现）
- **说明**：ECC 出品；与 kotlin-exposed-patterns 配套（同构 Ktor + Exposed + Koin 技术栈）；强调路由保持瘦、逻辑下沉 service、用 testApplication 做集成覆盖

### kotlin-patterns
- **执行步骤**：正文按七大主题以清单+示例给出：①null 安全（默认非空类型、?. 与 ?:，禁 user!!）；②不可变优先（val/data class + copy()、不可变集合，禁 var 全局态）；③表达式函数体与 when 表达式；④data class 与 value class（@JvmInline，零开销类型包装 + init 校验）；⑤sealed class/interface 建模受限层级（含 Result/ApiError 示例）；⑥scope functions（let/apply/also/run/with 用法与反模式，禁深度嵌套）；⑦扩展函数（领域/集合扩展、作用域内私有扩展）；⑧协程（coroutineScope/async 并行、supervisorScope 容错、Flow 冷流与 catch、ensureActive 与 NonCancellable 清理）；⑨委托（lazy/Delegates.observable/Map 委托、接口 by 委托）；⑩DSL Builder（@DslMarker + 类型安全构建器 + 配置 DSL）；⑪Sequence 惰性求值；⑫Gradle Kotlin DSL（kotlin jvm/serialization/ktor/kover/detekt 插件、依赖与 useJUnitPlatform）；⑬错误处理（Result/runCatching 链式、require/check/error 前置条件）；⑭集合操作地道写法；⑮反模式速查（force-unwrap、可变 data class、异常做控制流、GlobalScope、深嵌套 scope 函数等）
- **依赖**：Kotlin (2.3.x)、kotlinx.coroutines、kotlinx.serialization、Ktor、Exposed、Koin、Gradle Kotlin DSL、Kover、Detekt、Kotest、MockK
- **说明**：ECC 出品；Kotlin 通用规范（与 kotlin-coroutines-flows / kotlin-testing / kotlin-exposed-patterns / kotlin-ktor-patterns 互补）；附 Gradle 依赖版本参考与速查表

### kotlin-testing
- **执行步骤**：1) 识别待测目标代码；2) 选 Kotest spec（StringSpec/FunSpec/BehaviorSpec/DescribeSpec）写测试；3) 用 MockK 隔离依赖；4) 运行测试（RED 验证失败）；5) 写最小实现（GREEN）；6) 重构保持绿灯；7) 跑 `./gradlew koverHtmlReport` 校验覆盖率达 80%+
- **依赖**：Kotest、MockK、kotlinx.coroutines.test、Kover、Ktor testApplication、关联 skill：kotlin-patterns
- **说明**：ECC 出品；覆盖完整 TDD RED-GREEN-REFACTOR 循环；含 Kotest 四种 spec、自定义 Matcher、协程 runTest/Flow 测试、属性测试 Arb 生成器、Kover 配置（80% 阈值）与 CI/CD 示例

### springboot-patterns
- **执行步骤**：正文以清单+示例给出：①REST API 结构（@RestController + @Validated，构造器注入）；②Repository 模式（Spring Data JPA + @Query）；③Service 层 + @Transactional；④DTO 与校验（record + Bean Validation）；⑤异常处理（@ControllerAdvice 统一映射 + ApiError）；⑥缓存（@EnableCaching + @Cacheable/@CacheEvict）；⑦异步（@EnableAsync + @Async + CompletableFuture）；⑧SLF4J 日志（结构化键值）；⑨OncePerRequestFilter 中间件（请求计时日志）；⑩分页排序（PageRequest + Sort）；⑪外部调用重试（指数退避）；⑫Bucket4j 限流 Filter（含 X-Forwarded-For 信任与 ForwardedHeaderFilter 安全说明）；⑬后台任务（@Scheduled 或 Kafka/SQS/RabbitMQ，幂等可观察）；⑭可观测性（结构化日志 + Micrometer + Prometheus/OTel + Tracing）；⑮生产默认（构造器注入、RFC 7807 problemdetails、HikariCP 调优、查询 readOnly）
- **依赖**：Spring Boot、Spring Data JPA、Spring Security、SLF4J、Micrometer、Bucket4j、HikariCP
- **说明**：ECC 出品；springboot 四件套之 patterns；与 springboot-security/tdd/verification 配套；限流章节含转发头信任的安全告警

### springboot-security
- **执行步骤**：正文以清单+示例给出：①认证（无状态 JWT 或可撤销 opaque token；httpOnly/Secure/SameSite=Strict cookie；JwtAuthFilter 继承 OncePerRequestFilter）；②授权（@EnableMethodSecurity + @PreAuthorize 表达式，默认拒绝）；③输入校验（@Valid + DTO Bean Validation，HTML 白名单净化）；④防 SQL 注入（参数化 native query :param，禁字符串拼接）；⑤密码哈希（BCryptPasswordEncoder cost=12，禁明文）；⑥CSRF（浏览器会话应用保留 CSRF；纯 Bearer API 可禁用 + STATELESS）；⑦密钥管理（禁入源码，application.yml 用占位符，Spring Cloud Vault）；⑧安全头（CSP/Frame/XSS/Referrer）；⑨CORS（在 security filter 层配置，禁生产用 *）；⑩限流（Bucket4j 或网关级，429 + 重试提示）；⑪依赖安全（OWASP Dependency Check / Snyk，构建失败于已知 CVE）；⑫日志与 PII（禁记 secret/token/PAN）；⑬文件上传（校验大小/类型/扩展名，存于 web 根外）；⑭发布前 checklist（10 项）
- **依赖**：Spring Security、JWT、Bean Validation、BCrypt、Bucket4j、OWASP Dependency Check、Spring Cloud Vault
- **说明**：ECC 出品；springboot 四件套之 security；附带 Release 前 10 项 checklist；强调 deny-by-default 与 secure-by-configuration

### springboot-tdd
- **执行步骤**：1) 先写测试（应失败）；2) 写最小实现使其通过；3) 测试保持绿下重构；4) 用 JaCoCo 强制覆盖率
- **依赖**：JUnit 5、Mockito、MockMvc、AssertJ、Testcontainers、JaCoCo、Spring Boot（@WebMvcTest/@DataJpaTest/@SpringBootTest/@MockBean）
- **说明**：ECC 出品；springboot 四件套之 tdd；含单元（Mockito）、Web 层（@WebMvcTest+MockMvc）、集成（@SpringBootTest）、持久层（@DataJpaTest+Testcontainers）与 JaCoCo Maven 配置；附 MarketBuilder 测试数据构建器

### springboot-verification
- **执行步骤**：1) Phase 1 构建（mvn -T 4 clean verify -DskipTests 或 ./gradlew clean assemble -x test，失败即停）；2) Phase 2 静态分析（spotbugs:check pmd:check checkstyle:check 或 checkstyleMain pmdMain spotbugsMain）；3) Phase 3 测试 + 覆盖率（mvn -T 4 test + jacoco:report 校验 80%+，含单元 Mockito、Testcontainers 集成、MockMvc API 测试示例）；4) Phase 4 安全扫描（OWASP dependency-check、源码与 git 历史密钥扫描、System.out/raw e.getMessage/wildcard CORS 巡检）；5) Phase 5 Lint/Format（spotless:apply 可选门禁）；6) Phase 6 diff 评审（git diff --stat + checklist）；最后按模板产出 VERIFICATION REPORT
- **依赖**：Maven、Gradle、SpotBugs、PMD、Checkstyle、Spotless、JaCoCo、OWASP Dependency Check、Mockito、Testcontainers、MockMvc、AssertJ
- **说明**：ECC 出品；springboot 四件套之 verification；提供 6 阶段流程 + 标准化 VERIFICATION REPORT 输出模板；建议长会话每 30–60 分钟重跑

### quarkus-patterns
- **执行步骤**：正文以清单+完整示例给出：①多依赖 Service 层（@ApplicationScoped + @RequiredArgsConstructor 构造器注入、@Transactional、校验前置、事件追踪、Camel 异步发布）；②自定义 LogContext 日志作用域（SafeAutoCloseable + Logstash encoder）；③EventService 成功/错误事件持久化；④Camel RabbitMQ 发布（ProducerTemplate + RouteBuilder + spring-rabbitmq 组件）；⑤Camel direct 内存路由（onException、choice/when 条件分流）；⑥Camel 文件处理路由（file:// + move/moveFailed）；⑦REST API（@Path JAX-RS Resource，URI location）；⑧Panache Repository 模式（find/page/list/firstResultOptional）；⑨Service + @Transactional；⑩DTO record + Bean Validation；⑪ExceptionMapper（@Provider 映射 ConstraintViolationException 与兜底 Exception）；⑫CompletableFuture 异步（S3 上传 + LogContext 传递）；⑬@CacheResult/@CacheInvalidate 缓存；⑭application.yml 三 profile（%dev/%test/%prod）配置；⑮@Readiness/@Liveness 健康检查（数据库 + CamelContext）；⑯Maven 依赖（quarkus-bom + camel-quarkus-bom + Lombok + Logback + Logstash）；⑰最佳实践总览（架构/事件驱动/日志/异步/配置/校验/事务/测试/Quarkus 专属）
- **依赖**：Quarkus 3.x、Apache Camel、Panache、RabbitMQ、CDI（@ApplicationScoped/@Inject/@ConfigProperty）、Lombok、Logback、Logstash、Jackson、S3 Client、Hibernate ORM、GraalVM、Maven、AssertJ
- **说明**：ECC 出品；quarkus 四件套之 patterns；与 quarkus-security/tdd/verification 配套；重 Camel 事件驱动 + LogContext 链路追踪，强调 native 兼容与 YAML profile

### quarkus-security
- **执行步骤**：正文以清单+示例给出：①JWT 认证（@Authenticated + JsonWebToken + SecurityIdentity，`mp.jwt.verify.* / quarkus.oidc.*` 配置；CustomAuthFilter 实现 ContainerRequestFilter，缺失/畸形 Bearer 立即 401）；②RBAC 授权（@RolesAllowed 类/方法级、SecurityIdentity.hasRole/异常抽象 isOwner 程序式校验、SecurityService 统一判断）；③输入校验（record DTO + Bean Validation + 自定义 @ValidUsername 注解与 ConstraintValidator）；④防 SQL 注入（Panache 参数化 ?1/:name，native 用 :param setParameter，禁拼接）；⑤密码哈希（BcryptUtil.bcryptHash/matches）；⑥CORS 配置（`quarkus.http.cors.*` 属性，限定 origin）；⑦密钥管理（${ENV} 占位，HashiCorp Vault 集成 quarkus.vault.*）；⑧限流（RateLimitFilter 实现 ContainerRequestFilter，用 getRemoteAddr 而非 X-Forwarded-For，代理场景配 proxy-address-forwarding）；⑨安全头 Filter（X-Frame-Options DENY、HSTS、CSP 禁 unsafe-inline script）；⑩AuditService 审计日志（SecurityIdentity + 结构化 infof）；⑪依赖扫描（dependency-check-maven、quarkus:audit、quarkus:list-extensions）
- **依赖**：Quarkus Security、SmallRye JWT、MicroProfile JWT、OIDC、Panache、Bean Validation、BcryptUtil、HashiCorp Vault、OWASP Dependency Check、Guava RateLimiter
- **说明**：ECC 出品；quarkus 四件套之 security；含 JWT/OIDC 配置、自定义 @ValidUsername 校验器与 BcryptUtil 密码服务示例；强调 X-Forwarded-For 不可信

### quarkus-tdd
- **执行步骤**：1) 先写测试（应失败）；2) 写最小实现通过；3) 绿下重构；4) 用 JaCoCo 强制 80%+ 覆盖率
- **依赖**：JUnit 5、Mockito（@ExtendWith(MockitoExtension)/@InjectMock）、AssertJ、REST Assured、Apache Camel（camel-quarkus-junit5、AdviceWith、MockEndpoint）、JaCoCo、Quarkus（@QuarkusTest/@TestProfile/@QuarkusTestResource）、Panache
- **说明**：ECC 出品；quarkus 四件套之 tdd；重 Camel 路由测试（AdviceWith 替换端点 + MockEndpoint 断言）、CompletableFuture 异步与 LogContext 跨线程传递验证；含 JaCoCo 完整 Maven 配置（行 80% / 分支 70% 阈值）

### quarkus-verification
- **执行步骤**：1) Phase 1 构建确认；2) Phase 2 静态分析（checkstyle:check pmd:check spotbugs:check + SonarQube 可选）；3) Phase 3 测试 + 覆盖率（mvn test + jacoco:report + jacoco:check，含单元、@QuarkusTest 集成 + Testcontainers、REST Assured API 测试）；4) Phase 4 安全扫描（dependency-check-maven、quarkus:audit、OWASP ZAP、通用安全 checklist）；5) Phase 5 native 编译（mvn package -Dnative，含容器构建与 reflection 配置 @RegisterForReflection，启动后跑 health smoke）；6) Phase 6 性能压测（K6 阶梯加压，监控 p50/p95/p99）；7) Phase 7 健康检查（/q/health/live /ready /metrics）；8) Phase 8 容器镜像构建与 Trivy/Grype 扫描；9) Phase 9 配置校验（quarkus:info + config source 巡检 + 环境特定 checklist）；10) Phase 10 文档评审（OpenAPI/Swagger、README、迁移指南）；最后汇总 Verification Checklist（代码质量/测试/安全/部署/native）并提供自动化 bash 脚本与 GitHub Actions 示例
- **依赖**：Maven、Gradle、Checkstyle、PMD、SpotBugs、SonarQube、JaCoCo、OWASP Dependency Check、OWASP ZAP、GraalVM native-image、K6、Trivy、Grype、Testcontainers、REST Assured、GitHub Actions
- **说明**：ECC 出品；quarkus 四件套之 verification；最详尽（10 阶段，含 native 编译、容器扫描、K6 压测与 GitHub Actions 流水线）；附端到端自动化脚本

### android-clean-architecture
- **执行步骤**：正文以清单+示例给出：①模块结构（app/core/domain/data/presentation/design-system/feature，附依赖规则：domain 严禁依赖 data/presentation 或任何框架，仅纯 Kotlin）；②Domain 层（UseCase 用 operator fun invoke；Flow 型 UseCase；纯 data class 域模型；Repository 接口定义于 domain）；③Data 层（ItemRepositoryImpl 协调 local/remote DataSource；Mapper 模式 toDomain/toEntity 扩展函数；Room @Entity/@Dao/@Upsert + Flow observeAll（Android）；SQLDelight .sq 文件 get/upsert/observeAll（KMP）；Ktor HttpClient + ContentNegotiation/Logging 网络层）；④DI（Koin 的 domain/data/presentation module + viewModelOf；Hilt @Module/@InstallIn(SingletonComponent) + @Binds + @HiltViewModel）；⑤错误处理（Result<T> 或自定义 sealed Try/ AppError；ViewModel 内 when 映射 UI 状态）；⑥Gradle Convention Plugins（build-logic 减少 KMP 重复）；⑦反模式（domain 引 Android 框架、暴露 Entity/DTO 给 UI、ViewModel 写业务逻辑、GlobalScope、胖 Repository、循环依赖）
- **依赖**：Kotlin、Room、SQLDelight、Ktor、Koin、Hilt、kotlinx.coroutines、关联 skill：compose-multiplatform-patterns、kotlin-coroutines-flows
- **说明**：ECC 出品；偏移动端但属 JVM 生态（KMP）；同时给 Room（Android 专）与 SQLDelight（KMP）两套数据层；Koin（KMP 友好）与 Hilt（Android 专）两套 DI

### compose-multiplatform-patterns
- **执行步骤**：正文以清单+示例给出：①状态管理（单一 state data class + MutableStateFlow + collectAsStateWithLifecycle；Event Sink 模式用 sealed interface 收敛事件回调）；②类型安全导航（Compose Navigation 2.8+，@Serializable data object/class 作 Route；NavHost + composable<Route>；dialog() 替代命令式弹窗）；③Composable 设计（Slot-Based API header/content/actions；Modifier 顺序：padding→clip→background→clickable）；④KMP 平台特定 UI（expect/actual composable，如 PlatformStatusBar 在 androidMain/iosMain 各自实现）；⑤性能（@Stable/@Immutable 标记稳定类型、LazyColumn items key= 稳定键、derivedStateOf 延迟读、remember 避免重组期分配）；⑥Material 3 动态主题（dynamicDark/LightColorScheme）；⑦反模式（ViewModel 内用 mutableStateOf、深传 NavController、@Composable 内重计算、LaunchedEffect(Unit) 代替 init、参数内新建对象）
- **依赖**：Jetpack Compose、Compose Multiplatform、Compose Navigation 2.8+、Material 3、Koin (koinViewModel)、关联 skill：android-clean-architecture、kotlin-coroutines-flows
- **说明**：ECC 出品；偏移动端但属 JVM/KMP 生态；强调 collectAsStateWithLifecycle 与稳定类型驱动的跳过式重组（skippable recomposition）

### tinystruct-patterns
- **执行步骤**：正文以核心原则+清单+示例给出：①核心原则（CLI 与 HTTP 平等公民，每个 @Action 应可同时从终端与浏览器调用）；②How ItWorks（@Action 即可路由端点；AbstractApplication 提供 init 与 Context；ActionRegistry 自动映射路径段到方法参数；数据服务用原生 Builder/Builders 保持零依赖；AbstractData POJO + XML mapping 做 CRUD 无外部 ORM）；③示例（基础 MyService + @Action greet 重载与路径参数；Mode.HTTP_POST 消歧 login；Builder/Builders 原生 JSON；SSE connect + SSEPushManager.push/broadcast；文件上传 request.getAttachments() + FileEntity）；④MCP 服务器与工具集成（SDK ≥1.7.26，核心依赖即含 MCP API；继承 MCPTool + @Action + @Argument 声明参数，禁用 getContext().getAttribute 取工具参数；继承 MCPServer + init() 中 registerTool；附 Prompt Injection 安全告警：必须校验/消毒调用方参数长度/字符集/空值）；⑤application.properties 配置（driver/database.*/server.port/default.home.page/Redis session 可选）；⑥getConfiguration() 读值；⑦红旗与反模式表（禁导入 gson/jackson、用 Builders 替代 List<Builder>、API 应用 setTemplateRequired(false)、@Action 必须 public、禁手写 main、禁手动 ActionRegistry 注册、用 --import 引入类、Mode 区分 HTTP_GET/POST）；⑧最佳实践（粒度小应用、init() 内装配、Mode 限定敏感操作、Context().getAttribute("--flag") 取可选 CLI 参数、CompletableFuture.runAsync 异步事件）；⑨技术参考（references/ 目录 6 篇 + 内部源码文件清单）
- **依赖**：tinystruct（核心依赖，SDK ≥1.7.26 含 MCP）、MCP（Model Context Protocol）、JUnit 5、H2/MySQL、Redis（可选 Session）、bin/dispatcher CLI
- **说明**：ECC 出品；唯一非 Spring/Quarkus 的轻量 JVM 框架；双模式（CLI+HTTP）哲学；内置 MCP 工具/服务器支持并明确标注 Prompt Injection 消毒责任；references/ 下分 6 篇专题文档（architecture、routing、data-handling、database、system-usage、testing）

## 十四（3）JS/TS Web 框架（11 个）

React/Vue/Nuxt/Nest/Angular 模式与测试、Next.js Turbopack、Vite 构建、Bun 运行时、跨语言编码基线 coding-standards——JavaScript/TypeScript 前后端框架。

### angular-developer
- **执行步骤**：1) 先分析项目 Angular 版本（特性因版本而异），新建项目除非用户指定否则不锁版本；2) 生成代码遵循 Angular 风格指南，用 CLI 脚手架保证一致性；3) 生成后运行 `ng build` 确认无错误，有错先修复再继续；新建项目按三步判定 `ng new` 命令：①用户指定版本则 `npx @angular/cli@<version> new`，②否则先 `ng version` 探测本地/全局安装，成功则用本地 `ng new`，③探测失败则 `npx @angular/cli@latest new`；正文以分域清单给出，含：组件基础/Inputs/Outputs/Host 元素、响应式（Signals、linkedSignal、resource、effect）、表单（优先 signal forms，旧应用沿用既有策略）、DI 基础/services/providers/injection context/层级注入器、Angular Aria（Accordion/Listbox/Combobox/Menu/Tabs/Toolbar/Tree/Grid）、路由（define routes、loading、outlets、navigate、guards、resolvers、lifecycle、rendering strategies、route animations）、样式与动画（Tailwind CSS、原生 CSS 动画、组件样式）、测试（fundamentals、component harnesses、router testing、E2E）、工具（Angular CLI、Angular MCP Server）；正文并列出反模式清单
- **依赖**：Angular CLI（ng）、Angular MCP Server、Tailwind CSS（可选）、Cypress 或 Playwright（E2E）、关联 skill：tdd-workflow、security-review、frontend-patterns
- **说明**：ECC 原生（metadata.origin: ECC）。偏代码生成 + 架构指导。大量 references/*.md 子文档需按任务类型检索。注意避免 null/undefined 作为信号表单初值、effect 中派生状态应改 computed、`@for` 嵌套不支持 `$parent` 需用 `let outerIdx = $index`

### bun-runtime
- **执行步骤**：正文以模式清单给出，含：①运行时特性（基于 JavaScriptCore、Zig 实现，Node 兼容运行时）；②包管理（`bun install` 比 npm/yarn 快，lockfile 为 `bun.lock` 文本格式，旧版为 `bun.lockb` 二进制）；③打包器（内置 bundler/transpiler）；④测试器（`bun test`，Jest 风格 API）；Node 迁移：将 `node script.js` 换成 `bun run script.js` 或 `bun script.js`，`npm install` 换 `bun install`，`bun run` 跑 npm scripts，`bun x` 替代 npx，优先 Bun API 获更好性能；Vercel：项目设置切到 Bun runtime，构建用 `bun run build` 或 `bun build ./src/index.ts --outdir=dist`，安装用 `bun install --frozen-lockfile`；最佳实践：提交 lockfile、TS 原生运行、保持依赖更新
- **依赖**：Bun runtime、Vercel（可选部署平台）
- **说明**：ECC 原生。正文较短但信息密度高，示例覆盖运行/安装/env/测试/Runtime API。何时选 Node 的判据：最大生态兼容、假定 Node 的旧工具、依赖存在已知 Bun 问题

### coding-standards
- **执行步骤**：正文以分域清单给出，含：①代码质量原则（Readability First、KISS、DRY、YAGNI）；②TypeScript/JavaScript 规范（变量命名描述性、函数动词-名词、不可变优先用展开运算符、错误处理完整化、async/await 并行化、类型安全禁 any）；③React 最佳实践（组件结构带类型、自定义 hooks、状态管理函数式更新、条件渲染避免三元地狱）；④API 设计（REST 约定、统一 ApiResponse 响应结构、Zod 输入校验）；⑤文件组织（项目结构、文件命名 PascalCase/camelCase）；⑥注释规范（解释 WHY 而非 WHAT、JSDoc 用于公开 API）；⑦性能（useMemo/useCallback 备忘录、lazy loading、按需查询列）；⑧测试（AAA 模式 Arrange-Act-Assert、描述性测试名）；⑨代码坏味识别（长函数、深嵌套、魔数）
- **依赖**：Zod（输入校验）、Next.js App Router（项目结构示例）、关联 skill：frontend-patterns、backend-patterns、api-design、rules/common/coding-style.md
- **说明**：ECC 原生。是“共享基线”而非框架详细手册，框架细节请走 frontend-patterns 或 backend-patterns。范围明确：描述性命名、不可变性默认、可读性/KISS/DRY/YAGNI、错误处理与代码坏味审查；不作为 React 组合/hooks 或后端架构的主源

### nestjs-patterns
- **执行步骤**：正文以分域清单给出，含：①项目结构（feature 模块、common/ 放 filters/decorators/guards/interceptors、DTO 贴近所属模块）；②Bootstrap 与全局校验（ValidationPipe 开启 whitelist 与 forbidNonWhitelisted、ClassSerializerInterceptor、HttpExceptionFilter、enableImplicitConversion）；③模块/控制器/Provider（控制器保持瘦、业务在 injectable services、只导出真正需要的 providers）；④DTO 与校验（class-validator、专用响应 DTO、避免泄漏密码/token/审计列）；⑤Auth/Guards/请求上下文（guards 模块本地、粗粒度访问在 guard、资源级授权在 service、显式 AuthenticatedRequest 类型）；⑥异常过滤器与统一错误信封；⑦Config 与 env 校验（启动时 validate 而非首次请求、typed helper、config factory 切分环境）；⑧持久化与事务（Repository/ORM 封装领域语言、事务隔离在 service、控制器不直接协调多步写）；⑨测试（单元隔离 mock 依赖、guard/pipe/filter 请求级测试、复用生产同名 global pipes/filters）；⑩生产默认（结构化日志+请求关联 id、配置非法即终止启动、async provider 初始化带健康检查、后台任务独立模块、限流/auth/审计显式化）
- **依赖**：NestJS、class-validator、Prisma 或 TypeORM（可选 ORM）、关联 skill：未显式声明，但与 backend-patterns、api-design 同领域
- **说明**：ECC 原生。生产级 TypeScript 后端模式，无数字编号 workflow，主要为原则 + 代码模板清单。强调控制器瘦、业务服务化、统一错误信封、启动期 env 校验

### nextjs-turbopack
- **执行步骤**：正文以模式清单给出，含：①Turbopack 原理（Rust 实现的增量打包器、FS 缓存复用上次工作、大项目 5–14x 提速）；②dev 默认（Next.js 16 起 `next dev` 默认 Turbopack，`--webpack` 或 `--no-turbopack` 关闭，需查版本对应文档）；③生产构建行为视版本而定，查官方文档；④FS 缓存位于 `.next`；⑤Bundle Analyzer（Next.js 16.1+ 实验特性）；命令：`next dev`/`next build`/`next start`；Middleware 文件命名：Next.js 16+ 用 `proxy.ts`（取代 `middleware.ts`），16 之前用 `middleware.ts`，文件名绑定 Next.js 版本而非打包器，不要把 `proxy.ts` 误判为命名错误；最佳实践：停在近期 Next.js 16.x、dev 慢时确认在 Turbopack 且缓存未被清、生产体积用官方 bundle 分析工具
- **依赖**：Next.js 16+、Turbopack、（可选 webpack 作为 legacy fallback）
- **说明**：ECC 原生。正文相对简短但聚焦关键决策。重点提醒：`proxy.ts` 是 16+ 正确命名，不要建议改回 `middleware.ts`，否则会破坏中间件执行。生产构建行为需按版本查官方文档

### nuxt4-patterns
- **执行步骤**：正文以分域清单给出，含：①Hydration 安全（首屏渲染确定性、`Date.now()`/`Math.random()`/浏览器 API/存储读取不放 SSR 模板状态、浏览器逻辑放 `onMounted`/`import.meta.client`/`ClientOnly`/`.client.vue`、用 Nuxt 的 `useRoute()` 而非 vue-router、不用 `route.fullPath` 驱动 SSR markup、`ssr:false` 仅作浏览器专属逃生舱）；②数据获取（页面/组件 SSR 安全读取优先 `await useFetch()`、复杂场景用 `useAsyncData()` 配稳定 key、handler 无副作用、用户触发的写或客户端动作用 `$fetch`、非关键数据用 `lazy:true`/`useLazyFetch`/`useLazyAsyncData` 并处理 `status==='pending'`、`server:false` 仅限非 SEO 数据、用 `pick` 裁剪 payload）；③Route Rules（`nuxt.config.ts` 的 `routeRules`，per route group 设定 prerender/swr/isr/ssr:false/cache/redirect，不在全局设）；④Lazy Loading 与性能（按路由代码分割、`Lazy` 前缀动态导入非关键组件、配 `v-if` 控制加载时机、`hydrate-on-visible`、`defineLazyHydrationComponent()` 自定义策略、NuxtLink 预取路由组件与 payload）；正文末尾给出 Review Checklist（SSR 与 hydration markup 一致、用 useFetch/useAsyncData 而非顶层 $fetch、非关键数据 lazy+加载 UI、route rules 匹配 SEO/新鲜度、重交互岛 lazy load/hydrate）
- **依赖**：Nuxt 4、Vue 3、$fetch、关联 skill：未显式声明，与 vue-patterns 同生态
- **说明**：ECC 原生。无数字编号 workflow，模式 + checklist 驱动。强调不要用 `ssr:false` 当默认修复 hydration 问题的手段、URL fragment 是 client-only 不要驱动 SSR markup、给 `useAsyncData` 稳定 key

### react-patterns
- **执行步骤**：正文以分域清单给出，含：①核心原则（渲染是 props 与 state 的纯函数、副作用放 effect/事件处理器、组合优于继承）；②Hooks 纪律（仅在顶层调用、清理每个订阅/interval/listener、依赖旧 state 用函数式更新、默认不 memoize、相同 hook 序列复用 2+ 组件才抽自定义 hook）；③State 位置决策树（单组件用 useState、父+少数后代提到共同祖先、跨远分支低频读用 Context、高频跨树更新用外部 store、来自服务器用 server-state 库）；④Server/Client Components（Server 默认 async 不下发 JS、Client 用 "use client"、Server→Client 传可序列化 props 或 children、Client→Server 经 Server Actions、禁止从 Client 文件 import Server Component）；⑤Suspense+Error Boundaries（边界贴近数据、Error Boundary 仍是 class、用 react-error-boundary）；⑥表单（React 19 form actions 优先、useActionState、受控输入驱动其他 UI 才用、复杂表单用 React Hook Form/TanStack Form）；⑦数据获取决策矩阵（Next App Router 用 RSC fetch、客户端缓存+变更+失效用 TanStack Query、轻量缓存用 SWR、实时订阅用 SSE/WebSockets、一次性 fire-and-forget 在事件处理器）；⑧组合配方（children slot、命名 slot、compound components、render prop）；⑨性能（React.memo 三条件齐备才用、拆分 Context、useSyncExternalStore、稳定 key、长列表虚拟化）；⑩可访问性优先组合（语义 HTML 优先、键盘可达、label 关联、焦点管理、跑 axe）
- **依赖**：React 18/19、Next.js App Router/RSC（可选）、TanStack Query、SWR、Zod（schema 校验）、React Hook Form、TanStack Form、@tanstack/react-virtual 或 react-window、react-error-boundary、关联 skill：react-performance、frontend-patterns、accessibility、angular-developer；Agents：react-reviewer、react-build-resolver；Commands：/react-review、/react-build、/react-test；引用 rules/react/（含 hooks.md）
- **说明**：ECC 原生。对应命令 /react-review、/react-build、/react-test。明确声明 router-agnostic，Next.js 细节、React Native、Remix 为 out-of-scope（注意 react-native-patterns 实际已存在，此声明略滞后）。强调避免 useEffect+fetch 取应用数据（竞态/无缓存/无重试/无 Suspense 集成）

### react-testing
- **执行步骤**：正文以分域清单给出，含：①核心原则（测用户看到与做的、不测实现细节、不 mock React 本身）；②库选择（Vitest 配 Vite/Remix、Jest 配 Next.js/CRA、Playwright CT 需真实浏览器、Cypress CT 已用 Cypress 时）；③查询优先级（getByRole/getByLabelText 优先、getByAltText/getByTitle 语义层、getByTestId 兜底；getBy 抛错、queryBy 返 null、findBy 异步）；④userEvent 交互（每测 setup 一次复用、必须 await、优于 fireEvent）；⑤异步模式（findByText、waitFor、waitForElementToBeRemoved，禁 setTimeout）；⑥MSW 网络模拟（setupServer、http/HttpResponse、`onUnhandledRequest:'error'` 让未 mock 请求红测、per-test 用 server.use 覆写）；⑦Provider 包装（test-utils.tsx 统一注入 QueryClientProvider/ThemeProvider/MemoryRouter）；⑧自定义 Hook 测试（renderHook+act、QueryClient 在 wrapper 外实例化避免重渲染丢缓存）；⑨可访问性断言（jest-axe/vitest-axe、有交互的组件均跑 axe）；⑩何时不该用快照（DOM 快照易橡皮图章过审、仅纯数据序列化或生成配置适合快照、视觉回归用 Playwright 截图或 Percy/Chromatic）；⑪何时该上 Playwright/Cypress（JSDOM 无法真实布局/CSS 动画/滚动/拖放/iframe/下载/跨域，用 Playwright CT 或 E2E）；⑫覆盖率目标（纯工具>=90%、自定义 hooks>=85%、展示组件>=80%、容器组件>=70%、页面走 E2E+冒烟）；⑬反模式（querySelector 绕过可访问性查询、断言渲染次数、mock React、默认 mock 子组件、忽视 act 警告、跨测共享可变状态）；TDD 流程：RED→GREEN→REFACTOR→REPEAT；新组件：①定义 prop 类型与签名 ②写最简首测 ③确认因正确原因失败 ④实现刚好通过 ⑤加下一例 ⑥第三相似测试显模式时重构
- **依赖**：React Testing Library、Vitest 或 Jest、MSW（mock HTTP）、jest-axe 或 vitest-axe（axe 断言）、@tanstack/react-query（Provider 示例）、Playwright 或 Cypress（E2E/CT）、关联 skill：react-patterns、accessibility、e2e-testing、tdd-workflow；引用 rules/react/testing.md；Agents：react-reviewer、tdd-guide；Commands：/react-test、/react-review
- **说明**：ECC 原生。对应命令 /react-test。核心立场：测用户可见行为而非实现细节。强调 `onUnhandledRequest:'error'` 让未 mock 请求显式失败、QueryClient 在 wrapper 外实例化避免 flaky、JSDOM 局限明确（无真实 CSS 引擎、无 flexbox/grid/动画），视觉对比归属 Playwright/Percy/Chromatic

### react-native-patterns
- **执行步骤**：正文以分域清单给出，含：①核心概念：项目结构（Expo Router 文件式路由，`app/` 路由文件保持瘦，逻辑放 `components/` 或 `features/`）；②导航——校验路由 params（深度链接与动态路由投递不可信字符串，用 Zod 校验后再用，失败 `router.replace('/not-found')`）；③状态分层（server state 用 TanStack Query/SWR、client/UI state 用 Zustand/Jotai/Context、route/navigation state 用 Expo Router params、form state 用 React Hook Form + schema、secrets/tokens 用 `expo-secure-store`、非敏感持久化用 AsyncStorage/MMKV，优先本地 useState 直到确需共享）；④数据获取（用 server-cache 库而非 fetch-in-useEffect、边界处用 Zod 校验、从 schema 推导类型、显式处理 loading/error/empty）；⑤列表（`FlatList` 虚拟化配 memoized renderItem 与稳定 keyExtractor、`initialNumToRender`/`windowSize`，大型/异构列表用 Shopify `FlashList`）；⑥样式（`StyleSheet.create()` 或 NativeWind 二选一、热路径禁止内联 style 对象）；⑦原生 API（Expo SDK 调用与订阅包进 `use*` hooks、`active` 标志位避免卸载后 setState、按 status 而非 coords 区分 loading/denied/granted）；⑧安全存储（`expo-secure-store` 存 token，Keychain/Keystore 后端）；正文给出完整 screen 示例（route→query→list→states）与 React Hook Form+Zod resolver 表单示例；反模式与最佳实践：禁止 ScrollView 映射大数组、禁止 server 数据拷进 client store、禁止 AsyncStorage 存 token、禁止信任 deep-link params、禁止热路径内联样式、禁止 bundle 内嵌真实密钥；最佳实践：路由文件瘦、所有外部输入经 Zod 校验、TanStack Query 持有 server state、恒渲染 loading/error/empty、列表虚拟化、`react-native-reanimated` 做 UI 线程动画、token 进 secure-store、尊重 safe area/Dynamic Type/a11y roles、发版前确认 New Architecture 兼容
- **依赖**：Expo（含 Expo Router、EAS、expo-* 模块）、TanStack Query、Zod、React Hook Form（+@hookform/resolvers）、NativeWind 或 StyleSheet、FlatList/FlashList（Shopify）、expo-location、expo-secure-store、AsyncStorage/MMKV、Zustand 或 Jotai；关联 skill：frontend-patterns、coding-standards、tdd-workflow、e2e-testing、security-review；配合 rules/react-native/ 规则集；测试用 Jest + React Native Testing Library，Maestro/Detox 做 RN E2E
- **说明**：ECC 原生。假定 managed Expo workflow 与 New Architecture（SDK 55+ 默认且强制）。明确 libraries 仅作示例（NativeWind/Zustand/Jotai/TanStack Query），模式重于具体包。注意：react-patterns 文档曾称该 skill “尚未存在”，此说明已滞后，实际本 skill 完整存在

### vite-patterns
- **执行步骤**：正文以分域清单给出，含：①原理（dev 原生 ESM 按需转换、build 用 Rolldown v7+ 或 Rollup v5–v6 打包+tree-shake+code-split+Oxc 压缩、依赖预打包经 esbuild 转 ESM 缓存到 `node_modules/.vite`、插件 dev 与 build 共享接口、env 静态内联 `VITE_` 前缀公开）；②配置结构（基础 `defineConfig`、条件 config 用 `({command,mode})=>{}`、`loadEnv`、关键选项表 root/base/envPrefix/build.outDir/build.minify/build.sourcemap）；③插件（必备表：@vitejs/plugin-react-swc 默认 React、plugin-react 仅需 Babel 时、plugin-vue、vite-plugin-checker TypeScript 类型检查缺口、vite-tsconfig-paths、vite-plugin-dts、vite-plugin-svgr、rollup-plugin-visualizer、vite-plugin-pwa；关键提醒：`vite build` 仅转译不类型检查，须加 vite-plugin-checker 或 CI 跑 `tsc --noEmit`；自定义插件用 name/enforce/apply/transform、虚拟模块 `\0` 前缀、`hotUpdate` 替代 v7+ 弃用的 `handleHotUpdate`）；④HMR API（`import.meta.hot` 仅自定义 store/dev tools 用，`.data` 必须 mutate 不能 reassign，全部 HMR 代码会被生产构建 tree-shake）；⑤环境变量（`.env` 加载顺序、仅 `VITE_` 暴露客户端、`import.meta.env` 内置 MODE/BASE_URL/DEV/PROD/SSR、config 内用 loadEnv）；⑥安全（`VITE_` 前缀不是安全边界会被内联进 bundle、`loadEnv('')` 陷阱会暴露全部 env、生产 sourcemap 泄漏源码默认关闭、.gitignore 含 `.env.local`/`dist/`/`node_modules/.vite`）；⑦Server Proxy（字符串简写与对象配置、`changeOrigin`/`rewrite`、WebSocket 加 `ws:true`）；⑧构建优化（manualChunks 对象/函数形式、避免 barrel 文件、显式 import 扩展名、`server.warmup.clientFiles` 预热、`vite --profile` + Speedscope 定位慢插件）；⑨Library Mode（types 不自动发需 vite-plugin-dts 或 `tsc --emitDeclarationOnly`、peer deps 必须 external）；⑩SSR externals（`ssr.external`/`noExternal`/`target`）；⑪依赖预打包（optimizeDeps.include/exclude/force）；⑫常见坑（dev≠build 用 `vite build && vite preview` 验证、部署后旧 chunk 失效需保留或路由捕获重载、容器需 `server.host:true`、monorepo 需 `server.fs.allow`）；反模式：envPrefix:'' 暴露全部 env、用 require()、按包名一刀切 manualChunks 产生数百小文件、library 模式不 external 导致重复 runtime、用弃用 esbuild minifier、reassign `import.meta.hot.data`；流程反模式：把 `vite preview` 当生产服务器、指望 `vite build` 类型检查、默认装 @vitejs/plugin-legacy、手撸 30+ resolve.alias 重复 tsconfig paths、依赖变更后不清 `node_modules/.vite` 缓存
- **依赖**：Vite 8+、Rolldown（v7+）或 Rollup（v5–v6）、esbuild（预打包）、Oxc（压缩）、@vitejs/plugin-react 或 plugin-react-swc、@vitejs/plugin-vue、vite-plugin-checker、vite-tsconfig-paths、vite-plugin-dts、vite-plugin-svgr、rollup-plugin-visualizer、vite-plugin-pwa、vite-plugin-inspect、Speedscope（性能分析）；关联 skill：frontend-patterns、docker-patterns、nextjs-turbopack
- **说明**：ECC 原生。Vite 8+ 文档（build.minify 默认 `'oxc'`、`build.rolldownOptions`）。信息密度高、覆盖最全的一档。三个最关键提醒：`vite build` 不做类型检查、`VITE_` 不是安全边界（密钥必须服务端）、`vite preview` 不是生产服务器

### vue-patterns
- **执行步骤**：正文以分域清单给出，含：①项目结构（feature-first、PascalCase.vue 组件、useCamelCase.ts composables、camelCase.ts 工具/API/types、kebab-case 路由段）；②组件架构（`<script setup lang=ts>` 顺序：imports→props/emits/slots→composables→local state→computed→methods→watchers→lifecycle；容器 vs 展示组件；Props 用 `withDefaults(defineProps<Props>(),{...})`、布尔 prop 命名 isXxx/hasXxx/canXxx、不直接改 props；Events 用 `defineEmits<{...}>()`、模板 kebab-case 脚本 camelCase）；③Composables（use 前缀、返响应式值、`MaybeRef`/`toRef`/`toValue` 接受响应式输入、`onUnmounted` 或 watcher `onCleanup` 清理、无模块级副作用、完全取代 Vue 2 mixins）；④状态管理（local ref/reactive、props+emits、provide/inject、Pinia、server state composable；Setup Store 优先、actions 做业务变更、`$patch` 分组、每个 async action 处理 loading+success+error）；⑤Vue Router（lazy `() => import(...)`、`props:true` 传参、`beforeEach` 守卫、`useRoute` + computed + watch 处理响应式 params）；⑥模板模式（v-if/v-else-if/v-else、v-show 频繁切换、v-for 配稳定 key、computed 过滤而非 v-if+v-for 同元素、`@submit.prevent`、v-model 与多 v-model 绑定）；⑦性能（v-memo/v-once、shallowRef/shallowReactive、v-show 优于 v-if、`<KeepAlive :max>`、lazy routes、Suspense）；⑧测试（Vitest + Vue Test Utils + @pinia/testing + Playwright，组件测试模式含 setActivePinia/mount/trigger/emitted）；⑨Nuxt 专属（auto-imports、useAsyncData/useFetch 配稳定 key、server routes 用 defineEventHandler + z 校验、runtimeConfig 区分 server-only 与 public）；⑩Vue 3.5+ 新 API（响应式 props 解构、`useTemplateRef()`、`onWatcherCleanup()`、`useId()`、`<Teleport defer>`、`hydrateOnVisible()`）；反模式表：Vue<3.5 解构 defineProps 丢响应式、Vue 3.5+ 对解构 prop 直接 watch 编译报错需 getter 包装、v-if+v-for 同元素、v-for 用 index 作 key、改 props、v-html 用户内容致 XSS、Vue 3 用 mixins、composable 模块级副作用、可替换状态用 reactive（应用 ref）、watcher 无清理、新代码用 Options API、模板引用用 plain ref
- **依赖**：Vue.js 3、Pinia、Vue Router、Nuxt（可选）、Vite、Vitest、Vue Test Utils、@pinia/testing、Playwright、Zod（server routes 校验）、关联 skill：accessibility、frontend-patterns、typescript、coding-standards
- **说明**：ECC 原生。frontmatter `origin` 字段缺失（其他 ECC skill 标注 origin: ECC，此 skill 无，归 ECC 但需留意）。文档详尽且分 10 节 + 反模式表，覆盖 Vue 3.5+ 最新 API。强调 Setup Store 优于 Options Store、composables 完全替代 mixins、`<script setup>` 为新代码默认

## 十四（4）系统编程·PHP·.NET·移动·Laravel（18 个）

Rust/Go/C++ 模式与测试、C#/.NET/F# 测试、Perl 三件套（patterns/security/testing）、Laravel 四件套 + 插件发现、Dart/Flutter 模式——其余语言/框架生态。

### cpp-coding-standards
- **执行步骤**：正文以规则清单+DO/DON'T 示例给出，跨切面原则含：①RAII everywhere ②不可变优先 ③类型安全 ④表达意图 ⑤最小化复杂度 ⑥值语义优先；分章节覆盖 Philosophy/Interfaces（P.*/I.*）、Functions（F.*）、Classes（C.*）、Resource（R.*）、Expressions（ES.*）、Error Handling（E.*）、Constants（Con.*）、Concurrency（CP.*）、Templates（T.*）、Standard Library（SL.*）、Enumerations（Enum.*）、Source/Naming（SF.*/NL.*）、Performance（Per.*）；末尾附 Quick Reference Checklist
- **依赖**：C++ Core Guidelines（isocpp.github.io）、智能指针（unique_ptr/shared_ptr）、C++ Concepts、std::mutex/condition_variable、<concepts>/<ranges> 标准库；自包含
- **说明**：来源 ECC；非 C++ 项目或无法采用现代特性的遗留 C/嵌入式裸金属场景不适用（需按硬件约束裁剪）

### cpp-testing
- **执行步骤**：正文以流程+示例给出：核心概念（TDD red→green→refactor、Isolation、tests/unit/integration/testdata 布局、Mocks vs Fakes、gtest_discover_tests、CI 先子集后全量）；含 1)RED 写失败测试 2)GREEN 最小改动通过 3)REFACTOR 清理保持绿；Debugging Failures：单测重跑→加日志→开 sanitizers→扩展到全量；Coverage（GCC gcov/lcov、Clang llvm-cov）；Sanitizers（ASan/UBSan/TSan）；Flaky 防护（禁用 sleep、唯一临时目录、确定性种子）；可选 Fuzzing/Property（libFuzzer/RapidCheck）
- **依赖**：GoogleTest、GoogleMock、CMake、CTest、FetchContent、sanitizers（ASan/UBSan/TSan）、lcov/genhtml、llvm-cov/llvm-profdata、可选 libFuzzer/RapidCheck、Catch2/doctest 为替代品；自包含
- **说明**：来源 ECC；不适用于非测试相关的产品功能开发、大规模重构、性能调优或非 C++ 项目

### csharp-testing
- **执行步骤**：正文以示例集给出，覆盖：①单元测试结构（Arrange-Act-Assert）②参数化 Theory（InlineData/MemberData/TheoryData）③NSubstitute 模拟（Returns/Received 验证）④ASP.NET Core 集成测试（WebApplicationFactory + 内存数据库替换）⑤Testcontainers（真实 Postgres 容器）⑥测试目录组织⑦Test Data Builders 模式⑧常见反模式与修复表；运行命令 dotnet test / --collect:XPlat Code Coverage / --filter / watch test
- **依赖**：xUnit、FluentAssertions、NSubstitute 或 Moq、Testcontainers、WebApplicationFactory、Bogus、EF Core InMemory、dotnet CLI；自包含
- **说明**：来源 ECC；与 dotnet-patterns、fsharp-testing 共享 WebApplicationFactory/Testcontainers 基础设施

### dotnet-patterns
- **执行步骤**：正文以模式集给出，含：①核心原则（不可变优先、Explicit Over Implicit、依赖抽象）②Async/Await 模式（全链路 async、CancellationToken、Task.WhenAll 并发、禁止 .Result/.Wait()）③Options Pattern ④Result 模式（成功/失败显式返回）⑤Repository + EF Core（AsNoTracking）⑥中间件管道⑦Minimal API + 路由分组⑧Guard Clauses 早返回；附反模式表（async void、catch(Exception){}、new Service()、可变 static 状态等）
- **依赖**：.NET DI 容器、ASP.NET Core、EF Core、async/await、CancellationToken、IOptions<T>、records / init-only 属性、Minimal API；自包含
- **说明**：来源 ECC；配套 csharp-testing（测试）与 fsharp-testing（F# 同生态）

### fsharp-testing
- **执行步骤**：正文以示例集给出，覆盖：①xUnit + FsUnit 基本断言②Unquote 断言（test <@ ... @>，失败信息含完整表达式）③async 测试（task { ... }）④Theory 参数化⑤FsCheck 属性测试（[<Property>]、自定义 Generators/Arb）⑥函数式桩（createTestDeps 函数对象）+ NSubstitute 双轨⑦ASP.NET Core 集成测试（WebApplicationFactory）⑧目录组织⑨反模式表（不可变共享状态、Thread.Sleep、忽略 CancellationToken、跳过属性测试）
- **依赖**：xUnit、FsUnit.xUnit、Unquote、FsCheck.xUnit、NSubstitute、Testcontainers、WebApplicationFactory、dotnet CLI；自包含
- **说明**：来源 ECC；关联 dotnet-patterns、csharp-testing；共享 WebApplicationFactory/Testcontainers 设施

### golang-patterns
- **执行步骤**：正文以模式集给出，含：①核心原则（简洁清晰、让零值可用、Accept Interfaces Return Structs）②错误处理（fmt.Errorf %w 包装、自定义错误类型、哨兵错误、errors.Is/As、永不忽略错误）③并发（Worker Pool、Context 超时取消、Graceful Shutdown、errgroup、防 goroutine 泄漏）④接口设计（小而聚焦、消费方定义、类型断言可选行为）⑤包组织（cmd/internal/pkg/testdata 标准布局、命名、避免包级状态）⑥struct 设计（Functional Options、Embedding 组合）⑦性能（预分配 slice、sync.Pool、strings.Builder）⑧工具（go vet/staticcheck/golangci-lint、.golangci.yml 配置）⑨Go Idioms 速查表与反模式
- **依赖**：go build/test/vet/mod、gofmt/goimports、staticcheck、golangci-lint、sync（Mutex/WaitGroup/Pool）、context、errgroup（golang.org/x/sync）、strings.Builder；自包含
- **说明**：来源 ECC；配套 golang-testing（测试）；反模式含 panic 做控制流、context 放 struct、混用值/指针 receiver

### golang-testing
- **执行步骤**：正文以流程+示例给出：1)RED 写失败测试 2)GREEN 最小实现 3)REFACTOR；覆盖：①Table-Driven Tests（含错误用例）②Subtests（t.Run 组织、t.Parallel 并行）③Test Helpers（t.Helper、t.Cleanup、t.TempDir）④Golden Files（testdata + -update 标志）⑤接口型 Mocking ⑥Benchmarks（b.N、b.ResetTimer、不同规模、内存分配对比）⑦Fuzzing（Go 1.18+，f.Add 种子语料、f.Fuzz 属性验证）⑧覆盖率（go test -coverprofile、go tool cover -html/-func、目标分级）⑨HTTP Handler 测试（httptest）⑩测试命令清单与 CI 集成（GitHub Actions + race + 覆盖率阈值）
- **依赖**：Go testing 包、reflect、httptest、testing.B、Go 1.18+ fuzzing、go test -race/-cover/-bench、go tool cover、mockgen；自包含
- **说明**：来源 ECC；配套 golang-patterns（模式）；覆盖率目标：关键业务 100%、公共 API 90%+、通用代码 80%+；禁用 time.Sleep，改用 channel/condition

### perl-patterns
- **执行步骤**：正文以模式集+现代替换表给出，含：①核心原则（use v5.36 取代 strict/warnings/feature 老 boilerplate、子程序签名、上下文敏感、Postfix 解引用、isa 运算符）②错误处理（eval/die、Try::Tiny、原生 try/catch 5.40+）③现代 OO（Moo 优先、Moo::Role、原生 class 关键字 5.38+ Corinna）④正则（命名捕获+/x、预编译模式）⑤数据结构（引用安全深访问、Hash/Array slices、for_list 5.36 实验）⑥文件 I/O（三参 open + autodie、Path::Tiny）⑦模块组织（lib/bin/t/cpanfile 布局、Exporter）⑧工具（perltidy/perlcritic/cpanfile+carton）⑨现代 vs 遗留替换速查表与反模式
- **依赖**：Perl 5.36+、Moo（Types::Standard）、Moose、Path::Tiny、Try::Tiny、JSON::MaybeXS、autodie、cpanfile + carton、perltidy、perlcritic、namespace::autoclean；自包含
- **说明**：来源 ECC；三件套之模式篇，配合 perl-security、perl-testing；反模式含两参 open、间接对象语法 new Foo、no strict 'refs'、字符串 eval 加载模块

### perl-security
- **执行步骤**：正文以清单+安全清单表给出：①Taint Mode（-T 启用、严格 untaint 正则、PATH 清理）②输入校验（Allowlist 优先于 Blocklist、长度约束）③安全正则（ReDoS 防护、possessive 量词/atomic group、alarm 超时）④安全文件操作（三参 open、TOCTOU 防护、sysopen O_EXCL、realpath 防路径穿越、File::Temp/flock）⑤安全进程执行（列表式 system/exec、IPC::Run3、禁用字符串/反引号）⑥SQL 注入防护（DBI placeholders、列名 allowlist、DBIx::Class）⑦Web 安全（HTML::Entities 编码、URI::Escape、CSRF token、Session/Header 加固）⑧CPAN 模块安全⑨perlcritic 安全策略配置
- **依赖**：Perl taint mode（-T）、DBI、HTML::Entities、URI::Escape、JSON::MaybeXS、IPC::Run3、Capture::Tiny、File::Spec、Cwd::realpath、Fcntl、Crypt::URandom、File::Temp、perlcritic（security 策略）、DBIx::Class；自包含
- **说明**：来源 ECC；三件套之安全篇，配合 perl-patterns、perl-testing；末尾 Quick Security Checklist 15 项；反模式含两参 open、字符串 system、SQL 字符串插值、eval 用户输入、原始 HTML 输出

### perl-testing
- **执行步骤**：正文以流程+示例给出：TDD Workflow（1)RED 写失败测试 2)GREEN 最小实现 3)REFACTOR，prove -lv 运行）；覆盖：①Test::More 基础断言（is/ok/is_deeply/like/isa_ok/can_ok、SKIP/TODO）②Test2::V0 现代（hash/array/bag builder 深比较、subtest、dies/lives 异常测试）③组织与 prove（t/ 目录结构、prove -l/-lv/-j8/--state=failed/.proer c 配置）④Fixtures（subtest 隔离、tempdir CLEANUP、共享 TestHelper）⑤Mocking（Test::MockModule 自动恢复、禁用裸 monkey-patch、Test::MockObject 轻量双工）⑥Devel::Cover 覆盖率（cover -test、HTML 报告、阈值门禁）⑦集成测试（内存 SQLite、mock HTTP::Tiny）；附 DO/DON'T 与速查表
- **依赖**：Test2::V0、Test::More（核心）、prove、TAP::Formatter::JUnit、Devel::Cover、Test::MockModule、Test::MockObject、File::Temp、Path::Tiny、DBI（SQLite :memory:）；cpanfile test 依赖；自包含
- **说明**：来源 ECC；三件套之测试篇，配合 perl-patterns、perl-security；新项目优先 Test2::V0，目标覆盖率 80%+；常见坑：忘记 done_testing、漏 -l 标志、过度 mock、subtest 间共享 our 状态

### dart-flutter-patterns
- **执行步骤**：正文以 10 类模式集给出，How It Works 列 9 条原则：1)Null safety（避免 !，用 ?./??/模式匹配）2)不可变状态（sealed classes、freezed、copyWith）3)Async 组合（Future.wait、await 后查 mounted）4)Widget 架构（提取为类而非方法、const 传播、scoped rebuilds）5)状态管理（BLoC/Cubit events、Riverpod notifier 与 derived provider）6)导航（GoRouter + refreshListenable 响应式 auth guard）7)网络（Dio interceptor、token 一次性重试守卫）8)错误处理（全局捕获、ErrorWidget.builder、crashlytics）9)测试（BLoC test、ProviderScope override、fakes 优于 mocks）
- **依赖**：Dart 3 / Flutter、BLoC/Cubit、Riverpod（@riverpod）、Provider、GoRouter、Dio、Freezed（freezed_annotation + 代码生成）、Crashlytics、collection 包（firstWhereOrNull）；关联 flutter-dart-code-review skill、rules/dart/
- **说明**：来源 ECC；关联 skill：flutter-dart-code-review、rules/dart/；关键风险点：await 后 BuildContext 失效（须查 mounted）、Dio 401 重试须防无限循环（_isRetry 守卫）

### laravel-patterns
- **执行步骤**：正文以模式集给出，How It Works 列 5 条边界原则：①controller->service/action->model 分层②显式与 scoped binding 保持路由可预测（仍须授权）③typed model/cast/scope 保持领域一致④IO 重活进队列、热点读缓存⑤config 集中、环境显式；示例覆盖：推荐目录布局、Controllers->Services->Actions、路由模型绑定（scoped 防跨租户）、嵌套路由命名、Service Container 绑定、Eloquent 模型配置（fillable/casts/scope）、自定义 Cast 与值对象、Eager Loading 防 N+1、Query Object 复杂过滤、Global Scope 与 SoftDeletes、Query Scope 复用、事务、迁移命名约定、Form Request 校验+toDto、API Resource 一致响应、Events/Jobs/Queues、Caching、配置与多环境
- **依赖**：Laravel 框架（Eloquent、FormRequest、Resource、Sanctum 中间件、Route::scopeBindings/apiResource、DB::transaction、SoftDeletes）、队列/事件/缓存子系统；自包含
- **说明**：来源 ECC；Laravel 四件套之模式篇，配合 laravel-security、laravel-tdd、laravel-verification；同一过滤器勿同时用 global scope 与 named scope（除非有意分层）

### laravel-plugin-discovery
- **执行步骤**：正文以流程+示例给出：①MCP Requirement（配置 laraplugins MCP server 到 ~/.claude.json，免 API key）②MCP 工具 SearchPluginTool（按 keyword/health_score/laravel_compatibility/php_compatibility/vendor_filter/page 过滤）与 GetPluginDetailsTool（取包详情、含 include_versions）③Finding Packages 流程：SearchPluginTool→按 health/Laravel/PHP 版本过滤→审结果④Evaluating Packages：GetPluginDetailsTool→查 health score/最后更新/版本支持/供应商声誉⑤Checking Compatibility：按 laravel_compatibility 过滤或取详情看支持版本矩阵；附过滤最佳实践表（Healthy 优先、匹配 Laravel 版本、组合过滤）、响应字段解读、5 类常见用例对照
- **依赖**：LaraPlugins.io MCP server（HTTP，url: `https://laraplugins.io/mcp/plugins`，免 API key）、SearchPluginTool、GetPluginDetailsTool；关联 laravel-patterns、laravel-tdd、laravel-security、documentation-lookup（Context7）
- **说明**：来源 ECC；需先在 ~/.claude.json mcpServers 配置 laraplugins；生产项目强制 health_score: "Healthy"；Laravel 版本 13=最新、12=稳定

### laravel-security
- **执行步骤**：正文以清单+checklist 表给出，覆盖：①Production 配置（APP_DEBUG=false、APP_KEY 校验、.env 安全、HTTPS 强制、trusted_proxies 精确 IP 段）②认证（Sanctum token + abilities、密码 bcrypt/Argon2id 强度、登录限流、Session 登录 regenerate/登出 invalidate）③授权（Gate::define/before 超管、Policy CRUDX 方法、middleware can:、自定义 CheckRole）④Eloquent 安全（$fillable 白名单禁用 $guarded=[]、SQL 注入防护-Eloquent/QueryBuilder 自动参数化禁 whereRaw 拼接、Attribute Casting、$hidden 敏感字段、Model::preventLazyLoading）⑤CSRF（@csrf、VerifyCsrfToken except 仅 webhook、JS meta token）⑥XSS（Blade 自动转义、{!! !!} 仅可信内容、HTMLPurifier 白名单、@js/@json JS 上下文、SecurityHeaders 中间件 CSP/X-Frame/X-Content-Type）⑦输入校验（FormRequest、StrongPassword/NotBlacklistedDomain 自定义 Rule）⑧API 安全（限流 throttle:api/auth、Sanctum vs Passport 选型、CORS 白名单）⑨文件上传（mimes/extension/dimensions、私有 disk、签名 URL）⑩依赖与密钥（composer audit、密钥 boot 校验、 Secrets Manager）⑪队列安全（ShouldBeEncrypted、RateLimited middleware、retryUntil）⑫安全事件审计日志
- **依赖**：Laravel Sanctum、Passport（OAuth2）、Jetstream、Breeze、Gate/Policy、VerifyCsrfToken、FormRequest、Eloquent、HTMLPurifier（ezyang/htmlpurifier）、RateLimiter、ShouldBeEncrypted、composer audit；关联 laravel-patterns、laravel-tdd、backend-patterns
- **说明**：来源 ECC；Laravel 四件套之安全篇；末尾 15 项 Quick Security Checklist；关键红线：APP_DEBUG 生产禁 true、禁用 $guarded=[]、禁 $request->all()、禁 raw SQL 拼接

### laravel-tdd
- **执行步骤**：正文以流程+示例给出：TDD Red-Green-Refactor 循环；覆盖：①Setup（phpunit.xml env 池：DB :memory: sqlite/QUEUE sync/MAIL array、Base TestCase actingAsUser/actingAsAdmin helper）②Model Factories（definition/admin/unverified/outOfStock state、has 关联、sequence 序列）③Model 测试（RefreshDatabase、敏感字段隐藏、scope 过滤、belongs_to）④Feature/HTTP 测试（guest 重定向、store 校验、assertSessionHasErrors、跨用户 403）⑤JSON API 测试（assertJsonCount/assertJsonStructure/assertCreated）⑥Sanctum 认证测试（register/login、createToken plainTextToken、withToken）⑦Mocking/Fakes（Http::fake + sequence、Mail/Notification/Queue/Storage/Event::fake）⑧Artisan 命令测试（expectsOutput/assertExitCode）⑨授权测试（own/other post、Gate before 超管）⑩Pest 写法（uses/beforeEach/it）；覆盖率目标分级表与 PHPUnit/Pest 命令
- **依赖**：Laravel 测试框架、PHPUnit、Pest、Laravel factories（Factory state）、RefreshDatabase、Sanctum（createToken/abilities）、Http/Mail/Notification/Queue/Event/Storage Facades fake、UploadedFile::fake、XDEBUG_MODE=coverage；关联 laravel-patterns、laravel-security、tdd-workflow、backend-patterns
- **说明**：来源 ECC；Laravel 四件套之 TDD 篇；覆盖率目标 Models 95%+、Actions/Services/Form Requests 90%+、Controllers 85%+、Policies 95%+、总体 80%+；勿测框架内部、勿测私有方法、勿耦合 HTML 结构

### laravel-verification
- **执行步骤**：正文以 7 阶段流水线给出：1)Phase 1 环境检查（php -v / composer --version / artisan --version、.env 存在、APP_DEBUG=false、APP_ENV 匹配，Sail 用 ./vendor/bin/sail）2)Phase 1.5 Composer 与 Autoload（composer validate、dump-autoload -o）3)Phase 2 Lint 与静态分析（pint --test、phpstan analyse，可选 psalm）4)Phase 3 测试与覆盖率（php artisan test，CI 加 XDEBUG_MODE=coverage --coverage）5)Phase 4 安全与依赖（composer audit）6)Phase 5 数据库与迁移（migrate --pretend、migrate:status、命名 Y_m_d_His_*、down() 可回滚）7)Phase 6 构建与部署就绪（optimize:clear、config/route/view:cache、storage 与 bootstrap/cache 可写、queue worker/scheduler 配置）8)Phase 7 队列与调度（schedule:list、queue:failed、Horizon:status、queue:monitor、staging 派发 healthcheck job + queue:work --once 验证副作用）；附 minimal flow 与 CI pipeline 脚本
- **依赖**：Laravel artisan CLI、composer（validate/dump-autoload/audit）、Laravel Pint（pint --test）、PHPStan（或 Psalm）、Xdebug（XDEBUG_MODE=coverage）、Laravel Sail（可选）、Laravel Horizon（可选）、queue:work/schedule:list；自包含
- **说明**：来源 ECC；Laravel 四件套之验证篇；原则：环境/Composer 失败立即终止、lint 通过再跑全量测试、迁移与部署就绪为最终门禁；staging 才能跑 queue:work --once 健康检查

### rust-patterns
- **执行步骤**：正文以 6 大领域模式集给出（How It Works 概述）：①所有权与借用（传引用而非 clone、Cow 灵活所有权）②错误处理（Result + ? 永不生产 unwrap、库用 thiserror 结构化错误、应用用 anyhow 灵活错误、Option 组合子优于嵌套 match）③枚举与模式匹配（状态建模、穷尽匹配禁用业务 catch-all）④trait 与泛型（Accept Generics Return Concrete、trait object 动态分发、Newtype 类型安全）⑤struct 建模（Builder 模式）⑥迭代器与闭包（链式优于手动循环、collect 多类型、Result collect 短路）⑦并发（Arc<Mutex<T>>、mpsc 有界 channel、Tokio async + 超时 + spawn 并发任务）⑧unsafe 准入（FFI 边界 + Safety 注释、性能关键 + 正确性证明；禁绕 borrow checker/无注释/transmute）⑨模块与 crate 结构（按领域而非类型组织、pub(crate) 最小暴露、lib.rs 再导出）⑩工具（cargo build/check/clippy/fmt、test、audit、tree、bench）；附 Rust Idioms 速查表与反模式
- **依赖**：cargo（build/check/clippy/fmt/test/audit/tree/bench）、thiserror、anyhow、tokio、reqwest、std::sync（Arc/Mutex/mpsc）、Cow、Concepts/trait bounds；自包含
- **说明**：来源 ECC；配套 rust-testing（测试）；反模式：生产 unwrap、盲目 clone 满足 borrow checker、String 替代 &str、库用 Box<dyn Error>、忽略 must_use 警告、async 内 std::thread::sleep 阻塞执行器

### rust-testing
- **执行步骤**：正文以流程+示例给出（How It Works 7 步：识别目标代码→写测试 #[cfg(test)]/rstest/proptest→mockall 隔离→RED 验证失败→GREEN 最小实现→REFACTOR→cargo-llvm-cov 覆盖率 80%+）；覆盖：①TDD（todo!() 占位 → 实现）②单元测试（mod tests + #[cfg(test)]、断言宏 assert_eq!/assert_ne!/assert!/matches!、浮点 EPSILON）③错误与 panic 测试（Result 返回、#[should_panic(expected)]）④集成测试（tests/ 目录、每文件独立 binary、common/ 共享）⑤async 测试（#[tokio::test]、timeout）⑥参数化 rstest（#[case]、#[fixture]）⑦proptest 属性测试（proptest! 宏、自定义 Strategy、roundtrip/排序不变量）⑧mockall（#[automock]、expect_* 链式断言）⑨Doc Tests（``` 代码块可执行、no_run、# Errors 段）⑩Criterion 基准（black_box、criterion_group/main、html_reports）⑪覆盖率（cargo-llvm-cov --html/--lcov/--fail-under-lines 80）⑫命令清单与 CI 集成（fmt --check、clippy -D warnings、cargo test、taiki-e/install-action）
- **依赖**：cargo test、#[cfg(test)]、rstest（#[rstest]/#[fixture]）、proptest、mockall（#[automock]）、tokio::test、Criterion（dev-dependency，harness=false）、cargo-llvm-cov（cargo install）、dtolnay/rust-toolchain、taiki-e/install-action；自包含
- **说明**：来源 ECC；配套 rust-patterns（模式）；覆盖率目标同 golang：关键业务 100%、公共 API 90%+、通用 80%+、生成/FFI 排除；优先 Result::is_err() 而非 #[should_panic]、禁用 sleep（用 channel/barrier/tokio::time::pause）

## 十五（1）医疗合规与供应链运营（13 个）

医疗 CDSS/EMR 模式、HIPAA/PHI 合规、医疗评估门禁；供应链——承运商管理、关税合规、能源/库存/生产计划、质量与退货逆向物流。

### healthcare-cdss-patterns
- **执行步骤**：正文以模式集给出，含：①药物相互作用检查 checkInteractions(newDrug,currentMeds,allergies) 按严重度排序返回 InteractionAlert[]、要求交互对双向覆盖；②剂量校验 validateDose(drug,dose,route,weight,age,renalFunction) 按体重/年龄/肾功能调整，缺体重时阻断（不通过）；③NEWS2 评分 calculateNEWS2(vitals) 须严格匹配皇家内科医师学会规范；④告警分级（Critical 阻断不可关闭 modal/Major 内联警告需确认/Minor 提示）；⑤零容忍测试（交互对正反向、mg/kg 缺体重阻断、畸形数据不抛错），通过率须 100%
- **依赖**：CDSS 引擎须为纯函数无副作用；标准：NEWS2、qSOFA；集成：EMR 工作流；测试：Jest 风格
- **说明**：来源 Health1 Super Speciality Hospitals（Dr. Keyur Patel 贡献）。CDSS 属患者安全关键模块，对假阴性零容忍；关键告警禁止实现为 toast；override 原因须入审计；非临床决策，须人工复核

### healthcare-emr-patterns
- **执行步骤**：正文以模式集给出，含：①患者安全准则（药物相互作用必须告警、异常检验必须视觉标记、关键体征触发升级、无审计轨迹不得修改临床数据）；②单页就诊流（Sticky 患者头→主诉→HPI→查体→体征→ICD-10/SNOMED 诊断→用药→检查→计划→签字锁定）；③智能模板系统（chips/requiredFields/redFlags/icdSuggestions，红旗触发不可关闭告警）；④用药安全流（查当前+就诊药物+过敏→校验剂量→CRITICAL 阻断开方需 override→审计）；⑤锁定就诊模式（签字后只读，仅可加附录）；⑥无障碍（WCAG AA 4.5:1 对比度、44x44px 触控、键盘导航、非仅色、关键告警不自动消失）
- **依赖**：ICD-10、SNOMED 编码；CDSS 引擎（healthcare-cdss-patterns）；无障碍标准：WCAG AA
- **说明**：来源 Health1。禁忌：临床数据进 localStorage、可关闭 toast 用于关键告警、tab 式就诊 UI、编辑已签字就诊、any 类型用于临床数据

### healthcare-eval-harness
- **执行步骤**：正文以测试类别集给出，含：①CDSS 准确性（CRITICAL 100%）跑 tests/cdss 用 --bail --ci --coverage；②PHI 泄露（CRITICAL 100%）跑 tests/security/phi；③数据完整性（CRITICAL 100%）跑 tests/data-integrity（锁定就诊、审计条目、级联删除保护、并发编辑）；④临床工作流（HIGH 95%+）跑 tests/clinical 用 --json 计算通过率；⑤集成合规（HIGH 95%+）跑 tests/integration（HL7 v2.x 解析、FHIR 校验）；CRITICAL 三类任一失败即 BLOCK 部署
- **依赖**：测试框架：Jest（可适配 Vitest/pytest/PHPUnit）；标准：HL7 v2.x、FHIR；CI：GitHub Actions；工具：jq、bc、mktemp
- **说明**：来源 Health1。患者安全不可妥协：CRITICAL 类不得设低于 100%、不得 --no-bail、集成测试不得 mock CDSS、安全门红灯不得部署、CDSS 套件必须带 --coverage

### healthcare-phi-compliance
- **执行步骤**：正文以模式集给出，含：①数据分类（PHI=可识别+健康相关；PII=非患者敏感如员工/医生薪酬）；②访问控制行级安全 SQL（按 facility_id 限 staff_assignments 角色、审计表 INSERT-only 不可改删）；③审计轨迹结构 AuditEntry（timestamp/user/patient/action/resource/changes/ip/session）；④常见泄露向量（错误信息/console/URL 参数/浏览器存储/service_role key/日志监控）；⑤数据库 schema 打标（COMMENT ON COLUMN 标 PHI/PII）；⑥部署前检查清单（10 项：无 PHI 在错误/日志/URL/存储、RLS 启用、审计、会话超时、跨机构隔离）
- **依赖**：数据库：PostgreSQL RLS；认证：auth.uid()；标准：HIPAA、DISHA、GDPR；规范：使用不透明 UUID 而非病历号/身份证号
- **说明**：来源 Health1。多机构隔离是硬要求（A 机构医生不得见 B 机构患者，测试须验证返回 0 行）；service_role key 严禁入客户端代码；stack trace 须脱敏后再发错误追踪服务

### hipaa-compliance
- **执行步骤**：1)先调用 healthcare-phi-compliance 取具体实现规则；2)叠加 HIPAA 决策门（数据是否 PHI、主体是否覆盖实体或业务伙伴、供应商/模型提供商是否需先签 BAA、访问是否最小必要、读写导出是否可审计）；3)若影响患者安全/临床工作流/受监管生产架构则升级到 healthcare-reviewer
- **依赖**：关联 skill：healthcare-phi-compliance（主实现）、healthcare-reviewer（专业评审）、security-review（通用加固）、healthcare-emr-patterns、healthcare-eval-harness
- **说明**：来源 ECC direct-port adaptation，刻意保持精简规范。HIPAA 守则：PHI 永不入日志/分析事件/崩溃报告/prompt/客户端错误串；第三方面 SaaS/可观测性/支持工具/LLM 提供商默认阻断直至 BAA 状态明确；优先用不透明内部 ID

### carrier-relationship-management
- **执行步骤**：1)通过 FMCSA SAFER、保险核验、参考检查来源与审查承运商；2)用专线数据、货量承诺、评分标准结构化 RFP；3)拆解 line-haul/燃油/附加费/运力保证后逐项谈判；4)在 TMS 中建路由指南（主/备指派+自动 tender 规则）；5)用加权记分卡（准时 OTD、索赔比、tender 接受率、成本）追踪绩效；6)季度业务评审并按排名调整分配
- **依赖**：系统平台：TMS、费率管理、承运商上线门户、DAT/Greenscreens 市场情报、FMCSA SAFER 合规查询；监管：FMCSA §387.9（保险底线）、CSA BASICs
- **说明**：来源 ECC（evos author），license Apache-2.0。记分卡只追 5 项关键指标；资产承运商/经纪人合理配比 60-70%/20-30%；单一承运商单线占比不得 >40%；含承运商退出标准（OTD<85% 持续 60 天等）；非临床决策，需人工复核

### customs-trade-compliance
- **执行步骤**：1)按 GRI 规则与章/品目/子目分析做商品归类；2)确定适用税率、优惠程序（FTZ、drawback、FTA）与贸易救济；3)装运前对全部交易方做合并受限名单筛查；4)按各司法管辖区要求准备并校验报关单证；5)监控法规变更（关税修改、新制裁、贸易协定更新）；6)用主动披露与罚金缓释策略应对政府问询
- **依赖**：系统平台：ACE（US）、CHIEF/CDS（UK）、ATLAS（DE）、海关经纪门户、禁运筛查平台、ERP 贸易模块；标准：GRI、HS/WCO、Incoterms 2020、USMCA、EU-UK TCA、RCEP、AfCFTA、WTO 海关估价、19 USC §1592、19 CFR §162.74
- **说明**：来源 ECC，license Apache-2.0。罚款框架：疏忽 2× 未付税款、严重疏忽 4×、欺诈按商品国内价值；prior disclosure 是最强缓释工具（须在 CBP 启动调查前提交）；记录留存 US 5 年、EU 3 年；含 HS 归类/FTA 资格/估价方法/筛查命中等决策框架

### energy-procurement
- **执行步骤**：1)用 15 分钟间隔表计数据分析各设施负荷形态识别成本驱动；2)分析当前电价结构与优化机会（换档、参与需求响应）；3)按合适产品规格（固定/指数/块+指数/shape）结构化 RFP；4)用总能成本（容量/输电/辅助/风险溢价）而非仅 $/MWh 评估报价；5)签错期合同并分层对冲避免集中风险；6)监控市场持仓、触发事件再平衡、月度报告预算偏差
- **依赖**：系统平台：账单管理（Urjanet/EnergyCAP）、间隔数据 15 分钟 kWh/kW 分析、市场数据（ICE/CME/Platts）、采购平台（经纪人/聚合商/ISO 直连）；市场/标准：PJM、ERCOT、CAISO、NYISO、ISO-NE、MISO、SPP、LMP、GHG Protocol Scope 2、RE100、CDP、SBTi
- **说明**：来源 ECC，license Apache-2.0。Winter Storm Uri 教训：ERCOT 指数价客户单周 $1.5M+；分层采购是首要对冲手段（60-80% 对冲为佳）；VPPA 须 CFO/财务批准与 ISDA 协议；demand ratchet 陷阱（单次尖峰锁一年）；含 PPA/需求侧缓解 ROI/市场择时等决策框架

### inventory-demand-planning
- **执行步骤**：1)采集需求信号（POS 销量、订单、出货）并清洗离群值；2)按 ABC/XYZ 分类与需求形态选预测方法；3)叠加促销提升、相互蚕食抵消与外部因果因子；4)按需求波动、交付期波动与目标满足率计算安全库存；5)生成建议采购单、按 MOQ/EOQ 取整、提交计划员复核；6)监控预测准确率（MAPE/bias）并在下周期调整模型
- **依赖**：系统平台：需求预测套件（Blue Yonder/Oracle Demantra/Kinaxis）、ERP（SAP/Oracle）、WMS、POS 数据、供应商门户；方法：移动平均/指数平滑（Holt-Winters）/STL/因果回归/Croston/机器学习（LightGBM/XGBoost）
- **说明**：来源 ECC，license Apache-2.0。从 95%→99% 服务水平几乎翻倍安全库存，须先量化成本；交付期 CV>0.3 须比纯需求公式高 40-60%；新品用类比 SKU 画像+前 8 周 20-30% 缓冲；含预测方法选择/服务水平分段/促销提升/降价时点等决策框架

### production-scheduling
- **执行步骤**：1)用 OEE 数据与产能利用率识别系统约束（瓶颈）；2)按优先级分类需求：逾期/喂约束/其余；3)按产品组合用合适派工规则（EDD/SPT/setup-aware EDD）排序；4)用换型矩阵+最近邻启发式与 2-opt 优化换型顺序；5)锁定稳定窗口（24-48h）防已提交作业被搅动；6)中断时仅重排未锁作业并发布新排程到 MES
- **依赖**：系统平台：ERP（SAP PP/Oracle Manufacturing/Epicor）、有限产能排程（Preactor/PlanetTogether/Opcenter APS）、MES、CMMS 维护协调；方法/标准：TOC/DBR 鼓-缓冲-绳、SMED、OEE、heijunka、PPAP/MSA（IATF 关联）
- **说明**：来源 ECC，license Apache-2.0。约束资源 1 分钟损失=全厂 1 分钟损失；MRP 用无限产能+固定交付期，不可直接执行；WIP 堆积处未必是真约束（须用利用率+因果验证）；排程与车间实际偏差 >10% 即被忽视；含作业优先级/换型优化/中断重排/瓶颈识别等决策框架

### quality-nonconformance
- **执行步骤**：1)通过检验/SPC 告警/客户投诉检测不合格；2)立即隔离受影响物料（隔离区/生产暂停/停发）；3)按安全影响与监管要求分级（critical/major/minor）；4)用与复杂度匹配的结构化方法做根因调查；5)按工程评估/监管约束/经济性决定处置；6)实施纠正措施、验证有效性、用证据关闭 CAPA
- **依赖**：系统：eQMS（MasterControl/ETQ/Veeva）、SPC（Minitab/InfinityQS）、ERP（SAP QM/Oracle Quality）、CMM/计量；标准：FDA 21 CFR 820、IATF 16949、AS9100、ISO 13485、ISO 14971、ANSI/ASQ Z1.4/ISO 2859-1；方法：5-Why、Ishikawa 6M、FTA、8D、Western Electric 规则
- **说明**：来源 ECC，license Apache-2.0。FDA 最常引用 CAPA 缺陷；"人为错误"不是根因、"重新培训操作员"是最弱措施；CAPA 关闭须验证（已实施）+验证有效性（90 天/3 批/审核周期）；航空 use-as-is 须客户批准；含 NCR 处置/RCA 方法选择/CAPA 验证/检验级别调整等决策框架；需人工复核

### returns-reverse-logistics
- **执行步骤**：1)收退货请求并按退货政策（时间窗/状态/品类限制）校验资格；2)按物品价值与退货原因发 RMA（预付标签或自送）；3)退货中心收货检验并给定状态评级（A-D）；4)按回收经济性路由最优处置（上架 vs 清货 vs 报废）；5)按政策处理退款或换货、异常标记欺诈复核；6)聚合可向供应商追偿的退货并在合同窗口内提 RTV 索赔
- **依赖**：系统：OMS、WMS、RMS、CRM、欺诈检测平台、供应商门户；标准：FTC used-as-new、WEEE；渠道：B-Stock/DirectLiquidation/Bulq；法规：DOT 锂电池/危化品包装、duty drawback
- **说明**：来源 ECC，license Apache-2.0。退货欺诈美国零售年损 $24B+；评级 A-D 驱动处置（A 85-100% 回收，D 5-15%）；wardrobing/swap/serial returner/ORC 等欺诈模式有对应对策；含欺诈评分模型/处置路由矩阵/供应商追偿 ROI 等决策框架；Hazmat 与召回品须走专项流程，非标准退货

### logistics-exception-management
- **执行步骤**：1)按类型（delay/damage/loss/shortage/refusal）与严重度分类异常；2)按分类与财务暴露应用对应解决工作流；3)按承运商特定要求与申报截止日期归档证据；4)按经过时间与金额阈值分级升级；5)在法定窗口内提交索赔、谈判和解、追踪回收
- **依赖**：系统平台：TMS、WMS、承运商门户、理赔管理平台、ERP 订单管理；标准/法规：Carmack 修正案（49 USC §14706，9 个月申报期）、COGSA、Hague-Visby、Montreal Convention（空运 14 天损坏/21 天延误通知）；工具：Sensitech/Emerson 温度记录器
- **说明**：来源 ECC，license Apache-2.0。异常分类法含 11 类（隐藏损坏须 5 天内申报、温度损坏需连续记录）；承运商响应 30 天确认/120 天赔付；按方式理解承运商行为（LTL 30-60 天理赔、空运最快、海运 $500/包限责）；含严重度分级/成本吸收 vs 索赔/优先级排序等决策框架；峰值季异常率升 30-50%

## 十五（2）金融·预测市场·Web3·ML·其它垂直（21 个）

融资材料与触达、计费/财务运营、Itô 预测市场 basket、prediction-market 研究与风险审查、Web3 安全（DeFi/钱包/Keccak/支付 x402）、ML 工程方法论、推荐系统、文档处理/翻译/Python 打包/数据采集。

### agent-payment-x402
- **执行步骤**：1) 按决策树选择集成路径（Base 用 agentwallet-sdk；X Layer 用 OKX Agent Payments Protocol；卖方按 TS/Go/Rust/Java 选对应 SDK） 2) 配置 MCP server（Option A 用 agentwallet-sdk，Option B 用 okx/onchainos-skills 调度） 3) 由 orchestrator 通过 set_policy 设置 SpendingPolicy（每任务/每会话预算、收件白名单、速率限制） 4) agent 调用 get_balance、send_payment、check_spending、list_transactions 等工具 5) 在 preToolCheck 中实施 fail-closed 预算强制校验（5 条错误路径） 6) 配合 post-task 钩子记录审计轨迹
- **依赖**：agentwallet-sdk（Base/多链）、OKX Payments SDK（TS/Go/Rust/Java seller）、x402 HTTP 协议、MCP、ERC-4337 智能账户、关联 cost-aware-llm-pipeline、security-review
- **说明**：始终固定依赖版本；管理私钥的工具需供应链安全；用 Base Sepolia 测试网开发，Base mainnet 用于生产；orchestrator 设定策略，agent 不得自行提升额度

### data-scraper-agent
- **执行步骤**：1) 澄清目标：抓什么、提取哪些字段、存到哪、是否 AI 富化、频率 2) 生成目录结构（config.yaml + profile + scraper/sources + ai + storage + .github/workflows） 3) 构建 scraper 源（REST API / HTML / RSS / 分页 / JS 渲染五种模式） 4) 构建 Gemini 客户端（4 模型 fallback 链 + 429 重试） 5) 构建批量 AI pipeline（batch_size=5，避免每条一次调用） 6) 构建反馈学习系统（data/feedback.json 记录正/负样本构建偏好 prompt） 7) 构建存储层（以 Notion 为例，含去重） 8) 在 main.py 编排：抓取→去重→AI 富化→存储 9) 配置 GitHub Actions cron + 反馈历史自动提交 10) 生成 config.yaml 模板
- **依赖**：Python、requests、BeautifulSoup、playwright（JS 站）、Gemini Flash REST API（免费层）、Notion/Sheets/Supabase API、GitHub Actions cron
- **说明**：不要每条一次 LLM 调用（应批量 5）；尊重 robots.txt；秘钥放 .env + GitHub Secrets；保留去重；maxOutputTokens≥2048；通过质量清单后才算完成

### defi-amm-security
- **执行步骤**：正文以检查清单+模式库给出，含：①重入（强制 CEI + nonReentrant + SafeERC20）②捐赠/通胀攻击（不用裸 balanceOf 做份额数学，跟踪内部 _totalAssets）③预言机操纵（用 Uniswap V3 TWAP observe，不用 spot price）④滑点保护（amountOutMin + deadline）⑤安全储备数学（FullMath.mulDiv）⑥Admin 控制（Ownable2Step 两步转移）⑦安全检查清单（11 项）⑧审计工具（slither、echidna、forge fuzz）
- **依赖**：OpenZeppelin（ReentrancyGuard、SafeERC20、Ownable2Step）、Uniswap V3（FullMath、TickMath、IUniswapV3Pool）、slither-analyzer、echidna、forge
- **说明**：shell 命令仅在可信 checkout 或一次性沙箱运行；勿把未受信合约名/路径/RPC URL/私钥拼入命令；运行长 fuzz/静态分析前先询问；示例不含密钥/私钥

### evm-token-decimals
- **执行步骤**：1) 运行时调用 decimals()，绝不硬编码 2) 按 (chain_id, token_address) 缓存（lru_cache） 3) 对异常代币防御性处理（try/except 默认 18 并 warning 日志） 4) Solidity 归一化到 18 位 WAD 5) TS 用 ethers formatUnits 6) 用 cast call 快速链上校验
- **依赖**：web3.py、ethers、viem、web3.js、Solidity IERC20Metadata、cast（foundry）
- **说明**：永远运行时查询 decimals()；按链+地址缓存而非按符号；用 Decimal/BigInt 而非 float；桥接后重新查询；内部记账归一化后再比较或定价

### finance-billing-ops
- **执行步骤**：1) 从最新计费证据开始（优先 live，否则声明快照时间戳），归一化：付费销售、活跃订阅、失败/未完成结账、退款、争议、重复订阅 2) 区分客户事件与产品真相：先按重复结账/真实团队意图/破损自助/未满足价值/失败付款分类，再分离更宽的产品问题（团队计费是否真实、席位是否真的计数、结账数量是否改变 entitlement、网站是否夸大） 3) 检查代码背书的计费行为（结账、定价页、entitlement 计算、席位/配额、安装 vs 使用、计费门户） 4) 以决策与产品差距结尾：销售快照/问题诊断/产品真相/建议操作/产品或 backlog 缺口
- **依赖**：Stripe 计费 API、关联 customer-billing-ops、research-ops、market-research、github-ops、verification-loop
- **说明**：区分 live 与快照；不把失败尝试当净收入；不凭营销语言推断团队计费；无当前证据时不凭记忆对比竞品定价；输出含 SNAPSHOT/CUSTOMER IMPACT/PRODUCT TRUTH/DECISION/PRODUCT GAP 五段

### generating-python-installer
- **执行步骤**：1) 强制参数确认（应用名/版本/发布者/exe 名/源路径/输出路径/图标/URL，禁止默认值，FAIL 规则） 2) 源文件质量与编译检查（确认去黑窗 --windows-console-mode=disable、--lto=yes、VC++ 运行库） 3) Nuitka 编译（32 位策略、模块排除清单、Tkinter/PyQt5/PySide2 专用参数） 4) dist 瘦身（7 步：删 .pdb/.pyi/`__pycache__`/test/docs/.pyc，精简 .dist-info 仅删 RECORD/INSTALLER/direct_url.json，保留 METADATA 与 entry_points.txt） 5) DLL 依赖分析（analyze_dlls.py 找大户并给优化建议） 6) Inno Setup 封装（LZMA2 ultra64、SolidCompression、全中文、完整元数据、架构匹配的 VC++ redist、无残留卸载）
- **依赖**：Nuitka、Inno Setup、PyInstaller（参考案例）、VC++ Redistributable、PowerShell、Python 32 位/64 位、sips
- **说明**：不建议 UPX（杀软误报）；32 位编译省 20-30% 体积；anti-bloat 插件省 15-25%；全部组合可省 45-65% 体积、提升启动 15-25%；含商业级 Inno Setup 模板与占位符说明、FAQ、实战问题记录

### investor-materials
- **执行步骤**：1) 清点权威事实 2) 识别缺失假设 3) 选择资产类型 4) 用显式逻辑起草资产 5) 把每个数字与真相来源交叉核对。Deck 推荐流：company+wedge→problem→solution→product/demo→market→business model→traction→team→competition→ask→use of funds→appendix；财务模型含假设/熊-基-牛三档/清晰分层营收逻辑/里程碑关联支出/敏感性分析；加速器申请：回答被问的问题、突出 traction/洞察/团队
- **依赖**：关联 frontend-slides（web-native deck 时）
- **说明**：金科玉律：所有融资材料必须互相一致；冲突数字必须先解决再起草；避免不可验证主张、模糊市场估算、不一致头衔、营收数学对不上、对脆弱假设过度自信；交付前过质量门（数字匹配、用途与营收层正确求和、假设可见、可辩护）

### investor-outreach
- **执行步骤**：核心规则：①个性化每封外发 ②保持低摩擦 ask ③用证据而非形容词 ④保持简短 ⑤绝不发可发给任何投资人的副本。冷邮件结构：1) 短而具体的标题 2) 为什么是这位投资人 3) 公司做什么、为何现在、什么证据重要 4) 一个具体下一步 5) 签名+一个可信锚点。跟进节奏：day0 初次→day4-5 短跟进带一个新数据点→day10-12 终次跟进干净收尾
- **依赖**：关联 brand-voice（若用户声音重要，先跑该 skill 复用 VOICE PROFILE）
- **说明**：硬禁清单（删并重写）："I'd love to connect"、"excited to share"、无真实关联的泛泛主题赞美、模糊创始人形容词、乞求语言、本可用直接 ask 的软性收尾问题；个性化源缺失时声明草稿仍需个性化而非假装完成

### ito-basket-compare
- **执行步骤**：1) 识别 basket 主题与底层 2) 取用户相关笔记/文档/记忆片段 3) 把每个底层映射到主张/来源/不确定性/陈旧假设 4) 返回对齐信号、冲突信号与缺失研究；组合笔记模式还含：主题/地域/时间跨度/事件结果对比，标注集中度、相关性、重复叙事敞口；财务上下文模式：只接受用户提供的约束，识别流动性/回撤/时间跨度/约束错配，缺失约束时询问而非猜测
- **依赖**：Itô prediction-market API（ITO_API_KEY，只读）、用户知识库/组合笔记/财务上下文
- **说明**：只读、不提供投资建议、不执行/准备/提交订单；不用私人文档除非用户明确指出；ITO_API_KEY 仅在用户明确请求后用于只读 basket/市场数据；财务对比保护隐私仅摘要必要字段；输出固定六段并以"informational and not investment or trading advice"结尾

### ito-data-atlas-agent
- **执行步骤**：1) 定义用户目标与排除动作 2) 列数据源与访问要求 3) 起草 basket spec（每个底层带出处） 4) 产出可编辑参数而非可执行订单 5) 存审计轨迹（输入、模型输出、来源、人决策）。架构四车道：研究收集器（公开 web/X/GitHub/venue docs/Itô 只读）、basket 起草器、风险审查器（数据新鲜度/venue 限制/解析歧义/合规/提示注入）、人编辑器（聊天或 UI 状态供人批准/拒绝/调整/追加研究）
- **依赖**：ITO_API_KEY（只读 Itô 数据）、关联 deep-research、x-api、ito-market-intelligence、ito-basket-compare、prediction-market-risk-review
- **说明**：所有执行需明确人工批准；除非目标 repo 已有存储契约且用户要求，否则不持久化私人数据；不在公开文档暴露私人策略逻辑/venue 凭证/本地路径；返回实现就绪的工作流 spec（数据源/访问门/agent 角色/人工批准点/存储审计边界/非目标）

### ito-market-intelligence
- **执行步骤**：1) 澄清市场主题/venue/地域/时间跨度 2) 从 venue docs/API 或有出处研究采集公开市场数据 3) 若 ITO_API_KEY 存在且用户明确要求 Itô 数据，仅调用只读端点并声明门控 4) 跨 venue 归一化事件/底层/流动性/手续费/解析/数据延迟差异 5) 产出决策简报（市场/事件摘要、可用 venue 与底层、流动性与数据质量警示、相关新闻/来源上下文、行动前待解问题）
- **依赖**：ITO_API_KEY（门控只读）、Polymarket/Kalshi/Itô/X/Exa/GitHub 公开数据、关联 deep-research、exa-search、x-api、market-research、prediction-market-risk-review
- **说明**：公开 teaser skill，默认用公开来源；任何 Itô 数据调用需明确 ITO_API_KEY；不提供投资/法律/税务/交易建议；不下/撤/路由/模拟实盘订单；把事实、市场隐含信号与解读分开；缺权限时明确提示需申请 ITO_API_KEY；简报以"market intelligence, not investment or trading advice"结尾

### ito-trade-planner
- **执行步骤**：1) 把用户想法重述为中性假设 2) 识别市场/venue/底层/解析规则/手续费/数据新鲜度约束 3) 若配置 ITO_API_KEY 且被请求，读 Itô basket 元数据 4) 构建手动工作表（市场/底层、venue、数据源、当前可观测价格或状态、解析规则、流动性警示、待解问题、手动动作链接或下次复查步骤） 5) 在讨论自动化/密钥/venue auth/资本约束前先跑 prediction-market-risk-review
- **依赖**：ITO_API_KEY（只读 basket 元数据）、关联 prediction-market-risk-review
- **说明**：故意非执行型；产出供人手动审查的清单与参数表；不说交易好不好/最优/推荐；不提供投资建议或仓位建议；不下/撤/路由/签订单；不索要私钥/助记词/交易所密码/钱包凭证；从研究迁到执行能力工具前需明确用户批准；允许用词："manual planning worksheet"等，禁用"you should buy/sell/best trade/guaranteed/risk-free/optimal size"；以"planning worksheet, not investment or trading advice"结尾

### llm-trading-agent-security
- **执行步骤**：正文以分层防御清单/模式给出，含：①把提示注入当金融攻击（INJECTION_PATTERNS 正则 + sanitize_onchain_data）②硬支出限额（SpendLimitGuard 单笔/日上限 Decimal）③发送前模拟（eth.call 校验 min_amount_out，否则 SlippageError）④熔断（TradingCircuitBreaker 连续亏损/小时亏损率/无效状态）⑤钱包隔离（专用热钱包仅含会话资金，env 取 TRADING_WALLET_PRIVATE_KEY）⑥MEV 与 deadline 保护（Flashbots 私有 RPC、MAX_SLIPPAGE_BPS、deadline）。Pre-Deploy 清单 9 项
- **依赖**：Python、eth_account、web3.py、Flashbots（私有 mempool）、Decimal
- **说明**：单一检查不够，分层独立控制；外部数据进 LLM 前先净化；支出限额独立于模型输出强制；min_amount_out 强制；所有 agent 决策审计日志（含失败发送）；密钥仅来自 env/secret manager，绝不入代码或日志

### ml-adoption-playbook
- **执行步骤**：1) Phase1 问题框架与可行性（启发式检查能否用 regex/规则更快解决；定义业务指标；定义错误预算） 2) Phase2 数据就绪（审计数据源、建立数据契约、防泄漏） 3) Phase3 架构集成与解耦（放 API 边界、设计 fallback、特性开关包裹） 4) Phase4 模型实现与训练（先建简单基线、可复现性、要求自动证据：transform 与推理 schema 的测试） 5) Phase5 交接 MLOps（指向 mle-workflow 做实验追踪/模型注册/漂移检测；把模型评估加入 CI）。Agent 迭代工作流：先问澄清问题完成 Phase1，再 Phase2 起草数据契约，Phase3 先写解耦接口再写训练循环，Phase4 交付可复现脚本
- **依赖**：关联 fastapi-patterns/django-patterns（API 边界）、pytorch-patterns、python-patterns、mle-workflow（MLOps 交接）
- **说明**：不要把模型推理与核心业务逻辑紧耦合；先验证简单启发式是否够用；先有数据契约与解耦接口再写训练循环；模型需基线对照与评估脚本

### mle-workflow
- **执行步骤**：1) 定义预测契约（目标/决策者/输入输出 schema/服务模式/fallback/人工复核/隐私留存审计） 2) 锁定数据契约（entity grain、标签定义与时延、point-in-time join、split 策略、PII 字段、数据集版本） 3) 构建可复现管道（typed config、固定依赖、随机种子、记录 dataset/version/code SHA/config hash/metrics/artifact URI、预处理随模型 artifact 保存、步骤幂等） 4) 评估后晋升（基线+当前生产模型对照、主指标、护栏指标、切片、置信区间、do-not-ship 阈值、PROMOTION_GATES 自动 fail-closed） 5) 打包服务（artifact 含版本/训练数据引用/config/预处理、输入 schema 校验、超时/批/资源/fallback、CPU/GPU 显式、PII 安全日志、集成测试） 6) 运营模型（可用性/错误率/延迟/特征 null/范围/类别/新鲜度漂移/预测分布漂移/标签到达健康/业务 KPI 护栏/每版本仪表盘/回滚计划）
- **依赖**：关联 python-patterns、python-testing、pytorch-patterns、eval-harness、ai-regression-testing、database-migrations、postgres-patterns、clickhouse-io、deployment-patterns、docker-patterns、security-review、canary-watch、dashboard-builder、api-design、backend-patterns、cost-aware-llm-pipeline、token-budget-advisor 等
- **说明**：只用适配当前系统的车道；不要假设每模型都有监督标签/在线服务/特征存储/PyTorch/GPU/A/B；不做重 MLOps 机器当数据契约+基线+eval+回滚即可审查；含 10 项 MLE 任务模拟表（MLE-01~10）、Iteration Compact、Decision Brain、Metric and Mistake Economics、Error Analysis Loop、Observation Ledger；产出具体 artifact（数据契约、晋升门、管道步骤、测试计划、部署计划、审查发现）而非假设

### nodejs-keccak256
- **执行步骤**：正文以模式/代码示例给出，含：①ethers v6（keccak256、toUtf8Bytes、solidityPackedKeccak256、id）②viem（keccak256、toBytes）③web3.js（utils.keccak256、soliditySha3）④常见模式（selector 截取、EIP-712 typeHash、getMappingSlot）⑤公钥推导地址（取哈希后 40 位）⑥审计命令（grep createHash.*sha3 与 keccak256）
- **依赖**：ethers（v6）、viem、web3.js、Node crypto（仅作反例对照）
- **说明**：两者同输入产生不同输出且 Node 不警告；以太坊上下文绝不用 crypto.createHash('sha3-256')，改用 ethers/viem/web3 等显式 Keccak 实现

### nutrient-document-processing
- **执行步骤**：正文以操作清单+curl 示例给出，含：①转换文档（DOCX→PDF、PDF→DOCX、HTML→PDF，支持 PDF/DOCX/XLSX/PPTX/DOC/XLS/PPT/PPS/PPSX/ODT/RTF/HTML/多图片格式输入）②提取文本/数据（纯文本、表格为 Excel）③OCR 扫描件（100+ 语言，ISO 639-2 码或全名）④脱敏（preset：SSN/email/信用卡/电话/日期/时间/url/ipv4/ipv6/mac/zip/vin 等；regex 自定义）⑤水印（text/fontSize/opacity/rotation）⑥数字签名（CMS 自签名）⑦填写 PDF 表单（formFields）；另提供 MCP server（@nutrient-sdk/dws-mcp-server）作为原生工具集成
- **依赖**：Nutrient DWS 商业 API（NUTRIENT_API_KEY）、curl 或 @nutrient-sdk/dws-mcp-server（MCP）、SANDBOX_PATH
- **说明**：商业 API，使用前审查其条款；所有请求 POST 到 `https://api.nutrient.io/build`，multipart 带 instructions JSON 字段；含 API playground 与完整文档链接

### prediction-market-oracle-research
- **执行步骤**：1) 定义该信号要服务的决策 2) 找相关市场/事件/标签/venue 3) 记录市场隐含概率（带时间戳与来源链接） 4) 评估信号质量（流动性、点差、市场年龄、交易者/激励集中度、解析权威、地域/账户限制） 5) 与非市场来源（申报、新闻、民调、研究、客户数据、内部 KPI）对比 6) 推荐该信号对所述决策是否可用、弱或不适合；集成模式：研究助手、仪表盘信号、agent 记忆输入、告警输入、情景规划
- **依赖**：关联 llm-trading-agent-security（链上或执行关联系统授写权限前必跑）
- **说明**：不把市场价格当客观真相；不提供投资建议或交易建议；把 venue 机制、流动性、激励、解析规则与隐含信号分开；指出操纵、薄流动性、陈旧市场、模糊结果；输出六段（决策上下文、市场来源、信号质量、对照来源、集成建议、警示）并以"Prediction-market signals are informational inputs, not investment advice."结尾

### prediction-market-risk-review
- **执行步骤**：1) 建议边界（确认输出为信息性；移除买卖持有仓位建议；保留人工决策点） 2) venue 与监管边界（识别 venue 条款、地域限制、账户限额、API 规则；标注博彩/衍生品/证券/商品模糊性供法律审查；不绕过限制与速率） 3) 数据质量（流动性/点差/解析规则/陈旧价格/来源时间戳；公开 venue 数据与 Itô 门控数据分开；不混公私源不标注） 4) 安全（不索/不存私钥助记词密码；ITO_API_KEY 与 venue API 密钥不入日志文档；默认只读 scope；要求熔断/支出限额/演练/人工批准） 5) 隐私（最小化用户组合/财务/知识库数据；公开 artifact 中脱敏私源；只保留审查所需字段）
- **依赖**：关联 ITO_API_KEY、venue API keys、llm-trading-agent-security
- **说明**：返回：审查范围、pass/warn/fail 发现、阻止的动作、必需缓解、安全下一步；任何执行能力步骤需单独实现计划与明确用户批准

### recsys-pipeline-architect
- **执行步骤**：1) 澄清用例（一轮三问：排什么物品？输入上下文？语言/运行时） 2) 识别候选源（in-network 关注/拥有/订阅 + out-of-network ML 检索/趋势/相似） 3) 列出必要 hydrate（每个 filter/scorer 需要源未提供的数据） 4) 列出 filter（去重/自我/年龄/屏蔽/已服务/资格，廉价在前） 5) 设计 scorer 链（主 ML→多动作 combiner 带 weight→多样性→业务规则） 6) Selector（按终分降序取 top K 或分层混合） 7) SideEffects（缓存服务 ID/发曝光事件/更新计数/日志分析，全 fire-and-forget） 8) 在用户技术栈生成可运行 scaffold
- **依赖**：TypeScript、Go、Python（提供 4 语言 interface 参考）；上游 github.com/mturac/recsys-pipeline-architect（MIT）；模式归因 xAI For You（github.com/xai-org/x-algorithm，Apache 2.0）
- **说明**：不适用：模型架构（transformer/双塔/embedding 训练）、纯 ML 训练管道、部署运维；硬规则：不臆造基准数、归因纪律、无商标使用（不命名"X-like"/"For You"，建议用"candidate/feed/ranking/recsys pipeline"）、显式呈现取舍（单分 vs 多动作、隔离 vs 联合、在线 vs 离线）、scaffold 必须可运行、filter 顺序廉价在前、side effect 永不阻塞响应

### visa-doc-translate
- **执行步骤**：1) 图片转换（HEIC 用 sips -s format png 转 PNG） 2) 图片旋转（查 EXIF orientation 自动旋转，orientation=6 时逆时针 90°，必要时测 180°） 3) OCR 文本提取（依次试 macOS Vision framework→EasyOCR→Tesseract；识别文档类型） 4) 翻译（专业英文、保留结构与格式、签证专业术语、人名保留原文+括号英文、中文姓名用拼音如 WU Zhengye、保留数字日期金额） 5) PDF 生成（PIL+reportlab 脚本，第 1 页居中缩放原图 A4，第 2 页标题居中粗体+左对齐内容+底部加"This is a certified English translation of the original document"） 6) 输出 `<原文件名>_Translated.pdf` 到同目录
- **依赖**：sips（macOS HEIC 转换）、macOS Vision framework（pyobjc-framework-Vision/Quartz）、EasyOCR、Tesseract（pytesseract + tesseract-lang）、PIL（pillow）、reportlab
- **说明**：不要每步问用户确认；自动决定最佳旋转角度；一种 OCR 失败依次试其它；确保数字/日期/金额精确；适合赴澳/美/加/英等需翻译文档的签证申请

