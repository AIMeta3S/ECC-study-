---
description: 检查活跃循环的状态、进度、失败信号以及建议的干预措施。
---

# Loop Status 命令

检查活跃循环的状态、进度和失败信号。

该 slash command 只能在当前 session 将其出队后运行。如果需要检查卡住的或同级的 session，请在另一个 terminal 中运行打包的 CLI：

```bash
npx --package ecc-universal ecc loop-status --json
```

该 CLI 会扫描 `~/.claude/projects/**` 下的本地 Claude transcript JSONL 文件，并报告过期的 `ScheduleWakeup` 调用或没有匹配 `tool_result` 的 `Bash` tool 调用。

## 用法

`/loop-status [--watch]`

## 报告内容

- 活跃的循环模式
- 当前阶段和最后一次成功的 checkpoint
- 失败的检查项（如有）
- 预估的时间/成本偏差
- 建议的干预措施（继续/暂停/停止）

## 跨 Session CLI

- `ecc loop-status --json` 输出近期本地 Claude transcript 的机器可读状态。
- `ecc loop-status --home <dir>` 在检查另一个本地 profile 或挂载的 workspace 时，扫描不同的主目录。
- `ecc loop-status --transcript <session.jsonl>` 直接检查单个 transcript。
- `ecc loop-status --bash-timeout-seconds 1800` 调整过期 Bash 的 threshold。
- `ecc loop-status --exit-code` 当发现过期循环或 tool 信号时以 `2` 退出，当 transcript 无法扫描时以 `1` 退出。
- `--exit-code` 与 `--watch` 一起使用时需要 `--watch-count`，以便 watchdog 脚本不会无限等待进程退出。
- `ecc loop-status --watch` 持续刷新状态直到被中断。
- `ecc loop-status --watch --watch-count 3 --exit-code` 刷新限定次数后，以观察到的最高状态码退出。
- `ecc loop-status --watch --watch-count 3` 为脚本和 handoff 输出有界的 watch 流。
- `ecc loop-status --watch --write-dir ~/.claude/loops` 为同级 terminal 或 watchdog 脚本维护 `index.json` 和按 session 的 JSON 快照。

## Watch 模式

当存在 `--watch` 时，定期刷新状态。配合 `--json` 时，每次刷新以每行一个 JSON 对象的形式输出，以便另一个 terminal 或脚本可以消费该流。

## 快照文件

当独立进程需要检查循环状态而无需等待当前 Claude session 将 `/loop-status` 出队时，使用 `--write-dir <dir>`。该 CLI 会写入：

- `index.json`，每个被检查的 session 一行。
- `<session-id>.json`，包含该 session 的完整状态 payload。

这些文件是本地 transcript 分析的快照。它们不会控制或让 Claude Code 运行时的 tool 调用超时。

## 参数

$ARGUMENTS:
- `--watch` 可选
