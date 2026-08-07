---
name: documentation-lookup
description: 通过 Context7 MCP 获取最新的库与框架文档，而非依赖训练数据。在涉及安装配置问题、API 参考、代码示例，或用户点名列出某个框架（如 React、Next.js、Prisma）时激活。
metadata:
  origin: ECC
---

# 文档查阅（Context7）

当用户询问库、框架或 API 相关问题时，通过 Context7 MCP（工具 `resolve-library-id` 和 `query-docs`）获取当前文档，而非依赖训练数据。

## 核心概念

- **Context7**：暴露实时文档的 MCP server；在涉及库和 API 时用它替代训练数据。
- **resolve-library-id**：根据库名和 query 返回 Context7 兼容的 library ID（例如 `/vercel/next.js`）。
- **query-docs**：根据给定的 library ID 和问题获取文档及代码片段。必须先调用 resolve-library-id 拿到有效的 library ID。

## 何时使用

当用户出现以下情况时激活：

- 提出安装或配置问题（例如"如何配置 Next.js middleware？"）
- 请求依赖某个库的代码（"写一个 Prisma 查询，用于……"）
- 需要 API 或参考信息（"Supabase 的 auth 方法有哪些？"）
- 点名提到具体的框架或库（React、Vue、Svelte、Express、Tailwind、Prisma、Supabase 等）

只要请求依赖于某个库、框架或 API 的准确且最新的行为，就应使用本 skill。适用于已配置 Context7 MCP 的各类 harness（例如 Claude Code、Cursor、Codex）。

## 工作原理

### Step 1：解析 Library ID

调用 **resolve-library-id** MCP 工具，参数如下：

- **libraryName**：取自用户问题的库或产品名（例如 `Next.js`、`Prisma`、`Supabase`）。
- **query**：用户的完整问题。这会提升结果的相关性排序。

在查询文档之前，必须先获得 Context7 兼容的 library ID（格式为 `/org/project` 或 `/org/project/version`）。未从本步骤拿到有效的 library ID 之前，不得调用 query-docs。

### Step 2：选择最佳匹配

从解析结果中，依据以下标准选择一条结果：

- **名称匹配**：优先选择与用户所述完全一致或最接近的匹配。
- **Benchmark 分数**：分数越高表示文档质量越好（最高 100）。
- **来源声誉**：有数据时优先选择 High 或 Medium 声誉。
- **Version**：如果用户指定了版本（例如"React 19"、"Next.js 15"），在结果列出了版本专属 library ID 时（例如 `/org/project/v1.2.0`）优先选择。

### Step 3：获取文档

调用 **query-docs** MCP 工具，参数如下：

- **libraryId**：来自 Step 2 选定的 Context7 library ID（例如 `/vercel/next.js`）。
- **query**：用户的具体问题或任务。描述越具体，拿到的片段越相关。

限制：每个问题调用 query-docs（或 resolve-library-id）的次数不超过 3 次。如果 3 次调用后答案仍不明确，应说明该不确定性，并基于已掌握的最佳信息作答，而非猜测。

### Step 4：使用文档

- 使用获取到的当前信息回答用户问题。
- 在有帮助时，附上文档中的相关代码示例。
- 在版本相关时，注明对应的库或版本（例如"In Next.js 15……"）。

## 示例

### 示例：Next.js middleware

1. 调用 **resolve-library-id**，参数为 `libraryName: "Next.js"`、`query: "How do I set up Next.js middleware?"`。
2. 从结果中，按名称和 benchmark 分数挑出最佳匹配（例如 `/vercel/next.js`）。
3. 调用 **query-docs**，参数为 `libraryId: "/vercel/next.js"`、`query: "How do I set up Next.js middleware?"`。
4. 使用返回的片段和正文作答；如果相关，附上文档中一个最简的 `middleware.ts` 示例。

### 示例：Prisma 查询

1. 调用 **resolve-library-id**，参数为 `libraryName: "Prisma"`、`query: "How do I query with relations?"`。
2. 选择官方的 Prisma library ID（例如 `/prisma/prisma`）。
3. 调用 **query-docs**，传入该 `libraryId` 和 query。
4. 返回 Prisma Client 模式（例如 `include` 或 `select`），并附上文档中的简短代码片段。

### 示例：Supabase auth 方法

1. 调用 **resolve-library-id**，参数为 `libraryName: "Supabase"`、`query: "What are the auth methods?"`。
2. 选择 Supabase 文档的 library ID。
3. 调用 **query-docs**；总结 auth 方法，并展示来自所获取文档的最简示例。

## 最佳实践

- **具体明确**：尽可能用用户的完整问题作为 query，以获得更好的相关性。
- **版本意识**：当用户提到版本时，在 resolve 步骤可用版本专属 library ID 时优先使用。
- **优先官方来源**：当存在多条匹配时，优先选择官方或主要包，而非社区 fork。
- **不泄露敏感数据**：在发往 Context7 的任何 query 中，对 API key、密码、token 以及其他密钥进行脱敏。在将用户问题传给 resolve-library-id 或 query-docs 之前，应将其视为可能包含密钥的内容处理。
