---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Hooks

> 本文件在 [common/hooks.md](../common/hooks.md) 基础上补充 Python 特定内容。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **black/ruff**：编辑后自动格式化 `.py` 文件
- **mypy/pyright**：编辑 `.py` 文件后运行类型检查

## Warnings

- 警告已编辑文件中的 `print()` 语句（改用 `logging` 模块）
