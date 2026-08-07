---
paths:
  - "**/*.kt"
  - "**/*.kts"
---
# Kotlin 模式

> 本文件在 [common/patterns.md](../common/patterns.md) 基础上扩展了 Kotlin 与 Android/KMP 特定内容。

## Dependency Injection

优先使用 constructor injection。使用 Koin（KMP）或 Hilt（仅限 Android）：

```kotlin
// Koin — 声明模块
val dataModule = module {
    single<ItemRepository> { ItemRepositoryImpl(get(), get()) }
    factory { GetItemsUseCase(get()) }
    viewModelOf(::ItemListViewModel)
}

// Hilt — 注解
@HiltViewModel
class ItemListViewModel @Inject constructor(
    private val getItems: GetItemsUseCase
) : ViewModel()
```

## ViewModel Pattern

单一 state object、event sink、单向 data flow：

```kotlin
data class ScreenState(
    val items: List<Item> = emptyList(),
    val isLoading: Boolean = false
)

class ScreenViewModel(private val useCase: GetItemsUseCase) : ViewModel() {
    private val _state = MutableStateFlow(ScreenState())
    val state = _state.asStateFlow()

    fun onEvent(event: ScreenEvent) {
        when (event) {
            is ScreenEvent.Load -> load()
            is ScreenEvent.Delete -> delete(event.id)
        }
    }
}
```

## Repository Pattern

- `suspend` 函数返回 `Result<T>` 或自定义错误类型
- `Flow` 用于响应式流
- 协调本地与远程数据源

```kotlin
interface ItemRepository {
    suspend fun getById(id: String): Result<Item>
    suspend fun getAll(): Result<List<Item>>
    fun observeAll(): Flow<List<Item>>
}
```

## UseCase Pattern

单一职责，`operator fun invoke`：

```kotlin
class GetItemUseCase(private val repository: ItemRepository) {
    suspend operator fun invoke(id: String): Result<Item> {
        return repository.getById(id)
    }
}

class GetItemsUseCase(private val repository: ItemRepository) {
    suspend operator fun invoke(): Result<List<Item>> {
        return repository.getAll()
    }
}
```

## expect/actual (KMP)

用于平台特定的实现：

```kotlin
// commonMain
expect fun platformName(): String
expect class SecureStorage {
    fun save(key: String, value: String)
    fun get(key: String): String?
}

// androidMain
actual fun platformName(): String = "Android"
actual class SecureStorage {
    actual fun save(key: String, value: String) { /* EncryptedSharedPreferences */ }
    actual fun get(key: String): String? = null /* ... */
}

// iosMain
actual fun platformName(): String = "iOS"
actual class SecureStorage {
    actual fun save(key: String, value: String) { /* Keychain */ }
    actual fun get(key: String): String? = null /* ... */
}
```

## Coroutine 模式

- 在 ViewModel 中使用 `viewModelScope`，用 `coroutineScope` 处理结构化子任务
- 将 cold Flow 转换为 StateFlow 时，使用 `stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), initialValue)`
- 当子作业失败需要相互独立时，使用 `supervisorScope`

## 使用 DSL 的 Builder Pattern

```kotlin
class HttpClientConfig {
    var baseUrl: String = ""
    var timeout: Long = 30_000
    private val interceptors = mutableListOf<Interceptor>()

    fun interceptor(block: () -> Interceptor) {
        interceptors.add(block())
    }
}

fun httpClient(block: HttpClientConfig.() -> Unit): HttpClient {
    val config = HttpClientConfig().apply(block)
    return HttpClient(config)
}

// 用法
val client = httpClient {
    baseUrl = "https://api.example.com"
    timeout = 15_000
    interceptor { AuthInterceptor(tokenProvider) }
}
```

## 参考资料

详细 coroutine 模式参见 skill：`kotlin-coroutines-flows`。
module 与 layer 模式参见 skill：`android-clean-architecture`。
