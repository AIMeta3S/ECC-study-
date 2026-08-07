---
name: unified-notifications-ops
description: 将通知作为一条 ECC 原生工作流，跨 GitHub、Linear、桌面告警、hooks 和已连接的通信界面统一运营。当真正的问题是告警路由、去重、升级或收件箱坍缩时使用。
metadata:
  origin: ECC
---

# 统一通知运维

当真正的问题不是缺少一次 ping 时，使用此 skill。真正的问题是碎片化的通知系统。

任务是 把分散的事件转化为一个操作者界面，具备：
- 清晰的严重度
- 清晰的归属
- 清晰的路由
- 清晰的后续动作

## 何时使用

- 用户希望跨 GitHub、Linear、本地 hooks、桌面告警、聊天或邮件建立统一通知通道
- CI 失败、审查请求、issue 更新和操作者事件正出现在彼此割裂的地方
- 当前设置制造的是噪声而非行动
- 用户希望将重叠的通知分支或 backlog 提案合并为一条 ECC 原生通道
- 工作区已有 hooks、MCPs 或已连接的工具，但没有一致的通知策略

## 首选界面

从已有的东西入手：
- GitHub 的 issues、PRs、审查、评论和 CI
- Linear 的 issue/项目流动
- 本地 hook 事件和 session 生命周期信号
- 桌面通知原语
- 当邮件/聊天界面确实存在时，使用已连接的界面

优先采用 ECC 原生 orchestration，而不是让用户采用一个单独的通知产品。

## 不可协商的规则

- 永远不要暴露 token、secret、webhook secret 或内部标识符
- 分离以下内容：
  - 事件来源
  - 严重度
  - 路由渠道
  - 操作者动作
- 当打断成本不明确时，默认采用摘要优先
- 不要把每个事件都扇出到每个渠道
- 如果真正的修复是更好的 issue 分拣、hook 策略或项目流程，请明确指出

## 事件 Pipeline

将该通道视为：

1. **捕获** 事件
2. **分类** 紧急程度和负责人
3. **路由** 到正确的渠道
4. **折叠** 重复项和低信号搅动
5. **附加** 下一个操作者动作

目标是更少、更好的通知。

## 默认严重度模型

| Class | 示例 | 默认处理 |
| --- | --- | --- |
| Critical | 默认分支 CI 中断、安全问题、发布受阻、部署失败 | 立即打断 |
| High | 收到审查请求、失败的 PR、阻塞负责人的 handoff | 当日提醒 |
| Medium | issue 状态变化、值得关注的评论、backlog 流动 | 摘要或队列 |
| Low | 重复成功、常规搅动、冗余的生命周期标记 | 抑制或折叠 |

如果工作区没有严重度模型，在提出自动化之前先建立一个。

## 工作流

### 1. 盘点当前界面

列出：
- 事件来源
- 当前渠道
- 已有的、发出告警的 hooks/scripts
- 同一事件的重复路径
- 重要事项未被呈现的静默失败情况

指出 ECC 已经拥有的部分。

### 2. 决定哪些值得打断

对每个事件类别，回答：
- 谁需要知道？
- 他们需要多快知道？
- 这应该打断、批量处理，还是仅记录？

使用以下默认策略：
- 对发布、CI、安全和阻塞负责人的事件立即打断
- 对中等信号更新使用摘要
- 对遥测和低信号生命周期标记仅做记录

### 3. 在增加渠道之前先折叠重复项

寻找：
- 同一 PR 事件出现在 GitHub、Linear 和本地 logs 中
- 对同一失败的重复 hook 通知
- 应当被汇总而非原样转发的评论或状态搅动
- 相互重复而没有提供更好动作路径的渠道

优先选择：
- 一份规范摘要
- 一个负责人
- 一个主渠道
- 一条兜底路径

### 4. 设计 ECC 原生工作流

对每个真实的通知需求，定义：
- **来源**
- **门控**
- **形态**：立即告警、摘要、队列或仅 dashboard
- **渠道**
- **动作**

如果 ECC 已有该原语，优先：
- 用于操作者分拣的 skill
- 用于自动发出/执行的 hook
- 用于委托分类的 agent
- 仅当缺少真正的桥接时才使用 MCP/连接器

### 5. 返回偏向行动的设计

以以下内容结束：
- 保留什么
- 抑制什么
- 合并什么
- ECC 下一步应封装什么

## 输出格式

```text
CURRENT SURFACE
- sources
- channels
- duplicates
- gaps

EVENT MODEL
- critical
- high
- medium
- low

ROUTING PLAN
- source -> channel
- why
- operator owner

CONSOLIDATION
- suppress
- merge
- canonical summaries

NEXT ECC MOVE
- skill / hook / agent / MCP
- exact workflow to build next
```

## 建议规则

- 宁要一条强通道，不要多条弱通道
- 对中等和低信号更新优先使用摘要
- 当信号应自动发出时优先使用 hooks
- 当工作是分拣、路由和以审查为先的决策时，优先使用操作者 skill
- 当根因是 backlog / PR 协调而非告警时，优先使用 `project-flow-ops`
- 当用户首先需要来源盘点时，优先使用 `workspace-surface-audit`
- 如果桌面通知已足够，不要凭空造出不必要的外部桥接

## 典型用例

- "我们有 GitHub、Linear 和本地 hook 告警，但没有统一的操作者流程"
- "我们的 CI 失败很吵，大家都在忽略"
- "我想要跨 Claude、OpenCode 和 Codex 界面的统一通知策略"
- "理清哪些应该打断、哪些应进入摘要"
- "把重叠的通知类 PR 想法折叠成一条规范的 ECC 通道"

## 相关 Skills

- `workspace-surface-audit`
- `project-flow-ops`
- `github-ops`
- `knowledge-ops`
- 当通知痛点是计费/客户运营而非工程时，使用 `customer-billing-ops`
