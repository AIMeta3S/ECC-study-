---
description: 代码审查 —— 本地未提交变更或 GitHub PR（--prp 核验 implement 结果、--full 全量验证，默认快速档）
argument-hint: [--pr <number|url> | --prp <plan-path> | --full | 空 进行本地快速审查]
---

# 代码审查

> 属于 PRP workflow 系列之一。

**输入**: $ARGUMENTS

---

## 模式与档位选择

| 输入 | 模式 | 验证档位 |
|---|---|---|
| `--pr <number\|url>`、裸 PR number 或 PR URL | PR 审核模式 | Tier 1 + Tier 2 |
| 空 | 本地审查模式 | 仅 Tier 1 |
| `--full` | 本地审查模式 | Tier 1 + Tier 2 |
| `--prp <plan-path>`（PRP 计划完整路径，例如：`.claude/PRPs/plans/completed/{plan-name}.plan.md`） | 本地审查模式 | Tier 1 + implement 结果核验 |

裸 number/URL 保留兼容。`--full` 与 `--prp` 同给时以 `--prp` 为准（核验不足可复跑 `--full`）。

---

## 共享审查标准

以下标准对本地审查模式与 PR 审核模式同等生效。

### 审查维度清单

对每个变更文件按 8 个维度检查：

| 维度 | 检查内容 |
|---|---|
| **Correctness** | 逻辑错误、off-by-one、null 处理、边界情况、竞态条件 |
| **Type Safety** | 类型不匹配、不安全转换、`any` 使用、缺失泛型 |
| **Pattern Compliance** | 项目约定（命名、文件结构、错误处理、imports）+ 规约项：console.log/debug 语句、代码/注释中的 emoji、mutation 模式、函数超 50 行、文件超 800 行、嵌套超 4 层 |
| **Security** | 注入、auth 缺口、secret 暴露、SSRF、path traversal、XSS、不安全的依赖项、缺少输入校验 |
| **Performance** | N+1 查询、缺失索引、无界循环、内存泄漏、大 payload |
| **Completeness** | 缺测试、缺错误处理、不完整迁移、缺失文档（含 public API 的 JSDoc） |
| **Maintainability** | 死代码、magic number、深嵌套、命名不清、缺失类型、TODO/FIXME 注释 |
| **Accessibility** | 对比度、键盘导航、ARIA、reduced motion |

**Pattern Compliance 的检查依据优先级**：仓库 `CLAUDE.md` / `.claude/rules/` > 用户级规则 > 内置默认。内置默认值：函数 50 行、文件 800 行、嵌套 4 层、禁 console.log/debug、禁 emoji、immutable 优先。仓库未定义规约时使用内置默认，仓库有规约时以仓库为准。

### 严重度评级

对每项发现独立评级，维度仅提供默认锚点：

| 维度 | 默认锚点 | 浮动规则 |
|---|---|---|
| Security | CRITICAL | 实际影响有限（如仅影响 dev 脚本）可降 HIGH，需说明理由 |
| Correctness（确认缺陷） | HIGH | 涉及数据丢失或安全时升 CRITICAL |
| Type Safety / Performance | MEDIUM | 确认会引发故障时升 HIGH |
| Completeness | MEDIUM | 核心逻辑无测试覆盖时升 HIGH |
| Pattern Compliance / Maintainability / Accessibility | MEDIUM | 纯风格问题降 LOW |

等级动作：

| 严重等级 | 含义 | 本地审查模式动作 | PR 审核模式动作 |
|---|---|---|---|
| **CRITICAL** | 安全漏洞或数据丢失风险 | BLOCK COMMIT | merge 前必须修复 |
| **HIGH** | 可能导致问题的缺陷或逻辑错误 | BLOCK COMMIT | merge 前应修复 |
| **MEDIUM** | 代码质量问题或缺少最佳实践 | 警告 | 建议修复 |
| **LOW** | 风格小问题或次要建议 | 提示 | 可选 |

