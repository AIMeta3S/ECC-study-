---
name: git-workflow
description: Git 工作流模式，涵盖分支策略、commit 约定、merge 与 rebase 对比、冲突解决，以及适用于各种规模团队的协作开发最佳实践。
metadata:
  origin: ECC
---

# Git 工作流模式

Git 版本控制、分支策略与协作开发的最佳实践。

## 何时启用

- 为新项目设置 Git 工作流
- 确定分支策略（GitFlow、trunk-based、GitHub flow）
- 编写 commit message 和 PR 描述
- 解决 merge conflict
- 管理发布和版本 tag
- 引导新成员熟悉团队的 Git 实践

## 分支策略

### GitHub Flow（简单，推荐大多数团队使用）

最适合持续部署和中小型团队。

```
main (protected, always deployable)
  │
  ├── feature/user-auth      → PR → merge to main
  ├── feature/payment-flow   → PR → merge to main
  └── fix/login-bug          → PR → merge to main
```

**规则：**
- `main` 始终处于可部署状态
- 从 `main` 创建 feature 分支
- 准备好评审时发起 Pull Request
- 审批通过且 CI 通过后，merge 到 `main`
- merge 后立即部署

### Trunk-Based Development（高速迭代的团队）

最适合具备成熟 CI/CD 和 feature flag 的团队。

```
main (trunk)
  │
  ├── short-lived feature (1-2 days max)
  ├── short-lived feature
  └── short-lived feature
```

**规则：**
- 所有人 commit 到 `main` 或非常短命的分支
- 用 feature flag 隐藏未完成的工作
- merge 前 CI 必须通过
- 每天部署多次

### GitFlow（复杂，发布周期驱动）

最适合计划性发布和企业级项目。

```
main (production releases)
  │
  └── develop (integration branch)
        │
        ├── feature/user-auth
        ├── feature/payment
        │
        ├── release/1.0.0    → merge to main and develop
        │
        └── hotfix/critical  → merge to main and develop
```

**规则：**
- `main` 只包含生产可用的代码
- `develop` 是集成分支
- feature 分支从 `develop` 拉出，merge 回 `develop`
- release 分支从 `develop` 拉出，merge 到 `main` 和 `develop`
- hotfix 分支从 `main` 拉出，merge 到 `main` 和 `develop`

### 如何选择

| 策略 | 团队规模 | 发布节奏 | 最适合 |
|----------|-----------|-----------------|----------|
| GitHub Flow | 任意规模 | 持续部署 | SaaS、Web 应用、初创团队 |
| Trunk-Based | 5 人以上的成熟团队 | 每天多次 | 高速迭代团队、feature flag |
| GitFlow | 10 人以上 | 计划性发布 | 企业级、受监管行业 |

## Commit Message

### Conventional Commits 格式

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### 类型

| 类型 | 用途 | 示例 |
|------|---------|---------|
| `feat` | 新功能 | `feat(auth): add OAuth2 login` |
| `fix` | Bug 修复 | `fix(api): handle null response in user endpoint` |
| `docs` | 文档 | `docs(readme): update installation instructions` |
| `style` | 格式调整，无代码变更 | `style: fix indentation in login component` |
| `refactor` | 代码重构 | `refactor(db): extract connection pool to module` |
| `test` | 新增/更新测试 | `test(auth): add unit tests for token validation` |
| `chore` | 维护任务 | `chore(deps): update dependencies` |
| `perf` | 性能改进 | `perf(query): add index to users table` |
| `ci` | CI/CD 变更 | `ci: add PostgreSQL service to test workflow` |
| `revert` | 回退之前的 commit | `revert: revert "feat(auth): add OAuth2 login"` |

### 好与坏的示例

