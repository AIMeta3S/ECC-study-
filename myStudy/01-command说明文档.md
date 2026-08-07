# ECC 命令全景说明文档

> 基于 ECC（everything-claude-code）v2.0.0 仓库**实际文件**整理，非 README 转述。覆盖范围：
> - **92 个活跃斜杠命令**（`commands/*.md`）
> - **12 个退役命令**（`legacy-command-shims/commands/*.md`）
> - **外部 CLI**（`ecc` 统一 CLI 17 子命令、`ecc-agentshield`、`ccg-workflow`、实用脚本、安装入口）
> - **附录：Claude Code 原生斜杠命令**（与 ECC 配合使用）
>
> 数据由对仓库源码的静态阅读得出，计数已与文件系统核对。

---

## 阅读说明

### 命名空间约定
ECC 的斜杠命令在两种安装方式下调用形式不同：

| 安装方式 | 调用形式 | 示例 |
|---|---|---|
| 插件安装（`/plugin install ecc@ecc`） | `/ecc:<name>` | `/ecc:plan` |
| 手动安装（`./install.sh --profile full` 或扁平复制） | `/<name>` | `/plan` |

> 本文表格统一用简形 `/<name>` 表示，实际调用时按你的安装方式加 `ecc:` 前缀（插件）或不加（手动）。两种方式**不可叠加**，详见 [纯手动安装过程分析.md](./纯手动安装过程分析.md)。

### 安装方式对命令可用性的影响
- **rules 不随插件分发**：插件用户需手动 `cp -R rules/<lang> ~/.claude/rules/`，否则规范类命令无规则可依。
- **multi-\* 命令需另装 `ccg-workflow` 运行时**（`npx ccg-workflow`），base ECC 不含。
- **MCP 不自动启用**：需把 `mcp-configs/mcp-servers.json` 条目粘进 `~/.claude/settings.json` 并填 API key。

### "依赖"列约定
每张命令表的"依赖"列列出该命令运行所需的：
- `agent: X` — 委托的子代理
- `skill: X` — 关联/委托的技能
- `命令流转` — 用完整句子描述命令间的制品传递，如"/plan-prd 产出 PRD 后，交给下游 /plan 继续做实现规划"；"上游"=在本命令之前执行、产出作为本命令输入，"下游"=在本命令之后执行、消费本命令产出
- `工具: X` — 外部 CLI / 工具链（gh、git、各语言 linter 等）
- `script: X` — 依赖的 `scripts/*.js` 脚本
- `MCP: X` — 需要的 MCP 服务
- `运行时: X` — 运行时环境（如 ccg-workflow）
- `无` — 无外部依赖（仅 Claude Code 本体）

### "适用场景"列约定
描述**何时该用**该命令（具体情境或遇到什么问题），采用"当…时；当…时"形式，不复述命令功能。

---

## 命令分类总览

