---
name: skill-scout
description: 在创建新 skill 之前，搜索现有的本地、marketplace、GitHub 和 web skill 来源。当用户想要为某个工作流创建、构建、fork 或查找 skill 时使用。
metadata:
  origin: community
---

# Skill Scout

在创建新 skill 之前使用此 skill。目标是避免重复现有的社区或 marketplace 工作，同时在采纳前对任何外部资源进行审查。

来源：从 `redminwang` 的过期社区 PR #1232 中抢救而来。

## 何时使用

- 用户说"创建一个 skill"、"构建一个 skill"、"做一个 skill"或"新 skill"。
- 用户问"有没有用于 X 的 skill？"或"是否存在能做 Y 的 skill？"
- 用户描述了一个工作流，而你正准备建议创建新 skill。
- 用户想要 fork 或扩展现有 skill。

如果用户明确表示跳过搜索或从零开始创建，确认这一点，然后继续执行所请求的创建工作流。

## 工作原理

### 步骤 1 - 捕获意图

提取：

- skill 应执行的任务。
- 使用它的触发条件。
- 涉及的领域、工具、框架或数据源。
- 三到五个搜索关键词加上有用的同义词。

### 步骤 2 - 搜索本地来源

首先搜索已安装的和 marketplace skill 名称。本地来源优先，因为它们已经是用户环境的一部分。

```bash
find ~/.claude/skills -maxdepth 2 -name SKILL.md 2>/dev/null | grep -iE "keyword|synonym"
find ~/.claude/plugins/marketplaces -path '*/skills/*/SKILL.md' 2>/dev/null | grep -iE "keyword|synonym"
```

然后搜索 frontmatter 描述：

```bash
grep -RilE "keyword|synonym" ~/.claude/skills ~/.claude/plugins/marketplaces 2>/dev/null
```

### 步骤 3 - 搜索远程来源

使用可用的 GitHub 和 web 搜索工具。优先使用简洁的查询：

```bash
gh search repos "claude code skill keyword" --limit 10 --sort stars
gh search code "name: keyword" --filename SKILL.md --limit 10
```

对于 web 搜索，最多使用三个有针对性的查询，例如：

```text
"claude code skill" keyword
"SKILL.md" keyword
"everything-claude-code" keyword
```

### 步骤 4 - 审查外部匹配项

在推荐任何外部 skill 以供采纳或 fork 之前：

- 阅读 `SKILL.md` 的 frontmatter 和说明。
- 查找意外的 shell 命令、文件写入、网络调用、凭证处理或包安装。
- 检查仓库是否看起来仍在维护。
- 优先复制到一个新的本地 branch 并审查 diff，而不是直接编辑 marketplace 原件。

### 步骤 5 - 对结果排序

按以下标准对候选项排序：

1. skill 名称中精确匹配关键词。
2. 描述中匹配关键词或同义词。
3. 本地已安装或 marketplace 来源。
4. 有近期活动且仍在维护的 GitHub 来源。
5. 仅 web 提及。

最终列表最多 10 个结果。

### 步骤 6 - 呈现决策选项

给用户一个简短的表格：

| 选项 | 含义 |
| --- | --- |
| 使用现有 | 原样调用或安装匹配的 skill。 |
| Fork 或扩展 | 复制最接近的 skill 并修改它。 |
| 从零创建 | 确认不存在接近的匹配后构建新 skill。 |

仅在用户选择该路径或搜索未找到接近的匹配后，才创建新 skill。

## 示例

### 结果表

```markdown
| # | Skill | Source | Why it matches | Gap |
| --- | --- | --- | --- | --- |
| 1 | article-writing | Local ECC | Drafts articles and guides | Not focused on release notes |
| 2 | content-engine | Local ECC | Multi-format content workflow | Heavier than needed |
| 3 | blog-writer | GitHub | Blog writing skill with recent commits | Needs security review |
```

### 面向用户的摘要

```markdown
I found two close local matches and one external candidate. The closest fit is
`article-writing`; it covers drafting and revision, but it does not include the
release-note checklist you asked for. I can either use it as-is, fork it into a
release-note variant, or create a fresh skill.
```

## 反模式

- 当搜索合理时，不要直接跳到创建新 skill。
- 不要在未先阅读的情况下安装外部 skill。
- 不要呈现一长串未排序的弱匹配列表。
- 不要将仅 web 的提及视为可信来源。
- 不要就地编辑已安装的 marketplace 原件。

## 相关资源

- `search-first` - 通用的先搜索后构建工作流。
- `skill-stocktake` - 审计已安装 skill 的健康状况、重复项和缺口。
- `agent-sort` - 对现有 agent 和 skill 进行分类与整理。
