---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift Testing

> 本文件用 Swift 特定内容扩展了 [common/testing.md](../common/testing.md)。

## 框架

对新测试使用 **Swift Testing**（`import Testing`）。使用 `@Test` 和 `#expect`：

```swift
@Test("User creation validates email")
func userCreationValidatesEmail() throws {
    #expect(throws: ValidationError.invalidEmail) {
        try User(email: "not-an-email")
    }
}
```

## 测试隔离

每个测试都会获得一个全新的实例 —— 在 `init` 中初始化，在 `deinit` 中清理。测试之间不共享可变状态。

## 参数化测试

```swift
@Test("Validates formats", arguments: ["json", "xml", "csv"])
func validatesFormat(format: String) throws {
    let parser = try Parser(format: format)
    #expect(parser.isValid)
}
```

## 覆盖率

```bash
swift test --enable-code-coverage
```

## 参考

关于基于 protocol 的依赖注入以及与 Swift Testing 配合的 mock 模式，参见 skill：`swift-protocol-di-testing`。
