---
name: foundation-models-on-device
description: Apple FoundationModels 框架用于端侧 LLM —— 文本生成、使用 @Generable 的 guided generation、tool calling，以及 iOS 26+ 的 snapshot streaming。
---

# FoundationModels：端侧 LLM（iOS 26）

使用 FoundationModels 框架将 Apple 的端侧语言模型集成到 App 中的各种模式。涵盖文本生成、使用 `@Generable` 的结构化输出、自定义 tool calling 以及 snapshot streaming —— 全部在端侧运行，以支持隐私保护和离线使用。

## 何时激活

- 使用 Apple Intelligence 端侧能力构建 AI 驱动的功能
- 在不依赖云端的情况下生成或汇总文本
- 从自然语言输入中提取结构化数据
- 为特定领域的 AI 操作实现自定义 tool calling
- 流式传输结构化响应以实时更新 UI
- 需要保护隐私的 AI（数据不离开设备）

## 核心模式 —— 可用性检查

在创建 session 之前，始终检查模型可用性：

```swift
struct GenerativeView: View {
    private var model = SystemLanguageModel.default

    var body: some View {
        switch model.availability {
        case .available:
            ContentView()
        case .unavailable(.deviceNotEligible):
            Text("Device not eligible for Apple Intelligence")
        case .unavailable(.appleIntelligenceNotEnabled):
            Text("Please enable Apple Intelligence in Settings")
        case .unavailable(.modelNotReady):
            Text("Model is downloading or not ready")
        case .unavailable(let other):
            Text("Model unavailable: \(other)")
        }
    }
}
```

## 核心模式 —— 基础 Session

```swift
// 单轮：每次创建新的 session
let session = LanguageModelSession()
let response = try await session.respond(to: "What's a good month to visit Paris?")
print(response.content)

// 多轮：复用 session 以保留对话上下文
let session = LanguageModelSession(instructions: """
    You are a cooking assistant.
    Provide recipe suggestions based on ingredients.
    Keep suggestions brief and practical.
    """)

let first = try await session.respond(to: "I have chicken and rice")
let followUp = try await session.respond(to: "What about a vegetarian option?")
```

instructions 的要点：
- 定义模型角色（"You are a mentor"）
- 指定要做什么（"Help extract calendar events"）
- 设置风格偏好（"Respond as briefly as possible"）
- 添加安全措施（"Respond with 'I can't help with that' for dangerous requests"）

## 核心模式 —— 使用 `@Generable` 的 Guided Generation

生成结构化的 Swift 类型，而非原始字符串：

### 1. 定义 Generable 类型

```swift
@Generable(description: "Basic profile information about a cat")
struct CatProfile {
    var name: String

    @Guide(description: "The age of the cat", .range(0...20))
    var age: Int

    @Guide(description: "A one sentence profile about the cat's personality")
    var profile: String
}
```

### 2. 请求结构化输出

```swift
let response = try await session.respond(
    to: "Generate a cute rescue cat",
    generating: CatProfile.self
)

// 直接访问结构化字段
print("Name: \(response.content.name)")
print("Age: \(response.content.age)")
print("Profile: \(response.content.profile)")
```

### 支持的 `@Guide` 约束

- `.range(0...20)` —— 数值范围
- `.count(3)` —— 数组元素数量
- `description:` —— 用于生成的语义指引

## 核心模式 —— Tool Calling

让模型调用自定义代码以执行特定领域的任务：

### 1. 定义 Tool

```swift
struct RecipeSearchTool: Tool {
    let name = "recipe_search"
    let description = "Search for recipes matching a given term and return a list of results."

    @Generable
    struct Arguments {
        var searchTerm: String
        var numberOfResults: Int
    }

    func call(arguments: Arguments) async throws -> ToolOutput {
        let recipes = await searchRecipes(
            term: arguments.searchTerm,
            limit: arguments.numberOfResults
        )
        return .string(recipes.map { "- \($0.name): \($0.description)" }.joined(separator: "\n"))
    }
}
```

