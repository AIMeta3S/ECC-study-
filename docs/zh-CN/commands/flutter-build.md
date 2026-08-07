---
description: 增量修复 Dart analyzer 错误和 Flutter 构建失败。调用 dart-build-resolver agent 进行最小化的精准修复。
---

# Flutter 构建与修复

本命令调用 **dart-build-resolver** agent，以最小改动增量修复 Dart/Flutter 构建错误。

## 本命令的功能

1. **运行诊断**：执行 `flutter analyze`、`flutter pub get`
2. **解析错误**：按文件分组并按 severity 排序
3. **增量修复**：一次修复一个错误
4. **验证每个修复**：每次改动后重新运行分析
5. **报告汇总**：展示已修复内容和剩余问题

## 使用时机

在以下情况使用 `/flutter-build`：
- `flutter analyze` 报告错误
- `flutter build` 在任何平台上失败
- `dart pub get` / `flutter pub get` 因版本冲突而失败
- `build_runner` 生成代码失败
- 拉取导致构建失败的改动后

## 运行的诊断命令

```bash
# 分析
flutter analyze 2>&1

# 依赖
flutter pub get 2>&1

# 代码生成（如果项目使用 build_runner）
dart run build_runner build --delete-conflicting-outputs 2>&1

# 平台构建
flutter build apk 2>&1
flutter build web 2>&1
```

## 示例会话

````text
User: /flutter-build

Agent:
# Flutter 构建问题解决

## 初始诊断

```
$ flutter analyze
Analyzing project...

  error • lib/features/user/data/user_repository_impl.dart:34:16 •
    A value of type 'String?' can't be assigned to a variable of type 'String'. •
    invalid_assignment

  error • lib/features/cart/presentation/cart_page.dart:58:5 •
    The method 'add' isn't defined for the type 'List<Item>'.
    Try correcting the name to the name of an existing method, or defining a method named 'add'. •
    undefined_method

2 errors found.
```

## 修复 1：Null Safety

文件：lib/features/user/data/user_repository_impl.dart:34
错误：A value of type 'String?' can't be assigned to type 'String'

改动：
```dart
final id = response.id;
```
改为：
```dart
final id = response.id ?? '';
```

```
$ flutter analyze
1 error found.
```

## 修复 2：Immutable List

文件：lib/features/cart/presentation/cart_page.dart:58
错误：The method 'add' isn't defined for the type 'List<Item>'
原因：state 持有不可变 list；修改通过 Cubit 进行

改动：
```dart
state.items.add(item);
```
改为：
```dart
context.read<CartCubit>().addItem(item);
// 注意：Cubit 暴露命名方法（addItem、removeItem）；
// .add(event) 是 BLoC event API —— 不要混用。
```

```
$ flutter analyze
No issues found!
```

## 最终验证

```
$ flutter test
All tests passed.
```

## 汇总

| 指标 | 数量 |
|--------|-------|
| 已修复分析错误 | 2 |
| 已修改文件 | 2 |
| 剩余问题 | 0 |

构建状态：PASS ✓
````

## 已修复的常见错误

| 错误 | 典型修复 |
|-------|-------------|
| `A value of type 'X?' can't be assigned to 'X'` | 添加 `?? default` 或 null guard |
| `The name 'X' isn't defined` | 添加 import 或修复拼写错误 |
| `Non-nullable instance field must be initialized` | 添加初始化器或 `late` |
| `Version solving failed` | 调整 pubspec.yaml 中的版本约束 |
| `Missing concrete implementation of 'X'` | 实现缺失的 interface 方法 |
| `build_runner: Part of X expected` | 删除过期的 `.g.dart` 并重新构建 |

## 修复策略

1. **先修复分析错误** —— 代码必须无错误
2. **其次处理 warning** —— 修复可能导致运行时 bug 的 warning
3. **再次处理 pub 冲突** —— 修复依赖解析
4. **一次一个修复** —— 验证每次改动
5. **最小改动** —— 不 refactor，只修复

## 停止条件

agent 将在以下情况停止并报告：
- 同一错误在 3 次尝试后仍然存在
- 修复引入更多错误
- 需要架构层面的改动
- package 升级冲突需要用户决策

## 相关命令

- `/flutter-test` —— 构建成功后运行测试
- `/flutter-review` —— 审查代码质量
- `verification-loop` skill —— 完整的验证循环

## 相关

- Agent：`agents/dart-build-resolver.md`
- Skill：`skills/flutter-dart-code-review/`
