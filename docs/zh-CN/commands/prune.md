---
name: prune
description: 删除超过 30 天且从未被晋升的 pending instinct
command: true
---

# 清理 Pending Instinct

移除那些自动生成但从未被审查或晋升的已过期 pending instinct。

## 实现

使用 plugin 根路径运行 instinct CLI：

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" prune
```

或者如果未设置 `CLAUDE_PLUGIN_ROOT`（手动安装）：

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py prune
```

## 用法

```
/prune                    # 删除超过 30 天的 instinct
/prune --max-age 60      # 自定义过期阈值（天）
/prune --dry-run         # 预览而不删除
```
