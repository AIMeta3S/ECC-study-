---
name: swift-protocol-di-testing
description: 基于 protocol 的 dependency injection，用于可测试的 Swift 代码——使用聚焦的 protocol 和 Swift Testing 对文件系统、网络和外部 API 进行 mock。
metadata:
  origin: ECC
---

# 用于测试的 Swift 基于 Protocol 的 Dependency Injection

通过将外部依赖（文件系统、网络、iCloud）抽象到小型、聚焦的 protocol 背后，使 Swift 代码可测试的模式。能够实现无需 I/O 的确定性测试。

## 何时激活

- 编写访问文件系统、网络或外部 API 的 Swift 代码时
- 需要在不触发真实失败的情况下测试错误处理路径
- 构建可跨环境工作的模块（app、test、SwiftUI preview）
- 设计与 Swift concurrency（actor、Sendable）配套的可测试架构

## 核心模式

### 1. 定义小型、聚焦的 Protocol

每个 protocol 只负责一个外部关注点。

```swift
// 文件系统访问
public protocol FileSystemProviding: Sendable {
    func containerURL(for purpose: Purpose) -> URL?
}

// 文件读写操作
public protocol FileAccessorProviding: Sendable {
    func read(from url: URL) throws -> Data
    func write(_ data: Data, to url: URL) throws
    func fileExists(at url: URL) -> Bool
}

// Bookmark 存储（例如用于沙盒应用）
public protocol BookmarkStorageProviding: Sendable {
    func saveBookmark(_ data: Data, for key: String) throws
    func loadBookmark(for key: String) throws -> Data?
}
```

### 2. 创建默认（生产环境）实现

```swift
public struct DefaultFileSystemProvider: FileSystemProviding {
    public init() {}

    public func containerURL(for purpose: Purpose) -> URL? {
        FileManager.default.url(forUbiquityContainerIdentifier: nil)
    }
}

public struct DefaultFileAccessor: FileAccessorProviding {
    public init() {}

    public func read(from url: URL) throws -> Data {
        try Data(contentsOf: url)
    }

    public func write(_ data: Data, to url: URL) throws {
        try data.write(to: url, options: .atomic)
    }

    public func fileExists(at url: URL) -> Bool {
        FileManager.default.fileExists(atPath: url.path)
    }
}
```

### 3. 为测试创建 Mock 实现

```swift
public final class MockFileAccessor: FileAccessorProviding, @unchecked Sendable {
    public var files: [URL: Data] = [:]
    public var readError: Error?
    public var writeError: Error?

    public init() {}

    public func read(from url: URL) throws -> Data {
        if let error = readError { throw error }
        guard let data = files[url] else {
            throw CocoaError(.fileReadNoSuchFile)
        }
        return data
    }

    public func write(_ data: Data, to url: URL) throws {
        if let error = writeError { throw error }
        files[url] = data
    }

    public func fileExists(at url: URL) -> Bool {
        files[url] != nil
    }
}
```

### 4. 通过默认参数注入依赖

生产代码使用默认实现；测试注入 mock。

```swift
public actor SyncManager {
    private let fileSystem: FileSystemProviding
    private let fileAccessor: FileAccessorProviding

    public init(
        fileSystem: FileSystemProviding = DefaultFileSystemProvider(),
        fileAccessor: FileAccessorProviding = DefaultFileAccessor()
    ) {
        self.fileSystem = fileSystem
        self.fileAccessor = fileAccessor
    }

    public func sync() async throws {
        guard let containerURL = fileSystem.containerURL(for: .sync) else {
            throw SyncError.containerNotAvailable
        }
        let data = try fileAccessor.read(
            from: containerURL.appendingPathComponent("data.json")
        )
        // 处理数据...
    }
}
```

### 5. 使用 Swift Testing 编写测试

```swift
import Testing

@Test("Sync manager handles missing container")
func testMissingContainer() async {
    let mockFileSystem = MockFileSystemProvider(containerURL: nil)
    let manager = SyncManager(fileSystem: mockFileSystem)

    await #expect(throws: SyncError.containerNotAvailable) {
        try await manager.sync()
    }
}

@Test("Sync manager reads data correctly")
func testReadData() async throws {
    let mockFileAccessor = MockFileAccessor()
    mockFileAccessor.files[testURL] = testData

    let manager = SyncManager(fileAccessor: mockFileAccessor)
    let result = try await manager.loadData()

    #expect(result == expectedData)
}

@Test("Sync manager handles read errors gracefully")
func testReadError() async {
    let mockFileAccessor = MockFileAccessor()
    mockFileAccessor.readError = CocoaError(.fileReadCorruptFile)

    let manager = SyncManager(fileAccessor: mockFileAccessor)

    await #expect(throws: SyncError.self) {
        try await manager.sync()
    }
}
```

## 最佳实践

- **单一职责**：每个 protocol 应只处理一个关注点——不要创建包含大量方法的"god protocol"
- **Sendable 一致性**：当 protocol 跨越 actor 边界使用时必需
- **默认参数**：让生产代码默认使用真实实现；只有测试需要指定 mock
- **错误模拟**：为 mock 设计可配置的错误属性，用于测试失败路径
- **只 mock 边界**：对外部依赖（文件系统、网络、API）进行 mock，不对内部类型 mock

## 应避免的反模式

- 创建一个覆盖所有外部访问的大型 protocol
- 对没有外部依赖的内部类型进行 mock
- 使用 `#if DEBUG` 条件编译，而非正确的 dependency injection
- 在与 actor 配合使用时忘记 `Sendable` 一致性
- 过度设计：如果一个类型没有外部依赖，就不需要 protocol

## 何时使用

- 任何涉及文件系统、网络或外部 API 的 Swift 代码
- 测试在真实环境中难以触发的错误处理路径
- 构建需要在 app、test 和 SwiftUI preview 上下文中工作的模块
- 使用 Swift concurrency（actor、structured concurrency）且需要可测试架构的应用
