---
name: recsys-pipeline-architect
description: 使用由 xAI 开源的 For You algorithm 所推广的六阶段 Source→Hydrator→Filter→Scorer→Selector→SideEffect 框架，设计可组合的推荐、排序与 feed pipeline。当用户构建任何"为 (user, context) 选取 top K items"的系统时，请使用本 skill —— 涵盖社交 feed、内容 CMS、RAG reranker、任务优先级排序、通知分拣、搜索 reranking、广告排序等场景。
metadata:
  origin: community
---

# recsys-pipeline-architect

这是一个用于构建可组合的推荐、排序与 feed pipeline 的 spec-and-scaffold skill。它编码了 **六阶段 pattern** —— Source → Hydrator → Filter → Scorer → Selector → SideEffect —— 该 pattern 由 xAI 开源的 [For You algorithm](https://github.com/xai-org/x-algorithm)（Apache 2.0）所推广。本 skill 是对该 pattern 的独立重新实现（MIT）—— 未从原版复制任何代码。

上游仓库：<https://github.com/mturac/recsys-pipeline-architect>

## 何时使用

- 用户希望构建任何"为 user/context 选取 top K items"的系统
- 用户询问"我该如何对 X 排序"或描述了一个 feed / 个性化问题
- 用户已有一个 scoring function，需要围绕它搭建 pipeline 管线
- 用户希望从单一相关性分数迁移到带可调权重的 multi-action prediction
- 用户正在封装一个 LLM/ML scorer，并需要在其技术栈（TypeScript / Go / Python）中加入 filter、hydrator、side-effect 以及可运行的 scaffold
- 触发词："recommendation system"、"feed algorithm"、"ranking pipeline"、"for you feed"、"candidate pipeline"、"content recommender"、"pipeline architecture for recsys"、"RAG retrieval reranker"

## 何时不使用

- 模型架构工作（transformer 设计、two-tower 检索、embedding 训练）—— 本 skill 处理的是模型*外围*的管线，而非模型本身
- 纯 ML 训练 pipeline —— scoring function 由用户自行负责
- 运维已部署的 pipeline（monitoring、autoscaling）—— 超出范围

## 六阶段框架

| # | 阶段 | 职责 | 是否并行？ |
|---|---|---|---|
| 1 | **Source** | 从一个或多个来源获取候选 item | 是 —— 多个 source 并行运行 |
| 2 | **Hydrator** | 用 filter 与 scoring 所需的元数据丰富每个候选 item | 是 —— 独立的 hydrator 并行运行 |
| 3 | **Filter** | 丢弃绝不应展示的候选 item（被屏蔽、过期、重复、不合格） | 顺序执行 —— 每个 filter 看到的 item 更少 |
| 4 | **Scorer** | 为每个存活下来的候选 item 分配一个或多个分数 | 顺序执行 —— 后续的 scorer 能看到之前的分数 |
| 5 | **Selector** | 按最终分数排序，返回 top K | 单次操作 |
| 6 | **SideEffect** | 缓存已服务的 ID、记录 impression、发送事件、更新计数器 | 异步 —— 绝不能阻塞响应 |

### 为何采用这一确切顺序

- Source 在 hydration 之前：先知道存在哪些候选 item，再付出成本去丰富它们
- Hydration 在 filter 之前：许多 filter 需要 source 未提供的元数据
- Filter 在 scoring 之前：scoring 是昂贵的阶段；先丢弃不合格的
- Scorer 链（而非单个 scorer）：真实系统组合 ML scoring + diversity reranking + 业务规则
- Selector 在 scoring 之后：保持 scoring 的确定性与可缓存性
- SideEffect 在最后且异步：side effect 绝不能阻塞用户响应

## 调用时的工作流

引导用户完成以下八个步骤：

1. **明确用例**（一轮，三个问题）：被排序的 item 是什么？输入的 context 是什么？语言/运行时是什么？
2. **识别候选 source**：通常是 in-network（关注/拥有/订阅）+ out-of-network（ML 检索 / 趋势 / 相似于已赞）
3. **列出所需的 hydration**：对每个 filter 和 scorer，它需要哪些 source 未提供的数据？
4. **列出 filter**：去重、自身、年龄、屏蔽/静音、已服务过、资格。顺序很重要 —— 便宜的在前，昂贵的在后。
5. **设计 scorer 链**：primary（ML）→ combiner（带权重的 multi-action）→ diversity → 业务规则
6. **Selector**：按最终分数降序排序，取 top K（或对 in-network/out-of-network 做分层混合）
7. **SideEffect**：缓存已服务的 ID、发送 impression 事件、更新计数器、记录分析数据 —— 全部 fire-and-forget
8. 在用户的技术栈中**生成 scaffold**

## 需要呈现的关键 trade-off（不要静默默认）

### 1. 单一分数 vs multi-action prediction

- **单一分数**：训练一个模型来预测相关性。要改变行为 → 重新训练。
- **Multi-action**：对多个动作（阅读、点赞、分享、跳过、举报）预测 `P(action)`，在服务时用权重组合。要改变行为 → 改变权重。无需重新训练。

X 的 For You 系统使用 multi-action，同时带有正向与负向权重。当用户期望频繁调参时，推荐 multi-action。

### 2. scoring 中的候选 item 隔离

- **隔离**：每个候选 item 独立打分。确定性、可缓存。
- **联合**：候选 item 在 scoring 时相互 attention（例如对 batch 做 transformer）。更具表达力，但跨 batch 不确定。

默认采用隔离。仅在有具体理由时（例如显式的 batch 感知 diversity）才用联合。

### 3. 在线 vs 离线

- **请求时（online）**：pipeline 在每次请求时运行。延迟预算：100–300ms。默认。
- **预计算（offline batch）**：pipeline 定期运行，结果缓存。延迟更低，新鲜度更低。
- **混合**：候选 item 检索离线进行，排序在线进行。

## 硬性规则

1. **不要编造基准数据。** "快多少？" → "取决于工作负载，自己跑一遍。"
2. **归属纪律。** 当引用该 pattern 时，标注为"由 xAI 开源的 For You algorithm 推广" / `github.com/xai-org/x-algorithm`（Apache 2.0）。
3. **不得使用商标。** 不要将用户的 artifact 命名为"X-like"或使用"For You"品牌。Pattern 是免费的；品牌不是。建议命名："candidate pipeline"、"feed pipeline"、"ranking pipeline"、"recsys pipeline"。
4. **呈现 trade-off。** Multi-action vs 单一、隔离 vs 联合、在线 vs 离线 —— 绝不静默默认。
5. **生成的 scaffold 必须可运行。** 不得用伪代码冒充代码。
6. **Filter 顺序很重要。** 便宜的在前，昂贵的在后。通用的在前，用户特定的在后。
7. **Side effect 绝不阻塞。** 用 fire-and-forget pattern 封装（goroutines / 不带 await 的 promise / asyncio task）。

## 反模式

- scoring 在 filter 之前（在即将被丢弃的候选 item 上浪费算力）
- 同步的 side effect（缓存写入 / impression 发送阻塞了响应）
- 当产品需要为多个目标调参时（engagement vs 安全 vs diversity vs 广告）仍使用单一"相关性"分数
- 以联合 scoring 为默认（不确定、更难缓存、无法与 reranking 阶段组合）
- 生成"用于示意"的伪代码 —— scaffold 必须真正可运行

## 上游仓库内容

位于 <https://github.com/mturac/recsys-pipeline-architect> 的上游仓库提供：

- 完整的 `SKILL.md`，包含完整的 8 步工作流
- 5 份按需加载的参考文档：4 种语言的接口（TS/Go/Python/Rust）、multi-action scoring pattern、candidate isolation、filter cookbook（12 个 pattern）、scorer cookbook（加权求和、MMR、diversity 惩罚、position 去偏）
- 3 个可运行的示例 scaffold，每一个在其 test suite 上全绿：
  - Strapi v5 plugin（TypeScript / Jest —— 3/3 通过）
  - Zentra-compatible pipeline（带 generics 的 Go —— 3/3 通过）
  - PMAI 任务优先级排序器（Python / FastAPI / pytest —— 3/3 通过）
- 已打 v0.1.0 release tag
- MIT license；pattern 归属于 xAI X For You algorithm（Apache 2.0）

通过 skills.sh 安装：`npx skills add mturac/recsys-pipeline-architect`
