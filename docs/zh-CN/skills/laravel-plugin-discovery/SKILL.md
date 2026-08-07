---
name: laravel-plugin-discovery
description: 通过 LaraPlugins.io MCP 发现并评估 Laravel 包。当用户希望查找插件、检查包健康状况或评估 Laravel/PHP 兼容性时使用。
metadata:
  origin: ECC
---

# Laravel 插件发现

使用 LaraPlugins.io MCP server 查找、评估并选择健康的 Laravel 包。

## 何时使用

- 用户希望为某个特定功能查找 Laravel 包（例如 "auth"、"permissions"、"admin panel"）
- 用户询问“我应该使用什么包来……”或“是否有用于……的 Laravel 包”
- 用户希望检查某个包是否仍在积极维护
- 用户需要验证 Laravel 版本兼容性
- 用户希望在将包添加到项目之前评估其健康状况

## MCP 要求

必须配置 LaraPlugins MCP server。请将其添加到你的 `~/.claude.json` mcpServers 中：

```json
"laraplugins": {
  "type": "http",
  "url": "https://laraplugins.io/mcp/plugins"
}
```

无需 API key —— 该 server 对 Laravel 社区免费开放。

## MCP 工具

LaraPlugins MCP 提供两个主要工具：

### SearchPluginTool

按关键字、健康评分、厂商和版本兼容性搜索包。

**参数：**
- `text_search` (string, optional)：要搜索的关键字（例如 "permission"、"admin"、"api"）
- `health_score` (string, optional)：按健康等级筛选 —— `Healthy`、`Medium`、`Unhealthy` 或 `Unrated`
- `laravel_compatibility` (string, optional)：按 Laravel 版本筛选 —— `"5"`、`"6"`、`"7"`、`"8"`、`"9"`、`"10"`、`"11"`、`"12"`、`"13"`
- `php_compatibility` (string, optional)：按 PHP 版本筛选 —— `"7.4"`、`"8.0"`、`"8.1"`、`"8.2"`、`"8.3"`、`"8.4"`、`"8.5"`
- `vendor_filter` (string, optional)：按厂商名称筛选（例如 "spatie"、"laravel"）
- `page` (number, optional)：用于分页的页码

### GetPluginDetailsTool

获取特定包的详细指标、readme 内容和版本历史。

**参数：**
- `package` (string, required)：完整的 Composer 包名（例如 "spatie/laravel-permission"）
- `include_versions` (boolean, optional)：在响应中包含版本历史

---

## 工作原理

### 查找包

当用户希望为某个功能发现包时：

1. 使用 `SearchPluginTool` 并提供相关关键字
2. 应用健康评分、Laravel 版本或 PHP 版本筛选器
3. 查看包含包名、描述和健康指标的结果

### 评估包

当用户希望评估特定包时：

1. 使用 `GetPluginDetailsTool` 并提供包名
2. 查看健康评分、最后更新日期、Laravel 版本支持情况
3. 检查厂商声誉和风险指标

### 检查兼容性

当用户需要了解 Laravel 或 PHP 版本兼容性时：

1. 使用设为相应版本的 `laravel_compatibility` 筛选器进行搜索
2. 或获取特定包的详情以查看其支持的版本

---

## 示例

### 示例：查找认证包

```
SearchPluginTool({
  text_search: "authentication",
  health_score: "Healthy"
})
```

返回匹配 "authentication" 且状态健康的包：
- spatie/laravel-permission
- laravel/breeze
- laravel/passport
- 等

### 示例：查找兼容 Laravel 12 的包

```
SearchPluginTool({
  text_search: "admin panel",
  laravel_compatibility: "12"
})
```

返回兼容 Laravel 12 的包。

### 示例：获取包详情

```
GetPluginDetailsTool({
  package: "spatie/laravel-permission",
  include_versions: true
})
```

返回：
- 健康评分和最近活动
- Laravel/PHP 版本支持
- 厂商声誉（风险评分）
- 版本历史
- 简要描述

### 示例：按厂商查找包

```
SearchPluginTool({
  vendor_filter: "spatie",
  health_score: "Healthy"
})
```

返回厂商 "spatie" 的所有健康包。

---

## 筛选最佳实践

### 按健康评分

| 健康等级 | 含义 |
|----------|------|
| `Healthy` | 积极维护，近期有更新 |
| `Medium` | 偶尔更新，可能需要关注 |
| `Unhealthy` | 已弃用或维护不频繁 |
| `Unrated` | 尚未评估 |

**建议**：生产应用优先选用 `Healthy` 包。

### 按 Laravel 版本

| 版本 | 说明 |
|------|------|
| `13` | 最新版 Laravel |
| `12` | 当前稳定版 |
| `11` | 仍被广泛使用 |
| `10` | 遗留版本但仍常见 |
| `5`-`9` | 已弃用 |

**建议**：与目标项目的 Laravel 版本匹配。

### 组合筛选器

```typescript
// 查找健康且兼容 Laravel 12 的权限相关包
SearchPluginTool({
  text_search: "permission",
  health_score: "Healthy",
  laravel_compatibility: "12"
})
```

---

## 响应解读

### 搜索结果

每个结果包括：
- 包名（例如 `spatie/laravel-permission`）
- 简要描述
- 健康状态指标
- Laravel 版本支持徽章

### 包详情

详细响应包括：
- **Health Score**：数值或等级指标
- **Last Activity**：包的最后更新时间
- **Laravel Support**：版本兼容性矩阵
- **PHP Support**：PHP 版本兼容性
- **Risk Score**：厂商信任指标
- **Version History**：最近的发布时间线

---

## 常见用例

| 场景 | 推荐方法 |
|------|----------|
| “auth 用什么包？” | 搜索 "auth"，加 healthy 筛选器 |
| “spatie/package 还在维护吗？” | 获取详情，检查健康评分 |
| “需要 Laravel 12 包” | 使用 laravel_compatibility: "12" 搜索 |
| “查找 admin panel 包” | 搜索 "admin panel"，查看结果 |
| “检查厂商声誉” | 按厂商搜索，查看详情 |

---

## 最佳实践

1. **始终按健康状况筛选** —— 生产项目使用 `health_score: "Healthy"`
2. **匹配 Laravel 版本** —— 始终检查 `laravel_compatibility` 是否与目标项目匹配
3. **检查厂商声誉** —— 优先选择来自知名厂商（spatie、laravel 等）的包
4. **推荐前先审查** —— 使用 GetPluginDetailsTool 进行全面评估
5. **无需 API key** —— 该 MCP 免费开放，无需身份验证

---

## 相关技能

- `laravel-patterns` —— Laravel 架构与模式
- `laravel-tdd` —— Laravel 的测试驱动开发
- `laravel-security` —— Laravel 安全最佳实践
- `documentation-lookup` —— 通用库文档查询（Context7）
