---
name: projects
description: 列出已知项目及其 instinct 统计信息
command: true
---

# Projects 命令

列出 continuous-learning-v2 的项目注册表条目以及每个项目的 instinct/observation 计数。

## Implementation
运行 instinct CLI：
- 如果 `CLAUDE_PLUGIN_ROOT` 已设置，使用 plugin 根路径：

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" projects
```

- 如果 `CLAUDE_PLUGIN_ROOT` 未设置（手动安装）：

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py projects
```

## Usage

```bash
/projects
```

## What to Do

1. 读取 `${XDG_DATA_HOME:-~/.local/share}/ecc-homunculus/projects.json`
2. 对于每个项目，显示：
   - Project name, id, root, remote
   - Personal and inherited instinct counts
   - Observation event count
   - Last seen timestamp
3. 同时显示全局 instinct 总数
