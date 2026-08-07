---
name: dart-testing
description: Dart 与 Flutter 项目的测试规范，涵盖单元测试、Widget 测试、Golden 测试、集成测试，以及 BLoC、Riverpod 等状态管理器的测试模式与覆盖率要求。
---

# Dart/Flutter 测试

> 本文件在 [common/testing.md](../common/testing.md) 基础上扩展了 Dart 和 Flutter 特定的内容。

## 测试框架

- **flutter_test** / **dart:test** — 内置测试运行器
- **mockito**（配合 `@GenerateMocks`）或 **mocktail**（无需 codegen）用于 mock
- **bloc_test** 用于 BLoC/Cubit 单元测试
- **fake_async** 用于在单元测试中控制时间
- **integration_test** 用于真机端到端测试

## 测试类型

| 类型 | 工具 | 位置 | 何时编写 |
|------|------|----------|---------------|
| Unit | `dart:test` | `test/unit/` | 所有领域逻辑、状态管理器、repository |
| Widget | `flutter_test` | `test/widget/` | 所有具有实际行为的 widget |
| Golden | `flutter_test` | `test/golden/` | 对设计至关重要的 UI 组件 |
| Integration | `integration_test` | `integration_test/` | 真机/模拟器上的关键用户流程 |

## 单元测试：状态管理器

### 使用 `bloc_test` 的 BLoC

```dart
group('CartBloc', () {
  late CartBloc bloc;
  late MockCartRepository repository;

  setUp(() {
    repository = MockCartRepository();
    bloc = CartBloc(repository);
  });

  tearDown(() => bloc.close());

  blocTest<CartBloc, CartState>(
    'emits updated items when CartItemAdded',
    build: () => bloc,
    act: (b) => b.add(CartItemAdded(testItem)),
    expect: () => [CartState(items: [testItem])],
  );

  blocTest<CartBloc, CartState>(
    'emits empty cart when CartCleared',
    seed: () => CartState(items: [testItem]),
    build: () => bloc,
    act: (b) => b.add(CartCleared()),
    expect: () => [const CartState()],
  );
});
```

### 使用 `ProviderContainer` 的 Riverpod

```dart
test('usersProvider Loads users from repository', () async {
  final container = ProviderContainer(
    overrides: [userRepositoryProvider.overrideWithValue(FakeUserRepository())],
  );
  addTearDown(container.dispose);

  final result = await container.read(usersProvider.future);
  expect(result, isNotEmpty);
});
```

## Widget 测试

```dart
testWidgets('CartPage shows item count badge', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        cartNotifierProvider.overrideWith(() => FakeCartNotifier([testItem])),
      ],
      child: const MaterialApp(home: CartPage()),
    ),
  );

  await tester.pump();
  expect(find.text('1'), findsOneWidget);
  expect(find.byType(CartItemTile), findsOneWidget);
});

testWidgets('shows empty state when cart is empty', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [cartNotifierProvider.overrideWith(() => FakeCartNotifier([]))],
      child: const MaterialApp(home: CartPage()),
    ),
  );

  await tester.pump();
  expect(find.text('Your cart is empty'), findsOneWidget);
});
```

## Fakes 优于 Mocks

对于复杂依赖，优先使用手写的 fake：

```dart
class FakeUserRepository implements UserRepository {
  final _users = <String, User>{};
  Object? fetchError;

  @override
  Future<User?> getById(String id) async {
    if (fetchError != null) throw fetchError!;
    return _users[id];
  }

  @override
  Future<List<User>> getAll() async {
    if (fetchError != null) throw fetchError!;
    return _users.values.toList();
  }

  @override
  Stream<List<User>> watchAll() => Stream.value(_users.values.toList());

  @override
  Future<void> save(User user) async {
    _users[user.id] = user;
  }

  @override
  Future<void> delete(String id) async {
    _users.remove(id);
  }

  void addUser(User user) => _users[user.id] = user;
}
```

## 异步测试

```dart
// 使用 fake_async 控制定时器和 Future
test('debounce triggers after 300ms', () {
  fakeAsync((async) {
    final debouncer = Debouncer(delay: const Duration(milliseconds: 300));
    var callCount = 0;
    debouncer.run(() => callCount++);
    expect(callCount, 0);
    async.elapse(const Duration(milliseconds: 200));
    expect(callCount, 0);
    async.elapse(const Duration(milliseconds: 200));
    expect(callCount, 1);
  });
});
```

## Golden 测试

```dart
testWidgets('UserCard golden test', (tester) async {
  await tester.pumpWidget(
    MaterialApp(home: UserCard(user: testUser)),
  );

  await expectLater(
    find.byType(UserCard),
    matchesGoldenFile('goldens/user_card.png'),
  );
});
```

当有刻意的视觉变更时，运行 `flutter test --update-goldens`。

## 测试命名

使用描述性的、聚焦行为的命名：

```dart
test('returns null when user does not exist', () { ... });
test('throws NotFoundException when id is empty string', () { ... });
testWidgets('disables submit button while form is invalid', (tester) async { ... });
```

## 测试组织

```
test/
├── unit/
│   ├── domain/
│   │   └── usecases/
│   └── data/
│       └── repositories/
├── widget/
│   └── presentation/
│       └── pages/
└── golden/
    └── widgets/

integration_test/
└── flows/
    ├── login_flow_test.dart
    └── checkout_flow_test.dart
```

## 覆盖率

- 业务逻辑（domain + 状态管理器）目标行覆盖率 80% 以上
- 所有状态转换都必须有测试：loading → success、loading → error、retry
- 运行 `flutter test --coverage` 并使用覆盖率报告工具检查 `lcov.info`
- 覆盖率低于阈值时应阻断 CI
