---
description: 运行 Flutter/Dart 测试，报告失败情况，并增量修复测试问题。涵盖单元测试、widget 测试、golden 测试和集成测试。
---

# Flutter 测试

本命令运行 Flutter 测试套件并报告结果。当出现失败时，它会增量地诊断并修复问题。

## 本命令的功能

1. **运行测试**：执行 `flutter test`（或限定到已更改的文件）
2. **解析失败**：按类型和原因识别失败的测试
3. **增量修复**：尽可能一次修复一个失败
4. **验证**：每次修复后重新运行
5. **报告**：显示覆盖率摘要和剩余的失败

## 何时使用

在以下情况下使用 `/flutter-test`：
- 实现功能后，验证没有破坏任何东西
- 运行 `/flutter-build` 后，确保测试通过
- 检查新代码的测试覆盖率
- 当特定测试文件失败时
- 提交 PR 之前

## 运行的命令

```bash
# 运行所有测试
flutter test 2>&1

# 运行并生成覆盖率
flutter test --coverage 2>&1

# 运行特定测试文件
flutter test test/unit/domain/usecases/get_user_test.dart 2>&1

# 运行匹配名称模式的测试
flutter test --name "CartBloc" 2>&1

# 运行集成测试（需要设备/模拟器）
flutter test integration_test/ 2>&1

# 当有意进行视觉更改时更新 golden 文件
flutter test --update-goldens 2>&1
```

## 示例会话

````text
User: /flutter-test

Agent:
# Flutter 测试运行

## 测试执行

```
$ flutter test
00:05 +42 -2: Some tests failed.

FAILED: test/unit/data/user_repository_test.dart
  UserRepository getById
    returns null when user not found
    Expected: null
    Actual: User(id: 'test-id', name: 'Test User')

FAILED: test/widget/cart_page_test.dart
  CartPage
    shows empty state when cart is empty
    Expected: exactly one widget with text 'Your cart is empty'
    Found: no widget with text 'Your cart is empty'
```

## 修复 1：Repository 测试

文件：test/unit/data/user_repository_test.dart
失败：`getById` 在应该为缺失的 ID 返回 null 时却返回了一个 user

根本原因：测试 setup 添加了 ID 为 'test-id' 的 user，但查询时用的是 'missing-id'。
修复：更新测试以使用 'missing-id' 查询 —— setup 是正确的，查询是错误的。

```
$ flutter test test/unit/data/user_repository_test.dart
1 test passed.
```

## 修复 2：Widget 测试

文件：test/widget/cart_page_test.dart
失败：未找到空状态文本 widget

根本原因：在 widget 中，空状态消息从 'Your cart is empty' 改名为 'Cart is empty'。
修复：更新测试字符串以匹配当前 widget 文案。

```
$ flutter test test/widget/cart_page_test.dart
1 test passed.
```

## 最终运行

```
$ flutter test --coverage
All 44 tests passed.
Coverage: 84.2% (target: 80%)
```

## 摘要

| 指标 | 值 |
|--------|-------|
| 总测试数 | 44 |
| 通过 | 44 |
| 失败 | 0 |
| 覆盖率 | 84.2% |

测试状态：PASS ✓
````

## 常见测试失败

| 失败 | 典型修复 |
|---------|-------------|
| `Expected: <X> Actual: <Y>` | 更新断言或修复实现 |
| `Widget not found` | 修复 finder 选择器或在 widget 重命名后更新测试 |
| `Golden file not found` | 运行 `flutter test --update-goldens` 生成 |
| `Golden mismatch` | 检查 diff；如果更改是有意的，运行 `--update-goldens` |
| `MissingPluginException` | 在测试 setup 中 mock platform channel |
| `LateInitializationError` | 在 `setUp()` 中初始化 `late` 字段 |
| `pumpAndSettle timed out` | 替换为显式的 `pump(Duration)` 调用 |

## 相关命令

- `/flutter-build` — 在运行测试前修复构建错误
- `/flutter-review` — 测试通过后审查代码
- `tdd-workflow` skill — 测试驱动开发工作流

## 相关

- Agent: `agents/flutter-reviewer.md`
- Agent: `agents/dart-build-resolver.md`
- Skill: `skills/flutter-dart-code-review/`
- Rules: `rules/dart/testing.md`
