---
name: flutter-dart-code-review
description: 与框架无关的 Flutter/Dart 代码审查清单，涵盖 widget 最佳实践、状态管理模式（BLoC、Riverpod、Provider、GetX、MobX、Signals）、Dart 惯用法、性能、无障碍、安全与整洁架构。
metadata:
  origin: ECC
---

# Flutter/Dart 代码审查最佳实践

用于审查 Flutter/Dart 应用的全面、与框架无关的清单。无论使用哪种状态管理方案、路由库或 DI 框架，这些原则都适用。

---

## 1. 项目整体健康度

- [ ] 项目遵循一致的目录结构（feature-first 或 layer-first）
- [ ] 关注点合理分离：UI、业务逻辑、数据层
- [ ] widget 中不含业务逻辑；widget 仅负责展示
- [ ] `pubspec.yaml` 整洁——无未使用的依赖，版本锁定得当
- [ ] `analysis_options.yaml` 包含严格的 lint 集合，并启用了严格的 analyzer 设置
- [ ] 生产代码中无 `print()` 语句——使用 `dart:developer` 的 `log()` 或某个日志 package
- [ ] 生成文件（`.g.dart`、`.freezed.dart`、`.gr.dart`）已更新或已加入 `.gitignore`
- [ ] 平台相关代码通过抽象隔离

---

## 2. Dart 语言陷阱

- [ ] **隐式 dynamic**：缺少类型注解导致 `dynamic`——启用 `strict-casts`、`strict-inference`、`strict-raw-types`
- [ ] **Null safety 滥用**：过度使用 `!`（bang operator）而非正确的 null 检查或 Dart 3 pattern matching（`if (value case var v?)`）
- [ ] **type promotion 失败**：本可用局部变量 promotion 时却使用 `this.field`
- [ ] **捕获范围过宽**：`catch (e)` 未使用 `on` 子句；应始终指定 exception 类型
- [ ] **捕获 `Error`**：`Error` 子类表明存在 bug，不应被捕获
- [ ] **未使用的 `async`**：标记为 `async` 但从未 `await` 的函数——多余开销
- [ ] **`late` 过度使用**：在 nullable 或构造函数初始化更安全的地方使用了 `late`；将错误延迟到运行时
- [ ] **循环中的字符串拼接**：迭代构建字符串应使用 `StringBuffer` 而非 `+`
- [ ] **`const` 上下文中的可变状态**：`const` 构造函数类的字段不应可变
- [ ] **忽略 `Future` 返回值**：使用 `await` 或显式调用 `unawaited()` 以表明意图
- [ ] **可用 `final` 时却用 `var`**：局部变量优先用 `final`，编译期常量用 `const`
- [ ] **相对导入**：使用 `package:` 导入以保持一致
- [ ] **暴露可变集合**：公开 API 应返回不可修改的视图，而非原始 `List`/`Map`
- [ ] **缺少 Dart 3 pattern matching**：优先使用 switch 表达式和 `if-case`，而非冗长的 `is` 检查与手动类型转换
- [ ] **为多返回值创建一次性类**：使用 Dart 3 records `(String, int)` 代替一次性 DTO
- [ ] **生产代码中的 `print()`**：使用 `dart:developer` 的 `log()` 或项目的日志 package；`print()` 没有日志级别，无法过滤

---

## 3. widget 最佳实践

### widget 拆分：
- [ ] 没有单个 widget 的 `build()` 方法超过约 80-100 行
- [ ] widget 按封装方式和变化方式（rebuild 边界）拆分
- [ ] 返回 widget 的私有 `_build*()` 辅助方法应提取为独立的 widget 类（启用 element 复用、const 传播与框架优化）
- [ ] 无需可变局部状态时优先使用 StatelessWidget 而非 StatefulWidget
- [ ] 可复用的已提取 widget 放在独立文件中

### const 用法：
- [ ] 尽可能使用 `const` 构造函数——避免不必要的 rebuild
- [ ] 不变集合使用 `const` 字面量（`const []`、`const {}`）
- [ ] 所有字段为 final 时将构造函数声明为 `const`

