---
name: dmux-workflows
description: 使用 dmux（面向 AI agent 的 tmux pane 管理器）进行多 agent 编排。提供跨 Claude Code、Codex、OpenCode 及其他 harness 的并行 agent 工作流模式。当需要并行运行多个 agent 会话或协调多 agent 开发工作流时使用。
metadata:
  origin: ECC
---

# dmux 工作流

使用 dmux（一款面向 agent harness 的 tmux pane 管理器）编排并行 AI agent 会话。

## 何时激活

- 并行运行多个 agent 会话
- 跨 Claude Code、Codex 及其他 harness 协调工作
- 能从分而治之的并行化中受益的复杂任务
- 用户说“并行运行”、“拆分这个工作”、“使用 dmux”或“多 agent”

## 什么是 dmux

dmux 是一款基于 tmux 的编排工具，用于管理 AI agent 的 pane：
- 按 `n` 创建一个带 prompt 的新 pane
- 按 `m` 将 pane 输出合并回主 session
- 支持：Claude Code、Codex、OpenCode、Cline、Gemini、Qwen

**安装：** 在审查该 package 后，从其仓库安装 dmux。参见 [github.com/standardagents/dmux](https://github.com/standardagents/dmux)

## 快速开始

```bash
# 启动 dmux session
dmux

# 创建 agent pane（在 dmux 中按 'n'，然后输入 prompt）
# Pane 1："在 src/auth/ 中实现 auth 中间件"
# Pane 2："为 user service 编写测试"
# Pane 3："更新 API 文档"

# 每个 pane 运行各自的 agent session
# 按 'm' 将结果合并回来
```

## 工作流模式

### 模式 1：调研 + 实现

将调研和实现拆分为并行轨道：

```
Pane 1 (调研)："调研 Node.js 中限流的最佳实践。
  检查现有的库，比较各种方案，并将调研结果写入
  /tmp/rate-limit-research.md"

Pane 2 (实现)："为我们的 Express API 实现限流中间件。
  先从一个基本的 token bucket 开始，调研完成后再细化。"

# Pane 1 完成后，将调研结果合并到 Pane 2 的上下文中
```

### 模式 2：多文件特性

跨独立文件并行化工作：

```
Pane 1："为 billing 功能创建数据库 schema 和 migration"
Pane 2："在 src/api/billing/ 中构建 billing API endpoint"
Pane 3："创建 billing dashboard 的 UI 组件"

# 合并全部结果，然后在主 pane 中进行集成
```

### 模式 3：测试 + 修复循环

在一个 pane 中运行测试，在另一个 pane 中修复：

```
Pane 1 (监视器)："以 watch 模式运行测试套件。当测试失败时，
  汇总失败信息。"

Pane 2 (修复器)："根据 pane 1 的错误输出修复失败的测试"
```

### 模式 4：跨 harness

针对不同任务使用不同的 AI 工具：

```
Pane 1 (Claude Code)："审查 auth 模块的安全性"
Pane 2 (Codex)："为提升性能而重构工具函数"
Pane 3 (Claude Code)："为 checkout 流程编写 E2E 测试"
```

### 模式 5：代码审查流水线

并行的审查视角：

```
Pane 1："审查 src/api/ 的安全漏洞"
Pane 2："审查 src/api/ 的性能问题"
Pane 3："审查 src/api/ 的测试覆盖缺口"

# 将所有审查结果合并为一份报告
```

## 最佳实践

1. **仅限独立任务。** 不要并行化相互依赖输出的任务。
2. **明确的边界。** 每个 pane 应处理不同的文件或关注点。
3. **策略性地合并。** 合并前先审查各 pane 的输出，以避免冲突。
4. **使用 git worktree。** 对于容易产生文件冲突的工作，每个 pane 使用独立的 worktree。
5. **资源意识。** 每个 pane 都会消耗 API token —— 将 pane 总数控制在 5-6 个以内。

## Git Worktree 集成

对于涉及重叠文件的任务：

```bash
# 创建 worktree 以实现隔离
git worktree add -b feat/auth ../feature-auth HEAD
git worktree add -b feat/billing ../feature-billing HEAD

# 在独立的 worktree 中运行 agent
# Pane 1: cd ../feature-auth && claude
# Pane 2: cd ../feature-billing && claude

# 完成后合并分支
git merge feat/auth
git merge feat/billing
```

## 互补工具

| 工具 | 作用 | 使用时机 |
|------|------|----------|
| **dmux** | 面向 agent 的 tmux pane 管理 | 并行 agent 会话 |
| **Superset** | 支持 10+ 并行 agent 的终端 IDE | 大规模编排 |
| **Claude Code Task tool** | 进程内 subagent 生成 | session 内的编程式并行化 |
| **Codex multi-agent** | 内置 agent 角色 | Codex 专用的并行工作 |

## ECC 助手

ECC 现在包含一个助手，用于通过独立的 git worktree 进行外部 tmux pane 编排：

```bash
node scripts/orchestrate-worktrees.js plan.json --execute
```

示例 `plan.json`：

```json
{
  "sessionName": "skill-audit",
  "baseRef": "HEAD",
  "launcherCommand": "codex exec --cwd {worktree_path} --task-file {task_file}",
  "workers": [
    { "name": "docs-a", "task": "Fix skills 1-4 and write handoff notes." },
    { "name": "docs-b", "task": "Fix skills 5-8 and write handoff notes." }
  ]
}
```

该助手会：
- 为每个 worker 创建一个基于分支的 git worktree
- 可选地将主 checkout 中选定的 `seedPaths` 叠加到每个 worker 的 worktree 中
- 在 `.orchestration/<session>/` 下为每个 worker 写入 `task.md`、`handoff.md` 和 `status.md` 文件
- 启动一个 tmux session，每个 worker 对应一个 pane
- 在各自的 pane 中启动每个 worker 命令
- 保留主 pane 供 orchestrator 使用

当 worker 需要访问尚未纳入 `HEAD` 的脏文件或未跟踪的本地文件（例如本地编排脚本、草稿计划或文档）时，请使用 `seedPaths`：

```json
{
  "sessionName": "workflow-e2e",
  "seedPaths": [
    "scripts/orchestrate-worktrees.js",
    "scripts/lib/tmux-worktree-orchestrator.js",
    ".claude/plan/workflow-e2e-test.json"
  ],
  "launcherCommand": "bash {repo_root}/scripts/orchestrate-codex-worker.sh {task_file} {handoff_file} {status_file}",
  "workers": [
    { "name": "seed-check", "task": "Verify seeded files are present before starting work." }
  ]
}
```

## 故障排除

- **Pane 无响应：** 直接切换到该 pane，或使用 `tmux capture-pane -pt <session>:0.<pane-index>` 检查它。
- **合并冲突：** 使用 git worktree 为每个 pane 隔离文件变更。
- **token 消耗过高：** 减少并行 pane 的数量。每个 pane 都是一个完整的 agent session。
- **找不到 tmux：** 使用 `brew install tmux` (macOS) 或 `apt install tmux` (Linux) 安装。
