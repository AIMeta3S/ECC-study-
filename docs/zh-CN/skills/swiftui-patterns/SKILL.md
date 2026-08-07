---
name: swiftui-patterns
description: SwiftUI 架构模式、使用 @Observable 的状态管理、视图组合、导航、性能优化，以及现代 iOS/macOS UI 最佳实践。
---

# SwiftUI 模式

现代 SwiftUI 模式，用于在 Apple 平台上构建声明式、高性能的用户界面。涵盖 Observation 框架、视图组合、类型安全的导航以及性能优化。

## 何时启用

- 构建 SwiftUI 视图并管理状态（`@State`、`@Observable`、`@Binding`）
- 使用 `NavigationStack` 设计导航流程
- 组织 view model 与数据流
- 优化列表和复杂布局的渲染性能
- 在 SwiftUI 中使用 environment value 和依赖注入

## 状态管理

### Property Wrapper 选择

选择满足需求的最简单 wrapper：

| Wrapper | 使用场景 |
|---------|----------|
| `@State` | 视图局部的值类型（开关、表单字段、sheet 展示） |
| `@Binding` | 对父级 `@State` 的双向引用 |
| `@Observable` class + `@State` | 自有的多属性 model |
| `@Observable` class（无 wrapper） | 从父级传入的只读引用 |
| `@Bindable` | 对 `@Observable` 属性的双向 binding |
| `@Environment` | 通过 `.environment()` 注入的共享依赖 |

### @Observable ViewModel

使用 `@Observable`（而非 `ObservableObject`）——它会追踪属性级别的变化，使 SwiftUI 只重新渲染读取了该变化属性的视图：

```swift
@Observable
final class ItemListViewModel {
    private(set) var items: [Item] = []
    private(set) var isLoading = false
    var searchText = ""

    private let repository: any ItemRepository

    init(repository: any ItemRepository = DefaultItemRepository()) {
        self.repository = repository
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        items = (try? await repository.fetchAll()) ?? []
    }
}
```

### 消费 ViewModel 的视图

```swift
struct ItemListView: View {
    @State private var viewModel: ItemListViewModel

    init(viewModel: ItemListViewModel = ItemListViewModel()) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        List(viewModel.items) { item in
            ItemRow(item: item)
        }
        .searchable(text: $viewModel.searchText)
        .overlay { if viewModel.isLoading { ProgressView() } }
        .task { await viewModel.load() }
    }
}
```

### Environment 注入

用 `@Environment` 替换 `@EnvironmentObject`：

```swift
// 注入
ContentView()
    .environment(authManager)

// 消费
struct ProfileView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        Text(auth.currentUser?.name ?? "Guest")
    }
}
```

## 视图组合

### 提取子视图以限制失效范围

将视图拆分为小而专注的 struct。当状态变化时，只有读取了该状态的子视图会重新渲染：

```swift
struct OrderView: View {
    @State private var viewModel = OrderViewModel()

    var body: some View {
        VStack {
            OrderHeader(title: viewModel.title)
            OrderItemList(items: viewModel.items)
            OrderTotal(total: viewModel.total)
        }
    }
}
```

### 用于可复用样式的 ViewModifier

```swift
struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(.regularMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardModifier())
    }
}
```

## 导航

### 类型安全的 NavigationStack

将 `NavigationStack` 与 `NavigationPath` 配合使用，实现可编程的类型安全路由：

```swift
@Observable
final class Router {
    var path = NavigationPath()

    func navigate(to destination: Destination) {
        path.append(destination)
    }

    func popToRoot() {
        path = NavigationPath()
    }
}

enum Destination: Hashable {
    case detail(Item.ID)
    case settings
    case profile(User.ID)
}

struct RootView: View {
    @State private var router = Router()

    var body: some View {
        NavigationStack(path: $router.path) {
            HomeView()
                .navigationDestination(for: Destination.self) { dest in
                    switch dest {
                    case .detail(let id): ItemDetailView(itemID: id)
                    case .settings: SettingsView()
                    case .profile(let id): ProfileView(userID: id)
                    }
                }
        }
        .environment(router)
    }
}
```

## 性能

### 对大型集合使用 Lazy Container

`LazyVStack` 和 `LazyHStack` 仅在可见时才创建视图：

```swift
ScrollView {
    LazyVStack(spacing: 8) {
        ForEach(items) { item in
            ItemRow(item: item)
        }
    }
}
```

### 稳定的标识符

在 `ForEach` 中始终使用稳定且唯一的 ID —— 避免使用数组索引：

```swift
// 使用 Identifiable 一致性或显式 id
ForEach(items, id: \.stableID) { item in
    ItemRow(item: item)
}
```

### 避免在 body 中执行高开销操作

- 绝不要在 `body` 中执行 I/O、网络调用或繁重计算
- 使用 `.task {}` 处理异步工作 —— 当视图消失时会自动取消
- 在滚动视图中谨慎使用 `.sensoryFeedback()` 和 `.geometryGroup()`
- 在列表中尽量少用 `.shadow()`、`.blur()` 和 `.mask()` —— 它们会触发离屏渲染

### Equatable 一致性

对于 body 开销较高的视图，遵循 `Equatable` 以跳过不必要的重新渲染：

```swift
struct ExpensiveChartView: View, Equatable {
    let dataPoints: [DataPoint] // DataPoint 必须遵循 Equatable

    static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.dataPoints == rhs.dataPoints
    }

    var body: some View {
        // 复杂的图表渲染
    }
}
```

## 预览

使用 `#Preview` 宏配合内联 mock 数据以实现快速迭代：

```swift
#Preview("Empty state") {
    ItemListView(viewModel: ItemListViewModel(repository: EmptyMockRepository()))
}

#Preview("Loaded") {
    ItemListView(viewModel: ItemListViewModel(repository: PopulatedMockRepository()))
}
```

## 需要避免的 Anti-Patterns

- 在新代码中使用 `ObservableObject` / `@Published` / `@StateObject` / `@EnvironmentObject` —— 应迁移至 `@Observable`
- 将异步工作直接放在 `body` 或 `init` 中 —— 应使用 `.task {}` 或显式的加载方法
- 在不拥有数据的子视图中将 view model 创建为 `@State` —— 应改为从父级传入
- 使用 `AnyView` 类型擦除 —— 对条件视图应优先使用 `@ViewBuilder` 或 `Group`
- 在向 actor 传递数据或从中读取数据时忽略 `Sendable` 要求

## 参考

参见 skill：`swift-actor-persistence`，了解基于 actor 的持久化模式。
参见 skill：`swift-protocol-di-testing`，了解基于 protocol 的 DI 以及使用 Swift Testing 的测试。
