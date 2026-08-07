---
paths:
  - "**/*.cs"
  - "**/*.csx"
---
# C# 模式

> 本文件用 C# 专属内容扩展了 [common/patterns.md](../common/patterns.md)。

## API Response Pattern

```csharp
public sealed record ApiResponse<T>(
    bool Success,
    T? Data = default,
    string? Error = null,
    object? Meta = null);
```

## Repository Pattern

```csharp
public interface IRepository<T>
{
    Task<IReadOnlyList<T>> FindAllAsync(CancellationToken cancellationToken);
    Task<T?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<T> CreateAsync(T entity, CancellationToken cancellationToken);
    Task<T> UpdateAsync(T entity, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}
```

## Options Pattern

使用强类型 options 进行配置，而不是在整个代码库中读取原始字符串。

```csharp
public sealed class PaymentsOptions
{
    public const string SectionName = "Payments";
    public required string BaseUrl { get; init; }
    public required string ApiKeySecretName { get; init; }
}
```

## Dependency Injection

- 在服务边界处依赖接口
- 保持构造函数聚焦；如果某个服务需要过多依赖，应拆分职责
- 有意识地注册 lifetimes：singleton 用于无状态/共享服务，scoped 用于请求数据，transient 用于轻量级纯 worker