```
# 坏：含糊其辞，缺乏上下文
git commit -m "fixed stuff"
git commit -m "updates"
git commit -m "WIP"

# 好：清晰、具体，解释了原因
git commit -m "fix(api): retry requests on 503 Service Unavailable

The external API occasionally returns 503 errors during peak hours.
Added exponential backoff retry logic with max 3 attempts.

Closes #123"
```

### Commit Message 模板

在仓库根目录创建 `.gitmessage`：

```
# <type>(<scope>): <subject>
# # 类型：feat、fix、docs、style、refactor、test、chore、perf、ci、revert
# scope：api、ui、db、auth 等
# subject：祈使语气，不加句号，不超过 50 个字符
#
# [optional body] - 解释为什么，而不是做了什么
# [optional footer] - Breaking changes、closes #issue
```

启用方式：`git config commit.template .gitmessage`

## Merge 与 Rebase 对比

### Merge（保留历史）

```bash
# 创建一个 merge commit
git checkout main
git merge feature/user-auth

# 结果：
# *   merge commit
# |\
# | * feature 的 commit
# |/
# * main 的 commit
```

**适用场景：**
- 将 feature 分支 merge 到 `main`
- 你希望保留完整的历史
- 多人协作开发了该分支
- 该分支已 push 且其他人可能基于它开展工作

### Rebase（线性历史）

```bash
# 将 feature 的 commit 重写到目标分支上
git checkout feature/user-auth
git rebase main

# 结果：
# * feature 的 commit（已重写）
# * main 的 commit
```

**适用场景：**
- 用最新的 `main` 更新本地 feature 分支
- 你希望得到线性、干净的历史
- 该分支仅在本地（未 push）
- 你是该分支的唯一开发者

### Rebase 工作流

```bash
# 用最新的 main 更新 feature 分支（发起 PR 之前）
git checkout feature/user-auth
git fetch origin
git rebase origin/main

# 修复任何冲突
# 测试应该仍然通过

# Force push（仅当你是唯一的贡献者时）
git push --force-with-lease origin feature/user-auth
```

### 何时不应 Rebase

```
# 绝不要 rebase 以下分支：
- 已 push 到共享仓库的分支
- 其他人已基于它开展工作的分支
- 受保护的分支（main、develop）
- 已经 merge 过的分支

# 原因：Rebase 会重写历史，破坏他人的工作
```

## Pull Request 工作流

### PR 标题格式

```
<type>(<scope>): <description>

Examples:
feat(auth): add SSO support for enterprise users
fix(api): resolve race condition in order processing
docs(api): add OpenAPI specification for v2 endpoints
```

### PR 描述模板

```markdown
## What

Brief description of what this PR does.

## Why

Explain the motivation and context.

## How

Key implementation details worth highlighting.

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Screenshots (if applicable)

Before/after screenshots for UI changes.

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests pass locally
- [ ] Related issues linked

Closes #123
```

### Code Review 检查清单

**给 Reviewer：**

- [ ] 代码是否解决了所述问题？
- [ ] 是否存在未处理的边界情况？
- [ ] 代码是否可读且可维护？
- [ ] 测试是否充分？
- [ ] 是否存在安全隐患？
- [ ] commit 历史是否干净（必要时做了 squash）？

**给作者：**

- [ ] 在请求评审前已完成 self-review
- [ ] CI 通过（测试、lint、typecheck）
- [ ] PR 体量合理（理想情况下 <500 行）
- [ ] 仅涉及单一功能/修复
- [ ] 描述清晰地解释了本次变更

## 冲突解决

### 识别冲突

```bash
# merge 前检查冲突
git checkout main
git merge feature/user-auth --no-commit --no-ff

# 若存在冲突，Git 会显示：
# CONFLICT (content): Merge conflict in src/auth/login.ts
# Automatic merge failed; fix conflicts and then commit the result.
```

### 解决冲突

