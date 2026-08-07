---
paths:
  - "**/*.java"
---
# Java 编码风格

> 本文件扩展了 [common/coding-style.md](../common/coding-style.md)，补充 Java 特定内容。

## 格式

- 使用 **google-java-format** 或 **Checkstyle**（Google 或 Sun 风格）进行强制执行
- 每个文件一个 public 顶层类型
- 一致的缩进：2 或 4 个空格（与项目标准保持一致）
- 成员顺序：常量、字段、构造函数、public method、protected、private

## 不可变性

- 对 value 类型优先使用 `record`（Java 16+）
- 默认将字段标记为 `final` —— 仅在需要时才使用可变状态
- 从 public API 返回防御性副本：`List.copyOf()`、`Map.copyOf()`、`Set.copyOf()`
- Copy-on-write：返回新实例而不是修改现有实例

```java
// GOOD —— 不可变 value 类型
public record OrderSummary(Long id, String customerName, BigDecimal total) {}

// GOOD —— final 字段，无 setter
public class Order {
    private final Long id;
    private final List<LineItem> items;

    public List<LineItem> getItems() {
        return List.copyOf(items);
    }
}
```

## 命名

遵循标准 Java 约定：
- `PascalCase` 用于 class、interface、record、enum
- `camelCase` 用于 method、字段、parameter、局部变量
- `SCREAMING_SNAKE_CASE` 用于 `static final` 常量
- package：全小写，反向域名（`com.example.app.service`）

## 现代 Java 特性

在能提升清晰度的地方使用现代语言特性：
- **Records** 用于 DTO 和 value 类型（Java 16+）
- **Sealed classes** 用于封闭类型层次结构（Java 17+）
- **Pattern matching** 配合 `instanceof` —— 无需显式 cast（Java 16+）
- **Text blocks** 用于多行字符串 —— SQL、JSON 模板（Java 15+）
- **Switch expressions** 使用箭头语法（Java 14+）
- **Pattern matching in switch** —— 穷尽的 sealed 类型处理（Java 21+）

```java
// Pattern matching instanceof
if (shape instanceof Circle c) {
    return Math.PI * c.radius() * c.radius();
}

// Sealed 类型层次结构
public sealed interface PaymentMethod permits CreditCard, BankTransfer, Wallet {}

// Switch expression
String label = switch (status) {
    case ACTIVE -> "Active";
    case SUSPENDED -> "Suspended";
    case CLOSED -> "Closed";
};
```

## Optional 用法

- 从可能无结果的 finder 方法返回 `Optional<T>`
- 使用 `map()`、`flatMap()`、`orElseThrow()` —— 绝不在没有 `isPresent()` 的情况下调用 `get()`
- 绝不将 `Optional` 用作 field 类型或 method parameter

```java
// GOOD
return repository.findById(id)
    .map(ResponseDto::from)
    .orElseThrow(() -> new OrderNotFoundException(id));

// BAD —— Optional 作为 parameter
public void process(Optional<String> name) {}
```

## 错误处理

- 对 domain 错误优先使用 unchecked exception
- 创建继承 `RuntimeException` 的 domain 专属 exception
- 除非在顶层 handler 中，否则避免宽泛的 `catch (Exception e)`
- 在 exception 消息中包含上下文

```java
public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(Long id) {
        super("Order not found: id=" + id);
    }
}
```

## Streams

- 使用 stream 进行转换；保持 pipeline 简短（最多 3-4 个操作）
- 在可读性更好时优先使用 method reference：`.map(Order::getTotal)`
- 避免 stream 操作中的 side effect
- 对于复杂逻辑，优先使用循环而非晦涩的 stream pipeline

## 参考

参见 skill：`java-coding-standards`，获取带示例的完整编码标准。
参见 skill：`jpa-patterns`，获取 JPA/Hibernate entity 设计模式。