### 验证命令矩阵

从配置文件（`package.json`、`Cargo.toml`、`go.mod`、`pyproject.toml` 等）检测项目类型，仅运行适用的命令：

| 项目类型 | 检测文件 | Tier 1：Type check | Tier 1：Lint | Tier 2：Test | Tier 2：Build |
|---|---|---|---|---|---|
| Node.js / TypeScript | `package.json` | `npm run typecheck 2>/dev/null \|\| npx tsc --noEmit 2>/dev/null` | `npm run lint` | `npm test` | `npm run build` |
| Rust | `Cargo.toml` | — | `cargo clippy -- -D warnings` | `cargo test` | `cargo build` |
| Go | `go.mod` | — | `go vet ./...` | `go test ./...` | `go build ./...` |
| Python | `pyproject.toml` / `setup.py` | — | — | `pytest` | — |

**命令语义**：Tier 2：Test 列是**项目测试入口**，实际范围由项目 `scripts` 定义（可能仅单元测试、也可能含集成测试），不假定等价于全量。处于 PRP 流水线时，优先使用计划文件「验证命令 → 集成测试」中记录的命令（与 prp-implement Level 4 同源），无计划产物时才使用矩阵默认命令。

**Tier 语义**：Tier 1（秒级）所有档位必跑；Tier 2（分钟级）由档位决定——PR 模式与 `--full` 必跑，本地默认档跳过，`--prp` 档以 implement 结果核验替代。"—"表示该语言不适用，报告中标注"跳过"。

---

## 本地审查模式

对未提交的变更进行全面的安全与质量审查。

### Phase 1 — 收集与分流

```bash
git status --porcelain
```

> 用 `git status --porcelain` 而非 `git diff --name-only HEAD`：后者看不到 untracked 的新建文件，而新建源码/测试文件是 implement 的主要变更形态。

按路径把输出分流为两个集合：

| 集合 | 路径规则 | 处理 |
|---|---|---|
| **审查集** | 其余全部变更（含 untracked 新建文件） | 进入 Phase 2 审查、列入「已审查文件」 |
| **产物集** | `.claude/PRPs/**`、`.claude/prds/`、`.claude/plans/`、`.claude/reviews/**` | 排除：不读取、不进入 Phase 2、不列入「已审查文件」；仅在报告「概括」中记数量（如"3 个流程产物未纳入审查"） |

分流必须黑名单式（仅剔除产物路径），不得改用计划「Files to Change」白名单——核验 1.3 依赖变更全集发现计划外变更（越界）。`--prp` 档经 `<plan-path>` 显式读取的计划/实现报告/证据日志属核验环节的指定输入，不受本分流影响。

如果审查集为空，则停止："没有可审查的内容。"

### 复审盲审原则

产物集对应的目录下存在既往 `*.review.md` / `*-fix.report.md` 时，本轮即为复审：

- **不得读取既往 review / fix.report 的内容作为裁决依据**，所有发现必须基于本轮对代码的直接检查——与 /prp-fix「修复者不做最终裁决」对称：修复者不裁决，复审者不读答辩状。
- fix.report 标记「不修复（误报，附证据）」的项：复审须独立在代码中重新证实误报成立，否则作为问题重新提出；不得引用修复阶段留下的证据链。
- 复审是重新发现（审查集全量 × 8 维度），不是逐项核对上一轮清单——上一轮未发现的问题、修复新引入的问题，都在复审职责内。

### Phase 2 — 审查

完整阅读审查集中每个文件，按「共享审查标准 → 审查维度清单」的 8 维度清单逐项检查，并按「共享审查标准 → 严重度评级」体系对每项发现独立评级。

### Phase 3 — 验证

| 档位 | 执行内容 |
|---|---|
| 默认（空参数） | 仅 Tier 1（快速静态门禁） |
| `--full` | Tier 1 + Tier 2 |
| `--prp <plan-path>` | Tier 1 + implement 结果核验（见下） |

