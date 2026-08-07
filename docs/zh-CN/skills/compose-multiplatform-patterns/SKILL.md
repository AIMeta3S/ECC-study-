---
name: compose-multiplatform-patterns
description: 面向 KMP 项目的 Compose Multiplatform 与 Jetpack Compose 模式 —— 状态管理、导航、主题、性能以及平台特定 UI。
metadata:
  origin: ECC
---

# Compose Multiplatform 模式

使用 Compose Multiplatform 与 Jetpack Compose 跨 Android、iOS、Desktop、Web 构建共享 UI 的模式。涵盖状态管理、导航、主题与性能。

## 何时激活

- 构建 Compose UI（Jetpack Compose 或 Compose Multiplatform）
- 使用 ViewModel 与 Compose state 管理 UI 状态
- 在 KMP 或 Android 项目中实现导航
- 设计可复用的 composable 与设计系统
- 优化 recomposition 与渲染性能

## 状态管理

### ViewModel + 单一状态对象

为屏幕状态使用单一 data class。将其暴露为 `StateFlow`，并在 Compose 中收集：

```kotlin
data class ItemListState(
    val items: List<Item> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val searchQuery: String = ""
)

class ItemListViewModel(
    private val getItems: GetItemsUseCase
) : ViewModel() {
    private val _state = MutableStateFlow(ItemListState())
    val state: StateFlow<ItemListState> = _state.asStateFlow()

    fun onSearch(query: String) {
        _state.update { it.copy(searchQuery = query) }
        loadItems(query)
    }

    private fun loadItems(query: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            getItems(query).fold(
                onSuccess = { items -> _state.update { it.copy(items = items, isLoading = false) } },
                onFailure = { e -> _state.update { it.copy(error = e.message, isLoading = false) } }
            )
        }
    }
}
```

### 在 Compose 中收集状态

```kotlin
@Composable
fun ItemListScreen(viewModel: ItemListViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    ItemListContent(
        state = state,
        onSearch = viewModel::onSearch
    )
}

@Composable
private fun ItemListContent(
    state: ItemListState,
    onSearch: (String) -> Unit
) {
    // 无状态 composable —— 易于预览与测试
}
```

### Event Sink 模式

对于复杂屏幕，使用 sealed interface 表示事件，而非多个回调 lambda：

```kotlin
sealed interface ItemListEvent {
    data class Search(val query: String) : ItemListEvent
    data class Delete(val itemId: String) : ItemListEvent
    data object Refresh : ItemListEvent
}

// 在 ViewModel 中
fun onEvent(event: ItemListEvent) {
    when (event) {
        is ItemListEvent.Search -> onSearch(event.query)
        is ItemListEvent.Delete -> deleteItem(event.itemId)
        is ItemListEvent.Refresh -> loadItems(_state.value.searchQuery)
    }
}

// 在 Composable 中 —— 单个 lambda 替代多个
ItemListContent(
    state = state,
    onEvent = viewModel::onEvent
)
```

## 导航

### 类型安全的导航（Compose Navigation 2.8+）

将路由定义为 `@Serializable` 对象：

```kotlin
@Serializable data object HomeRoute
@Serializable data class DetailRoute(val id: String)
@Serializable data object SettingsRoute

@Composable
fun AppNavHost(navController: NavHostController = rememberNavController()) {
    NavHost(navController, startDestination = HomeRoute) {
        composable<HomeRoute> {
            HomeScreen(onNavigateToDetail = { id -> navController.navigate(DetailRoute(id)) })
        }
        composable<DetailRoute> { backStackEntry ->
            val route = backStackEntry.toRoute<DetailRoute>()
            DetailScreen(id = route.id)
        }
        composable<SettingsRoute> { SettingsScreen() }
    }
}
```

### Dialog 与 Bottom Sheet 导航

使用 `dialog()` 与 overlay 模式，而非命令式的 show/hide：

