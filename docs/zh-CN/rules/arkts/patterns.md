---
paths:
  - "**/*.ets"
  - "**/*.ts"
---
# HarmonyOS / ArkTS 模式

> 本文件在 [common/patterns.md](../common/patterns.md) 基础上扩展了 HarmonyOS 与 ArkTS 专属模式。

## 状态管理：仅使用 V2

**必须使用** ArkUI 状态管理 V2。V1 decorators 已废弃，不得使用。

### V2 装饰器

| 装饰器 | 用途 |
|-----------|---------|
| `@ComponentV2` | 将 struct 标记为 V2 组件 |
| `@Local` | 组件内部的局部状态 |
| `@Param` | 从父组件接收的 props（只读）|
| `@Event` | 从子组件到父组件的回调事件 |
| `@Provider` | 向后代组件提供状态 |
| `@Consumer` | 消费来自祖先 `@Provider` 的状态 |
| `@Monitor` | 监听状态变化（替代 V1 的 `@Watch`）|
| `@Computed` | 派生/计算值 |
| `@ObservedV2` | 使类可被 V2 状态管理观察 |
| `@Trace` | 标记 `@ObservedV2` 类中的可观察属性 |

### 禁用的 V1 装饰器

严禁使用：`@State`、`@Prop`、`@Link`、`@ObjectLink`、`@Observed`、`@Provide`、`@Consume`、`@Watch`、`@Component`（改用 `@ComponentV2`）。

### V2 组件示例

```typescript
@ObservedV2
class UserModel {
  @Trace name: string = ''
  @Trace age: number = 0
}

@ComponentV2
struct UserCard {
  @Param user: UserModel = new UserModel()
  @Event onDelete: () => void = () => {}

  build() {
    Column() {
      Text(this.user.name)
        .fontSize($r('app.float.font_size_title'))
      Text(`${this.user.age}`)
        .fontSize($r('app.float.font_size_body'))
      Button($r('app.string.delete'))
        .onClick(() => this.onDelete())
    }
  }
}
```

### 状态同步

```typescript
@ComponentV2
struct ParentPage {
  @Provider('userState') userModel: UserModel = new UserModel()

  build() {
    Column() {
      ChildComponent()  // 自动接收 @Consumer('userState')
    }
  }
}

@ComponentV2
struct ChildComponent {
  @Consumer('userState') userModel: UserModel = new UserModel()

  build() {
    Text(this.userModel.name)
  }
}
```

## 路由：仅使用 Navigation

**必须使用** `Navigation` 组件配合 `NavPathStack`。严禁使用 `@ohos.router`。

### Navigation 配置

```typescript
@ComponentV2
struct MainPage {
  @Local navPathStack: NavPathStack = new NavPathStack()

  build() {
    Navigation(this.navPathStack) {
      // 首页内容
    }
    .navDestination(this.routerMap)
  }

  @Builder
  routerMap(name: string, param: ESObject) {
    if (name === 'detail') {
      DetailPage()
    } else if (name === 'settings') {
      SettingsPage()
    }
  }
}
```

### 页面导航

```typescript
// 推入新页面
this.navPathStack.pushPath({ name: 'detail', param: { id: '123' } })

// 替换当前页面
this.navPathStack.replacePath({ name: 'settings' })

// 弹出返回
this.navPathStack.pop()

// 弹出至根页面
this.navPathStack.clear()
```

### NavDestination 子页面

```typescript
@ComponentV2
struct DetailPage {
  build() {
    NavDestination() {
      Column() {
        Text($r('app.string.detail_title'))
      }
    }
    .title($r('app.string.detail_nav_title'))
  }
}
```

## 架构模式：MVVM

推荐用于 HarmonyOS 应用的架构：

```
feature/
  |-- model/           # 数据模型（@ObservedV2 类）
  |-- viewmodel/       # 业务逻辑（ViewModel 类）
  |-- view/            # UI 组件（@ComponentV2 struct）
  |-- service/         # API 调用、数据访问
```

- **View**：仅包含渲染逻辑，`build()` 中不写业务逻辑
- **ViewModel**：所有业务逻辑封装于此
- **Model**：带 `@ObservedV2` 和 `@Trace` 的纯数据类
- **Service**：网络请求、数据库操作、文件 I/O

## ArkUI 动画模式

### 状态驱动动画

```typescript
@ComponentV2
struct AnimatedCard {
  @Local isExpanded: boolean = false
  @Local cardScale: number = 0.8

  build() {
    Column() {
      // 内容
    }
    .scale({ x: this.cardScale, y: this.cardScale })
    .animation({ duration: 300, curve: Curve.EaseInOut })
    .onClick(() => {
      this.isExpanded = !this.isExpanded
      this.cardScale = this.isExpanded ? 1.0 : 0.8
    })
  }
}
```

### 动画规则

- 优先使用 HarmonyOS 原生动画 API 和高级模板
- 使用声明式 UI 配合状态驱动动画（通过改变状态变量触发动画）
- 对复杂子组件动画设置 `renderGroup(true)` 以减少渲染批次
- **严禁**在动画过程中频繁修改 `width`、`height`、`padding`、`margin`——会严重影响性能
- 使用 `animateTo` 进行显式动画控制
- 优先使用 `transform`（translate、scale、rotate）和 `opacity` 来实现高性能动画

## 性能模式

### 大列表使用 LazyForEach

```typescript
@ComponentV2
struct LargeList {
  @Local dataSource: MyDataSource = new MyDataSource()

  build() {
    List() {
      LazyForEach(this.dataSource, (item: ItemModel) => {
        ListItem() {
          ItemComponent({ item: item })
        }
      }, (item: ItemModel) => item.id)
    }
  }
}
```

### 组件复用

- 将可复用组件抽取到独立文件中
- 在组件内部使用 `@Builder` 构建轻量 UI 片段
- 使用 `@Param` 实现可配置组件

## 资源引用

始终将 UI 常量定义为资源，并通过 `$r()` 引用：

```typescript
// 反例：硬编码值
Text('Hello')
  .fontSize(16)
  .fontColor('#333333')

// 正例：资源引用
Text($r('app.string.greeting'))
  .fontSize($r('app.float.font_size_body'))
  .fontColor($r('app.color.text_primary'))
```
