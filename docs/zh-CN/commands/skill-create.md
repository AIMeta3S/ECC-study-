---
name: skill-create
description: 分析本地 git 历史以提取编码模式并生成 SKILL.md 文件。Skill Creator GitHub App 的本地版本。
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /skill-create - 本地 Skill 生成

分析你仓库的 git 历史,提取编码模式,并生成 SKILL.md 文件,向 Claude 传授你团队的实践。

## 用法

```bash
/skill-create                    # 分析当前仓库
/skill-create --commits 100      # 分析最近 100 个 commit
/skill-create --output ./skills  # 自定义输出目录
/skill-create --instincts        # 同时为 continuous-learning-v2 生成 instincts
```

## 功能说明

1. **解析 Git 历史** - 分析 commit、文件变更和模式
2. **检测模式** - 识别重复出现的工作流和约定
3. **生成 SKILL.md** - 创建有效的 Claude Code skill 文件
4. **可选创建 Instincts** - 用于 continuous-learning-v2 系统

## 分析步骤

### 第 1 步:收集 Git 数据

```bash
# 获取最近带文件变更的 commit
git log --oneline -n ${COMMITS:-200} --name-only --pretty=format:"%H|%s|%ad" --date=short

# 按文件统计 commit 频率
git log --oneline -n 200 --name-only | grep -v "^$" | grep -v "^[a-f0-9]" | sort | uniq -c | sort -rn | head -20

# 获取 commit message 模式
git log --oneline -n 200 | cut -d' ' -f2- | head -50
```

### 第 2 步:检测模式

查找以下模式类型:

| 模式 | 检测方法 |
|---------|-----------------|
| **Commit 约定** | 对 commit message 做正则匹配(feat:, fix:, chore:) |
| **文件协同变更** | 总是一起变更的文件 |
| **工作流序列** | 重复出现的文件变更模式 |
| **架构** | 文件夹结构和命名约定 |
| **测试模式** | 测试文件位置、命名、覆盖率 |

### 第 3 步:生成 SKILL.md

输出格式:

```markdown
---
name: {repo-name}-patterns
description: Coding patterns extracted from {repo-name}
version: 1.0.0
source: local-git-analysis
analyzed_commits: {count}
---

# {Repo Name} Patterns

## Commit Conventions
{detected commit message patterns}

## Code Architecture
{detected folder structure and organization}

## Workflows
{detected repeating file change patterns}

## Testing Patterns
{detected test conventions}
```

### 第 4 步:生成 Instincts(如果使用 --instincts)

用于 continuous-learning-v2 集成:

```yaml
---
id: {repo}-commit-convention
trigger: "when writing a commit message"
confidence: 0.8
domain: git
source: local-repo-analysis
---

# Use Conventional Commits

## Action
Prefix commits with: feat:, fix:, chore:, docs:, test:, refactor:

## Evidence
- Analyzed {n} commits
- {percentage}% follow conventional commit format
```

## GitHub App 集成

如需高级功能(10k+ commit、团队共享、自动 PR),请使用 [Skill Creator GitHub App](https://github.com/apps/skill-creator):

- 安装:[github.com/apps/skill-creator](https://github.com/apps/skill-creator)
- 在任意 issue 下评论 `/skill-creator analyze`
- 接收包含所生成 skills 的 PR

## 相关命令

- `/instinct-import` - 导入已生成的 instincts
- `/instinct-status` - 查看已学习的 instincts
- `/evolve` - 将 instincts 聚类为 skills/agents

---

*属于 [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) 的一部分*
