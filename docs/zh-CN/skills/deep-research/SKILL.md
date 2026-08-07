---
name: deep-research
description: 使用 firecrawl 和 exa MCP 进行多源深度研究。搜索网络、综合发现，并交付带来源标注的引用报告。当用户希望对任何主题进行带证据和引用的深入研究时使用。
metadata:
  origin: ECC
---

# Deep Research

> **易漂移 skill。** Firecrawl/Exa MCP 的 tool 名、配额和结果结构会发生变化。在承诺覆盖范围或引用实时来源数量之前，请先核实已配置的 MCP tool 和当前 API 文档。

使用 firecrawl 和 exa MCP tool 从多个网络来源生成详尽、带引用的研究报告。

## 何时激活

- 用户要求对任何主题进行深入研究
- 竞争分析、技术评估或市场规模测算
- 对公司、投资者或技术进行尽职调查
- 任何需要综合多个来源的问题
- 用户说“研究一下”、“深入分析”、“调查”或“……的最新现状如何”

## MCP 要求

至少满足以下之一：
- **firecrawl** — `firecrawl_search`、`firecrawl_scrape`、`firecrawl_crawl`
- **exa** — `web_search_exa`、`web_search_advanced_exa`、`crawling_exa`

两者同时使用可获得最佳覆盖范围。在 `~/.claude.json` 或 `~/.codex/config.toml` 中配置。

## 工作流程

### Step 1：明确目标

提出 1-2 个简短的澄清问题：
- “你的目标是什么——学习、做决策，还是写作？”
- “有没有特定的角度或深度要求？”

如果用户说“直接研究吧”——使用合理的默认值直接继续。

### Step 2：规划研究

将主题拆解为 3-5 个研究子问题。示例：
- 主题：“AI 对医疗保健的影响”
  - 如今 AI 在医疗保健中的主要应用有哪些？
  - 已衡量了哪些临床结局？
  - 监管方面存在哪些挑战？
  - 哪些公司在引领这一领域？
  - 市场规模和增长轨迹如何？

### Step 3：执行多源搜索

对每个子问题，使用可用的 MCP tool 进行搜索：

**使用 firecrawl：**
```
firecrawl_search(query: "<sub-question keywords>", limit: 8)
```

**使用 exa：**
```
web_search_exa(query: "<sub-question keywords>", numResults: 8)
web_search_advanced_exa(query: "<keywords>", numResults: 5, startPublishedDate: "2025-01-01")
```

**搜索策略：**
- 每个子问题使用 2-3 种不同的关键词变体
- 混合使用通用查询和新闻类查询
- 目标总计 15-30 个不重复的来源
- 优先级：学术、官方、权威新闻 > 博客 > 论坛

### Step 4：深度阅读关键来源

对最有价值的 URL，抓取完整内容：

**使用 firecrawl：**
```
firecrawl_scrape(url: "<url>")
```

**使用 exa：**
```
crawling_exa(url: "<url>", tokensNum: 5000)
```

完整阅读 3-5 个关键来源以获取深度。不要仅依赖搜索摘要。

### Step 5：综合并撰写报告

按以下结构组织报告：

```markdown
# [Topic]: Research Report
*Generated: [date] | Sources: [N] | Confidence: [High/Medium/Low]*

## Executive Summary
[3-5 sentence overview of key findings]

## 1. [First Major Theme]
[Findings with inline citations]
- Key point ([Source Name](url))
- Supporting data ([Source Name](url))

## 2. [Second Major Theme]
...

## 3. [Third Major Theme]
...

## Key Takeaways
- [Actionable insight 1]
- [Actionable insight 2]
- [Actionable insight 3]

## Sources
1. [Title](url) — [one-line summary]
2. ...

## Methodology
Searched [N] queries across web and news. Analyzed [M] sources.
Sub-questions investigated: [list]
```

### Step 6：交付

- **短主题**：在聊天中发布完整报告
- **长报告**：发布执行摘要 + 关键要点，将完整报告保存到文件

## 使用 Subagents 进行并行研究

对于宽泛的主题，使用 Claude Code 的 Task tool 进行并行化：

```
Launch 3 research agents in parallel:
1. Agent 1: Research sub-questions 1-2
2. Agent 2: Research sub-questions 3-4
3. Agent 3: Research sub-question 5 + cross-cutting themes
```

每个 agent 执行搜索、阅读来源并返回发现。主 session 将其综合成最终报告。

## 质量规则

1. **每个论断都需要来源。** 不允许无来源的断言。
2. **交叉验证。** 如果只有一个来源提及，标注为未验证。
3. **时效性很重要。** 优先选择最近 12 个月内的来源。
4. **承认信息缺口。** 如果某个子问题找不到好的信息，如实说明。
5. **禁止幻觉。** 如果不知道，就说“未找到充分数据”。
6. **区分事实与推断。** 明确标注估计值、预测和观点。

## 示例

```
"Research the current state of nuclear fusion energy"
"Deep dive into Rust vs Go for backend services in 2026"
"Research the best strategies for bootstrapping a SaaS business"
"What's happening with the US housing market right now?"
"Investigate the competitive landscape for AI code editors"
```