### Key 用法：
- [ ] 在列表/网格中使用 `ValueKey` 以在重排序时保留状态
- [ ] 谨慎使用 `GlobalKey`——仅在确需跨树访问状态时使用
- [ ] 在 `build()` 中避免使用 `UniqueKey`——它会导致每一帧都 rebuild
- [ ] 身份基于数据对象而非单个值时使用 `ObjectKey`

### 主题与设计系统：
- [ ] 颜色取自 `Theme.of(context).colorScheme`——不硬编码 `Colors.red` 或十六进制值
- [ ] 文本样式取自 `Theme.of(context).textTheme`——不使用带原始字号的内联 `TextStyle`
- [ ] 已验证 dark mode 兼容性——不假设浅色背景
- [ ] 间距与尺寸使用一致的设计 token 或常量，而非 magic number

### build 方法复杂度：
- [ ] `build()` 中无网络调用、文件 I/O 或重计算
- [ ] `build()` 中无 `Future.then()` 或 `async` 工作
- [ ] `build()` 中不创建 subscription（`.listen()`）
- [ ] `setState()` 限定到最小子树

---

## 4. 状态管理（与框架无关）

这些原则适用于所有 Flutter 状态管理方案（BLoC、Riverpod、Provider、GetX、MobX、Signals、ValueNotifier 等）。

### 架构：
- [ ] 业务逻辑位于 widget 层之外——在状态管理组件中（BLoC、Notifier、Controller、Store、ViewModel 等）
- [ ] 状态管理器通过注入获取依赖，而非内部自行构造
- [ ] service 或 repository 层抽象数据源——widget 与状态管理器不应直接调用 API 或数据库
- [ ] 状态管理器职责单一——不存在处理无关关注点的"上帝"管理器
- [ ] 跨组件依赖遵循所选方案的约定：
  - 在 **Riverpod** 中：provider 通过 `ref.watch` 依赖其他 provider 是正常的——仅标记循环或过度纠缠的依赖链
  - 在 **BLoC** 中：bloc 不应直接依赖其他 bloc——优先使用共享 repository 或表现层协调
  - 在其他方案中：遵循文档中关于组件间通信的约定

### 不可变性与值相等（适用于不可变状态方案：BLoC、Riverpod、Redux）：
- [ ] 状态对象不可变——通过 `copyWith()` 或构造函数创建新实例，从不原地修改
- [ ] 状态类正确实现 `==` 和 `hashCode`（比较时包含所有字段）
- [ ] 项目内机制统一——手动 override、`Equatable`、`freezed`、Dart records 或其他
- [ ] 状态对象内的集合不作为原始可变 `List`/`Map` 暴露

### 响应式纪律（适用于响应式变更方案：MobX、GetX、Signals）：
- [ ] 状态仅通过方案的响应式 API 变更（MobX 的 `@action`、signals 的 `.value`、GetX 的 `.obs`）——直接字段修改会绕过变更追踪
- [ ] 派生值使用方案的 computed 机制，而非冗余存储
- [ ] reaction 与 disposer 正确清理（MobX 的 `ReactionDisposer`、Signals 的 effect cleanup）

### 状态形态设计：
- [ ] 互斥状态使用 sealed type、union 变体或方案内置的 async 状态类型（如 Riverpod 的 `AsyncValue`）——而非布尔标志（`isLoading`、`isError`、`hasData`）
- [ ] 每个 async 操作都将 loading、success、error 建模为独立状态
- [ ] 所有状态变体在 UI 中穷尽处理——无被静默忽略的情况
- [ ] error 状态携带用于展示的错误信息；loading 状态不携带过期数据
- [ ] 不用 nullable 数据作为 loading 标识——状态应显式

