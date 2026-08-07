---
name: autonomous-agent-harness
description: 将 Claude Code 转变为一个完全自主的 agent 系统，具备持久化 memory、定时操作、computer use 和任务队列。利用 Claude Code 原生的 crons、dispatch、MCP tool 和 memory，替代独立的 agent 框架（Hermes、AutoGPT）。当用户需要持续的自主运行、定时任务或自我驱动的 agent loop 时使用。
metadata:
  origin: ECC
---

# Autonomous Agent Harness

仅使用原生功能和 MCP server，将 Claude Code 转变为一个持久化、自我驱动的 agent 系统。

## 授权与安全边界

自主运行必须由用户显式请求并限定范围。除非用户已为当前设置批准了相应能力及目标 workspace，否则不得创建定时任务、dispatch 远程 agent、写入持久化 memory、使用 computer control、对外发布内容、修改第三方资源，或处理私人通信。

在启用周期性或事件驱动的操作之前，优先采用 dry-run 方案和本地 queue 文件。不要将凭证、私有 workspace 导出内容、个人数据集和账号特定的自动化放入可复用的 ECC artifact 中。

## 何时启用

- 用户希望 agent 持续运行或按计划运行
- 设置周期性触发的自动化工作流
- 构建一个能跨 session 记忆上下文的个人 AI 助手
- 用户说“每天运行这个”、“定期检查这个”、“持续监控”
- 希望复刻 Hermes、AutoGPT 或类似自主 agent 框架的功能
- 需要 computer use 与定时执行相结合

## 架构

```
┌──────────────────────────────────────────────────────────────┐
│                    Claude Code Runtime                        │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Crons   │  │ Dispatch │  │ Memory   │  │ Computer    │ │
│  │ Schedule │  │ Remote   │  │ Store    │  │ Use         │ │
│  │ Tasks    │  │ Agents   │  │          │  │             │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │              │             │                │        │
│       ▼              ▼             ▼                ▼        │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              ECC Skill + Agent Layer                  │    │
│  │                                                      │    │
│  │  skills/     agents/     commands/     hooks/        │    │
│  └──────────────────────────────────────────────────────┘    │
│       │              │             │                │        │
│       ▼              ▼             ▼                ▼        │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              MCP Server Layer                        │    │
│  │                                                      │    │
│  │  memory    github    exa    supabase    browser-use  │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. 持久化 Memory

使用 Claude Code 内建的 memory 系统，并通过 MCP memory server 增强以处理结构化数据。

**内建 memory**（`~/.claude/projects/*/memory/`）：
- 用户偏好、反馈、项目上下文
- 以带 frontmatter 的 markdown 文件形式存储
- 在 session 开始时自动加载

**MCP memory server**（结构化知识图谱）：
- 实体、关系、观察
- 可查询的图结构
- 跨 session 持久化

**Memory 模式：**

```
# 短期：当前 session 上下文
Use TodoWrite for in-session task tracking

# 中期：项目 memory 文件
Write to ~/.claude/projects/*/memory/ for cross-session recall

# 长期：MCP 知识图谱
Use mcp__memory__create_entities for permanent structured data
Use mcp__memory__create_relations for relationship mapping
Use mcp__memory__add_observations for new facts about known entities
```

### 2. 定时操作（Crons）

使用 Claude Code 的 scheduled tasks 来创建周期性的 agent 操作。

**设置一个 cron：**

```
# 通过 MCP tool
mcp__scheduled-tasks__create_scheduled_task({
  name: "daily-pr-review",
  schedule: "0 9 * * 1-5",  # 工作日早上 9 点
  prompt: "Review all open PRs in affaan-m/everything-claude-code. For each: check CI status, review changes, flag issues. Post summary to memory.",
  project_dir: "/path/to/repo"
})

# 通过 claude -p（编程模式）
echo "Review open PRs and summarize" | claude -p --project /path/to/repo
```

**实用的 cron 模式：**

| 模式 | Schedule | 使用场景 |
|---------|----------|----------|
| 每日站会 | `0 9 * * 1-5` | 审查 PR、issue、部署状态 |
| 每周回顾 | `0 10 * * 1` | 代码质量指标、测试覆盖率 |
| 每小时监控 | `0 * * * *` | 生产环境健康、错误率检查 |
| 每夜构建 | `0 2 * * *` | 运行完整测试套件、安全扫描 |
| 会前准备 | `*/30 * * * *` | 为即将到来的会议准备上下文 |

### 3. Dispatch / 远程 Agent

远程触发 Claude Code agent，用于事件驱动的工作流。

**Dispatch 模式：**

```bash
# 从 CI/CD 触发
curl -X POST "https://api.anthropic.com/dispatch" \
  -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
  -d '{"prompt": "Build failed on main. Diagnose and fix.", "project": "/repo"}'

