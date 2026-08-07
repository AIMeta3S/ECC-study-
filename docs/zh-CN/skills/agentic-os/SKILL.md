---
name: agentic-os
description: 在 Claude Code 上构建持久化的多 agent 操作系统。涵盖 kernel 架构、专家 agent、slash command、基于文件的 memory、定时自动化以及无外部数据库的状态管理。
metadata:
  origin: ECC
---

# Agentic OS

将 Claude Code 视为持久化的 runtime / 操作系统，而非聊天 session。本 skill 将生产级 agentic 设置所采用的架构固化为规范：一个将任务路由到专家 agent 的 kernel 配置、持久化的基于文件的 memory、定时自动化，以及 JSON/markdown 数据层。

## 何时激活

- 在 Claude Code 内部构建多 agent workflow
- 设置能够在 session 重启后存续的持久化 Claude Code 自动化
- 为重复性任务创建“personal OS”或“agentic OS”
- 用户说“agentic OS”、“personal OS”、“multi-agent”、“agent coordinator”、“persistent agent”
- 组织需要 context 跨 session 存续的长期项目

## 架构概览

Agentic OS 有四层。每一层都是项目根目录中的一个目录。

```
project-root/
├── CLAUDE.md          # Kernel：身份、路由规则、agent 注册表
├── agents/            # 专家 agent 定义（markdown prompt）
├── .claude/commands/  # Slash command：面向用户的 CLI
├── scripts/           # Daemon 脚本：定时或事件驱动任务
└── data/              # 状态：JSON/markdown 文件系统，无外部 DB
```

### 层级职责

| 层级 | 用途 | 持久化方式 |
|---|---|---|
| Kernel（`CLAUDE.md`） | 身份、路由、model 策略、agent 注册表 | Git 跟踪 |
| Agents（`agents/`） | 具有受限 tool 和 memory 的专家身份 | Git 跟踪 |
| Commands（`.claude/commands/`） | 面向用户的 slash command（`/daily-sync`、`/outreach`） | Git 跟踪 |
| Scripts（`scripts/`） | 由 cron 或 webhook 触发的 Python/JS daemon | Git 跟踪 |
| State（`data/`） | 只追加的 log、项目状态、决策记录 | Git 忽略或跟踪 |

## Kernel

`CLAUDE.md` 就是 kernel。它充当 COO / orchestrator 的角色。Claude 在 session 开始时读取它，并据此路由工作。

### Kernel 结构

```markdown
# CLAUDE.md - Agentic OS Kernel

## Identity
You are the COO of [project-name]. You route tasks to specialist agents.
You never write code directly. You delegate to the right agent and synthesize results.

## Agent Registry

| Agent | Role | Trigger |
|---|---|---|
| @dev | Code, architecture, debugging | User says "build", "fix", "refactor" |
| @writer | Documentation, content, emails | User says "write", "draft", "blog" |
| @researcher | Research, analysis, fact-checking | User says "research", "analyze", "compare" |
| @ops | DevOps, deployment, infrastructure | User says "deploy", "CI", "server" |

## Routing Rules
1. Parse the user request for intent keywords
2. Match to the Agent Registry trigger column
3. Load the corresponding agent file from `agents/<name>.md`
4. Hand off execution with full context
5. Synthesize and present the result back to the user

## Model Policies
- Default model: use the repository or harness default.
- @dev tasks: prefer a higher-reasoning model for complex architecture.
- @researcher tasks: use the configured research-capable model and approved search tools.
- Cost ceiling: warn before exceeding the project's configured spend threshold.
```

### 核心原则

kernel 应当**小而声明式**。路由逻辑存在于纯 markdown 表格中，而非代码中。这使得系统可检视、可编辑，无需 debug。

## 专家 agent

每个 agent 都是 `agents/` 中的一个独立 markdown 文件。Claude 在路由任务时会加载相应的 agent 文件。

### Agent 定义格式

