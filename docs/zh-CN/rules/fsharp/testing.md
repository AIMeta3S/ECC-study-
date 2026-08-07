---
paths:
  - "**/*.fs"
  - "**/*.fsx"
  - "**/*.fsproj"
---
# F# 测试

> 本文件用 F# 专属内容扩展了 [common/testing.md](../common/testing.md)。

## 测试框架

- 优先使用 **xUnit** 搭配 **FsUnit.xUnit**，提供对 F# 友好的断言
- 使用 **Unquote** 进行基于 quotation 的断言，失败信息清晰明了
- 使用 **FsCheck.xUnit** 进行 property-based testing
- 使用 **NSubstitute** 或函数 stub 来 mock 依赖
- 当 integration test 需要真实基础设施时，使用 **Testcontainers**

## 测试组织

- 在 `tests/` 下镜像 `src/` 的结构
- 明确区分 unit、integration 与 end-to-end 的覆盖
- 按行为而非实现细节命名测试

```fsharp
open Xunit
open Swensen.Unquote

[<Fact>]
let ``PlaceOrder returns success when request is valid`` () =
    let request = { CustomerId = "cust-123"; Items = [ validItem ] }
    let result = OrderService.placeOrder request
    test <@ Result.isOk result @>

[<Fact>]
let ``PlaceOrder returns error when items are empty`` () =
    let request = { CustomerId = "cust-123"; Items = [] }
    let result = OrderService.placeOrder request
    test <@ Result.isError result @>
```

## 基于 FsCheck 的 Property-Based Testing

```fsharp
open FsCheck.Xunit

[<Property>]
let ``order total is never negative`` (items: OrderItem list) =
    let total = Order.calculateTotal items
    total >= 0m
```

## ASP.NET Core Integration Tests

- 使用 `WebApplicationFactory<TEntryPoint>` 实现 API integration 覆盖
- 通过 HTTP 测试认证、验证和序列化，而非绕过中间件

## 覆盖率

- 目标 line coverage 达到 80% 以上
- 将覆盖重点放在领域逻辑、验证、认证和失败路径上
- 在 CI 中运行 `dotnet test`，并在可用时启用 coverage 收集
