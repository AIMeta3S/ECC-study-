---
description: "基于当前分支的未推送 commit 创建 GitHub PR — 发现模板、分析变更、执行推送"
argument-hint: "[base-branch] (默认: main)"
---

# 创建 Pull Request

**输入**：`$ARGUMENTS` — 可选，可包含 base branch 名称和/或 flag（例如 `--draft`）。

**解析 `$ARGUMENTS`**：
- 提取已识别的 flag（`--draft`）
- 将剩余的非 flag 文本作为 base branch 名称
- 若未指定，则默认 base branch 为 `main`

---

## 阶段 1 — 校验

检查前置条件：

```bash
git branch --show-current
git status --short
git log origin/<base>..HEAD --oneline
```

| 检查项 | 条件 | 失败时的处理 |
|---|---|---|
| 不在 base branch 上 | 当前 branch ≠ base | 停止："请先切换到 feature branch。" |
| 工作目录干净 | 无未提交的变更 | 警告："存在未提交的变更。请先 commit 或 stash。" |
| 有领先的 commit | `git log origin/<base>..HEAD` 非空 | 停止："相对于 `<base>` 没有领先的 commit。无需创建 PR。" |
| 不存在已有 PR | `gh pr list --head <branch> --json number` 为空 | 停止："PR 已存在：#<number>。使用 `gh pr view <number> --web` 打开它。" |

若所有检查通过，则继续。

---

## 阶段 2 — 发现

### PR 模板

按以下顺序查找 PR 模板：

1. `.github/PULL_REQUEST_TEMPLATE/` 目录 — 若存在，列出文件并让用户选择（或使用 `default.md`）
2. `.github/PULL_REQUEST_TEMPLATE.md`
3. `.github/pull_request_template.md`
4. `docs/pull_request_template.md`

若找到，则读取该模板，并将其结构用于 PR 正文。

### Commit 分析

```bash
git log origin/<base>..HEAD --format="%h %s" --reverse
```

分析 commit 以确定：
- **PR 标题**：使用 conventional commit 格式并带 type 前缀 — `feat: ...`、`fix: ...` 等
  - 若存在多种 type，使用占主导的 type
  - 若只有一个 commit，直接使用其 message
- **变更摘要**：按 type/area 对 commit 分组

### 文件分析

```bash
git diff origin/<base>..HEAD --stat
git diff origin/<base>..HEAD --name-only
```

对变更文件进行分类：源码、测试、文档、配置、migrations。

### 规划 artifact

检查由 `/plan-prd`、`/plan` 或旧版 PRP 工作流产出的相关 artifact：
- `.claude/prds/` — 本 PR 实现其中某个 milestone 的 PRD
- `.claude/plans/` — 本 PR 执行的 plan
- `.claude/PRPs/prds/` — 旧版 PRP 的 PRD
- `.claude/PRPs/plans/` — 旧版 PRP 的实现 plan
- `.claude/PRPs/reports/` — 旧版 PRP 的实现报告

若存在，则在 PR 正文中引用它们。

---

## 阶段 3 — 推送

```bash
git push -u origin HEAD
```

若 push 因分支分叉而失败：
```bash
git fetch origin
git rebase origin/<base>
git push -u origin HEAD
```

若发生 rebase 冲突，则停止并通知用户。

---

## 阶段 4 — 创建

### 使用模板

若在阶段 2 找到了 PR 模板，则使用 commit 和文件分析的结果填充每个部分。保留模板的所有部分 — 不适用的部分填为 "N/A"，而不是将其删除。

### 不使用模板

使用以下默认格式：

```markdown
## Summary

<用 1-2 句话描述本 PR 做了什么以及为什么>

## Changes

<按 area 分组的变更列表>

## Files Changed

<变更文件的表格或列表，标注变更类型：Added/Modified/Deleted>

## Testing

<描述变更如何被测试，或填 "Needs testing">

## Related Issues

<关联的 issue，使用 Closes/Fixes/Relates to #N，或填 "None">
```

### 创建 PR

```bash
gh pr create \
  --title "<PR title>" \
  --base <base-branch> \
  --body "<PR body>"
  # 若从 $ARGUMENTS 中解析到了 --draft flag，则添加 --draft
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
变更: +<additions> -<deletions>，共 <changedFiles> 个文件

CI 检查: <状态摘要、或 "pending"、或 "未配置">

引用的 artifact:
  - <PR 正文中关联的 PRD/plan>

后续步骤:
  - gh pr view <number> --web   → 在浏览器中打开
  - /code-review <number>       → 审查该 PR
  - gh pr merge <number>        → 准备就绪后合并
```

---

## 边界情况

- **没有 `gh` CLI**：停止并提示："需要 GitHub CLI（`gh`）。安装地址：<https://cli.github.com/>"
- **未认证**：停止并提示："请先运行 `gh auth login`。"
- **需要 force push**：若远端已分叉且已完成 rebase，则使用 `git push --force-with-lease`（绝不使用 `--force`）。
- **多个 PR 模板**：若 `.github/PULL_REQUEST_TEMPLATE/` 下有多个文件，则列出它们并让用户选择。
- **大型 PR（>20 个文件）**：警告 PR 规模过大。若变更在逻辑上可分离，建议拆分。
