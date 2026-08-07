---
description: 创建 hook，通过分析对话或根据明确指令来阻止不希望出现的行为
---

通过分析对话模式或用户的明确指令，创建 hook 规则以阻止不希望出现的 Claude Code 行为。

## 用法

`/hookify [要阻止的行为的描述]`

如果未提供参数，则分析当前对话，找出值得阻止的行为。

## 工作流

### 第 1 步：收集行为信息

- 有参数时：解析用户对不希望出现的行为的描述
- 无参数时：使用 `conversation-analyzer` agent 来查找：
  - 明确的纠正
  - 对重复错误的挫败反应
  - 被回退的更改
  - 重复出现的类似问题

### 第 2 步：呈现发现

向用户展示：

- 行为描述
- 建议的事件类型
- 建议的 pattern 或 matcher
- 建议的 action

### 第 3 步：生成规则文件

为每个批准的规则，在 `.claude/hookify.{name}.local.md` 创建文件：

```yaml
---
name: rule-name
enabled: true
event: bash|file|stop|prompt|all
action: block|warn
pattern: "regex pattern"
---
Message shown when rule triggers.
```

### 第 4 步：确认

报告已创建的规则，以及如何用 `/hookify-list` 和 `/hookify-configure` 管理它们。
