---
name: dart-flutter-patterns
description: 生产级 Dart 与 Flutter 模式，涵盖 null safety、immutable state、async composition、widget 架构、主流 state management 框架（BLoC、Riverpod、Provider）、GoRouter 导航、Dio 网络请求、Freezed 代码生成以及 clean architecture。
metadata:
  origin: ECC
---

# Dart/Flutter 模式

## 何时使用

在以下场景使用本 skill：
- 开始开发新的 Flutter 功能，需要 state management、navigation 或数据访问的惯用模式
- 审查或编写 Dart 代码，需要 null safety、sealed type 或 async composition 的指导
- 搭建新的 Flutter 项目，需要在 BLoC、Riverpod 或 Provider 之间做选择
- 实现安全的 HTTP 客户端、WebView 集成或本地存储
- 为 Flutter widget、Cubit 或 Riverpod provider 编写测试
- 将 GoRouter 与 authentication guard 集成

## 工作原理

本 skill 提供按关注点组织、可直接复制粘贴的 Dart/Flutter 代码模式：
1. **Null safety** —— 避免 `!`，优先使用 `?.`/`??`/模式匹配
2. **Immutable state** —— sealed class、`freezed`、`copyWith`
3. **Async composition** —— 并发 `Future.wait`、`await` 之后安全的 `BuildContext`
4. **Widget 架构** —— 提取为类（而非方法）、`const` 传递、scoped rebuild
5. **State management** —— BLoC/Cubit 事件、Riverpod notifier 与 derived provider
6. **Navigation** —— 通过 `refreshListenable` 实现 GoRouter 的响应式 auth guard
7. **Networking** —— 带 interceptor 的 Dio、带一次性 retry guard 的 token 刷新
8. **Error handling** —— 全局捕获、`ErrorWidget.builder`、crashlytics 接入
9. **Testing** —— 单元测试（BLoC 测试）、widget 测试（ProviderScope override）、fake 优先于 mock

## 示例

```dart
// Sealed state —— 避免不可能的状态
sealed class AsyncState<T> {}
final class Loading<T> extends AsyncState<T> {}
final class Success<T> extends AsyncState<T> { final T data; const Success(this.data); }
final class Failure<T> extends AsyncState<T> { final Object error; const Failure(this.error); }

// 带响应式 auth 重定向的 GoRouter
final router = GoRouter(
  refreshListenable: GoRouterRefreshStream(authCubit.stream),
  redirect: (context, state) {
    final authed = context.read<AuthCubit>().state is AuthAuthenticated;
    if (!authed && !state.matchedLocation.startsWith('/login')) return '/login';
    return null;
  },
  routes: [...],
);

// 使用安全 firstWhereOrNull 的 Riverpod derived provider
@riverpod
double cartTotal(Ref ref) {
  final cart = ref.watch(cartNotifierProvider);
  final products = ref.watch(productsProvider).valueOrNull ?? [];
  return cart.fold(0.0, (total, item) {
    final product = products.firstWhereOrNull((p) => p.id == item.productId);
    return total + (product?.price ?? 0) * item.quantity;
  });
}
```

---

适用于 Dart 与 Flutter 应用的实用、生产级模式。尽可能与库无关，同时明确覆盖最常用的生态 package。

---

## 1. Null Safety 基础

### 优先使用模式而非 Bang Operator

```dart
// 反例 —— 为 null 时运行时崩溃
final name = user!.name;

// 正例 —— 提供回退值
final name = user?.name ?? 'Unknown';

// 正例 —— Dart 3 模式匹配（复杂场景首选）
final display = switch (user) {
  User(:final name, :final email) => '$name <$email>',
  null => 'Guest',
};

// 正例 —— guard 提前返回
String getUserName(User? user) {
  if (user == null) return 'Unknown';
  return user.name; // 检查后提升为 non-null
}
```

### 避免过度使用 `late`

```dart
// 反例 —— 将 null 错误推迟到运行时
late String userId;

// 正例 —— nullable 并显式初始化
String? userId;

// 可接受 —— 仅当能保证首次访问前完成初始化时才使用 late
// （例如，在 initState() 中、任何 widget 交互之前）
late final AnimationController _controller;

@override
void initState() {
  super.initState();
  _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
}
```

---

## 2. Immutable State

### 用于状态层级结构的 Sealed Class

```dart
sealed class UserState {}

final class UserInitial extends UserState {}

final class UserLoading extends UserState {}

final class UserLoaded extends UserState {
  const UserLoaded(this.user);
  final User user;
}

final class UserError extends UserState {
  const UserError(this.message);
  final String message;
}

// 穷举 switch —— 编译器强制覆盖所有分支
Widget buildFrom(UserState state) => switch (state) {
  UserInitial() => const SizedBox.shrink(),
  UserLoading() => const CircularProgressIndicator(),
  UserLoaded(:final user) => UserCard(user: user),
  UserError(:final message) => ErrorText(message),
};
```