```dart
// 糟糕 —— 布尔标志泛滥，允许了不可能的状态
class UserState {
  bool isLoading = false;
  bool hasError = false; // isLoading && hasError 是可表示的！
  User? user;
}

// 良好（不可变方式）—— sealed type 使不可能的状态无法被表达
sealed class UserState {}
class UserInitial extends UserState {}
class UserLoading extends UserState {}
class UserLoaded extends UserState {
  final User user;
  const UserLoaded(this.user);
}
class UserError extends UserState {
  final String message;
  const UserError(this.message);
}

// 良好（响应式方式）—— observable enum + data，通过响应式 API 变更
// enum UserStatus { initial, loading, loaded, error }
// 使用你所用方案的 observable/signal 分别包装 status 和 data
```

### rebuild 优化：
- [ ] 状态消费者 widget（Builder、Consumer、Observer、Obx、Watch 等）作用域尽可能窄
- [ ] 使用 selector 仅在特定字段变化时 rebuild——而非每次状态推送都 rebuild
- [ ] 使用 `const` widget 阻止 rebuild 在树中传播
- [ ] computed/derived 状态通过响应式方式计算，而非冗余存储

### subscription 与 disposal：
- [ ] 所有手动 subscription（`.listen()`）在 `dispose()` / `close()` 中取消
- [ ] 不再需要时关闭 stream controller
- [ ] timer 在 disposal 生命周期中取消
- [ ] 优先使用框架管理的生命周期而非手动 subscription（声明式 builder 优于 `.listen()`）
- [ ] async 回调中 `setState` 前检查 `mounted`
- [ ] 在 `await` 之后使用 `BuildContext` 前未检查 `context.mounted`（Flutter 3.7+）——过期的 context 会导致崩溃
- [ ] async 间隔后不执行导航、对话框或 scaffold 消息，除非确认 widget 仍 mounted
- [ ] `BuildContext` 永不存储于 singleton、状态管理器或 static 字段中

### 局部状态与全局状态：
- [ ] 临时 UI 状态（checkbox、slider、animation）使用局部状态（`setState`、`ValueNotifier`）
- [ ] 共享状态仅提升到必要的高度——不过度全局化
- [ ] feature 作用域内的状态在 feature 不再活跃时被正确 dispose

---

## 5. 性能

### 不必要的 rebuild：
- [ ] `setState()` 不在根 widget 层级调用——将状态变更局部化
- [ ] 使用 `const` widget 阻止 rebuild 传播
- [ ] 独立重绘的复杂子树周围使用 `RepaintBoundary`
- [ ] `AnimatedBuilder` 的 child 参数用于与动画无关的子树

### build() 中的高开销操作：
- [ ] `build()` 中不对大集合排序、过滤或 map——应在状态管理层计算
- [ ] `build()` 中不编译 regex
- [ ] `MediaQuery.of(context)` 的使用要具体化（如 `MediaQuery.sizeOf(context)`）

### 图片优化：
- [ ] 网络图片使用缓存（任何适合项目的缓存方案）
- [ ] 图片分辨率匹配目标设备（缩略图不加载 4K 图片）
- [ ] `Image.asset` 使用 `cacheWidth`/`cacheHeight` 按显示尺寸解码
- [ ] 为网络图片提供占位 widget 与错误 widget

### 懒加载：
- [ ] 大型或动态列表使用 `ListView.builder` / `GridView.builder` 而非 `ListView(children: [...])`（小型静态列表使用具体构造函数即可）
- [ ] 大数据集实现分页
- [ ] web 构建中对重型库使用 deferred loading（`deferred as`）

### 其他：
- [ ] 动画中避免使用 `Opacity` widget——使用 `AnimatedOpacity` 或 `FadeTransition`
- [ ] 动画中避免 clipping——预先裁剪图片
- [ ] widget 上不 override `operator ==`——改用 `const` 构造函数
- [ ] 谨慎使用 intrinsic dimension widget（`IntrinsicHeight`、`IntrinsicWidth`）（额外布局遍历）

---

## 6. 测试

### 测试类型与期望：
- [ ] **单元测试**：覆盖所有业务逻辑（状态管理器、repository、工具函数）
- [ ] **widget 测试**：覆盖单个 widget 的行为、交互与视觉输出
- [ ] **集成测试**：端到端覆盖关键用户流程
- [ ] **Golden 测试**：对设计关键 UI 组件做像素级比对

