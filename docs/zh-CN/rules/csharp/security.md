---
paths:
  - "**/*.cs"
  - "**/*.csx"
  - "**/*.csproj"
  - "**/appsettings*.json"
---
# C# 安全

> 本文件扩展了 [common/security.md](../common/security.md)，增加了 C# 特定内容。

## 密钥管理

- 严禁在源代码中硬编码 API keys、tokens 或 connection strings
- 使用环境变量；本地开发使用 user secrets，生产环境使用 secret manager
- 确保 `appsettings.*.json` 中不包含真实凭据

```csharp
// 反例
const string ApiKey = "sk-live-123";

// 正例
var apiKey = builder.Configuration["OpenAI:ApiKey"]
    ?? throw new InvalidOperationException("OpenAI:ApiKey is not configured.");
```

## SQL injection 防护

- 配合 ADO.NET、Dapper 或 EF Core 时，始终使用参数化查询
- 严禁将用户输入拼接到 SQL 字符串中
- 在使用动态查询组合之前，先校验排序字段与过滤操作符

```csharp
const string sql = "SELECT * FROM Orders WHERE CustomerId = @customerId";
await connection.QueryAsync<Order>(sql, new { customerId });
```

## 输入校验

- 在应用边界处校验 DTOs
- 使用 data annotations、FluentValidation 或显式的 guard clauses
- 在执行业务逻辑之前，拒绝无效的 model state

## 认证与授权

- 优先使用框架自带的 authentication handlers，而非自定义 token 解析
- 在 endpoint 或 handler 边界强制执行 authorization policies
- 严禁记录原始 tokens、密码或 PII

## 错误处理

- 返回安全的面向客户端的消息
- 在服务端结合结构化上下文记录详细异常
- 不要在 API 响应中暴露 stack traces、SQL 文本或文件系统路径

## 参考资料

更全面的应用安全审查清单参见 skill：`security-review`。
