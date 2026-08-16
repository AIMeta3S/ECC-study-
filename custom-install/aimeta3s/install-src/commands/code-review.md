---
description: 代码审查 —— 本地未提交的变更或 GitHub PR（PR 模式请传入 PR number/URL；本地模式可加 --full 全量验证）
argument-hint: [pr-number | pr-url | --full | 空 进行本地审查]
---

# 代码审查

> 属于 PRP workflow 系列之一。

**输入**: $ARGUMENTS

---

## 模式选择

如果 `$ARGUMENTS` 包含 PR number、PR URL 或 `--pr`：
→ 跳转到下方的 **PR 审核模式**。

否则：
→ 使用 **本地审查模式**（`--full` 是本地模式 flag，不触发 PR 模式）。

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

**Tier 语义**：Tier 1（秒级）两种模式必跑；Tier 2（分钟级）本地审查模式默认跳过（`--full` 启用），PR 审核模式必跑。"—"表示该语言不适用，报告中标注"跳过"。

---

## 本地审查模式

对未提交的变更进行全面的安全与质量审查。

### Phase 1 — 收集

```bash
git diff --name-only HEAD
```

如果没有变更文件，则停止："没有可审查的内容。"

### Phase 2 — 审查

完整阅读每个变更文件，按 **共享审查标准** 的 8 维度清单逐项检查，并按严重度评级体系对每项发现独立评级。

### Phase 3 — 验证

按 **共享审查标准** 的验证命令矩阵执行：

- **必跑**：Tier 1（Type check + Lint，不适用的语言标注"跳过"）
- **默认跳过**：Tier 2（Test + Build）
- `$ARGUMENTS` 包含 `--full` 时：Tier 1 + Tier 2 全部执行

记录每条命令的 pass/fail。

### Phase 4 — 决定

| 条件 | 决策 |
|---|---|
| 没有 CRITICAL 或 HIGH 问题，Tier 1 验证通过 | **PASS** |
| 仅有 MEDIUM 或 LOW 问题，Tier 1 验证通过 | **PASS**（附提示） |
| 存在任何 HIGH 问题或 Tier 1 验证失败 | **BLOCK COMMIT** |
| 存在任何 CRITICAL 问题 | **BLOCK COMMIT** |

绝不放行包含安全漏洞的代码。

### Phase 5 — 报告落盘

在 `.claude/reviews/local-<yyyymmdd-HHMM>-review.md` 创建审查产物（若仓库已使用遗留的 `.claude/PRPs/reviews/`，则写入该处）：

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
| Tests | 跳过（本地快速模式，--full 启用） / 通过 / 失败 |
| Build | 跳过（本地快速模式，--full 启用） / 通过 / 失败 |

## 已审查文件
<list of files with change type: 添加/修改/删除>
```

### Phase 6 — 输出

向用户报告：

```
本地审查: <branch>，<n> 个文件
决策：PASS | BLOCK COMMIT

问题：<critical_count> 个 CRITICAL，<high_count> 个 HIGH，<medium_count> 个 MEDIUM，<low_count> 个 LOW
验证：<pass_count>/<total_count> 项通过（Tier 2 跳过时注明）

产物：
  审查：.claude/reviews/local-<yyyymmdd-HHMM>-review.md

后续步骤：
  - PASS → /prp-commit 提交变更
  - BLOCK COMMIT → 修复 CRITICAL/HIGH 问题后重新运行 /code-review
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

在 `.claude/reviews/pr-<NUMBER>-review.md` 创建审查产物，除非仓库已为此工作流使用旧版 `.claude/PRPs/reviews/`：

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