# 从 webhook 触发
# GitHub webhook → dispatch → Claude agent → fix → PR

# 从另一个 agent 触发
claude -p "Analyze the output of the security scan and create issues for findings"
```

### 4. Computer Use

借助 Claude 的 computer-use MCP 进行与物理世界的交互。

**能力：**
- 浏览器自动化（导航、点击、填写表单、截图）
- 桌面控制（打开应用、输入、鼠标控制）
- 超出 CLI 范围的文件系统操作

**在 harness 中的使用场景：**
- Web UI 的自动化测试
- 表单填写与数据录入
- 基于截图的监控
- 多应用工作流

### 5. Task Queue

管理一个能跨越 session 边界的持久化任务队列。

**实现：**

```
# 通过 memory 持久化任务
Write task queue to ~/.claude/projects/*/memory/task-queue.md

# 任务格式
---
name: task-queue
type: project
description: Persistent task queue for autonomous operation
---

## Active Tasks
- [ ] PR #123: Review and approve if CI green
- [ ] Monitor deploy: check /health every 30 min for 2 hours
- [ ] Research: Find 5 leads in AI tooling space

## Completed
- [x] Daily standup: reviewed 3 PRs, 2 issues
```

## 替代 Hermes

| Hermes 组件 | ECC 对应物 | 方式 |
|------------------|---------------|-----|
| Gateway/Router | Claude Code dispatch + crons | 定时任务触发 agent session |
| Memory System | Claude memory + MCP memory server | 内建持久化 + 知识图谱 |
| Tool Registry | MCP server | 动态加载的 tool 提供方 |
| Orchestration | ECC skill 与 agent | Skill 定义指导 agent 行为 |
| Computer Use | computer-use MCP | 原生浏览器与桌面控制 |
| Context Manager | Session management + memory | ECC 2.0 session 生命周期 |
| Task Queue | Memory 持久化的任务列表 | TodoWrite + memory 文件 |

## 设置指南

### 步骤 1：配置 MCP Server

确保以下内容位于 `~/.claude.json` 中：

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic/memory-mcp-server"]
    },
    "scheduled-tasks": {
      "command": "npx",
      "args": ["-y", "@anthropic/scheduled-tasks-mcp-server"]
    },
    "computer-use": {
      "command": "npx",
      "args": ["-y", "@anthropic/computer-use-mcp-server"]
    }
  }
}
```

### 步骤 2：创建基础 Cron

```bash
# 每日晨间简报
claude -p "Create a scheduled task: every weekday at 9am, review my GitHub notifications, open PRs, and calendar. Write a morning briefing to memory."

# 持续学习
claude -p "Create a scheduled task: every Sunday at 8pm, extract patterns from this week's sessions and update the learned skills."
```

### 步骤 3：初始化 Memory 图谱

```bash
# 引导你的身份与上下文
claude -p "Create memory entities for: me (user profile), my projects, my key contacts. Add observations about current priorities."
```

### 步骤 4：启用 Computer Use（可选）

为 computer-use MCP 授予进行浏览器和桌面控制所需的权限。

## 示例工作流

### 自主 PR Reviewer
```
Cron: every 30 min during work hours
1. Check for new PRs on watched repos
2. For each new PR:
   - Pull branch locally
   - Run tests
   - Review changes with code-reviewer agent
   - Post review comments via GitHub MCP
3. Update memory with review status
```

### 个人研究 Agent
```
Cron: daily at 6 AM
1. Check saved search queries in memory
2. Run Exa searches for each query
3. Summarize new findings
4. Compare against yesterday's results
5. Write digest to memory
6. Flag high-priority items for morning review
```

### 会议准备 Agent
```
Trigger: 30 min before each calendar event
1. Read calendar event details
2. Search memory for context on attendees
3. Pull recent email/Slack threads with attendees
4. Prepare talking points and agenda suggestions
5. Write prep doc to memory
```

## 约束

- Cron 任务在隔离的 session 中运行——除非通过 memory，否则它们不与交互式 session 共享上下文。
- Computer use 需要显式授权。不要假设已有访问权限。
- 远程 dispatch 可能有 rate limit。设计 cron 时要设置合适的间隔。
- Memory 文件应保持简洁。应归档旧数据，而不是让文件无限增长。
- 始终验证定时任务是否成功完成。在 cron prompt 中加入错误处理。
