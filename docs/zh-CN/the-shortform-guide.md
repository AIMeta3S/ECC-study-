# Claude Code 速查指南

![头部：Anthropic Hackathon 获奖作品 — Claude Code 技巧与窍门](./assets/images/shortform/00-header.png)

---

**自 2 月实验性推出以来就是狂热的 Claude Code 用户，并凭借 [zenith.chat](https://zenith.chat) 与 [@DRodriguezFX](https://x.com/DRodriguezFX) 一起赢得了 Anthropic x Forum Ventures hackathon——完全使用 Claude Code 构建。**

以下是我经过 10 个月每日使用后的完整配置：skills、hooks、subagents、MCPs、plugins，以及真正行之有效的东西。

---

## Skills 与 Commands

Skills 是主要的工作流 surface。它们就像作用域限定的工作流 bundle：包含可复用的 prompts、结构、支持文件，以及按需提供特定执行模式的 codemap。

在使用 Opus 4.5 长时间 coding 之后，你想清理 dead code 和 loose .md 文件？运行 `/refactor-clean`。需要 testing？`/tdd`、`/e2e`、`/test-coverage`。这些 slash 入口很方便，但真正持久的单元是底层的 skill。Skills 还可以包含 codemap——Claude 通过它快速导航 codebase 而无需在探索上消耗 context。

![终端展示链式命令](./assets/images/shortform/02-chaining-commands.jpeg)
*链式调用命令*

ECC 仍然提供 `commands/` 层，但最好将其视为迁移期间遗留的 slash-entry 兼容层。持久化逻辑应当放在 skills 中。

- **Skills**: `~/.claude/skills/` — 规范的工作流定义
- **Commands**: `~/.claude/commands/` — 在仍然需要时的遗留 slash-entry 垫片

```bash
# 示例 skill 结构
~/.claude/skills/
  pmx-guidelines.md      # 项目特定 patterns
  coding-standards.md    # 语言 best practices
  tdd-workflow/          # 包含 SKILL.md 的多文件 skill
  security-review/       # 基于 checklist 的 skill
```

---

## Hooks

Hooks 是基于触发器的自动化机制，会在特定事件触发。与 skills 不同，它们仅限于 tool calls 和 lifecycle events。

**Hook 类型:**

1. **PreToolUse** — 工具执行之前（验证、提醒）
2. **PostToolUse** — 工具完成后（格式化、反馈循环）
3. **UserPromptSubmit** — 当你发送消息时
4. **Stop** — Claude 完成响应时
5. **PreCompact** — context compaction 之前
6. **Notification** — 权限请求

**示例：长时间运行的命令前的 tmux 提醒**

```json
{
  "PreToolUse": [
    {
      "matcher": "tool == \"Bash\" && tool_input.command matches \"(npm|pnpm|yarn|cargo|pytest)\"",
      "hooks": [
        {
          "type": "command",
          "command": "if [ -z \"$TMUX\" ]; then echo '[Hook] 考虑使用 tmux 以保持会话持久性' >&2; fi"
        }
      ]
    }
  ]
}
```

![PostToolUse hook 反馈](./assets/images/shortform/03-posttooluse-hook.png)
*在 Claude Code 中运行 PostToolUse hook 时得到的反馈示例*

**Pro tip:** 使用 `hookify` plugin 以对话方式创建 hooks，而无需手写 JSON。运行 `/hookify` 并描述你的需求。

---

## Subagents

Subagents 是你的 orchestrator（主 Claude）可以委派任务并限定范围的进程。它们可以在后台或前台运行，从而为主 agent 释放 context。

Subagents 与 skills 配合得很好——一个能够执行你部分 skills 的 subagent 可以被委派任务，并自主使用这些 skills。它们还可以通过特定 tool permissions 进行 sandbox。

```bash
# 示例 subagent 结构
~/.claude/agents/
  planner.md           # 功能实现规划
  architect.md         # 系统设计决策
  tdd-guide.md         # 测试驱动开发
  code-reviewer.md     # 质量/安全 review
  security-reviewer.md # 漏洞分析
  build-error-resolver.md
  e2e-runner.md
  refactor-cleaner.md
```

为每个 subagent 配置允许的 tools、MCPs 和 permissions，以实现适当的范围控制。

---

## Rules 与 Memory

你的 `.rules` 文件夹存放 Claude **始终**应该遵循的 best practices 的 `.md` 文件。两种组织方式：

1. **单个 CLAUDE.md** — 所有内容在一个文件（用户或项目级别）
2. **Rules 文件夹** — 按关注点分组的模块化 `.md` 文件

```bash
~/.claude/rules/
  security.md      # 不硬编码 secrets，验证输入
  coding-style.md  # 不可变性，文件组织
  testing.md       # TDD 工作流，80% coverage
  git-workflow.md  # Commit 格式，PR 流程
  agents.md        # 何时委派给 subagents
  performance.md   # 模型选择，context 管理
```

**示例 rules:**

- 代码库中不使用 emoji
- 前端避免紫色调
- 部署前始终测试代码
- 优先选择模块化代码而非超级大文件
- 绝不 commit `console.log`

---

## MCPs (Model Context Protocol)

MCP 直接将 Claude 连接到外部 services。它不是 API 的替代品——而是围绕 API 的 prompt-driven wrapper，在信息导航上提供更大灵活性。

**示例:** Supabase MCP 允许 Claude 直接拉取特定数据，在上游直接运行 SQL，无需复制粘贴。类似适用于 databases、部署平台等。

![Supabase MCP 列出表](./assets/images/shortform/04-supabase-mcp.jpeg)
*Supabase MCP 列出 public schema 中表的示例*

**Claude 中的 Chrome：** 是一个内置 plugin MCP，允许 Claude 自主控制你的浏览器——点击浏览以了解实际运行情况。

**至关重要：Context Window 管理**

对 MCPs 要挑剔。我把所有 MCPs 都放在用户配置中，但**禁用所有未使用的**。导航到 `/plugins` 并向下滚动，或运行 `/mcp`。

![/plugins 界面](./assets/images/shortform/05-plugins-interface.jpeg)
*使用 /plugins 导航到 MCPs，查看当前安装了哪些以及它们的状态*

启用过多 tools 时，你原本 200k 的 context window，在 compacting 前可能只剩下 70k。性能会显著下降。

**经验法则:** 在配置中保留 20-30 个 MCPs，但保持启用数在 10 个以下 / 活跃 tools 在 80 个以下。

```bash
# 检查已启用的 MCPs
/mcp

# 在 ~/.claude/settings.json 或当前 repo 的 .mcp.json 中禁用未使用的
```

---

## Plugins

Plugins 将工具打包以便于安装，避免繁琐的手动配置。一个 plugin 可以是 skill + MCP 的组合，或者是 hooks/tools 捆绑在一起。

**安装 plugins:**

```bash
# 添加一个 marketplace
# @mixedbread-ai 的 mgrep plugin
claude plugin marketplace add https://github.com/mixedbread-ai/mgrep

# 打开 Claude，运行 /plugins，找到新的 marketplace，从那里安装
```

![Marketplaces 标签页显示 mgrep](./assets/images/shortform/06-marketplaces-mgrep.jpeg)
*显示新安装的 Mixedbread-Grep marketplace*

**LSP Plugins** 如果你经常在编辑器之外运行 Claude Code，尤其有用。Language Server Protocol 为 Claude 提供实时 type checking、go-to-definition 和智能补全，无需打开 IDE。

```bash
# 已启用的 plugins 示例
typescript-lsp@claude-plugins-official  # TypeScript 智能
pyright-lsp@claude-plugins-official     # Python type checking
hookify@claude-plugins-official         # 对话式创建 hooks
mgrep@Mixedbread-Grep                   # 比 ripgrep 更好的搜索
```

与 MCPs 同样的警告——注意你的 context window。

---

## Tips 与 Tricks

### 键盘快捷键

- `Ctrl+U` — 删除整行（比狂按退格快）
- `!` — 快速 bash 命令前缀
- `@` — 搜索文件
- `/` — 启动 slash commands
- `Shift+Enter` — 多行输入
- `Tab` — 切换 thinking 显示
- `Esc Esc` — 中断 Claude / 恢复代码

### 并行工作流

- **Fork** (`/fork`) — 分叉对话以并行执行非重叠任务，而不是堆积排队消息
- **Git Worktrees** — 用于避免冲突的重叠并行 Claude 实例。每个 worktree 是一个独立的 checkout

```bash
git worktree add ../feature-branch feature-branch
# 现在在每个 worktree 中运行独立的 Claude 实例
```

### 在长时间运行的命令中使用 tmux

流式传输并观察 Claude 运行的日志/bash 进程：

[观看: tmux 会话流式传输长时间运行的命令 (视频)](./assets/images/shortform/07-tmux-video.mp4)

```bash
tmux new -s dev
# Claude 在此运行命令，你可以 detach 并重新 attach
tmux attach -t dev
```

### mgrep > grep

`mgrep` 相对于 ripgrep/grep 有显著改进。通过 plugin marketplace 安装，然后使用 `/mgrep` skill。同时支持本地搜索和网页搜索。

```bash
mgrep "function handleSubmit"  # 本地搜索
mgrep --web "Next.js 15 app router changes"  # 网页搜索
```

### 其他有用的 Commands

- `/rewind` — 回到之前的状态
- `/statusline` — 用 branch、context %、todos 自定义状态行
- `/checkpoints` — 文件级撤销点
- `/compact` — 手动触发 context compaction

### GitHub Actions CI/CD

用 GitHub Actions 为你的 PR 设置 code review。配置完成后，Claude 可以自动 review PR。

![Claude bot 批准一个 PR](./assets/images/shortform/08-github-pr-review.jpeg)
*Claude 批准一个 bug fix PR*

### Sandboxing

对 risky 操作使用 sandbox 模式——Claude 在受限环境中运行，不会影响你的实际系统。

---

## 关于编辑器

你的编辑器选择会显著影响 Claude Code 工作流。虽然 Claude Code 可以在任何终端中运行，但将其与功能强大的编辑器配对，可以解锁实时文件跟踪、快速导航和集成命令执行。

### Zed（我的偏好）

我使用 [Zed](https://zed.dev)——用 Rust 编写，因此速度极快。瞬间打开，轻松处理超大型代码库，几乎不占用系统资源。

**为什么 Zed + Claude Code 是绝佳组合:**

- **速度** — 基于 Rust 的性能意味着 Claude 快速编辑文件时没有延迟。你的编辑器跟得上
- **Agent 面板集成** — Zed 的 Claude 集成让你在 Claude 编辑时实时跟踪文件更改。无需离开编辑器即可跳转到 Claude 引用的文件
- **CMD+Shift+R 命令面板** — 在可搜索的 UI 中快速访问所有自定义 slash commands、debuggers、build scripts
- **极低的资源占用** — 在繁重操作期间不会与 Claude 争夺 RAM/CPU。在运行 Opus 时这一点很重要
- **Vim 模式** — 如果你喜欢，支持完整的 vim keybindings

![Zed 编辑器与自定义命令](./assets/images/shortform/09-zed-editor.jpeg)
*Zed 编辑器，使用 CMD+Shift+R 弹出自定义命令下拉菜单。右下角靶心图标表示 following 模式。*

**编辑器通用建议:**

1. **分屏** — 一侧是运行 Claude Code 的终端，另一侧是编辑器
2. **Ctrl + G** — 在 Zed 中快速打开 Claude 当前正在处理的文件
3. **自动保存** — 启用 autosave，确保 Claude 的文件读取始终是最新的
4. **Git 集成** — 使用编辑器的 git 功能在 commit 前 review Claude 的更改
5. **文件监视器** — 大多数编辑器会自动重新加载已更改的文件，请确认此功能已启用

### VSCode / Cursor

这也是一个可行的选择，并且与 Claude Code 配合良好。你可以使用终端形式，通过 `\ide` 与编辑器自动同步，启用 LSP 功能（现在与 plugins 有些重复）。或者，你可以选择扩展，它与编辑器集成更深，拥有匹配的 UI。

![VS Code Claude Code 扩展](./assets/images/shortform/10-vscode-extension.jpeg)
*VS Code 扩展为 Claude Code 提供了原生的图形界面，直接集成到你的 IDE 中。*

---

## 我的配置

### Plugins

**已安装:**（我通常一次只启用其中 4-5 个）

```markdown
ralph-wiggum@claude-code-plugins       # 循环自动化
frontend-patterns@claude-code-plugins  # UI/UX patterns
commit-commands@claude-code-plugins    # Git 工作流
security-guidance@claude-code-plugins  # 安全检查
pr-review-toolkit@claude-code-plugins  # PR 自动化
typescript-lsp@claude-plugins-official # TS 智能
hookify@claude-plugins-official        # Hook 创建
code-simplifier@claude-plugins-official
feature-dev@claude-code-plugins
explanatory-output-style@claude-code-plugins
code-review@claude-code-plugins
context7@claude-plugins-official       # 实时文档
pyright-lsp@claude-plugins-official    # Python types
mgrep@Mixedbread-Grep                  # 更好的搜索
```

### MCP Servers

**已配置 (用户级别):**

```json
{
  "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] },
  "firecrawl": { "command": "npx", "args": ["-y", "firecrawl-mcp"] },
  "supabase": {
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=YOUR_REF"]
  },
  "memory": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory"] },
  "sequential-thinking": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
  },
  "vercel": { "type": "http", "url": "https://mcp.vercel.com" },
  "railway": { "command": "npx", "args": ["-y", "@railway/mcp-server"] },
  "cloudflare-docs": { "type": "http", "url": "https://docs.mcp.cloudflare.com/mcp" },
  "cloudflare-workers-bindings": {
    "type": "http",
    "url": "https://bindings.mcp.cloudflare.com/mcp"
  },
  "clickhouse": { "type": "http", "url": "https://mcp.clickhouse.cloud/mcp" },
  "AbletonMCP": { "command": "uvx", "args": ["ableton-mcp"] },
  "magic": { "command": "npx", "args": ["-y", "@magicuidesign/mcp@latest"] }
}
```

关键在于——我配置了 14 个 MCPs，但每个项目仅启用大约 5-6 个。保持 context window 健康。

### 关键 Hooks

```json
{
  "PreToolUse": [
    { "matcher": "npm|pnpm|yarn|cargo|pytest", "hooks": ["tmux 提醒"] },
    { "matcher": "Write && .md file", "hooks": ["除非 README/CLAUDE 否则阻止"] },
    { "matcher": "git push", "hooks": ["打开编辑器进行 review"] }
  ],
  "PostToolUse": [
    { "matcher": "Edit && .ts/.tsx/.js/.jsx", "hooks": ["prettier --write"] },
    { "matcher": "Edit && .ts/.tsx", "hooks": ["tsc --noEmit"] },
    { "matcher": "Edit", "hooks": ["grep console.log 警告"] }
  ],
  "Stop": [
    { "matcher": "*", "hooks": ["检查修改的文件中是否有 console.log"] }
  ]
}
```

### 自定义 Status Line

显示用户、目录、带 dirty 指示的 git branch、剩余 context %、模型、时间和 todo 数量:

![自定义状态行](./assets/images/shortform/11-statusline.jpeg)
*我的 Mac 根目录中的 statusline 示例*

```
affoon:~ ctx:65% Opus 4.5 19:52
▌▌ plan 模式开启 (shift+tab 切换)
```

### Rules 结构

```
~/.claude/rules/
  security.md      # 强制安全检查
  coding-style.md  # 不可变性、文件大小限制
  testing.md       # TDD, 80% coverage
  git-workflow.md  # Conventional commits
  agents.md        # Subagent 委派规则
  patterns.md      # API 响应格式
  performance.md   # 模型选择 (Haiku vs Sonnet vs Opus)
  hooks.md         # Hook 文档
```

### Subagents

```
~/.claude/agents/
  planner.md           # 拆解功能
  architect.md         # 系统设计
  tdd-guide.md         # 先写 tests
  code-reviewer.md     # 质量 review
  security-reviewer.md # 漏洞扫描
  build-error-resolver.md
  e2e-runner.md        # Playwright tests
  refactor-cleaner.md  # Dead code 移除
  doc-updater.md       # 保持文档同步
```

---

## 核心要点

1. **不要过度复杂化** — 把配置当作 fine-tuning，而不是架构设计
2. **Context window 是宝贵资源** — 禁用未使用的 MCPs 和 plugins
3. **并行执行** — fork 对话，使用 git worktrees
4. **自动化重复性工作** — hooks 负责格式化、linting、提醒
5. **划定 subagents 的范围** — 有限的 tools = 专注的执行

---

## 参考资料

- [Plugins 参考](https://code.claude.com/docs/en/plugins-reference)
- [Hooks 文档](https://code.claude.com/docs/en/hooks)
- [Checkpointing](https://code.claude.com/docs/en/checkpointing)
- [Interactive 模式](https://code.claude.com/docs/en/interactive-mode)
- [Memory 系统](https://code.claude.com/docs/en/memory)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [MCP 概述](https://code.claude.com/docs/en/mcp-overview)

---

**注意:** 这只是一个细节子集。高级模式请参阅 [长文指南](./the-longform-guide.md)。

---

*在纽约举办的 Anthropic x Forum Ventures hackathon 中凭借 [zenith.chat](https://zenith.chat) 获奖，与 [@DRodriguezFX](https://x.com/DRodriguezFX) 一同构建*