### 使用 Freezed 实现免样板代码的 Immutability

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
class User with _$User {
  const factory User({
    required String id,
    required String name,
    required String email,
    @Default(false) bool isAdmin,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

// 用法
final user = User(id: '1', name: 'Alice', email: 'alice@example.com');
final updated = user.copyWith(name: 'Alice Smith'); // immutable 更新
final json = user.toJson();
final fromJson = User.fromJson(json);
```

---

## 3. Async Composition

### 使用 Future.wait 的结构化并发

```dart
Future<DashboardData> loadDashboard(UserRepository users, OrderRepository orders) async {
  // 并发执行 —— 不要顺序 await
  final (userList, orderList) = await (
    users.getAll(),
    orders.getRecent(),
  ).wait; // Dart 3 record 解构 + Future.wait 扩展

  return DashboardData(users: userList, orders: orderList);
}
```

### Stream 模式

```dart
// Repository 暴露响应式 stream 以提供实时数据
Stream<List<Item>> watchCartItems() => _db
    .watchTable('cart_items')
    .map((rows) => rows.map(Item.fromRow).toList());

// 在 widget 层 —— 声明式，无需手动订阅
StreamBuilder<List<Item>>(
  stream: cartRepository.watchCartItems(),
  builder: (context, snapshot) => switch (snapshot) {
    AsyncSnapshot(connectionState: ConnectionState.waiting) =>
        const CircularProgressIndicator(),
    AsyncSnapshot(:final error?) => ErrorWidget(error.toString()),
    AsyncSnapshot(:final data?) => CartList(items: data),
    _ => const SizedBox.shrink(),
  },
)
```

### Await 之后的 BuildContext

```dart
// 关键 —— 在 StatefulWidget 中，任何 await 之后都要检查 mounted
Future<void> _handleSubmit() async {
  setState(() => _isLoading = true);
  try {
    await authService.login(_email, _password);
    if (!mounted) return; // ← 使用 context 前的 guard
    context.go('/home');
  } on AuthException catch (e) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
  } finally {
    if (mounted) setState(() => _isLoading = false);
  }
}
```

---

## 4. Widget 架构

### 提取为类，而非方法

```dart
// 反例 —— 返回 widget 的私有方法，阻碍优化
Widget _buildHeader() {
  return Container(
    padding: const EdgeInsets.all(16),
    child: Text(title, style: Theme.of(context).textTheme.headlineMedium),
  );
}

// 正例 —— 独立的 widget 类，支持 const、元素复用
class _PageHeader extends StatelessWidget {
  const _PageHeader(this.title);
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Text(title, style: Theme.of(context).textTheme.headlineMedium),
    );
  }
}
```

### const 传递

```dart
// 反例 —— 每次 rebuild 都创建新实例
child: Padding(
  padding: EdgeInsets.all(16.0),       // 非 const
  child: Icon(Icons.home, size: 24.0), // 非 const
)

// 正例 —— const 阻止 rebuild 传递
child: const Padding(
  padding: EdgeInsets.all(16.0),
  child: Icon(Icons.home, size: 24.0),
)
```

### Scoped Rebuild

```dart
// 反例 —— 每次 counter 变化都 rebuild 整页
class CounterPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider); // rebuild 所有内容
    return Scaffold(
      body: Column(children: [
        const ExpensiveHeader(), // 不必要地 rebuild
        Text('$count'),
        const ExpensiveFooter(), // 不必要地 rebuild
      ]),
    );
  }
}

// 正例 —— 隔离需要 rebuild 的部分
class CounterPage extends StatelessWidget {
  const CounterPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Column(children: [
        ExpensiveHeader(),        // 永不 rebuild（const）
        _CounterDisplay(),        // 仅此处 rebuild
        ExpensiveFooter(),        // 永不 rebuild（const）
      ]),
    );
  }
}

class _CounterDisplay extends ConsumerWidget {
  const _CounterDisplay();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);
    return Text('$count');
  }
}
```

---

## 5. State Management：BLoC/Cubit

```dart
// Cubit —— 同步或简单 async 的 state
class AuthCubit extends Cubit<AuthState> {
  AuthCubit(this._authService) : super(const AuthState.initial());
  final AuthService _authService;

  Future<void> login(String email, String password) async {
    emit(const AuthState.loading());
    try {
      final user = await _authService.login(email, password);
      emit(AuthState.authenticated(user));
    } on AuthException catch (e) {
      emit(AuthState.error(e.message));
    }
  }

  void logout() {
    _authService.logout();
    emit(const AuthState.initial());
  }
}

// 在 widget 中
BlocBuilder<AuthCubit, AuthState>(
  builder: (context, state) => switch (state) {
    AuthInitial() => const LoginForm(),
    AuthLoading() => const CircularProgressIndicator(),
    AuthAuthenticated(:final user) => HomePage(user: user),
    AuthError(:final message) => ErrorView(message: message),
  },
)
```

---

## 6. State Management：Riverpod

```dart
// 自动 dispose 的 async provider
@riverpod
Future<List<Product>> products(Ref ref) async {
  final repo = ref.watch(productRepositoryProvider);
  return repo.getAll();
}

// 带复杂 mutation 的 notifier
@riverpod
class CartNotifier extends _$CartNotifier {
  @override
  List<CartItem> build() => [];

