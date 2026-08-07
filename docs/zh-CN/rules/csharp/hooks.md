---
paths:
  - "**/*.cs"
  - "**/*.csx"
  - "**/*.csproj"
  - "**/*.sln"
  - "**/Directory.Build.props"
  - "**/Directory.Build.targets"
---
# C# Hooks

> 本文件用 C# 专属内容对 [common/hooks.md](../common/hooks.md) 进行扩展。

## PostToolUse Hooks

在 `~/.claude/settings.json` 中配置：

- **dotnet format**：自动格式化已编辑的 C# 文件并应用 analyzer 修复
- **dotnet build**：验证编辑后 solution 或 project 仍可编译
- **dotnet test --no-build**：在行为变更后重新运行最近的相应 test project

## Stop Hooks

- 在包含大范围 C# 改动的 session 结束前，运行一次最终的 `dotnet build`
- 在 `appsettings*.json` 文件被修改时发出警告，以免 secrets 被提交