### 2. 使用 Tools 创建 Session

```swift
let session = LanguageModelSession(tools: [RecipeSearchTool()])
let response = try await session.respond(to: "Find me some pasta recipes")
```

### 3. 处理 Tool 错误

```swift
do {
    let answer = try await session.respond(to: "Find a recipe for tomato soup.")
} catch let error as LanguageModelSession.ToolCallError {
    print(error.tool.name)
    if case .databaseIsEmpty = error.underlyingError as? RecipeSearchToolError {
        // 处理特定的 tool 错误
    }
}
```

## 核心模式 —— Snapshot Streaming

使用 `PartiallyGenerated` 类型流式传输结构化响应以实现实时 UI：

```swift
@Generable
struct TripIdeas {
    @Guide(description: "Ideas for upcoming trips")
    var ideas: [String]
}

let stream = session.streamResponse(
    to: "What are some exciting trip ideas?",
    generating: TripIdeas.self
)

for try await partial in stream {
    // partial: TripIdeas.PartiallyGenerated（所有属性均为 Optional）
    print(partial)
}
```

### SwiftUI 集成

```swift
@State private var partialResult: TripIdeas.PartiallyGenerated?
@State private var errorMessage: String?

var body: some View {
    List {
        ForEach(partialResult?.ideas ?? [], id: \.self) { idea in
            Text(idea)
        }
    }
    .overlay {
        if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
    }
    .task {
        do {
            let stream = session.streamResponse(to: prompt, generating: TripIdeas.self)
            for try await partial in stream {
                partialResult = partial
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
```

## 关键设计决策

| 决策 | 原因 |
|------|------|
| 端侧执行 | 隐私保护 —— 数据不离开设备；可离线工作 |
| 4,096 token 限制 | 端侧模型约束；跨 session 对大数据分块 |
| Snapshot streaming（而非增量） | 对结构化输出友好；每个 snapshot 是一个完整的部分状态 |
| `@Generable` macro | 为结构化生成提供编译期安全；自动生成 `PartiallyGenerated` 类型 |
| 每个 session 单次请求 | `isResponding` 防止并发请求；如需要可创建多个 session |
| `response.content`（而非 `.output`） | 正确的 API —— 始终通过 `.content` 属性访问结果 |

## 最佳实践

- **始终检查 `model.availability`** —— 在创建 session 之前处理所有不可用情况
- **使用 `instructions`** 引导模型行为 —— 其优先级高于 prompt
- **在发送新请求之前检查 `isResponding`** —— session 一次只处理一个请求
- **通过 `response.content`** 访问结果 —— 而非 `.output`
- **将大输入拆分为分块** —— 4,096 token 限制适用于 instructions + prompt + output 的总和
- **使用 `@Generable`** 进行结构化输出 —— 比解析原始字符串提供更强的保证
- **使用 `GenerationOptions(temperature:)`** 调节创造性（数值越高越有创造性）
- **使用 Instruments 监控** —— 用 Xcode Instruments 分析请求性能

## 应避免的反模式

- 未先检查 `model.availability` 就创建 session
- 发送超过 4,096 token context window 的输入
- 在单个 session 上尝试并发请求
- 使用 `.output` 而非 `.content` 访问响应数据
- 当 `@Generable` 结构化输出可用时，仍解析原始字符串响应
- 在单个 prompt 中构建复杂的多步骤逻辑 —— 应拆分为多个聚焦的 prompt
- 假设模型始终可用 —— 设备资格和设置各不相同

## 适用场景

- 为隐私敏感的 App 进行端侧文本生成
- 从用户输入中提取结构化数据（表单、自然语言命令）
- 必须离线工作的 AI 辅助功能
- 逐步展示生成内容的流式 UI
- 通过 tool calling 实现特定领域的 AI 操作（搜索、计算、查询）
