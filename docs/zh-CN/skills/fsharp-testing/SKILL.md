---
name: fsharp-testing
description: F# 测试模式，涵盖 xUnit、FsUnit、Unquote、FsCheck property-based testing、integration tests 以及测试组织最佳实践。
metadata:
  origin: ECC
---

# F# 测试模式

面向 F# 应用的全面测试模式，使用 xUnit、FsUnit、Unquote、FsCheck 以及现代 .NET 测试实践。

## 何时激活

- 为 F# 代码编写新测试
- 评审测试质量与覆盖率
- 为 F# 项目搭建测试基础设施
- 调试 flaky 或缓慢的测试

## 测试框架栈

| 工具 | 用途 |
|---|---|
| **xUnit** | 测试框架（.NET 生态系统的标准选择） |
| **FsUnit.xUnit** | 适配 F# 的 xUnit assertion 语法 |
| **Unquote** | 使用 F# quotations 的 assertion 库，提供清晰的失败信息 |
| **FsCheck.xUnit** | 与 xUnit 集成的 property-based testing |
| **NSubstitute** | mock .NET 依赖 |
| **Testcontainers** | integration test 中的真实基础设施 |
| **WebApplicationFactory** | ASP.NET Core integration test |

## 基于 xUnit + FsUnit 的 unit test

### 基础测试结构

```fsharp
module OrderServiceTests

open Xunit
open FsUnit.Xunit

[<Fact>]
let ``create sets status to Pending`` () =
    let order = Order.create "cust-1" [ validItem ]
    order.Status |> should equal Pending

[<Fact>]
let ``confirm changes status to Confirmed`` () =
    let order = Order.create "cust-1" [ validItem ]
    let confirmed = Order.confirm order
    confirmed.Status |> should be (ofCase <@ Confirmed @>)
```

### 使用 Unquote 进行 assertion

Unquote 使用 F# quotations，因此失败信息会显示失败的完整表达式，而不仅仅是 "expected X got Y"。

```fsharp
module OrderValidationTests

open Xunit
open Swensen.Unquote

[<Fact>]
let ``PlaceOrder returns success when request is valid`` () =
    let request = { CustomerId = "cust-123"; Items = [ validItem ] }
    let result = OrderService.placeOrder request
    test <@ Result.isOk result @>

[<Fact>]
let ``order total sums item prices`` () =
    let items = [ { Sku = "A"; Quantity = 2; Price = 10m }
                  { Sku = "B"; Quantity = 1; Price = 5m } ]
    let total = Order.calculateTotal items
    test <@ total = 25m @>

[<Fact>]
let ``validated email rejects empty input`` () =
    let result = ValidatedEmail.create ""
    test <@ Result.isError result @>
```

### async 测试

```fsharp
[<Fact>]
let ``PlaceOrder returns success when request is valid`` () = task {
    let deps = createTestDeps ()
    let request = { CustomerId = "cust-123"; Items = [ validItem ] }

    let! result = OrderService.placeOrder deps request

    test <@ Result.isOk result @>
}

[<Fact>]
let ``PlaceOrder returns error when items are empty`` () = task {
    let deps = createTestDeps ()
    let request = { CustomerId = "cust-123"; Items = [] }

    let! result = OrderService.placeOrder deps request

    test <@ Result.isError result @>
}
```

### 使用 Theory 的 parameterized test

```fsharp
[<Theory>]
[<InlineData("")>]
[<InlineData("   ")>]
let ``PlaceOrder rejects empty customer ID`` (customerId: string) =
    let request = { CustomerId = customerId; Items = [ validItem ] }
    let result = OrderService.placeOrder request
    result |> should be (ofCase <@ Error @>)

[<Theory>]
[<InlineData("", false)>]
[<InlineData("a", false)>]
[<InlineData("user@example.com", true)>]
[<InlineData("user+tag@example.co.uk", true)>]
let ``IsValidEmail returns expected result`` (email: string, expected: bool) =
    test <@ EmailValidator.isValid email = expected @>
```

## 使用 FsCheck 的 property-based testing

### 使用 FsCheck.xUnit

