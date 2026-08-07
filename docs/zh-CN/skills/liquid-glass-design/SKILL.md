---
name: liquid-glass-design
description: iOS 26 Liquid Glass 设计系统 —— 具备模糊、反射与交互式形变的动态玻璃材质，适用于 SwiftUI、UIKit 和 WidgetKit。
---

# Liquid Glass 设计系统（iOS 26）

实现 Apple 的 Liquid Glass 的模式 —— 这是一种动态材质，能模糊其背后的内容，反射周围内容的颜色与光线，并对触摸和指针交互做出反应。涵盖 SwiftUI、UIKit 与 WidgetKit 的集成。

## 何时激活

- 使用新设计语言为 iOS 26+ 构建或更新 app
- 实现 glass 风格的按钮、卡片、工具栏或容器
- 在 glass 元素之间创建形变过渡
- 将 Liquid Glass 效果应用于 widget
- 将现有的模糊/材质效果迁移到新的 Liquid Glass API

## 核心模式 —— SwiftUI

### 基础 Glass 效果

向任何视图添加 Liquid Glass 的最简方式：

```swift
Text("Hello, World!")
    .font(.title)
    .padding()
    .glassEffect()  // 默认：regular 变体，capsule 形状
```

### 自定义 Shape 与 Tint

```swift
Text("Hello, World!")
    .font(.title)
    .padding()
    .glassEffect(.regular.tint(.orange).interactive(), in: .rect(cornerRadius: 16.0))
```

关键自定义选项：
- `.regular` — 标准 glass 效果
- `.tint(Color)` — 添加色调以突出显示
- `.interactive()` — 对触摸和指针交互做出反应
- Shape：`.capsule`（默认）、`.rect(cornerRadius:)`、`.circle`

### Glass 按钮样式

```swift
Button("Click Me") { /* 动作 */ }
    .buttonStyle(.glass)

Button("Important") { /* 动作 */ }
    .buttonStyle(.glassProminent)
```

### 用于多个元素的 GlassEffectContainer

为提升性能并支持形变，始终将多个 glass 视图包裹在容器中：

```swift
GlassEffectContainer(spacing: 40.0) {
    HStack(spacing: 40.0) {
        Image(systemName: "scribble.variable")
            .frame(width: 80.0, height: 80.0)
            .font(.system(size: 36))
            .glassEffect()

        Image(systemName: "eraser.fill")
            .frame(width: 80.0, height: 80.0)
            .font(.system(size: 36))
            .glassEffect()
    }
}
```

`spacing` 参数控制合并距离 —— 元素越近，其 glass 形状越会融合在一起。

### 合并 Glass 效果

使用 `glassEffectUnion` 将多个视图合并为单个 glass 形状：

```swift
@Namespace private var namespace

GlassEffectContainer(spacing: 20.0) {
    HStack(spacing: 20.0) {
        ForEach(symbolSet.indices, id: \.self) { item in
            Image(systemName: symbolSet[item])
                .frame(width: 80.0, height: 80.0)
                .glassEffect()
                .glassEffectUnion(id: item < 2 ? "group1" : "group2", namespace: namespace)
        }
    }
}
```

### 形变过渡

当 glass 元素出现/消失时创建平滑的形变效果：

```swift
@State private var isExpanded = false
@Namespace private var namespace

GlassEffectContainer(spacing: 40.0) {
    HStack(spacing: 40.0) {
        Image(systemName: "scribble.variable")
            .frame(width: 80.0, height: 80.0)
            .glassEffect()
            .glassEffectID("pencil", in: namespace)

        if isExpanded {
            Image(systemName: "eraser.fill")
                .frame(width: 80.0, height: 80.0)
                .glassEffect()
                .glassEffectID("eraser", in: namespace)
        }
    }
}

Button("Toggle") {
    withAnimation { isExpanded.toggle() }
}
.buttonStyle(.glass)
```

### 在 Sidebar 下方扩展水平滚动

要允许水平滚动内容延伸到 sidebar 或 inspector 下方，需确保 `ScrollView` 的内容触及容器的 leading/trailing 边缘。当布局延伸到边缘时，系统会自动处理 sidebar 下方滚动行为 —— 无需额外的 modifier。

## 核心模式 —— UIKit

### 基础 UIGlassEffect