### 覆盖率目标：
- [ ] 业务逻辑行覆盖率目标 80%+
- [ ] 所有状态迁移都有对应测试（loading → success、loading → error、retry 等）
- [ ] 测试边界情况：空状态、错误状态、loading 状态、边界值

### 测试隔离：
- [ ] 外部依赖（API client、数据库、service）被 mock 或 fake
- [ ] 每个测试文件只测试一个类/单元
- [ ] 测试验证行为，而非实现细节
- [ ] stub 只定义每个测试所需的行为（最小化 stubbing）
- [ ] 测试用例间无共享可变状态

### widget 测试质量：
- [ ] `pumpWidget` 与 `pump` 正确用于 async 操作
- [ ] 恰当使用 `find.byType`、`find.text`、`find.byKey`
- [ ] 不存在依赖时序的 flaky 测试——使用 `pumpAndSettle` 或显式 `pump(Duration)`
- [ ] 测试在 CI 中运行，失败阻断合并

---

## 7. 无障碍

### 语义 widget：
- [ ] 自动 label 不足时使用 `Semantics` widget 提供 screen reader label
- [ ] 纯装饰元素使用 `ExcludeSemantics`
- [ ] 使用 `MergeSemantics` 将相关 widget 合并为单个可访问元素
- [ ] 图片设置了 `semanticLabel` 属性

### screen reader 支持：
- [ ] 所有交互元素可聚焦并有有意义的描述
- [ ] 焦点顺序合理（遵循视觉阅读顺序）

### 视觉无障碍：
- [ ] 文本与背景的对比度 >= 4.5:1
- [ ] 可点击目标至少 48x48 像素
- [ ] 颜色不是状态的唯一标识（同时使用图标/文本）
- [ ] 文本随系统字号设置缩放

### 交互无障碍：
- [ ] 无空操作 `onPressed` 回调——每个按钮要么有作用，要么被禁用
- [ ] 错误字段给出修正建议
- [ ] 用户输入数据时上下文不意外变化

---

## 8. 平台相关问题

### iOS/Android 差异：
- [ ] 在合适场景使用平台自适应 widget
- [ ] 正确处理返回导航（Android 返回键、iOS 右滑返回）
- [ ] 状态栏与安全区域通过 `SafeArea` widget 处理
- [ ] 平台相关权限在 `AndroidManifest.xml` 和 `Info.plist` 中声明

### 响应式设计：
- [ ] 使用 `LayoutBuilder` 或 `MediaQuery` 实现响应式布局
- [ ] 断点定义一致（phone、tablet、desktop）
- [ ] 文本在小屏不溢出——使用 `Flexible`、`Expanded`、`FittedBox`
- [ ] 横屏方向已测试或显式锁定
- [ ] web 特有：支持鼠标/键盘交互，存在 hover 状态

---

## 9. 安全

### 安全存储：
- [ ] 敏感数据（token、凭据）使用平台安全存储（iOS 的 Keychain、Android 的 EncryptedSharedPreferences）
- [ ] 永不在明文存储中存放 secret
- [ ] 对敏感操作考虑使用生物识别认证门控

### API key 处理：
- [ ] API key 不硬编码在 Dart 源码中——使用 `--dart-define`、将 `.env` 文件排除出 VCS，或使用编译期配置
- [ ] secret 不提交到 git——检查 `.gitignore`
- [ ] 真正机密的 key 使用后端代理（client 永不持有 server secret）

### 输入校验：
- [ ] 所有用户输入在发送到 API 前校验
- [ ] 表单校验使用正确的校验模式
- [ ] 不对用户输入使用原始 SQL 或字符串插值
- [ ] deep link URL 在导航前校验与消毒

### 网络安全：
- [ ] 所有 API 调用强制 HTTPS
- [ ] 高安全应用考虑 certificate pinning
- [ ] authentication token 正确刷新与过期处理
- [ ] 不记录或打印敏感数据

---

