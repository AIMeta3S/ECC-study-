---
paths:
  - "**/*.kt"
  - "**/*.kts"
---
# Kotlin 测试

> 本文件在 [common/testing.md](../common/testing.md) 基础上扩展了 Kotlin 及 Android/KMP 特定内容。

## 测试框架

- **kotlin.test** 用于跨平台（KMP）— `@Test`、`assertEquals`、`assertTrue`
- **JUnit 4/5** 用于 Android 专用测试
- **Turbine** 用于测试 Flow 和 StateFlow
- **kotlinx-coroutines-test** 用于 coroutine 测试（`runTest`、`TestDispatcher`）

## 使用 Turbine 测试 ViewModel

```kotlin
@Test
fun `loading state emitted then data`() = runTest {
    val repo = FakeItemRepository()
    repo.addItem(testItem)
    val viewModel = ItemListViewModel(GetItemsUseCase(repo))

    viewModel.state.test {
        assertEquals(ItemListState(), awaitItem())     // 初始状态
        viewModel.onEvent(ItemListEvent.Load)
        assertTrue(awaitItem().isLoading)               // 加载中
        assertEquals(listOf(testItem), awaitItem().items) // 已加载
    }
}
```

## Fakes Over Mocks

优先使用手写 fake 而非 mock 框架：

```kotlin
class FakeItemRepository : ItemRepository {
    private val items = mutableListOf<Item>()
    var fetchError: Throwable? = null

    override suspend fun getAll(): Result<List<Item>> {
        fetchError?.let { return Result.failure(it) }
        return Result.success(items.toList())
    }

    override fun observeAll(): Flow<List<Item>> = flowOf(items.toList())

    fun addItem(item: Item) { items.add(item) }
}
```

## coroutine 测试

```kotlin
@Test
fun `parallel operations complete`() = runTest {
    val repo = FakeRepository()
    val result = loadDashboard(repo)
    advanceUntilIdle()
    assertNotNull(result.items)
    assertNotNull(result.stats)
}
```

使用 `runTest` —— 它会自动推进 virtual time 并提供 `TestScope`。

## Ktor MockEngine

```kotlin
val mockEngine = MockEngine { request ->
    when (request.url.encodedPath) {
        "/api/items" -> respond(
            content = Json.encodeToString(testItems),
            headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString())
        )
        else -> respondError(HttpStatusCode.NotFound)
    }
}

val client = HttpClient(mockEngine) {
    install(ContentNegotiation) { json() }
}
```

## Room/SQLDelight 测试

- Room: 使用 `Room.inMemoryDatabaseBuilder()` 进行内存测试
- SQLDelight: 在 JVM 测试中使用 `JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)`

```kotlin
@Test
fun `insert and query items`() = runTest {
    val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
    Database.Schema.create(driver)
    val db = Database(driver)

    db.itemQueries.insert("1", "Sample Item", "description")
    val items = db.itemQueries.getAll().executeAsList()
    assertEquals(1, items.size)
}
```

## 测试命名

使用反引号包裹的描述性命名：

```kotlin
@Test
fun `search with empty query returns all items`() = runTest { }

@Test
fun `delete item emits updated list without deleted item`() = runTest { }
```

## 测试组织

```
src/
├── commonTest/kotlin/     # 共享测试（ViewModel、UseCase、Repository）
├── androidUnitTest/kotlin/ # Android 单元测试（JUnit）
├── androidInstrumentedTest/kotlin/  # 插桩测试（Room、UI）
└── iosTest/kotlin/        # iOS 特定测试
```

最低测试覆盖：每个功能至少包含 ViewModel + UseCase。
