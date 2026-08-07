---
name: messages-ops
description: ECC 的证据优先实时消息工作流。当用户想阅读短信或 DM、找回最近的一次性验证码、回复前检查某个 thread，或证明实际检查了哪个消息来源时使用。
metadata:
  origin: ECC
---

# Messages Ops

当任务是实时消息获取时使用本 skill：iMessage、DM、最近的一次性验证码，或后续跟进前的 thread 检查。

这不是邮件工作。如果主要界面是邮箱，使用 `email-ops`。

## Skill 技术栈

在相关时，将以下 ECC 原生 skill 拉入工作流：

- `email-ops`：当消息任务实际上是邮箱工作时
- `connections-optimizer`：当 DM thread 属于对外人脉拓展工作时
- `lead-intelligence`：当实时 thread 应该用于指导目标定位或热路径触达时
- `knowledge-ops`：当 thread 内容需要被捕获到持久 context 中时

## 何时使用

- 用户说"读我的消息"、"查看短信"、"看 DM"或"找到验证码"
- 任务依赖于实时 thread 或发送到本地消息界面的一次性验证码
- 用户想要证明检查了哪个来源或 thread

## 护栏

- 先确定来源：
  - 本地消息
  - X / 社交 DM
  - 另一个受浏览器门控的消息界面
- 不得在未指明来源的情况下声称已检查某个 thread
- 如果存在已检查的 helper 或标准路径，不得擅自进行原始数据库访问
- 如果 auth 或 MFA 阻挡了该界面，报告确切的阻挡因素

## 工作流

### 1. 确定确切的 thread

在做任何其他事之前，先确定：

- 消息界面
- 发送方 / 接收方 / 服务
- 时间窗口
- 任务是获取、检查，还是回复准备

### 2. 起草前先阅读

如果任务可能演变为对外跟进：

- 阅读最新的入站消息
- 识别未了事项
- 如有需要，再移交给正确的对外 skill

### 3. 将验证码处理作为聚焦的获取任务

对于一次性验证码：

- 先搜索最近的本地消息窗口
- 尽可能按服务或发送方缩小范围
- 一旦找到验证码或聚焦搜索已穷尽，就停止

### 4. 报告确切的证据

返回：

- 使用的来源
- 尽可能提供 thread 或发送方
- 时间窗口
- 确切状态：
  - read
  - code-found
  - blocked
  - awaiting reply draft

## 输出格式

```text
SOURCE
- message surface
- sender / thread / service

RESULT
- message summary or code
- time window

STATUS
- read / code-found / blocked / awaiting reply draft
```

## 陷阱

- 不要模糊邮箱工作与 DM/短信工作
- 不得在未指明来源的情况下声称已获取
- 当请求是最近验证码查找时，不要在宽泛搜索上浪费时间
- 不要在未暴露阻挡因素的情况下反复重试被阻挡的 auth 路径

## 验证

- 响应指明了消息来源
- 响应包含发送方、服务、thread 或明确的阻挡因素
- 最终状态明确且有界