```swift
let glassEffect = UIGlassEffect()
glassEffect.tintColor = UIColor.systemBlue.withAlphaComponent(0.3)
glassEffect.isInteractive = true

let visualEffectView = UIVisualEffectView(effect: glassEffect)
visualEffectView.translatesAutoresizingMaskIntoConstraints = false
visualEffectView.layer.cornerRadius = 20
visualEffectView.clipsToBounds = true

view.addSubview(visualEffectView)
NSLayoutConstraint.activate([
    visualEffectView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
    visualEffectView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    visualEffectView.widthAnchor.constraint(equalToConstant: 200),
    visualEffectView.heightAnchor.constraint(equalToConstant: 120)
])

// 向 contentView 添加内容
let label = UILabel()
label.text = "Liquid Glass"
label.translatesAutoresizingMaskIntoConstraints = false
visualEffectView.contentView.addSubview(label)
NSLayoutConstraint.activate([
    label.centerXAnchor.constraint(equalTo: visualEffectView.contentView.centerXAnchor),
    label.centerYAnchor.constraint(equalTo: visualEffectView.contentView.centerYAnchor)
])
```

### 用于多个元素的 UIGlassContainerEffect

```swift
let containerEffect = UIGlassContainerEffect()
containerEffect.spacing = 40.0

let containerView = UIVisualEffectView(effect: containerEffect)

let firstGlass = UIVisualEffectView(effect: UIGlassEffect())
let secondGlass = UIVisualEffectView(effect: UIGlassEffect())

containerView.contentView.addSubview(firstGlass)
containerView.contentView.addSubview(secondGlass)
```

### Scroll Edge Effects

```swift
scrollView.topEdgeEffect.style = .automatic
scrollView.bottomEdgeEffect.style = .hard
scrollView.leftEdgeEffect.isHidden = true
```

### Toolbar Glass 集成

```swift
let favoriteButton = UIBarButtonItem(image: UIImage(systemName: "heart"), style: .plain, target: self, action: #selector(favoriteAction))
favoriteButton.hidesSharedBackground = true  // 不使用共享 glass 背景
```

## 核心模式 —— WidgetKit

### 渲染模式检测

```swift
struct MyWidgetView: View {
    @Environment(\.widgetRenderingMode) var renderingMode

    var body: some View {
        if renderingMode == .accented {
            // Tinted 模式：白色色调、带主题的 glass 背景
        } else {
            // Full color 模式：标准外观
        }
    }
}
```

### 用于视觉层级的 Accent Group

```swift
HStack {
    VStack(alignment: .leading) {
        Text("Title")
            .widgetAccentable()  // Accent group
        Text("Subtitle")
            // Primary group（默认）
    }
    Image(systemName: "star.fill")
        .widgetAccentable()  // Accent group
}
```

### Accented 模式下的图片渲染

```swift
Image("myImage")
    .widgetAccentedRenderingMode(.monochrome)
```

### 容器背景

```swift
VStack { /* 内容 */ }
    .containerBackground(for: .widget) {
        Color.blue.opacity(0.2)
    }
```

## 关键设计决策

| 决策 | 理由 |
|----------|-----------|
| GlassEffectContainer 包裹 | 性能优化，支持 glass 元素之间的形变 |
| `spacing` 参数 | 控制合并距离 —— 微调元素需要多近才会融合 |
| `@Namespace` + `glassEffectID` | 在视图层级变化时实现平滑的形变过渡 |
| `interactive()` modifier | 显式 opt-in 以响应触摸/指针交互 —— 并非所有 glass 都应响应 |
| UIKit 中的 UIGlassContainerEffect | 与 SwiftUI 保持一致的容器模式 |
| widget 中的 Accented rendering mode | 当用户选择着色主屏幕时，系统会应用着色 glass |

## 最佳实践

- 在向多个同级视图应用 glass 时，**务必使用 GlassEffectContainer** —— 它能实现形变并提升渲染性能
- 在其他外观 modifier（frame、font、padding）之后**应用 `.glassEffect()`**
- 仅对响应用户交互的元素（按钮、可切换项）**使用 `.interactive()`**
- 在容器中**谨慎选择 spacing**，以控制 glass 效果何时合并
- 在更改视图层级时**使用 `withAnimation`**，以实现平滑的形变过渡
- **在不同外观下测试** —— light mode、dark mode 以及 accented/tinted 模式
- **确保无障碍对比度** —— glass 上的文本必须保持可读

## 应避免的反模式

- 在没有 GlassEffectContainer 的情况下使用多个独立的 `.glassEffect()` 视图
- 嵌套过多 glass 效果 —— 会降低性能与视觉清晰度
- 对每个视图都应用 glass —— 应保留给交互元素、工具栏和卡片
- 在 UIKit 中使用圆角时忘记设置 `clipsToBounds = true`
- 忽略 widget 中的 accented rendering mode —— 会破坏着色主屏幕的外观
- 在 glass 后方使用不透明背景 —— 会破坏半透明效果

## 何时使用

- 采用新 iOS 26 设计的导航栏、工具栏和标签栏
- 悬浮操作按钮和卡片式容器
- 需要视觉深度和触摸反馈的交互控件
- 应与系统 Liquid Glass 外观集成的 widget
- 相关 UI 状态之间的形变过渡
