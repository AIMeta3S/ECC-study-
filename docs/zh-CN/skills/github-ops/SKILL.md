---
name: github-ops
description: GitHub 仓库运营、自动化与管理。使用 gh CLI 进行 issue 分流、PR 管理、CI/CD 运营、发布管理与安全监控。当用户希望管理 GitHub issue、PR、CI 状态、发布、贡献者、stale 项，或任何超出简单 git 命令范畴的 GitHub 运营任务时使用。
metadata:
  origin: ECC
---

# GitHub 运营

管理 GitHub 仓库，聚焦于社区健康度、CI 可靠性与贡献者体验。

## 何时激活

- 对 issue 进行分流（分类、打标签、回复、去重）
- 管理 PR（审查状态、CI 检查、stale PR、合并就绪度）
- 调试 CI/CD 失败
- 准备发布与 changelog
- 监控 Dependabot 与安全警报
- 管理开源项目的贡献者体验
- 用户说"检查 GitHub"、"分流 issue"、"审查 PR"、"合并"、"发布"、"CI 挂了"

## 工具要求

- 所有 GitHub API 操作均使用 **gh CLI**
- 仓库访问通过 `gh auth login` 配置

## Issue 分流

按类型和优先级对每个 issue 分类：

**类型：** bug、feature-request、question、documentation、enhancement、duplicate、invalid、good-first-issue

**优先级：** critical（破坏性/安全）、high（重大影响）、medium（锦上添花）、low（外观性）

### 分流工作流

1. 阅读 issue 的标题、正文和评论
2. 检查是否与现有 issue 重复（按关键字搜索）
3. 通过 `gh issue edit --add-label` 应用合适的标签
4. 对 question：撰写并发布有用的回复
5. 对需要更多信息的 bug：请求提供复现步骤
6. 对 good first issue：添加 `good-first-issue` 标签
7. 对 duplicate：评论并附上原 issue 链接，添加 `duplicate` 标签

```bash
# 搜索潜在重复项
gh issue list --search "keyword" --state all --limit 20

# 添加标签
gh issue edit <number> --add-label "bug,high-priority"

# 评论 issue
gh issue comment <number> --body "Thanks for reporting. Could you share reproduction steps?"
```

## PR 管理

### 审查清单

1. 检查 CI 状态：`gh pr checks <number>`
2. 检查是否可合并：`gh pr view <number> --json mergeable`
3. 检查存在时长与最近活动
4. 标记超过 5 天未审查的 PR
5. 对社区 PR：确保其包含测试并遵循规范

### Stale 策略

- 14 天及以上无活动的 issue：添加 `stale` 标签，评论请求更新
- 7 天及以上无活动的 PR：评论询问是否仍在推进
- 30 天无响应的 stale issue 自动关闭（添加 `closed-stale` 标签）

```bash
# 查找 stale issue（14 天及以上无活动）
gh issue list --label "stale" --state open

# 查找近期无活动的 PR
gh pr list --json number,title,updatedAt --jq '.[] | select(.updatedAt < "2026-03-01")'
```

## CI/CD 运营

当 CI 失败时：

1. 检查 workflow run：`gh run view <run-id> --log-failed`
2. 定位失败的 step
3. 判断是 flaky test 还是真实失败
4. 对真实失败：定位根因并建议修复方案
5. 对 flaky test：记录该模式以便后续排查

```bash
# 列出近期失败的 run
gh run list --status failure --limit 10

# 查看失败 run 的日志
gh run view <run-id> --log-failed

# 重新运行失败的 workflow
gh run rerun <run-id> --failed
```

## 发布管理

准备发布时：

1. 检查 main 分支上所有 CI 全部通过
2. 审查未发布的变更：`gh pr list --state merged --base main`
3. 从 PR 标题生成 changelog
4. 创建 release：`gh release create`

```bash
# 列出上次发布以来合并的 PR
gh pr list --state merged --base main --search "merged:>2026-03-01"

# 创建 release
gh release create v1.2.0 --title "v1.2.0" --generate-notes

# 创建 pre-release
gh release create v1.3.0-rc1 --prerelease --title "v1.3.0 Release Candidate 1"
```

## 安全监控

```bash
# 检查 Dependabot 警报
gh api repos/{owner}/{repo}/dependabot/alerts --jq '.[].security_advisory.summary'

# 检查 secret scanning 警报
gh api repos/{owner}/{repo}/secret-scanning/alerts --jq '.[].state'

# 审查并自动合并安全的依赖升级
gh pr list --label "dependencies" --json number,title
```

- 审查并自动合并安全的依赖升级
- 立即标记任何 critical/high 严重级别的警报
- 至少每周检查一次新的 Dependabot 警报

## Quality Gate

在完成任何 GitHub 运营任务之前：
- 所有已分流的 issue 都带有合适的标签
- 没有超过 7 天未审查或评论的 PR
- CI 失败已得到排查（而非仅仅重新运行）
- release 包含准确的 changelog
- 安全警报已被确认并跟踪
