---
name: projects
description: 列出已知项目及其 instinct 统计信息
command: true
---

# Projects 命令

列出 continuous-learning-v2 的项目注册表条目以及每个项目的 instinct/observation 计数。

## 实现

使用 plugin 根路径运行 instinct CLI：

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" projects
```

或者如果未设置 `CLAUDE_PLUGIN_ROOT`（手动安装）：

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py projects
```

## 用法

```bash
/projects
```

## 操作步骤

1. 读取 `~/.claude/homunculus/projects.json`
2. 对于每个项目，显示：
   - 项目名称、id、root、remote
   - 个人和继承的 instinct 计数
   - observation 事件计数
   - 最后活跃 timestamp
3. 同时显示全局 instinct 总数
