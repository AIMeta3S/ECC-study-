---
description: 获取 Jira ticket、分析需求、更新状态或添加评论。使用 jira-integration skill 和 MCP 或 REST API。
---

# Jira 命令

直接在工作流中与 Jira ticket 交互——获取 ticket、分析需求、添加评论并流转状态。

## 用法

```
/jira get <TICKET-KEY>          # 获取并分析 ticket
/jira comment <TICKET-KEY>      # 添加进度评论
/jira transition <TICKET-KEY>   # 更改 ticket 状态
/jira search <JQL>              # 使用 JQL 搜索 issue
```

## 此命令的作用

1. **获取并分析** —— 获取 Jira ticket 并提取需求、验收标准、测试场景和依赖项
2. **评论** —— 向 ticket 添加结构化的进度更新
3. **流转** —— 在工作流状态之间移动 ticket（To Do → In Progress → Done）
4. **搜索** —— 使用 JQL 查询查找 issue

## 工作原理

### `/jira get <TICKET-KEY>`

1. 从 Jira 获取 ticket（通过 MCP `jira_get_issue` 或 REST API）
2. 提取所有字段：摘要、描述、验收标准、优先级、标签、关联 issue
3. 可选地获取评论以补充上下文
4. 生成结构化分析：

```
Ticket: PROJ-1234
Summary: [title]
Status: [status]
Priority: [priority]
Type: [Story/Bug/Task]

Requirements:
1. [extracted requirement]
2. [extracted requirement]

Acceptance Criteria:
- [ ] [criterion from ticket]

Test Scenarios:
- Happy Path: [description]
- Error Case: [description]
- Edge Case: [description]

Dependencies:
- [linked issues, APIs, services]

Recommended Next Steps:
- /plan to create implementation plan
- `tdd-workflow` skill to implement with tests first
```

### `/jira comment <TICKET-KEY>`

1. 总结当前 session 的进度（构建、测试、提交了什么）
2. 格式化为结构化评论
3. 发布到 Jira ticket

### `/jira transition <TICKET-KEY>`

1. 获取该 ticket 可用的 transition
2. 向用户显示选项
3. 执行所选的 transition

### `/jira search <JQL>`

1. 对 Jira 执行 JQL 查询
2. 返回匹配 issue 的汇总表格

## 前置条件

此命令需要 Jira 凭据。请选择以下一种方式：

**选项 A —— MCP Server（推荐）：**
将 `jira` 添加到你的 `mcpServers` 配置中（模板见 `mcp-configs/mcp-servers.json`）。

**选项 B —— 环境变量：**
```bash
export JIRA_URL="https://yourorg.atlassian.net"
export JIRA_EMAIL="your.email@example.com"
export JIRA_API_TOKEN="your-api-token"
```

如果缺少凭据，应停止操作并指引用户完成配置。

## 与其他命令的集成

分析 ticket 之后：
- 使用 `/plan` 根据需求创建实现计划
- 使用 `tdd-workflow` skill 通过测试驱动开发来实现
- 实现完成后使用 `/code-review`
- 使用 `/jira comment` 将进度回传到 ticket
- 工作完成后使用 `/jira transition` 流转 ticket

## 相关资源

- **Skill：** `skills/jira-integration/`
- **MCP 配置：** `mcp-configs/mcp-servers.json` → `jira`
