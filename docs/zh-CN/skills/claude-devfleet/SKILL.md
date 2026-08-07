---
name: claude-devfleet
description: 通过 Claude DevFleet 编排多 agent 编码任务——规划项目、在隔离的 worktree 中并行 dispatch agent、监控进度，并读取结构化报告。
metadata:
  origin: community
---

# Claude DevFleet 多 Agent 编排

## 何时使用

当你需要 dispatch 多个 Claude Code agent 并行处理编码任务时使用此 skill。每个 agent 在一个隔离的 git worktree 中运行，并具备完整的工具能力。

## 安装

DevFleet server 是一个独立的项目，并未随 ECC 一起打包。请先从其仓库安装并运行：<https://github.com/LEC-AI/claude-devfleet>

然后通过 MCP 连接正在运行的实例：
```bash
claude mcp add devfleet --transport http http://localhost:18801/mcp
```

首次使用前，请确认监听 18801 端口的进程是你所安装的 DevFleet 二进制文件（关于 localhost MCP server 参见 SECURITY.md）。

## 工作原理

```
User → "Build a REST API with auth and tests"
  ↓
plan_project(prompt) → project_id + mission DAG
  ↓
Show plan to user → get approval
  ↓
dispatch_mission(M1) → Agent 1 spawns in worktree
  ↓
M1 completes → auto-merge → auto-dispatch M2 (depends_on M1)
  ↓
M2 completes → auto-merge
  ↓
get_report(M2) → files_changed, what_done, errors, next_steps
  ↓
Report back to user
```

### 工具

| 工具 | 用途 |
|------|------|
| `plan_project(prompt)` | AI 将一段描述拆解为一个由链式 mission 组成的项目 |
| `create_project(name, path?, description?)` | 手动创建一个项目，返回 `project_id` |
| `create_mission(project_id, title, prompt, depends_on?, auto_dispatch?)` | 添加一个 mission。`depends_on` 是 mission ID 字符串列表（例如 `["abc-123"]`）。设置 `auto_dispatch=true` 可在依赖满足时自动启动。 |
| `dispatch_mission(mission_id, model?, max_turns?)` | 在一个 mission 上启动一个 agent |
| `cancel_mission(mission_id)` | 停止一个正在运行的 agent |
| `wait_for_mission(mission_id, timeout_seconds?)` | 阻塞直到某个 mission 完成（见下文说明） |
| `get_mission_status(mission_id)` | 在不阻塞的情况下检查 mission 进度 |
| `get_report(mission_id)` | 读取结构化报告（变更的文件、是否经过测试、错误、后续步骤） |
| `get_dashboard()` | 系统总览：正在运行的 agent、统计数据、最近活动 |
| `list_projects()` | 浏览所有项目 |
| `list_missions(project_id, status?)` | 列出某个项目中的 mission |

> **关于 `wait_for_mission` 的说明：** 该调用会阻塞对话最长 `timeout_seconds`（默认 600）。对于长时间运行的 mission，建议改用 `get_mission_status` 每 30–60 秒轮询一次，以便用户能看到进度更新。

### 工作流：Plan → Dispatch → Monitor → Report

1. **Plan**：调用 `plan_project(prompt="...")` → 返回 `project_id` + 一个 mission 列表，其中带有 `depends_on` 链且已设置 `auto_dispatch=true`。
2. **展示计划**：向用户呈现 mission 的标题、类型以及依赖链。
3. **Dispatch**：对根 mission（`depends_on` 为空）调用 `dispatch_mission(mission_id=<first_mission_id>)`。其余 mission 会在各自依赖完成时自动 dispatch（因为 `plan_project` 已为它们设置 `auto_dispatch=true`）。
4. **Monitor**：调用 `get_mission_status(mission_id=...)` 或 `get_dashboard()` 检查进度。
5. **Report**：当 mission 完成时调用 `get_report(mission_id=...)`。向用户分享要点。

### 并发

DevFleet 默认最多同时运行 3 个并发 agent（可通过 `DEVFLEET_MAX_AGENTS` 配置）。当所有 slot 都已占满时，设置了 `auto_dispatch=true` 的 mission 会进入 mission watcher 的队列，并在 slot 空出时自动 dispatch。可通过 `get_dashboard()` 查看当前 slot 的占用情况。

## 示例

### 全自动：规划并启动

1. `plan_project(prompt="...")` → 展示包含 mission 和依赖的计划。
2. Dispatch 第一个 mission（即 `depends_on` 为空的那个）。
3. 其余 mission 会在依赖解除后自动 dispatch（它们都带有 `auto_dispatch=true`）。
4. 反馈项目 ID 和 mission 数量，让用户知道启动了什么。
5. 定期用 `get_mission_status` 或 `get_dashboard()` 轮询，直到所有 mission 进入终止状态（`completed`、`failed` 或 `cancelled`）。
6. 对每个处于终止状态的 mission 执行 `get_report(mission_id=...)`——总结成功项，并对失败项给出错误信息和后续步骤。

### 手动：逐步控制

1. `create_project(name="My Project")` → 返回 `project_id`。
2. 为第一个（根）mission 调用 `create_mission(project_id=project_id, title="...", prompt="...", auto_dispatch=true)` → 捕获 `root_mission_id`。
   为每个后续 task 调用 `create_mission(project_id=project_id, title="...", prompt="...", auto_dispatch=true, depends_on=["<root_mission_id>"])`。
3. 对第一个 mission 执行 `dispatch_mission(mission_id=...)` 以启动整条链。
4. 完成后执行 `get_report(mission_id=...)`。

### 顺序执行并审查

1. `create_project(name="...")` → 获得 `project_id`。
2. `create_mission(project_id=project_id, title="Implement feature", prompt="...")` → 获得 `impl_mission_id`。
3. `dispatch_mission(mission_id=impl_mission_id)`，然后用 `get_mission_status` 轮询直到完成。
4. `get_report(mission_id=impl_mission_id)` 审查结果。
5. `create_mission(project_id=project_id, title="Review", prompt="...", depends_on=[impl_mission_id], auto_dispatch=true)` —— 由于依赖已满足，该 mission 会自动启动。

## 指南

- 在 dispatch 之前务必先与用户确认计划，除非用户已表示可以直接进行。
- 报告状态时需带上 mission 的标题和 ID。
- 如果某个 mission 失败，请先读取其报告再重试。
- 在批量 dispatch 之前，先通过 `get_dashboard()` 检查 agent slot 是否可用。
- mission 的依赖关系构成一个 DAG——不要创建循环依赖。
- 每个 agent 都在隔离的 git worktree 中运行，并在完成时自动 merge。如果发生 merge conflict，变更会保留在 agent 的 worktree branch 上，等待手动解决。
- 手动创建 mission 时，若希望它在依赖完成后自动触发，务必设置 `auto_dispatch=true`。缺少该 flag 的 mission 会保持在 `draft` 状态。