按档位执行「共享审查标准 → 验证命令矩阵」的命令，记录每条命令的 pass/fail。

#### implement 结果核验（`--prp` 档）

1. **实现是否符合计划文件的要求**：读取 `<plan-path>` 指向的计划文件，核验真实变更的源码与计划文件的要求是否一致。
> 先验证计划文件是否存在，如果文件不存在，跳过本节并在报告中记录："未找到计划文件 `<plan-path>`，无法核验实现结果"。如果文件存在，逐项核验 1.1 ~ 1.6 检查项。
> 核验 1.1 ~ 1.6 检查项时，不要读取或采信实现报告的内容，必须核验真实的变更内容。
> 每个核对项标注了自己的依赖章节——依赖章节缺失时仅跳过该项，记录"无法核验（缺失章节：X）"，其余核对项照常执行。
> 详细记录每一项验证发现的问题，以便后续修复。未发现问题 → 记为通过。未发现问题属于正常情况，禁止为了体现你的价值而编造、虚构问题。
> 发现记录：本章节每个核验项发现的问题，定级后一律写入报告「发现」区对应等级分节（详细描述在「发现」区），核验小节的表格仅记录结论与数量汇总——/prp-fix 按「发现」区四级分节提取问题清单，不写入即不被核销。
> 同源发现去重：核验发现与 Phase 2 八维度审查发现描述同一事实时，该事实在「发现」区只列一条并标注双来源（如「Completeness / 1.6」）。三对常见同源关系：
> Completeness「缺测试」↔ 1.6 —— 同一变更无测试覆盖；
> 1.5 ↔ 1.6 —— 声明用例未实现且该变更无其他覆盖；
> Pattern Compliance「项目约定」↔ 1.2 —— 违背仓库规则已明文的约定。
> 1.6 因依赖章节缺失被跳过时，Completeness「缺测试」照常独立报告，不受去重影响。

- **1.1 验证目标是否漂移**（依赖：摘要、用户故事、问题  → 解决方案）：提取预期目标（要解决的问题、要交付的能力、范围边界），与实际变更逐项核对，识别三类漂移：
  - **遗漏**：某项声明的目标没有任何变更与之对应
  - **越界**：存在与所有目标均无关的变更（scope creep）
  - **偏移**：变更解决的问题或实现方向偏离「当前状态 → 期望状态」

- **1.2 验证是否遵循 Code conventions**（依赖：Patterns to Mirror）：检查变更是否符合 Code conventions。

- **1.3 验证是否符合预期文件**（依赖：Files to Change）：检查变更是否覆盖了预期文件。

- **1.4 验证所有任务是否完成**（依赖：分步任务——每项含 IDENTIFIER / ACTION / IMPLEMENT / MIRROR / VALIDATE 字段）：检查变更是否完成全部分步任务。

- **1.5 验证测试用例是否全部被实现**（依赖：测试策略——含 单元测试 / 集成测试 / Edge Cases 检查清单 小节）：逐条检查测试用例是否全部被实现：
  - 单元测试：逐条检查单元测试是否实现。
  - 集成测试：逐条检查集成测试是否实现。
  - Edge Cases：逐条检查 Edge Cases 测试是否在测试用例中被覆盖。

- **1.6 测试用例覆盖完整性**（依赖：测试策略——单元测试 / 集成测试 小节）—— 每个真实变更都须有对应的测试覆盖：
  - 变更内容是否有对应的单元测试或集成测试——覆盖以代码库中实际存在的测试为准（含测试策略「测试文件」列指向的用例与计划之外的既有测试），不因计划未声明而豁免
  - 测试策略小节注明「无变化——复用既有单元/集成测试」→ 该层级视为已由既有用例覆盖，不因「无新增」记缺失；但在代码库中定位不到对应既有用例文件 → 该声明无效，仍记覆盖缺失
  - 源码文件有实质变更，单元与集成两个层级均无测试覆盖且无排除理由 → 记为覆盖缺失

