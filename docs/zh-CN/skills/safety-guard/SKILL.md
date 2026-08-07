---
name: safety-guard
description: 当在生产系统上工作或自主运行 agent 时，使用此 skill 来阻止破坏性操作。
metadata:
  origin: ECC
---

# Safety Guard — 阻止破坏性操作

## 何时使用

- 在生产系统上工作时
- 当 agent 自主运行时（full-auto 模式）
- 当你想将编辑限制在特定目录时
- 在敏感操作期间（migration、deploy、数据变更）

## 工作原理

三种保护模式：

### 模式 1：Careful Mode

在执行前拦截破坏性命令并给出警告：

```
Watched patterns:
- rm -rf (especially /, ~, or project root)
- git push --force
- git reset --hard
- git checkout . (discard all changes)
- DROP TABLE / DROP DATABASE
- docker system prune
- kubectl delete
- chmod 777
- sudo rm
- npm publish (accidental publishes)
- Any command with --no-verify
```

检测到时：展示该命令的作用，请求确认，并建议更安全的替代方案。

### 模式 2：Freeze Mode

将文件编辑锁定到特定目录树：

```
/safety-guard freeze src/components/
```

在 `src/components/` 之外的任何 Write/Edit 都会被阻止并给出说明。当你希望 agent 专注于某个区域而不触碰无关代码时非常有用。

### 模式 3：Guard Mode（Careful + Freeze 的组合）

两种保护同时启用。为自主运行的 agent 提供最高安全性。

```
/safety-guard guard --dir src/api/ --allow-read-all
```

Agent 可以读取任何内容，但只能写入 `src/api/`。破坏性命令在任何地方都会被阻止。

### 解除锁定

```
/safety-guard off
```

## 实现原理

使用 PreToolUse hook 拦截 Bash、Write、Edit 和 MultiEdit tool 调用。在允许执行之前，根据当前生效的规则检查命令/路径。

## 集成

- 对 `codex -a never` 会话默认启用
- 与 ECC 2.0 的可观测性风险评分配合使用
- 将所有被阻止的操作记录到 `~/.claude/safety-guard.log`
