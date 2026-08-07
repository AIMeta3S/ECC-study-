---
name: jira-integration
description: 当获取 Jira ticket、分析需求、更新 ticket 状态、添加评论或流转 issue 时，使用此 skill。通过 MCP 或直接 REST 调用提供 Jira API 模式。
metadata:
  origin: ECC
---

# Jira 集成 Skill

直接从你的 AI 编码工作流中获取、分析并更新 Jira ticket。同时支持 **基于 MCP**（推荐）和 **直接 REST API** 两种方式。

## 何时激活

- 获取 Jira ticket 以理解需求
- 从 ticket 中提取可测试的验收标准
- 为 Jira issue 添加进度评论
- 流转 ticket 状态（To Do → In Progress → Done）
- 将 merge request 或 branch 关联到 Jira issue
- 通过 JQL 查询搜索 issue

## 前置条件

### 选项 A：MCP Server（推荐）

安装 `mcp-atlassian` MCP server。这会将 Jira 工具直接暴露给你的 AI agent。

**要求：**
- Python 3.10+
- `uvx`（来自 `uv`），通过你的包管理器或官方 `uv` 安装文档进行安装

**添加到你的 MCP 配置中**（例如 `~/.claude.json` → `mcpServers`）：

```json
{
  "jira": {
    "command": "uvx",
    "args": ["mcp-atlassian==0.21.0"],
    "env": {
      "JIRA_URL": "https://YOUR_ORG.atlassian.net",
      "JIRA_EMAIL": "your.email@example.com",
      "JIRA_API_TOKEN": "your-api-token"
    },
    "description": "Jira issue tracking — search, create, update, comment, transition"
  }
}
```

> **安全：** 切勿硬编码 secret。优先在系统环境变量（或 secret 管理器）中设置 `JIRA_URL`、`JIRA_EMAIL` 和 `JIRA_API_TOKEN`。仅在本地未提交的配置文件中使用 MCP `env` 块。

**获取 Jira API token：**
1. 访问 <https://id.atlassian.com/manage-profile/security/api-tokens>
2. 点击 **Create API token**
3. 复制 token —— 将其存储在你的环境变量中，切勿放入源代码中

### 选项 B：直接 REST API

如果 MCP 不可用，可通过 `curl` 或辅助脚本直接使用 Jira REST API v3。

**所需的环境变量：**

| 变量 | 说明 |
|----------|-------------|
| `JIRA_URL` | 你的 Jira 实例 URL（例如 `https://yourorg.atlassian.net`） |
| `JIRA_EMAIL` | 你的 Atlassian 账户邮箱 |
| `JIRA_API_TOKEN` | 来自 id.atlassian.com 的 API token |

将这些信息存储在你的 shell 环境变量、secret 管理器或未被追踪的本地 env 文件中。切勿将它们提交到仓库。

对于直接使用 `curl` 的示例，通过在 stdin 上传递 Jira 用户配置，避免将凭据放在命令行参数中：

```bash
jira_curl() {
  printf 'user = "%s:%s"\n' "$JIRA_EMAIL" "$JIRA_API_TOKEN" |
    curl -s -K - "$@"
}
```

## MCP Tools 参考

当配置了 `mcp-atlassian` MCP server 后，即可使用以下 tools：

| Tool | 用途 | 示例 |
|------|---------|---------|
| `jira_search` | JQL 查询 | `project = PROJ AND status = "In Progress"` |
| `jira_get_issue` | 按 key 获取完整 issue 详情 | `PROJ-1234` |
| `jira_create_issue` | 创建 issue（Task、Bug、Story、Epic） | 新 bug 报告 |
| `jira_update_issue` | 更新字段（summary、description、assignee） | 更改 assignee |
| `jira_transition_issue` | 更改状态 | 移动到 "In Review" |
| `jira_add_comment` | 添加评论 | 进度更新 |
| `jira_get_sprint_issues` | 列出 sprint 中的 issue | 活跃 sprint 评审 |
| `jira_create_issue_link` | 关联 issue（Blocks、Relates to） | 依赖追踪 |
| `jira_get_issue_development_info` | 查看关联的 PR、branch、commit | 开发上下文 |

> **提示：** 在执行流转之前始终调用 `jira_get_transitions` —— transition ID 因项目工作流而异。

## 直接 REST API 参考

### 获取 Ticket

```bash
jira_curl \
  -H "Content-Type: application/json" \
  "$JIRA_URL/rest/api/3/issue/PROJ-1234" | jq '{
    key: .key,
    summary: .fields.summary,
    status: .fields.status.name,
    priority: .fields.priority.name,
    type: .fields.issuetype.name,
    assignee: .fields.assignee.displayName,
    labels: .fields.labels,
    description: .fields.description
  }'
```

### 获取评论

```bash
jira_curl \
  -H "Content-Type: application/json" \
  "$JIRA_URL/rest/api/3/issue/PROJ-1234?fields=comment" | jq '.fields.comment.comments[] | {
    author: .author.displayName,
    created: .created[:10],
    body: .body
  }'
```

### 添加评论

