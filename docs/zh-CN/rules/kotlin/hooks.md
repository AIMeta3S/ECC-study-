---
paths:
  - "**/*.kt"
  - "**/*.kts"
  - "**/build.gradle.kts"
---
# Kotlin Hooks

> 本文件扩展了 [common/hooks.md](../common/hooks.md)，增加 Kotlin 特定内容。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **ktfmt/ktlint**：编辑后自动格式化 `.kt` 和 `.kts` 文件
- **detekt**：编辑 Kotlin 文件后运行静态分析
- **./gradlew build**：改动后验证编译