```markdown
# @dev - Software Engineer

## Identity
You are a senior software engineer. You write clean, tested, production-grade code.
You prefer simple solutions. You ask clarifying questions when requirements are ambiguous.

## Memory Scope
- Read `data/projects/<current-project>.md` for context
- Read `data/decisions/` for architectural decisions
- Append execution logs to `data/logs/<date>-@dev.md`

## Tool Access
- Full filesystem access within project root
- Git operations (status, diff, commit, branch)
- Test runner access
- MCP servers as configured in `.claude/mcp.json`

## Constraints
- Always write tests for new features
- Never commit directly to `main`; use feature branches
- Prefer editing existing files over creating new ones
- Keep functions under 50 lines when possible
```

### 多 agent 协作模式

当一个任务跨越多个 agent 时，kernel 会按顺序或并行运行它们：

```
User: "Build a landing page and write the launch blog post"

Kernel routing:
1. @dev - "Build a landing page with [requirements]"
2. @writer - "Write a launch blog post for [product] using the landing page copy"
3. Kernel synthesizes both outputs into a unified response
```

如需并行执行，请使用 Claude Code 的 background task 能力，或通过 shell 脚本以特定 agent context 调用 Claude Code。

## Command 与日常工作流

Slash command 是 `.claude/commands/` 中的 markdown 文件。它们定义可复用的 workflow。

### Command 结构

```markdown
# /daily-sync

Run the morning briefing:

1. Read `data/logs/last-sync.md` for context
2. Check project status: `git status`, pending PRs, CI health
3. Review `data/inbox/` for new tasks or decisions needed
4. Generate a summary of blockers, priorities, and next actions
5. Append the briefing to `data/logs/daily/<date>.md`
```

### 标准 command 集

| Command | 用途 |
|---|---|
| `/daily-sync` | 晨间简报：状态、阻塞项、优先事项 |
| `/outreach` | 运行外联 workflow（邮件、LinkedIn 等） |
| `/research <topic>` | 带引用追踪的深度研究 |
| `/apply-jobs` | 为目标岗位定制简历 + 求职信 |
| `/analytics` | 从 Stripe、GitHub 或自定义来源拉取指标 |
| `/interview-prep` | 生成记忆卡或模拟面试问题 |
| `/decision <topic>` | 记录一个决策，包含利弊和所选方案 |

### 激活 command

将 command 文件放在 `.claude/commands/<command-name>.md`。Claude Code 会自动发现它们。用户通过 `/<command-name>` 调用。

## 持久化 memory

Memory 是基于文件的。没有 vector DB，没有 Redis，没有 PostgreSQL。`data/` 中的 JSON 和 markdown 文件就是数据库。

### Memory 目录结构

```
data/
├── daily-logs/         # 只追加的每日活动 log
├── projects/           # 按项目的 context 文件
├── decisions/          # 架构与业务决策（ADR 格式）
├── inbox/              # 等待分类的新任务或想法
├── contacts/           # 联系人、公司、关系备注
└── templates/          # 可复用的 prompt 和格式
```

### 每日 log 格式

```markdown
# 2026-04-22 - Daily Log

## Sessions
- 09:00 - Session 1: Refactored auth module (@dev)
- 11:30 - Session 2: Drafted investor update (@writer)

## Decisions
- Switched from JWT to session cookies (see `data/decisions/2026-04-22-auth.md`)

## Blockers
- Waiting on API key from vendor (follow up 2026-04-24)

## Next Actions
- [ ] Merge auth refactor PR
- [ ] Send investor update for review
```

### 自动复盘模式

在每个 session 结束时，kernel 会追加一段复盘：

```markdown
## Reflection - Session 3
- What worked: Parallel agent execution saved 20 minutes
- What didn't: @researcher hit a paywalled source, need better source ranking
- What to change: Add `source-tier` field to research notes (A/B/C credibility)
```

这形成了一个 feedback loop，让系统无需修改代码即可随时间持续改进。

## 定时自动化

Agentic OS 的任务通过外部 cron 按计划运行，而非 Claude Code 内置的 cron（后者会在 session 结束时终止）。

### macOS：LaunchAgent

```xml
<!-- ~/Library/LaunchAgents/com.agentic.daily-sync.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ...>
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agentic.daily-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/claude</string>
        <string>--cwd</string>
        <string>/path/to/project</string>
        <string>--command</string>
        <string>/daily-sync</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>8</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/agentic-daily-sync.log</string>
</dict>
</plist>
```

