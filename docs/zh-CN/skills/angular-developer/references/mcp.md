# Angular CLI MCP Server

Angular CLI 包含一个 Model Context Protocol (MCP) server，使 AI 助手（如 Cursor、Gemini CLI、JetBrains AI 等）能够直接与 Angular CLI 交互。它提供了用于代码生成、现代化代码、获取示例以及运行构建/测试的工具。

## 可用工具（默认）

当 MCP server 启用时，AI agents 可以访问以下工具：

| 名称                        | 描述                                                                                                      |
| :-------------------------- | :------------------------------------------------------------------------------------------------------- |
| `ai_tutor`                  | 启动一个交互式、AI 驱动的 Angular 辅导工具。                                                                |
| `find_examples`             | 为现代 Angular 特性查找权威的最佳实践代码示例。                                                              |
| `get_best_practices`        | 获取 Angular 最佳实践指南（对 standalone components、typed forms 等至关重要）。                                |
| `list_projects`             | 通过读取 `angular.json`，列出工作区中的所有 applications 和 libraries。                                       |
| `onpush_zoneless_migration` | 分析代码并提供将其迁移到 `OnPush` change detection 的计划（zoneless 的前提条件）。                               |
| `search_documentation`      | 在 `https://angular.dev` 搜索官方文档。                                                                     |

## 实验性工具

某些工具必须使用 `--experimental-tool`（或 `-E`）flag 显式启用。

| 名称                       | 描述                                                                 |
| :------------------------- | :------------------------------------------------------------------- |
| `build`                    | 使用 `ng build` 执行一次性构建。                                        |
| `devserver.start`          | 异步启动开发服务器（`ng serve`）。立即返回。                              |
| `devserver.stop`           | 停止开发服务器。                                                       |
| `devserver.wait_for_build` | 返回正在运行的开发服务器中最近一次构建的 logs。                            |
| `e2e`                      | 执行 end-to-end 测试。                                                |
| `modernize`                | 执行代码迁移，以与最新的最佳实践和语法保持一致。                             |
| `test`                     | 运行项目的 unit tests。                                               |

## 配置

要使用 MCP server，你需要配置宿主环境（IDE 或 CLI）来运行 `npx @angular/cli mcp`。

### Antigravity IDE

在项目的根目录下创建一个名为 `.antigravity/mcp.json` 的文件：

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

### Gemini CLI

在项目根目录下创建 `.gemini/settings.json`：

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

### Cursor

在项目根目录下创建 `.cursor/mcp.json`（或全局位置 `~/.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

### VS Code

创建 `.vscode/mcp.json`：

```json
{
  "servers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

## 命令选项

你可以在配置的 `args` 数组中向 MCP server 传递 arguments：

- `--read-only`：只注册不会修改项目的工具。
- `--local-only`：只注册不需要互联网连接的工具。
- `--experimental-tool`（`-E`）：启用特定的实验性工具（例如 `-E build`、`-E devserver`）。

以下是启用了实验性工具的只读模式示例：

```json
"args": ["-y", "@angular/cli", "mcp", "--read-only", "-E", "build", "-E", "modernize"]
```
