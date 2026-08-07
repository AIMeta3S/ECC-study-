---
name: promote
description: 将项目 scope 的 instincts 提升为全局 scope
command: true
---

# Promote 命令

在 continuous-learning-v2 中将 instincts 从项目 scope 提升到全局 scope。

## 实现

使用 plugin 根路径运行 instinct CLI：

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" promote [instinct-id] [--force] [--dry-run]
```

或者如果未设置 `CLAUDE_PLUGIN_ROOT`（手动安装）：

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py promote [instinct-id] [--force] [--dry-run]
```

## 用法

```bash
/promote                      # 自动检测提升候选
/promote --dry-run            # 预览自动提升的候选
/promote --force              # 无需确认，提升所有符合条件的候选
/promote grep-before-edit     # 从当前项目提升一个特定的 instinct
```

## 操作步骤

1. 检测当前项目
2. 如果提供了 `instinct-id`，则只提升该 instinct（如果存在于当前项目中）
3. 否则，查找符合以下条件的跨项目候选：
   - 至少出现在 2 个项目中
   - 满足 confidence threshold
4. 将已提升的 instincts 写入 `~/.claude/homunculus/instincts/personal/`，并设置 `scope: global`
