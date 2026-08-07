---
name: lead-intelligence
description: AI 原生的线索情报与外联 pipeline。以 agent 驱动的信号评分、共同联系人排名、暖路径发现、基于来源的语气建模，以及跨 email、LinkedIn 和 X 的渠道专属外联，替代 Apollo、Clay 和 ZoomInfo。当用户想要寻找、资格审查并触达高价值联系人时使用。
metadata:
  origin: ECC
---

# Lead Intelligence

Agent 驱动的线索情报 pipeline，通过社交图谱分析和暖路径发现来寻找、评分并触达高价值联系人。

## 何时启用

- 用户想在特定行业寻找线索或潜在客户
- 正在为合作、销售或融资构建外联名单
- 调研应该联系谁以及触达他们的最佳路径
- 用户说"找线索"、"外联名单"、"我该联系谁"、"暖引荐"
- 需要按相关性对联系人列表进行评分或排名
- 想要梳理共同联系人以发现暖引荐路径

## 工具要求

### 必需
- **Exa MCP** — 用于人物、公司和信号深度网络搜索（`web_search_exa`）
- **X API** — 关注者/被关注图谱、共同联系人分析、近期动态（`X_BEARER_TOKEN`，以及写入类凭证如 `X_CONSUMER_KEY`、`X_CONSUMER_SECRET`、`X_ACCESS_TOKEN`、`X_ACCESS_TOKEN_SECRET`）

### 可选（增强结果）
- **LinkedIn** — 如有可用则使用直接 API，否则使用浏览器控制进行搜索、资料查看和草稿撰写
- **Apollo/Clay API** — 用于用户有权限时的信息补充交叉比对
- **GitHub MCP** — 用于以开发者为核心的线索资格审查
- **Apple Mail / Mail.app** — 撰写冷邮件或暖邮件草稿，但不自动发送
- **浏览器控制** — 用于 API 覆盖缺失或受限时的 LinkedIn 和 X

## Pipeline 概览

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ 1. Signal   │────>│ 2. Mutual    │────>│ 3. Warm Path    │────>│ 4. Enrich    │────>│ 5. Outreach     │
│    Scoring  │     │    Ranking   │     │    Discovery    │     │              │     │    Draft        │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘     └─────────────────┘
```

## 外联前的语气设定

不要从通用销售文案中撰写外发内容。

每当涉及用户语气时，先运行 `brand-voice`。复用其 `VOICE PROFILE`，而不是在本 skill 内临时重新推导风格。

如果可用的实时 X 访问，撰写前先拉取近期原创帖子。如果没有，则使用提供的示例或可用的最佳仓库/网站素材。

## Stage 1：信号评分

在目标垂直行业中搜索高信号人物。基于以下维度为每人赋予权重：

| 信号 | 权重 | 来源 |
|--------|--------|--------|
| 角色/职级匹配度 | 30% | Exa, LinkedIn |
| 行业匹配度 | 25% | Exa 公司搜索 |
| 话题近期活跃度 | 20% | X API 搜索, Exa |
| 关注者数量/影响力 | 10% | X API |
| 地理位置邻近度 | 10% | Exa, LinkedIn |
| 与你内容的互动 | 5% | X API 互动 |

### 信号搜索方法

```python
# Step 1: 定义目标参数
target_verticals = ["prediction markets", "AI tooling", "developer tools"]
target_roles = ["founder", "CEO", "CTO", "VP Engineering", "investor", "partner"]
target_locations = ["San Francisco", "New York", "London", "remote"]

# Step 2: Exa 深度搜索人物
for vertical in target_verticals:
    results = web_search_exa(
        query=f"{vertical} {role} founder CEO",
        category="company",
        numResults=20
    )
    # 对每个结果评分

