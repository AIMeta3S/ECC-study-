# ECC 命令流水线速查

> 本文是 [01-command说明文档.md](./01-command说明文档.md) 的「**场景视角**」配套文档。
> 说明文档按**逐命令**展开（功能 / 适用场景 / 上游 / 下游 / 依赖）；本文按**真实任务/场景**重新组织，给出「该用哪几条命令、按什么顺序串起来」的可执行流水线。
>
> 所有命令名、功能、上下游、产出物均取自 `01-command说明文档.md`（ECC v2.0.0 仓库实际文件），不引入文档外信息。命令体细节若与仓库演进不一致，以仓库源码为准。
>
> **命名空间**：插件安装用 `/ecc:<name>`，手动安装用 `/<name>`。本文统一用简形 `/<name>`，实际调用按你的安装方式加前缀。详见说明文档「阅读说明」。

---

## 目录

- [第 0 章 选型导航](#第-0-章-选型导航)
- [第 1 章 端到端开发交付](#第-1-章-端到端开发交付)
- [第 2 章 质量审查与修复](#第-2-章-质量审查与修复)
- [第 3 章 语言专属开发](#第-3-章-语言专属开发)
- [第 4 章 其余场景简表](#第-4-章-其余场景简表)
- [附录](#附录)
  - [附常见依赖速查](#附常见依赖速查)
  - [易混命令对比](#易混命令对比)

---

## 第 0 章 选型导航

> 拿到一个任务，先在此表定位「属于哪类」，再跳到对应流水线章节。章节以编号（A1/B3/C2…）对应正文标题。

| 任务类型 | 推荐流水线 | 一句话何时用 |
|---|---|---|
| 新项目 / 大型特性 / 需求模糊 | [完整PRP](#prp-完整流水线) | 需产品发现、可审计、最完整 |
| 中小型特性、需求基本清晰 | [轻量PRD](#轻量-prd-流水线) | 比 PRP 轻，4 阶段 PRD |
| 单命令自动端到端、要门控 | [Orch端到端](#orch-单命令端到端) | 按改动性质选 add/change/fix/refine/mvp |
| 多模型交叉验证 | [多模型协作](#多模型协作) | 需 ccg-workflow 运行时 |
| 创意 / 视觉 / MVP 自动收敛 | [生成器和评估器双循环](#生成器和评估器双循环) | 生成器↔评估器迭代到达分 |
| 提交前本地自审 | [code-review（本地）](#提交前本地自审) | 改完想自审再提交 |
| PR 合并前深度审查 | [code-review / review-pr](#深度审查) | 要跑验证+裁决 或 多代理专项深挖 |
| 推送前对抗双审查 | [santa-loop](#对抗双审查推送) | 两个独立模型都过才推 |
| 构建 / 类型错误中断 | [build-fix](#构建中断修复) | 构建失败、错误堆积 |
| 修运行时行为 Bug | [缺陷修复](#缺陷修复) | 功能行为不符预期 |
| 安全重构 / 清死代码 | [安全重构](#安全重构) | 改善结构但行为不变 |
| 补覆盖率 / 格式门禁 | [质量补齐](#质量补齐) | 覆盖率 <80%、格式问题 |
| 语言专属开发（go/cpp/rust…） | [语言三件套](#语言三件套) | 改完某语言代码、提交前审查 |
| 纯 TS/JS/Node 开发 | [JS/TS 降级](#js--ts--node-弱覆盖降级) | 无独立三件套，走通用命令 |
| 跨会话接续 | [会话与上下文](#会话与上下文) | 结束/恢复会话、长任务分段 |
| GitHub 史诗协调 | [敏捷史诗](#敏捷史诗github-issue) | issue 协调块作为事实源 |
| Jira 工单驱动 | [外部工单 Jira](#外部工单jira) | 从工单拉需求开始 |
| 新项目接入 ECC | [项目接入与治理](#项目接入与治理) | dry-run 引入、按栈选组件 |
| 安全 / 成本 / 模型选档 | [安全成本与模型路由](#安全成本与模型路由) | 审计、查花费、选模型档 |
| 自动化自治循环 | [自动化循环](#自动化循环) | 长时间运行的托管循环 |
| Hook 规则治理 | [Hook 管理](#hook-管理) | 反复犯错、强制拦截 |
| 文档 / 架构同步 | [文档与架构](#文档与架构维护) | 代码变更后文档脱节 |

---

## 第 1 章 端到端开发交付

### PRP 完整流水线

- **适用**：新项目、大型特性、需求模糊需产品发现、团队协作要求可审计
- **优势**：制品全程可追溯；每步严格验证、绝不积累损坏状态；歧义门控 + 假设驱动；PR 正文自动套模板，最完整
- **缺点**：最重——8 阶段 PRD 需反复交互、耗时；对小改动是 overkill；学习曲线高

```text
/prp-prd  →  /prp-plan  →  /prp-implement  →  /code-review  →  /prp-commit  →  /prp-pr
 需求        规划           实现               代码审查         提交            开 PR
```

| 阶段 | 命令 | 输入 | 产出物 | 说明 |
|---|---|---|---|---|
| 需求 | /prp-prd | 功能描述/产品创意 | `.claude/PRPs/prds/{name}.prd.md` | 假设驱动，通过反复提问的生成PRD（用户与场景、核心功能、技术方案、实施阶段、功能边界、成功指标） |
| 规划 | /prp-plan | prd 文件路径（需求阶段的输出，或类似的prd文件），或功能描述 | `.claude/PRPs/plans/{name}.plan.md` | 根据PRD/功能描述探索现有代码库、研究依赖、设计UX，然后生成实施计划（参考资料、约束、任务清单、测试、验收标准） |
| 实现 | /prp-implement | 规划文件路径（规划阶段的输出） | `.claude/PRPs/reports/{plan-name}-report.md` | 按计划进行任务(编码) + 5 级验证（静态/单元/构建/集成/边缘） |
| 代码审查 | /code-review | pr编号/url/空白（本地代码） | `.claude/reviews/pr-<NUMBER>-review.md` |  |
| 提交 | /prp-commit | 提交范围描述 | 无 | 提交代码 |
| 开 PR | /prp-pr | 分支名/flags | 无 | 创建 Github PR |

> 参数示例：
> - `/prp-prd <功能描述 | 创意>`
> - `/prp-plan <path/to/prd.md> | <功能描述>`
> - `/prp-implement <path/to/plan.md>`
> - `/code-review <pr编号 | url | 空白（本地代码）>`
> - `/prp-commit [提交内容描述]`
> - `/prp-pr [分支名 | flags]`

---

### 轻量 PRD 流水线

- **适用**：需求基本清晰、要先固化「是什么/为什么」、不想走 PRP 重型研究流程
- **优势**：4 阶段 PRD 轻量反废话（缺失填 `TBD`，绝不编造）；`/plan` 对标代码库模式、分阶段 + 风险评估；`/pr` 自动套用 prds + plans + PRPs 制品填模板
- **缺点**：无 PRP 的可行性研究 / 深度定位；**`/plan` 本体只规划到 WAIT 即止，下游 tdd/实现需用户确认后手动衔接**

```text
/plan-prd  →  /plan  →  [ tdd-workflow / 实现 ]  →  /pr
 PRD         计划      编码（手动衔接）             开 PR
```

| 阶段 | 命令 | 产出 |
|---|---|---|
| PRD | /plan-prd | `.claude/prds/{name}.prd.md`（4 阶段、问题导向、成功标准含 `NO_IMPLEMENTATION_DETAIL`） |
| 计划 | /plan | 分阶段实施计划 + 依赖 + 复杂度 + 风险评估，**WAIT 即停**（可选写 `.claude/plans/{name}.plan.md`） |
| 实现 | tdd-workflow / 手动 | 代码改动（`/plan` 不自动进入实现，需手动衔接；可选委托 `planner` agent） |
| 开 PR | /pr | GitHub PR（发现 `.claude/prds/` + `.claude/plans/` + `.claude/PRPs/` 制品） |

> 参数：`/plan [feature | path/to/*.prd.md]`。

---

### Orch 单命令端到端

- **适用**：想要**单命令自动跑完**「研究 → 计划 → TDD → 审查 → 门控提交」、内置双门控、不想手动衔接多命令
- **优势**：一条命令覆盖全五环；`size` 分类器按规模裁剪阶段；敏感路径自动触发 `security-reviewer`；门控内置（gated not autonomous）
- **缺点**：门控自动跑完，制品可审计性弱于 PRP 手动流水线；无法跨命令选择性跳过某个环节

```text
/orch-<verb>     研究 → 计划 → TDD → 审查 → 门控提交（单命令，双门控）
```

**族内选型（first-move rule —— 按「TDD 第一步怎么动测试」区分改动性质）**：

| 命令 | 改动性质 | TDD 第一步 | 门控 | 何时用 |
|---|---|---|---|---|
| /orch-add-feature | 从零新增 | 写**新**失败测试 | GATE1 + GATE2 | 东西原本不存在 |
| /orch-change-feature | 行为变更 | **先改现有测试**为新规范 | GATE1 + GATE2 | 功能原本正常、需求变了 |
| /orch-fix-defect | 修 Bug | **先用失败回归测试证明 Bug** | 仅 GATE2 | 功能本该正常、出了错 |
| /orch-refine-code | 重构 | **不写新测试**、现有测试保绿 | GATE1 + GATE2 | 行为不变、只动结构 |
| /orch-build-mvp | 引导 MVP | 唯一走 Phase 3 Scaffold + 复用 `/gan-build --skip-planner` | GATE1 + GATE2 | 有设计/规范文档、按垂直切片 |

> 双门控：**GATE 1** = 计划批准、**GATE 2** = 提交前确认。引擎原话："Changing the tests first is what separates a tweak from a fix"。参数：`/orch-add-feature <what to add>`、`/orch-build-mvp <path to design/spec doc>` 等。

---

### 多模型协作

- **适用**：需要多模型交叉验证计划 / 想让外部模型出原型、Claude 重构落地（后端听 Codex、前端听 Gemini）
- **优势**：双模型交叉验证共识 / 分歧；外部模型零文件写权限、Claude 是唯一写者；外部输出当「脏原型」由 Claude 重构为生产级
- **缺点**：**强依赖外部 `ccg-workflow` 运行时**（base ECC 不含，须先 `npx ccg-workflow` 初始化）；外部模型调用有成本；串行 / 并行调度复杂

**形态一：分阶段（规划与执行分离）**

```text
/multi-plan  →  ( 新会话 )  /multi-execute
 只规划不改码     取原型 → Claude 重构 → 双模型审计
```

**形态二：聚焦端到端（六阶段：Research → Ideation → Plan → Execute → Optimize → Review）**

```text
/multi-backend   |   /multi-frontend   |   /multi-workflow
 Codex 主导         Gemini 主导            智能路由（前端→Gemini / 后端→Codex / 全栈→并行）
```

| 命令 | 适用领域 | 主导模型 | 形态 |
|---|---|---|---|
| /multi-plan → /multi-execute | 想先把规划与执行分开、跨会话 | 双模型并行 | 分阶段 |
| /multi-backend | API / 算法 / 数据库 / 业务逻辑 | Codex（Gemini 参考为主） | 六阶段端到端 |
| /multi-frontend | 组件 / 响应式布局 / UI 动效 / 样式 | Gemini（Codex 参考为主） | 六阶段端到端 |
| /multi-workflow | 跨前后端全栈 | 智能路由 | 六阶段端到端 |

> 硬规则：`/multi-plan` 只读、绝不自动执行；`/multi-execute` 可 `resume <SESSION_ID>` 复用 plan 阶段会话。核心思想："Code Sovereignty" + "Dirty Prototype Refactoring"。

---

### 生成器和评估器双循环

- **适用**：把一个实现任务交给「生成器 ↔ 评估器」自动收敛循环、迭代到达分阈值；或做创意前端 / 视觉工作
- **优势**：自动迭代直至通过阈值或 2 次迭代后平稳；`evaluator` 实时测试 / 评分 / 写反馈
- **缺点**：消耗迭代次数 / token；功能完备性让位于评分维度；`/gan-design` 明确「惊艳的半成品胜过功能齐全的丑陋应用」

```text
/gan-build                         /gan-design
 planner → generator ↔ evaluator    generator ↔ evaluator（无 planner，评估重设计）
 功能收敛                            视觉惊艳
```

| 命令 | 代理数 | 评估侧重 | 何时用 |
|---|---|---|---|
| /gan-build | 3（gan-planner → gan-generator ↔ gan-evaluator） | 功能 + 通用 rubric | 实现任务自动收敛到达分 |
| /gan-design | 2（gan-generator ↔ gan-evaluator） | 设计 0.35 / 原创 0.30 / 工艺 0.25 / 功能 0.10 | 创意前端、追求视觉惊艳（摘要即规范） |

> 参数：`/gan-build <brief> [--max-iterations 15] [--pass-threshold 7.0] [--skip-planner] [--eval-mode playwright|screenshot|code-only]`；`/gan-design [--max-iterations 10] [--pass-threshold 7.5]`。在 `gan-harness/` 下运行。

---

## 第 2 章 质量审查与修复

### 提交前本地自审

- **适用**：提交前想自审本地未提交改动，无需 GitHub
- **优势**：无需 `gh` CLI 即可跑；CRITICAL/HIGH 直接阻断
- **缺点**：单视角、非多代理深挖（要深挖见 B2）

```text
/code-review   （本地模式：无参 或 本地未提交改动）
 GATHER diff → REVIEW 4 类检查 → REPORT（CRITICAL/HIGH 阻断）
```

| 步骤 | 动作 | 产出 |
|---|---|---|
| 收集 | GATHER 本地 diff | 改动清单 |
| 审查 | REVIEW 4 类检查 | 问题清单（CRITICAL/HIGH/MEDIUM/LOW） |
| 报告 | REPORT | 阻断建议（CRITICAL/HIGH 阻断提交） |

---

### PR 深度审查

- **适用**：合并前要对一个 GitHub PR 做安全 + 质量审查；或想专注某一方面（评论/测试/错误/类型/简化）
- **优势**：`/code-review` 出裁决并发布评论；`/review-pr` 六专业代理多视角去重
- **缺点**：依赖 `gh` CLI

```text
/code-review [PR号]        /review-pr [PR号] [--focus=...]
 验证 + 裁决 + 发布          六专业代理专项深挖
```

| 命令 | 机制 | 适用 |
|---|---|---|
| /code-review [PR号/URL] | FETCH → CONTEXT → REVIEW(7 类×4 级) → **VALIDATE**（跑 typecheck/lint/test/build）→ DECIDE(APPROVE/REQUEST CHANGES/BLOCK) → REPORT → PUBLISH(`gh pr review`) | 要跑验证、出裁决、发评论 |
| /review-pr [PR号/URL] | 6 专业代理（code-reviewer / comment-analyzer / pr-test-analyzer / silent-failure-hunter / type-design-analyzer / code-simplifier）汇总去重按严重性排序 | 多视角专项深挖、可 `--focus` |

> `/code-review` 无 `gh` 时回退本地审查；写 `.claude/reviews/pr-<N>-review.md`。`/review-pr` 仅报告置信度 ≥80 的发现。

---

### 对抗双审查推送

- **适用**：代码即将推送、需要两个独立模型都审查通过才放心
- **优势**：对抗性收敛防锚定；每轮用**新鲜审查者**；最多 3 次迭代后升级而非推送
- **缺点**：依赖外部模型 CLI（codex/gemini）；迭代轮次有成本

```text
/santa-loop  →  git push
 双独立审查者都过才推；NAUGHTY 修复后用新鲜审查者重跑（最多 3 次，3 次后升级）
```

| 步骤 | 动作 | 说明 |
|---|---|---|
| 定范围 | 参数或未提交改动 | 确定审查对象 |
| 评分标准 | 构建客观 PASS/FAIL 标准 | — |
| 双审查 | A = Claude `code-reviewer`；B = codex/gemini CLI（偏好 codex>gemini>Claude） | 并行、独立，B 在 `--sandbox read-only` |
| 判定 | 都过(NICE) → `git push`；任一失败(NAUGHTY) → 修所有标记、`fix:` 提交、重跑 | 每轮新鲜审查者防锚定 |

> 依赖 skill `santa-method`、agent `code-reviewer`。

---

### 构建中断修复

- **适用**：任意项目构建失败、类型错误堆积，想逐个最小化修复而不重构
- **优势**：语言无关；一次一错、最小 diff、不重构
- **缺点**：只修构建、不补测试不审查（须下游补齐）

```text
/build-fix  →  /test-coverage (或 /<lang>-test)  →  /code-review
 单错误最小修复    补回归测试                       审查
```

| 步骤 | 动作 | 说明 |
|---|---|---|
| 检测 | 识别构建系统 | npm / tsc / cargo / mvn / gradle / go / mypy |
| 修复 | 单错误循环（读 → 诊断 → 最小 Edit → 重跑） | 按文件分组排序，一次一错 |
| Guardrails | 引入更多错 / 同错 3 次未解 / 需架构改动 / 缺依赖 → 停下问 | — |
| 下游 | 补测试 + 审查 | build-fix 不负责测试与审查 |

> 语言专项版：`/go-build`、`/react-build`、`/gradle-build`（Java/Kotlin）、`/flutter-build`。

---

### 缺陷修复

- **适用**：功能出现 Bug、行为不符合预期，需先用失败测试复现再修复
- **优势**：先证明 Bug 存在使其成为「修复」而非「调整」；可自动根因探索
- **缺点**：手动路径需自己衔接多命令

```text
路径一（自动）： /orch-fix-defect
路径二（手动）： 写失败测试 → 修复至通过 → /code-review → /prp-commit (或 /pr)
```

| 路径 | 流程 | 适用 |
|---|---|---|
| 自动 | /orch-fix-defect（用 `code-explorer` 定位根因 → 写失败回归测试 → 修复至通过 → `code-reviewer`（敏感路径用 `security-reviewer`）→ `fix:` 提交，仅 GATE2） | 要单命令自动 + 根因探索 |
| 手动 | 写失败测试 → 修复 → /code-review → /prp-commit（或 /pr）→ /pr | 要手动可控、走传统 TDD 修复链 |

> 与 `/orch-change-feature` 互斥：change 是「功能正常、需求变了」；fix 是「功能本该正常、出了错」。

---

### 安全重构

- **适用**：改善代码结构但外部行为必须保持不变；或清理技术债、瘦身依赖、合并重复代码
- **优势**：测试作安全网、行为中立；死代码删除分级 + 每步验证可回滚
- **缺点**：必须有测试覆盖（薄弱则先补特征测试）；diff 必须行为中立

```text
路径一： /orch-refine-code（行为中立重构，双门控）
路径二： /refactor-clean → /code-review（专清死代码 / 瘦身 / 合并重复）
```

| 路径 | 流程 | 适用 |
|---|---|---|
| 单命令 | /orch-refine-code（确认相关测试先通过 → 计划重构 → 小步重构 + 每次重跑测试 → 死代码/重复清理子委托 `refactor-cleaner` → `code-reviewer` → `refactor:` 提交） | 改善结构、行为不变 |
| 专项清理 | /refactor-clean（SAFE/CAUTION/DANGER 分级，先跑测试基线 → 删 → 重跑 → 失败即 `git checkout` 回滚） → /code-review | 清死代码、瘦身依赖、合并近重复 |

> 铁律：**不跑测试不删、一次一个、拿不准就跳过**。

---

### 质量补齐

- **适用**：覆盖率不足 80%、需要补齐边界/错误路径测试；某文件被格式 hook 报问题想复跑
- **优势**：覆盖率达标（≥80%）+ 格式统一；沿用项目模式、mock 外部依赖
- **缺点**：不含 lint / type 检查（需另跑）

```text
/test-coverage  →  /quality-gate  →  ( 可选 /refactor-clean )
 覆盖率 ≥80%       格式门禁           清理
```

| 步骤 | 命令 | 产出 |
|---|---|---|
| 测试 | /test-coverage | 按 Happy → Error → Edge → Branch 优先级生成测试，验证全绿 + Before/After 报告 |
| 格式 | /quality-gate | 单文件格式门禁（Biome/Prettier、gofmt、ruff format）；由 `post:quality-gate` hook 触发 |
| 清理（可选） | /refactor-clean | 死代码 / 重复清理 |

> `/quality-gate` 脚本不接 CLI 参数，路径放 stdin JSON；环境变量 `ECC_QUALITY_GATE_FIX=true`（修复）/`_STRICT=true`（严格）。

---

## 第 3 章 语言专属开发

### 语言三件套 —【一族选型卡片】

- **适用**：改完某语言代码、提交前要审查；为新函数补 TDD 测试或覆盖率不足；该语言构建失败、错误堆积
- **优势**：三件套各司其职、集成顺序清晰；review 委托 `*-reviewer` agent 跑该语言工具链
- **缺点**：仅限已覆盖语言；JS/TS/Node 无三件套（见 C2）

```text
/<lang>-test  →  /<lang>-build  →  /<lang>-review
 补 TDD 测试     构建失败时修错       提交前审查
```

> test 与 build 互为前后；review 的上游是 test、build，下游指向 `/code-review`（非该语言场景的替代关系）。

**语言覆盖矩阵**：

| 语言 | /lang-review | /lang-test | /lang-build | 工具链 / 备注 |
|---|---|---|---|---|
| **Go** | ✅ go-reviewer（惯用法/并发/错误/安全） | ✅ 表驱动测试，`go test -cover` | ✅ go-build-resolver | go vet、staticcheck、golangci-lint、`go build -race`、govulncheck |
| **C++** | ✅ cpp-reviewer（内存/并发/现代标准） | ✅ GoogleTest、CMake/CTest | ✅ cpp-build-resolver | clang-tidy 等 |
| **Kotlin** | ✅ kotlin-reviewer（Android/KMP/并发） | ✅ Kotlin 测试 | ✅ kotlin-build-resolver | `./gradlew detekt` 等 |
| **Rust** | ✅ rust-reviewer（所有权/unsafe/并发） | ✅ Rust 测试 | ✅ rust-build-resolver | cargo clippy 等 |
| **React** | ✅ react-reviewer（+ a11y） | ✅ RTL/Jest，≥80% | ✅ react-build-resolver | .tsx/.jsx 须伴跑 `typescript-reviewer` |
| **Vue** | ✅ vue-reviewer | （通用 /test-coverage） | （通用 /build-fix） | .vue 须伴跑 `typescript-reviewer` |
| **Flutter** | ✅ flutter-reviewer（**4 级**严重度） | ✅ flutter test | ✅ dart-build-resolver | **前置门控**：须先过 /flutter-build + /flutter-test + `flutter analyze` 无错、无合并冲突 |
| **Python** | ✅ python-reviewer（Django/FastAPI/Flask 框架专项） | （通用 /test-coverage） | （通用 /build-fix） | mypy、ruff、black、bandit、pip-audit、pytest；`/fastapi-review` 是 `/python-review` 下游 |

> 关联 skill：`golang-patterns/golang-testing`、`cpp-coding-standards/cpp-testing`、`rust-patterns`、`react-patterns/react-testing`、`flutter-dart-code-review`、`python-patterns/python-testing`、`fastapi-patterns`。

---

### JS / TS / Node 弱覆盖降级

- **适用**：改纯 TS/JS/Node 代码（无框架）；或 React/Vue 项目
- **优势**：React/Vue 场景能力自动到位（框架命令旁路调用 `typescript-reviewer`）
- **缺点**：覆盖最薄弱的主流生态——仅 1 个 `typescript-reviewer` agent，无命令三件套、无 build agent、无独立 skill

```text
纯 .ts/.js/Node（无框架）： /build-fix  +  /test-coverage  +  /code-review
React/Vue 项目：            /react-review   或   /vue-review   （自动旁路 typescript-reviewer）
TS 构建失败：               /build-fix     （React 项目用 /react-build）
```

| 场景 | 命令组合 | 入口 / 说明 |
|---|---|---|
| 纯 .ts/.js/Node（无框架） | /build-fix + /test-coverage + /code-review；或手动 invoke `typescript-reviewer` agent | 无一键命令 |
| React/Vue 项目（含 .tsx/.jsx/.vue） | /react-review 或 /vue-review | 框架命令自动旁路 `typescript-reviewer`（领域不重叠） |
| TS 构建失败 | /build-fix（React 项目用 /react-build） | 通用 / 框架命令 |

> 仓库官方自承缺口：纯 TS 类型错误 defer to 未实现的 `typescript-build-resolver`；无独立 `typescript-patterns` skill（借用 `coding-standards` + `frontend-patterns`/`backend-patterns`）。

---

## 第 4 章 其余场景简表

> 以下场景按分类合并简述，每类给出核心命令链 + 关键产出/注意。详情见 `01-command说明文档.md` 对应章节。

### 持续学习与本能

| 场景 | 命令链 | 产出 / 注意 |
|---|---|---|
| 会话学习沉淀 | /learn（或 /learn-eval）→ /skill-create | learned skill / SKILL.md；一 skill 一模式，不提取琐碎修复 |
| git 历史挖掘 | /skill-create --instincts → /instinct-import → /evolve → /promote | instinct YAML → 聚类固化为 command/skill/agent |
| 本能生命周期 | /instinct-status → /evolve → /promote → /prune | 查看聚类 → 晋升全局 → 清超 30 天未晋升 |
| skill 健康审视 | /skill-health → /evolve | 健康仪表盘（成功率/失败聚类）→ 演进 |

> 共同依赖 `instinct-cli.py`，本能存 `~/.claude/homunculus/`（项目级 / 全局级）。

### 会话与上下文

| 场景 | 命令链 | 产出 / 注意 |
|---|---|---|
| 跨会话接续 | /save-session →（新会话）/resume-session | 带日期文件；"NOT Work"段最关键（防盲目重试）；resume 绝不自动启动 |
| 长任务分段 | /checkpoint create → verify → list | git stash/commit 进度点；create 内部调 /verify；clear 保留最近 5 个 |
| 会话检索 | /sessions list/load/alias/info/aliases | 存 `~/.claude/session-data/`，别名存 `session-aliases.json` |

### 敏捷史诗（GitHub issue）

| 场景 | 命令链 | 产出 / 注意 |
|---|---|---|
| 史诗全流程 | /epic-claim → /epic-decompose → /epic-validate → /epic-publish → /epic-review | issue 正文「协调块」为事实源，本地 SQLite 缓存 |
| 同步 / 解阻 | /epic-sync、/epic-unblock | 拉取 issue 最新状态 / 批量恢复被阻塞史诗 |

> 别名映射：claim→/orch-add-feature、decompose→/plan、publish→/pr、review→/review-pr、validate→/quality-gate。

### 外部工单（Jira）

| 场景 | 命令链 | 产出 / 注意 |
|---|---|---|
| Jira 工单驱动 | /jira get → /plan → tdd-workflow → /code-review → /jira comment/transition | 从工单拉需求开始；进度回写评论、转换状态；凭据缺失则停 |

> 依赖 jira MCP（或环境变量 `JIRA_URL`/`JIRA_EMAIL`/`JIRA_API_TOKEN`）+ skill `jira-integration`。

### 项目接入与治理

| 场景 | 命令链 | 产出 / 注意 |
|---|---|---|
| 新项目接入 | /project-init（dry-run）→ /ecc-guide → /setup-pm | 默认 dry-run、不覆盖既有 CLAUDE.md/settings；按技术栈映射选组件 |
| ECC 自审 | /harness-audit、/skill-health | 确定性评分卡（≤12 类、每项 0-10）/ skill 健康度 |
| 升级 | /auto-update | 拉最新仓库变更 + 原 install-state 重装 |

### 安全成本与模型路由

| 场景 | 命令 | 产出 / 注意 |
|---|---|---|
| 安全门禁 | /security-scan（CI 接 `npx ecc-agentshield`） | critical/high 给路径/严重度/置信度/修复；`--fix` 只应用标记 safe 的 |
| 成本查看 | /cost-report | 读 `stop:cost-tracker` hook 日志（`~/.claude/metrics/costs.jsonl`），汇总 today/yesterday/total + 按模型 |
| 模型选档 | /model-route [task] [--budget low/med/high] | haiku（确定性低风险）/ sonnet（实现重构默认）/ opus（架构/深度审查/模糊）推荐 |

### 自动化循环

| 场景 | 命令链 | 产出 / 注意 |
|---|---|---|
| 托管自治循环 | /loop-start → /loop-status（--watch） | 选模式（sequential/continuous-pr/rfc-dag/infinite）；首次迭代前测试须过；**跨会话用 `npx ecc-universal ecc loop-status --json`** |

> 对抗双审查 `/santa-loop` 见 [B3](#流水线-b3对抗双审查推送)。

### Hook 管理

| 场景 | 命令链 | 产出 / 注意 |
|---|---|---|
| hook 规则治理 | /hookify → /hookify-list → /hookify-configure | 创建 `.claude/hookify.{name}.local.md` → 审计 → 启停（仅切换 `enabled:`） |

> 事件：bash/file/stop/prompt/all；动作：block/warn。

### 文档与架构维护

| 场景 | 命令 | 产出 / 注意 |
|---|---|---|
| 文档同步 | /update-docs | 从代码真相源（package.json/.env.example/openapi/Dockerfile）同步脚本参考/环境变量/CONTRIBUTING/RUNBOOK；用 `<!-- AUTO-GENERATED -->` 标记 |
| 架构地图 | /update-codemaps | token 精简 codemap（每个 <1000 tokens）；>30% 改动需审批 |

---

## 附录

### 常见依赖速查

| 依赖 | 涉及命令 |
|---|---|
| `gh` CLI | /pr、/prp-pr、/review-pr、/code-review（PR 模式）、/epic-* |
| `ccg-workflow` 运行时 | 所有 /multi-*（base ECC 不含，须 `npx ccg-workflow` 初始化） |
| `instinct-cli.py` | /instinct-*、/evolve、/promote、/prune、/projects、/skill-create --instincts |
| 各语言工具链 | /go-*、/cpp-*、/kotlin-*、/rust-*、/react-*、/vue-*、/flutter-*、/python-review、/fastapi-review、/gradle-build |
| 外部模型 CLI（codex/gemini） | /santa-loop、/multi-*（作为对抗 / 协作审查者） |
| `ECC_ROOT` 解析 | /quality-gate、/sessions、/instinct-*、/skill-health |

> 安装方式提醒：插件安装最省事（全量 skill、命名空间隔离），但 **rules 不随插件分发**，须手动补 `cp -R rules/<lang> ~/.claude/rules/`；multi-* 需另装 ccg-workflow；MCP 不自动启用。详见 `01-command说明文档.md`「附：使用须知」。

### 易混命令对比

**① `/feature-dev` vs `/orch-add-feature`**

| | `/feature-dev` | `/orch-add-feature` |
|---|---|---|
| 覆盖 | 独立版，约 4/5 环 | 编排全五环（研究→计划→TDD→审查→门控提交） |
| size 分类器 | 无 | 有（trivial/small/standard/large 按规模裁剪） |
| 安全审查 | 不自动触发 | 敏感路径自动触发 `security-reviewer` |
| TDD | 非强制 | 强制（按 operation 语义约束第一步） |
| **判别** | 想要独立、可控、单功能开发 | 想要一条命令端到端 + 内置门控 |

**② `/build-fix` vs `/orch-fix-defect`**

| | `/build-fix` | `/orch-fix-defect` |
|---|---|---|
| 修什么 | 构建/类型错（编译不过） | 运行时行为 Bug（逻辑错） |
| 起点 | 检测构建系统、单错误循环 | 先用失败回归测试证明 Bug 存在 |
| **判别** | build 中断时的逃生通道 | 功能本该正常、出了错 |

**③ `/tdd`（退役 shim → `tdd-workflow`）vs orch 的 TDD 阶段**

| | `/tdd` | orch 的 TDD 阶段 |
|---|---|---|
| 形态 | 独立完整循环（RED→GREEN→IMPROVE） | Phase 4 子步骤 |
| 约束 | 无 | 受 operation 语义约束第一步（add 写新测试 / fix 先证明 Bug / refine 不写测试） |

**④ `/plan` vs `/prp-plan`**

| | `/plan` | `/prp-plan` |
|---|---|---|
| 深度 | 精简计划、对标代码库模式、**WAIT 即停** | 自包含「黄金法则」——实现中要搜的现在就捕获 |
| 产出 | 计划 + 风险评估（可选写 `.claude/plans/`） | `.claude/PRPs/plans/{name}.plan.md` |
| **判别** | 轻量、想看清步骤再动手 | 已有 PRD、要一次性捕获所有模式进入单次实现 |

**⑤ `/plan-prd` vs `/prp-prd`**

| | `/plan-prd` | `/prp-prd` |
|---|---|---|
| 阶段数 | 4 阶段 | 8 阶段 |
| 风格 | 问题导向、反废话（缺失填 TBD） | 交互式、假设驱动、反复提问 |
| **判别** | 需求基本清晰、要快速可移交 PRD | 范围不清晰、需产品发现与可行性评估 |

**⑥ `/pr` vs `/prp-pr`**

| | `/pr` | `/prp-pr` |
|---|---|---|
| 制品发现范围 | `.claude/prds/` + `.claude/plans/` + `.claude/PRPs/` | 仅 `.claude/PRPs/` |
| 关系 | 较新版（范围更广） | 前身 |
| **判别** | 项目用 plan-prd/plan 或 PRP 工作流都适用 | 仅走 PRP 流水线 |

**⑦ `/code-review` vs `/review-pr`**

| | `/code-review` | `/review-pr` |
|---|---|---|
| 机制 | 单视角 + VALIDATE（跑 typecheck/lint/test/build）+ DECIDE + PUBLISH | 6 专业代理汇总去重 |
| 焦点 | 7 类×4 级、出 APPROVE/REQUEST CHANGES/BLOCK 裁决并发布 | 可 `--focus=comments\|tests\|errors\|types\|code\|simplify` 专项 |
| **判别** | 要跑验证、出裁决、发评论 | 要多视角专项深挖（仅报告置信度 ≥80） |

**⑧ `/multi-plan`→`/multi-execute` vs `/multi-backend\|frontend\|workflow`**

| | `/multi-plan` → `/multi-execute` | `/multi-backend\|frontend\|workflow` |
|---|---|---|
| 形态 | 分阶段（先只规划，新会话再执行） | 聚焦端到端六阶段（Research→Ideation→Plan→Execute→Optimize→Review） |
| **判别** | 想把规划与执行分离、跨会话 | 想一条命令跑完某领域（后端/前端/全栈） |

**⑨ `/gan-build` vs `/gan-design`**

| | `/gan-build` | `/gan-design` |
|---|---|---|
| 代理数 | 3（planner → generator ↔ evaluator） | 2（generator ↔ evaluator，无 planner） |
| 评估侧重 | 功能 + 通用 | 设计质量 0.35 / 原创性 0.30 / 工艺 0.25 / 功能 0.10 |
| **判别** | 实现任务自动收敛到达分 | 创意前端、追求视觉惊艳（摘要即规范） |

**⑩ `/<lang>-test`、`/<lang>-build` vs `/<lang>-review`**

| | `/<lang>-test`、`/<lang>-build` | `/<lang>-review` |
|---|---|---|
| 角色 | 上游（补 TDD 测试 / 构建失败时修错） | 下游（提交前审查） |
| 关系 | test 与 build 互为前后 | review 的上游是 test、build |
| **判别** | 写新代码补测试、构建挂了修错 | 改完代码、提交前审查 |

---

> 本文档基于 ECC v2.0.0 仓库实际文件整理，所有命令名/功能/上下游/产出均取自 `01-command说明文档.md`。命令体细节若与仓库演进不一致，以仓库源码为准。
