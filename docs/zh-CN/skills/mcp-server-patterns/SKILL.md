---
name: mcp-server-patterns
description: 使用 Node/TypeScript SDK 构建 MCP 服务器——涵盖 tools、resources、prompts、Zod 校验、stdio 与 Streamable HTTP 的选择。使用 Context7 或官方 MCP 文档获取最新 API。
metadata:
  origin: ECC
---

# MCP 服务器模式

Model Context Protocol (MCP) 让 AI 助手能够调用你服务器上的 tools、读取 resources 并使用 prompts。在构建或维护 MCP 服务器时使用本 skill。SDK API 会演进；查阅 Context7（对 "MCP" 调用 query-docs）或官方 MCP 文档以获取当前的方法名与签名。

至于更宏观的路由决策——即某项能力应当作为 rule、skill、MCP，还是作为普通 CLI/API workflow——参见 [docs/capability-surface-selection.md](../../docs/capability-surface-selection.md)。

## 何时使用

适用场景：实现新的 MCP 服务器、添加 tools 或 resources、在 stdio 与 HTTP 之间做选择、升级 SDK，或排查 MCP 注册与 transport 问题。

## 工作原理

### 核心概念

- **Tools**：模型可调用的操作（例如 search、运行命令）。根据 SDK 版本，使用 `registerTool()` 或 `tool()` 注册。
- **Resources**：模型可获取的只读数据（例如文件内容、API 响应）。使用 `registerResource()` 或 `resource()` 注册。handler 通常会接收一个 `uri` 参数。
- **Prompts**：可复用、参数化的 prompt 模板，client 可将其呈现出来（例如在 Claude Desktop 中）。使用 `registerPrompt()` 或等价方法注册。
- **Transport**：本地客户端（例如 Claude Desktop）使用 stdio；远程场景（Cursor、云端）首选 Streamable HTTP。Legacy HTTP/SSE 仅用于向后兼容。

Node/TypeScript SDK 可能暴露 `tool()` / `resource()` 或 `registerTool()` / `registerResource()`；官方 SDK 随时间有所变化。务必对照当前的 [MCP 文档](https://modelcontextprotocol.io) 或 Context7 进行核对。

### 通过 stdio 连接

对于本地客户端，创建一个 stdio transport 并将其传递给服务器的 connect 方法。具体 API 因 SDK 版本而异（例如 constructor 与 factory 的区别）。参见官方 MCP 文档，或在 Context7 中查询 "MCP stdio server" 以获取当前写法。

保持服务器逻辑（tools + resources）独立于 transport，这样你就可以在 entrypoint 中接入 stdio 或 HTTP。

### 远程（Streamable HTTP）

对于 Cursor、云端或其他远程客户端，使用 **Streamable HTTP**（按当前规范，单一 MCP HTTP endpoint）。仅在需要向后兼容时才支持 legacy HTTP/SSE。

## 示例

### 安装与服务器配置

```bash
npm install @modelcontextprotocol/sdk zod
```

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "my-server", version: "1.0.0" });
```

使用你的 SDK 版本所提供的 API 注册 tools 和 resources：某些版本使用 `server.tool(name, description, schema, handler)`（positional args），另一些使用 `server.tool({ name, description, inputSchema }, handler)` 或 `registerTool()`。resources 同理——当 API 提供时，在 handler 中包含 `uri`。查阅官方 MCP 文档或 Context7 获取当前的 `@modelcontextprotocol/sdk` 签名，以避免 copy-paste 错误。

使用 **Zod**（或 SDK 偏好的 schema 格式）进行输入校验。

## 最佳实践

- **Schema first**：为每个 tool 定义 input schema；记录参数和返回结构。
- **Errors**：返回模型可解析的结构化错误或消息；避免原始 stack trace。
- **Idempotency**：在可能的情况下优先使用幂等的 tools，使重试是安全的。
- **Rate and cost**：对于调用外部 API 的 tools，考虑 rate limit 与成本；在 tool 描述中写明。
- **Versioning**：在 package.json 中锁定 SDK 版本；升级时查看 release notes。

## 官方 SDK 与文档

- **JavaScript/TypeScript**：`@modelcontextprotocol/sdk`（npm）。在 Context7 中使用库名 "MCP" 获取当前的注册与 transport 模式。
- **Go**：GitHub 上的官方 Go SDK（`modelcontextprotocol/go-sdk`）。
- **C#**：面向 .NET 的官方 C# SDK。
