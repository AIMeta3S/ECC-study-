---
name: ito-market-intelligence
description: 为 Itô 篮子工作流研究预测市场事件、场所、标的、流动性和新闻上下文。用于只读市场情报、受 API 门控的 Itô 探索，以及有来源支撑的预测市场简报，不提供投资建议或实盘交易。
metadata:
  origin: ECC
---

# Itô 市场情报

当用户需要预测市场上下文、事件发现、场所比较、篮子主题探索，或基于 Itô API 的市场简报时，使用此 skill。

这是一个公开预览版 skill。默认情况下可使用公开来源。任何基于 Itô 的数据调用都需要通过 `ITO_API_KEY` 获取显式 API 访问权限。

## 护栏

- 不提供投资、法律、税务或交易建议。
- 不下单、撤单、路由或模拟实盘订单。
- 不推断用户的财务状况，除非用户主动提供。
- 将 Polymarket、Kalshi、Itô、X、Exa、GitHub 和网络数据视为来源输入，而非其本身即为真相。
- 区分事实、市场隐含信号和你的解读。

## 工作流程

1. 明确市场主题、场所、地域和时间范围。
2. 从场所文档/API 或有来源支撑的研究中收集公开市场数据。
3. 如果存在 `ITO_API_KEY` 且用户明确要求 Itô 数据，只调用只读端点，并声明访问受门控限制。
4. 统一不同场所之间的事件、标的、流动性、费率、结算和数据延迟差异。
5. 生成决策简报：
   - 市场/事件摘要
   - 可用场所和标的
   - 流动性和数据质量注意事项
   - 相关新闻/来源上下文
   - 用户采取任何行动前的待解答问题

## 有用的 skill 链

- 使用 `deep-research` 或 `exa-search` 进行来源发现。
- 当配置了 X 访问权限时，使用 `x-api` 进行公开社交信号发现。
- 使用 `market-research` 进行市场规模、竞争对手或商业用例分析。
- 在任何工作流程触及用户资金、投资组合数据或具备执行能力的凭证之前，使用 `prediction-market-risk-review`。

## 输出契约

默认输出一份简洁简报，附带来源链接和明确的注意事项：

```text
This is market intelligence, not investment or trading advice.
```

如果缺少访问权限，回复：

```text
Itô live basket/API data requires gated access. Request an ITO_API_KEY before
using Itô-backed reads.
```
