---
name: exa-search
description: 通过 Exa MCP 进行 neural search，覆盖 web、代码和公司调研。当用户需要 web search、代码示例、公司情报、人物查询，或使用 Exa 的 neural search engine 进行 AI 驱动的深度调研时使用。
metadata:
  origin: ECC
---

# Exa Search

> **易漂移 skill。** Exa MCP 的 tool 名、参数和账户限额可能发生变化。在依赖某个特定的 search mode、category 或 livecrawl 行为之前，请先确认实际暴露的 tool 集合与最新的 Exa 文档。

通过 Exa MCP server 对 web 内容、代码、公司和人物进行 neural search。

## 何时启用

- 用户需要当前的 web 信息或新闻
- 搜索代码示例、API 文档或技术参考资料
- 调研公司、竞争对手或市场参与者
- 查找某个领域的专业人士或人物
- 为任何开发任务进行背景调研
- 用户说"搜索"、"查找"、"找"或"最新动态"

## MCP 前置条件

必须配置 Exa MCP server。添加到 `~/.claude.json`：

```json
"exa-web-search": {
  "command": "npx",
  "args": ["-y", "exa-mcp-server"],
  "env": { "EXA_API_KEY": "YOUR_EXA_API_KEY_HERE" }
}
```

在 [exa.ai](https://exa.ai) 获取 API key。
本仓库当前的 Exa 配置记录了此处暴露的 tool 集合：`web_search_exa` 和 `get_code_context_exa`。
如果你的 Exa server 暴露了额外的 tool，在文档或 prompt 中依赖它们之前，请先核实其确切名称。

## 核心 Tool

### web_search_exa
通用的 web search，用于获取当前信息、新闻或事实。

```
web_search_exa(query: "latest AI developments 2026", numResults: 5)
```

**参数：**

| Param | Type | Default | 说明 |
|-------|------|---------|-------|
| `query` | string | required | 搜索查询 |
| `numResults` | number | 8 | 结果数量 |
| `type` | string | `auto` | 搜索模式 |
| `livecrawl` | string | `fallback` | 需要时优先使用 live crawl |
| `category` | string | 无 | 可选聚焦项，如 `company` 或 `research paper` |

### get_code_context_exa
从 GitHub、Stack Overflow 和文档站点查找代码示例与文档。

```
get_code_context_exa(query: "Python asyncio patterns", tokensNum: 3000)
```

**参数：**

| Param | Type | Default | 说明 |
|-------|------|---------|-------|
| `query` | string | required | 代码或 API 搜索查询 |
| `tokensNum` | number | 5000 | 内容 token 数（1000-50000） |

## 使用模式

### 快速查询
```
web_search_exa(query: "Node.js 22 new features", numResults: 3)
```

### 代码调研
```
get_code_context_exa(query: "Rust error handling patterns Result type", tokensNum: 3000)
```

### 公司或人物调研
```
web_search_exa(query: "Vercel funding valuation 2026", numResults: 3, category: "company")
web_search_exa(query: "site:linkedin.com/in AI safety researchers Anthropic", numResults: 5)
```

### 技术深挖
```
web_search_exa(query: "WebAssembly component model status and adoption", numResults: 5)
get_code_context_exa(query: "WebAssembly component model examples", tokensNum: 4000)
```

## 提示

- 使用 `web_search_exa` 获取当前信息、查询公司以及进行广泛探索
- 使用 `site:`、带引号的短语和 `intitle:` 等 search operator 来缩小结果范围
- 较低的 `tokensNum`（1000-2000）适合聚焦的代码片段，较高（5000+）适合全面的上下文
- 当需要 API 用法或代码示例而非普通 web 页面时，使用 `get_code_context_exa`

## 相关 skill

- `deep-research` — 结合使用 firecrawl 和 exa 的完整调研工作流
- `market-research` — 面向商业的调研，附带决策框架
