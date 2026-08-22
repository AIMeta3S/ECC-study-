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
| Type Safety / Performance / Completeness | MEDIUM | 确认会引发故障时升 HIGH |
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

**Tier 语义**：Tier 1（秒级）所有档位必跑；Tier 2（分钟级）由档位决定——PR 模式与 `--full` 必跑，本地默认档跳过，`--prp` 档以 implement 结果核验替代（不重跑测试）。"—"表示该语言不适用，报告中标注"跳过"。

---

## 本地审查模式

对未提交的变更进行全面的安全与质量审查。

### Phase 1 — 收集

```bash
git diff --name-only HEAD
```

如果没有变更文件，则停止："没有可审查的内容。"

### Phase 2 — 审查

完整阅读每个变更文件，按「共享审查标准 → 审查维度清单」的 8 维度清单逐项检查，并按「共享审查标准 → 严重度评级」体系对每项发现独立评级。

### Phase 3 — 验证

| 档位 | 执行内容 |
|---|---|
| 默认（空参数） | 仅 Tier 1（快速静态门禁） |
| `--full` | Tier 1 + Tier 2 |
| `--prp <plan-path>` | Tier 1 + implement 结果核验（见下） |

按档位执行「共享审查标准 → 验证命令矩阵」的命令，记录每条命令的 pass/fail。

#### implement 结果核验（`--prp` 档）

1. 读取 `<plan-path>` 指向的计划文件，核对以下项。记录偏差内容。无偏差 → 记为通过。无偏差是正常情况，禁止为了体现你的价值而编造、虚构偏差内容。

  - **文件有效性**：文件不存在或无「摘要、用户故事、问题  → 解决方案、Patterns to Mirror、Files to Change、验收标准、分步任务（每项含 IDENTIFIER / ACTION / IMPLEMENT / MIRROR / VALIDATE 字段）、测试策略（含 单元测试 / 集成测试 / Edge Cases 检查清单 小节）、验证命令（含 静态分析 / 单元测试 / 集成测试 小节）」小节 → 停止并提示："未找到实现报告 `<plan-path>`，请确认路径及文档内容的正确性"

  - **验证目标是否飘逸**：根据「摘要、用户故事、问题  → 解决方案」，检查变更是否符合预期目标。

  - **验证是否遵循 Code conventions**：根据「Patterns to Mirror」，检查变更是否符合 Code conventions。

  - **验证是否符合预期文件**：根据「Files to Change」，检查变更是否符合预期。

  - **验证所有任务是否完成**：根据「分步任务」，检查变更是否符合预期。

  - **验证测试用例**：根据「测试策略」，检查测试用例是否全部被实现：
    - 单元测试：逐条检查单元测试是否实现。
    - 集成测试：逐条检查集成测试是否实现。
    - Edge Cases：逐条检查 Edge Cases 测试是否在测试用例中被覆盖。

  - **测试用例覆盖完整性** —— 测试用例须覆盖变更文件的全部实质内容：
    - 将真实的变更文件与「测试策略 - 单元测试」中的测试用例逐项对照。排除不需测试的变更(标记为 无变化 的)
    - 将真实的变更文件与「测试策略 - 集成测试」中的测试用例逐项对照。排除不需测试的变更(标记为 无变化 的)
    - 源码文件无对应测试且无排除理由 → 记为覆盖缺失

2. 读取实现报告文件（根据`<plan-path>`获取实现报告的路径，例如：`.claude/PRPs/implement/{plan-name}.report.md`），核对以下项：

  - **验证结果**：读取计划文件的「验证命令」小节，逐项检查实现报告中「验证结果」中是否包含该命令的验证结果。

  - **偏差是否被登记**：检查本章节 1 中记录的偏差是否在实现报告的「与计划的偏差」中被登记。

3. **核验结果映射**（并入 Phase 4）：
  - 所有项目验证通过 → 视同 Tier 2 通过
  - 任一验证项未通过 → 记 HIGH 问题
  - 测试用例覆盖完整性 验证未通过 → 记 MEDIUM（核心逻辑无测试 → 升 HIGH）

### Phase 4 — 决定

| 条件 | 决策 |
|---|---|
| 没有 CRITICAL 或 HIGH 问题，本档位验证通过 | **PASS** |
| 仅有 MEDIUM 或 LOW 问题，本档位验证通过 | **PASS**（附提示） |
| 存在任何 HIGH 问题，或 Tier 1 失败，或 `--full` 的 Tier 2 失败，或 `--prp` 核验存在未通过项 | **BLOCK COMMIT** |
| 存在任何 CRITICAL 问题 | **BLOCK COMMIT** |