2. **核验验证命令执行结果**（依赖：计划文件的「验证命令」小节——含 静态分析 / 单元测试 / 集成测试 小节，可选 数据库验证 / 浏览器验证 小节）：根据 `<plan-path>` 推导验证证据日志路径——提取 `{plan-name}` → `.claude/PRPs/implement/{plan-name}.validation.log`（与实现报告路径的推导同源，均从 `<plan-path>` 出发）。读取证据日志，对**最后一轮**条目核验五个判定：

   - **证据存在**：日志文件存在且含至少一轮完整条目（每条验证命令一个 `cmd:` 条目 + 轮末快照）。不存在 → 无法核验，记 HIGH 问题。
   - **命令齐全**：计划「验证命令」中实际存在的每个小节（含可选小节），其每条命令在日志最后一轮均有对应 `cmd:` 条目（命令原文或等价形式）。缺失 → 记 HIGH 问题，列出缺失命令。计划中标注「不适用——无接缝变更」的小节除外。
   - **退出码全零**：日志最后一轮全部条目 `exit: 0`，且与实现报告「验证结果」表声明一致。任一非 0 或与报告声明冲突 → 记 HIGH 问题；冲突时在报告中额外标注「implement 报告失真嫌疑，建议人工核对」。
   - **用例标识在证**：日志输出中含实现报告「编写的测试」声称的用例标识/用例数。缺失 → 记 HIGH 问题（测试被静默跳过且未被 implement 发现）。
   - **快照一致**：日志最后一个 `## snapshot` 与当前 `git rev-parse HEAD` + `git status --porcelain` 一致——对比时双方均先过滤产物集路径的行（产物路径见 Phase 1 分流规则；流程产物在快照记录后才落盘属正常时序，如 prp-fix 先刷新证据再写 fix-report，不构成证据过期）。过滤后仍不一致 → 证据过期（验证执行后代码有变更），记 HIGH 问题，后续步骤指引补验证（重跑 /prp-implement Phase 4，或人工复跑计划「验证命令」）。

  > 静态分析小节照常纳入上述证据核对（一致性检查），但该小节的**决策以 Tier 1 重跑实测为准**——不因报告或日志中的声明放行。

3. **评判偏差合理性并过滤**（依据：计划文件 + 真实变更 + 实现报告）：根据 `<plan-path>` 推导实现报告路径——提取 `{plan-name}` → `.claude/PRPs/implement/{plan-name}.report.md`，读取实现报告「与计划的偏差」节，逐条评判每个登记的偏差：

   - **合理**：偏差理由经对照计划（目标、验收标准、测试策略）与真实变更核实成立，且不损害计划目标、验收标准、测试覆盖（例：计划指定的文件/接口在代码库中已变更为等价形态，实现随之适配）。
   - **质疑**：无理由、理由与真实变更不符、损害计划目标/验收标准、削减测试覆盖或跳过任务。
   - 实现报告自述的偏差理由仅是评判线索，不得直接采信——「合理」判定必须以计划文件与真实变更为准。

   评判完成后过滤：本章节 1、2 中记录的问题，凡与某个**合理**偏差对应的 → 豁免（移出问题清单，仅在报告「偏差评判」小节留痕）；与**质疑**偏差对应的、以及无对应登记的（未登记偏差）→ 保留为需修复问题，未登记偏差加注「未登记」。

   > 边界：实现报告不存在、或「与计划的偏差」节缺失/为「无」→ 无可豁免项，本章节 1、2 中问题全部保留，并在「偏差评判」小节记录原因。