### Linux：systemd Timer

```ini
# ~/.config/systemd/user/agentic-daily-sync.service
[Unit]
Description=Agentic OS Daily Sync

[Service]
Type=oneshot
ExecStart=/usr/local/bin/claude --cwd /path/to/project --command /daily-sync
```

```ini
# ~/.config/systemd/user/agentic-daily-sync.timer
[Unit]
Description=Run daily sync every morning

[Timer]
OnCalendar=*-*-* 8:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

### 跨平台：pm2

```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'agentic-daily-sync',
    script: 'claude',
    args: '--cwd /path/to/project --command /daily-sync',
    cron_restart: '0 8 * * *',
    autorestart: false
  }]
};
```

## 数据层

数据层就是你的文件系统。JSON 用于结构化数据，markdown 用于叙述性内容。

### 用于结构化状态的 JSON

```json
// data/projects/website-v2.json
{
  "name": "Website v2",
  "status": "in-progress",
  "milestone": "beta-launch",
  "agents_involved": ["@dev", "@writer"],
  "files": {
    "spec": "docs/website-v2-spec.md",
    "design": "designs/website-v2.fig"
  },
  "metrics": {
    "commits": 47,
    "last_session": "2026-04-22T11:30:00Z"
  }
}
```

### 用于叙述性内容的 markdown

凡是供人阅读的内容都使用 markdown：决策、log、研究笔记、联系人记录。

### Schema 演进

永远不要重命名已有字段。添加新字段，并将旧字段标记为 deprecated：

```json
{
  "name": "Website v2",
  "status": "in-progress",
  "milestone": "beta-launch",
  "_deprecated_priority": "high",
  "priority_v2": { "level": "high", "rationale": "Blocks investor demo" }
}
```

这样可以让历史数据保持可读，无需 migration 脚本。

## 反模式

### 单体单一 agent

```markdown
# BAD - One agent does everything
You are a full-stack developer, writer, researcher, and DevOps engineer.
```

应拆分为专家 agent。由 kernel 处理路由。

### 无状态 session

```markdown
# BAD - No memory between sessions
Starting fresh every time Claude Code opens.
```

始终在 session 开始时读取 `data/`，并在 session 结束时写回。

### 硬编码凭据

```markdown
# BAD - API keys in agent files or CLAUDE.md
Your OpenAI API key is sk-xxxxxxxx
```

使用环境变量或由脚本加载的 `.env` 文件。agent 引用 `process.env.API_KEY`。

### 为简单状态使用外部数据库

```markdown
# BAD - PostgreSQL for a solo user's agentic OS
```

在你拥有多个并发用户或数 GB 数据之前，请使用 JSON/markdown 文件。

### 过度工程化的路由

```markdown
# BAD - Routing logic in code instead of markdown tables
if (intent.includes('deploy')) { agent = opsAgent; }
```

将路由保持为 `CLAUDE.md` markdown 表格中的声明式表达。它是可检视、可编辑、可 debug 的。

## 最佳实践

- [ ] `CLAUDE.md` 不超过 200 行，可放入 context window
- [ ] 每个 agent 文件不超过 100 行，聚焦于一个领域
- [ ] `data/` 中敏感 log 被 git 忽略，决策和 spec 被 git 跟踪
- [ ] command 使用祈使语气命名：`/daily-sync`，而非 `/run-daily-sync`
- [ ] log 是只追加的；绝不编辑过去的每日 log
- [ ] 每个 agent 都有一个 `Memory Scope` 章节，定义它读取哪些文件
- [ ] 在每个 session 结束时撰写复盘
- [ ] 定时任务使用外部 cron（LaunchAgent、systemd、pm2），而非 Claude Code 的 session cron
- [ ] 成本追踪：在 `data/logs/<date>-costs.json` 中记录每个 session 的 API 花费
- [ ] 一个项目 = 一个 Agentic OS。不要在不相关的项目之间共享同一个 `CLAUDE.md`。