```bash
# 查看冲突文件
git status

# 查看文件中的 conflict marker
# <<<<<<< HEAD
# 来自 main 的内容
# =======
# 来自 feature 分支的内容
# >>>>>>> feature/user-auth

# 方式 1：手动解决
# 编辑文件，删除标记，保留正确的内容

# 方式 2：使用 merge 工具
git mergetool

# 方式 3：接受其中一侧
git checkout --ours src/auth/login.ts    # 保留 main 版本
git checkout --theirs src/auth/login.ts  # 保留 feature 版本

# 解决后，stage 并 commit
git add src/auth/login.ts
git commit
```

### 冲突预防策略

```bash
# 1. 保持 feature 分支小而短命
# 2. 频繁 rebase 到 main
git checkout feature/user-auth
git fetch origin
git rebase origin/main

# 3. 与团队沟通涉及共享文件的改动
# 4. 使用 feature flag 替代长生命周期的分支
# 5. 及时 review 和 merge PR
```

## 分支管理

### 命名约定

```
# Feature 分支
feature/user-authentication
feature/JIRA-123-payment-integration

# Bug 修复
fix/login-redirect-loop
fix/456-null-pointer-exception

# Hotfix（生产问题）
hotfix/critical-security-patch
hotfix/database-connection-leak

# Release
release/1.2.0
release/2024-01-hotfix

# 实验/POC
experiment/new-caching-strategy
poc/graphql-migration
```

### 分支清理

```bash
# 删除已 merge 的本地分支
git branch --merged main | grep -v "^\*\|main" | xargs -n 1 git branch -d

# 删除已删除远程分支的 remote-tracking 引用
git fetch -p

# 删除本地分支
git branch -d feature/user-auth  # 安全删除（仅在已 merge 时）
git branch -D feature/user-auth  # 强制删除

# 删除远程分支
git push origin --delete feature/user-auth
```

### Stash 工作流

```bash
# 保存进行中的工作
git stash push -m "WIP: user authentication"

# 列出所有 stash
git stash list

# 应用最近的 stash
git stash pop

# 应用指定的 stash
git stash apply stash@{2}

# 丢弃 stash
git stash drop stash@{0}
```

## 发布管理

### Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features, backward compatible
PATCH: Bug fixes, backward compatible

Examples:
1.0.0 → 1.0.1 (patch: bug fix)
1.0.1 → 1.1.0 (minor: new feature)
1.1.0 → 2.0.0 (major: breaking change)
```

### 创建发布

```bash
# 创建 annotated tag
git tag -a v1.2.0 -m "Release v1.2.0

Features:
- Add user authentication
- Implement password reset

Fixes:
- Resolve login redirect issue

Breaking Changes:
- None"

# push tag 到远程
git push origin v1.2.0

# 列出所有 tag
git tag -l

# 删除 tag
git tag -d v1.2.0
git push origin --delete v1.2.0
```

### 生成 Changelog

```bash
# 从 commit 生成 changelog
git log v1.1.0..v1.2.0 --oneline --no-merges

# 或使用 conventional-changelog
npx conventional-changelog -i CHANGELOG.md -s
```

## Git 配置

### 基础配置

```bash
# 用户身份
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# 默认分支名
git config --global init.defaultBranch main

# pull 行为（用 rebase 代替 merge）
git config --global pull.rebase true

# push 行为（仅 push 当前分支）
git config --global push.default current

# 自动纠正拼写错误
git config --global help.autocorrect 1

# 更好的 diff 算法
git config --global diff.algorithm histogram

# 彩色输出
git config --global color.ui auto
```

### 实用 Alias

```bash
# 添加到 ~/.gitconfig
[alias]
    co = checkout
    br = branch
    ci = commit
    st = status
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = log --oneline --graph --all
    amend = commit --amend --no-edit
    wip = commit -m "WIP"
    undo = reset --soft HEAD~1
    contributors = shortlog -sn
```

### Gitignore 规则

```gitignore
# 依赖
node_modules/
vendor/

# 构建产物
dist/
build/
*.o
*.exe