4. **核验结果映射**（并入 Phase 4）：
   - 五个判定全部通过、且经偏差评判过滤后无遗留核验问题 → 视同 Tier 2 通过
   - 任一判定未通过且未被合理偏差豁免 → 记 HIGH 问题
   - 1.1 遗漏 / 偏移、1.3 预期文件未覆盖、1.4 任务未完成 → 记 HIGH 问题（计划义务未履行，直接影响功能完整性）
   - 1.1 越界（scope creep）→ 记 MEDIUM
   - 1.2 Code conventions 违背 → 按 Pattern Compliance 锚点定级（MEDIUM，纯风格问题降 LOW）
   - 1.5 声明用例未实现 → 记 MEDIUM；该变更同时无任何测试覆盖 → 按 Completeness 锚点升 HIGH
   - 1.6 覆盖缺失 → 按 Completeness 锚点定级（MEDIUM，核心逻辑无测试覆盖升 HIGH）
   - 依赖章节缺失导致无法核验 → 记 HIGH 问题（计划文件不完整，该项门禁失效）

### Phase 4 — 决定

| 条件 | 决策 |
|---|---|
| 没有 CRITICAL 或 HIGH 问题，本档位验证通过 | **PASS** |
| 仅有 MEDIUM 或 LOW 问题，本档位验证通过 | **PASS**（附提示） |
| 存在任何 HIGH 问题，或 Tier 1 失败，或 `--full` 的 Tier 2 失败，或 `--prp` 核验存在未通过项 | **BLOCK COMMIT** |
| 存在任何 CRITICAL 问题 | **BLOCK COMMIT** |

绝不放行包含安全漏洞的代码。

### Phase 5 — 报告落盘

按档位落盘：`--prp` 档在 `.claude/PRPs/reviews/{plan-name}-<yyyymmdd-HHMM>.review.md` 创建审查产物（`{plan-name}` 提取自 `<plan-path>`，同 Phase 3 规则）；其余档位（默认、`--full`）在 `.claude/reviews/local-<yyyymmdd-HHMM>.review.md` 创建。

`--prp` 档报告即 /prp-fix 的核销对象——其修复核销产物为同目录 `<本文件名去 .review.md>-fix.report.md`，本报告自身不会被 /prp-fix 修改；默认 / `--full` 档报告（`.claude/reviews/`）不在 /prp-fix 服务范围内。报告模板：

```markdown
# 本地审查: <branch>

**审查时间**: <date>
**分支**: <branch>
**决策**: PASS | BLOCK COMMIT

## 概括
<1-2 句整体评估>

## 发现

> 仅 `--prp` 档：implement 结果核验的发现同样写入本区对应等级分节；与核验小节同源的事实只列一条并标注双来源（去重原则见核验章节）。

### CRITICAL
<findings or "None">

### HIGH
<findings or "None">

### MEDIUM
<findings or "None">

### LOW
<findings or "None">

## implement 结果核验（仅 `--prp` 档写入本节）

**计划文件**：`<plan-path>`
**实现报告**：`.claude/PRPs/implement/{plan-name}.report.md`
**验证证据**：`.claude/PRPs/implement/{plan-name}.validation.log`

| 核验项 | 结论 | 备注 |
|---|---|---|
| 1.1 目标漂移 | 通过 / 发现问题 / 无法核验（缺失章节：X） | 各等级问题数（如 HIGH:1 MEDIUM:2）；通过时填「—」；必须说明的重要信息（如果有）； |
| 1.2 遵循 Code conventions | 同上 | 同上 |
| 1.3 符合预期文件 | 同上 | 同上 |
| 1.4 所有任务完成 | 同上 | 同上 |
| 1.5 单元测试用例 | 同上 | 同上 |
| 1.5 集成测试用例 | 同上 | 同上 |
| 1.5 Edge Cases | 同上 | 同上 |
| 1.6 测试覆盖完整性 | 同上 | 同上 |
| 证据存在 | 同上 | 同上 |
| 命令齐全 | 同上 | 同上 |
| 退出码全零 | 同上 | 同上 |
| 用例标识在证 | 同上 | 同上 |
| 快照一致 | 同上 | 同上 |

### 偏差评判
#### 合理偏差（对应问题已豁免）
<每条：偏差摘要 — 豁免的问题 — 判定理由 / 或「无」>

#### 质疑偏差（对应问题保留）
<每条：偏差摘要 — 质疑理由 / 或「无」>

## 验证结果

| 校验项 | 结果 |
|---|---|
| Type check | 通过 / 失败 / 跳过 |
| Lint | 通过 / 失败 / 跳过 |
| Tests | 通过 / 失败（--full） / 证据核验通过 / 无证据 / 证据矛盾 / 证据过期（--prp） / 跳过（默认档） |
| Build | 通过 / 失败（--full） / 证据核验通过 / 无证据 / 证据矛盾 / 证据过期（--prp） / 跳过（默认档） |

## 已审查文件
<list of files with change type: 添加/修改/删除>
```