| # | 分类 | 命令数 | 说明 |
|---|---|---|---|
| 1 | [需求规划与功能开发](#1-需求规划与功能开发) | 8 | plan / plan-prd / feature-dev / PRP 流水线(prp-*) |
| 2 | [Orch 端到端编排](#2-orch-端到端编排双门控) | 5 | add/build-mvp/change/fix/refine |
| 3 | [多模型协作编排 multi-\*](#3-多模型协作编排-multi-) | 5 | 需 ccg-workflow |
| 4 | [语言专属审查与构建](#4-语言专属审查与构建) | 22 | go/cpp/kotlin/rust/react/vue/flutter/python/fastapi；JS/TS 无独立命令（见 4.4） |
| 5 | [构建修复与质量门](#5-构建修复与质量门) | 4 | build-fix / refactor-clean / quality-gate / test-coverage |
| 6 | [代码审查与 PR](#6-代码审查与-pr) | 5 | code-review / review-pr / pr / aside / checkpoint |
| 7 | [对抗审查与自动化循环](#7-对抗审查与自动化循环) | 3 | santa-loop / loop-start / loop-status |
| 8 | [GAN 生成器-评估器循环](#8-gan-生成器-评估器循环) | 2 | gan-build / gan-design |
| 9 | [持续学习与本能系统](#9-持续学习与本能系统) | 11 | learn / skill-create / instinct-\* / evolve / promote / prune / projects |
| 10 | [会话与上下文管理](#10-会话与上下文管理) | 3 | sessions / save-session / resume-session |
| 11 | [文档与架构维护](#11-文档与架构维护) | 2 | update-docs / update-codemaps |
| 12 | [安全、成本与模型路由](#12-安全成本与模型路由) | 3 | security-scan / cost-report / model-route |
| 13 | [项目接入与包管理](#13-项目接入与包管理) | 3 | project-init / setup-pm / pm2 |
| 14 | [ECC 自身管理与元工具](#14-ecc-自身管理与元工具) | 3 | ecc-guide / harness-audit / auto-update |
| 15 | [敏捷/史诗管理 epic-\*](#15-敏捷史诗管理-epic-) | 7 | GitHub issue 协调 |
| 16 | [外部集成](#16-外部集成) | 1 | jira |
| 17 | [Hook 管理 hookify-\*](#17-hook-管理-hookify-) | 4 | 对话式生成 hook 规则 |
| 18 | [营销内容生成](#18-营销内容生成) | 1 | marketing-campaign |
| 19 | [退役命令](#19-退役命令-legacy-command-shims) | 12 | 转发到对应 skill |
| 20 | [外部 CLI 命令](#20-外部-cli-命令) | — | ecc / agentshield / ccg-workflow / 脚本 |
| 21 | [附录：Claude Code 原生斜杠命令](#21-附录claude-code-原生斜杠命令) | — | 与 ECC 配合 |

> 第 1–18 章合计 **92 个活跃斜杠命令**，与 `commands/*.md` 文件数一致。

---

## 1. 需求规划与功能开发

### 命令说明

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/plan` | 重述需求、识别风险、产出分阶段实施计划，**等待用户确认后才动代码** | 当要做新功能、架构改动、复杂重构，或需求不明确、想先看清步骤再动手时 | 分析请求 → 对标代码库模式（命名/错误/日志/数据/测试）→ 拆分阶段+依赖+复杂度 → 风险评估 → 呈现计划并 **WAIT 即停**（不自动进入实现）。可选写入 `.claude/plans/{name}.plan.md` | agent: planner（可选，仅显式委托时） | `/plan-prd`（PRD 制品）、`/prp-prd` | `tdd-workflow`、`/build-fix`、`/code-review`、`/pr`、`/prp-pr` | 本体只规划到 WAIT 为止；下游为建议后续步骤，需用户确认后手动衔接。参数 `[feature \| path/to/*.prd.md]` |
| `/plan-prd` | 生成**精简、问题导向**的 PRD，停在"是什么/为什么"，把"怎么做"交给 `/plan` | 当需求模糊、想快速产出一份诚实可移交的 PRD，又不想走 `/prp-prd` 的重型研究流程时 | 4 阶段每阶段一门控：框架（谁/什么/为什么/为什么现在）→ 定位（找证据，缺失记为"假设"）→ 决定（假设/MVP/范围外/开放问题）→ 生成 `.claude/prds/{name}.prd.md` 并移交 | 无 | — | `/plan`、`tdd-workflow`、`/pr` | 反废话：缺失填 `TBD`，绝不编造；成功标准含 `NO_IMPLEMENTATION_DETAIL`。是 `/prp-prd` 的轻量版 |
| `/feature-dev` | 引导式功能开发，强调**先理解现有代码再写新代码** | 当功能跨多模块、需要先摸清现有代码再做架构设计评审、再分阶段实现时 | 7 阶段：发现 → 代码库探索 → 澄清（等待用户）→ 架构设计（等待批准）→ 实现（倾向 TDD，小步提交）→ 质量审查 → 总结 | agent: code-explorer（探索）、code-architect（设计）、code-reviewer（审查） | — | — | 阶段 3/4 有门控 |
| `/prp-prd` | **交互式 PRD 生成器**——问题导向、假设驱动，带反复提问 | 当项目范围不清晰、需要先做产品发现与可行性评估，且接受反复澄清的交互式访谈时 | 8 阶段：启动 → 基础（谁/什么/为什么/如何衡量）→ 基础定位（市场+代码库研究）→ 深入（愿景/JTBD/约束）→ 技术可行性 → 决策（MVP/假设/范围）→ 生成 `.claude/PRPs/prds/{name}.prd.md` → 输出 | 无 | — | `/prp-plan`、`/plan`（简化路径）、`/save-session`（跨会话保留） | 参数 `<feature description \| path/to/prd.md>`。各阶段设门控，任何假设前停止。比 `/plan-prd` 重 |
| `/prp-plan` | 创建**自包含**的实现计划，捕获所有代码库模式以供单次实现 | 当已有 PRD 准备进入编码、希望把所有代码库模式一次性捕获、实现阶段不再回头搜代码时 | 阶段 0 检测输入 → 解析用户故事/复杂度/歧义门控 → 探索（8 类代码库搜索 + 5 次追踪）→ 外部库研究 → 设计+架构 → 生成 `.claude/PRPs/plans/{name}.plan.md` | 工具: grep/find/cat | `/prp-prd`（PRD 制品） | `/prp-implement`、`/plan`、`/prp-prd`（范围不清时） | 黄金法则："实现中要搜索代码库的，现在就捕获"。输入是 PRD 时自动选下一个 `pending` 阶段并翻为 `in-progress` |
| `/prp-implement` | 逐步执行计划文件，**每次改动后立即验证** | 当已有一份 `/prp-plan` 产出的计划、要严格按步实现，且希望每步改动立即验证、绝不积累损坏状态时 | 检测包管理器+脚本 → 加载计划 → 准备（git 分支决策、同步）→ 逐任务执行（读 MIRROR → 实现 → 每文件类型检查）→ 5 级验证（静态/单元/构建/集成/边缘）→ 报告（写 `reports/`、归档计划到 `completed/`、更新 PRD 阶段为 `complete`） | 工具: 包管理器（npm/pnpm/yarn/bun）、git、typecheck/lint/test/build | `/prp-plan`（计划文件） | `/code-review`、`/prp-commit`、`/prp-pr`、`/prp-plan`（多阶段时） | 参数 `<path/to/plan.md>`。核心理念"绝不积累损坏状态" |
| `/prp-commit` | 用**自然语言描述**要提交什么，自动暂存匹配文件并生成 Conventional Commit | 当想用一句话描述要提交的范围（如"只提交数据库迁移""除测试外"）、并自动生成规范 commit message 时 | 评估（`git status`）→ 解释与暂存（空=全部、`staged`、glob、`except tests`、"auth changes"等）→ 提交（祈使语气、`feat:`/`fix:` 等前缀、<72 字符）→ 输出 | 工具: git | — | `/prp-pr`、`/code-review` | 参数 `[target description]`。空输出则停。示例：`except tests`、`the database migration` |
| `/prp-pr` | 从当前有未推送提交的分支创建 GitHub PR——发现模板、分析改动、推送 | 当分支已有未推送提交、要开一个正文详尽的 PR，且项目走 PRP 流水线、想自动套用 PRP 制品填模板时 | 验证（非默认分支、干净树、领先提交、无现存 PR）→ 发现（PR 模板、提交分析、文件分析、PRP 制品）→ 推送 → 创建（填充模板或默认、`gh pr create --draft`）→ 验证 → 输出 | 工具: gh CLI、git | `/prp-implement`（未推送分支）、`/prp-commit` | `/code-review` | 参数 `[base-branch]`。处理大 PR（>20 文件）警告、`--force-with-lease`、多模板。是 `/pr` 的前身（仅查 PRP 制品） |

---

## 2. Orch 端到端编排（双门控）

> 5 个命令都是同名 `orch-*` **技能**的轻量封装，共享 `orch-pipeline` 引擎：**双门控**（GATE 1 = 计划批准、GATE 2 = 提交前确认）+ **TDD** + `code-reviewer`（敏感路径触发 `security-reviewer`）。差异在"改动性质"。

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/orch-add-feature` | 端到端编排**全新功能**：研究→计划→TDD→审查→门控提交 | 当要从零新增一个原本不存在的功能（既非修改也非修 Bug）时 | 分类大小+层级 → 研究后出任务列表 → GATE 1 → 逐任务 TDD + `code-reviewer`（+安全）→ `feat:` 提交 → GATE 2 | skill: orch-add-feature、orch-pipeline；agent: code-reviewer、security-reviewer（敏感路径） | — | — | 参数 `<what to add>` |
| `/orch-build-mvp` | 从设计/规范文档**引导工作 MVP**：摄取→切片→引导→TDD→审查→提交 | 当有一份设计/规范文档、要从零引导出可运行 MVP，且想按垂直切片逐步交付时 | 读规范、提取按垂直切片排序的范围 → GATE 1 → 引导首个端到端切片 → 复用 GAN 框架（`/gan-build --skip-planner`，生成器↔评估器循环）→ `code-reviewer` + 切片提交为 `feat:` → GATE 2 | skill: orch-build-mvp、orch-pipeline；命令: /gan-build（内部复用 GAN 框架）；agent: code-reviewer、security-reviewer（敏感切片） | 设计/规范文档（可由 `/plan-prd` 产出，推理） | — | 参数 `<path to design/spec doc>`。唯一重用 GAN 框架 + 引导阶段 |
| `/orch-change-feature` | 把**正常工作的功能改为新行为**——测试先改为新规范，再改实现 | 当现有功能行为正确、但需求已变、需要把它调整为新行为（非 Bug、非新增）时 | 分类 → 轻量计划（仅需研究时）→ GATE 1 → **先改测试为新行为**，再改实现至通过 → `code-reviewer` + 提交 → GATE 2 | skill: orch-change-feature、orch-pipeline；agent: code-reviewer、security-reviewer（敏感路径） | — | — | 要点："先改测试使其成为调整而非修复"。与 fix-defect/add-feature 互斥 |
| `/orch-fix-defect` | 修复 Bug——先**用失败回归测试证明 Bug 存在**，再修至通过 | 当功能出现 Bug、行为不符合预期，且需要先用失败测试复现再修复时 | 分类 → 若原因不清用 `code-explorer` 定位根因 → 写失败回归测试 → 修复至通过 → `code-reviewer`（敏感路径用 `security-reviewer`）→ `fix:` 提交 → GATE 2 | skill: orch-fix-defect、orch-pipeline；agent: code-explorer（定位根因）、code-reviewer、security-reviewer（敏感路径） | — | — | 无 GATE 1（默认小规模，范围由探索器定）。要点："先证明 Bug 存在使其成为修复" |
| `/orch-refine-code` | **保持行为的重构**——确认测试通过→重构→保持通过→审查→提交 | 当想改善代码结构、但外部行为必须保持不变，且已有测试覆盖可作重构安全网时 | 分类（默认标准）→ 确认相关测试先通过（薄弱则加特征测试）、计划重构 → GATE 1 → 小步重构 + 每次重跑测试 → 死代码/重复清理子委托 `refactor-cleaner` → `code-reviewer`、`refactor:` 提交 → GATE 2 | skill: orch-refine-code、orch-pipeline；agent: code-reviewer、refactor-cleaner（子委托） | — | — | diff 必须行为中立 |

### 与其他相似命令的区别

> 区别分两层：**家族内**靠"TDD 第一步怎么动测试"区分改动性质；**家族外** orch-* 是把已有单步命令**编排**进带门控的统一流水线（compose, not replace）。

**① 家族内（first-move rule）**——同一 pipeline，靠 Phase 4 第一步分语义（上表"说明"列的提炼）：

| 命令 | 改动性质 | TDD 第一步 | 判别 |
|---|---|---|---|
| `/orch-add-feature` | 从零新增 | 写**新**失败测试 | 东西原本不存在 |
| `/orch-change-feature` | 行为变更 | **先改现有测试**为新规范 | 功能原本正常、需求变了 |
| `/orch-fix-defect` | 修 Bug | **先用失败回归测试证明 Bug** | 功能本该正常、出了错 |
| `/orch-refine-code` | 重构 | **不写新测试**，现有测试保绿 | 行为不变、只动结构 |
| `/orch-build-mvp` | 引导 MVP | 唯一走 Phase 3 Scaffold + 复用 GAN | 有 SDD、按垂直切片 |

> 引擎原话："Changing the tests first is what separates a tweak from a fix"——靠"测试先怎么动"区分 tweak / fix / add / refine。

**② 家族外**——orch-* 在单步命令之上只加三样东西。引擎自述："These wrappers **compose** existing ECC commands rather than replace them: `/feature-dev`、`/plan`、`/code-review`、`/build-fix`、`/refactor-clean`、`/gan-build` + `tdd-workflow` skill"。即加：① size 分类器（trivial/small/standard/large，按规模裁剪阶段）；② 双门控（计划审批 / 提交确认，gated not autonomous）；③ 统一 agent 映射表。而 `/plan`、`/code-review`、`/build-fix`、`/tdd`、`/refactor-clean` 各只覆盖"研究→计划→TDD→审查→门控提交"五环中的**一环**。

**③ 三个易混对比**：

| 对比 | 区别 |
|---|---|
| `/feature-dev` vs `/orch-add-feature` | feature-dev 是 orch-add-feature 的"独立版"（覆盖约 4/5 环），但无 size 分类器、无 security-reviewer 自动触发、TDD 非强制 |
| `/build-fix` vs `/orch-fix-defect` | build-fix 修**构建/类型错**（编译不过）；orch-fix-defect 修**行为 Bug**（运行时逻辑错）。前者是后者在 build 中断时的逃生通道 |
| `/tdd` vs orch 的 TDD 阶段 | `/tdd` 是独立完整循环；orch 把它当 Phase 4 子步骤，并按 operation 语义约束第一步 |

**④ 与第 1 章 PRP 流水线的区别**：流水线 A/B/C/D 也是端到端，但是**用户手动衔接多命令**（制品驱动、可审计）；orch-* 是**单命令自动跑完**、门控内置。

---

## 3. 多模型协作编排 multi-*

> ⚠️ **5 个命令全部强依赖外部 `ccg-workflow` 运行时**（base ECC 不含）。须先 `npx ccg-workflow` 初始化，它会提供 `~/.claude/bin/codeagent-wrapper`（统一调用入口）与 `~/.claude/.ccg/prompts/{codex,gemini}/*.md`（角色 prompt）。未安装则命令无法正确运行。
>
> **统一信任规则**：后端听 Codex、前端听 Gemini；**外部模型零文件写权限，Claude 是唯一写者**；外部输出当作"脏原型"必须由 Claude 重构为生产级代码。
>
> multi-plan/multi-execute 内部又以 `/ccg:plan`、`/ccg:execute` 互指（对应 ccg-workflow 的命令族）。

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/multi-plan` | 多模型协作**只做规划**：上下文检索 + 双模型分析 → 分步计划，**绝不改生产代码** | 当需求已明确、动手前想用多模型交叉验证计划，且本轮只想要规划、暂不碰生产代码时 | Phase1 上下文检索（`ace-tool` MCP 或内置工具，先 prompt 增强）→ Phase2 并行调 Codex(analyzer)+Gemini(analyzer)，交叉验证共识/分歧 →（可选）双模型出计划草稿 → Claude 综合最终计划存 `.claude/plan/<feature>.md` → 输出 SESSION，提示用户新开会话跑 `/ccg:execute` | 运行时: ccg-workflow；工具: codeagent-wrapper、Codex/Gemini；MCP: ace-tool（可选）；agent: Explore | — | `/multi-execute`（=/ccg:execute） | 硬规则：只读、不允许自动执行。TaskOutput 超时必须 600000ms、禁止 kill |
| `/multi-execute` | 多模型协作**执行**计划：取原型 → Claude 重构落地 → 多模型审计 | 当已有 `/multi-plan` 产出的计划并已批准、准备真正写代码，且想让多模型出原型、Claude 重构落地时 | Phase0 读计划、提取 SESSION、按任务类型路由（前端→Gemini/后端→Codex/全栈→并行）→ 上下文检索 → 取原型（调对应模型返回 **Unified Diff Patch**，禁止实际改文件）→ Claude 作为"代码主权者"解析 Diff、心理沙盒、重构为生产级、用 Edit/Write 落地、自验证 → 并行调 Codex(reviewer)+Gemini(reviewer) 审计，整合修复直至风险可接受 | 运行时: ccg-workflow；工具: codeagent-wrapper、Codex/Gemini；MCP: ace-tool（可选）；agent: Explore；resume 会话复用 | `/multi-plan`（计划 + SESSION_ID） | — | 可 `resume <SESSION_ID>` 复用 plan 阶段会话。核心："Code Sovereignty"+"Dirty Prototype Refactoring" |
| `/multi-backend` | 后端聚焦端到端工作流（Research→Ideation→Plan→Execute→Optimize→Review），**Codex 主导** | 当任务是 API/算法/数据库/业务逻辑等纯后端领域，且需要 Codex 主导、多模型协作时 | 6 阶段：(可选 prompt 增强) → Research → Codex(analyzer) 出 ≥2 方案并存 SESSION → Codex(architect) resume 出设计 → Claude 实现 → Codex(reviewer) 审查优化 → 质量评审 | 运行时: ccg-workflow；工具: codeagent-wrapper、Codex（主导）、Gemini（参考）；MCP: ace-tool（可选）；resume 会话复用 | — | — | Gemini 后端意见仅供参考。调用为串行 |
| `/multi-frontend` | 前端聚焦端到端工作流（同六阶段），**Gemini 主导** | 当任务是组件/响应式布局/UI 动效/样式等纯前端领域，且需要 Gemini 主导、多模型协作时 | 与 multi-backend 镜像：Gemini(analyzer) 出方案并存 SESSION → Gemini(architect) resume 出组件结构/UI 流/样式 → Claude 实现 → Gemini(reviewer) 审无障碍/响应式/设计一致性 → 质量评审 | 运行时: ccg-workflow；工具: codeagent-wrapper、Gemini（主导）、Codex（参考）；MCP: ace-tool（可选）；resume 会话复用 | — | — | Codex 前端意见仅供参考。走 `--backend gemini --gemini-model gemini-3-pro-preview` |
| `/multi-workflow` | 完整多模型开发工作流（同六阶段），**智能路由**：前端→Gemini、后端→Codex、全栈→并行 | 当特性跨前后端、需要完整六阶段多模型流水线，且需要智能路由（前端→Gemini、后端→Codex）时 | Research（prompt 增强+上下文检索，完整度评分 ≥7 才继续）→ 并行 Codex(analyzer)+Gemini(analyzer) 出方案 → 并行 resume 出双端架构、Claude 综合 → 实现 → 并行双 reviewer 审查 → 质量评审 | 运行时: ccg-workflow；工具: codeagent-wrapper、Codex/Gemini（并行）；MCP: ace-tool（可选）；script: orchestrate-worktrees.js（可选外部编排） | — | — | 全程并行。分数 <7 或用户不批则强制停 |

---

## 4. 语言专属审查与构建

### 4.1 系统语言矩阵（go / cpp / kotlin / rust）

> **共同模式**：`*-review`/`*-test`/`*-build` 三件套。`*-review` 委托 `*-reviewer` agent，跑该语言静态分析工具链，按 **关键/高/中** 3 级分阶段报告；`*-test` 是 TDD 流程（先写表驱动/失败测试→实现→覆盖率 ≥80%）；`*-build` 委托 `*-build-resolver` agent，增量最小化修构建错误（同错 3 次未解/引入更多错则停）。审查范围随语言特性变化（内存安全/并发/所有权等）。
>
> **何时用哪类**：当改完某语言代码、提交前要审查时用 `*-review`；当为新函数补 TDD 测试或覆盖率不足时用 `*-test`；当该语言构建失败、类型/vet/lint 错误堆积时用 `*-build`。

| 语言 | `/lang-review`（审查） | `/lang-test`（TDD） | `/lang-build`（构建修复） | 工具链 |
|---|---|---|---|---|
| **Go** | `[agent:go-reviewer]` 惯用法/并发安全/错误处理/安全 | 表驱动测试优先，`go test -cover` | `[agent:go-build-resolver]` | `go vet`、`staticcheck`、`golangci-lint`、`go build -race`、`govulncheck` |
| **C++** | `[agent:cpp-reviewer]` 内存/并发/现代标准 | GoogleTest、CMake/CTest | `[agent:cpp-build-resolver]` | `clang-tidy` 等 |
| **Kotlin** | `[agent:kotlin-reviewer]` Android/KMP/并发 | Kotlin 测试 | `[agent:kotlin-build-resolver]` | `./gradlew detekt` 等 |
| **Rust** | `[agent:rust-reviewer]` 所有权/unsafe/并发 | Rust 测试 | `[agent:rust-build-resolver]` | `cargo clippy` 等 |

> 关联 skill：`golang-patterns/golang-testing`、`cpp-coding-standards/cpp-testing`、`rust-patterns` 等。**三件套集成顺序（上下游）**：`/<lang>-test`（补 TDD 测试）→ `/<lang>-build`（构建失败时修错，与 test 互为前后）→ `/<lang>-review`（提交前审查）。即 `*-review` 的上游是 `*-test`、`*-build`；`*-test`/`*-build` 的下游指向 `*-review`；非该语言场景改用通用 `/code-review`（替代关系，非上下游）。
>
> **共同依赖**：review 委托 `*-reviewer` agent；build 委托 `*-build-resolver` agent；test 关联 `*-testing` skill + `tdd-workflow` skill；工具链见上表。

### 4.2 前端框架（react / vue / flutter）

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/react-review` | React 组件审查（含无障碍） | 当改动涉及 React/Next.js 组件、提交前或 PR 审查时 | `[agent:react-reviewer]` 跑工具链+a11y eslint+`npm audit`，3 级分阶段报告 | agent: react-reviewer、typescript-reviewer（须伴跑）；skill: react-patterns、react-testing、accessibility；工具: a11y eslint、tsc、npm audit | — | `/react-build`、`/react-test`、`/code-review` | .tsx/.jsx 时须伴跑 typescript-reviewer（领域不重叠） |
| `/react-test` | React 组件 TDD | 当为新 React 组件补 TDD 测试、或现有组件覆盖率不足时 | RTL/Jest 优先，覆盖率 ≥80% | skill: react-testing；工具: RTL/Jest/Vitest | — | `/react-build`、`/react-review`、`tdd-workflow` |  |
| `/react-build` | 修复 React/TS 构建/类型错误 | 当 React/TypeScript 项目构建失败、类型错误堆积时 | 检测工具链→分组排序→单错循环 | agent: react-build-resolver；工具: tsc、bundler | — | `/react-test`、`/react-review`、`/build-fix` | 通用 `/build-fix` 的 React 专项版 |
| `/vue-review` | Vue 组件审查 | 当改动涉及 Vue 组件、提交前或 PR 审查时 | `[agent:vue-reviewer]` 跑 `vue-tsc --noEmit`+`vue/no-v-html` | agent: vue-reviewer、typescript-reviewer（须伴跑）；skill: vue-patterns；工具: vue-tsc、eslint vue 规则 | — | `/code-review`（非 Vue 时，推理） | .vue 时须伴跑 typescript-reviewer |
| `/flutter-review` | Flutter/Dart 审查 | 当改动涉及 Flutter/Dart、提交前要审查，且 build/test/analyze 已通过时 | `[agent:flutter-reviewer]`，**4 级**严重度（关键/高/中/低） | agent: flutter-reviewer；skill: flutter-dart-code-review；工具: flutter analyze | `/flutter-build`、`/flutter-test`（前置门控） | `/code-review` | 前置门控：须先通过 /flutter-build+/flutter-test+`flutter analyze` 无错、无合并冲突 |
| `/flutter-test` | Flutter TDD | 当为 Flutter 补 TDD 测试、或 Widget 测试不足时 | Flutter test 工具链 | 工具: flutter test | — | `/flutter-build`、`/flutter-review`、`tdd-workflow` |  |
| `/flutter-build` | 修复 Flutter 构建 | 当 Flutter 项目构建失败时 | 检测工具链→分组→单错循环 | agent: dart-build-resolver；工具: flutter analyze、flutter build | — | `/flutter-test`、`/flutter-review` |  |

### 4.3 脚本与框架审查

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/python-review` | 全面 Python 审查（PEP 8/类型/安全/Pythonic） | 当改动涉及 Python、提交前或 PR 审查，且用 Django/FastAPI/Flask 需框架专项检查时 | `[agent:python-reviewer]` 跑工具链，对 Django(N+1/迁移)、FastAPI(CORS/Pydantic/async)、Flask(上下文/Blueprint) 做框架专项 | agent: python-reviewer；skill: python-patterns、python-testing；工具: mypy、ruff、black、isort、bandit、pip-audit、safety、pytest | — | `/code-review`、`/build-fix`、`tdd-workflow` | Python 仅有 review，无独立 test/build（用通用 `/test-coverage`、`/build-fix`） |
| `/fastapi-review` | FastAPI 专项审查（架构/异步/DI/Pydantic/安全/性能/可测） | 当要审查一个 FastAPI 应用的异步正确性、依赖注入、Pydantic schema、CORS/认证等安全点时 | 单次委托 `[agent:fastapi-reviewer]`：路由边界/中间件/异常、Pydantic 分离、DI、异步 DB/HTTP、CORS/认证/限流、OpenAPI 元数据、测试客户端+DI 覆盖 | agent: fastapi-reviewer；skill: fastapi-patterns | — | `/python-review` | 参数 `[file-or-directory]`。比语言 `*-review` 轻（无分阶段门控） |
| `/gradle-build` | 修复 Java/Kotlin Gradle 构建错误 | 当 Java/Kotlin 的 Gradle（或 Maven）构建失败、错误堆积时 | 检测 Gradle/工具链→分组→单错循环 | agent: java-build-resolver 或 kotlin-build-resolver；工具: gradle、detekt | — | `/kotlin-test`、`/kotlin-review`（推理） | |

### 4.4 JS/TS/Node 覆盖现状（无独立命令）

> **与其他语言不同，JS/TS/Node 在 `commands/` 层没有独立三件套**——无 `/typescript-review`、`/js-review`、`/node-build` 等命令文件（`commands/` 下 grep `ts/js/node` 仅误命中 `projects.md`）。这是 ECC 仓库 v2.0.0 的真实覆盖状态（文档"基于仓库实际文件整理"原则的如实反映），**非本表遗漏**。其能力以**单 agent + 框架命令旁路**的形式隐式存在。

**能力矩阵（按 review / test / build 三层对照其他语言）**

| 能力层 | Go/C++/Kotlin/Rust/React/Flutter | Python/Vue | **JS/TS/Node** |
|---|---|---|---|
| review | ✅ `*-review` 命令 + `*-reviewer` agent | ✅ 命令 + agent | ⚠️ **无命令**；仅 `typescript-reviewer` agent（覆盖 TS+JS+Node），靠 `/react-review`、`/vue-review` 旁路调用 |
| test | ✅ `*-test` 命令 | ❌ 用通用 `/test-coverage` | ❌ 用通用 `/test-coverage` |
| build | ✅ `*-build` 命令 + `*-build-resolver` agent | ❌ 用通用 `/build-fix` | ⚠️ **无命令、无 agent**；纯 TS 类型错走通用 `/build-fix` |

**唯一的语言级 agent：`typescript-reviewer`**（[agents/typescript-reviewer.md](../agents/typescript-reviewer.md)，model: sonnet）

- **覆盖范围**：TypeScript + JavaScript + Node.js 安全（description 明示 "TypeScript/JavaScript"，内含 "Node.js Specifics" 审查段：同步 fs 阻塞事件循环、`process.env` 未校验、ESM 中误用 `require` 等）
- **工具链**：`npm run typecheck --if-present` / `tsc --noEmit -p <config>`、`eslint . --ext .ts,.tsx,.js,.jsx`、`prettier --check`、`npm audit`、`vitest run` / `jest --ci`
- **严重度分级**：CRITICAL（注入/XSS/原型污染/硬编码密钥）→ HIGH（类型安全/async 正确性/错误处理/Node）→ MEDIUM（React fallback/性能/最佳实践）；**仅报告不改码**

**访问路径（三选一）**

| 场景 | 怎么用 | 入口 | 上游 | 下游 |
|---|---|---|---|---|
| React/Vue 项目（含 .tsx/.jsx/.vue） | `/react-review`、`/vue-review` **自动旁路**调用 `typescript-reviewer` | 框架命令 | — | `/code-review` |
| 纯 .ts/.js/Node 项目（无框架） | **无一键命令**；走通用 `/code-review`（审查）+ `/build-fix`（构建）+ `/test-coverage`（测试）；或手动 invoke `typescript-reviewer` agent | 通用命令 | — | — |
| TS 构建失败 | 通用 `/build-fix`（React 项目用 `/react-build`） | 通用/框架命令 | — | `/react-test`、`/code-review` |

> **仓库官方自承的两处缺口**（执行时勿误以为是 bug）：
>
> 1. [agents/react-build-resolver.md](../agents/react-build-resolver.md) Scope 段：纯 TS 类型错误 *"defer to a future `typescript-build-resolver`"* —— 该 build agent **计划中未实现**。
> 2. [agents/typescript-reviewer.md](../agents/typescript-reviewer.md) Reference 段：*"This repo does not yet ship a dedicated `typescript-patterns` skill"* —— 配套 skill **未独立**，借用 `coding-standards` + `frontend-patterns`/`backend-patterns`。

**总结**：JS/TS/Node 是覆盖最薄弱的主流生态——仅 1 个 `typescript-reviewer` agent，无命令三件套、无 build agent、无独立 skill。改 React/Vue 代码时能力自动到位（旁路调用）；改纯 TS/JS 代码时降级为通用 `/code-review` + `/build-fix` + `/test-coverage`。  |

---

## 5. 构建修复与质量门

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/build-fix` | 检测构建系统，逐个**最小化**修复构建/类型错误 | 当任意项目构建失败、类型错误堆积，想逐个最小化修复而不重构时 | 检测构建系统（npm/tsc/cargo/mvn/gradle/go/mypy）→ 跑构建、按文件分组排序 → 单错误循环（读→诊断→最小 Edit→重跑）→ Guardrails（修复引入更多错/同错 3 次/需架构改动/缺依赖时停下问）→ 总结 | 工具: npm/tsc/cargo/mvn/gradle/go/mypy（按项目） | — | — | 语言无关版；`go-build`/`react-build`/`gradle-build` 是其专项版。一次一错、最小 diff、不重构 |
| `/refactor-clean` | 安全识别并删除死代码，**每步验证测试** | 当要清理技术债、瘦身依赖、合并重复代码，且不确定哪些能安全删除时 | 检测死代码（knip/depcheck/ts-prune/vulture/deadcode/cargo-udeps 或 Grep）→ 分级 SAFE/CAUTION/DANGER → SAFE 逐个删（先跑测试基线→删→重跑→失败即 `git checkout` 回滚）→ CAUTION 查动态/字符串引用 → 合并近重复 → 总结 | 工具: knip/depcheck/ts-prune/vulture/deadcode/cargo-udeps（任一）、git（回滚）、项目测试框架 | — | — | 铁律：不跑测试不删、一次一个、拿不准就跳过 |
| `/quality-gate` | 对单文件跑格式化质量门禁并报告整改步骤 | 当某文件被 `post:quality-gate` hook 报格式问题、想手动复跑或排查，或想把格式失败转为门禁阻断时 | 把 hook 风格 JSON 经 stdin 传 `scripts/hooks/quality-gate.js`（`tool_input.file_path`）；按扩展名选格式化器 | script: scripts/hooks/quality-gate.js；工具: Biome/Prettier（.ts/.tsx/.js/.jsx/.json/.md）、gofmt（.go）、ruff format（.py） | —（由 post:quality-gate hook 触发） | — | 脚本不接 CLI 参数，路径放 stdin JSON。环境变量 `ECC_QUALITY_GATE_FIX=true`（修复）/`_STRICT=true`（严格）。不含 lint/type |
| `/test-coverage` | 分析覆盖率缺口并生成缺失测试，目标 **≥80%** | 当覆盖率不足 80%、需要补齐边界/错误路径测试时 | 检测框架 → 解析报告列 <80% 文件 → 按 Happy path→Error→Edge→Branch 优先级生成测试 → 验证全绿+复跑覆盖率 → Before/After 报告 | 工具: jest/vitest/pytest/cargo llvm-cov/jacoco/go test（按项目） | — | — | 沿用项目模式、mock 外部依赖 |

---

## 6. 代码审查与 PR

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/code-review` | 全面审查：本地未提交改动 或 GitHub PR（传 PR 号/URL） | 当提交前想自审本地改动，或要对一个 GitHub PR 做安全+质量审查时 | **本地**：GATHER diff → REVIEW 4 类检查 → REPORT（CRITICAL/HIGH 阻断）。**PR**：FETCH(`gh pr diff`)→CONTEXT(读 CLAUDE.md/PRD)→REVIEW(7 类×4 级)→VALIDATE(跑 typecheck/lint/test/build)→DECIDE(APPROVE/REQUEST CHANGES/BLOCK)→REPORT(写 `.claude/reviews/pr-<N>-review.md`)→PUBLISH(`gh pr review`) | 工具: gh CLI（PR 模式）、typecheck/lint/test/build（VALIDATE 阶段） | — | — | 参数 `[pr-number \| pr-url \| blank]`。无 gh 时回退本地审查 |
| `/review-pr` | 用**多个专业代理**做全面 PR 审查 | 当合并前要做多视角深度 PR 审查，或想专注某一方面（评论/测试/错误/类型/简化）时 | `gh pr view` 识别 PR → 查项目指南（CLAUDE.md/lint/tsconfig）→ 跑 6 个专业代理 → 汇总去重按严重性排序 → 按严重性分组报告 | 工具: gh CLI；agent: code-reviewer、comment-analyzer、pr-test-analyzer、silent-failure-hunter、type-design-analyzer、code-simplifier | — | — | 参数 `[PR-number-or-URL] [--focus=comments\|tests\|errors\|types\|code\|simplify]`。仅报告置信度 ≥80 的发现 |
| `/pr` | 从当前有未推送提交的分支创建 GitHub PR | 当分支已有未推送提交、要创建 GitHub PR，且项目用 `/plan-prd`+`/plan` 工作流、想自动套用制品时 | 与 `/prp-pr` 同 6 阶段（验证→发现→推送→创建→验证→输出）；区别在阶段 2 发现同时查 `.claude/prds/`+`.claude/plans/` 与 `.claude/PRPs/` | 工具: gh CLI | `/plan-prd`、`/plan`（PRD/plan 制品） | `/code-review` | 参数 `[base-branch]`。是 `/prp-pr` 的较新版（制品发现范围更广） |
| `/aside` | 任务进行中**插问**，即时回答后自动恢复主任务（只读） | 当工作中想插问一个相关问题、或需要二次确认，又不想开新会话打断当前任务时 | 冻结当前任务状态 → 简洁回答（`ASIDE:` 格式）→ 立即恢复主任务。含边界处理（无问题/揭示风险/方向变更/链式提问） | 无 | — | — | 纯只读，不写会话文件除非与结果强相关 |
| `/checkpoint` | 创建/验证/列出工作流检查点（git stash 或 commit） | 当长任务想分段保存进度、做阶段间对比，或需要回滚参照点时 | 4 子命令：`create`（先 `/verify quick`→git stash/commit→写 `.claude/checkpoints.log`）；`verify`；`list`；`clear`（保留最近 5 个） | 工具: git；命令: /verify（create 子流程内部调用） | — | — | /verify 见[退役命令](#19-退役命令-legacy-command-shims) |

---

## 7. 对抗审查与自动化循环

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/santa-loop` | **对抗性双审查收敛**——代码推送前，两个独立模型审查者必须都批准 | 当代码即将推送、需要两个独立模型都审查通过才放心时 | 定范围（参数或未提交改动）→ 构建客观 PASS/FAIL 评分标准 → 并行启动两个独立审查者（A=Claude Opus `code-reviewer`；B=codex/gemini CLI 或 Claude 回退）→ 判定（都过=NICE→推；任一失败=NAUGHTY→修复周期）→ NAUGHTY 修所有标记、`fix:` 提交、用**新鲜审查者**重跑；NICE 则 `git push` → 最终报告 | skill: santa-method；agent: code-reviewer（审查者 A）；工具: codex/gemini CLI（审查者 B，偏好 codex>gemini>Claude）、git（push） | — | — | 最多 3 次迭代，3 次后升级而非推送。外部审查者在 `--sandbox read-only`。每轮用新鲜审查者防锚定 |
| `/loop-start` | 用安全默认值和明确停止条件启动**托管自治循环** | 当需要长时间运行的自治工作（持续提 PR、推进 RFC DAG）时 | 确认仓库/分支 → 选模式（sequential/continuous-pr/rfc-dag/infinite）+ 模型层级 → 启用 hooks/profile（safe vs fast）→ 在 `.claude/plans/` 写循环计划+runbook → 打印开始/监控命令 | 配置: ECC_HOOK_PROFILE（safe/fast）；hooks/profile | — | `/loop-status`（推理：启动后监控） | 参数 `[pattern] [--mode safe\|fast]`。安全检查：首次迭代前测试通过、ECC_HOOK_PROFILE 未全局禁用、明确停止条件 |
| `/loop-status` | 检查活动循环状态、进度、失败信号并推荐干预 | 当要查看活动循环进度，或怀疑某个循环会话已卡死、需要干预时 | 报告活动模式、当前阶段+最后检查点、失败检查、时间/成本漂移、推荐干预（继续/暂停/停止）。`--watch` 定期刷新；`--write-dir` 写 `index.json`+每会话 JSON 快照 | 工具: ecc loop-status CLI（跨会话监控）、node；扫描: `~/.claude/projects/**` JSONL | `/loop-start`（推理：监控其启动的循环） | — | 参数 `[--watch]`。**关键**：若会话卡死，斜杠命令只能在本会话出队后跑——跨会话用 `npx --package ecc-universal ecc loop-status --json` |

---

## 8. GAN 生成器-评估器循环

> 共同框架：**generator ↔ evaluator 收敛循环**，受 Anthropic 2026 年 3 月框架设计论文启发。在 `gan-harness/` 下运行，generator 读规范+先前反馈构建并提交，evaluator 实时测试/评分/写反馈，达到通过阈值或 2 次迭代后平稳则停止。

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/gan-build` | 3 代理构建循环（规划器→生成器↔评估器）直至分数通过或平稳 | 当想把一个实现任务交给"生成器↔评估器"自动收敛循环、迭代到达分时 | 阶段 0 设置（`gan-harness/`+子目录、git init）→ 阶段 1 规划（`gan-planner` 产 `spec.md`+`eval-rubric.md`，除非 `--skip-planner`）→ 阶段 2 循环（构建→评分→反馈→检查通过/平稳）→ 阶段 3 总结 | agent: gan-planner、gan-generator、gan-evaluator；工具: playwright/screenshot（评估模式，可选）、git | —（`--skip-planner` 时需已存在 spec.md） | — | 参数 `<brief> [--max-iterations 15] [--pass-threshold 7.0] [--skip-planner] [--eval-mode playwright\|screenshot\|code-only]` |
| `/gan-design` | 双代理设计质量循环，**无规划器**（摘要即规范） | 当做创意前端/视觉工作、追求视觉惊艳而非功能完备，且不需要规划器（摘要即规范）时 | 解析参数（`--max-iterations` 默认 10、`--pass-threshold` 默认 7.5）→ 设置 `gan-harness/`、摘要写 `spec.md` → 写**侧重设计的**`eval-rubric.md`（设计质量 0.35/原创性 0.30/工艺 0.25/功能性 0.10）→ 跑与 gan-build 阶段 2 相同循环但跳过规划器 | agent: gan-generator、gan-evaluator；工具: playwright/screenshot（可选） | — | — | generator 被告知："惊艳的半成品胜过功能齐全的丑陋应用"。复用 `/gan-build` 阶段 2 循环 |

---

## 9. 持续学习与本能系统

> 围绕 `continuous-learning-v2` skill 运作，**共同依赖** `instinct-cli.py`，并用同一套 ECC_ROOT 解析逻辑（env→标准安装→插件缓存→回退，修复了 issue #2037）。本能（instinct）是带置信度的学习模式，存在 `~/.claude/homunculus/` 下，分项目级/全局级。

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/learn` | 从当前会话提取可复用模式存为候选 skill | 当刚解决一个非平凡问题（调试技巧/Workaround/项目约定）、值得沉淀成 skill 时 | 回顾会话找模式（错误解析/调试技巧/Workaround/项目约定）→ 挑最有价值洞察 → 起草 skill → 用户确认 → 存 `~/.claude/skills/learned/[name].md` | skill: continuous-learning | — | — | 不提取琐碎/一次性修复。一 skill 一模式 |
| `/learn-eval` | `/learn` 增强版：加质量门禁 + 保存位置决策（Global vs Project） | 当想规范保存学习成果、避免与既有 skill 重复，且需要决定存全局还是项目级时 | 提取 → 决定保存位置（Global vs Project）→ 起草带 frontmatter 的 skill → 质量门禁（必查清单：grep 查重、是否可并入既有、是否可复用）→ 整体裁决（Save/Improve/Absorb into [X]/Drop）→ 按裁决执行 | skill: continuous-learning-v2 | `/learn`（扩展版） | — | 已废弃旧版 5 维度评分，改用清单+整体裁决 |
| `/skill-create` | 分析**本地 git 历史**提取编码模式生成 SKILL.md | 当想把团队 git 历史中反复出现的编码模式沉淀成可复用 skill 时 | 采集 git 数据（`git log --name-only`+文件共变+commit 模式）→ 检测模式（commit 规范/文件共变/工作流序列/架构/测试）→ 生成 SKILL.md（带 frontmatter）→ `--instincts` 时额外生成 instinct YAML | 工具: git；skill: continuous-learning-v2（`--instincts`） | — | `/instinct-import` | 参数 `--commits`/`--output`/`--instincts`。`allowed_tools: Bash,Read,Write,Grep,Glob`。本地版对应 GitHub App 的 Skill Creator |
| `/skill-health` | 展示所有 skill 的健康仪表盘（成功率、失败聚类、待审修正、版本史） | 当想审视所有 skill 的成功率与失败聚类、判断是否需要 `/evolve` 演进时 | 跑 `scripts/skills-health.js --dashboard`（解析 ECC_ROOT）；支持 `--panel failures`、`--json` | script: scripts/skills-health.js | — | `/evolve` |  |
| `/instinct-status` | 显示已学本能（项目+全局）按域分组、带置信度 | 当想知道当前项目与全局已积累哪些本能、各自置信度多高时 | 跑 `instinct-cli.py status`：检测项目→读项目 instincts→读全局→合并（项目覆盖全局）→按域分组带置信度条展示 | script: instinct-cli.py；skill: continuous-learning-v2 | — | — |  |
| `/instinct-import` | 从文件或 URL 导入本能到项目/全局范围 | 当要从文件或 URL 导入他人本能、做团队共享，或跨机器迁移时 | 跑 `instinct-cli.py import <file-or-url>`：拉取→解析校验→查重→合并或新增→存对应 scope 目录 | script: instinct-cli.py；工具: 网络（URL 来源时） | `/skill-create`（instinct YAML 产物，推理） | `/instinct-status` | 标志 `--dry-run`/`--force`/`--min-confidence`/`--scope project\|global`。高置信覆盖低置信 |
| `/instinct-export` | 导出本能为可分享文件 | 当要把自己学到的本能分享给队友、或迁移到另一台机器时 | 跑 `instinct-cli.py export`：检测项目→按 scope 加载→应用过滤→写 YAML 文件或 stdout | script: instinct-cli.py | — | — | 标志 `--domain`/`--min-confidence`/`--output`/`--scope` |
| `/evolve` | 分析本能簇聚，建议/生成更高级结构（Command/Skill/Agent） | 当本能积累到一定量、想把它们聚类固化为 command/skill/agent 时 | 跑 `instinct-cli.py evolve [--generate]`：按 trigger/域分组 → 识别候选 → 展示 promotion 候选 → `--generate` 写 `evolved/` | script: instinct-cli.py | `/skill-create`、`/instinct-import`（本能来源，推理） | — | 规则：用户显式动作→Command；自动触发→Skill；复杂多步→Agent |
| `/promote` | 把项目级本能晋升为全局级 | 当某本能模式在多个项目重复出现、值得提升为全局通用时 | 跑 `instinct-cli.py promote [id] [--force] [--dry-run]`：检测项目→给定 id 则单条晋升；否则找跨项目候选 → 写全局 personal 目录 | script: instinct-cli.py | — | — |  |
| `/prune` | 删除超 30 天未晋升的待审本能 | 当本能积压过多、想清理超期未被采用的待审本能时 | 跑 `instinct-cli.py prune`：扫过期 pending→删除 | script: instinct-cli.py | — | — | 标志 `--max-age N`、`--dry-run` |
| `/projects` | 列出已知项目注册表及各项目本能/观测统计 | 当想查看本能系统已登记哪些项目、各自学到了多少时 | 跑 `instinct-cli.py projects`：读 `~/.claude/homunculus/projects.json`→逐项目显示 → 显示全局本能总数 | script: instinct-cli.py | — | — | 本能系统的项目管理视角 |

---

## 10. 会话与上下文管理

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/sessions` | 管理会话历史：列出、加载、别名、详情 | 当要查找/恢复某次历史会话，或为常用会话起别名以便快速跳转时 | 多子命令各跑内联 node 脚本：`list`/`load`/`alias`/`unalias`/`info`/`aliases` | script: session-manager.js、session-aliases.js | — | — | 会话存 `~/.claude/session-data/`，别名存 `~/.claude/session-aliases.json`。文件头持久化 Project/Branch/Worktree |
| `/save-session` | 把当前会话状态保存到带日期的文件，供下次完整恢复 | 当结束会话前、即将触及上下文上限、或刚解决一个复杂问题、想下次无缝接续时 | 收集上下文 → `mkdir -p ~/.claude/session-data` → 写 `YYYY-MM-DD-<short-id>-session.tmp` → 填充各段（含 **NOT Work** 带原因）→ 展示供确认 | script: session-manager.js；工具: git diff | — | `/resume-session` | "NOT Work"段最关键（防盲目重试） |
| `/resume-session` | 加载最近会话文件，在上次结束处带完整上下文恢复 | 当开始新会话、要从上次保存点继续工作，或要加载队友移交的会话文件时 | 查找会话文件（无参=最近）→ 读整个文件 → 确认固定简要格式 → 等待用户，**绝不自动启动或接触文件** | 无（纯读取） | `/save-session` | `/save-session`（恢复后回路） | 处理：同天多文件（最新胜）、缺引用（警告）、>7 天（陈旧警告）、格式错（报告并停） |

---

## 11. 文档与架构维护

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/update-docs` | 从代码真相源同步生成文档 | 当代码变更后文档已脱节、需要从代码重新同步脚本/环境变量/贡献指南时 | 识别真源 → 生成脚本参考表 → 环境变量文档 → 更新 CONTRIBUTING.md → 更新 RUNBOOK.md → 90+ 天陈旧检查 → 总结 | 读源: package.json、.env.example、openapi、exports、Dockerfile | — | — | 用 `<!-- AUTO-GENERATED -->` 标记。不主动新建文档 |
| `/update-codemaps` | 扫描项目结构生成 token 精简的架构 codemap | 当经历重大功能添加/重构后、或刚接手一个新项目、需要一份精简架构地图时 | 扫描结构 → 生成 codemap（architecture/backend/frontend/data/dependencies，写 `docs/CODEMAPS/` 或 `.reports/codemaps/`）→ Diff 检测（>30% 改动需审批）→ 加新鲜度 header → 写 `.reports/codemap-diff.txt` | 写: docs/CODEMAPS/、.reports/ | — | — | 每个 codemap <1000 tokens |

---

## 12. 安全、成本与模型路由

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/security-scan` | 对 agent/hook/MCP/权限/密钥表面跑 AgentShield 扫描并出修复计划 | 当要排查 Claude/OpenCode 配置的安全风险（硬编码密钥、过宽权限、危险 hook/MCP），或想把扫描接入 CI 构建门禁时 | 偏好打包扫描器 `npx ecc-agentshield scan`；识别高危→分低置信清单；每个 critical/high 给路径/严重度/置信度/原因/修复；`--fix` 只应用标记 safe 的；修后重扫报 before/after | 工具: npx ecc-agentshield；agent: security-reviewer；skill: security-scan；CI: GitHub Action affaan-m/agentshield | — | — | `subtask:true`。等价 CLI 见 [20.2](#202-ecc-agentshield安全审计) |
| `/cost-report` | 从 ECC `stop:cost-tracker` hook 的日志汇总本地 Claude Code 成本 | 当想查看本地 Claude Code 的今日/昨日/累计花费及各模型占比时 | 用 node 读 `~/.claude/metrics/costs.jsonl` → 每 session 取最新快照 → 汇总 today/yesterday/total + 按模型 + 近 7 天 | 读: ~/.claude/metrics/costs.jsonl；工具: node | `stop:cost-tracker` hook（产出 costs.jsonl） | — | `csv` 参数导出近 100 行 |
| `/model-route` | 按复杂度/风险/预算推荐模型档位 | 当不确定当前任务该用 haiku/sonnet/opus 哪档、想按复杂度/风险/预算得到推荐时 | 启发式：haiku（确定性低风险）、sonnet（实现/重构默认）、opus（架构/深度审查/模糊）→ 输出推荐+置信度+理由+备选 | 无 | — | — | 参数 `[task-description] [--budget low\|med\|high]` |

---

## 13. 项目接入与包管理

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/project-init` | 检测项目技术栈、生成 dry-run 的 ECC 引入计划 | 当要把一个新项目接入 ECC、想先 dry-run 看会装哪些组件、确认后再真正应用时 | 默认 dry-run：检测包管理/语言/框架信号 → 用映射配置 → 跑 install-plan/install-apply --dry-run → 列将变更文件 → 用户批准后才 apply | script: install-plan.js、install-apply.js；配置: config/project-stack-mappings.json | — | `/ecc-guide`（交互发现引导） | 安全规则：默认 dry-run、不覆盖既有 CLAUDE.md/settings |
| `/setup-pm` | 配置项目或全局首选包管理器（npm/pnpm/yarn/bun） | 当要统一团队的包管理器、或想避免多人协作时的 lockfile 冲突时 | 跑 `node scripts/setup-package-manager.js`。检测优先级：环境变量→项目配置→package.json→lockfile→全局配置→fallback | script: setup-package-manager.js | — | — | 支持 `--detect`/`--global`/`--project`/`--list`。`disable-model-invocation:true` |
| `/pm2` | 分析项目并生成 PM2 服务命令（含配置与子命令文件） | 当项目含多个服务（前端+后端+DB）、想用 PM2 统一起停，尤其在 Windows 下时 | 检查 PM2 → 扫描服务 → 生成 `ecosystem.config.cjs`+Python `start.cjs` wrapper → 生成 `.claude/commands/pm2-*.md`+`.claude/scripts/*.ps1` → 更新 CLAUDE.md PM2 段 | 工具: PM2；写: ecosystem.config.cjs、.claude/commands/pm2-*.md | — | —（生成 `pm2-*` 子命令文件） | 重点针对 Windows |

---

## 14. ECC 自身管理与元工具

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/ecc-guide` | ECC 仓库的"对话式地图"，帮发现正确的 ECC 表面 | 当想了解 ECC 到底有哪些 agent/skill/command/hook、该用哪一个时 | 无参给精简菜单；topic lookup 给 3-6 条+指向规范文件；`find:<query>` 用 rg 搜索按表面分组 | 工具: rg（搜索）；script: catalog.js | — | `/project-init`、`/harness-audit`、`/skill-health`、`/skill-create`、`/security-scan` | 读实时仓库文件，不臆造命令 |
| `/harness-audit` | 跑确定性仓库 harness 审计、出优先级评分卡 | 当想给仓库的 ECC 工具覆盖度/质量门/安全/成本做一次确定性打分、得到优先级行动清单时 | 跑 `node scripts/harness-audit.js <scope> --format <text\|json>`（唯一真相源）。最多 12 个固定类别（每项 0-10）。输出总分/类别分/失败检查/top3 行动/建议 skill | script: scripts/harness-audit.js；也可 `npm run harness:audit` | — | — | 禁止手工重打分 |
| `/auto-update` | 拉最新 ECC 仓库变更、用原 install-state 重装当前受管目标 | 当要把本地 ECC 升级到仓库最新版本时 | 跑 `node scripts/auto-update.js`。先拉变更再重跑 install-apply | script: auto-update.js、install-apply.js；工具: git（pull） | —（读原 install-state） | — | 参数 `--dry-run`/`--target`/`--repo-root`。`disable-model-invocation:true` |

---

## 15. 敏捷/史诗管理 epic-\*

> 7 个命令都是 `node scripts/github-coordination.js <subcommand>` 的轻量封装。用 GitHub issue 正文中的"协调块"作为史诗**事实来源**，维护本地 SQLite 缓存。每个命令列出"兼容性别名"映射到通用工作流命令。
>
> **共同依赖**：script: `scripts/github-coordination.js`；平台: GitHub issue；存储: 本地 SQLite 缓存。

| 命令 | 功能/用途 | 适用场景 | 依赖（子命令） | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|
| `/epic-claim` | 认领史诗 issue，标记协调状态，同步本地所有权 | 当要认领一个 GitHub issue 史诗、声明自己为负责人时 | script: github-coordination.js `claim`；工具: gh/GitHub API | — | `/epic-decompose`（推理） | 别名 /orch-add-feature、/orch-change-feature、/prp-implement |
| `/epic-decompose` | 把史诗拆解为子任务（不创建任务分支） | 当已认领一个史诗、要把它拆成可执行子任务时 | script: github-coordination.js `decompose` | `/epic-claim`（推理） | `/epic-validate`、`/epic-publish`（推理） | 别名 /plan、/prp-plan |
| `/epic-publish` | 把经验证的史诗更新发布回 issue 和本地缓存 | 当本地对史诗的更新已经过验证、要回写到 GitHub issue 时 | script: github-coordination.js `publish` | `/epic-validate`（推理） | — | 别名 /pr、/prp-pr |
| `/epic-review` | 标记史诗审查状态（已请求/已批准/请求更改） | 当要给一个史诗给出批准/请求更改等审查裁决时 | script: github-coordination.js `review` | `/epic-validate`（推理） | — | 别名 /review-pr、/code-review |
| `/epic-sync` | 从 GitHub 同步史诗 issue 正文、标签、本地快照 | 当本地工作前要拉取 issue 最新状态，或发现本地与远端状态有偏差时 | script: github-coordination.js `sync` | — | — | 别名 /projects、/work-items sync-github |
| `/epic-unblock` | 扫描被阻塞史诗，把依赖已关闭的转为就绪 | 当一批史诗被旧依赖卡住、依赖项现已关闭、想批量恢复它们为就绪时 | script: github-coordination.js `unblock` | — | — | 别名 /loop-status |
| `/epic-validate` | 验证史诗的就绪状态、依赖、协调策略 | 当发布或审查移交前、要做门控检查确认史诗已就绪时 | script: github-coordination.js `validate` | `/epic-decompose`（推理） | `/epic-publish`、`/epic-review`（推理） | 别名 /quality-gate |

---

## 16. 外部集成

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/jira` | 直接在工作流中与 Jira 工单交互（获取/分析、评论、转换、搜索） | 当要从某个 Jira 工单拉取需求开始工作，或要把会话进度作为评论发回，或要转换工单状态时 | `get`/`comment`/`transition`/`search` | skill: jira-integration；MCP: jira server **或** 环境变量 JIRA_URL、JIRA_EMAIL、JIRA_API_TOKEN | — | `/plan`、`tdd-workflow`、`/code-review` | 凭据缺失则停 |

---

## 17. Hook 管理 hookify-\*

> 创建/管理 `.claude/hookify.{name}.local.md` YAML frontmatter 规则文件，接入 Claude Code 钩子系统（事件：bash/file/stop/prompt/all；动作：block/warn）。

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/hookify` | 从对话分析或显式描述创建 hook 规则，阻止不需要的 Claude 行为 | 当发现 Claude 反复犯同一类错误、想用一条 hook 规则强制拦截时 | 无参时用 `conversation-analyzer` agent 找值得阻止的模式；有参则解析描述 → 展示发现 → 生成 `.claude/hookify.{name}.local.md` → 报告 | agent: conversation-analyzer（无参时）；写: .claude/hookify.*.local.md | — | `/hookify-list`、`/hookify-configure` | 规则格式：YAML frontmatter（name/enabled/event/action/pattern） |
| `/hookify-list` | 列出所有已配置的 hookify 规则 | 当要审计当前启用了哪些 hookify 规则时 | 查找所有 `.claude/hookify.*.local.md` → 读 frontmatter → 表格显示 | 读: .claude/hookify.*.local.md | `/hookify`（推理：列已建规则） | `/hookify-configure` | 只读 |
| `/hookify-configure` | 交互式启用或禁用 hookify 规则 | 当想暂时禁用某条规则（而非删除）时 | 查找所有规则 → 读状态 → 展示 → 询问切换 → 更新 `enabled:` 字段 | 读写: .claude/hookify.*.local.md | `/hookify`（推理） | — | 仅切换 `enabled:`，不删/不建文件 |
| `/hookify-help` | 显示 hookify 系统帮助 | 当想了解 hookify 支持哪些事件/动作、规则文件格式如何写时 | 静态文档转储：事件类型表、规则文件格式、命令列表、模式提示 | 无 | — | `/hookify`、`/hookify-list`、`/hookify-configure` | 纯文档，无副作用 |

---

## 18. 营销内容生成

| 命令 | 功能/用途 | 适用场景 | 执行步骤/流程 | 依赖 | 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|---|
| `/marketing-campaign` | 从产品摘要到完整内容套件的端到端营销活动；亦可审查现有文案转化质量 | 当要为产品发布策划完整内容套件（落地页/邮件/社交/广告/视频），或想审计现有文案的转化质量时 | 研究（受众/竞品）→ 定位（角度+基调）→ 文案制作（落地页→邮件→社交→广告→视频脚本→内容日历）→ 审查（转化+品牌一致性门控） | agent: marketing-agent、brand-voice、content-engine、crosspost、market-research；工具: WebSearch、WebFetch；写: .claude/campaigns/{name}/ | — | `/plan`、`/plan-prd`、`/code-review` | 模式：完整 / `copy [type]` / `review [file]` |

---

## 19. 退役命令 legacy-command-shims/

> ECC 把持久化工作流定义从 `commands/` 层迁到 `skills/` 层。`commands/` 是迁移期的 legacy 兼容层，**durable logic 应在 skills**。这 12 个 shim 是无独立逻辑的转发器（`$ARGUMENTS` → 委托对应 skill）。默认不加载，需手动复制 md 到本地 commands 目录才可用。

| 退役命令 | 替代的 canonical skill | 一句话用途 | 依赖（额外）| 上游 | 下游 | 说明 |
|---|---|---|---|---|---|---|
| `/tdd` | `tdd-workflow/` | 测试驱动开发工作流 | 工具: 项目测试框架 | — | — | RED→GREEN→IMPROVE，≥80% 覆盖 |
| `/e2e` | `e2e-testing/` | Playwright E2E 测试 | 工具: Playwright | — | — | 页面对象模型 |
| `/eval` | `eval-harness/` | 验证循环评估 | 无 | — | — | pass@k / pass^k 指标 |
| `/verify` | `verification-loop/` | 持续验证机制 | 无 | — | — | 被 `/checkpoint` 内部调用 |
| `/orchestrate` | `dmux-workflows/` + `autonomous-agent-harness/` | 多代理编排 | 无 | — | — |  |
| `/prompt-optimize` | `prompt-optimizer/` | 提示优化 | 无 | — | — | advisory-only，返回建议非执行 |
| `/claw` | `nanoclaw-repl/` | 操作/扩展 `scripts/claw.js` | script: scripts/claw.js；工具: claude -p | — | — | NanoClaw v2 REPL |
| `/devfleet` | `claude-devfleet/` | DAG 规划 + mission 报告 | 无 | — | — |  |
| `/agent-sort` | `agent-sort/` | DAILY vs LIBRARY 分类 | 无 | — | `/configure-ecc`（安装移交） |  |
| `/rules-distill` | `rules-distill/` | inventory/cross-read/verdict | 无 | — | — | 规则蒸馏 |
| `/docs` | `documentation-lookup/` | 走 Context7 实时文档 | MCP: context7 | — | — |  |
| `/context-budget` | `context-budget/` | 默认 200K 窗口 | 无 | — | — | 透传 `--verbose` |

---

## 20. 外部 CLI 命令

### 20.1 `ecc` 统一 CLI

> 来自 npm 包 `ecc-universal`（`package.json` bin 字段：`ecc`→`scripts/ecc.js`）。调用：`npx ecc <command> [flags]` 或 `node scripts/ecc.js <command>`。全局标志：`--dry-run` / `--json` / `--target <id>` / `--help`。共 **17 个子命令**。

| 子命令 | 功能/用途 | 依赖 |
|---|---|---|
| `ecc install` | 安装 ECC 到 12 个 target（claude/cursor/codex/gemini/opencode/antigravity/codebuddy/joycode/qwen/zed…） | 工具: node；script: install-apply.js；首次: npm install（装 ajv 等） |
| `ecc plan` | 查看 manifest 与解析后的安装计划 | script: install-plan.js |
| `ecc catalog` | 发现 install profile 与组件 ID | script: catalog.js |
| `ecc consult` | 自然语言查询推荐组件/profile | script: consult.js |
| `ecc control-pane` | 启动本地 ECC2 operator 控制面板 | script: control-pane.js；运行时: sql.js（SQLite） |
| `ecc list-installed` | 查看当前 install-state | script: list-installed.js |
| `ecc doctor` | 诊断缺失/漂移的 ECC 管理文件 | script: doctor.js |
| `ecc repair` | 重建漂移文件 | script: repair.js |
| `ecc auto-update` | 拉取最新仓库变更并按原 state 重装 | script: auto-update.js；工具: git |
| `ecc status` | 查询 SQLite 状态库（会话/skill 运行/治理/work items） | script: status.js；运行时: sql.js |
| `ecc platform-audit` | 审计 GitHub queues/discussions/roadmap/release/security | script: platform-audit.js；工具: gh/GitHub API |
| `ecc security-ioc-scan` | 扫描供应链 IOC | script: ci/scan-supply-chain-iocs.js |
| `ecc sessions` | 列出/检视 ECC 会话 | script: sessions-cli.js |
| `ecc work-items` | 跟踪 Linear/GitHub/handoff/manual 工作项 | script: work-items.js；工具: Linear/GitHub API |
| `ecc session-inspect` | 产出规范 session 快照 | script: session-inspect.js |
| `ecc loop-status` | 检查 loop wakeups 与挂起工具结果（跨会话用） | script: loop-status.js |
| `ecc uninstall` | 按 state 移除管理文件 | script: uninstall.js；读: ~/.claude/ecc/install-state.json |

### 20.2 `ecc-agentshield`（安全审计）

> 来自 npm 包 `ecc-agentshield`。扫描 Claude Code 配置，检测漏洞/错误配置/注入风险，覆盖 5 大类（密钥检测 14 模式、权限审计、钩子注入、MCP 风险、agent 配置），102 条静态分析规则。输出 Terminal（彩色 A-F）/JSON（CI）/Markdown/HTML，发现严重问题返回退出码 2（可做构建门禁）。

| 命令 | 功能/用途 | 依赖 |
|---|---|---|
| `npx ecc-agentshield scan` | 快速扫描（无需安装） | 包: ecc-agentshield |
| `npx ecc-agentshield scan --fix` | 自动修复标记 safe 的安全问题 | 包: ecc-agentshield |
| `npx ecc-agentshield scan --opus --stream` | 启动 3 个 Opus 4.6 agent 红队/蓝队/审计对抗管线做深度分析 | 包: ecc-agentshield；agent: 3× Opus 4.6（红队/蓝队/审计） |
| `npx ecc-agentshield init` | 从零生成安全配置 | 包: ecc-agentshield |

### 20.3 `ccg-workflow`（multi-\* 运行时）

| 命令 | 功能/用途 | 依赖 |
|---|---|---|
| `npx ccg-workflow` | 初始化 multi-\* 命令依赖的运行时，提供 `~/.claude/bin/codeagent-wrapper` 与 `~/.claude/.ccg/prompts/{codex,gemini}/*.md` | 包: ccg-workflow；是所有 `/multi-*` 命令的前置依赖 |

### 20.4 实用脚本（带 CLI 入口）

| 调用形式 | 功能/用途 | 依赖 |
|---|---|---|
| `node scripts/setup-package-manager.js [--detect\|--global <pm>\|--project <pm>\|--list]` | 配置首选包管理器 | 工具: node；命令: /setup-pm（触发方） |
| `node scripts/harness-audit.js` | harness 适配器合规审计 | 工具: node；命令: /harness-audit、npm run harness:audit |
| `node scripts/skills-health.js [--json\|--dashboard\|--panel <name>]` | skill 健康度报告 | 工具: node；命令: /skill-health（触发方） |
| `node scripts/orchestrate-worktrees.js <plan.json> [--execute\|--write-only]` | tmux/worktree swarm 编排 | 工具: node、git worktree、tmux |
| `bash scripts/orchestrate-codex-worker.sh <task> <handoff> <status>` | 单 Codex worker 执行器 | 工具: bash、codex CLI |
| `node scripts/orchestration-status.js <session\|plan.json> [--write out.json]` | 编排会话状态快照 | 工具: node |
| `node scripts/dashboard-web.js [port]` | 浏览器 dashboard | 工具: node；默认端口 3456 |
| `npm run claw` / `node scripts/claw.js` | NanoClaw v2 REPL（围绕 `claude -p`，零依赖） | 工具: node、claude CLI；命令: /claw（退役 shim） |
| `python3 ./ecc_dashboard.py` | 终端 TUI dashboard | 工具: python3 |

### 20.5 安装与测试入口

| 调用形式 | 功能/用途 | 依赖 |
|---|---|---|
| `./install.sh`（macOS/Linux） | 一键纯手动安装（先 `npm install` 装依赖再 `install-apply.js`） | 工具: bash、npm（首次装 ajv 等）、node；详见 [纯手动安装过程分析.md](./纯手动安装过程分析.md) |
| `.\install.ps1`（Windows） | Windows 一键安装 | 工具: PowerShell、node、npm |
| `npx ecc-install --profile <name> [--target <t>]` | npx 直接安装，不预装包 | 包: ecc-universal；兼容旧入口，等价 `ecc install` |
| `npm test` | 完整校验链 | 工具: node；含 unicode-safety + validate-\* + catalog:check + command-registry:check + tests/run-all.js |
| `claude plugin marketplace add <repo-url>` | 添加 plugin marketplace | Claude Code 原生；如 `https://github.com/affaan-m/ECC` |
| `claude --system-prompt "$(cat memory.md)"` | 动态注入系统提示（权威高于 user message） | Claude Code CLI；长文指南推荐 |

---

## 21. 附录：Claude Code 原生斜杠命令

> 以下为 Claude Code **内置**斜杠命令（非 ECC 专属），但常与 ECC 配合使用。来源：shortform/longform 指南。

| 命令 | 用途 | 依赖 |
|---|---|---|
| `/fork` | Fork 对话分支，让互不重叠任务并行执行（替代排队发消息） | Claude Code 内置 |
| `/rewind` | 回到之前的状态 | Claude Code 内置 |
| `/statusline` | 自定义状态行（分支/context %/todos/model/时间） | Claude Code 内置 |
| `/checkpoints` | 文件级撤销点 | Claude Code 内置 |
| `/compact` | 手动触发上下文压缩 | Claude Code 内置 |
| `/clear` | 清空上下文（agent 阶段切换间使用） | Claude Code 内置 |
| `/mcp` | 查看/管理已启用 MCP（建议禁用未用，保 context） | Claude Code 内置；MCP server（按配置） |
| `/plugins` | plugin 管理界面（安装/启用/禁用、marketplace） | Claude Code 内置 |
| `/mgrep` | 调用 mgrep skill（本地+web 搜索，优于 ripgrep，约省 50% token） | 工具: mgrep（来自 Mixedbread-Grep marketplace） |
| `/rename <name>` | 给 chat 命名（多实例并行时区分） | Claude Code 内置 |
| `/llms.txt` | 抓取文档页的 LLM 优化版 | Claude Code 内置；网络 |

---

## 附：使用须知

### 命令来源与命名空间
- **斜杠命令**来自 `commands/*.md`（92 个）。插件安装用 `/ecc:<name>`，手动安装用 `/<name>`。
- **skills 才是 durable 单元**——命令多为 skill 的入口/兼容层。skill 触发：自动（按 SKILL.md frontmatter `description` 相关性）或显式 `/<目录名>`。
- **手动安装 skill 必须**扁平复制（`cp -r skills/<name> ~/.claude/skills/`），**不要**嵌套到 `~/.claude/skills/ecc/`（Claude Code 不递归扫描，skill 会失效）。详见 [纯手动安装过程分析.md](./纯手动安装过程分析.md)。

### 常见依赖速查
- **`gh` CLI**：`/pr`、`/prp-pr`、`/review-pr`、`/code-review`(PR 模式)、`/epic-*` 需要。
- **各语言工具链**：语言审查/构建命令（`*-review`/`*-test`/`*-build`）依赖对应语言的 linter/formatter/test 工具。
- **`ccg-workflow` 运行时**：所有 `/multi-*` 命令必需，base ECC 不含，须 `npx ccg-workflow` 初始化。
- **`instinct-cli.py`**：第 9 章持续学习族（instinct-\*/evolve/promote/prune/projects）共同依赖。
- **`ECC_ROOT` 解析**：`/quality-gate`、`/sessions`、`/instinct-*`、`/skill-health` 等通过 ECC_ROOT 定位脚本（env→标准安装→插件缓存→回退）。
- **MCP 服务**：`/jira` 需 jira MCP（或环境变量）；`/multi-*` 可选 ace-tool MCP 增强；`/docs`(退役) 需 context7 MCP。
- **外部模型 CLI**：`/santa-loop` 与 `/multi-*` 可选 codex/gemini CLI 作为对抗/协作审查者。

### 安装方式提醒（与 [纯手动安装过程分析.md](./纯手动安装过程分析.md) 呼应）
- **插件安装最省事**（全量 277 skill、命名空间隔离），但 **rules 不随插件分发**，须手动补 `cp -R rules/<lang> ~/.claude/rules/`。
- **手动安装含 rules、可精选**，但 skill 要扁平复制、且与插件方式**不可叠加**（叠加会导致 skill 重名、hook 重复执行、`${CLAUDE_PLUGIN_ROOT}` 解析冲突）。
- **MCP 不自动启用**：须把 `mcp-configs/mcp-servers.json` 条目粘进 `~/.claude/settings.json` 或项目 `.mcp.json`，并替换 `YOUR_*_HERE` 占位符为真实 API key。
- **上下文窗口管理**：不要一次启用所有 MCP（200k 可能缩到 70k）。经验法则：配置 20-30 个 MCP、每项目启用 <10 个、活动工具 <80 个。

---

> 本文档基于 v2.0.0 仓库实际文件整理，计数已与文件系统核对（commands/ 92、legacy 12、ecc CLI 17 子命令）。命令体细节若与仓库演进不一致，以仓库源码为准。