```kotlin
NavHost(navController, startDestination = HomeRoute) {
    composable<HomeRoute> { /* ... */ }
    dialog<ConfirmDeleteRoute> { backStackEntry ->
        val route = backStackEntry.toRoute<ConfirmDeleteRoute>()
        ConfirmDeleteDialog(
            itemId = route.itemId,
            onConfirm = { navController.popBackStack() },
            onDismiss = { navController.popBackStack() }
        )
    }
}
```

## Composable 设计

### 基于 Slot 的 API

通过 slot 参数设计 composable 以提升灵活性：

```kotlin
@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    header: @Composable () -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
    actions: @Composable RowScope.() -> Unit = {}
) {
    Card(modifier = modifier) {
        Column {
            header()
            Column(content = content)
            Row(horizontalArrangement = Arrangement.End, content = actions)
        }
    }
}
```

### Modifier 顺序

Modifier 顺序很重要 —— 按以下顺序应用：

```kotlin
Text(
    text = "Hello",
    modifier = Modifier
        .padding(16.dp)          // 1. 布局（padding、size）
        .clip(RoundedCornerShape(8.dp))  // 2. 形状
        .background(Color.White) // 3. 绘制（background、border）
        .clickable { }           // 4. 交互
)
```

## KMP 平台特定 UI

### 平台 Composable 的 expect/actual

```kotlin
// commonMain
@Composable
expect fun PlatformStatusBar(darkIcons: Boolean)

// androidMain
@Composable
actual fun PlatformStatusBar(darkIcons: Boolean) {
    val systemUiController = rememberSystemUiController()
    SideEffect { systemUiController.setStatusBarColor(Color.Transparent, darkIcons) }
}

// iosMain
@Composable
actual fun PlatformStatusBar(darkIcons: Boolean) {
    // iOS 通过 UIKit 互操作或 Info.plist 处理此问题
}
```

## 性能

### 用于可跳过 recomposition 的稳定类型

当所有属性均为稳定时，将类标记为 `@Stable` 或 `@Immutable`：

```kotlin
@Immutable
data class ItemUiModel(
    val id: String,
    val title: String,
    val description: String,
    val progress: Float
)
```

### 正确使用 `key()` 与 Lazy 列表

```kotlin
LazyColumn {
    items(
        items = items,
        key = { it.id }  // 稳定的 key 启用条目复用与动画
    ) { item ->
        ItemRow(item = item)
    }
}
```

### 用 `derivedStateOf` 延迟读取

```kotlin
val listState = rememberLazyListState()
val showScrollToTop by remember {
    derivedStateOf { listState.firstVisibleItemIndex > 5 }
}
```

### 避免在 recomposition 中分配对象

```kotlin
// 错误 —— 每次 recomposition 都生成新的 lambda 与 list
items.filter { it.isActive }.forEach { ActiveItem(it, onClick = { handle(it) }) }

// 正确 —— 为每个条目设置 key，使回调保持绑定到正确的行
val activeItems = remember(items) { items.filter { it.isActive } }
activeItems.forEach { item ->
    key(item.id) {
        ActiveItem(item, onClick = { handle(item) })
    }
}
```

## 主题

### Material 3 动态主题

```kotlin
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            if (darkTheme) dynamicDarkColorScheme(LocalContext.current)
            else dynamicLightColorScheme(LocalContext.current)
        }
        darkTheme -> darkColorScheme()
        else -> lightColorScheme()
    }

    MaterialTheme(colorScheme = colorScheme, content = content)
}
```

## 需避免的反模式

- 在 ViewModel 中使用 `mutableStateOf`，而 `MutableStateFlow` 配合 `collectAsStateWithLifecycle` 对 lifecycle 更安全
- 将 `NavController` 深层传递到 composable 中 —— 应改为传递 lambda 回调
- 在 `@Composable` 函数内部进行繁重计算 —— 应移至 ViewModel 或 `remember {}`
- 使用 `LaunchedEffect(Unit)` 替代 ViewModel 初始化 —— 在某些配置下它会在 configuration change 时重新运行
- 在 composable 参数中创建新对象实例 —— 导致不必要的 recomposition

## 参考

参见 skill：`android-clean-architecture`，了解模块结构与分层。
参见 skill：`kotlin-coroutines-flows`，了解 coroutine 与 Flow 模式。