### Phase 6 — 输出

向用户报告：

```markdown
本地审查: <branch>，<n> 个文件
决策：PASS | BLOCK COMMIT

问题：<critical_count> 个 CRITICAL，<high_count> 个 HIGH，<medium_count> 个 MEDIUM，<low_count> 个 LOW
验证：<pass_count>/<total_count> 项通过（档位：Tier 1 / Tier 1+2 / Tier 1+implement 核验）

产物：
  审查：.claude/PRPs/reviews/{plan-name}-<yyyymmdd-HHMM>.review.md（--prp 档） / .claude/reviews/local-<yyyymmdd-HHMM>.review.md（默认 / --full）

后续步骤：
  - PASS → /prp-commit 提交变更
  - BLOCK COMMIT（--prp 档）→ 运行 `/prp-fix .claude/PRPs/reviews/{plan-name}-<yyyymmdd-HHMM>.review.md` 按报告问题清单修复并核销，随后重新运行 /code-review --prp <plan-path>
  - BLOCK COMMIT（默认 / --full 档）→ 按报告问题清单，修复变更，随后重新运行 `/code-review` 或 `/code-review  --full`

```

---

## PR 审核模式

全面的 GitHub PR 审查 —— 获取差异、读取完整文件、运行验证、发布审查结果。

### Phase 1 — 获取

解析输入以确定 PR：

| 输入 | 操作 |
|---|---|
| Number（例如 `42`） | 作为 PR number |
| URL（`github.com/.../pull/42`） | 提取 PR number |
| Branch name | 通过 `gh pr list --head <branch>` 查找 PR |

```bash
gh pr view <NUMBER> --json number,title,body,author,baseRefName,headRefName,changedFiles,additions,deletions
gh pr diff <NUMBER>
```

如果未找到 PR，则报错并停止。为后续阶段保存 PR 元数据。

### Phase 2 — CONTEXT

构建审查上下文：

1. **项目规则** —— 阅读 `CLAUDE.md`、`.claude/docs/` 以及任何 contributing guidelines
2. **规划产物** —— 检查 `.claude/prds/`、`.claude/plans/`、`.claude/reviews/` 以及遗留的 `.claude/PRPs/{prds,plans,reports,reviews}/`，以获取与此 PR 相关的上下文——仅用于理解 PR 意图与背景；其中的结论（发现清单、误报判定、偏差豁免）不得作为本轮发现的裁决依据或豁免理由
3. **PR 意图** —— 解析 PR 描述，了解目标、相关问题和测试计划
4. **变更文件** —— 列出所有修改的文件，并按类型分类（源码、测试、配置、文档）

### Phase 3 — 审查

**完整**阅读每个变更文件（不仅是 diff hunks —— 还需要周边上下文）。

对于 PR 审查，获取 PR head revision 处的完整文件内容：
```bash
  gh pr diff <NUMBER> --name-only | while IFS= read -r file; do
  gh api "repos/{owner}/{repo}/contents/$file?ref=<head-branch>" --jq '.content' | base64 -d
done
```

按 **共享审查标准** 的 8 维度清单逐项检查，并按严重度评级体系对每项发现独立评级。

### Phase 4 — 验证

