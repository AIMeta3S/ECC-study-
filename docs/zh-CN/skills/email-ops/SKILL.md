---
name: email-ops
description: 面向 ECC 的证据优先邮箱分拣、草稿撰写、发送验证与已发送邮件安全跟进工作流。当用户需要整理邮件、通过真实邮件界面起草或发送邮件，或证明邮件已进入 Sent 时使用。
metadata:
  origin: ECC
---

# Email Ops

当真正的任务是邮箱工作——分拣、起草、回复、发送，或证明某封邮件已进入 Sent 时，使用本工作流。

这不是一个通用写作 skill。它是围绕真实邮件界面的操作工作流。

## Skill 技术栈

在相关时，将以下 ECC 原生 skill 纳入工作流：

- 在起草任何面向用户的内容之前，调用 `brand-voice`
- 面向投资人、合作伙伴或赞助方的邮件，调用 `investor-outreach`
- 当该 thread 属于计费/支持事件而非普通往来邮件时，调用 `customer-billing-ops`
- 当某条消息或 thread 事后应被纳入持久上下文时，调用 `knowledge-ops`
- 当回复依赖最新的外部事实时，调用 `research-ops`

## 使用时机

- 用户要求分拣收件箱或归档低价值邮件
- 用户想要一份草稿、回复，或新建一封对外邮件
- 用户想知道某封邮件是否已发送
- 用户想要证明使用了哪个账户、thread 或 Sent 条目

## 护栏

- 先出草稿，除非用户明确要求实时发送
- 没有真实的 Sent 文件夹或客户端确认前，绝不能声称邮件已发送
- 不要随意切换发件账户；选择与项目和收件人匹配的账户
- 清理时不要删除性质不确定的商业邮件
- 如果任务实际上是 DM 或 iMessage 相关工作，交给 `messages-ops`

## 工作流

### 1. 确定确切的邮件界面

在行动之前，先确定以下事项：

- 使用哪个邮箱账户
- 涉及哪个 thread 或收件人
- 任务是分拣、起草、回复还是发送
- 用户想要仅出草稿还是实时发送

### 2. 撰写前阅读 thread

如果是回复：

- 阅读现有 thread
- 找到最近一次对外联系
- 找出任何承诺、截止日期或未回答的问题

如果是新建对外邮件：

- 确定亲切程度
- 选择正确的渠道和发件账户
- 起草前调用 `brand-voice`

### 3. 起草，然后验证

对于仅出草稿的工作：

- 产出最终文案
- 说明发件人、收件人、主题和目的

对于实时发送的工作：

- 先核对确切的最终正文
- 通过选定的邮件界面发送
- 确认邮件已进入 Sent 或等效的已发送副本存储

### 4. 报告确切状态

使用确切的状态词：

- drafted
- approval-pending
- sent
- blocked
- awaiting verification

如果发送界面受阻，保留草稿并报告确切的阻塞原因，而不是在不说明的情况下临时改用第二种传输方式。

## 输出格式

```text
MAIL SURFACE
- account
- thread / recipient
- requested action

DRAFT
- subject
- body

STATUS
- drafted / sent / blocked
- proof of Sent when applicable

NEXT STEP
- send
- follow up
- archive / move
```

## 陷阱

- 未进行已发送副本检查前，不要声称发送成功
- 不要忽视 thread 历史并写出脱离上下文的回复
- 不要将邮件工作与 DM 或短信工作流混在一起
- 不要泄露 secrets、认证详情或不必要的邮件元数据

## 验证

- 回复中要指明账户和 thread 或收件人
- 任何发送声明都要包含 Sent 证明或明确的客户端确认
- 最终状态是 drafted / sent / blocked / awaiting verification 之一
