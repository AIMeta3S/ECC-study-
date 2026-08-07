# Everything Claude Code 精简指南

![Header: Anthropic Hackathon Winner - Tips & Tricks for Claude Code](./assets/images/shortform/00-header.png)

---

**从 2 月实验性发布起我就是 Claude Code 的重度用户，并完全使用 Claude Code 与 [@DRodriguezFX](https://x.com/DRodriguezFX) 一起打造了 [zenith.chat](https://zenith.chat)，赢得了 Anthropic x Forum Ventures 黑客马拉松。**

这是我每天使用 10 个月后的完整配置：技能、钩子、子智能体、MCP、插件，以及真正有效的做法。

---

## Skills and Commands

Skills 是主要的工作流界面。它们就像带作用域的工作流捆绑包：在你需要某种特定执行模式时，提供可复用的提示词、结构、支撑文件和代码地图。

用 Opus 4.5 编码了很长一段会话后，想清理死代码和零散的 .md 文件？运行 `/refactor-clean`。需要测试？`/tdd`、`/e2e`、`/test-coverage`。这些 slash 条目很方便，但真正持久的单元是底层的技能。技能还可以包含代码地图——一种让 Claude 快速在你的代码库中导航、而无需在探索上消耗上下文的方式。

![Terminal showing chained commands](./assets/images/shortform/02-chaining-commands.jpeg)
*将命令串联起来*

ECC 仍然保留了一个 `commands/` 层，但最好把它看作迁移期间用于兼容旧 slash-entry 的适配层。持久的逻辑应该放在技能里。

- **技能**：`~/.claude/skills/` - 规范的工作流定义
- **命令**：`~/.claude/commands/` - 当你需要时仍然可以使用旧 slash-entry 的命令

```bash
# 技能结构示例
~/.claude/skills/
  pmx-guidelines.md      # 项目特定模式
  coding-standards.md    # 语言最佳实践
  tdd-workflow/          # 带 SKILL.md 的多文件技能
  security-review/       # 基于清单的技能
```

---

## Hooks

Hooks 是基于触发器的自动化流程，会在特定事件发生时触发。与技能不同，它们仅限于工具调用和生命周期的事件。

**Hook Types:**

1. **PreToolUse** - Before a tool executes (validation, reminders)
2. **PostToolUse** - After a tool finishes (formatting, feedback loops)
3. **UserPromptSubmit** - When you send a message
4. **Stop** - When Claude finishes responding
5. **PreCompact** - Before context compaction
6. **Notification** - Permission requests

**示例：tmux reminder before long-running commands**

```json
{
  "PreToolUse": [
    {
      "matcher": "tool == \"Bash\" && tool_input.command matches \"(npm|pnpm|yarn|cargo|pytest)\"",
      "hooks": [
        {
          "type": "command",
          "command": "if [ -z \"$TMUX\" ]; then echo '[Hook] Consider tmux for session persistence' >&2; fi"
        }
      ]
    }
  ]
}
```

![PostToolUse hook feedback](./assets/images/shortform/03-posttooluse-hook.png)
*在运行 PostToolUse 钩子时，Claude Code 中会看到的反馈示例*

**专业提示：** 使用 `hookify` 插件以对话方式创建钩子，而无需手动编写 JSON。运行 `/hookify` 并描述你想要的效果。

---

## Subagents

Subagents 是以独立进程运行的，你的主协调器（Main Claude）可以将任务下发给它们，并为其设定明确的权限边界。子代理支持后台或前台运行，能够有效释放主代理的上下文占用。

Subagents 可以很好地与 skills 配合 - 基于 Subagent 能够执行技能包(skills)中的某些子集（特定技能），可以给 Subagent 委派一个特定任务，它自主调用这些特定技能来完成任务。它们也可以被沙箱化，只允许使用特定的工具权限。

```bash
# Subagents 结构示例
~/.claude/agents/
  planner.md           # 功能实现规划
  architect.md         # 系统设计决策
  tdd-guide.md         # 测试驱动开发
  code-reviewer.md     # 质量/安全审查
  security-reviewer.md # 漏洞分析
  build-error-resolver.md
  e2e-runner.md
  refactor-cleaner.md
```

为每个 Subagent 分别配置允许使用的工具、MCP 和权限，以确保恰当的范围（权限边界）界定。


---

## Rules and Memory

你的 `.rules` 文件夹中存放着 `.md` 文件，里面是 Claude 应当始终遵循的最佳实践。有两种做法：

1. **单一 CLAUDE.md** - 所有内容放在一个文件里（用户级或项目级）
2. **规则文件夹** - 按关注点分组的模块化 `.md` 文件

```bash
~/.claude/rules/
  security.md      # 不硬编码密钥，校验输入
  coding-style.md  # 不可变性，文件组织
  testing.md       # TDD 工作流，80% 覆盖率
  git-workflow.md  # 提交格式，PR 流程
  agents.md        # 何时委派给子智能体
  performance.md   # 模型选择，上下文管理
```

**示例规则：**

- 代码库中不使用 emoji
- 前端避免使用紫色调
- 部署前始终测试代码
- 优先使用模块化代码，而非巨型文件
- 永不提交 console.log

---

## MCP（模型上下文协议）

MCPs 将 Claude 直接连接到外部服务。它并非 API 的替代品，而是一种围绕 API 的、由提示词驱动的封装层，能在“探索”信息过程中提供更大的灵活性。

**示例：** Supabase MCP 让 Claude 拉取特定数据、直接在上游运行 SQL，而无需复制粘贴。数据库、部署平台等也是同理。

![Supabase MCP listing tables](./assets/images/shortform/04-supabase-mcp.jpeg)
*Supabase MCP 列出 public schema 中各数据表的示例*

**Chrome in Claude：** 是一个内置的插件 MCP，让 Claude 自主控制你的浏览器——四处点击来查看事物的运作方式。

**关键：上下文窗口管理**

对 MCP 要挑剔。我把所有 MCP 都放在用户配置里，但**禁用一切未在使用的**。导航到 `/plugins` 并向下滚动，或运行 `/mcp`。
对 MCP 要有所取舍。我会把所有 MCP 都放在用户配置中，但**禁用所有未使用的**。可以通过导航到 /plugins 并向下滚动，或直接运行 /mcp 来管理。

![/plugins interface](./assets/images/shortform/05-plugins-interface.jpeg)
*使用 /plugins 导航到 MCP，查看当前已安装的 MCP 及其状态*

如果启用过多的工具，那么在压缩之前，200k 上下文窗口实际可用空间可能只剩下 70k。性能会显著下降。

**经验法则：** 在配置中保留 20-30 个 MCP，但启用数保持在 10 个以下 / 活动工具数保持在 80 个以下。

```bash
# 查看已启用的 MCP
/mcp

# 在 ~/.claude/settings.json 或当前仓库的 .mcp.json 中禁用未使用的 MCP
```

---

## Plugins

插件把工具打包以便轻松安装，省去繁琐的手动配置。一个插件可以是技能 + MCP 的组合，也可以是捆绑在一起的钩子/工具。

**安装插件：**

```bash
# 添加市场
# @mixedbread-ai 出品的 mgrep 插件
claude plugin marketplace add https://github.com/mixedbread-ai/mgrep

# 打开 Claude，运行 /plugins，找到新市场，从那里安装
```

![Marketplaces tab showing mgrep](./assets/images/shortform/06-marketplaces-mgrep.jpeg)
*显示新安装的 Mixedbread-Grep 市场*

**LSP 插件** 在你频繁在编辑器之外运行 Claude Code 时尤其有用。语言服务器协议（Language Server Protocol）让 Claude 获得实时类型检查、跳转到定义和智能补全，而无需打开 IDE。

```bash
# 已启用插件示例
typescript-lsp@claude-plugins-official  # TypeScript 智能
pyright-lsp@claude-plugins-official     # Python 类型检查
hookify@claude-plugins-official         # 以对话方式创建钩子
mgrep@Mixedbread-Grep                   # 比 ripgrep 更好的搜索
```

与 MCP 同样的警告——注意你的上下文窗口。

---

## 技巧与窍门

### 键盘快捷键

- `Ctrl+U` - 删除整行（比狂按退格键更快）
- `!` - 快速 bash 命令前缀
- `@` - 搜索文件
- `/` - 发起 slash 命令
- `Shift+Enter` - 多行输入
- `Tab` - 切换思考过程显示
- `Esc Esc` - 中断 Claude / 恢复代码

### 并行工作流

- **Fork**（`/fork`）- Fork 会话以并行执行不重叠的任务，而不是堆叠排队消息
- **Git Worktrees** - 用于无冲突地并行运行多个 Claude。每个 worktree 都是一个独立的检出

```bash
git worktree add ../feature-branch feature-branch
# 现在在每个 worktree 中运行独立的 Claude 实例
```

### tmux for Long-Running Commands

流式查看 Claude 运行的日志/bash 进程：

[Watch: tmux session streaming a long-running command (video)](./assets/images/shortform/07-tmux-video.mp4)

```bash
tmux new -s dev
# Claude 在这里运行命令，你可以分离并重新挂载
tmux attach -t dev
```

### mgrep > grep

`mgrep` 是对 ripgrep/grep 的重大改进。通过插件市场安装，然后使用 `/mgrep` 技能。同时支持本地搜索和网络搜索。

```bash
mgrep "function handleSubmit"  # 本地搜索
mgrep --web "Next.js 15 app router changes"  # 网络搜索
```

### 其他实用命令

- `/rewind` - Go back to a previous state
- `/statusline` - Customize with branch, context %, todos
- `/checkpoints` - File-level undo points
- `/compact` - Manually trigger context compaction

### GitHub Actions CI/CD

用 GitHub Actions 在你的 PR 上设置代码审查。配置后 Claude 可以自动审查 PR。

![Claude bot approving a PR](./assets/images/shortform/08-github-pr-review.jpeg)
*Claude 批准一个 bug 修复 PR*

### Sandboxing（沙箱）

对有风险的操作使用沙箱模式——Claude 在受限环境中运行，不会影响你的实际系统。

---

## On Editors

你的编辑器选择会显著影响 Claude Code 工作流。虽然 Claude Code 可以从任何终端运行，但将它与一个称职的编辑器搭配，能解锁实时文件跟踪、快速导航和集成的命令执行。

### Zed（我的偏好）

我用 [Zed](https://zed.dev)——用 Rust 编写，所以真的很快。瞬间打开，轻松处理巨型代码库，几乎不怎么占用系统资源。

**为什么 Zed + Claude Code 是绝佳组合：**

- **速度** - 基于 Rust 的性能意味着 Claude 快速编辑文件时不会卡顿。你的编辑器跟得上
- **Agent Panel 集成** - Zed 的 Claude 集成让你在 Claude 编辑时实时跟踪文件变更。在不离开编辑器的情况下跳转 Claude 引用的文件
- **CMD+Shift+R 命令面板** - 通过可搜索的界面快速访问你所有的自定义 slash 命令、调试器、构建脚本
- **极低的资源占用** - 在繁重操作期间不会与 Claude 争夺 RAM/CPU。运行 Opus 时这一点很重要
- **Vim 模式** - 如果你喜欢，提供完整的 vim 键位绑定

![Zed Editor with custom commands](./assets/images/shortform/09-zed-editor.jpeg)
*使用 CMD+Shift+R 调出自定义命令下拉菜单的 Zed 编辑器。右下角的靶心图标即跟随模式（Following mode）。*

**编辑器无关的技巧：**

1. **分屏** - 一边是运行 Claude Code 的终端，另一边是编辑器
2. **Ctrl + G** - 在 Zed 中快速打开 Claude 当前正在编辑的文件
3. **自动保存** - 启用自动保存，这样 Claude 的文件读取始终是最新的
4. **Git 集成** - 使用编辑器的 git 功能在提交前审查 Claude 的改动
5. **文件监视器** - 大多数编辑器会自动重新加载已更改的文件，确认此功能已启用

### VSCode / Cursor

这也是一个可行的选择，与 Claude Code 配合良好。你可以用终端形式使用它，通过 `\ide` 与编辑器自动同步以启用 LSP 功能（现在与插件有些重复）。或者你也可以选择扩展，它与编辑器集成得更深，并有匹配的 UI。

![VS Code Claude Code Extension](./assets/images/shortform/10-vscode-extension.jpeg)
*VS Code 扩展为 Claude Code 提供了原生图形界面，直接集成在你的 IDE 中。*

---

## 我的配置

### Plugins

**已安装：**（我通常一次只启用其中 4-5 个）

```markdown
ralph-wiggum@claude-code-plugins       # Loop automation
frontend-patterns@claude-code-plugins  # UI/UX patterns
commit-commands@claude-code-plugins    # Git workflow
security-guidance@claude-code-plugins  # Security checks
pr-review-toolkit@claude-code-plugins  # PR automation
typescript-lsp@claude-plugins-official # TS intelligence
hookify@claude-plugins-official        # Hook creation
code-simplifier@claude-plugins-official
feature-dev@claude-code-plugins
explanatory-output-style@claude-code-plugins
code-review@claude-code-plugins
context7@claude-plugins-official       # Live documentation
pyright-lsp@claude-plugins-official    # Python types
mgrep@Mixedbread-Grep                  # Better search
```

### MCP Servers

**Configured (User Level):**

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

这是关键——我配置了 14 个 MCP，但每个项目只启用约 5-6 个。让上下文窗口保持健康。

### Key Hooks

```json
{
  "PreToolUse": [
    { "matcher": "npm|pnpm|yarn|cargo|pytest", "hooks": ["tmux reminder"] },
    { "matcher": "Write && .md file", "hooks": ["block unless README/CLAUDE"] },
    { "matcher": "git push", "hooks": ["open editor for review"] }
  ],
  "PostToolUse": [
    { "matcher": "Edit && .ts/.tsx/.js/.jsx", "hooks": ["prettier --write"] },
    { "matcher": "Edit && .ts/.tsx", "hooks": ["tsc --noEmit"] },
    { "matcher": "Edit", "hooks": ["grep console.log warning"] }
  ],
  "Stop": [
    { "matcher": "*", "hooks": ["check modified files for console.log"] }
  ]
}
```

### Custom Status Line

Shows user, directory, git branch with dirty indicator, context remaining %, model, time, and todo count:

![Custom status line](./assets/images/shortform/11-statusline.jpeg)
*Example statusline in my Mac root directory*

```
affoon:~ ctx:65% Opus 4.5 19:52
▌▌ plan mode on (shift+tab to cycle)
```

### Rules Structure

```
~/.claude/rules/
  security.md      # Mandatory（强制） security checks
  coding-style.md  # Immutability（不可变性）, file size limits
  testing.md       # TDD, 80% coverage
  git-workflow.md  # Conventional（习惯的;墨守成规的;依照惯例的;遵循习俗的;） commits
  agents.md        # Subagent delegation（委派，委托） rules
  patterns.md      # API response formats
  performance.md   # Model selection (Haiku vs Sonnet vs Opus)
  hooks.md         # Hook documentation
```

### Subagents

```
~/.claude/agents/
  planner.md           # Break down features
  architect.md         # System design
  tdd-guide.md         # Write tests first
  code-reviewer.md     # Quality review
  security-reviewer.md # Vulnerability（漏洞） scan
  build-error-resolver.md
  e2e-runner.md        # Playwright tests
  refactor-cleaner.md  # Dead code removal
  doc-updater.md       # Keep docs synced
```

---

## Key Takeaways(关键要点)

1. **不要过度复杂化** - 把配置当作微调，而不是架构
2. **上下文窗口很宝贵** - 禁用未使用的 MCP 和插件
3. **并行执行** - fork 会话，使用 git worktrees
4. **自动化重复工作** - 用 hooks 处理格式化、代码审查、提醒
5. **明确 subagents 的 Scope（职能、边界、权限、工具等）** - 有限的工具 = 专注的执行

---

## References

- [Plugins Reference](https://code.claude.com/docs/zh-CN/plugins-reference)
- [Hooks Documentation](https://code.claude.com/docs/zh-CN/hooks)
- [Checkpointing](https://code.claude.com/docs/zh-CN/checkpointing)
- [Interactive Mode](https://code.claude.com/docs/zh-CN/interactive-mode)
- [Memory System](https://code.claude.com/docs/zh-CN/memory)
- [Subagents](https://code.claude.com/docs/zh-CN/sub-agents)
- [MCP Overview](https://code.claude.com/docs/zh-CN/mcp)

---

**注意：** 这只是部分细节。高级模式请参见[详细指南](./the-longform-guide-cn.md)。

---

*在 NYC 用 Claude Code 构建 [zenith.chat](https://zenith.chat) 赢得了 Anthropic x Forum Ventures 黑客马拉松，合作者为 [@DRodriguezFX](https://x.com/DRodriguezFX)*