按 **共享审查标准** 的验证命令矩阵执行 Tier 1 + Tier 2 全部适用命令，记录每条命令的 pass/fail。

### Phase 5 — 决定

根据发现形成建议：

| 条件 | 决策 |
|---|---|
| 没有 CRITICAL 或 HIGH 问题，校验通过 | **APPROVE** |
| 仅有 MEDIUM 或 LOW 问题，校验通过 | **APPROVE**（附带评论） |
| 存在任何 HIGH 问题或校验失败 | **REQUEST CHANGES** |
| 存在任何 CRITICAL 问题 | **BLOCK** —— merge 前必须修复 |

特殊情况：
- Draft PR → 始终使用 **COMMENT**（而非 approve/block）
- 仅文档/配置变更 → 较轻量的审查，聚焦正确性
- 显式使用 `--approve` 或 `--request-changes` flag → 覆盖决策（但仍报告所有发现）

### Phase 6 — 报告

在 `.claude/reviews/pr-<NUMBER>.review.md` 创建审查产物（PR 模式固定使用 `.claude/reviews/`）：

```markdown
# PR 审查: #<NUMBER> — <TITLE>

**审查时间**: <date>
**作者**: <author>
**分支**: <head> → <base>
**结论**: APPROVE | REQUEST CHANGES | BLOCK

## 概括
<1-2 句子整体评估>

## 发现

### CRITICAL
<findings or "None">

### HIGH
<findings or "None">

### MEDIUM
<findings or "None">

### LOW
<findings or "None">

## 校验结果

| 校验项 | 结果 |
|---|---|
| Type check | 通过 / 失败 / 跳过 |
| Lint | 通过 / 失败 / 跳过 |
| Tests | 通过 / 失败 / 跳过 |
| Build | 通过 / 失败 / 跳过 |

## 已审查文件
<list of files with change type: 添加/修改/删除>
```

### Phase 7 — 发布

将审查结果发布到 GitHub：

```bash
# If APPROVE
gh pr review <NUMBER> --approve --body "<summary of review>"

# If REQUEST CHANGES
gh pr review <NUMBER> --request-changes --body "<summary with required fixes>"

# If COMMENT only (draft PR or informational)
gh pr review <NUMBER> --comment --body "<summary>"
```

若要针对特定行发表 inline comment，请使用 GitHub review comments API：
```bash
gh api "repos/{owner}/{repo}/pulls/<NUMBER>/comments" \
  -f body="<comment>" \
  -f path="<file>" \
  -F line=<line-number> \
  -f side="RIGHT" \
  -f commit_id="$(gh pr view <NUMBER> --json headRefOid --jq .headRefOid)"
```

或者，一次性发布一条包含多个 inline comment 的 review：
```bash
gh api "repos/{owner}/{repo}/pulls/<NUMBER>/reviews" \
  -f event="COMMENT" \
  -f body="<overall summary>" \
  --input comments.json  # [{"path": "file", "line": N, "body": "comment"}, ...]
```

### Phase 8 — 输出

向用户报告：

```
PR #<NUMBER>: <TITLE>
决策：<APPROVE|REQUEST_CHANGES|BLOCK>

问题：<critical_count> 个 CRITICAL，<high_count> 个 HIGH，<medium_count> 个 MEDIUM，<low_count> 个 LOW
验证：<pass_count>/<total_count> 项检查通过

产物：
  审查：.claude/reviews/pr-<NUMBER>.review.md
  GitHub：<PR URL>

后续步骤：
  - <基于决策的上下文建议>
```

---

## Edge Cases

- **没有 `gh` CLI**：回退到仅本地的审查（读取 diff，跳过 GitHub 发布）。警告用户。
- **Diverged branch**：建议在审查前执行 `git fetch origin && git rebase origin/<base>`。
- **大型 PR（>50 个文件）**：就审查范围发出警告。先聚焦源码变更，然后是测试，最后是配置/文档。
