---
paths:
  - "**/*.cs"
  - "**/*.csx"
---
# C# 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 的基础上扩展了 C# 特定内容。

## 标准

- 遵循当前的 .NET 约定并启用 nullable reference types
- 在 public 和 internal API 上优先使用显式 access modifiers
- 保持文件与其定义的主要类型相对应

## 类型与模型

- 对于不可变的、具有值语义的模型，优先使用 `record` 或 `record struct`
- 对于具有标识和生命周期的实体或类型，使用 `class`
- 对于服务边界和抽象，使用 `interface`
- 在应用程序代码中避免使用 `dynamic`；优先使用泛型或显式模型

```csharp
public sealed record UserDto(Guid Id, string Email);

public interface IUserRepository
{
    Task<UserDto?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
}
```

## 不可变性

- 对于共享状态，优先使用 `init` setter、构造函数参数和不可变集合
- 在生成更新状态时，不要原地修改输入模型

```csharp
public sealed record UserProfile(string Name, string Email);

public static UserProfile Rename(UserProfile profile, string name) =>
    profile with { Name = name };
```

## 异步与错误处理

- 优先使用 `async`/`await`，而非 `.Result` 或 `.Wait()` 等阻塞式调用
- 在 public async API 中传递 `CancellationToken`
- 抛出具体的异常，并使用结构化属性记录日志

```csharp
public async Task<Order> LoadOrderAsync(
    Guid orderId,
    CancellationToken cancellationToken)
{
    try
    {
        return await repository.FindAsync(orderId, cancellationToken)
            ?? throw new InvalidOperationException($"Order {orderId} was not found.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to load order {OrderId}", orderId);
        throw;
    }
}
```

## 格式化

- 使用 `dotnet format` 进行格式化和 analyzer 修复
- 保持 `using` 指令有序组织，并移除未使用的导入
- 仅在保持可读性时才优先使用 expression-bodied members
