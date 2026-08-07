---
paths:
  - "**/*.fs"
  - "**/*.fsx"
  - "**/*.fsproj"
  - "**/appsettings*.json"
---
# F# 安全

> 本文件在 [common/security.md](../common/security.md) 基础上扩展了 F# 特定内容。

## 机密管理

- 永远不要在源代码中硬编码 API keys、tokens 或连接字符串
- 使用环境变量，本地开发使用 user secrets，生产环境使用 secret manager
- 保持 `appsettings.*.json` 中不包含真实凭据

```fsharp
// 反例
let apiKey = "sk-live-123"

// 正例
let apiKey =
    configuration["OpenAI:ApiKey"]
    |> Option.ofObj
    |> Option.defaultWith (fun () -> failwith "OpenAI:ApiKey is not configured.")
```

## SQL Injection 防护

- 在使用 ADO.NET、Dapper 或 EF Core 时，始终采用参数化查询
- 永远不要将用户输入拼接进 SQL 字符串
- 在使用动态查询组合之前，先校验排序字段和过滤运算符

```fsharp
let findByCustomer (connection: IDbConnection) customerId =
    task {
        let sql = "SELECT * FROM Orders WHERE CustomerId = @customerId"
        return! connection.QueryAsync<Order>(sql, {| customerId = customerId |})
    }
```

## 输入校验

- 在应用边界处使用类型来校验输入
- 对已校验的值使用 single-case discriminated unions
- 在无效输入进入领域逻辑之前将其拒绝

```fsharp
type ValidatedEmail = private ValidatedEmail of string

module ValidatedEmail =
    let create (input: string) =
        if System.Text.RegularExpressions.Regex.IsMatch(input, @"^[^@]+@[^@]+\.[^@]+$") then
            Ok(ValidatedEmail input)
        else
            Error "Invalid email address"

    let value (ValidatedEmail v) = v
```

## 认证与授权

- 优先使用框架的认证处理器，而不是自定义的 token 解析
- 在端点或处理器边界处强制执行授权策略
- 永远不要记录原始 tokens、密码或 PII

## 错误处理

- 返回安全的、面向客户端的消息
- 在服务端记录详细异常及其结构化上下文
- 不要在 API 响应中暴露堆栈跟踪、SQL 文本或文件系统路径

## 参考资料

参见 skill：`security-review`，获取更全面的应用安全审查清单。
