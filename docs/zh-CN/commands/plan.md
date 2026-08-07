---
description: 重述需求、评估风险，并创建分步实现计划。在改动任何代码之前，必须等待用户确认。
argument-hint: "[功能描述 | path/to/*.prd.md]"
---

# Plan 命令

此命令会在编写任何代码之前创建一份全面的实现计划。它接受自由格式的需求或 PRD markdown 文件。

默认以内联方式运行。默认不要调用 Task tool 或任何 subagent。这能让 `/plan` 在只附带 commands 而不含 agent 文件的 plugin 安装中也可使用。

## 此命令的作用

1. **重述需求** - 澄清需要构建什么
2. **识别风险** - 浮现潜在的问题和阻塞项
3. **创建分步计划** - 将实现拆分为多个阶段
4. **等待确认** - 在继续之前必须获得用户批准

## 何时使用

在以下情况使用 `/plan`：
- 开始一个新功能
- 进行重大的架构变更
- 处理复杂的重构
- 多个文件/组件将受到影响
- 需求不清晰或含糊

## 工作原理

助手将会：

1. **分析请求** 并用清晰的措辞重述需求
2. 当 repo 可用时，**将计划扎根于** 相关的 codebase 模式
3. **拆分为多个阶段**，包含具体、可执行的步骤
4. **识别组件之间的依赖关系**
5. **评估风险** 和潜在的阻塞项
6. **评估复杂度**（High/Medium/Low）
7. **呈现计划** 并等待你的明确确认

## 输入模式

| 输入 | 模式 | 行为 |
|---|---|---|
| `path/to/name.prd.md` | PRD artifact mode | 读取该 PRD，选择下一个处于 pending 的 delivery milestone 或 implementation phase，并写入 `.claude/plans/{name}.plan.md` |
| 任何其他 markdown 路径 | reference mode | 读取该文件作为上下文并生成一份内联计划 |
| 自由格式文本 | conversational mode | 生成一份内联计划 |
| 空输入 | clarification mode | 询问需要计划什么 |

在 PRD artifact mode 下，如有需要则创建 `.claude/plans/`。如果 PRD 包含 `Delivery Milestones` 表，只将所选行从 `pending` 更新为 `in-progress`，并将其 `Plan` 单元格设置为生成的计划路径。如果 PRD 使用带 `Implementation Phases` 的 legacy `.claude/PRPs/prds/` 格式，读取它但不迁移路径。

## 模式扎根

在编写计划之前，搜索 codebase 以找到实现应当参照的约定。为每个相关类别捕获最相关的示例，并附带文件引用：

| 类别 | 捕获内容 |
|---|---|
| Naming | 受影响区域内的文件、函数、类型、命令或脚本命名 |
| Error handling | 失败是如何被抛出、返回、记录或被优雅处理的 |
| Logging | 日志级别、格式以及记录哪些内容 |
| Data access | Repository、service、query 或 filesystem 模式 |
| Tests | 测试文件位置、框架、fixtures 和 assertion 风格 |

如果不存在相似的代码，请明确说明。不要凭空发明模式。

## PRD Artifact 输出

当使用 `.prd.md` 文件调用时，将计划写入 `.claude/plans/{kebab-case-name}.plan.md`，使用如下结构：

````markdown
# Plan: {Feature Name}

**Source PRD**: {path}
**Selected Milestone**: {milestone or phase name}
**Complexity**: {Small | Medium | Large}

## Summary
{2-3 sentences}

## Patterns to Mirror
| Category | Source | Pattern |
|---|---|---|
| Naming | `path:line` | {short description} |
| Errors | `path:line` | {short description} |
| Tests | `path:line` | {short description} |

## Files to Change
| File | Action | Why |
|---|---|---|
| `path` | CREATE / UPDATE / DELETE | {reason} |

## Tasks
### Task 1: {name}
- **Action**: {what to do}
- **Mirror**: {pattern to follow}
- **Validate**: {command that proves correctness}

## Validation
```bash
{project-specific validation commands}
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|

## Acceptance
- [ ] All tasks complete
- [ ] Validation passes
- [ ] Patterns mirrored, not reinvented
````

在写入该 artifact 后，报告其路径，并在编写代码之前等待确认。

## 示例用法

```
User: /plan I need to add real-time notifications when markets resolve

Assistant:
# Implementation Plan: Real-Time Market Resolution Notifications

## Requirements Restatement
- Send notifications to users when markets they're watching resolve
- Support multiple notification channels (in-app, email, webhook)
- Ensure notifications are delivered reliably
- Include market outcome and user's position result

## Implementation Phases

### Phase 1: Database Schema
- Add notifications table with columns: id, user_id, market_id, type, status, created_at
- Add user_notification_preferences table for channel preferences
- Create indexes on user_id and market_id for performance

### Phase 2: Notification Service
- Create notification service in lib/notifications.ts
- Implement notification queue using BullMQ/Redis
- Add retry logic for failed deliveries
- Create notification templates

### Phase 3: Integration Points
- Hook into market resolution logic (when status changes to "resolved")
- Query all users with positions in market
- Enqueue notifications for each user

### Phase 4: Frontend Components
- Create NotificationBell component in header
- Add NotificationList modal
- Implement real-time updates via Supabase subscriptions
- Add notification preferences page

## Dependencies
- Redis (for queue)
- Email service (SendGrid/Resend)
- Supabase real-time subscriptions

## Risks
- HIGH: Email deliverability (SPF/DKIM required)
- MEDIUM: Performance with 1000+ users per market
- MEDIUM: Notification spam if markets resolve frequently
- LOW: Real-time subscription overhead

## Estimated Complexity: MEDIUM
- Backend: 4-6 hours
- Frontend: 3-4 hours
- Testing: 2-3 hours
- Total: 9-13 hours

**WAITING FOR CONFIRMATION**: Proceed with this plan? (yes/no/modify)
```

## 重要提示

**CRITICAL**：在你用 "yes" 或 "proceed" 或类似肯定回复明确确认该计划之前，此命令**不会**编写任何代码。

如果你想要修改，请回复：
- "modify: [你的修改]"
- "different approach: [替代方案]"
- "跳过第 2 阶段，先做第 3 阶段"

## 与其他命令的集成

在规划之后：
- 使用 `tdd-workflow` skill 以 test-driven development 进行实现
- 如果出现 build error，使用 `/build-fix`
- 使用 `/code-review` 来审查已完成的实现
- 使用 `/pr` 或 `/prp-pr` 来发起 pull request

> **先需要需求？** 使用 `/plan-prd` 在 `.claude/prds/{name}.prd.md` 处生成一份精简的 PRD。
>
> **需要 legacy PRP 流程？** 使用 `/prp-plan` 进行深度 PRP 规划，生成 `.claude/PRPs/` artifacts。使用 `/prp-implement` 来执行这些计划，配以严格的 validation loops。

## 可选的 Planner Agent

ECC 也提供了一个 `planner` agent，适用于包含 agent 文件的 manual installs。仅当本地 runtime 已暴露该 subagent 且用户明确要求你委托规划时才使用它。

如果 `planner` subagent 不可用，应继续以内联方式规划，而不是抛出 "Agent type 'planner' not found" 错误。

对于 manual installs，源文件位于：
`agents/planner.md`
