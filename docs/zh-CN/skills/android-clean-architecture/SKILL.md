---
name: android-clean-architecture
description: 面向 Android 与 Kotlin Multiplatform 项目的 Clean Architecture 模式——模块结构、依赖规则、UseCase、Repository 与 data layer 模式。
metadata:
  origin: ECC
---

# Android Clean Architecture

适用于 Android 与 KMP 项目的 Clean Architecture 模式。涵盖模块边界、依赖反转、UseCase/Repository 模式，以及使用 Room、SQLDelight、Ktor 的 data layer 设计。

## 何时启用

- 结构化 Android 或 KMP 项目模块
- 实现 UseCase、Repository 或 DataSource
- 设计各层之间的数据流（domain、data、presentation）
- 使用 Koin 或 Hilt 搭建依赖注入
- 在分层架构中使用 Room、SQLDelight 或 Ktor

## 模块结构

### 推荐布局

```
project/
├── app/                  # Android 入口、DI 装配、Application 类
├── core/                 # 共享工具、基类、错误类型
├── domain/               # UseCase、领域模型、Repository 接口（纯 Kotlin）
├── data/                 # Repository 实现、DataSource、DB、网络
├── presentation/         # 屏幕、ViewModel、UI 模型、导航
├── design-system/        # 可复用的 Compose 组件、主题、排版
└── feature/              # Feature 模块（可选，用于大型项目）
    ├── auth/
    ├── settings/
    └── profile/
```

### 依赖规则

```
app → presentation, domain, data, core
presentation → domain, design-system, core
data → domain, core
domain → core (or no dependencies)
core → (nothing)
```

**关键**：`domain` 绝不能依赖 `data`、`presentation` 或任何框架。它只包含纯 Kotlin。

## Domain 层

### UseCase 模式

每个 UseCase 代表一项业务操作。使用 `operator fun invoke` 以获得简洁的调用点：

```kotlin
class GetItemsByCategoryUseCase(
    private val repository: ItemRepository
) {
    suspend operator fun invoke(category: String): Result<List<Item>> {
        return repository.getItemsByCategory(category)
    }
}

// 基于流的 UseCase，用于响应式流
class ObserveUserProgressUseCase(
    private val repository: UserRepository
) {
    operator fun invoke(userId: String): Flow<UserProgress> {
        return repository.observeProgress(userId)
    }
}
```

### 领域模型

领域模型是普通的 Kotlin data class——不加任何框架注解：

```kotlin
data class Item(
    val id: String,
    val title: String,
    val description: String,
    val tags: List<String>,
    val status: Status,
    val category: String
)

enum class Status { DRAFT, ACTIVE, ARCHIVED }
```

### Repository 接口

在 domain 中定义，在 data 中实现：

```kotlin
interface ItemRepository {
    suspend fun getItemsByCategory(category: String): Result<List<Item>>
    suspend fun saveItem(item: Item): Result<Unit>
    fun observeItems(): Flow<List<Item>>
}
```

## Data 层

### Repository 实现

在本地与远程数据源之间协调：

```kotlin
class ItemRepositoryImpl(
    private val localDataSource: ItemLocalDataSource,
    private val remoteDataSource: ItemRemoteDataSource
) : ItemRepository {

    override suspend fun getItemsByCategory(category: String): Result<List<Item>> {
        return runCatching {
            val remote = remoteDataSource.fetchItems(category)
            localDataSource.insertItems(remote.map { it.toEntity() })
            localDataSource.getItemsByCategory(category).map { it.toDomain() }
        }
    }

    override suspend fun saveItem(item: Item): Result<Unit> {
        return runCatching {
            localDataSource.insertItems(listOf(item.toEntity()))
        }
    }

    override fun observeItems(): Flow<List<Item>> {
        return localDataSource.observeAll().map { entities ->
            entities.map { it.toDomain() }
        }
    }
}
```

### Mapper 模式

将 mapper 作为扩展函数放在数据模型附近：

```kotlin
// 在 data 层
fun ItemEntity.toDomain() = Item(
    id = id,
    title = title,
    description = description,
    tags = tags.split("|"),
    status = Status.valueOf(status),
    category = category
)

fun ItemDto.toEntity() = ItemEntity(
    id = id,
    title = title,
    description = description,
    tags = tags.joinToString("|"),
    status = status,
    category = category
)
```

### Room 数据库（Android）

