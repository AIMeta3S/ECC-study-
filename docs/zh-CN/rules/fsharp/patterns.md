---
paths:
  - "**/*.fs"
  - "**/*.fsx"
---
# F# 模式

> 本文件用 F# 特定内容扩展了 [common/patterns.md](../common/patterns.md)。

## Result 类型用于错误处理

对于预期内的失败，使用 `Result<'T, 'TError>` 配合 railway-oriented programming，而不是抛出异常。

```fsharp
type OrderError =
    | InvalidCustomer of string
    | EmptyItems
    | ItemOutOfStock of sku: string

let validateOrder (request: CreateOrderRequest) : Result<ValidatedOrder, OrderError> =
    if String.IsNullOrWhiteSpace request.CustomerId then
        Error(InvalidCustomer "CustomerId is required")
    elif request.Items |> List.isEmpty then
        Error EmptyItems
    else
        Ok { CustomerId = request.CustomerId; Items = request.Items }
```

## Option 类型处理缺失值

优先使用 `Option<'T>` 而非 null。使用 `Option.map`、`Option.bind` 和 `Option.defaultValue` 来进行转换。

```fsharp
let findUser (id: Guid) : User option =
    users |> Map.tryFind id

let getUserEmail userId =
    findUser userId
    |> Option.map (fun u -> u.Email)
    |> Option.defaultValue "unknown@example.com"
```

## Discriminated Unions 用于领域建模

显式地建模业务状态。编译器会强制 exhaustive handling。

```fsharp
type PaymentState =
    | AwaitingPayment of amount: decimal
    | Paid of paidAt: DateTimeOffset * transactionId: string
    | Refunded of refundedAt: DateTimeOffset * reason: string
    | Failed of error: string

let describePayment = function
    | AwaitingPayment amount -> $"Awaiting payment of {amount:C}"
    | Paid (at, txn) -> $"Paid at {at} (txn: {txn})"
    | Refunded (at, reason) -> $"Refunded at {at}: {reason}"
    | Failed error -> $"Payment failed: {error}"
```

## Computation Expressions

使用 computation expressions 来简化可能失败的顺序操作。

```fsharp
let placeOrder request =
    result {
        let! validated = validateOrder request
        let! inventory = checkInventory validated.Items
        let! order = createOrder validated inventory
        return order
    }
```

## Module 组织

- 将相关函数组织到 module 中，而不是 class 中
- 使用 `[<RequireQualifiedAccess>]` 来防止命名冲突
- 保持 module 小巧，专注于单一职责

```fsharp
[<RequireQualifiedAccess>]
module Order =
    let create customerId items = { Id = Guid.NewGuid(); CustomerId = customerId; Items = items; Status = Pending }
    let confirm order = { order with Status = Confirmed(DateTimeOffset.UtcNow) }
    let cancel reason order = { order with Status = Cancelled reason }
```

## Dependency Injection

- 将依赖定义为函数参数或 record-of-functions
- 谨慎使用 interface，主要用于与 .NET 库的边界处
- 优先使用 partial application 将依赖注入到 pipeline 中

```fsharp
type OrderDeps =
    { FindOrder: Guid -> Task<Order option>
      SaveOrder: Order -> Task<unit>
      SendNotification: Order -> Task<unit> }

let processOrder (deps: OrderDeps) orderId =
    task {
        match! deps.FindOrder orderId with
        | None -> return Error "Order not found"
        | Some order ->
            let confirmed = Order.confirm order
            do! deps.SaveOrder confirmed
            do! deps.SendNotification confirmed
            return Ok confirmed
    }
```
