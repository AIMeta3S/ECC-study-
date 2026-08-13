---
name: promote
description: 将项目 scope 的 instincts 提升为全局 scope
command: true
---

# Promote Command

在 continuous-learning-v2 中将 instincts 从项目 scope 提升到全局 scope。

## Implementation

运行 instinct CLI：

- 如果 `CLAUDE_PLUGIN_ROOT` 已设置：
```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" promote [instinct-id] [--force] [--dry-run]
```

- 如果 `CLAUDE_PLUGIN_ROOT` 未设置（手动安装）：
```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py promote [instinct-id] [--force] [--dry-run]
```

## Usage

```bash
/promote                      # 自动检测提升候选
/promote --dry-run            # 预览自动提升的候选
/promote --force              # 无需确认，提升所有符合条件的候选
/promote grep-before-edit     # 从当前项目提升一个特定的 instinct
```

## What to Do

1. 检测当前项目
2. 如果提供了 `instinct-id`，则只提升该 instinct（如果存在于当前项目中）
3. 否则，查找符合以下条件的跨项目候选：
   - 至少出现在 2 个项目中
   - 满足 confidence threshold
4. 将已提升的 instincts 写入 `${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/instincts/personal/`，并设置 `scope: global`
