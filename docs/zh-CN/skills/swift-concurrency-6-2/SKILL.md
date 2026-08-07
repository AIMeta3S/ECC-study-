---
name: swift-concurrency-6-2
description: Swift 6.2 Approachable Concurrency —— 默认单线程运行，使用 @concurrent 显式卸载到后台，为 MainActor 类型提供隔离的一致性。
---

# Swift 6.2 Approachable Concurrency

采用 Swift 6.2 并发模型的模式：代码默认单线程运行，并发通过显式引入。在不牺牲性能的前提下消除常见的 data race 错误。

## 何时启用

- 将 Swift 5.x 或 6.0/6.1 项目迁移到 Swift 6.2
- 解决 data race 安全相关的编译器错误
- 设计基于 MainActor 的 app 架构
- 将 CPU 密集型工作卸载到后台 thread
- 在 MainActor 隔离的类型上实现 protocol 一致性
- 在 Xcode 26 中启用 Approachable Concurrency 构建设置

## 核心问题：隐式后台卸载

在 Swift 6.1 及更早版本中，async function 可能被隐式卸载到后台 thread，即使看似安全的代码也会产生 data race 错误：

```swift
// Swift 6.1：错误
@MainActor
final class StickerModel {
    let photoProcessor = PhotoProcessor()

    func extractSticker(_ item: PhotosPickerItem) async throws -> Sticker? {
        guard let data = try await item.loadTransferable(type: Data.self) else { return nil }

        // 错误：发送 'self.photoProcessor' 有引发 data race 的风险
        return await photoProcessor.extractSticker(data: data, with: item.itemIdentifier)
    }
}
```

Swift 6.2 修复了这一问题：async function 默认留在调用方的 actor 上。

```swift
// Swift 6.2：OK —— async 留在 MainActor 上，无 data race
@MainActor
final class StickerModel {
    let photoProcessor = PhotoProcessor()

    func extractSticker(_ item: PhotosPickerItem) async throws -> Sticker? {
        guard let data = try await item.loadTransferable(type: Data.self) else { return nil }
        return await photoProcessor.extractSticker(data: data, with: item.itemIdentifier)
    }
}
```

## 核心模式 —— 隔离的一致性

MainActor 类型现在可以安全地实现 non-isolated protocol：

```swift
protocol Exportable {
    func export()
}

// Swift 6.1：错误 —— 跨越到了 main actor 隔离的代码
// Swift 6.2：使用隔离的一致性即可通过
extension StickerModel: @MainActor Exportable {
    func export() {
        photoProcessor.exportAsPNG()
    }
}
```

编译器确保该一致性仅在 main actor 上使用：

```swift
// OK —— ImageExporter 也是 @MainActor
@MainActor
struct ImageExporter {
    var items: [any Exportable]

    mutating func add(_ item: StickerModel) {
        items.append(item)  // 安全：相同的 actor 隔离
    }
}

// 错误 —— nonisolated 上下文不能使用 MainActor 一致性
nonisolated struct ImageExporter {
    var items: [any Exportable]

    mutating func add(_ item: StickerModel) {
        items.append(item)  // 错误：此处不能使用 main actor 隔离的一致性
    }
}
```

## 核心模式 —— 全局与静态变量

用 MainActor 保护全局/静态状态：

```swift
// Swift 6.1：错误 —— non-Sendable 类型可能存在共享可变状态
final class StickerLibrary {
    static let shared: StickerLibrary = .init()  // 错误
}

// 修复：用 @MainActor 标注
@MainActor
final class StickerLibrary {
    static let shared: StickerLibrary = .init()  // OK
}
```

### MainActor 默认推断模式

Swift 6.2 引入了一种模式：默认推断 MainActor —— 无需手动标注：

```swift
// 启用 MainActor 默认推断后：
final class StickerLibrary {
    static let shared: StickerLibrary = .init()  // 隐式 @MainActor
}

final class StickerModel {
    let photoProcessor: PhotoProcessor
    var selection: [PhotosPickerItem]  // 隐式 @MainActor
}

extension StickerModel: Exportable {  // 隐式 @MainActor 一致性
    func export() {
        photoProcessor.exportAsPNG()
    }
}
```

