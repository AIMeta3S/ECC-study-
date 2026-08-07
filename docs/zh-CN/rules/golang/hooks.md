---
paths:
  - "**/*.go"
  - "**/go.mod"
  - "**/go.sum"
---
# Go Hooks

> 本文件用 Go 特定内容扩展 [common/hooks.md](../common/hooks.md)。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **gofmt/goimports**：编辑后自动格式化 `.go` 文件
- **go vet**：编辑 `.go` 文件后运行静态分析
- **staticcheck**：对已修改的包运行扩展静态检查
