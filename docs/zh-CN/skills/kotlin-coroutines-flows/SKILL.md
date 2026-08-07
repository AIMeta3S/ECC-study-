---
name: kotlin-coroutines-flows
description: 面向 Android 与 KMP 的 Kotlin Coroutines 和 Flow 模式 —— 涵盖 structured concurrency、Flow 操作符、StateFlow、错误处理与测试。
metadata:
  origin: ECC
---

# Kotlin Coroutines & Flows

面向 Android 和 Kotlin Multiplatform 项目的模式，涵盖 structured concurrency、基于 Flow 的 reactive streams 以及 coroutine 测试。

## 何时激活

- 使用 Kotlin coroutine 编写 async 代码
- 使用 Flow、StateFlow 或 SharedFlow 处理 reactive 数据
- 处理并发操作（并行加载、debounce、retry）
- 测试 coroutine 与 Flow
- 管理 coroutine scope 与 cancellation

## Structured Concurrency

### Scope 层级

```
Application
  └── viewModelScope (ViewModel)
        └── coroutineScope { } (structured child)
              ├── async { } (concurrent task)
              └── async { } (concurrent task)
```

始终使用 structured concurrency —— 永远不要使用 `GlobalScope`：

```kotlin
// 反面示例
GlobalScope.launch { fetchData() }

// 正面示例 —— 限定在 ViewModel 生命周期内
viewModelScope.launch { fetchData() }

// 正面示例 —— 限定在 composable 生命周期内
LaunchedEffect(key) { fetchData() }
```

### 并行分解

对并行工作使用 `coroutineScope` + `async`：

```kotlin
suspend fun loadDashboard(): Dashboard = coroutineScope {
    val items = async { itemRepository.getRecent() }
    val stats = async { statsRepository.getToday() }
    val profile = async { userRepository.getCurrent() }
    Dashboard(
        items = items.await(),
        stats = stats.await(),
        profile = profile.await()
    )
}
```

### SupervisorScope

当 child 的失败不应取消 sibling 时，使用 `supervisorScope`：

```kotlin
suspend fun syncAll() = supervisorScope {
    launch { syncItems() }       // 此处的失败不会取消 syncStats
    launch { syncStats() }
    launch { syncSettings() }
}
```

## Flow 模式

### Cold Flow —— 一次性到 Stream 的转换

```kotlin
fun observeItems(): Flow<List<Item>> = flow {
    // 每当数据库变化时重新 emit
    itemDao.observeAll()
        .map { entities -> entities.map { it.toDomain() } }
        .collect { emit(it) }
}
```

### 用于 UI 状态的 StateFlow

```kotlin
class DashboardViewModel(
    observeProgress: ObserveUserProgressUseCase
) : ViewModel() {
    val progress: StateFlow<UserProgress> = observeProgress()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = UserProgress.EMPTY
        )
}
```

`WhileSubscribed(5_000)` 会在最后一个 subscriber 离开后保持 upstream 活跃 5 秒 —— 可在配置变更期间保持运行而无需重启。

### 组合多个 Flow

```kotlin
val uiState: StateFlow<HomeState> = combine(
    itemRepository.observeItems(),
    settingsRepository.observeTheme(),
    userRepository.observeProfile()
) { items, theme, profile ->
    HomeState(items = items, theme = theme, profile = profile)
}.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeState())
```

### Flow 操作符

```kotlin
// 对搜索输入做 debounce
searchQuery
    .debounce(300)
    .distinctUntilChanged()
    .flatMapLatest { query -> repository.search(query) }
    .catch { emit(emptyList()) }
    .collect { results -> _state.update { it.copy(results = results) } }

// 带指数 backoff 的 retry
fun fetchWithRetry(): Flow<Data> = flow { emit(api.fetch()) }
    .retryWhen { cause, attempt ->
        if (cause is IOException && attempt < 3) {
            delay(1000L * (1 shl attempt.toInt()))
            true
        } else {
            false
        }
    }
```

### 用于一次性事件的 SharedFlow

