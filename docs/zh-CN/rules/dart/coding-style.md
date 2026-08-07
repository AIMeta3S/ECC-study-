---
paths:
  - "**/*.dart"
  - "**/pubspec.yaml"
  - "**/analysis_options.yaml"
---
# Dart/Flutter 编码风格

> 本文件是对 [common/coding-style.md](../common/coding-style.md) 的扩展，补充 Dart 和 Flutter 特有的内容。

## 格式化

- 对所有 `.dart` 文件使用 **dart format** — 在 CI 中强制执行（`dart format --set-exit-if-changed .`）
- 行长度：80 个字符（dart format 默认值）
- 多行 argument/parameter 列表使用尾随逗号，以改善 diff 和格式化效果

## Immutability

- 局部变量优先使用 `final`，编译期常量使用 `const`
- 当所有字段均为 `final` 时，应尽可能使用 `const` 构造函数
- 从公开的 API 返回不可修改的集合（`List.unmodifiable`、`Map.unmodifiable`）
- 在 immutable 状态类中使用 `copyWith()` 进行状态变更

```dart
// 反例
var count = 0;
List<String> items = ['a', 'b'];

// 正例
final count = 0;
const items = ['a', 'b'];
```

## 命名

遵循 Dart 命名约定：
- 变量、参数和命名构造函数使用 `camelCase`
- 类、enum、typedef 和 extension 使用 `PascalCase`
- 文件名和库名使用 `snake_case`
- 顶层用 `const` 声明的常量使用 `SCREAMING_SNAKE_CASE`
- 私有成员以 `_` 为前缀
- Extension 的命名应描述其扩展的类型：应使用 `StringExtensions`，而不是 `MyHelpers`

## Null Safety

- 避免使用 `!`（bang operator）—— 优先使用 `?.`、`??`、`if (x != null)` 或 Dart 3 的 pattern matching；仅当 null 值属于编程错误、且崩溃是正确行为时才保留 `!`
- 避免使用 `late`，除非能保证在首次使用前完成初始化（优先使用 nullable 或在构造函数中初始化）
- 对于必须始终提供的构造函数参数，使用 `required`

```dart
// 反例 — 如果 user 为 null 则在运行时崩溃
final name = user!.name;

// 正例 — null-aware 操作符
final name = user?.name ?? 'Unknown';

// 正例 — Dart 3 pattern matching（exhaustive，由编译器检查）
final name = switch (user) {
  User(:final name) => name,
  null => 'Unknown',
};

// 正例 — 提前返回的 null 守卫
String getUserName(User? user) {
  if (user == null) return 'Unknown';
  return user.name; // 守卫之后提升为 non-null
}
```

## Sealed Types 与 Pattern Matching（Dart 3+）

使用 sealed class 来建模封闭的状态层级：

```dart
sealed class AsyncState<T> {
  const AsyncState();
}

final class Loading<T> extends AsyncState<T> {
  const Loading();
}

final class Success<T> extends AsyncState<T> {
  const Success(this.data);
  final T data;
}

final class Failure<T> extends AsyncState<T> {
  const Failure(this.error);
  final Object error;
}
```

对 sealed types 始终使用 exhaustive `switch` —— 不使用 default/wildcard：

```dart
// 反例
if (state is Loading) { ... }

// 正例
return switch (state) {
  Loading() => const CircularProgressIndicator(),
  Success(:final data) => DataWidget(data),
  Failure(:final error) => ErrorWidget(error.toString()),
};
```

## 错误处理

- 在 `on` 子句中指定异常类型 —— 永远不要使用裸的 `catch (e)`
- 永远不要捕获 `Error` 的子类型 —— 它们表示编程 bug
- 对于可恢复的错误，使用 `Result` 风格的类型或 sealed class
- 避免使用异常进行流程控制

```dart
// 反例
try {
  await fetchUser();
} catch (e) {
  log(e.toString());
}

// 正例
try {
  await fetchUser();
} on NetworkException catch (e) {
  log('Network error: ${e.message}');
} on NotFoundException {
  handleNotFound();
}
```

## Async / Futures

- 始终 `await` Future，或显式调用 `unawaited()` 以表明故意采用 fire-and-forget
- 如果一个函数从不 `await` 任何内容，永远不要将其标记为 `async`
- 对于并发操作，使用 `Future.wait` / `Future.any`
- 在任何 `await` 之后使用 `BuildContext` 之前，检查 `context.mounted`（Flutter 3.7+）

```dart
// 反例 — 忽略 Future
fetchData(); // 未标明意图的 fire-and-forget

// 正例
unawaited(fetchData()); // 显式 fire-and-forget
await fetchData();      // 或正确地 await
```

## 导入

- 全部使用 `package:` 导入 —— 跨特性或跨层代码永远不要使用相对导入（`../`）
- 顺序：`dart:` → 外部 `package:` → 内部 `package:`（同一个 package）
- 禁止未使用的 import —— `dart analyze` 会通过 `unused_import` 规则强制执行

## 代码生成

- 生成文件（`.g.dart`、`.freezed.dart`、`.gr.dart`）必须统一地提交到版本库或加入 gitignore —— 每个项目选定一种策略
- 永远不要手动编辑生成文件
- 生成器注解（`@JsonSerializable`、`@freezed`、`@riverpod` 等）只应放在规范源文件上
