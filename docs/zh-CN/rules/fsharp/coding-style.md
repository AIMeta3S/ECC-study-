---
paths:
  - "**/*.fs"
  - "**/*.fsx"
---
# F# 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 的基础上扩展了 F# 特定内容。

## 标准

- 遵循标准 F# 约定，并利用 type system 保证正确性
- 默认优先使用 immutability；仅在有性能需求时才使用 `mutable`
- 保持 module 聚焦且具有高内聚性

## 类型与模型

- 在领域建模时，优先使用 discriminated union 而非 class 层级结构
- 对于带命名字段的数据，使用 record
- 使用 single-case union 为原语提供类型安全的包装
- 除非 interop 或可变状态有要求，否则避免使用 class

```fsharp
type EmailAddress = EmailAddress of string

type OrderStatus =
    | Pending
    | Confirmed of confirmedAt: DateTimeOffset
    | Shipped of trackingNumber: string
    | Cancelled of reason: string

type Order =
    { Id: Guid
      CustomerId: string
      Status: OrderStatus
      Items: OrderItem list }
```

## Immutability

- Record 默认是不可变的；使用 `with` 表达式进行更新
- 优先使用 `list`、`map`、`set`，而非可变集合
- 在领域逻辑中避免使用 `ref` cell 和可变字段

```fsharp
let rename (profile: UserProfile) newName =
    { profile with Name = newName }
```

## 函数式风格

- 优先使用小而可组合的 function，而非庞大的 method
- 使用 pipe operator `|>` 构建可读的数据 pipeline
- 优先使用 pattern matching 而非 if/else 链
- 使用 `Option` 代替 null；对于可能失败的操作，使用 `Result`

```fsharp
let processOrder order =
    order
    |> validateItems
    |> Result.bind calculateTotal
    |> Result.map applyDiscount
    |> Result.mapError OrderError
```

## 异步与错误处理

- 使用 `task { }` 与 .NET async API 进行 interop
- 使用 `async { }` 处理 F# 原生的 async 工作流
- 在公开的 async API 中传递 `CancellationToken`
- 对于预期内的失败，优先使用 `Result` 和 railway-oriented programming 而非 exception

```fsharp
let loadOrderAsync (orderId: Guid) (ct: CancellationToken) =
    task {
        let! order = repository.FindAsync(orderId, ct)
        return
            order
            |> Option.defaultWith (fun () ->
                failwith $"Order {orderId} was not found.")
    }
```

## 格式化

- 使用 `fantomas` 进行自动格式化
- 优先使用 significant whitespace；避免不必要的括号
- 移除未使用的 `open` 声明

### open 声明顺序

将 `open` 语句分为四组，每组之间用空行分隔，每组内部按字母顺序排序：

1. `System.*`
2. `Microsoft.*`
3. 第三方 namespace
4. 自有 / 项目 namespace

```fsharp
open System
open System.Collections.Generic
open System.Threading.Tasks

open Microsoft.AspNetCore.Http
open Microsoft.Extensions.Logging

open FsCheck.Xunit
open Swensen.Unquote

open MyApp.Domain
open MyApp.Infrastructure
```