## 10. package/依赖审查

### 评估 pub.dev package：
- [ ] 检查 **pub points 得分**（目标 130+/160）
- [ ] 检查 **likes** 与 **popularity** 作为社区信号
- [ ] 确认发布者在 pub.dev 上已 **verified**
- [ ] 检查最近发布日期——陈旧 package（>1 年）有风险
- [ ] 审查 open issue 与维护者响应时间
- [ ] 检查许可证与项目兼容
- [ ] 确认平台支持覆盖你的目标平台

### 版本约束：
- [ ] 依赖使用 caret 语法（`^1.2.3`）——允许兼容更新
- [ ] 仅在绝对必要时锁定精确版本
- [ ] 定期运行 `flutter pub outdated` 追踪陈旧依赖
- [ ] 生产 `pubspec.yaml` 中无 dependency override——仅用于临时修复并附注释/issue 链接
- [ ] 最小化 transitive dependency 数量——每个依赖都是攻击面

### Monorepo 专属（melos/workspace）：
- [ ] 内部 package 仅从公开 API 导入——禁止 `package:other/src/internal.dart`（破坏 Dart package 封装）
- [ ] 内部 package 依赖使用 workspace 解析，而非硬编码 `path: ../../` 相对字符串
- [ ] 所有子 package 共享或继承根 `analysis_options.yaml`

---

## 11. 导航与路由

### 通用原则（适用于任何路由方案）：
- [ ] 一致地使用一种路由方式——不混用命令式 `Navigator.push` 与声明式 router
- [ ] 路由参数有类型——不使用 `Map<String, dynamic>` 或 `Object?` 强转
- [ ] 路由路径定义为常量、enum 或生成代码——不在代码中散落 magic string
- [ ] auth guard/redirect 集中管理——不在各个 screen 中重复
- [ ] 为 Android 和 iOS 都配置 deep link
- [ ] deep link URL 在导航前校验与消毒
- [ ] 导航状态可测试——路由变更可在测试中验证
- [ ] 所有平台上返回行为正确

---

## 12. 错误处理

### 框架错误处理：
- [ ] override `FlutterError.onError` 捕获框架错误（build、layout、paint）
- [ ] 设置 `PlatformDispatcher.instance.onError` 处理 Flutter 未捕获的 async 错误
- [ ] release mode 下自定义 `ErrorWidget.builder`（用户友好而非红屏）
- [ ] `runApp` 外层包裹全局错误捕获（如 `runZonedGuarded`、Sentry/Crashlytics wrapper）

### 错误上报：
- [ ] 已集成错误上报 service（Firebase Crashlytics、Sentry 或同等方案）
- [ ] non-fatal 错误附带 stack trace 上报
- [ ] 状态管理错误 observer 接入错误上报（如 BlocObserver、ProviderObserver 或所用方案的同等组件）
- [ ] 错误报告附带用户可识别信息（user ID）以便调试

### 优雅降级：
- [ ] API 错误呈现用户友好的错误 UI，而非崩溃
- [ ] 为瞬时网络故障提供重试机制
- [ ] 离线状态被优雅处理
- [ ] 状态管理中的 error 状态携带用于展示的错误信息
- [ ] 原始 exception（网络、解析）在到达 UI 前映射为用户友好的本地化消息——绝不向用户展示原始 exception 字符串

---

## 13. 国际化（l10n）

### 设置：
- [ ] 已配置本地化方案（Flutter 内置 ARB/l10n、easy_localization 或同等方案）
- [ ] 应用配置中声明支持的区域

### 内容：
- [ ] 所有用户可见字符串使用本地化系统——widget 中无硬编码字符串
- [ ] 模板文件包含给译者的描述/上下文
- [ ] 复数、性别、选择使用 ICU message 语法
- [ ] placeholder 定义带类型
- [ ] 各区域间无缺失 key

### 代码审查：
- [ ] 全项目一致使用本地化访问器
- [ ] 日期、时间、数字与货币格式化遵循区域设置
- [ ] 若面向阿拉伯语、希伯来语等，需支持文本方向（RTL）
- [ ] 本地化文本不使用字符串拼接——使用参数化消息

