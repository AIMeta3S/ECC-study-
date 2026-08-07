---
description: 代码审查 —— 本地未提交的变更或 GitHub PR（PR 模式请传入 PR number/URL）
argument-hint: [pr-number | pr-url | 空 进行本地审查]
---

# 代码审查

> 属于 PRP workflow 系列之一。

**输入**: $ARGUMENTS

---

## 模式选择

如果 `$ARGUMENTS` 包含 PR number、PR URL 或 `--pr`：
→ 跳转到下方的 **PR 审核模式**。

否则：
→ 使用 **本地审查模式**。

---

## 本地审查模式

对未提交的变更进行全面的安全与质量审查。

### Phase 1 — 收集

```bash
git diff --name-only HEAD
```

如果没有变更文件，则停止："没有可审查的内容。"

### Phase 2 — 审查

完整阅读每个变更文件。检查以下内容：

**安全问题 (CRITICAL)：**
- 硬编码的 credentials、API keys、tokens
- SQL injection 漏洞
- XSS 漏洞
- 缺少 input validation
- 不安全的依赖项
- path traversal 风险

**代码质量 (HIGH)：**
- 函数超过 50 行
- 文件超过 800 行
- 嵌套深度超过 4 层
- 缺少错误处理
- console.log 语句
- TODO/FIXME 注释
- public APIs 缺少 JSDoc

**最佳实践 (MEDIUM)：**
- mutation 模式（应改用 immutable）
- 在代码/注释中使用 emoji
- 新代码缺少测试
- 无障碍问题 (a11y)

### Phase 3 — 报告

生成包含以下内容的报告：
- 严重等级：CRITICAL, HIGH, MEDIUM, LOW
- 文件位置和行号
- 问题描述
- 建议的修复方案

如果发现 CRITICAL 或 HIGH 问题，则阻止 commit。
绝不批准包含安全漏洞的代码。

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

请按照以下7个类别应用审核清单：

| Category | What to Check |
|---|---|
| **Correctness** | Logic errors, off-by-ones, null handling, edge cases, race conditions |
| **Type Safety** | Type mismatches, unsafe casts, `any` usage, missing generics |
| **Pattern Compliance** | Matches project conventions (naming, file structure, error handling, imports) |
| **Security** | Injection, auth gaps, secret exposure, SSRF, path traversal, XSS |
| **Performance** | N+1 queries, missing indexes, unbounded loops, memory leaks, large payloads |
| **Completeness** | Missing tests, missing error handling, incomplete migrations, missing docs |
| **Maintainability** | Dead code, magic numbers, deep nesting, unclear naming, missing types |

对每项发现进行严重程度评级：

| 严重等级 | 含义 | 操作 |
|---|---|---|
| **CRITICAL** | 安全漏洞或数据丢失风险 | merge 前必须修复 |
| **HIGH** | 可能导致问题的程序错误或逻辑错误 | merge 前应修复 |
| **MEDIUM** | 代码质量问题或缺少最佳实践 | 建议修复 |
| **LOW** | 风格小问题或次要建议 | 可选 |

### Phase 4 — 验证

运行可用的校验命令：

从配置文件（`package.json`、`Cargo.toml`、`go.mod`、`pyproject.toml` 等）检测项目类型，然后运行相应的命令：

**Node.js / TypeScript**（存在 `package.json`）：
```bash
npm run typecheck 2>/dev/null || npx tsc --noEmit 2>/dev/null  # 类型检查
npm run lint                                                    # Lint
npm test                                                        # 测试
npm run build                                                   # 构建
```

**Rust**（存在 `Cargo.toml`）：
```bash
cargo clippy -- -D warnings  # Lint
cargo test                   # 测试
cargo build                  # 构建
```

**Go**（存在 `go.mod`）：
```bash
go vet ./...    # Lint
go test ./...   # 测试
go build ./...  # 构建
```

**Python**（存在 `pyproject.toml` / `setup.py`）：
```bash
pytest  # 测试
```

仅运行适用于所检测项目类型的命令。记录每条命令的 pass/fail。

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

在  处创建审查产物，除非仓库已为此 workstream 使用遗留的 ：
除非仓库已为此工作流使用旧版 `.claude/PRPs/reviews/` 否则请在 `.claude/reviews/pr-<NUMBER>-review.md` 创建 review artifact：

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