绝不放行包含安全漏洞的代码。

### Phase 5 — 报告落盘

按档位落盘：`--prp` 档在 `.claude/PRPs/reviews/local-<yyyymmdd-HHMM>-review.md` 创建审查产物；其余档位（默认、`--full`）在 `.claude/reviews/local-<yyyymmdd-HHMM>-review.md` 创建。

`--prp` 档报告即 /prp-fix 的核销对象——其修复核销产物为同目录 `<本文件名去 -review.md>-fix-report.md`，本报告自身不会被 /prp-fix 修改；默认 / `--full` 档报告（`.claude/reviews/`）不在 /prp-fix 服务范围内。报告模板：

```markdown
# 本地审查: <branch>

**审查时间**: <date>
**分支**: <branch>
**决策**: PASS | BLOCK COMMIT

## 概括
<1-2 句整体评估>

## 发现

### CRITICAL
<findings or "None">

### HIGH
<findings or "None">

### MEDIUM
<findings or "None">

### LOW
<findings or "None">

## 验证结果

| 校验项 | 结果 |
|---|---|
| Type check | 通过 / 失败 / 跳过 |
| Lint | 通过 / 失败 / 跳过 |
| Tests | 通过 / 失败（--full） / 上游已验证（--prp） / 跳过（默认档） |
| Build | 通过 / 失败（--full） / 上游已验证（--prp） / 跳过（默认档） |

## implement 结果核验（仅 `--prp` 档写入本节）

**计划文件**：`<plan-path>`
**实现报告**：`.claude/PRPs/implement/{plan-name}.report.md`

**计划文件核验**（依据 `<plan-path>`，无偏差 → 记为通过）：

| 核验项 | 结果 |
|---|---|
| 文件有效性 | 通过 / 失败（缺失小节：<清单>） |
| 目标是否飘逸 | 通过 / 偏差：<内容> |
| 遵循 Code conventions | 通过 / 偏差：<内容> |
| 符合预期文件 | 通过 / 偏差：<内容> |
| 所有任务是否完成 | 通过 / 偏差：<内容> |
| 测试用例 — 单元测试 | 通过 / 偏差：<内容> |
| 测试用例 — 集成测试 | 通过 / 偏差：<内容> |
| 测试用例 — Edge Cases | 通过 / 偏差：<内容> |
| 测试用例覆盖完整性 | 通过 / 覆盖缺失：<文件清单> |

**实现报告核验**（依据实现报告）：

| 核验项 | 结果 |
|---|---|
| 验证结果 | 通过 / 偏差：<缺失的验证命令> |
| 偏差是否被登记 | 通过 / 偏差：<未登记项> |


## 已审查文件
<list of files with change type: 添加/修改/删除>
```

### Phase 6 — 输出

向用户报告：

```
本地审查: <branch>，<n> 个文件
决策：PASS | BLOCK COMMIT

问题：<critical_count> 个 CRITICAL，<high_count> 个 HIGH，<medium_count> 个 MEDIUM，<low_count> 个 LOW
验证：<pass_count>/<total_count> 项通过（档位：Tier 1 / Tier 1+2 / Tier 1+implement 核验）

产物：
  审查：.claude/PRPs/reviews/local-<yyyymmdd-HHMM>-review.md（--prp 档） / .claude/reviews/local-<yyyymmdd-HHMM>-review.md（默认 / --full）

后续步骤：
  - PASS → /prp-commit 提交变更
  - BLOCK COMMIT（--prp 档）→ 运行 /prp-fix 按报告问题清单修复并核销，随后重新运行 /code-review --prp <plan-path>
  - BLOCK COMMIT（默认 / --full 档）→ 按报告问题清单，修复变更，随后重新运行 /code-review（同档位）
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
2. **规划产物** —— 检查 `.claude/prds/`、`.claude/plans/`、`.claude/reviews/` 以及遗留的 `.claude/PRPs/{prds,plans,reports,reviews}/`，以获取与此 PR 相关的上下文
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

在 `.claude/reviews/pr-<NUMBER>-review.md` 创建审查产物（PR 模式固定使用 `.claude/reviews/`）：

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
  审查：.claude/reviews/pr-<NUMBER>-review.md
  GitHub：<PR URL>

后续步骤：
  - <基于决策的上下文建议>
```

---

## Edge Cases

- **没有 `gh` CLI**：回退到仅本地的审查（读取 diff，跳过 GitHub 发布）。警告用户。
- **Diverged branch**：建议在审查前执行 `git fetch origin && git rebase origin/<base>`。
- **大型 PR（>50 个文件）**：就审查范围发出警告。先聚焦源码变更，然后是测试，最后是配置/文档。