---

## 14. 依赖注入

### 原则（适用于任何 DI 方式）：
- [ ] 类在层边界依赖抽象（interface），而非具体实现
- [ ] 依赖通过构造函数、DI 框架或 provider 图从外部提供——而非内部创建
- [ ] 注册区分生命周期：singleton、factory、lazy singleton
- [ ] 环境专属绑定（dev/staging/prod）使用配置，而非运行时 `if` 检查
- [ ] DI 图中无循环依赖
- [ ] service locator 调用（若使用）不散落在业务逻辑中

---

## 15. 静态分析

### 配置：
- [ ] 存在 `analysis_options.yaml` 且启用严格设置
- [ ] 严格的 analyzer 设置：`strict-casts: true`、`strict-inference: true`、`strict-raw-types: true`
- [ ] 包含完整的 lint 规则集（very_good_analysis、flutter_lints 或自定义严格规则）
- [ ] monorepo 中所有子 package 继承或共享根分析选项

### 执行：
- [ ] 已提交代码中无未解决的 analyzer 警告
- [ ] lint 抑制（`// ignore:`）有注释说明理由
- [ ] `flutter analyze` 在 CI 中运行，失败阻断合并

### 无论使用哪个 lint package 都需校验的关键规则：
- [ ] `prefer_const_constructors`——widget 树中的性能
- [ ] `avoid_print`——使用正确的日志
- [ ] `unawaited_futures`——防止 fire-and-forget async bug
- [ ] `prefer_final_locals`——变量级不可变性
- [ ] `always_declare_return_types`——显式契约
- [ ] `avoid_catches_without_on_clauses`——具体的错误处理
- [ ] `always_use_package_imports`——一致的导入风格

---

## 状态管理速查

下表将通用原则映射到其在主流方案中的实现。借此可将审查规则适配到项目所用方案。

| 原则 | BLoC/Cubit | Riverpod | Provider | GetX | MobX | Signals | 内置 |
|-----------|-----------|----------|----------|------|------|---------|----------|
| 状态容器 | `Bloc`/`Cubit` | `Notifier`/`AsyncNotifier` | `ChangeNotifier` | `GetxController` | `Store` | `signal()` | `StatefulWidget` |
| UI consumer | `BlocBuilder` | `ConsumerWidget` | `Consumer` | `Obx`/`GetBuilder` | `Observer` | `Watch` | `setState` |
| selector | `BlocSelector`/`buildWhen` | `ref.watch(p.select(...))` | `Selector` | N/A | computed | `computed()` | N/A |
| 副作用 | `BlocListener` | `ref.listen` | `Consumer` 回调 | `ever()`/`once()` | `reaction` | `effect()` | 回调 |
| disposal | 通过 `BlocProvider` 自动 | `.autoDispose` | 通过 `Provider` 自动 | `onClose()` | `ReactionDisposer` | 手动 | `dispose()` |
| 测试 | `blocTest()` | `ProviderContainer` | 直接使用 `ChangeNotifier` | 测试中 `Get.put` | 直接使用 store | 直接使用 signal | widget 测试 |

---

## 参考来源

- [Effective Dart: Style](https://dart.dev/effective-dart/style)
- [Effective Dart: Usage](https://dart.dev/effective-dart/usage)
- [Effective Dart: Design](https://dart.dev/effective-dart/design)
- [Flutter Performance Best Practices](https://docs.flutter.dev/perf/best-practices)
- [Flutter Testing Overview](https://docs.flutter.dev/testing/overview)
- [Flutter Accessibility](https://docs.flutter.dev/ui/accessibility-and-internationalization/accessibility)
- [Flutter Internationalization](https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization)
- [Flutter Navigation and Routing](https://docs.flutter.dev/ui/navigation)
- [Flutter Error Handling](https://docs.flutter.dev/testing/errors)
- [Flutter State Management Options](https://docs.flutter.dev/data-and-backend/state-mgmt/options)
