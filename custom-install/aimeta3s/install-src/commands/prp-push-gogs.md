---
description: "Gogs 收尾出口 — 推送当前分支，生成 PR 标题/描述并落盘，给出网页手动创建 Pull Request 的 compare 链接与操作指引（Gogs 无 PR API，PR 在网页创建）"
argument-hint: "[base-branch] [--plan <plan-path>]（base 默认：origin/HEAD 回退 main；--plan 决定落盘文件名）"
---

# Gogs 收尾（推送 + 网页建 PR 指引）

> PRP workflow 系列的一部分。Gogs 等自建 git 服务没有 PR REST API，PR 只能在网页手动创建——本命令是 PRP 链在该环境的收尾出口：推送分支、生成 PR 标题/描述并落盘、给出 compare 链接与操作指引。GitHub 仓库请直接用 `/prp-pr`。

**输入**：`$ARGUMENTS` — 可选，可能包含 base branch 名称 和/或 `--plan <plan-path>` flag。

**解析 `$ARGUMENTS`**：
- 提取 `--plan <plan-path>`（可选）：plan-name = 文件名去 `.plan.md`；文件不存在 → 停止并提示路径错误
- 将剩余的非 flag 文本视为 base branch 名称
- 若未指定，则 base branch 默认取 `git symbolic-ref --short refs/remotes/origin/HEAD` 去掉 `origin/` 前缀，失败回退 `main`

---

## 阶段 1 — 验证

检查前置条件：

```bash
git branch --show-current
git status --short
git log origin/<base>..HEAD --oneline
```

| 检查项 | 条件 | 未满足时的操作 |
|---|---|---|
| 非 GitHub remote | origin host ≠ github.com | 提示："GitHub 仓库请直接用 `/prp-pr`（可自动创建 PR）"，继续执行（推送本身通用） |
| 不在 base branch 上 | 当前分支 ≠ base | 停止并提示："请先切换到功能分支。" |
| 清理的工作目录 | 无未提交的变更 | 警告："存在未提交的变更。请先提交或暂存变更。使用 `/prp-commit` 来提交。" |
| 有领先的 commits | `git log origin/<base>..HEAD` 非空 | 视为完成：跳过阶段 3/4，直接进入阶段 5（无领先提交，分支可能已推送） |

如果所有检查项都通过，则继续。

---

## 阶段 2 — 发现

### web 根与 compare URL 推导

`git remote get-url origin` 按下表解析：

| remote 形态 | web 根 |
|---|---|
| `https://host/owner/repo.git` | `https://host` |
| `http://host/owner/repo.git` | `http://host`（提示建议改用 https） |
| `git@host:owner/repo.git` | `https://host` |
| `ssh://git@host:非22端口/...`、反代/子路径部署 | 不猜 URL，退化为文字指引 |

- owner/repo 取 remote 路径末两段（去 `.git`）
- compare URL = `<web根>/<owner>/<repo>/compare/<base>...<head>` — Gogs 网页创建 PR 的唯一入口，页面自带重复 PR 检测（已存在未合并 PR 时会直接展示）

### PR 模板

按以下顺序搜索 PR 模板（Gogs 原生候选优先，回退 GitHub 风格）：

1. `PULL_REQUEST.md`
2. `.gogs/PULL_REQUEST.md`
3. `.github/PULL_REQUEST.md`
4. `.github/PULL_REQUEST_TEMPLATE.md`

如果找到，读取它并将其结构用于 PR 描述。

### 标题生成（沿用 /prp-pr 规则）

```bash
git log origin/<base>..HEAD --format="%h %s" --reverse
```

- 使用 conventional commit 格式并带 type 前缀 — `feat: ...`、`fix: ...` 等；多个 type 时使用占主导的 type
- 单个 commit 直接使用其 message

### 描述生成与变更分析

- 有模板：按模板 section 填充（不适用填 N/A，不删 section）
- 无模板：默认结构（摘要/变更/修改的文件/测试/相关问题）
- 引用相关 PRP 产物：`docs/PRPs/implements/`、`docs/PRPs/plans/completed/`、`docs/PRPs/prds/` 中与本次变更相关者