此模式为 opt-in，推荐用于 app、脚本及其他可执行 target。

## 核心模式 —— 用 @concurrent 处理后台工作

当需要真正的并行时，用 `@concurrent` 显式卸载：

> **重要：** 本示例需要 Approachable Concurrency 构建设置 —— SE-0466（MainActor 默认隔离）和 SE-0461（NonisolatedNonsendingByDefault）。启用后，`extractSticker` 留在调用方的 actor 上，使可变状态的访问变得安全。**未启用这些设置时，此代码存在 data race** —— 编译器会将其标记出来。

```swift
nonisolated final class PhotoProcessor {
    private var cachedStickers: [String: Sticker] = [:]

    func extractSticker(data: Data, with id: String) async -> Sticker {
        if let sticker = cachedStickers[id] {
            return sticker
        }

        let sticker = await Self.extractSubject(from: data)
        cachedStickers[id] = sticker
        return sticker
    }

    // 将耗时工作卸载到 concurrent thread pool
    @concurrent
    static func extractSubject(from data: Data) async -> Sticker { /* ... */ }
}

// 调用方必须 await
let processor = PhotoProcessor()
processedPhotos[item.id] = await processor.extractSticker(data: data, with: item.id)
```

使用 `@concurrent` 的步骤：
1. 将所属类型标记为 `nonisolated`
2. 为函数添加 `@concurrent`
3. 若尚未异步，则添加 `async`
4. 在调用处添加 `await`

## 关键设计决策

| 决策 | 理由 |
|------|------|
| 默认单线程 | 最自然的代码天生无 data race；并发为 opt-in |
| async 留在调用方的 actor 上 | 消除曾导致 data race 错误的隐式卸载 |
| 隔离的一致性 | MainActor 类型无需不安全的变通手段即可实现 protocol |
| `@concurrent` 显式 opt-in | 后台执行是经过深思熟虑的性能选择，而非意外 |
| MainActor 默认推断 | 减少 app target 上冗余的 `@MainActor` 标注 |
| opt-in 渐进采用 | 非破坏性迁移路径 —— 逐步启用各项特性 |

## 迁移步骤

1. **在 Xcode 中启用**：Build Settings 中的 Swift Compiler > Concurrency 部分
2. **在 SPM 中启用**：在 package manifest 中使用 `SwiftSettings` API
3. **使用迁移工具**：通过 swift.org/migration 自动修改代码
4. **从 MainActor 默认值开始**：为 app target 启用推断模式
5. **按需添加 `@concurrent`**：先做 profile，再卸载热点路径
6. **充分测试**：data race 问题变为编译期错误

## 最佳实践

- **从 MainActor 起步** —— 先写单线程代码，后续再优化
- **仅对 CPU 密集型工作使用 `@concurrent`** —— 图像处理、压缩、复杂计算
- **启用 MainActor 推断模式**，适用于以单线程为主的 app target
- **卸载前先做 profile** —— 使用 Instruments 找到真正的瓶颈
- **用 MainActor 保护全局变量** —— 全局/静态可变状态需要 actor 隔离
- **使用隔离的一致性**，而非 `nonisolated` 变通手段或 `@Sendable` 包装
- **渐进式迁移** —— 在构建设置中逐个启用特性

## 应避免的反模式

- 对每个 async function 都套用 `@concurrent`（多数并不需要后台执行）
- 在不理解隔离的情况下用 `nonisolated` 来压制编译器错误
- 在 actor 已提供同等安全性的情况下仍保留旧的 `DispatchQueue` 模式
- 在与并发相关的 Foundation Models 代码中跳过 `model.availability` 检查
- 与编译器对抗 —— 如果它报告 data race，代码就确实存在并发问题
- 假设所有 async 代码都在后台运行（Swift 6.2 默认：留在调用方的 actor 上）

## 何时使用

- 所有新的 Swift 6.2+ 项目（Approachable Concurrency 是推荐默认值）
- 将现有 app 从 Swift 5.x 或 6.0/6.1 并发迁移
- 在采用 Xcode 26 时解决 data race 安全相关的编译器错误
- 构建以 MainActor 为中心的 app 架构（多数 UI app）
- 性能优化 —— 将特定繁重计算卸载到后台
