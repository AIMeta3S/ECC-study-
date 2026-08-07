---
name: social-graph-ranker
description: 跨 X 与 LinkedIn 的加权社交图谱排名，用于暖引荐发现、桥梁评分与网络缺口分析。当用户需要的是可复用的图谱排名引擎本身，而非叠加其上的更广泛触达或网络维护工作流时使用。
metadata:
  origin: ECC
---

# Social Graph Ranker

面向网络感知触达的标准加权图谱排名层。

当用户需要以下操作时使用本 skill：

- 按引荐价值对现有互关或联系人排名
- 标绘通往目标列表的暖通路
- 度量跨一度和二度联系人的桥梁价值
- 决定哪些目标适合暖引荐、哪些适合直接冷触达
- 独立于 `lead-intelligence` 或 `connections-optimizer` 理解图谱数学

## 何时独立使用本 skill

当用户主要需要排名引擎时，选择本 skill：

- "我网络中谁最适合为我引荐？"
- "按谁能把我引荐给这些人，对我的互关排名"
- "将我的图谱与这个 ICP 对照标绘"
- "给我看看桥梁数学"

当用户真正需要以下内容时，不要单独使用本 skill：

- 完整的线索生成与外联序列 -> 使用 `lead-intelligence`
- 修剪、重新平衡并扩展网络 -> 使用 `connections-optimizer`

## 输入

收集或推断：

- 目标人物、公司或 ICP 定义
- 用户当前在 X、LinkedIn 或两者上的图谱
- 权重优先级，如角色、行业、地域和响应度
- 遍历深度与衰减容差

## 核心模型

给定：

- `T` = 加权目标集合
- `M` = 你当前的互关 / 直接联系人
- `d(m, t)` = 从互关 `m` 到目标 `t` 的最短跳数
- `w(t)` = 来自信号评分的目标权重

基础桥梁分数：

```text
B(m) = Σ_{t ∈ T} w(t) · λ^(d(m,t) - 1)
```

其中：

- `λ` 为衰减因子，通常为 `0.5`
- 直接路径贡献完整价值
- 每多一跳，贡献减半

二阶扩展：

```text
B_ext(m) = B(m) + α · Σ_{m' ∈ N(m) \ M} Σ_{t ∈ T} w(t) · λ^(d(m',t))
```

其中：

- `N(m) \ M` 为该互关认识而你不认识的人的集合
- `α` 用于折减二阶可达范围，通常为 `0.3`

经响应度调整后的最终排名：

```text
R(m) = B_ext(m) · (1 + β · engagement(m))
```

其中：

- `engagement(m)` 为归一化的响应度或关系强度
- `β` 为互动加成，通常为 `0.2`

解释：

- Tier 1：高 `R(m)` 且有直接桥梁路径 -> 暖引荐请求
- Tier 2：中等 `R(m)` 且有一跳桥梁路径 -> 有条件的引荐请求
- Tier 3：低 `R(m)` 或无可行桥梁 -> 直接触达或关注缺口填补

## 评分信号

在图谱遍历之前，根据当前优先级集合中重要的因素对目标加权：

- 角色或职衔匹配度
- 公司或行业契合度
- 当前活跃度与近期性
- 地域相关性
- 影响力或触达范围
- 回复可能性

遍历之后，按以下维度对互关加权：

- 进入目标集合的加权路径数量
- 这些路径的直接程度
- 响应度或过往互动历史
- 发起引荐的情境契合度

## 工作流

1. 构建加权目标集合。
2. 从 X、LinkedIn 或两者拉取用户的图谱。
3. 计算直接桥梁分数。
4. 为价值最高的互关扩展二阶候选。
5. 按 `R(m)` 排名。
6. 返回：
   - 最佳暖引荐请求
   - 有条件的桥梁路径
   - 不存在暖通路的图谱缺口

## 输出形态

```text
SOCIAL GRAPH RANKING
====================

Priority Set:
Platforms:
Decay Model:

Top Bridges
- mutual / connection
  base_score:
  extended_score:
  best_targets:
  path_summary:
  recommended_action:

Conditional Paths
- mutual / connection
  reason:
  extra hop cost:

No Warm Path
- target
  recommendation: direct outreach / fill graph gap
```

## 相关 skill

- `lead-intelligence` 在更广泛的目标发现与触达 pipeline 中使用此排名模型
- `connections-optimizer` 在决定保留、修剪或新增谁时使用相同的桥梁逻辑
- `brand-voice` 应在起草任何引荐请求或直接触达之前运行
- `x-api` 提供 X 图谱访问以及可选的执行路径
