---
paths:
  - "**/*.component.ts"
  - "**/*.component.html"
  - "**/*.service.ts"
  - "**/*.directive.ts"
  - "**/*.pipe.ts"
  - "**/*.spec.ts"
---
# Angular Hooks

> 本文件扩展了 [common/hooks.md](../common/hooks.md)，增加了 Angular 特定内容。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **Prettier**：编辑后自动格式化 `.ts` 和 `.html` 文件
- **ESLint / ng lint**：编辑 Angular 源文件后运行 `ng lint`，以捕获 decorator 误用、template 错误和样式违规
- **TypeScript 检查**：编辑 `.ts` 文件后运行 `tsc --noEmit`
- **构建检查**：生成或显著修改 Angular 代码后运行 `ng build`，以尽早捕获 template 和类型错误

## Stop Hooks

- **Lint 审计**：会话结束前对已修改文件运行 `ng lint`，以捕获任何遗留的违规