  void add(Product product) {
    final existing = state.where((i) => i.productId == product.id).firstOrNull;
    if (existing != null) {
      state = [
        for (final item in state)
          if (item.productId == product.id) item.copyWith(quantity: item.quantity + 1)
          else item,
      ];
    } else {
      state = [...state, CartItem(productId: product.id, quantity: 1)];
    }
  }

  void remove(String productId) =>
      state = state.where((i) => i.productId != productId).toList();

  void clear() => state = [];
}

// Derived provider（selector 模式）
@riverpod
int cartCount(Ref ref) => ref.watch(cartNotifierProvider).length;

@riverpod
double cartTotal(Ref ref) {
  final cart = ref.watch(cartNotifierProvider);
  final products = ref.watch(productsProvider).valueOrNull ?? [];
  return cart.fold(0.0, (total, item) {
    // firstWhereOrNull（来自 collection package）避免 product 缺失时抛出 StateError
    final product = products.firstWhereOrNull((p) => p.id == item.productId);
    return total + (product?.price ?? 0) * item.quantity;
  });
}
```

---

## 7. 使用 GoRouter 的 Navigation

```dart
final router = GoRouter(
  initialLocation: '/',
  // refreshListenable 会在 auth state 变化时重新评估 redirect
  refreshListenable: GoRouterRefreshStream(authCubit.stream),
  redirect: (context, state) {
    final isLoggedIn = context.read<AuthCubit>().state is AuthAuthenticated;
    final isGoingToLogin = state.matchedLocation == '/login';
    if (!isLoggedIn && !isGoingToLogin) return '/login';
    if (isLoggedIn && isGoingToLogin) return '/';
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
    ShellRoute(
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (_, __) => const HomePage()),
        GoRoute(
          path: '/products/:id',
          builder: (context, state) =>
              ProductDetailPage(id: state.pathParameters['id']!),
        ),
      ],
    ),
  ],
);
```

---

## 8. 使用 Dio 的 HTTP

```dart
final dio = Dio(BaseOptions(
  baseUrl: const String.fromEnvironment('API_URL'),
  connectTimeout: const Duration(seconds: 10),
  receiveTimeout: const Duration(seconds: 30),
  headers: {'Content-Type': 'application/json'},
));

// 添加 auth interceptor
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) async {
    final token = await secureStorage.read(key: 'auth_token');
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  },
  onError: (error, handler) async {
    // 防止无限 retry 循环：每个请求仅尝试刷新一次
    final isRetry = error.requestOptions.extra['_isRetry'] == true;
    if (!isRetry && error.response?.statusCode == 401) {
      final refreshed = await attemptTokenRefresh();
      if (refreshed) {
        error.requestOptions.extra['_isRetry'] = true;
        return handler.resolve(await dio.fetch(error.requestOptions));
      }
    }
    handler.next(error);
  },
));

// 使用 Dio 的 Repository
class UserApiDataSource {
  const UserApiDataSource(this._dio);
  final Dio _dio;

  Future<User> getById(String id) async {
    final response = await _dio.get<Map<String, dynamic>>('/users/$id');
    return User.fromJson(response.data!);
  }
}
```

---

## 9. Error Handling 架构

```dart
// 全局错误捕获 —— 在 main() 中设置
void main() {
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    crashlytics.recordFlutterFatalError(details);
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    crashlytics.recordError(error, stack, fatal: true);
    return true;
  };

  runApp(const App());
}

// 生产环境自定义 ErrorWidget
class App extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    ErrorWidget.builder = (details) => ProductionErrorWidget(details);
    return MaterialApp.router(routerConfig: router);
  }
}
```

---

## 10. Testing 速查

```dart
// 单元测试 —— use case
test('GetUserUseCase returns null for missing user', () async {
  final repo = FakeUserRepository();
  final useCase = GetUserUseCase(repo);
  expect(await useCase('missing-id'), isNull);
});

// BLoC 测试
blocTest<AuthCubit, AuthState>(
  'emits loading then error on failed login',
  build: () => AuthCubit(FakeAuthService(throwsOn: 'login')),
  act: (cubit) => cubit.login('user@test.com', 'wrong'),
  expect: () => [const AuthState.loading(), isA<AuthError>()],
);

// Widget 测试
testWidgets('CartBadge shows item count', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [cartNotifierProvider.overrideWith(() => FakeCartNotifier(count: 3))],
      child: const MaterialApp(home: CartBadge()),
    ),
  );
  expect(find.text('3'), findsOneWidget);
});
```

---

## 参考资料

- [Effective Dart: Design](https://dart.dev/effective-dart/design)
- [Flutter Performance Best Practices](https://docs.flutter.dev/perf/best-practices)
- [Riverpod Documentation](https://riverpod.dev/)
- [BLoC Library](https://bloclibrary.dev/)
- [GoRouter](https://pub.dev/packages/go_router)
- [Freezed](https://pub.dev/packages/freezed)
- Skill：`flutter-dart-code-review` —— 全面的审查清单
- Rules：`rules/dart/` —— 编码风格、模式、安全、测试、hook
