---
description: 获取 hookify 系统的帮助
---

显示完整的 hookify 文档。

## Hook 系统概览

Hookify 创建规则文件，与 Claude Code 的 hook 系统集成，用于防止不当行为。

### 事件类型

- `bash`：在 Bash tool 使用时触发，并匹配命令模式
- `file`：在 Write/Edit tool 使用时触发，并匹配文件路径
- `stop`：在 session 结束时触发
- `prompt`：在用户提交消息时触发，并匹配输入模式
- `all`：在所有事件发生时触发

### 规则文件格式

文件存储为 `.claude/hookify.{name}.local.md`：

```yaml
---
name: descriptive-name
enabled: true
event: bash|file|stop|prompt|all
action: block|warn
pattern: "regex pattern to match"
---
Message to display when rule triggers.
Supports multiple lines.
```

### 命令

- `/hookify [description]` 创建新规则；未提供 description 时自动分析对话
- `/hookify-list` 列出已配置的规则
- `/hookify-configure` 开启或关闭规则

### Pattern 提示

- 使用 regex 语法
- 对于 `bash`，匹配完整命令字符串
- 对于 `file`，匹配文件路径
- 部署前先测试 pattern