```bash
jira_curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "version": 1,
      "type": "doc",
      "content": [{
        "type": "paragraph",
        "content": [{"type": "text", "text": "Your comment here"}]
      }]
    }
  }' \
  "$JIRA_URL/rest/api/3/issue/PROJ-1234/comment"
```

### 流转 Ticket

```bash
# 1. 获取可用的 transition
jira_curl \
  "$JIRA_URL/rest/api/3/issue/PROJ-1234/transitions" | jq '.transitions[] | {id, name: .name}'

# 2. 执行 transition（替换 TRANSITION_ID）
jira_curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"transition": {"id": "TRANSITION_ID"}}' \
  "$JIRA_URL/rest/api/3/issue/PROJ-1234/transitions"
```

### 使用 JQL 搜索

```bash
jira_curl -G \
  --data-urlencode "jql=project = PROJ AND status = 'In Progress'" \
  "$JIRA_URL/rest/api/3/search"
```

## 分析 Ticket

在获取 ticket 用于开发或测试自动化时，提取以下内容：

### 1. 可测试的需求
- **功能需求** —— 功能的作用
- **验收标准** —— 必须满足的条件
- **可测试的行为** —— 具体的动作和预期结果
- **用户角色** —— 谁使用此功能及其权限
- **数据需求** —— 所需的数据
- **集成点** —— 涉及的 API、服务或系统

### 2. 所需的测试类型
- **Unit tests** —— 个别函数和工具
- **Integration tests** —— API 端点和服务交互
- **E2E tests** —— 面向用户的 UI 流程
- **API tests** —— 端点契约和错误处理

### 3. 边界场景与错误场景
- 无效输入（空、过长、特殊字符）
- 未授权访问
- 网络失败或超时
- 并发用户或竞态条件
- 边界条件
- 缺失或 null 数据
- 状态流转（后退导航、刷新等）

### 4. 结构化分析输出

```
Ticket: PROJ-1234
Summary: [ticket title]
Status: [current status]
Priority: [High/Medium/Low]
Test Types: Unit, Integration, E2E

Requirements:
1. [requirement 1]
2. [requirement 2]

Acceptance Criteria:
- [ ] [criterion 1]
- [ ] [criterion 2]

Test Scenarios:
- Happy Path: [description]
- Error Case: [description]
- Edge Case: [description]

Test Data Needed:
- [data item 1]
- [data item 2]

Dependencies:
- [dependency 1]
- [dependency 2]
```

## 更新 Ticket

### 何时更新

| 工作流步骤 | Jira 更新 |
|---|---|
| 开始工作 | 流转到 "In Progress" |
| 测试编写完成 | 评论附上测试覆盖率摘要 |
| 创建 branch | 评论附上 branch 名称 |
| 创建 PR/MR | 评论附上链接，关联 issue |
| 测试通过 | 评论附上结果摘要 |
| PR/MR 合并 | 流转到 "Done" 或 "In Review" |

### 评论模板

**开始工作：**
```
Starting implementation for this ticket.
Branch: feat/PROJ-1234-feature-name
```

**测试已实现：**
```
Automated tests implemented:

Unit Tests:
- [test file 1] — [what it covers]
- [test file 2] — [what it covers]

Integration Tests:
- [test file] — [endpoints/flows covered]

All tests passing locally. Coverage: XX%
```

**PR 已创建：**
```
Pull request created:
[PR Title](https://github.com/org/repo/pull/XXX)

Ready for review.
```

**工作完成：**
```
Implementation complete.

PR merged: [link]
Test results: All passing (X/Y)
Coverage: XX%
```

## 安全指南

- **切勿**在源代码或 skill 文件中**硬编码** Jira API token
- **始终使用**环境变量或 secret 管理器
- 在每个项目中**将 `.env` 加入** `.gitignore`
- 如果 token 在 git 历史中泄露，立即**轮换 token**
- **使用最小权限**的 API token，限定在所需项目范围内
- 在发起 API 调用前**验证**凭据已设置 —— 若未设置则快速失败并给出清晰提示

## 故障排查

| 错误 | 原因 | 修复 |
|---|---|---|
| `401 Unauthorized` | 无效或过期的 API token | 在 id.atlassian.com 重新生成 |
| `403 Forbidden` | token 缺少项目权限 | 检查 token scope 和项目访问权限 |
| `404 Not Found` | ticket key 或 base URL 错误 | 验证 `JIRA_URL` 和 ticket key |
| `spawn uvx ENOENT` | IDE 无法在 PATH 上找到 `uvx` | 使用完整路径（例如 `~/.local/bin/uvx`）或在 `~/.zprofile` 中设置 PATH |
| 连接超时 | 网络/VPN 问题 | 检查 VPN 连接和防火墙规则 |

## 最佳实践

- 随时更新 Jira，而不是全部留到最后一起做
- 保持评论简洁但信息丰富
- 使用链接而非复制 —— 指向 PR、测试报告和 dashboard
- 如果需要他人输入，使用 @mentions
- 在开始之前，检查关联的 issue 以理解完整的功能范围
- 如果验收标准模糊，在编写代码之前先请求澄清
