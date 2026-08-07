---
name: connections-optimizer
description: 以 review-first 的 prune 方式重新组织用户在 X 和 LinkedIn 上的 network，提供 add/follow 推荐，并用用户真实语气起草针对不同 channel 的 warm outreach。当用户希望清理 following 列表、朝当前优先事项方向拓展，或围绕更高 signal 质量的关系重新平衡 social graph 时使用。
metadata:
  origin: ECC
---

# Connections Optimizer

重新组织用户的 network，而不是把 outbound 当作单向的 prospecting 列表。

本 skill 处理：

- X following 清理与拓展
- LinkedIn follow 与 connection 分析
- review-first 的 prune 队列
- add 与 follow 推荐
- warm-path 识别
- 用用户真实语气起草 Apple Mail、X DM 和 LinkedIn 草稿

## When to Activate

- 用户希望 prune 其 X following
- 用户希望重新平衡其 follow 或保持 connection 的对象
- 用户说"清理我的 network"、"我应该 unfollow 谁"、"我应该 follow 谁"、"我应该与谁 reconnect"
- outreach 质量取决于 network 结构，而不仅仅是冷列表的生成

## Required Inputs

收集或推断：

- 当前优先事项与正在进行的工作
- 目标角色、行业、地区或生态系统
- 平台选择：X、LinkedIn 或两者
- do-not-touch 列表
- mode：`light-pass`、`default` 或 `aggressive`

如果用户未指定 mode，使用 `default`。

## Tool Requirements

### Preferred

- `x-api` 用于 X graph 检查与近期活动
- `lead-intelligence` 用于目标发现与 warm-path 排序
- `social-graph-ranker`：当用户希望独立于更广的 lead workflow 对 bridge value 评分时使用
- Exa / deep research 用于人物与公司的 enrichment
- 在起草 outbound 之前使用 `brand-voice`

### Fallbacks

- browser control 用于 LinkedIn 分析与起草
- 当 API 覆盖受限时，使用 browser control 处理 X
- 当 email 是合适 channel 时，通过桌面自动化起草 Apple Mail 或 Mail.app 邮件

## Safety Defaults

- 默认为 review-first，绝不盲目 auto-pruning
- X：仅 prune 用户 follow 的账号，绝不 prune followers
- LinkedIn：将 1st-degree connection 的移除视为 manual-review-first
- 不要自动发送 DM、邀请或 email
- 在任何 apply 步骤之前，输出排序后的 action plan 与草稿

## Platform Rules

### X

- mutuals 比单向 follow 更粘
- non-follow-backs 可以更激进地 prune
- 严重不活跃或已消失的账号应快速浮现
- engagement、signal 质量和 bridge value 比原始 follower 数量更重要

### LinkedIn

- 如果用户确实拥有 LinkedIn API 访问权限，则优先 API-first
- 当缺少 API 访问时，必须能通过 browser workflow 完成
- 区分 outbound follow 与已接受的 1st-degree connection
- outbound follow 可以更自由地 prune
- 已接受的 1st-degree connection 应默认进入 review，而非 auto-remove

## Modes

### `light-pass`

- 仅 prune 高置信度、低价值的单向 follow
- 将其余部分呈现以供 review
- 生成少量 add/follow 列表

### `default`

- 平衡的 prune 队列
- 平衡的 keep 列表
- 排序后的 add/follow 队列
- 在有用的地方起草 warm intro 或直接 outreach

### `aggressive`

- 更大的 prune 队列
- 对陈旧的 non-follow-back 容忍度更低
- 在 apply 之前仍需 review-gated

## Scoring Model

使用以下正向 signal：

- reciprocity（互惠性）
- 近期活动
- 与当前优先事项的契合度
- network 的 bridge value
- 角色相关性
- 真实的 engagement 历史
- 近期活跃度与响应度

使用以下负向 signal：

- 已消失或被废弃的账号
- 陈旧的单向 follow
- 偏离优先事项的主题集群
- 低价值噪声
- 反复不回复
- 当存在许多更好的替代对象时仍不 follow-back

Mutuals 和真正的 warm-path bridge 受到的惩罚应比单向 follow 更轻。

## Workflow

1. 明确优先事项、do-not-touch 约束与所选平台。
2. 拉取当前的 following / connection 清单。
3. 对 prune 候选对象评分并给出明确理由。
4. 对 keep 候选对象评分并给出明确理由。
5. 使用 `lead-intelligence` 加 research surfaces 对拓展候选对象排序。
6. 匹配合适的 channel：
   - X DM 用于 warm、快速的社交接触点
   - LinkedIn message 用于专业 graph 邻接
   - Apple Mail 草稿用于更高 context 的 intro 或 outreach
7. 在起草消息之前运行 `brand-voice`。
8. 在任何 apply 步骤之前返回 review pack。

## Review Pack Format

```text
CONNECTIONS OPTIMIZER REPORT
============================

Mode:
Platforms:
Priority Set:

Prune Queue
- handle / profile
  reason:
  confidence:
  action:

Review Queue
- handle / profile
  reason:
  risk:

Keep / Protect
- handle / profile
  bridge value:

Add / Follow Targets
- person
  why now:
  warm path:
  preferred channel:

Drafts
- X DM:
- LinkedIn:
- Apple Mail:
```

## Outbound Rules

- 默认的 email 路径是创建 Apple Mail / Mail.app 草稿。
- 不要自动发送。
- 根据 warmth、relevance 和 context 深度选择 channel。
- 当 email 或不做 outreach 才是正确做法时，不要强行发 DM。
- 草稿听起来应像用户本人，而非自动化销售文案。

## Related Skills

- `brand-voice` 用于可复用的 voice profile
- `social-graph-ranker` 用于独立的 bridge-scoring 与 warm-path 计算
- `lead-intelligence` 用于加权目标与 warm-path 发现
- `x-api` 用于 X graph 访问、起草以及可选的 apply 流程
- `content-engine`：当用户还希望围绕 network 动作发布公开的 launch content 时使用