```kotlin
@Entity(tableName = "items")
data class ItemEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val tags: String,
    val status: String,
    val category: String
)

@Dao
interface ItemDao {
    @Query("SELECT * FROM items WHERE category = :category")
    suspend fun getByCategory(category: String): List<ItemEntity>

    @Upsert
    suspend fun upsert(items: List<ItemEntity>)

    @Query("SELECT * FROM items")
    fun observeAll(): Flow<List<ItemEntity>>
}
```

### SQLDelight（KMP）

```sql
-- Item.sq
CREATE TABLE ItemEntity (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags TEXT NOT NULL,
    status TEXT NOT NULL,
    category TEXT NOT NULL
);

getByCategory:
SELECT * FROM ItemEntity WHERE category = ?;

upsert:
INSERT OR REPLACE INTO ItemEntity (id, title, description, tags, status, category)
VALUES (?, ?, ?, ?, ?, ?);

observeAll:
SELECT * FROM ItemEntity;
```

### Ktor 网络客户端（KMP）

```kotlin
class ItemRemoteDataSource(private val client: HttpClient) {

    suspend fun fetchItems(category: String): List<ItemDto> {
        return client.get("api/items") {
            parameter("category", category)
        }.body()
    }
}

// 带内容协商的 HttpClient 配置
val httpClient = HttpClient {
    install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    install(Logging) { level = LogLevel.HEADERS }
    defaultRequest { url("https://api.example.com/") }
}
```

## 依赖注入

### Koin（对 KMP 友好）

```kotlin
// Domain 模块
val domainModule = module {
    factory { GetItemsByCategoryUseCase(get()) }
    factory { ObserveUserProgressUseCase(get()) }
}

// Data 模块
val dataModule = module {
    single<ItemRepository> { ItemRepositoryImpl(get(), get()) }
    single { ItemLocalDataSource(get()) }
    single { ItemRemoteDataSource(get()) }
}

// Presentation 模块
val presentationModule = module {
    viewModelOf(::ItemListViewModel)
    viewModelOf(::DashboardViewModel)
}
```

### Hilt（仅 Android）

```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    abstract fun bindItemRepository(impl: ItemRepositoryImpl): ItemRepository
}

@HiltViewModel
class ItemListViewModel @Inject constructor(
    private val getItems: GetItemsByCategoryUseCase
) : ViewModel()
```

## 错误处理

### Result/Try 模式

使用 `Result<T>` 或自定义 sealed type 进行错误传播：

```kotlin
sealed interface Try<out T> {
    data class Success<T>(val value: T) : Try<T>
    data class Failure(val error: AppError) : Try<Nothing>
}

sealed interface AppError {
    data class Network(val message: String) : AppError
    data class Database(val message: String) : AppError
    data object Unauthorized : AppError
}

// 在 ViewModel 中——映射为 UI 状态
viewModelScope.launch {
    when (val result = getItems(category)) {
        is Try.Success -> _state.update { it.copy(items = result.value, isLoading = false) }
        is Try.Failure -> _state.update { it.copy(error = result.error.toMessage(), isLoading = false) }
    }
}
```

## Convention Plugin（Gradle）

对 KMP 项目，使用 convention plugin 以减少构建文件重复：

```kotlin
// build-logic/src/main/kotlin/kmp-library.gradle.kts
plugins {
    id("org.jetbrains.kotlin.multiplatform")
}

kotlin {
    androidTarget()
    iosX64(); iosArm64(); iosSimulatorArm64()
    sourceSets {
        commonMain.dependencies { /* 共享依赖 */ }
        commonTest.dependencies { implementation(kotlin("test")) }
    }
}
```

在各模块中应用：

```kotlin
// domain/build.gradle.kts
plugins { id("kmp-library") }
```

## 应避免的反模式

- 在 `domain` 中 import Android 框架类——保持纯 Kotlin
- 将数据库实体或 DTO 暴露给 UI 层——始终映射为领域模型
- 将业务逻辑放进 ViewModel——抽取为 UseCase
- 使用 `GlobalScope` 或非结构化的 coroutine——使用 `viewModelScope` 或 structured concurrency
- 臃肿的 Repository 实现——拆分为职责单一的 DataSource
- 循环模块依赖——若 A 依赖 B，则 B 不得依赖 A

## 参考

UI 模式参见 skill：`compose-multiplatform-patterns`。
异步模式参见 skill：`kotlin-coroutines-flows`。
