---
description: 以安全默认值和明确的停止条件启动托管的 autonomous loop 模式。
---

# Loop Start 命令

以安全默认值启动托管的 autonomous loop 模式。

## 用法

`/loop-start [pattern] [--mode safe|fast]`

- `pattern`：`sequential`、`continuous-pr`、`rfc-dag`、`infinite`
- `--mode`：
  - `safe`（默认）：严格的 quality gate 与检查点
  - `fast`：为提升速度减少 gate

## 流程

1. 确认仓库状态与分支策略。
2. 选择 loop 模式与 model tier 策略。
3. 为所选模式启用必需的 hooks/profile。
4. 创建 loop plan 并将 runbook 写入 `.claude/plans/` 下。
5. 打印用于启动和监控 loop 的命令。

## 必需的安全检查

- 验证测试在首次 loop 迭代前通过。
- 确保 `ECC_HOOK_PROFILE` 未被全局禁用。
- 确保 loop 具有明确的停止条件。

## 参数

$ARGUMENTS:
- `<pattern>` 可选（`sequential|continuous-pr|rfc-dag|infinite`）
- `--mode safe|fast` 可选