```kotlin
class ItemListViewModel : ViewModel() {
    private val _effects = MutableSharedFlow<Effect>()
    val effects: SharedFlow<Effect> = _effects.asSharedFlow()

    sealed interface Effect {
        data class ShowSnackbar(val message: String) : Effect
        data class NavigateTo(val route: String) : Effect
    }

    private fun deleteItem(id: String) {
        viewModelScope.launch {
            repository.delete(id)
            _effects.emit(Effect.ShowSnackbar("Item deleted"))
        }
    }
}

// 在 Composable 中 collect
LaunchedEffect(Unit) {
    viewModel.effects.collect { effect ->
        when (effect) {
            is Effect.ShowSnackbar -> snackbarHostState.showSnackbar(effect.message)
            is Effect.NavigateTo -> navController.navigate(effect.route)
        }
    }
}
```

## Dispatchers

```kotlin
// CPU 密集型工作
withContext(Dispatchers.Default) { parseJson(largePayload) }

// IO 密集型工作
withContext(Dispatchers.IO) { database.query() }

// Main 线程（UI）—— viewModelScope 的默认值
withContext(Dispatchers.Main) { updateUi() }
```

在 KMP 中，使用 `Dispatchers.Default` 和 `Dispatchers.Main`（在所有平台上均可用）。`Dispatchers.IO` 仅限 JVM/Android 使用 —— 在其他平台上请使用 `Dispatchers.Default` 或通过 DI 提供。

## Cancellation

### Cooperative Cancellation

长时间运行的循环必须检查 cancellation：

```kotlin
suspend fun processItems(items: List<Item>) = coroutineScope {
    for (item in items) {
        ensureActive()  // 若被取消则抛出 CancellationException
        process(item)
    }
}
```

### 用 try/finally 做清理

```kotlin
viewModelScope.launch {
    try {
        _state.update { it.copy(isLoading = true) }
        val data = repository.fetch()
        _state.update { it.copy(data = data) }
    } finally {
        _state.update { it.copy(isLoading = false) }  // 始终执行，即使被取消时也是如此
    }
}
```

## 测试

### 用 Turbine 测试 StateFlow

```kotlin
@Test
fun `search updates item list`() = runTest {
    val fakeRepository = FakeItemRepository().apply { emit(testItems) }
    val viewModel = ItemListViewModel(GetItemsUseCase(fakeRepository))

    viewModel.state.test {
        assertEquals(ItemListState(), awaitItem())  // 初始状态

        viewModel.onSearch("query")
        val loading = awaitItem()
        assertTrue(loading.isLoading)

        val loaded = awaitItem()
        assertFalse(loaded.isLoading)
        assertEquals(1, loaded.items.size)
    }
}
```

### 用 TestDispatcher 测试

```kotlin
@Test
fun `parallel load completes correctly`() = runTest {
    val viewModel = DashboardViewModel(
        itemRepo = FakeItemRepo(),
        statsRepo = FakeStatsRepo()
    )

    viewModel.load()
    advanceUntilIdle()

    val state = viewModel.state.value
    assertNotNull(state.items)
    assertNotNull(state.stats)
}
```

### 为 Flow 编写 Fake

```kotlin
class FakeItemRepository : ItemRepository {
    private val _items = MutableStateFlow<List<Item>>(emptyList())

    override fun observeItems(): Flow<List<Item>> = _items

    fun emit(items: List<Item>) { _items.value = items }

    override suspend fun getItemsByCategory(category: String): Result<List<Item>> {
        return Result.success(_items.value.filter { it.category == category })
    }
}
```

## 要避免的 anti-pattern

- 使用 `GlobalScope` —— 会泄漏 coroutine，且没有 structured cancellation
- 在没有 scope 的 `init {}` 中 collect Flow —— 应使用 `viewModelScope.launch`
- 将 `MutableStateFlow` 与可变集合一起使用 —— 始终使用不可变副本：`_state.update { it.copy(list = it.list + newItem) }`
- 捕获 `CancellationException` —— 应让其传播以实现正确的 cancellation
- 使用 `flowOn(Dispatchers.Main)` 进行 collect —— collect 的 dispatcher 就是调用方的 dispatcher
- 在 `@Composable` 中不使用 `remember` 就创建 `Flow` —— 每次 recomposition 都会重新创建 flow

## 参考

关于 Flow 在 UI 中的消费，参见 skill：`compose-multiplatform-patterns`。
关于 coroutine 在各分层中的位置，参见 skill：`android-clean-architecture`。
