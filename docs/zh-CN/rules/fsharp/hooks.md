---
paths:
  - "**/*.fs"
  - "**/*.fsx"
  - "**/*.fsproj"
  - "**/*.sln"
  - "**/*.slnx"
  - "**/Directory.Build.props"
  - "**/Directory.Build.targets"
---
# F# Hooks

> 本文件在 [common/hooks.md](../common/hooks.md) 基础上扩展 F# 特定内容。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **fantomas**：自动格式化已编辑的 F# 文件
- **dotnet build**：验证编辑后解决方案或项目仍可编译
- **dotnet test --no-build**：在行为变更后重新运行最近的相关测试项目

## Stop Hooks

- 在结束包含广泛 F# 变更的 session 前，运行最终的 `dotnet build`
- 当 `appsettings*.json` 文件被修改时发出警告，以免 secrets 被提交
