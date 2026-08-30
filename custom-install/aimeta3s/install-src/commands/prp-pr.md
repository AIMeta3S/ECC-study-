---
description: "从当前 branch 基于未推送的 commits 创建 PR — 发现模板、分析变更、执行 push"
argument-hint: "[base-branch]（默认：main）"
---

# 创建 Pull Request

> PRP workflow 系列的一部分。

**输入**：`$ARGUMENTS` — 可选，可能包含 base branch 名称 和/或 flags（例如 `--draft`）。

**解析 `$ARGUMENTS`**：
- 提取所有识别到的 flags（`--draft`）
- 将剩余的非 flag 文本视为 base branch 名称
- 若未指定，则 base branch 默认为 `main`

---

## 阶段 1 — 验证

检查前置条件：

```bash
git branch --show-current
git status --short
git log origin/<base>..HEAD --oneline
```

| 检查项 | 条件 | 失败时的操作 |
|---|---|---|
| 不在 base branch 上 | 当前分支 ≠ base | 停止并提示："请先切换到功能分支。" |
| 清理的工作目录 | 无未提交的变更 | 警告："存在未提交的变更。请先提交或暂存变更。使用 `/prp-commit` 来提交。" |
| 有领先的 commits | `git log origin/<base>..HEAD` 非空 | 停止并提示："没有领先于 <base> 的提交，无需创建 PR。" |
| 无已存在的 PR | `gh pr list --head <branch> --json number` 为空 | 停止并提示："PR 已存在：#<number>。使用 `gh pr view <number> --web` 打开它。" |

如果所有检查项都通过，则继续。

---

## 阶段 2 — 发现

### PR 模板

按以下顺序搜索 PR 模板：

1. `.github/PULL_REQUEST_TEMPLATE/` 目录 — 如果存在，列出文件并让用户选择（或使用 `default.md`）
2. `.github/PULL_REQUEST_TEMPLATE.md`
3. `.github/pull_request_template.md`
4. `docs/pull_request_template.md`

如果找到，读取它并将其结构用于 PR 正文。

### Commit 分析

```bash
git log origin/<base>..HEAD --format="%h %s" --reverse
```

分析 commits 以确定：
- **PR title**：使用 conventional commit 格式并带 type 前缀 — `feat: ...`、`fix: ...` 等
  - 如果存在多个 type，使用占主导的 type
  - 如果是单个 commit，直接使用其 message
- **变更摘要**：按 type/area 对 commits 分组

### 文件分析

```bash
git diff origin/<base>..HEAD --stat
git diff origin/<base>..HEAD --name-only
```

对变更的文件分类：源代码、测试、文档、配置文件、迁移文件。

### PRP Artifacts

检查相关的 PRP artifacts：
- `docs/PRPs/implements/` — 实现报告
- `docs/PRPs/plans/` — 已执行的 plans
- `docs/PRPs/prds/` — 相关的 PRDs

如果存在，在 PR body 中引用它们。

---

## 阶段 3 — 推送

```bash
git push -u origin HEAD
```

如果因为分支分叉而 push 失败：
```bash
git fetch origin
git rebase origin/<base>
git push -u origin HEAD
```

如果发生 rebase 冲突，停止并通知用户。

---

## 阶段 4 — 创造

### 使用模板

如果在阶段 2 中找到了 PR 模板，使用 commit 和文件分析填充每个 section。保留所有模板 sections — 不适用的 section 填为 "N/A"，而不是删除它们。

### 不使用模板

使用此默认格式：

```markdown
## 摘要

<1-2 句话描述此 PR 的内容及原因>

## 变更

<按区域分组的项目符号列表>

## 修改的文件

<表格或列表，包含变更文件及其变更类型：新增/修改/删除>

## 测试

<描述变更是如何测试的，或“需要测试”>

## 相关问题

<关联的 issue，使用 Closes/Fixes/Relates to #N，或“无”>
```

### 创建 PR

```bash
gh pr create \
  --title "<PR title>" \
  --base <base-branch> \
  --body "<PR body>"
  # 如果从 $ARGUMENTS 中解析到了 --draft flag，则添加 --draft
```

---

## 阶段 5 — 验证

```bash
gh pr view --json number,url,title,state,baseRefName,headRefName,additions,deletions,changedFiles
gh pr checks --json name,status,conclusion 2>/dev/null || true
```

---

## 阶段 6 — 输出

向用户报告：

```
PR #<number>: <title>
URL: <url>
分支: <head> → <base>
变更: +<additions> -<deletions>，across <changedFiles> files

CI 检查: <状态摘要或“pending”或“未配置”>

引用的产物:
  - <PR 正文中链接的任何 PRP 报告/计划>

后续步骤:
  - gh pr view <number> --web   → 在浏览器中打开
  - /code-review <number>       → 审查该 PR
  - gh pr merge <number>        → 准备就绪后合并
```

---

## 边界情况

- **没有 `gh` CLI**：停止并提示："需要 GitHub CLI（`gh`）。安装地址：<https://cli.github.com/>"
- **未认证**：停止并提示："请先运行 `gh auth login`。"
- **需要 force push**：如果 remote 已分叉且已执行 rebase，使用 `git push --force-with-lease`（绝不使用 `--force`）。
- **多个 PR 模板**：如果 `.github/PULL_REQUEST_TEMPLATE/` 有多个文件，列出它们并让用户选择。
- **大型 PR（>20 个文件）**：警告 PR 规模过大。如果变更在逻辑上可分离，建议拆分。
