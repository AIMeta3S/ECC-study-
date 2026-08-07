---
paths:
  - "**/*.pl"
  - "**/*.pm"
  - "**/*.t"
  - "**/*.psgi"
  - "**/*.cgi"
---
# Perl Hooks

> 本文件用 Perl 特定内容扩展 [common/hooks.md](../common/hooks.md)。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **perltidy**：编辑后自动格式化 `.pl` 和 `.pm` 文件
- **perlcritic**：编辑 `.pm` 文件后运行 lint 检查

## Warnings

- 对非脚本 `.pm` 文件中的 `print` 发出警告 — 改用 `say` 或日志模块（如 `Log::Any`）
