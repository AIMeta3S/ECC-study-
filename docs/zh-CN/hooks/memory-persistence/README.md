# 记忆持久化 Hooks

这些 lifecycle hook 定义记录了 ECC 针对 Claude Code plugin 安装和手动安装的记忆持久化契约。

可执行实现位于 `scripts/hooks/`：

- `session-start.js` 加载有界的先前 context，检测项目状态，并准备 session 元数据。
- `pre-compact.js` 在 context compaction 之前捕获状态。
- `session-end.js` 在 transcript 元数据可用时持久化 session 结束摘要。
- `observe-runner.js` 记录 tool-use 观察结果，用于持续学习。
- `session-activity-tracker.js` 记录 tool 使用和文件活动，用于 ECC2 状态和 observability。

已安装的 hook 图仍是 `hooks/hooks.json`。此目录是稳定的、人类可读的生命周期定义层，被 harness audit 和长篇文档引用。

## 生命周期契约

| 事件 | Hook | 用途 | 阻塞 |
|---|---|---|---|
| `SessionStart` | `session:start` | 加载有界的先前 context 和项目元数据 | 否 |
| `PreCompact` | `pre:compact` | 在 compaction 前保存状态 | 否 |
| `PreToolUse` | `pre:observe:continuous-learning` | 捕获 tool 意图以供学习信号 | 否 |
| `PostToolUse` | `post:observe:continuous-learning` | 捕获 tool 结果以供学习信号 | 否 |
| `PostToolUse` | `post:session-activity-tracker` | 记录 tool 和文件活动以供 ECC2 指标 | 否 |
| `Stop` | `stop:format-typecheck` | 编辑后的批量 quality gate | 是，hook 失败时 |
| `Stop` | `stop:check-console-log` | 审计修改过的文件以检查 debug 日志 | 根据 hook 输出给出 warn/error |

## 运维者期望

- 默认将持久化保留在本地。
- 除非用户显式启用集成，否则避免将 transcript 或 tool trace 发送到托管服务。
- 使用 `ECC_SESSION_START_MAX_CHARS` 限定 session 启动时加载的 context。
- 允许通过 `ECC_SESSION_START_CONTEXT=off` 选择退出。
- 通过 `ECC_HOOK_PROFILE` 和 `ECC_DISABLED_HOOKS` 保持 lifecycle hook 受 profile 门控。

## 相关文件

- `hooks/hooks.json`
- `hooks/README.md`
- `scripts/hooks/session-start.js`
- `scripts/hooks/pre-compact.js`
- `scripts/hooks/session-end.js`
- `scripts/hooks/observe-runner.js`
- `scripts/hooks/session-activity-tracker.js`
- `docs/architecture/observability-readiness.md`
