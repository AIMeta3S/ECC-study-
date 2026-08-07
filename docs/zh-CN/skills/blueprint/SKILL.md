---
name: blueprint
description: >-
  将一行目标转化为多 session、多 agent 工程项目的分步建设计划。每个步骤都包含独立的 context brief，使新的 agent 能够零上下文执行。包含对抗性 review gate、依赖图、并行步骤检测、anti-pattern 目录和计划变更协议。触发条件：用户为复杂的多 PR 任务请求计划、blueprint 或 roadmap，或描述需要多个 session 的工作。不触发条件：任务可在单个 PR 内完成、tool 调用少于 3 次，或用户说"直接做"。
metadata:
  origin: community
---

# Blueprint — 建设计划生成器

将一行目标转化为分步建设计划，使任何 coding agent 都能零上下文执行。

## 适用场景

- 将大型 feature 拆分为多个具有明确依赖顺序的 PR
- 规划跨多个 session 的 refactor 或 migration
- 跨 sub-agents 协调并行 workstreams
- 任何因 session 间上下文丢失会导致返工的任务

对于可在单个 PR 内完成、tool 调用少于 3 次的任务，或用户说"直接做"时，**不要使用**。

## 工作原理

Blueprint 运行一个 5 阶段的 pipeline：

1. **Research** — 预检查（git、gh auth、remote、default branch），然后读取项目结构、已有计划和 memory 文件以收集上下文。
2. **Design** — 将目标拆分为单 PR 大小的步骤（通常 3–12 个）。为每个步骤分配依赖边、并行/串行排序、model tier（最强模型 vs 默认模型）和 rollback 策略。
3. **Draft** — 向 `plans/` 写入独立的 Markdown 计划文件。每个步骤都包含 context brief、任务列表、验证命令和 exit criteria——使新的 agent 无需阅读前置步骤即可执行任意步骤。
4. **Review** — 将对抗性 review 委托给最强模型的 sub-agent（如 Opus），依据 checklist 和 anti-pattern 目录执行。在最终确定前修复所有 critical 发现。
5. **Register** — 保存计划，更新 memory 索引，并向用户展示步骤数和并行度摘要。

Blueprint 自动检测 git/gh 的可用性。在 git + GitHub CLI 可用时，生成完整的 branch/PR/CI workflow 计划。缺少时切换为 direct mode（就地编辑，不创建分支）。

## 示例

### 基本用法

```
/blueprint myapp "migrate database to PostgreSQL"
```

生成 `plans/myapp-migrate-database-to-postgresql.md`，包含如下步骤：
- 步骤 1：添加 PostgreSQL 驱动和连接配置
- 步骤 2：为每张表创建 migration 脚本
- 步骤 3：更新 repository 层以使用新驱动
- 步骤 4：添加针对 PostgreSQL 的 integration tests
- 步骤 5：移除旧的数据库代码和配置

### 多 agent 项目

```
/blueprint chatbot "extract LLM providers into a plugin system"
```

生成的计划中会在可能处安排并行步骤（例如"实现 Anthropic plugin"和"实现 OpenAI plugin"在 plugin interface 步骤完成后并行运行）、model tier 分配（interface design 步骤使用最强模型，实现步骤使用默认模型），以及每一步后验证的 invariants（例如"所有已有测试通过"、"core 中无 provider 导入"）。

## 关键特性

- **冷启动执行** — 每个步骤都包含独立的 context brief，无需前置上下文。
- **对抗性 review gate** — 每个计划都由最强模型的 sub-agent 依据 checklist 进行 review，覆盖完整性、依赖正确性和 anti-pattern 检测。
- **Branch/PR/CI workflow** — 内建于每个步骤。当 git/gh 缺失时优雅降级为 direct mode。
- **并行步骤检测** — 依赖图识别没有共享文件或输出依赖的步骤。
- **计划变更协议** — 步骤可被拆分、插入、跳过、重排或放弃，并具备正式协议和 audit trail。
- **零运行时风险** — 纯 Markdown skill。整个仓库只包含 `.md` 文件——无 hooks、无 shell scripts、无可执行代码、无 `package.json`、无 build step。在安装或调用时除了 Claude Code 原生的 Markdown skill 加载器外什么都不运行。

## 安装

此 skill 随 Everything Claude Code 一起发布。安装 ECC 时无需单独安装。

### 完整 ECC 安装

如果你从 ECC 仓库 checkout 工作，使用以下命令验证 skill 是否存在：

```bash
test -f skills/blueprint/SKILL.md
```

日后更新时，在更新前先 review ECC 的 diff：

```bash
cd /path/to/everything-claude-code
git fetch origin main
git log --oneline HEAD..origin/main       # 更新前 review 新的 commit
git checkout <reviewed-full-sha>          # 固定到某个已 review 的 commit
```

### Vendored 独立安装

如果你在完整 ECC 安装之外仅 vendoring 此 skill，请将已 review 的文件从 ECC 仓库复制到 `~/.claude/skills/blueprint/SKILL.md`。Vendored 副本没有 git remote，因此通过从已 review 的 ECC commit 重新复制文件来更新它们，而不是运行 `git pull`。

## 环境要求

- Claude Code（用于 `/blueprint` slash command）
- Git + GitHub CLI（可选——启用完整的 branch/PR/CI workflow；Blueprint 会检测缺失并自动切换为 direct mode）

## 来源

灵感来自 antbotlab/blueprint——上游项目和参考设计。
