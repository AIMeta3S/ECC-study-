---
name: knowledge-ops
description: 跨多个存储层（local files、MCP memory、vector store、Git repo）的知识库管理、摄取、同步与检索。当用户想在其知识系统中保存、组织、同步、去重或搜索时使用。
metadata:
  origin: ECC
---

# 知识运营

管理一个多层知识系统，用于在多个存储之间摄取、组织、同步和检索知识。

优先采用 live workspace 模型：
- 代码工作留在真实的 cloned repo 中
- 活跃的执行上下文留在 GitHub、Linear 和 repo 本地的 working-context 文件中
- 更广泛的面向人类的笔记可放在非 repo 的 context/archive 文件夹中
- 持久的跨机器记忆属于知识库，而不是 shadow repo workspace

## 何时激活

- 用户想把信息保存到其知识库
- 将文档、对话或数据摄取到结构化存储中
- 跨系统同步知识（local files、MCP memory、Supabase、Git repo）
- 对已有知识进行去重或整理
- 用户说 "save this to KB"、"sync knowledge"、"what do I know about X"、"ingest this"、"update the knowledge base"
- 任何超出简单记忆回溯的知识管理任务

## 知识架构

### Layer 1：活跃执行真相
- **来源：** GitHub issue、PR、discussion、release note、Linear issue/project/doc
- **用途：** 工作的当前运营状态
- **规则：** 如果某事会影响活跃的工程计划、roadmap、rollout 或 release，优先放在此处

### Layer 2：Claude Code Memory（快速访问）
- **路径：** `~/.claude/projects/*/memory/`
- **格式：** 带 frontmatter 的 Markdown 文件
- **类型：** 用户偏好、反馈、项目上下文、参考
- **用途：** 跨对话持久化的快速访问上下文
- **在 session 启动时自动加载**

### Layer 3：MCP Memory Server（结构化知识图谱）
- **访问方式：** MCP memory 工具（create_entities、create_relations、add_observations、search_nodes）
- **用途：** 跨所有已存储记忆的语义搜索、关系映射
- **跨 session 持久化，支持可查询的图结构**

### Layer 4：知识库 repo / 持久文档存储
- **用途：** 精选的持久笔记、session 导出、综合研究、操作者记忆、长篇文档
- **规则：** 当内容不是 repo 拥有的代码时，这是跨机器上下文的首选持久存储

### Layer 5：外部数据存储（Supabase、PostgreSQL 等）
- **用途：** 结构化数据、大型文档存储、全文搜索
- **适用于：** 对 memory 文件而言过大的文档、需要 SQL 查询的数据

### Layer 6：本地 context/archive 文件夹
- **用途：** 面向人类的笔记、归档的行动计划、本地媒体整理、临时的非代码文档
- **规则：** 可写入以存储信息，但不是 shadow 代码 workspace
- **不要用于：** 活跃的代码变更或应存在于 upstream 的 repo 真相

## 摄取工作流

当需要捕获新知识时：

### 1. 分类
它是哪种类型的知识？
- 业务决策 -> memory 文件（project 类型）+ MCP memory
- 活跃的 roadmap / release / 实现状态 -> 优先 GitHub + Linear
- 个人偏好 -> memory 文件（user/feedback 类型）
- 参考信息 -> memory 文件（reference 类型）+ MCP memory
- 大型文档 -> 外部数据存储 + memory 中的摘要
- 对话/session -> 知识库 repo + memory 中的简短摘要

### 2. 去重
检查该知识是否已存在：
- 搜索 memory 文件中的既有条目
- 用相关术语查询 MCP memory
- 在创建另一个本地笔记之前，先检查信息是否已存在于 GitHub 或 Linear
- 不要创建重复条目。改为更新既有条目。

### 3. 存储
写入合适的层：
- 始终更新 Claude Code memory 以便快速访问
- 使用 MCP memory 获得语义可搜索性和关系映射
- 当信息改变了活跃项目的真相时，优先更新 GitHub / Linear
- 向知识库 repo 提交以实现持久的长篇新增

### 4. 索引
更新任何相关的索引或摘要文件。

## 同步操作

### 对话同步
定期将对话历史同步到知识库：
- 来源：Claude session 文件、Codex session、其他 agent session
- 目标：知识库 repo
- 生成 session 索引以便快速浏览
- 提交并 push

### Workspace 状态同步
将重要的 workspace 配置和脚本镜像到知识库：
- 生成目录映射
- 在提交前对敏感配置进行脱敏
- 随时间跟踪变更
- 不要把知识库或 archive 文件夹当作 live 代码 workspace

### GitHub / Linear 同步
当信息影响活跃执行时：
- 更新相关的 GitHub issue、PR、discussion、release note 或 roadmap 线程
- 当工作需要持久规划上下文时，将支持性文档附加到 Linear
- 仅当本地笔记此后仍有附加价值时，才进行镜像

### 跨源知识同步
将多个来源的知识拉取到一处：
- Claude/ChatGPT/Grok 对话导出
- 浏览器书签
- GitHub 活动事件
- 编写状态摘要，提交并 push

## Memory 模式

```
# 短期：当前 session 上下文
Use TodoWrite for in-session task tracking

# 中期：项目 memory 文件
Write to ~/.claude/projects/*/memory/ for cross-session recall

# 长期：GitHub / Linear / KB
Put active execution truth in GitHub + Linear
Put durable synthesized context in the knowledge base repo

# 语义层：MCP 知识图谱
Use mcp__memory__create_entities for permanent structured data
Use mcp__memory__create_relations for relationship mapping
Use mcp__memory__add_observations for new facts about known entities
Use mcp__memory__search_nodes to find existing knowledge
```

## 最佳实践

- 保持 memory 文件简洁。归档旧数据，而不是任由文件无限增长。
- 对所有知识文件使用 frontmatter（YAML）作为元数据。
- 存储前去重。先搜索，再创建或更新。
- 每个事实集优先只保留一个规范存放处。避免在本地笔记、repo 文件和 tracker 文档之间出现同一计划的平行副本。
- 在提交到 Git 之前，对敏感信息（API key、密码）进行脱敏。
- 对知识文件使用一致的命名约定（lowercase-kebab-case）。
- 用主题/类别为条目打标签，以便于检索。

## 质量门禁

在完成任何知识操作之前：
- 未创建重复条目
- 已对任何 Git 跟踪文件中的敏感数据进行脱敏
- 已更新索引和摘要
- 已为数据类型选择合适的存储层
- 已在相关处添加交叉引用
