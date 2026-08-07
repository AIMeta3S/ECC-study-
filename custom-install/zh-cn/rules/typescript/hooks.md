---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Hooks

> 本文件扩展了 [common/hooks.md](../common/hooks.md)，添加了 TypeScript/JavaScript 特定内容。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **Prettier**：在编辑后自动格式化 JS/TS 文件
- **TypeScript check**：在编辑 `.ts`/`.tsx` 文件后运行 `tsc`
- **console.log warning**：对已编辑文件中的 `console.log` 发出警告

## Stop Hooks

- **console.log audit**：在 session 结束前检查所有已修改文件中的 `console.log`