# Step 3: X API 搜索活跃声音
x_search = search_recent_tweets(
    query="prediction markets OR AI tooling OR developer tools",
    max_results=100
)
# 提取并对唯一作者评分
```

## Stage 2：共同联系人排名

对每个评分后的目标，分析用户的社交图谱以找到最暖的路径。

### 排名模型

1. 拉取用户的 X 关注列表和 LinkedIn 联系人
2. 对每个高信号目标，检查是否存在共同联系人
3. 应用 `social-graph-ranker` 模型对桥接价值评分
4. 按以下维度对共同联系人排名：

| 因素 | 权重 |
|--------|--------|
| 与目标的联系数量 | 40% — 最高权重，联系最多 = 排名最高 |
| 共同联系人当前职位/公司 | 20% — 决策者 vs 个人贡献者 |
| 共同联系人所在地 | 15% — 同城 = 更易引荐 |
| 行业匹配度 | 15% — 同垂直行业 = 自然引荐 |
| 共同联系人的 X handle / LinkedIn | 10% — 外联可识别性 |

规范规则：

```text
当用户想要图谱计算本身、将桥接排名作为独立报告、或显式的衰减模型调优时，使用 social-graph-ranker。
```

在本 skill 内部，使用同样的加权桥接模型：

```text
B(m) = Σ_{t ∈ T} w(t) · λ^(d(m,t) - 1)
R(m) = B_ext(m) · (1 + β · engagement(m))
```

解释：
- Tier 1：高 `R(m)` 且直接桥接路径 → 暖引荐请求
- Tier 2：中 `R(m)` 且一跳桥接路径 → 有条件引荐请求
- Tier 3：无可用桥接 → 使用同一 lead 记录进行直接冷触达

### 输出格式

```

如果用户明确想要把排名引擎单独拆分出来、可视化数学计算，或在完整 lead 工作流之外对网络评分，则先作为独立 pass 运行 `social-graph-ranker`，再将结果回填到本 pipeline。
MUTUAL RANKING REPORT
=====================

#1  @mutual_handle (Score: 92)
    Name: Jane Smith
    Role: Partner @ Acme Ventures
    Location: San Francisco
    Connections to targets: 7
    Connected to: @target1, @target2, @target3, @target4, @target5, @target6, @target7
    Best intro path: Jane invested in Target1's company

#2  @mutual_handle2 (Score: 85)
    ...
