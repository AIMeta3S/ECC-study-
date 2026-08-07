---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift Hooks

> 本文件扩展了 [common/hooks.md](../common/hooks.md)，增加了 Swift 特定内容。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **SwiftFormat**：在编辑后自动格式化 `.swift` 文件
- **SwiftLint**：在编辑 `.swift` 文件后运行 lint 检查
- **swift build**：在编辑后对已修改的 package 进行类型检查

## 警告

标记 `print()` 语句——生产代码应改用 `os.Logger` 或结构化 logging。
