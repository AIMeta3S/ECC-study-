---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift Patterns

> 本文件扩展了 [common/patterns.md](../common/patterns.md)，补充 Swift 专属内容。

## Protocol-Oriented Design

定义小而聚焦的 protocol。使用 protocol extension 提供共享默认实现：

```swift
protocol Repository: Sendable {
    associatedtype Item: Identifiable & Sendable
    func find(by id: Item.ID) async throws -> Item?
    func save(_ item: Item) async throws
}
```

## 值类型

- 使用 struct 作为 DTO 和 model
- 使用带 associated value 的 enum 来建模不同的状态：

```swift
enum LoadState<T: Sendable>: Sendable {
    case idle
    case loading
    case loaded(T)
    case failed(Error)
}
```

## Actor Pattern

对于共享的可变状态，使用 actor 代替锁或 dispatch queue：

```swift
actor Cache<Key: Hashable & Sendable, Value: Sendable> {
    private var storage: [Key: Value] = [:]

    func get(_ key: Key) -> Value? { storage[key] }
    func set(_ key: Key, value: Value) { storage[key] = value }
}
```

## Dependency Injection

通过默认参数注入 protocol — 生产环境使用默认实现，测试注入 mock：

```swift
struct UserService {
    private let repository: any UserRepository

    init(repository: any UserRepository = DefaultUserRepository()) {
        self.repository = repository
    }
}
```

## 参考

参见 skill：`swift-actor-persistence`，了解基于 actor 的持久化 pattern。
参见 skill：`swift-protocol-di-testing`，了解基于 protocol 的 DI 与测试。