```

## Stage 3：暖路径发现

对每个目标，找到最短的引荐链路：

```
你 ──[关注]──> 共同联系人 A ──[投资了]──> 目标公司
你 ──[关注]──> 共同联系人 B ──[共同创立]──> 目标人物
你 ──[相遇于]──> 活动 ──[也参加了]──> 目标人物
```

### 路径类型（按暖度排序）
1. **直接共同联系人** — 你们都关注/认识同一个人
2. **投资组合联系人** — 共同联系人投资了或顾问于目标的公司
3. **前同事/校友** — 共同联系人在同一家公司工作过或就读于同一所学校
4. **活动交集** — 都参加了同一场会议/项目
5. **内容互动** — 目标与共同联系人的内容有互动，或反之

## Stage 4：信息补充

对每个合格 lead，拉取：

- 全名、当前职级、公司
- 公司规模、融资阶段、近期新闻
- 近期 X 帖子（过去 30 天）— 话题、语气、兴趣
- 与用户的共同兴趣（共同关注、相似内容）
- 近期公司事件（产品发布、融资轮、招聘）

### 信息补充来源
- Exa：公司数据、新闻、博客帖子
- X API：近期推文、简介、关注者
- GitHub：开源贡献（用于以开发者为核心的 lead）
- LinkedIn（通过 browser-use）：完整资料、工作经历、教育背景

## Stage 5：外联草稿

为每个 lead 生成个性化外联内容。草稿应匹配基于来源推导的语气档案和目标渠道。

### 渠道规则

#### Email

- 用于最高价值的冷触达、暖引荐、投资人外联和合作请求
- 当本地桌面控制可用时，默认在 Apple Mail / Mail.app 中撰写草稿
- 先创建草稿，除非用户明确要求，否则不要自动发送
- 主题行应平实具体，不要花哨

#### LinkedIn

- 当目标在此活跃、共同图谱上下文在 LinkedIn 上更强、或 email 信心较低时使用
- 如有可用，优先使用 API 访问
- 否则使用浏览器控制来查看资料、近期动态，并撰写消息
- 保持比 email 更简短，避免虚假的职业客套

#### X

- 用于发帖行为具有重要性、需要高上下文场景的运营者、builder 或投资人外联
- 优先使用 API 访问进行搜索、timeline 和互动分析
- 需要时回退到浏览器控制
- DM 和公开回复应比 email 紧凑得多，并应引用目标 timeline 中真实的内容

#### 渠道选择启发式

按以下顺序选取一个主渠道：

1. 通过 email 的暖引荐
2. 直接 email
3. LinkedIn DM
4. X DM 或回复

仅当有充分理由且节奏不会显得像垃圾信息时，才使用多渠道。

### 暖引荐请求（发给共同联系人）

目标：

- 一个明确的请求
- 一个具体的、说明此引荐为何合理的理由
- 必要时提供易于转发的简短说明

避免：

- 过度解释你的公司
- 社会证明堆叠
- 听起来像融资模板

### 直接冷触达（发给目标）

目标：

- 从某个具体且近期的事项切入
- 解释为什么契合是真实的
- 提出一个低摩擦的请求

避免：

- 通用赞美
- 功能堆砌
- 诸如"很想建立联系"之类的宽泛请求
- 强行使用反问句

### 执行模式

对每个目标，产出：

1. 推荐渠道
2. 该渠道为最佳的原因
3. 消息草稿
4. 可选的跟进草稿
5. 如果 email 是所选渠道且 Apple Mail 可用，则创建草稿，而不是仅返回文本

如果浏览器控制可用：

- LinkedIn：查看目标资料、近期动态和共同联系人上下文，然后撰写或准备消息
- X：查看近期帖子或回复，然后撰写 DM 或公开回复话术

如果桌面自动化可用：

- Apple Mail：创建带有主题、正文和收件人的草稿邮件

未经用户明确同意，不要自动发送消息。

### 反模式

- 没有个性化的通用模板
- 长篇大论解释你整个公司
- 一条消息中包含多个请求
- 没有具体细节的虚假熟络
- 带有可见合并字段的大批量发送消息
- email、LinkedIn 和 X 复用相同的文案
- 平台流水线套话而非作者真实语气

## 配置

用户应设置以下环境变量：

```bash
# 必需
export X_BEARER_TOKEN="..."
export X_ACCESS_TOKEN="..."
export X_ACCESS_TOKEN_SECRET="..."
export X_CONSUMER_KEY="..."
export X_CONSUMER_SECRET="..."
export EXA_API_KEY="..."

# 可选
export LINKEDIN_COOKIE="..." # 用于 browser-use LinkedIn 访问
export APOLLO_API_KEY="..."  # 用于 Apollo 信息补充
```

## Agents

本 skill 在 `agents/` 子目录下包含专门的 agents：

- **signal-scorer** — 按相关性信号搜索潜在客户并排名
- **mutual-mapper** — 梳理社交图谱联系并发现暖路径
- **enrichment-agent** — 拉取详细的资料和公司数据
- **outreach-drafter** — 生成个性化消息

## 使用示例

```
用户：帮我找出 prediction markets 领域我应该联系的 top 20 人物

Agent 工作流：
1. signal-scorer 在 Exa 和 X 上搜索 prediction market 领军人物
2. mutual-mapper 检查用户的 X 图谱以查找共同联系人
3. enrichment-agent 拉取公司数据和近期动态
4. outreach-drafter 为排名靠前的 lead 生成个性化消息

输出：带暖路径的排名列表、语气档案摘要，以及渠道专属的外联草稿或应用内草稿
```

## 相关 Skills

- `brand-voice` 用于规范语气捕获
- `connections-optimizer` 用于在外联前进行以审查为先的网络清理与扩展
