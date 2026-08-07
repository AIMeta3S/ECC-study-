---
name: customer-billing-ops
description: 使用 Stripe 等已连接的计费工具，操作客户计费工作流，如订阅、退款、流失分诊、billing portal 恢复和套餐分析。当用户需要帮助客户、检查订阅状态或管理影响收入的计费操作时使用。
metadata:
  origin: ECC
---

# 客户计费运维

本 skill 用于真实客户运营，而非通用支付 API 设计。

目标是帮助运营人员回答：这位客户是谁、发生了什么、最安全的修复是什么、应该发送什么跟进信息？

## 何时使用

- 客户反馈计费异常、要求退款，或无法取消订阅
- 调查重复订阅、误扣费、续费失败或流失风险
- 审查套餐组合、活跃订阅、年度与月度转换，或 team-seat 混淆
- 创建或验证 billing portal 流程
- 审计涉及订阅、发票、退款或支付方式的支持投诉

## 首选工具面

- 优先使用 Stripe 等已连接的计费工具
- 仅将邮件、GitHub 或 issue trackers 用作辅助证据
- 当平台已提供所需控制功能时，优先使用托管的 billing/customer portal，而非自定义的账户管理代码

## 安全护栏

- 绝不在响应中暴露 secret keys、完整卡号或不必要的客户 PII
- 不要盲目退款；先对问题分类
- 区分以下情况：
  - 意外重复购买
  - 故意的多席位或团队购买
  - 产品缺陷 / 价值未兑现
  - 失败或不完整的 checkout
  - 因缺少自助控制而导致的取消
- 对于年度套餐、团队套餐和按比例分摊状态，在采取行动前先验证合同结构

## 工作流

### 1. 准确识别客户

从可用的最强标识符开始：

- 客户邮箱
- Stripe customer ID
- subscription ID
- invoice ID
- GitHub username 或支持邮件（若已知其可映射回计费）

返回简洁的身份摘要：

- 客户
- 活跃订阅
- 已取消订阅
- 发票
- 明显异常，如重复的活跃订阅

### 2. 对问题分类

在行动前，将案例归入一个类别：

| 案例 | 典型操作 |
|------|----------------|
| 重复个人订阅 | 取消多余订阅，考虑退款 |
| 真实的多席位/团队意图 | 保留席位，澄清计费模式 |
| 支付失败 / 不完整的 checkout | 通过 portal 恢复或更新支付方式 |
| 缺少自助控制 | 提供 portal、取消路径或发票访问 |
| 产品故障或信任破裂 | 退款、道歉、记录产品问题 |

### 3. 先采取最安全的可逆操作

首选顺序：

1. 恢复自助管理
2. 修复重复或损坏的计费状态
3. 仅退款受影响的扣费或重复扣费
4. 记录原因
5. 发送简短的客户跟进信息

如果修复需要产品工作，则分开处理：

- 立即进行客户补救
- 将 product bug / workflow gap 纳入 backlog

### 4. 检查运营侧的产品缺口

如果客户的痛点来源于缺失的运营界面，请明确指出。常见示例：

- 缺少 billing portal
- 缺少 usage/rate-limit 可见性
- 缺少套餐/席位说明
- 缺少取消流程
- 缺少重复订阅防护

将这些视为 ECC 或网站的跟进事项，而不仅仅是支持事件。

### 5. 产出运营交接

以以下内容结束：

- 客户状态摘要
- 已采取的操作
- 收入影响
- 待发送的跟进文本
- 待创建的产品或 backlog issue

## 输出格式

使用以下结构：

```text
CUSTOMER
- name / email
- relevant account identifiers

BILLING STATE
- active subscriptions
- invoice or renewal state
- anomalies

DECISION
- issue classification
- why this action is correct

ACTION TAKEN
- refund / cancel / portal / no-op

FOLLOW-UP
- short customer message

PRODUCT GAP
- what should be fixed in the product or website
```

## 好建议的示例

- "正确的修复是 billing portal，而非急于自定义 dashboard"
- "这看起来像重复的个人 checkout，而非真正的 team-seat 购买"
- "退款一笔重复扣费，保留剩余的活跃订阅，之后如有需要再将客户转为 org billing"
