---
name: skill-create
description: 分析本地 Git 历史记录以提取编码模式并生成 SKILL.md 文件。是 GitHub 应用本地的技能创建器。
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /skill-create - 本地 Skill 生成

分析仓库的 git 历史，提取编码模式并生成 SKILL.md 文件，向 Claude 传授您团队的实践经验。

## 用法

```bash
/skill-create                    # 分析当前仓库
/skill-create --commits 100      # 分析最近 100 个 commit
/skill-create --output ./skills  # 自定义输出目录
/skill-create --instincts        # 同时为 continuous-learning-v2 生成 instincts
```

## 功能说明

1. **解析 Git 历史** - 分析提交记录、文件变更和模式
2. **检测模式** - 识别重复出现的工作流程和约定
3. **生成 SKILL.md** - 创建有效的 Claude Code skill 文件
4. **可选地创建 Instincts** - 供 continuous-learning-v2 系统使用

## 分析步骤

### 第 1 步:收集 Git 数据

```bash
# 获取最近带文件变更的 commit
git log --oneline -n ${COMMITS:-200} --name-only --pretty=format:"%H|%s|%ad" --date=short

# 按文件统计提交频率
git log --oneline -n 200 --name-only | grep -v "^$" | grep -v "^[a-f0-9]" | sort | uniq -c | sort -rn | head -20

# 获取提交信息模式
git log --oneline -n 200 | cut -d' ' -f2- | head -50
```

### 第 2 步:检测模式

查找以下模式类型:

| 模式 | 检测方法 |
|---------|-----------------|
| **提交约定** | 对提交信息使用正则匹配（feat:、fix:、chore:） |
| **文件共变关系** | 总是同时变更的文件 |
| **工作流序列** | 重复出现的文件变更模式 |
| **架构** | 目录结构和命名约定 |
| **测试模式** | 测试文件位置、命名、覆盖率 |

### 第 3 步:生成 SKILL.md

输出格式：

```markdown
---
name: {repo-name}-patterns
description: 从 {repo-name} 提取的编码模式
version: 1.0.0
source: local-git-analysis
analyzed_commits: {count}
---

# {仓库名} 模式

## 提交约定
{检测到的提交信息模式}

## 代码架构
{检测到的目录结构和组织方式}

## 工作流程
{检测到的重复文件变更模式}

## 测试模式
{检测到的测试约定}
```

### 第 4 步：生成 Instincts（若指定 --instincts）

用于 continuous-learning-v2 集成：

```yaml
---
id: {repo}-commit-convention
trigger: "当编写提交信息时"
confidence: 0.8
domain: git
source: local-repo-analysis
---

# 使用约定式提交

## 动作
提交信息前缀：feat:、fix:、chore:、docs:、test:、refactor:

## 证据
- 分析了 {n} 条提交
- {percentage}% 遵循约定式提交格式
```


