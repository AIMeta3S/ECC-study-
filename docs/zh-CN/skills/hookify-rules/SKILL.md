---
name: hookify-rules
description: 当用户要求创建 hookify rule、编写 hook rule、配置 hookify、添加 hookify rule，或需要 hookify rule 语法与模式方面的指导时，应使用此 skill。
---

# 编写 Hookify Rules

## 概述

Hookify rules 是带有 YAML frontmatter 的 markdown 文件，用于定义要监视的模式以及这些模式匹配时显示的消息。规则存放在 `.claude/hookify.{rule-name}.local.md` 文件中。

## 规则文件格式

### 基本结构

```markdown
---
name: rule-identifier
enabled: true
event: bash|file|stop|prompt|all
pattern: regex-pattern-here
---

Message to show Claude when this rule triggers.
Can include markdown formatting, warnings, suggestions, etc.
```

### Frontmatter 字段

| 字段 | 必填 | 取值 | 说明 |
|-------|----------|--------|-------------|
| name | 是 | kebab-case string | 唯一标识符（动词开头：warn-*、block-*、require-*） |
| enabled | 是 | true/false | 无需删除即可切换开关 |
| event | 是 | bash/file/stop/prompt/all | 哪个 hook event 触发此规则 |
| action | 否 | warn/block | warn（默认）显示消息；block 阻止操作 |
| pattern | 是* | regex string | 要匹配的模式（*复杂规则可改用 conditions） |

### 高级格式（多条件）

```markdown
---
name: warn-env-api-keys
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.env$
  - field: new_text
    operator: contains
    pattern: API_KEY
---

You're adding an API key to a .env file. Ensure this file is in .gitignore!
```

**按 event 列出的 condition 字段：**
- bash: `command`
- file: `file_path`, `new_text`, `old_text`, `content`
- prompt: `user_prompt`

**运算符：** `regex_match`, `contains`, `equals`, `not_contains`, `starts_with`, `ends_with`

所有 conditions 必须全部匹配，规则才会触发。

## Event 类型指南

### bash event

匹配 Bash 命令模式：
- 危险命令：`rm\s+-rf`, `dd\s+if=`, `mkfs`
- 提权操作：`sudo\s+`, `su\s+`
- 权限问题：`chmod\s+777`

### file event

匹配 Edit/Write/MultiEdit 操作：
- 调试代码：`console\.log\(`, `debugger`
- 安全风险：`eval\(`, `innerHTML\s*=`
- 敏感文件：`\.env$`, `credentials`, `\.pem$`

### stop event

完成检查与提醒。pattern `.*` 始终匹配。

### prompt event

匹配用户 prompt 内容，用于强制执行工作流。

## Pattern 编写技巧

### 正则表达式基础
- 转义特殊字符：`.` 转为 `\.`,`(` 转为 `\(`
- `\s` 空白字符，`\d` 数字，`\w` 单词字符
- `+` 一个或多个，`*` 零个或多个，`?` 可选
- `|` 或运算符

### 常见陷阱
- **过宽**：`log` 会匹配 "login"、"dialog" — 应使用 `console\.log\(`
- **过窄**：`rm -rf /tmp` — 应使用 `rm\s+-rf`
- **YAML 转义**：使用不带引号的 pattern；带引号的字符串需要 `\\s`

### 测试
```bash
python3 -c "import re; print(re.search(r'your_pattern', 'test text'))"
```

## 文件组织

- **位置**：项目根目录下的 `.claude/` 目录
- **命名**：`.claude/hookify.{descriptive-name}.local.md`
- **Gitignore**：将 `.claude/*.local.md` 加入 `.gitignore`

## 命令

- `/hookify [description]` - 创建新规则（无参数时自动分析对话）
- `/hookify-list` - 以表格形式查看所有规则
- `/hookify-configure` - 交互式切换规则开关
- `/hookify-help` - 完整文档

## 快速参考

最小可用规则：
```markdown
---
name: my-rule
enabled: true
event: bash
pattern: dangerous_command
---
Warning message here
```