```fsharp
open FsCheck
open FsCheck.Xunit

[<Property>]
let ``order total is always non-negative`` (items: NonEmptyList<PositiveInt * decimal>) =
    let orderItems =
        items.Get
        |> List.map (fun (qty, price) ->
            { Sku = "SKU"; Quantity = qty.Get; Price = abs price })
    let total = Order.calculateTotal orderItems
    total >= 0m

[<Property>]
let ``serialization roundtrips`` (order: Order) =
    let json = JsonSerializer.Serialize order
    let deserialized = JsonSerializer.Deserialize<Order> json
    deserialized = order
```

### 自定义 generator

```fsharp
type OrderGenerators =
    static member ValidEmail () =
        gen {
            let! user = Gen.elements [ "alice"; "bob"; "carol" ]
            let! domain = Gen.elements [ "example.com"; "test.org" ]
            return $"{user}@{domain}"
        }
        |> Arb.fromGen

[<Property(Arbitrary = [| typeof<OrderGenerators> |])>]
let ``valid emails pass validation`` (email: string) =
    EmailValidator.isValid email
```

## mock 依赖

### 函数 stub（推荐）

```fsharp
let createTestDeps () =
    let mutable savedOrders = []
    { FindOrder = fun id -> task { return Map.tryFind id testData }
      SaveOrder = fun order -> task { savedOrders <- order :: savedOrders }
      SendNotification = fun _ -> Task.CompletedTask }

[<Fact>]
let ``PlaceOrder saves the confirmed order`` () = task {
    let mutable saved = []
    let deps =
        { createTestDeps () with
            SaveOrder = fun order -> task { saved <- order :: saved } }

    let! _ = OrderService.placeOrder deps validRequest

    test <@ saved.Length = 1 @>
}
```

### 面向 .NET 接口的 NSubstitute

```fsharp
open NSubstitute

[<Fact>]
let ``calls repository with correct ID`` () = task {
    let repo = Substitute.For<IOrderRepository>()
    repo.FindByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
        .Returns(Task.FromResult(Some testOrder))

    let service = OrderService(repo)
    let! _ = service.GetOrder(testOrder.Id, CancellationToken.None)

    do! repo.Received(1).FindByIdAsync(testOrder.Id, Arg.Any<CancellationToken>())
}
```

## ASP.NET Core integration test

```fsharp
type OrderApiTests (factory: WebApplicationFactory<Program>) =
    interface IClassFixture<WebApplicationFactory<Program>>

    let client =
        factory.WithWebHostBuilder(fun builder ->
            builder.ConfigureServices(fun services ->
                services.RemoveAll<DbContextOptions<AppDbContext>>() |> ignore
                services.AddDbContext<AppDbContext>(fun options ->
                    options.UseInMemoryDatabase("TestDb") |> ignore) |> ignore))
            .CreateClient()

    [<Fact>]
    member _.``GET order returns 404 when not found`` () = task {
        let! response = client.GetAsync($"/api/orders/{Guid.NewGuid()}")
        test <@ response.StatusCode = HttpStatusCode.NotFound @>
    }
```

## 测试组织

```
tests/
  MyApp.Tests/
    Unit/
      OrderServiceTests.fs
      PaymentServiceTests.fs
    Integration/
      OrderApiTests.fs
      OrderRepositoryTests.fs
    Properties/
      OrderPropertyTests.fs
    Helpers/
      TestData.fs
      TestDeps.fs
```

## 常见 anti-pattern

| anti-pattern | 修复方式 |
|---|---|
| 测试实现细节 | 测试行为与结果 |
| 可变的共享测试状态 | 每个测试使用全新状态 |
| async 测试中使用 `Thread.Sleep` | 使用带超时的 `Task.Delay`，或采用轮询辅助工具 |
| 对 `sprintf` 输出做 assertion | 对类型化值和 pattern match 做 assertion |
| 忽略 `CancellationToken` | 始终传递并验证 cancellation |
| 跳过 property-based test | 对任何具有清晰 invariant 的函数使用 FsCheck |

## 相关 skill

- `dotnet-patterns` - 地道的 .NET 模式、dependency injection 与架构
- `csharp-testing` - C# 测试模式（WebApplicationFactory 和 Testcontainers 等共享基础设施同样适用于 F#）

## 运行测试

```bash
# 运行所有测试
dotnet test

# 带 coverage 运行
dotnet test --collect:"XPlat Code Coverage"

# 运行指定项目
dotnet test tests/MyApp.Tests/

# 按测试名称过滤
dotnet test --filter "FullyQualifiedName~OrderService"

# 开发时的 watch 模式
dotnet watch test --project tests/MyApp.Tests/
```