# 环境变量文件
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# 操作系统文件
.DS_Store
Thumbs.db

# 日志
*.log
logs/

# 测试覆盖率
coverage/

# 缓存
.cache/
*.tsbuildinfo
```

## 常用工作流

### 开发新功能

```bash
# 1. 更新 main 分支
git checkout main
git pull origin main

# 2. 创建 feature 分支
git checkout -b feature/user-auth

# 3. 修改并 commit
git add .
git commit -m "feat(auth): implement OAuth2 login"

# 4. push 到远程
git push -u origin feature/user-auth

# 5. 在 GitHub/GitLab 上创建 Pull Request
```

### 用新的改动更新 PR

```bash
# 1. 做额外的修改
git add .
git commit -m "feat(auth): add error handling"

# 2. push 更新
git push origin feature/user-auth
```

### 同步 Fork 与 Upstream

```bash
# 1. 添加 upstream remote（只需一次）
git remote add upstream https://github.com/original/repo.git

# 2. 拉取 upstream
git fetch upstream

# 3. 将 upstream/main merge 到你的 main
git checkout main
git merge upstream/main

# 4. push 到你的 fork
git push origin main
```

### 撤销错误操作

```bash
# 撤销最后一次 commit（保留改动）
git reset --soft HEAD~1

# 撤销最后一次 commit（丢弃改动）
git reset --hard HEAD~1

# 撤销已 push 到远程的最后一次 commit
git revert HEAD
git push origin main

# 撤销特定文件的改动
git checkout HEAD -- path/to/file

# 修改最后一次的 commit message
git commit --amend -m "New message"

# 将遗漏的文件追加到最后一次 commit
git add forgotten-file
git commit --amend --no-edit
```

## Git Hook

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 运行 lint
npm run lint || exit 1

# 运行测试
npm test || exit 1

# 检查是否包含密钥
if git diff --cached | grep -E '(password|api_key|secret)'; then
    echo "Possible secret detected. Commit aborted."
    exit 1
fi
```

### Pre-Push Hook

```bash
#!/bin/bash
# .git/hooks/pre-push

# 运行完整测试套件
npm run test:all || exit 1

# 检查 console.log 语句
if git diff origin/main | grep -E 'console\.log'; then
    echo "Remove console.log statements before pushing."
    exit 1
fi
```

## 反模式

```
# 坏：直接 commit 到 main
git checkout main
git commit -m "fix bug"

# 好：使用 feature 分支和 PR

# 坏：commit 密钥
git add .env  # 包含 API key

# 好：加入 .gitignore，使用环境变量

# 坏：超大的 PR（1000+ 行）
# 好：拆分成更小、聚焦的 PR

# 坏："update" 这样的 commit message
git commit -m "update"
git commit -m "fix"

# 好：描述性的 message
git commit -m "fix(auth): resolve redirect loop after login"

# 坏：重写公开历史
git push --force origin main

# 好：对公开分支使用 revert
git revert HEAD

# 坏：长生命周期的 feature 分支（数周/数月）
# 好：保持分支短小（数天），频繁 rebase

# 坏：commit 生成产物
git add dist/
git add node_modules/

# 好：加入 .gitignore
```

## 速查表

| 操作 | 命令 |
|------|---------|
| 创建分支 | `git checkout -b feature/name` |
| 切换分支 | `git checkout branch-name` |
| 删除分支 | `git branch -d branch-name` |
| merge 分支 | `git merge branch-name` |
| rebase 分支 | `git rebase main` |
| 查看历史 | `git log --oneline --graph` |
| 查看改动 | `git diff` |
| stage 改动 | `git add .` 或 `git add -p` |
| commit | `git commit -m "message"` |
| push | `git push origin branch-name` |
| pull | `git pull origin branch-name` |
| stash | `git stash push -m "message"` |
| 撤销最后一次 commit | `git reset --soft HEAD~1` |
| revert commit | `git revert HEAD` |
