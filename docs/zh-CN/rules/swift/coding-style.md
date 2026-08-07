---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift 编码风格

> 本文件在 [common/coding-style.md](../common/coding-style.md) 的基础上扩展了 Swift 特定内容。

## 格式化

- 使用 **SwiftFormat** 进行自动格式化，使用 **SwiftLint** 进行风格强制执行
- `swift-format` 作为替代方案，已内置于 Xcode 16+

## 不可变性

- 优先使用 `let` 而非 `var` —— 将所有内容定义为 `let`，仅在编译器要求时才改为 `var`
- 默认使用具备 value semantics 的 `struct`；仅在需要 identity 或 reference semantics 时才使用 `class`

## 命名

遵循 [Apple API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)：

- 使用点处应清晰明了 —— 省略不必要的词
- 根据方法与属性的角色命名，而非其类型
- 常量优先使用 `static let`，而非全局常量

## 错误处理

使用 typed throws（Swift 6+）与 pattern matching：

```swift
func load(id: String) throws(LoadError) -> Item {
    guard let data = try? read(from: path) else {
        throw .fileNotFound(id)
    }
    return try decode(data)
}
```

## 并发

启用 Swift 6 严格并发检查。优先采用：

- 跨越隔离边界的数据使用 `Sendable` 值类型
- 共享可变状态使用 actor
- 优先使用 structured concurrency（`async let`、`TaskGroup`），而非非结构化的 `Task {}`