```bash
git diff origin/<base>..HEAD --stat
git diff origin/<base>..HEAD --name-only
```

---

## 阶段 3 — 推送（fetch → rebase → fast-forward push，默认永不强推）

1. `git fetch origin`
2. 远端同名分支不存在（首次推送，`git rev-parse --verify origin/<branch>` 失败）→ `git push -u origin HEAD`，本阶段结束
3. `git rebase origin/<branch>` — 三态自动处理：远端无新提交 → 无操作；仅远端领先 → 快进本地；分叉 → 仅重放**未推送**的本地提交到远端最新之上（改写的只是远端从未见过的哈希，远端祖先链保留，后续 push 必为 fast-forward）。冲突 → 停止并通知用户
4. `git push -u origin HEAD` — fast-forward 推送，git 校验通过才更新远端；被拒（fetch 与 push 之间又有新推送，罕见竞争）→ 重跑一次本阶段，仍被拒 → 停止并人工核对（远端历史可能已被他人改写）

覆盖保护：默认绝不用 `--force` / `--force-with-lease`；仅当用户明确要求改写**已推送**历史时，确认后果后用 `git push --force-with-lease`（远端存在不为你知的新提交时自动拒绝）。

注：远端 base 分支领先（`origin/<base>` 前进）不影响本分支推送成败；是否先 rebase base 由用户决定，本命令不强制。

---

## 阶段 4 — 验证

```bash
git ls-remote --heads origin <branch>
```

命中即分支确已到达远端；未命中 → 停止并报告推送异常。

---

## 阶段 5 — 落盘与输出

将下方模板内容（同一份）写入 `docs/PRPs/prs/<name>-<yyyymmdd-HHMM>.pr.md`，并在终端输出同内容 + 文件路径：

- `<name>`：给了 `--plan` 则为 `{plan-name}`（与 reviews 报告 `{plan-name}-<时间戳>.review.md` 同构）；否则为 `{branch-name}`（`/` 清洗为 `-`）
- 目录不存在则创建；时间戳内嵌文件名，与 reviews 报告同规 — 重跑产生新文件、按文件名排序不依赖 mtime

```text
分支 <branch> 已推送到 origin（领先 <base> N 个提交）。
当前 git 服务（<host>）不支持命令行创建 PR，请在网页手动提交：
  1. 打开 <compare URL>（或：<仓库 web 地址>/compare/<base>...<head>）
  2. 复制下方标题与描述粘贴到表单，点击「Create pull request」

变更: <files> files, +<add> -<del>

PR 标题:
<阶段 2 生成的标题>

PR 描述（自本文件复制）:
<阶段 2 生成的描述（含 PRP 产物引用）>

后续步骤:
  - 网页中完成 PR 创建与合并
  - /code-review            → 本地档审查本次变更
```

---

## 边界情况

- **Gogs 无 PR API**：PR 必须在网页手动创建，本命令止步于推送 + 指引（有意设计，非缺陷）。
- **URL 推导失败**：SSH 自定义端口、反代/子路径部署 → 不猜 URL，输出文字指引（仓库 web 地址 + `/compare/<base>...<head>` 路径格式）。
- **remote 是 github.com**：提示 "GitHub 仓库请直接用 `/prp-pr`（可自动创建 PR）"，推送逻辑继续（通用）。
- **无领先提交**：视为完成（分支可能已推送），仍输出 compare URL 与指引。
- **rebase 冲突**：停止并通知用户，解决后重跑本命令（幂等）。
- **大型 PR（>20 个文件）**：警告 PR 规模过大。如果变更在逻辑上可分离，建议拆分。

---

## 作为 subagent 被派发时

被 /prp-run 派发时遵循其派发协议，只按固定格式返回：

- 状态: 完成 | 需人工 | 失败
- 产物: `docs/PRPs/prs/<name>-<yyyymmdd-HHMM>.pr.md` 落盘路径 + compare URL + 远端分支名
- 关键结论: 推送结果、生成的 PR 标题一行
- 需用户决策: 触发停止时的问题原文清单；无则写 无
