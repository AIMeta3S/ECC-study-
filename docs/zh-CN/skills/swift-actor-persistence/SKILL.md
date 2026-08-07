---
name: swift-actor-persistence
description: 在 Swift 中使用 actor 实现线程安全的数据持久化 —— 内存 cache 配合基于文件的存储，从设计上消除 data race。
metadata:
  origin: ECC
---

# 使用 Swift actor 实现线程安全的持久化

使用 Swift actor 构建线程安全数据持久化层的模式。将内存 cache 与基于文件的存储相结合，借助 actor model 在编译期消除 data race。

## 何时启用

- 在 Swift 5.5+ 中构建数据持久化层
- 需要对共享可变状态进行线程安全访问
- 希望消除手动同步（锁、DispatchQueue）
- 构建带有本地存储的离线优先应用

## 核心模式

### 基于 actor 的 Repository

actor model 保证串行访问 —— 不会出现 data race，由编译器强制执行。

```swift
public actor LocalRepository<T: Codable & Identifiable> where T.ID == String {
    private var cache: [String: T] = [:]
    private let fileURL: URL

    public init(directory: URL = .documentsDirectory, filename: String = "data.json") {
        self.fileURL = directory.appendingPathComponent(filename)
        // init 期间的同步加载（actor isolation 尚未生效）
        self.cache = Self.loadSynchronously(from: fileURL)
    }

    // MARK: - 公共 API

    public func save(_ item: T) throws {
        cache[item.id] = item
        try persistToFile()
    }

    public func delete(_ id: String) throws {
        cache[id] = nil
        try persistToFile()
    }

    public func find(by id: String) -> T? {
        cache[id]
    }

    public func loadAll() -> [T] {
        Array(cache.values)
    }

    // MARK: - 私有

    private func persistToFile() throws {
        let data = try JSONEncoder().encode(Array(cache.values))
        try data.write(to: fileURL, options: .atomic)
    }

    private static func loadSynchronously(from url: URL) -> [String: T] {
        guard let data = try? Data(contentsOf: url),
              let items = try? JSONDecoder().decode([T].self, from: data) else {
            return [:]
        }
        return Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) })
    }
}
```

### 用法

由于 actor isolation，所有调用都会自动变为 async：

```swift
let repository = LocalRepository<Question>()

// 读取 —— 从内存 cache 进行快速的 O(1) 查找
let question = await repository.find(by: "q-001")
let allQuestions = await repository.loadAll()

// 写入 —— 更新 cache 并 atomic 地持久化到文件
try await repository.save(newQuestion)
try await repository.delete("q-001")
```

### 与 @Observable ViewModel 结合使用

```swift
@Observable
final class QuestionListViewModel {
    private(set) var questions: [Question] = []
    private let repository: LocalRepository<Question>

    init(repository: LocalRepository<Question> = LocalRepository()) {
        self.repository = repository
    }

    func load() async {
        questions = await repository.loadAll()
    }

    func add(_ question: Question) async throws {
        try await repository.save(question)
        questions = await repository.loadAll()
    }
}
```

## 关键设计决策

| 决策 | 理由 |
|----------|-----------|
| actor（而非 class + lock） | 编译器强制的线程安全，无需手动同步 |
| 内存 cache + 文件持久化 | 从 cache 快速读取，向磁盘持久化写入 |
| init 同步加载 | 避免 async 初始化的复杂性 |
| 以 ID 为键的 Dictionary | 按标识符进行 O(1) 查找 |
| 对 `Codable & Identifiable` 泛型 | 可跨任意模型类型复用 |
| atomic 文件写入（`.atomic`） | 防止崩溃时出现部分写入 |

## 最佳实践

- 所有跨越 actor 边界的数据都**使用 `Sendable` 类型**
- **保持 actor 的 public API 精简** —— 只暴露领域操作，不暴露持久化细节
- **使用 `.atomic` 写入**，防止应用在写入中途崩溃导致数据损坏
- **在 `init` 中同步加载** —— async 初始化器会增加复杂性，而对本地文件收益甚微
- 与 `@Observable` ViewModel 结合，实现响应式 UI 更新

## 应避免的反模式

- 在新的 Swift concurrency 代码中使用 `DispatchQueue` 或 `NSLock` 而非 actor
- 将内部 cache dictionary 暴露给外部调用方
- 在无校验的情况下让文件 URL 可配置
- 忘记所有 actor 方法调用都需要 `await` —— 调用方必须处理 async 上下文
- 使用 `nonisolated` 绕过 actor isolation（违背初衷）

## 适用场景

- iOS/macOS 应用中的本地数据存储（用户数据、设置、cache 内容）
- 之后与服务器同步的离线优先架构
- 应用中多个部分并发访问的任何共享可变状态
- 用现代 Swift concurrency 替代基于 `DispatchQueue` 的传统线程安全方案
