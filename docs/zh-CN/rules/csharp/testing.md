---
paths:
  - "**/*.cs"
  - "**/*.csx"
  - "**/*.csproj"
---
# C# 测试

> 本文件扩展了 [common/testing.md](../common/testing.md)，增加了 C# 特定内容。

## 测试框架

- 单元测试和集成测试首选 **xUnit**
- 使用 **FluentAssertions** 进行可读性强的断言
- 使用 **Moq** 或 **NSubstitute** 模拟依赖项
- 当集成测试需要真实基础设施时，使用 **Testcontainers**

## 测试组织

- 在 `tests/` 下镜像 `src/` 的结构
- 清晰区分单元测试、集成测试和端到端测试的覆盖范围
- 按行为而非实现细节命名测试

```csharp
public sealed class OrderServiceTests
{
    [Fact]
    public async Task FindByIdAsync_ReturnsOrder_WhenOrderExists()
    {
        // 准备
        // 执行
        // 断言
    }
}
```

## ASP.NET Core 集成测试

- 使用 `WebApplicationFactory<TEntryPoint>` 进行 API 集成覆盖
- 通过 HTTP 测试认证、校验和序列化，而不是绕过 middleware

## 覆盖率

- 目标为 80% 以上的行覆盖率
- 将覆盖重点放在领域逻辑、校验、认证和失败路径上
- 在 CI 中运行 `dotnet test`，并在可用时启用覆盖率收集
